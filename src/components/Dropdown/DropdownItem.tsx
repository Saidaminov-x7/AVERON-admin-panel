// src/components/Dropdown/DropdownItem.tsx
// Элемент выпадающего списка

import React from 'react';

import { Button } from '../ui/Button';
interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

const DropdownItem: React.FC<DropdownItemProps> = ({ children, onClick, className = '', disabled = false }) => {
  return (
    <Button variant="ghost"
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full px-4 py-2 text-left text-sm transition-colors
        ${disabled ? 'text-muted cursor-not-allowed' : 'text-app hover:bg-gray-100 dark:hover:bg-white/5'}
        ${className}
      `}
    >
      {children}
    </Button>
  );
};

export default DropdownItem;