import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useState } from 'react';
import axios from 'axios';

function Duplicate() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  // GPT API 설정
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
  const apiUrl = "https://api.openai.com/v1/chat/completions";

  // GPT API 호출 함수
  const translateText = async (text) => {
    if (!apiKey) {
      setError('OpenAI API 키가 설정되지 않았습니다. 환경 변수를 확인해주세요.');
      throw new Error('OpenAI API key is not set');
    }

    try {
      const response = await axios.post(apiUrl, {
        model: "gpt-3.5-turbo",
        messages: [{
          role: "user",
          content: `Translate the following Korean text to natural English: ${text}`
        }],
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error during translation:', error);
      if (error.response?.status === 401) {
        setError('API 키가 유효하지 않습니다. 올바른 OpenAI API 키를 설정해주세요.');
      } else {
        setError(`번역 중 오류가 발생했습니다: ${error.message}`);
      }
      throw error;
    }
  };

  const handleDuplicate = async () => {
    setIsLoading(true);
    setResult('');
    setError('');
    
    try {
      const sourceCollection = collection(db, 'projects');
      const querySnapshot = await getDocs(sourceCollection);
      
      // 각 문서를 순차적으로 처리하여 API 호출 제한 방지
      for (const document of querySnapshot.docs) {
        const data = document.data();
        
        // title 필드도 번역 대상에 추가
        const translatedData = {
          ...data,
          title: await translateText(data.title),
          description: await translateText(data.description),
          document: await translateText(data.document)
        };

        // 1초 대기하여 API 호출 제한 방지
        await new Promise(resolve => setTimeout(resolve, 1000));

        await setDoc(doc(db, 'projects-en', document.id), translatedData);
        setResult(prev => prev + `\n문서 ${document.id} 번역 완료`);
      }

      setResult(prev => prev + '\n\n모든 문서 번역 및 복제 완료!');
    } catch (error) {
      console.error('Error duplicating collection:', error);
      setError('컬렉션 복제 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>컬렉션 복제 도구</h1>
      <div style={styles.info}>
        <p>이 도구는 'projects' 컬렉션을 'projects-en' 컬렉션으로 복제하고, 번역합니다.</p>
        <p>주의: 기존 'projects-en' 컬렉션의 동일한 ID를 가진 문서는 덮어쓰기됩니다.</p>
      </div>
      <button 
        onClick={handleDuplicate} 
        disabled={isLoading}
        style={styles.button}
      >
        {isLoading ? '복제 및 번역 중...' : '컬렉션 복제 및 번역하기'}
      </button>
      {result && <div style={styles.result}>{result}</div>}
      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '600px',
    margin: '0 auto',
  },
  title: {
    textAlign: 'center',
    marginBottom: '2rem',
    color: '#1C3D5A',
  },
  info: {
    backgroundColor: '#f8f9fa',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '2rem',
  },
  button: {
    width: '100%',
    padding: '1rem',
    backgroundColor: '#4A90E2',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'background-color 0.2s',
  },
  result: {
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: '#e8f4ff',
    borderRadius: '8px',
    textAlign: 'center',
  },
  error: {
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: '#ffe8e8',
    borderRadius: '8px',
    textAlign: 'center',
    color: '#d32f2f'
  }
};

export default Duplicate; 