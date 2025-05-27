
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

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const [balanceRes, chickensRes, eggsRes, foodsRes] = await Promise.all([
          getBalance(token),
          getChickens(token),
          getEggs(token),
          getFood(token) // Mocked API, replace with actual if available
        ]);

        setCoins(balanceRes.data.coin_balance || 0);  
              
        setChickens(chickensRes.data);
        console.error('chickensRes:', chickensRes);
        setEggs(eggsRes.data);
        console.error('eggsRes:', eggsRes);
        setFood(foodsRes.data.food || 0);
      } catch (error) {
        console.error('โหลดข้อมูลล้มเหลว:', error);
      }
    };

    fetchData();
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
        setFood
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
