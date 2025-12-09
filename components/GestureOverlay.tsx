
import React, { useState, useEffect } from 'react';
import { Hand } from 'lucide-react';

interface Props {
  onGesture: (type: string) => void;
}

const GestureOverlay: React.FC<Props> = ({ onGesture }) => {
  const [activeGesture, setActiveGesture] = useState<string | null>(null);

  const simulateGesture = (name: string) => {
    setActiveGesture(name);
    onGesture(name);
    setTimeout(() => setActiveGesture(null), 1500);
  };

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-20">
      <div className={`
        bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700
        text-cyan-400 flex items-center gap-2 transition-all duration-300
        ${activeGesture ? 'opacity-100 translate-y-0 scale-110 border-cyan-500' : 'opacity-50 translate-y-2'}
      `}>
        <Hand size={16} className={activeGesture ? "animate-pulse" : ""} />
        <span className="text-sm font-mono uppercase tracking-widest">
          {activeGesture || "等待手势指令..."}
        </span>
      </div>

      {/* Mock controls for demo purposes only */}
      <div className="flex gap-2 pointer-events-auto">
        <button 
            onClick={() => simulateGesture('左滑 (Swipe Left)')}
            className="text-[10px] bg-slate-800/80 hover:bg-cyan-600/80 text-white px-2 py-1 rounded border border-slate-600 transition-colors"
        >
            模拟: 左滑
        </button>
        <button 
            onClick={() => simulateGesture('右滑 (Swipe Right)')}
            className="text-[10px] bg-slate-800/80 hover:bg-cyan-600/80 text-white px-2 py-1 rounded border border-slate-600 transition-colors"
        >
            模拟: 右滑
        </button>
        <button 
            onClick={() => simulateGesture('握拳 (Fist)')}
            className="text-[10px] bg-slate-800/80 hover:bg-cyan-600/80 text-white px-2 py-1 rounded border border-slate-600 transition-colors"
        >
            模拟: 握拳
        </button>
        <button 
            onClick={() => simulateGesture('张开手掌 (Open Palm)')}
            className="text-[10px] bg-slate-800/80 hover:bg-cyan-600/80 text-white px-2 py-1 rounded border border-slate-600 transition-colors"
        >
            模拟: 张手
        </button>
      </div>
    </div>
  );
};

export default GestureOverlay;
