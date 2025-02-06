import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { db } from '../firebase/config';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
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
  const [isLoading, setIsLoading] = useState(!student);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setIsLoading(true);
        // 단일 문서 조회로 변경
        const studentRef = doc(db, 'tutoringStudents', studentId);
        const studentDoc = await getDoc(studentRef);
        
        if (studentDoc.exists()) {
          const studentData = {
            id: studentDoc.id,
            ...studentDoc.data()
          };
          setStudent(studentData);
          
          // 프리렌더링을 위한 초기 상태 설정
          if (typeof window !== 'undefined') {
            window.__INITIAL_STATE__ = {
              student: studentData
            };
          }
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setIsLoading(false);
      }
    };

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

  return (
    <>
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{title}</title>
        <meta name="title" content={title} />
        <meta name="description" content={description} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:site_name" content={title} />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={currentUrl} />
        <meta property="twitter:title" content={title} />
        <meta property="twitter:description" content={description} />
        
        {/* Naver */}
        <meta property="og:site_name" content={title} />
        <meta property="og:locale" content={language === 'ko' ? 'ko_KR' : 'en_US'} />
        
        {/* KakaoTalk */}
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
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