console.log("LobbyLayout Loaded");
import React, { useState, useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { getBalance, getChickens, getEggs, getFood } from '../services/bk-api';
import './LobbyLayout.css';

const coinIcon    = process.env.PUBLIC_URL + '/assets/coin.png';
const chickenIcon = process.env.PUBLIC_URL + '/assets/chicken.png';
const eggIcon     = process.env.PUBLIC_URL + '/assets/egg.png';
const foodIcon    = process.env.PUBLIC_URL + '/assets/food.png';
const soundOnIcon = process.env.PUBLIC_URL + '/assets/sound-on.png';
const soundOffIcon= process.env.PUBLIC_URL + '/assets/sound-off.png';
const menuIcon    = process.env.PUBLIC_URL + '/assets/menu.png';
const shopIcon    = process.env.PUBLIC_URL + '/assets/shop.png';
const closeIcon   = process.env.PUBLIC_URL + '/assets/close.png';
const background  = process.env.PUBLIC_URL + '/assets/background.jpg';

export default function LobbyLayout() {
  const [showMenu, setShowMenu] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [coin, setCoin] = useState(0);
  const [chickenCount, setChickenCount] = useState(0);
  const [eggCount, setEggCount] = useState(0);
  const [foodCount, setFoodCount] = useState(0);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return;
    getBalance(token).then(r => setCoin(r.data.coin_balance));
    getChickens(token).then(r => setChickenCount(r.data.chickens.length));
    getEggs(token).then(r => setEggCount(r.data.eggs.length));
    getFood(token).then(r => setFoodCount(r.data.food));
  }, [token]);

  return (
    <div className="lobby-container">
      <img src={background} alt="background" className="background" />

      <div className="top-bar">
        <div className="stat-item">
          <img src={coinIcon} alt="coin" /><span>{coin.toLocaleString()}</span>
        </div>
        <div className="stat-item">
          <img src={chickenIcon} alt="chicken" /><span>{chickenCount}</span>
        </div>
        <div className="stat-item">
          <img src={eggIcon} alt="egg" /><span>{eggCount}</span>
        </div>
        <div className="stat-item">
          <img src={foodIcon} alt="food" /><span>{foodCount}</span>
        </div>
        <div className="title">BOSS</div>
        <div className="icons-right">
          <button onClick={() => setSoundOn(!soundOn)} className="icon-btn">
            <img src={soundOn ? soundOnIcon : soundOffIcon} alt="sound" />
          </button>
          <button onClick={() => setShowMenu(true)} className="icon-btn">
            <img src={menuIcon} alt="menu" />
          </button>
          <Link to="/shop" className="icon-btn">
            <img src={shopIcon} alt="shop" />
          </Link>
        </div>
      </div>

      <button className="feed-btn">
        <img src={foodIcon} alt="feed" />
      </button>

      {showMenu && (
        <div className="side-menu">
          <button onClick={() => setShowMenu(false)} className="icon-btn close-btn">
            <img src={closeIcon} alt="close" />
          </button>
          <div className="menu-items"> 
            llll
            <Link to="/wallet" className="menu-item">Wallet</Link>
            <Link to="/news" className="menu-item">Notice/News</Link>
            <Link to="/friends" className="menu-item">เพื่อน</Link>
            <Link to="/referrals" className="menu-item">แนะนำ</Link>
            <Link to="/shop" className="menu-item">Shop</Link>
            <button onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }} className="menu-item">Logout</button>
          </div>
        </div>
      )}

      <Outlet />
    </div>
);
}
