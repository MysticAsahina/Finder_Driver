import { useState, useEffect } from 'react';
import api from './axios';

export function useNetworkSpeed(pingIntervalMs = 15000, thresholdMs = 1500) {
  const [isSlowNetwork, setIsSlowNetwork] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    const checkSpeed = async () => {
      const startTime = Date.now();
      try {
        await api.get('/'); // Very lightweight endpoint in server.js
        const latency = Date.now() - startTime;
        if (latency > thresholdMs) {
          setIsSlowNetwork(true);
        } else {
          setIsSlowNetwork(false);
        }
      } catch (err) {
        setIsSlowNetwork(true);
      }
    };

    checkSpeed();
    intervalId = setInterval(checkSpeed, pingIntervalMs);

    return () => clearInterval(intervalId);
  }, [pingIntervalMs, thresholdMs]);

  return isSlowNetwork;
}
