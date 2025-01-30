import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import '../../styles/addGoal.css';

const AddGoal = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    targetDate: '',
    category: 'personal' // default category
  });

  useEffect(() => {
    fetchGoals();
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

  const handleSubmit = async (e) => {
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

  const handleDelete = async (goalId) => {
    try {
      await deleteDoc(doc(db, 'goals', goalId));
      fetchGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
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
        <h1>Monthly Goals</h1>
        <button onClick={() => navigate('/admin')} className="back-btn">
          Back to Admin
        </button>
      </div>

      <form onSubmit={handleSubmit} className="goal-form">
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
                onClick={() => handleDelete(goal.id)}
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
    </div>
  );
};

export default AddGoal; 