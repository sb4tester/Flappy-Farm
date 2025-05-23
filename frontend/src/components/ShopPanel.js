
import React, { useContext } from 'react';
import { GameContext } from '../contexts/GameContext';
import { buyMotherChicken } from '../api/api';

const ShopPanel = ({ onClose }) => {
  const { setChickens } = useContext(GameContext);

  const handleBuyChicken = async () => {
    try {
      const token = localStorage.getItem('token');
      await buyMotherChicken(token);
      setChickens(prev => prev + 1);
      alert('ซื้อแม่ไก่สำเร็จ!');
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการซื้อแม่ไก่');
      console.error(error);
    }
  };

  return (
    <div className="shop-panel">
      <h3>ร้านค้า</h3>

      <div className="shop-item">
        <span>แม่ไก่ - 10 coin</span>
        <button onClick={handleBuyChicken}>ซื้อ</button>
      </div>

      <div className="shop-item">
        <span>อาหาร - 1 coin (30 unit)</span>
        <button onClick={() => alert('ซื้ออาหาร')}>ซื้อ</button>
      </div>

      <div className="shop-item">
        <span>ตู้ฟักไข่ - 10 coin</span>
        <button onClick={() => alert('เช่าตู้ฟักไข่')}>เช่า</button>
      </div>

      <button style={{ marginTop: '10px' }} onClick={onClose}>ปิด</button>
    </div>
  );
};

export default ShopPanel;
