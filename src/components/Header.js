import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { auth, db } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { FaGithub, FaInstagram, FaLinkedin } from 'react-icons/fa';
import '../styles/Header.css';

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 14L11.1 11.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const MenuIcon = ({ isOpen }) => (
  isOpen ? (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ) : (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 7h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M4 12h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M4 17h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
);

function Header() {
  const { role, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({
    projects: [],
    blogs: [],
    todos: []
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const searchAllContent = async () => {
      if (!searchQuery.trim()) {
        setSearchResults({ projects: [], blogs: [], todos: [] });
        return;
      }

      setIsLoading(true);
      try {
        // Get all documents
        const [projectsSnapshot, blogsSnapshot, todosSnapshot] = await Promise.all([
          getDocs(collection(db, 'projects')),
          getDocs(collection(db, 'blogs')),
          getDocs(collection(db, 'todos'))
        ]);

        const searchTerm = searchQuery.toLowerCase();

        // Filter projects
        const projects = projectsSnapshot.docs
          .map(doc => ({ id: doc.id, type: 'project', ...doc.data() }))
          .filter(project => 
            project.title?.toLowerCase().includes(searchTerm) ||
            project.description?.toLowerCase().includes(searchTerm) ||
            project.technologies?.some(tech => tech.toLowerCase().includes(searchTerm))
          );

        // Filter blogs
        const blogs = blogsSnapshot.docs
          .map(doc => ({ id: doc.id, type: 'blog', ...doc.data() }))
          .filter(blog => 
            blog.title?.toLowerCase().includes(searchTerm) ||
            blog.description?.toLowerCase().includes(searchTerm) ||
            blog.content?.toLowerCase().includes(searchTerm)
          );

        // Filter todos
        const todos = todosSnapshot.docs
          .map(doc => ({ id: doc.id, type: 'todo', ...doc.data() }))
          .filter(todo => 
            todo.task?.toLowerCase().includes(searchTerm) ||
            todo.location?.toLowerCase().includes(searchTerm)
          )
          .sort((a, b) => b.date?.toMillis() - a.date?.toMillis());

        setSearchResults({ projects, blogs, todos });
      } catch (error) {
        console.error('Error searching content:', error);
      }
      setIsLoading(false);
    };

    const debounceTimer = setTimeout(searchAllContent, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleResultClick = (item) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    
    switch (item.type) {
      case 'project':
        navigate(`/project/${item.id}`);
        break;
      case 'blog':
        navigate(`/blog/${item.id}`);
        break;
      case 'todo':
        navigate(`/admin/add-todo`);
        break;
      default:
        break;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsMenuOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    let date;
    if (timestamp.toDate) {
      // Firestore Timestamp
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      // Unix timestamp
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      // JavaScript Date object
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      // ISO string or other date string
      date = new Date(timestamp);
    } else {
      return '';
    }

    if (isNaN(date.getTime())) return '';

    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <header className="header-container">
      <div className="header-content">
        <Link to="/" className="logo" onClick={() => setIsMenuOpen(false)}>Emily Juhee Hur</Link>
        
        <button 
          className="search-icon-button"
          onClick={() => setIsSearchOpen(true)}
          aria-label="Open search"
        >
          <SearchIcon />
        </button>

        <nav className={`nav ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/" className="nav-link" onClick={() => setIsMenuOpen(false)}>Home</Link>
          <Link to="/portfolio" className="nav-link" onClick={() => setIsMenuOpen(false)}>Portfolio</Link>
          <Link to="/blog" className="nav-link" onClick={() => setIsMenuOpen(false)}>Blog</Link>
          {user && (
            <>
              {role === 'admin' ? (
                <>
                  <Link to="/admin" className="nav-link" onClick={() => setIsMenuOpen(false)}>Admin</Link>
                  <Link to="/admin/add-blog" className="nav-link quick-add" onClick={() => setIsMenuOpen(false)}>
                    <span className="plus-icon">+</span> Blog
                  </Link>
                  <Link to="/admin/add-todo" className="nav-link quick-add" onClick={() => setIsMenuOpen(false)}>
                    <span className="plus-icon">+</span> Todo
                  </Link>
                </>
              ) : (
                <Link to="/profile" className="nav-link" onClick={() => setIsMenuOpen(false)}>Profile</Link>
              )}
              <button className="logout-button" onClick={handleLogout}>Logout</button>
            </>
          )}
          
          <div className="social-icons">
            <a href="https://www.instagram.com/diatomic_carbon" target="_blank" rel="noopener noreferrer" className="social-link">
              <FaInstagram />
            </a>
            <a href="https://github.com/diatomicC" target="_blank" rel="noopener noreferrer" className="social-link">
              <FaGithub />
            </a>
            <a href="https://www.linkedin.com/in/juhee-hur-637691170" target="_blank" rel="noopener noreferrer" className="social-link">
              <FaLinkedin />
            </a>
          </div>
        </nav>

        <button 
          className="mobile-menu-button" 
          onClick={toggleMenu}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        >
          <MenuIcon isOpen={isMenuOpen} />
        </button>
      </div>

      {/* Full Screen Search Modal */}
      {isSearchOpen && (
        <div className="search-modal" onClick={() => setIsSearchOpen(false)}>
          <div className="search-modal-content" onClick={e => e.stopPropagation()}>
            <form onSubmit={e => e.preventDefault()} className="search-modal-form">
              <SearchIcon />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setIsSearchOpen(false)}
                placeholder="Search everything..."
                autoFocus
              />
            </form>
            
            <div className="search-results">
              {isLoading ? (
                <div className="search-loading">Searching...</div>
              ) : (
                <>
                  {searchQuery.trim() && (
                    Object.entries(searchResults).some(([_, items]) => items.length > 0) ? (
                      <>
                        {searchResults.projects.length > 0 && (
                          <div className="result-section">
                            <h2 className="result-section-title">Projects</h2>
                            {searchResults.projects.map(project => (
                              <div
                                key={project.id}
                                className="search-result-item"
                                onClick={() => handleResultClick(project)}
                              >
                                {project.thumbnail && (
                                  <img src={project.thumbnail} alt={project.title} className="result-thumbnail" />
                                )}
                                <div className="result-info">
                                  <h3>{project.title}</h3>
                                  <p>{project.description}</p>
                                  <div className="result-tags">
                                    {project.technologies?.slice(0, 3).map((tech, index) => (
                                      <span key={index} className="result-tag">{tech}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {searchResults.blogs.length > 0 && (
                          <div className="result-section">
                            <h2 className="result-section-title">Blog Posts</h2>
                            {searchResults.blogs.map(blog => (
                              <div
                                key={blog.id}
                                className="search-result-item"
                                onClick={() => handleResultClick(blog)}
                              >
                                {blog.thumbnail && (
                                  <img src={blog.thumbnail} alt={blog.title} className="result-thumbnail" />
                                )}
                                <div className="result-info">
                                  <h3>{blog.title}</h3>
                                  <p>{blog.description || blog.content}</p>
                                  <div className="result-meta">
                                    <span className="result-date">{formatDate(blog.createdAt)}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {searchResults.todos.length > 0 && role === 'admin' && (
                          <div className="result-section">
                            <h2 className="result-section-title">Todos</h2>
                            {searchResults.todos.map(todo => (
                              <div
                                key={todo.id}
                                className="search-result-item"
                                onClick={() => handleResultClick(todo)}
                              >
                                <div className="result-info">
                                  <h3>{todo.task}</h3>
                                  <div className="result-meta">
                                    <span className="result-date">{formatDate(todo.date)}</span>
                                    {todo.location && (
                                      <span className="result-location">@ {todo.location}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="no-results">No results found</div>
                    )
                  )}
                </>
              )}
            </div>

            <button 
              className="search-modal-close"
              onClick={() => setIsSearchOpen(false)}
              aria-label="Close search"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header; 