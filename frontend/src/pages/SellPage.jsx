import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { listMarketOrders, sellChickensToSystem, buyFromMarket, sellToMarket, cancelChickenListing, sellEggs } from '../services/api';

const PageContainer = styled.div`
  max-width: 500px;
  margin: 0 auto;
  padding: 16px;
  min-height: 100vh;
  background: url('/assets/images/sellpage_wallpaper.png') center/contain repeat;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  background: white;
  padding: 16px;
  border-radius: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const Title = styled.h1`
  font-size: 1.5rem;
  color: #333;
  margin: 0;
  text-align: center;
`;

const BackButton = styled.button`
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 16px;
  width: 100%;
  &:hover {
    background: #45a049;
  }
`;

const Section = styled.div`
  background: white;
  padding: 16px;
  border-radius: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const SectionTitle = styled.h2`
  font-size: 1.2rem;
  color: #333;
  margin: 0 0 16px 0;
`;

const GroupCard = styled.div`
  background: #f8f8f8;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
`;

const GroupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const GroupTitle = styled.div`
  font-size: 1.1rem;
  color: #333;
  font-weight: bold;
`;

const GroupCount = styled.div`
  font-size: 0.9rem;
  color: #666;
`;

const SellButton = styled.button`
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 0.9rem;
  cursor: pointer;
  width: 100%;
  &:hover {
    background: #45a049;
  }
  &:disabled {
    background: #cccccc;
    cursor: not-allowed;
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  padding: 24px;
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
`;

const ModalTitle = styled.h3`
  margin: 0 0 16px 0;
  color: #333;
`;

const InputGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: #666;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
`;

const ModalButton = styled.button`
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  &:first-child {
    background: #e0e0e0;
    color: #333;
  }
  &:last-child {
    background: #4CAF50;
    color: white;
  }
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255,255,255,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: #4CAF50;
  z-index: 1000;
`;

const groupChickensByWeightStatus = (chickens) => {
  const groups = {};
  chickens.forEach(chicken => {
    if (chicken.status === 'dead') return; // ข้ามไก่ที่ตายแล้ว
    if (chicken.marketOrderId) return; 
    const key = `${chicken.status}|${chicken.type}|${Number(chicken.weight).toFixed(2)}`;
    if (!groups[key]) {
      groups[key] = {
        status: chicken.status,
        type: chicken.type,
        weight: Number(chicken.weight),
        count: 1,
        ids: [chicken.id],
      };
    } else {
      groups[key].count++;
      groups[key].ids.push(chicken.id);
    }
  });
  return Object.values(groups);
};

const SellPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { chickens, eggs: gameEggs, refreshData } = useGame();
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [sellAmount, setSellAmount] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [activeTab, setActiveTab] = useState('sell');
  const [marketOrders, setMarketOrders] = useState([]);
  const [setPriceGroup, setSetPriceGroup] = useState(null);
  const [marketSellAmount, setMarketSellAmount] = useState('');
  const [marketSellPrice, setMarketSellPrice] = useState('');
  const [sellSystemGroup, setSellSystemGroup] = useState(null);
  const [sellSystemAmount, setSellSystemAmount] = useState('');
  const [buyQuantities, setBuyQuantities] = useState({});

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (activeTab === 'buy') {
      fetchMarketOrders();
    } else {
      // When switching to sell tab, ensure chickens are fresh (in case of unlisting)
      refreshData();
    }
    setLoading(false);
    // eslint-disable-next-line
  }, [currentUser, navigate, activeTab]);

  const fetchMarketOrders = async () => {
    setLoading(true);
    try {
      let token = localStorage.getItem('token');
      try {
        if (currentUser && currentUser.getIdToken) {
          token = await currentUser.getIdToken(true);
          localStorage.setItem('token', token);
        }
      } catch (e) {
        // ignore refresh errors; will fallback to existing token
      }
      const res = await listMarketOrders(token);
      // ตรวจสอบว่า res เป็น array หรือ object ที่มี orders
      let parsedOrders = [];
      if (Array.isArray(res)) {
        parsedOrders = res;
      } else if (Array.isArray(res.orders)) {
        parsedOrders = res.orders;
      } else if (Array.isArray(res.data)) {
        parsedOrders = res.data;
      } else if (res.data && Array.isArray(res.data.orders)) {
        parsedOrders = res.data.orders;
      }
      setMarketOrders(parsedOrders);
    } catch (error) {
      console.error('Error fetching market orders:', error);
      if (error?.response?.status === 401) {
        alert('Session expired. Please re-login.');
      } else {
        alert('Failed to fetch market orders.');
      }
      setMarketOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelListing = async (orderId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found.');
      }
      await cancelChickenListing(orderId, token);
      alert('ยกเลิกการตั้งขายไก่สำเร็จ!');
      refreshData(); // อัปเดตไก่ของผู้ใช้ (ไก่ที่ยกเลิกจะกลับมาใน FarmPage)
      fetchMarketOrders(); // อัปเดตรายการในตลาด
    } catch (error) {
      console.error('Error cancelling market listing:', error);
      alert('ยกเลิกการตั้งขายไก่ไม่สำเร็จ: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Group eggs by type
  const groupEggs = () => {
    const groups = {};
    gameEggs.forEach(egg => {
      const key = egg.type || 'normal';
      if (!groups[key]) {
        groups[key] = {
          type: key,
          count: 1,
          ids: [egg.id]
        };
      } else {
        groups[key].count++;
        groups[key].ids.push(egg.id);
      }
    });
    return Object.values(groups);
  };

  // Handle selling eggs back to system
  const handleSell = async () => {
    if (!selectedGroup) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await sellEggs({ type: selectedGroup.type }, token);
      const sold = res?.data?.sold ?? 0;
      const gained = res?.data?.gained ?? 0;
      alert(`ขายไข่ ${selectedGroup.type} จำนวน ${sold} ได้รับ ${gained} coin`);
      await refreshData();
      setSelectedGroup(null);
      setSellAmount('');
      setSellPrice('');
    } catch (e) {
      console.error('Error selling eggs:', e);
      alert(e.response?.data?.error || 'ขายไข่ล้มเหลว');
    } finally {
      setLoading(false);
    }
  };


  // --- ฟังก์ชันตั้งราคาขาย (ขายในตลาด) ---
  const handleSetPrice = (group) => {
    setSetPriceGroup(group);
    setMarketSellAmount('1');
    setMarketSellPrice('');
  };
  const handleConfirmSetPrice = async () => {
    if (!setPriceGroup || !marketSellAmount || !marketSellPrice) return;

    const amountToSell = parseInt(marketSellAmount);
    const pricePerChicken = parseFloat(marketSellPrice);

    if (isNaN(amountToSell) || amountToSell <= 0 || amountToSell > setPriceGroup.count) {
      alert('จำนวนไก่ไม่ถูกต้อง');
      return;
    }
    if (isNaN(pricePerChicken) || pricePerChicken < 7) {
      alert('ราคาขั้นต่ำ 7 coin');
        return;
      }

    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const chickenIdsToSell = setPriceGroup.ids.slice(0, amountToSell);
      for (const chickenId of chickenIdsToSell) {
        await sellToMarket(chickenId, pricePerChicken, token);
      }
      await refreshData();
      // Refresh market listings so price/status resolve for newly listed items
      await fetchMarketOrders();
      setSetPriceGroup(null);
      setMarketSellAmount('');
      setMarketSellPrice('');
    } catch (e) {
      console.error('Error listing chicken for sale:', e);
      alert('ตั้งราคาขายไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  // --- ฟังก์ชันซื้อไก่จากตลาด ---
  const handleBuyChicken = async (orderId) => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      await buyFromMarket(orderId, token);
      await refreshData();
      fetchMarketOrders();
    } catch (e) {
      alert('ซื้อไก่ไม่สำเร็จ');
    }
    setLoading(false);
  };

  const handleBuyGroup = async (group, idx) => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const qty = Math.max(1, Math.min(parseInt(buyQuantities?.[idx] || '1', 10) || 1, group.count));
      for (let i = 0; i < qty && i < group.orderIds.length; i++) {
        await buyFromMarket(group.orderIds[i], token);
      }
      await refreshData();
      await fetchMarketOrders();
    } catch (e) {
      alert('ไม่สามารถซื้อได้ โปรดลองอีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  // Group open market orders by seller + price + weight + type
  const groupMarketOrdersForBuy = (orders) => {
    const mine = currentUser?.uid;
    const groups = {};
    for (const o of (orders || [])) {
      if (o.status !== 'open') continue;
      if (o.userId === mine) continue; // don't show my own listings in buy tab
      const weight = Number(o.chickenData?.weight || 0);
      const weightKey = weight.toFixed(2);
      const priceKey = Number(o.price || 0).toFixed(2);
      const typeKey = o.chickenData?.type || 'Unknown';
      const key = `${o.userId}|${priceKey}|${weightKey}|${typeKey}`;
      if (!groups[key]) {
        groups[key] = {
          userId: o.userId,
          price: Number(priceKey),
          weight: Number(weightKey),
          type: typeKey,
          count: 0,
          orderIds: []
        };
      }
      groups[key].count += 1;
      groups[key].orderIds.push(o.id);
    }
    return Object.values(groups);
  };

  const [cancelQuantities, setCancelQuantities] = useState({});

  const handleCancelGroup = async (group, idx, mode = 'count') => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const target = mode === 'all'
        ? group.orderIds.length
        : Math.max(1, Math.min(parseInt(cancelQuantities?.[idx] || '1', 10) || 1, group.orderIds.length));
      for (let i = 0; i < target && i < group.orderIds.length; i++) {
        await cancelChickenListing(group.orderIds[i], token);
      }
      await refreshData();
      await fetchMarketOrders();
    } catch (e) {
      alert('ไม่สามารถยกเลิกได้ โปรดลองอีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingOverlay>กำลังโหลด...</LoadingOverlay>;
  }

  if (!currentUser) {
    return null;
  }

  return (
    <PageContainer>
      <Header>
        <Title>Market</Title>
        <div style={{display:'flex',justifyContent:'center',gap:8,marginTop:8}}>
          <button style={{fontWeight:activeTab==='sell'?'bold':'normal'}} onClick={()=>setActiveTab('sell')}>ขาย</button>
          <span>|</span>
          <button style={{fontWeight:activeTab==='buy'?'bold':'normal'}} onClick={()=>setActiveTab('buy')}>ซื้อ</button>
        </div>
      </Header>

      {activeTab === 'sell' && (
        <>
      <Section>
            <SectionTitle>รายการไก่ในฟาร์มของคุณที่พร้อมขาย</SectionTitle>
            {groupChickensByWeightStatus(chickens).length > 0 ? (
              groupChickensByWeightStatus(chickens).map((group, idx) => (
                <GroupCard key={idx}>
                  <GroupHeader>
                    <GroupTitle>{`ไก่${group.type} | ${group.weight.toFixed(2)} kg | สถานะ: ${group.status === 'hungry' ? 'หิว' : 'ปกติ'}`}</GroupTitle>
                    <GroupCount>{`จำนวน: ${group.count} ตัว`}</GroupCount>
                  </GroupHeader>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <SellButton onClick={() => {
                      setSellSystemGroup(group);
                      setSellSystemAmount(group.count.toString());
                    }}>
                      ขายทันที
                    </SellButton>

                    <SellButton 
                      onClick={() => handleSetPrice(group)}
                      style={{ backgroundColor: '#3F51B5' }} // สีน้ำเงินสำหรับตั้งราคา
                    >
                      ตั้งราคาขาย
                    </SellButton>
                  </div>
                </GroupCard>
              ))
            ) : (
              <p>ไม่มีไก่ในฟาร์มที่พร้อมขาย</p>
            )}            
      </Section>
      <Section>
        <SectionTitle>รายการที่คุณเปิดขาย (แบบ grouped)</SectionTitle>
        {(() => {
          const mine = currentUser?.uid;
          const groups = {};
          (marketOrders || []).forEach((o) => {
            if (o.status !== 'open' || o.userId !== mine) return;
            const weightKey = Number(o.chickenData?.weight || 0).toFixed(2);
            const priceKey = Number(o.price || 0).toFixed(2);
            const typeKey = o.chickenData?.type || 'Unknown';
            const key = `${priceKey}|${weightKey}|${typeKey}`;
            if (!groups[key]) {
              groups[key] = { price: Number(priceKey), weight: Number(weightKey), type: typeKey, count: 0, orderIds: [] };
            }
            groups[key].count += 1;
            groups[key].orderIds.push(o.id);
          });
          const list = Object.values(groups);
          return list.length > 0 ? (
            list.map((g, idx) => (
              <GroupCard key={idx}>
                <GroupHeader>
                  <GroupTitle>{`ไก่ ${g.type} | ${g.weight.toFixed(2)} kg`}</GroupTitle>
                  <GroupCount>{`ราคา: ${g.price} Coins | จำนวน: ${g.count}`}</GroupCount>
                </GroupHeader>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* แถวบน: input + ยกเลิกตามจำนวน */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    max={g.count}
                    value={cancelQuantities[idx] || '1'}
                    onChange={(e) =>
                      setCancelQuantities({ ...cancelQuantities, [idx]: e.target.value })
                    }
                    style={{ width: 100, padding: 6, borderRadius: 8, border: '1px solid #ccc' }}
                  />
                  <SellButton
                    onClick={() => handleCancelGroup(g, idx, 'count')}
                    style={{ backgroundColor: '#f44336', whiteSpace: 'nowrap' }} // กันตัดบรรทัด
                  >
                    ยกเลิกตามจำนวน
                  </SellButton>
                </div>

                {/* แถวล่าง: ยกเลิกทั้งหมด */}
                <SellButton
                  onClick={() => handleCancelGroup(g, idx, 'all')}
                  style={{ backgroundColor: '#D32F2F' }}
                >
                  ยกเลิกทั้งหมด
                </SellButton>
              </div>

              </GroupCard>
            ))
          ) : (
            <p>ยังไม่มีรายการที่คุณเปิดขาย</p>
          );
        })()}
      </Section>
      <Section>
        <SectionTitle>ไข่</SectionTitle>
            {groupEggs().map((group, idx) => (
              <GroupCard key={idx}>
            <GroupHeader>
              <GroupTitle>{group.type}</GroupTitle>
              <GroupCount>{group.count} ฟอง</GroupCount>
            </GroupHeader>
            <SellButton onClick={() => setSelectedGroup(group)}>
              ขาย
            </SellButton>
          </GroupCard>
        ))}
      </Section>
        </>
      )}

      {activeTab === 'buy' && false && (
        <Section>
          <SectionTitle>รายการไก่ที่ตั้งขายในตลาด</SectionTitle>
          {marketOrders.filter(order => order.status === 'open' && order.userId !== currentUser.uid).length > 0 ? (
            marketOrders.filter(order => order.status === 'open' && order.userId !== currentUser.uid).map((order) => (
              <GroupCard key={order.id}>
                <GroupHeader>
                  <GroupTitle>{`ไก่ ${order.chickenData?.type || 'Unknown'} | ${Number(order.chickenData?.weight || 0).toFixed(2)} kg`}</GroupTitle>
                  <GroupCount>{`ราคา: ${order.price} Coins`}</GroupCount>
                </GroupHeader>
                <SellButton onClick={() => handleBuyChicken(order.id)}>
                  ซื้อ
                </SellButton>
              </GroupCard>
            ))
          ) : (
            <p>ยังไม่มีไก่ให้ซื้อในตลาด</p>
          )}
        </Section>
      )}

      {activeTab === 'buy' && (
        <Section>
          <SectionTitle>รายการเปิดขาย</SectionTitle>
          {(() => {
            const grouped = groupMarketOrdersForBuy(marketOrders);
            return grouped.length > 0 ? (
              grouped.map((g, idx) => (
                <GroupCard key={idx}>
                  <GroupHeader>
                    <GroupTitle>{`ไก่ ${g.type} | ${g.weight.toFixed(2)} kg`}</GroupTitle>
                    <GroupCount>{`ราคา: ${g.price} Coins | จำนวน: ${g.count}`}</GroupCount>
                  </GroupHeader>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="number"
                      min="1"
                      max={g.count}
                      value={buyQuantities[idx] || '1'}
                      onChange={(e) => setBuyQuantities({ ...buyQuantities, [idx]: e.target.value })}
                      style={{ width: 100, padding: 6, borderRadius: 8, border: '1px solid #ccc' }}
                    />
                    <SellButton onClick={() => handleBuyGroup(g, idx)}>
                      ซื้อจำนวนตามที่เลือก
                    </SellButton>
                  </div>
                </GroupCard>
              ))
            ) : (
              <p>ตอนนี้ยังไม่มีรายการเปิดขาย</p>
            );
          })()}
        </Section>
      )}

      <BackButton onClick={() => navigate('/farm')}>
        กลับไปที่ฟาร์ม
      </BackButton>

      {sellSystemGroup && (
  <Modal>
    <ModalContent>
      <ModalTitle>ขายแม่ไก่ให้ระบบ {sellSystemGroup.type} - {sellSystemGroup.weight.toFixed(2)} kg</ModalTitle>
      <InputGroup>
        <Label>จำนวนที่ต้องการขาย (ราคา 7 coin/ตัว)</Label>
        <Input
          type="number"
          min="1"
          max={sellSystemGroup.count}
          value={sellSystemAmount}
          onChange={(e) => setSellSystemAmount(e.target.value)}
          placeholder={`จำนวน (สูงสุด ${sellSystemGroup.count})`}
        />
      </InputGroup>
      <ButtonGroup>
        <ModalButton onClick={() => {
          setSellSystemGroup(null);
          setSellSystemAmount('');
        }}>ยกเลิก</ModalButton>
        <ModalButton onClick={async () => {
          const amount = parseInt(sellSystemAmount, 10);
          if (isNaN(amount) || amount <= 0 || amount > sellSystemGroup.count || amount > 100) {
            alert('จำนวนขายต้องเป็น 1-100 และไม่เกินจำนวนที่มี');
            return;
          }
          setLoading(true);
          const token = localStorage.getItem('token');
          try {
            await sellChickensToSystem(amount, token);
            alert(`ขายแม่ไก่ ${amount} ตัวสำเร็จ!`);
            await refreshData();
            setSellSystemGroup(null);
            setSellSystemAmount('');
          } catch (e) {
            console.error('Error selling chickens to system:', e);
            alert(e.response?.data?.error || 'ขายคืนระบบไม่สำเร็จ');
          }
          setLoading(false);
        }}>ยืนยันขาย</ModalButton>
      </ButtonGroup>
    </ModalContent>
  </Modal>
)}


      {/* Modal ตั้งราคาขาย */}
      {setPriceGroup && (
        <Modal>
          <ModalContent>
            <ModalTitle>ตั้งราคาขาย {setPriceGroup.type} - {setPriceGroup.weight.toFixed(2)} kg (จำนวน {setPriceGroup.count} ตัว)</ModalTitle>
            <InputGroup>
              <Label>จำนวนที่ต้องการตั้งขาย</Label>
              <Input
                type="number"
                min="1"
                max={setPriceGroup.count}
                value={marketSellAmount}
                onChange={e => setMarketSellAmount(e.target.value)}
                placeholder={`จำนวน (สูงสุด ${setPriceGroup.count})`}
              />
            </InputGroup>
            <InputGroup>
              <Label>ราคาต่อตัว (ขั้นต่ำ 7 coin)</Label>
              <Input
                type="number"
                min="7"
                value={marketSellPrice}
                onChange={e => setMarketSellPrice(e.target.value)}
                placeholder="ราคา"
              />
            </InputGroup>
            <ButtonGroup>
              <ModalButton onClick={()=>{setSetPriceGroup(null);setMarketSellAmount('');setMarketSellPrice('');}}>ยกเลิก</ModalButton>
              <ModalButton onClick={handleConfirmSetPrice}>ยืนยัน</ModalButton>
            </ButtonGroup>
          </ModalContent>
        </Modal>
      )}

      {/* Modal ขายไข่เดิม (ปรับ label ราคา) */}
      {selectedGroup && (
        <Modal>
          <ModalContent>
            <ModalTitle>ขายไข่</ModalTitle>
            <InputGroup>
              <Label>จำนวนที่ต้องการขาย</Label>
              <Input
                type="number"
                min="1"
                max={selectedGroup.count}
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                placeholder={`จำนวน (สูงสุด ${selectedGroup.count})`}
              />
            </InputGroup>
              <InputGroup>
              <Label>ราคาต่อฟอง (ขั้นต่ำ 1 coin)</Label>
                <Input
                  type="number"
                  min="1"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="ราคา"
                />
              </InputGroup>
            <ButtonGroup>
              <ModalButton onClick={() => {
                setSelectedGroup(null);
                setSellAmount('');
                setSellPrice('');
              }}>
                ยกเลิก
              </ModalButton>
              <ModalButton onClick={handleSell}>
                ยืนยัน
              </ModalButton>
            </ButtonGroup>
          </ModalContent>
        </Modal>
      )}

      {loading && <LoadingOverlay>กำลังขาย...</LoadingOverlay>}
    </PageContainer>
  );
};

export default SellPage; 
