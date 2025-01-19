import React, { useState, useRef, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, getDocs, updateDoc, doc, serverTimestamp, query, orderBy, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import '../../styles/addTodo.css';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import moment from 'moment-timezone';

const AddTodo = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState('');
  const [addedTodos, setAddedTodos] = useState([]);
  const textareaRef = useRef(null);
  const [isExampleVisible, setIsExampleVisible] = useState(false);
  const [currentTodo, setCurrentTodo] = useState({
    task: '',
    date: moment().tz('Asia/Hong_Kong').format('YYYY-MM-DD'),
    startTime: '',
    endTime: '',
    location: ''
  });
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    fetchTodos();
    checkNotificationPermission();
  }, []);

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

      // Sort todos by date in Hong Kong timezone
      allTodos.sort((a, b) => {
        const dateA = moment.tz(a.date, 'Asia/Hong_Kong');
        const dateB = moment.tz(b.date, 'Asia/Hong_Kong');
        if (dateA.isSame(dateB, 'day')) {
          return a.startTime && b.startTime ? 
            a.startTime.localeCompare(b.startTime) : 
            b.createdAt - a.createdAt;
        }
        return dateA.isBefore(dateB) ? -1 : 1;
      });

      setAddedTodos(allTodos);
    } catch (error) {
      console.error('Error fetching todos:', error);
    }
  };

  const checkNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.permission;
      setNotificationPermission(permission);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission === 'granted';
    }
    return false;
  };

  const scheduleNotification = async (todo, customMinutes) => {
    if (!todo.startTime || !todo.date) return;

    const hasPermission = notificationPermission === 'granted' || await requestNotificationPermission();
    if (!hasPermission) {
      alert('알림 권한이 필요합니다.');
      return;
    }

    const [hours, minutes] = todo.startTime.split(':');
    const notificationTime = new Date(todo.date);
    const minutesBefore = customMinutes || todo.notifyMinutesBefore || 30;
    notificationTime.setHours(parseInt(hours), parseInt(minutes) - minutesBefore, 0);

    const now = new Date();
    if (notificationTime > now) {
      try {
        // Update todo in Firestore with new path
        const todoRef = doc(db, `todos/${todo.date}/todos/${todo.id}`);
        await updateDoc(todoRef, {
          notificationScheduled: true,
          notifyMinutesBefore: minutesBefore,
          notificationTime: notificationTime.getTime()
        });

        // Update local state
        setAddedTodos(prev => prev.map(t => 
          t.id === todo.id && t.date === todo.date ? {
            ...t, 
            notificationScheduled: true, 
            notifyMinutesBefore: minutesBefore
          } : t
        ));

        // Service Worker에 알림 스케줄링 요청
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const notification = {
            id: `${todo.date}-${todo.id}`,
            title: '할 일 알림',
            body: `${minutesBefore}분 후 일정: ${todo.task}${todo.location ? ` @ ${todo.location}` : ''}`,
            time: notificationTime.getTime(),
            data: {
              todoId: todo.id,
              date: todo.date,
              task: todo.task,
              location: todo.location,
              minutesBefore
            }
          };

          navigator.serviceWorker.controller.postMessage({
            type: 'SCHEDULE_NOTIFICATION',
            notification
          });
        }

      } catch (error) {
        console.error('Error scheduling notification:', error);
        alert('알림 설정 중 오류가 발생했습니다.');
      }
    } else {
      alert('이미 지난 시간에는 알림을 설정할 수 없습니다.');
    }
  };

  const formatTodoDisplay = (todo) => {
    const parts = [];

    if (todo.date) {
      const date = new Date(todo.date);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      if (todo.date === today.toISOString().split('T')[0]) {
        parts.push('오늘');
      } else if (todo.date === tomorrow.toISOString().split('T')[0]) {
        parts.push('내일');
      } else if (todo.date === nextWeek.toISOString().split('T')[0]) {
        parts.push('다음 주');
      } else {
        parts.push(date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }));
      }
    }

    if (todo.startTime) {
      const timeDisplay = todo.endTime 
        ? `${todo.startTime} - ${todo.endTime}`
        : todo.startTime;
      parts.push(timeDisplay);
    }

    if (todo.location) {
      parts.push(`@ ${todo.location}`);
    }

    if (todo.notificationScheduled && todo.startTime) {
      parts.push(`🔔 ${todo.notifyMinutesBefore || 30}분 전 알림`);
    }

    return (
      <div className="todo-content">
        <div className="todo-task">{todo.task}</div>
        {parts.length > 0 && (
          <div className="todo-details">
            {parts.join(' · ')}
          </div>
        )}
      </div>
    );
  };

  const handleToggleComplete = async (todoId, completed, date) => {
    try {
      const todoRef = doc(db, `todos/${date}/todos/${todoId}`);
      await updateDoc(todoRef, {
        completed: !completed
      });
      setAddedTodos(prev => prev.map(todo => 
        todo.id === todoId && todo.date === date ? {...todo, completed: !completed} : todo
      ));
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const parseCommand = (text) => {
    const dateMatch = text.match(/\/d\s+(\S+)/);
    const timeMatch = text.match(/\/t\s+(\S+)/);
    const locationMatch = text.match(/\/l\s+(.+)$/);
    const alarmMatch = text.match(/\/a\s+(\d+)/);

    let updatedTodo = { ...currentTodo };
    let updatedText = text;

    if (dateMatch) {
      const dateStr = dateMatch[1].toLowerCase();
      let date = dateStr;
      const today = moment().tz('Asia/Hong_Kong');
      
      switch(dateStr) {
        case 'td':
          date = today.format('YYYY-MM-DD');
          break;
        case 'tmr':
          date = today.add(1, 'days').format('YYYY-MM-DD');
          break;
        case 'nw':
          date = today.add(7, 'days').format('YYYY-MM-DD');
          break;
        default:
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            date = today.format('YYYY-MM-DD');
          }
      }
      
      updatedTodo.date = date;
      updatedText = updatedText.replace(/\/d\s+\S+/, '').trim();
    }

    if (timeMatch) {
      const timeStr = timeMatch[1];
      const [start, end] = timeStr.split('-').map(t => {
        if (t.includes(':')) return t;
        return `${t}:00`;
      });
      updatedTodo.startTime = start;
      updatedTodo.endTime = end || '';
      updatedText = updatedText.replace(/\/t\s+\S+/, '').trim();
    }

    if (locationMatch) {
      updatedTodo.location = locationMatch[1].trim();
      updatedText = updatedText.replace(/\/l\s+.+$/, '').trim();
    }

    if (alarmMatch) {
      const minutesBefore = parseInt(alarmMatch[1]);
      updatedTodo.notifyMinutesBefore = minutesBefore;
      updatedText = updatedText.replace(/\/a\s+\d+/, '').trim();
    }

    return {
      todo: updatedTodo,
      text: updatedText
    };
  };

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = e.target.value.trim();
      
      if (!text) return;

      const lines = text.split('\n');
      const lastLine = lines[lines.length - 1];
      
      if (!lastLine) return;

      const { todo, text: taskText } = parseCommand(lastLine);
      
      try {
        const todayDate = todo.date || moment().tz('Asia/Hong_Kong').format('YYYY-MM-DD');
        
        // Get reference to the date collection and its todos subcollection
        const dateCollectionRef = doc(db, 'todos', todayDate);
        const todosCollectionRef = collection(dateCollectionRef, 'todos');
        
        // Get current todos for the date to determine next number
        const todosQuery = query(todosCollectionRef, orderBy('createdAt', 'desc'));
        const todosSnapshot = await getDocs(todosQuery);
        
        // Calculate next number
        let nextNumber = 1;
        if (!todosSnapshot.empty) {
          const numbers = todosSnapshot.docs
            .map(doc => {
              const match = doc.id.match(/todo-(\d+)/);
              return match ? parseInt(match[1]) : 0;
            })
            .filter(num => !isNaN(num));
          
          if (numbers.length > 0) {
            nextNumber = Math.max(...numbers) + 1;
          }
        }

        // Create document ID
        const docId = `todo-${String(nextNumber).padStart(3, '0')}`;

        // 알림 설정이 있는 경우 초기 상태에 포함
        const initialNotificationState = todo.notifyMinutesBefore ? {
          notificationScheduled: true,
          notifyMinutesBefore: todo.notifyMinutesBefore
        } : {
          notificationScheduled: false
        };

        // Ensure date collection exists
        await setDoc(dateCollectionRef, { createdAt: serverTimestamp() }, { merge: true });

        // Add todo document to the subcollection
        await setDoc(doc(todosCollectionRef, docId), {
          ...todo,
          task: taskText || lastLine,
          createdAt: serverTimestamp(),
          completed: false,
          ...initialNotificationState
        });

        // Add the new todo to the list
        const newTodo = {
          id: docId,
          date: todayDate,
          ...todo,
          task: taskText || lastLine,
          completed: false,
          ...initialNotificationState
        };

        // If /a command was used, schedule notification immediately
        if (todo.notifyMinutesBefore) {
          await scheduleNotification(newTodo, todo.notifyMinutesBefore);
        }

        setAddedTodos(prev => [newTodo, ...prev]);

        // Clear only the last line
        const newNotes = lines.slice(0, -1).join('\n') + '\n';
        setNotes(newNotes);
        setCurrentTodo({
          task: '',
          date: moment().tz('Asia/Hong_Kong').format('YYYY-MM-DD'),
          startTime: '',
          endTime: '',
          location: ''
        });
      } catch (error) {
        console.error('Error adding todo:', error);
      }
    }
  };

  const handleCommandClick = (command) => {
    const cursorPosition = textareaRef.current.selectionStart;
    const textBeforeCursor = notes.substring(0, cursorPosition);
    const textAfterCursor = notes.substring(cursorPosition);
    
    // Add a space before the command if there isn't one
    const space = textBeforeCursor.length > 0 && !textBeforeCursor.endsWith(' ') ? ' ' : '';
    const newText = textBeforeCursor + space + command + ' ' + textAfterCursor;
    
    setNotes(newText);
    textareaRef.current.focus();
    
    // Set cursor position after the command
    const newPosition = cursorPosition + space.length + command.length + 1;
    setTimeout(() => {
      textareaRef.current.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  // Helper function to check if a date is today in Hong Kong timezone
  const isToday = (dateStr) => {
    const today = moment().tz('Asia/Hong_Kong').startOf('day');
    const date = moment.tz(dateStr, 'Asia/Hong_Kong').startOf('day');
    return date.isSame(today);
  };

  // Filter todos for today and other days
  const todayTodos = addedTodos.filter(todo => isToday(todo.date));
  const otherTodos = addedTodos.filter(todo => !isToday(todo.date));

  // Group todos by date for calendar view
  const todosByDate = otherTodos.reduce((acc, todo) => {
    const date = todo.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(todo);
    return acc;
  }, {});

  return (
    <div className="memo-container">
      <div className="memo-header">
        <div className="memo-header-top">
          <h1>Quick Todo</h1>
          <button 
            onClick={() => navigate('/admin/todo-management')} 
            className="manage-todos-btn"
            title="Todo 관리"
          >
            ⚙️
          </button>
        </div>
        <div className="memo-commands">
          <p>Commands:</p>
          <p onClick={() => handleCommandClick('/d')} className="command-btn">/d</p>
          <p onClick={() => handleCommandClick('/t')} className="command-btn">/t</p>
          <p onClick={() => handleCommandClick('/l')} className="command-btn">/l</p>
          <p onClick={() => handleCommandClick('/a')} className="command-btn">/a</p>
        </div>
        <div className="memo-command-examples">
          <p onClick={() => setIsExampleVisible(!isExampleVisible)} className="examples-toggle">
            Examples {isExampleVisible ? '▼' : '▶'}
          </p>
          <div className={`examples-content ${isExampleVisible ? 'visible' : ''}`}>
            <p>/d td (today), tmr (tomorrow), nw (next week)</p>
            <p>/t 9-10:30 (time range)</p>
            <p>/l location</p>
            <p>/a 20 (알림: 20분 전)</p>
          </div>
        </div>
      </div>
      <div className="memo-content">
        <textarea
          ref={textareaRef}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onKeyDown={handleKeyDown}
          className="memo-textarea"
          placeholder="Type your todos here..."
        />
        <div className="todos-calendar-layout">
          <div className="todos-list-section">
            <div className="todos-list-content">
              {todayTodos.length > 0 && (
                <div className="today-todos">
                  <h2>Today's Todos ({moment().tz('Asia/Hong_Kong').format('YYYY-MM-DD ddd')})</h2>
                  <div className="added-todos">
                    {todayTodos.map(todo => (
                      <div 
                        key={todo.id} 
                        className={`todo-item ${todo.completed ? 'completed' : ''}`}
                        onClick={() => handleToggleComplete(todo.id, todo.completed, todo.date)}
                      >
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          className="todo-checkbox"
                          readOnly
                        />
                        {formatTodoDisplay(todo)}
                        {todo.startTime && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              scheduleNotification(todo);
                            }}
                            className={`notification-btn ${todo.notificationScheduled ? 'scheduled' : ''}`}
                            disabled={todo.notificationScheduled}
                          >
                            {todo.notificationScheduled 
                              ? `${todo.notifyMinutesBefore || 30}분 전 알림` 
                              : '30분 전 알림'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedDate && !isToday(moment(selectedDate).format('YYYY-MM-DD')) && (
                <div className="selected-date-todos">
                  <h3>{moment(selectedDate).tz('Asia/Hong_Kong').format('YYYY-MM-DD ddd')}</h3>
                  <div className="added-todos">
                    {todosByDate[moment(selectedDate).format('YYYY-MM-DD')]?.map(todo => (
                      <div 
                        key={todo.id} 
                        className={`todo-item ${todo.completed ? 'completed' : ''}`}
                        onClick={() => handleToggleComplete(todo.id, todo.completed, todo.date)}
                      >
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          className="todo-checkbox"
                          readOnly
                        />
                        {formatTodoDisplay(todo)}
                        {todo.startTime && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              scheduleNotification(todo);
                            }}
                            className={`notification-btn ${todo.notificationScheduled ? 'scheduled' : ''}`}
                            disabled={todo.notificationScheduled}
                          >
                            {todo.notificationScheduled 
                              ? `${todo.notifyMinutesBefore || 30}분 전 알림` 
                              : '30분 전 알림'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="calendar-section">
            <h2>Calendar</h2>
            <Calendar
              onChange={setSelectedDate}
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
        </div>
      </div>
    </div>
  );
};

export default AddTodo;