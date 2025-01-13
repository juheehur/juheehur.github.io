import React, { useState, useEffect } from 'react';
import ImageCarousel from '../components/ImageCarousel';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import '../styles/home.css';

const Home = () => {
  const [roleTypes, setRoleTypes] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const projectsCollection = collection(db, 'projects');
        const projectSnapshot = await getDocs(projectsCollection);
        const uniqueRoles = new Set();

        projectSnapshot.docs.forEach(doc => {
          const project = doc.data();
          project.roleTags?.forEach(role => uniqueRoles.add(role));
        });

        setRoleTypes(Array.from(uniqueRoles).sort());
        // Set default selected role
        if (uniqueRoles.size > 0) {
          setSelectedRole(Array.from(uniqueRoles)[0]);
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
      }
    };

    fetchRoles();
  }, []);

  const getHeadline = (role) => {
    if (!role) return 'Creative Developer & Designer';
    
    const normalizedRole = role.toLowerCase();
    
    if (normalizedRole === 'data scientist') {
      return `SELECT *
FROM developers
WHERE passion = 100
AND name = 'Juhee'`;
    } else if (normalizedRole === 'web developer') {
      return `npm install
awesome-developer
@juhee-latest`;
    }
    return role;
  };

  const handleContact = () => {
    window.location.href = 'mailto:emily.hur.juhee@gmail.com';
  };

  const handleViewProjects = () => {
    navigate('/portfolio');
  };

  return (
    <div className="home-container">
      <div className="content-section">
        <div className="role-tags">
          {roleTypes.map(role => (
            <button
              key={role}
              className={`role-tag ${selectedRole === role ? 'active' : ''}`}
              onClick={() => setSelectedRole(role)}
            >
              {role}
            </button>
          ))}
        </div>
        <pre className="title">{getHeadline(selectedRole)}</pre>
        <p className="subtitle">
          A hackathon nerd who learns new tech on the fly to bring bold, spur-of-the-moment ideas to life.
        </p>
        <div className="button-group">
          <button className="button primary-button" onClick={handleContact}>Contact Juheehur</button>
          <button className="button secondary-button" onClick={handleViewProjects}>View Projects</button>
        </div>
      </div>
      <div className="image-section">
        <ImageCarousel />
      </div>
    </div>
  );
};

export default Home; 