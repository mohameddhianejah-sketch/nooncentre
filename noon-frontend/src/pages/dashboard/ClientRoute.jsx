import { Navigate } from 'react-router-dom';
import { getClient } from '../../api';

/** Guards /dashboard — requires an authenticated client session (noon_client). */
export default function ClientRoute({ children }) {
  const client = getClient();
  if (!client?.session_token) {
    return <Navigate to="/contact?mode=login#booking" replace />;
  }
  return children;
}