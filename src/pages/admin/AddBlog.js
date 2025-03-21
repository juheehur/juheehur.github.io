import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import CodeEditor from '../../components/CodeEditor';
import { pushCodeToGithub, REPO_OWNER, REPO_NAME } from '../../utils/gitUtils';
import '../../styles/addBlog.css';

function AddBlog() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef(null);
  const [postType, setPostType] = useState('coding test');
  const [showCompiler, setShowCompiler] = useState(true);
  const [pythonCode, setPythonCode] = useState('');
  const [compilerOutput, setCompilerOutput] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [existingTypes, setExistingTypes] = useState([]);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [codeEditorOpen, setCodeEditorOpen] = useState(false);
  const [codeContent, setCodeContent] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [isGitPushing, setIsGitPushing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [customType, setCustomType] = useState('');

  // 프로젝트 목록 가져오기
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsSnapshot = await getDocs(collection(db, 'projects'));
        const projectsList = projectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProjects(projectsList);
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };

    fetchProjects();
  }, []);

  // 기존 타입들을 가져오는 함수
  const fetchExistingTypes = async () => {
    try {
      const postsSnapshot = await getDocs(collection(db, 'blog-posts'));
      const types = new Set();
      
      postsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.postType) {
          types.add(data.postType);
        }
      });
      
      setExistingTypes(Array.from(types));
    } catch (error) {
      console.error('Error fetching existing types:', error);
    }
  };

  // 컴포넌트 마운트 시 기존 타입들을 가져옴
  useEffect(() => {
    fetchExistingTypes();
  }, []);

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
      if (!process.env.REACT_APP_IMGBB_API_KEY) {
        throw new Error('ImgBB API key is not configured');
      }

      // URL에 직접 API 키를 포함
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.REACT_APP_IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        return data.data.display_url;  // display_url 사용
      } else {
        throw new Error(data.error?.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading to ImgBB:', error);
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
      e.target.value = ''; // 파일 선택 초기화
    }
  };

  const insertTextAtCursor = (text) => {
    const textarea = textareaRef.current;
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const before = content.substring(0, startPos);
    const after = content.substring(endPos);
    
    setContent(before + text + after);
    
    // 커서 위치 조정
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

  // Create default cover image with blue color
  const createDefaultCoverImage = async () => {
    // Create a canvas element
    const canvas = document.createElement('canvas');
    canvas.width = 1200;  // Default width
    canvas.height = 630;  // Default height (16:9 ratio)
    
    // Get the context and fill with blue color
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0064FF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Convert canvas to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(new File([blob], 'default-cover.png', { type: 'image/png' }));
      }, 'image/png');
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = '';
      if (coverImage) {
        try {
          imageUrl = await uploadToImgBB(coverImage);
        } catch (uploadError) {
          alert(`Image upload failed: ${uploadError.message}`);
          setLoading(false);
          return;
        }
      } else {
        // Create and upload default blue cover image
        try {
          const defaultImage = await createDefaultCoverImage();
          imageUrl = await uploadToImgBB(defaultImage);
        } catch (defaultImageError) {
          console.error('Failed to create default cover image:', defaultImageError);
          setLoading(false);
          return;
        }
      }

      const projectData = selectedProject 
        ? projects.find(p => p.id === selectedProject)
        : null;

      // If it's a coding test post and contains Python code, push to GitHub
      let gitHubFileName = null;
      let gitHubError = null;
      
      if (postType === 'coding test' && content.includes('```python')) {
        setIsGitPushing(true);
        try {
          // Generate default file name if none provided
          const defaultFileName = fileName.trim() || title.toLowerCase().replace(/[^a-z0-9가-힣\s]/g, '').replace(/\s+/g, '_');
          
          gitHubFileName = await pushCodeToGithub(title, content, defaultFileName);
          if (gitHubFileName) {
            console.log('Successfully pushed to GitHub:', gitHubFileName);
          } else {
            console.log('No Python code blocks found to push');
          }
        } catch (gitError) {
          console.error('GitHub push error:', gitError);
          gitHubError = gitError.message;
          const shouldContinue = window.confirm(
            'Failed to push code to GitHub:\n' +
            gitError.message + '\n\n' +
            'Do you want to continue saving the blog post?'
          );
          if (!shouldContinue) {
            setLoading(false);
            setIsGitPushing(false);
            return;
          }
        } finally {
          setIsGitPushing(false);
        }
      }

      // Add the blog post
      const blogPost = {
        title,
        content,
        coverImageUrl: imageUrl,
        date: new Date().toISOString(),
        author: 'Your Name',
        postType: postType === 'general' ? customType : postType,
        relatedProject: selectedProject ? {
          id: selectedProject,
          title: projectData.title,
          thumbnail: projectData.thumbnail || '',
        } : null
      };

      // Add GitHub information if available
      if (gitHubFileName) {
        blogPost.githubLink = `https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/main/${gitHubFileName}`;
      }
      if (gitHubError) {
        blogPost.githubError = gitHubError;
      }

      await addDoc(collection(db, 'blog-posts'), blogPost);
      navigate('/blog');
    } catch (error) {
      console.error('Error adding blog post:', error);
      alert('Error creating blog post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePostTypeChange = (type) => {
    setPostType(type);
    if (type === 'general') {
      setShowCompiler(false);
      setCustomType('');
    } else {
      setShowCompiler(true);
    }
  };

  const handleCodeInsert = () => {
    const codeBlock = `\n\`\`\`${selectedLanguage}\n${codeContent}\n\`\`\`\n`;
    insertTextAtCursor(codeBlock);
    setCodeEditorOpen(false);
    setCodeContent('');
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        try {
          if (validateImage(file)) {
            setCoverImage(file);
            // Create a preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
              const previewContainer = document.getElementById('cover-image-preview');
              if (previewContainer) {
                previewContainer.style.backgroundImage = `url(${reader.result})`;
                previewContainer.style.display = 'block';
              }
            };
            reader.readAsDataURL(file);
          }
        } catch (error) {
          alert(error.message);
        }
      }
    }
  };

  // Python 코드 실행 함수 수정
  const runPythonCode = async () => {
    if (!pythonCode.trim()) {
      setCompilerOutput('코드를 입력해주세요.');
      return;
    }

    setIsCompiling(true);
    try {
      // 코드와 실행 결과를 본문에 삽입
      const codeBlock = `\`\`\`python\n${pythonCode}\n\`\`\`\n\n실행 결과:\n\`\`\`\n${compilerOutput}\n\`\`\`\n`;
      
      // 기존 content에 추가
      setContent(prev => {
        if (textareaRef.current && textareaRef.current.selectionStart !== undefined) {
          const start = textareaRef.current.selectionStart;
          const end = textareaRef.current.selectionEnd;
          return prev.substring(0, start) + codeBlock + prev.substring(end);
        }
        return prev + codeBlock;
      });

    } catch (error) {
      console.error('Compiler error:', error);
      setCompilerOutput('컴파일 에러: ' + error.message);
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="add-blog">
      <h2>새 블로그 포스트 작성</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <div className="post-type-selector">
            <button
              type="button"
              className={`type-button ${postType === 'general' ? 'active' : ''}`}
              onClick={() => handlePostTypeChange('general')}
            >
              일반 글
            </button>
            <button
              type="button"
              className={`type-button ${postType === 'coding test' ? 'active' : ''}`}
              onClick={() => handlePostTypeChange('coding test')}
            >
              코딩 테스트 기록
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading || isGitPushing} className="blog-publish-button">
          {loading ? 'Publishing...' : isGitPushing ? 'Pushing to GitHub...' : 'Publish Post'}
        </button>

        {postType === 'coding test' ? (
          <div className="coding-test-layout">
            <div className="left-panel">
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="title-textarea"
                placeholder="문제 제목을 입력하세요..."
              />
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                className="problem-description"
                placeholder="문제 설명, 제한사항, 입출력 예시 등을 작성하세요..."
              />
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="GitHub 파일명 (선택사항)"
                className="file-name-input"
              />
            </div>

            <div className="right-panel">
              <div className="python-compiler form-group">
                <CodeEditor
                  code={pythonCode}
                  onChange={setPythonCode}
                  language="python"
                  onRun={(output) => {
                    setCompilerOutput(output);
                    runPythonCode();
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="general-post-content">
              <div className="form-group title-group">
                <label>Title:</label>
                <textarea
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="title-textarea"
                  placeholder="제목을 입력하세요..."
                  rows="1"
                />
              </div>

              <div className="form-group content-group">
                <div className="content-header">
                  <button 
                    type="button" 
                    onClick={() => setPreviewMode(!previewMode)}
                    className="preview-toggle"
                  >
                    {previewMode ? 'Edit' : 'Preview'}
                  </button>
                </div>
                
                {previewMode ? (
                  <div className="markdown-preview">
                    <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
                      {content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="textarea-wrapper">
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      required
                      placeholder="내용을 입력하세요..."
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="post-options">
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
                <label>Cover Image:</label>
                <div 
                  className="cover-image-input"
                  onPaste={handlePaste}
                  tabIndex="0"
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    onChange={handleImageChange}
                  />
                  <div id="cover-image-preview" className="cover-image-preview"></div>
                  <p className="help-text">You can also paste (Ctrl+V) an image here</p>
                </div>
              </div>

              <div className="form-group">
                <label>Post Type:</label>
                <div className="type-input-container">
                  <input
                    type="text"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    onFocus={() => setShowTypeDropdown(true)}
                    disabled={selectedProject}
                    placeholder="타입을 입력하세요 (예: 일기, 미니프로젝트...)"
                  />
                  {showTypeDropdown && existingTypes.length > 0 && !selectedProject && (
                    <div className="type-suggestions">
                      {existingTypes
                        .filter(type => type.toLowerCase().includes(customType.toLowerCase()))
                        .map(type => (
                          <div
                            key={type}
                            className="type-suggestion-item"
                            onClick={() => {
                              setCustomType(type);
                              setShowTypeDropdown(false);
                            }}
                          >
                            #{type}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                {selectedProject && (
                  <small className="help-text">
                    * 프로젝트가 연결된 글은 타입을 선택할 수 없습니다.
                  </small>
                )}
              </div>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

export default AddBlog; 