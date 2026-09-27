import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SpinningBorderButton } from '../../components/SpinningBorderButton';
import logo from '../../assets/logo.png';

export default function Login() {
  const { login, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const { success } = await login(email.trim(), password);
    setLoading(false);
    if (success) navigate('/admin');
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
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              autoComplete="email"
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
            {loading ? 'Connexion...' : 'Se connecter'}
          </SpinningBorderButton>
        </form>
      </div>
    </div>
  );
}
