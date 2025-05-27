import React, { useEffect, useState } from 'react';
import { getReferralTree } from '../services/api';

const renderTree = (nodes, level = 1) => (
  <ul>
    {nodes.map((node) => (
      <li key={node.uid}>
        👤 ชั้น {level}: {node.uid}
        {node.children && node.children.length > 0 && renderTree(node.children, level + 1)}
      </li>
    ))}
  </ul>
);

const ReferralPage = () => {
  const [tree, setTree] = useState([]);

  useEffect(() => {
    getReferralTree()
      .then(res => setTree(res.data.tree))
      .catch(console.error);
  }, []);

  return (
    <div>
      <h2>ต้นสายสายพาบ (Referral Tree)</h2>
      {renderTree(tree)}
    </div>
  );
};

export default ReferralPage;
