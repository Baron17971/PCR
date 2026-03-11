"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Dna,
  FlaskConical,
  Info,
  RefreshCcw,
  Search,
  Users2,
  X
} from "lucide-react";

interface StrCaseLabPageProps {
  onComplete: () => void;
}

type CaseId = "paternity" | "forensics";
type BandTone = "mother" | "child" | "candidate" | "sample";
type FeedbackTone = "success" | "error";
type Allele = number | "X" | "Y";
type Genotype = [Allele, Allele];

interface LocusDefinition {
  id: string;
  label: string;
}

interface GelLane {
  id: string;
  label: string;
  tone: BandTone;
  profile: Record<string, Genotype>;
}

interface Scenario {
  id: CaseId;
  tabLabel: string;
  title: string;
  subtitle: string;
  lociSummary: string;
  question: string;
  options: string[];
  correct: string;
  success: string;
  errorHint: string;
  loci: LocusDefinition[];
  lanes: GelLane[];
}

interface FeedbackMessage {
  tone: FeedbackTone;
  text: string;
}

const BAND_TONE_CLASS: Record<BandTone, string> = {
  mother: "bg-[#0ca4c0]",
  child: "bg-[#0ca4c0]",
  candidate: "bg-[#0ca4c0]",
  sample: "bg-[#0ca4c0]"
};

const PATERNITY_LOCI: LocusDefinition[] = [
  { id: "D3S1358", label: "D3S1358" },
  { id: "vWA", label: "vWA" },
  { id: "FGA", label: "FGA" },
  { id: "D8S1179", label: "D8S1179" },
  { id: "D21S11", label: "D21S11" },
  { id: "D18S51", label: "D18S51" },
  { id: "D5S818", label: "D5S818" }
];

const FORENSIC_LOCI: LocusDefinition[] = [
  { id: "D3S1358", label: "D3S1358" },
  { id: "vWA", label: "vWA" },
  { id: "FGA", label: "FGA" },
  { id: "D8S1179", label: "D8S1179" },
  { id: "D21S11", label: "D21S11" },
  { id: "D18S51", label: "D18S51" },
  { id: "AMEL", label: "Amelogenin" }
];

const toProfile = (entries: Array<[string, Genotype]>): Record<string, Genotype> =>
  Object.fromEntries(entries) as Record<string, Genotype>;

const MOTHER_PROFILE = toProfile([
  ["D3S1358", [14, 16]],
  ["vWA", [16, 18]],
  ["FGA", [22, 24]],
  ["D8S1179", [11, 13]],
  ["D21S11", [29, 31]],
  ["D18S51", [12, 15]],
  ["D5S818", [11, 12]],
  ["D13S317", [8, 11]],
  ["D7S820", [9, 10]],
  ["CSF1PO", [10, 12]],
  ["TH01", [6, 9]],
  ["TPOX", [8, 8]],
  ["D16S539", [10, 12]],
  ["D2S1338", [17, 20]],
  ["D19S433", [13, 14]],
  ["D12S391", [18, 22]]
]);

const CHILD_PROFILE = toProfile([
  ["D3S1358", [16, 17]],
  ["vWA", [18, 19]],
  ["FGA", [24, 25]],
  ["D8S1179", [13, 14]],
  ["D21S11", [31, 32]],
  ["D18S51", [12, 14]],
  ["D5S818", [12, 13]],
  ["D13S317", [11, 12]],
  ["D7S820", [10, 11]],
  ["CSF1PO", [12, 13]],
  ["TH01", [7, 9]],
  ["TPOX", [8, 11]],
  ["D16S539", [11, 12]],
  ["D2S1338", [20, 23]],
  ["D19S433", [14, 15]],
  ["D12S391", [22, 23]]
]);

const FATHER_A_PROFILE = toProfile([
  ["D3S1358", [15, 17]],
  ["vWA", [14, 19]],
  ["FGA", [21, 25]],
  ["D8S1179", [10, 14]],
  ["D21S11", [30, 32]],
  ["D18S51", [14, 16]],
  ["D5S818", [10, 13]],
  ["D13S317", [9, 12]],
  ["D7S820", [8, 11]],
  ["CSF1PO", [11, 13]],
  ["TH01", [7, 9]],
  ["TPOX", [9, 11]],
  ["D16S539", [11, 13]],
  ["D2S1338", [19, 23]],
  ["D19S433", [12, 15]],
  ["D12S391", [19, 23]]
]);

const FATHER_B_PROFILE = toProfile([
  ["D3S1358", [12, 14]],
  ["vWA", [15, 17]],
  ["FGA", [20, 23]],
  ["D8S1179", [9, 12]],
  ["D21S11", [28, 30]],
  ["D18S51", [11, 13]],
  ["D5S818", [9, 11]],
  ["D13S317", [8, 10]],
  ["D7S820", [7, 9]],
  ["CSF1PO", [10, 11]],
  ["TH01", [6, 8]],
  ["TPOX", [8, 10]],
  ["D16S539", [9, 11]],
  ["D2S1338", [17, 21]],
  ["D19S433", [12, 13]],
  ["D12S391", [18, 20]]
]);

const FATHER_C_PROFILE = toProfile([
  ["D3S1358", [17, 18]],
  ["vWA", [19, 20]],
  ["FGA", [24, 26]],
  ["D8S1179", [12, 15]],
  ["D21S11", [31, 33]],
  ["D18S51", [14, 17]],
  ["D5S818", [12, 14]],
  ["D13S317", [11, 13]],
  ["D7S820", [10, 12]],
  ["CSF1PO", [12, 14]],
  ["TH01", [8, 9]],
  ["TPOX", [10, 11]],
  ["D16S539", [12, 14]],
  ["D2S1338", [20, 24]],
  ["D19S433", [14, 16]],
  ["D12S391", [22, 24]]
]);

const CRIME_SAMPLE_PROFILE = toProfile([
  ["D3S1358", [15, 16]],
  ["vWA", [17, 19]],
  ["FGA", [22, 24]],
  ["D8S1179", [12, 14]],
  ["D21S11", [30, 31]],
  ["D18S51", [14, 15]],
  ["D5S818", [11, 12]],
  ["D13S317", [11, 12]],
  ["D7S820", [9, 10]],
  ["CSF1PO", [11, 12]],
  ["TH01", [7, 9]],
  ["TPOX", [8, 11]],
  ["D16S539", [11, 12]],
  ["D2S1338", [19, 23]],
  ["D19S433", [14, 15]],
  ["D12S391", [20, 23]],
  ["D1S1656", [14, 16]],
  ["D2S441", [10, 11]],
  ["D10S1248", [13, 15]],
  ["D22S1045", [15, 16]],
  ["AMEL", ["X", "Y"]]
]);

const SUSPECT_1_PROFILE = toProfile([
  ["D3S1358", [15, 17]],
  ["vWA", [17, 19]],
  ["FGA", [22, 25]],
  ["D8S1179", [12, 14]],
  ["D21S11", [30, 31]],
  ["D18S51", [14, 15]],
  ["D5S818", [11, 12]],
  ["D13S317", [11, 12]],
  ["D7S820", [9, 10]],
  ["CSF1PO", [11, 12]],
  ["TH01", [7, 9]],
  ["TPOX", [8, 11]],
  ["D16S539", [11, 12]],
  ["D2S1338", [19, 23]],
  ["D19S433", [14, 15]],
  ["D12S391", [20, 23]],
  ["D1S1656", [14, 15]],
  ["D2S441", [10, 11]],
  ["D10S1248", [13, 15]],
  ["D22S1045", [15, 16]],
  ["AMEL", ["X", "Y"]]
]);

const SUSPECT_2_PROFILE = toProfile([
  ["D3S1358", [15, 16]],
  ["vWA", [17, 19]],
  ["FGA", [22, 24]],
  ["D8S1179", [12, 14]],
  ["D21S11", [30, 31]],
  ["D18S51", [14, 15]],
  ["D5S818", [11, 12]],
  ["D13S317", [11, 12]],
  ["D7S820", [9, 10]],
  ["CSF1PO", [11, 12]],
  ["TH01", [7, 9]],
  ["TPOX", [8, 11]],
  ["D16S539", [11, 12]],
  ["D2S1338", [19, 23]],
  ["D19S433", [14, 15]],
  ["D12S391", [20, 23]],
  ["D1S1656", [14, 16]],
  ["D2S441", [10, 11]],
  ["D10S1248", [13, 15]],
  ["D22S1045", [15, 16]],
  ["AMEL", ["X", "Y"]]
]);

const SUSPECT_3_PROFILE = toProfile([
  ["D3S1358", [15, 16]],
  ["vWA", [16, 19]],
  ["FGA", [22, 24]],
  ["D8S1179", [12, 14]],
  ["D21S11", [29, 31]],
  ["D18S51", [14, 15]],
  ["D5S818", [11, 12]],
  ["D13S317", [11, 12]],
  ["D7S820", [9, 10]],
  ["CSF1PO", [11, 12]],
  ["TH01", [6, 9]],
  ["TPOX", [8, 11]],
  ["D16S539", [11, 12]],
  ["D2S1338", [19, 23]],
  ["D19S433", [14, 15]],
  ["D12S391", [20, 23]],
  ["D1S1656", [14, 16]],
  ["D2S441", [10, 11]],
  ["D10S1248", [12, 15]],
  ["D22S1045", [15, 16]],
  ["AMEL", ["X", "X"]]
]);

const SCENARIOS: Record<CaseId, Scenario> = {
  paternity: {
    id: "paternity",
    tabLabel: "בדיקת אבהות",
    title: "יישום 1: בדיקת אבהות לפי STR",
    subtitle: "סימולציה לימודית עם 7 לוקוסים מופרדים וברורים (לתרגול ממוקד).",
    lociSummary: "7 לוקוסים",
    question: "מי האב הביולוגי הסביר ביותר?",
    options: ["אב א", "אב ב", "אב ג"],
    correct: "אב א",
    success:
      "בחירה נכונה. בכל הלוקוסים שנבדקו, האלל הלא-אימהי בילד מוסבר על ידי אב א.",
    errorHint:
      "בחירה שגויה. עברו לוקוס-לוקוס: לילד כל אלל צריך להגיע מהאם או מהאב הביולוגי.",
    loci: PATERNITY_LOCI,
    lanes: [
      { id: "mother", label: "אם", tone: "mother", profile: MOTHER_PROFILE },
      { id: "child", label: "ילד", tone: "child", profile: CHILD_PROFILE },
      { id: "father-a", label: "אב א", tone: "candidate", profile: FATHER_A_PROFILE },
      { id: "father-b", label: "אב ב", tone: "candidate", profile: FATHER_B_PROFILE },
      { id: "father-c", label: "אב ג", tone: "candidate", profile: FATHER_C_PROFILE }
    ]
  },
  forensics: {
    id: "forensics",
    tabLabel: "זיהוי פלילי",
    title: "יישום 2: שיוך דגימה מזירת אירוע",
    subtitle: "סימולציה לימודית עם 7 לוקוסים מופרדים וברורים (כולל Amelogenin).",
    lociSummary: "7 לוקוסים (כולל Amelogenin)",
    question: "מי החשוד שתואם למוצג?",
    options: ["חשוד 1", "חשוד 2", "חשוד 3"],
    correct: "חשוד 2",
    success: "בחירה נכונה. חשוד 2 תואם למוצג בכל הלוקוסים כולל Amelogenin.",
    errorHint:
      "בחירה שגויה. בזיהוי פלילי מחפשים התאמה מלאה של הפרופיל בכל הסמנים שנבדקו.",
    loci: FORENSIC_LOCI,
    lanes: [
      { id: "sample", label: "מוצג", tone: "sample", profile: CRIME_SAMPLE_PROFILE },
      { id: "suspect-1", label: "חשוד 1", tone: "candidate", profile: SUSPECT_1_PROFILE },
      { id: "suspect-2", label: "חשוד 2", tone: "candidate", profile: SUSPECT_2_PROFILE },
      { id: "suspect-3", label: "חשוד 3", tone: "candidate", profile: SUSPECT_3_PROFILE }
    ]
  }
};

const alleleOffset = (allele: Allele): number => {
  if (allele === "X") return -3.5;
  if (allele === "Y") return 3.5;
  return ((allele % 11) - 5) * 0.85;
};

function locusBandPositions(genotype: Genotype, rowCenter: number): number[] {
  const [a1, a2] = genotype;
  const p1 = rowCenter + alleleOffset(a1);
  const p2 = rowCenter + alleleOffset(a2);
  if (p1 === p2) return [p1];
  return [Math.min(p1, p2), Math.max(p1, p2)];
}

function GelImage({ loci, lanes, lociSummary }: { loci: LocusDefinition[]; lanes: GelLane[]; lociSummary: string }) {
  const rowHeight = 42;
  const rowStart = 40;
  const gelHeight = rowStart + loci.length * rowHeight + 16;

  return (
    <div className="rounded-2xl border border-slate-600/40 bg-slate-950/70 p-4 space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300">תמונת ג׳ל (סימולציה)</span>
        <span className="text-slate-500">{lociSummary}</span>
      </div>

      <div className="rounded-xl border border-slate-500/70 bg-[#dce8ed] p-3 overflow-auto shadow-inner">
        <div className="min-w-[760px]" dir="ltr">
          <div
            className="grid gap-0"
            style={{ gridTemplateColumns: `124px repeat(${lanes.length}, minmax(128px, 1fr))` }}
          >
            <div />
            {lanes.map((lane) => (
              <div key={`label-${lane.id}`} className="text-center text-xs md:text-sm text-slate-700 font-black pb-1">
                {lane.label}
              </div>
            ))}

            <div className="relative border-r border-slate-500/70 pr-2 bg-[#eaf1f4]" style={{ height: gelHeight }}>
              {loci.map((locus, index) => {
                const rowCenter = rowStart + index * rowHeight;
                return (
                  <span
                    key={`locus-label-${locus.id}`}
                    className="absolute right-1 -translate-y-1/2 text-[10px] md:text-[11px] text-slate-700 font-semibold"
                    style={{ top: rowCenter }}
                  >
                    {locus.label}
                  </span>
                );
              })}
            </div>

            {lanes.map((lane) => (
              <div key={lane.id} className="relative border-x border-b border-[#6a7a82] bg-gradient-to-b from-[#d0e0e5] to-[#c7d8de]" style={{ height: gelHeight }}>
                <div className="absolute left-0 right-0 top-0 h-8 border-b border-[#6a7a82] bg-[#c4d6dc]" />
                <div className="absolute top-0 left-[18%] right-[18%] h-6 border-x border-b border-[#6a7a82] bg-[#dce8ed]" />

                <div className="absolute inset-x-0 top-8 bottom-0">
                  {loci.map((locus, index) => {
                    const rowCenter = rowStart + index * rowHeight;
                    const genotype = lane.profile[locus.id];
                    if (!genotype) return null;

                    return (
                      <React.Fragment key={`${lane.id}-${locus.id}`}>
                        <span
                          className="absolute left-2 right-2 rounded-[3px] border border-[#b4c5cb] bg-[#d9e7ec]/80"
                          style={{ top: rowCenter - rowHeight / 2 + 4, height: rowHeight - 8 }}
                        />
                        <span
                          className="absolute left-2 right-2 border-t border-[#9fb3ba]/80"
                          style={{ top: rowCenter }}
                        />
                        {locusBandPositions(genotype, rowCenter).map((bandY, bandIndex) => (
                          <span
                            key={`${lane.id}-${locus.id}-band-${bandIndex}`}
                            className={`absolute left-1/2 -translate-x-1/2 h-[7px] w-[72%] rounded-[2px] border border-[#0588a3] ${BAND_TONE_CLASS[lane.tone]}`}
                            style={{ top: bandY }}
                          />
                        ))}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StandardsBubble() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-cyan-500/35 bg-cyan-500/10 p-3 md:p-4" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-cyan-100 font-bold">
          <Info className="w-4 h-4" />
          בועת הסבר: היקף הלוקוסים בישראל
        </div>
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="rounded-lg border border-cyan-300/35 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-100 text-xs font-bold px-3 py-1.5 transition-colors"
        >
          {open ? "הסתר" : "פתח"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-3 rounded-xl border border-cyan-300/25 bg-slate-900/75 p-3 space-y-2 text-sm text-slate-200 leading-relaxed"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-cyan-100">תקציר שימושי לתלמידים</p>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 hover:bg-slate-700/60 text-slate-300"
                aria-label="סגור בועת הסבר"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p>
              בדיקות אבהות בישראל מבוצעות בצו בית משפט, ובפועל נבדקים לרוב <strong>15–21 לוקוסים מסוג STR</strong>
              כדי להגיע לוודאות גבוהה מאוד (מעל 99.9% לאישור אבהות, ושלילה ודאית כאשר אין התאמה).
            </p>
            <p>
              בזיהוי פלילי, המאגר התבסס בעבר על 13 לוקוסים, וכיום נהוג לעבוד עם <strong>20 לוקוסים לפחות</strong>{" "}
              ובנוסף סמן המין <strong>Amelogenin</strong>.
            </p>
            <p>
              לצורך למידה בכיתה, במסך זה מוצגים <strong>7 לוקוסים בלבד</strong> בכל תרחיש, בהפרדה ויזואלית ברורה.
            </p>
            <p>
              במקרים מורכבים משתמשים גם בבדיקות משלימות כמו <strong>Y-STR</strong> או <strong>DNA מיטוכונדריאלי</strong>.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
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

      <StandardsBubble />

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

        <div className="grid grid-cols-1 2xl:grid-cols-[1.5fr_1fr] gap-4">
          <section className="space-y-3">
            <div className="rounded-xl border border-slate-700/55 bg-slate-950/60 p-4 text-right space-y-2">
              <h3 className="text-2xl font-black text-white">{currentScenario.title}</h3>
              <p className="text-slate-300">{currentScenario.subtitle}</p>
            </div>
            <GelImage loci={currentScenario.loci} lanes={currentScenario.lanes} lociSummary={currentScenario.lociSummary} />
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
