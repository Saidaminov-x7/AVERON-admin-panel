import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Admin panel crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-app text-center select-none">
          <div className="flex flex-col items-center justify-center max-w-md w-full p-8 sm:p-10 rounded-2xl border border-dashed border-app bg-surface/80 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 mb-4 shadow-xs">
              <AlertTriangle size={28} strokeWidth={1.75} />
            </div>
            <h1 className="text-xl font-bold text-app mb-2">Что-то пошло не так</h1>
            <p className="text-xs text-muted max-w-sm mb-6 leading-relaxed">
              {this.state.error?.message || 'Произошла непредвиденная ошибка в работе интерфейса.'}
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={() => window.location.reload()}
              icon={<RefreshCw size={16} />}
              className="shadow-xs"
            >
              Перезагрузить страницу
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
