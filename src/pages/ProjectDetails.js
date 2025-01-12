import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import styled from 'styled-components';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

const ProjectContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const ProjectHeader = styled.div`
  margin-bottom: 2rem;
  text-align: center;
`;

const ProjectTitle = styled.h1`
  color: #1C3D5A;
  margin-bottom: 1rem;
`;

const ProjectLinks = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
`;

const ProjectLink = styled.a`
  background: #4A90E2;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  text-decoration: none;
  transition: background 0.2s ease;

  &:hover {
    background: #357ABD;
  }
`;

const ProjectContent = styled.div`
  display: grid;
  gap: 2rem;
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const ProjectImage = styled.img`
  width: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const ProjectInfo = styled.div`
  h2 {
    color: #1C3D5A;
    margin: 1.5rem 0 1rem;
    
    &:first-child {
      margin-top: 0;
    }
  }

  p {
    color: #666;
    line-height: 1.6;
    margin-bottom: 1rem;
  }
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1rem 0;
`;

const Tag = styled.span`
  background: ${props => props.type === 'role' ? '#E3F2FD' : '#F5F5F5'};
  color: ${props => props.type === 'role' ? '#1976D2' : '#333'};
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.9rem;
`;

const DocumentContainer = styled.div`
  grid-column: 1 / -1;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #eee;

  .custom-html-style {
    font-family: 'Pretendard', sans-serif;
    line-height: 1.6;
    
    h1, h2, h3, h4, h5, h6 {
      color: #1C3D5A;
      margin: 1.5rem 0 1rem;
    }

    p {
      margin-bottom: 1rem;
    }

    img {
      max-width: 100%;
      border-radius: 4px;
      margin: 1rem 0;
    }

    code {
      background: #f5f5f5;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: monospace;
    }

    pre {
      background: #f5f5f5;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      
      code {
        background: none;
        padding: 0;
      }
    }
  }
`;

function ProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const projectDoc = doc(db, 'projects', id);
        const projectSnapshot = await getDoc(projectDoc);
        
        if (projectSnapshot.exists()) {
          setProject({ id: projectSnapshot.id, ...projectSnapshot.data() });
        }
      } catch (error) {
        console.error('Error fetching project:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!project) return <div>Project not found</div>;

  return (
    <ProjectContainer>
      <ProjectHeader>
        <ProjectTitle>{project.title}</ProjectTitle>
        <ProjectLinks>
          {project.liveUrl && (
            <ProjectLink 
              href={project.liveUrl} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Live Demo
            </ProjectLink>
          )}
          {project.githubUrl && (
            <ProjectLink 
              href={project.githubUrl} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              GitHub
            </ProjectLink>
          )}
        </ProjectLinks>
      </ProjectHeader>

      <ProjectContent>
        {project.imageUrl && (
          <ProjectImage src={project.imageUrl} alt={project.title} />
        )}
        
        <ProjectInfo>
          <h2>Description</h2>
          <p>{project.description}</p>

          <h2>Skills & Technologies</h2>
          <TagsContainer>
            {project.skillTags?.map((skill, index) => (
              <Tag key={index} type="skill">{skill}</Tag>
            ))}
          </TagsContainer>

          <h2>Role Types</h2>
          <TagsContainer>
            {project.roleTags?.map((role, index) => (
              <Tag key={`role-${index}`} type="role">{role}</Tag>
            ))}
          </TagsContainer>
        </ProjectInfo>

        {project.document && (
          <DocumentContainer>
            <h2>Project Documentation</h2>
            <ReactMarkdown
              rehypePlugins={[rehypeRaw]}
              remarkPlugins={[remarkGfm]}
              className="custom-html-style"
            >
              {project.document}
            </ReactMarkdown>
          </DocumentContainer>
        )}
      </ProjectContent>
    </ProjectContainer>
  );
}

export default ProjectDetails; 