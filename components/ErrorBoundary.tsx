import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component to catch and handle React rendering errors
 * Prevents the entire app from crashing when a component fails
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console (and potentially external service)
    logger.error('React Error Boundary caught error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // TODO: Send to error tracking service (Sentry, etc.)
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI or use provided fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default fallback UI for error boundary
 */
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}

function ErrorFallback({ error, errorInfo, onReset }: ErrorFallbackProps) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-neutral-900 rounded-2xl border border-red-500/20 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Something went wrong</h1>
            <p className="text-sm text-neutral-400">
              An unexpected error occurred in the application
            </p>
          </div>
        </div>

        {isDev && error && (
          <div className="mb-6 space-y-4">
            <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800">
              <div className="text-xs font-mono text-red-400 mb-2">Error:</div>
              <div className="text-sm font-mono text-neutral-300 whitespace-pre-wrap break-words">
                {error.toString()}
              </div>
            </div>

            {errorInfo && (
              <details className="bg-neutral-950 rounded-lg p-4 border border-neutral-800">
                <summary className="text-xs font-mono text-neutral-400 cursor-pointer hover:text-neutral-300">
                  Component Stack
                </summary>
                <div className="mt-2 text-xs font-mono text-neutral-500 whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                  {errorInfo.componentStack}
                </div>
              </details>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onReset}
            className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors font-medium"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors font-medium"
          >
            Reload App
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-neutral-800">
          <p className="text-xs text-neutral-500 text-center">
            If this problem persists, please{' '}
            <a
              href="https://github.com/johngibsondesign/hexcall/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300"
            >
              report it on GitHub
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
