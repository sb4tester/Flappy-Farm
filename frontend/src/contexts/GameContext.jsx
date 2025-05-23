import React, { createContext, useState, useEffect } from 'react';
import API from '../api';

export const GameContext = createContext();

export default function GameProvider({ children }) {
  const [coins, setCoins] = useState(0);
  const [chickens, setChickens] = useState(0);
  const [eggs, setEggs] = useState(0);
  const [food, setFood] = useState(0);

  useEffect(() => {
    // TODO: fetch initial data
  }, []);

  const toggleSound = () => {};

  return (
    <GameContext.Provider value={{ coins, chickens, eggs, food, toggleSound }}>
      {children}
    </GameContext.Provider>
  );
}
