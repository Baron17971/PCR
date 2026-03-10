"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Droplets, Info, Check, Activity } from 'lucide-react';

interface GelElectrophoresisProps {
  onRunComplete: () => void;
  onReset: () => void;
  isReadyToLoad: boolean;
}

export default function GelElectrophoresis({ onRunComplete, onReset, isReadyToLoad }: GelElectrophoresisProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsRunning(false);
            setShowResults(true);
            setTimeout(onRunComplete, 1000); // Trigger results callback
            return 100;
          }
          return prev + 1.0;
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isRunning, onRunComplete]);

  const startRun = () => {
    if (isLoaded) setIsRunning(true);
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
      <div className="p-8 border-b border-slate-800 flex justify-between items-center text-right">
        <h3 className="text-xl font-bold text-white flex items-center gap-3">
          <Droplets className="w-6 h-6 text-blue-400" />
          הרצת ג'ל אלקטרופורזה
        </h3>
        <div className="flex gap-4 items-center">
          {showResults ? (
            <button
              onClick={onReset}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all flex items-center gap-3 text-sm shadow-xl border border-slate-700/50"
            >
              <RotateCcw className="w-4 h-4 text-blue-400" />
              הרץ ניסוי מחדש
            </button>
          ) : isLoaded ? (
            <>
              <button
                onClick={() => { setProgress(0); setIsRunning(false); setShowResults(false); setIsLoaded(false); }}
                className="p-2 text-slate-500 hover:text-white transition-colors"
                title="אפס ג'ל"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={startRun}
                disabled={isRunning}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-8 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 whitespace-nowrap min-w-fit"
              >
                <Play className="w-5 h-5" />
                {isRunning ? 'מריץ ג\'ל...' : 'הפעל זרם חשמלי'}
              </button>
            </>
          ) : (
            <div className="relative group">
              <button
                onClick={() => isReadyToLoad && setIsLoaded(true)}
                disabled={!isReadyToLoad}
                className={`px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg
                  ${isReadyToLoad
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                  }`}
              >
                <Droplets className={`w-5 h-5 ${isReadyToLoad ? 'text-white' : 'text-slate-600'}`} />
                הטען דגימות
              </button>
              {!isReadyToLoad && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-slate-300 text-[10px] py-1 px-3 rounded-lg border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
                  המתן לסיום הכנת הדגימות...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 flex flex-col items-center gap-6">
        {/* Gel Tank Visual */}
        <div className="relative w-full max-w-2xl aspect-[4/3] bg-blue-900/10 rounded-xl border-4 border-slate-800 p-8 flex flex-col">
          {/* Polarity Indicators - Outside the Gel Surface */}
          <div className="absolute top-4 left-4 text-white font-bold text-2xl select-none opacity-50">–</div>
          <div className="absolute top-4 right-4 text-white font-bold text-2xl select-none opacity-50">–</div>
          <div className="absolute bottom-4 left-4 text-red-500 font-bold text-2xl select-none opacity-60">+</div>
          <div className="absolute bottom-4 right-4 text-red-500 font-bold text-2xl select-none opacity-60">+</div>

          {/* The Gel Surface */}
          <div className="flex-1 bg-blue-400/5 backdrop-blur-sm rounded-lg border border-blue-400/20 relative shadow-inner overflow-hidden">
            {/* Grid/Lines */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

            {/* Wells (Top) */}
            <div className="absolute top-8 left-0 right-0 flex justify-around px-8">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-12 h-4 bg-slate-900/80 rounded-sm border border-slate-700 shadow-inner flex flex-col items-center">
                  <div className="text-xs text-white -top-7 absolute whitespace-nowrap font-bold text-center">
                    {i === 0 ? 'סולם גדלים' : i === 1 ? 'לבלב' : i === 2 ? 'שריר' : 'ביקורת שלילית'}
                  </div>
                  {isLoaded && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`w-full h-full ${i === 1 || i === 2 ? 'bg-blue-500/40' : i === 0 ? 'bg-emerald-500/40' : i === 3 ? 'bg-slate-500/20' : 'bg-transparent'}`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Bands (Moving) */}
            <div className="absolute inset-0 px-8 pt-16">
              <div className="relative h-full w-full flex justify-around">
                {/* Lane 0: Ladder */}
                <div className="w-12 flex flex-col items-center relative">
                  {(isRunning || showResults) && [20, 35, 50, 65, 80].map((pos, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scaleY: 0 }}
                      animate={{
                        opacity: 0.8,
                        scaleY: 1,
                        y: progress * (pos / 100) * 2.8
                      }}
                      className="w-10 h-1.5 bg-emerald-400/50 rounded-full blur-[2px] absolute"
                    />
                  ))}
                </div>

                {/* Lane 1: Pancreas (Insulin Only) */}
                <div className="w-12 flex flex-col items-center relative">
                  {(isRunning || showResults) && (
                    <motion.div
                      initial={{ opacity: 0, scaleY: 0 }}
                      animate={{
                        opacity: 1,
                        scaleY: 1,
                        y: progress * 0.45 * 2.8
                      }}
                      className="w-10 h-2 bg-blue-300 shadow-[0_0_10px_rgba(147,197,253,0.5)] rounded-full blur-[1px] absolute"
                    />
                  )}
                </div>

                {/* Lane 2: Muscle (Empty) */}
                <div className="w-12 flex flex-col items-center relative" />

                {/* Lane 3: Negative Control (Empty) */}
                <div className="w-12 flex flex-col items-center relative" />
              </div>
            </div>

            {/* Electric Field Glow */}
            {isRunning && (
              <motion.div
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"
              />
            )}
          </div>
        </div>

      </div>

      {/* Info Message / Results Analysis */}
      <div className="bg-slate-900 border-t border-slate-800 p-6 flex flex-col gap-4">
        {!showResults ? (
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
              <Info className="w-6 h-6" />
            </div>
            <div className="text-right space-y-1 text-right">
              <p className="text-white font-bold">כיצד עובד הניסוי?</p>
              <p className="text-slate-400 text-sm leading-relaxed">
                מולקולות ה-DNA טעונות במטען שלילי, ולכן הן נודדות לעבר הקוטב החיובי.
                מולקולות קטנות נעות מהר יותר דרך נקבוביות הג'ל.
              </p>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-4"
          >
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div className="text-right space-y-2 flex-1">
              <p className="text-emerald-400 font-bold text-lg">ניתוח תוצאות המחקר</p>
              <div className="space-y-1">
                <p className="text-slate-200 text-sm leading-relaxed">
                  <span className="text-emerald-400 font-bold underline">בלבלב:</span> ראינו פס ברור המעיד על נוכחות mRNA של אינסולין. הגן מתבטא והתא מייצר את ההורמון.
                </p>
                <p className="text-slate-200 text-sm leading-relaxed">
                  <span className="text-blue-400 font-bold underline">בשריר:</span> לא ראינו פס כלל. הגן מושתק כי השריר לא אמור לייצר אינסולין.
                </p>
              </div>
              <p className="text-slate-500 italic text-xs pt-1 border-t border-slate-800">
                "זהו ההבדל בין פוטנציאל גנטי (DNA) לבין מימוש בפועל (ביטוי גנים). כל התאים שווים ב-DNA, אך שונים בביטוי."
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
