import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsCollection = collection(db, 'projects');
        const projectSnapshot = await getDocs(projectsCollection);
        const projectList = projectSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProjects(projectList);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setDataLoading(false);
      }
    };

    if (isAdmin) {
      fetchProjects();
    }
  }, [isAdmin]);

  const handleDelete = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteDoc(doc(db, 'projects', projectId));
        setProjects(projects.filter(project => project.id !== projectId));
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Failed to delete project');
      }
    }
  };

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
          <Link to="/admin/add-project" className="admin-button">
            Add New Project
          </Link>
          <Link to="/admin/add-blog" className="admin-button">
            Add New Blog Post
          </Link>
        </div>
      </div>

      <div className="admin-section">
        <h2>Projects</h2>
        <div className="project-list">
          {projects.map(project => (
            <div key={project.id} className="project-item">
              <div className="project-info">
                <img 
                  src={project.imageUrl} 
                  alt={project.title} 
                  className="project-thumbnail"
                />
                <div className="project-details">
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                  <div className="project-technologies">
                    {project.technologies.map((tech, index) => (
                      <span key={index} className="technology-tag">{tech}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="project-actions">
                <Link 
                  to={`/admin/edit-project/${project.id}`} 
                  className="edit-button"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="delete-button"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Admin; 