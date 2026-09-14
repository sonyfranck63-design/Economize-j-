import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (React.Component as any) {
  declare props: Props;
  declare state: State;
  declare setState: (state: Partial<State> | ((prevState: State) => Partial<State>)) => void;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Erro interceptado:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.hash = '';
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4 shadow-sm">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2 font-display">
            {this.props.fallbackTitle || 'Ops! Algo não carregou como esperado'}
          </h2>
          <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
            Não se preocupe, seus dados estão seguros. Ocorreu uma interrupção temporária na interface gráfica.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tentar Novamente</span>
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.hash = '';
                window.location.reload();
              }}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Recarregar Tela</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
