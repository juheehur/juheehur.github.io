import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

function EditProject() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [technologies, setTechnologies] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [currentImage, setCurrentImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const projectDoc = await getDoc(doc(db, 'projects', projectId));
        if (projectDoc.exists()) {
          const data = projectDoc.data();
          setTitle(data.title || '');
          setDescription(data.description || '');
          setTechnologies(data.technologies?.join(', ') || '');
          setLiveUrl(data.liveUrl || '');
          setGithubUrl(data.githubUrl || '');
          setCurrentImage(data.imageUrl || '');
        } else {
          setError('Project not found');
        }
      } catch (error) {
        console.error('Error fetching project:', error);
        setError('Failed to load project');
      }
    };

    fetchProject();
  }, [projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await updateDoc(doc(db, 'projects', projectId), {
        title,
        description,
        technologies: technologies.split(',').map(tech => tech.trim()),
        liveUrl,
        githubUrl,
        updatedAt: new Date().toISOString()
      });

      navigate('/admin');
    } catch (error) {
      console.error('Error updating project:', error);
      setError('Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="edit-project">
      <h2>Edit Project</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Description:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Technologies (comma-separated):</label>
          <input
            type="text"
            value={technologies}
            onChange={(e) => setTechnologies(e.target.value)}
            placeholder="React, Firebase, CSS"
            required
          />
        </div>

        <div className="form-group">
          <label>Live URL:</label>
          <input
            type="url"
            value={liveUrl}
            onChange={(e) => setLiveUrl(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>GitHub URL:</label>
          <input
            type="url"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Current Image:</label>
          {currentImage && (
            <img 
              src={currentImage} 
              alt="Current project" 
              className="current-image"
            />
          )}
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button 
            type="button" 
            onClick={() => navigate('/admin')}
            className="cancel-button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditProject; 