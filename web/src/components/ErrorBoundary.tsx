import { AlertCircle, RefreshCw, LayersIcon } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from "react";

import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-background/50 backdrop-blur-sm p-4">
          <div className="max-w-md w-full p-8 space-y-6 bg-card border border-border/50 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 bg-destructive/5 blur-3xl rounded-full -mr-8 -mt-8" />
            
            <div className="relative">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-6">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Something went wrong</h1>
              <p className="text-muted-foreground mt-2 leading-relaxed text-sm">
                An unexpected error occurred. This could be due to a network issue or an internal application state conflict.
              </p>
            </div>

            {this.state.error && (
              <details className="bg-muted/50 p-4 rounded-xl text-sm border border-border/40 group overflow-hidden">
                <summary className="cursor-pointer font-medium select-none flex items-center gap-2 text-foreground/80 group-open:mb-3">
                  <span>View error details</span>
                </summary>
                <div className="overflow-x-auto">
                  <pre className="whitespace-pre-wrap break-words text-[11px] text-muted-foreground font-mono leading-relaxed">{this.state.error.message}</pre>
                </div>
              </details>
            )}

            <Button onClick={this.handleReset} className="w-full h-12 rounded-xl gap-2 font-medium shadow-sm transition-all hover:scale-[1.02] active:scale-95">
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// React Router errorElement for route-level errors (e.g., failed chunk loads after redeployment).
export function ChunkLoadErrorFallback() {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown <= 0) {
      window.location.reload();
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-background/50 backdrop-blur-sm p-4 animate-in fade-in duration-500">
      <div className="max-w-md w-full p-8 space-y-6 bg-card border border-border/50 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 bg-primary/5 blur-3xl rounded-full -mr-8 -mt-8" />
        
        <div className="relative">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6">
            <LayersIcon className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Update Available</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed text-sm">
            We've just released a new version of the app. Your browser needs to download the latest assets to continue.
          </p>
        </div>

        <div className="bg-muted/50 rounded-xl p-4 flex items-center justify-between gap-4 border border-border/40">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Auto-reloading soon</p>
            <p className="text-xs text-muted-foreground">in {countdown} second{countdown !== 1 ? 's' : ''}...</p>
          </div>
          <Button onClick={() => window.location.reload()} size="sm" className="rounded-lg h-9 gap-2 shadow-sm">
            <RefreshCw className="w-3.5 h-3.5" />
            Reload Now
          </Button>
        </div>
      </div>
    </div>
  );
}
