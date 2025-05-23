
import React, { useContext } from 'react';
import { GameContext } from '../contexts/GameContext';
import coinIcon from '../../public/assets/images/coin-250x250.png';
import soundIcon from '../../public/assets/images/volum-250x250.png';

const Header = () => {
  const { coins, farmName, soundOn, toggleSound } = useContext(GameContext);

  return (
    <div className="header">
      <img src={coinIcon} alt="Coins" style={{ width: 40 }} />
      <span>{coins.toLocaleString()}</span>
      <span>{farmName}</span>
      <button onClick={toggleSound}>
        <img src={soundIcon} alt="Sound Control" style={{ width: 40 }} />
      </button>
    </div>
  );
};

export default Header;
