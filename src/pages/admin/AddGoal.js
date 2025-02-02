import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import '../../styles/addGoal.css';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import moment from 'moment-timezone';

const AddGoal = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [habits, setHabits] = useState([]);
  const [activeTab, setActiveTab] = useState('goals'); // 'goals' or 'habits'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    targetDate: '',
    category: 'personal'
  });
  const [newHabit, setNewHabit] = useState({
    title: '',
    description: '',
    goalId: '',
    progress: {},
    currentStreak: 0,
    longestStreak: 0,
    monthlyTarget: ''
  });

  useEffect(() => {
    fetchGoals();
    fetchHabits();
  }, []);

  const fetchGoals = async () => {
    try {
      const goalsQuery = query(
        collection(db, 'goals'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(goalsQuery);
      const goalsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGoals(goalsData);
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  const fetchHabits = async () => {
    try {
      const habitsQuery = query(
        collection(db, 'habits'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(habitsQuery);
      const habitsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHabits(habitsData);
    } catch (error) {
      console.error('Error fetching habits:', error);
    }
  };

  const handleSubmitGoal = async (e) => {
    e.preventDefault();
    if (!newGoal.title.trim()) return;

    try {
      await addDoc(collection(db, 'goals'), {
        ...newGoal,
        completed: false,
        createdAt: serverTimestamp()
      });

      setNewGoal({
        title: '',
        description: '',
        targetDate: '',
        category: 'personal'
      });

      fetchGoals();
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  };

  const handleSubmitHabit = async (e) => {
    e.preventDefault();
    if (!newHabit.title.trim() || !newHabit.goalId) return;

    try {
      const selectedGoal = goals.find(goal => goal.id === newHabit.goalId);
      if (!selectedGoal) return;

      const monthlyTarget = newHabit.monthlyTarget ? parseInt(newHabit.monthlyTarget) : 30;

      await addDoc(collection(db, 'habits'), {
        ...newHabit,
        monthlyTarget,
        goalTitle: selectedGoal.title,
        category: selectedGoal.category,
        startDate: moment().format('YYYY-MM-DD'),
        endDate: selectedGoal.targetDate,
        createdAt: serverTimestamp()
      });

      setNewHabit({
        title: '',
        description: '',
        goalId: '',
        progress: {},
        currentStreak: 0,
        longestStreak: 0,
        monthlyTarget: ''
      });

      fetchHabits();
    } catch (error) {
      console.error('Error adding habit:', error);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    try {
      await deleteDoc(doc(db, 'goals', goalId));
      fetchGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const handleDeleteHabit = async (habitId) => {
    try {
      await deleteDoc(doc(db, 'habits', habitId));
      fetchHabits();
    } catch (error) {
      console.error('Error deleting habit:', error);
    }
  };

  const handleHabitCheck = async (habit, date) => {
    const dateStr = moment(date).format('YYYY-MM-DD');
    const newProgress = { ...habit.progress };
    newProgress[dateStr] = !newProgress[dateStr];

    try {
      const habitRef = doc(db, 'habits', habit.id);
      const updatedStreak = calculateStreak(newProgress);
      
      await updateDoc(habitRef, {
        progress: newProgress,
        currentStreak: updatedStreak.currentStreak,
        longestStreak: Math.max(updatedStreak.currentStreak, habit.longestStreak || 0)
      });

      fetchHabits();
    } catch (error) {
      console.error('Error updating habit progress:', error);
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
    const totalDays = moment(habit.endDate).diff(moment(habit.startDate), 'days') + 1;
    const completedDays = Object.values(habit.progress || {}).filter(Boolean).length;
    const monthlyTarget = habit.monthlyTarget || 30;
    return {
      percentage: Math.round((completedDays / monthlyTarget) * 100),
      completedDays,
      monthlyTarget
    };
  };

  const categoryColors = {
    personal: '#FF6B6B',
    career: '#4ECDC4',
    health: '#45B7D1',
    financial: '#96CEB4',
    education: '#FFEEAD'
  };

  return (
    <div className="goals-container">
      <div className="goals-header">
        <h1>Goals & Habits</h1>
        <div className="tab-buttons">
          <button 
            className={`tab-btn ${activeTab === 'goals' ? 'active' : ''}`}
            onClick={() => setActiveTab('goals')}
          >
            Goals
          </button>
          <button 
            className={`tab-btn ${activeTab === 'habits' ? 'active' : ''}`}
            onClick={() => setActiveTab('habits')}
          >
            Habits
          </button>
        </div>
        <button onClick={() => navigate('/admin')} className="back-btn">
          Back to Admin
        </button>
      </div>

      {activeTab === 'goals' ? (
        <>
          <form onSubmit={handleSubmitGoal} className="goal-form">
            <div className="form-group">
              <input
                type="text"
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                placeholder="Enter your goal"
                className="goal-input"
              />
            </div>

            <div className="form-group">
              <textarea
                value={newGoal.description}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                placeholder="Description (optional)"
                className="goal-description"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <select
                  value={newGoal.category}
                  onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
                  className="goal-category"
                >
                  <option value="personal">Personal</option>
                  <option value="career">Career</option>
                  <option value="health">Health</option>
                  <option value="financial">Financial</option>
                  <option value="education">Education</option>
                </select>
              </div>

              <div className="form-group">
                <input
                  type="date"
                  value={newGoal.targetDate}
                  onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                  className="goal-date"
                />
              </div>

              <button type="submit" className="add-goal-btn">
                Add Goal
              </button>
            </div>
          </form>

          <div className="goals-list">
            {goals.map((goal) => (
              <div 
                key={goal.id} 
                className="goal-card"
                style={{ borderLeft: `4px solid ${categoryColors[goal.category]}` }}
              >
                <div className="goal-card-header">
                  <h3>{goal.title}</h3>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="delete-goal-btn"
                  >
                    ×
                  </button>
                </div>
                {goal.description && (
                  <p className="goal-description-text">{goal.description}</p>
                )}
                <div className="goal-card-footer">
                  <span className="goal-category-tag" style={{ backgroundColor: categoryColors[goal.category] }}>
                    {goal.category}
                  </span>
                  {goal.targetDate && (
                    <span className="goal-date-tag">
                      Target: {new Date(goal.targetDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <form onSubmit={handleSubmitHabit} className="habit-form">
            <div className="form-group">
              <input
                type="text"
                value={newHabit.title}
                onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })}
                placeholder="Enter your habit"
                className="habit-input"
              />
            </div>

            <div className="form-group">
              <textarea
                value={newHabit.description}
                onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
                placeholder="Description (optional)"
                className="habit-description"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <select
                  value={newHabit.goalId}
                  onChange={(e) => setNewHabit({ ...newHabit, goalId: e.target.value })}
                  className="habit-goal-select"
                >
                  <option value="">Select a goal</option>
                  {goals.map(goal => (
                    <option key={goal.id} value={goal.id}>
                      {goal.title} ({goal.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={newHabit.monthlyTarget}
                  onChange={(e) => setNewHabit({ ...newHabit, monthlyTarget: e.target.value })}
                  placeholder="Monthly target (default: 30)"
                  className="habit-target-input"
                />
              </div>

              <button type="submit" className="add-habit-btn">
                Add Habit
              </button>
            </div>
          </form>

          <div className="habits-calendar-layout">
            <div className="habits-list">
              {habits.map((habit) => {
                const completion = getHabitCompletion(habit);
                return (
                  <div 
                    key={habit.id} 
                    className="habit-card"
                    style={{ borderLeft: `4px solid ${categoryColors[habit.category]}` }}
                  >
                    <div className="habit-card-header">
                      <div className="habit-header-content">
                        <h3>{habit.title}</h3>
                        <p className="habit-goal-link">Goal: {habit.goalTitle}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteHabit(habit.id)}
                        className="delete-habit-btn"
                      >
                        ×
                      </button>
                    </div>
                    {habit.description && (
                      <p className="habit-description-text">{habit.description}</p>
                    )}
                    <div className="habit-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${completion.percentage}%` }}
                        />
                      </div>
                      <div className="progress-stats">
                        <span>{completion.completedDays}/{completion.monthlyTarget} times</span>
                        <span>{completion.percentage}% complete</span>
                      </div>
                    </div>
                    <div className="streak-info">
                      <span>Current Streak: {habit.currentStreak} days</span>
                      <span>Longest Streak: {habit.longestStreak} days</span>
                    </div>
                    <div className="habit-card-footer">
                      <span className="habit-category-tag" style={{ backgroundColor: categoryColors[habit.category] }}>
                        {habit.category}
                      </span>
                      <span className="habit-date-tag">
                        Target: {habit.monthlyTarget || 30} times/month
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="calendar-section">
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                tileContent={({ date }) => {
                  const dateStr = moment(date).format('YYYY-MM-DD');
                  return habits.map(habit => {
                    if (moment(date).isBetween(habit.startDate, habit.endDate, 'day', '[]')) {
                      return (
                        <div 
                          key={habit.id}
                          className={`habit-marker ${habit.progress[dateStr] ? 'completed' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHabitCheck(habit, date);
                          }}
                        />
                      );
                    }
                    return null;
                  });
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AddGoal; 