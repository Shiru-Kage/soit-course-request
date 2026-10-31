import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.removeItem('soit_user_session');
    } catch (e) {
      console.warn('Could not clear user session:', e);
    }
    window.location.href = window.location.pathname;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
          fontFamily: 'var(--font-sans, system-ui, sans-serif)'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            background: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--border-hairline, rgba(0,0,0,0.1))',
            borderRadius: '16px',
            padding: '2.5rem',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.15)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(185, 28, 28, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: '#b91c1c'
            }}>
              <AlertTriangle size={30} />
            </div>

            <h2 style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'var(--text-main, #111827)',
              marginBottom: '0.5rem'
            }}>
              Something went wrong
            </h2>

            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-muted, #6b7280)',
              lineHeight: 1.5,
              marginBottom: '1.75rem'
            }}>
              The application encountered an unexpected runtime error while rendering this view. You can reload the portal or return to the sign-in screen.
            </p>

            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '1.5rem'
            }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '999px',
                  background: 'var(--crimson-core, #8b0000)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={15} />
                Reload Portal
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '999px',
                  background: 'transparent',
                  color: 'var(--text-secondary, #4b5563)',
                  border: '1px solid var(--border-hairline, rgba(0,0,0,0.15))',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                <Home size={15} />
                Return to Login
              </button>
            </div>

            {this.state.error && (
              <details style={{
                textAlign: 'left',
                background: 'rgba(0,0,0,0.03)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: 'var(--text-muted, #6b7280)',
                cursor: 'pointer'
              }}>
                <summary style={{ fontWeight: 600 }}>Diagnostic Details</summary>
                <pre style={{
                  marginTop: '0.5rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'monospace'
                }}>
                  {this.state.error?.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
