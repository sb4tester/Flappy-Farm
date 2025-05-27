import React, { useState, useContext, useEffect } from 'react';
import ShopPanel from './ShopPanel';
import { GameContext } from '../contexts/GameContext';
import './Lobby.css';
import MenuPanel from './MenuPanel';
import ReferralDialog from './ReferralDialog';
import { getIncubators } from '../services/api';

const Lobby = () => {
  const [showReferral, setShowReferral] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { coins = 0, chickens = [], eggs = [], food = 0, refreshData } = useContext(GameContext);
  const [incubators, setIncubators] = useState([]);

  const fetchIncubators = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }
      const response = await getIncubators(token);
      console.log('Incubators response:', response);
      if (response.data && response.data.data) {
        setIncubators(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching incubators:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchIncubators();
      refreshData(); // Refresh game data when component mounts
    }
  }, []);

  const totalSlots = incubators.reduce((sum, inc) => sum + (inc.capacity || 0), 0);
  const usedSlots = incubators.reduce((sum, inc) => sum + (inc.usedSlots || 0), 0);

  if (isLoading) {
    return <div className="lobby loading">Loading...</div>;
  }

  return (
    <div className="lobby">
      <img src="/assets/images/background.jpg" alt="background" className="background-img" />

      <div className="header">
        <div className="left">
          <img src="/assets/images/coin-250x250.png" alt="coin" />
          <span>{(coins ?? 0).toLocaleString()}</span>
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
        <div><img src="/assets/images/profile.png" width="40" alt="chickens" /> {chickens.length}</div>
        <div><img src="/assets/images/Egg.png" width="40" alt="eggs" /> {eggs.length}</div>
        <div><img src="/assets/images/Food-250x250.png" width="40" alt="food" /> {food}</div>
        <div><img src="/assets/images/incubator.png" width="40" alt="incubators" /> {incubators.length} ({usedSlots}/{totalSlots})</div>
      </div>

      <button className="feed-button" onClick={() => alert('ให้อาหาร')}>
        ให้อาหาร
      </button>

      {showShop && <ShopPanel onClose={() => {
        setShowShop(false);
        fetchIncubators(); // Refresh data when shop is closed
        refreshData(); // Refresh game data when shop is closed
      }} />}
      {showReferral && <ReferralDialog onClose={() => setShowReferral(false)} />}
      {menuOpen && <MenuPanel onClose={() => setMenuOpen(false)} onReferral={() => setShowReferral(true)} />}
    </div>
  );
};

export default Lobby;
