import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, ADMIN_EMAILS } from '../firebase/config';

export function useAuth() {
  const [user, authLoading] = useAuthState(auth);
  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    let unsubscribed = false;

    const checkAndCreateUserRole = async () => {
      if (!user) {
        setRole(null);
        return;
      }

      try {
        // Immediately set role based on email for faster UI response
        const quickRole = ADMIN_EMAILS.includes(user.email) ? 'admin' : 'visitor';
        setRole(quickRole);

        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (!unsubscribed) {
          if (!userDoc.exists()) {
            await setDoc(userRef, {
              email: user.email,
              displayName: user.displayName || '',
              role: quickRole,
              createdAt: new Date().toISOString()
            });
          } else if (userDoc.data().role !== quickRole) {
            await setDoc(userRef, { role: quickRole }, { merge: true });
          }
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      }
    };

    checkAndCreateUserRole();

    return () => {
      unsubscribed = true;
    };
  }, [user]);

  return {
    user,
    role,
    isAdmin: role === 'admin',
    isVisitor: role === 'visitor',
    loading: authLoading || (!role && !!user)
  };
} 