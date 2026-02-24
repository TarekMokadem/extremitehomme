import { ref, computed } from 'vue';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { computeSaleHash, computeAuditHash } from '../lib/nf525';
import type { 
  Product, 
  CartItem, 
  Sale, 
  SaleItem, 
  Payment,
  PaymentMethod,
  DiscountType,
  Vendor,
  StockCategory,
} from '../types/database';

// State global du panier
const cartItems = ref<CartItem[]>([]);
const discountType = ref<DiscountType>('euro');
const discountValue = ref(0);
/** Prix total fixé manuellement (prioritaire sur le calcul). Null = utiliser le calcul. */
const fixedTotal = ref<number | null>(null);
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

  // Quantité déjà en panier pour un produit (même product_id)
  const getCartQuantityForProduct = (productId: string, excludeLineId?: string) => {
    return cartItems.value
      .filter((i) => i.product.id === productId && i.lineId !== excludeLineId)
      .reduce((sum, i) => sum + i.quantity, 0);
  };

  // Stock disponible pour ajout au panier (produits uniquement ; services = illimité)
  const getAvailableStock = (product: Product, excludeLineId?: string, stockCat?: StockCategory) => {
    if (product.type !== 'product') return Infinity;
    const inCart = cartItems.value
      .filter((i) => i.product.id === product.id && i.lineId !== excludeLineId && (i.stockCategory ?? 'sale') === (stockCat ?? 'sale'))
      .reduce((sum, i) => sum + i.quantity, 0);
    const totalStock = (stockCat === 'technical') ? (product.stock_technical ?? 0) : (product.stock ?? 0);
    return Math.max(0, totalStock - inCart);
  };

  // Ajouter un produit au panier
  const addToCart = (product: Product, quantity: number = 1, vendor?: Vendor, stockCategory: StockCategory = 'sale') => {
    const maxQty = getAvailableStock(product, undefined, stockCategory);
    const qty = product.type === 'product' ? Math.min(quantity, maxQty) : quantity;
    if (qty <= 0) return;

    const lineId = `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newItem: CartItem = {
      lineId,
      product,
      quantity: qty,
      vendor_id: vendor?.id,
      vendor: vendor,
      stockCategory,
      price_ht: product.price_ht,
      tva_rate: product.tva_rate || DEFAULT_TVA_RATE,
      subtotal_ht: 0,
      tva: 0,
      subtotal_ttc: 0,
    };
    recalculateItem(newItem);
    cartItems.value.push(newItem);
  };

  // Recalculer les totaux d'un item
  const recalculateItem = (item: CartItem) => {
    // Prix unitaire TTC : fixé manuellement (ex. Bon cadeau) ou prix produit
    const priceTTC = item.fixedPriceTTC ?? item.product.price_ttc;
    item.subtotal_ttc = priceTTC * item.quantity;

    // Calculer le HT à partir du TTC
    const tvaMultiplier = 1 + item.tva_rate;
    item.subtotal_ht = item.subtotal_ttc / tvaMultiplier;
    item.tva = item.subtotal_ttc - item.subtotal_ht;

    // Mettre à jour le price_ht calculé (pour cohérence)
    item.price_ht = item.subtotal_ht / item.quantity;
  };

  // Trouver un article par lineId
  const findCartItemByLineId = (lineId: string) => {
    return cartItems.value.find(i => i.lineId === lineId);
  };

  // Fixer ou annuler le prix unitaire TTC d'une ligne (ex. Bon cadeau)
  const setItemFixedPrice = (lineId: string, priceTTC: number | null) => {
    const item = findCartItemByLineId(lineId);
    if (item) {
      if (priceTTC == null || priceTTC < 0) {
        delete item.fixedPriceTTC;
      } else {
        item.fixedPriceTTC = priceTTC;
      }
      recalculateItem(item);
    }
  };

  // Modifier la quantité d'un item (par lineId)
  const updateQuantity = (lineId: string, quantity: number) => {
    const item = findCartItemByLineId(lineId);
    if (item) {
      if (quantity <= 0) {
        removeFromCart(lineId);
      } else {
        const maxQty =
          item.product.type === 'product'
            ? getAvailableStock(item.product, lineId) + item.quantity
            : quantity;
        item.quantity = Math.min(quantity, maxQty);
        recalculateItem(item);
      }
    }
  };

  // Retirer une ligne du panier (par lineId)
  const removeFromCart = (lineId: string) => {
    cartItems.value = cartItems.value.filter(item => item.lineId !== lineId);
  };

  // Vider le panier
  const clearCart = () => {
    cartItems.value = [];
    discountValue.value = 0;
    fixedTotal.value = null;
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

  // Total final (ou prix fixé si défini)
  const total = computed(() => {
    if (fixedTotal.value != null && fixedTotal.value >= 0) return fixedTotal.value;
    return Math.max(0, subtotalTTC.value - discountAmount.value);
  });

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

  const setFixedTotal = (value: number | null) => {
    fixedTotal.value = value;
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

    if (!clientId) {
      error.value = 'Veuillez sélectionner ou créer un client avant de valider';
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
      // VÉRIFIER LE STOCK AVANT TOUTE CRÉATION (vente + technique séparément)
      if (isSupabaseConfigured()) {
        // Clé = productId|stockCategory
        const qtyByKey = new Map<string, { qty: number; name: string; stockCat: string }>();
        for (const item of cartItems.value) {
          if (item.product.type === 'product') {
            const cat = item.stockCategory ?? 'sale';
            const key = `${item.product.id}|${cat}`;
            const prev = qtyByKey.get(key);
            if (prev) {
              prev.qty += item.quantity;
            } else {
              qtyByKey.set(key, { qty: item.quantity, name: item.product.name, stockCat: cat });
            }
          }
        }
        for (const [key, { qty: totalQty, name, stockCat }] of qtyByKey) {
          const productId = key.split('|')[0];
          const stockColumn = stockCat === 'technical' ? 'stock_technical' : 'stock';
          const { data: productRow, error: fetchErr } = await supabase
            .from('products')
            .select(`${stockColumn}`)
            .eq('id', productId)
            .single();

          if (fetchErr || !productRow) {
            throw new Error(`Produit ${name} introuvable`);
          }

          const currentStock = (productRow as Record<string, number>)[stockColumn] ?? 0;
          if (currentStock < totalQty) {
            throw new Error(
              `Stock insuffisant pour "${name}" (${stockCat === 'technical' ? 'technique' : 'vente'}) : ${currentStock} en stock, ${totalQty} demandé`
            );
          }
        }
      }

      // Générer le numéro de ticket
      let ticketNumber: string;
      
      if (isSupabaseConfigured()) {
        const { data: ticketData } = await supabase.rpc('generate_ticket_number');
        ticketNumber = ticketData || generateTicketNumber();
      } else {
        ticketNumber = generateTicketNumber();
      }

      // ── NF525 : chaînage SHA-256 ──
      const createdAt = new Date().toISOString();
      let previousHash: string | null = null;

      if (isSupabaseConfigured()) {
        const { data: lastSale } = await supabase
          .from('sales')
          .select('hash')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        previousHash = lastSale?.hash ?? null;
      }

      const saleHash = await computeSaleHash(
        ticketNumber,
        createdAt,
        total.value,
        previousHash,
      );

      // Créer l'objet vente (avec hash NF525)
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
        hash: saleHash,
        previous_hash: previousHash,
        created_at: createdAt,
      };

      // Créer les lignes de vente (avec vendeur par article si spécifié)
      const saleItems = cartItems.value.map(item => ({
        product_id: item.product.id,
        variant_id: item.variant?.id || null,
        vendor_id: item.vendor_id || vendorId, // Utiliser le vendeur de l'article ou le vendeur principal
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
        const mockSale: Sale = {
          id: String(Date.now()),
          ...saleData,
          notes: null,
          updated_at: createdAt,
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

      // 4. Mettre à jour le stock (produits physiques uniquement)
      for (const item of cartItems.value) {
        if (item.product.type === 'product') {
          const stockCat = item.stockCategory ?? 'sale';
          const stockColumn = stockCat === 'technical' ? 'stock_technical' : 'stock';

          const { data: productRow, error: fetchErr } = await supabase
            .from('products')
            .select(`${stockColumn}`)
            .eq('id', item.product.id)
            .single();

          if (fetchErr || !productRow) {
            throw new Error(`Produit ${item.product.name} introuvable`);
          }

          const currentStock = (productRow as Record<string, number>)[stockColumn] ?? 0;
          if (currentStock < item.quantity) {
            throw new Error(
              `Stock insuffisant pour "${item.product.name}" (${stockCat === 'technical' ? 'technique' : 'vente'}) : ${currentStock} en stock, ${item.quantity} demandé`
            );
          }

          const newStock = currentStock - item.quantity;
          const { error: updateErr } = await supabase
            .from('products')
            .update({ [stockColumn]: newStock, updated_at: new Date().toISOString() } as Record<string, unknown>)
            .eq('id', item.product.id);

          if (updateErr) throw updateErr;

          const { error: moveErr } = await supabase.from('stock_movements').insert({
            product_id: item.product.id,
            variant_id: item.variant?.id || null,
            type: 'out',
            quantity: -item.quantity,
            reason: stockCat === 'technical' ? 'Utilisation technique' : 'Vente',
            reference_id: sale.id,
            vendor_id: vendorId,
            stock_type: stockCat,
          } as Record<string, unknown>);

          if (moveErr) throw moveErr;
        }
      }

      // 5. NF525 : mettre à jour le Grand Total (GT) — compteur perpétuel
      try {
        const { data: gtRow } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'grand_total')
          .maybeSingle();

        const currentGT = typeof gtRow?.value === 'number' ? gtRow.value : 0;
        const newGT = currentGT + total.value;

        await supabase
          .from('settings')
          .upsert(
            { key: 'grand_total', value: newGT, updated_at: new Date().toISOString() } as Record<string, unknown>,
            { onConflict: 'key' },
          );
      } catch (gtErr) {
        console.warn('NF525: erreur mise à jour GT —', gtErr);
      }

      // 6. NF525 : audit log avec hash chaîné
      try {
        const { data: lastAudit } = await supabase
          .from('audit_logs')
          .select('hash')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const auditTimestamp = new Date().toISOString();
        const auditHash = await computeAuditHash(
          auditTimestamp,
          'sale_created',
          'sales',
          sale.id,
          lastAudit?.hash ?? null,
        );

        await supabase.from('audit_logs').insert({
          timestamp: auditTimestamp,
          event_type: 'sale_created',
          table_name: 'sales',
          record_id: sale.id,
          old_data: null,
          new_data: { ticket_number: ticketNumber, total: total.value } as any,
          vendor_id: vendorId,
          hash: auditHash,
          previous_hash: lastAudit?.hash ?? null,
        } as Record<string, unknown>);
      } catch (auditErr) {
        console.warn('NF525: erreur audit log —', auditErr);
      }

      // 7. Mettre à jour les stats client si applicable
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

      // NF525 : audit log pour annulation
      try {
        const { data: lastAudit } = await supabase
          .from('audit_logs')
          .select('hash')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const auditTimestamp = new Date().toISOString();
        const auditHash = await computeAuditHash(
          auditTimestamp,
          'sale_cancelled',
          'sales',
          saleId,
          lastAudit?.hash ?? null,
        );

        await supabase.from('audit_logs').insert({
          timestamp: auditTimestamp,
          event_type: 'sale_cancelled',
          table_name: 'sales',
          record_id: saleId,
          old_data: { status: 'completed' } as any,
          new_data: { status: 'cancelled', reason } as any,
          vendor_id: null,
          hash: auditHash,
          previous_hash: lastAudit?.hash ?? null,
        } as Record<string, unknown>);
      } catch (auditErr) {
        console.warn('NF525: erreur audit annulation —', auditErr);
      }

      return true;
    } catch (err) {
      console.error('Erreur annulation vente:', err);
      return false;
    }
  };

  // Quantité max pour une ligne (pour désactiver le bouton +)
  const getMaxQuantityForItem = (item: CartItem) => {
    if (item.product.type !== 'product') return Infinity;
    return getAvailableStock(item.product, item.lineId, item.stockCategory) + item.quantity;
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
    getMaxQuantityForItem,
    setItemFixedPrice,
    clearCart,
    // Methods - Réduction
    setDiscount,
    clearDiscount,
    setFixedTotal,
    fixedTotal,
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
