import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import '../styles/admin.css';

function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [blogPosts, setBlogPosts] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState('projects');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projectsCollection = collection(db, 'projects');
        const projectSnapshot = await getDocs(projectsCollection);
        const projectList = projectSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProjects(projectList);

        const blogCollection = collection(db, 'blog-posts');
        const blogSnapshot = await getDocs(blogCollection);
        const blogList = blogSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBlogPosts(blogList);

        const questionsCollection = collection(db, 'questions');
        const questionsSnapshot = await getDocs(questionsCollection);
        const questionsList = questionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setQuestions(questionsList);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const handleDelete = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteDoc(doc(db, 'projects', projectId));
        await deleteDoc(doc(db, 'projects-en', projectId));
        setProjects(projects.filter(project => project.id !== projectId));
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Failed to delete project');
      }
    }
  };

  const handleDeleteBlog = async (postId) => {
    if (window.confirm('Are you sure you want to delete this blog post?')) {
      try {
        await deleteDoc(doc(db, 'blog-posts', postId));
        setBlogPosts(blogPosts.filter(post => post.id !== postId));
      } catch (error) {
        console.error('Error deleting blog post:', error);
        alert('Failed to delete blog post');
      }
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await deleteDoc(doc(db, 'questions', questionId));
        setQuestions(questions.filter(question => question.id !== questionId));
      } catch (error) {
        console.error('Error deleting question:', error);
        alert('Failed to delete question');
      }
    }
  };

  const handlePriorityChange = async (projectId, newPriority) => {
    try {
      const projectRef = doc(db, 'projects', projectId);
      const projectRefEn = doc(db, 'projects-en', projectId);
      
      await Promise.all([
        updateDoc(projectRef, { priority: Number(newPriority) }),
        updateDoc(projectRefEn, { priority: Number(newPriority) })
      ]);

      setProjects(projects.map(project => 
        project.id === projectId 
          ? { ...project, priority: Number(newPriority) }
          : project
      ));
    } catch (error) {
      console.error('Error updating priority:', error);
      alert('Failed to update priority');
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBlogPosts = blogPosts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredQuestions = questions.filter(question =>
    question.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderStats = () => (
    <div className="stats-container">
      <div className="stat-card">
        <h3>Total Projects</h3>
        <p>{projects.length}</p>
      </div>
      <div className="stat-card">
        <h3>Total Blog Posts</h3>
        <p>{blogPosts.length}</p>
      </div>
      <div className="stat-card">
        <h3>Total Questions</h3>
        <p>{questions.length}</p>
      </div>
    </div>
  );

  if (loading || dataLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-actions">
          <Link to="/admin/add-project" className="admin-button">Add New Project</Link>
          <Link to="/admin/add-blog" className="admin-button">Add New Blog Post</Link>
          <Link to="/admin/add-question" className="admin-button">Add New Question</Link>
          <Link to="/admin/portfolio-summary" className="admin-button">Portfolio Summary</Link>
          <Link to="/admin/todos" className="admin-button">Todo List</Link>
        </div>
      </div>

      {renderStats()}

      <div className="tab-container">
        <div className="tab-list">
          <button 
            className={`tab ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            Projects
          </button>
          <button 
            className={`tab ${activeTab === 'blog' ? 'active' : ''}`}
            onClick={() => setActiveTab('blog')}
          >
            Blog Posts
          </button>
          <button 
            className={`tab ${activeTab === 'questions' ? 'active' : ''}`}
            onClick={() => setActiveTab('questions')}
          >
            Questions
          </button>
        </div>

        <div className="search-container">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {activeTab === 'projects' && (
          <div className="project-list">
            {filteredProjects.map(project => (
              <div key={project.id} className="project-item">
                <div className="project-info">
                  {project.imageUrl && (
                    <img src={project.imageUrl} alt={project.title} className="project-thumbnail" />
                  )}
                  <div className="project-details">
                    <h3>{project.title}</h3>
                    <p>{project.description}</p>
                    <div className="tags-container">
                      {project.skillTags?.map((skill, index) => (
                        <span key={index} className="tag">{skill}</span>
                      ))}
                      {project.roleTags?.map((role, index) => (
                        <span key={`role-${index}`} className="tag">{role}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="project-actions">
                  <div className="priority-controls">
                    <span>Priority:</span>
                    <input
                      type="number"
                      min="0"
                      value={project.priority || 0}
                      onChange={(e) => handlePriorityChange(project.id, e.target.value)}
                      className="priority-input"
                    />
                  </div>
                  <Link to={`/admin/edit-project/${project.id}`} className="edit-button">Edit</Link>
                  <button 
                    className="action-button delete"
                    onClick={() => handleDelete(project.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'blog' && (
          <div className="blog-list">
            {filteredBlogPosts.map(post => (
              <div key={post.id} className="blog-item">
                <div className="blog-info">
                  {post.coverImageUrl && (
                    <img src={post.coverImageUrl} alt={post.title} className="blog-thumbnail" />
                  )}
                  <div className="blog-details">
                    <h3>{post.title}</h3>
                    <div className="metadata">
                      <div>{formatDateTime(post.date)}</div>
                      <div>{post.readTime} min read</div>
                    </div>
                  </div>
                </div>
                <div className="blog-actions">
                  <Link to={`/admin/edit-blog/${post.id}`} className="edit-button">Edit</Link>
                  <button 
                    className="action-button delete"
                    onClick={() => handleDeleteBlog(post.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="questions-list">
            {filteredQuestions.map(question => (
              <div key={question.id} className="question-item">
                <div className="question-info">
                  <div className="question-details">
                    <h3>{question.title}</h3>
                    <div className="metadata">
                      <div>{formatDateTime(question.createdAt)}</div>
                      <div>{question.comments?.length || 0} answers</div>
                    </div>
                    <p>{question.description}</p>
                  </div>
                </div>
                <div className="question-actions">
                  <Link to={`/question/${question.id}`} className="edit-button">View Answers</Link>
                  <button 
                    className="action-button delete"
                    onClick={() => handleDeleteQuestion(question.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin; 