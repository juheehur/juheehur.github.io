import React, { useState, useRef, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, getDocs, updateDoc, doc, serverTimestamp, query, orderBy, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import '../../styles/addTodo.css';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import moment from 'moment-timezone';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import TutoringLog from '../../components/TutoringLog';

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
    location: '',
    postponed: false,
    postponeReason: ''
  });
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [goals, setGoals] = useState([]);
  const [categoryColors, setCategoryColors] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(moment().tz('Asia/Hong_Kong'));
  const [monthTodos, setMonthTodos] = useState(() => {
    const cached = localStorage.getItem('monthTodos');
    return cached ? JSON.parse(cached) : {};
  });
  const [loadedMonths, setLoadedMonths] = useState(() => {
    const cached = localStorage.getItem('loadedMonths');
    return new Set(cached ? JSON.parse(cached) : []);
  });
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [habits, setHabits] = useState([]);
  const [todayHabits, setTodayHabits] = useState([]);
  const [monthListeners, setMonthListeners] = useState({});

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    const unsubscribeTodayTodos = setupTodayTodosListener();
    checkNotificationPermission();
    fetchGoals();
    fetchCategoryColors();
    fetchTodayHabits();

    return () => {
      if (unsubscribeTodayTodos) unsubscribeTodayTodos();
      // Cleanup all month listeners
      Object.values(monthListeners).forEach(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('monthTodos', JSON.stringify(monthTodos));
  }, [monthTodos]);

  useEffect(() => {
    localStorage.setItem('loadedMonths', JSON.stringify([...loadedMonths]));
  }, [loadedMonths]);

  const setupTodayTodosListener = () => {
    try {
      const today = moment().tz('Asia/Hong_Kong').format('YYYY-MM-DD');
      const todosQuery = query(
        collection(db, `todos/${today}/todos`),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(todosQuery, (snapshot) => {
        const todayTodos = snapshot.docs.map(doc => ({
          id: doc.id,
          date: today,
          ...doc.data()
        }));

        setAddedTodos(todayTodos);
        
        const currentMonth = moment().tz('Asia/Hong_Kong').format('YYYY-MM');
        if (!loadedMonths.has(currentMonth)) {
          fetchMonthTodos(currentMonth);
        }
      }, (error) => {
        console.error('Error in todos listener:', error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up todos listener:', error);
      return null;
    }
  };

  const fetchMonthTodos = async (monthStr) => {
    if (loadedMonths.has(monthStr) || isLoadingMonth || monthListeners[monthStr]) return;
    
    setIsLoadingMonth(true);
    try {
      const startDate = moment(monthStr).startOf('month');
      const endDate = moment(monthStr).endOf('month');
      
      // Create listeners for each day in the month
      const monthDays = [];
      let currentDate = startDate.clone();
      while (currentDate.isSameOrBefore(endDate)) {
        monthDays.push(currentDate.format('YYYY-MM-DD'));
        currentDate.add(1, 'day');
      }

      const listeners = {};
      monthDays.forEach(date => {
        const todosQuery = query(
          collection(db, `todos/${date}/todos`),
          orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(todosQuery, (snapshot) => {
          const dateTodos = snapshot.docs.map(doc => ({
            id: doc.id,
            date,
            ...doc.data()
          }));

          setMonthTodos(prev => {
            const existingMonthTodos = prev[monthStr] || [];
            const filteredTodos = existingMonthTodos.filter(todo => todo.date !== date);
            return {
              ...prev,
              [monthStr]: [...filteredTodos, ...dateTodos]
            };
          });
        }, (error) => {
          console.error(`Error in month todos listener for ${date}:`, error);
        });

        listeners[date] = unsubscribe;
      });

      setMonthListeners(prev => ({
        ...prev,
        [monthStr]: () => {
          Object.values(listeners).forEach(unsubscribe => unsubscribe());
        }
      }));

      setLoadedMonths(prev => new Set([...prev, monthStr]));
    } catch (error) {
      console.error('Error fetching month todos:', error);
    } finally {
      setIsLoadingMonth(false);
    }
  };

  const handleMonthChange = ({ activeStartDate }) => {
    const monthStr = moment(activeStartDate).format('YYYY-MM');
    fetchMonthTodos(monthStr);
  };

  const getTodoCount = (date) => {
    const dateStr = moment(date).format('YYYY-MM-DD');
    const monthStr = moment(date).format('YYYY-MM');
    
    if (moment(dateStr).isSame(moment(), 'day')) {
      return addedTodos.length;
    }
    
    if (!loadedMonths.has(monthStr)) {
      return null;
    }
    
    return monthTodos[monthStr]?.filter(todo => todo.date === dateStr).length || 0;
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
        const todoRef = doc(db, `todos/${todo.date}/todos/${todo.id}`);
        await updateDoc(todoRef, {
          notificationScheduled: true,
          notifyMinutesBefore: minutesBefore,
          notificationTime: notificationTime.getTime()
        });

        setAddedTodos(prev => prev.map(t => 
          t.id === todo.id && t.date === todo.date ? {
            ...t, 
            notificationScheduled: true, 
            notifyMinutesBefore: minutesBefore
          } : t
        ));

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

  const handlePostpone = async (todo, reason = '') => {
    try {
      const currentDate = moment(todo.date);
      const nextDate = currentDate.add(1, 'days').format('YYYY-MM-DD');
      
      // Delete from current date collection
      const oldTodoRef = doc(db, `todos/${todo.date}/todos/${todo.id}`);
      await deleteDoc(oldTodoRef);
      
      // Add to next date collection with postpone info
      const dateCollectionRef = doc(db, 'todos', nextDate);
      const todosCollectionRef = collection(dateCollectionRef, 'todos');
      
      await setDoc(dateCollectionRef, { createdAt: serverTimestamp() }, { merge: true });
      
      const newTodoData = {
        ...todo,
        date: nextDate,
        postponed: true,
        postponeReason: reason,
        postponeCount: (todo.postponeCount || 0) + 1,
        createdAt: serverTimestamp()
      };
      
      await setDoc(doc(todosCollectionRef, todo.id), newTodoData);

      // Update local state
      setAddedTodos(prev => prev.filter(t => !(t.id === todo.id && t.date === todo.date)));
      
      const monthStr = moment(nextDate).format('YYYY-MM');
      setMonthTodos(prev => {
        const monthTodosList = prev[monthStr] || [];
        return {
          ...prev,
          [monthStr]: [newTodoData, ...monthTodosList.filter(t => !(t.id === todo.id && t.date === todo.date))]
        };
      });

      toast.info('📅 Todo postponed to tomorrow', {
        position: "bottom-right",
        autoClose: 2000,
      });
    } catch (error) {
      console.error('Error postponing todo:', error);
      toast.error('❌ Failed to postpone todo', {
        position: "bottom-right",
        autoClose: 2000,
      });
    }
  };

  const formatTodoDisplay = (todo) => {
    const parts = [];

    if (todo.date) {
      const date = moment(todo.date).tz('Asia/Hong_Kong');
      const today = moment().tz('Asia/Hong_Kong');
      const tomorrow = moment().tz('Asia/Hong_Kong').add(1, 'days');
      const nextWeek = moment().tz('Asia/Hong_Kong').add(7, 'days');

      if (date.isSame(today, 'day')) {
        parts.push('오늘');
      } else if (date.isSame(tomorrow, 'day')) {
        parts.push('내일');
      } else if (date.isSame(nextWeek, 'day')) {
        parts.push('다음 주');
      } else {
        parts.push(date.format('M월 D일'));
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

    if (todo.postponed) {
      parts.push(`미뤄짐${todo.postponeReason ? ': ' + todo.postponeReason : ''}`);
    }

    return (
      <div className="todo-content">
        <div className="todo-task">
          {todo.postponed && (
            <span className="postponed-indicator">
              {'•'.repeat(todo.postponeCount || 1)}
            </span>
          )}
          {todo.task}
        </div>
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

      const monthStr = moment(date).format('YYYY-MM');
      setMonthTodos(prev => {
        const monthTodosList = prev[monthStr] || [];
        return {
          ...prev,
          [monthStr]: monthTodosList.map(todo =>
            todo.id === todoId && todo.date === date ? {...todo, completed: !completed} : todo
          )
        };
      });
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const getNextWeekday = (weekday) => {
    const weekdays = {
      'sun': 0, 'sunday': 0,
      'mon': 1, 'monday': 1,
      'tue': 2, 'tuesday': 2,
      'wed': 3, 'wednesday': 3,
      'thu': 4, 'thursday': 4,
      'fri': 5, 'friday': 5,
      'sat': 6, 'saturday': 6
    };

    const today = moment().tz('Asia/Hong_Kong');
    const targetDay = weekdays[weekday.toLowerCase()];
    
    if (targetDay === undefined) return null;

    let nextDate = moment(today);
    while (nextDate.day() !== targetDay || nextDate.isBefore(today, 'day')) {
      nextDate = nextDate.add(1, 'days');
    }

    return nextDate.format('YYYY-MM-DD');
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
      
      const nextWeekday = getNextWeekday(dateStr);
      if (nextWeekday) {
        date = nextWeekday;
      } else {
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
            if (/^\d{4}$/.test(dateStr)) {
              const month = dateStr.substring(0, 2);
              const day = dateStr.substring(2, 4);
              const year = today.format('YYYY');
              const inputDate = moment.tz(`${year}-${month}-${day}`, 'YYYY-MM-DD', 'Asia/Hong_Kong');
              
              if (inputDate.isValid()) {
                date = inputDate.format('YYYY-MM-DD');
              } else {
                date = today.format('YYYY-MM-DD');
              }
            } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              date = today.format('YYYY-MM-DD');
            }
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
        const monthStr = moment(todayDate).format('YYYY-MM');
        
        const dateCollectionRef = doc(db, 'todos', todayDate);
        const todosCollectionRef = collection(dateCollectionRef, 'todos');
        
        const todosQuery = query(todosCollectionRef, orderBy('createdAt', 'desc'));
        const todosSnapshot = await getDocs(todosQuery);
        
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

        const docId = `todo-${String(nextNumber).padStart(3, '0')}`;

        const initialNotificationState = todo.notifyMinutesBefore ? {
          notificationScheduled: true,
          notifyMinutesBefore: todo.notifyMinutesBefore
        } : {
          notificationScheduled: false
        };

        await setDoc(dateCollectionRef, { createdAt: serverTimestamp() }, { merge: true });

        await setDoc(doc(todosCollectionRef, docId), {
          ...todo,
          task: taskText || lastLine,
          createdAt: serverTimestamp(),
          completed: false,
          ...initialNotificationState
        });

        const newTodo = {
          id: docId,
          date: todayDate,
          ...todo,
          task: taskText || lastLine,
          completed: false,
          ...initialNotificationState
        };

        setAddedTodos(prev => [newTodo, ...prev]);
        setMonthTodos(prev => {
          const monthTodosList = prev[monthStr] || [];
          return {
            ...prev,
            [monthStr]: [newTodo, ...monthTodosList]
          };
        });

        toast.success(`✅ Added: ${taskText || lastLine}`, {
          position: "bottom-right",
          autoClose: 2000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          style: { maxWidth: '400px', whiteSpace: 'pre-line' }
        });

        if (todo.notifyMinutesBefore) {
          await scheduleNotification(newTodo, todo.notifyMinutesBefore);
        }

        const newNotes = lines.slice(0, -1).join('\n') + '\n';
        setNotes(newNotes);
        setCurrentTodo({
          task: '',
          date: moment().tz('Asia/Hong_Kong').format('YYYY-MM-DD'),
          startTime: '',
          endTime: '',
          location: '',
          postponed: false,
          postponeReason: ''
        });
      } catch (error) {
        console.error('Error adding todo:', error);
        toast.error('❌ Failed to add todo', {
          position: "bottom-right",
          autoClose: 2000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    }
  };

  const handleCommandClick = (command) => {
    const cursorPosition = textareaRef.current.selectionStart;
    const textBeforeCursor = notes.substring(0, cursorPosition);
    const textAfterCursor = notes.substring(cursorPosition);
    
    const space = textBeforeCursor.length > 0 && !textBeforeCursor.endsWith(' ') ? ' ' : '';
    const newText = textBeforeCursor + space + command + ' ' + textAfterCursor;
    
    setNotes(newText);
    textareaRef.current.focus();
    
    const newPosition = cursorPosition + space.length + command.length + 1;
    setTimeout(() => {
      textareaRef.current.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const isToday = (dateStr) => {
    const today = moment().tz('Asia/Hong_Kong').startOf('day');
    const date = moment(dateStr).tz('Asia/Hong_Kong').startOf('day');
    return date.isSame(today);
  };

  const todayTodos = addedTodos.filter(todo => isToday(todo.date));
  const otherTodos = addedTodos.filter(todo => !isToday(todo.date));

  const todosByDate = otherTodos.reduce((acc, todo) => {
    const date = todo.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(todo);
    return acc;
  }, {});

  const fetchGoals = async () => {
    try {
      const goalsSnapshot = await getDocs(collection(db, 'goals'));
      const goalsData = goalsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGoals(goalsData);
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  const fetchCategoryColors = async () => {
    try {
      const categoryColorsSnapshot = await getDocs(collection(db, 'categoryColors'));
      const colorsData = categoryColorsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCategoryColors(colorsData.reduce((acc, color) => ({
        ...acc,
        [color.category]: color.color
      }), {}));
    } catch (error) {
      console.error('Error fetching category colors:', error);
    }
  };

  const filterGoalsByMonth = (goals, month) => {
    return goals.filter(goal => {
      if (!goal.targetDate) return false;
      const goalDate = moment(goal.targetDate);
      return goalDate.month() === month.month() && goalDate.year() === month.year();
    });
  };

  const fetchTodayHabits = async () => {
    try {
      const habitsQuery = query(collection(db, 'habits'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(habitsQuery);
      const habitsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter habits that are still active
      const today = moment().format('YYYY-MM-DD');
      const activeHabits = habitsData.filter(habit => 
        moment(today).isBetween(habit.startDate, habit.endDate, 'day', '[]')
      );
      
      setHabits(activeHabits);
      setTodayHabits(activeHabits);
    } catch (error) {
      console.error('Error fetching habits:', error);
    }
  };

  const handleHabitCheck = async (habit) => {
    const today = moment().format('YYYY-MM-DD');
    const newProgress = { ...habit.progress };
    newProgress[today] = !newProgress[today];

    try {
      const habitRef = doc(db, 'habits', habit.id);
      const updatedStreak = calculateStreak(newProgress);
      
      await updateDoc(habitRef, {
        progress: newProgress,
        currentStreak: updatedStreak.currentStreak,
        longestStreak: Math.max(updatedStreak.currentStreak, habit.longestStreak || 0)
      });

      // Update local state
      setTodayHabits(prev => prev.map(h => 
        h.id === habit.id 
          ? { ...h, progress: newProgress, currentStreak: updatedStreak.currentStreak }
          : h
      ));

      // Show toast notification
      const message = newProgress[today] 
        ? `✅ Completed: ${habit.title}`
        : `↩️ Unmarked: ${habit.title}`;
      
      toast(message, {
        position: "bottom-right",
        autoClose: 2000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error) {
      console.error('Error updating habit:', error);
    }
  };

  const calculateStreak = (progress) => {
    let currentStreak = 0;
    const today = moment().format('YYYY-MM-DD');
    let date = moment(today);

    while (progress[date.format('YYYY-MM-DD')]) {
      currentStreak++;
      date = date.subtract(1, 'days');
    }

    return { currentStreak };
  };

  const getHabitCompletion = (habit) => {
    const completedDays = Object.values(habit.progress || {}).filter(Boolean).length;
    const monthlyTarget = habit.monthlyTarget || 30;
    return {
      percentage: Math.round((completedDays / monthlyTarget) * 100),
      completedDays,
      monthlyTarget
    };
  };

  const refreshTodos = async () => {
    try {
      toast.info('🔄 Refreshing todos...', {
        position: "bottom-right",
        autoClose: 1000,
      });
      
      // Re-fetch today's todos
      const unsubscribe = setupTodayTodosListener();
      
      // Re-fetch current month's todos
      const currentMonth = moment().format('YYYY-MM');
      setLoadedMonths(new Set());
      await fetchMonthTodos(currentMonth);
      
      toast.success('✨ Todos refreshed!', {
        position: "bottom-right",
        autoClose: 2000,
      });
      
      return () => {
        if (unsubscribe) unsubscribe();
      };
    } catch (error) {
      console.error('Error refreshing todos:', error);
      toast.error('❌ Failed to refresh todos', {
        position: "bottom-right",
        autoClose: 2000,
      });
    }
  };

  const TodoItem = ({ todo, onToggleComplete }) => {
    const [isPostponing, setIsPostponing] = useState(false);
    const [postponeReason, setPostponeReason] = useState('');

    const handlePostponeClick = (e) => {
      e.stopPropagation();
      setIsPostponing(true);
    };

    const handlePostponeSubmit = (e) => {
      e.stopPropagation();
      handlePostpone(todo, postponeReason);
      setIsPostponing(false);
      setPostponeReason('');
    };

    const handlePostponeCancel = (e) => {
      e.stopPropagation();
      setIsPostponing(false);
      setPostponeReason('');
    };

    const handleNotificationClick = (e) => {
      e.stopPropagation();
      if (!todo.notificationScheduled && todo.startTime) {
        scheduleNotification(todo);
      }
    };

    const todoClasses = [
      'todo-item',
      todo.completed ? 'completed' : '',
      todo.postponed ? 'postponed' : '',
      todo.notificationScheduled ? 'notification-scheduled' : '',
      todo.startTime && !todo.notificationScheduled ? 'can-schedule' : ''
    ].filter(Boolean).join(' ');

    return (
      <div 
        className={todoClasses}
        onClick={() => onToggleComplete(todo.id, todo.completed, todo.date)}
      >
        <div className="todo-main-content">
          <input
            type="checkbox"
            checked={todo.completed}
            className="todo-checkbox"
            readOnly
          />
          {formatTodoDisplay(todo)}
        </div>
        <div className="todo-actions">
          {!isPostponing ? (
            <button 
              onClick={handlePostponeClick}
              className="postpone-btn"
              title="미루기"
            >
              ⏳
            </button>
          ) : (
            <div className="postpone-form" onClick={e => e.stopPropagation()}>
              <input
                type="text"
                placeholder="미룬 이유 (선택사항)"
                value={postponeReason}
                onChange={e => setPostponeReason(e.target.value)}
                className="postpone-reason-input"
              />
              <button onClick={handlePostponeSubmit} className="postpone-submit-btn">
                확인
              </button>
              <button onClick={handlePostponeCancel} className="postpone-cancel-btn">
                취소
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="memo-container">
      <div className="memo-header">
        <div className="memo-header-top">
          <h1>Quick Todo</h1>
          <div className="header-buttons">
            <button 
              onClick={refreshTodos} 
              className="refresh-btn"
              title="Refresh Todos"
            >
              🔄
            </button>
            <button 
              onClick={() => navigate('/admin/add-goal')} 
              className="add-goal-small-btn"
              title="Add Goal"
            >
              🎯
            </button>
            <button 
              onClick={() => navigate('/admin/tech-interview')} 
              className="tech-interview-btn"
              title="Tech Interview"
            >
              💻
            </button>
            <button 
              onClick={() => navigate('/admin/interview-practice')} 
              className="interview-practice-btn"
              title="Interview Practice"
            >
              📝
            </button>
            <button 
              onClick={() => navigate('/admin/todo-management')} 
              className="manage-todos-btn"
              title="Todo 관리"
            >
              ⚙️
            </button>
          </div>
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
            <p>/d td (today), tmr (tomorrow), nw (next week), 0130 (1월 30일)</p>
            <p>/d mon, tue, wed... (다가오는 가장 가까운 요일)</p>
            <p>/t 9-10:30 (time range)</p>
            <p>/l location</p>
            <p>/a 20 (알림: 20분 전)</p>
          </div>
        </div>
      </div>

      <div className="memo-content">
        <div className="content-layout">
          <div className="main-section">
            <textarea
              ref={textareaRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={handleKeyDown}
              className="memo-textarea"
              placeholder="Type your todos here..."
            />
            
            {/* Today's Habits Section */}
            {todayHabits.length > 0 && (
              <div className="today-habits-section">
                <h2>Today's Habits</h2>
                <div className="habits-grid">
                  {todayHabits.map(habit => {
                    const completion = getHabitCompletion(habit);
                    const today = moment().format('YYYY-MM-DD');
                    const isCompleted = habit.progress[today];
                    
                    return (
                      <div 
                        key={habit.id}
                        className={`habit-check-card ${isCompleted ? 'completed' : ''}`}
                        onClick={() => handleHabitCheck(habit)}
                      >
                        <div className="habit-check-content">
                          <div className="habit-check-header">
                            <h3>{habit.title}</h3>
                            <div className="habit-check-box">
                              {isCompleted ? '✓' : ''}
                            </div>
                          </div>
                          <p className="habit-goal-title">Goal: {habit.goalTitle}</p>
                          <div className="habit-mini-stats">
                            <span>{completion.completedDays}/{completion.monthlyTarget} times</span>
                            <span>Streak: {habit.currentStreak} days</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="todos-calendar-layout">
              <div className="todos-list-section">
                <div className="todos-list-content">
                  {/* Today's Todos */}
                  {todayTodos.length > 0 && (
                    <div className="today-todos">
                      <h2>Today's Todos ({moment().tz('Asia/Hong_Kong').format('YYYY-MM-DD ddd')})</h2>
                      <div className="added-todos">
                        {todayTodos.map(todo => (
                          <TodoItem
                            key={todo.id}
                            todo={todo}
                            onToggleComplete={handleToggleComplete}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Selected Date Todos */}
                  {selectedDate && !isToday(moment(selectedDate).format('YYYY-MM-DD')) && (
                    <div className="selected-date-todos">
                      <h3>{moment(selectedDate).tz('Asia/Hong_Kong').format('YYYY-MM-DD ddd')}</h3>
                      <div className="added-todos">
                        {monthTodos[moment(selectedDate).format('YYYY-MM')]
                          ?.filter(todo => todo.date === moment(selectedDate).format('YYYY-MM-DD'))
                          .map(todo => (
                            <TodoItem
                              key={todo.id}
                              todo={todo}
                              onToggleComplete={handleToggleComplete}
                            />
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Calendar Section */}
              <div className="calendar-section">
                <Calendar
                  onChange={setSelectedDate}
                  value={selectedDate}
                  tileContent={({ date }) => {
                    const dateStr = moment(date).format('YYYY-MM-DD');
                    const count = getTodoCount(date);
                    return count !== null ? (
                      <div className="calendar-todos">
                        {count > 0 && <div className="todo-count">{count}</div>}
                      </div>
                    ) : (
                      <div className="calendar-todos loading">...</div>
                    );
                  }}
                />
                {isLoadingMonth && (
                  <div className="calendar-loading">달력 데이터 로딩 중...</div>
                )}
              </div>
            </div>
          </div>
        </div>
        <TutoringLog />
      </div>
      <ToastContainer />
    </div>
  );
};

export default AddTodo;