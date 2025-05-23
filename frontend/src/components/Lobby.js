
import React, { useState, useContext } from 'react';
import ShopPanel from './ShopPanel';
import { GameContext } from '../contexts/GameContext';
import './Lobby.css';
import MenuPanel from './MenuPanel';
import ReferralDialog from './ReferralDialog';

const Lobby = () => {
  const [showReferral, setShowReferral] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { coins, chickens, eggs, food } = useContext(GameContext);

  return (
    <div className="lobby">
      <img src="/assets/images/background.jpg" alt="background" className="background-img" />

      <div className="header">
        <div className="left">
          <img src="/assets/images/coin-250x250.png" alt="coin" />
          <span>{coins.toLocaleString()}</span>
        </div>
        <div className="right">
          <button onClick={() => alert('Toggle Sound')}>
            <img src="/assets/images/volum-250x250.png" alt="sound" />
          </button>
          <button onClick={() => setMenuOpen(true)}>
            <img src="/assets/images/menu-250x250.png" alt="menu" />
          </button>
        </div>
      </div>

      <div className="status-panel">
        <div><img src="/assets/images/profile.png" width="40" alt="chickens" /> {chickens}</div>
        <div><img src="/assets/images/Egg.png" width="40" alt="eggs" /> {eggs}</div>
        <div><img src="/assets/images/Food-250x250.png" width="40" alt="food" /> {food}</div>
      </div>

      <button className="feed-button" onClick={() => alert('ให้อาหาร')}>
        ให้อาหาร
      </button>

      
      {showShop && <ShopPanel onClose={() => setShowShop(false)} />}
      {showReferral && <ReferralDialog onClose={() => setShowReferral(false)} />}
      {menuOpen && <MenuPanel onClose={() => setMenuOpen(false)} onReferral={() => setShowReferral(true)} />}
  
    </div>
  );
};

export default Lobby;
