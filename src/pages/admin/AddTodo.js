import React, { useState, useRef, useEffect } from 'react';
import { db, getFCMToken } from '../../firebase/config';
import { collection, addDoc, getDocs, updateDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import '../../styles/addTodo.css';

const AddTodo = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState('');
  const [addedTodos, setAddedTodos] = useState([]);
  const textareaRef = useRef(null);
  const [isExampleVisible, setIsExampleVisible] = useState(false);
  const [currentTodo, setCurrentTodo] = useState({
    task: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    location: ''
  });
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [fcmToken, setFcmToken] = useState(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    fetchTodos();
    checkNotificationPermission();
    checkScheduledNotifications();
    initializeFCM();
  }, []);

  const initializeFCM = async () => {
    try {
      const token = await getFCMToken();
      if (token) {
        setFcmToken(token);
        console.log('FCM Token:', token);
      }
    } catch (error) {
      console.error('FCM 초기화 실패:', error);
    }
  };

  const fetchTodos = async () => {
    try {
      const q = query(collection(db, 'todos'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const todos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAddedTodos(todos);
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

  const checkScheduledNotifications = () => {
    const savedNotifications = JSON.parse(localStorage.getItem('scheduledNotifications') || '[]');
    const now = new Date().getTime();

    savedNotifications.forEach(notification => {
      const timeUntilNotification = notification.time - now;
      
      if (timeUntilNotification > 0) {
        setTimeout(() => {
          new Notification('할 일 알림', {
            body: `${notification.minutesBefore}분 후 일정: ${notification.task}${notification.location ? ` @ ${notification.location}` : ''}`,
            icon: '/diatomicarbon-icon.ico'
          });
        }, timeUntilNotification);
      }
    });

    const futureNotifications = savedNotifications.filter(n => n.time > now);
    localStorage.setItem('scheduledNotifications', JSON.stringify(futureNotifications));
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
      const timeUntilNotification = notificationTime.getTime() - now.getTime();
      
      try {
        // Update todo in Firestore with notification status
        const todoRef = doc(db, 'todos', todo.id);
        await updateDoc(todoRef, {
          notificationScheduled: true,
          notifyMinutesBefore: minutesBefore,
          fcmToken: fcmToken // FCM 토큰 저장
        });

        // Update local state
        setAddedTodos(prev => prev.map(t => 
          t.id === todo.id ? {...t, notificationScheduled: true, notifyMinutesBefore: minutesBefore} : t
        ));

        // Save notification to localStorage
        const savedNotifications = JSON.parse(localStorage.getItem('scheduledNotifications') || '[]');
        savedNotifications.push({
          id: todo.id,
          task: todo.task,
          location: todo.location,
          time: notificationTime.getTime(),
          minutesBefore,
          fcmToken
        });
        localStorage.setItem('scheduledNotifications', JSON.stringify(savedNotifications));

        // Schedule both local and FCM notifications
        setTimeout(() => {
          // Local notification
          new Notification('할 일 알림', {
            body: `${minutesBefore}분 후 일정: ${todo.task}${todo.location ? ` @ ${todo.location}` : ''}`,
            icon: '/diatomicarbon-icon.ico'
          });

          // FCM notification (서버에서 처리해야 하는 부분입니다)
          // 여기서는 예시로만 표시합니다
          if (fcmToken) {
            console.log('FCM notification would be sent to:', fcmToken);
          }

          // Remove notification from localStorage after it's fired
          const remainingNotifications = JSON.parse(localStorage.getItem('scheduledNotifications') || '[]')
            .filter(n => n.id !== todo.id);
          localStorage.setItem('scheduledNotifications', JSON.stringify(remainingNotifications));
        }, timeUntilNotification);

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

  const handleToggleComplete = async (todoId, completed) => {
    try {
      const todoRef = doc(db, 'todos', todoId);
      await updateDoc(todoRef, {
        completed: !completed
      });
      setAddedTodos(prev => prev.map(todo => 
        todo.id === todoId ? {...todo, completed: !completed} : todo
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
      const today = new Date();
      
      switch(dateStr) {
        case 'td':
          date = today.toISOString().split('T')[0];
          break;
        case 'tmr':
          today.setDate(today.getDate() + 1);
          date = today.toISOString().split('T')[0];
          break;
        case 'nw':
          today.setDate(today.getDate() + 7);
          date = today.toISOString().split('T')[0];
          break;
        default:
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            date = today.toISOString().split('T')[0];
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
        // 알림 설정이 있는 경우 초기 상태에 포함
        const initialNotificationState = todo.notifyMinutesBefore ? {
          notificationScheduled: true,
          notifyMinutesBefore: todo.notifyMinutesBefore
        } : {
          notificationScheduled: false
        };

        const docRef = await addDoc(collection(db, 'todos'), {
          ...todo,
          task: taskText || lastLine,
          createdAt: serverTimestamp(),
          completed: false,
          ...initialNotificationState
        });

        // Add the new todo to the list with notification status
        const newTodo = {
          id: docRef.id,
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
          date: new Date().toISOString().split('T')[0],
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

  return (
    <div className="memo-container">
      <div className="memo-header">
        <h1>Quick Todo</h1>
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
        <div className="added-todos">
          {addedTodos.map(todo => (
            <div 
              key={todo.id} 
              className={`todo-item ${todo.completed ? 'completed' : ''}`}
              onClick={() => handleToggleComplete(todo.id, todo.completed)}
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
    </div>
  );
};

export default AddTodo;