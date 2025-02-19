import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

function Profile() {
  const { user, role } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setDisplayName(userData.displayName || user.displayName || '');
          setBio(userData.bio || '');
        }
      } catch (error) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        bio,
        updatedAt: new Date().toISOString()
      });
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="profile-loading">Loading...</div>;

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>My Profile</h2>
        {!isEditing && (
          <button 
            className="edit-button"
            onClick={() => setIsEditing(true)}
          >
            Edit Profile
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {isEditing ? (
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label>Display Name:</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Bio:</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows="4"
              placeholder="Tell us about yourself..."
            />
          </div>
          <div className="profile-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button 
              type="button" 
              onClick={() => setIsEditing(false)}
              className="cancel-button"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="profile-info">
          <div className="info-group">
            <label>Email:</label>
            <p>{user.email}</p>
          </div>
          <div className="info-group">
            <label>Display Name:</label>
            <p>{displayName || 'Not set'}</p>
          </div>
          <div className="info-group">
            <label>Bio:</label>
            <p>{bio || 'No bio yet'}</p>
          </div>
          <div className="info-group">
            <label>Role:</label>
            <p className={`role ${role}`}>{role}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile; 