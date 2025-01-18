import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import axios from 'axios';
import styled from 'styled-components';

const SummaryContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const SummaryHeader = styled.div`
  margin-bottom: 2rem;
  h1 {
    font-size: 2rem;
    color: #333;
  }
`;

const ProjectList = styled.div`
  display: grid;
  gap: 2rem;
`;

const ProjectItem = styled.div`
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`;

const ProjectInfo = styled.div`
  padding: 1.5rem;
`;

const ProjectTitle = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
  color: #333;
`;

const ProjectDescription = styled.p`
  color: #666;
  margin-bottom: 1rem;
`;

const SummarySection = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
`;

const SummaryTitle = styled.h4`
  color: #333;
  margin-bottom: 0.5rem;
`;

const SummaryContent = styled.div`
  white-space: pre-line;
  color: #666;
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
`;

const Button = styled.button`
  background: ${props => props.loading ? '#6c757d' : '#4A90E2'};
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: ${props => props.loading ? 'not-allowed' : 'pointer'};
  transition: background 0.2s ease;

  &:hover {
    background: ${props => props.loading ? '#6c757d' : '#357ABD'};
  }
`;

const SearchContainer = styled.div`
  margin-bottom: 2rem;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  &:focus {
    outline: none;
    border-color: #4A90E2;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
  }
`;

function PortfolioSummary() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const projectsCollection = collection(db, 'projects');
      const projectSnapshot = await getDocs(projectsCollection);
      const projectList = projectSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        koreanSummary: null,
        englishSummary: null
      }));
      setProjects(projectList);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Failed to fetch projects');
    }
  };

  const generateSummary = async (project, language) => {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (!apiKey) {
      setError('OpenAI API key not found in environment variables');
      return;
    }

    const projectContent = `
Title: ${project.title}
Description: ${project.description}
Document: ${project.document}
Skills: ${project.skillTags?.join(', ')}
Roles: ${project.roleTags?.join(', ')}
Duration: ${project.duration}
Total Time: ${project.totalTime}
Project Type: ${project.projectType}
    `;

    const prompt = language === 'ko' 
      ? `아래 내용을 기반으로 LinkedIn에 적합한 point form 형식의 포트폴리오 요약본을 한국어로 작성해줘.

요약본은 이렇게 적으면 좋아:
- 구체적인 숫자 활용 (성과, 성장률, 정확도 등).
- 간결하고 강렬한 문장으로 전문성 강조.
- 강력한 액션 동사 사용 (Developed, Increased, Implemented 등).
- 성과 기반 설명 추가 (무엇을 했는지가 아니라 어떤 결과를 냈는지).
- 키워드 최적화 (직무와 관련된 핵심 용어 활용).

절대 없는 내용을 지어내지 마.

Content: ${projectContent}`
      : `Based on the content below, write a LinkedIn-appropriate portfolio summary in point form in English.

The summary should follow these guidelines:
- Use specific numbers (e.g., performance, growth rate, accuracy).
- Highlight professionalism with concise and impactful sentences.
- Use strong action verbs (e.g., Developed, Increased, Implemented).
- Focus on results rather than just tasks.
- Optimize for keywords related to the role.
- Do not fabricate any information.

Content: ${projectContent}`;

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a professional portfolio writer who creates concise and impactful summaries.'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const summary = response.data.choices[0].message.content.trim();
      
      // Update the project in Firestore
      const summaryField = language === 'ko' ? 'koreanSummary' : 'englishSummary';
      const projectRef = doc(db, 'projects', project.id);
      await setDoc(projectRef, { [summaryField]: summary }, { merge: true });

      // Update local state
      setProjects(prevProjects => 
        prevProjects.map(p => 
          p.id === project.id 
            ? { ...p, [summaryField]: summary }
            : p
        )
      );

      return summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error('Failed to generate summary');
    }
  };

  const handleGenerateSummary = async (project, language) => {
    const buttonId = `${project.id}-${language}`;
    const loadingElement = document.getElementById(buttonId);
    if (loadingElement) {
      loadingElement.disabled = true;
      loadingElement.textContent = 'Generating...';
    }

    try {
      await generateSummary(project, language);
    } catch (error) {
      setError(error.message);
    } finally {
      if (loadingElement) {
        loadingElement.disabled = false;
        loadingElement.textContent = language === 'ko' ? '한국어로 요약하기' : 'Summarize in English';
      }
    }
  };

  const filteredProjects = projects.filter(project => {
    const searchLower = searchQuery.toLowerCase();
    return (
      project.title?.toLowerCase().includes(searchLower) ||
      project.description?.toLowerCase().includes(searchLower) ||
      project.skillTags?.some(skill => skill.toLowerCase().includes(searchLower)) ||
      project.roleTags?.some(role => role.toLowerCase().includes(searchLower))
    );
  });

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <SummaryContainer>
      <SummaryHeader>
        <h1>Portfolio Summary</h1>
      </SummaryHeader>

      <SearchContainer>
        <SearchInput
          type="text"
          placeholder="Search by title, description, skills, or roles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </SearchContainer>

      <ProjectList>
        {filteredProjects.map(project => (
          <ProjectItem key={project.id}>
            <ProjectInfo>
              <ProjectTitle>{project.title}</ProjectTitle>
              <ProjectDescription>{project.description}</ProjectDescription>
              
              <ButtonGroup>
                <Button
                  id={`${project.id}-ko`}
                  onClick={() => handleGenerateSummary(project, 'ko')}
                  disabled={loading}
                >
                  한국어로 요약하기
                </Button>
                <Button
                  id={`${project.id}-en`}
                  onClick={() => handleGenerateSummary(project, 'en')}
                  disabled={loading}
                >
                  Summarize in English
                </Button>
              </ButtonGroup>

              {project.koreanSummary && (
                <SummarySection>
                  <SummaryTitle>한국어 요약</SummaryTitle>
                  <SummaryContent>{project.koreanSummary}</SummaryContent>
                </SummarySection>
              )}

              {project.englishSummary && (
                <SummarySection>
                  <SummaryTitle>English Summary</SummaryTitle>
                  <SummaryContent>{project.englishSummary}</SummaryContent>
                </SummarySection>
              )}
            </ProjectInfo>
          </ProjectItem>
        ))}
      </ProjectList>
    </SummaryContainer>
  );
}

export default PortfolioSummary; 