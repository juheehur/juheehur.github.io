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
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [isSkillDropdownOpen, setIsSkillDropdownOpen] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch projects
        const projectsCollection = collection(db, 'projects');
        const projectSnapshot = await getDocs(projectsCollection);
        const projectList = projectSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllProjects(projectList);
        setProjects(projectList);

        // Extract unique role types and skill types from projects
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
  }, []);

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

    if (selectedSkill) {
      filtered = filtered.filter(project => 
        project.skillTags && project.skillTags.includes(selectedSkill)
      );
    }

    setProjects(filtered);
  }, [selectedRole, selectedSkill, allProjects, searchParams]);

  const handleRoleClick = (role) => {
    setSelectedRole(role === selectedRole ? null : role);
  };

  const handleSkillSelect = (skill) => {
    setSelectedSkill(skill === selectedSkill ? null : skill);
    setIsSkillDropdownOpen(false);
  };

  return (
    <div className="portfolio">
      <h1>My Projects</h1>
      
      <div className="filter-section">
        <h3>Filter by Role Type</h3>
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

        <h3>Filter by Skill</h3>
        <div className="skill-filter">
          <div className="skill-select" onClick={() => setIsSkillDropdownOpen(!isSkillDropdownOpen)}>
            <span>{selectedSkill || 'Select a skill'}</span>
            <span>{isSkillDropdownOpen ? '▲' : '▼'}</span>
          </div>
          
          {isSkillDropdownOpen && (
            <div className="skill-dropdown">
              {selectedSkill && (
                <div className="skill-option" onClick={() => handleSkillSelect(null)}>
                  Clear selection
                </div>
              )}
              {skillTypes.map(skill => (
                <div
                  key={skill}
                  className="skill-option"
                  onClick={() => handleSkillSelect(skill)}
                >
                  {skill}
                </div>
              ))}
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
            No projects found matching the selected filters or search query.
          </div>
        )}
      </div>
    </div>
  );
}

export default Portfolio; 