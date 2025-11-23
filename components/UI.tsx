
import React from 'react';
import { VALIDATOR_COUNT, NODE_COUNT, BLOCK_INTERVAL_MS } from '../constants';

export const UI: React.FC<{ blockHeight: number }> = ({ blockHeight }) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-8 flex flex-col justify-between">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          {/* Title: Platinum/Silver Gradient */}
          <h1 className="text-4xl md:text-6xl font-bold text-white font-['Orbitron'] tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500 drop-shadow-lg">
            NIMIQ
          </h1>
          <h2 className="text-xl text-slate-400 font-['Rajdhani'] tracking-widest opacity-90">
            NETWORK VISUALIZER
          </h2>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Current Block</div>
          <div className="text-4xl font-['Orbitron'] text-white tabular-nums">#{blockHeight.toLocaleString()}</div>
          <div className="flex items-center justify-end gap-2 mt-2">
             <span className="w-2 h-2 rounded-full bg-white animate-pulse shadow-[0_0_8px_#ffffff]"></span>
             <span className="text-xs text-slate-300 font-mono">LIVE</span>
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/10 pt-6 bg-gradient-to-t from-black/90 to-transparent">
        <StatBox label="Active Peers" value={NODE_COUNT.toString()} />
        <StatBox label="Validators" value={VALIDATOR_COUNT.toString()} color="text-slate-200" />
        <StatBox label="Block Time" value={`${(BLOCK_INTERVAL_MS / 1000).toFixed(1)}s`} />
        <StatBox label="Network State" value="OPTIMAL" color="text-emerald-400" />
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
