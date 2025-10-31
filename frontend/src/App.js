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
import IncubatorPage from './pages/IncubatorPage';
import ShopPage from './pages/ShopPage';
import MyEggsPage from './pages/MyEggsPage';
import ReferralPage from './pages/ReferralPage';
import SellPage from './pages/SellPage';
import SettingsPage from './pages/SettingsPage';
import DepositPage from './pages/DepositPage';

import { AuthProvider } from './contexts/AuthContext';
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
      <AuthProvider>
        <GameProvider>
          <Router>
            <AuthGuard /> {/* ตรวจสอบสถานะ login ทุกหน้า */}
            <Routes>
              <Route path="/" element={<Lobby />} />
              <Route path="/login" element={<RegisterLogin />} />
              <Route path="/register" element={<RegisterLogin />} />
              <Route path="/farm" element={<FarmPage />} />
              <Route path="/incubator" element={<IncubatorPage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/my-eggs" element={<MyEggsPage />} />
              <Route path="/referral" element={<ReferralPage />} />
              <Route path="/market" element={<SellPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/deposit" element={<DepositPage />} />
            </Routes>
          </Router>
        </GameProvider>
      </AuthProvider>
    </Provider>
  );
} 
