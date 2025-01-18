import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import '../styles/projectDetails.css';
import { Link } from 'react-router-dom';

function ProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 브라우저 언어에 따른 초기 언어 설정
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage) return savedLanguage;
    
    const browserLang = navigator.language || navigator.userLanguage;
    return browserLang.startsWith('ko') ? 'ko' : 'en';
  });

  useEffect(() => {
    const fetchProjectAndPosts = async () => {
      try {
        // 프로젝트 데이터 가져오기
        const collectionName = language === 'ko' ? 'projects' : 'projects-en';
        const projectDoc = doc(db, collectionName, id);
        const projectSnapshot = await getDoc(projectDoc);
        
        if (projectSnapshot.exists()) {
          setProject({ id: projectSnapshot.id, ...projectSnapshot.data() });
          
          // 관련 블로그 포스트 가져오기
          const postsQuery = query(
            collection(db, 'blog-posts'),
            where('relatedProject.id', '==', projectSnapshot.id)
          );
          const postsSnapshot = await getDocs(postsQuery);
          const posts = postsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setRelatedPosts(posts);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectAndPosts();
  }, [id, language]);

  const toggleLanguage = () => {
    const newLanguage = language === 'ko' ? 'en' : 'ko';
    setLanguage(newLanguage);
    localStorage.setItem('preferredLanguage', newLanguage);
  };

  if (loading) return <div>Loading...</div>;
  if (!project) return <div>Project not found</div>;

  return (
    <div className="project-details-container">
      <div className="language-toggle">
        <button 
          onClick={toggleLanguage}
          className="language-button"
        >
          {language === 'ko' ? 'To English' : '한국어로 변경'}
        </button>
      </div>

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
              {language === 'ko' ? '라이브 데모' : 'Live Demo'}
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
            loading="lazy"
            decoding="async"
          />
        )}

        <div className="project-details-info-grid">
          <div className="project-details-info-section">
            <h2>{language === 'ko' ? '프로젝트 개요' : 'Project Overview'}</h2>
            <div className="project-details-meta">
              {project.projectType && (
                <div className="project-details-meta-item">
                  <span className="project-details-meta-label">
                    {language === 'ko' ? '프로젝트 유형:' : 'Project Type:'}
                  </span>
                  <span className="project-details-meta-value">
                    {language === 'ko' 
                      ? project.projectType === 'individual' ? '개인 프로젝트' : '팀 프로젝트'
                      : project.projectType === 'individual' ? 'Individual Project' : 'Team Project'
                    }
                  </span>
                </div>
              )}
              {project.duration && (
                <div className="project-details-meta-item">
                  <span className="project-details-meta-label">
                    {language === 'ko' ? '기간:' : 'Duration:'}
                  </span>
                  <span className="project-details-meta-value">{project.duration}</span>
                </div>
              )}
              {project.totalTime && (
                <div className="project-details-meta-item">
                  <span className="project-details-meta-label">
                    {language === 'ko' ? '총 소요 시간:' : 'Total Time:'}
                  </span>
                  <span className="project-details-meta-value">{project.totalTime}</span>
                </div>
              )}
            </div>
          </div>

          <div className="project-details-info-section">
            <h2>{language === 'ko' ? '사용 기술' : 'Technologies'}</h2>
            {project.skillTags && (
              <div className="project-details-tag-section">
                <h3>{language === 'ko' ? '기술 및 도구' : 'Skills & Tools'}</h3>
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
                <h3>{language === 'ko' ? '역할' : 'Roles'}</h3>
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
      </div>

      {relatedPosts.length > 0 && (
        <div className="project-details-info-section related-posts-section">
          <h2>{language === 'ko' ? '관련 블로그 포스트' : 'Related Blog Posts'}</h2>
          <div className="related-posts-grid">
            {relatedPosts.map(post => (
              <Link 
                key={post.id} 
                to={`/blog/${post.id}`} 
                className="related-post-card"
              >
                {post.coverImageUrl && (
                  <img 
                    src={post.coverImageUrl} 
                    alt={post.title} 
                    className="related-post-image"
                    loading="lazy"
                    decoding="async"
                  />
                )}
                <div className="related-post-info">
                  <h3>{post.title}</h3>
                  <div className="related-post-metadata">
                    <span>{new Date(post.date).toLocaleDateString()}</span>
                    <span>{post.readTime} min read</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectDetails; 