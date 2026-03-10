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
    <div className="w-full h-[780px] bg-transparent rounded-2xl flex flex-col items-center justify-between relative overflow-hidden">
      <div className="w-full h-[620px] bg-transparent">
        <iframe 
          src="https://content.dnalc.org/content/c17/17044/pcr-canvas-720.html" 
          className="w-full h-full border-0"
          title="DNALC PCR Interactive Animation"
          allowFullScreen
        />
      </div>

      {/* PCR Formula Overlay in the bottom "empty space" */}
      <div className="w-full min-h-[160px] bg-slate-900 border-t border-slate-800 p-4 flex flex-col md:flex-row items-center gap-4" dir="rtl">
        <div className="flex-1 space-y-2 text-right">
          <h4 className="text-base font-bold text-emerald-400 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            נוסחת חישוב רצפי המטרה המדויקים
          </h4>
          <p className="text-sm text-slate-400 leading-relaxed font-normal">
            הנוסחה מחשבת את מספר העותקים של <span className="text-emerald-400 font-bold">מקטע המטרה המוגדר</span> (ללא הגדילים הארוכים) לאחר n מחזורים. 
            בכל מחזור הכמות הכוללת מוכפלת, אך רק מהמחזור השלישי מתחילים להצטבר הרצפים הרצויים ללא "זנבות" מיותרים.
          </p>
        </div>
        
        <div className="w-full md:w-auto min-w-[220px]">
          <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 shadow-inner text-center">
            <span className="text-4xl font-black text-white tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">2ⁿ - 2n</span>
            <div className="mt-2 text-xs text-slate-600 uppercase tracking-tight">PCR Logic Formula</div>
          </div>
        </div>
      </div>
    </div>
  );
}
