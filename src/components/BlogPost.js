function BlogPost({ post }) {
  return (
    <div className="blog-post">
      <h2>{post.title}</h2>
      <div className="metadata">
        <span>{new Date(post.date).toLocaleDateString()}</span>
        <span>{post.readTime} min read</span>
      </div>
      <div className="content" dangerouslySetInnerHTML={{ __html: post.content }} />
    </div>
  );
}

export default BlogPost; 