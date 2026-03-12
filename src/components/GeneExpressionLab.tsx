"use client";
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Microscope, Zap, Activity, Database, Check, Info, RotateCcw, X } from 'lucide-react';
import GelElectrophoresis from './GelElectrophoresis';

export default function GeneExpressionLab() {
  const [currentStep, setCurrentStep] = useState(0); // 0: mRNA, 1: RT, 2: PCR, 3: Complete
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFinalSummary, setShowFinalSummary] = useState(false);
  const [isReadyToLoad, setIsReadyToLoad] = useState(false);
  const [showMrnaExtractionModal, setShowMrnaExtractionModal] = useState(false);
  const [showRtModal, setShowRtModal] = useState(false);
  const [openReflectionAnswer, setOpenReflectionAnswer] = useState<number | null>(null);

  const steps = [
    { id: 0, label: 'בידוד mRNA', description: 'הפקת ה-RNA השליח מהדגימות' },
    { id: 1, label: 'שעתוק לאחור (cDNA)', description: 'באמצעות האנזים RT' },
    { id: 2, label: 'הגברת PCR', description: 'הכפלת גן מטרה (אינסולין)' }
  ];

  const reflectionQuestions = [
    {
      question: 'מה מבטיח שמה ששוכפל הוא ה-mRNA של אינסולין?',
      answer:
        'התחלים (Primers): השימוש בזוג תחלים ספציפיים, שרצף הבסיסים שלהם משלים בדיוק לקצוות הגן לאינסולין, מבטיח שרק הרצף הזה יזוהה ויוגבר מתוך כלל המדגם.'
    },
    {
      question: 'מה היית מצפה לראות בהרצה של תוצאות PCR מתא לבלב ותא שריר?',
      answer:
        'פס זהה בשני התאים: מכיוון ש-PCR (להבדיל מ-RT-PCR) מתבצע על ה-DNA, והמטען הגנטי זהה בכל התאים הסומטיים בגוף, הגן לאינסולין קיים בשניהם ולכן יוגבר ויופיע כפס בשני המסלולים.'
    },
    {
      question: 'מה צפוי להיות ההבדל בתוצאות RT-PCR בהרצה של דגימות מתאי לבלב מאדם בריא ומאדם חולה סוכרת נעורים?',
      answer:
        'הבדל בעוצמת הפס: אצל אדם בריא יתקבל פס ברור (יש ביטוי של הגן ונוכחות mRNA), בעוד שאצל חולה סוכרת נעורים הפס יהיה חלש מאוד או חסר, בשל הרס תאי הבטא בלבלב האחראים על ייצור ה-mRNA של האינסולין.'
    }
  ];

  const processStep = (durationMs = 2000) => {
    setError(null);
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setCurrentStep(prev => prev + 1);
    }, durationMs);
  };

  const handleStepClick = (stepId: number) => {
    if (isProcessing || currentStep >= 3) return;

    if (stepId !== currentStep) {
      if (stepId === 1 && currentStep === 0) setError("איך נשעתק RNA אם עוד לא בודדנו אותו? התחל/י בבידוד mRNA.");
      else if (stepId === 2) setError("עצור/י! אי אפשר לבצע PCR ישירות על RNA. חייבים קודם לשעתק אותו ל-cDNA.");
      else setError("בחר/י את השלב הבא לפי הסדר המדעי הנכון.");

      setTimeout(() => setError(null), 3000);
      return;
    }

    if (stepId === 0) {
      setShowMrnaExtractionModal(true);
      return;
    }

    if (stepId === 1) {
      setShowRtModal(true);
      return;
    }

    processStep();
  };

  const processComplete = currentStep === 3;

  const resetLab = useCallback(() => {
    setCurrentStep(0);
    setError(null);
    setIsProcessing(false);
    setShowFinalSummary(false);
    setIsReadyToLoad(false);
    setShowMrnaExtractionModal(false);
    setShowRtModal(false);
    setOpenReflectionAnswer(null);
  }, []);

  const handleRunComplete = useCallback(() => {
    setShowFinalSummary(true);
  }, []);

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4 relative" dir="rtl">
      {/* Page Header */}
      <div className="text-right space-y-1 mb-6">
        <h1 className="text-4xl font-black text-white bg-clip-text text-transparent bg-gradient-to-l from-white via-blue-200 to-blue-400">
          RT-PCR לבדיקת ביטוי גן
        </h1>
        <p className="text-xl text-slate-400 font-medium">
          המטרה: לבדוק היכן הגן לאינסולין באמת פעיל (מתבטא) באמצעות זיהוי mRNA.
        </p>
      </div>

      {/* Lab Layout Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">

        {/* Left Section: Tissue Info (3 columns) */}
        <div className="sm:col-span-3 space-y-3">
          <div className="p-6 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-[2rem] space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Microscope className="w-7 h-7 text-emerald-400" />
              דגימות המחקר
            </h3>
            <div className="space-y-3">
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                <p className="font-bold text-emerald-400 text-lg">תאי לבלב</p>
                <p className="text-sm text-slate-400 mt-1">מייצרים ומפרישים אינסולין באופן אקטיבי.</p>
              </div>
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
                <p className="font-bold text-blue-400 text-lg">תאי שריר</p>
                <p className="text-sm text-slate-400 mt-1">צורכים אינסולין, אך לא מייצרים אותו בעצמם.</p>
              </div>
            </div>
          </div>

          {/* Research Results & Analysis - Appears in Sidebar */}
          <AnimatePresence>
            {showFinalSummary && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                {/* Reflection Questions Card */}
                <div className="p-6 bg-blue-600/10 border border-blue-400/30 rounded-[2rem] text-right space-y-4 shadow-lg ring-1 ring-blue-400/20">
                  <div className="flex items-start gap-3 border-b border-blue-400/20 pb-3">
                    <Database className="w-6 h-6 text-blue-400" />
                    <div className="text-right">
                      <h3 className="text-xl font-bold text-blue-300">שאלות למחשבה</h3>
                      <p className="text-xs text-blue-200/80 mt-0.5">לתשובה, לחץ על מס׳ השאלה</p>
                    </div>
                  </div>
                  <ul className="space-y-4 text-slate-200 text-sm list-none">
                    {reflectionQuestions.map((item, index) => {
                      const questionNumber = index + 1;
                      const isOpen = openReflectionAnswer === questionNumber;

                      return (
                        <li key={questionNumber} className="text-right">
                          <div className="flex gap-3 items-start">
                            <button
                              type="button"
                              onClick={() => setOpenReflectionAnswer(isOpen ? null : questionNumber)}
                              aria-expanded={isOpen}
                              aria-label={`הצגת תשובה לשאלה ${questionNumber}`}
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 font-bold shadow-md transition-all ${isOpen
                                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                                : 'bg-blue-500 text-white shadow-blue-500/20 hover:bg-blue-400'
                                }`}
                            >
                              {questionNumber}
                            </button>
                            <span className="leading-relaxed flex-1 font-medium text-[0.95rem]">{item.question}</span>
                          </div>

                          <AnimatePresence>
                            {isOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: -6, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: -4, height: 0 }}
                                className="mr-10 mt-2 overflow-hidden"
                              >
                                <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100 leading-relaxed">
                                  {item.answer}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Reset Button (Moved to Gel Component) */}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Center Section: RT-PCR Processing (4 columns) */}
        <div className="sm:col-span-4 space-y-4">
          <div className="p-6 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] relative overflow-hidden min-h-[450px] flex flex-col justify-between">
            <div className="space-y-1 relative">
              <button
                onClick={() => { setCurrentStep(0); setIsProcessing(false); }}
                className="absolute left-0 top-0 p-2 text-slate-600 hover:text-white transition-colors"
                title="איפוס שלב עיבוד"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <h3 className="text-3xl font-black text-white flex items-center gap-3 text-center justify-center">
                <Activity className="w-8 h-8 text-blue-400" />
                עיבוד דגימות RT-PCR
              </h3>
              <p className="text-center text-slate-400 text-base font-medium">הפקת RNA והמרתו ל-cDNA לייצוג ביטוי הגנים</p>
            </div>

            {/* Processing Animation */}
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="flex items-center gap-10 relative">
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="absolute right-full mr-8 whitespace-nowrap"
                  >
                    <div className="flex flex-col items-center gap-2 text-emerald-400 font-bold text-sm bg-emerald-500/5 p-3 rounded-2xl border border-emerald-500/20">
                      <Zap className="w-5 h-5 animate-pulse" />
                      מעבד...
                    </div>
                  </motion.div>
                )}

                <MicroTube label="לבלב" active={isProcessing || currentStep >= 1} color="emerald" />
                <MicroTube label="שריר" active={isProcessing || currentStep >= 1} color="blue" />
              </div>

              {/* Interactive Steps Control Area */}
              <div className="w-full space-y-2">
                {steps.map((step) => (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(step.id)}
                    disabled={isProcessing || currentStep >= 3 || step.id < currentStep}
                    className={`w-full p-4 rounded-2xl border-2 transition-all text-right relative overflow-hidden group ${currentStep > step.id
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : currentStep === step.id
                          ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                          : 'bg-slate-900 border-slate-800 opacity-60'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${currentStep > step.id ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                          {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id + 1}
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${currentStep === step.id ? 'text-blue-400' : 'text-slate-200'}`}>{step.label}</p>
                          <p className="text-sm text-slate-500 font-medium">{step.description}</p>
                        </div>
                      </div>
                      {currentStep === step.id && !isProcessing && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full animate-pulse">לחץ/י עכשיו</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Error/Feedback Area */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs font-bold text-center flex items-center gap-2"
                  >
                    <Info className="w-4 h-4 shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {processComplete && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setIsReadyToLoad(true)}
                disabled={isReadyToLoad}
                className={`flex items-center justify-center gap-3 p-5 rounded-2xl border transition-all w-full
                  ${isReadyToLoad
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 cursor-default'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-[0_10px_20px_rgba(16,185,129,0.3)] animate-bounce-subtle'
                  }`}
              >
                <Check className={`w-7 h-7 ${isReadyToLoad ? 'text-emerald-400' : 'text-white'}`} />
                <span className="font-bold text-lg">הדגימות מוכנות להטענה!</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Right Section: Gel Electrophoresis (5 columns) */}
        <div className="sm:col-span-5 space-y-6">
          <GelElectrophoresis
            onRunComplete={handleRunComplete}
            onReset={resetLab}
            isReadyToLoad={isReadyToLoad}
          />
        </div>
      </div>

      <AnimatePresence>
        {showMrnaExtractionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[92] bg-slate-950/75 backdrop-blur-sm p-4 flex items-center justify-center"
            onClick={() => setShowMrnaExtractionModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="w-full max-w-[96vw] xl:max-w-[1500px] h-[92vh] max-h-[92vh] overflow-hidden rounded-[2rem] border border-emerald-500/35 bg-slate-900/95 p-4 md:p-5 flex flex-col gap-3"
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
            >
              <div className="flex items-center justify-between gap-4 shrink-0">
                <button
                  onClick={() => setShowMrnaExtractionModal(false)}
                  className="p-2 rounded-lg border border-slate-700 bg-slate-800/70 text-slate-300 hover:text-white"
                  aria-label="סגירת חלונית מיצוי mRNA"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="text-right">
                  <h3 className="text-3xl font-black text-white">מיצוי mRNA</h3>
                  <p className="text-base text-slate-300">תהליך מיצוי mRNA בארבעה שלבים</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-3 md:p-4 flex-1 min-h-0 flex flex-col gap-3">
                <div className="flex-1 min-h-0 rounded-xl border border-slate-700 bg-slate-950 flex items-center justify-center overflow-hidden">
                  <img
                    src="/images/mrna-extraction/mrna-extraction-4-steps.jpg"
                    alt="תהליך מיצוי mRNA בארבעה שלבים"
                    className="w-full h-full object-contain"
                    onError={(event) => {
                      const target = event.currentTarget;
                      target.onerror = null;
                      target.src = '/tube.png';
                    }}
                  />
                </div>

                <div className="flex justify-end gap-3 shrink-0 pt-1">
                  <button
                    onClick={() => setShowMrnaExtractionModal(false)}
                    className="border border-slate-600 hover:border-slate-400 text-slate-200 font-bold px-5 py-2.5 rounded-xl transition-colors"
                  >
                    סגירה
                  </button>
                  {currentStep === 0 && (
                    <button
                      onClick={() => {
                        setShowMrnaExtractionModal(false);
                        processStep(400);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-base font-bold px-6 py-2.5 rounded-xl transition-colors"
                    >
                      המשך לשלב הבא
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRtModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-slate-950/75 backdrop-blur-sm p-4 flex items-center justify-center"
            onClick={() => setShowRtModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="w-full max-w-[96vw] xl:max-w-[1500px] h-[92vh] max-h-[92vh] overflow-hidden rounded-[2rem] border border-blue-500/35 bg-slate-900/95 p-4 md:p-5 flex flex-col gap-3"
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
            >
              <div className="flex items-center justify-between gap-4 shrink-0">
                <button
                  onClick={() => setShowRtModal(false)}
                  className="p-2 rounded-lg border border-slate-700 bg-slate-800/70 text-slate-300 hover:text-white"
                  aria-label="סגירת חלונית שעתוק לאחור"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="text-right">
                  <h3 className="text-3xl font-black text-white">שעתוק לאחור (RT) וסינתזת cDNA</h3>
                  <p className="text-base text-slate-300">אנזים RT יוצר גדיל cDNA על בסיס תבנית mRNA</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-3 flex-1 min-h-0 flex flex-col gap-3">
                <iframe
                  title="סימולציית שעתוק לאחור"
                  src="/rt-simulation-popup.html"
                  className="w-full flex-1 min-h-[360px] md:min-h-[420px] rounded-xl border border-slate-700 bg-slate-950"
                />

                <div className="flex justify-end gap-3 shrink-0 pt-1">
                  <button
                    onClick={() => setShowRtModal(false)}
                    className="border border-slate-600 hover:border-slate-400 text-slate-200 font-bold px-5 py-2.5 rounded-xl transition-colors"
                  >
                    סגירה
                  </button>
                  {currentStep === 1 && (
                    <button
                      onClick={() => {
                        setShowRtModal(false);
                        processStep(400);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-base font-bold px-6 py-2.5 rounded-xl transition-colors"
                    >
                      המשך לשלב הבא
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

type MicroTubeColor = 'emerald' | 'blue';

interface MicroTubeProps {
  label: string;
  active: boolean;
  color: MicroTubeColor;
}

function MicroTube({ label, active, color }: MicroTubeProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`w-12 h-24 rounded-b-3xl border-2 transition-all duration-1000 relative flex items-end p-1 ${active
          ? `border-${color}-500 bg-${color}-500/10 shadow-[0_10px_20px_rgba(var(--${color}-500),0.2)]`
          : 'border-slate-800 bg-slate-900'
        }`}>
        {active && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: '40%' }}
            className={`w-full bg-${color}-500/40 rounded-b-2xl`}
          />
        )}
      </div>
      <span className={`text-lg font-black ${active ? `text-${color}-400` : 'text-slate-600'}`}>{label}</span>
    </div>
  );
}

