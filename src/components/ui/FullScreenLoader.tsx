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
        <div className="mt-4 text-xl font-semibold tracking-[0.18em] text-app">
          AVERON
        </div>
        <div className="mt-4 h-7 w-7 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[#244FC7] motion-reduce:animate-none dark:border-t-[#8EA5FF]" />
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
