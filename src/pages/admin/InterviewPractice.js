import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { techQuestionsDb, COLLECTIONS, PREDEFINED_CATEGORIES, DIFFICULTY_LEVELS, QUESTION_TYPES } from '../../firebase/config';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import '../../styles/interviewPractice.css';

const CACHE_EXPIRATION_TIME = 60 * 60 * 1000; // 1시간 (밀리초)
const CACHE_KEY = 'interviewQuestions';
const LAST_UPDATE_KEY = 'lastQuestionUpdate';

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
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showOnlyUnlearned, setShowOnlyUnlearned] = useState(false);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

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

  // 캐시된 데이터 체크 함수
  const checkCachedData = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const lastUpdateTime = localStorage.getItem(LAST_UPDATE_KEY);
      
      if (!cached) return null;

      const parsedData = JSON.parse(cached);
      
      // 데이터가 배열인지 확인
      if (!Array.isArray(parsedData)) {
        console.error('Cached data is not an array, clearing cache');
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      setLastUpdate(lastUpdateTime ? new Date(parseInt(lastUpdateTime)) : null);
      return parsedData;
    } catch (error) {
      console.error('Error parsing cached data:', error);
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  };

  // 데이터를 캐시에 저장하는 함수
  const cacheData = (data) => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    const now = new Date().getTime();
    localStorage.setItem(LAST_UPDATE_KEY, now.toString());
    setLastUpdate(new Date(now));
  };

  // 수동으로 데이터를 새로고침하는 함수
  const refreshData = async () => {
    setIsLoading(true);
    try {
      let q = collection(techQuestionsDb, COLLECTIONS.QUESTIONS);
      q = query(q, orderBy('createdAt', 'desc'));

      const questionsSnapshot = await getDocs(q);
      const questionsData = [];

      for (const doc of questionsSnapshot.docs) {
        const questionData = { id: doc.id, ...doc.data() };
        
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
      
      cacheData(questionsData);
      setQuestions(questionsData);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      // 먼저 캐시된 데이터 확인
      const cachedQuestions = checkCachedData();
      if (cachedQuestions) {
        console.log('Using cached data');
        setQuestions(cachedQuestions);
        setIsLoading(false);
        return;
      }

      await refreshData();
    } catch (error) {
      console.error('Error fetching questions:', error);
      setQuestions([]); // 에러 발생 시 빈 배열로 설정
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    console.log(`Changing ${name} filter to:`, value);
    setFilters(prev => {
      const newFilters = {
        ...prev,
        [name]: value
      };
      console.log('New filters state:', newFilters);
      return newFilters;
    });
    setSelectedQuestion(null);
    setShowAnswer(false);
    setShowModalAnswer(false);
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

  const handleCardFlip = () => {
    setIsCardFlipped(!isCardFlipped);
  };

  const getNewRandomQuestion = () => {
    setIsCardFlipped(false); // Reset flip state
    const filteredQuestions = questions.filter(q => 
      randomCategory === 'all' || q.category_id === randomCategory
    );
    if (filteredQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * filteredQuestions.length);
      setRandomQuestion(filteredQuestions[randomIndex]);
    }
  };

  // 필터링된 질문 목록을 계산하는 함수
  const getFilteredQuestions = () => {
    if (!Array.isArray(questions)) {
      console.error('Questions is not an array:', questions);
      return [];
    }

    return questions.filter(question => {
      // 기본 필터 조건
      if (filters.difficulty !== 'all' && question.difficulty !== filters.difficulty) return false;
      if (filters.category !== 'all' && question.category_id !== filters.category) return false;
      if (filters.type !== 'all' && question.type !== filters.type) return false;
      if (filters.language !== 'all' && question.language !== filters.language) return false;
      
      // 학습되지 않은 문제만 보기 필터
      if (showOnlyUnlearned && comfortableQuestions.includes(question.id)) return false;
      
      return true;
    });
  };

  // 질문 아이템 클릭 핸들러 수정
  const handleQuestionItemClick = (e, question) => {
    // 체크박스나 그 부모 요소를 클릭한 경우 모달을 열지 않음
    if (e.target.closest('.comfort-checkbox-wrapper')) {
      return;
    }
    handleQuestionClick(question);
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
              {lastUpdate && (
                <p className="last-update">
                  마지막 업데이트: {lastUpdate.toLocaleString()}
                </p>
              )}
            </div>
            <button 
              onClick={() => window.location.href = 'http://localhost:3002/#/'} 
              className="back-button"
            >
              <span>←</span>
              <span>Home</span>
            </button>
          </div>
        </div>

        {/* Random Question Generator */}
        <div className="random-question-section">
          <div className="random-controls">
            <div className="random-category-select">
              <div className="dropdown-wrapper">
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
                <svg className="dropdown-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <button 
                onClick={refreshData}
                className="refresh-button"
                title="데이터 새로고침"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
                </svg>
              </button>
            </div>
          </div>

          {randomQuestion && (
            <div className={`random-card ${isCardFlipped ? 'flipped' : ''}`}>
              <div className="random-card-inner" onClick={handleCardFlip}>
                <div className="random-question">
                  <h3>
                    Random Question
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        getNewRandomQuestion();
                      }}
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
                  <div className="flip-hint">클릭하여 답변 보기</div>
                </div>
                <div className="random-answer-section">
                  {randomQuestion.answer && (
                    <div className="random-answer">
                      <h3>Answer</h3>
                      <p>{randomQuestion.answer.answer}</p>
                    </div>
                  )}
                  <div className="flip-hint">클릭하여 질문 보기</div>
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
              onChange={(e) => {
                console.log('Selected difficulty:', e.target.value);
                handleFilterChange('difficulty', e.target.value);
              }}
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
          {/* Questions List with Toggle Button */}
          <div className="questions-panel">
            <div className="questions-header">
              <h2>질문 목록</h2>
              <button
                className={`unlearned-toggle ${showOnlyUnlearned ? 'active' : ''}`}
                onClick={() => setShowOnlyUnlearned(!showOnlyUnlearned)}
                title={showOnlyUnlearned ? "모든 문제 보기" : "학습되지 않은 문제만 보기"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                  <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                </svg>
                {showOnlyUnlearned ? "학습되지 않은 문제" : "전체 문제"}
              </button>
            </div>
            {isLoading ? (
              <div className="loading">Loading...</div>
            ) : (
              <div className="questions-list">
                {getFilteredQuestions().map((question) => (
                  <div
                    key={question.id}
                    className="question-item"
                    onClick={(e) => handleQuestionItemClick(e, question)}
                  >
                    <div className="question-header">
                      <div className="question-header-left">
                        <span className={`question-difficulty ${question.difficulty.toLowerCase()}`}>
                          {question.difficulty}
                        </span>
                        <span className="question-category">
                          {PREDEFINED_CATEGORIES.find(c => c.id === question.category_id)?.name}
                        </span>
                      </div>
                      <div className="comfort-checkbox-wrapper" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="comfort-checkbox"
                          checked={comfortableQuestions.includes(question.id)}
                          onChange={(e) => handleComfortableToggle(question.id, e)}
                          aria-label="학습 완료 표시"
                        />
                      </div>
                    </div>
                    <div className="question-text">{question.question}</div>
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