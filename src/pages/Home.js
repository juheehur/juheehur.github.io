import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import '../styles/home.css';
import meImage from '../picture/me.png';

const Home = () => {
  const [roleTypes, setRoleTypes] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const navigate = useNavigate();
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [language, setLanguage] = useState('en');
  const [testimonials, setTestimonials] = useState([]);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [todos, setTodos] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [showTodoPopup, setShowTodoPopup] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [selectedDayTodos, setSelectedDayTodos] = useState(null);
  const [selectedDayDate, setSelectedDayDate] = useState(null);
  const [mobileViewType, setMobileViewType] = useState('list'); // 'list' or 'calendar'

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

  // Add new useEffect for fetching todos
  useEffect(() => {
    const fetchTodos = async () => {
      try {
        const q = query(collection(db, 'todos'), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        const todoList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTodos(todoList);
      } catch (error) {
        console.error('Error fetching todos:', error);
      }
    };

    fetchTodos();
  }, []);

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(selectedDate);
    const firstDay = getFirstDayOfMonth(selectedDate);
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const getTodosForDate = (day) => {
    if (!day) return [];
    const currentYear = selectedDate.getFullYear();
    const currentMonth = selectedDate.getMonth() + 1;
    const dateString = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return todos.filter(todo => todo.date === dateString);
  };

  const formatMonth = (date) => {
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  const changeMonth = (offset) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setSelectedDate(newDate);
  };

  const handleTodoClick = (todo) => {
    setSelectedTodo(todo);
    setShowTodoPopup(true);
  };

  const formatTime = (time) => {
    if (!time) return '';
    return time;
  };

  const truncateText = (text, maxLength = 15) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatDateForMobile = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const groupTodosByDate = () => {
    const grouped = {};
    todos.forEach(todo => {
      if (!grouped[todo.date]) {
        grouped[todo.date] = [];
      }
      grouped[todo.date].push(todo);
    });
    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA));
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const todos = getTodosForDate(day);
    if (todos.length > 0) {
      const currentYear = selectedDate.getFullYear();
      const currentMonth = selectedDate.getMonth() + 1;
      const dateString = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      setSelectedDayTodos(todos);
      setSelectedDayDate(dateString);
      setShowTodoPopup(true);
    }
  };

  const formatDateForPopup = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
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
            <img src={meImage} alt="Emily Juhee Hur" className="profile-image" />
          </div>
        </div>
      </div>
      
      {/* Calendar Section */}
      <div className="calendar-section">
        <h2 className="calendar-title">What Juhee Do Everyday</h2>
        {isMobile && (
          <div className="mobile-view-toggle">
            <button 
              className={`toggle-button ${mobileViewType === 'list' ? 'active' : ''}`}
              onClick={() => setMobileViewType('list')}
            >
              List
            </button>
            <button 
              className={`toggle-button ${mobileViewType === 'calendar' ? 'active' : ''}`}
              onClick={() => setMobileViewType('calendar')}
            >
              Calendar
            </button>
          </div>
        )}
        {isMobile ? (
          mobileViewType === 'list' ? (
            // 모바일 리스트 뷰
            <div className="mobile-calendar-container">
              {groupTodosByDate().map(([date, todosForDate]) => (
                <div key={date} className="mobile-date-group">
                  <div className="mobile-date-header">
                    {formatDateForMobile(date)}
                  </div>
                  <div className="mobile-todos-list">
                    {todosForDate.map(todo => (
                      <div 
                        key={todo.id}
                        className={`mobile-todo-item ${todo.completed ? 'completed' : ''}`}
                        onClick={() => handleTodoClick(todo)}
                      >
                        <div className="mobile-todo-time">
                          {todo.startTime || '종일'}
                        </div>
                        <div className="mobile-todo-content">
                          <div className="mobile-todo-dot"></div>
                          <div className="mobile-todo-text">{todo.task}</div>
                          {todo.location && (
                            <div className="mobile-todo-location">
                              {todo.location}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // 모바일 캘린더 뷰
            <div className="mobile-calendar-container calendar-view">
              <div className="calendar-header">
                <button onClick={() => changeMonth(-1)}>&lt;</button>
                <h3>{formatMonth(selectedDate)}</h3>
                <button onClick={() => changeMonth(1)}>&gt;</button>
              </div>
              <div className="calendar-grid">
                <div className="calendar-weekdays">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="calendar-weekday">{day}</div>
                  ))}
                </div>
                <div className="calendar-days">
                  {generateCalendarDays().map((day, index) => {
                    const todos = day ? getTodosForDate(day) : [];
                    return (
                      <div 
                        key={index} 
                        className={`calendar-day ${!day ? 'empty' : ''} ${todos.length > 0 ? 'has-todos' : ''}`}
                        onClick={() => handleDayClick(day)}
                      >
                        {day && (
                          <>
                            <span className="day-number">{day}</span>
                            <div className="day-todos">
                              {todos.map(todo => (
                                <div 
                                  key={todo.id} 
                                  className={`todo-item ${todo.completed ? 'completed' : ''}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="todo-dot"></span>
                                  <span className="todo-text">{truncateText(todo.task)}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="calendar-container">
            <div className="calendar-header">
              <button onClick={() => changeMonth(-1)}>&lt;</button>
              <h3>{formatMonth(selectedDate)}</h3>
              <button onClick={() => changeMonth(1)}>&gt;</button>
            </div>
            <div className="calendar-grid">
              <div className="calendar-weekdays">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="calendar-weekday">{day}</div>
                ))}
              </div>
              <div className="calendar-days">
                {generateCalendarDays().map((day, index) => {
                  const todos = day ? getTodosForDate(day) : [];
                  return (
                    <div 
                      key={index} 
                      className={`calendar-day ${!day ? 'empty' : ''} ${todos.length > 0 ? 'has-todos' : ''}`}
                      onClick={() => handleDayClick(day)}
                    >
                      {day && (
                        <>
                          <span className="day-number">{day}</span>
                          <div className="day-todos">
                            {todos.map(todo => (
                              <div 
                                key={todo.id} 
                                className={`todo-item ${todo.completed ? 'completed' : ''}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="todo-dot"></span>
                                <span className="todo-text">{truncateText(todo.task)}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Day Todos Popup */}
      {showTodoPopup && selectedDayTodos && (
        <div className="popup-overlay" onClick={() => setShowTodoPopup(false)}>
          <div className="todo-popup" onClick={e => e.stopPropagation()}>
            <button className="close-button" onClick={() => setShowTodoPopup(false)}>×</button>
            <div className="todo-popup-content">
              <h3 className="popup-date">{formatDateForPopup(selectedDayDate)}</h3>
              <div className="todos-list">
                {selectedDayTodos.map(todo => (
                  <div key={todo.id} className={`popup-todo-item ${todo.completed ? 'completed' : ''}`}>
                    <div className="popup-todo-header">
                      <div className="popup-todo-time">
                        {todo.startTime ? `${todo.startTime}${todo.endTime ? ` - ${todo.endTime}` : ''}` : '종일'}
                      </div>
                      <div className="popup-todo-status">
                        {todo.completed ? '완료' : '진행 중'}
                      </div>
                    </div>
                    <div className="popup-todo-content">
                      <span className="popup-todo-dot"></span>
                      <div className="popup-todo-details">
                        <div className="popup-todo-task">{todo.task}</div>
                        {todo.location && (
                          <div className="popup-todo-location">{todo.location}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Testimonials Section */}
      <div className="testimonials-section">
        <div className="testimonials-header">
          <h2 className="testimonials-title">What People Say about Juhee Hur</h2>
          <button 
            className="answer-button"
            onClick={() => navigate('/question/p7vhLZOjfrgZWD9x0w4G')}
          >
            Click to Answer
          </button>
        </div>
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