import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UserContext } from './UserContext';
import { 
  getCartItems, 
  addToCart, 
  updateCartItemQuantity, 
  removeFromCart, 
  clearCart, 
  getCartTotal 
} from '../lib/database';

interface CartItem {
  id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  name: string;
  image: string;
  cost_per_unit: number;
  stock_available: number;
  created_at: string;
}

interface CartContextType {
  cartItems: CartItem[];
  cartTotal: number;
  itemCount: number;
  loading: boolean;
  addItem: (productId: number, quantity?: number) => Promise<boolean>;
  updateQuantity: (productId: number, quantity: number) => Promise<boolean>;
  removeItem: (productId: number) => Promise<boolean>;
  clearAll: () => Promise<boolean>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useContext(UserContext);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const loadCart = async () => {
    if (!user) {
      setCartItems([]);
      setCartTotal(0);
      return;
    }

    setLoading(true);
    try {
      const items = await getCartItems(user.id);
      const total = await getCartTotal(user.id);
      setCartItems(items);
      setCartTotal(total);
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (productId: number, quantity: number = 1): Promise<boolean> => {
    if (!user) return false;

    try {
      const success = await addToCart(user.id, productId, quantity);
      if (success) {
        await loadCart();
      }
      return success;
    } catch (error) {
      console.error('Error adding item to cart:', error);
      return false;
    }
  };

  const updateQuantity = async (productId: number, quantity: number): Promise<boolean> => {
    if (!user) return false;

    try {
      const success = await updateCartItemQuantity(user.id, productId, quantity);
      if (success) {
        await loadCart();
      }
      return success;
    } catch (error) {
      console.error('Error updating cart item:', error);
      return false;
    }
  };

  const removeItem = async (productId: number): Promise<boolean> => {
    if (!user) return false;

    try {
      const success = await removeFromCart(user.id, productId);
      if (success) {
        await loadCart();
      }
      return success;
    } catch (error) {
      console.error('Error removing item from cart:', error);
      return false;
    }
  };

  const clearAll = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const success = await clearCart(user.id);
      if (success) {
        await loadCart();
      }
      return success;
    } catch (error) {
      console.error('Error clearing cart:', error);
      return false;
    }
  };

  const refreshCart = async (): Promise<void> => {
    await loadCart();
  };

  useEffect(() => {
    loadCart();
  }, [user]);

  const value: CartContextType = {
    cartItems,
    cartTotal,
    itemCount,
    loading,
    addItem,
    updateQuantity,
    removeItem,
    clearAll,
    refreshCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
