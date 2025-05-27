import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ChicksPage = () => {
  const [chicks, setChicks] = useState([]);

  const fetchChicks = async () => {
    const res = await axios.get('/api/chicks');
    setChicks(res.data);
  };

  const feedChick = async (id) => {
    await axios.post(`/api/chicks/feed/${id}`);
    fetchChicks();
  };

  const sellChick = async (id) => {
    await axios.post(`/api/chicks/sell/${id}`);
    fetchChicks();
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
            <button onClick={() => feedChick(chick.id)}>ให้อาหาร</button>
            <button disabled={chick.weight < 3} onClick={() => sellChick(chick.id)}>ขาย</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChicksPage;
