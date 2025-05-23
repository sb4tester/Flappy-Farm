
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Lobby from './components/Lobby';
import Login from './components/RegisterLogin/RegisterLogin';
import { GameProvider } from './contexts/GameContext';
import './index.css';

function App() {
  return (
    <GameProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </Router>
    </GameProvider>
  );
}

export default App;
