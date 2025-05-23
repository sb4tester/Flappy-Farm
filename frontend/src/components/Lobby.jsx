import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameContext } from '../contexts/GameContext';
import Header from './Header';
import MenuPanel from './MenuPanel';
import ShopPanel from './ShopPanel';
import ReferralDialog from './ReferralDialog';
import './Lobby.css';

export default function Lobby() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const { coins, chickens, eggs, food } = useContext(GameContext);
  const navigate = useNavigate();
  return (
    <div className="lobby">
      <Header />
      <div className="info-panel">
        <div><span>เหรียญ:</span> {coins}</div>
        <div><span>ไก่:</span> {chickens}</div>
        <div><span>ไข่:</span> {eggs}</div>
        <div><span>อาหาร:</span> {food}</div>
      </div>
      <button onClick={() => setMenuOpen(true)}>เมนู</button>
      <button onClick={() => setShowShop(true)}>SHOP</button>
      <button onClick={() => alert('ให้อาหาร')}>ให้อาหาร</button>
      {menuOpen && <MenuPanel onClose={() => setMenuOpen(false)} onReferral={() => setShowReferral(true)} />}
      {showShop && <ShopPanel onClose={() => setShowShop(false)} />}
      {showReferral && <ReferralDialog onClose={() => setShowReferral(false)} />}
    </div>
  );
}
