import React from 'react';
import { AlertTriangle, RefreshCcw, Copy, Check } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  copied: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Explicit declarations to reconcile strict type definitions
  public props!: Readonly<ErrorBoundaryProps> & Readonly<{ children?: React.ReactNode }>;
  public state: ErrorBoundaryState;
  public setState!: (
    state: Partial<ErrorBoundaryState> | ((prevState: Readonly<ErrorBoundaryState>) => Partial<ErrorBoundaryState> | null) | null,
    callback?: () => void
  ) => void;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an unexpected exception:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleCopyError = () => {
    if (!this.state.error) return;
    const diagnostics = `Error: ${this.state.error.message}\n\nStack:\n${this.state.error.stack || ''}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack || ''}`;
    navigator.clipboard.writeText(diagnostics);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-950 font-sans flex items-center justify-center p-6 text-slate-100" id="error_boundary_fallback">
          <div className="max-w-2xl w-full bg-slate-900 border border-rose-500/20 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            {/* Glowing top line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-orange-500 to-rose-600"></div>
            
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-500/10 border border-rose-500/35 rounded-xl shrink-0">
                <AlertTriangle className="text-rose-500" size={24} />
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <h2 className="text-lg font-black text-slate-100 uppercase tracking-wide">
                    AgentForge Core Fault Detected
                  </h2>
                  <p className="text-xs text-rose-300 font-bold mt-1">
                    An unexpected runtime crash occurred in the interface layer.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 font-mono text-[10px] text-slate-400 space-y-2 overflow-auto max-h-[240px]">
                  <div className="text-rose-400 font-bold">
                    {this.state.error?.name}: {this.state.error?.message}
                  </div>
                  {this.state.error?.stack && (
                    <pre className="text-slate-500 text-[9px] leading-relaxed select-text whitespace-pre-wrap">
                      {this.state.error?.stack}
                    </pre>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={this.handleReload}
                    className="flex-1 min-w-[140px] bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/40"
                  >
                    <RefreshCcw size={14} />
                    <span>Real-time Hot Reload</span>
                  </button>

                  <button
                    onClick={this.handleCopyError}
                    className="flex-1 min-w-[140px] bg-slate-950 hover:bg-slate-850 text-slate-200 border border-slate-800 font-bold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {this.state.copied ? (
                      <>
                        <Check className="text-emerald-400" size={14} />
                        <span className="text-emerald-400">Copied Diagnostics!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} className="text-slate-400" />
                        <span>Copy Diagnostics Log</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[10px] text-slate-500 text-center pt-2 italic">
                  Tip: Copying the diagnostics allows you to paste the exact trace into the developer prompt or GitHub issues.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
