
import React, { createContext, useState } from 'react';

export const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [coins, setCoins] = useState(8000000);
  const [chickens, setChickens] = useState(3330);
  const [eggs, setEggs] = useState(1300);
  const [food, setFood] = useState(1250);
  const [farmName, setFarmName] = useState('BOSS');
  const [soundOn, setSoundOn] = useState(true);

  const toggleSound = () => setSoundOn(!soundOn);

  return (
    <GameContext.Provider value={{
      coins, chickens, eggs, food, farmName, soundOn, toggleSound,
      setCoins, setChickens, setEggs, setFood
    }}>
      {children}
    </GameContext.Provider>
  );
};
