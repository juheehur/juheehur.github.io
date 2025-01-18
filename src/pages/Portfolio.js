import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import ProjectCard from '../components/ProjectCard';
import { useSearchParams } from 'react-router-dom';
import '../styles/portfolio.css';

function Portfolio() {
  const [projects, setProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [roleTypes, setRoleTypes] = useState([]);
  const [skillTypes, setSkillTypes] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [isSkillDropdownOpen, setIsSkillDropdownOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage) return savedLanguage;
    
    const browserLang = navigator.language || navigator.userLanguage;
    return browserLang.startsWith('ko') ? 'ko' : 'en';
  });
  const [skillSearch, setSkillSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const collectionName = language === 'ko' ? 'projects' : 'projects-en';
        const projectsCollection = collection(db, collectionName);
        const projectSnapshot = await getDocs(projectsCollection);
        const projectList = projectSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllProjects(projectList);
        setProjects(projectList);

        const uniqueRoles = new Set();
        const uniqueSkills = new Set();

        projectList.forEach(project => {
          project.roleTags?.forEach(role => uniqueRoles.add(role));
          project.skillTags?.forEach(skill => uniqueSkills.add(skill));
        });

        setRoleTypes(Array.from(uniqueRoles).sort());
        setSkillTypes(Array.from(uniqueSkills).sort());
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [language]);

  useEffect(() => {
    let filtered = [...allProjects];
    const searchQuery = searchParams.get('search')?.toLowerCase();

    if (searchQuery) {
      filtered = filtered.filter(project => 
        project.title?.toLowerCase().includes(searchQuery) ||
        project.description?.toLowerCase().includes(searchQuery)
      );
    }

    if (selectedRole) {
      filtered = filtered.filter(project => 
        project.roleTags && project.roleTags.includes(selectedRole)
      );
    }

    if (selectedSkills.length > 0) {
      filtered = filtered.filter(project => 
        project.skillTags && selectedSkills.every(skill => project.skillTags.includes(skill))
      );
    }

    setProjects(filtered);
  }, [selectedRole, selectedSkills, allProjects, searchParams]);

  const handleRoleClick = (role) => {
    setSelectedRole(role === selectedRole ? null : role);
  };

  const handleSkillSelect = (skill) => {
    setSelectedSkills(prev => {
      if (prev.includes(skill)) {
        return prev.filter(s => s !== skill);
      }
      return [...prev, skill];
    });
  };

  const toggleLanguage = () => {
    const newLanguage = language === 'ko' ? 'en' : 'ko';
    setLanguage(newLanguage);
    localStorage.setItem('preferredLanguage', newLanguage);
    setSelectedRole(null);
    setSelectedSkills([]);
  };

  const filteredSkills = skillTypes.filter(skill =>
    skill.toLowerCase().includes(skillSearch.toLowerCase())
  );

  return (
    <div className="portfolio">
      <div className="language-toggle">
        <button 
          onClick={toggleLanguage}
          className="language-button"
        >
          {language === 'ko' ? 'To English' : '한국어로 변경'}
        </button>
      </div>
      <div className="filter-section">
        <h3>{language === 'ko' ? '역할 유형으로 필터링' : 'Filter by Role Type'}</h3>
        <div className="role-filters">
          {roleTypes.map(role => (
            <button
              key={role}
              className={`role-tag ${selectedRole === role ? 'active' : ''}`}
              onClick={() => handleRoleClick(role)}
            >
              {role}
            </button>
          ))}
        </div>

        <h3>{language === 'ko' ? '기술로 필터링' : 'Filter by Skill'}</h3>
        <div className="skill-filter">
          <div className="skill-select" onClick={() => setIsSkillDropdownOpen(!isSkillDropdownOpen)}>
            <span>
              {selectedSkills.length > 0 
                ? selectedSkills.join(', ')
                : (language === 'ko' ? '기술 선택' : 'Select skills')}
            </span>
            <span>{isSkillDropdownOpen ? '▲' : '▼'}</span>
          </div>
          
          {isSkillDropdownOpen && (
            <div className="skill-dropdown">
              <div className="skill-search">
                <input
                  type="text"
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  placeholder={language === 'ko' ? '기술 검색...' : 'Search skills...'}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              {selectedSkills.length > 0 && (
                <div 
                  className="skill-option clear-option" 
                  onClick={() => setSelectedSkills([])}
                >
                  {language === 'ko' ? '선택 해제' : 'Clear selection'}
                </div>
              )}
              {filteredSkills.map(skill => (
                <div
                  key={skill}
                  className={`skill-option ${selectedSkills.includes(skill) ? 'selected' : ''}`}
                  onClick={() => handleSkillSelect(skill)}
                >
                  {skill}
                </div>
              ))}
              {filteredSkills.length === 0 && (
                <div className="no-results">
                  {language === 'ko' ? '검색 결과가 없습니다' : 'No results found'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="projects-grid">
        {projects.length > 0 ? (
          projects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))
        ) : (
          <div className="no-projects">
            {language === 'ko' 
              ? '선택한 필터 또는 검색어와 일치하는 프로젝트가 없습니다.' 
              : 'No projects found matching the selected filters or search query.'}
          </div>
        )}
      </div>
    </div>
  );
}

export default Portfolio; 