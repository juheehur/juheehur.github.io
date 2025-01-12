import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import ImageCarousel from '../components/ImageCarousel';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';

const HomeContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding: 0 5%;
  background-color: #1a1a1a;
  color: white;
`;

const ContentSection = styled.div`
  flex: 1;
  padding-right: 5%;
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const ImageSection = styled.div`
  flex: 1;
  position: relative;
`;

const RoleTags = styled.div`
  position: fixed;
  top: 100px;
  left: 5%;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 2rem;
  z-index: 100;
`;

const RoleTag = styled.button`
  background: ${props => props.active ? '#4A90E2' : 'rgba(255, 255, 255, 0.1)'};
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active ? '#357ABD' : 'rgba(255, 255, 255, 0.2)'};
  }
`;

const Title = styled.pre`
  font-size: 2rem;
  font-weight: bold;
  margin-top: -40px;
  margin-bottom: 1.5rem;
  line-height: 1.4;
  font-family: 'Courier New', monospace;
  color: #4A90E2;
  white-space: pre-wrap;
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  color: #a0a0a0;
  margin-bottom: 2rem;
  max-width: 600px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
`;

const Button = styled.button`
  padding: 1rem 2rem;
  font-size: 1.1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
`;

const PrimaryButton = styled(Button)`
  background-color: #6c5ce7;
  color: white;

  &:hover {
    background-color: #5b4bc4;
    transform: translateY(-2px);
  }
`;

const SecondaryButton = styled(Button)`
  background-color: transparent;
  color: white;
  border: 2px solid #6c5ce7;

  &:hover {
    background-color: rgba(108, 92, 231, 0.1);
    transform: translateY(-2px);
  }
`;

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
    <HomeContainer>
      <ContentSection>
        <RoleTags>
          {roleTypes.map(role => (
            <RoleTag
              key={role}
              active={selectedRole === role}
              onClick={() => setSelectedRole(role)}
            >
              {role}
            </RoleTag>
          ))}
        </RoleTags>
        <Title>{getHeadline(selectedRole)}</Title>
        <Subtitle>
          A hackathon nerd who learns new tech on the fly to bring bold, spur-of-the-moment ideas to life.
        </Subtitle>
        <ButtonGroup>
          <PrimaryButton onClick={handleContact}>Contact Juheehur</PrimaryButton>
          <SecondaryButton onClick={handleViewProjects}>View Projects</SecondaryButton>
        </ButtonGroup>
      </ContentSection>
      <ImageSection>
        <ImageCarousel />
      </ImageSection>
    </HomeContainer>
  );
};

export default Home; 