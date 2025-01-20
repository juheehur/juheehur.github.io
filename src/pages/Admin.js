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

const BlogList = styled.div`
  margin-top: 3rem;
  display: grid;
  gap: 2rem;
`;

const BlogItem = styled.div`
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`;

const BlogInfo = styled.div`
  display: flex;
  gap: 2rem;
  padding: 1.5rem;
`;

const BlogThumbnail = styled.img`
  width: 200px;
  height: 150px;
  object-fit: cover;
  border-radius: 4px;
`;

const BlogDetails = styled.div`
  flex: 1;
  
  h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.2rem;
    white-space: pre-line;
    line-height: 1.4;
  }

  .metadata {
    color: #666;
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }
`;

const TabContainer = styled.div`
  margin-bottom: 2rem;
`;

const TabList = styled.div`
  display: flex;
  gap: 1rem;
  border-bottom: 1px solid #eee;
  margin-bottom: 2rem;
`;

const Tab = styled.button`
  padding: 0.8rem 1.5rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1rem;
  color: ${props => props.active ? '#4A90E2' : '#666'};
  border-bottom: 2px solid ${props => props.active ? '#4A90E2' : 'transparent'};
  transition: all 0.2s ease;

  &:hover {
    color: #4A90E2;
  }
`;

const SearchContainer = styled.div`
  margin-bottom: 2rem;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  margin-bottom: 1rem;

  &:focus {
    outline: none;
    border-color: #4A90E2;
  }
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  h3 {
    margin: 0;
    color: #666;
    font-size: 0.9rem;
  }

  p {
    margin: 0.5rem 0 0 0;
    font-size: 1.5rem;
    font-weight: bold;
    color: #4A90E2;
  }
`;

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
    <StatsContainer>
      <StatCard>
        <h3>Total Projects</h3>
        <p>{projects.length}</p>
      </StatCard>
      <StatCard>
        <h3>Total Blog Posts</h3>
        <p>{blogPosts.length}</p>
      </StatCard>
      <StatCard>
        <h3>Total Questions</h3>
        <p>{questions.length}</p>
      </StatCard>
    </StatsContainer>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'projects':
        return (
          <ProjectList>
            {filteredProjects.map(project => (
              <ProjectItem key={project.id}>
                <ProjectInfo>
                  {project.imageUrl && (
                    <ProjectThumbnail src={project.imageUrl} alt={project.title} />
                  )}
                  <ProjectDetails>
                    <h3>{project.title}</h3>
                    <p>{project.description}</p>
                    <TagsContainer>
                      {project.skillTags?.map((skill, index) => (
                        <Tag key={index}>{skill}</Tag>
                      ))}
                      {project.roleTags?.map((role, index) => (
                        <Tag key={`role-${index}`}>{role}</Tag>
                      ))}
                    </TagsContainer>
                  </ProjectDetails>
                </ProjectInfo>
                <ProjectActions>
                  <EditButton to={`/admin/edit-project/${project.id}`}>Edit</EditButton>
                  <ActionButton isDelete onClick={() => handleDelete(project.id)}>Delete</ActionButton>
                </ProjectActions>
              </ProjectItem>
            ))}
          </ProjectList>
        );
      case 'blog':
        return (
          <BlogList>
            {filteredBlogPosts.map(post => (
              <BlogItem key={post.id}>
                <BlogInfo>
                  {post.coverImageUrl && (
                    <BlogThumbnail src={post.coverImageUrl} alt={post.title} />
                  )}
                  <BlogDetails>
                    <h3>{post.title}</h3>
                    <div className="metadata">
                      <div>{formatDateTime(post.date)}</div>
                      <div>{post.readTime} min read</div>
                    </div>
                  </BlogDetails>
                </BlogInfo>
                <ProjectActions>
                  <EditButton to={`/admin/edit-blog/${post.id}`}>Edit</EditButton>
                  <ActionButton isDelete onClick={() => handleDeleteBlog(post.id)}>Delete</ActionButton>
                </ProjectActions>
              </BlogItem>
            ))}
          </BlogList>
        );
      case 'questions':
        return (
          <BlogList>
            {filteredQuestions.map(question => (
              <BlogItem key={question.id}>
                <BlogInfo>
                  <BlogDetails>
                    <h3>{question.title}</h3>
                    <div className="metadata">
                      <div>{formatDateTime(question.createdAt)}</div>
                      <div>{question.comments?.length || 0} answers</div>
                    </div>
                    <p>{question.description}</p>
                  </BlogDetails>
                </BlogInfo>
                <ProjectActions>
                  <EditButton to={`/question/${question.id}`}>View Answers</EditButton>
                  <ActionButton isDelete onClick={() => handleDeleteQuestion(question.id)}>Delete</ActionButton>
                </ProjectActions>
              </BlogItem>
            ))}
          </BlogList>
        );
      default:
        return null;
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
          <AdminButton to="/admin/add-project">Add New Project</AdminButton>
          <AdminButton to="/admin/add-blog">Add New Blog Post</AdminButton>
          <AdminButton to="/admin/add-question">Add New Question</AdminButton>
          <AdminButton to="/admin/portfolio-summary">Portfolio Summary</AdminButton>
          <AdminButton to="/admin/todos">Todo List</AdminButton>
        </AdminActions>
      </AdminHeader>

      {renderStats()}

      <TabContainer>
        <TabList>
          <Tab active={activeTab === 'projects'} onClick={() => setActiveTab('projects')}>
            Projects
          </Tab>
          <Tab active={activeTab === 'blog'} onClick={() => setActiveTab('blog')}>
            Blog Posts
          </Tab>
          <Tab active={activeTab === 'questions'} onClick={() => setActiveTab('questions')}>
            Questions
          </Tab>
        </TabList>

        <SearchContainer>
          <SearchInput
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchContainer>

        {renderContent()}
      </TabContainer>
    </AdminDashboard>
  );
}

export default Admin; 