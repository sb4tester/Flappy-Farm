import React from 'react';
import styled from 'styled-components';

const MarketContainer = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Market = () => {
  return (
    <MarketContainer>
      <h1>ตลาด</h1>
      <p>กำลังพัฒนา...</p>
    </MarketContainer>
  );
};

export default Market; 