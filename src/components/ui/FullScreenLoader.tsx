import React from 'react';

interface FullScreenLoaderProps {
  label?: string;
}

export const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({
  label = 'Загрузка панели управления...',
}) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-app text-app transition-colors duration-200">
      <div className="text-center flex flex-col items-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-2xl font-black text-white shadow-[0_12px_32px_rgba(124,58,237,.35)]">
          A
        </div>
        <div className="mt-4 text-xl font-black tracking-[0.24em] text-app">
          AVERON
        </div>
        <div className="mt-4 h-7 w-7 animate-spin rounded-full border-2 border-stone-300 border-t-violet-600 dark:border-stone-700 dark:border-t-violet-400" />
        {label && (
          <p className="mt-3 text-xs font-medium text-muted tracking-wide">
            {label}
          </p>
        )}
      </div>
    </div>
  );
};

export default FullScreenLoader;
