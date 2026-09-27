// src/components/Dropdown/DropdownItem.tsx
// Элемент выпадающего списка

import React from 'react';

interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

const DropdownItem: React.FC<DropdownItemProps> = ({ children, onClick, className = '', disabled = false }) => {
  return (
    <button
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
    </button>
  );
};

export default DropdownItem;