import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { useNavigate } from 'react-router-dom';

function AddBlog() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [readTime, setReadTime] = useState('');
  const [coverImage, setCoverImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = '';
      if (coverImage) {
        const imageRef = ref(storage, `blog-covers/${coverImage.name}`);
        await uploadBytes(imageRef, coverImage);
        imageUrl = await getDownloadURL(imageRef);
      }

      await addDoc(collection(db, 'blog-posts'), {
        title,
        content,
        readTime: parseInt(readTime),
        coverImageUrl: imageUrl,
        date: new Date().toISOString(),
        author: 'Your Name' // You might want to get this from the user context
      });

      navigate('/blog');
    } catch (error) {
      console.error('Error adding blog post:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-blog">
      <h2>Add New Blog Post</h2>
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
          <label>Content:</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows="10"
          />
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
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCoverImage(e.target.files[0])}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Publishing...' : 'Publish Post'}
        </button>
      </form>
    </div>
  );
}

export default AddBlog; 