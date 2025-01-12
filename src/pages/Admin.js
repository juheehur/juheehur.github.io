import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import styled from 'styled-components';

const AdminDashboard = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const AdminHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const AdminActions = styled.div`
  display: flex;
  gap: 1rem;
`;

const AdminButton = styled(Link)`
  background: #4A90E2;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  text-decoration: none;
  transition: background 0.2s ease;

  &:hover {
    background: #357ABD;
  }
`;

const ProjectList = styled.div`
  display: grid;
  gap: 2rem;
`;

const ProjectItem = styled.div`
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`;

const ProjectInfo = styled.div`
  display: flex;
  gap: 2rem;
  padding: 1.5rem;
`;

const ProjectThumbnail = styled.img`
  width: 200px;
  height: 150px;
  object-fit: cover;
  border-radius: 4px;
`;

const ProjectDetails = styled.div`
  flex: 1;
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const Tag = styled.span`
  background: #f0f0f0;
  color: #333;
  padding: 0.25rem 0.5rem;
  border-radius: 20px;
  font-size: 0.9rem;
`;

const ProjectActions = styled.div`
  display: flex;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: #f8f9fa;
  border-top: 1px solid #eee;
`;

const ActionButton = styled.button`
  background: ${props => props.isDelete ? '#dc3545' : '#4A90E2'};
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.9;
  }
`;

const EditButton = styled(Link)`
  background: #4A90E2;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  text-decoration: none;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.9;
  }
`;

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
    <AdminDashboard>
      <AdminHeader>
        <h1>Admin Dashboard</h1>
        <AdminActions>
          <AdminButton to="/admin/add-project">
            Add New Project
          </AdminButton>
          <AdminButton to="/admin/add-blog">
            Add New Blog Post
          </AdminButton>
        </AdminActions>
      </AdminHeader>

      <h2>Projects</h2>
      <ProjectList>
        {projects.map(project => (
          <ProjectItem key={project.id}>
            <ProjectInfo>
              {project.imageUrl && (
                <ProjectThumbnail 
                  src={project.imageUrl} 
                  alt={project.title} 
                />
              )}
              <ProjectDetails>
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                <TagsContainer>
                  {project.skillTags?.map((skill, index) => (
                    <Tag key={index} className="skill-tag">{skill}</Tag>
                  ))}
                  {project.roleTags?.map((role, index) => (
                    <Tag key={`role-${index}`} className="role-tag">{role}</Tag>
                  ))}
                </TagsContainer>
              </ProjectDetails>
            </ProjectInfo>
            <ProjectActions>
              <EditButton to={`/admin/edit-project/${project.id}`}>
                Edit
              </EditButton>
              <ActionButton 
                isDelete 
                onClick={() => handleDelete(project.id)}
              >
                Delete
              </ActionButton>
            </ProjectActions>
          </ProjectItem>
        ))}
      </ProjectList>
    </AdminDashboard>
  );
}

export default Admin; 