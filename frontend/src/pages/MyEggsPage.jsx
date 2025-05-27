import React, { useEffect, useState } from 'react';
import { getEggs, claimEgg, insertToIncubator } from '../services/api';

const MyEggsPage = () => {
  const [eggs, setEggs] = useState([]);

  const fetchEggs = async () => {
    try {
      const res = await getEggs();
      setEggs(res.data.eggs || []);
    } catch (error) {
      console.error('Failed to fetch eggs:', error);
    }
  };

  const handleClaim = async () => {
    try {
      const res = await claimEgg();
      setEggs(res.data.eggs || []);
    } catch (error) {
      console.error('Failed to claim egg:', error);
    }
  };

  const handleInsertToIncubator = async (eggId) => {
    try {
      await insertToIncubator({ eggId });
      fetchEggs();
    } catch (error) {
      console.error('Failed to insert to incubator:', error);
    }
  };

  useEffect(() => {
    fetchEggs();
  }, []);

  return (
    <div>
      <h2>ไข่ของฉัน</h2>
      <button onClick={handleClaim}>รับไข่</button>
      <ul>
        {eggs.map((egg) => (
          <li key={egg.id}>
            🥚 {egg.type}
            <button onClick={() => handleInsertToIncubator(egg.id)}>ใส่ตู้ฟัก</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MyEggsPage;
