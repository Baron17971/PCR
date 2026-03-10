"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Beaker,
  CheckCircle2,
  Dna,
  Droplets,
  FlaskConical,
  Play,
  RefreshCcw,
  ShieldCheck,
  Target,
  Thermometer,
  XCircle
} from 'lucide-react';

type ReagentId =
  | 'template-dna'
  | 'primers'
  | 'dntps'
  | 'taq'
  | 'buffer'
  | 'mgcl2'
  | 'ddw'
  | 'helicase'
  | 'ligase'
  | 'rna-polymerase';

type Step = 1 | 2 | 3 | 4;
type AnnealingStatus = 'optimal' | 'high' | 'low';
type OutcomeType = 'clean-band' | 'smear' | 'no-band';

interface Reagent {
  id: ReagentId;
  label: string;
  required: boolean;
  shortNote: string;
}

interface MasterMixerGameProps {
  onComplete: () => void;
}

const TOTAL_CYCLES = 30;

const REAGENTS: Reagent[] = [
  { id: 'template-dna', label: 'Template DNA', required: true, shortNote: 'תבנית המטרה' },
  { id: 'ligase', label: 'DNA Ligase', required: false, shortNote: 'לא נחוץ ל-PCR' },
  { id: 'helicase', label: 'Helicase', required: false, shortNote: 'אנזים שכפול בתא, לא נחוץ ל-PCR' },
  { id: 'primers', label: 'Primers', required: true, shortNote: 'מגדירים את גבולות ההגברה' },
  { id: 'rna-polymerase', label: 'RNA Polymerase', required: false, shortNote: 'לא נחוץ ל-PCR' },
  { id: 'dntps', label: 'dNTPs', required: true, shortNote: 'אבני הבניין של ה-DNA' },
  { id: 'taq', label: 'Taq Polymerase', required: true, shortNote: 'אנזים עמיד לחום' },
  { id: 'mgcl2', label: 'MgCl₂', required: true, shortNote: 'קו-פקטור לפולימראז' },
  { id: 'buffer', label: 'Buffer', required: true, shortNote: 'שומר תנאים אופטימליים' },
  { id: 'ddw', label: 'DDW (Water)', required: true, shortNote: 'איזון ריכוזים לנפח סופי' },
];

const REQUIRED_REAGENTS = REAGENTS.filter((reagent) => reagent.required).map((reagent) => reagent.id);

const PRIMER_SEQUENCE = 'ATGCGTACCGGATTCGATGC';
const EXTRA_PRACTICES = [
  {
    id: 'practice-2',
    title: 'תרגול נוסף 1',
    sequence: 'TTAATATTAATATTAATATT',
    note: 'רצף עשיר בבסיסי A-T'
  },
  {
    id: 'practice-3',
    title: 'תרגול נוסף 2',
    sequence: 'GCGTCCGCGGCGCGTCCGCG',
    note: 'רצף עשיר בבסיסי G-C'
  }
] as const;
const THERMAL_PRACTICES = [
  {
    id: 'practice-1',
    title: 'תרגול 1',
    sequence: PRIMER_SEQUENCE,
    note: 'רצף פריימר בסיסי'
  },
  ...EXTRA_PRACTICES
] as const;

function countBases(sequence: string) {
  const upper = sequence.toUpperCase();
  const aCount = (upper.match(/A/g) || []).length;
  const tCount = (upper.match(/T/g) || []).length;
  const gCount = (upper.match(/G/g) || []).length;
  const cCount = (upper.match(/C/g) || []).length;
  return { aCount, tCount, gCount, cCount };
}

function getAnnealingStatus(annealingTemp: number, tm: number): AnnealingStatus {
  if (annealingTemp > tm + 1) return 'high';
  if (annealingTemp < tm - 5) return 'low';
  return 'optimal';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function MasterMixerGame({ onComplete }: MasterMixerGameProps) {
  const [step, setStep] = useState<Step>(1);

  const [addedReagents, setAddedReagents] = useState<Set<ReagentId>>(new Set());
  const [draggedReagentId, setDraggedReagentId] = useState<ReagentId | null>(null);
  const [tipFresh, setTipFresh] = useState(true);
  const [tipReminder, setTipReminder] = useState('');
  const [contamination, setContamination] = useState(0);

  const [thermoConfig, setThermoConfig] = useState({
    denaturation: 90,
    annealing: 45,
    extension: 68
  });
  const [thermoMessage, setThermoMessage] = useState('');
  const [showScientificExplanation, setShowScientificExplanation] = useState(false);
  const [activePracticeId, setActivePracticeId] = useState<(typeof THERMAL_PRACTICES)[number]['id']>('practice-1');
  const [solvedPracticeIds, setSolvedPracticeIds] = useState<Set<(typeof THERMAL_PRACTICES)[number]['id']>>(new Set());

  const [raceStarted, setRaceStarted] = useState(false);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [windowOpen, setWindowOpen] = useState(false);
  const [raceStatus, setRaceStatus] = useState('לחץ על "התחל מרוץ"');
  const [perfectHits, setPerfectHits] = useState(0);
  const [mutations, setMutations] = useState(0);

  const [outcome, setOutcome] = useState<OutcomeType | null>(null);

  const preDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openWindowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const raceActiveRef = useRef(false);
  const cycleRef = useRef(1);
  const clickedThisCycleRef = useRef(false);
  const earlyPenaltyRef = useRef(false);

  const thermalPracticeStats = useMemo(() => {
    return THERMAL_PRACTICES.map((practice) => {
      const counts = countBases(practice.sequence);
      const at = counts.aCount + counts.tCount;
      const gc = counts.gCount + counts.cCount;
      const tmValue = 2 * at + 4 * gc;
      const gcValue = Math.round((gc / practice.sequence.length) * 100);
      return {
        ...practice,
        tm: tmValue,
        atCount: at,
        gcCount: gc,
        aCount: counts.aCount,
        tCount: counts.tCount,
        gCount: counts.gCount,
        cCount: counts.cCount,
        gcPercent: gcValue
      };
    });
  }, []);
  const activePracticeIndex = thermalPracticeStats.findIndex((practice) => practice.id === activePracticeId);
  const activePractice =
    thermalPracticeStats[activePracticeIndex >= 0 ? activePracticeIndex : 0];
  const solvedPracticeCount = solvedPracticeIds.size;
  const allPracticesSolved = solvedPracticeCount === thermalPracticeStats.length;

  const missingRequired = REQUIRED_REAGENTS.filter((id) => !addedReagents.has(id));
  const wrongReagents = Array.from(addedReagents).filter(
    (id) => !REAGENTS.find((reagent) => reagent.id === id)?.required
  );
  const hasTaq = addedReagents.has('taq');
  const hasDDW = addedReagents.has('ddw');
  const contaminationTooHigh = contamination >= 30;
  const step1Ready = missingRequired.length === 0 && wrongReagents.length === 0 && tipFresh && !contaminationTooHigh;

  const annealingStatus = getAnnealingStatus(thermoConfig.annealing, activePractice.tm);
  const denaturationValid = thermoConfig.denaturation >= 94 && thermoConfig.denaturation <= 95;
  const extensionValid = thermoConfig.extension >= 71 && thermoConfig.extension <= 73;

  const efficiency = useMemo(() => {
    const hitScore = (perfectHits / TOTAL_CYCLES) * 100;
    const contaminationPenalty = contamination * 0.35;
    const mutationPenalty = mutations * 1.4;
    const wrongPenalty = wrongReagents.length * 8;
    return clamp(Math.round(hitScore - contaminationPenalty - mutationPenalty - wrongPenalty), 0, 100);
  }, [perfectHits, contamination, mutations, wrongReagents.length]);

  const clearRaceTimers = () => {
    if (preDelayTimeoutRef.current) clearTimeout(preDelayTimeoutRef.current);
    if (openWindowTimeoutRef.current) clearTimeout(openWindowTimeoutRef.current);
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    preDelayTimeoutRef.current = null;
    openWindowTimeoutRef.current = null;
    advanceTimeoutRef.current = null;
  };

  useEffect(() => {
    return () => {
      raceActiveRef.current = false;
      clearRaceTimers();
    };
  }, []);

  const reagentById = (id: ReagentId) => REAGENTS.find((reagent) => reagent.id === id);

  const addReagent = (id: ReagentId) => {
    if (step !== 1) return;
    if (addedReagents.has(id)) return;
    if (!tipFresh) {
      setTipReminder('לפני הוספת רכיב נוסף יש להחליף Tip.');
      return;
    }

    setAddedReagents((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    const reagent = reagentById(id);
    if (reagent && !reagent.required) {
      setContamination((prev) => clamp(prev + 10, 0, 100));
    }

    setTipFresh(false);
    setTipReminder('החלף Tip לפני הוספת הרכיב הבא.');
  };

  const removeReagent = (id: ReagentId) => {
    if (step !== 1) return;
    if (!addedReagents.has(id)) return;
    setAddedReagents((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleDropToTube = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (draggedReagentId) {
      addReagent(draggedReagentId);
      setDraggedReagentId(null);
    }
  };

  const validateThermalProfile = () => {
    if (!denaturationValid) {
      setThermoMessage('הפרופיל לא תקין: טמפרטורת הדנטורציה אינה מתאימה.');
      return;
    }

    if (!extensionValid) {
      setThermoMessage('הפרופיל לא תקין: טמפרטורת ה-Extension אינה מתאימה.');
      return;
    }

    if (annealingStatus === 'high') {
      setThermoMessage('הפרופיל לא תקין: טמפרטורת Annealing גבוהה מדי עבור התרגול הנוכחי.');
      return;
    }

    if (annealingStatus === 'low') {
      setThermoMessage('הפרופיל לא תקין: טמפרטורת Annealing נמוכה מדי עבור התרגול הנוכחי.');
      return;
    }

    const alreadySolved = solvedPracticeIds.has(activePractice.id);
    if (!alreadySolved) {
      setSolvedPracticeIds((prev) => {
        const next = new Set(prev);
        next.add(activePractice.id);
        return next;
      });
    }
    const solvedCountAfterCheck = alreadySolved ? solvedPracticeCount : solvedPracticeCount + 1;
    if (solvedCountAfterCheck === thermalPracticeStats.length) {
      setThermoMessage('מעולה. כל שלושת התרגולים נפתרו נכון, אפשר לעבור לשלב 3.');
      return;
    }
    setThermoMessage(`${activePractice.title} נפתר נכון. עברו לתרגול הבא.`);
  };

  const startCycle = (cycle: number) => {
    if (!raceActiveRef.current) return;
    if (cycle > TOTAL_CYCLES) {
      raceActiveRef.current = false;
      setWindowOpen(false);
      setRaceStarted(false);

      const noBand =
        !hasTaq ||
        !hasDDW ||
        missingRequired.length > 0 ||
        !denaturationValid ||
        annealingStatus === 'high';
      const smear =
        annealingStatus === 'low' ||
        contamination >= 60 ||
        perfectHits < 18 ||
        wrongReagents.length > 0 ||
        !extensionValid;

      if (noBand) setOutcome('no-band');
      else if (smear) setOutcome('smear');
      else setOutcome('clean-band');

      setStep(4);
      setRaceStatus('הריצה הסתיימה');
      return;
    }

    cycleRef.current = cycle;
    clickedThisCycleRef.current = false;
    earlyPenaltyRef.current = false;
    setCurrentCycle(cycle);
    setWindowOpen(false);
    setRaceStatus(`Cycle ${cycle}: המתן לחלון ההתארכות...`);

    const preDelay = 260 + Math.floor(Math.random() * 440);
    preDelayTimeoutRef.current = setTimeout(() => {
      if (!raceActiveRef.current) return;
      setWindowOpen(true);
      setRaceStatus(`Cycle ${cycle}: לחץ עכשיו לסיום הארכה`);

      openWindowTimeoutRef.current = setTimeout(() => {
        if (!raceActiveRef.current) return;
        setWindowOpen(false);
        if (!clickedThisCycleRef.current) {
          setMutations((prev) => prev + 1);
          setRaceStatus(`Cycle ${cycle}: פספוס - התווספה מוטציה`);
        }
        advanceTimeoutRef.current = setTimeout(() => startCycle(cycle + 1), 170);
      }, 260);
    }, preDelay);
  };

  const startRace = () => {
    if (step !== 3) return;
    raceActiveRef.current = true;
    setRaceStarted(true);
    setWindowOpen(false);
    setPerfectHits(0);
    setMutations(0);
    setCurrentCycle(1);
    setOutcome(null);
    clearRaceTimers();
    startCycle(1);
  };

  const handleTimingClick = () => {
    if (!raceActiveRef.current || !raceStarted) return;

    if (windowOpen && !clickedThisCycleRef.current) {
      clickedThisCycleRef.current = true;
      setPerfectHits((prev) => prev + 1);
      setWindowOpen(false);
      setRaceStatus(`Cycle ${cycleRef.current}: פגיעה מושלמת - הכפלה מלאה`);

      if (openWindowTimeoutRef.current) clearTimeout(openWindowTimeoutRef.current);
      advanceTimeoutRef.current = setTimeout(() => startCycle(cycleRef.current + 1), 120);
      return;
    }

    if (!windowOpen && !earlyPenaltyRef.current) {
      earlyPenaltyRef.current = true;
      setMutations((prev) => prev + 1);
      setRaceStatus(`Cycle ${cycleRef.current}: לחיצה לא בזמן - נרשמה מוטציה`);
    }
  };

  const resetEntireGame = () => {
    raceActiveRef.current = false;
    clearRaceTimers();
    setStep(1);
    setAddedReagents(new Set());
    setDraggedReagentId(null);
    setTipFresh(true);
    setTipReminder('');
    setContamination(0);
    setThermoConfig({ denaturation: 90, annealing: 45, extension: 68 });
    setThermoMessage('');
    setShowScientificExplanation(false);
    setActivePracticeId('practice-1');
    setSolvedPracticeIds(new Set());
    setRaceStarted(false);
    setCurrentCycle(1);
    setWindowOpen(false);
    setRaceStatus('לחץ על "התחל מרוץ"');
    setPerfectHits(0);
    setMutations(0);
    setOutcome(null);
  };

  const outcomeMessage =
    outcome === 'clean-band'
      ? 'מצטיין ביוטכנולוגיה! קיבלת תוצר נקי.'
      : outcome === 'smear'
        ? 'טמפרטורת ה-Annealing הייתה נמוכה מדי.'
        : 'שכחת להוסיף Taq Polymerase או שהדנטורציה לא הייתה מלאה.';

  const mainStages: Array<{ id: Step; label: string }> = [
    { id: 1, label: 'שלב 1: רכיבים' },
    { id: 2, label: 'שלב 2: טרמוסייקלר' },
    { id: 3, label: 'שלב 3: המרוץ למיליון' },
    { id: 4, label: 'תוצאות ג׳ל' }
  ];
  const canNavigateToMainStage = (targetStage: Step) => {
    if (targetStage === 1 || targetStage === 2) return true;
    if (targetStage === 3) return allPracticesSolved;
    return outcome !== null;
  };
  const isRaceLocked = raceStarted && step === 3;
  const goToMainStage = (targetStage: Step) => {
    if (targetStage === step) return;
    if (isRaceLocked) return;
    if (!canNavigateToMainStage(targetStage)) return;
    setStep(targetStage);
  };

  const additionalOutcomeNotes = [
    missingRequired.length > 0 ? `חסרים רכיבים: ${missingRequired.map((id) => reagentById(id)?.label ?? id).join(', ')}` : null,
    !hasDDW ? 'DDW לא נוסף: הריכוזים בתגובה גבוהים מדי.' : null,
    contamination >= 60 ? 'מד הזיהום גבוה: סטריליות לא נשמרה לאורך הפיפטציה.' : null,
    wrongReagents.length > 0
      ? `נוספו רכיבים לא נחוצים: ${wrongReagents.map((id) => reagentById(id)?.label ?? id).join(', ')}`
      : null
  ].filter(Boolean) as string[];

  return (
    <div className="glass-pcr-card rounded-[2.5rem] border border-slate-700/30 p-6 md:p-8 space-y-6" dir="rtl">
      <div className="text-right space-y-3">
        <h2 className="text-3xl font-black text-white flex items-center gap-3 justify-start">
          <Beaker className="w-8 h-8 text-blue-400" />
          The Master Mixer (אשף המאסטר-מיקס)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed">
          בנו ריאקציית PCR מושלמת, תכננו את הטרמוסייקלר, ונצחו את מרוץ ההגברה ל-30 מחזורים.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {mainStages.map((stage) => {
          const isCurrentStage = step === stage.id;
          const isStageAllowed = isCurrentStage || canNavigateToMainStage(stage.id);
          const isDisabled = !isStageAllowed || (isRaceLocked && stage.id !== 3);
          return (
          <button
            key={stage.id}
            onClick={() => goToMainStage(stage.id)}
            disabled={isDisabled}
            className={`rounded-xl border px-3 py-2 text-sm font-bold text-center ${
              isCurrentStage
                ? 'border-blue-400 bg-blue-500/20 text-blue-100'
                : isStageAllowed
                  ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                  : 'border-slate-700 bg-slate-900/50 text-slate-400'
            } ${isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:border-blue-400/70 transition-colors'}`}
          >
            {stage.label}
          </button>
        )})}
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-500/35 bg-slate-900/50 p-4">
              <h3 className="text-xl font-black text-white mb-2">שלב 1: The Pipetting Challenge</h3>
              <p className="text-slate-300">
                גרור/י רכיבים מהמקרר אל מבחנת Eppendorf. חובה להחליף Tip בין רכיב לרכיב כדי לשמור סטריליות.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {REAGENTS.map((reagent) => {
                const isAdded = addedReagents.has(reagent.id);
                return (
                  <div
                    key={reagent.id}
                    draggable={!isAdded && tipFresh}
                    onDragStart={() => {
                      if (!tipFresh) {
                        setTipReminder('לפני הוספת רכיב נוסף יש להחליף Tip.');
                        return;
                      }
                      setDraggedReagentId(reagent.id);
                    }}
                    className={`rounded-xl border p-3 text-right ${
                      isAdded
                        ? 'border-blue-400/70 bg-blue-500/20'
                        : 'border-blue-500/35 bg-slate-900/70 hover:border-blue-400/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-100 font-bold">{reagent.label}</span>
                      {isAdded ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <button
                          onClick={() => addReagent(reagent.id)}
                          disabled={!tipFresh}
                          className="text-xs px-2 py-1 rounded-lg border border-blue-500/35 hover:border-blue-400 text-slate-200 disabled:opacity-45 disabled:cursor-not-allowed"
                        >
                          הוסף
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{reagent.shortNote}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div
              onDrop={handleDropToTube}
              onDragOver={(event) => event.preventDefault()}
              className="rounded-2xl border border-blue-500/35 bg-slate-950/70 p-4 min-h-[160px] md:min-h-[180px] flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="text-right">
                  <p className="text-white font-black">מבחנת Master Mix</p>
                  <p className="text-xs text-slate-400">גרור לכאן רכיבים מהמקרר</p>
                </div>
                <Dna className="w-6 h-6 text-blue-300" />
              </div>

              <div className="flex flex-wrap gap-2">
                {Array.from(addedReagents).map((id) => (
                  <span key={id} className="inline-flex items-center gap-0.5 px-1 py-[1px] rounded border border-blue-400/40 bg-blue-500/15 text-xs font-bold leading-tight text-blue-100">
                    {reagentById(id)?.label ?? id}
                    <button
                      onClick={() => removeReagent(id)}
                      className="w-3 h-3 rounded-full border border-blue-300/40 text-[8px] leading-none hover:bg-blue-400/20"
                      aria-label={`הסר ${reagentById(id)?.label ?? id}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {addedReagents.size === 0 && <span className="text-slate-500 text-sm">אין רכיבים במבחנה עדיין</span>}
              </div>
            </div>

            <div className="rounded-2xl border border-blue-500/35 bg-slate-900/60 p-4 space-y-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 font-bold">מד זיהום (Contamination)</span>
                  <span className={`font-black ${contamination < 30 ? 'text-emerald-300' : contamination <= 60 ? 'text-amber-300' : 'text-red-300'}`}>
                    {contamination}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      contamination < 30 ? 'bg-emerald-400' : contamination <= 60 ? 'bg-amber-400' : 'bg-red-500'
                    }`}
                    style={{ width: `${contamination}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="text-sm">
                  <p className="text-slate-300">Tip נוכחי:</p>
                  <p className={`font-bold ${tipFresh ? 'text-emerald-300' : 'text-red-300'}`}>{tipFresh ? 'נקי' : 'בשימוש'}</p>
                </div>
                <button
                  onClick={() => {
                    setTipFresh(true);
                    setTipReminder('');
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-600 hover:border-blue-400 bg-slate-800 text-slate-100 text-sm font-bold"
                >
                  החלף Tip
                </button>
              </div>

              {tipReminder && (
                <p className="text-xs text-amber-300">{tipReminder}</p>
              )}

              {contaminationTooHigh && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 space-y-2">
                  <p className="text-sm font-bold text-red-200">התחל מחדש - הזיהום רב מידי!</p>
                  <button
                    onClick={resetEntireGame}
                    className="px-3 py-1.5 rounded-lg border border-red-400/50 bg-red-500/20 hover:bg-red-500/30 text-red-100 text-xs font-bold"
                  >
                    התחל מחדש
                  </button>
                </div>
              )}

              <div className="flex justify-start">
                <button
                  disabled={!step1Ready}
                  onClick={() => setStep(2)}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 rounded-xl"
                >
                  המשך לשלב 2
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/55 p-5 space-y-5">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Thermometer className="w-6 h-6 text-blue-300" />
            שלב 2: Thermal Cycling Logic
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {thermalPracticeStats.map((practice) => {
                    const isActive = practice.id === activePractice.id;
                    const isSolved = solvedPracticeIds.has(practice.id);
                    return (
                      <button
                        key={practice.id}
                        onClick={() => {
                          setActivePracticeId(practice.id);
                          setThermoMessage('');
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${
                          isActive
                            ? 'border-blue-400 bg-blue-500/20 text-blue-100'
                            : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-blue-400/60'
                        }`}
                      >
                        {practice.title} {isSolved ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-slate-700/70 bg-slate-950/80 p-4 space-y-2">
                  <p className="text-slate-100 font-bold">רצף פריימר לאנליזה ({activePractice.title})</p>
                  <p className="text-xs text-slate-400">{activePractice.note}</p>
                  <p className="font-mono text-blue-200 break-all">{activePractice.sequence}</p>
                  <p className="text-sm text-slate-300">
                    GC%: <span className="font-bold text-emerald-300">{activePractice.gcPercent}%</span>
                  </p>
                  <p className="text-sm text-slate-300">
                    בסיסים: A={activePractice.aCount}, T={activePractice.tCount}, G={activePractice.gCount}, C={activePractice.cCount}
                  </p>
                  <p className="text-sm text-slate-300">
                    סכומים לחישוב: (A+T)={activePractice.atCount}, (G+C)={activePractice.gcCount}
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => setShowScientificExplanation(true)}
                      className="px-4 py-2 rounded-xl border border-violet-400/40 bg-violet-500/15 hover:bg-violet-500/25 text-violet-100 text-sm font-bold"
                    >
                      פתח הסבר מדעי
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      const previous = Math.max(0, activePracticeIndex - 1);
                      setActivePracticeId(thermalPracticeStats[previous].id);
                      setThermoMessage('');
                    }}
                    disabled={activePracticeIndex <= 0}
                    className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-900/70 text-slate-200 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    תרגול קודם
                  </button>
                  <button
                    onClick={() => {
                      const next = Math.min(thermalPracticeStats.length - 1, activePracticeIndex + 1);
                      setActivePracticeId(thermalPracticeStats[next].id);
                      setThermoMessage('');
                    }}
                    disabled={activePracticeIndex >= thermalPracticeStats.length - 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-900/70 text-slate-200 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    תרגול הבא
                  </button>
                  <span className="text-xs text-slate-300">התקדמות: {solvedPracticeCount}/{thermalPracticeStats.length}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-200 font-bold">Denaturation (°C)</label>
                <input
                  type="number"
                  value={thermoConfig.denaturation}
                  onChange={(event) =>
                    setThermoConfig((prev) => ({ ...prev, denaturation: Number(event.target.value) }))
                  }
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-200 font-bold">Annealing (°C)</label>
                <input
                  type="number"
                  value={thermoConfig.annealing}
                  onChange={(event) =>
                    setThermoConfig((prev) => ({ ...prev, annealing: Number(event.target.value) }))
                  }
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-200 font-bold">Extension (°C)</label>
                <input
                  type="number"
                  value={thermoConfig.extension}
                  onChange={(event) =>
                    setThermoConfig((prev) => ({ ...prev, extension: Number(event.target.value) }))
                  }
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={validateThermalProfile}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl"
            >
              בדוק פרופיל טרמי
            </button>
            <button
              disabled={!allPracticesSolved}
              onClick={() => setStep(3)}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 rounded-xl"
            >
              המשך לשלב 3
            </button>
          </div>

          {thermoMessage && (
            <p className={`text-sm font-medium ${thermoMessage.includes('נפתר נכון') || thermoMessage.includes('מעולה') ? 'text-emerald-300' : 'text-amber-300'}`}>
              {thermoMessage}
            </p>
          )}

          {showScientificExplanation && (
            <motion.div
              className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowScientificExplanation(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="w-full max-w-3xl rounded-3xl border border-violet-400/25 bg-slate-950/95 shadow-2xl overflow-hidden"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-4">
                  <button
                    onClick={() => setShowScientificExplanation(false)}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                    aria-label="סגור חלון הסבר"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                  <h4 className="text-xl font-black text-violet-200 text-right">
                    הסבר מדעי: נוסחת וואלס (Wallace Rule)
                  </h4>
                </div>

                <div className="p-5 space-y-3 text-right">
                  <p className="text-slate-200 leading-relaxed">
                    זהו אחד החישובים הבסיסיים והחשובים בביוטכנולוגיה. הנוסחה מעריכה את
                    טמפרטורת ההיתוך (<span className="font-mono">Tm</span>) שבה כמחצית ממולקולות ה-DNA הדו-גדילי
                    (הפריימר והתבנית) נפרדות זו מזו.
                  </p>

                  <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-3 text-slate-100 font-mono text-sm">
                    Tm = 2 × (A + T) + 4 × (G + C)
                  </div>

                  <div className="space-y-2 text-slate-200 leading-relaxed">
                    <p>
                      <span className="font-bold text-blue-200">מדוע היחס הוא 2 ו-4?</span> ההבדל נובע ממספר קשרי המימן:
                    </p>
                    <p>
                      <span className="font-bold text-blue-200">A ו-T:</span> ביניהם 2 קשרי מימן, ולכן כל זוג תורם בערך
                      <span className="font-mono"> 2°C</span> ליציבות התרמית.
                    </p>
                    <p>
                      <span className="font-bold text-blue-200">G ו-C:</span> ביניהם 3 קשרי מימן, קשר חזק ויציב יותר, ולכן כל זוג תורם בערך
                      <span className="font-mono"> 4°C</span>.
                    </p>
                  </div>

                  <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 p-3 space-y-1 text-slate-200">
                    <p>
                      לאחר חישוב <span className="font-mono">Tm</span> לכל פריימר, מקובל לקבוע את טמפרטורת
                      <span className="font-mono"> Annealing (Ta)</span> מעט נמוכה יותר.
                    </p>
                    <p className="text-sm text-slate-300">
                      Ta גבוהה מדי עלולה למנוע קישור פריימר; Ta נמוכה מדי עלולה ליצור קישור לא-ספציפי ו-primer dimers.
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/55 p-5 space-y-5">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-violet-300" />
            שלב 3: The Amplification Race (30 Cycles)
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            לחיצה בזמן = הכפלה מושלמת (2^n). פספוס או לחיצה מוקדמת = מוטציה/עצירת שרשרת.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-slate-300 text-sm mb-1">Cycle נוכחי</p>
              <p className="text-3xl font-black text-blue-300">{currentCycle}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-slate-300 text-sm mb-1">פגיעות מושלמות</p>
              <p className="text-3xl font-black text-emerald-300">{perfectHits}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-slate-300 text-sm mb-1">מוטציות / פספוסים</p>
              <p className="text-3xl font-black text-red-300">{mutations}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-5 text-center space-y-3">
            <p className={`text-lg font-bold ${windowOpen ? 'text-emerald-300' : 'text-slate-300'}`}>{raceStatus}</p>
            <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${windowOpen ? 'bg-emerald-400' : 'bg-blue-500/50'}`}
                style={{ width: `${(currentCycle / TOTAL_CYCLES) * 100}%` }}
              />
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                onClick={startRace}
                disabled={raceStarted}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 rounded-xl inline-flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                התחל מרוץ
              </button>
              <button
                onClick={handleTimingClick}
                disabled={!raceStarted}
                className={`font-bold px-5 py-2.5 rounded-xl text-white inline-flex items-center gap-2 ${
                  windowOpen ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-violet-600 hover:bg-violet-500'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Dna className="w-4 h-4" />
                לחץ לסיום הארכה
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 4 && outcome && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/55 p-5 space-y-5">
          <h3 className="text-2xl font-black text-white">תוצאות המשחק ותמונת ג׳ל</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
              <p className="text-slate-200 font-bold mb-3">אלקטרופורזה - תוצר סופי</p>
              <div className="relative h-52 rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-10 bg-slate-800/70 border-b border-slate-700" />
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-4 rounded-sm bg-slate-700" />

                {outcome === 'clean-band' && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-28 w-28 h-3 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.8)]" />
                )}

                {outcome === 'smear' && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-16 w-20 h-28 rounded-full bg-gradient-to-b from-blue-200/80 via-blue-300/40 to-transparent blur-[1px]" />
                )}

                {outcome === 'no-band' && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-30 w-24 h-2 rounded-full bg-slate-500/25" />
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 space-y-4">
              <p className="text-lg font-black text-white">{outcomeMessage}</p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
                  <p className="text-slate-400">יעילות כוללת</p>
                  <p className="text-2xl font-black text-blue-300">{efficiency}%</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
                  <p className="text-slate-400">מד זיהום</p>
                  <p className="text-2xl font-black text-amber-300">{contamination}%</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
                  <p className="text-slate-400">פגיעות בזמן</p>
                  <p className="text-2xl font-black text-emerald-300">{perfectHits}/{TOTAL_CYCLES}</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
                  <p className="text-slate-400">מוטציות</p>
                  <p className="text-2xl font-black text-red-300">{mutations}</p>
                </div>
              </div>

              {additionalOutcomeNotes.length > 0 && (
                <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3 space-y-1">
                  <p className="text-slate-200 font-bold text-sm">הערות לשיפור:</p>
                  {additionalOutcomeNotes.map((note) => (
                    <p key={note} className="text-xs text-slate-300 leading-relaxed">• {note}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={resetEntireGame}
              className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold px-5 py-2.5 rounded-xl border border-slate-600 inline-flex items-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              שחק שוב
            </button>
            <button
              onClick={onComplete}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl inline-flex items-center gap-2"
            >
              <FlaskConical className="w-4 h-4" />
              המשך לשלב הבא
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 p-4 flex flex-wrap items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-300" />
        <span className="text-slate-200 text-sm">זכור: החלפת Tip בין רכיבים שומרת על סטריליות ומונעת זיהום.</span>
        <Droplets className="w-5 h-5 text-blue-300" />
        <span className="text-slate-200 text-sm">ללא DDW לא מתקבלת דילול תקין של הריאקציה.</span>
      </div>
    </div>
  );
}
