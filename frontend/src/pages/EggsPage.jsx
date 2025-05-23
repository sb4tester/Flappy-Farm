import React, { useEffect, useState } from 'react';
import axios from 'axios';

const EggsPage = () => {
  const [eggs, setEggs] = useState([]);

  useEffect(() => {
    const fetchEggs = async () => {
      const res = await axios.get('/eggs');
      setEggs(res.data.eggs);
    };
    fetchEggs();
  }, []);

  const sell = async (eggId) => {
    await axios.post('/eggs/sell', { eggIds: [eggId] });
    setEggs(eggs.filter(e => e.id !== eggId));
  };

  return (
    <div>
      <h2>Your Eggs</h2>
      {eggs.map(e => (
        <div key={e.id}>
          <span>Egg #{e.id} - {e.type}</span>
          <button onClick={() => sell(e.id)}>Sell</button>
        </div>
      ))}
    </div>
  );
};

export default EggsPage;
