import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import StudentProgress from '../components/StudentProgress';
import { useLanguage } from '../context/LanguageContext';

// 정적 HTML 생성을 위한 라우트 정보
if (typeof window !== 'undefined' && window.__PRERENDER_INJECTED) {
  window.__PRERENDER_INJECTED.routes = ['/student-progress/:studentId'];
}

const StudentProgressPage = () => {
  const { studentId } = useParams();
  const { language } = useLanguage();
  const [student, setStudent] = useState(() => {
    // 서버에서 프리렌더링된 초기 상태가 있으면 사용
    if (typeof window !== 'undefined' && window.__INITIAL_STATE__?.student) {
      return window.__INITIAL_STATE__.student;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(!student); // 초기 상태가 있으면 로딩 false

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setIsLoading(true);
        const studentDoc = await getDocs(collection(db, 'tutoringStudents'));
        const studentData = studentDoc.docs.find(doc => doc.id === studentId);
        if (studentData) {
          setStudent({
            id: studentData.id,
            ...studentData.data()
          });
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // 초기 상태가 없을 때만 데이터 fetch
    if (studentId && !student) {
      fetchStudentData();
    }
  }, [studentId, student]);

  const getMetaData = () => {
    const title = student?.name ? 
      language === 'ko' ? 
        `${student.name}님의 학습 현황` : 
        `${student.name}'s Learning Progress` 
      : language === 'ko' ? '학습 현황' : 'Learning Progress';

    const description = student?.name && student?.subjects ? 
      language === 'ko' ?
        `${student.name}님의 ${student.subjects} 수업 진도와 숙제를 확인하실 수 있습니다.` :
        `Check ${student.name}'s progress and homework for ${student.subjects} classes.`
      : language === 'ko' ?
        '학생의 수업 진도와 숙제를 확인하실 수 있습니다.' :
        'Check student progress and homework.';

    return { title, description };
  };

  const { title, description } = getMetaData();
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  // 로딩 중에도 메타데이터가 있는 HTML을 반환
  return (
    <>
      <Helmet>
        {/* Force override metadata */}
        <title>{title}</title>
        <meta name="title" content={title} />
        <meta name="description" content={description} />
        
        {/* Open Graph / Facebook / KakaoTalk */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:site_name" content={title} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={null} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content={currentUrl} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={null} />

        {/* WeChat */}
        <meta property="wechat:title" content={title} />
        <meta property="wechat:description" content={description} />
        <meta property="wechat:image" content={null} />
        <meta property="wechat:timeline_title" content={title} />
        
        {/* Naver / KakaoTalk */}
        <meta name="naver-site-verification" content={title} />
        <meta property="kakao:title" content={title} />
        <meta property="kakao:description" content={description} />
        <meta property="kakao:image" content={null} />
      </Helmet>
      <div className="student-progress-page">
        <div className="progress-container">
          {isLoading ? (
            <div className="loading-state">
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
          ) : (
            <StudentProgress studentId={studentId} />
          )}
        </div>
      </div>
    </>
  );
};

export default StudentProgressPage; 