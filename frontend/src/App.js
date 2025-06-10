import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { Provider } from 'react-redux';
import store from './redux/store';

import GameProvider from './contexts/GameContext';
import RegisterLogin from './components/RegisterLogin/RegisterLogin';
import Lobby from './components/Lobby';
import FarmPage from './pages/FarmPage';
import EggsPage from './pages/EggsPage';
import IncubatorPage from './pages/IncubatorPage';
import MarketPage from './pages/MarketPage';
import PromotionsPage from './pages/PromotionsPage';
import ReferralTreePage from './pages/ReferralTreePage';
import ShopPage from './pages/ShopPage';
import ChicksPage from './pages/ChicksPage';
import MyEggsPage from './pages/MyEggsPage';
import ReferralPage from './pages/ReferralPage';
import './index.css';

function AuthGuard() {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/register');
      } else {
        try {
          await user.getIdTokenResult(); // ตรวจสอบว่า token ยัง valid
        } catch (err) {
          console.warn('Token ไม่ valid หรือ user ถูกลบ → logout');
          await auth.signOut();
          navigate('/register');
        }
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  return null; // component นี้ไม่มี UI — ใช้เพื่อเฝ้าระวัง auth เท่านั้น
}

export default function App() {
  return (
    <Provider store={store}>
      <GameProvider>
        <Router>
          <AuthGuard /> {/* ตรวจสอบสถานะ login ทุกหน้า */}
          <Routes>
            <Route path="/" element={<Lobby />} />
            <Route path="/login" element={<RegisterLogin />} />
            <Route path="/register" element={<RegisterLogin />} />
            <Route path="/farm" element={<FarmPage />} />
            <Route path="/eggs" element={<EggsPage />} />
            <Route path="/incubator" element={<IncubatorPage />} />
            <Route path="/market" element={<MarketPage />} />
            <Route path="/promotions" element={<PromotionsPage />} />
            <Route path="/referrals" element={<ReferralTreePage />} />
            <Route path="/chicks" element={<ChicksPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/my-eggs" element={<MyEggsPage />} />
            <Route path="/referral" element={<ReferralPage />} />
          </Routes>
        </Router>
      </GameProvider>
    </Provider>
  );
} 