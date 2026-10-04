import { useRef } from "react";
import type { ChangeEvent } from "react";
import ReactMarkdown from "react-markdown";
import { Bold, Italic, List, Strikethrough } from "lucide-react";
import { Input, Textarea } from "../../components/ui";

const inlineElements = ["p", "strong", "em", "del", "br"] as const;
const blockElements = ["p", "strong", "em", "del", "br", "ul", "ol", "li"] as const;

type ProductRichTextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  maxLength: number;
  error?: string;
  containerClassName?: string;
  copy: {
    bold: string;
    italic: string;
    strikethrough: string;
    bulletList: string;
    insertText: string;
    preview: string;
    hint: string;
  };
};

export function ProductRichTextField({
  label,
  value,
  onChange,
  multiline = false,
  maxLength,
  error,
  containerClassName,
  copy,
}: ProductRichTextFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFormat = (format: "bold" | "italic" | "strikethrough" | "bulletList") => {
    const control = multiline ? textareaRef.current : inputRef.current;
    if (!control) return;

    const start = control.selectionStart ?? value.length;
    const end = control.selectionEnd ?? start;
    const selected = value.slice(start, end);
    const text = selected || copy.insertText;
    const before = value.slice(0, start);
    const after = value.slice(end);
    let replacement: string;
    let selectionStart: number;
    let selectionEnd: number;

    if (format === "bulletList") {
      replacement = text.split("\n").map((line) => `- ${line}`).join("\n");
      selectionStart = start;
      selectionEnd = start + replacement.length;
    } else {
      const marker = format === "bold" ? "**" : format === "italic" ? "*" : "~~";
      replacement = `${marker}${text}${marker}`;
      selectionStart = start + marker.length;
      selectionEnd = selectionStart + text.length;
    }

    onChange(`${before}${replacement}${after}`);
    requestAnimationFrame(() => {
      control.focus();
      control.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  const toolbarButton = (
    format: "bold" | "italic" | "strikethrough" | "bulletList",
    labelText: string,
    icon: React.ReactNode,
  ) => (
    <button
      key={format}
      type="button"
      aria-label={labelText}
      title={labelText}
      onClick={() => handleFormat(format)}
      className="inline-flex size-8 items-center justify-center rounded-md border border-app bg-surface text-muted transition-colors hover:bg-surface-secondary hover:text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {icon}
    </button>
  );

  return (
    <div className={containerClassName}>
      {multiline ? (
        <Textarea
          ref={textareaRef}
          label={label}
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          error={error}
          className="min-h-32 resize-y"
        />
      ) : (
        <Input
          ref={inputRef}
          label={label}
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          error={error}
        />
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label={copy.hint}>
        {toolbarButton("bold", copy.bold, <Bold size={15} />)}
        {toolbarButton("italic", copy.italic, <Italic size={15} />)}
        {toolbarButton("strikethrough", copy.strikethrough, <Strikethrough size={15} />)}
        {multiline && toolbarButton("bulletList", copy.bulletList, <List size={15} />)}
        <span className="ml-1 text-xs text-muted">{copy.hint}</span>
      </div>
      {value.trim() && (
        <div className="mt-3 rounded-lg border border-app bg-surface-secondary p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">{copy.preview}</p>
          <div className="break-words text-sm text-app">
            <ReactMarkdown
              allowedElements={multiline ? blockElements : inlineElements}
              unwrapDisallowed
              components={{
                p: ({ children }) => multiline
                  ? <p className="mb-2 last:mb-0">{children}</p>
                  : <span>{children}</span>,
                ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
                ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
              }}
            >
              {value}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
