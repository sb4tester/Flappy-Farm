import React, { useEffect, useState } from 'react';
import axios from 'axios';

const MyEggsPage = () => {
  const [eggs, setEggs] = useState([]);

  const fetchEggs = async () => {
    const res = await axios.get('/api/eggs');
    setEggs(res.data);
  };

  const claimEgg = async () => {
    const res = await axios.post('/api/eggs/claim');
    alert(`คุณได้รับไข่ประเภท: ${res.data.eggType}`);
    fetchEggs();
  };

  const insertToIncubator = async (eggId) => {
    await axios.post('/api/incubator/insert', { eggId });
    alert('ใส่ไข่เข้าตู้ฟักแล้ว');
    fetchEggs();
  };

  useEffect(() => {
    fetchEggs();
  }, []);

  return (
    <div>
      <h2>ไข่ของฉัน</h2>
      <button onClick={claimEgg}>รับไข่</button>
      <ul>
        {eggs.map((egg) => (
          <li key={egg.id}>
            🥚 {egg.type}
            <button onClick={() => insertToIncubator(egg.id)}>ใส่ตู้ฟัก</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MyEggsPage;
