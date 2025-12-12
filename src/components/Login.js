import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { FiLogIn, FiUser, FiLock, FiMail, FiBox } from 'react-icons/fi';
import './Login.css';

function Login({ onLogin, onShowSignUp }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      onLogin(result.user);
    } catch (err) {
      setError('Falha ao autenticar com Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      onLogin(userCredential.user);
    } catch (err) {
      setError('Email ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <FiBox size={48} className="login-logo" color="var(--primary-color)" />
        <h1 className="login-title">Bem-vindo ao Card Creator</h1>
        <p className="login-subtitle">Faça login para continuar</p>
        
        <form onSubmit={handleSubmit} style={{width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p style={{ color: 'var(--danger-color)', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
          <button type="submit" disabled={loading}>
            <FiLogIn />
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <button type="button" className="secondary" onClick={handleGoogleLogin} disabled={loading}>
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style={{width: 20, height: 20}} />
            Entrar com Google
          </button>
          <p style={{color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '1rem'}}>
            Não tem uma conta?{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); onShowSignUp(); }} style={{color: 'var(--primary-color)', fontWeight: 500}}>
              Crie uma agora
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
