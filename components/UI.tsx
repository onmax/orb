import React from 'react';
import { VALIDATOR_COUNT, NODE_COUNT, BLOCK_INTERVAL_MS } from '../constants';

export const UI: React.FC<{ blockHeight: number }> = ({ blockHeight }) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-8 flex flex-col justify-between">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl md:text-6xl font-bold text-white font-['Orbitron'] tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 drop-shadow-[0_0_10px_rgba(0,229,255,0.5)]">
            NIMIQ
          </h1>
          <h2 className="text-xl text-cyan-300 font-['Rajdhani'] tracking-widest opacity-80">
            NETWORK VISUALIZER
          </h2>
        </div>
        <div className="text-right">
          <div className="text-xs text-purple-300 uppercase tracking-widest mb-1">Current Block</div>
          <div className="text-4xl font-['Orbitron'] text-white tabular-nums">#{blockHeight.toLocaleString()}</div>
          <div className="flex items-center justify-end gap-2 mt-2">
             <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
             <span className="text-xs text-green-400 font-mono">LIVE</span>
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/10 pt-6 bg-gradient-to-t from-black/80 to-transparent">
        <StatBox label="Active Peers" value={NODE_COUNT.toString()} />
        <StatBox label="Validators" value={VALIDATOR_COUNT.toString()} color="text-purple-400" />
        <StatBox label="Block Time" value={`${(BLOCK_INTERVAL_MS / 1000).toFixed(1)}s`} />
        <StatBox label="Network State" value="CONVERGING" color="text-cyan-400" />
      </div>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = "text-white" }) => (
  <div className="flex flex-col">
    <span className="text-xs text-gray-500 uppercase tracking-wider font-['Rajdhani']">{label}</span>
    <span className={`text-2xl font-['Rajdhani'] font-bold ${color}`}>{value}</span>
  </div>
);
