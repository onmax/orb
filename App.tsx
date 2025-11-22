
import React, { useState, useEffect, useRef } from 'react';
import { Scene } from './components/Scene';
import { UI } from './components/UI';
import { AudioSimulator } from './services/audioMock';
import { BLOCK_INTERVAL_MS } from './constants';

const audioSim = new AudioSimulator();

function App() {
  const [audioData, setAudioData] = useState(0);
  const [blockHeight, setBlockHeight] = useState(3401294); // Arbitrary start block
  
  // Animation loop for non-3D logic (Audio sampling)
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

  // Block height simulator
  useEffect(() => {
    const interval = setInterval(() => {
      setBlockHeight(h => h + 1);
    }, BLOCK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    // Updated Background: Lighter Deep Space Gradient
    // Changed from very dark #1F2348... to a lighter #2E3669 base
    <div className="relative w-full h-full bg-[radial-gradient(circle_at_center,#2E3669_0%,#181B38_50%,#0B0C16_100%)] overflow-hidden">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Scene audioData={audioData} />
      </div>

      {/* UI Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <UI blockHeight={blockHeight} />
      </div>
    </div>
  );
}

export default App;
