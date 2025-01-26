import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import '../styles/blogDetails.css';
import { useAuth } from '../contexts/AuthContext';

function BlogDetails() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  console.log('Is admin?:', isAdmin);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const postDoc = doc(db, 'blog-posts', id);
        const postSnapshot = await getDoc(postDoc);
        
        if (postSnapshot.exists()) {
          const postData = { id: postSnapshot.id, ...postSnapshot.data() };
          console.log('Post data:', postData);
          console.log('Related project:', postData.relatedProject);
          setPost(postData);
        }
      } catch (error) {
        console.error('Error fetching post:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

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

  const getPostTypeLabel = (type) => {
    const types = {
      'diary': '일기',
      'mini-project': '미니프로젝트',
      'competition': '대회',
      'study': '스터디'
    };
    return types[type] || type;
  };

  const handleProjectClick = () => {
    if (post.relatedProject && post.relatedProject.id) {
      console.log('Navigating to project:', post.relatedProject.id);
      navigate(`/project/${post.relatedProject.id}`);
    }
  };

  const handleEdit = () => {
    navigate(`/admin/edit-blog/${id}`);
  };

  const handleDelete = async () => {
    if (window.confirm('정말로 이 블로그 포스트를 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'blog-posts', id));
        navigate('/blog');
      } catch (error) {
        console.error('Error deleting post:', error);
        alert('블로그 포스트 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!post) return <div>Post not found</div>;

  return (
    <div className="blog-details">
      <div className="blog-details-header">
        <div className="admin-controls" style={{ display: isAdmin ? 'flex' : 'none' }}>
          <button onClick={handleEdit} className="edit-button">수정</button>
          <button onClick={handleDelete} className="delete-button">삭제</button>
        </div>
        <div className="blog-details-cover-container">
          {post.coverImageUrl && (
            <>
              <div className="blog-details-cover-overlay"></div>
              <img 
                src={post.coverImageUrl} 
                alt={post.title} 
                className="blog-details-cover"
              />
            </>
          )}
          <div className="blog-details-title-container">
            <h1>{post.title}</h1>
            <div className="blog-details-meta">
              <span className="date-time">{formatDateTime(post.date)}</span>
              <span>{post.readTime} min read</span>
              {post.postType && post.postType !== '' && (
                <span className="post-type">#{getPostTypeLabel(post.postType)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="blog-details-content">
        <ReactMarkdown 
          rehypePlugins={[rehypeRaw]} 
          remarkPlugins={[remarkGfm]}
          className="markdown-preview"
        >
          {post.content}
        </ReactMarkdown>
      </div>

      {post.relatedProject && post.relatedProject.id && (
        <div className="blog-details-related-project">
          <h3>Related Project</h3>
          <div 
            onClick={handleProjectClick}
            className="related-project-link"
            style={{ cursor: 'pointer' }}
          >
            {post.relatedProject.thumbnail && (
              <img 
                src={post.relatedProject.thumbnail} 
                alt={post.relatedProject.title} 
              />
            )}
            <span>{post.relatedProject.title}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default BlogDetails; 