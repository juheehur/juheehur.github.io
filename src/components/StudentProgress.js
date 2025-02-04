import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { db } from '../firebase/config';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import moment from 'moment-timezone';
import '../styles/studentProgress.css';

const StudentProgress = ({ studentId }) => {
  const [student, setStudent] = useState(null);
  const [logs, setLogs] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [stats, setStats] = useState({
    totalHours: 0,
    averageSessionLength: 0,
    totalSessions: 0,
    lastMonth: {
      hours: 0,
      sessions: 0
    }
  });
  const [groupedLogs, setGroupedLogs] = useState({});

  useEffect(() => {
    if (studentId) {
      fetchStudentData();
      fetchStudentLogs();
      fetchUpcomingSessions();
    }
  }, [studentId]);

  const fetchStudentData = async () => {
    try {
      const studentDoc = await getDocs(collection(db, 'tutoringStudents'));
      const studentData = studentDoc.docs
        .find(doc => doc.id === studentId);
      if (studentData) {
        const studentInfo = {
          id: studentData.id,
          ...studentData.data()
        };
        setStudent(studentInfo);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    }
  };

  const fetchStudentLogs = async () => {
    try {
      const logsQuery = query(
        collection(db, 'tutoringLogs'),
        where('studentId', '==', studentId)
      );
      const logsSnapshot = await getDocs(logsQuery);
      const logsData = logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      logsData.sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      });
      
      setLogs(logsData);
      calculateStats(logsData);
      groupLogsByMonth(logsData);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const fetchUpcomingSessions = async () => {
    try {
      const today = moment().tz('Asia/Hong_Kong').format('YYYY-MM-DD');
      const sessionsQuery = query(
        collection(db, 'tutoringSchedules'),
        where('studentId', '==', studentId)
      );
      
      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessionsData = sessionsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(session => session.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date));
      
      console.log('Fetched upcoming sessions:', sessionsData); // 디버깅용
      setUpcomingSessions(sessionsData);
    } catch (error) {
      console.error('Error fetching upcoming sessions:', error);
    }
  };

  const calculateStats = (logsData) => {
    const totalSessions = logsData.length;
    let totalMinutes = 0;
    let lastMonthMinutes = 0;
    let lastMonthSessions = 0;
    
    const lastMonthStart = moment().subtract(1, 'month').startOf('month');
    const lastMonthEnd = moment().subtract(1, 'month').endOf('month');

    logsData.forEach(log => {
      if (log.duration) {
        const minutes = (log.duration.hours * 60) + log.duration.minutes;
        totalMinutes += minutes;

        const logDate = moment(log.date);
        if (logDate.isBetween(lastMonthStart, lastMonthEnd, 'day', '[]')) {
          lastMonthMinutes += minutes;
          lastMonthSessions++;
        }
      }
    });

    setStats({
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      averageSessionLength: totalSessions ? Math.round((totalMinutes / totalSessions) * 10) / 10 : 0,
      totalSessions,
      lastMonth: {
        hours: Math.round((lastMonthMinutes / 60) * 10) / 10,
        sessions: lastMonthSessions
      }
    });
  };

  const groupLogsByMonth = (logsData) => {
    const grouped = logsData.reduce((acc, log) => {
      const monthKey = moment(log.date).format('YYYY-MM');
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(log);
      return acc;
    }, {});
    setGroupedLogs(grouped);
  };

  const formatDuration = (duration) => {
    if (!duration) return '';
    const { hours, minutes } = duration;
    if (hours === 0) return `${minutes}분`;
    if (minutes === 0) return `${hours}시간`;
    return `${hours}시간 ${minutes}분`;
  };

  const formatUpcomingDate = (dateStr) => {
    const date = moment(dateStr);
    const today = moment().tz('Asia/Hong_Kong');
    const tomorrow = moment().tz('Asia/Hong_Kong').add(1, 'day');
    
    if (date.isSame(today, 'day')) {
      return '오늘';
    } else if (date.isSame(tomorrow, 'day')) {
      return '내일';
    } else if (date.isSame(today, 'week')) {
      return date.format('dddd'); // 요일
    } else {
      return date.format('M월 D일 (ddd)');
    }
  };

  if (!student) return <div className="loading">Loading...</div>;

  return (
    <div className="student-progress">
      <div className="progress-header">
        <div className="progress-header-content">
          <h2>{student.name}님의 학습 현황</h2>
          <div className="subjects-tag">{student.subjects}</div>
        </div>
        <div className="class-info">
          <a href="https://cuhk.zoom.us/j/2313720278" 
             target="_blank" 
             rel="noopener noreferrer" 
             className="zoom-link">
            <span className="zoom-icon">🎥</span>
            수업 입장하기
          </a>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card total-hours">
          <div className="stat-value">{stats.totalHours}시간</div>
          <div className="stat-label">총 수업 시간</div>
        </div>
        <div className="stat-card total-sessions">
          <div className="stat-value">{stats.totalSessions}회</div>
          <div className="stat-label">총 수업 횟수</div>
        </div>
        <div className="stat-card avg-length">
          <div className="stat-value">{stats.averageSessionLength}분</div>
          <div className="stat-label">평균 수업 시간</div>
        </div>
        <div className="stat-card last-month">
          <div className="stat-value">{stats.lastMonth.hours}시간</div>
          <div className="stat-label">지난달 수업</div>
          <div className="stat-sublabel">({stats.lastMonth.sessions}회)</div>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="latest-homework">
          <h3>최근 숙제</h3>
          <div className="homework-card">
            <div className="homework-header">
              <div className="homework-date">
                {moment(logs[0].date).format('M월 D일')} 숙제
              </div>
              <div className="next-class">
                다음 수업: {upcomingSessions[0]?.date ? moment(upcomingSessions[0].date).format('M월 D일 (ddd)') : '미정'}
              </div>
            </div>
            <div className="homework-content">
              {logs[0].homework ? (
                <div className="homework-text">
                  {logs[0].homework}
                </div>
              ) : (
                <div className="no-homework">
                  이번 수업에는 숙제가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {upcomingSessions.length > 0 && (
        <div className="upcoming-sessions">
          <h3>예정된 수업</h3>
          <div className="sessions-timeline">
            {upcomingSessions.map((session, index) => (
              <div key={session.id} className="session-card">
                <div className="session-date">
                  <div className="date-label">{formatUpcomingDate(session.date)}</div>
                  <div className="date-full">{moment(session.date).format('YYYY년 M월 D일')}</div>
                </div>
                <div className="session-time">
                  <div className="time-range">
                    {session.startTime} - {session.endTime}
                  </div>
                  {session.duration && (
                    <div className="duration">
                      {session.duration.hours}시간 {session.duration.minutes > 0 ? `${session.duration.minutes}분` : ''}
                    </div>
                  )}
                </div>
                {session.note && (
                  <div className="session-note">
                    {session.note}
                  </div>
                )}
                <div className="timeline-connector">
                  <div className="dot"></div>
                  {index < upcomingSessions.length - 1 && <div className="line"></div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="progress-timeline">
        {Object.entries(groupedLogs).map(([month, monthLogs]) => (
          <div key={month} className="month-section">
            <h3 className="month-header">
              {moment(month).format('YYYY년 M월')}
              <span className="month-stats">
                {monthLogs.length}회 수업
              </span>
            </h3>
            <div className="month-logs">
              {monthLogs.map(log => (
                <div key={log.id} className="progress-log-item">
                  <div className="log-date-section">
                    <div className="log-date">{moment(log.date).format('M/D (ddd)')}</div>
                    <div className="log-time">
                      {log.startTime}-{log.endTime}
                      <span className="log-duration">
                        ({formatDuration(log.duration)})
                      </span>
                    </div>
                  </div>
                  <div className="log-content">
                    {log.topics && (
                      <div className="log-topics">
                        <strong>📚 수업 내용:</strong> {log.topics}
                      </div>
                    )}
                    {log.homework && (
                      <div className="log-homework">
                        <strong>📝 숙제:</strong> {log.homework}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentProgress; 