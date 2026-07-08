import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="login-shell">
          <section className="login-card">
            <p className="eyebrow">Portal error</p>
            <h1>畫面發生錯誤</h1>
            <p>{this.state.error.message}</p>
            <button className="primary-login" onClick={() => window.location.reload()} type="button">
              Reload
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
