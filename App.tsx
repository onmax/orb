
import React, { useState, useEffect, useRef } from 'react';
import { Scene } from './components/Scene';
import { UI } from './components/UI';
import { AudioSimulator } from './services/audioMock';
import { BLOCK_INTERVAL_MS } from './constants';

const audioSim = new AudioSimulator();

function App() {
  const [audioData, setAudioData] = useState(0);
  const [blockHeight, setBlockHeight] = useState(3401294); 
  
  useEffect(() => {
    let frameId: number;
    const loop = () => {
      const data = audioSim.getAudioData();
      setAudioData(data);
      frameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlockHeight(h => h + 1);
    }, BLOCK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    // Background: Very deep, neutral dark grey/black gradient. Minimalistic.
    <div className="relative w-full h-full bg-[radial-gradient(circle_at_center,#0f172a_0%,#000000_100%)] overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Scene audioData={audioData} />
      </div>

      <div className="absolute inset-0 z-10 pointer-events-none">
        <UI blockHeight={blockHeight} />
      </div>
    </div>
  );
}

export default App;
