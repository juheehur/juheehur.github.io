import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { db } from '../firebase/config';
import { collection, query, getDocs, addDoc, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import moment from 'moment';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useNavigate } from 'react-router-dom';
import '../styles/contentsManagement.css';

const Container = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
`;

const Header = styled.div`
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h1 {
    color: #333;
    margin-bottom: 10px;
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  padding: 30px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: relative;

  h2 {
    margin-bottom: 20px;
    color: #333;
    font-size: 1.2rem;
  }

  input, select {
    margin: 10px 0;
    padding: 12px;
    width: 100%;
    border: 1px solid #e1e1e1;
    border-radius: 4px;
    font-size: 14px;
    background-color: white;

    &:focus {
      outline: none;
      border-color: #1a73e8;
      box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
    }
  }

  .account-section {
    margin: 10px 0;
    
    .add-account {
      background: none;
      border: none;
      color: #1a73e8;
      padding: 0;
      font-size: 14px;
      cursor: pointer;
      margin-top: 5px;
      width: auto;

      &:hover {
        text-decoration: underline;
        background: none;
      }
    }
  }

  button {
    margin-top: 20px;
    width: 100%;
    padding: 12px;
    background: #1a73e8;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    &:hover {
      background: #1557b0;
    }
  }

  .close-button {
    position: absolute;
    top: 15px;
    right: 15px;
    background: none;
    border: none;
    font-size: 20px;
    color: #666;
    cursor: pointer;
    padding: 5px;
    width: auto;
    margin: 0;

    &:hover {
      color: #333;
      background: none;
    }
  }

  .action-buttons {
    display: flex;
    gap: 10px;
    margin-top: 10px;

    button {
      margin-top: 0;
      flex: 1;

      &.secondary {
        background: #666;
        &:hover {
          background: #555;
        }
      }
    }
  }
`;

const ContentList = styled.div`
  margin-top: 20px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  h2 {
    margin-bottom: 20px;
    color: #333;
    font-size: 1.2rem;
  }

  .content-item {
    padding: 15px;
    border-bottom: 1px solid #e1e1e1;
    display: flex;
    justify-content: space-between;
    align-items: center;

    &:last-child {
      border-bottom: none;
    }

    .platform-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      margin-right: 8px;
    }

    .instagram {
      background: #e1306c;
      color: white;
    }

    .youtube {
      background: #ff0000;
      color: white;
    }

    .tiktok {
      background: #000000;
      color: white;
    }

    a {
      color: #1a73e8;
      text-decoration: none;
      &:hover {
        text-decoration: underline;
      }
    }
  }
`;

const LinkExportSection = styled.div`
  margin-top: 20px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h2 {
      color: #333;
      font-size: 1.2rem;
      margin: 0;
    }

    .total-count {
      color: #666;
      font-size: 0.9rem;
    }
  }

  .date-filter {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
    align-items: center;

    input[type="date"] {
      padding: 8px;
      border: 1px solid #e1e1e1;
      border-radius: 4px;
      font-size: 14px;
    }
  }

  .select-all {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 10px 0;
    padding: 8px;
    background: #f8f9fa;
    border-radius: 4px;

    input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }

    label {
      font-size: 14px;
      color: #333;
      cursor: pointer;
      user-select: none;
    }
  }

  .link-list {
    margin: 20px 0;
    max-height: 400px;
    overflow-y: auto;
  }

  .link-item {
    display: flex;
    align-items: center;
    padding: 8px;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    .checkbox {
      margin-right: 12px;
    }

    .date {
      color: #666;
      font-size: 0.9em;
      margin-right: 12px;
      min-width: 100px;
    }

    .link {
      color: #1a73e8;
      text-decoration: none;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .copy-button {
    background: #1a73e8;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    margin-top: 10px;

    &:hover {
      background: #1557b0;
    }

    &:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  }
`;

const CalendarWrapper = styled.div`
  margin: 20px 0;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  .fc-daygrid-day-events {
    margin-top: 8px !important;
    position: relative;
  }

  .fc-daygrid-day-top {
    flex-direction: row !important;
    margin-bottom: 4px;
    padding: 4px;
    position: relative;
  }

  .fc-daygrid-day-number {
    float: left;
    margin-right: auto;
  }

  .fc-event {
    margin: 2px 0;
    padding: 4px 6px;
  }

  .fc-daygrid-day-frame {
    min-height: 120px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .fc-daygrid-day {
    position: relative;
  }
`;

const PlatformBadge = styled.span`
  display: inline-block;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  margin-right: 4px;
  color: white;
  background-color: ${props => 
    props.platform === 'instagram' ? '#e1306c' :
    props.platform === 'youtube' ? '#ff0000' :
    props.platform === 'tiktok' ? '#000000' : '#1a73e8'
  };
`;

const AddButton = styled.button`
  width: 20px;
  height: 20px;
  border-radius: 10px;
  background: #1a73e8;
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  margin-left: auto;

  &:hover {
    background: #1557b0;
  }

  .fc-daygrid-day:hover & {
    opacity: 1;
  }
`;

const DataTable = styled.div`
  margin-top: 20px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h2 {
      color: #333;
      font-size: 1.2rem;
      margin: 0;
    }
  }

  .filters {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;

    select {
      padding: 8px;
      border: 1px solid #e1e1e1;
      border-radius: 4px;
      background: white;
    }
  }

  table {
    width: 100%;
    border-collapse: collapse;

    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e1e1e1;
    }

    th {
      font-weight: 600;
      color: #666;
      background: #f8f9fa;
    }

    tr:hover {
      background: #f8f9fa;
    }
  }
`;

const LanguageToggle = styled.div`
  display: flex;
  gap: 16px;
  margin: 10px 0;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e1e1e1;

  .radio-group {
    display: flex;
    gap: 20px;
  }

  .radio-option {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  input[type="radio"] {
    width: 16px;
    height: 16px;
    margin: 0;
    cursor: pointer;
  }

  label {
    font-size: 14px;
    color: #333;
    cursor: pointer;
    user-select: none;
  }

  .language-icon {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }
`;

const DotContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  justify-content: flex-start;
  min-height: 16px;
  padding: 4px;
  margin: 4px 0;
`;

const DotIndicator = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.color};
  display: inline-block;
  margin: 0;
  opacity: 1;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin: 20px 0;
`;

const StatCard = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;

  h3 {
    color: #666;
    font-size: 0.9rem;
    margin-bottom: 10px;
  }

  .number {
    font-size: 1.8rem;
    font-weight: 600;
    color: #1a73e8;
  }
`;

const SearchContainer = styled.div`
  margin: 20px 0;
  
  input {
    width: 100%;
    padding: 12px;
    border: 1px solid #e1e1e1;
    border-radius: 4px;
    font-size: 14px;
    
    &:focus {
      outline: none;
      border-color: #1a73e8;
      box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
    }
  }
`;

const AccountLinksContainer = styled.div`
  margin: 20px 0;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  h3 {
    margin-bottom: 15px;
    color: #333;
    font-size: 1rem;
  }

  .accounts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 15px;
  }

  .account-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-decoration: none;
    color: #333;
    padding: 10px;
    border-radius: 8px;
    transition: all 0.2s;

    &:hover {
      background: #f5f5f5;
      transform: translateY(-2px);
    }

    .platform-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
      font-size: 20px;
      color: white;

      &.instagram {
        background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
      }

      &.youtube {
        background: #FF0000;
      }

      &.tiktok {
        background: #000000;
      }
    }

    .account-name {
      font-size: 12px;
      text-align: center;
      color: #666;
      max-width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: #1a73e8;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 14px;
  transition: all 0.2s;

  &:hover {
    text-decoration: underline;
  }

  &.delete {
    color: #dc3545;
    font-size: 16px;
    padding: 4px;
    
    &:hover {
      text-decoration: none;
      opacity: 0.8;
    }
  }
`;

const ActionButtonGroup = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

const CreateButton = styled.button`
  background: #1a73e8;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background: #1557b0;
  }
`;

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
            <AddButton
              onClick={(e) => {
                e.stopPropagation();
                handleDateClick(arg);
                setShowModal(true);
              }}
            >
              +
            </AddButton>
          </div>
          <DotContainer>
            {Object.entries(accountContents).map(([colorKey, data]) => (
              Array(data.count).fill(0).map((_, index) => (
                <DotIndicator 
                  key={`${colorKey}-${index}`} 
                  color={data.color}
                  title={`${data.accountName} (${data.count}개)`}
                />
              ))
            ))}
          </DotContainer>
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
    return contents.filter(content => {
      if (filters.platform && content.platform !== filters.platform) return false;
      if (filters.account && content.accountName !== filters.account) return false;
      if (filters.language && content.isKorean !== (filters.language === 'korean')) return false;
      if (filters.dateRange !== 'all') {
        const contentDate = moment(content.date);
        const today = moment();
        switch (filters.dateRange) {
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
      .filter(content => selectedLinks.has(content.id))
      .sort((a, b) => moment(b.date).diff(moment(a.date)));

    const linkText = filteredContents
      .map(content => content.link)
      .join('\n');

    navigator.clipboard.writeText(linkText).then(() => {
      alert('링크가 클립보드에 복사되었습니다!');
    }).catch(err => {
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
    }
  ];

  return (
    <Container>
      <Header>
        <h1>콘텐츠 관리</h1>
        <CreateButton onClick={() => navigate('/makecontents')}>
          콘텐츠 생성하기
        </CreateButton>
      </Header>

      <StatsContainer>
        <StatCard>
          <h3>전체 콘텐츠</h3>
          <div className="number">{stats.total}</div>
        </StatCard>
        {Object.entries(stats.byPlatform).map(([platform, count]) => (
          <StatCard key={platform}>
            <h3>{platform.toUpperCase()}</h3>
            <div className="number">{count}</div>
          </StatCard>
        ))}
        <StatCard>
          <h3>한국어 콘텐츠</h3>
          <div className="number">{stats.byLanguage.korean}</div>
        </StatCard>
        <StatCard>
          <h3>영어 콘텐츠</h3>
          <div className="number">{stats.byLanguage.english}</div>
        </StatCard>
      </StatsContainer>

      <SearchContainer>
        <input
          type="text"
          placeholder="콘텐츠 검색 (제목 또는 계정명)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </SearchContainer>

      <AccountLinksContainer>
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
      </AccountLinksContainer>

      <CalendarWrapper>
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
      </CalendarWrapper>

      {showModal && (
        <Modal onClick={() => {
          setShowModal(false);
          setEditingContent(null);
        }}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <button className="close-button" onClick={() => {
              setShowModal(false);
              setEditingContent(null);
            }}>×</button>
            <h2>{editingContent ? '콘텐츠 수정' : `${selectedDate.format('YYYY년 MM월 DD일')} 콘텐츠 추가`}</h2>
            <form onSubmit={handleAddContent}>
              <select
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

              <div className="account-section">
                {!showAccountInput ? (
                  <>
                    <select
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
                    <button
                      type="button"
                      className="add-account"
                      onClick={() => setShowAccountInput(true)}
                    >
                      + 새 계정 추가
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="새 계정명 입력"
                      value={newAccount}
                      onChange={(e) => setNewAccount(e.target.value)}
                    />
                    <div className="action-buttons">
                      <button
                        type="button"
                        onClick={handleAddAccount}
                      >
                        추가
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setShowAccountInput(false)}
                      >
                        취소
                      </button>
                    </div>
                  </>
                )}
              </div>

              <LanguageToggle>
                <div className="radio-group">
                  <div className="radio-option">
                    <input
                      type="radio"
                      id="korean"
                      name="language"
                      checked={isKorean}
                      onChange={() => {
                        setIsKorean(true);
                        setNewContent({...newContent, isKorean: true});
                      }}
                    />
                    <label htmlFor="korean">
                      🇰🇷 한국어
                    </label>
                  </div>
                  <div className="radio-option">
                    <input
                      type="radio"
                      id="english"
                      name="language"
                      checked={!isKorean}
                      onChange={() => {
                        setIsKorean(false);
                        setNewContent({...newContent, isKorean: false});
                      }}
                    />
                    <label htmlFor="english">
                      🇺🇸 English
                    </label>
                  </div>
                </div>
              </LanguageToggle>

              <input
                type="text"
                placeholder="콘텐츠 제목"
                value={newContent.title}
                onChange={(e) => setNewContent({...newContent, title: e.target.value})}
              />
              <input
                type="text"
                placeholder="콘텐츠 링크"
                value={newContent.link}
                onChange={(e) => setNewContent({...newContent, link: e.target.value})}
              />
              <button type="submit">
                {editingContent ? '수정하기' : '추가하기'}
              </button>
            </form>
          </ModalContent>
        </Modal>
      )}

      <DataTable>
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
              <option value="week">최근 1주일</option>
              <option value="month">최근 1개월</option>
              <option value="year">최근 1년</option>
            </select>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>날짜</th>
              <th>플랫폼</th>
              <th>계정</th>
              <th>언어</th>
              <th>제목</th>
              <th>링크</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {filteredContents.map((content, index) => (
              <tr key={index}>
                <td>{moment(content.date).format('YYYY-MM-DD')}</td>
                <td>
                  <PlatformBadge platform={content.platform}>
                    {content.platform}
                  </PlatformBadge>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DotIndicator color={accountColors[`${content.platform}-${content.accountName}`] || generateRandomColor(content.platform, content.accountName)} />
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
                  <ActionButtonGroup>
                    <ActionButton onClick={() => handleEditContent(content)}>
                      수정
                    </ActionButton>
                    <ActionButton 
                      className="delete"
                      onClick={() => handleDeleteContent(content.id)}
                      title="삭제"
                    >
                      ×
                    </ActionButton>
                  </ActionButtonGroup>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTable>

      <ContentList>
        <h2>{selectedDate.format('YYYY년 MM월 DD일')} 콘텐츠</h2>
        {getSelectedDateContents().map((content, index) => (
          <div key={index} className="content-item">
            <div>
              <PlatformBadge platform={content.platform}>
                {content.platform}
              </PlatformBadge>
              <strong>{content.accountName}</strong>
              <p>{content.title}</p>
              <a href={content.link} target="_blank" rel="noopener noreferrer">
                콘텐츠 보기
              </a>
            </div>
          </div>
        ))}
      </ContentList>

      <LinkExportSection>
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
      </LinkExportSection>
    </Container>
  );
};

export default ContentsManagement; 