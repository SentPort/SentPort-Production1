import { Component, ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
  fallbackPath?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="max-w-2xl mx-auto px-4 py-12 text-center">
            <div className="bg-slate-800/70 backdrop-blur-md rounded-3xl shadow-xl border border-slate-600/50 p-8">
              <h1 className="text-3xl font-bold text-white mb-4">Something went wrong</h1>
              <p className="text-gray-300 mb-6">
                {this.props.fallbackMessage || "We're sorry, but something unexpected happened. Please try again."}
              </p>
              {this.state.error && (
                <details className="mb-6 text-left">
                  <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                    Error details
                  </summary>
                  <pre className="mt-2 p-4 bg-slate-900/50 rounded-lg text-xs text-red-400 overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    this.setState({ hasError: false, error: null });
                    window.location.reload();
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all"
                >
                  Try Again
                </button>
                <Link
                  to={this.props.fallbackPath || '/'}
                  className="px-6 py-3 bg-slate-700/70 text-gray-200 rounded-lg font-semibold hover:bg-slate-600/70 transition-all"
                >
                  Go Back
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
