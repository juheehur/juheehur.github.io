import { Link } from 'react-router-dom';
import { auth } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';

function Navbar() {
  const { user, isAdmin, role, loading } = useAuth();

  if (loading) return null;

  return (
    <nav className="navbar">
      <div className="nav-links">
        <Link to="/">Portfolio</Link>
        <Link to="/blog">Blog</Link>
        {user && (
          <span className={`user-role ${role}`}>
            {role}
          </span>
        )}
        {user ? (
          <>
            <Link to="/profile">Profile</Link>
            {isAdmin && <Link to="/admin">Admin</Link>}
            <button onClick={() => auth.signOut()}>Logout</button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar; 