import { useNavigate } from 'react-router-dom';
import '../styles/projectCard.css';

function ProjectCard({ project }) {
  const navigate = useNavigate();

  const handleCardClick = (e) => {
    // Prevent navigation if clicking on a link
    if (e.target.tagName.toLowerCase() === 'a') {
      return;
    }
    navigate(`/project/${project.id}`);
  };

  return (
    <div className="project-card" onClick={handleCardClick}>
      {project.imageUrl && (
        <img 
          className="project-image" 
          src={project.imageUrl} 
          alt={project.title} 
          loading="lazy"
          decoding="async"
        />
      )}
      <div className="project-content">
        <h3 className="project-title">{project.title}</h3>
        <p className="project-description">{project.description}</p>
        <div className="tags-container">
          {project.skillTags?.map((skill, index) => (
            <span key={index} className="tag skill">{skill}</span>
          ))}
          {project.roleTags?.map((role, index) => (
            <span key={`role-${index}`} className="tag role">{role}</span>
          ))}
        </div>
        <div className="project-links" onClick={e => e.stopPropagation()}>
          {project.liveUrl && (
            <a 
              className="project-link"
              href={project.liveUrl} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Live Demo
            </a>
          )}
          {project.githubUrl && (
            <a 
              className="project-link"
              href={project.githubUrl} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectCard; 