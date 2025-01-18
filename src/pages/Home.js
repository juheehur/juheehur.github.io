import React, { useState, useEffect } from 'react';
import ImageCarousel from '../components/ImageCarousel';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import '../styles/home.css';

const Home = () => {
  const [roleTypes, setRoleTypes] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const navigate = useNavigate();
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [language, setLanguage] = useState('en');
  const [testimonials, setTestimonials] = useState([]);
  const [isAutoRotating, setIsAutoRotating] = useState(true);

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

  // Auto rotate roles
  useEffect(() => {
    if (!isAutoRotating || roleTypes.length === 0) return;

    const intervalId = setInterval(() => {
      setCurrentRoleIndex((prev) => (prev + 1) % roleTypes.length);
      setSelectedRole(roleTypes[(currentRoleIndex + 1) % roleTypes.length]);
    }, 3000); // Change role every 3 seconds

    return () => clearInterval(intervalId);
  }, [currentRoleIndex, roleTypes, isAutoRotating]);

  // Stop auto-rotation when user manually selects a role
  const handleManualRoleSelect = (role) => {
    setIsAutoRotating(false);
    setSelectedRole(role);
    setCurrentRoleIndex(roleTypes.indexOf(role));
  };

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const testimonialIds = ['hVAoKOYxwFPmlH4S2IhX', 'p7vhLZOjfrgZWD9x0w4G'];
        const testimonialData = await Promise.all(
          testimonialIds.map(async (id) => {
            const docRef = doc(db, 'questions', id);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
          })
        );
        setTestimonials(testimonialData.filter(Boolean));
      } catch (error) {
        console.error('Error fetching testimonials:', error);
      }
    };

    fetchTestimonials();
  }, []);

  const getHeadline = (role) => {
    if (!role) return 'Creative Developer & Designer';
    
    const normalizedRole = role
    
    if (normalizedRole === 'Data Analyst') {
      return `SELECT * FROM candidates 
WHERE first_name = 'Emily'
  AND middle_name = 'Juhee'
  AND skills LIKE '%analytics%'
  AND passion = 'MAX';
-- Found: 1 exceptional analyst!`;
    } else if (normalizedRole === 'Web Developer') {
      return `npm install
awesome-developer
@juhee-latest`;
    } else if (normalizedRole === 'Founder') {
      return `I learn technology to create what I want to make.`;
    } else if (normalizedRole === 'ML Engineer') {
      return `model = HurEmily2024(
    intelligence='high',
    creativity=float('inf'),
    learning_rate='rapid'
)
model.predict('success_probability')
>>> 99.9%`;
    } else if (normalizedRole === 'Marketer') {
      return `🚀 NEW LAUNCH: Emily Juhee Hur v2024
✨ Features:
- Creative Strategy Expert
- Data-Driven Decision Maker
- Growth Hacking Specialist
INVEST NOW!`;
    }
    return role;
  };

  const handleContact = () => {
    window.location.href = 'mailto:emily.hur.juhee@gmail.com';
  };

  const handleViewProjects = () => {
    navigate('/portfolio');
  };

  const handleRoleClick = () => {
    setCurrentRoleIndex((prev) => (prev + 1) % roleTypes.length);
    setSelectedRole(roleTypes[(currentRoleIndex + 1) % roleTypes.length]);
  };

  return (
    <div className="home-container">
      <div className="main-content">
        <div className="role-tags">
          <div className="desktop-role-tags">
            {roleTypes.map(role => (
              <button
                key={role}
                className={`role-tag ${selectedRole === role ? 'active' : ''}`}
                onClick={() => handleManualRoleSelect(role)}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
        <div className="content-wrapper">
          <div className="content-section">
            <div className="language-toggle">
            </div>
            <pre 
              className="title" 
              onClick={() => {
                if (window.innerWidth <= 768) {
                  setIsAutoRotating(false);
                  handleRoleClick();
                }
              }}
            >
              {getHeadline(selectedRole)}
            </pre>
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
      </div>
      
      <div className="testimonials-section">
        <h2 className="testimonials-title">What People Say about Juhee Hur</h2>
        <div className="testimonials-grid">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="testimonial-card">
              <h3 className="testimonial-title">{testimonial.title}</h3>
              <p className="testimonial-description">{testimonial.description}</p>
              <div className="testimonial-comments">
                {testimonial.comments && testimonial.comments.map((comment, index) => (
                  <div key={index} className="testimonial-comment">
                    <p className="comment-content">{comment.content}</p>
                    <p className="comment-author">- {comment.author}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home; 