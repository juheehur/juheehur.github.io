import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import axios from 'axios';
import '../../styles/portfolioSummary.css';

function PortfolioSummary() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copyStatus, setCopyStatus] = useState({ id: null, status: '' });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      console.log('Fetching projects...');
      const projectsCollection = collection(db, 'projects');
      const projectsEnCollection = collection(db, 'projects-en');
      
      const [projectSnapshot, projectEnSnapshot] = await Promise.all([
        getDocs(projectsCollection),
        getDocs(projectsEnCollection)
      ]);

      console.log('Raw Korean projects:', projectSnapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      })));

      console.log('Raw English projects:', projectEnSnapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      })));

      // Create a map of English projects for easier lookup
      const enProjectsMap = new Map();
      projectEnSnapshot.docs.forEach(doc => {
        const data = doc.data();
        enProjectsMap.set(doc.id, data);
      });

      // Map projects with their summaries
      const projectList = projectSnapshot.docs.map(doc => {
        const projectData = doc.data();
        const enProjectData = enProjectsMap.get(doc.id);
        
        const mappedProject = {
          id: doc.id,
          title: projectData.title || '',
          description: projectData.description || '',
          document: projectData.document || '',
          skillTags: projectData.skillTags || [],
          roleTags: projectData.roleTags || [],
          duration: projectData.duration || '',
          totalTime: projectData.totalTime || '',
          projectType: projectData.projectType || '',
          koreanSummary: projectData.summary || null,
          englishSummary: enProjectData?.summary || null
        };

        console.log('Mapped project:', mappedProject);
        return mappedProject;
      });

      console.log('Setting projects state with:', projectList);
      setProjects(projectList);

    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Failed to fetch projects');
    }
  };

  useEffect(() => {
    console.log('Current projects state:', projects);
  }, [projects]);

  const generateSummary = async (project, language) => {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (!apiKey) {
      setError('OpenAI API key not found in environment variables');
      return;
    }

    setLoading(true);
    console.log(`Generating ${language} summary for project:`, project);

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

요약본은 구체적인 숫자 강조 (성과, 성장률, 정확도 등)하고, 간결하고 강렬한 문장으로 전문성 강조, 강력한 액션 동사 사용 (Developed, Increased, Implemented 등).성과 기반 설명 추가 (무엇을 했는지가 아니라 어떤 결과를 냈는지). 키워드 최적화 (직무와 관련된 핵심 용어 활용).

예시: 
- 첫 번째 개발자로 입사하여 혼자서 일 년 동안 트레바리에 필요한 모든 IT 서비스(웹사이트, 서버, 백오피스 등) 기획/개발/배포/운영
- 혼자서 4개월 동안 기존 Ruby on Rails 웹사이트를 React, Next.js, Node.js, AWS 등을 사용하여 리라이팅, 서버 비용 70% 감소 및 속도 170% 개선
- SQL, redash를 활용하여 개인의 직관이 아닌 팀 차원에서 유저에 대한 이해도를 쌓을 수 있도록 전사가 활용할 수 있는 데이터 인프라 및 문화 구축
- 단순/루틴 업무를 자동화/효율화하는 백오피스 기능 기획/개발, 운영 팀의 업무 시간을 주당 70시간 이상 줄임
- AWS Lamdba, CloudWatch를 활용하여 하루 1,000여 개 이상의 문자 메시지 전송 자동화
- Query와 Sort 개발 경험 개선을 위해 AWS DynamoDB을 AWS RDS(PostgreSQL)으로 무중단 Migration
- 브런치 <트레바리에서 테크 리더로 일하기> 글 연재: 1) 47,465 조회 2) 5,501 공유 3) 20여명 가량의 개발자 지원 유도 (개발자 4명 채용)

예시는 참고만 해. 절대 없는 내용을 지어내지 마.

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
          model: 'gpt-4',
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
      console.log(`Generated ${language} summary:`, summary);
      
      // Save to appropriate collection
      if (language === 'ko') {
        const projectRef = doc(db, 'projects', project.id);
        await setDoc(projectRef, { summary }, { merge: true });
        console.log('Saved Korean summary:', { projectId: project.id, summary });
      } else {
        const projectEnRef = doc(db, 'projects-en', project.id);
        await setDoc(projectEnRef, { summary }, { merge: true });
        console.log('Saved English summary:', { projectId: project.id, summary });
      }

      // Update local state
      setProjects(prevProjects => {
        const updatedProjects = prevProjects.map(p => {
          if (p.id === project.id) {
            const updatedProject = {
              ...p,
              koreanSummary: language === 'ko' ? summary : p.koreanSummary,
              englishSummary: language === 'en' ? summary : p.englishSummary
            };
            console.log('Updated project:', updatedProject);
            return updatedProject;
          }
          return p;
        });
        console.log('Updated projects state:', updatedProjects);
        return updatedProjects;
      });

      // Fetch projects again to ensure we have the latest data
      await fetchProjects();

      return summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error('Failed to generate summary');
    } finally {
      setLoading(false);
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

  const handleCopy = async (text, projectId, language) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus({ id: `${projectId}-${language}`, status: 'Copied!' });
      setTimeout(() => {
        setCopyStatus({ id: null, status: '' });
      }, 2000);
    } catch (err) {
      setCopyStatus({ id: `${projectId}-${language}`, status: 'Failed to copy' });
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
    <div className="summary-container">
      <div className="summary-header">
        <h1>Portfolio Summary</h1>
        <div className="search-container">
          <input
            className="search-input"
            type="text"
            placeholder="Search by title, description, skills, or roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="project-list">
        {filteredProjects.map(project => (
          <div key={project.id} className="project-item">
            <div className="project-info">
              <div className="project-header">
                <h3 className="project-title">{project.title}</h3>
                <p className="project-description">{project.description}</p>
              </div>
              
              <div className="summaries-container">
                <div className="summary-section">
                  <div className="summary-header-section">
                    <h4 className="summary-title">한국어 요약</h4>
                    {project.koreanSummary && (
                      <button
                        className="copy-button"
                        onClick={() => handleCopy(project.koreanSummary, project.id, 'ko')}
                      >
                        {copyStatus.id === `${project.id}-ko` ? copyStatus.status : '복사'}
                      </button>
                    )}
                  </div>
                  <div className="summary-content">
                    {project.koreanSummary || '요약이 없습니다.'}
                  </div>
                  <div className="button-group">
                    <button
                      id={`${project.id}-ko`}
                      onClick={() => handleGenerateSummary(project, 'ko')}
                      className="button"
                      disabled={loading}
                    >
                      {project.koreanSummary ? '한국어로 다시 요약하기' : '한국어로 요약하기'}
                    </button>
                  </div>
                </div>

                <div className="summary-section">
                  <div className="summary-header-section">
                    <h4 className="summary-title">English Summary</h4>
                    {project.englishSummary && (
                      <button
                        className="copy-button"
                        onClick={() => handleCopy(project.englishSummary, project.id, 'en')}
                      >
                        {copyStatus.id === `${project.id}-en` ? copyStatus.status : 'Copy'}
                      </button>
                    )}
                  </div>
                  <div className="summary-content">
                    {project.englishSummary || 'No summary available.'}
                  </div>
                  <div className="button-group">
                    <button
                      id={`${project.id}-en`}
                      onClick={() => handleGenerateSummary(project, 'en')}
                      className="button"
                      disabled={loading}
                    >
                      {project.englishSummary ? 'Regenerate English Summary' : 'Summarize in English'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PortfolioSummary; 