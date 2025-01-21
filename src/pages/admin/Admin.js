import styled from 'styled-components';

// 버튼 컴포넌트 수정
const StyledButton = styled.button`
  background: ${props => props.$isActive ? '#0071e3' : 'transparent'};
  color: ${props => props.$isActive ? '#ffffff' : '#374151'};
  border: 1px solid ${props => props.$isActive ? '#0071e3' : '#d1d5db'};
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.95rem;
  font-weight: 500;

  &:hover {
    background: ${props => props.$isActive ? '#0077ed' : '#f3f4f6'};
  }
`;

// 삭제 버튼 컴포넌트
const DeleteButton = styled.button`
  background: transparent;
  color: #dc2626;
  border: 1px solid #dc2626;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.95rem;
  font-weight: 500;

  &:hover {
    background: #fee2e2;
  }
`;

// 버튼 사용 부분 수정
<StyledButton
  $isActive={activeTab === 'projects'}
  onClick={() => setActiveTab('projects')}
>
  Projects
</StyledButton>

// 삭제 버튼 사용 부분
<DeleteButton
  onClick={handleDelete}
  aria-label="Delete item"
>
  Delete
</DeleteButton> 