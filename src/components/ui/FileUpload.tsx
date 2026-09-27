import React, { useState, useRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { UploadCloud, File as FileIcon, X, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';

export interface FileUploadProps {
  onUpload: (files: File[]) => void | Promise<void>;
  accept?: string;
  multiple?: boolean;
  maxSizeMb?: number;
  loading?: boolean;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUpload,
  accept = 'image/jpeg,image/png,image/webp',
  multiple = false,
  maxSizeMb = 10,
  loading = false,
  className,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setErrorMessage(null);
    const valid: File[] = [];
    const newPreviews: string[] = [];

    Array.from(incoming).forEach((file) => {
      if (file.size > maxSizeMb * 1024 * 1024) {
        setErrorMessage(`Файл ${file.name} превышает максимальный размер ${maxSizeMb} МБ`);
        return;
      }
      valid.push(file);
      if (file.type.startsWith('image/')) {
        newPreviews.push(URL.createObjectURL(file));
      }
    });

    if (multiple) {
      setSelectedFiles((prev) => [...prev, ...valid]);
      setPreviews((prev) => [...prev, ...newPreviews]);
    } else if (valid.length > 0) {
      setSelectedFiles([valid[0]]);
      setPreviews(newPreviews.slice(0, 1));
    }
  };

  const handleRemove = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmUpload = async () => {
    if (selectedFiles.length === 0) return;
    await onUpload(selectedFiles);
    setSelectedFiles([]);
    setPreviews([]);
  };

  return (
    <div className={twMerge('w-full space-y-4', className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={clsx(
          'flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center',
          isDragOver
            ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20'
            : 'border-app bg-surface/60 hover:bg-surface hover:border-primary-400',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 mb-3 shadow-xs">
          <UploadCloud size={24} />
        </div>
        <p className="text-sm font-semibold text-app">
          Нажмите или перетащите файлы для загрузки
        </p>
        <p className="text-xs text-muted mt-1">
          Поддерживаются форматы WebP, PNG, JPG (до {maxSizeMb} МБ)
        </p>
      </div>

      {errorMessage && (
        <p className="text-xs text-red-500 font-medium animate-fade-in">{errorMessage}</p>
      )}

      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-app">Выбранные файлы ({selectedFiles.length}):</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {selectedFiles.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="relative group rounded-xl border border-app bg-surface p-2 flex flex-col items-center text-center overflow-hidden"
              >
                {previews[idx] ? (
                  <img
                    src={previews[idx]}
                    alt={file.name}
                    className="h-20 w-full object-cover rounded-lg mb-2"
                  />
                ) : (
                  <div className="h-20 w-full flex items-center justify-center bg-gray-100 dark:bg-white/5 rounded-lg mb-2 text-muted">
                    <FileIcon size={24} />
                  </div>
                )}
                <span className="text-[11px] font-medium text-app truncate w-full">{file.name}</span>
                <span className="text-[10px] text-muted">{(file.size / 1024 / 1024).toFixed(2)} МБ</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(idx);
                  }}
                  className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 hover:bg-black text-white transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmUpload}
              loading={loading}
              icon={<CheckCircle2 size={14} />}
            >
              Загрузить {selectedFiles.length} {selectedFiles.length === 1 ? 'файл' : 'файла(-ов)'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
