import { getAuth } from 'firebase/auth';

// Utility functions for secure user data handling
export const secureStorage = {
  setUserData: (userData) => {
    const { displayName, email, uid, photoURL } = userData;
    const secureData = {
      displayName,
      email,
      uid,
      photoURL,
      lastLogin: new Date().toISOString()
    };
    localStorage.setItem('userInfo', JSON.stringify(secureData));
  },
  
  getUserData: () => {
    const data = localStorage.getItem('userInfo');
    return data ? JSON.parse(data) : null;
  },
  
  clearUserData: () => {
    localStorage.removeItem('userInfo');
  }
};

export const handleLogout = async () => {
  const auth = getAuth();
  try {
    // Sign out from Firebase
    await auth.signOut();
    
    // Clear user data from local storage
    secureStorage.clearUserData();
    
    // Clear any other auth-related items that might be in localStorage
    localStorage.removeItem('emailForSignIn');
    localStorage.removeItem('nameForSignIn');
    
    return true;
  } catch (error) {
    console.error('Error during logout:', error);
    throw error;
  }
};