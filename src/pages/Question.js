import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/config';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 680px;
  margin: 0 auto;
  padding: 20px;
  background: #ffffff;
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const QuestionCard = styled.div`
  background: white;
  border-radius: 14px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);

  @media (max-width: 768px) {
    border-radius: 10px;
    margin-bottom: 16px;
  }
`;

const QuestionHeader = styled.div`
  padding: 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
`;

const ProfileImage = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #007AFF;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  margin-right: 12px;
  font-size: 15px;
`;

const QuestionContent = styled.div`
  padding: 16px;
`;

const QuestionTitle = styled.h1`
  font-size: 17px;
  font-weight: 600;
  margin: 0;
  margin-bottom: 4px;
  color: #000000;
  letter-spacing: -0.2px;
`;

const QuestionMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #8E8E8E;
  font-weight: 400;
`;

const QuestionDescription = styled.p`
  font-size: 15px;
  line-height: 1.5;
  margin: 0;
  color: #262626;
  font-weight: 400;
  letter-spacing: -0.1px;
`;

const CommentSection = styled.div`
  padding: 16px;
  background: #FAFAFA;
  border-radius: 0 0 14px 14px;
  font-size：16px;
`;

const CommentForm = styled.form`
  display: flex;
  padding: 12px 16px;
  background: white;
  border: 1px solid #DBDBDB;
  border-radius: 24px;
  margin-bottom: 20px;
  align-items: center;

  &:focus-within {
    border-color: #007AFF;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    padding: 12px;
    gap: 8px;
    border-radius: 16px;
  }
`;

const CommentInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  padding: 4px 8px;
  background: transparent;
  &::placeholder {
    color: #8E8E8E;
  }

  @media (max-width: 768px) {
    width: 100%;
    padding: 8px;
  }
`;

const NameInput = styled(CommentInput)`
  max-width: 120px;
  border-right: 1px solid #DBDBDB;
  margin-right: 8px;
  padding-right: 8px;

  @media (max-width: 768px) {
    max-width: 100%;
    border-right: none;
    border-bottom: 1px solid #DBDBDB;
    margin-right: 0;
    padding-right: 0;
    padding-bottom: 8px;
    margin-bottom: 8px;
  }
`;

const PostButton = styled.button`
  border: none;
  background: none;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  color: ${props => props.disabled ? '#8E8E8E' : '#0095F6'};
  transition: all 0.2s ease;
  border-radius: 8px;
  margin-left: 4px;

  ${props => !props.disabled && `
    &:hover {
      color: #00376B;
    }
    &:active {
      transform: scale(0.98);
    }
  `}

  &:disabled {
    cursor: default;
  }

  @media (max-width: 768px) {
    width: 100%;
    background: ${props => props.disabled ? '#F0F0F0' : '#0095F6'};
    color: ${props => props.disabled ? '#8E8E8E' : 'white'};
    padding: 12px;
    border-radius: 8px;
    margin-left: 0;
  }
`;

const CommentList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 8px 0;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

// 포스트잇 색상 배열 (단일 파란색으로 변경)
const postItColors = [
  '#0064FF',  // 모든 포스트잇에 동일한 파란색 적용
];

const Comment = styled.div`
  background: #0064FF;
  padding: 20px;
  border-radius: 16px;
  position: relative;
  box-shadow: 0 8px 20px rgba(0, 100, 255, 0.15);
  transform: rotate(${props => props.rotate}deg);
  transition: all 0.2s ease;
  border: none;

  &:hover {
    transform: rotate(0deg) translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 100, 255, 0.2);
  }

  &::before {
    content: '';
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px 3px 0 0;
  }

  @media (max-width: 768px) {
    padding: 16px;
    transform: none;
    
    &:hover {
      transform: translateY(-2px);
    }
  }
`;

const CommentContent = styled.div`
  position: relative;
`;

const CommentText = styled.p`
  font-size: 15px;
  line-height: 1.5;
  margin: 0;
  margin-bottom: 12px;
  color: white;
  font-weight: 500;
  letter-spacing: -0.2px;
`;

const CommentAuthor = styled.span`
  display: block;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 8px;
  font-weight: 600;
`;

const CommentTime = styled.span`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  display: block;
  text-align: right;
`;

const NoComments = styled.div`
  padding: 32px;
  text-align: center;
  color: #8E8E8E;
  font-size: 15px;
  background: white;
  border-radius: 16px;
  border: 1px solid #DBDBDB;
  grid-column: 1 / -1;
  font-weight: 400;
`;

function Question() {
  const { id } = useParams();
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        const docRef = doc(db, 'questions', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setQuestion({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError('질문을 찾을 수 없습니다');
        }
      } catch (err) {
        console.error('Error fetching question:', err);
        setError('질문을 불러오는데 실패했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestion();
  }, [id]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const comment = {
        content: newComment,
        author: authorName.trim() || '익명',
        createdAt: new Date().toISOString(),
        rotate: Math.random() * 6 - 3,
      };

      const questionRef = doc(db, 'questions', id);
      await updateDoc(questionRef, {
        comments: arrayUnion(comment)
      });

      setQuestion(prev => ({
        ...prev,
        comments: [...prev.comments, comment]
      }));
      setNewComment('');
      setAuthorName('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('답변 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 1) return '방금 전';
    if (diffMinutes < 60) return `${diffMinutes}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  if (loading) return <div>로딩중...</div>;
  if (error) return <div>{error}</div>;
  if (!question) return <div>질문을 찾을 수 없습니다</div>;

  return (
    <Container>
      <QuestionCard>
        <QuestionHeader>
          <ProfileImage>Q</ProfileImage>
          <div>
            <QuestionTitle>{question.title}</QuestionTitle>
            <QuestionMeta>
              <span>{formatDate(question.createdAt)}</span>
              <span>•</span>
              <span>{question.comments?.length || 0}개의 답변</span>
            </QuestionMeta>
          </div>
        </QuestionHeader>

        <QuestionContent>
          <QuestionDescription>{question.description}</QuestionDescription>
        </QuestionContent>

        <CommentSection>
          <CommentForm onSubmit={handleSubmitComment}>
            <NameInput
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="이름 (선택사항)"
              disabled={submitting}
            />
            <CommentInput
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="답변을 입력하세요..."
              disabled={submitting}
            />
            <PostButton type="submit" disabled={!newComment.trim() || submitting}>
              {submitting ? '게시중...' : '게시'}
            </PostButton>
          </CommentForm>

          <CommentList>
            {question.comments.length === 0 ? (
              <NoComments>
                아직 답변이 없습니다. 첫 번째 답변을 작성해보세요! ✍️
              </NoComments>
            ) : (
              question.comments.map((comment, index) => (
                <Comment 
                  key={index}
                  color={comment.color || postItColors[index % postItColors.length]}
                  rotate={comment.rotate || (Math.random() * 6 - 3)}
                >
                  <CommentContent>
                    <CommentAuthor>{comment.author}</CommentAuthor>
                    <CommentText>{comment.content}</CommentText>
                    <CommentTime>{formatDate(comment.createdAt)}</CommentTime>
                  </CommentContent>
                </Comment>
              ))
            )}
          </CommentList>
        </CommentSection>
      </QuestionCard>
    </Container>
  );
}

export default Question; 