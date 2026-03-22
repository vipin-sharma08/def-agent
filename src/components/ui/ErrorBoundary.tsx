"use client";

// src/components/ui/ErrorBoundary.tsx
// ═══════════════════════════════════════════════════════════════════
// React error boundary — catches unhandled render errors and shows
// a recovery UI instead of crashing the whole page.
// Must be a class component; hooks cannot catch render errors.
// ═══════════════════════════════════════════════════════════════════

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Optional custom fallback instead of the default error card */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showDetails: false };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    console.error("[ErrorBoundary] Caught render error:", error);
    console.error("[ErrorBoundary] Component stack:", info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleGoHome = (): void => {
    window.location.href = "/";
  };

  private toggleDetails = (): void => {
    this.setState((s) => ({ showDetails: !s.showDetails }));
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const { error, showDetails } = this.state;

    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-6 py-12">
        <div className="max-w-lg w-full">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-neg-surface border border-neg-border">
              <AlertTriangle size={32} className="text-negative" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="font-sans text-2xl font-bold text-zinc-100 text-center mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-zinc-500 text-center mb-8 leading-relaxed">
            An unexpected error occurred in the application. Your uploaded data
            has not been lost — reloading the page usually resolves this.
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-6 rounded-lg border border-neg-border bg-neg-surface overflow-hidden">
              <button
                onClick={this.toggleDetails}
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-mono text-negative hover:bg-neg-surface/80 transition-colors"
              >
                <span>Error details</span>
                <span className="text-zinc-600">{showDetails ? "▲ hide" : "▼ show"}</span>
              </button>
              {showDetails && (
                <pre className="px-4 pb-4 text-[11px] font-mono text-negative/70 whitespace-pre-wrap break-words leading-relaxed max-h-48 overflow-y-auto">
                  {error.message}
                  {error.stack ? `\n\n${error.stack}` : ""}
                </pre>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={this.handleGoHome}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-border text-zinc-400 hover:text-zinc-100 text-sm font-semibold rounded-md transition-colors"
            >
              <Home size={14} />
              Go to Upload
            </button>
            <button
              onClick={this.handleReload}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal hover:bg-teal-bright text-[#0A0A0A] text-sm font-semibold rounded-md transition-colors glow-teal"
            >
              <RefreshCw size={14} />
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
