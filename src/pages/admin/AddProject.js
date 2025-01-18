import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import MdEditor from 'react-markdown-editor-lite';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import 'react-markdown-editor-lite/lib/index.css';
import '../../styles/editor.css';
import axios from 'axios';

const TagInput = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  min-height: 42px;
  
  &:focus-within {
    border-color: #4A90E2;
  }
`;

const Tag = styled.span`
  background: #4A90E2;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  
  button {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 0;
    font-size: 1.2rem;
    line-height: 1;
    
    &:hover {
      opacity: 0.8;
    }
  }
`;

const TagInputField = styled.input`
  border: none;
  outline: none;
  flex: 1;
  min-width: 120px;
  padding: 0.25rem;
`;

const Suggestions = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ccc;
  border-top: none;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
`;

const SuggestionItem = styled.div`
  padding: 0.5rem;
  cursor: pointer;
  
  &:hover {
    background: #f0f0f0;
  }
`;

const InputWrapper = styled.div`
  position: relative;
  margin-bottom: 1rem;
`;

const EditorWrapper = styled.div`
  .rc-md-editor {
    border: 1px solid #ccc;
    border-radius: 4px;
    min-height: 400px;
    
    .section-container {
      .input {
        font-family: 'Pretendard', monospace;
      }
    }
  }
  
  .custom-html-style {
    font-family: 'Pretendard', sans-serif;
    
    img {
      max-width: 100%;
      border-radius: 4px;
    }
    
    code {
      background-color: #f5f5f5;
      padding: 2px 4px;
      border-radius: 4px;
      font-family: monospace;
    }
    
    pre {
      background-color: #f5f5f5;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      
      code {
        background-color: transparent;
        padding: 0;
      }
    }
  }
`;

function AddProject() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skillTags, setSkillTags] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [existingSkills, setExistingSkills] = useState([]);
  const [roleTags, setRoleTags] = useState([]);
  const [roleInput, setRoleInput] = useState('');
  const [existingRoles, setExistingRoles] = useState([]);
  const [suggestions, setSuggestions] = useState({ skills: [], roles: [] });
  const [liveUrl, setLiveUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [document, setDocument] = useState('');
  const [duration, setDuration] = useState('');
  const [totalTime, setTotalTime] = useState('');
  const [projectType, setProjectType] = useState('individual');
  const [translationProgress, setTranslationProgress] = useState(0);
  const [translationStatus, setTranslationStatus] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExistingData = async () => {
      try {
        const skillsCollection = collection(db, 'skillTypes');
        const skillSnapshot = await getDocs(skillsCollection);
        const skills = skillSnapshot.docs.map(doc => doc.data().name);
        setExistingSkills(skills);

        const rolesCollection = collection(db, 'roleTypes');
        const roleSnapshot = await getDocs(rolesCollection);
        const roles = roleSnapshot.docs.map(doc => doc.data().name);
        setExistingRoles(roles);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchExistingData();
  }, []);

  useEffect(() => {
    if (skillInput.trim()) {
      const filtered = existingSkills.filter(skill => 
        skill.toLowerCase().includes(skillInput.toLowerCase()) &&
        !skillTags.includes(skill)
      );
      setSuggestions(prev => ({ ...prev, skills: filtered }));
    } else {
      setSuggestions(prev => ({ ...prev, skills: [] }));
    }
  }, [skillInput, existingSkills, skillTags]);

  useEffect(() => {
    if (roleInput.trim()) {
      const filtered = existingRoles.filter(role => 
        role.toLowerCase().includes(roleInput.toLowerCase()) &&
        !roleTags.includes(role)
      );
      setSuggestions(prev => ({ ...prev, roles: filtered }));
    } else {
      setSuggestions(prev => ({ ...prev, roles: [] }));
    }
  }, [roleInput, existingRoles, roleTags]);

  const handleAddTag = async (value, type) => {
    if (!value) return;

    if (type === 'skill' && !skillTags.includes(value)) {
      setSkillTags([...skillTags, value]);
      setSkillInput('');
      setSuggestions(prev => ({ ...prev, skills: [] }));

      if (!existingSkills.includes(value)) {
        try {
          await addDoc(collection(db, 'skillTypes'), {
            name: value,
            createdAt: new Date().toISOString()
          });
          setExistingSkills([...existingSkills, value]);
        } catch (error) {
          console.error('Error adding new skill type:', error);
        }
      }
    } else if (type === 'role' && !roleTags.includes(value)) {
      setRoleTags([...roleTags, value]);
      setRoleInput('');
      setSuggestions(prev => ({ ...prev, roles: [] }));

      if (!existingRoles.includes(value)) {
        try {
          await addDoc(collection(db, 'roleTypes'), {
            name: value,
            createdAt: new Date().toISOString()
          });
          setExistingRoles([...existingRoles, value]);
        } catch (error) {
          console.error('Error adding new role type:', error);
        }
      }
    }
  };

  const handleRemoveTag = (valueToRemove, type) => {
    if (type === 'skill') {
      setSkillTags(skillTags.filter(skill => skill !== valueToRemove));
    } else if (type === 'role') {
      setRoleTags(roleTags.filter(role => role !== valueToRemove));
    }
  };

  const handleKeyDown = (e, type) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'skill' && skillInput.trim()) {
        handleAddTag(skillInput.trim(), 'skill');
      } else if (type === 'role' && roleInput.trim()) {
        handleAddTag(roleInput.trim(), 'role');
      }
    }
  };

  const uploadImage = async (imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.REACT_APP_IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        return data.data.url;
      } else {
        throw new Error('Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleEditorImageUpload = async (file) => {
    try {
      const imageUrl = await uploadImage(file);
      return imageUrl;
    } catch (error) {
      console.error('Error uploading image in editor:', error);
      return '';
    }
  };

  const handleDocumentChange = ({ text }) => {
    setDocument(text);
  };

  const translateText = async (text) => {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not found in environment variables');
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a professional translator. Translate the following Korean text to English while maintaining the original meaning and nuance.'
            },
            {
              role: 'user',
              content: text
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setUploadProgress(0);
    setTranslationProgress(0);
    setTranslationStatus('');

    try {
      let imageUrl = '';
      if (image) {
        setUploadProgress(30);
        imageUrl = await uploadImage(image);
        setUploadProgress(70);
      }

      const koreanDoc = await addDoc(collection(db, 'projects'), {
        title,
        description,
        skillTags,
        roleTags,
        document,
        liveUrl,
        githubUrl,
        imageUrl,
        duration,
        totalTime,
        projectType,
        createdAt: new Date().toISOString()
      });

      setUploadProgress(100);
      setTranslationStatus('Starting translation...');

      setTranslationStatus('Translating title...');
      setTranslationProgress(20);
      const translatedTitle = await translateText(title);

      setTranslationStatus('Translating description...');
      setTranslationProgress(40);
      const translatedDescription = await translateText(description);

      setTranslationStatus('Translating documentation...');
      setTranslationProgress(60);
      const translatedDocument = await translateText(document);

      setTranslationStatus('Saving English version...');
      setTranslationProgress(80);
      await setDoc(doc(db, 'projects-en', koreanDoc.id), {
        title: translatedTitle,
        description: translatedDescription,
        skillTags,
        roleTags,
        document: translatedDocument,
        liveUrl,
        githubUrl,
        imageUrl,
        duration,
        totalTime,
        projectType,
        createdAt: new Date().toISOString()
      });

      setTranslationProgress(100);
      setTranslationStatus('Translation complete!');
      
      setTimeout(() => {
        navigate('/admin');
      }, 1000);
    } catch (error) {
      console.error('Error adding project:', error);
      alert('Failed to add project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-project">
      <h2>Add New Project</h2>
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="upload-progress">
          <div 
            className="progress-bar" 
            style={{ width: `${uploadProgress}%` }}
          />
          <span>{uploadProgress}%</span>
        </div>
      )}
      {translationProgress > 0 && (
        <div className="translation-progress">
          <div 
            className="progress-bar" 
            style={{ width: `${translationProgress}%`, backgroundColor: '#4CAF50' }}
          />
          <span>{translationStatus}</span>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Description:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Skills:</label>
          <InputWrapper>
            <TagInput>
              {skillTags.map((skill, index) => (
                <Tag key={index}>
                  {skill}
                  <button type="button" onClick={() => handleRemoveTag(skill, 'skill')}>&times;</button>
                </Tag>
              ))}
              <TagInputField
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'skill')}
                placeholder="Add skills..."
              />
            </TagInput>
            {suggestions.skills.length > 0 && (
              <Suggestions>
                {suggestions.skills.map((skill, index) => (
                  <SuggestionItem
                    key={index}
                    onClick={() => handleAddTag(skill, 'skill')}
                  >
                    {skill}
                  </SuggestionItem>
                ))}
              </Suggestions>
            )}
          </InputWrapper>
        </div>

        <div className="form-group">
          <label>Role Types:</label>
          <InputWrapper>
            <TagInput>
              {roleTags.map((role, index) => (
                <Tag key={index}>
                  {role}
                  <button type="button" onClick={() => handleRemoveTag(role, 'role')}>&times;</button>
                </Tag>
              ))}
              <TagInputField
                type="text"
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'role')}
                placeholder="Add role types..."
              />
            </TagInput>
            {suggestions.roles.length > 0 && (
              <Suggestions>
                {suggestions.roles.map((role, index) => (
                  <SuggestionItem
                    key={index}
                    onClick={() => handleAddTag(role, 'role')}
                  >
                    {role}
                  </SuggestionItem>
                ))}
              </Suggestions>
            )}
          </InputWrapper>
        </div>

        <div className="form-group">
          <label>Live URL:</label>
          <input
            type="url"
            value={liveUrl}
            onChange={(e) => setLiveUrl(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>GitHub URL:</label>
          <input
            type="url"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Project Image:</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
          />
        </div>

        <div className="form-group">
          <label>Project Duration:</label>
          <input
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. Jan 2023 - Mar 2023"
          />
        </div>

        <div className="form-group">
          <label>Total Time Taken:</label>
          <input
            type="text"
            value={totalTime}
            onChange={(e) => setTotalTime(e.target.value)}
            placeholder="e.g. 120 hours"
          />
        </div>

        <div className="form-group">
          <label>Project Type:</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="projectType"
                value="individual"
                checked={projectType === 'individual'}
                onChange={(e) => setProjectType(e.target.value)}
              />
              Individual Project
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="projectType"
                value="team"
                checked={projectType === 'team'}
                onChange={(e) => setProjectType(e.target.value)}
              />
              Team Project
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>Project Documentation:</label>
          <EditorWrapper>
            <MdEditor
              style={{ height: '500px' }}
              renderHTML={text => (
                <ReactMarkdown
                  rehypePlugins={[rehypeRaw]}
                  remarkPlugins={[remarkGfm]}
                  className="custom-html-style"
                >
                  {text}
                </ReactMarkdown>
              )}
              onChange={handleDocumentChange}
              onImageUpload={handleEditorImageUpload}
              imageAccept=".jpg,.jpeg,.png,.gif"
              value={document}
              placeholder="Write your project documentation here..."
            />
          </EditorWrapper>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Adding Project...' : 'Add Project'}
        </button>
      </form>
    </div>
  );
}

export default AddProject; 