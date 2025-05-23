import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ReferralTree = () => {
  const [tree, setTree] = useState([]);

  useEffect(() => {
    const fetchTree = async () => {
      const res = await axios.get('/referral/tree');
      setTree(res.data.tree);
    };
    fetchTree();
  }, []);

  return (
    <div>
      <h2>Your Referral Network</h2>
      <ul>
        {tree.map((node, idx) => (
          <li key={idx}>{node.username} - Level {node.level}</li>
        ))}
      </ul>
    </div>
  );
};

export default ReferralTree;
