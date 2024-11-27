import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './components/Login';
import Main from './components/Main';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/finishSignIn" element={<Login />} /> {/* Same component handles both */}
        <Route path="/main" element={<Main />} />
      </Routes>
    </Router>
  );
};

export default App;