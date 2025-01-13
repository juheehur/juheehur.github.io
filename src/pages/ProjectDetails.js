import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import '../styles/projectDetails.css';

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
    <div className="project-details-container">
      <div className="project-details-header">
        <h1 className="project-details-title">{project.title}</h1>
        {project.description && (
          <p className="project-details-description">{project.description}</p>
        )}
        <div className="project-details-links">
          {project.liveUrl && (
            <a 
              className="project-details-link"
              href={project.liveUrl} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Live Demo
            </a>
          )}
          {project.githubUrl && (
            <a 
              className="project-details-link"
              href={project.githubUrl} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          )}
        </div>
      </div>
      <div className="project-details-content">
        {project.imageUrl && (
          <img 
            className="project-details-image" 
            src={project.imageUrl} 
            alt={project.title} 
          />
        )}

        <div className="project-details-info-grid">
          <div className="project-details-info-section">
            <h2>Project Overview</h2>
            <div className="project-details-meta">
              {project.projectType && (
                <div className="project-details-meta-item">
                  <span className="project-details-meta-label">Project Type:</span>
                  <span className="project-details-meta-value">
                    {project.projectType === 'individual' ? 'Individual Project' : 'Team Project'}
                  </span>
                </div>
              )}
              {project.duration && (
                <div className="project-details-meta-item">
                  <span className="project-details-meta-label">Duration:</span>
                  <span className="project-details-meta-value">{project.duration}</span>
                </div>
              )}
              {project.totalTime && (
                <div className="project-details-meta-item">
                  <span className="project-details-meta-label">Total Time:</span>
                  <span className="project-details-meta-value">{project.totalTime}</span>
                </div>
              )}
            </div>
          </div>

          <div className="project-details-info-section">
            <h2>Technologies</h2>
            {project.skillTags && (
              <div className="project-details-tag-section">
                <h3>Skills & Tools</h3>
                <div className="project-details-tags">
                  {project.skillTags.map((skill, index) => (
                    <span key={`skill-${index}`} className="project-details-tag">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {project.roleTags && (
              <div className="project-details-tag-section">
                <h3>Roles</h3>
                <div className="project-details-tags">
                  {project.roleTags.map((role, index) => (
                    <span key={`role-${index}`} className="project-details-tag">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {project.document && (
          <div className="project-details-info-section">
            <div className="project-details-markdown">
              <ReactMarkdown 
                rehypePlugins={[rehypeRaw]} 
                remarkPlugins={[remarkGfm]}
              >
                {project.document}
              </ReactMarkdown>
            </div>
          </div>
        )}

        <div className="project-details-markdown">
          <ReactMarkdown 
            rehypePlugins={[rehypeRaw]} 
            remarkPlugins={[remarkGfm]}
          >
            {project.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

export default ProjectDetails; 