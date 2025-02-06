import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, setDoc, doc, where, updateDoc } from 'firebase/firestore';
import moment from 'moment-timezone';
import '../styles/tutoringLog.css';
import StudentProgress from './StudentProgress';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations/tutoringLog';
import { FaLanguage } from 'react-icons/fa';

const TutoringLog = () => {
  const navigate = useNavigate();
  const { language, toggleLanguage } = useLanguage();
  const t = translations[language];
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [newStudent, setNewStudent] = useState({ name: '', subjects: '' });
  const [sessionLog, setSessionLog] = useState({
    date: moment().tz('Asia/Hong_Kong').format('YYYY-MM-DD'),
    startTime: '',
    endTime: '',
    topics: '',
    homework: '',
  });
  const [logs, setLogs] = useState([]);
  const [showProgress, setShowProgress] = useState(false);
  const [selectedStudentForProgress, setSelectedStudentForProgress] = useState(null);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleLog, setScheduleLog] = useState({
    date: moment().tz('Asia/Hong_Kong').format('YYYY-MM-DD'),
    startTime: '',
    endTime: '',
    note: '',
  });
  const [scheduledSessions, setScheduledSessions] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState('');

  useEffect(() => {
    fetchStudents();
    fetchRecentLogs();

    // AddTodo 컴포넌트의 캐시 초기화
    localStorage.removeItem('monthTodos');
    localStorage.removeItem('loadedMonths');
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      fetchScheduledSessions();
    } else {
      setScheduledSessions([]);
      setSelectedSchedule('');
    }
  }, [selectedStudent]);

  const fetchStudents = async () => {
    try {
      const studentsSnapshot = await getDocs(collection(db, 'tutoringStudents'));
      const studentsData = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchRecentLogs = async () => {
    try {
      const logsQuery = query(
        collection(db, 'tutoringLogs'),
        orderBy('createdAt', 'desc')
      );
      const logsSnapshot = await getDocs(logsQuery);
      const logsData = logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLogs(logsData);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const fetchScheduledSessions = async () => {
    try {
      console.log('Fetching sessions for student:', selectedStudent);
      // 1. 먼저 해당 학생의 모든 수업 기록을 가져옵니다
      const logsQuery = query(
        collection(db, 'tutoringLogs'),
        where('studentId', '==', selectedStudent)
      );
      const logsSnapshot = await getDocs(logsQuery);
      const existingLogs = logsSnapshot.docs.map(doc => doc.data());
      
      // 2. 예정된 수업을 가져옵니다
      const sessionsQuery = query(
        collection(db, 'tutoringSchedules'),
        where('studentId', '==', selectedStudent)
      );
      
      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessionsData = sessionsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(session => {
          // completed가 false이거나 undefined인 세션만 포함
          if (session.completed) return false;
          
          // 이미 수업 기록이 있는 세션 제외
          const hasLog = existingLogs.some(log => 
            log.date === session.date && 
            log.startTime === session.startTime && 
            log.endTime === session.endTime
          );
          return !hasLog;
        })
        .sort((a, b) => a.date.localeCompare(b.date));
      
      console.log('Fetched sessions:', sessionsData);
      setScheduledSessions(sessionsData);
    } catch (error) {
      console.error('Error fetching scheduled sessions:', error);
    }
  };

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return null;
    const start = moment(startTime, 'HH:mm');
    const end = moment(endTime, 'HH:mm');
    const duration = moment.duration(end.diff(start));
    const hours = duration.hours();
    const minutes = duration.minutes();
    return { hours, minutes };
  };

  const formatDuration = (duration) => {
    if (!duration) return '';
    const { hours, minutes } = duration;
    if (hours === 0) return `${minutes}분`;
    if (minutes === 0) return `${hours}시간`;
    return `${hours}시간 ${minutes}분`;
  };

  const handleAddStudent = async () => {
    if (!newStudent.name.trim() || !newStudent.subjects.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'tutoringStudents'), {
        name: newStudent.name.trim(),
        subjects: newStudent.subjects.trim(),
        createdAt: serverTimestamp()
      });
      setStudents([...students, { 
        id: docRef.id, 
        name: newStudent.name.trim(),
        subjects: newStudent.subjects.trim()
      }]);
      setNewStudent({ name: '', subjects: '' });
    } catch (error) {
      console.error('Error adding student:', error);
    }
  };

  const handleSubmitLog = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !sessionLog.startTime || !sessionLog.endTime) {
      alert(t.requiredFields);
      return;
    }

    try {
      const student = students.find(s => s.id === selectedStudent);
      const duration = calculateDuration(sessionLog.startTime, sessionLog.endTime);
      
      // Add the log
      await addDoc(collection(db, 'tutoringLogs'), {
        ...sessionLog,
        studentId: selectedStudent,
        studentName: student.name,
        subjects: student.subjects,
        duration,
        createdAt: serverTimestamp()
      });

      // If this log was created from a schedule, mark it as completed
      if (selectedSchedule) {
        const scheduleRef = doc(db, 'tutoringSchedules', selectedSchedule);
        await updateDoc(scheduleRef, {
          completed: true
        });
        fetchScheduledSessions(); // Refresh the schedules list
      }

      setSessionLog({
        date: moment().tz('Asia/Hong_Kong').format('YYYY-MM-DD'),
        startTime: '',
        endTime: '',
        topics: '',
        homework: '',
      });
      setSelectedSchedule('');
      fetchRecentLogs();
    } catch (error) {
      console.error('Error adding log:', error);
    }
  };

  const handleShareProgress = (studentId) => {
    const shareUrl = `${window.location.origin}/student-progress/${studentId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert(t.linkCopied);
    });
  };

  const handleScheduleSession = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !scheduleLog.date || !scheduleLog.startTime || !scheduleLog.endTime) {
      alert(t.requiredFields);
      return;
    }

    try {
      const student = students.find(s => s.id === selectedStudent);
      const duration = calculateDuration(scheduleLog.startTime, scheduleLog.endTime);
      
      // 과외 일정 저장
      await addDoc(collection(db, 'tutoringSchedules'), {
        ...scheduleLog,
        studentId: selectedStudent,
        studentName: student.name,
        subjects: student.subjects,
        duration,
        createdAt: serverTimestamp(),
        completed: false
      });

      // Todo에 추가
      const todoDate = scheduleLog.date;
      const todoDocRef = doc(db, 'todos', todoDate);
      const todoCollectionRef = collection(todoDocRef, 'todos');
      
      // 다음 todo 번호 생성
      const todosQuery = query(todoCollectionRef, orderBy('createdAt', 'desc'));
      const todosSnapshot = await getDocs(todosQuery);
      let nextNumber = 1;
      if (!todosSnapshot.empty) {
        const numbers = todosSnapshot.docs
          .map(doc => {
            const match = doc.id.match(/todo-(\d+)/);
            return match ? parseInt(match[1]) : 0;
          })
          .filter(num => !isNaN(num));
        
        if (numbers.length > 0) {
          nextNumber = Math.max(...numbers) + 1;
        }
      }

      const todoId = `todo-${String(nextNumber).padStart(3, '0')}`;
      
      // todos 컬렉션에 문서 생성
      await setDoc(todoDocRef, { createdAt: serverTimestamp() }, { merge: true });
      
      // todo 추가
      await setDoc(doc(todoCollectionRef, todoId), {
        task: `${student.name} 과외 (${student.subjects})`,
        date: scheduleLog.date,
        startTime: scheduleLog.startTime,
        endTime: scheduleLog.endTime,
        createdAt: serverTimestamp(),
        completed: false
      });

      // localStorage의 monthTodos 초기화
      localStorage.removeItem('monthTodos');
      localStorage.removeItem('loadedMonths');

      setScheduleLog({
        date: moment().tz('Asia/Hong_Kong').format('YYYY-MM-DD'),
        startTime: '',
        endTime: '',
        note: '',
      });
      
      alert(t.scheduleSuccess);
    } catch (error) {
      console.error('Error scheduling session:', error);
      alert(t.scheduleError);
    }
  };

  return (
    <div className="tutoring-log">
      {showProgress ? (
        <>
          <div className="progress-nav">
            <button 
              onClick={() => setShowProgress(false)}
              className="back-to-log-btn"
            >
              {t.backToLog}
            </button>
            <button
              onClick={() => handleShareProgress(selectedStudentForProgress)}
              className="share-progress-btn"
            >
              {t.copyShareLink}
            </button>
          </div>
          <StudentProgress studentId={selectedStudentForProgress} />
        </>
      ) : (
        <>
          <div className="tutoring-form">
            <div className="student-section">
              <div className="student-header">
                <h3>{t.studentManagement}</h3>
                <button onClick={toggleLanguage} className="language-toggle">
                  <FaLanguage /> {language.toUpperCase()}
                </button>
                {selectedStudent && (
                  <div className="student-actions">
                    <button
                      onClick={() => {
                        setSelectedStudentForProgress(selectedStudent);
                        setShowProgress(true);
                      }}
                      className="view-progress-btn"
                    >
                      {t.viewProgress}
                    </button>
                    <button
                      onClick={() => handleShareProgress(selectedStudent)}
                      className="share-btn"
                    >
                      {t.share}
                    </button>
                  </div>
                )}
              </div>
              <div className="add-student">
                <div className="student-inputs">
                  <input
                    type="text"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                    placeholder={t.newStudentName}
                    className="student-input"
                  />
                  <input
                    type="text"
                    value={newStudent.subjects}
                    onChange={(e) => setNewStudent({...newStudent, subjects: e.target.value})}
                    placeholder={t.subjects}
                    className="student-input"
                  />
                </div>
                <button onClick={handleAddStudent} className="add-student-btn">
                  {t.addStudent}
                </button>
              </div>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="student-select"
              >
                <option value="">{t.selectStudent}</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.subjects})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-tabs">
              <button
                className={`tab-btn ${!scheduleMode ? 'active' : ''}`}
                onClick={() => setScheduleMode(false)}
              >
                {t.classRecord}
              </button>
              <button
                className={`tab-btn ${scheduleMode ? 'active' : ''}`}
                onClick={() => setScheduleMode(true)}
              >
                {t.classSchedule}
              </button>
            </div>

            {scheduleMode ? (
              <form onSubmit={handleScheduleSession} className="log-form">
                <div className="form-row">
                  <input
                    type="date"
                    value={scheduleLog.date}
                    onChange={(e) => setScheduleLog({...scheduleLog, date: e.target.value})}
                    className="date-input"
                    min={moment().format('YYYY-MM-DD')}
                  />
                </div>
                <div className="form-row time-inputs">
                  <input
                    type="time"
                    value={scheduleLog.startTime}
                    onChange={(e) => setScheduleLog({...scheduleLog, startTime: e.target.value})}
                    placeholder="시작 시간"
                    className="time-input"
                  />
                  <span>~</span>
                  <input
                    type="time"
                    value={scheduleLog.endTime}
                    onChange={(e) => setScheduleLog({...scheduleLog, endTime: e.target.value})}
                    placeholder="종료 시간"
                    className="time-input"
                  />
                  {scheduleLog.startTime && scheduleLog.endTime && (
                    <span className="duration">
                      {formatDuration(calculateDuration(scheduleLog.startTime, scheduleLog.endTime))}
                    </span>
                  )}
                </div>
                <div className="form-row">
                  <textarea
                    value={scheduleLog.note}
                    onChange={(e) => setScheduleLog({...scheduleLog, note: e.target.value})}
                    placeholder={t.memo}
                    className="topics-input"
                  />
                </div>
                <button type="submit" className="submit-btn schedule-btn">
                  {t.scheduleClass}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmitLog} className="log-form">
                {console.log('Current scheduledSessions:', scheduledSessions)}
                {scheduledSessions.length > 0 ? (
                  <div className="form-row">
                    <select
                      value={selectedSchedule}
                      onChange={(e) => {
                        const scheduleId = e.target.value;
                        setSelectedSchedule(scheduleId);
                        if (scheduleId) {
                          const schedule = scheduledSessions.find(s => s.id === scheduleId);
                          setSessionLog(prev => ({
                            ...prev,
                            date: schedule.date,
                            startTime: schedule.startTime,
                            endTime: schedule.endTime,
                          }));
                        }
                      }}
                      className="schedule-select"
                    >
                      <option value="">{t.selectFromScheduled}</option>
                      {scheduledSessions.map(schedule => (
                        <option key={schedule.id} value={schedule.id}>
                          {moment(schedule.date).format('YYYY-MM-DD')} {schedule.startTime}-{schedule.endTime}
                          {schedule.note ? ` (${schedule.note})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="no-schedules-message">
                    {t.noScheduledClasses}
                  </div>
                )}
                <div className="form-row">
                  <input
                    type="date"
                    value={sessionLog.date}
                    onChange={(e) => {
                      setSessionLog({...sessionLog, date: e.target.value});
                      setSelectedSchedule('');
                    }}
                    className="date-input"
                  />
                </div>
                <div className="form-row time-inputs">
                  <input
                    type="time"
                    value={sessionLog.startTime}
                    onChange={(e) => {
                      setSessionLog({...sessionLog, startTime: e.target.value});
                      setSelectedSchedule('');
                    }}
                    placeholder="시작 시간"
                    className="time-input"
                  />
                  <span>~</span>
                  <input
                    type="time"
                    value={sessionLog.endTime}
                    onChange={(e) => {
                      setSessionLog({...sessionLog, endTime: e.target.value});
                      setSelectedSchedule('');
                    }}
                    placeholder="종료 시간"
                    className="time-input"
                  />
                  {sessionLog.startTime && sessionLog.endTime && (
                    <span className="duration">
                      {formatDuration(calculateDuration(sessionLog.startTime, sessionLog.endTime))}
                    </span>
                  )}
                </div>
                <div className="form-row">
                  <textarea
                    value={sessionLog.topics}
                    onChange={(e) => setSessionLog({...sessionLog, topics: e.target.value})}
                    placeholder={t.classContent}
                    className="topics-input"
                  />
                </div>
                <div className="form-row">
                  <textarea
                    value={sessionLog.homework}
                    onChange={(e) => setSessionLog({...sessionLog, homework: e.target.value})}
                    placeholder={t.homework}
                    className="homework-input"
                  />
                </div>
                <button type="submit" className="submit-btn">
                  {t.saveClassRecord}
                </button>
              </form>
            )}
          </div>

          <div className="recent-logs">
            <h3>{t.recentClassRecords}</h3>
            <div className="logs-list">
              {logs.map(log => (
                <div key={log.id} className="log-item">
                  <div className="log-header">
                    <div className="log-header-left">
                      <span className="student-name">{log.studentName}</span>
                      <span className="student-subjects">({log.subjects})</span>
                      <button
                        onClick={() => handleShareProgress(log.studentId)}
                        className="share-btn-small"
                      >
                        🔗
                      </button>
                    </div>
                    <div className="log-header-right">
                      <span className="log-date">
                        {log.date} {log.startTime}-{log.endTime}
                      </span>
                      <span className="log-duration">
                        ({formatDuration(log.duration)})
                      </span>
                    </div>
                  </div>
                  {log.topics && (
                    <div className="log-topics">
                      <strong>{t.classContent_label}</strong> {log.topics}
                    </div>
                  )}
                  {log.homework && (
                    <div className="log-homework">
                      <strong>{t.homework_label}</strong> {log.homework}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TutoringLog; 