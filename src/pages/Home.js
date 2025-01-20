import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import '../styles/home.css';
import meImage from '../picture/me.png';
import moment from 'moment';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

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
  const [showCalendar, setShowCalendar] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedDateTodos, setSelectedDateTodos] = useState(null);

  // Add todo fetching logic
  useEffect(() => {
    const fetchTodos = async () => {
      try {
        const dateCollectionsSnapshot = await getDocs(collection(db, 'todos'));
        const allTodos = [];

        for (const dateDoc of dateCollectionsSnapshot.docs) {
          const todosQuery = query(
            collection(db, `todos/${dateDoc.id}/todos`),
            orderBy('createdAt', 'desc')
          );
          const todosSnapshot = await getDocs(todosQuery);
          const dateTodos = todosSnapshot.docs.map(doc => ({
            id: doc.id,
            date: dateDoc.id,
            ...doc.data()
          }));
          allTodos.push(...dateTodos);
        }

        // Sort todos by date and time
        allTodos.sort((a, b) => {
          if (a.date !== b.date) {
            return b.date.localeCompare(a.date);
          }
          if (a.startTime && b.startTime) {
            return a.startTime.localeCompare(b.startTime);
          }
          return b.createdAt - a.createdAt;
        });

        setTodos(allTodos);
      } catch (error) {
        console.error('Error fetching todos:', error);
      }
    };

    fetchTodos();
  }, []);

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

  // Add todo completion toggle
  const handleToggleComplete = async (todoId, completed, date) => {
    try {
      const todoRef = doc(db, `todos/${date}/todos/${todoId}`);
      await updateDoc(todoRef, {
        completed: !completed
      });
      setTodos(prev => prev.map(todo => 
        todo.id === todoId && todo.date === date ? {...todo, completed: !completed} : todo
      ));
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  // Add helper function to check if a date is today in Hong Kong timezone
  const isToday = (dateStr) => {
    const today = moment().tz('Asia/Hong_Kong').startOf('day');
    const date = moment.tz(dateStr, 'Asia/Hong_Kong').startOf('day');
    return date.isSame(today);
  };

  // Group todos by date for calendar view
  const todosByDate = todos.reduce((acc, todo) => {
    const date = todo.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(todo);
    return acc;
  }, {});

  // Get today's todos
  const todayTodos = todos.filter(todo => isToday(todo.date));

  // Add modal close handler
  const handleCloseModal = (e) => {
    if (e.target.classList.contains('home-modal-overlay')) {
      setShowModal(false);
    }
  };

  // Add date click handler
  const handleDateClick = (date) => {
    const dateStr = moment(date).format('YYYY-MM-DD');
    const todosForDate = todosByDate[dateStr];
    if (todosForDate) {
      setSelectedDateTodos({
        date: dateStr,
        todos: todosForDate
      });
      setShowModal(true);
    }
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
     
      {/* Todo Section */}
      <div className="todos-section">
        <div className="todos-header">
          <h2 className="todos-title">What Juhee Hur Do Everyday</h2>
          <div className="home-view-buttons">
            <button 
              className={`home-view-button ${!showCalendar ? 'active' : ''}`}
              onClick={() => setShowCalendar(false)}
            >
              Today
            </button>
            <button 
              className={`home-view-button ${showCalendar ? 'active' : ''}`}
              onClick={() => setShowCalendar(true)}
            >
              Calendar
            </button>
          </div>
        </div>
        
        {showCalendar ? (
          <div className="calendar-container home-calendar">
            <Calendar
              onChange={handleDateClick}
              value={selectedDate}
              locale="ko-KR"
              tileContent={({ date }) => {
                const dateStr = moment(date).format('YYYY-MM-DD');
                const todosForDate = todosByDate[dateStr];
                return todosForDate ? (
                  <div className="calendar-todos">
                    <div className="todo-count">{todosForDate.length}</div>
                  </div>
                ) : null;
              }}
            />
          </div>
        ) : (
          <div className="home-todos-grid">
            {todayTodos.map((todo) => (
              <div key={`${todo.date}-${todo.id}`} className="home-todo-card">
                <h3 className="home-todo-task">{todo.task}</h3>
                <div className="home-todo-info">
                  {todo.startTime && (
                    <span className="home-todo-time">
                      {todo.startTime}{todo.endTime ? ` - ${todo.endTime}` : ''}
                    </span>
                  )}
                  {todo.location && <span className="home-todo-location">{todo.location}</span>}
                </div>
              </div>
            ))}
            {todayTodos.length === 0 && (
              <div className="home-no-todos">
                <p>오늘은 할 일이 없습니다</p>
              </div>
            )}
          </div>
        )}

        {/* Todo Modal */}
        {showModal && selectedDateTodos && (
          <div className="home-modal-overlay" onClick={handleCloseModal}>
            <div className="home-modal-content">
              <div className="home-modal-header">
                <h3>{moment(selectedDateTodos.date).format('YYYY년 MM월 DD일 ddd')}</h3>
                <button className="home-modal-close" onClick={() => setShowModal(false)}>
                  <span>×</span>
                </button>
              </div>
              <div className="home-modal-body">
                {selectedDateTodos.todos.map((todo) => (
                  <div key={`${todo.date}-${todo.id}`} className="home-modal-todo-item">
                    <div className="home-todo-content-column">
                      <h4 className="home-todo-task">{todo.task}</h4>
                      {todo.location && (
                        <p className="home-todo-location">@ {todo.location}</p>
                      )}
                    </div>
                  </div>
                ))}
                {selectedDateTodos.todos.length === 0 && (
                  <div className="home-modal-no-todos">
                    <p>No todos for this day</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
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