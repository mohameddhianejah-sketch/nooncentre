import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, getCaisseSession, setCaisseSession } from '../../api';
import { SpinningBorderButton } from '../../components/SpinningBorderButton';
import logo from '../../assets/logo.png';

export default function CaisseLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (getCaisseSession()?.token) return <Navigate to="/caisse" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.caisseLogin(username.trim().toLowerCase(), password);
      setCaisseSession({ token: data.token, username: data.username, name: data.name });
      navigate('/caisse', { replace: true });
    } catch (err) {
      setError(err.message || 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-wrap">
      <div className="admin-login-card">
        <div className="brand">
          <img src={logo} alt="NOON Center" style={{ height: 48, width: 48, borderRadius: '50%' }} />
        </div>
        <h2>Caisse</h2>
        <p className="sub">Connectez-vous avec votre compte caisse</p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label>Identifiant</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              autoComplete="username"
              required
              autoFocus
            />
          </div>
          <div className="form-row">
            <label>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <SpinningBorderButton type="submit" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Connexion...' : 'Ouvrir la caisse'}
          </SpinningBorderButton>
        </form>
      </div>
    </div>
  );
}
