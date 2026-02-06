import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

export class ERDErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: error.stack || '' };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ERDCanvas Error:', error, errorInfo);
    this.setState({ errorInfo: errorInfo.componentStack || '' });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full bg-red-900/95 flex items-center justify-center p-8">
          <div className="max-w-2xl bg-slate-800 rounded-lg p-6 border-2 border-red-500">
            <h2 className="text-xl font-bold text-red-400 mb-4">ERDCanvas Crashed</h2>
            <div className="bg-slate-900 rounded p-4 mb-4 overflow-auto max-h-48">
              <pre className="text-xs text-red-300 font-mono whitespace-pre-wrap">
                {this.state.error?.message || 'Unknown error'}
              </pre>
            </div>
            <div className="bg-slate-900 rounded p-4 overflow-auto max-h-48">
              <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap">
                {this.state.errorInfo}
              </pre>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
