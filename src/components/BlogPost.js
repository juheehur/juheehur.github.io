import { Link } from 'react-router-dom';
import CodeEditor from './CodeEditor';

function BlogPost({ post }) {
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

  const renderContent = (content) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      // Add code block
      const language = match[1] || 'javascript';
      const code = match[2].trim();
      parts.push(
        <div key={match.index} className="blog-code-block">
          <CodeEditor
            code={code}
            language={language}
            readOnly={true}
          />
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts;
  };

  return (
    <Link to={`/blog/${post.id}`} className="blog-post">
      <div className="blog-post-image-container">
        {post.coverImageUrl ? (
          <img 
            src={post.coverImageUrl} 
            alt={post.title} 
            className="cover-image"
          />
        ) : (
          <div className="placeholder-image" />
        )}
        <div className="blog-post-content-overlay">
          <h2>{post.title}</h2>
          <div className="metadata">
            <span className="date-time">{formatDateTime(post.date)}</span>
            <span>{post.readTime} min read</span>
            {post.postType && post.postType !== '' && (
              <span className="post-type">#{getPostTypeLabel(post.postType)}</span>
            )}
          </div>
        </div>
      </div>
      {post.relatedProject && (
        <div className="related-project">
          <div className="project-link">
            {post.relatedProject.thumbnail && (
              <img 
                src={post.relatedProject.thumbnail} 
                alt={post.relatedProject.title}
                className="project-thumbnail"
              />
            )}
            <span>{post.relatedProject.title}</span>
          </div>
        </div>
      )}
      <div className="blog-content">
        {renderContent(post.content)}
      </div>
    </Link>
  );
}

export default BlogPost; 