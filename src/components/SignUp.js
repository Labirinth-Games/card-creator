import React, { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import './SignUp.css';
import { FiUser, FiLock, FiMail, FiUserPlus } from 'react-icons/fi';

function SignUp({ onSignUp }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      onSignUp(userCredential.user);
    } catch (err) {
      setError('Erro ao criar conta: ' + (err.message || '')); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <form className="signup-form" onSubmit={handleSubmit}>
        <div className="signup-header">
          <FiUserPlus style={{fontSize: 32, color: '#1e40af', marginBottom: 8}} />
          <h1 className="signup-title">Criar Conta</h1>
        </div>
        <div className="input-group">
          <FiMail className="input-icon" />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="input-group">
          <FiLock className="input-icon" />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading} className="primary-signup-btn">
          <FiUserPlus style={{marginRight: 8}} />
          {loading ? 'Criando...' : 'Criar Conta'}
        </button>
        {error && <div className="signup-error">{error}</div>}
      </form>
    </div>
  );
}

export default SignUp;
