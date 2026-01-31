import { ref, computed } from 'vue';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { 
  Product, 
  CartItem, 
  Sale, 
  SaleItem, 
  Payment,
  PaymentMethod,
  DiscountType,
} from '../types/database';

// State global du panier
const cartItems = ref<CartItem[]>([]);
const discountType = ref<DiscountType>('euro');
const discountValue = ref(0);
const selectedPaymentMethods = ref<{ method: PaymentMethod; amount: number }[]>([]);

// Historique des ventes récentes (pour affichage)
const recentSales = ref<Sale[]>([]);
const isProcessing = ref(false);
const error = ref<string | null>(null);

// Taux de TVA par défaut
const DEFAULT_TVA_RATE = 0.20;

export function useSales() {
  // =====================================================
  // GESTION DU PANIER
  // =====================================================

  // Ajouter un produit au panier
  const addToCart = (product: Product, quantity: number = 1) => {
    const existingItem = cartItems.value.find(item => item.product.id === product.id);
    
    if (existingItem) {
      existingItem.quantity += quantity;
      recalculateItem(existingItem);
    } else {
      const newItem: CartItem = {
        product,
        quantity,
        price_ht: product.price_ht,
        tva_rate: product.tva_rate || DEFAULT_TVA_RATE,
        subtotal_ht: 0,
        tva: 0,
        subtotal_ttc: 0,
      };
      recalculateItem(newItem);
      cartItems.value.push(newItem);
    }
  };

  // Recalculer les totaux d'un item
  const recalculateItem = (item: CartItem) => {
    // IMPORTANT : On part du prix TTC (ce que le client paie)
    // et on calcule le HT pour éviter les arrondis
    const priceTTC = item.product.price_ttc;
    item.subtotal_ttc = priceTTC * item.quantity;
    
    // Calculer le HT à partir du TTC
    const tvaMultiplier = 1 + item.tva_rate;
    item.subtotal_ht = item.subtotal_ttc / tvaMultiplier;
    item.tva = item.subtotal_ttc - item.subtotal_ht;
    
    // Mettre à jour le price_ht calculé (pour cohérence)
    item.price_ht = item.subtotal_ht / item.quantity;
  };

  // Modifier la quantité d'un item
  const updateQuantity = (productId: string, quantity: number) => {
    const item = cartItems.value.find(i => i.product.id === productId);
    if (item) {
      if (quantity <= 0) {
        removeFromCart(productId);
      } else {
        item.quantity = quantity;
        recalculateItem(item);
      }
    }
  };

  // Retirer un produit du panier
  const removeFromCart = (productId: string) => {
    cartItems.value = cartItems.value.filter(item => item.product.id !== productId);
  };

  // Vider le panier
  const clearCart = () => {
    cartItems.value = [];
    discountValue.value = 0;
    selectedPaymentMethods.value = [];
  };

  // =====================================================
  // CALCULS
  // =====================================================

  // Sous-total HT
  const subtotalHT = computed(() => 
    cartItems.value.reduce((sum, item) => sum + item.subtotal_ht, 0)
  );

  // Total TVA
  const totalTVA = computed(() => 
    cartItems.value.reduce((sum, item) => sum + item.tva, 0)
  );

  // Sous-total TTC (avant réduction)
  const subtotalTTC = computed(() => subtotalHT.value + totalTVA.value);

  // Montant de la réduction
  const discountAmount = computed(() => {
    if (discountValue.value <= 0) return 0;
    
    if (discountType.value === 'euro') {
      return Math.min(discountValue.value, subtotalTTC.value);
    } else {
      // Pourcentage
      const percentage = Math.min(discountValue.value, 100);
      return (subtotalTTC.value * percentage) / 100;
    }
  });

  // Total final
  const total = computed(() => 
    Math.max(0, subtotalTTC.value - discountAmount.value)
  );

  // Nombre d'articles
  const itemCount = computed(() => 
    cartItems.value.reduce((sum, item) => sum + item.quantity, 0)
  );

  // Panier vide ?
  const isEmpty = computed(() => cartItems.value.length === 0);

  // =====================================================
  // RÉDUCTIONS
  // =====================================================

  const setDiscount = (type: DiscountType, value: number) => {
    discountType.value = type;
    discountValue.value = Math.max(0, value);
  };

  const clearDiscount = () => {
    discountType.value = 'euro';
    discountValue.value = 0;
  };

  // =====================================================
  // PAIEMENTS
  // =====================================================

  const addPayment = (method: PaymentMethod, amount: number) => {
    const existing = selectedPaymentMethods.value.find(p => p.method === method);
    if (existing) {
      existing.amount += amount;
    } else {
      selectedPaymentMethods.value.push({ method, amount });
    }
  };

  const setPayment = (method: PaymentMethod, amount: number) => {
    const existing = selectedPaymentMethods.value.find(p => p.method === method);
    if (existing) {
      existing.amount = amount;
    } else {
      selectedPaymentMethods.value.push({ method, amount });
    }
  };

  const removePayment = (method: PaymentMethod) => {
    selectedPaymentMethods.value = selectedPaymentMethods.value.filter(
      p => p.method !== method
    );
  };

  const clearPayments = () => {
    selectedPaymentMethods.value = [];
  };

  // Montant total payé
  const totalPaid = computed(() => 
    selectedPaymentMethods.value.reduce((sum, p) => sum + p.amount, 0)
  );

  // Reste à payer
  const remainingToPay = computed(() => 
    Math.max(0, total.value - totalPaid.value)
  );

  // Rendu monnaie (si paiement en espèces excède le total)
  const change = computed(() => 
    Math.max(0, totalPaid.value - total.value)
  );

  // Paiement complet ?
  const isPaymentComplete = computed(() => 
    totalPaid.value >= total.value && total.value > 0
  );

  // =====================================================
  // VALIDATION DE LA VENTE
  // =====================================================

  const generateTicketNumber = (): string => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = now.getTime().toString().slice(-4);
    return `T-${dateStr}-${timeStr}`;
  };

  const validateSale = async (vendorId: string, clientId?: string): Promise<Sale | null> => {
    if (isEmpty.value) {
      error.value = 'Le panier est vide';
      return null;
    }

    if (!isPaymentComplete.value) {
      error.value = 'Le paiement n\'est pas complet';
      return null;
    }

    // Vérifier que le vendorId est un UUID valide (pas "demo")
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(vendorId)) {
      error.value = 'Aucun vendeur sélectionné. Veuillez sélectionner un vendeur.';
      console.error('vendorId invalide:', vendorId);
      return null;
    }

    isProcessing.value = true;
    error.value = null;
    
    console.log('Validation vente - vendorId:', vendorId, 'clientId:', clientId);

    try {
      // Générer le numéro de ticket
      let ticketNumber: string;
      
      if (isSupabaseConfigured()) {
        // Utiliser la fonction Supabase
        const { data: ticketData } = await supabase.rpc('generate_ticket_number');
        ticketNumber = ticketData || generateTicketNumber();
      } else {
        ticketNumber = generateTicketNumber();
      }

      // Créer l'objet vente
      const saleData = {
        ticket_number: ticketNumber,
        vendor_id: vendorId,
        client_id: clientId || null,
        subtotal_ht: subtotalHT.value,
        total_tva: totalTVA.value,
        subtotal_ttc: subtotalTTC.value,
        discount_type: discountType.value,
        discount_value: discountValue.value,
        discount_amount: discountAmount.value,
        total: total.value,
        status: 'completed' as const,
      };

      // Créer les lignes de vente
      const saleItems = cartItems.value.map(item => ({
        product_id: item.product.id,
        variant_id: item.variant?.id || null,
        product_name: item.product.name,
        price_ht: item.price_ht,
        tva_rate: item.tva_rate,
        quantity: item.quantity,
        subtotal_ht: item.subtotal_ht,
        tva: item.tva,
        subtotal_ttc: item.subtotal_ttc,
      }));

      // Créer les paiements
      const payments = selectedPaymentMethods.value.map(p => ({
        method: p.method,
        amount: p.amount,
      }));

      if (!isSupabaseConfigured()) {
        // Mode démo : simuler la vente
        const mockSale: Sale = {
          id: String(Date.now()),
          ...saleData,
          notes: null,
          hash: null,
          previous_hash: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        recentSales.value.unshift(mockSale);
        clearCart();
        
        return mockSale;
      }

      // Mode Supabase : transaction réelle
      // 1. Créer la vente
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert(saleData)
        .select()
        .single();

      if (saleError) throw saleError;

      // 2. Créer les lignes de vente
      const itemsWithSaleId = saleItems.map(item => ({
        ...item,
        sale_id: sale.id,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(itemsWithSaleId);

      if (itemsError) throw itemsError;

      // 3. Créer les paiements
      const paymentsWithSaleId = payments.map(p => ({
        ...p,
        sale_id: sale.id,
      }));

      const { error: paymentsError } = await supabase
        .from('payments')
        .insert(paymentsWithSaleId);

      if (paymentsError) throw paymentsError;

      // 4. Mettre à jour le stock (pour les produits physiques)
      for (const item of cartItems.value) {
        if (item.product.type === 'product') {
          // Décrémenter le stock
          await supabase
            .from('products')
            .update({ stock: item.product.stock - item.quantity })
            .eq('id', item.product.id);

          // Créer le mouvement de stock
          await supabase
            .from('stock_movements')
            .insert({
              product_id: item.product.id,
              variant_id: item.variant?.id || null,
              type: 'out',
              quantity: -item.quantity,
              reason: 'Vente',
              reference_id: sale.id,
              vendor_id: vendorId,
            });
        }
      }

      // 5. Mettre à jour les stats client si applicable
      if (clientId) {
        const { data: client } = await supabase
          .from('clients')
          .select('visit_count, total_spent, loyalty_points')
          .eq('id', clientId)
          .single();

        if (client) {
          await supabase
            .from('clients')
            .update({
              visit_count: client.visit_count + 1,
              total_spent: client.total_spent + total.value,
              loyalty_points: client.loyalty_points + Math.floor(total.value),
              last_visit_at: new Date().toISOString(),
            })
            .eq('id', clientId);
        }
      }

      // Ajouter à l'historique récent
      recentSales.value.unshift(sale);

      // Vider le panier
      clearCart();

      return sale;

    } catch (err: any) {
      console.error('Erreur validation vente:', err);
      error.value = err.message || 'Erreur lors de la validation';
      return null;
    } finally {
      isProcessing.value = false;
    }
  };

  // =====================================================
  // HISTORIQUE DES VENTES
  // =====================================================

  const loadRecentSales = async (limit: number = 10) => {
    if (!isSupabaseConfigured()) {
      return recentSales.value;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('sales')
        .select(`
          *,
          vendor:vendors(*),
          client:clients(*),
          items:sale_items(*),
          payments(*)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;
      recentSales.value = data || [];
      return data;
    } catch (err) {
      console.error('Erreur chargement ventes:', err);
      return [];
    }
  };

  const getSaleById = async (id: string): Promise<Sale | null> => {
    if (!isSupabaseConfigured()) {
      return recentSales.value.find(s => s.id === id) || null;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('sales')
        .select(`
          *,
          vendor:vendors(*),
          client:clients(*),
          items:sale_items(*, product:products(*)),
          payments(*)
        `)
        .eq('id', id)
        .single();

      if (fetchError) return null;
      return data;
    } catch {
      return null;
    }
  };

  // =====================================================
  // ANNULATION / REMBOURSEMENT
  // =====================================================

  const cancelSale = async (saleId: string, reason: string): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
      const sale = recentSales.value.find(s => s.id === saleId);
      if (sale) {
        sale.status = 'cancelled';
        sale.notes = reason;
      }
      return true;
    }

    try {
      const { error: updateError } = await supabase
        .from('sales')
        .update({ 
          status: 'cancelled',
          notes: reason,
        })
        .eq('id', saleId);

      if (updateError) throw updateError;

      // TODO: Remettre le stock si produits physiques
      // TODO: Créer entrée audit log

      return true;
    } catch (err) {
      console.error('Erreur annulation vente:', err);
      return false;
    }
  };

  return {
    // State
    cartItems,
    discountType,
    discountValue,
    selectedPaymentMethods,
    recentSales,
    isProcessing,
    error,
    // Computed - Panier
    subtotalHT,
    totalTVA,
    subtotalTTC,
    discountAmount,
    total,
    itemCount,
    isEmpty,
    // Computed - Paiement
    totalPaid,
    remainingToPay,
    change,
    isPaymentComplete,
    // Methods - Panier
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    // Methods - Réduction
    setDiscount,
    clearDiscount,
    // Methods - Paiement
    addPayment,
    setPayment,
    removePayment,
    clearPayments,
    // Methods - Vente
    validateSale,
    loadRecentSales,
    getSaleById,
    cancelSale,
  };
}
