import React, { useState, useRef, useEffect, useLayoutEffect, useId } from 'react';
import { createPortal } from 'react-dom';
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

const OPTION_HEIGHT = 44;
const OPTION_GAP = 2;
const MENU_PADDING = 10;
const SEARCH_HEADER_HEIGHT = 52;
const MAX_MENU_HEIGHT = 360;
const VIEWPORT_GUTTER = 8;
const MENU_OFFSET = 4;

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const focusFirstOptionRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectId = useId();
  const menuId = `${selectId}-options`;
  const [menuPosition, setMenuPosition] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!containerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
    }
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchable) searchInputRef.current?.focus();
    if (isOpen && focusFirstOptionRef.current) {
      firstOptionRef.current?.focus();
      focusFirstOptionRef.current = false;
    }
  }, [isOpen, searchable]);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      (opt.description && opt.description.toLowerCase().includes(search.toLowerCase())),
  );
  const estimatedMenuHeight = Math.min(
    Math.max(filteredOptions.length, 1) * OPTION_HEIGHT
      + Math.max(filteredOptions.length - 1, 0) * OPTION_GAP
      + MENU_PADDING
      + (searchable ? SEARCH_HEADER_HEIGHT : 0),
    MAX_MENU_HEIGHT,
  );

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const triggerRect = trigger.getBoundingClientRect();
      const desiredHeight = estimatedMenuHeight;
      const availableBelow = Math.max(0, window.innerHeight - triggerRect.bottom - VIEWPORT_GUTTER);
      const availableAbove = Math.max(0, triggerRect.top - VIEWPORT_GUTTER);
      const placeAbove = desiredHeight > availableBelow && availableAbove > availableBelow;
      const availableHeight = placeAbove ? availableAbove : availableBelow;
      const height = Math.max(0, Math.min(desiredHeight, availableHeight - MENU_OFFSET));
      const width = Math.min(triggerRect.width, window.innerWidth - VIEWPORT_GUTTER * 2);
      const left = Math.min(
        Math.max(VIEWPORT_GUTTER, triggerRect.left),
        Math.max(VIEWPORT_GUTTER, window.innerWidth - width - VIEWPORT_GUTTER),
      );

      setMenuPosition({
        left,
        top: placeAbove ? triggerRect.top - height - MENU_OFFSET : triggerRect.bottom + MENU_OFFSET,
        width,
        height,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [estimatedMenuHeight, isOpen]);

  const handleOptionsKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (!(event.target instanceof HTMLButtonElement)) return;
    const optionButtons = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[data-select-option]') ?? [],
    );
    const currentIndex = optionButtons.indexOf(event.target);
    let nextIndex = currentIndex;
    if (event.key === 'ArrowDown') nextIndex = Math.min(currentIndex + 1, optionButtons.length - 1);
    else if (event.key === 'ArrowUp') nextIndex = Math.max(currentIndex - 1, 0);
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = optionButtons.length - 1;
    else return;

    event.preventDefault();
    optionButtons[nextIndex]?.focus();
  };

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
        ref={triggerRef}
        type="button"
        id={selectId}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!isOpen) {
              focusFirstOptionRef.current = true;
              setIsOpen(true);
            } else {
              firstOptionRef.current?.focus();
            }
          } else if (event.key === 'Escape' && isOpen) {
            setIsOpen(false);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-invalid={Boolean(error)}
        aria-controls={isOpen ? menuId : undefined}
        className={twMerge(
          clsx(
            'w-full h-10 px-3.5 text-sm rounded-xl transition-[transform,border-color,box-shadow,background-color] duration-150 [transition-timing-function:var(--ease-out-ui)] outline-none flex items-center justify-between gap-2 active:scale-[.99]',
            'bg-surface border border-app text-app text-left cursor-pointer',
            'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
            'focus-visible:ring-2 focus-visible:ring-primary-500/30',
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
      {isOpen && createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="listbox"
          onKeyDown={handleOptionsKeyDown}
          className="fixed z-[100] flex flex-col overflow-hidden rounded-xl border border-app bg-surface shadow-lg animate-fade-in"
          style={{
            left: menuPosition?.left ?? 0,
            top: menuPosition?.top ?? 0,
            width: menuPosition?.width ?? 0,
            height: menuPosition?.height ?? estimatedMenuHeight,
            visibility: menuPosition ? 'visible' : 'hidden',
          }}
        >
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

          <div className="min-h-0 flex-1 overflow-y-auto p-1 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted">Ничего не найдено</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    ref={option.value === filteredOptions[0]?.value ? firstOptionRef : undefined}
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setSearch('');
                      triggerRef.current?.focus();
                    }}
                    role="option"
                    aria-selected={isSelected}
                    data-select-option
                    className={clsx(
                      'min-h-11 w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500',
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
      , document.body)}

      {error ? (
        <p className="text-xs text-red-500 font-medium animate-fade-in">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-muted">{helperText}</p>
      ) : null}
    </div>
  );
};
