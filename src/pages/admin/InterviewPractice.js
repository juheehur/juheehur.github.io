import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { techQuestionsDb, COLLECTIONS, PREDEFINED_CATEGORIES, DIFFICULTY_LEVELS, QUESTION_TYPES } from '../../firebase/config';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import './InterviewPractice.css';

const InterviewPractice = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: 'all',
    difficulty: 'all',
    type: 'all',
    language: 'all'
  });
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [comfortableQuestions, setComfortableQuestions] = useState(() => {
    const saved = localStorage.getItem('comfortableQuestions');
    return saved ? JSON.parse(saved) : [];
  });
  const [randomQuestion, setRandomQuestion] = useState(null);
  const [showRandomAnswer, setShowRandomAnswer] = useState(false);
  const [randomCategory, setRandomCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showModalAnswer, setShowModalAnswer] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, [filters]);

  useEffect(() => {
    localStorage.setItem('comfortableQuestions', JSON.stringify(comfortableQuestions));
  }, [comfortableQuestions]);

  useEffect(() => {
    if (questions.length > 0) {
      const filteredQuestions = questions.filter(q => 
        randomCategory === 'all' || q.category_id === randomCategory
      );
      if (filteredQuestions.length > 0) {
        const randomIndex = Math.floor(Math.random() * filteredQuestions.length);
        setRandomQuestion(filteredQuestions[randomIndex]);
        setShowRandomAnswer(false);
      }
    }
  }, [questions, randomCategory]);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      let q = collection(techQuestionsDb, COLLECTIONS.QUESTIONS);
      const queryConstraints = [];

      if (filters.category !== 'all') {
        queryConstraints.push(where('category_id', '==', filters.category));
      }
      if (filters.difficulty !== 'all') {
        queryConstraints.push(where('difficulty', '==', filters.difficulty));
      }
      if (filters.type !== 'all') {
        queryConstraints.push(where('type', '==', filters.type));
      }
      if (filters.language !== 'all') {
        queryConstraints.push(where('language', '==', filters.language));
      }

      queryConstraints.push(orderBy('createdAt', 'desc'));
      
      q = query(q, ...queryConstraints);
      const questionsSnapshot = await getDocs(q);
      
      const questionsData = [];
      for (const doc of questionsSnapshot.docs) {
        const questionData = { id: doc.id, ...doc.data() };
        
        // Fetch answer for this question
        const answerQuery = query(
          collection(techQuestionsDb, COLLECTIONS.ANSWERS),
          where('question_id', '==', doc.id)
        );
        const answerSnapshot = await getDocs(answerQuery);
        if (!answerSnapshot.empty) {
          questionData.answer = answerSnapshot.docs[0].data();
        }
        
        questionsData.push(questionData);
      }
      
      setQuestions(questionsData);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setSelectedQuestion(null);
    setShowAnswer(false);
  };

  const handleQuestionClick = (question) => {
    setSelectedQuestion(question);
    setShowModalAnswer(false);
    setIsModalOpen(true);
  };

  const handleComfortableToggle = (questionId, event) => {
    event.stopPropagation();
    setComfortableQuestions(prev => {
      if (prev.includes(questionId)) {
        return prev.filter(id => id !== questionId);
      } else {
        return [...prev, questionId];
      }
    });
  };

  const handleCategoryChange = (e) => {
    setRandomCategory(e.target.value);
    // 카테고리 변경 시 자동으로 랜덤 질문 생성
    const newCategory = e.target.value;
    const filteredQuestions = questions.filter(q => 
      newCategory === 'all' || q.category_id === newCategory
    );
    if (filteredQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * filteredQuestions.length);
      setRandomQuestion(filteredQuestions[randomIndex]);
      setShowRandomAnswer(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setShowModalAnswer(false);
  };

  return (
    <div className="interview-practice">
      <div className="container">
        {/* Header */}
        <div className="header">
          <div className="header-content">
            <div>
              <h1>Interview Practice</h1>
              <p>기술 면접 질문을 연습하고 학습하세요</p>
            </div>
            <button 
              onClick={() => navigate('/admin/tech-interview')} 
              className="back-button"
            >
              <span>←</span>
              <span>Tech Interview</span>
            </button>
          </div>
        </div>

        {/* Random Question Generator */}
        <div className="random-question-section">
          <div className="random-controls">
            <div className="random-category-select">
              <select
                value={randomCategory}
                onChange={handleCategoryChange}
                className="random-category-dropdown"
              >
                <option value="all">모든 카테고리</option>
                {PREDEFINED_CATEGORIES.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
          </div>

          {randomQuestion && (
            <div className="random-card">
              <div className="random-card-inner">
                <div className="random-question">
                  <h3>
                    Random Question
                    <button 
                      onClick={() => setShowRandomAnswer(!showRandomAnswer)}
                      className="refresh-button"
                      aria-label="Get new random question"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                      </svg>
                    </button>
                  </h3>
                  <p>{randomQuestion.question}</p>
                  <div className="random-meta">
                    <span className={`random-difficulty ${randomQuestion.difficulty.toLowerCase()}`}>
                      {randomQuestion.difficulty}
                    </span>
                    <span className="random-category">
                      {PREDEFINED_CATEGORIES.find(c => c.id === randomQuestion.category_id)?.name}
                    </span>
                  </div>
                </div>
                <div className="random-answer-section">
                  <button
                    className="toggle-random-answer"
                    onClick={() => setShowRandomAnswer(!showRandomAnswer)}
                  >
                    {showRandomAnswer ? '답변 숨기기' : '답변 보기'}
                  </button>
                  {showRandomAnswer && randomQuestion.answer && (
                    <div className="random-answer">
                      <p>{randomQuestion.answer.answer}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <label>카테고리</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="all">전체</option>
              {PREDEFINED_CATEGORIES.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>난이도</label>
            <select
              value={filters.difficulty}
              onChange={(e) => handleFilterChange('difficulty', e.target.value)}
            >
              <option value="all">전체</option>
              {DIFFICULTY_LEVELS.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>유형</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="all">전체</option>
              {QUESTION_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>언어</label>
            <select
              value={filters.language}
              onChange={(e) => handleFilterChange('language', e.target.value)}
            >
              <option value="all">전체</option>
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        {/* Main Content */}
        <div className="practice-content">
          {/* Questions List */}
          <div className="questions-panel">
            <h2>질문 목록</h2>
            {isLoading ? (
              <div className="loading">Loading...</div>
            ) : (
              <div className="questions-list">
                {questions.map((question) => (
                  <div
                    key={question.id}
                    className={`question-item ${selectedQuestion?.id === question.id ? 'selected' : ''}`}
                    onClick={() => handleQuestionClick(question)}
                  >
                    <div className="question-header">
                      <span className={`question-difficulty ${question.difficulty.toLowerCase()}`}>
                        {question.difficulty}
                      </span>
                      <span className="question-category">
                        {PREDEFINED_CATEGORIES.find(c => c.id === question.category_id)?.name}
                      </span>
                    </div>
                    <div className="question-text">{question.question}</div>
                    <input
                      type="checkbox"
                      className="comfort-checkbox"
                      checked={comfortableQuestions.includes(question.id)}
                      onChange={(e) => handleComfortableToggle(question.id, e)}
                      aria-label="Mark as comfortable"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Question Modal */}
          {isModalOpen && selectedQuestion && (
            <div className="modal-overlay" onClick={closeModal}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title">
                    <h3>Question</h3>
                    <div className="modal-badges">
                      <span className={`modal-badge difficulty ${selectedQuestion.difficulty.toLowerCase()}`}>
                        {selectedQuestion.difficulty}
                      </span>
                      <span className="modal-badge">
                        {PREDEFINED_CATEGORIES.find(c => c.id === selectedQuestion.category_id)?.name}
                      </span>
                      <span className="modal-badge">{selectedQuestion.type}</span>
                    </div>
                  </div>
                  <div className="modal-comfort">
                    <input
                      type="checkbox"
                      className="modal-comfort-checkbox"
                      checked={comfortableQuestions.includes(selectedQuestion.id)}
                      onChange={(e) => handleComfortableToggle(selectedQuestion.id, e)}
                      aria-label="Mark as comfortable"
                    />
                    <span className="modal-comfort-label">학습완료</span>
                  </div>
                  <button className="modal-close" onClick={closeModal}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="modal-question">
                    {selectedQuestion.question}
                  </div>
                  <div className="modal-answer-section">
                    <button
                      className={`modal-answer-toggle ${showModalAnswer ? 'show' : ''}`}
                      onClick={() => setShowModalAnswer(!showModalAnswer)}
                    >
                      {showModalAnswer ? '답변 숨기기' : '답변 보기'}
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                    {showModalAnswer && selectedQuestion.answer && (
                      <div className="modal-answer">
                        <div className="modal-answer-text">
                          {selectedQuestion.answer.answer}
                        </div>
                        {selectedQuestion.answer.references && (
                          <div className="modal-references">
                            <h4>참고 자료</h4>
                            <div className="modal-references-text">
                              {selectedQuestion.answer.references}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Original Question Detail (visible only on desktop) */}
          {selectedQuestion && (
            <div className="question-detail">
              <div className="question-content">
                <h3>Question</h3>
                <div className="question-text">{selectedQuestion.question}</div>
                <div className="question-meta">
                  <span className={`difficulty ${selectedQuestion.difficulty.toLowerCase()}`}>
                    {selectedQuestion.difficulty}
                  </span>
                  <span className="category">
                    {PREDEFINED_CATEGORIES.find(c => c.id === selectedQuestion.category_id)?.name}
                  </span>
                  <span className="type">{selectedQuestion.type}</span>
                </div>
              </div>

              <div className="answer-section">
                <button
                  className="toggle-answer"
                  onClick={() => setShowAnswer(!showAnswer)}
                >
                  {showAnswer ? '답변 숨기기' : '답변 보기'}
                </button>

                {showAnswer && selectedQuestion.answer && (
                  <div className="answer-content">
                    <h3>Answer</h3>
                    <div className="answer-text">
                      {selectedQuestion.answer.answer}
                    </div>
                    {selectedQuestion.answer.references && (
                      <div className="references">
                        <h4>참고 자료</h4>
                        <div className="references-text">
                          {selectedQuestion.answer.references}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewPractice; 