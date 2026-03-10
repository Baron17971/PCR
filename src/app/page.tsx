"use client";
import { useState } from 'react';
import PreparationStage from '@/components/PreparationStage';
import ThermalCycler from '@/components/ThermalCycler';
import MasterMixerGame from '@/components/MasterMixerGame';
import GeneExpressionLab from '@/components/GeneExpressionLab';
import ReplicationComparisonActivity from '@/components/ReplicationComparisonActivity';
import PcrPrinciplesGame from '@/components/PcrPrinciplesGame';
import PcrApplicationsPage from '@/components/PcrApplicationsPage';
import WelcomeScreen from '@/components/WelcomeScreen';
import { SimulationPhase } from '@/types';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [phase, setPhase] = useState<SimulationPhase>('landing');

  const phases: SimulationPhase[] = ['landing', 'preparation', 'pcr-running', 'master-mixer-game', 'replication-comparison', 'completed', 'gene-expression-lab', 'pcr-applications', 'pcr-principles-game'];
  const currentIndex = phases.indexOf(phase);

  const goToNext = () => {
    if (currentIndex < phases.length - 1) {
      setPhase(phases[currentIndex + 1]);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setPhase(phases[currentIndex - 1]);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8 pb-24 max-w-[1600px] mx-auto flex flex-col gap-6 relative">
      {/* Logo */}
      <div className="absolute top-4 left-4 md:top-8 md:left-8 z-50">
        <img
          src="/images/logo.png"
          alt="Logo"
          className="w-20 md:w-28 h-auto opacity-95 hover:opacity-100 transition-opacity drop-shadow-[0_0_8px_rgba(45,212,191,0.3)] drop-shadow-[0_0_20px_rgba(45,212,191,0.1)] drop-shadow-2xl"
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {phase === 'landing' && (
          <WelcomeScreen onStart={() => setPhase('preparation')} />
        )}

        {phase === 'preparation' && (
          <PreparationStage onComplete={() => setPhase('pcr-running')} />
        )}

        {phase === 'pcr-running' && (
          <ThermalCycler />
        )}

        {phase === 'master-mixer-game' && (
          <MasterMixerGame onComplete={() => setPhase('replication-comparison')} />
        )}

        {phase === 'replication-comparison' && (
          <ReplicationComparisonActivity onComplete={() => setPhase('completed')} />
        )}

        {phase === 'pcr-principles-game' && (
          <PcrPrinciplesGame onComplete={() => setPhase('landing')} />
        )}

        {phase === 'completed' && (
          <div className="bg-emerald-950/20 rounded-[2.5rem] p-12 border border-emerald-800/20 text-center space-y-8 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/5 blur-[100px] pointer-events-none" />
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-emerald-400">התהליך הושלם בהצלחה!</h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                מקטע ה-DNA שוכפל בהצלחה למיליוני עותקים. כעת ניתן להשתמש בתוצרים לצרכי מחקר, אבחון רפואי או זיהוי פלילי.
              </p>
            </div>

            <div className="flex flex-col md:flex-row justify-center gap-6 pt-6">
              <button
                onClick={() => setPhase('gene-expression-lab')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-5 px-12 rounded-2xl transition-all shadow-[0_10px_25px_rgba(16,185,129,0.2)] hover:scale-105 active:scale-95 flex flex-col items-center gap-1"
              >
                <span>המשך לניסוי ביטוי גנים</span>
                <span className="text-[10px] opacity-70 font-normal">חקירת גן האינסולין בין רקמות</span>
              </button>

              <button
                onClick={() => setPhase('preparation')}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-5 px-12 rounded-2xl transition-all hover:scale-105 active:scale-95"
              >
                התחל סימולציה מחדש
              </button>
            </div>
          </div>
        )}

        {phase === 'gene-expression-lab' && (
          <GeneExpressionLab />
        )}

        {phase === 'pcr-applications' && (
          <PcrApplicationsPage onComplete={() => setPhase('pcr-principles-game')} />
        )}
      </div>

      {/* Page Navigation Arrows - Side Positioned */}
      <AnimatePresence>
        {currentIndex > 0 && (
          <motion.button
            key="prev-phase-btn"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            whileHover={{ x: 5 }}
            onClick={goToPrev}
            className="fixed right-6 md:right-10 top-1/2 -translate-y-1/2 p-5 rounded-full bg-slate-900/40 backdrop-blur-xl border border-slate-700/30 text-blue-400 hover:text-blue-300 hover:bg-slate-800/60 transition-all shadow-2xl z-50 group"
            title="שלב הקודם"
          >
            <ArrowRight className="w-10 h-10 group-hover:scale-110 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {currentIndex < phases.length - 1 && (
          <motion.button
            key="next-phase-btn"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            whileHover={{ x: -5 }}
            onClick={goToNext}
            className="fixed left-6 md:left-10 top-1/2 -translate-y-1/2 p-5 rounded-full bg-slate-900/40 backdrop-blur-xl border border-slate-700/30 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/60 transition-all shadow-2xl z-50 group"
            title="שלב הבא"
          >
            <ArrowLeft className="w-10 h-10 group-hover:scale-110 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>
    </main>
  );
}
