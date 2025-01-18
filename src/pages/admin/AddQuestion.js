import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import styled from 'styled-components';

const FormContainer = styled.div`
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: bold;
`;

const Input = styled.input`
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
`;

const TextArea = styled.textarea`
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-height: 150px;
`;

const Button = styled.button`
  background: #4A90E2;
  color: white;
  border: none;
  padding: 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;

  &:hover {
    background: #357ABD;
  }
`;

function AddQuestion() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const questionData = {
        title,
        description,
        createdAt: new Date().toISOString(),
        comments: [],
        isOpen: true
      };

      const docRef = await addDoc(collection(db, 'questions'), questionData);
      alert('Question created successfully!');
      navigate(`/question/${docRef.id}`);
    } catch (error) {
      console.error('Error adding question:', error);
      alert('Failed to create question. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer>
      <h1>Add New Question</h1>
      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="title">Question Title</Label>
          <Input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Enter your question title"
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="description">Question Description</Label>
          <TextArea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="Provide detailed description of your question"
          />
        </FormGroup>

        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Question'}
        </Button>
      </Form>
    </FormContainer>
  );
}

export default AddQuestion; 