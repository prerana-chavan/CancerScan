import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
    
    // Clear potentially corrupted auth state on fatal crash
    localStorage.removeItem('cancerscan_token');
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/welcome'; // Redirect to login
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            width: '100vw',
            backgroundColor: '#0a0f1a',
            color: '#e2e8f0',
            fontFamily: 'system-ui, sans-serif',
            padding: '20px',
            textAlign: 'center'
        }}>
          <div style={{
              background: '#1e293b',
              padding: '40px',
              borderRadius: '12px',
              border: '1px solid #ef4444',
              maxWidth: '600px',
              boxShadow: '0 10px 25px rgba(239, 68, 68, 0.2)'
          }}>
              <svg viewBox="0 0 24 24" style={{ width: 48, height: 48, stroke: '#ef4444', strokeWidth: 2, fill: 'none', margin: '0 auto 20px auto', display: 'block' }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px', color: '#f8fafc' }}>System Error Detected</h1>
              <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px' }}>
                  A critical issue occurred in the clinical interface. We have cleared your session to prevent data corruption.
              </p>
              
              <div style={{ background: '#0f172a', padding: '12px', borderRadius: '6px', textAlign: 'left', overflow: 'auto', maxHeight: '150px', marginBottom: '24px', fontSize: '12px', color: '#ef4444', fontFamily: 'monospace' }}>
                  {this.state.error && this.state.error.toString()}
              </div>

              <button 
                onClick={this.handleReset}
                style={{
                    background: '#06b6d4',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
              >
                  Restart Application
              </button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
