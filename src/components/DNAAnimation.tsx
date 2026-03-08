import React from 'react';

export interface DnaAnimationProps {
  stage?: 'idle' | 'denaturation' | 'annealing' | 'extension' | 'completed';
  cycle?: number;
}

export default function DNAAnimation({ stage, cycle }: DnaAnimationProps) {
  // We embed the Cold Spring Harbor Laboratory (DNALC) interactive PCR animation
  // Since this animation has its own internal controls (play, pause, next steps),
  // it doesn't strictly depend on our external `stage` or `cycle` state.
  return (
    <div className="w-full h-[600px] bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden p-2 shadow-inner">
      <div className="text-slate-400 text-sm mb-2 font-bold px-4 text-center">
        סימולציית PCR חזותית - Cold Spring Harbor Laboratory (DNALC)
      </div>
      <iframe 
        src="https://content.dnalc.org/content/c17/17044/pcr-canvas-720.html" 
        className="w-full h-full border-0 rounded-xl"
        title="DNALC PCR Interactive Animation"
        allowFullScreen
      />
    </div>
  );
}
