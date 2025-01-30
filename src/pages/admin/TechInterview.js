import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { techQuestionsDb, COLLECTIONS, PREDEFINED_CATEGORIES, DIFFICULTY_LEVELS, QUESTION_TYPES } from '../../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import './TechInterview.css';

const TechInterview = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    question: '',
    category_id: PREDEFINED_CATEGORIES[0].id,
    difficulty: DIFFICULTY_LEVELS[0],
    type: QUESTION_TYPES[0],
    answer: '',
    references: ''
  });
  const [gptPrompt, setGptPrompt] = useState('');
  const [questionCount, setQuestionCount] = useState(1);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [language, setLanguage] = useState('ko');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addQuestionToFirestore = async (questionData) => {
    try {
      const questionRef = await addDoc(collection(techQuestionsDb, COLLECTIONS.QUESTIONS), {
        question: questionData.question,
        category_id: PREDEFINED_CATEGORIES.find(c => 
          c.name.toLowerCase() === questionData.category.toLowerCase()
        )?.id || PREDEFINED_CATEGORIES[0].id,
        difficulty: questionData.difficulty,
        type: questionData.type,
        language: language,
        createdAt: new Date()
      });

      await addDoc(collection(techQuestionsDb, COLLECTIONS.ANSWERS), {
        question_id: questionRef.id,
        answer: questionData.answer,
        references: questionData.references,
        createdAt: new Date()
      });

      return true;
    } catch (error) {
      console.error('Error adding question to Firestore:', error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await addQuestionToFirestore(formData);
      setFormData({
        question: '',
        category_id: PREDEFINED_CATEGORIES[0].id,
        difficulty: DIFFICULTY_LEVELS[0],
        type: QUESTION_TYPES[0],
        answer: '',
        references: ''
      });
      alert('Question added successfully!');
    } catch (error) {
      console.error('Error adding question:', error);
      alert('Error adding question. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateWithGPT = async () => {
    if (!gptPrompt.trim()) {
      alert('Please enter a prompt for GPT-4');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{
            role: "system",
            content: `You are an expert technical interviewer with deep knowledge in software engineering, algorithms, system design, and various programming languages. Generate ${questionCount} different technical interview questions in ${language === 'ko' ? 'Korean' : 'English'} language.

IMPORTANT: You must strictly follow these exact options for each field:

Categories (Choose exactly one):
- Machine Learning
- CS Basics
- Frontend
- Backend

Difficulty Levels (Choose exactly one):
- Easy
- Medium
- Hard

Question Types (Choose exactly one):
- Theoretical
- Practical
- Coding

Follow this structure for each question:
1. Question: Write a clear, specific technical question
2. Answer: Provide a detailed answer including:
   - Key concepts
   - Example code or pseudocode if applicable
   - Common pitfalls or edge cases
   - Time/space complexity for algorithmic questions
3. Difficulty: [Must be exactly one of: Easy, Medium, Hard]
4. Category: [Must be exactly one of: Machine Learning, CS Basics, Frontend, Backend]
5. Type: [Must be exactly one of: Theoretical, Practical, Coding]
6. References: Add relevant documentation links or resources

IMPORTANT RULES:
- Use EXACTLY the category, difficulty, and type values provided above. Do not modify or create new ones.
- Each question must have exactly one value for each field.
- Separate each question with "---" on a new line.
- Maintain consistent formatting for all questions.`
          }, {
            role: "user",
            content: gptPrompt
          }],
          temperature: 0.7
        })
      });

      const data = await response.json();
      if (data.choices && data.choices[0]) {
        const generatedContent = data.choices[0].message.content;
        
        try {
          const questions = generatedContent.split('---').map(q => q.trim()).filter(Boolean);
          const parsedQuestions = questions.map(questionContent => {
            const sections = questionContent.split(/\d+\.\s+/).filter(Boolean);
            return {
              question: sections[0].replace(/Question:\s*/, '').trim(),
              answer: sections[1].replace(/Answer:\s*/, '').trim(),
              difficulty: sections[2].replace(/Difficulty:\s*/, '').trim(),
              category: sections[3].replace(/Category:\s*/, '').trim(),
              type: sections[4].replace(/Type:\s*/, '').trim(),
              references: sections[5].replace(/References:\s*/, '').trim()
            };
          });

          for (const question of parsedQuestions) {
            await addQuestionToFirestore(question);
          }

          setGeneratedQuestions(parsedQuestions);
          alert('질문이 성공적으로 생성되고 저장되었습니다!');
        } catch (error) {
          console.error('Error parsing GPT response:', error);
          alert('GPT 응답 처리 중 오류가 발생했습니다.');
        }
      }
    } catch (error) {
      console.error('Error generating with GPT:', error);
      alert('GPT로 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tech-interview">
      <div className="container">
        {/* Header */}
        <div className="header">
          <div className="header-content">
            <div>
              <h1>Tech Interview Questions</h1>
              <p>기술 면접 질문을 관리하고 생성하세요</p>
            </div>
            <button 
              onClick={() => navigate('/admin/add-todo')} 
              className="back-button"
            >
              <span>←</span>
              <span>Quick Todo</span>
            </button>
          </div>
        </div>

        {/* GPT Section */}
        <div className="section gpt-section">
          <div className="section-header">
            <h2>GPT-4로 질문 생성</h2>
            <p>AI를 활용하여 기술 면접 질문을 자동으로 생성하세요</p>
          </div>
          <div className="gpt-content">
            <div className="gpt-controls">
              <div className="question-count">
                <label>생성할 질문 수:</label>
                <input 
                  type="number"
                  min="1"
                  max="10"
                  value={questionCount}
                  onChange={(e) => {
                    const value = Math.min(Math.max(1, parseInt(e.target.value) || 1), 10);
                    setQuestionCount(value);
                  }}
                  className="count-input"
                />
              </div>
              <div className="language-select">
                <label>언어 선택:</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="language-input"
                >
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
            <textarea
              value={gptPrompt}
              onChange={(e) => setGptPrompt(e.target.value)}
              placeholder={language === 'ko' ? 
                '예시: "자바스크립트의 클로저에 대한 중급 난이도의 질문을 생성해주세요" 또는 "리액트 훅스에 대한 실전적인 코딩 문제를 만들어주세요"' :
                'Example: "Generate a medium difficulty question about JavaScript closures" or "Create a practical coding problem about React hooks"'}
            />
            <button
              onClick={generateWithGPT}
              disabled={isLoading}
              className="generate-button"
            >
              {isLoading ? (
                <>
                  <svg className="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="spinner-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  생성 중...
                </>
              ) : (
                <>
                  <svg className="lightning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  GPT-4로 생성하기
                </>
              )}
            </button>
          </div>

          {/* Generated Questions List */}
          {generatedQuestions.length > 0 && (
            <div className="generated-questions">
              <h3>생성된 질문 목록 (Firestore에 저장됨)</h3>
              <div className="questions-list">
                {generatedQuestions.map((q, index) => (
                  <div 
                    key={index} 
                    className="question-item"
                  >
                    <div className="question-header">
                      <span className="question-number">#{index + 1}</span>
                      <span className={`question-difficulty ${q.difficulty.toLowerCase()}`}>
                        {q.difficulty}
                      </span>
                    </div>
                    <div className="question-preview">{q.question}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Form Section */}
        <div className="section form-section">
          <div className="section-header">
            <h2>질문 추가</h2>
            <p>면접 질문과 답변을 직접 작성하거나 수정하세요</p>
            <div className="import-section">
              <h3>JSON으로 여러 질문 추가</h3>
              <textarea
                className="json-input"
                placeholder={`아래 형식으로 JSON을 입력하세요:
[
  {
    "question": "질문 내용",
    "answer": "답변 내용",
    "category_id": "frontend",
    "difficulty": "Medium",
    "type": "Theoretical",
    "language": "ko",
    "references": "참고 자료 (선택사항)"
  }
]`}
                rows={10}
              />
              <button
                onClick={async () => {
                  const jsonInput = document.querySelector('.json-input').value;
                  try {
                    const jsonData = JSON.parse(jsonInput);
                    let successCount = 0;
                    let errorCount = 0;

                    if (!Array.isArray(jsonData)) {
                      alert('JSON 데이터는 배열 형식이어야 합니다.');
                      return;
                    }

                    // 데이터 형식 검증을 각 항목별로 수행하고 구체적인 오류 메시지 제공
                    const invalidItems = jsonData.map((item, index) => {
                      const errors = [];
                      
                      if (!item.question) errors.push('question(질문)이 없습니다');
                      if (!item.answer) errors.push('answer(답변)이 없습니다');
                      
                      const category = PREDEFINED_CATEGORIES.find(c => c.id === item.category_id);
                      if (!category) errors.push(`category_id(${item.category_id})가 유효하지 않습니다. 가능한 값: ${PREDEFINED_CATEGORIES.map(c => c.id).join(', ')}`);
                      
                      if (!DIFFICULTY_LEVELS.includes(item.difficulty)) {
                        errors.push(`difficulty(${item.difficulty})가 유효하지 않습니다. 가능한 값: ${DIFFICULTY_LEVELS.join(', ')}`);
                      }
                      
                      if (!QUESTION_TYPES.includes(item.type)) {
                        errors.push(`type(${item.type})이 유효하지 않습니다. 가능한 값: ${QUESTION_TYPES.join(', ')}`);
                      }

                      if (!['ko', 'en'].includes(item.language)) {
                        errors.push(`language(${item.language})가 유효하지 않습니다. 가능한 값: ko, en`);
                      }

                      return errors.length > 0 ? `[항목 ${index + 1}] ${errors.join(', ')}` : null;
                    }).filter(Boolean);

                    if (invalidItems.length > 0) {
                      alert('JSON 데이터 형식 오류:\n\n' + invalidItems.join('\n'));
                      return;
                    }

                    setIsLoading(true);
                    for (const item of jsonData) {
                      try {
                        await addQuestionToFirestore({
                          question: item.question,
                          answer: item.answer,
                          category: PREDEFINED_CATEGORIES.find(c => c.id === item.category_id)?.name,
                          difficulty: item.difficulty,
                          type: item.type,
                          language: item.language,
                          references: item.references || ''
                        });
                        successCount++;
                      } catch (error) {
                        console.error('Error adding question:', error);
                        errorCount++;
                      }
                    }
                    setIsLoading(false);
                    alert(`성공: ${successCount}개 질문 추가\n실패: ${errorCount}개`);
                    document.querySelector('.json-input').value = ''; // 입력 초기화
                  } catch (error) {
                    console.error('Error parsing JSON:', error);
                    alert('JSON 형식이 올바르지 않습니다. 형식을 확인해주세요.');
                  }
                }}
                className="import-button"
                disabled={isLoading}
              >
                {isLoading ? '저장 중...' : 'JSON 데이터 저장'}
              </button>
              <div className="json-format-info">
                <h4>사용 가능한 값:</h4>
                <p>카테고리 ID: {PREDEFINED_CATEGORIES.map(c => c.id).join(', ')}</p>
                <p>난이도: {DIFFICULTY_LEVELS.join(', ')}</p>
                <p>유형: {QUESTION_TYPES.join(', ')}</p>
                <p>언어: ko, en</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="question-form">
            <div className="form-grid">
              <div className="form-group">
                <label>카테고리</label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleInputChange}
                >
                  {PREDEFINED_CATEGORIES.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>난이도</label>
                <select
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleInputChange}
                >
                  {DIFFICULTY_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>유형</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                >
                  {QUESTION_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>질문</label>
              <textarea
                name="question"
                value={formData.question}
                onChange={handleInputChange}
                placeholder="면접 질문을 입력하세요"
                required
              />
            </div>

            <div className="form-group">
              <label>답변</label>
              <textarea
                name="answer"
                value={formData.answer}
                onChange={handleInputChange}
                placeholder="모범 답안을 입력하세요"
                required
              />
            </div>

            <div className="form-group">
              <label>참고 자료</label>
              <input
                type="text"
                name="references"
                value={formData.references}
                onChange={handleInputChange}
                placeholder="참고 자료 링크나 출처를 입력하세요"
              />
            </div>

            <div className="form-submit">
              <button
                type="submit"
                disabled={isLoading}
                className="submit-button"
              >
                {isLoading ? (
                  <>
                    <svg className="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="spinner-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>저장 중...</span>
                  </>
                ) : (
                  <>
                    <svg className="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>질문 저장하기</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TechInterview; 