
import React from 'react';
import { useNavigate } from 'react-router-dom';

const MenuPanel = ({ onClose, onReferral }) => {
  const navigate = useNavigate();
  return (
    <div className="menu-panel">
      <button className="menu-close" onClick={onClose}>✕</button>

      <div className="menu-profile">
        <img src="/assets/images/profile.png" alt="profile" className="avatar" />
        <h2>Boss</h2>
      </div>

      <div className="menu-items">
        <button className="menu-btn">Wallet</button>
        <button className="menu-btn">Notice/News <span className="badge">5</span></button>
        <button className="menu-btn">เพื่อน</button>
        <button className="menu-btn" onClick={() => { onClose(); onReferral(); }}>แนะนำ</button>
        <button className="menu-btn" onClick={() => {
          onClose();
          navigate('/shop');
        }}>Shop</button>
        <button className="menu-btn" onClick={() => {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }}>Logout</button>
      </div>
    </div>
  );
};

export default MenuPanel;
