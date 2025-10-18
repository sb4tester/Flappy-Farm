import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useGame } from '../contexts/GameContext';
import { feedMultipleChickens, sellChick } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc, increment } from 'firebase/firestore';


// Styled Components for Mobile Portrait
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 95vh;
  background: url('/assets/images/Out-006.png') center/contain no-repeat;
  max-width: 430px;
  margin: 0 auto;
  @media (orientation: landscape) {
    min-width: 430px;
    max-width: 430px;
    width: 430px;
  }
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;

  box-shadow: 0 2px 4px rgba(0,0,0,0.07);
  padding: 0 0 8px 0;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px 0 8px;
`;

const BackButton = styled.button`
  background: #f5f5f5;
  color: #333;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  padding: 6px 14px 6px 10px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  box-shadow: 0 1px 2px #0001;
  transition: background 0.15s;
  &:hover { background: #e0e0e0; }
`;

const Logo = styled.div`
  width: 80px;
  height: 80px;
  background: url('/logo192.png') center/contain no-repeat;
  margin-bottom: 8px;
`;

const Title = styled.h2`
  font-size: 1.6rem;
  margin: 0;
  color: #4CAF50;
  font-weight: bold;
`;

const StatusBar = styled.div`
  display: flex;
  
  align-items: center;
  gap: 16px;
  background: #f6faf6;
  border-radius: 12px;
  margin: 0 16px 0 16px;
  padding: 6px 0;
  font-size: 1.05rem;
  font-weight: 500;
  box-shadow: 0 1px 4px #0001;
`;

const FilterBar = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin: 10px 0 0 0;
  padding-bottom: 2px;
`;

const FilterButton = styled.button`
  background: ${props => props.active ? '#4CAF50' : '#f5f5f5'};
  color: ${props => props.active ? '#fff' : '#333'};
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  padding: 6px 18px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 1px 2px #0001;
  transition: background 0.15s;
  &:hover { background: #e0e0e0; color: #222; }
`;

const Section = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 0 110px 0; /* กันทับ footer */
`;

const ChickenGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
  padding: 18px 12px 0 12px;
`;

const ChickenCard = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px #0002;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px 12px 8px;
  font-size: 1.1rem;
  position: relative;
  min-height: 160px;
  transition: box-shadow 0.18s, transform 0.18s;
  &:hover { box-shadow: 0 4px 16px #0003; transform: translateY(-2px) scale(1.03); }
`;

const ChickenSelect = styled.input`
  position: absolute;
  top: 10px;
  right: 10px;
  width: 20px;
  height: 20px;
`;

const ChickenType = styled.div`
  font-size: 2.5rem;
  margin-bottom: 2px;
`;

const ChickenStatus = styled.div`
  font-size: 1.15rem;
  margin: 4px 0 0 0;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ChickenWeight = styled.div`
  font-size: 0.98rem;
  color: #888;
  margin-top: 8px;
`;

const SellButton = styled.button`
  background: #ff9800;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  padding: 6px 14px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 8px;
  box-shadow: 0 1px 2px #0001;
  &:disabled { background: #ccc; color: #888; cursor: not-allowed; }
`;

const EggInfo = styled.div`
  font-size: 1.05rem;
  color: #ff9800;
  margin-top: 6px;
  text-align: center;
`;

const BottomBar = styled.div`
  position: fixed;
  left: 0; right: 0; bottom: 0;
  
  box-shadow: 0 -2px 12px #0002;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 18px 0 16px 0;
  z-index: 20;
  max-width: 430px;
  margin: 0 auto;
  border-radius: 18px 18px 0 0;
`;

const ActionButton = styled.button`
  background: #4CAF50;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 1.15rem;
  padding: 12px 32px;
  margin: 0 8px;
  font-weight: bold;
  box-shadow: 0 2px 8px #0001;
  cursor: pointer;
  transition: background 0.15s;
  &:hover:not(:disabled) { background: #388e3c; }
  &:disabled {
    background: #bdbdbd;
    cursor: not-allowed;
  }
`;

const LoadingModal = styled.div`
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.6);
  z-index: 999;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const LoadingBox = styled.div`
  background: #fff;
  padding: 24px 36px;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 4px 16px #0003;
  font-size: 1.2rem;
  font-weight: bold;
`;

// Utility: Group chickens by weight (2 ตำแหน่ง) และ status
function groupChickensByWeightStatus(chickens) {
  const groups = {};
  chickens.forEach(chicken => {
    const status = chicken.status;
    const type = chicken.type;
    const weight = Number(chicken.weight).toFixed(2);
    const key = `${status}|${weight}`;
    if (!groups[key]) {
      groups[key] = { ...chicken, status, displayWeight: weight, ids: [chicken.id], count: 1 };
    } else {
      groups[key].ids.push(chicken.id);
      groups[key].count++;
    }
  });
  return Object.values(groups);
}

const FarmPage = () => {
  const { chickens, food, coins, refreshData } = useGame();
  const [selectedChickens, setSelectedChickens] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // รวมแม่ไก่กับลูกไก่
  const allChickens = chickens;

  const canFeedChicken = (chicken) => chicken.status === 'hungry';

  const canSellChick = (chicken) => {
    return chicken.type === 'chick' && chicken.weight >= 3 && chicken.status !== 'dead';
  };

  const handleSelectChicken = (chickenId) => {
    const chicken = allChickens.find(c => c.id === chickenId);
    if (!canFeedChicken(chicken)) {
      alert('ไก่ตัวนี้ยังไม่สามารถให้อาหารได้ ต้องรอ 24 ชั่วโมงหลังจากให้อาหารครั้งล่าสุด');
      return;
    }
    setSelectedChickens(prev => prev.includes(chickenId) ? prev.filter(id => id !== chickenId) : [...prev, chickenId]);
  };

const handleFeedSelected = async () => {
  if (selectedChickens.length > 0) {
    const token = localStorage.getItem('token');
    try {
      const chickensToFeed = allChickens.filter(c => selectedChickens.includes(c.id) && canFeedChicken(c));
      if (chickensToFeed.length === 0) {
        alert('ไก่ที่เลือกยังไม่สามารถให้อาหารได้ ต้องรอ 24 ชั่วโมงหลังจากให้อาหารครั้งล่าสุด');
        return;
      }

      const maxFeedable = food;
      const ids = chickensToFeed.slice(0, maxFeedable).map(c => c.id);
      if (ids.length === 0) {
        alert('อาหารไม่เพียงพอในการให้อาหารไก่');
        return;
      }

      setLoading(true); // ✅ แสดง loading

      const BATCH_SIZE = 100;
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        await feedMultipleChickens(batch, token);
      }

      await refreshData();
      setSelectedChickens([]);
    } catch (error) {
      console.error('Error feeding chickens:', error);
      alert('เกิดข้อผิดพลาดในการให้อาหารไก่');
    } finally {
      setLoading(false); // ✅ ซ่อน loading
    }
  }
};



  const handleSellChick = async (chickId) => {
    const token = localStorage.getItem('token');
    try {
      await sellChick(chickId, token);
      await refreshData();
    } catch (error) {
      console.error('Error selling chick:', error);
      alert('ขายลูกไก่ไม่สำเร็จ');
    }
  };

  // Filter chickens by status
  const filteredChickens = allChickens.filter(chicken => {
    const status = chicken.status;
    if (filter === 'all') return true;
    if (filter === 'normal') return status === 'normal';
    if (filter === 'hungry') return status === 'hungry';
    if (filter === 'dead') return status === 'dead';
    return true;
  });

  // Group chickens for display (by weight+status)
  const groupedChickens = groupChickensByWeightStatus(filteredChickens);

  // ฟังก์ชันเลือกกลุ่ม
  const handleSelectGroup = (group) => {
    const selectable = group.ids.filter(id => !selectedChickens.includes(id));
    if (selectable.length > 0) {
      setSelectedChickens(prev => [...prev, ...selectable]);
    } else {
      setSelectedChickens(prev => prev.filter(id => !group.ids.includes(id)));
    }
  };

  // นับจำนวนไก่ที่เลือกและหิวจริง ๆ
  const selectedHungryCount = allChickens.filter(
    c => selectedChickens.includes(c.id) && c.status === 'hungry'
  ).length;

  return (
    <PageContainer>
      <Header>
        <StatusBar>
          <BackButton onClick={() => navigate('/')}>{'<'} Lobby</BackButton>
          <span>🍗: {food}</span>
          <span>🥚: {allChickens.filter(c=>c.type==='mother').reduce((sum, c) => sum + (c.eggs || 0), 0)}</span>
          <span>🐔: {allChickens.length}</span>
        </StatusBar>
        <FilterBar>
          <FilterButton active={filter==='all'} onClick={()=>setFilter('all')}>ทั้งหมด</FilterButton>
          <FilterButton active={filter==='normal'} onClick={()=>setFilter('normal')}>อิ่ม</FilterButton>
          <FilterButton active={filter==='hungry'} onClick={()=>setFilter('hungry')}>หิว</FilterButton>
          <FilterButton active={filter==='dead'} onClick={()=>setFilter('dead')}>ตาย</FilterButton>
        </FilterBar>
      </Header>
      <Section>

        {loading && <LoadingModal><LoadingBox>🍗 กำลังให้อาหารไก่...</LoadingBox></LoadingModal>}        
        <ChickenGrid>
          {groupedChickens.length === 0 && <div style={{textAlign:'center',color:'#888',gridColumn:'1/-1'}}>ไม่มีไก่ในสถานะนี้</div>}
          {groupedChickens.map(group => {
            const isSelected = group.ids.every(id => selectedChickens.includes(id));
            const canFeed = group.status === 'hungry';
            // รูปภาพไก่ตามสถานะ
            let chickenImage = '/assets/images/kai-003.png'; // default: normal/อิ่ม
            if (group.status === 'hungry') chickenImage = '/assets/images/kai-002.png';
            if (group.status === 'dead') chickenImage = '/assets/images/kai-001.png';
            return (
              <ChickenCard key={group.status + group.displayWeight} onClick={() => canFeed && handleSelectGroup(group)} style={{cursor: canFeed ? 'pointer' : 'default', position:'relative'}}>
                <ChickenSelect
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleSelectGroup(group)}
                  disabled={!canFeed}
                />
                <ChickenType>
                  <img src={chickenImage} alt={group.status} style={{width: '130px', height: 'auto', objectFit: 'contain'}} />
                </ChickenType>
                <ChickenWeight>น้ำหนัก: {group.displayWeight} kg</ChickenWeight>
                {group.count > 1 && <div style={{marginTop:4, color:'#4CAF50', fontWeight:'bold'}}>x {group.count} ตัว</div>}
              </ChickenCard>
            );
          })}
        </ChickenGrid>
      </Section>
      <BottomBar>
        <ActionButton
          onClick={handleFeedSelected}
          disabled={selectedHungryCount === 0}
        >
          {`ให้อาหารที่เลือก (${selectedHungryCount})`}
        </ActionButton>
        <ActionButton
          style={{ background: '#ff9800' }}
          onClick={() => navigate('/market')}
        >
          Market
        </ActionButton>
      </BottomBar>
    </PageContainer>
  );
};

export default FarmPage;
