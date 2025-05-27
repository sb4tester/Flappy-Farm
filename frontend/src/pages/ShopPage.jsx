import React, { useContext } from 'react';
import { GameContext } from '../contexts/GameContext';
import { buyMother } from '../services/api';
import { useNavigate } from 'react-router-dom';


const ShopPage = () => {
  const { setChickens } = useContext(GameContext);
  const navigate = useNavigate();

  const handleBuyChicken = async () => {
    try {
      const token = localStorage.getItem('token');
      await buyMother(token);
      setChickens(prev => prev + 1);
      alert('ซื้อแม่ไก่สำเร็จ!');
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการซื้อแม่ไก่');
      console.error(error);
    }
  };

  return (
    <div
  className="shop-container"
  style={{
    backgroundImage: `url(${process.env.PUBLIC_URL}/assets/images/background.jpg)`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  }}
>
  <div style={{
    background: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '16px',
    padding: '20px',
    maxWidth: '768px',
    width: '90%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  }}>
    <h2>ร้านค้า</h2>

    <div className="shop-item">
      <span>แม่ไก่ - 10 coin</span>
      <button>ซื้อ</button>
    </div>

    <div className="shop-item">
      <span>อาหาร - 1 coin (30 unit)</span>
      <button>ซื้อ</button>
    </div>

    <button onClick={() => navigate('/')}>🏠 กลับหน้าหลัก</button>
  </div>
</div>
  );
};

export default ShopPage;
