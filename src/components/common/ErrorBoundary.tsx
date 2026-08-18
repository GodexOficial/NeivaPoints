import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertOctagon, RotateCcw, Home, Trash2 } from "lucide-react";
import { StorageService } from "../../services/storage";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in application:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.reload();
  };

  private handleHardReset = () => {
    if (
      window.confirm(
        "Are you sure you want to reset all local application data? This will clear local storage and reload.",
      )
    ) {
      StorageService.clearAll();
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl border border-red-200 dark:border-red-900/60 shadow-xl p-6 sm:p-8 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center shadow-xs">
              <AlertOctagon size={32} />
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Something went wrong
            </h1>

            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              An unexpected error occurred while rendering the application. You
              can try refreshing the page or resetting corrupted data.
            </p>

            {this.state.error && (
              <div className="mt-4 p-3.5 bg-red-50/70 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 rounded-xl text-left text-xs font-mono text-red-800 dark:text-red-300 overflow-x-auto max-h-32">
                <span className="font-bold block mb-1">Error message:</span>
                {this.state.error.message || "Unknown error"}
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <RotateCcw size={16} />
                <span>Reload Application</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false });
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm rounded-xl transition-colors cursor-pointer"
              >
                <Home size={16} />
                <span>Try Recovering</span>
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={this.handleHardReset}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Clear Corrupted Data & Reset</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
