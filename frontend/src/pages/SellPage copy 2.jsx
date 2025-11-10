import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import {
  listMarketOrders,
  sellChickensToSystem,
  buyFromMarket,
  sellToMarket,
  cancelChickenListing,
  sellEggs
} from '../services/api';

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
  background: #fff;
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

const Section = styled.div`
  background: #fff;
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
  font-size: 1.05rem;
  color: #333;
  font-weight: 600;
`;

const GroupCount = styled.div`
  font-size: 0.92rem;
  color: #666;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
`;

const Button = styled.button`
  background: #4CAF50;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 0.95rem;
  cursor: pointer;
  &:hover { background: #43a047; }
`;

const DangerButton = styled(Button)`
  background: #f44336;
  &:hover { background: #e53935; }
`;

const BackButton = styled(Button)`
  width: 100%;
  margin-top: 12px;
`;

const EggGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
`;

const Modal = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: #fff;
  padding: 20px;
  border-radius: 14px;
  width: 90%;
  max-width: 420px;
`;

const ModalTitle = styled.h3`
  margin: 0 0 12px 0;
`;

const InputGroup = styled.div`
  margin: 10px 0;
`;

const Label = styled.label`
  display: block;
  font-size: 0.92rem;
  color: #444;
  margin-bottom: 6px;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #ddd;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`;

const ModalButton = styled(Button)`
  flex: 1;
`;

const LoadingOverlay = styled.div`
  position: fixed; inset: 0;
  background: rgba(255,255,255,0.8);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem; color: #4CAF50; z-index: 1000;
`;

// Helpers
function groupChickensByWeightStatus(chickens) {
  const groups = {};
  (chickens || []).forEach((c) => {
    const status = c.status;
    const type = c.type;
    const weight = Number(c.weight || 0);
    const key = `${status}|${type}|${weight.toFixed(2)}`;
    if (!groups[key]) {
      groups[key] = { status, type, weight, count: 0, ids: [] };
    }
    groups[key].count += 1;
    groups[key].ids.push(c.id || c._id || c.fsId);
  });
  return Object.values(groups);
}

function groupEggsList(eggs) {
  const groups = {};
  (eggs || []).forEach((e) => {
    const raw = (e.type || 'normal').toLowerCase();
    const t = raw === 'bronze' ? 'copper' : raw;
    if (!groups[t]) groups[t] = { type: t, count: 0, ids: [] };
    groups[t].count += 1;
    groups[t].ids.push(e.id || e._id);
  });
  // order: normal -> copper -> silver -> gold
  const order = { normal: 0, copper: 1, silver: 2, gold: 3 };
  return Object.values(groups).sort((a,b) => (order[a.type]??99) - (order[b.type]??99));
}

function eggImage(type) {
  const t = String(type || 'normal').toLowerCase();
  if (t === 'gold') return '/assets/images/Gold-Egg.png';
  if (t === 'silver') return '/assets/images/Silver-Egg.png';
  if (t === 'copper' || t === 'bronze') return '/assets/images/copper-Egg.png';
  return '/assets/images/head-egg.png';
}

export default function SellPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { chickens, eggs, refreshData } = useGame();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('sell');
  const [marketOrders, setMarketOrders] = useState([]);

  // Modals
  const [sellSystemGroup, setSellSystemGroup] = useState(null);
  const [sellSystemAmount, setSellSystemAmount] = useState('');

  const [setPriceGroup, setSetPriceGroup] = useState(null);
  const [marketSellAmount, setMarketSellAmount] = useState('');
  const [marketSellPrice, setMarketSellPrice] = useState('');

  const [selectedEggGroup, setSelectedEggGroup] = useState(null);
  const [sellEggAmount, setSellEggAmount] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    const run = async () => {
      try {
        setLoading(true);
        if (activeTab === 'buy') {
          await fetchMarketOrders();
        } else {
          await refreshData();
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [currentUser, activeTab]);

  const fetchMarketOrders = async () => {
    try {
      let token = localStorage.getItem('token');
      if (currentUser && currentUser.getIdToken) {
        token = await currentUser.getIdToken(true);
        localStorage.setItem('token', token);
      }
      const res = await listMarketOrders(token);
      const parsed = Array.isArray(res?.orders)
        ? res.orders
        : Array.isArray(res?.data?.orders)
          ? res.data.orders
          : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : [];
      setMarketOrders(parsed);
    } catch (e) {
      setMarketOrders([]);
    }
  };

  // Derived lists
  const sellableChickenGroups = groupChickensByWeightStatus(
    (chickens || []).filter(c => c && c.type === 'mother' && c.status !== 'dead' && Number(c.weight || 0) >= 3 && !c.marketOrderId)
  );
  const eggGroups = groupEggsList(eggs || []);

  // Actions: System sell
  const confirmSellToSystem = async () => {
    if (!sellSystemGroup) return;
    const amount = Math.max(1, Math.min(parseInt(sellSystemAmount || '0', 10) || 0, sellSystemGroup.count));
    if (amount <= 0) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await sellChickensToSystem(amount, token);
      await refreshData();
      setSellSystemGroup(null);
      setSellSystemAmount('');
    } catch (e) {
      alert(e?.response?.data?.error || 'ขายคืนระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  // Actions: Set price listing
  const handleSetPrice = (group) => {
    setSetPriceGroup(group);
    setMarketSellAmount('1');
    setMarketSellPrice('');
  };
  const confirmSetPrice = async () => {
    if (!setPriceGroup) return;
    const qty = Math.max(1, Math.min(parseInt(marketSellAmount || '0', 10) || 0, setPriceGroup.count));
    const price = parseFloat(marketSellPrice);
    if (!qty || qty <= 0 || qty > setPriceGroup.count) return alert('จำนวนไม่ถูกต้อง');
    if (!(price >= 7)) return alert('ราคาต้องไม่น้อยกว่า 7 coin');
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const ids = setPriceGroup.ids.slice(0, qty);
      for (const id of ids) {
        await sellToMarket(id, price, token);
      }
      await refreshData();
      await fetchMarketOrders();
      setSetPriceGroup(null);
      setMarketSellAmount('');
      setMarketSellPrice('');
    } catch (e) {
      alert(e?.response?.data?.error || 'ตั้งราคาขายไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  // Actions: Eggs sell
  const confirmSellEggs = async () => {
    if (!selectedEggGroup) return;
    const qty = Math.max(1, Math.min(parseInt(sellEggAmount || '0', 10) || 0, selectedEggGroup.count));
    if (qty <= 0) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await sellEggs({ type: selectedEggGroup.type, quantity: qty }, token);
      await refreshData();
      setSelectedEggGroup(null);
      setSellEggAmount('');
    } catch (e) {
      alert(e?.response?.data?.error || 'ขายไข่ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

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
            <SectionTitle>จัดการไก่ของฉัน</SectionTitle>
            {sellableChickenGroups.length > 0 ? (
              sellableChickenGroups.map((group, idx) => (
                <GroupCard key={idx}>
                  <GroupHeader>
                    <GroupTitle>{`ไก่${group.type} | ${group.weight.toFixed(2)} kg | สถานะ: ${group.status === 'hungry' ? 'หิว' : 'ปกติ'}`}</GroupTitle>
                    <GroupCount>{`จำนวน: ${group.count} ตัว`}</GroupCount>
                  </GroupHeader>
                  <ButtonRow>
                    <Button onClick={() => { setSellSystemGroup(group); setSellSystemAmount(String(group.count)); }}>ขายคืนระบบ</Button>
                    <Button style={{ background:'#3F51B5' }} onClick={() => handleSetPrice(group)}>ตั้งราคาขาย</Button>
                  </ButtonRow>
                </GroupCard>
              ))
            ) : (
              <p>ไม่มีไก่ที่พร้อมขาย</p>
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
                if (!groups[key]) groups[key] = { price: Number(priceKey), weight: Number(weightKey), type: typeKey, count: 0, orderIds: [] };
                groups[key].count += 1; groups[key].orderIds.push(o.id);
              });
              const list = Object.values(groups);
              return list.length > 0 ? (
                list.map((g, idx) => (
                  <GroupCard key={idx}>
                    <GroupHeader>
                      <GroupTitle>{`ไก่ ${g.type} | ${g.weight.toFixed(2)} kg`}</GroupTitle>
                      <GroupCount>{`ราคา: ${g.price} Coins | จำนวน: ${g.count}`}</GroupCount>
                    </GroupHeader>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <input type="number" min="1" defaultValue="1" style={{ width: 100, padding: 6, borderRadius: 8, border:'1px solid #ccc' }} id={`cancelQty-${idx}`} />
                        <DangerButton onClick={() => {
                          const el = document.getElementById(`cancelQty-${idx}`);
                          const val = Math.max(1, Math.min(parseInt(el?.value || '1', 10) || 1, g.orderIds.length));
                          const token = localStorage.getItem('token');
                          (async () => {
                            setLoading(true);
                            try {
                              for (let i = 0; i < val && i < g.orderIds.length; i++) {
                                await cancelChickenListing(g.orderIds[i], token);
                              }
                              await refreshData();
                              await fetchMarketOrders();
                            } finally { setLoading(false); }
                          })();
                        }}>ยกเลิกรายการบางส่วน</DangerButton>
                      </div>
                      <DangerButton onClick={() => {
                        const token = localStorage.getItem('token');
                        (async () => {
                          setLoading(true);
                          try {
                            for (let i = 0; i < g.orderIds.length; i++) {
                              await cancelChickenListing(g.orderIds[i], token);
                            }
                            await refreshData();
                            await fetchMarketOrders();
                          } finally { setLoading(false); }
                        })();
                      }}>ยกเลิกทั้งหมด</DangerButton>
                    </div>
                  </GroupCard>
                ))
              ) : (
                <p>ไม่มีประกาศขายของคุณ</p>
              );
            })()}
          </Section>

          <Section>
            <SectionTitle>ไข่ของฉัน</SectionTitle>
            <EggGrid>
              {eggGroups.map((group, idx) => (
                <GroupCard key={idx}>
                  <img src={eggImage(group.type)} alt={group.type} style={{ width: 80, height: 'auto', objectFit: 'contain', marginBottom: 8 }} />
                  <Button onClick={() => { setSelectedEggGroup(group); setSellEggAmount(''); }}>{`ขาย (${group.count} ฟอง)`}</Button>
                </GroupCard>
              ))}
            </EggGrid>
          </Section>
        </>
      )}

      {activeTab === 'buy' && (
        <Section>
          <SectionTitle>ประกาศขายที่เปิดอยู่</SectionTitle>
          {marketOrders.filter(o => o.status === 'open' && o.userId !== currentUser.uid).map((o) => (
            <GroupCard key={o.id}>
              <GroupHeader>
                <GroupTitle>{`ไก่ ${o.chickenData?.type || 'Unknown'} | ${Number(o.chickenData?.weight || 0).toFixed(2)} kg`}</GroupTitle>
                <GroupCount>{`ราคา: ${o.price} Coins`}</GroupCount>
              </GroupHeader>
              <Button onClick={async () => {
                setLoading(true);
                const token = localStorage.getItem('token');
                try {
                  await buyFromMarket(o.id, token);
                  await refreshData();
                  await fetchMarketOrders();
                } finally { setLoading(false); }
              }}>ซื้อ</Button>
            </GroupCard>
          ))}
        </Section>
      )}

      <BackButton onClick={() => navigate('/farm')}>กลับไปฟาร์ม</BackButton>

      {/* Modal: Sell to system */}
      {sellSystemGroup && (
        <Modal>
          <ModalContent>
            <ModalTitle>{`ขายแม่ไก่ให้ระบบ ${sellSystemGroup.type} - ${sellSystemGroup.weight.toFixed(2)} kg`}</ModalTitle>
            <InputGroup>
              <Label>จำนวนที่จะขาย (สูงสุด {sellSystemGroup.count})</Label>
              <Input type="number" min="1" max={sellSystemGroup.count} value={sellSystemAmount} onChange={e=>setSellSystemAmount(e.target.value)} placeholder={`จำนวน (สูงสุด ${sellSystemGroup.count})`} />
            </InputGroup>
            <ButtonGroup>
              <ModalButton onClick={() => { setSellSystemGroup(null); setSellSystemAmount(''); }}>ยกเลิก</ModalButton>
              <ModalButton onClick={confirmSellToSystem}>ยืนยันขาย</ModalButton>
            </ButtonGroup>
          </ModalContent>
        </Modal>
      )}

      {/* Modal: Set price */}
      {setPriceGroup && (
        <Modal>
          <ModalContent>
            <ModalTitle>{`ตั้งราคาขาย ${setPriceGroup.type} - ${setPriceGroup.weight.toFixed(2)} kg (จำนวน ${setPriceGroup.count} ตัว)`}</ModalTitle>
            <InputGroup>
              <Label>จำนวนที่จะตั้งขาย</Label>
              <Input type="number" min="1" max={setPriceGroup.count} value={marketSellAmount} onChange={e=>setMarketSellAmount(e.target.value)} placeholder={`จำนวน (สูงสุด ${setPriceGroup.count})`} />
            </InputGroup>
            <InputGroup>
              <Label>ราคาต่อ 1 ตัว (ขั้นต่ำ 7 coin)</Label>
              <Input type="number" min="7" value={marketSellPrice} onChange={e=>setMarketSellPrice(e.target.value)} placeholder="ราคา" />
            </InputGroup>
            <ButtonGroup>
              <ModalButton onClick={() => { setSetPriceGroup(null); setMarketSellAmount(''); setMarketSellPrice(''); }}>ยกเลิก</ModalButton>
              <ModalButton onClick={confirmSetPrice}>ยืนยันตั้งขาย</ModalButton>
            </ButtonGroup>
          </ModalContent>
        </Modal>
      )}

      {/* Modal: Sell eggs */}
      {selectedEggGroup && (
        <Modal>
          <ModalContent>
            <ModalTitle>ขายไข่</ModalTitle>
            <InputGroup>
              <Label>จำนวนที่จะขาย (สูงสุด {selectedEggGroup.count})</Label>
              <Input type="number" min="1" max={selectedEggGroup.count} value={sellEggAmount} onChange={e=>setSellEggAmount(e.target.value)} placeholder={`จำนวน (สูงสุด ${selectedEggGroup.count})`} />
            </InputGroup>
            <div style={{ marginTop: 8, color: '#4CAF50', fontWeight: 'bold' }}>
              จะได้รับ: {(() => {
                const qty = Math.max(1, Math.min(parseInt(sellEggAmount || '0', 10) || 0, selectedEggGroup.count));
                const t = (selectedEggGroup.type || 'normal').toLowerCase();
                const unit = t === 'normal' ? 0.1 : (t === 'gold' ? 1000 : (t === 'silver' ? 100 : 10));
                return (qty * unit).toFixed(2);
              })()} coin
            </div>
            <ButtonGroup>
              <ModalButton onClick={() => { setSelectedEggGroup(null); setSellEggAmount(''); }}>ยกเลิก</ModalButton>
              <ModalButton onClick={confirmSellEggs}>ยืนยันขาย</ModalButton>
            </ButtonGroup>
          </ModalContent>
        </Modal>
      )}

      {loading && <LoadingOverlay>กำลังประมวลผล...</LoadingOverlay>}
    </PageContainer>
  );
}

