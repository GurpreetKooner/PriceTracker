import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';

// Firebase config remains the same
const firebaseConfig = {
  apiKey: "AIzaSyBX91zM1ZemglUDrCJ6xTmDdt3dNf4YEVc",
  authDomain: "pricetracker-dddd9.firebaseapp.com",
  projectId: "pricetracker-dddd9",
  storageBucket: "pricetracker-dddd9.firebasestorage.app",
  messagingSenderId: "696305152216",
  appId: "1:696305152216:web:92248274beae14c57327ad",
  measurementId: "G-PWE2295ZQB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const actionCodeSettings = {
  url: window.location.origin + '/finishSignIn',
  handleCodeInApp: true,
};

// Add the API endpoint
const USER_API_ENDPOINT = 'https://us-central1-macro-authority-435423-t4.cloudfunctions.net/user_info';

// Function to store user data in the database
const storeUserInDatabase = async (userData) => {
  try {
    const response = await fetch(USER_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_email: userData.email,
        user_name: userData.displayName
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to store user data in database');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error storing user data:', error);
    throw error;
  }
};

// Utility functions for secure user data handling
const secureStorage = {
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

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userData = secureStorage.getUserData();
        if (userData && userData.uid === user.uid) {
          navigate('/main');
        }
      }
    });

    // Check for email link sign-in
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let emailFromStorage = window.localStorage.getItem('emailForSignIn');
      let nameFromStorage = window.localStorage.getItem('nameForSignIn');
      
      if (!emailFromStorage) {
        emailFromStorage = window.prompt('Please provide your email for confirmation');
        nameFromStorage = window.prompt('Please enter your name');
      }

      signInWithEmailLink(auth, emailFromStorage, window.location.href)
        .then(async (result) => {
          await updateProfile(result.user, {
            displayName: nameFromStorage
          });

          const userData = {
            displayName: nameFromStorage,
            email: result.user.email,
            uid: result.user.uid,
            photoURL: result.user.photoURL
          };

          secureStorage.setUserData(userData);

          // Store user data in database
          try {
            await storeUserInDatabase(userData);
          } catch (error) {
            console.error('Failed to store user data in database:', error);
            // Continue with the login flow even if database storage fails
          }

          window.localStorage.removeItem('emailForSignIn');
          window.localStorage.removeItem('nameForSignIn');
          
          console.log('User signed in:', {
            name: nameFromStorage,
            email: result.user.email,
            uid: result.user.uid
          });
          
          navigate('/main');
        })
        .catch((error) => {
          setError('Error signing in with email link: ' + error.message);
        });
    }

    return () => unsubscribe();
  }, [navigate]);

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      window.localStorage.setItem('nameForSignIn', name);
      setEmailSent(true);
      setLoading(false);
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userData = {
        displayName: user.displayName,
        email: user.email,
        uid: user.uid,
        photoURL: user.photoURL
      };

      secureStorage.setUserData(userData);

      // Store user data in database
      try {
        await storeUserInDatabase(userData);
      } catch (error) {
        console.error('Failed to store user data in database:', error);
        // Continue with the login flow even if database storage fails
      }

      console.log('User signed in:', {
        name: user.displayName,
        email: user.email,
        uid: user.uid,
        photoURL: user.photoURL
      });

      navigate('/main');
    } catch (error) {
      setError(error.message);
      console.error('Error during Google sign-in:', error);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="w-1/2 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-2 text-gray-600">Please sign in to continue</p>
          </div>

          <div className="mt-8 space-y-6">
            {error && (
              <div className="text-red-600 bg-red-50 p-3 rounded text-center">
                {error}
              </div>
            )}

            {emailSent ? (
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-green-800">
                  Check your email! We've sent a sign-in link to <strong>{email}</strong>
                </p>
              </div>
            ) : (
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter your name"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Sign-in Link'}
                </button>
              </form>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">Or continue with</span>
              </div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
          </div>
        </div>
      </div>

      {/* Right Side - Information */}
      <div className="w-1/2 bg-blue-600 text-white p-8 flex items-center justify-center">
        <div className="max-w-md space-y-6">
          <h1 className="text-4xl font-bold">Price Tracker</h1>
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold">Track Prices in Real-time</h3>
              <p className="mt-2">Monitor price changes across multiple e-commerce platforms and get instant notifications when prices drop.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold">Save Money</h3>
              <p className="mt-2">Never miss a deal again. Set price alerts and get notified when products reach your target price.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold">Price History</h3>
              <p className="mt-2">View detailed price history charts to make informed buying decisions.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;