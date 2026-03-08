"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PcrMathChartProps {
  currentCycle: number;
  maxCycles: number;
  stage: 'idle' | 'denaturation' | 'annealing' | 'extension' | 'completed';
}

export default function PcrMathChart({ currentCycle, maxCycles, stage }: PcrMathChartProps) {
  // During extension or when completed, we show the result of the *current* cycle
  const displayCycle = (stage === 'extension' || stage === 'completed') ? currentCycle : currentCycle - 1;
  
  // Math for PCR amplification (assuming 1 original template)
  // Total molecules = 2^n
  // Target molecules = 2^n - 2n (for n >= 2)
  // Non-target (long) molecules = 2n
  
  const calculateMolecules = (cycle: number) => {
    if (cycle === 0) return { total: 1, target: 0, nonTarget: 1 };
    if (cycle === 1) return { total: 2, target: 0, nonTarget: 2 };
    
    const total = Math.pow(2, cycle);
    const nonTarget = 2 * cycle;
    const target = total - nonTarget;
    
    return { total, target, nonTarget };
  };

  const currentStats = calculateMolecules(displayCycle);

  return (
    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl mt-6 lg:mt-0 flex flex-col justify-between h-full">
      <div>
        <h3 className="text-xl font-bold text-slate-100 mb-4">גידול מספר מולקולות ה-DNA</h3>
        <p className="text-sm text-slate-400 mb-6">
          בכל מחזור (לאחר שלב ההארכה), כמות ה-DNA מוכפלת (גידול מעריכי 2ⁿ). 
          המולקולות הרצויות (המקטע הספציפי) מתחילות להיווצר רק במחזור השלישי, והן גדלות בקצב מסחרר לעומת מולקולות הלוואי.
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-end">
        <div className="relative h-48 w-full border-b border-l border-slate-700 pb-2 pl-2 flex items-end justify-between px-2 pt-8">
          {/* Y Axis Max Label */}
          <div className="absolute top-0 left-[-2rem] text-xs text-slate-500 w-8 text-right">
            {calculateMolecules(maxCycles).total}
          </div>

          {[...Array(maxCycles + 1)].map((_, c) => {
            const stats = calculateMolecules(c);
            const isCurrent = c === displayCycle;
            const maxTotal = calculateMolecules(maxCycles).total;
            
            // Heights as percentage of max
            const targetHeight = (stats.target / maxTotal) * 100;
            const nonTargetHeight = (stats.nonTarget / maxTotal) * 100;

            return (
              <div key={`col-${c}`} className="flex flex-col items-center gap-2 group w-1/6">
                
                {/* Bar Container */}
                <div className="relative w-full max-w-[24px] h-full flex flex-col justify-end">
                  
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 bg-slate-800 text-xs p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                    סה"כ: {stats.total}<br/>
                    <span className="text-emerald-400">רצויות: {stats.target}</span><br/>
                    <span className="text-rose-400">לוואי: {stats.nonTarget}</span>
                  </div>

                  {targetHeight > 0 ? (
                     <motion.div 
                       initial={{ height: 0 }}
                       animate={{ height: `${targetHeight}%` }}
                       className={`w-full bg-emerald-500 rounded-t-sm ${isCurrent ? 'shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'opacity-60'}`} 
                       transition={{ duration: 0.5 }}
                     />
                  ) : null}
                  {nonTargetHeight > 0 ? (
                     <motion.div 
                       initial={{ height: 0 }}
                       animate={{ height: `${nonTargetHeight}%` }}
                       className={`w-full bg-rose-500 ${targetHeight === 0 ? 'rounded-t-sm' : ''} ${isCurrent ? 'shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'opacity-60'}`} 
                       transition={{ duration: 0.5 }}
                     />
                  ) : null}
                  {stats.total === 0 ? (
                    <div className="w-full h-[1px] bg-slate-600" />
                  ) : null}
                </div>
                
                <span className={`text-xs ${isCurrent ? 'text-blue-400 font-bold' : 'text-slate-500'}`}>
                  {c === 0 ? 'התחלה' : `M${c}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
         <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
            <span className="block text-xs text-rose-400 uppercase tracking-widest mb-1">מולקולות לוואי</span>
            <span className="text-3xl font-mono font-bold text-rose-500">
              <AnimatePresence mode="popLayout">
                <motion.span key={currentStats.nonTarget} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  {currentStats.nonTarget}
                </motion.span>
              </AnimatePresence>
            </span>
         </div>
         <div className="bg-slate-950 p-4 rounded-xl border border-emerald-900/30 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-emerald-500/5" />
            <span className="relative block text-xs text-emerald-400 uppercase tracking-widest mb-1">הצלחה (רצויות)</span>
            <span className="relative text-3xl font-mono font-bold text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
               <AnimatePresence mode="popLayout">
                <motion.span key={currentStats.target} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  {currentStats.target}
                </motion.span>
              </AnimatePresence>
            </span>
         </div>
      </div>
    </div>
  );
}
