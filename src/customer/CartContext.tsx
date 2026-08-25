import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MenuItem, SelectedOption } from '@/types';
import type { CartLine } from './types';

interface CartContextValue {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  addItem: (item: MenuItem, quantity: number, selectedOptions: SelectedOption[]) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = 'gutene-kitchen-cart';

function optionsKey(options: SelectedOption[]): string {
  return options.map((option) => `${option.group_name}:${option.value_name}:${option.price}`).sort().join('|');
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) as CartLine[] : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(lines));
  }, [lines]);

  const value = useMemo<CartContextValue>(() => ({
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    addItem: (item, quantity, selectedOptions) => {
      const price = Number(item.discounted_price ?? item.price) + selectedOptions.reduce((sum, option) => sum + option.price, 0);
      const key = optionsKey(selectedOptions);
      setLines((current) => {
        const existing = current.find((line) => line.item.id === item.id && line.optionsKey === key);
        if (existing) return current.map((line) => line.id === existing.id ? { ...line, quantity: line.quantity + quantity } : line);
        return [...current, { id: `${item.id}-${key}-${Date.now()}`, item, quantity, selectedOptions, optionsKey: key, unitPrice: price }];
      });
    },
    updateQuantity: (id, quantity) => setLines((current) => quantity < 1 ? current.filter((line) => line.id !== id) : current.map((line) => line.id === id ? { ...line, quantity } : line)),
    removeItem: (id) => setLines((current) => current.filter((line) => line.id !== id)),
    clearCart: () => setLines([]),
  }), [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used within CartProvider');
  return value;
}
