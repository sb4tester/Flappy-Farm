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
import styled, { keyframes } from 'styled-components';

const FOOD_PRICE = 1;
const FOOD_AMOUNT = 30;
const INCUBATOR_PRICE = 10;

const BRONZE_EGG_ICON = process.env.PUBLIC_URL + '/assets/images/copper-Egg.png';
const SILVER_EGG_ICON = process.env.PUBLIC_URL + '/assets/images/Silver-Egg.png';
const GOLD_EGG_ICON = process.env.PUBLIC_URL + '/assets/images/Gold-Egg.png';
const FOOD_ICON = process.env.PUBLIC_URL + '/assets/images/food.png';

const ShopContainer = styled.div`
  position: relative;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;

  &:before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url(${process.env.PUBLIC_URL}/assets/images/background.jpg);
    background-size: cover;
    background-position: center;
    filter: blur(2px);
    transform: scale(1.02);
  }

  &:after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.88) 100%);
  }
`;

const HeaderWrapper = styled.div`
  width: 95%;
  max-width: 430px;
  padding: 16px;
  z-index: 1;
`;

const PageHeader = styled.h2`
  width: 95%;
  text-align: center;
  margin: 16px 0 0 0;
  font-size: 1.6rem;
  color: #2b2b2b;
`;

const ShopContent = styled.div`
  position: relative;
  width: 95%;
  max-width: 430px;
  flex-grow: 1;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  padding: 20px;
  margin: 8px auto 16px auto; /* center and avoid horizontal overflow */
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
  z-index: 1;
  overflow-y: auto;
  overflow-x: hidden;
`;

const PackageContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 0;
  width: 100%;
  align-items: start;
  
  @media (max-width: 400px) {
    grid-template-columns: 1fr;
  }
`;

const PackageContainer1 = styled(PackageContainer)`
  min-height: 400px;
`;

const PackageCard = styled.div`
  width: 100%;
  box-sizing: border-box;
  background: ${props => props.color || '#fff'};
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  color: ${props => props.textColor || '#333'};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: center;
  transition: box-shadow 0.15s ease;
  border: 1px solid rgba(0,0,0,0.04);

  &:hover { box-shadow: 0 10px 24px rgba(0,0,0,0.12); }
`;


const PackageImage = styled.img`
  width: 80px;
  height: 80px;
  margin: 0 auto 10px auto;
  object-fit: contain;
`;

const PackageTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 1.2rem;
`;

const PackageDetails = styled.div`
  font-size: 1rem;
  margin-bottom: 12px;
  line-height: 1.5;
`;

const QuantityInput = styled.input`
  width: 96px;
  padding: 10px 12px;
  border: 1px solid #e2e2e2;
  border-radius: 10px;
  margin-right: 8px;
  text-align: center;
  font-size: 0.95rem;
  background: #fafafa;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  &:focus { outline: none; border-color: #4CAF50; box-shadow: 0 0 0 3px rgba(76,175,80,0.15); background: #fff; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const BuyButton = styled.button`
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 10px;
  padding: 12px 20px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  margin-top: auto;
  transition: filter 0.15s ease, transform 0.05s ease;
  position: relative;
  overflow: hidden; /* กันเนื้อหาในปุ่มล้น */
  &:hover:not(:disabled) { filter: brightness(1.02); }
  &:active:not(:disabled) { transform: translateY(1px); }
  &:disabled { background: #cfcfcf; cursor: not-allowed; }
`;

const Spinner = styled.span`
  display: inline-block;
  width: 16px;
  height: 16px;
  margin-right: 8px;
  border: 2px solid rgba(255,255,255,0.5);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
  vertical-align: text-bottom;
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

// New shared pieces for better layout
const SectionHeader = styled.h3`
  margin: 8px 0 4px 0;
  color: #2b2b2b;
  font-size: 1.05rem;
`;

const ItemCard = styled.div`
  width: 95%;
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
  border: 1px solid rgba(0,0,0,0.04);
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Subtle = styled.div`
  font-size: 0.95rem;
  color: #555;
`;

const BackButton = styled.button`
  padding: 12px 16px;
  background: #6b7280;
  color: #fff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
`;

const ShopPage = () => {
  const { setChickens, setCoins, setFood } = useContext(GameContext);
  const navigate = useNavigate();
  const [chickenSold, setChickenSold] = useState(0);
  const [tiers, setTiers] = useState([]);
  const [currentTier, setCurrentTier] = useState(null);
  const [isBuyingFood, setIsBuyingFood] = useState(false);
  const [isBuyingIncubator, setIsBuyingIncubator] = useState(false);
  const [isBuyingChicken, setIsBuyingChicken] = useState(false);
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
    } finally {
      setIsBuyingChicken(false);
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
      if (isBuyingChicken) return;
      const token = localStorage.getItem('token');
      if (!token) {
        alert('กรุณาล็อกอินก่อนใช้งาน');
        navigate('/login');
        return;
      }

      setIsBuyingChicken(true);
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

      const payload = packageType
        ? { tierId: currentTier.id, quantity, packageType }
        : { tierId: currentTier.id, quantity };

      await buyMother(payload, token);

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
    } finally {
      setIsBuyingChicken(false);
    }
  };

  const handleBuyFood = async (packageType = null) => {
    try {
      if (isBuyingFood) return;
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
<div className="shop-item" style={{ width: '95%', marginTop: '20px' }}>
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
      disabled={!currentTier || isBuyingChicken}
      aria-busy={isBuyingChicken}
      style={{ width: '95%' }}
    >
      {currentTier ? `${currentTier.priceUsd * chickenQuantity} coin` : 'ไม่สามารถซื้อได้'}
    </BuyButton>
  </div>
</div>

       {/* Individual Food Purchase */}
<div className="shop-item" style={{ width: '95%', marginTop: '20px' }}>
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
      aria-busy={isBuyingFood}
      style={{ width: '95%' }}
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
            <PackageTitle>Bronze</PackageTitle>
            <PackageDetails>
              - 30 แม่ไก่<br />
              - ลุ้นไข่ทองแดง<br />
            </PackageDetails>
            <BuyButton onClick={() => handleBuyChicken('bronze')} disabled={isBuyingChicken} aria-busy={isBuyingChicken}>
              300 coin
            </BuyButton>
          </PackageCard>

          <PackageCard color="#C0C0C0" textColor="#333">
            <PackageImage src={SILVER_EGG_ICON} alt="Silver Egg" />
            <PackageTitle>Silver</PackageTitle>
            <PackageDetails>
              - 100 แม่ไก่<br />
              - ลุ้นไข่เงิน<br />
            </PackageDetails>
            <BuyButton onClick={() => handleBuyChicken('silver')} disabled={isBuyingChicken} aria-busy={isBuyingChicken}>
              1,000 coin
            </BuyButton>
          </PackageCard>

          <PackageCard color="#FFD700" textColor="#333">
            <PackageImage src={GOLD_EGG_ICON} alt="Gold Egg" />
            <PackageTitle>Gold</PackageTitle>
            <PackageDetails>
              - 300 แม่ไก่<br />
              - ลุ้นไข่ทองคำ<br />
            </PackageDetails>
            <BuyButton onClick={() => handleBuyChicken('gold')} disabled={isBuyingChicken} aria-busy={isBuyingChicken}>
              3,000 coin
            </BuyButton>
          </PackageCard>
        </PackageContainer>




        {/* Food Packages */}
        <h3 style={{ marginTop: '20px', width: '95%' }}>แพ็คเกจอาหาร</h3>
        <PackageContainer>
          <PackageCard>
            <PackageTitle>Mini</PackageTitle>
            <PackageDetails>
              <FoodItemContainer>
                <FoodIcon src={FOOD_ICON} alt="Food Icon" /> 30,000 หน่วย<br />
              </FoodItemContainer>
              ประหยัด 50 coin
            </PackageDetails>
            <BuyButton onClick={() => handleBuyFood('mini')} disabled={isBuyingFood} aria-busy={isBuyingFood}>
              950 coin
            </BuyButton>
          </PackageCard>

          <PackageCard>
            <PackageTitle>Small</PackageTitle>
            <PackageDetails>
              <FoodItemContainer>
                <FoodIcon src={FOOD_ICON} alt="Food Icon" /> 90,000 หน่วย<br />
              </FoodItemContainer>
              ประหยัด 100 coin
            </PackageDetails>
            <BuyButton onClick={() => handleBuyFood('small')} disabled={isBuyingFood} aria-busy={isBuyingFood}>
              2,900 coin
            </BuyButton>
          </PackageCard>

          <PackageCard>
            <PackageTitle>Medium</PackageTitle>
            <PackageDetails>
              <FoodItemContainer>
                <FoodIcon src={FOOD_ICON} alt="Food Icon" /> 300,000 หน่วย<br />
              </FoodItemContainer>
              ประหยัด 500 coin
            </PackageDetails>
            <BuyButton onClick={() => handleBuyFood('medium')} disabled={isBuyingFood} aria-busy={isBuyingFood}>
              9,500 coin
            </BuyButton>
          </PackageCard>

          <PackageCard>
            <PackageTitle>Large</PackageTitle>
            <PackageDetails>
              <FoodItemContainer>
                <FoodIcon src={FOOD_ICON} alt="Food Icon" /> 3,000,000 หน่วย<br />
              </FoodItemContainer>
              ประหยัด 5,000 coin
            </PackageDetails>
            <BuyButton onClick={() => handleBuyFood('large')} disabled={isBuyingFood} aria-busy={isBuyingFood}>
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
            aria-busy={isBuyingIncubator}
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
