import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameContext } from '../contexts/GameContext';
import { getIncubators } from '../services/api';

const IncubatorPage = () => {
  const { coins, food } = useContext(GameContext);
  const navigate = useNavigate();
  const [incubators, setIncubators] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const incubatorsRes = await getIncubators(token);
        setIncubators(incubatorsRes.data || []);
      } catch (error) {
        console.error('Error fetching incubators:', error);
        if (error.response?.status === 401) {
          navigate('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // คำนวณจำนวน slot ที่ใช้แล้วทั้งหมด
  const totalUsedSlots = incubators.reduce((sum, inc) => sum + inc.usedSlots, 0);
  const totalCapacity = incubators.reduce((sum, inc) => sum + inc.capacity, 0);

  return (
    <div className="incubator-container">
      <div className="incubator-header">
        <div className="resource">
          <span>💰 {coins}</span>
        </div>
        <div className="resource">
          <span>🍗 {food}</span>
        </div>
      </div>

      <div className="incubator-content">
        <h2>เครื่องฟักไข่ ({incubators.length} ตู้)</h2>
        <div style={{ fontSize: '16px', color: '#555', marginBottom: 16 }}>
          ใช้ไปแล้ว {totalUsedSlots}/{totalCapacity} slots
        </div>

        <div className="incubator-grid">
          {incubators.map(incubator => (
            <div key={incubator.id} className="incubator-item">
              <img src="/assets/images/incubator.png" alt="Incubator" />
              <div className="incubator-info">
                <span>ID: {incubator.id}</span>
                <span>ใช้ไปแล้ว: {incubator.usedSlots}/{incubator.capacity} slots</span>
                <span>ซื้อเมื่อ: {new Date(incubator.purchasedAt?.toDate()).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="incubator-footer">
        <button onClick={() => navigate('/shop')}>🛍️ ซื้อเครื่องฟักไข่</button>
        <button onClick={() => navigate('/')}>🏠 กลับหน้าหลัก</button>
      </div>
    </div>
  );
};

export default IncubatorPage;