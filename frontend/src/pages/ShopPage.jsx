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
import styled from 'styled-components';

const FOOD_PRICE = 1;
const FOOD_AMOUNT = 30;
const INCUBATOR_PRICE = 10;

const BRONZE_EGG_ICON = process.env.PUBLIC_URL + '/assets/images/copper-Egg.png';
const SILVER_EGG_ICON = process.env.PUBLIC_URL + '/assets/images/Silver-Egg.png';
const GOLD_EGG_ICON = process.env.PUBLIC_URL + '/assets/images/Gold-Egg.png';
const FOOD_ICON = process.env.PUBLIC_URL + '/assets/images/food.png';

const ShopContainer = styled.div`
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url(${process.env.PUBLIC_URL}/assets/images/background.jpg);
  background-size: cover;
  background-position: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100vh;
  overflow: hidden;
`;

const HeaderWrapper = styled.div`
  width: 100%;
  max-width: 430px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  z-index: 10;
`;

const PageHeader = styled.h2`
  width: 100%;
  text-align: center;
  padding: 40px 0 10px 0;
  margin: 0;
  font-size: 1.8rem;
  color: #333;
`;

const ShopContent = styled.div`
  width: 100%;
  max-width: 430px;
  flex-grow: 1;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  padding: 20px;
  padding-top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto; /* Keep this for overall scrolling if content exceeds screen height */
`;

const PackageContainer = styled.div`
  
  padding: 16px 0;
  width: 100%;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  /* Adjustments for better visibility */
  height: auto; /* Let content define height */
  
  align-items: flex-start; /* Align cards to the top within the container */

  &::-webkit-scrollbar {
    height: 8px;
  }
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;

const PackageContainer1 = styled.div`
  display: flex;
  overflow-x: auto;
  gap: 16px;
  padding: 16px 0;
  width: 100%;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  /* Adjustments for better visibility */
  height: auto; /* Let content define height */
  min-height: 400px; /* Ensure a minimum height for the container itself, allows more space for cards */
  align-items: flex-start; /* Align cards to the top within the container */

  &::-webkit-scrollbar {
    height: 8px;
  }
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;

const PackageCard = styled.div`
  flex: 0 0 280px;
  background: ${props => props.color || '#fff'};
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  color: ${props => props.textColor || '#333'};
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  max-height: 380px;  /* Adjusted slightly, will be managed more by content and PackageContainer */
  text-align: center;
`;


const PackageImage = styled.img`
  width: 100px;
  height: 100px;
  margin: 0 auto 10px auto;
  object-fit: contain;
`;

const PackageTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 1.3rem;
`;

const PackageDetails = styled.div`
  font-size: 1rem;
  margin-bottom: 12px;
  line-height: 1.5;
`;

const QuantityInput = styled.input`
  width: 80px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-right: 8px;
  text-align: center;
`;

const BuyButton = styled.button`
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: bold;
  cursor: pointer;
  width: 100%;
  margin-top: auto;
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const FoodItemContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 10px;
`;

const FoodIcon = styled.img`
  width: 24px;
  height: 24px;
  vertical-align: middle;
`;

const ShopPage = () => {
  const { setChickens, setCoins, setFood } = useContext(GameContext);
  const navigate = useNavigate();
  const [chickenSold, setChickenSold] = useState(0);
  const [tiers, setTiers] = useState([]);
  const [currentTier, setCurrentTier] = useState(null);
  const [isBuyingFood, setIsBuyingFood] = useState(false);
  const [isBuyingIncubator, setIsBuyingIncubator] = useState(false);
  const [chickenQuantity, setChickenQuantity] = useState(1);
  const [foodQuantity, setFoodQuantity] = useState(1);

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
    const token = localStorage.getItem('token');
    if (!token) {
      alert('กรุณาล็อกอินก่อนใช้งาน');
      navigate('/login');
      return;
    }

    getPromotionStatistics()
      .then(res => {
        setChickenSold(res.data.totalChickenPurchase || 0);
      })
      .catch(() => setChickenSold(0));

    getMotherTierPrice()
      .then(res => {
        setTiers(res.data.tiers || []);
      })
      .catch(() => setTiers([]));
  }, [navigate]);

  useEffect(() => {
    if (!tiers.length) return;
    const found = tiers.find(tier => chickenSold + 1 >= tier.minId && chickenSold + 1 <= tier.maxId);
    setCurrentTier(found || tiers[tiers.length - 1]);
  }, [tiers, chickenSold]);

  const handleBuyChicken = async (packageType = null) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('กรุณาล็อกอินก่อนใช้งาน');
        navigate('/login');
        return;
      }

      let quantity = chickenQuantity;
      let totalPrice = 0;

      if (packageType === 'bronze') {
        quantity = 30;
        totalPrice = 300;
      } else if (packageType === 'silver') {
        quantity = 100;
        totalPrice = 1000;
      } else if (packageType === 'gold') {
        quantity = 300;
        totalPrice = 3000;
      } else {
        totalPrice = currentTier ? currentTier.priceUsd * quantity : 0;
      }

      let eggPackageType = null;
      if (totalPrice >= 3000) {
        eggPackageType = 'gold';
      } else if (totalPrice >= 1000) {
        eggPackageType = 'silver';
      } else if (totalPrice >= 300) {
        eggPackageType = 'bronze';
      }

      await buyMother({ tierId: currentTier.id, quantity, packageType: eggPackageType }, token);

      setChickens(prev => prev + quantity);
      alert(`ซื้อแม่ไก่ ${quantity} ตัว สำเร็จ!`);
      setChickenSold(prev => prev + quantity);
      
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

  const handleBuyFood = async (packageType = null) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('กรุณาล็อกอินก่อนใช้งาน');
        navigate('/login');
        return;
      }

      setIsBuyingFood(true);
      let quantity = foodQuantity;
      let totalUnits = quantity * FOOD_AMOUNT;
      let cost = FOOD_PRICE * quantity;

      if (packageType === 'large') {
        totalUnits = 3000000;
        cost = 95000;
      } else if (packageType === 'medium') {
        totalUnits = 300000;
        cost = 9500;
      } else if (packageType === 'small') {
        totalUnits = 90000;
        cost = 2900;
      } else if (packageType === 'mini') {
        totalUnits = 30000;
        cost = 950;
      }

      await buyFood({ amount: totalUnits, cost }, token);

      alert(`ซื้ออาหาร ${totalUnits} หน่วยสำเร็จ!`);
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
    <ShopContainer>
      <HeaderWrapper>
        <PageHeader>ร้านค้า</PageHeader>
      </HeaderWrapper>
      <ShopContent>
        {/* Individual Chicken Purchase */}
<div className="shop-item" style={{ width: '100%', marginTop: '20px' }}>
  <h3>ซื้อแม่ไก่ตามจำนวน</h3>
  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <QuantityInput
        type="number"
        min="1"
        value={chickenQuantity}
        onChange={(e) => setChickenQuantity(Math.max(1, parseInt(e.target.value) || 1))}
      />
      <span>ตัว</span>
    </div>
    <div style={{ fontSize: '15px', color: '#555' }}>
      ราคารวม: {currentTier ? (currentTier.priceUsd * chickenQuantity).toLocaleString() : 0} coin
    </div>
    <BuyButton 
      onClick={() => handleBuyChicken()}
      disabled={!currentTier}
      style={{ width: '100%' }}
    >
      {currentTier ? `${currentTier.priceUsd * chickenQuantity} coin` : 'ไม่สามารถซื้อได้'}
    </BuyButton>
  </div>
</div>

       {/* Individual Food Purchase */}
<div className="shop-item" style={{ width: '100%', marginTop: '20px' }}>
  <h3>ซื้ออาหารตามจำนวน</h3>
  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <QuantityInput
        type="number"
        min="1"
        value={foodQuantity}
        onChange={(e) => setFoodQuantity(Math.max(1, parseInt(e.target.value) || 1))}
      />
      <span>ชุด (30 หน่วย/ชุด)</span>
    </div>
    <div style={{ fontSize: '15px', color: '#555' }}>
      ราคารวม: {(FOOD_PRICE * foodQuantity).toLocaleString()} coin
    </div>
    <BuyButton 
      onClick={() => handleBuyFood()}
      disabled={isBuyingFood}
      style={{ width: '100%' }}
    >
      {isBuyingFood ? 'กำลังซื้อ...' : `${FOOD_PRICE * foodQuantity} coin`}
    </BuyButton>
  </div>
</div>

        {/* Chicken Packages */}
        <h3 style={{ marginTop: '20px' }}>แพ็คเกจแม่ไก่</h3>
        <PackageContainer>
          <PackageCard color="#CD7F32" textColor="#fff">
            <PackageImage src={BRONZE_EGG_ICON} alt="Bronze Egg" />
            <PackageTitle>Bronze Package</PackageTitle>
            <PackageDetails>
              - 30 แม่ไก่<br />
              - ลุ้นไข่ทองแดงทุกสัปดาห์<br />
            </PackageDetails>
            <BuyButton onClick={() => handleBuyChicken('bronze')}>
              300 coin
            </BuyButton>
          </PackageCard>

          <PackageCard color="#C0C0C0" textColor="#333">
            <PackageImage src={SILVER_EGG_ICON} alt="Silver Egg" />
            <PackageTitle>Silver Package</PackageTitle>
            <PackageDetails>
              - 100 แม่ไก่<br />
              - ลุ้นไข่เงินทุก 2 สัปดาห์<br />
            </PackageDetails>
            <BuyButton onClick={() => handleBuyChicken('silver')}>
              1,000 coin
            </BuyButton>
          </PackageCard>

          <PackageCard color="#FFD700" textColor="#333">
            <PackageImage src={GOLD_EGG_ICON} alt="Gold Egg" />
            <PackageTitle>Gold Package</PackageTitle>
            <PackageDetails>
              - 300 แม่ไก่<br />
              - ลุ้นไข่ทองคำทุก 4 สัปดาห์<br />
            </PackageDetails>
            <BuyButton onClick={() => handleBuyChicken('gold')}>
              3,000 coin
            </BuyButton>
          </PackageCard>
        </PackageContainer>




        {/* Food Packages */}
        <h3 style={{ marginTop: '20px', width: '100%' }}>แพ็คเกจอาหาร</h3>
        <PackageContainer>
          <PackageCard>
            <PackageTitle>Mini Package</PackageTitle>
            <PackageDetails>
              <FoodItemContainer>
                <FoodIcon src={FOOD_ICON} alt="Food Icon" /> 30,000 หน่วย<br />
              </FoodItemContainer>
              ประหยัด 50 coin
            </PackageDetails>
            <BuyButton onClick={() => handleBuyFood('mini')}>
              950 coin
            </BuyButton>
          </PackageCard>

          <PackageCard>
            <PackageTitle>Small Package</PackageTitle>
            <PackageDetails>
              <FoodItemContainer>
                <FoodIcon src={FOOD_ICON} alt="Food Icon" /> 90,000 หน่วย<br />
              </FoodItemContainer>
              ประหยัด 100 coin
            </PackageDetails>
            <BuyButton onClick={() => handleBuyFood('small')}>
              2,900 coin
            </BuyButton>
          </PackageCard>

          <PackageCard>
            <PackageTitle>Medium Package</PackageTitle>
            <PackageDetails>
              <FoodItemContainer>
                <FoodIcon src={FOOD_ICON} alt="Food Icon" /> 300,000 หน่วย<br />
              </FoodItemContainer>
              ประหยัด 500 coin
            </PackageDetails>
            <BuyButton onClick={() => handleBuyFood('medium')}>
              9,500 coin
            </BuyButton>
          </PackageCard>

          <PackageCard>
            <PackageTitle>Large Package</PackageTitle>
            <PackageDetails>
              <FoodItemContainer>
                <FoodIcon src={FOOD_ICON} alt="Food Icon" /> 3,000,000 หน่วย<br />
              </FoodItemContainer>
              ประหยัด 5,000 coin
            </PackageDetails>
            <BuyButton onClick={() => handleBuyFood('large')}>
              95,000 coin
            </BuyButton>
          </PackageCard>
        </PackageContainer>

 


        {/* Incubator 
        <div className="shop-item" style={{ width: '100%', marginTop: '20px', marginBottom: '20px' }}>
          <h3>เครื่องฟักไข่</h3>
          <PackageDetails>
            - 5 slots<br />
            - ราคา {INCUBATOR_PRICE} coin
          </PackageDetails>
          <BuyButton 
            onClick={handleBuyIncubator}
            disabled={isBuyingIncubator}
            style={{ width: '100%' }}
          >
            {isBuyingIncubator ? 'กำลังซื้อ...' : `ซื้อ ${INCUBATOR_PRICE} coin`}
          </BuyButton>
        </div>
          */}
        <button 
          onClick={() => navigate('/')}
          style={{
            padding: '10px 20px',
            background: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            width: '100%',
            marginBottom: '20px'
          }}
        >        
          🏠 กลับหน้าหลัก
        </button>
      </ShopContent>
    </ShopContainer>
  );
};

export default ShopPage;
