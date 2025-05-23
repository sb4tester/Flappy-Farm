import React, { useEffect, useState } from 'react';
import axios from 'axios';

const MarketPage = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      const res = await axios.get('/market/orders');
      setOrders(res.data.orders);
    };
    fetchOrders();
  }, []);

  return (
    <div>
      <h2>Market</h2>
      {orders.map(o => (
        <div key={o.id}>
          <span>{o.type} #{o.targetId} @ {o.price} for {o.quantity}</span>
          <button onClick={() => axios.post(\`/market/fill/\${o.id}\`)}>Fill</button>
        </div>
      ))}
    </div>
  );
};

export default MarketPage;
