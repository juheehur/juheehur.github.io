import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { db } from '../firebase/config';
import { collection, query, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import moment from 'moment';

const Container = styled.div`
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;

  h1 {
    color: #333;
    margin: 0;
  }
`;

const BackButton = styled.button`
  background: #1a73e8;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background: #1557b0;
  }
`;

const Workspace = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 20px;
`;

const Section = styled.div`
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  min-height: 600px;

  h2 {
    color: #333;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 18px;
  }
`;

const AddButton = styled.button`
  background: transparent;
  color: #1a73e8;
  border: 1px solid #1a73e8;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  
  &:hover {
    background: #1a73e8;
    color: white;
  }
`;

const NoteGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  padding: 10px;
`;

const Note = styled.div`
  background: ${props => props.color || '#fff'};
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }

  .date {
    font-size: 12px;
    color: #666;
    margin-bottom: 8px;
  }

  .content {
    font-size: 14px;
    color: #333;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .actions {
    position: absolute;
    top: 8px;
    right: 8px;
    display: none;
  }

  &:hover .actions {
    display: flex;
    gap: 4px;
  }
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 4px;
  font-size: 16px;

  &:hover {
    color: #333;
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
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  position: relative;

  h3 {
    margin-bottom: 15px;
  }

  textarea {
    width: 100%;
    height: 150px;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-bottom: 15px;
    resize: vertical;
  }

  .color-picker {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;

    .color-option {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid transparent;

      &.selected {
        border-color: #1a73e8;
      }
    }
  }

  .buttons {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }
`;

const QuickInputForm = styled.form`
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 20px;

  .input-wrapper {
    position: relative;
    margin-bottom: 12px;

    &:last-of-type {
      margin-bottom: 16px;
    }

    .icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #666;
      font-size: 16px;
      pointer-events: none;
    }

    input {
      width: 100%;
      padding: 10px 12px 10px 36px;
      border: 1px solid #e1e1e1;
      border-radius: 4px;
      font-size: 14px;
      transition: all 0.2s;
      
      &:focus {
        outline: none;
        border-color: #1a73e8;
        box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
      }

      &::placeholder {
        color: #999;
      }
    }
  }

  .submit-button {
    display: block;
    margin-left: auto;
    padding: 8px 16px;
    background: #1a73e8;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #1557b0;
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
    }
  }
`;

const MusicNote = styled(Note)`
  background: white;
  padding: 16px;
  border-left: 3px solid #1a73e8;
  margin-bottom: 12px;
  
  .content {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 8px;

    .icon {
      color: #1a73e8;
      font-size: 16px;
      flex-shrink: 0;
    }

    .text {
      font-size: 14px;
      color: #333;
      font-weight: 500;
      line-height: 1.4;
    }
  }

  .mood {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: 24px;
    
    .icon {
      color: #666;
      font-size: 14px;
    }

    .text {
      font-size: 13px;
      color: #666;
    }
  }

  .actions {
    position: absolute;
    top: 12px;
    right: 12px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover {
    border-left-color: #1557b0;
    
    .actions {
      opacity: 1;
    }
  }
`;

const ReelsIdeaSpace = () => {
  const navigate = useNavigate();
  const [scripts, setScripts] = useState([]);
  const [insights, setInsights] = useState([]);
  const [bgmusic, setBgmusic] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [editingId, setEditingId] = useState(null);
  const [newBgMusic, setNewBgMusic] = useState({ title: '', mood: '' });
  const [checkedScripts, setCheckedScripts] = useState(new Set());

  const colors = ['#ffffff', '#fff8dc', '#f0fff0', '#f0f8ff', '#ffe4e1', '#e6e6fa'];

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const scriptsSnapshot = await getDocs(collection(db, 'reelsScripts'));
      const insightsSnapshot = await getDocs(collection(db, 'reelsInsights'));
      const bgmusicSnapshot = await getDocs(collection(db, 'reelsBgmusic'));

      setScripts(scriptsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));

      setInsights(insightsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));

      setBgmusic(bgmusicSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (error) {
      console.error('Error fetching notes:', error);
      alert('노트를 불러오는데 실패했습니다.');
    }
  };

  const handleAddNote = (type) => {
    setModalType(type);
    setModalContent('');
    setSelectedColor('#ffffff');
    setEditingId(null);
    setShowModal(true);
  };

  const handleEditNote = (note, type) => {
    setModalType(type);
    setModalContent(note.content);
    setSelectedColor(note.color || '#ffffff');
    setEditingId(note.id);
    setShowModal(true);
  };

  const handleSaveNote = async () => {
    if (!modalContent.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }

    try {
      const collectionName = modalType === 'script' ? 'reelsScripts' : modalType === 'insight' ? 'reelsInsights' : 'reelsBgmusic';
      const noteData = {
        content: modalContent,
        color: selectedColor,
        createdAt: editingId ? undefined : new Date(),
        updatedAt: new Date()
      };

      if (editingId) {
        await updateDoc(doc(db, collectionName, editingId), noteData);
      } else {
        await addDoc(collection(db, collectionName), noteData);
      }

      fetchNotes();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving note:', error);
      alert('노트 저장에 실패했습니다.');
    }
  };

  const handleDirectDelete = async (id, type) => {
    try {
      const collectionName = type === 'script' ? 'reelsScripts' : type === 'insight' ? 'reelsInsights' : 'reelsBgmusic';
      await deleteDoc(doc(db, collectionName, id));
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('노트 삭제에 실패했습니다.');
    }
  };

  const handleQuickAddMusic = async (e) => {
    e.preventDefault();
    if (!newBgMusic.title.trim()) return;

    try {
      await addDoc(collection(db, 'reelsBgmusic'), {
        content: newBgMusic.title.trim(),
        mood: newBgMusic.mood.trim(),
        color: '#ffffff',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      setNewBgMusic({ title: '', mood: '' });
      fetchNotes();
    } catch (error) {
      console.error('Error adding background music:', error);
      alert('배경음악 추가에 실패했습니다.');
    }
  };

  const toggleScriptCheck = (scriptId) => {
    setCheckedScripts(prev => {
      const newChecked = new Set(prev);
      if (newChecked.has(scriptId)) {
        newChecked.delete(scriptId);
      } else {
        newChecked.add(scriptId);
      }
      return newChecked;
    });
  };

  const getCheckedScripts = () => {
    return scripts.filter(script => checkedScripts.has(script.id));
  };

  return (
    <Container>
      <Header>
        <h1>릴스 아이디어 공간</h1>
        <BackButton onClick={() => navigate('/admin/contents')}>
          콘텐츠 관리로 돌아가기
        </BackButton>
        <button onClick={() => setScripts(getCheckedScripts())}>
          체크된 대본 보기
        </button>
      </Header>

      <Workspace>
        <Section>
          <h2>
            릴스 대본 아이디어
            <AddButton onClick={() => handleAddNote('script')}>+ 새 대본</AddButton>
          </h2>
          <NoteGrid>
            {scripts.sort((a, b) => {
              const aChecked = checkedScripts.has(a.id);
              const bChecked = checkedScripts.has(b.id);
              if (aChecked && !bChecked) return 1;
              if (!aChecked && bChecked) return -1;
              return b.createdAt?.toDate() - a.createdAt?.toDate();
            }).map(script => (
              <Note key={script.id} color={script.color}>
                <input 
                  type="checkbox" 
                  checked={checkedScripts.has(script.id)} 
                  onChange={() => toggleScriptCheck(script.id)}
                />
                <div className="date">
                  {moment(script.createdAt?.toDate()).format('YYYY-MM-DD HH:mm')}
                </div>
                <div className="content">{script.content}</div>
                <div className="actions">
                  <ActionButton onClick={() => handleEditNote(script, 'script')}>✎</ActionButton>
                  <ActionButton onClick={() => handleDirectDelete(script.id, 'script')}>×</ActionButton>
                </div>
              </Note>
            ))}
          </NoteGrid>
        </Section>

        <Section>
          <h2>
            인사이트 & 아이디어
            <AddButton onClick={() => handleAddNote('insight')}>+ 새 인사이트</AddButton>
          </h2>
          <NoteGrid>
            {insights.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate()).map(insight => (
              <Note key={insight.id} color={insight.color}>
                <div className="date">
                  {moment(insight.createdAt?.toDate()).format('YYYY-MM-DD HH:mm')}
                </div>
                <div className="content">{insight.content}</div>
                <div className="actions">
                  <ActionButton onClick={() => handleEditNote(insight, 'insight')}>✎</ActionButton>
                  <ActionButton onClick={() => handleDirectDelete(insight.id, 'insight')}>×</ActionButton>
                </div>
              </Note>
            ))}
          </NoteGrid>
        </Section>

        <Section>
          <h2>배경음악 목록</h2>
          <QuickInputForm onSubmit={handleQuickAddMusic}>
            <div className="input-wrapper">
              <span className="icon">🎵</span>
              <input
                type="text"
                name="title"
                value={newBgMusic.title}
                onChange={(e) => setNewBgMusic(prev => ({ ...prev, title: e.target.value }))}
                placeholder="배경음악 제목을 입력하세요"
              />
            </div>
            <div className="input-wrapper">
              <span className="icon">✨</span>
              <input
                type="text"
                name="mood"
                value={newBgMusic.mood}
                onChange={(e) => setNewBgMusic(prev => ({ ...prev, mood: e.target.value }))}
                placeholder="분위기나 느낌을 입력하세요 (선택사항)"
              />
            </div>
            <button type="submit" className="submit-button">
              추가
            </button>
          </QuickInputForm>
          <NoteGrid>
            {bgmusic.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate()).map(music => (
              <MusicNote key={music.id}>
                <div className="content">
                  <span className="icon">🎵</span>
                  <span className="text">{music.content}</span>
                </div>
                {music.mood && (
                  <div className="mood">
                    <span className="icon">✨</span>
                    <span className="text">{music.mood}</span>
                  </div>
                )}
                <div className="actions">
                  <ActionButton onClick={() => handleDirectDelete(music.id, 'bgmusic')}>×</ActionButton>
                </div>
              </MusicNote>
            ))}
          </NoteGrid>
        </Section>
      </Workspace>

      {showModal && (
        <Modal onClick={() => setShowModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <h3>
              {modalType === 'script' ? '릴스 대본' : 
               modalType === 'insight' ? '인사이트' : 
               '배경음악'} {editingId ? '수정' : '추가'}
            </h3>
            <textarea
              value={modalContent}
              onChange={(e) => setModalContent(e.target.value)}
              placeholder={
                modalType === 'script' ? '대본 내용을 입력하세요...' : 
                modalType === 'insight' ? '인사이트를 입력하세요...' :
                '배경음악 제목을 입력하세요...'
              }
            />
            <div className="color-picker">
              {colors.map(color => (
                <div
                  key={color}
                  className={`color-option ${color === selectedColor ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
            <div className="buttons">
              <BackButton onClick={() => setShowModal(false)}>취소</BackButton>
              <AddButton onClick={handleSaveNote}>저장</AddButton>
            </div>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
};

export default ReelsIdeaSpace; 