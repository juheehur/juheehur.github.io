import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { db } from '../firebase/config';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import moment from 'moment-timezone';
import '../styles/studentProgress.css';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations/studentProgress';
import { FaLanguage, FaFilePdf, FaDownload } from 'react-icons/fa';

const StudentProgress = ({ studentId }) => {
  const { language, toggleLanguage } = useLanguage();
  const t = translations[language];
  
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!studentId) {
      setIsLoading(false);
      return;
    }
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        await fetchStudentData();
        await fetchStudentLogs();
        await fetchUpcomingSessions();
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [studentId]);

  const fetchStudentData = async () => {
    try {
      const studentRef = doc(db, 'tutoringStudents', studentId);
      const studentDoc = await getDoc(studentRef);
      
      if (studentDoc.exists()) {
        const studentInfo = {
          id: studentDoc.id,
          ...studentDoc.data()
        };
        setStudent(studentInfo);
      } else {
        console.error('Student document not found');
        setStudent(null);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
      setStudent(null);
    }
  };

  const fetchStudentLogs = async () => {
    if (!studentId) return;

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
      
      const sortedLogsData = logsData.sort((a, b) => {
        const dateA = moment(a.date);
        const dateB = moment(b.date);
        if (!dateA.isSame(dateB)) {
          return dateB.valueOf() - dateA.valueOf();
        }
        if (a.createdAt && b.createdAt) {
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        }
        return 0;
      });
      
      setLogs(sortedLogsData);
      calculateStats(sortedLogsData);
      groupLogsByMonth(sortedLogsData);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs([]);
      setGroupedLogs({});
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
    if (hours === 0) return `${minutes}${t.minutes}`;
    if (minutes === 0) return `${hours}${t.hours}`;
    return `${hours}${t.hours} ${minutes}${t.minutes}`;
  };

  const formatUpcomingDate = (dateStr) => {
    const date = moment(dateStr);
    const today = moment().tz('Asia/Hong_Kong');
    const tomorrow = moment().tz('Asia/Hong_Kong').add(1, 'day');
    
    if (date.isSame(today, 'day')) {
      return t.today;
    } else if (date.isSame(tomorrow, 'day')) {
      return t.tomorrow;
    } else if (date.isSame(today, 'week')) {
      return date.format('dddd');
    } else {
      return date.format('M월 D일 (ddd)');
    }
  };

  const downloadPdf = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert(t.downloadError);
    }
  };

  if (isLoading) {
    return <div className="loading">{t.loading}</div>;
  }

  if (!studentId) {
    return <div className="loading">{t.invalidStudent}</div>;
  }

  if (!student) {
    return <div className="loading">{t.studentNotFound}</div>;
  }

  const renderContent = () => {
    return (
      <>
        <div className="progress-header">
          <div className="progress-header-content">
            <h2>{student?.name || ''}{t.learningStatus}</h2>
            <div className="subjects-tag">{student?.subjects || ''}</div>
          </div>
          <div className="class-info">
            <button onClick={toggleLanguage} className="language-toggle">
              <FaLanguage /> {language.toUpperCase()}
            </button>
            <a href="https://cuhk.zoom.us/j/2313720278" 
               target="_blank" 
               rel="noopener noreferrer" 
               className="zoom-link">
              <span className="zoom-icon">🎥</span>
              {t.enterClass}
            </a>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card total-hours">
            <div className="stat-value">{stats.totalHours}{t.hours}</div>
            <div className="stat-label">{t.totalHours}</div>
          </div>
          <div className="stat-card total-sessions">
            <div className="stat-value">{stats.totalSessions}{t.sessions}</div>
            <div className="stat-label">{t.totalSessions}</div>
          </div>
          <div className="stat-card avg-length">
            <div className="stat-value">{stats.averageSessionLength}{t.minutes}</div>
            <div className="stat-label">{t.avgLength}</div>
          </div>
          <div className="stat-card last-month">
            <div className="stat-value">{stats.lastMonth.hours}{t.hours}</div>
            <div className="stat-label">{t.lastMonth}</div>
            <div className="stat-sublabel">({stats.lastMonth.sessions}{t.sessions})</div>
          </div>
        </div>

        {logs.length > 0 && (
          <div className="latest-homework">
            <h3>{t.recentHomework}</h3>
            <div className="homework-card">
              <div className="homework-header">
                <div className="homework-date">
                  {moment(logs[0].date).format('M월 D일')} {t.homework}
                </div>
                <div className="next-class">
                  {t.nextClass} {upcomingSessions[0]?.date ? moment(upcomingSessions[0].date).format('M월 D일 (ddd)') : t.undecided}
                </div>
              </div>
              <div className="homework-content">
                {logs[0].homework ? (
                  <div className="homework-text">
                    {logs[0].homework}
                  </div>
                ) : (
                  <div className="no-homework">
                    {t.noHomework}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {upcomingSessions.length > 0 && (
          <div className="upcoming-sessions">
            <h3>{t.upcomingSessions}</h3>
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
                        {formatDuration(session.duration)}
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
                  {monthLogs.length}{t.classesCounted}
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
                          <strong>{t.topics}</strong> {log.topics}
                        </div>
                      )}
                      {log.homework && (
                        <div className="log-homework">
                          <strong>{t.homeworkLabel}</strong> {log.homework}
                        </div>
                      )}
                      {log.pdfUrls && log.pdfUrls.length > 0 && (
                        <div className="log-pdfs">
                          <strong>{t.materials}:</strong>
                          <div className="pdf-list">
                            {log.pdfUrls.map((pdf, index) => (
                              <div key={index} className="pdf-item">
                                <a 
                                  href={pdf.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="pdf-link"
                                >
                                  <FaFilePdf /> {pdf.name}
                                </a>
                                <button
                                  onClick={() => downloadPdf(pdf.url, pdf.name)}
                                  className="download-btn"
                                  title={t.downloadPdf}
                                >
                                  <FaDownload />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="student-progress">
      {renderContent()}
    </div>
  );
};

export default StudentProgress; 