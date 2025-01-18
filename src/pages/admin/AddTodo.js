import React, { useState, useRef, useEffect } from 'react';
import { db } from '../../firebase/config';
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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    fetchTodos();
  }, []);

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

  const formatTodoDisplay = (todo) => {
    let display = todo.task;
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
          // If it's a date in YYYY-MM-DD format, use it as is
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
        const docRef = await addDoc(collection(db, 'todos'), {
          ...todo,
          task: taskText || lastLine,
          createdAt: serverTimestamp(),
          completed: false
        });

        // Add the new todo to the list
        const newTodo = {
          id: docRef.id,
          ...todo,
          task: taskText || lastLine,
          completed: false
        };
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
        </div>
        <div className="memo-command-examples">
          <p onClick={() => setIsExampleVisible(!isExampleVisible)} className="examples-toggle">
            Examples {isExampleVisible ? '▼' : '▶'}
          </p>
          <div className={`examples-content ${isExampleVisible ? 'visible' : ''}`}>
            <p>/d td (today), tmr (tomorrow), nw (next week)</p>
            <p>/t 9-10:30 (time range)</p>
            <p>/l location</p>
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
            <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => handleToggleComplete(todo.id, todo.completed)}
                className="todo-checkbox"
              />
              <span className="todo-text">{formatTodoDisplay(todo)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AddTodo; 