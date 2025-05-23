import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import GameProvider from './contexts/GameContext';
import Lobby from './components/Lobby';
import FarmPage from './pages/FarmPage';
import EggsPage from './pages/EggsPage';
import IncubatorPage from './pages/IncubatorPage';
import MarketPage from './pages/MarketPage';
import PromotionsPage from './pages/PromotionsPage';
import ReferralTreePage from './pages/ReferralTreePage';

export default function App() {
  return (
    <GameProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/farm" element={<FarmPage />} />
          <Route path="/eggs" element={<EggsPage />} />
          <Route path="/incubator" element={<IncubatorPage />} />
          <Route path="/market" element={<MarketPage />} />
          <Route path="/promotions" element={<PromotionsPage />} />
          <Route path="/referrals" element={<ReferralTreePage />} />
        </Routes>
      </Router>
    </GameProvider>
  );
}
