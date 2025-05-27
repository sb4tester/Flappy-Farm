import React, { useContext, useEffect, useState } from 'react';
import { GameContext } from '../contexts/GameContext';
import { 
  buyMother, 
  getPromotionStatistics, 
  getMotherTierPrice, 
  getBalance, 
  getFood,
  buyFood,
  buyIncubator
} from '../services/api';
import { useNavigate } from 'react-router-dom';

const FOOD_PRICE = 1;
const FOOD_AMOUNT = 30;
const INCUBATOR_PRICE = 10;

const ShopPage = () => {
  const { setChickens, setCoins, setFood } = useContext(GameContext);
  const navigate = useNavigate();
  const [chickenSold, setChickenSold] = useState(0);
  const [tiers, setTiers] = useState([]);
  const [currentTier, setCurrentTier] = useState(null);
  const [isBuyingFood, setIsBuyingFood] = useState(false);
  const [isBuyingIncubator, setIsBuyingIncubator] = useState(false);

  const refreshData = async (token) => {
    try {
      const [balanceRes, foodRes] = await Promise.all([
        getBalance(token),
        getFood(token)
      ]);
      setCoins(balanceRes.data.coin_balance || 0);
      setFood(foodRes.data.food || 0);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  useEffect(() => {
    // ตรวจสอบการล็อกอิน
    const token = localStorage.getItem('token');
    if (!token) {
      alert('กรุณาล็อกอินก่อนใช้งาน');
      navigate('/login');
      return;
    }

    // ดึงจำนวนไก่ที่ขายไปแล้ว
    getPromotionStatistics()
      .then(res => {
        setChickenSold(res.data.totalChickenPurchase || 0);
      })
      .catch(() => setChickenSold(0));
    // ดึง motherTierPrice
    getMotherTierPrice()
      .then(res => {
        setTiers(res.data.tiers || []);
      })
      .catch(() => setTiers([]));
  }, [navigate]);

  useEffect(() => {
    // คำนวณ tier ปัจจุบัน
    if (!tiers.length) return;
    const found = tiers.find(tier => chickenSold + 1 >= tier.minId && chickenSold + 1 <= tier.maxId);
    setCurrentTier(found || tiers[tiers.length - 1]);
  }, [tiers, chickenSold]);

  const handleBuyChicken = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('กรุณาล็อกอินก่อนใช้งาน');
        navigate('/login');
        return;
      }

      await buyMother({ tierId: currentTier.id }, token);
      setChickens(prev => prev + 1);
      alert('ซื้อแม่ไก่สำเร็จ!');
      setChickenSold(prev => prev + 1); // update local
      
      // Refresh ข้อมูล coin และ food
      await refreshData(token);
    } catch (error) {
      if (error.response?.status === 401) {
        alert('กรุณาล็อกอินใหม่');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        alert('เกิดข้อผิดพลาดในการซื้อแม่ไก่');
        console.error(error);
      }
    }
  };

  const handleBuyFood = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('กรุณาล็อกอินก่อนใช้งาน');
        navigate('/login');
        return;
      }

      setIsBuyingFood(true);
      await buyFood({ amount: FOOD_AMOUNT }, token);
      alert(`ซื้ออาหาร ${FOOD_AMOUNT} หน่วยสำเร็จ!`);
      
      // Refresh ข้อมูล coin และ food
      await refreshData(token);
    } catch (error) {
      if (error.response?.status === 401) {
        alert('กรุณาล็อกอินใหม่');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        alert('เกิดข้อผิดพลาดในการซื้ออาหาร');
        console.error(error);
      }
    } finally {
      setIsBuyingFood(false);
    }
  };

  const handleBuyIncubator = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('กรุณาล็อกอินก่อนใช้งาน');
        navigate('/login');
        return;
      }

      setIsBuyingIncubator(true);
      await buyIncubator(token);
      alert('ซื้อเครื่องฟักไข่สำเร็จ!');
      
      // Refresh ข้อมูล coin
      await refreshData(token);
    } catch (error) {
      if (error.response?.status === 401) {
        alert('กรุณาล็อกอินใหม่');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        alert('เกิดข้อผิดพลาดในการซื้อเครื่องฟักไข่');
        console.error(error);
      }
    } finally {
      setIsBuyingIncubator(false);
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
        width: '100vw',
        maxWidth: '430px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{
        background: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '16px',
        padding: '20px',
        maxWidth: '430px',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <h2>ร้านค้า</h2>

        <div className="shop-item">
          <span>
            แม่ไก่
            {currentTier && (
              <span style={{ fontSize: 13, color: '#888', marginLeft: 8 }}>
                (ลำดับ {currentTier.minId.toLocaleString()} - {currentTier.maxId.toLocaleString()})
              </span>
            )}
          </span>
          <button 
            onClick={handleBuyChicken} 
            disabled={!currentTier}
            style={{ minWidth: '100px' }}
          >
            {currentTier ? `ซื้อ ${currentTier.priceUsd} coin` : 'ไม่สามารถซื้อได้'}
          </button>
        </div>
        <div style={{ fontSize: '15px', color: '#555', marginBottom: 8 }}>
          ขายไปแล้วทั้งหมด <b>{chickenSold.toLocaleString()}</b> ตัว
        </div>

        <div className="shop-item">
          <span>อาหาร ({FOOD_AMOUNT} unit)</span>
          <button 
            onClick={handleBuyFood}
            disabled={isBuyingFood}
            style={{ minWidth: '100px' }}
          >
            {isBuyingFood ? 'กำลังซื้อ...' : `ซื้อ ${FOOD_PRICE} coin`}
          </button>
        </div>

        <div className="shop-item">
          <span>เครื่องฟักไข่ (5 slots)</span>
          <button 
            onClick={handleBuyIncubator}
            disabled={isBuyingIncubator}
            style={{ minWidth: '100px' }}
          >
            {isBuyingIncubator ? 'กำลังซื้อ...' : `ซื้อ ${INCUBATOR_PRICE} coin`}
          </button>
        </div>

        <button onClick={() => navigate('/')}>🏠 กลับหน้าหลัก</button>
      </div>
    </div>
  );
};

export default ShopPage;
