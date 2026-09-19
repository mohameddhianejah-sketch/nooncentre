import { Component } from 'react';
import { useLocation } from 'react-router-dom';
import ErrorPage from './ErrorPage';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, resetKey: props.resetKey };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  static getDerivedStateFromProps(props, state) {
    // Clear the fallback automatically whenever the user navigates,
    // so a single broken screen does not lock the whole app.
    if (state.error && state.resetKey !== props.resetKey) {
      return { error: null, resetKey: props.resetKey };
    }
    return null;
  }

  componentDidCatch(error, info) {
    // Development/debug logging only — never rendered to the user.
    console.error('[GlobalErrorBoundary] caught error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorPage
          code="ERROR"
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}

/**
 * Global screen-capture error boundary.
 *
 * Must be rendered inside <BrowserRouter> (and the Lang provider) so its
 * fallback can display router links and localized text.
 */
export default function GlobalErrorBoundary({ children }) {
  const location = useLocation();
  return <ErrorBoundary resetKey={location.key}>{children}</ErrorBoundary>;
}