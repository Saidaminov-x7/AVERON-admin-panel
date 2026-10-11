import { useLayoutEffect, useRef, useState } from "react";
import type { InputProps } from "./Input";
import { Input } from "./Input";
import { caretAfterFormatting, formatUzsPriceInput, normalizeUzsPriceInput } from "../../lib/priceInput";

type UzsPriceInputProps = Omit<InputProps, "value" | "defaultValue" | "onChange" | "type"> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function UzsPriceInput({ value, onValueChange, inputMode = "decimal", ...props }: UzsPriceInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const lastEmittedValue = useRef(value);
  const [displayValue, setDisplayValue] = useState(() => formatUzsPriceInput(normalizeUzsPriceInput(value)));

  useLayoutEffect(() => {
    if (lastEmittedValue.current === value) return;
    lastEmittedValue.current = value;
    setDisplayValue(formatUzsPriceInput(normalizeUzsPriceInput(value)));
  }, [value]);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input && pendingCaret.current !== null && document.activeElement === input) {
      input.setSelectionRange(pendingCaret.current, pendingCaret.current);
    }
    pendingCaret.current = null;
  }, [displayValue]);

  return (
    <Input
      {...props}
      ref={inputRef}
      type="text"
      inputMode={inputMode}
      value={displayValue}
      onChange={(event) => {
        const input = event.currentTarget;
        const tokensBeforeCaret = normalizeUzsPriceInput(input.value.slice(0, input.selectionStart ?? input.value.length)).length;
        const normalized = normalizeUzsPriceInput(input.value);
        const formatted = formatUzsPriceInput(normalized);
        pendingCaret.current = caretAfterFormatting(formatted, tokensBeforeCaret);
        lastEmittedValue.current = normalized;
        onValueChange(normalized);
        setDisplayValue(formatted);
      }}
    />
  );
}
