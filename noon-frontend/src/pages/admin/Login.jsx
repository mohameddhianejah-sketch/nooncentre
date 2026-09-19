import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SpinningBorderButton } from '../../components/SpinningBorderButton';
import logo from '../../assets/logo.png';

export default function Login() {
  const { login, error } = useAuth();
  const [username, setUsername] = useState(import.meta.env.DEV ? 'admin' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? 'noonadmin2026' : '');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const ok = await login(username.trim(), password);
    setLoading(false);
    if (ok) navigate('/admin');
  }

  return (
    <div className="admin-login-wrap">
      <div className="admin-login-card">
        <div className="brand">
          <img src={logo} alt="NOON Center" style={{ height: 48, width: 48, borderRadius: '50%' }} />
        </div>
        <h2>Espace administration</h2>
        <p className="sub">Connectez-vous pour gérer NOON Center</p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label>Nom d'utilisateur</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </div>
          <div className="form-row">
            <label>Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <SpinningBorderButton type="submit" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </SpinningBorderButton>
        </form>
        {import.meta.env.DEV && (
          <p className="sub" style={{ marginTop: 16 }}>
            Compte local : <strong>admin</strong> / <strong>noonadmin2026</strong>
          </p>
        )}
      </div>
    </div>
  );
}
