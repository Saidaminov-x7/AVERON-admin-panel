import React, { useState, useRef, useEffect, useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  helperText?: string;
  searchable?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
  containerClassName?: string;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Выберите...',
  label,
  error,
  helperText,
  searchable = false,
  disabled = false,
  clearable = false,
  className,
  containerClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectId = useId();

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      if (searchable) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, searchable]);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      (opt.description && opt.description.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div ref={containerRef} className={twMerge('w-full space-y-1.5 relative', containerClassName)}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold text-app select-none tracking-wide"
        >
          {label}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        id={selectId}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={twMerge(
          clsx(
            'w-full h-10 px-3.5 text-sm rounded-xl transition-all duration-150 outline-none flex items-center justify-between gap-2',
            'bg-surface border border-app text-app text-left cursor-pointer',
            'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-white/5',
            isOpen && 'border-primary-500 ring-2 ring-primary-500/20',
            error && 'border-red-500 focus:border-red-500',
          ),
          className,
        )}
      >
        <span className={clsx('truncate flex items-center gap-2', !selectedOption && 'text-muted')}>
          {selectedOption?.icon}
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0 text-muted">
          {clearable && selectedOption && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 hover:text-app rounded-md hover:bg-gray-100 dark:hover:bg-white/10"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={16}
            className={clsx('transition-transform duration-150', isOpen && 'rotate-180 text-primary-500')}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-hidden rounded-xl border border-app bg-surface shadow-lg animate-fade-in flex flex-col">
          {searchable && (
            <div className="p-2 border-b border-app">
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-2.5 text-muted pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск..."
                  className="w-full h-8 pl-8 pr-2.5 text-xs rounded-lg bg-gray-50 dark:bg-white/5 border border-app text-app outline-none focus:border-primary-500"
                />
              </div>
            </div>
          )}

          <div className="overflow-y-auto p-1 max-h-48 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted">Ничего не найдено</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={clsx(
                      'w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-primary-500 text-white font-semibold'
                        : 'text-app hover:bg-gray-100 dark:hover:bg-white/5',
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {option.icon}
                      <span className="truncate">{option.label}</span>
                      {option.description && (
                        <span
                          className={clsx(
                            'text-[10px] truncate',
                            isSelected ? 'text-white/80' : 'text-muted',
                          )}
                        >
                          ({option.description})
                        </span>
                      )}
                    </div>
                    {isSelected && <Check size={14} className="shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error ? (
        <p className="text-xs text-red-500 font-medium animate-fade-in">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-muted">{helperText}</p>
      ) : null}
    </div>
  );
};
