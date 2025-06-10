import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  getBalance,
  getChickens,
  getEggs,
  getFood
} from '../services/api';

export const GameContext = createContext();

// Custom hook for using game context
export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

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
