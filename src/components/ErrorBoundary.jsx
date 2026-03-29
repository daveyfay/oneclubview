import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
    import('@sentry/react').then(Sentry => {
      Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
    }).catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'var(--color-warm)',
          fontFamily: 'var(--font-sans)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😵</div>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '22px',
            color: 'var(--color-text)',
            marginBottom: '8px',
          }}>
            Something went wrong
          </h2>
          <p style={{
            color: 'var(--color-muted)',
            fontSize: '14px',
            marginBottom: '24px',
            maxWidth: '320px',
          }}>
            {this.props.label
              ? `The ${this.props.label} section hit a snag.`
              : "The app hit a snag. Your data is safe."}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onReset) this.props.onReset();
            }}
            style={{
              padding: '14px 32px',
              borderRadius: '16px',
              border: 'none',
              background: 'var(--color-primary)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
