import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportPlatformError } from '../utils/platformErrorReporter';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class PlatformErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    void reportPlatformError({
      errorName: error.name,
      message: error.message,
      componentStack: info.componentStack || error.stack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-[40vh] flex items-center justify-center p-8 text-center text-white/80">
            <div>
              <p className="text-lg font-bold text-gold-400 mb-2">Something went wrong</p>
              <p className="text-sm text-white/50">Our team has been notified.</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-6 px-6 py-3 rounded-xl bg-gold-500 text-black font-black text-sm"
              >
                Reload
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
