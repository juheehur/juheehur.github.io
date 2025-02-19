import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import CodeEditor from '../../components/CodeEditor';

function EditBlog() {
  const { postId } = useParams();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [readTime, setReadTime] = useState('');
  const [coverImage, setCoverImage] = useState(null);
  const [currentCoverUrl, setCurrentCoverUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef(null);
  const [codeEditorOpen, setCodeEditorOpen] = useState(false);
  const [codeContent, setCodeContent] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 블로그 포스트 데이터 가져오기
        const postDoc = doc(db, 'blog-posts', postId);
        const postSnapshot = await getDoc(postDoc);
        
        if (postSnapshot.exists()) {
          const postData = postSnapshot.data();
          setTitle(postData.title);
          setContent(postData.content);
          setReadTime(postData.readTime.toString());
          setCurrentCoverUrl(postData.coverImageUrl);
          setSelectedProject(postData.relatedProject?.id || '');
        }

        // 프로젝트 목록 가져오기
        const projectsSnapshot = await getDocs(collection(db, 'projects'));
        const projectsList = projectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProjects(projectsList);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [postId]);

  const validateImage = (file) => {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Only JPG, PNG and GIF files are allowed');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size must be less than 5MB');
    }

    return true;
  };

  const uploadToImgBB = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.REACT_APP_IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        return data.data.display_url;
      } else {
        console.error('ImgBB error:', data.error);
        throw new Error(data.error?.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading to imgBB:', error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    try {
      if (file && validateImage(file)) {
        setCoverImage(file);
      }
    } catch (error) {
      alert(error.message);
      e.target.value = '';
    }
  };

  const insertTextAtCursor = (text) => {
    const textarea = textareaRef.current;
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const before = content.substring(0, startPos);
    const after = content.substring(endPos);
    
    setContent(before + text + after);
    
    setTimeout(() => {
      textarea.selectionStart = startPos + text.length;
      textarea.selectionEnd = startPos + text.length;
      textarea.focus();
    }, 0);
  };

  const handleImageUpload = async (file) => {
    try {
      if (validateImage(file)) {
        const imageUrl = await uploadToImgBB(file);
        const markdownImage = `\n![${file.name}](${imageUrl})\n`;
        insertTextAtCursor(markdownImage);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      await handleImageUpload(imageFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = currentCoverUrl;
      if (coverImage) {
        try {
          imageUrl = await uploadToImgBB(coverImage);
        } catch (uploadError) {
          alert(`Image upload failed: ${uploadError.message}`);
          setLoading(false);
          return;
        }
      }

      const projectData = selectedProject 
        ? projects.find(p => p.id === selectedProject)
        : null;

      await updateDoc(doc(db, 'blog-posts', postId), {
        title,
        content,
        readTime: parseInt(readTime),
        coverImageUrl: imageUrl,
        relatedProject: selectedProject ? {
          id: selectedProject,
          title: projectData.title,
          thumbnail: projectData.thumbnail || '',
        } : null
      });

      navigate('/blog');
    } catch (error) {
      console.error('Error updating blog post:', error);
      alert('Error updating post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeInsert = () => {
    const codeBlock = `\n\`\`\`${selectedLanguage}\n${codeContent}\n\`\`\`\n`;
    insertTextAtCursor(codeBlock);
    setCodeEditorOpen(false);
    setCodeContent('');
  };

  return (
    <div className="add-blog">
      <h2>Edit Blog Post</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title:</label>
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="title-textarea"
            placeholder="Enter title..."
            rows="2"
          />
        </div>

        <div className="form-group content-group">
          <div className="content-header">
            <label>Content: (Markdown supported)</label>
            <div className="content-actions">
              <button 
                type="button" 
                onClick={() => setCodeEditorOpen(!codeEditorOpen)}
                className="preview-toggle"
              >
                {codeEditorOpen ? 'Close Code Editor' : 'Add Code'}
              </button>
              <button 
                type="button" 
                onClick={() => setPreviewMode(!previewMode)}
                className="preview-toggle"
              >
                {previewMode ? 'Edit' : 'Preview'}
              </button>
            </div>
          </div>
          
          {codeEditorOpen && (
            <div className="code-editor-container">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="language-select"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="css">CSS</option>
                <option value="html">HTML</option>
                <option value="markdown">Markdown</option>
              </select>
              <CodeEditor
                code={codeContent}
                onChange={(value) => setCodeContent(value)}
                language={selectedLanguage}
              />
              <button 
                type="button" 
                onClick={handleCodeInsert}
                className="insert-code-btn"
              >
                Insert Code
              </button>
            </div>
          )}
          
          {previewMode ? (
            <div className="markdown-preview">
              <ReactMarkdown 
                rehypePlugins={[rehypeRaw]} 
                remarkPlugins={[remarkGfm]}
              >
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <div 
              className={`textarea-wrapper ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows="15"
                placeholder="Write your content in markdown format... Drag and drop images here"
              />
              {isDragging && (
                <div className="drag-overlay">
                  Drop image here
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Related Project (Optional):</label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="">Select a project</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Read Time (minutes):</label>
          <input
            type="number"
            value={readTime}
            onChange={(e) => setReadTime(e.target.value)}
            required
            min="1"
          />
        </div>

        <div className="form-group">
          <label>Cover Image:</label>
          {currentCoverUrl && (
            <div className="current-cover">
              <img 
                src={currentCoverUrl} 
                alt="Current cover" 
                style={{ maxWidth: '200px', marginBottom: '1rem' }}
              />
              <p>Current cover image</p>
            </div>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif"
            onChange={handleImageChange}
          />
          <small>Leave empty to keep current image</small>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update Post'}
        </button>
      </form>
    </div>
  );
}

export default EditBlog; 