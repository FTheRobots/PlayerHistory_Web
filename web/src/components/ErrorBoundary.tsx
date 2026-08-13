import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** Prevents a render crash from replacing the whole admin UI with a blank page. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[PlayerHistory] UI crash', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="h-full min-h-[240px] flex items-center justify-center p-6">
        <div className="max-w-lg w-full border border-event-combat/40 bg-event-combat/10 rounded p-4 space-y-3">
          <h2 className="text-sm font-semibold text-event-combat">
            {this.props.fallbackTitle ?? 'This view crashed'}
          </h2>
          <p className="text-xs text-muted font-mono break-all">{this.state.error.message}</p>
          <button
            type="button"
            className="text-xs text-accent-bright hover:underline"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
