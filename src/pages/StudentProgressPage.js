import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import StudentProgress from '../components/StudentProgress';

const StudentProgressPage = () => {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
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
      }
    };

    if (studentId) {
      fetchStudentData();
    }
  }, [studentId]);

  const title = student?.name ? `${student.name}님의 학습 현황` : '학습 현황';
  const description = student?.name && student?.subjects ? 
    `${student.name}님의 ${student.subjects} 수업 진도와 숙제를 확인하실 수 있습니다.` : 
    '학생의 수업 진도와 숙제를 확인하실 수 있습니다.';

  return (
    <>
      <Helmet>
        {/* Force override metadata */}
        <title>{title}</title>
        <meta name="title" content={title} />
        <meta name="description" content={description} />
        
        {/* Open Graph / Facebook / KakaoTalk */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:site_name" content={title} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={null} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content={window.location.href} />
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
          <StudentProgress studentId={studentId} />
        </div>
      </div>
    </>
  );
};

export default StudentProgressPage; 