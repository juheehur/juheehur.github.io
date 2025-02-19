import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, query, getDocs, addDoc, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import moment from 'moment';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import '../styles/contentsManagement.css';

const ContentsManagement = () => {
  const [contents, setContents] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [accountColors, setAccountColors] = useState({});
  const [selectedDate, setSelectedDate] = useState(moment());
  const [showModal, setShowModal] = useState(false);
  const [showAccountInput, setShowAccountInput] = useState(false);
  const [newAccount, setNewAccount] = useState('');
  const [isKorean, setIsKorean] = useState(false);
  const [filters, setFilters] = useState({
    platform: '',
    account: '',
    language: '',
    dateRange: 'all'
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'desc'
  });
  const [newContent, setNewContent] = useState({
    platform: 'instagram',
    accountName: '',
    title: '',
    link: '',
    date: moment().format('YYYY-MM-DD'),
    isKorean: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    byPlatform: {},
    byAccount: {},
    byLanguage: { korean: 0, english: 0 }
  });
  const [editingContent, setEditingContent] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLinks, setSelectedLinks] = useState(new Set());
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const navigate = useNavigate();

  const generateRandomColor = (platform = '', accountName = '') => {
    // 플랫폼별 청량한 파란색 계열 컬러 팔레트
    const palettes = {
      instagram: [
        '#0077B6', // 딥 블루
        '#00B4D8', // 스카이 블루
        '#48CAE4', // 라이트 블루
        '#90E0EF', // 페일 블루
        '#CAF0F8', // 아이시 블루
      ],
      tiktok: [
        '#023E8A', // 네이비 블루
        '#0096C7', // 오션 블루
        '#48B2E8', // 브라이트 블루
        '#64C4ED', // 소프트 블루
        '#ADE8F4', // 파스텔 블루
      ],
      youtube: [
        '#03045E', // 미드나잇 블루
        '#0077B6', // 로얄 블루
        '#0096C7', // 터콰이즈 블루
        '#00B4D8', // 아쿠아 블루
        '#48CAE4', // 스카이 블루
      ],
      default: [
        '#14213D', // 다크 블루
        '#1B4965', // 딥 블루
        '#2C7DA0', // 스틸 블루
        '#468FAF', // 세룰리안 블루
        '#61A5C2', // 더스티 블루
      ]
    };

    // 계정 이름과 플랫폼을 조합하여 고유한 인덱스 생성
    const combinedString = `${platform}-${accountName}`;
    let hashCode = 0;
    for (let i = 0; i < combinedString.length; i++) {
      hashCode = combinedString.charCodeAt(i) + ((hashCode << 5) - hashCode);
    }
    
    // 플랫폼에 따른 팔레트 선택
    let selectedPalette;
    if (platform.toLowerCase() === 'instagram') {
      selectedPalette = palettes.instagram;
    } else if (platform.toLowerCase() === 'tiktok') {
      selectedPalette = palettes.tiktok;
    } else if (platform.toLowerCase() === 'youtube') {
      selectedPalette = palettes.youtube;
    } else {
      selectedPalette = palettes.default;
    }

    // 해시코드를 사용하여 고정된 색상 인덱스 선택
    const colorIndex = Math.abs(hashCode) % selectedPalette.length;
    return selectedPalette[colorIndex];
  };

  const initializeAccountColors = (accountsList) => {
    const colors = {};
    accountsList.forEach(account => {
      const colorKey = `${account.platform}-${account.name}`;
      if (!accountColors[colorKey]) {
        colors[colorKey] = generateRandomColor(account.platform, account.name);
      } else {
        colors[colorKey] = accountColors[colorKey];
      }
    });
    setAccountColors(colors);
  };

  useEffect(() => {
    fetchContents();
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (contents.length > 0) {
      calculateStats();
    }
  }, [contents]);

  const fetchContents = async () => {
    try {
      const contentsRef = collection(db, 'contents');
      const contentsSnapshot = await getDocs(contentsRef);
      const contentsList = contentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setContents(contentsList);
    } catch (error) {
      console.error('Error fetching contents:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const accountsRef = collection(db, 'accounts');
      const accountsSnapshot = await getDocs(accountsRef);
      const accountsList = accountsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAccounts(accountsList);
      initializeAccountColors(accountsList);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccount.trim()) return;
    
    try {
      const accountsRef = collection(db, 'accounts');
      const accountDoc = await addDoc(accountsRef, {
        name: newAccount.trim(),
        platform: newContent.platform,
        createdAt: new Date(),
      });
      
      const newAccountObj = { id: accountDoc.id, name: newAccount.trim(), platform: newContent.platform };
      setAccounts([...accounts, newAccountObj]);
      setAccountColors(prev => ({
        ...prev,
        [`${newContent.platform}-${newAccount.trim()}`]: generateRandomColor(newContent.platform, newAccount.trim())
      }));
      setNewContent({ ...newContent, accountName: newAccount.trim() });
      setNewAccount('');
      setShowAccountInput(false);
    } catch (error) {
      console.error('Error adding account:', error);
    }
  };

  const getFilteredAccounts = () => {
    return accounts.filter(account => !account.platform || account.platform === newContent.platform);
  };

  const handleAddContent = async (e) => {
    e.preventDefault();
    try {
      const contentsRef = collection(db, 'contents');
      const contentToSave = {
        ...newContent,
        isKorean
      };
      
      if (editingContent) {
        const contentRef = doc(db, 'contents', editingContent.id);
        await updateDoc(contentRef, {
          ...contentToSave,
          updatedAt: new Date()
        });
      } else {
        await addDoc(contentsRef, {
          ...contentToSave,
          createdAt: new Date(),
        });
      }
      
      setNewContent({
        platform: 'instagram',
        accountName: '',
        title: '',
        link: '',
        date: selectedDate.format('YYYY-MM-DD'),
        isKorean: false
      });
      setIsKorean(false);
      setEditingContent(null);
      setShowModal(false);
      fetchContents();
    } catch (error) {
      console.error('Error saving content:', error);
    }
  };

  const handleDateClick = (arg) => {
    const clickedDate = moment(arg.date);
    setSelectedDate(clickedDate);
    setNewContent(prev => ({
      ...prev,
      date: clickedDate.format('YYYY-MM-DD')
    }));
  };

  const calculateStats = () => {
    const newStats = {
      total: contents.length,
      byPlatform: {},
      byAccount: {},
      byLanguage: { korean: 0, english: 0 }
    };

    contents.forEach(content => {
      // Platform stats
      newStats.byPlatform[content.platform] = (newStats.byPlatform[content.platform] || 0) + 1;
      
      // Account stats
      newStats.byAccount[content.accountName] = (newStats.byAccount[content.accountName] || 0) + 1;
      
      // Language stats
      if (content.isKorean) {
        newStats.byLanguage.korean += 1;
      } else {
        newStats.byLanguage.english += 1;
      }
    });

    setStats(newStats);
  };

  const handleEventDrop = async (info) => {
    const { event } = info;
    const contentId = event.id;
    const newDate = moment(event.start).format('YYYY-MM-DD');

    try {
      const contentRef = doc(db, 'contents', contentId);
      await updateDoc(contentRef, {
        date: newDate
      });
      
      fetchContents(); // Refresh contents
    } catch (error) {
      console.error('Error updating content date:', error);
      info.revert();
    }
  };

  const handleContentDuplicate = async (content) => {
    const newContent = {
      ...content,
      date: selectedDate.format('YYYY-MM-DD'),
      createdAt: new Date()
    };
    delete newContent.id;

    try {
      await addDoc(collection(db, 'contents'), newContent);
      fetchContents();
    } catch (error) {
      console.error('Error duplicating content:', error);
    }
  };

  const handleEditContent = (content) => {
    setEditingContent(content);
    setNewContent({
      ...content,
      date: moment(content.date).format('YYYY-MM-DD')
    });
    setIsKorean(content.isKorean);
    setShowModal(true);
  };

  const handleDeleteContent = async (contentId) => {
    if (window.confirm('정말로 이 콘텐츠를 삭제하시겠습니까?')) {
      try {
        const contentRef = doc(db, 'contents', contentId);
        await deleteDoc(contentRef);
        fetchContents();
      } catch (error) {
        console.error('Error deleting content:', error);
      }
    }
  };

  const dayCellContent = (arg) => {
    const date = arg.date;
    const dayContents = contents.filter(content => 
      moment(content.date).format('YYYY-MM-DD') === moment(date).format('YYYY-MM-DD')
    );

    // 계정별 콘텐츠 개수를 계산
    const accountContents = dayContents.reduce((acc, content) => {
      const colorKey = `${content.platform}-${content.accountName}`;
      if (!acc[colorKey]) {
        acc[colorKey] = {
          count: 0,
          color: accountColors[colorKey] || generateRandomColor(content.platform, content.accountName),
          accountName: content.accountName,
          platform: content.platform
        };
      }
      acc[colorKey].count += 1;
      return acc;
    }, {});

    return (
      <div style={{ 
        position: 'relative', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        padding: '4px'
      }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '4px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '4px'
          }}>
            <span style={{ 
              fontSize: '0.9em',
              color: arg.isPast ? '#999' : '#333',
              fontWeight: arg.isToday ? '600' : 'normal'
            }}>
              {arg.dayNumberText}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDateClick(arg);
                setShowModal(true);
              }}
            >
              +
            </button>
          </div>
          <div className="dot-container">
            {Object.entries(accountContents).map(([colorKey, data]) => (
              Array(data.count).fill(0).map((_, index) => (
                <div 
                  key={`${colorKey}-${index}`} 
                  className="dot-indicator"
                  style={{ backgroundColor: data.color }}
                  title={`${data.accountName} (${data.count}개)`}
                ></div>
              ))
            ))}
          </div>
        </div>
      </div>
    );
  };

  const getCalendarEvents = () => {
    return contents.map(content => ({
      id: content.id,
      title: `${content.platform} - ${content.title}`,
      date: content.date,
      backgroundColor: accountColors[`${content.platform}-${content.accountName}`] || generateRandomColor(content.platform, content.accountName),
      borderColor: 'transparent',
      className: `platform-${content.platform}`,
      extendedProps: { content }
    }));
  };

  const getSelectedDateContents = () => {
    return contents.filter(content => 
      moment(content.date).format('YYYY-MM-DD') === selectedDate.format('YYYY-MM-DD')
    );
  };

  const getFilteredContents = () => {
    let filtered = contents.filter(content => {
      if (filters.platform && content.platform !== filters.platform) return false;
      if (filters.account && content.accountName !== filters.account) return false;
      if (filters.language && content.isKorean !== (filters.language === 'korean')) return false;
      if (filters.dateRange !== 'all') {
        const contentDate = moment(content.date);
        const today = moment();
        switch (filters.dateRange) {
          case 'today':
            return contentDate.isSame(today, 'day');
          case 'yesterday':
            return contentDate.isSame(today.subtract(1, 'day'), 'day');
          case 'week':
            return contentDate.isAfter(today.subtract(1, 'week'));
          case 'month':
            return contentDate.isAfter(today.subtract(1, 'month'));
          case 'year':
            return contentDate.isAfter(today.subtract(1, 'year'));
          default:
            return true;
        }
      }
      return true;
    });

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (sortConfig.key === 'date') {
          const dateA = moment(a[sortConfig.key]);
          const dateB = moment(b[sortConfig.key]);
          if (sortConfig.direction === 'asc') {
            return dateA.diff(dateB);
          }
          return dateB.diff(dateA);
        }
        
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const filteredContents = getFilteredContents().filter(content =>
    content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    content.accountName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLinkSelect = (contentId) => {
    const newSelectedLinks = new Set(selectedLinks);
    if (newSelectedLinks.has(contentId)) {
      newSelectedLinks.delete(contentId);
    } else {
      newSelectedLinks.add(contentId);
    }
    setSelectedLinks(newSelectedLinks);
  };

  const handleCopyLinks = () => {
    const filteredContents = contents
      .filter(content => {
        if (!startDate || !endDate) return true;
        const contentDate = moment(content.date);
        return contentDate.isBetween(startDate, endDate, 'day', '[]');
      })
      .filter(content => selectedLinks.has(content.id));

    // 제목별로 콘텐츠 그룹화
    const groupedByTitle = filteredContents.reduce((acc, content) => {
      if (!acc[content.title]) {
        acc[content.title] = [];
      }
      acc[content.title].push(content);
      return acc;
    }, {});

    let text = `허주희_emily.hur.juhee@gmail.com\n총 ${filteredContents.length}개\n\n`;

    // 각 제목별로 플랫폼과 링크 정리
    Object.entries(groupedByTitle).forEach(([title, contents]) => {
      text += `(제목: ${title})\n`;
      contents.forEach(content => {
        text += `${content.platform} - ${content.link}\n`;
      });
      text += '\n';
    });

    navigator.clipboard.writeText(text)
      .then(() => {
        alert('링크가 클립보드에 복사되었습니다!');
      })
      .catch(err => {
        console.error('링크 복사 중 오류가 발생했습니다:', err);
      });
  };

  const getFilteredAndSortedContents = () => {
    return contents
      .filter(content => {
        if (!startDate || !endDate) return true;
        const contentDate = moment(content.date);
        return contentDate.isBetween(startDate, endDate, 'day', '[]');
      })
      .sort((a, b) => moment(b.date).diff(moment(a.date)));
  };

  const handleSelectAll = (checked) => {
    const filteredContents = getFilteredAndSortedContents();
    const newSelectedLinks = new Set(selectedLinks);
    
    if (checked) {
      filteredContents.forEach(content => {
        newSelectedLinks.add(content.id);
      });
    } else {
      filteredContents.forEach(content => {
        newSelectedLinks.delete(content.id);
      });
    }
    
    setSelectedLinks(newSelectedLinks);
  };

  const isAllSelected = () => {
    const filteredContents = getFilteredAndSortedContents();
    return filteredContents.length > 0 && filteredContents.every(content => selectedLinks.has(content.id));
  };

  const accountLinks = [
    {
      platform: 'youtube',
      name: 'finalyrengineeringstudent',
      url: 'https://www.youtube.com/@finalyrengineeringstudent/shorts',
      icon: '▶'
    },
    {
      platform: 'youtube',
      name: 'static_int_p',
      url: 'https://www.youtube.com/@static_int_p/shorts',
      icon: '▶'
    },
    {
      platform: 'youtube',
      name: 'diatomicc2',
      url: 'https://www.youtube.com/@diatomicc2',
      icon: '▶'
    },
    {
      platform: 'tiktok',
      name: 'static_int_p',
      url: 'https://www.tiktok.com/@static_int_p',
      icon: '♪'
    },
    {
      platform: 'tiktok',
      name: 'leecetech',
      url: 'https://www.tiktok.com/@leecetech',
      icon: '♪'
    },
    {
      platform: 'instagram',
      name: 'developer_cat_quiz',
      url: 'https://www.instagram.com/developer_cat_quiz/reels/',
      icon: '📷'
    },
    {
      platform: 'instagram',
      name: 'static_int_p',
      url: 'https://www.instagram.com/static_int_p/',
      icon: '📷'
    },
    {
      platform: 'instagram',
      name: 'leece_the_tech_guy',
      url: 'https://www.instagram.com/leece_the_tech_guy/',
      icon: '📷'
    },
    {
      platform: 'instagram',
      name: 'diatomicarbon',
      url: 'https://www.instagram.com/diatomicarbon/reels/',
      icon: '📷'
    },
    {
      platform: 'instagram',
      name: 'var_int_j',
      url: 'https://www.instagram.com/var_int_j/',
      icon: '📷'
    }
  ];

  const handleTitleEdit = async (contentId, newTitle) => {
    try {
      const contentRef = doc(db, 'contents', contentId);
      await updateDoc(contentRef, {
        title: newTitle,
        updatedAt: new Date()
      });
      
      setContents(contents.map(content => 
        content.id === contentId 
          ? { ...content, title: newTitle }
          : content
      ));
      
      setEditingTitleId(null);
      setEditingTitleValue('');
    } catch (error) {
      console.error('Error updating title:', error);
    }
  };

  const handleTitleEditKeyDown = (e, contentId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleEdit(contentId, editingTitleValue);
    } else if (e.key === 'Escape') {
      setEditingTitleId(null);
      setEditingTitleValue('');
    }
  };

  const startTitleEdit = (content) => {
    setEditingTitleId(content.id);
    setEditingTitleValue(content.title);
  };

  return (
    <div className="container">
      <div className="header">
        <h1>콘텐츠 관리</h1>
        <div className="header-buttons">
          <button className="create-button" onClick={() => navigate('/admin/reels-idea-space')}>
            릴스 아이디어 공간
          </button>
          <button className="create-button" onClick={() => navigate('/admin/makecontents')}>
            콘텐츠 생성하기
          </button>
        </div>
      </div>

      <div className="stats-container">
        <div className="stat-card">
          <h3>전체 콘텐츠</h3>
          <div className="number">{stats.total}</div>
        </div>
        {Object.entries(stats.byPlatform).map(([platform, count]) => (
          <div className="stat-card" key={platform}>
            <h3>{platform.toUpperCase()}</h3>
            <div className="number">{count}</div>
          </div>
        ))}
        <div className="stat-card">
          <h3>한국어 콘텐츠</h3>
          <div className="number">{stats.byLanguage.korean}</div>
        </div>
        <div className="stat-card">
          <h3>영어 콘텐츠</h3>
          <div className="number">{stats.byLanguage.english}</div>
        </div>
      </div>

      <div className="search-container">
        <input
          type="text"
          placeholder="콘텐츠 검색 (제목 또는 계정명)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="account-links-container">
        <h3>내 SNS 계정</h3>
        <div className="accounts-grid">
          {accountLinks.map((account, index) => (
            <a
              key={index}
              href={account.url}
              target="_blank"
              rel="noopener noreferrer"
              className="account-link"
            >
              <div className={`platform-icon ${account.platform}`}>
                {account.icon}
              </div>
              <span className="account-name">@{account.name}</span>
            </a>
          ))}
        </div>
      </div>

      <div className="calendar-wrapper">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="ko"
          events={getCalendarEvents()}
          dateClick={handleDateClick}
          dayCellContent={dayCellContent}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: ''
          }}
          height="auto"
          eventDisplay="block"
          displayEventTime={false}
          selectable={true}
          selectMirror={true}
          editable={true}
          eventDrop={handleEventDrop}
          dayCellDidMount={(arg) => {
            // 이벤트 컨테이너를 점 아래로 이동
            const cell = arg.el;
            const eventContainer = cell.querySelector('.fc-daygrid-day-events');
            const dotContainer = cell.querySelector('.dot-container');
            if (eventContainer && dotContainer) {
              cell.insertBefore(dotContainer, eventContainer);
            }
          }}
        />
      </div>

      {showModal && (
        <div className="modal" onClick={() => {
          setShowModal(false);
          setEditingContent(null);
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingContent ? '콘텐츠 수정' : `${selectedDate.format('YYYY년 MM월 DD일')} 콘텐츠 추가`}</h2>
              <button 
                className="close-button"
                onClick={() => {
                  setShowModal(false);
                  setEditingContent(null);
                }}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={handleAddContent}>
                <div className="form-group">
                  <label className="form-label">플랫폼</label>
                  <select
                    className="platform-select"
                    value={newContent.platform}
                    onChange={(e) => {
                      setNewContent({
                        ...newContent,
                        platform: e.target.value,
                        accountName: ''
                      });
                    }}
                  >
                    <option value="instagram">Instagram</option>
                    <option value="youtube">YouTube</option>
                    <option value="tiktok">TikTok</option>
                  </select>
                </div>

                <div className="form-group">
                  <div className="account-section">
                    <div className="account-header">
                      <label className="form-label">계정</label>
                      {!showAccountInput && (
                        <button
                          type="button"
                          className="add-account-button"
                          onClick={() => setShowAccountInput(true)}
                        >
                          + 새 계정 추가
                        </button>
                      )}
                    </div>
                    
                    {!showAccountInput ? (
                      <select
                        className="account-select"
                        value={newContent.accountName}
                        onChange={(e) => setNewContent({...newContent, accountName: e.target.value})}
                      >
                        <option value="">계정 선택</option>
                        {getFilteredAccounts().map(account => (
                          <option key={account.id} value={account.name}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="새 계정명 입력"
                          value={newAccount}
                          onChange={(e) => setNewAccount(e.target.value)}
                        />
                        <div className="modal-footer" style={{ marginTop: '12px', padding: '0' }}>
                          <button
                            type="button"
                            className="cancel-button"
                            onClick={() => setShowAccountInput(false)}
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            className="submit-button"
                            onClick={handleAddAccount}
                          >
                            추가
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">언어</label>
                  <div className="lang-btns">
                    <button 
                      type="button"
                      className={`lang-btn ${isKorean ? 'selected' : ''}`}
                      onClick={() => {
                        setIsKorean(true);
                        setNewContent({...newContent, isKorean: true});
                      }}
                    >
                      🇰🇷 한국어
                    </button>
                    <button 
                      type="button"
                      className={`lang-btn ${!isKorean ? 'selected' : ''}`}
                      onClick={() => {
                        setIsKorean(false);
                        setNewContent({...newContent, isKorean: false});
                      }}
                    >
                      🇺🇸 English
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">콘텐츠 제목</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="콘텐츠 제목을 입력하세요"
                    value={newContent.title}
                    onChange={(e) => setNewContent({...newContent, title: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">콘텐츠 링크</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="콘텐츠 링크를 입력하세요"
                    value={newContent.link}
                    onChange={(e) => setNewContent({...newContent, link: e.target.value})}
                  />
                </div>
              </form>
            </div>

            <div className="modal-footer">
              <button 
                type="button"
                className="cancel-button"
                onClick={() => {
                  setShowModal(false);
                  setEditingContent(null);
                }}
              >
                취소
              </button>
              <button 
                type="button"
                className="submit-button"
                onClick={handleAddContent}
              >
                {editingContent ? '수정하기' : '추가하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="data-table">
        <div className="table-header">
          <h2>전체 콘텐츠 목록</h2>
          <div className="filters">
            <select
              value={filters.platform}
              onChange={(e) => setFilters({...filters, platform: e.target.value})}
            >
              <option value="">모든 플랫폼</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
            </select>
            <select
              value={filters.account}
              onChange={(e) => setFilters({...filters, account: e.target.value})}
            >
              <option value="">모든 계정</option>
              {accounts.map(account => (
                <option key={account.id} value={account.name}>{account.name}</option>
              ))}
            </select>
            <select
              value={filters.language}
              onChange={(e) => setFilters({...filters, language: e.target.value})}
            >
              <option value="">모든 언어</option>
              <option value="korean">한국어</option>
              <option value="english">영어</option>
            </select>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
            >
              <option value="all">전체 기간</option>
              <option value="today">오늘</option>
              <option value="yesterday">어제</option>
              <option value="week">최근 1주일</option>
              <option value="month">최근 1개월</option>
              <option value="year">최근 1년</option>
            </select>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
                날짜 {getSortIcon('date')}
              </th>
              <th onClick={() => handleSort('platform')} style={{ cursor: 'pointer' }}>
                플랫폼 {getSortIcon('platform')}
              </th>
              <th onClick={() => handleSort('accountName')} style={{ cursor: 'pointer' }}>
                계정 {getSortIcon('accountName')}
              </th>
              <th onClick={() => handleSort('isKorean')} style={{ cursor: 'pointer' }}>
                언어 {getSortIcon('isKorean')}
              </th>
              <th onClick={() => handleSort('title')} style={{ cursor: 'pointer' }}>
                제목 {getSortIcon('title')}
              </th>
              <th>링크</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {filteredContents.map((content, index) => (
              <tr key={index}>
                <td>{moment(content.date).format('YYYY-MM-DD')}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="dot-indicator" style={{ backgroundColor: accountColors[`${content.platform}-${content.accountName}`] || generateRandomColor(content.platform, content.accountName) }} />
                    {content.accountName}
                  </div>
                </td>
                <td>{content.isKorean ? '한국어' : '영어'}</td>
                <td>{content.title}</td>
                <td>
                  <a href={content.link} target="_blank" rel="noopener noreferrer">
                    보기
                  </a>
                </td>
                <td>
                  <div className="action-button-group">
                    <button onClick={() => handleEditContent(content)}>
                      수정
                    </button>
                    <button 
                      className="delete"
                      onClick={() => handleDeleteContent(content.id)}
                      title="삭제"
                    >
                      ×
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="content-list">
        <h2>{selectedDate.format('YYYY년 MM월 DD일')} 콘텐츠</h2>
        {getSelectedDateContents().map((content, index) => (
          <div key={index} className="content-item">
            <div>
              <div className="platform-badge platform-{content.platform}">
                {content.platform}
              </div>
              <strong>{content.accountName}</strong>
              <p>{content.title}</p>
              <a href={content.link} target="_blank" rel="noopener noreferrer">
                콘텐츠 보기
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="link-export-section">
        <div className="section-header">
          <h2>콘텐츠 링크 모아보기</h2>
          <span className="total-count">
            총 {getFilteredAndSortedContents().length}개의 콘텐츠
          </span>
        </div>
        <div className="date-filter">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="시작 날짜"
          />
          <span>~</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="종료 날짜"
          />
        </div>
        <div className="select-all">
          <input
            type="checkbox"
            id="select-all"
            checked={isAllSelected()}
            onChange={(e) => handleSelectAll(e.target.checked)}
          />
          <label htmlFor="select-all">전체 선택</label>
        </div>
        <div className="link-list">
          {getFilteredAndSortedContents().map((content) => (
            <div key={content.id} className="link-item">
              <input
                type="checkbox"
                className="checkbox"
                checked={selectedLinks.has(content.id)}
                onChange={() => handleLinkSelect(content.id)}
              />
              <span className="date">{moment(content.date).format('YYYY-MM-DD')}</span>
              <a 
                className="link"
                href={content.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                {content.link}
              </a>
            </div>
          ))}
        </div>
        <button
          className="copy-button"
          onClick={handleCopyLinks}
          disabled={selectedLinks.size === 0}
        >
          선택한 링크 복사하기 ({selectedLinks.size}개)
        </button>
      </div>
    </div>
  );
};

export default ContentsManagement; 