"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Circle, Dna, FlaskConical, RefreshCcw, Search, Users2 } from "lucide-react";

interface StrCaseLabPageProps {
  onComplete: () => void;
}

type CaseId = "paternity" | "forensics";
type BandTone = "mother" | "child" | "candidate" | "sample" | "neutral";
type FeedbackTone = "success" | "error";

interface GelBand {
  position: number;
  tone: BandTone;
}

interface GelLane {
  id: string;
  label: string;
  bands: GelBand[];
}

interface Scenario {
  id: CaseId;
  tabLabel: string;
  title: string;
  subtitle: string;
  question: string;
  options: string[];
  correct: string;
  success: string;
  errorHint: string;
  lanes: GelLane[];
}

interface FeedbackMessage {
  tone: FeedbackTone;
  text: string;
}

const BAND_TONE_CLASS: Record<BandTone, string> = {
  mother: "bg-violet-300 shadow-[0_0_16px_rgba(196,181,253,0.85)]",
  child: "bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.85)]",
  candidate: "bg-blue-200 shadow-[0_0_14px_rgba(191,219,254,0.8)]",
  sample: "bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.95)]",
  neutral: "bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)]"
};

const SCENARIOS: Record<CaseId, Scenario> = {
  paternity: {
    id: "paternity",
    tabLabel: "בדיקת אבהות",
    title: "יישום 1: בדיקת אבהות לפי STR",
    subtitle: "השוו בין האם, הילד ושלושה אבות אפשריים בשני לוקוסים.",
    question: "מי האב הביולוגי הסביר ביותר?",
    options: ["אב א", "אב ב", "אב ג"],
    correct: "אב א",
    success:
      "בחירה נכונה. הפסים בילד שלא הגיעו מהאם מופיעים באב א בשני הלוקוסים.",
    errorHint:
      "בחירה שגויה. חפשו אילו פסים בילד אינם קיימים באם, ובדקו מי מהאבות מכיל אותם.",
    lanes: [
      {
        id: "mother",
        label: "אם",
        bands: [
          { position: 24, tone: "mother" },
          { position: 34, tone: "mother" },
          { position: 64, tone: "mother" },
          { position: 72, tone: "mother" }
        ]
      },
      {
        id: "child",
        label: "ילד",
        bands: [
          { position: 24, tone: "child" },
          { position: 42, tone: "child" },
          { position: 72, tone: "child" },
          { position: 80, tone: "child" }
        ]
      },
      {
        id: "candidate-a",
        label: "אב א",
        bands: [
          { position: 42, tone: "candidate" },
          { position: 50, tone: "candidate" },
          { position: 58, tone: "candidate" },
          { position: 80, tone: "candidate" }
        ]
      },
      {
        id: "candidate-b",
        label: "אב ב",
        bands: [
          { position: 29, tone: "candidate" },
          { position: 36, tone: "candidate" },
          { position: 66, tone: "candidate" },
          { position: 75, tone: "candidate" }
        ]
      },
      {
        id: "candidate-c",
        label: "אב ג",
        bands: [
          { position: 24, tone: "candidate" },
          { position: 34, tone: "candidate" },
          { position: 64, tone: "candidate" },
          { position: 72, tone: "candidate" }
        ]
      }
    ]
  },
  forensics: {
    id: "forensics",
    tabLabel: "זיהוי פלילי",
    title: "יישום 2: שיוך דגימה מזירת אירוע",
    subtitle: "השוו בין דגימת המוצג לבין שלושה חשודים.",
    question: "מי החשוד שתואם למוצג?",
    options: ["חשוד 1", "חשוד 2", "חשוד 3"],
    correct: "חשוד 2",
    success: "בחירה נכונה. דפוס הפסים של המוצג תואם במדויק לחשוד 2.",
    errorHint:
      "בחירה שגויה. בזיהוי פלילי מחפשים התאמה מלאה בין פסים בכל לוקוס שנבדק.",
    lanes: [
      {
        id: "sample",
        label: "מוצג",
        bands: [
          { position: 27, tone: "sample" },
          { position: 45, tone: "sample" },
          { position: 68, tone: "sample" },
          { position: 84, tone: "sample" }
        ]
      },
      {
        id: "suspect-1",
        label: "חשוד 1",
        bands: [
          { position: 27, tone: "candidate" },
          { position: 43, tone: "candidate" },
          { position: 68, tone: "candidate" },
          { position: 82, tone: "candidate" }
        ]
      },
      {
        id: "suspect-2",
        label: "חשוד 2",
        bands: [
          { position: 27, tone: "neutral" },
          { position: 45, tone: "neutral" },
          { position: 68, tone: "neutral" },
          { position: 84, tone: "neutral" }
        ]
      },
      {
        id: "suspect-3",
        label: "חשוד 3",
        bands: [
          { position: 31, tone: "candidate" },
          { position: 45, tone: "candidate" },
          { position: 72, tone: "candidate" },
          { position: 84, tone: "candidate" }
        ]
      }
    ]
  }
};

function GelImage({ lanes }: { lanes: GelLane[] }) {
  return (
    <div className="rounded-2xl border border-slate-700/55 bg-slate-950/70 p-4 space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300">תמונת ג׳ל (סימולציה)</span>
        <span className="text-slate-500">Locus 1 / Locus 2</span>
      </div>

      <div className="relative rounded-xl border border-slate-700/70 bg-gradient-to-b from-blue-950/60 via-blue-950/50 to-slate-950/70 px-3 pt-4 pb-5 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,_rgba(125,211,252,0.18)_1px,_transparent_1px)] bg-[length:10px_10px]" />
        <div className="absolute left-2 right-2 top-[46%] border-t border-dashed border-slate-600/60" />
        <div className="absolute right-2 top-[44%] text-[10px] text-slate-400">Locus 1</div>
        <div className="absolute right-2 top-[86%] text-[10px] text-slate-400">Locus 2</div>

        <div
          className="relative grid gap-2 md:gap-3 z-10"
          style={{ gridTemplateColumns: `repeat(${lanes.length}, minmax(0, 1fr))` }}
        >
          {lanes.map((lane) => (
            <div key={lane.id} className="space-y-2">
              <div className="h-5 w-[76%] mx-auto rounded-b-xl border border-slate-500/70 bg-slate-500/40" />

              <div className="relative h-[230px] rounded-lg border border-slate-700/70 bg-slate-900/40 overflow-hidden">
                {lane.bands.map((band, index) => (
                  <span
                    key={`${lane.id}-band-${index}`}
                    className={`absolute left-1/2 -translate-x-1/2 h-[6px] w-[74%] rounded-full ${BAND_TONE_CLASS[band.tone]}`}
                    style={{ top: `${band.position}%` }}
                  />
                ))}
              </div>

              <p className="text-center text-xs md:text-sm text-slate-200 font-bold">{lane.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StrCaseLabPage({ onComplete }: StrCaseLabPageProps) {
  const [activeCase, setActiveCase] = useState<CaseId>("paternity");
  const [selectedOption, setSelectedOption] = useState<Record<CaseId, string | null>>({
    paternity: null,
    forensics: null
  });
  const [solved, setSolved] = useState<Record<CaseId, boolean>>({
    paternity: false,
    forensics: false
  });
  const [feedback, setFeedback] = useState<Record<CaseId, FeedbackMessage | null>>({
    paternity: null,
    forensics: null
  });

  const currentScenario = SCENARIOS[activeCase];
  const solvedCount = useMemo(() => Object.values(solved).filter(Boolean).length, [solved]);
  const allSolved = solvedCount === Object.keys(SCENARIOS).length;

  const handleSelectOption = (option: string) => {
    setSelectedOption((prev) => ({ ...prev, [activeCase]: option }));
    setFeedback((prev) => ({ ...prev, [activeCase]: null }));
  };

  const handleCheckAnswer = () => {
    const chosen = selectedOption[activeCase];
    if (!chosen) {
      setFeedback((prev) => ({
        ...prev,
        [activeCase]: { tone: "error", text: "בחרו אפשרות לפני בדיקת תשובה." }
      }));
      return;
    }

    if (chosen === currentScenario.correct) {
      setSolved((prev) => ({ ...prev, [activeCase]: true }));
      setFeedback((prev) => ({
        ...prev,
        [activeCase]: { tone: "success", text: currentScenario.success }
      }));
      return;
    }

    setFeedback((prev) => ({
      ...prev,
      [activeCase]: { tone: "error", text: currentScenario.errorHint }
    }));
  };

  const handleReset = () => {
    setActiveCase("paternity");
    setSelectedOption({ paternity: null, forensics: null });
    setSolved({ paternity: false, forensics: false });
    setFeedback({ paternity: null, forensics: null });
  };

  const goToOtherCase = () => {
    setActiveCase((prev) => (prev === "paternity" ? "forensics" : "paternity"));
  };

  return (
    <div className="glass-pcr-card rounded-[2.5rem] border border-slate-700/30 p-6 md:p-8 space-y-6" dir="rtl">
      <div className="text-right space-y-3">
        <h2 className="text-3xl font-black text-white flex items-center gap-3 justify-start">
          <Search className="w-8 h-8 text-cyan-300" />
          יישומי STR: הומוזיגוט, הטרוזיגוט, אבהות וזיהוי פלילי
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed max-w-5xl">
          בשלב זה תלמדו לזהות הבדל בין הומוזיגוט להטרוזיגוט ותיישמו את ההבנה בשתי משימות:
          קביעת אבהות וקביעת התאמה של חשוד למוצג מזירה.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <article className="rounded-2xl border border-slate-700/55 bg-slate-900/60 p-4 space-y-3">
          <h3 className="text-xl font-black text-white flex items-center gap-2 justify-start">
            <Dna className="w-5 h-5 text-blue-300" />
            הומוזיגוט
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            שני האללים באותו לוקוס זהים באורך. בג׳ל נראה לרוב פס יחיד.
          </p>
          <div className="rounded-xl border border-blue-500/35 bg-blue-500/10 p-3 space-y-2">
            <p className="text-blue-200 text-sm font-bold">Genotype: 12/12</p>
            <div className="relative h-12 rounded-lg border border-slate-700 bg-slate-950/70">
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[6px] w-16 rounded-full bg-blue-200 shadow-[0_0_14px_rgba(191,219,254,0.9)]" />
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-700/55 bg-slate-900/60 p-4 space-y-3">
          <h3 className="text-xl font-black text-white flex items-center gap-2 justify-start">
            <Dna className="w-5 h-5 text-emerald-300" />
            הטרוזיגוט
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            שני האללים שונים באורך. בג׳ל נראה שני פסים נפרדים באותו לוקוס.
          </p>
          <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3 space-y-2">
            <p className="text-emerald-200 text-sm font-bold">Genotype: 10/14</p>
            <div className="relative h-12 rounded-lg border border-slate-700 bg-slate-950/70">
              <span className="absolute top-[38%] left-1/2 -translate-x-1/2 h-[6px] w-16 rounded-full bg-emerald-200 shadow-[0_0_14px_rgba(167,243,208,0.9)]" />
              <span className="absolute top-[66%] left-1/2 -translate-x-1/2 h-[6px] w-16 rounded-full bg-emerald-200 shadow-[0_0_14px_rgba(167,243,208,0.9)]" />
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-700/55 bg-slate-900/60 p-4 space-y-3">
          <h3 className="text-xl font-black text-white flex items-center gap-2 justify-start">
            <Users2 className="w-5 h-5 text-amber-300" />
            עיקרון ההשוואה
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            בדיקת אבהות: כל פס בילד חייב להגיע מהאם או מהאב הביולוגי.
          </p>
          <p className="text-slate-300 text-sm leading-relaxed">
            זיהוי פלילי: נדרשת התאמה מלאה בין פרופיל המוצג לפרופיל החשוד בכל הלוקוסים.
          </p>
          <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-amber-100 text-sm">
            יותר לוקוסים = סיכוי נמוך יותר להתאמה אקראית.
          </div>
        </article>
      </div>

      <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 p-4 md:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(SCENARIOS) as CaseId[]).map((caseId) => (
              <button
                key={caseId}
                onClick={() => setActiveCase(caseId)}
                className={`rounded-xl border px-4 py-2 text-sm font-bold transition-all ${
                  activeCase === caseId
                    ? "border-blue-400 bg-blue-500/20 text-blue-100"
                    : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500"
                }`}
              >
                {solved[caseId] ? "✓ " : ""}
                {SCENARIOS[caseId].tabLabel}
              </button>
            ))}
          </div>

          <div className="text-sm text-slate-300 font-bold">
            התקדמות תרחישים: {solvedCount}/2
          </div>
        </div>

        <div className="grid grid-cols-1 2xl:grid-cols-[1.4fr_1fr] gap-4">
          <section className="space-y-3">
            <div className="rounded-xl border border-slate-700/55 bg-slate-950/60 p-4 text-right space-y-2">
              <h3 className="text-2xl font-black text-white">{currentScenario.title}</h3>
              <p className="text-slate-300">{currentScenario.subtitle}</p>
            </div>
            <GelImage lanes={currentScenario.lanes} />
          </section>

          <section className="rounded-2xl border border-slate-700/55 bg-slate-950/60 p-4 space-y-4">
            <h3 className="text-xl font-black text-white">{currentScenario.question}</h3>

            <div className="space-y-2">
              {currentScenario.options.map((option) => {
                const isSelected = selectedOption[activeCase] === option;
                return (
                  <button
                    key={option}
                    onClick={() => handleSelectOption(option)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-right font-bold transition-all ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-500/15 text-cyan-100"
                        : "border-slate-700 bg-slate-900/70 text-slate-200 hover:border-slate-500"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCheckAnswer}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all"
              >
                בדוק תשובה
              </button>

              <button
                onClick={goToOtherCase}
                className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold px-5 py-2.5 rounded-xl transition-all border border-slate-600"
              >
                מעבר לתרחיש השני
              </button>
            </div>

            <AnimatePresence mode="wait">
              {feedback[activeCase] && (
                <motion.div
                  key={`${activeCase}-${feedback[activeCase]?.tone}-${feedback[activeCase]?.text}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`rounded-xl border px-3 py-3 text-sm ${
                    feedback[activeCase]?.tone === "success"
                      ? "border-emerald-500/45 bg-emerald-500/10 text-emerald-200"
                      : "border-rose-500/45 bg-rose-500/10 text-rose-200"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {feedback[activeCase]?.tone === "success" ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                    {feedback[activeCase]?.tone === "success" ? "נכון" : "לא מדויק"}
                  </div>
                  <p className="leading-relaxed">{feedback[activeCase]?.text}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-slate-300">
            כדי להמשיך, יש לפתור נכון את שני התרחישים: בדיקת אבהות וזיהוי פלילי.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleReset}
              className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold px-5 py-2.5 rounded-xl transition-all border border-slate-600 flex items-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              איפוס
            </button>

            <button
              onClick={onComplete}
              disabled={!allSolved}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-xl transition-all flex items-center gap-2"
            >
              <FlaskConical className="w-4 h-4" />
              המשך לשלב הבא
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
