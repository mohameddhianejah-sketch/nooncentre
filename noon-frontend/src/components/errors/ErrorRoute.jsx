import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import ErrorPage from './ErrorPage';

/**
 * Route-level entry point for page-level API failures.
 *
 * Usage:
 *   /error?code=500&next=/admin
 *
 * `code` selects the error state (unknown → generic "ERROR").
 * `next` (optional) is the route the "Try Again" action should revisit.
 */
export default function ErrorRoute() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const code = params.get('code');
  const next = params.get('next');

  const handleRetry = () => {
    if (next) {
      navigate(next);
      return;
    }
    // No explicit target: re-render the same error route (no full reload).
    navigate(`${location.pathname}${location.search}`, { replace: true });
  };

  return <ErrorPage code={code} onRetry={handleRetry} />;
}