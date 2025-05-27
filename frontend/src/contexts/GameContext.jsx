import React, { createContext, useState, useEffect } from 'react';
import {
  getBalance,
  getChickens,
  getEggs,
  getFood
} from '../services/api';

export const GameContext = createContext();

export default function GameProvider({ children }) {
  const [coins, setCoins] = useState(0);
  const [chickens, setChickens] = useState([]);
  const [eggs, setEggs] = useState([]);
  const [food, setFood] = useState(0);

  const refreshData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const [balanceRes, chickensRes, eggsRes, foodsRes] = await Promise.all([
        getBalance(token),
        getChickens(token),
        getEggs(token),
        getFood(token)
      ]);

      setCoins(balanceRes.data.coin_balance || 0);  
      setChickens(chickensRes.data.chickens || []);
      setEggs(eggsRes.data.eggs || []);
      setFood(foodsRes.data.food || 0);
    } catch (error) {
      console.error('โหลดข้อมูลล้มเหลว:', error);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  return (
    <GameContext.Provider
      value={{
        coins,
        setCoins,
        chickens,
        setChickens,
        eggs,
        setEggs,
        food,
        setFood,
        refreshData
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
