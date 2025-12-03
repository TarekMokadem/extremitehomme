import { ref, computed } from 'vue';
import type { Service, CartItem, PaymentMethod } from '../types';

const cartItems = ref<CartItem[]>([]);
const discount = ref(0);
const discountType = ref<'euro' | 'percent'>('euro'); // Nouveau: type de réduction
const selectedPaymentMethod = ref<PaymentMethod>('card');

export function useCart() {
  const addToCart = (service: Service) => {
    const existingItem = cartItems.value.find(item => item.service.id === service.id);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cartItems.value.push({ service, quantity: 1 });
    }
  };

  const removeFromCart = (serviceId: number) => {
    const index = cartItems.value.findIndex(item => item.service.id === serviceId);
    if (index !== -1) {
      cartItems.value.splice(index, 1);
    }
  };

  const updateQuantity = (serviceId: number, quantity: number) => {
    const item = cartItems.value.find(item => item.service.id === serviceId);
    if (item) {
      if (quantity <= 0) {
        removeFromCart(serviceId);
      } else {
        item.quantity = quantity;
      }
    }
  };

  const clearCart = () => {
    cartItems.value = [];
    discount.value = 0;
  };

  const setDiscount = (value: number) => {
    discount.value = Math.max(0, value);
  };

  const setDiscountType = (type: 'euro' | 'percent') => {
    discountType.value = type;
    // Limiter la valeur en fonction du type
    if (type === 'percent') {
      discount.value = Math.min(discount.value, 100);
    }
  };

  const setPaymentMethod = (method: PaymentMethod) => {
    selectedPaymentMethod.value = method;
  };

  const subtotal = computed(() => {
    return cartItems.value.reduce((sum, item) => {
      return sum + (item.service.price * item.quantity);
    }, 0);
  });

  // Calcul de la réduction en euros
  const discountAmount = computed(() => {
    if (discountType.value === 'percent') {
      return (subtotal.value * discount.value) / 100;
    }
    return Math.min(discount.value, subtotal.value);
  });

  const total = computed(() => {
    return Math.max(0, subtotal.value - discountAmount.value);
  });

  const itemCount = computed(() => {
    return cartItems.value.reduce((sum, item) => sum + item.quantity, 0);
  });

  const isInCart = (serviceId: number): boolean => {
    return cartItems.value.some(item => item.service.id === serviceId);
  };

  const getItemQuantity = (serviceId: number): number => {
    const item = cartItems.value.find(item => item.service.id === serviceId);
    return item ? item.quantity : 0;
  };

  return {
    cartItems,
    discount,
    discountType,
    discountAmount,
    selectedPaymentMethod,
    subtotal,
    total,
    itemCount,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    setDiscount,
    setDiscountType,
    setPaymentMethod,
    isInCart,
    getItemQuantity,
  };
}
