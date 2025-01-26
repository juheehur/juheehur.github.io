import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, deleteDoc, doc, updateDoc, query, orderBy, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import '../../styles/todoManagement.css';

const TodoManagement = () => {
  const [todos, setTodos] = useState([]);
  const [editingTodo, setEditingTodo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      // Get all date collections
      const dateCollectionsSnapshot = await getDocs(collection(db, 'todos'));
      const allTodos = [];

      // For each date, get its todos
      for (const dateDoc of dateCollectionsSnapshot.docs) {
        const todosQuery = query(
          collection(db, `todos/${dateDoc.id}/todos`),
          orderBy('createdAt', 'desc')
        );
        const todosSnapshot = await getDocs(todosQuery);
        const dateTodos = todosSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            date: dateDoc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date()
          };
        });
        allTodos.push(...dateTodos);
      }

      // Sort by date and time
      allTodos.sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        if (a.startTime && b.startTime) {
          return a.startTime.localeCompare(b.startTime);
        }
        return b.createdAt - a.createdAt;
      });

      console.log('Fetched todos:', allTodos); // 디버깅용
      setTodos(allTodos);
    } catch (error) {
      console.error('Error fetching todos:', error);
    }
  };

  const handleDelete = async (todo) => {
    if (window.confirm('정말로 이 할 일을 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, `todos/${todo.date}/todos/${todo.id}`));
        setTodos(prev => prev.filter(t => !(t.id === todo.id && t.date === todo.date)));
      } catch (error) {
        console.error('Error deleting todo:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleEdit = (todo) => {
    setEditingTodo({ 
      ...todo,
      originalDate: todo.date // Store original date to check if it changed
    });
  };

  const handleSave = async () => {
    if (!editingTodo) return;

    try {
      // If date has changed, we need to move the todo to a new collection
      if (editingTodo.date !== editingTodo.originalDate) {
        // Delete from old location
        await deleteDoc(doc(db, `todos/${editingTodo.originalDate}/todos/${editingTodo.id}`));
        
        // Create in new location
        const newTodoRef = doc(collection(db, `todos/${editingTodo.date}/todos`));
        const updatedTodo = {
          task: editingTodo.task,
          startTime: editingTodo.startTime || '',
          endTime: editingTodo.endTime || '',
          location: editingTodo.location || '',
          notification: editingTodo.notification || false,
          notificationTime: editingTodo.notificationTime || '',
          createdAt: editingTodo.createdAt,
          completed: editingTodo.completed || false
        };

        await setDoc(newTodoRef, updatedTodo);
        
        setTodos(prev => prev.filter(todo => !(todo.id === editingTodo.id && todo.date === editingTodo.originalDate))
          .concat({...updatedTodo, id: newTodoRef.id, date: editingTodo.date}));
      } else {
        // Update in the same location
        const todoRef = doc(db, `todos/${editingTodo.date}/todos/${editingTodo.id}`);
        const updatedTodo = {
          task: editingTodo.task,
          startTime: editingTodo.startTime || '',
          endTime: editingTodo.endTime || '',
          location: editingTodo.location || '',
          notification: editingTodo.notification || false,
          notificationTime: editingTodo.notificationTime || '',
          completed: editingTodo.completed || false
        };

        await updateDoc(todoRef, updatedTodo);

        setTodos(prev => prev.map(todo => 
          todo.id === editingTodo.id && todo.date === editingTodo.date
            ? { ...todo, ...updatedTodo, date: editingTodo.date }
            : todo
        ));
      }
      
      setEditingTodo(null);
    } catch (error) {
      console.error('Error updating todo:', error);
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Convert dates to YYYY-MM-DD format for comparison
    const dateStrFormat = dateStr;
    const todayStrFormat = today.toISOString().split('T')[0];
    const tomorrowStrFormat = tomorrow.toISOString().split('T')[0];
    const nextWeekStrFormat = nextWeek.toISOString().split('T')[0];

    if (dateStrFormat === todayStrFormat) {
      return '오늘';
    } else if (dateStrFormat === tomorrowStrFormat) {
      return '내일';
    } else if (dateStrFormat === nextWeekStrFormat) {
      return '다음 주';
    } else {
      return date.toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
      });
    }
  };

  // Group todos by date
  const todosByDate = todos.reduce((acc, todo) => {
    const dateStr = todo.date;
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(todo);
    return acc;
  }, {});

  // Sort dates in descending order
  const sortedDates = Object.keys(todosByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="todo-management">
      <div className="todo-management-header">
        <h1>Todo 관리</h1>
        <button onClick={() => navigate('/admin/add-todo')} className="back-button">
          Quick Todo로 돌아가기
        </button>
      </div>
      
      <div className="todos-list">
        {sortedDates.length === 0 ? (
          <div className="no-todos">할 일이 없습니다.</div>
        ) : (
          sortedDates.map(date => {
            const dateTodos = todosByDate[date].sort((a, b) => {
              if (a.startTime && b.startTime) {
                return a.startTime.localeCompare(b.startTime);
              }
              return b.createdAt - a.createdAt;
            });

            return (
              <div key={date} className="date-group">
                <h2 className="date-header">{formatDate(date)}</h2>
                {dateTodos.map(todo => (
                  <div key={`${todo.date}-${todo.id}`} className="todo-item">
                    {editingTodo?.id === todo.id ? (
                      <div className="todo-edit-form">
                        <input
                          type="text"
                          value={editingTodo.task}
                          onChange={e => setEditingTodo({...editingTodo, task: e.target.value})}
                          placeholder="할 일"
                        />
                        <input
                          type="date"
                          value={editingTodo.date}
                          onChange={e => setEditingTodo({...editingTodo, date: e.target.value})}
                        />
                        <input
                          type="time"
                          value={editingTodo.startTime || ''}
                          onChange={e => setEditingTodo({...editingTodo, startTime: e.target.value})}
                        />
                        <input
                          type="time"
                          value={editingTodo.endTime || ''}
                          onChange={e => setEditingTodo({...editingTodo, endTime: e.target.value})}
                        />
                        <input
                          type="text"
                          value={editingTodo.location || ''}
                          onChange={e => setEditingTodo({...editingTodo, location: e.target.value})}
                          placeholder="위치"
                        />
                        <div className="notification-settings">
                          <label>
                            <input
                              type="checkbox"
                              checked={editingTodo.notification || false}
                              onChange={e => setEditingTodo({...editingTodo, notification: e.target.checked})}
                            />
                            알림 설정
                          </label>
                          {editingTodo.notification && (
                            <input
                              type="time"
                              value={editingTodo.notificationTime || ''}
                              onChange={e => setEditingTodo({...editingTodo, notificationTime: e.target.value})}
                            />
                          )}
                        </div>
                        <div className="edit-actions">
                          <button onClick={handleSave} className="save-btn">저장</button>
                          <button onClick={() => setEditingTodo(null)} className="cancel-btn">취소</button>
                        </div>
                      </div>
                    ) : (
                      <div className="todo-content">
                        <div className="todo-info">
                          <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={async () => {
                              const todoRef = doc(db, `todos/${todo.date}/todos/${todo.id}`);
                              await updateDoc(todoRef, { completed: !todo.completed });
                              setTodos(prev => prev.map(t => 
                                t.id === todo.id && t.date === todo.date
                                  ? {...t, completed: !t.completed}
                                  : t
                              ));
                            }}
                          />
                          <span className={`todo-task ${todo.completed ? 'completed' : ''}`}>
                            {todo.task}
                          </span>
                        </div>
                        <div className="todo-details">
                          {todo.startTime && (
                            <span className="time">
                              {todo.startTime}{todo.endTime && ` - ${todo.endTime}`}
                            </span>
                          )}
                          {todo.location && (
                            <span className="location">@ {todo.location}</span>
                          )}
                          {todo.notification && (
                            <span className="notification">
                              🔔 {todo.notificationTime}
                            </span>
                          )}
                        </div>
                        <div className="todo-actions">
                          <button onClick={() => handleEdit(todo)} className="edit-btn">수정</button>
                          <button onClick={() => handleDelete(todo)} className="delete-btn">삭제</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TodoManagement; 