import React, { useState } from 'react';
import axios from 'axios';

const IncubatorPage = () => {
  const [duration, setDuration] = useState(1);
  const [message, setMessage] = useState('');

  const rent = async () => {
    await axios.post('/incubator/rent', { duration });
    setMessage('Incubator rented!');
  };

  const hatch = async () => {
    const res = await axios.post('/incubator/hatch', {});
    setMessage(\`Hatched \${res.data.chickens.length} chickens\`);
  };

  return (
    <div>
      <h2>Incubator</h2>
      <div>
        <input
          type="number"
          value={duration}
          onChange={e => setDuration(e.target.value)}
        />
        <button onClick={rent}>Rent</button>
      </div>
      <button onClick={hatch}>Hatch Eggs</button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default IncubatorPage;
