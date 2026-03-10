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
  { id: 'primers', label: 'Primers', required: true, shortNote: 'מגדירים את גבולות ההגברה' },
  { id: 'dntps', label: 'dNTPs', required: true, shortNote: 'אבני הבניין של ה-DNA' },
  { id: 'taq', label: 'Taq Polymerase', required: true, shortNote: 'אנזים עמיד חום' },
  { id: 'buffer', label: 'Buffer', required: true, shortNote: 'שומר תנאים אופטימליים' },
  { id: 'mgcl2', label: 'MgCl2', required: true, shortNote: 'קו-פקטור לפולימראז' },
  { id: 'ddw', label: 'DDW (Water)', required: true, shortNote: 'איזון ריכוזים לנפח סופי' },
  { id: 'ligase', label: 'DNA Ligase', required: false, shortNote: 'לא נחוץ ל-PCR' },
  { id: 'rna-polymerase', label: 'RNA Polymerase', required: false, shortNote: 'לא נחוץ ל-PCR' }
];

const REQUIRED_REAGENTS = REAGENTS.filter((reagent) => reagent.required).map((reagent) => reagent.id);

const PRIMER_SEQUENCE = 'ATGCGTACCGGATTCGATGC';

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
  const [contamination, setContamination] = useState(0);
  const [pipettingLog, setPipettingLog] = useState<string[]>([]);

  const [thermoConfig, setThermoConfig] = useState({
    denaturation: 90,
    annealing: 45,
    extension: 68
  });
  const [thermoChecked, setThermoChecked] = useState(false);
  const [thermoMessage, setThermoMessage] = useState('');

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

  const baseCounts = useMemo(() => countBases(PRIMER_SEQUENCE), []);
  const atCount = baseCounts.aCount + baseCounts.tCount;
  const gcCount = baseCounts.gCount + baseCounts.cCount;
  const tm = 2 * atCount + 4 * gcCount;
  const gcPercent = Math.round((gcCount / PRIMER_SEQUENCE.length) * 100);

  const missingRequired = REQUIRED_REAGENTS.filter((id) => !addedReagents.has(id));
  const wrongReagents = Array.from(addedReagents).filter(
    (id) => !REAGENTS.find((reagent) => reagent.id === id)?.required
  );
  const hasTaq = addedReagents.has('taq');
  const hasDDW = addedReagents.has('ddw');
  const step1Ready = missingRequired.length === 0;

  const annealingStatus = getAnnealingStatus(thermoConfig.annealing, tm);
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

    setAddedReagents((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    const reagent = reagentById(id);
    if (!tipFresh) {
      setContamination((prev) => clamp(prev + 14, 0, 100));
    }
    if (reagent && !reagent.required) {
      setContamination((prev) => clamp(prev + 10, 0, 100));
    }

    setTipFresh(false);
    setPipettingLog((prev) => [reagent?.label ?? id, ...prev].slice(0, 6));
  };

  const handleDropToTube = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (draggedReagentId) {
      addReagent(draggedReagentId);
      setDraggedReagentId(null);
    }
  };

  const validateThermalProfile = () => {
    setThermoChecked(true);

    if (!denaturationValid) {
      setThermoMessage('דנטורציה לא אופטימלית: מומלץ 94-95°C כדי לפתוח את הגדילים באופן מלא.');
      return;
    }

    if (!extensionValid) {
      setThermoMessage('טמפרטורת Extension לא אופטימלית: בחר 72°C (בטווח 71-73°C).');
      return;
    }

    if (annealingStatus === 'high') {
      setThermoMessage('Annealing גבוה מדי: לא תהיה הגברה משמעותית כי הפריימרים לא ייקשרו טוב.');
      return;
    }

    if (annealingStatus === 'low') {
      setThermoMessage('Annealing נמוך מדי: צפויים קישורים לא-ספציפיים ויצירת primer-dimers.');
      return;
    }

    setThermoMessage('פרופיל טרמוסייקלר מצוין. אפשר לעבור לשלב המרוץ.');
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
    setContamination(0);
    setPipettingLog([]);
    setThermoConfig({ denaturation: 90, annealing: 45, extension: 68 });
    setThermoChecked(false);
    setThermoMessage('');
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
        {[
          { id: 1, label: 'שלב 1: רכיבים' },
          { id: 2, label: 'שלב 2: טרמוסייקלר' },
          { id: 3, label: 'שלב 3: המרוץ למיליון' },
          { id: 4, label: 'תוצאות ג׳ל' }
        ].map((stage) => (
          <div
            key={stage.id}
            className={`rounded-xl border px-3 py-2 text-sm font-bold text-center ${
              step === stage.id
                ? 'border-blue-400 bg-blue-500/20 text-blue-100'
                : step > stage.id
                  ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                  : 'border-slate-700 bg-slate-900/50 text-slate-400'
            }`}
          >
            {stage.label}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-4">
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
                    draggable={!isAdded}
                    onDragStart={() => setDraggedReagentId(reagent.id)}
                    className={`rounded-xl border p-3 text-right ${
                      isAdded
                        ? 'border-emerald-500/40 bg-emerald-500/10'
                        : reagent.required
                          ? 'border-slate-700 bg-slate-900/70'
                          : 'border-amber-500/30 bg-amber-500/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-100 font-bold">{reagent.label}</span>
                      {isAdded ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <button
                          onClick={() => addReagent(reagent.id)}
                          className="text-xs px-2 py-1 rounded-lg border border-slate-600 hover:border-blue-400 text-slate-200"
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
              className="rounded-2xl border border-slate-700/50 bg-slate-950/70 p-5 min-h-[240px] flex flex-col gap-4"
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
                  <span key={id} className="px-3 py-1 rounded-full text-xs font-bold border border-blue-400/30 bg-blue-500/15 text-blue-100">
                    {reagentById(id)?.label ?? id}
                  </span>
                ))}
                {addedReagents.size === 0 && <span className="text-slate-500 text-sm">אין רכיבים במבחנה עדיין</span>}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 space-y-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 font-bold">מד זיהום (Contamination)</span>
                  <span className={`font-black ${contamination < 35 ? 'text-emerald-300' : contamination < 70 ? 'text-amber-300' : 'text-red-300'}`}>
                    {contamination}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      contamination < 35 ? 'bg-emerald-400' : contamination < 70 ? 'bg-amber-400' : 'bg-red-500'
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
                  onClick={() => setTipFresh(true)}
                  className="px-4 py-2 rounded-xl border border-slate-600 hover:border-blue-400 bg-slate-800 text-slate-100 text-sm font-bold"
                >
                  החלף Tip
                </button>
              </div>

              <div>
                <p className="text-slate-300 text-sm font-bold mb-1">רכיבים אחרונים שנוספו:</p>
                <div className="flex flex-wrap gap-2">
                  {pipettingLog.length === 0 ? (
                    <span className="text-xs text-slate-500">עדיין לא בוצעה פיפטציה</span>
                  ) : (
                    pipettingLog.map((entry) => (
                      <span key={entry} className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300">
                        {entry}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-start">
                <button
                  disabled={!step1Ready}
                  onClick={() => setStep(2)}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 rounded-xl"
                >
                  המשך לשלב 2
                </button>
              </div>

              {!step1Ready && (
                <p className="text-xs text-amber-300">
                  חסרים רכיבים חובה: {missingRequired.map((id) => reagentById(id)?.label ?? id).join(', ')}
                </p>
              )}
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
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 space-y-2">
              <p className="text-slate-100 font-bold">רצף פריימר לאנליזה</p>
              <p className="font-mono text-blue-200 break-all">{PRIMER_SEQUENCE}</p>
              <p className="text-sm text-slate-300">GC%: <span className="font-bold text-emerald-300">{gcPercent}%</span></p>
              <p className="text-sm text-slate-300">
                חישוב Tm מהיר: 2 × (A+T) + 4 × (G+C) = <span className="font-bold text-violet-300">{tm}°C</span>
              </p>
              <p className="text-xs text-slate-500">טווח Annealing מומלץ: {tm - 5}°C עד {tm}°C</p>
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

          <div className="rounded-2xl border border-violet-500/25 bg-violet-500/10 p-4 md:p-5 space-y-3 text-right">
            <h4 className="text-lg font-black text-violet-200">
              הסבר מדעי: נוסחת וואלס (Wallace Rule)
            </h4>
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
                <span className="font-bold text-blue-200">למה 2 ו-4?</span> ההבדל נובע ממספר קשרי המימן:
              </p>
              <p>
                <span className="font-bold text-blue-200">A-T:</span> 2 קשרי מימן, ולכן כל זוג תורם בערך
                <span className="font-mono"> 2°C </span>
                ליציבות התרמית.
              </p>
              <p>
                <span className="font-bold text-blue-200">G-C:</span> 3 קשרי מימן, קשר חזק יותר, ולכן כל זוג תורם בערך
                <span className="font-mono"> 4°C</span>.
              </p>
            </div>
            <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 p-3 space-y-1 text-slate-200">
              <p>
                בניתוח הרצף כאן מתקבל <span className="font-mono text-blue-200">Tm = {tm}°C</span>, כלומר פריימר יציב יחסית.
              </p>
              <p>
                לכן טמפרטורת <span className="font-mono">Annealing (Ta)</span> מומלצת סביב
                <span className="font-mono text-blue-200"> {tm - 5}°C</span>.
              </p>
              <p className="text-sm text-slate-300">
                גבוה מדי (קרוב ל-{tm}) עלול למנוע קישור פריימר; נמוך מדי (למשל 45°C) עלול ליצור קישור לא-ספציפי ו-primer dimers.
              </p>
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
              disabled={!thermoChecked}
              onClick={() => setStep(3)}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 rounded-xl"
            >
              המשך לשלב 3
            </button>
          </div>

          {thermoChecked && (
            <p className={`text-sm font-medium ${thermoMessage.includes('מצוין') ? 'text-emerald-300' : 'text-amber-300'}`}>
              {thermoMessage}
            </p>
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
