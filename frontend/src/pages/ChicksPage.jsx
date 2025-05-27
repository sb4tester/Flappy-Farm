import React, { useEffect, useState } from 'react';
import { getChicks, feedChick, sellChick } from '../services/api';

const ChicksPage = () => {
  const [chicks, setChicks] = useState([]);

  const fetchChicks = async () => {
    try {
      const res = await getChicks();
      setChicks(res.data.chicks || []);
    } catch (error) {
      console.error('Failed to fetch chicks:', error);
    }
  };

  const handleFeed = async (id) => {
    try {
      await feedChick(id);
      fetchChicks();
    } catch (error) {
      console.error('Failed to feed chick:', error);
    }
  };

  const handleSell = async (id) => {
    try {
      await sellChick(id);
      fetchChicks();
    } catch (error) {
      console.error('Failed to sell chick:', error);
    }
  };

  useEffect(() => {
    fetchChicks();
  }, []);

  return (
    <div>
      <h2>ลูกไก่ของฉัน</h2>
      <ul>
        {chicks.map((chick) => (
          <li key={chick.id}>
            🐣 น้ำหนัก: {chick.weight?.toFixed(2)} กก.
            <button onClick={() => handleFeed(chick.id)}>ให้อาหาร</button>
            <button disabled={chick.weight < 3} onClick={() => handleSell(chick.id)}>ขาย</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChicksPage;
