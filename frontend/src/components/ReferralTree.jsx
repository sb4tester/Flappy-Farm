import React, { useEffect, useState } from 'react';
import { getReferralTree } from '../services/api';

const ReferralTree = () => {
  const [tree, setTree] = useState([]);

  useEffect(() => {
    const fetchTree = async () => {
      try {
        const res = await getReferralTree();
        setTree(res.data.tree);
      } catch (error) {
        console.error('Failed to fetch referral tree:', error);
      }
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
