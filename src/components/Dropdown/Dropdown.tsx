// src/components/Dropdown/Dropdown.tsx
// Универсальный выпадающий список (dropdown) с поддержкой кастомного триггера и стилей

import React, { useState, useRef, useEffect } from 'react';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
  contentClassName?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  align = 'left',
  className = '',
  contentClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full"
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 mt-1 w-48 rounded-lg border border-app bg-surface shadow-lg animate-in fade-in zoom-in-95 ${align === 'right' ? 'right-0' : 'left-0'} ${contentClassName}`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default Dropdown;