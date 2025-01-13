import React from 'react';

function Blog() {
  return (
    <div className="blog" style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1>Blog</h1>
      <p style={{ fontSize: '1.2rem', marginTop: '20px' }}>
        Blog page is under construction 🚧
      </p>
    </div>
  );
}

export default Blog; 