import React, { useState } from 'react';
import styled from 'styled-components';
import { useGame } from '../contexts/GameContext';
import { feedChicken } from '../services/api';

// Styled Components for Mobile-first Design
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f5f5f5;
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0 8px 0;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.07);
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
  justify-content: center;
  gap: 18px;
  margin: 8px 0 0 0;
  font-size: 1.1rem;
`;

const Section = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 0 80px 0; /* leave space for bottom bar */
`;

const ChickenRow = styled.div`
  display: flex;
  overflow-x: auto;
  gap: 12px;
  padding: 16px 12px 0 12px;
`;

const ChickenCard = styled.div`
  min-width: 90px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 4px #0001;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 6px;
  font-size: 1.1rem;
  position: relative;
`;

const ChickenType = styled.div`
  font-size: 2rem;
`;

const ChickenStatus = styled.div`
  font-size: 1.1rem;
  margin: 2px 0 0 0;
`;

const ChickenWeight = styled.div`
  font-size: 0.95rem;
  color: #666;
`;

const ChickenSelect = styled.input`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 18px;
  height: 18px;
`;

const CrateSection = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px 12px 0 12px;
`;

const Crate = styled.div`
  background: #e0c08d;
  border-radius: 8px;
  box-shadow: 0 2px 4px #0001;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0;
`;

const CrateTitle = styled.div`
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 4px;
`;

const CrateChickens = styled.div`
  display: flex;
  gap: 8px;
`;

const BottomBar = styled.div`
  position: fixed;
  left: 0; right: 0; bottom: 0;
  background: #fff;
  box-shadow: 0 -2px 8px #0002;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 12px 0 10px 0;
  z-index: 10;
`;

const ActionButton = styled.button`
  background: #4CAF50;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  padding: 10px 22px;
  margin: 0 6px;
  font-weight: bold;
  box-shadow: 0 2px 4px #0001;
  cursor: pointer;
  &:disabled {
    background: #bdbdbd;
    cursor: not-allowed;
  }
`;

const FarmPage = () => {
  const { chickens, food, coins, refreshData } = useGame();
  const [selectedChickens, setSelectedChickens] = useState([]);

  // Group chickens for display
  const mothers = chickens.filter(c => c.type === 'mother');
  const chicks = chickens.filter(c => c.type !== 'mother');

  // Chicken status helpers
  const getChickenStatus = (chicken) => {
    if (chicken.status === 'dead') return 'dead';
    if (chicken.status === 'alive') return 'normal';
    if (!chicken.lastFed) return 'hungry';
    const now = new Date();
    const lastFed = new Date(chicken.lastFed);
    const hoursSinceLastFed = (now - lastFed) / (1000 * 60 * 60);
    if (hoursSinceLastFed >= 72) return 'dead';
    if (chicken.type === 'mother') {
      const birthDate = new Date(chicken.birthDate);
      const ageInDays = Math.floor((now - birthDate) / (1000 * 60 * 60 * 24));
      if (ageInDays >= 104) return 'dead';
    }
    if (hoursSinceLastFed < 24) return 'normal';
    return 'hungry';
  };

  const canFeedChicken = (chicken) => {
    if (chicken.status === 'dead') return false;
    if (!chicken.lastFed) return true;
    const hoursSinceLastFed = (Date.now() - new Date(chicken.lastFed).getTime()) / (1000 * 60 * 60);
    return hoursSinceLastFed >= 24;
  };

  const handleSelectChicken = (chickenId) => {
    const chicken = chickens.find(c => c.id === chickenId);
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
        const chickensToFeed = chickens.filter(c => selectedChickens.includes(c.id) && canFeedChicken(c));
        if (chickensToFeed.length === 0) {
          alert('ไก่ที่เลือกยังไม่สามารถให้อาหารได้ ต้องรอ 24 ชั่วโมงหลังจากให้อาหารครั้งล่าสุด');
          return;
        }
        for (const chicken of chickensToFeed) {
          await feedChicken(chicken.id, token);
        }
        refreshData();
        setSelectedChickens([]);
      } catch (error) {
        console.error('Error feeding chickens:', error);
      }
    }
  };

  // Chicken Card rendering
  const renderChickenCard = (chicken) => {
    const status = getChickenStatus(chicken);
    const isSelected = selectedChickens.includes(chicken.id);
    const canFeed = canFeedChicken(chicken);
    const getStatusText = (status) => {
      switch(status) {
        case 'hungry': return 'หิว';
        case 'normal': return 'อิ่ม';
        case 'dead': return 'ตาย';
        default: return status;
      }
    };
    const getStatusEmoji = (status) => {
      switch(status) {
        case 'hungry': return '😫';
        case 'normal': return '😊';
        case 'dead': return '💀';
        default: return '❓';
      }
    };
    return (
      <ChickenCard key={chicken.id}>
        <ChickenSelect
          type="checkbox"
          checked={isSelected}
          onChange={() => handleSelectChicken(chicken.id)}
          disabled={!canFeed}
        />
        <ChickenType>{chicken.type === 'mother' ? '🐔' : '🐤'}</ChickenType>
        <ChickenStatus>{getStatusEmoji(status)} {getStatusText(status)}</ChickenStatus>
        <ChickenWeight>น้ำหนัก: {chicken.weight} kg</ChickenWeight>
      </ChickenCard>
    );
  };

  return (
    <PageContainer>
      <Header>
        <Logo />
        <Title>Flappy Farm</Title>
        <StatusBar>
          <span>เหรียญ: {coins}</span>
          <span>🍗: {food}</span>
          <span>🥚: {mothers.reduce((sum, c) => sum + (c.eggs || 0), 0)}</span>
          <span>🐔: {chickens.length}</span>
        </StatusBar>
      </Header>
      <Section>
        <ChickenRow>
          {mothers.map(chicken => (
            <React.Fragment key={chicken.id}>
              {renderChickenCard(chicken)}
              {chicken.canLayEgg && (
                <div style={{ fontSize: '1.1rem', color: '#ff9800', marginTop: 2, textAlign: 'center' }}>
                  🥚 x {chicken.eggs || 0} <br/>
                  <span style={{ color: '#4CAF50', fontSize: '0.95rem' }}>
                    {chicken.canLayEgg ? 'กำลังออกไข่' : 'ยังไม่ออกไข่'}
                  </span>
                </div>
              )}
            </React.Fragment>
          ))}
        </ChickenRow>
        <CrateSection>
          <Crate>
            <CrateTitle>ลูกไก่</CrateTitle>
            <CrateChickens>
              {chicks.map(renderChickenCard)}
            </CrateChickens>
          </Crate>
        </CrateSection>
      </Section>
      <BottomBar>
        <ActionButton
          onClick={handleFeedSelected}
          disabled={selectedChickens.length === 0 || food < selectedChickens.length * 10}
        >
          ให้อาหารที่เลือก ({selectedChickens.length})
        </ActionButton>
        <ActionButton
          style={{ background: '#ff9800' }}
          onClick={() => alert('ฟีเจอร์ซื้อไก่เร็วๆนี้!')}
        >
          ซื้อไก่
        </ActionButton>
      </BottomBar>
    </PageContainer>
  );
};

export default FarmPage;