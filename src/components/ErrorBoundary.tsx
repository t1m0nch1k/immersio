import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Changing this value resets the boundary, e.g. pass the current route. */
  resetKey?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Keeps a render-time crash in one screen from blanking the whole app.
 * Without it any thrown error inside a lazy chunk or a screen leaves the user
 * staring at an empty page with no way back.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="view">
        <div className="card errorbox">
          <h1 className="display">Что-то сломалось</h1>
          <p className="sub">
            Раздел не удалось открыть. Прогресс сохранён — можно вернуться обратно и продолжить.
          </p>
          <pre
            style={{
              margin: '16px 0',
              padding: '12px',
              borderRadius: 12,
              background: 'var(--bg2)',
              fontSize: 12,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
            }}
          >
            {error.message}
          </pre>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn sun"
              onClick={() => this.setState({ error: null })}
            >
              Попробовать снова
            </button>
            <button type="button" className="btn" onClick={() => window.location.reload()}>
              Перезагрузить страницу
            </button>
          </div>
        </div>
      </div>
    );
  }
}
