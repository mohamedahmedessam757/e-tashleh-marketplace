import React from 'react';
import { CartItemType } from '../../../stores/useCartStore';
import { AssemblyCartPartCard } from './AssemblyCartPartCard';

interface CartItemProps {
  item: CartItemType;
  isSelected: boolean;
  onSelect: (offerId: string) => void;
}

export const CartItem: React.FC<CartItemProps> = ({ item, isSelected, onSelect }) => (
  <AssemblyCartPartCard
    item={item}
    isSelected={isSelected}
    onSelect={onSelect}
    showSelection
  />
);
