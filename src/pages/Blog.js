import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import BlogPost from '../components/BlogPost';
import '../styles/Blog.css';

function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [types, setTypes] = useState({});
  const [selectedType, setSelectedType] = useState(null);
  const [isTypeCloudVisible, setIsTypeCloudVisible] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const q = query(
          collection(db, 'blog-posts'), 
          orderBy('date', 'desc')
        );
        
        const postsSnapshot = await getDocs(q);
        const postsList = postsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Calculate post count by type
        const typeCount = {};
        postsList.forEach(post => {
          if (post.postType) {
            typeCount[post.postType] = (typeCount[post.postType] || 0) + 1;
          }
        });

        setTypes(typeCount);
        setPosts(postsList);
      } catch (error) {
        console.error('Error fetching posts:', error);
        setError('Failed to load posts. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const filteredPosts = selectedType
    ? posts.filter(post => post.postType === selectedType)
    : posts;

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="blog-container">
      <div className={`type-cloud ${isTypeCloudVisible ? 'visible' : ''}`}>
        <div className="type-cloud-header">
          <h3>Tag Collection</h3>
          <button 
            className="toggle-cloud-btn"
            onClick={() => setIsTypeCloudVisible(!isTypeCloudVisible)}
          >
            {isTypeCloudVisible ? 'Collapse' : 'Expand'}
          </button>
        </div>
        <div className="type-cloud-content">
          <span 
            className={`type-tag ${!selectedType ? 'selected' : ''}`}
            onClick={() => setSelectedType(null)}
          >
            All Posts
          </span>
          {Object.entries(types).map(([type, count]) => (
            <span
              key={type}
              className={`type-tag ${selectedType === type ? 'selected' : ''}`}
              onClick={() => setSelectedType(type)}
            >
              #{type}
              <small className="type-count">{count}</small>
            </span>
          ))}
        </div>
      </div>

      <div className="blog-posts">
        {selectedType && (
          <div className="current-filter">
            Current Filter: #{selectedType}
            <button 
              className="clear-filter"
              onClick={() => setSelectedType(null)}
            >
              ✕
            </button>
          </div>
        )}
        {filteredPosts.length > 0 ? (
          filteredPosts.map(post => (
            <BlogPost key={post.id} post={post} />
          ))
        ) : (
          <div className="no-posts">
            {selectedType ? 
              `No posts found with tag '${selectedType}'` : 
              'No posts available'
            }
          </div>
        )}
      </div>
    </div>
  );
}

export default Blog; 