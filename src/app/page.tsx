"use client";
import { useState } from 'react';
import PreparationStage from '@/components/PreparationStage';
import ThermalCycler from '@/components/ThermalCycler';
import MasterMixerGame from '@/components/MasterMixerGame';
import GeneExpressionLab from '@/components/GeneExpressionLab';
import ReplicationComparisonActivity from '@/components/ReplicationComparisonActivity';
import GeneticFingerprintPage from '@/components/GeneticFingerprintPage';
import StrCaseLabPage from '@/components/StrCaseLabPage';
import PcrPrinciplesGame from '@/components/PcrPrinciplesGame';
import PcrApplicationsPage from '@/components/PcrApplicationsPage';
import WelcomeScreen from '@/components/WelcomeScreen';
import { SimulationPhase } from '@/types';
import { ArrowLeft, ArrowRight, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [phase, setPhase] = useState<SimulationPhase>('landing');
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);

  const phases: SimulationPhase[] = ['landing', 'pcr-intro', 'preparation', 'pcr-running', 'master-mixer-game', 'replication-comparison', 'genetic-fingerprint', 'str-case-lab', 'completed', 'gene-expression-lab', 'pcr-applications', 'pcr-principles-game'];
  const phaseLabels: Record<SimulationPhase, { label: string; hint: string }> = {
    'landing': { label: 'דף פתיחה', hint: 'שער האפליקציה' },
    'pcr-intro': { label: 'מה זה PCR', hint: 'הקדמה תיאורטית' },
    'preparation': { label: 'הכנת התערובת', hint: 'בחירת רכיבים' },
    'pcr-running': { label: 'אנימציית PCR', hint: 'שלבי המחזור התרמי' },
    'master-mixer-game': { label: 'The Master Mixer', hint: 'משחק אינטראקטיבי רב־שלבי' },
    'replication-comparison': { label: 'השוואת שכפול', hint: 'בתא מול מבחנה' },
    'genetic-fingerprint': { label: 'טביעת אצבע גנטית', hint: 'STR ועקרונות זיהוי' },
    'str-case-lab': { label: 'מעבדת STR', hint: 'תרגול פורנזי ואבהות' },
    'completed': { label: 'משכפול לביטוי - RT - PCR', hint: 'מעבר ל-RT-PCR ולביטוי גנים' },
    'gene-expression-lab': { label: 'מעבדת ביטוי גנים', hint: 'mRNA, RT ו-PCR' },
    'pcr-applications': { label: 'יישומי PCR', hint: 'יישומים מעשיים' },
    'pcr-principles-game': { label: 'משחק עקרונות PCR', hint: 'אתגר מסכם' }
  };
  const phaseMenuItems = phases.map((id, idx) => ({
    id,
    order: idx + 1,
    ...phaseLabels[id]
  }));
  const currentIndex = phases.indexOf(phase);

  const goToNext = () => {
    if (currentIndex < phases.length - 1) {
      setIsSideNavOpen(false);
      setPhase(phases[currentIndex + 1]);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setIsSideNavOpen(false);
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
      <button
        onClick={() => setIsSideNavOpen(true)}
        className="fixed top-4 right-4 md:top-8 md:right-8 z-[75] inline-flex items-center gap-2 rounded-xl border border-slate-600/70 bg-slate-900/80 hover:bg-slate-800/90 text-slate-100 px-3 py-2 shadow-xl backdrop-blur"
        aria-label="פתח תפריט ניווט"
      >
        <Menu className="w-5 h-5" />
        <span className="hidden sm:inline text-sm font-bold">תפריט</span>
      </button>

      <div className="flex-1 flex flex-col min-h-0">
        {phase === 'landing' && (
          <WelcomeScreen onStart={() => setPhase('pcr-intro')} />
        )}

        {phase === 'pcr-intro' && (
          <div className="glass-pcr-card rounded-[2.5rem] border border-slate-700/30 p-6 md:p-8 space-y-6" dir="rtl">
            <div className="text-right space-y-4">
              <h2 className="text-3xl font-black text-white">
                מה זה <span dir="ltr" className="inline-block">PCR</span>{' '}
                <span dir="ltr" className="inline-block">(Polymerase Chain Reaction)</span>?
              </h2>
              <p className="text-slate-200 leading-relaxed text-lg">
                תהליך ה-PCR הוא מעין &quot;מכונת צילום&quot; גנטית. הוא מאפשר לנו לקחת מקטע קטן וספציפי של DNA
                ולשכפל אותו מיליוני פעמים תוך זמן קצר, עד שיש לנו מספיק חומר כדי לחקור אותו, לזהות מחלות או לבצע
                בדיקות פורנזיות.
              </p>
            </div>

            <div className="text-right space-y-3">
              <h3 className="text-2xl font-black text-blue-200">איך זה עובד?</h3>
              <p className="text-slate-200 leading-relaxed">
                התהליך מתבסס על יכולתו של הטבע לשכפל DNA, אך הוא עושה זאת בצורה מואצת בתוך מבחנה באמצעות שינויי
                טמפרטורה מחזוריים. בכל מחזור, כמות ה-DNA מוכפלת, מה שיוצר צמיחה מעריכית (אקספוננציאלית).
              </p>
            </div>

            <div className="text-right space-y-3">
              <h3 className="text-2xl font-black text-emerald-200">מוכנ/ה לבחור את המרכיבים?</h3>
              <p className="text-slate-200 leading-relaxed">
                כדי שהתהליך הזה יצליח, אנחנו צריכים לספק למבחנה את כל &quot;חומרי הגלם&quot; והכלים שהתא משתמש
                בהם בדרך כלל לשכפול, רק בגרסה העמידה לחום.
              </p>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setPhase('preparation')}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition-colors"
              >
                המשך לפעילות הראשונה
              </button>
            </div>
          </div>
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
          <ReplicationComparisonActivity onComplete={() => setPhase('genetic-fingerprint')} />
        )}

        {phase === 'genetic-fingerprint' && (
          <GeneticFingerprintPage onComplete={() => setPhase('str-case-lab')} />
        )}

        {phase === 'str-case-lab' && (
          <StrCaseLabPage onComplete={() => setPhase('completed')} />
        )}

        {phase === 'pcr-principles-game' && (
          <PcrPrinciplesGame onComplete={() => setPhase('landing')} />
        )}

        {phase === 'completed' && (
          <div className="bg-emerald-950/20 rounded-[2.5rem] p-12 border border-emerald-800/20 text-center space-y-8 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/5 blur-[100px] pointer-events-none" />
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-emerald-400">משכפול לביטוי - RT - PCR</h2>
              <p className="text-xl text-slate-200 max-w-4xl mx-auto leading-relaxed">
                מצוין! הצלחנו לייצר מיליוני עותקים של מקטע ה-DNA. אבל האם עצם נוכחות הגן אומרת שהוא בהכרח
                &apos;עובד&apos; ברגע זה?
              </p>
            </div>

            <div className="max-w-5xl mx-auto text-right space-y-5 rounded-2xl border border-emerald-700/30 bg-slate-900/45 p-6 md:p-8">
              <p className="text-lg text-slate-200 leading-relaxed">
                כדי להבין ביטוי גנים, אנחנו צריכים לעבור מהחומר התורשתי הקבוע (DNA) אל המתווך שמעיד על פעילות –
                ה-mRNA.
              </p>
              <p className="text-lg text-slate-200 leading-relaxed">
                במעבדה הקרובה נחקור את גן האינסולין. כפי שאתם יודעים, הגן לאינסולין נמצא בכל תאי הגוף שלנו, אך
                הוא מתבטא (מיוצר) רק בתאים ספציפיים בלבד.
              </p>

              <div className="space-y-3">
                <h3 className="text-2xl font-black text-emerald-300">מה נעשה במעבדת ה-RT-PCR?</h3>
                <ul className="space-y-3 text-slate-200 leading-relaxed">
                  <li>
                    <span className="font-bold text-blue-300">הפקת RNA:</span> נבדוק אילו מולקולות mRNA קיימות
                    ברקמות שונות.
                  </li>
                  <li>
                    <span className="font-bold text-blue-300">Reverse Transcription (RT):</span> נשתמש באנזים
                    &quot;טרנסקריפטאז הפוך&quot; כדי להפוך את ה-RNA חזרה ל-DNA יציב (הנקרא cDNA).
                  </li>
                  <li>
                    <span className="font-bold text-blue-300">PCR:</span> נשכפל את ה-cDNA כדי לזהות היכן הגן אכן
                    היה פעיל.
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <p className="text-lg text-emerald-200 font-bold">
                מוכנים לגלות איפה גן האינסולין &apos;מתעורר לחיים&apos;? לחצו למטה כדי להתחיל בניסוי השוואת רקמות.
              </p>
            </div>

            <div className="flex flex-col md:flex-row justify-center gap-6 pt-2">
              <button
                onClick={() => setPhase('gene-expression-lab')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-5 px-12 rounded-2xl transition-all shadow-[0_10px_25px_rgba(16,185,129,0.2)] hover:scale-105 active:scale-95 flex flex-col items-center gap-1"
              >
                <span>המשך לניסוי השוואת רקמות</span>
                <span className="text-[10px] opacity-80 font-normal">מעבר למעבדת RT-PCR</span>
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

      <AnimatePresence>
        {isSideNavOpen && (
          <>
            <motion.button
              key="side-nav-backdrop"
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSideNavOpen(false)}
              className="fixed inset-0 z-[76] bg-slate-950/60 backdrop-blur-sm"
              aria-label="סגור תפריט ניווט"
            />
            <motion.aside
              key="side-nav-panel"
              initial={{ x: 420, opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 420, opacity: 0.5 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed top-0 right-0 h-full w-[min(92vw,420px)] z-[77] border-l border-slate-600/60 bg-slate-950/95 backdrop-blur-xl p-4 md:p-6 flex flex-col gap-4"
              dir="rtl"
            >
              <div className="flex items-center justify-between">
                <div className="text-right">
                  <h3 className="text-xl md:text-2xl font-black text-white">ניווט מהיר</h3>
                  <p className="text-slate-400 text-sm">מעבר ישיר לכל דפי האפליקציה</p>
                </div>
                <button
                  onClick={() => setIsSideNavOpen(false)}
                  className="rounded-lg border border-slate-600/70 bg-slate-900/70 hover:bg-slate-800/80 p-2 text-slate-200"
                  aria-label="סגור תפריט"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div
                className="menu-scrollbar flex-1 overflow-y-auto pr-1 space-y-2"
                style={{
                  scrollbarColor: 'rgba(56,189,248,0.95) rgba(15,23,42,0.9)',
                  scrollbarWidth: 'thin'
                }}
              >
                {phaseMenuItems.map((item) => {
                  const isActive = phase === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setPhase(item.id);
                        setIsSideNavOpen(false);
                      }}
                      className={`w-full rounded-xl border p-3 text-right transition-all ${
                        isActive
                          ? 'border-blue-400 bg-blue-500/15 text-blue-100 shadow-[0_0_0_1px_rgba(96,165,250,0.25)]'
                          : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-slate-500 hover:bg-slate-800/85'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">{item.label}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{item.hint}</p>
                        </div>
                        <span className="text-xs font-black text-slate-400">{item.order}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

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
