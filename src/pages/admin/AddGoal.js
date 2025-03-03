import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy, updateDoc, increment } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import '../../styles/addGoal.css';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import moment from 'moment-timezone';
import styles from '../../styles/AddGoal.module.css';

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
  const [showArchived, setShowArchived] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(moment().format('YYYY-MM'));

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
        postponedCount: 0,
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

  const filterGoals = () => {
    const today = moment().startOf('day');
    const selectedMonthStart = moment(selectedMonth).startOf('month');
    const selectedMonthEnd = moment(selectedMonth).endOf('month');

    return goals.reduce((acc, goal) => {
      const targetDate = moment(goal.targetDate);
      const createdAt = goal.createdAt ? moment(goal.createdAt.toDate()) : moment();
      
      if (createdAt.isBetween(selectedMonthStart, selectedMonthEnd, 'month', '[]')) {
        if (targetDate.isBefore(today)) {
          acc.archived.push(goal);
        } else {
          acc.active.push(goal);
        }
      }
      return acc;
    }, { active: [], archived: [] });
  };

  const filterHabits = () => {
    const today = moment().startOf('day');
    const selectedMonthStart = moment(selectedMonth).startOf('month');
    const selectedMonthEnd = moment(selectedMonth).endOf('month');

    return habits.reduce((acc, habit) => {
      const endDate = moment(habit.endDate);
      const createdAt = habit.createdAt ? moment(habit.createdAt.toDate()) : moment();
      
      if (createdAt.isBetween(selectedMonthStart, selectedMonthEnd, 'month', '[]')) {
        if (endDate.isBefore(today)) {
          acc.archived.push(habit);
        } else {
          acc.active.push(habit);
        }
      }
      return acc;
    }, { active: [], archived: [] });
  };

  const handleToggleGoalComplete = async (goalId, currentStatus) => {
    try {
      const goalRef = doc(db, 'goals', goalId);
      await updateDoc(goalRef, {
        completed: !currentStatus
      });
      fetchGoals();
    } catch (error) {
      console.error('Error updating goal status:', error);
    }
  };

  const handleToggleHabitComplete = async (habitId, currentStatus) => {
    try {
      const habitRef = doc(db, 'habits', habitId);
      await updateDoc(habitRef, {
        completed: !currentStatus
      });
      fetchHabits();
    } catch (error) {
      console.error('Error updating habit status:', error);
    }
  };

  const handlePostponeGoal = async (goalId, currentTargetDate) => {
    try {
      const goalRef = doc(db, 'goals', goalId);
      const nextMonth = moment(currentTargetDate).add(1, 'month').format('YYYY-MM-DD');
      
      await updateDoc(goalRef, {
        targetDate: nextMonth,
        postponedCount: increment(1),
        completed: false
      });
      
      fetchGoals();
    } catch (error) {
      console.error('Error postponing goal:', error);
    }
  };

  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value);
  };

  const getMonthlyStats = () => {
    const selectedMonthStart = moment(selectedMonth).startOf('month');
    const selectedMonthEnd = moment(selectedMonth).endOf('month');
    
    const monthlyGoals = goals.filter(goal => {
      const createdAt = goal.createdAt ? moment(goal.createdAt.toDate()) : moment();
      return createdAt.isBetween(selectedMonthStart, selectedMonthEnd, 'month', '[]');
    });

    const monthlyHabits = habits.filter(habit => {
      const createdAt = habit.createdAt ? moment(habit.createdAt.toDate()) : moment();
      return createdAt.isBetween(selectedMonthStart, selectedMonthEnd, 'month', '[]');
    });

    const activeCategories = [...new Set([
      ...monthlyGoals.map(goal => goal.category),
      ...monthlyHabits.map(habit => habit.category)
    ])];

    return {
      goals: {
        total: monthlyGoals.length,
        completed: monthlyGoals.filter(g => g.completed).length,
        categories: monthlyGoals.reduce((acc, goal) => {
          acc[goal.category] = acc[goal.category] || { total: 0, completed: 0 };
          acc[goal.category].total += 1;
          if (goal.completed) acc[goal.category].completed += 1;
          return acc;
        }, {})
      },
      habits: {
        total: monthlyHabits.length,
        completed: monthlyHabits.filter(h => h.completed).length,
        categories: monthlyHabits.reduce((acc, habit) => {
          acc[habit.category] = acc[habit.category] || { total: 0, completed: 0 };
          acc[habit.category].total += 1;
          if (habit.completed) acc[habit.category].completed += 1;
          return acc;
        }, {})
      },
      activeCategories
    };
  };

  const getCurrentMonthGoals = () => {
    const currentMonthStart = moment().startOf('month');
    const currentMonthEnd = moment().endOf('month');

    return goals.filter(goal => {
      const targetDate = moment(goal.targetDate);
      return targetDate.isBetween(currentMonthStart, currentMonthEnd, 'month', '[]') && !goal.completed;
    });
  };

  return (
    <div className="goals-container">
      <div className="goals-header">
        <h1>Goals & Habits</h1>
        <div className={styles.tabButtons}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'goals' ? styles.active : ''}`}
            onClick={() => setActiveTab('goals')}
          >
            Goals
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'habits' ? styles.active : ''}`}
            onClick={() => setActiveTab('habits')}
          >
            Habits
          </button>
          <button 
            className={`${styles.tabBtn} ${showArchived ? styles.active : ''}`}
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? 'Show Active' : 'Show Archived'}
          </button>
        </div>
        <button onClick={() => window.location.href = 'http://localhost:3002/#/'} className="back-btn">
          Back to Home
        </button>
      </div>

      <div className={styles.monthSelector}>
        <input
          type="month"
          value={selectedMonth}
          onChange={handleMonthChange}
          className={styles.monthInput}
        />
        <span className={styles.monthStats}>
          Goals: {filterGoals().active.length + filterGoals().archived.length} | 
          Habits: {filterHabits().active.length + filterHabits().archived.length}
        </span>
      </div>

      <div className={styles.monthlyStatsContainer}>
        <div className={styles.statsSection}>
          <h3>Monthly Achievement</h3>
          {getMonthlyStats().activeCategories.map(category => {
            const stats = getMonthlyStats();
            const goalStats = stats.goals.categories[category] || { total: 0, completed: 0 };
            const habitStats = stats.habits.categories[category] || { total: 0, completed: 0 };
            
            if (goalStats.total > 0 || habitStats.total > 0) {
              return (
                <div key={category} className={styles.categoryStats}>
                  <div className={styles.categoryHeader}>
                    <span className={styles.categoryDot} style={{ backgroundColor: categoryColors[category] }} />
                    <span className={styles.categoryName}>{category}</span>
                  </div>
                  <div className={styles.statsGrid}>
                    {goalStats.total > 0 && (
                      <div className={styles.statBox}>
                        <span className={styles.statLabel}>Goals</span>
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progressFill}
                            style={{ 
                              width: `${goalStats.total ? (goalStats.completed / goalStats.total) * 100 : 0}%`,
                              backgroundColor: categoryColors[category] 
                            }}
                          />
                        </div>
                        <span className={styles.statText}>
                          {goalStats.completed}/{goalStats.total}
                        </span>
                      </div>
                    )}
                    {habitStats.total > 0 && (
                      <div className={styles.statBox}>
                        <span className={styles.statLabel}>Habits</span>
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progressFill}
                            style={{ 
                              width: `${habitStats.total ? (habitStats.completed / habitStats.total) * 100 : 0}%`,
                              backgroundColor: categoryColors[category] 
                            }}
                          />
                        </div>
                        <span className={styles.statText}>
                          {habitStats.completed}/{habitStats.total}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>

      {activeTab === 'goals' ? (
        <>
          {!showArchived && <form onSubmit={handleSubmitGoal} className="goal-form">
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
          </form>}

          <div className="goals-list">
            {(showArchived ? filterGoals().archived : filterGoals().active).map((goal) => (
              <div 
                key={goal.id} 
                className={`goal-card ${goal.completed ? styles.completedCard : ''}`}
                style={{ borderLeft: `4px solid ${categoryColors[goal.category]}` }}
              >
                <div className="goal-card-header">
                  <div className={styles.goalTitle}>
                    <input
                      type="checkbox"
                      checked={goal.completed || false}
                      onChange={() => handleToggleGoalComplete(goal.id, goal.completed)}
                      className={styles.checkbox}
                    />
                    <h3 className={goal.completed ? styles.completedText : ''}>{goal.title}</h3>
                  </div>
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
                  <div className={styles.goalFooterLeft}>
                    <span className="goal-category-tag" style={{ backgroundColor: categoryColors[goal.category] }}>
                      {goal.category}
                    </span>
                    {goal.postponedCount > 0 && (
                      <span className={styles.postponeCount}>
                        Postponed: {goal.postponedCount}
                      </span>
                    )}
                  </div>
                  <div className={styles.goalFooterRight}>
                    {!goal.completed && (
                      <button 
                        onClick={() => handlePostponeGoal(goal.id, goal.targetDate)}
                        className={styles.postponeButton}
                      >
                        Postpone
                      </button>
                    )}
                    <span className="goal-date-tag">
                      Target: {new Date(goal.targetDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {!showArchived && <form onSubmit={handleSubmitHabit} className="habit-form">
            <div className={styles.habitFormGrid}>
              <div className={styles.habitFormLeft}>
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
              </div>

              <div className={styles.habitFormRight}>
                <div className={styles.habitFormControls}>
                  <div className={styles.selectWrapper}>
                    <label>Link to Goal</label>
                    <select
                      value={newHabit.goalId}
                      onChange={(e) => setNewHabit({ ...newHabit, goalId: e.target.value })}
                      className={styles.habitGoalSelect}
                    >
                      <option value="">Select a goal</option>
                      {getCurrentMonthGoals().map(goal => (
                        <option key={goal.id} value={goal.id}>
                          {goal.title} ({goal.category})
                        </option>
                      ))}
                    </select>
                    {getCurrentMonthGoals().length === 0 && (
                      <span className={styles.noGoalsHint}>
                        No active goals for this month. Please add a goal first.
                      </span>
                    )}
                  </div>

                  <div className={styles.targetWrapper}>
                    <label>Monthly Target</label>
                    <div className={styles.targetInputGroup}>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={newHabit.monthlyTarget}
                        onChange={(e) => setNewHabit({ ...newHabit, monthlyTarget: e.target.value })}
                        className={styles.habitTargetInput}
                      />
                      <span className={styles.targetUnit}>days</span>
                    </div>
                    <span className={styles.targetHint}>Default: 30 days</span>
                  </div>

                  <button type="submit" className={styles.addHabitBtn}>
                    Add Habit
                  </button>
                </div>
              </div>
            </div>
          </form>}

          <div className="habits-calendar-layout">
            <div className="habits-list">
              {(showArchived ? filterHabits().archived : filterHabits().active).map((habit) => {
                const completion = getHabitCompletion(habit);
                return (
                  <div 
                    key={habit.id} 
                    className={`habit-card ${habit.completed ? styles.completedCard : ''}`}
                    style={{ borderLeft: `4px solid ${categoryColors[habit.category]}` }}
                  >
                    <div className="habit-card-header">
                      <div className={styles.habitTitle}>
                        <input
                          type="checkbox"
                          checked={habit.completed || false}
                          onChange={() => handleToggleHabitComplete(habit.id, habit.completed)}
                          className={styles.checkbox}
                        />
                        <div className="habit-header-content">
                          <h3 className={habit.completed ? styles.completedText : ''}>{habit.title}</h3>
                          <p className="habit-goal-link">Goal: {habit.goalTitle}</p>
                        </div>
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

            {!showArchived && <div className="calendar-section">
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
            </div>}
          </div>
        </>
      )}
    </div>
  );
};

export default AddGoal; 