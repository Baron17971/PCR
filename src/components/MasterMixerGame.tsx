"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Beaker,
  CheckCircle2,
  Dna,
  FlaskConical,
  RefreshCcw,
  Target,
  Thermometer,
  ZoomIn,
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
type ThermalFeedbackLevel = 'green' | 'yellow' | 'red' | 'info';
type TroubleshootIssue = 'no-band' | 'smear' | 'multi-band';
type TroubleshootFeedbackLevel = 'success' | 'error' | 'info';

interface Reagent {
  id: ReagentId;
  label: string;
  required: boolean;
  shortNote: string;
}

interface MasterMixerGameProps {
  onComplete: () => void;
}
const THERMAL_FEEDBACK_TEXT = {
  green: 'אור ירוק: ביצועים מעולים - הפריימר שלך מאוזן ומצוין!.',
  yellow:
    'אור צהוב: זהירות - סכנה לקשרים לא ספציפיים (יותר מדי רעש) בשל קירור משמעותי של המערכת.',
  red:
    'אור אדום: אזהרה - פריימר "דביק" - הוא עלול להיצמד לעצמו (ליצור פלונטרים) במקום להיצמד לדגימה שלך.'
} as const;

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
    title: 'תרגיל 2',
    sequence: 'TTAATATTAATATTAATATT',
    note: 'רצף עשיר בבסיסי A-T'
  },
  {
    id: 'practice-3',
    title: 'תרגיל 3',
    sequence: 'GCGTCCGCGGCGCGTCCGCG',
    note: 'רצף עשיר בבסיסי G-C'
  }
] as const;
const THERMAL_PRACTICES = [
  {
    id: 'practice-1',
    title: 'תרגיל 1',
    sequence: PRIMER_SEQUENCE,
    note: 'רצף פריימר בסיסי'
  },
  ...EXTRA_PRACTICES
] as const;

type PracticeId = (typeof THERMAL_PRACTICES)[number]['id'];

interface ThermalConfig {
  denaturation: number;
  annealing: number;
  extension: number;
}

interface ThermalFeedback {
  level: ThermalFeedbackLevel;
  text: string;
}

const DEFAULT_THERMAL_CONFIG: ThermalConfig = {
  denaturation: 90,
  annealing: 45,
  extension: 68
};

const PRACTICE_AUTO_ADVANCE_DELAY_MS = 3200;
const SCENARIO_AUTO_ADVANCE_DELAY_MS = 3000;

const createInitialThermalConfigByPractice = (): Record<PracticeId, ThermalConfig> => ({
  'practice-1': { ...DEFAULT_THERMAL_CONFIG },
  'practice-2': { ...DEFAULT_THERMAL_CONFIG },
  'practice-3': { ...DEFAULT_THERMAL_CONFIG }
});

function countBases(sequence: string) {
  const upper = sequence.toUpperCase();
  const aCount = (upper.match(/A/g) || []).length;
  const tCount = (upper.match(/T/g) || []).length;
  const gCount = (upper.match(/G/g) || []).length;
  const cCount = (upper.match(/C/g) || []).length;
  return { aCount, tCount, gCount, cCount };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const PRACTICE_TEMPERATURE_RANGES: Record<
  (typeof THERMAL_PRACTICES)[number]['id'],
  {
    denaturation: [number, number];
    annealing: [number, number];
    extension: [number, number];
  }
> = {
  'practice-1': {
    denaturation: [90, 95],
    annealing: [57, 62],
    extension: [72, 72]
  },
  'practice-2': {
    denaturation: [90, 95],
    annealing: [35, 40],
    extension: [72, 72]
  },
  'practice-3': {
    denaturation: [90, 95],
    annealing: [71, 76],
    extension: [72, 72]
  }
};

const TROUBLESHOOTING_SCENARIOS = [
  {
    id: 'run-1',
    title: 'הרצה 1',
    issue: 'no-band' as TroubleshootIssue,
    summary: 'לא התקבל פס נראה בנתיב הג׳ל.',
    context: 'בריאקציה לא התקבל תוצר כלל. יש לבחור את התיקון הסביר ביותר.',
    correctOptionId: 'run1-taq',
    successText: 'נכון. ללא Taq פולימראז פעיל לא יתקבל תוצר הגברה.',
    options: [
      { id: 'run1-anneal-high', label: 'להעלות משמעותית את טמפרטורת ה-Annealing', feedback: 'לא התיקון המתאים במקרה של היעדר פס מוחלט.' },
      { id: 'run1-taq', label: 'לוודא שהוסף Taq פולימראז פעיל', feedback: 'בחירה נכונה.' },
      { id: 'run1-ext-60', label: 'להוריד הארכה ל-60°C', feedback: 'שגוי. הארכה עם Taq אופטימלית סביב 72°C.' },
      { id: 'run1-ligase', label: 'להוסיף DNA Ligase לתערובת', feedback: 'שגוי. Ligase אינו פותר כשל PCR של היעדר פס.' }
    ]
  },
  {
    id: 'run-2',
    title: 'הרצה 2',
    issue: 'smear' as TroubleshootIssue,
    summary: 'מריחה (Smear) במקום פס חד.',
    context: 'בנתיב מתקבל אות לא ספציפי רחב. בחרו את הפעולה המתקנת המדויקת ביותר.',
    correctOptionId: 'run2-anneal-up',
    successText: 'נכון. העלאה מתונה של טמפרטורת ה-Annealing משפרת ספציפיות ומפחיתה מריחה.',
    options: [
      { id: 'run2-cycles-10', label: 'להוריד ל-10 מחזורים בלבד', feedback: 'זה עשוי להחליש אות, אך לא פותר ישירות ספציפיות נמוכה.' },
      { id: 'run2-anneal-up', label: 'להעלות מעט את טמפרטורת ה-Annealing', feedback: 'בחירה נכונה.' },
      { id: 'run2-helicase', label: 'להוסיף אנזים Helicase', feedback: 'שגוי. ב-PCR הדנטורציה התרמית מחליפה Helicase.' },
      { id: 'run2-new-template', label: 'להחליף רק את תבנית ה-DNA', feedback: 'לא אופטימלי לפני תיקון תנאי המחזור התרמי.' }
    ]
  },
  {
    id: 'run-3',
    title: 'הרצה 3',
    issue: 'multi-band' as TroubleshootIssue,
    summary: 'כמה פסים בנתיב אחד.',
    context: 'ההגברה אינה ספציפית ומתקבלים כמה תוצרים שונים.',
    correctOptionId: 'run3-redesign',
    successText: 'נכון. תכנון מחדש של פריימרים בעלי ספציפיות גבוהה הוא התיקון היעיל ביותר.',
    options: [
      { id: 'run3-mgcl2-up', label: 'להעלות מאוד את ריכוז MgCl₂', feedback: 'שגוי. עודף MgCl₂ לרוב מגביר תוצרים לא ספציפיים.' },
      { id: 'run3-redesign', label: 'לתכנן מחדש פריימרים לספציפיות גבוהה יותר', feedback: 'בחירה נכונה.' },
      { id: 'run3-denat-low', label: 'להוריד דנטורציה מתחת ל-85°C', feedback: 'שגוי. דנטורציה לא מספקת עלולה לפגוע באיכות ההגברה.' },
      { id: 'run3-buffer-only', label: 'לשנות רק את הרכב ה-Buffer', feedback: 'לא מספיק. שורש הבעיה הוא ספציפיות הפריימרים.' }
    ]
  }
] as const;

type GelBandTone = 'ladder' | 'target' | 'control' | 'warning' | 'faint';

interface GelBandModel {
  top: number;
  thickness: number;
  tone: GelBandTone;
}

interface GelSmearModel {
  top: number;
  bottom: number;
  tone: Exclude<GelBandTone, 'ladder' | 'control'>;
}

interface GelLaneModel {
  id: string;
  label: string;
  bands: GelBandModel[];
  smear?: GelSmearModel;
}

const GEL_SIZE_MARKERS = [
  { label: '1000 bp', top: 12 },
  { label: '700 bp', top: 23 },
  { label: '500 bp', top: 36 },
  { label: '300 bp', top: 53 },
  { label: '200 bp', top: 66 },
  { label: '100 bp', top: 80 }
] as const;

const GEL_BAND_TONE_CLASS: Record<GelBandTone, string> = {
  ladder: 'bg-blue-200/95 shadow-[0_0_10px_rgba(191,219,254,0.85)]',
  target: 'bg-emerald-200/95 shadow-[0_0_12px_rgba(110,231,183,0.8)]',
  control: 'bg-cyan-200/95 shadow-[0_0_11px_rgba(165,243,252,0.8)]',
  warning: 'bg-amber-200/95 shadow-[0_0_12px_rgba(253,230,138,0.85)]',
  faint: 'bg-slate-200/50 shadow-[0_0_8px_rgba(226,232,240,0.45)]'
};

const buildLadderBands = (): GelBandModel[] =>
  GEL_SIZE_MARKERS.map((marker) => ({
    top: marker.top,
    thickness: marker.label === '500 bp' ? 4 : 3,
    tone: 'ladder'
  }));

const buildScenarioGelLanes = (issue: TroubleshootIssue): GelLaneModel[] => {
  if (issue === 'no-band') {
    return [
      { id: 'ladder', label: 'Ladder', bands: buildLadderBands() },
      {
        id: 'positive',
        label: 'Positive Control',
        bands: [{ top: 48, thickness: 3, tone: 'faint' }]
      },
      { id: 'negative', label: 'Negative Control', bands: [] },
      { id: 'sample', label: 'Sample', bands: [] }
    ];
  }

  if (issue === 'smear') {
    return [
      { id: 'ladder', label: 'Ladder', bands: buildLadderBands() },
      { id: 'positive', label: 'Positive Control', bands: [{ top: 48, thickness: 4, tone: 'control' }] },
      { id: 'negative', label: 'Negative Control', bands: [] },
      {
        id: 'sample',
        label: 'Sample',
        bands: [{ top: 50, thickness: 4, tone: 'warning' }],
        smear: { top: 20, bottom: 84, tone: 'warning' }
      }
    ];
  }

  return [
    { id: 'ladder', label: 'Ladder', bands: buildLadderBands() },
    { id: 'positive', label: 'Positive Control', bands: [{ top: 48, thickness: 4, tone: 'control' }] },
    { id: 'negative', label: 'Negative Control', bands: [] },
    {
      id: 'sample',
      label: 'Sample',
      bands: [
        { top: 30, thickness: 4, tone: 'warning' },
        { top: 48, thickness: 4, tone: 'warning' },
        { top: 63, thickness: 4, tone: 'target' }
      ]
    }
  ];
};

const controlStatusByIssue: Record<
  TroubleshootIssue,
  Array<{ label: string; value: string; tone: 'ok' | 'warn' | 'bad' }>
> = {
  'no-band': [
    { label: 'Positive Control', value: 'No clear band (failed)', tone: 'bad' },
    { label: 'Negative Control', value: 'Clean lane', tone: 'ok' },
    { label: 'Sample', value: 'No product', tone: 'bad' }
  ],
  smear: [
    { label: 'Positive Control', value: 'Single sharp band', tone: 'ok' },
    { label: 'Negative Control', value: 'Clean lane', tone: 'ok' },
    { label: 'Sample', value: 'Smear / low specificity', tone: 'warn' }
  ],
  'multi-band': [
    { label: 'Positive Control', value: 'Single expected band', tone: 'ok' },
    { label: 'Negative Control', value: 'Clean lane', tone: 'ok' },
    { label: 'Sample', value: 'Multiple non-specific bands', tone: 'warn' }
  ]
};

function ScenarioGelPanel({
  issue,
  compact = false,
  zoomable = true
}: {
  issue: TroubleshootIssue;
  compact?: boolean;
  zoomable?: boolean;
}) {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const lanes = buildScenarioGelLanes(issue);
  const statuses = controlStatusByIssue[issue];

  return (
    <div className={`rounded-xl border border-slate-700 bg-slate-950/70 ${compact ? 'p-3 space-y-2' : 'p-4 space-y-3'}`}>
      <div className={`flex items-center justify-between gap-3 ${compact ? 'text-[11px]' : 'text-sm'} text-slate-300`}>
        <span className="font-bold text-slate-100">Gel Electrophoresis (Simulated)</span>
        {zoomable && (
          <button
            onClick={() => setIsZoomOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-blue-400/45 bg-blue-500/10 hover:bg-blue-500/20 text-blue-100 px-2 py-1 text-xs font-bold"
            aria-label="פתח ג׳ל מוגדל"
          >
            <ZoomIn className="w-3.5 h-3.5" />
            הגדל
          </button>
        )}
      </div>

      <div className={`relative rounded-xl border border-slate-700 overflow-hidden ${compact ? 'h-52' : 'h-56'}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-blue-950/80 to-slate-950" />
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.35)_1px,transparent_0)] [background-size:12px_12px]" />

        <div className="absolute top-0 left-0 right-0 h-14 bg-slate-800/75 border-b border-slate-600/70" />
        <div className={`absolute top-0.5 left-14 right-3 grid grid-cols-4 gap-4 ${compact ? 'text-[9px]' : 'text-[11px]'} text-slate-200/90`}>
          {lanes.map((lane) => (
            <span key={`well-name-${lane.id}`} className="text-center truncate">
              {lane.label}
            </span>
          ))}
        </div>
        <div className="absolute top-4 left-14 right-3 grid grid-cols-4 gap-4">
          {lanes.map((lane) => (
            <div key={`well-${lane.id}`} className="h-6 rounded-b-xl border border-slate-500/65 bg-slate-600/80" />
          ))}
        </div>

        <div className="absolute top-16 bottom-3 left-1 right-3">
          {GEL_SIZE_MARKERS.map((marker) => (
            <div key={marker.label} className="absolute left-0 right-0" style={{ top: `${marker.top}%` }}>
              <span className={`absolute left-0 -translate-y-1/2 ${compact ? 'text-[10px]' : 'text-[11px]'} text-slate-400`}>
                {marker.label}
              </span>
              <div className="absolute left-14 right-0 border-t border-slate-500/30" />
            </div>
          ))}
        </div>

        <div className="absolute top-16 bottom-4 left-14 right-3 grid grid-cols-4 gap-4">
          {lanes.map((lane) => (
            <div key={lane.id} className="relative rounded-md border border-slate-700/45 bg-slate-900/35 overflow-hidden">
              {lane.smear && (
                <motion.div
                  className={`absolute left-[18%] right-[18%] rounded-full blur-[2px] ${
                    lane.smear.tone === 'warning'
                      ? 'bg-gradient-to-b from-amber-200/70 via-amber-300/45 to-transparent'
                      : 'bg-gradient-to-b from-slate-200/55 via-slate-300/35 to-transparent'
                  }`}
                  style={{
                    top: `${lane.smear.top}%`,
                    height: `${Math.max(8, lane.smear.bottom - lane.smear.top)}%`
                  }}
                  initial={{ opacity: 0.45 }}
                  animate={{ opacity: [0.35, 0.8, 0.5] }}
                  transition={{ duration: 1.6, repeat: Infinity, repeatType: 'mirror' }}
                />
              )}

              {lane.bands.map((band, index) => (
                <motion.div
                  key={`${lane.id}-band-${index}-${band.top}`}
                  className={`absolute left-[16%] right-[16%] rounded-full ${GEL_BAND_TONE_CLASS[band.tone]}`}
                  style={{
                    top: `${band.top}%`,
                    height: `${band.thickness}px`
                  }}
                  initial={{ opacity: 0.2, scaleX: 0.75 }}
                  animate={{ opacity: [0.45, 1, 0.6], scaleX: [0.88, 1, 0.92] }}
                  transition={{ duration: 1.35, delay: index * 0.08, repeat: Infinity, repeatType: 'mirror' }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {statuses.map((status) => (
          <div
            key={`${status.label}-${status.value}`}
            className={`rounded-lg border px-2.5 py-2 ${compact ? 'text-[11px]' : 'text-sm'} ${
              status.tone === 'ok'
                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                : status.tone === 'warn'
                  ? 'border-amber-400/40 bg-amber-500/10 text-amber-100'
                  : 'border-red-400/40 bg-red-500/10 text-red-100'
            }`}
          >
            <p className="font-bold">{status.label}</p>
            <p className="opacity-90">{status.value}</p>
          </div>
        ))}
      </div>

      {zoomable && isZoomOpen && (
        <motion.div
          className="fixed inset-0 z-[98] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsZoomOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-5xl rounded-2xl border border-blue-500/45 bg-slate-950/95 p-4 md:p-5 space-y-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-100 font-black text-lg">תצוגת ג׳ל מוגדלת</span>
              <button
                onClick={() => setIsZoomOpen(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
                aria-label="סגירת חלון ג׳ל מוגדל"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <ScenarioGelPanel issue={issue} compact={false} zoomable={false} />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export default function MasterMixerGame({ onComplete }: MasterMixerGameProps) {
  const [step, setStep] = useState<Step>(1);

  const [addedReagents, setAddedReagents] = useState<Set<ReagentId>>(new Set());
  const [draggedReagentId, setDraggedReagentId] = useState<ReagentId | null>(null);
  const [tipFresh, setTipFresh] = useState(true);
  const [contamination, setContamination] = useState(0);

  const [activePracticeId, setActivePracticeId] = useState<PracticeId>('practice-1');
  const [thermalConfigByPractice, setThermalConfigByPractice] = useState<Record<PracticeId, ThermalConfig>>(
    createInitialThermalConfigByPractice
  );
  const [thermalFeedbackByPractice, setThermalFeedbackByPractice] = useState<Partial<Record<PracticeId, ThermalFeedback>>>({});
  const [continuationPrimerChoice, setContinuationPrimerChoice] = useState<PracticeId | null>(null);
  const [showContinuationPrompt, setShowContinuationPrompt] = useState(false);
  const [showScientificExplanation, setShowScientificExplanation] = useState(false);
  const [solvedPracticeIds, setSolvedPracticeIds] = useState<Set<PracticeId>>(new Set());

  const [activeScenarioId, setActiveScenarioId] = useState<(typeof TROUBLESHOOTING_SCENARIOS)[number]['id']>('run-1');
  const [scenarioSelections, setScenarioSelections] = useState<
    Partial<Record<(typeof TROUBLESHOOTING_SCENARIOS)[number]['id'], string>>
  >({});
  const [solvedScenarioIds, setSolvedScenarioIds] = useState<Set<(typeof TROUBLESHOOTING_SCENARIOS)[number]['id']>>(new Set());
  const [scenarioFeedback, setScenarioFeedback] = useState<{ level: TroubleshootFeedbackLevel; text: string } | null>(null);

  const continuationPromptTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvancePracticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceScenarioTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoAdvancePracticeTimeout = () => {
    if (autoAdvancePracticeTimeoutRef.current) {
      clearTimeout(autoAdvancePracticeTimeoutRef.current);
      autoAdvancePracticeTimeoutRef.current = null;
    }
  };

  const clearAutoAdvanceScenarioTimeout = () => {
    if (autoAdvanceScenarioTimeoutRef.current) {
      clearTimeout(autoAdvanceScenarioTimeoutRef.current);
      autoAdvanceScenarioTimeoutRef.current = null;
    }
  };

  const setPracticeFeedback = (practiceId: PracticeId, feedback: ThermalFeedback | null) => {
    setThermalFeedbackByPractice((prev) => {
      if (feedback) {
        return { ...prev, [practiceId]: feedback };
      }
      const next = { ...prev };
      delete next[practiceId];
      return next;
    });
  };

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
  const thermoConfig = thermalConfigByPractice[activePractice.id];
  const thermoFeedback = thermalFeedbackByPractice[activePractice.id] ?? null;
  const finalPracticeFeedback = thermalFeedbackByPractice['practice-3'] ?? null;
  const canProceedToStep3 = allPracticesSolved && continuationPrimerChoice === 'practice-1';

  const missingRequired = REQUIRED_REAGENTS.filter((id) => !addedReagents.has(id));
  const wrongReagents = Array.from(addedReagents).filter(
    (id) => !REAGENTS.find((reagent) => reagent.id === id)?.required
  );
  const contaminationTooHigh = contamination >= 30;
  const step1Ready = missingRequired.length === 0 && wrongReagents.length === 0 && tipFresh && !contaminationTooHigh;
  const contaminationVisuals = useMemo(() => {
    if (contamination >= 30) {
      return { text: 'text-red-300', bar: 'bg-red-500' };
    }
    if (contamination >= 20) {
      return { text: 'text-orange-300', bar: 'bg-orange-400' };
    }
    if (contamination >= 10) {
      return { text: 'text-yellow-300', bar: 'bg-yellow-400' };
    }
    return { text: 'text-emerald-300', bar: 'bg-emerald-400' };
  }, [contamination]);

  const activeTemperatureRanges = PRACTICE_TEMPERATURE_RANGES[activePractice.id];
  const denaturationValid =
    thermoConfig.denaturation >= activeTemperatureRanges.denaturation[0] &&
    thermoConfig.denaturation <= activeTemperatureRanges.denaturation[1];
  const extensionValid =
    thermoConfig.extension >= activeTemperatureRanges.extension[0] &&
    thermoConfig.extension <= activeTemperatureRanges.extension[1];
  const annealingStatus: AnnealingStatus =
    thermoConfig.annealing > activeTemperatureRanges.annealing[1]
      ? 'high'
      : thermoConfig.annealing < activeTemperatureRanges.annealing[0]
        ? 'low'
        : 'optimal';
  const activeScenarioIndex = TROUBLESHOOTING_SCENARIOS.findIndex((scenario) => scenario.id === activeScenarioId);
  const activeScenario = TROUBLESHOOTING_SCENARIOS[activeScenarioIndex >= 0 ? activeScenarioIndex : 0];
  const solvedScenarioCount = solvedScenarioIds.size;
  const allScenariosSolved = solvedScenarioCount === TROUBLESHOOTING_SCENARIOS.length;
  const activeScenarioSelection = scenarioSelections[activeScenario.id] ?? null;
  const activeScenarioOption = activeScenario.options.find((option) => option.id === activeScenarioSelection);

  useEffect(() => {
    return () => {
      if (autoAdvancePracticeTimeoutRef.current) {
        clearTimeout(autoAdvancePracticeTimeoutRef.current);
        autoAdvancePracticeTimeoutRef.current = null;
      }
      if (autoAdvanceScenarioTimeoutRef.current) {
        clearTimeout(autoAdvanceScenarioTimeoutRef.current);
        autoAdvanceScenarioTimeoutRef.current = null;
      }
      if (continuationPromptTimeoutRef.current) {
        clearTimeout(continuationPromptTimeoutRef.current);
        continuationPromptTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (continuationPromptTimeoutRef.current) {
      clearTimeout(continuationPromptTimeoutRef.current);
      continuationPromptTimeoutRef.current = null;
    }
    if (!(allPracticesSolved && finalPracticeFeedback?.level === 'red')) {
      return;
    }
    continuationPromptTimeoutRef.current = setTimeout(() => {
      setShowContinuationPrompt(true);
    }, 3000);
    return () => {
      if (continuationPromptTimeoutRef.current) {
        clearTimeout(continuationPromptTimeoutRef.current);
        continuationPromptTimeoutRef.current = null;
      }
    };
  }, [allPracticesSolved, finalPracticeFeedback]);

  const reagentById = (id: ReagentId) => REAGENTS.find((reagent) => reagent.id === id);

  const addReagent = (id: ReagentId) => {
    if (step !== 1) return;
    if (addedReagents.has(id)) return;
    if (!tipFresh) {
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

  const replaceTip = () => {
    setTipFresh(true);
  };

  const validateThermalProfile = () => {
    clearAutoAdvancePracticeTimeout();
    setShowContinuationPrompt(false);
    const feedbackByPractice: Record<PracticeId, ThermalFeedback> = {
      'practice-1': { level: 'green', text: THERMAL_FEEDBACK_TEXT.green },
      'practice-2': { level: 'yellow', text: THERMAL_FEEDBACK_TEXT.yellow },
      'practice-3': { level: 'red', text: THERMAL_FEEDBACK_TEXT.red }
    };
    const temperaturesAreValid = denaturationValid && extensionValid && annealingStatus === 'optimal';

    if (!temperaturesAreValid) {
      setPracticeFeedback(activePractice.id, {
        level: 'info',
        text: `הזנה שגויה של טמפרטורות עבור ${activePractice.title}. חשבו מחדש את הטמפרטורות לפי נתוני התרגיל ונסו שוב.`
      });
      return;
    }

    setPracticeFeedback(activePractice.id, feedbackByPractice[activePractice.id]);
    if (activePractice.id === 'practice-3') {
      setContinuationPrimerChoice(null);
    }

    const alreadySolved = solvedPracticeIds.has(activePractice.id);
    if (!alreadySolved) {
      setSolvedPracticeIds((prev) => {
        const next = new Set(prev);
        next.add(activePractice.id);
        return next;
      });
    }

    if (activePracticeIndex < thermalPracticeStats.length - 1) {
      const nextPracticeId = thermalPracticeStats[activePracticeIndex + 1].id;
      autoAdvancePracticeTimeoutRef.current = setTimeout(() => {
        setActivePracticeId(nextPracticeId);
        setShowContinuationPrompt(false);
      }, PRACTICE_AUTO_ADVANCE_DELAY_MS);
    }
  };

  const getPrimerLabel = (practiceId: PracticeId) => {
    if (practiceId === 'practice-1') return 'פריימר 1';
    if (practiceId === 'practice-2') return 'פריימר 2';
    return 'פריימר 3';
  };

  const handleContinuationPrimerChoice = (practiceId: PracticeId) => {
    setContinuationPrimerChoice(practiceId);
    if (practiceId === 'practice-1') {
      setShowContinuationPrompt(false);
    }
  };

  const isScenarioUnlocked = (scenarioId: (typeof TROUBLESHOOTING_SCENARIOS)[number]['id']) => {
    const index = TROUBLESHOOTING_SCENARIOS.findIndex((scenario) => scenario.id === scenarioId);
    if (index <= 0) return true;
    return solvedScenarioIds.has(TROUBLESHOOTING_SCENARIOS[index - 1].id);
  };

  const selectScenario = (scenarioId: (typeof TROUBLESHOOTING_SCENARIOS)[number]['id']) => {
    if (!isScenarioUnlocked(scenarioId)) return;
    clearAutoAdvanceScenarioTimeout();
    setActiveScenarioId(scenarioId);
    setScenarioFeedback(null);
  };

  const selectScenarioOption = (optionId: string) => {
    setScenarioSelections((prev) => ({
      ...prev,
      [activeScenario.id]: optionId
    }));
    setScenarioFeedback(null);
  };

  const validateScenarioChoice = () => {
    clearAutoAdvanceScenarioTimeout();
    if (!activeScenarioSelection) {
      setScenarioFeedback({ level: 'info', text: 'יש לבחור תיקון אחד לפני הבדיקה.' });
      return;
    }

    if (activeScenarioSelection === activeScenario.correctOptionId) {
      setSolvedScenarioIds((prev) => {
        const next = new Set(prev);
        next.add(activeScenario.id);
        return next;
      });
      setScenarioFeedback({ level: 'success', text: activeScenario.successText });
      if (activeScenarioIndex < TROUBLESHOOTING_SCENARIOS.length - 1) {
        const nextScenarioId = TROUBLESHOOTING_SCENARIOS[activeScenarioIndex + 1].id;
        autoAdvanceScenarioTimeoutRef.current = setTimeout(() => {
          setActiveScenarioId(nextScenarioId);
          setScenarioFeedback(null);
        }, SCENARIO_AUTO_ADVANCE_DELAY_MS);
      } else {
        autoAdvanceScenarioTimeoutRef.current = setTimeout(() => {
          setStep(4);
          setScenarioFeedback(null);
        }, SCENARIO_AUTO_ADVANCE_DELAY_MS);
      }
      return;
    }

    setScenarioFeedback({
      level: 'error',
      text: activeScenarioOption?.feedback ?? 'בחירה שגויה. נסו שוב.'
    });
  };

  const jumpToNextScenario = () => {
    clearAutoAdvanceScenarioTimeout();
    const nextIndex = Math.min(TROUBLESHOOTING_SCENARIOS.length - 1, activeScenarioIndex + 1);
    const nextScenarioId = TROUBLESHOOTING_SCENARIOS[nextIndex].id;
    if (!isScenarioUnlocked(nextScenarioId)) return;
    setActiveScenarioId(nextScenarioId);
    setScenarioFeedback(null);
  };

  const jumpToPreviousScenario = () => {
    clearAutoAdvanceScenarioTimeout();
    const prevIndex = Math.max(0, activeScenarioIndex - 1);
    setActiveScenarioId(TROUBLESHOOTING_SCENARIOS[prevIndex].id);
    setScenarioFeedback(null);
  };

  const resetStage1Data = () => {
    setAddedReagents(new Set());
    setDraggedReagentId(null);
    setTipFresh(true);
    setContamination(0);
  };

  const resetStage2Data = () => {
    clearAutoAdvancePracticeTimeout();
    setThermalConfigByPractice(createInitialThermalConfigByPractice());
    setThermalFeedbackByPractice({});
    setContinuationPrimerChoice(null);
    setShowContinuationPrompt(false);
    if (continuationPromptTimeoutRef.current) {
      clearTimeout(continuationPromptTimeoutRef.current);
      continuationPromptTimeoutRef.current = null;
    }
    setShowScientificExplanation(false);
    setActivePracticeId('practice-1');
    setSolvedPracticeIds(new Set());
  };

  const resetStage3Data = () => {
    clearAutoAdvanceScenarioTimeout();
    setActiveScenarioId('run-1');
    setScenarioSelections({});
    setSolvedScenarioIds(new Set());
    setScenarioFeedback(null);
  };

  const resetStage4Data = () => {
    resetStage3Data();
    setStep(3);
  };

  const resetEntireGame = () => {
    setStep(1);
    resetStage1Data();
    resetStage2Data();
    resetStage3Data();
  };

  const mainStages: Array<{ id: Step; label: string }> = [
    { id: 1, label: 'Stage 1: Reagents' },
    { id: 2, label: 'Stage 2: Thermal Cycler' },
    { id: 3, label: 'שלב 3: דיבאגינג PCR' },
    { id: 4, label: 'שלב 4: סיכום' }
  ];
  const canNavigateToMainStage = (targetStage: Step) => {
    if (contaminationTooHigh) return targetStage === 1;
    return true;
  };
  const goToMainStage = (targetStage: Step) => {
    if (targetStage === step) return;
    if (contaminationTooHigh) {
      return;
    }
    if (!canNavigateToMainStage(targetStage)) return;
    if (targetStage !== 2) {
      clearAutoAdvancePracticeTimeout();
    }
    if (targetStage !== 3) {
      clearAutoAdvanceScenarioTimeout();
    }
    setStep(targetStage);
  };

  return (
    <div className="glass-pcr-card rounded-[2.5rem] border border-slate-700/30 p-6 md:p-8 space-y-6" dir="rtl">
      <div className="text-right space-y-3">
        <h2 className="text-3xl font-black text-white flex items-center gap-3 justify-start">
          <Beaker className="w-8 h-8 text-blue-400" />
          The Master Mixer (אשף המאסטר-מיקס)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed">
          תכננו, הריצו ונתחו: המסע שלכם משלב המאסטר-מיקס ועד לפתרון בעיות בזמן אמת
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {mainStages.map((stage) => {
          const isCurrentStage = step === stage.id;
          const isStageAllowed = isCurrentStage || canNavigateToMainStage(stage.id);
          const isDisabled = !isStageAllowed;
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
        <div className="relative space-y-4">
          <div className="sticky top-2 z-20 rounded-2xl border border-blue-500/35 bg-slate-900/85 p-3">
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-200 font-bold text-sm md:text-base leading-relaxed">
                מד זיהום (Contamination) - שימו לב, אם תבחרו במרכיבים שגויים, הזיהום יגדל.
              </span>
              <span className={`font-black ${contaminationVisuals.text} shrink-0`}>
                {contamination}%
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all ${contaminationVisuals.bar}`}
                style={{ width: `${contamination}%` }}
              />
            </div>
          </div>

          {!tipFresh && !contaminationTooHigh && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-24 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-1.5rem)] rounded-2xl border border-amber-300/65 bg-slate-900 shadow-2xl p-3 flex items-center justify-between gap-3"
            >
              <p className="text-sm text-amber-100 font-bold">נוסף רכיב. החלף Tip לפני בחירה הבאה.</p>
              <button
                onClick={replaceTip}
                className="px-3 py-1.5 rounded-lg border border-amber-300/70 bg-amber-500/25 hover:bg-amber-500/35 text-amber-50 text-sm font-bold whitespace-nowrap"
              >
                החלף Tip
              </button>
            </motion.div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="rounded-2xl border border-blue-500/35 bg-slate-900/50 p-4">
                <h3 className="text-xl font-black text-white mb-2">שלב 1: The Pipetting Challenge</h3>
                <p className="text-slate-300">
                  גרור/י רכיבים מהמקרר אל מבחנת Eppendorf. חובה להחליף Tip בין רכיב לרכיב כדי לשמור סטריליות.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {REAGENTS.map((reagent) => {
                  const isAdded = addedReagents.has(reagent.id);
                  return (
                    <div
                      key={reagent.id}
                      draggable={!isAdded && tipFresh}
                      onDragStart={() => {
                        if (!tipFresh) {
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
              className="relative rounded-2xl border border-blue-500/35 bg-slate-950/70 p-4 pb-16 min-h-[160px] md:min-h-[180px] flex flex-col gap-3"
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

              <div className="absolute bottom-3 right-3">
                <button
                  disabled={!step1Ready}
                  onClick={() => setStep(2)}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 rounded-xl"
                >
                  המשך לשלב 2
                </button>
              </div>
              <div className="absolute bottom-3 left-3">
                <button
                  onClick={resetStage1Data}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold px-4 py-2 rounded-xl border border-slate-600 text-sm"
                >
                  נקה נתוני שלב 1
                </button>
              </div>
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
                  {thermalPracticeStats.map((practice, index) => {
                    const isActive = practice.id === activePractice.id;
                    const isSolved = solvedPracticeIds.has(practice.id);
                    const isUnlocked =
                      index === 0 || solvedPracticeIds.has(thermalPracticeStats[index - 1].id);
                    return (
                      <button
                        key={practice.id}
                        disabled={!isUnlocked}
                        onClick={() => {
                          clearAutoAdvancePracticeTimeout();
                          setActivePracticeId(practice.id);
                          setShowContinuationPrompt(false);
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${
                          isActive
                            ? 'border-blue-400 bg-blue-500/20 text-blue-100'
                            : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-blue-400/60'
                        } ${!isUnlocked ? 'opacity-45 cursor-not-allowed' : ''}`}
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
                    סכומים לחישוב:{' '}
                    <bdi dir="ltr">
                      (A+T)={activePractice.atCount}, (G+C)={activePractice.gcCount}
                    </bdi>
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
                      clearAutoAdvancePracticeTimeout();
                      const previous = Math.max(0, activePracticeIndex - 1);
                      setActivePracticeId(thermalPracticeStats[previous].id);
                      setShowContinuationPrompt(false);
                    }}
                    disabled={activePracticeIndex <= 0}
                    className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-900/70 text-slate-200 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    תרגיל קודם
                  </button>
                  <button
                    onClick={() => {
                      clearAutoAdvancePracticeTimeout();
                      const next = Math.min(thermalPracticeStats.length - 1, activePracticeIndex + 1);
                      setActivePracticeId(thermalPracticeStats[next].id);
                      setShowContinuationPrompt(false);
                    }}
                    disabled={
                      activePracticeIndex >= thermalPracticeStats.length - 1 ||
                      !solvedPracticeIds.has(thermalPracticeStats[activePracticeIndex].id)
                    }
                    className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-900/70 text-slate-200 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    תרגיל הבא
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
                  onChange={(event) => {
                    clearAutoAdvancePracticeTimeout();
                    const nextValue = Number(event.target.value);
                    setThermalConfigByPractice((prev) => ({
                      ...prev,
                      [activePractice.id]: { ...prev[activePractice.id], denaturation: nextValue }
                    }));
                  }}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-200 font-bold">Annealing (°C)</label>
                <input
                  type="number"
                  value={thermoConfig.annealing}
                  onChange={(event) => {
                    clearAutoAdvancePracticeTimeout();
                    const nextValue = Number(event.target.value);
                    setThermalConfigByPractice((prev) => ({
                      ...prev,
                      [activePractice.id]: { ...prev[activePractice.id], annealing: nextValue }
                    }));
                  }}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-200 font-bold">Extension (°C)</label>
                <input
                  type="number"
                  value={thermoConfig.extension}
                  onChange={(event) => {
                    clearAutoAdvancePracticeTimeout();
                    const nextValue = Number(event.target.value);
                    setThermalConfigByPractice((prev) => ({
                      ...prev,
                      [activePractice.id]: { ...prev[activePractice.id], extension: nextValue }
                    }));
                  }}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              {thermoFeedback && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                    thermoFeedback.level === 'green'
                      ? 'border-emerald-400/45 bg-emerald-500/10 text-emerald-200'
                      : thermoFeedback.level === 'yellow'
                        ? 'border-yellow-400/45 bg-yellow-500/10 text-yellow-100'
                        : thermoFeedback.level === 'red'
                          ? 'border-red-400/45 bg-red-500/10 text-red-100'
                          : 'border-amber-400/45 bg-amber-500/10 text-amber-100'
                  }`}
                >
                  {thermoFeedback.text}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={resetStage2Data}
              className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold px-5 py-2.5 rounded-xl border border-slate-600"
            >
              נקה נתוני שלב 2
            </button>
            <button
              onClick={validateThermalProfile}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl"
            >
              בדוק פרופיל טרמי
            </button>
            <button
              disabled={!canProceedToStep3}
              onClick={() => {
                clearAutoAdvancePracticeTimeout();
                setStep(3);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 rounded-xl"
            >
              המשך לשלב 3
            </button>
            {allPracticesSolved && !showContinuationPrompt && !canProceedToStep3 && (
              <button
                onClick={() => setShowContinuationPrompt(true)}
                className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-5 py-2.5 rounded-xl"
              >
                חזרה לשאלה
              </button>
            )}
          </div>

          {showContinuationPrompt && (
            <motion.div
              className="fixed inset-0 z-[96] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="w-full max-w-2xl rounded-3xl border border-blue-500/45 bg-slate-950/95 shadow-2xl p-5 space-y-4"
                onClick={(event) => event.stopPropagation()}
              >
                <h4 className="text-xl font-black text-blue-100 text-right">עם איזה פריימר תרצה להמשיך?</h4>
                <div className="flex flex-wrap gap-2">
                  {thermalPracticeStats.map((practice) => {
                    const isSelected = continuationPrimerChoice === practice.id;
                    return (
                      <button
                        key={`continue-with-${practice.id}`}
                        onClick={() => handleContinuationPrimerChoice(practice.id)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${
                          isSelected
                            ? 'border-blue-400 bg-blue-500/20 text-blue-100'
                            : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-blue-400/60'
                        }`}
                      >
                        {getPrimerLabel(practice.id)}
                      </button>
                    );
                  })}
                </div>
                {continuationPrimerChoice && (
                  <p className={`text-xs font-bold ${continuationPrimerChoice === 'practice-1' ? 'text-emerald-300' : 'text-red-300'}`}>
                    {continuationPrimerChoice === 'practice-1'
                      ? 'בחירה נכונה. אפשר לעבור לשלב הבא.'
                      : 'בחירתך שגויה. תוכל/י לחזור לתרגילים כדי לבחון שוב מיהו הפריימר האידיאלי.'}
                  </p>
                )}
                <div className="pt-1">
                  <button
                    onClick={() => {
                      setShowContinuationPrompt(false);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-600 bg-slate-900/70 hover:border-blue-400 text-slate-200 text-sm font-bold"
                  >
                    חזרה לתרגילים
                  </button>
                </div>
              </motion.div>
            </motion.div>
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
            שלב 3: דיבאגינג PCR (3 הרצות)
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            בכל הרצה מוצגת בעיית ג׳ל אחרת. בחרו את התיקון המדויק ביותר כדי להתקדם.
          </p>

          <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {TROUBLESHOOTING_SCENARIOS.map((scenario, index) => {
                const isActive = scenario.id === activeScenario.id;
                const isSolved = solvedScenarioIds.has(scenario.id);
                const isUnlocked = index === 0 || solvedScenarioIds.has(TROUBLESHOOTING_SCENARIOS[index - 1].id);
                return (
                  <button
                    key={scenario.id}
                    onClick={() => selectScenario(scenario.id)}
                    disabled={!isUnlocked}
                    className={[
                      'px-3 py-1.5 rounded-lg border text-xs font-bold',
                      isActive
                        ? 'border-blue-400 bg-blue-500/20 text-blue-100'
                        : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-blue-400/60',
                      !isUnlocked ? 'opacity-45 cursor-not-allowed' : ''
                    ].join(' ')}
                  >
                    {scenario.title} {isSolved ? '✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 space-y-3">
              <p className="text-slate-100 font-bold">{activeScenario.title}: {activeScenario.summary}</p>
              <p className="text-sm text-slate-300 leading-relaxed">{activeScenario.context}</p>

              <ScenarioGelPanel issue={activeScenario.issue} />
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 space-y-3">
              <p className="text-slate-100 font-bold">בחרו תיקון אחד:</p>
              <div className="space-y-2">
                {activeScenario.options.map((option) => {
                  const isSelected = activeScenarioSelection === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => selectScenarioOption(option.id)}
                      className={[
                        'w-full text-right px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                        isSelected
                          ? 'border-blue-400 bg-blue-500/15 text-blue-100'
                          : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-blue-400/60'
                      ].join(' ')}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <button
                  onClick={validateScenarioChoice}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl"
                >
                  בדוק בחירה
                </button>
              </div>

              {scenarioFeedback && (
                <div
                  className={[
                    'rounded-xl border px-4 py-3 text-sm font-medium',
                    scenarioFeedback.level === 'success'
                      ? 'border-emerald-400/45 bg-emerald-500/10 text-emerald-200'
                      : scenarioFeedback.level === 'error'
                        ? 'border-red-400/45 bg-red-500/10 text-red-100'
                        : 'border-amber-400/45 bg-amber-500/10 text-amber-100'
                  ].join(' ')}
                >
                  {scenarioFeedback.text}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={resetStage3Data}
              className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-900/70 text-slate-200 text-xs font-bold"
            >
              נקה נתוני שלב 3
            </button>
            <button
              onClick={jumpToPreviousScenario}
              disabled={activeScenarioIndex <= 0}
              className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-900/70 text-slate-200 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              הרצה קודמת
            </button>
            <button
              onClick={jumpToNextScenario}
              disabled={
                activeScenarioIndex >= TROUBLESHOOTING_SCENARIOS.length - 1 ||
                !solvedScenarioIds.has(activeScenario.id)
              }
              className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-900/70 text-slate-200 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              הרצה הבאה
            </button>
            <button
              onClick={() => {
                clearAutoAdvanceScenarioTimeout();
                setStep(4);
              }}
              disabled={!allScenariosSolved}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 rounded-xl"
            >
              המשך לשלב 4
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/55 p-5 space-y-5">
          <h3 className="text-2xl font-black text-white">סיכום דיבאגינג PCR</h3>
          <p className="text-slate-300 text-sm">השלמתם שלוש הרצות שונות ובחרתם תיקון מתאים לכל תקלה.</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {TROUBLESHOOTING_SCENARIOS.map((scenario) => {
              const chosenOptionId = scenarioSelections[scenario.id];
              const chosenOption = scenario.options.find((option) => option.id === chosenOptionId);
              const isCorrect = chosenOptionId === scenario.correctOptionId;
              const correctOption = scenario.options.find((option) => option.id === scenario.correctOptionId);

              return (
                <div key={'summary-' + scenario.id} className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 space-y-3">
                  <p className="text-slate-100 font-bold">{scenario.title}</p>
                  <p className="text-sm text-slate-300">{scenario.summary}</p>
                  <ScenarioGelPanel issue={scenario.issue} compact />
                  <p className={['text-xs font-bold', isCorrect ? 'text-emerald-300' : 'text-red-300'].join(' ')}>
                    {isCorrect ? 'בחירה נכונה' : 'דורש חיזוק'}
                  </p>
                  <p className="text-xs text-slate-300">נבחר: {chosenOption?.label ?? 'לא נבחר'}</p>
                  <p className="text-xs text-slate-400">תיקון מיטבי: {correctOption?.label}</p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={resetStage4Data}
              className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-900/70 text-slate-200 text-xs font-bold"
            >
              נקה נתוני שלב 4
            </button>
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
              המשך
            </button>
          </div>
        </div>
      )}

      {contaminationTooHigh && (

        <motion.div
          className="fixed inset-0 z-[99] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-md rounded-2xl border border-red-500/45 bg-slate-950/95 p-5 text-right space-y-3 shadow-2xl"
          >
            <h4 className="text-xl font-black text-red-200">עצור: זיהום גבוה</h4>
            <p className="text-slate-200 leading-relaxed">
              הגעת ל-30% זיהום ומעלה. לא ניתן להמשיך בתהליך.
            </p>
            <p className="text-sm font-bold text-red-200">התחל מחדש - הזיהום רב מידי!</p>
            <button
              onClick={resetEntireGame}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2.5 rounded-xl"
            >
              התחל מחדש
            </button>
          </motion.div>
        </motion.div>
      )}

    </div>
  );
}
