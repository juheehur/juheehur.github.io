import React from 'react';
import { useParams } from 'react-router-dom';
import StudentProgress from '../components/StudentProgress';

const StudentProgressPage = () => {
  const { studentId } = useParams();

  return (
    <div className="student-progress-page">
      <div className="progress-container">
        <StudentProgress studentId={studentId} />
      </div>
    </div>
  );
};

export default StudentProgressPage; 