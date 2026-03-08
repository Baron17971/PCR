"use client";
import { useState } from 'react';
import PreparationStage from '@/components/PreparationStage';
import ThermalCycler from '@/components/ThermalCycler';
import { SimulationPhase } from '@/types';

export default function Home() {
  const [phase, setPhase] = useState<SimulationPhase>('preparation');

  return (
    <main className="min-h-screen p-4 md:p-8 pb-12 max-w-[1600px] mx-auto flex flex-col gap-6">
      <header className="text-right space-y-2 w-full">
        <h1 className="text-3xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-l from-blue-400 to-emerald-400 bg-clip-text text-transparent pb-1">
          סימולציית תהליך ה-PCR
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl ml-auto mr-0">
          למידה אינטראקטיבית של שלבי שכפול ה-DNA והכרת המרכיבים ההכרחיים
        </p>
      </header>

      <div className="flex-1 flex flex-col min-h-0">
        {phase === 'preparation' && (
          <PreparationStage onComplete={() => setPhase('pcr-running')} />
        )}
        
        {phase === 'pcr-running' && (
          <ThermalCycler onComplete={() => setPhase('completed')} />
        )}

        {phase === 'completed' && (
          <div className="bg-emerald-950/20 rounded-[2.5rem] p-12 border border-emerald-800/20 text-center space-y-8 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/5 blur-[100px] pointer-events-none" />
            <h2 className="text-4xl font-black text-emerald-400">התהליך הושלם בהצלחה!</h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              מקטע ה-DNA שוכפל בהצלחה למיליוני עותקים. כעת ניתן להשתמש בתוצרים לצרכי מחקר, אבחון רפואי או זיהוי פלילי.
            </p>
            <button 
              onClick={() => setPhase('preparation')}
              className="mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-10 rounded-2xl transition-all shadow-[0_10px_25px_rgba(16,185,129,0.2)] hover:scale-105 active:scale-95"
            >
              התחל סימולציה מחדש
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
