import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, githubProvider } from '../firebase/config';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FaGithub } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';

function Login() {
  const { isAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setTimeout(() => {
        navigate(isAdmin ? '/admin' : '/');
      }, 500);
    } catch (error) {
      switch (error.code) {
        case 'auth/user-not-found':
          setError('No account exists with this email');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password');
          break;
        default:
          setError('Failed to log in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setLoading(true);
    setError('');

    try {
      await signInWithPopup(auth, provider);
      setTimeout(() => {
        navigate(isAdmin ? '/admin' : '/');
      }, 500);
    } catch (error) {
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          setError('Login cancelled');
          break;
        case 'auth/account-exists-with-different-credential':
          setError('An account already exists with the same email but different sign-in credentials');
          break;
        default:
          setError('Failed to log in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Login</h2>
        {error && <p className="error-message">{error}</p>}
        
        <div className="social-login">
          <button 
            onClick={() => handleSocialLogin(googleProvider)}
            className="social-button google"
            disabled={loading}
          >
            <FcGoogle size={20} />
            Continue with Google
          </button>
          
          <button 
            onClick={() => handleSocialLogin(githubProvider)}
            className="social-button github"
            disabled={loading}
          >
            <FaGithub size={20} />
            Continue with GitHub
          </button>
        </div>

        <div className="divider">
          <span>or</span>
        </div>

        <form onSubmit={handleEmailLogin}>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login with Email'}
          </button>
        </form>
        <p className="auth-switch">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default Login; 