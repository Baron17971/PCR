"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  FileText,
  Fingerprint,
  HelpCircle,
  Info,
  Layers,
  Microscope,
  Play,
  RotateCcw,
  Scissors,
  Target,
  Zap,
} from "lucide-react";

type TabId = "intro" | "process" | "methods" | "results" | "glossary" | "quiz";
type MethodId = "sybr" | "taqman";

interface Sample {
  id: "A" | "B" | "C" | "NTC";
  name: string;
  color: string;
  ct: number;
  plateau: number;
  shift: number;
}

const THRESHOLD_Y = 80;
const SLOPE = 2.2;

const progressColorClasses = {
  blue: "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.35)]",
  green: "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.35)]",
  amber: "bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.35)]",
} as const;

export default function QpcrPrecisionPage() {
  const [activeTab, setActiveTab] = useState<TabId>("intro");
  const [activeMethod, setActiveMethod] = useState<MethodId>("sybr");
  const [currentCycle, setCurrentCycle] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedSample, setSelectedSample] = useState<Sample["id"] | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
    { id: "intro", label: "מבוא", icon: <Info size={16} /> },
    { id: "process", label: "שלבים", icon: <Layers size={16} /> },
    { id: "methods", label: "גילוי", icon: <Zap size={16} /> },
    { id: "results", label: "סימולטור", icon: <BarChart3 size={16} /> },
    { id: "glossary", label: "מושגים", icon: <FileText size={16} /> },
    { id: "quiz", label: "שאלות", icon: <HelpCircle size={16} /> },
  ];

  const samples = useMemo<Sample[]>(() => {
    const baseSamples = [
      { id: "A" as const, name: "High Conc. (A)", color: "#38bdf8", ct: 18, plateau: 85 },
      { id: "B" as const, name: "Medium Conc. (B)", color: "#4ade80", ct: 25, plateau: 82 },
      { id: "C" as const, name: "Low Conc. (C)", color: "#fbbf24", ct: 32, plateau: 78 },
      { id: "NTC" as const, name: "NTC", color: "#64748b", ct: 45, plateau: 5 },
    ];

    return baseSamples.map((s) => {
      const shift = s.ct + SLOPE * Math.log(s.plateau / 20 - 1);
      return { ...s, shift };
    });
  }, []);

  const quizQuestions = [
    {
      q: "מדוע יש צורך בשלב ה-RT (Reverse Transcription) לפני תחילת ה-qPCR?",
      a: "מכיוון שהאנזים DNA-Polymerase (Taq) מסוגל לשכפל רק גדילי DNA. היות והמטרה היא לבדוק ביטוי גנים (mRNA), יש להפוך את ה-RNA ל-cDNA יציב שניתן להגברה.",
    },
    {
      q: "מה מייצג ערך ה-Ct (Cycle Threshold)?",
      a: "זהו מספר המחזור שבו עוצמת הפלואורסצנציה חוצה את קו הסף (Threshold). ערך זה עומד ביחס הפוך לכמות ה-DNA ההתחלתית בדגימה.",
    },
    {
      q: "מהו 'גן מנרמל' (Normalizing Gene / Housekeeping Gene) ומדוע הוא קריטי?",
      a: "זהו גן שביטויו קבוע ואינו משתנה בין רקמות או תנאי ניסוי (כמו GAPDH או Actin). הוא משמש כביקורת פנימית כדי לתקן שגיאות שנובעות מהבדלים בכמויות ה-RNA ההתחלתיות שהוכנסו למבחנה או מיעילות ה-RT.",
    },
    {
      q: "איך משתמשים בגן המנרמל לחישוב התוצאות?",
      a: "מבצעים נרמול (Normalization) על ידי החסרת ה-Ct של הגן המנרמל מה-Ct של גן המטרה (Target). התוצאה נקראת Delta Ct והיא מייצגת את רמת הביטוי האמיתית של הגן ללא תלות בכמות החומר שהוכנסה.",
    },
    {
      q: "מה ההבדל העיקרי בין שימוש ב-SYBR Green לבין TaqMan Probe?",
      a: "SYBR Green הוא צבע לא ספציפי שנקשר לכל DNA דו-גדילי, בעוד ש-TaqMan מבוסס על גלאי ספציפי שנקשר רק לרצף המטרה. TaqMan מאפשר דיוק גבוה יותר ומניעת תוצאות חיוביות כוזבות עקב תוצרי לוואי.",
    },
    {
      q: "מה קורה בשלב ה-Log Phase בגרף ההגברה?",
      a: "זהו השלב האקספוננציאלי שבו כמות ה-DNA מוכפלת בכל מחזור. זהו השלב המדויק ביותר לחישוב ערך ה-Ct וליעילות המערכת.",
    },
    {
      q: "מדוע הגרף מגיע לשלב ה-Plateau (רוויה) בסוף הריצה?",
      a: "עקב מחסור במשאבים במבחנה: הנוקלאוטידים (dNTPs) או התחלים נגמרים, או שפעילות האנזים Taq Polymerase דועכת לאחר מחזורים רבים.",
    },
    {
      q: "מהי מטרת ה-NTC (No Template Control)?",
      a: "זוהי ביקורת שלילית שנועדה לוודא שאין זיהומים בראגנטים או במים. אם מופיעה עקומה ב-NTC, זה מעיד על זיהום או על יצירת Primer Dimers (תחלים שנקשרו לעצמם).",
    },
    {
      q: "כיצד ריכוז התחלתי נמוך משפיע על מיקום העקומה?",
      a: "ככל שהריכוז ההתחלתי נמוך יותר, יידרשו יותר מחזורים עד שהאות הפלואורסצנטי יחצה את ה-Threshold, ולכן ערך ה-Ct יהיה גבוה יותר (העקומה תזוז ימינה בגרף).",
    },
    {
      q: "מהו ה-Baseline בגרף ה-qPCR?",
      a: "זהו רעש הרקע החשמלי והאופטי של המכשיר במחזורים הראשונים (בד\"כ מחזורים 3-15), לפני שמתחילה הצטברות משמעותית של תוצר פלואורסצנטי.",
    },
  ];

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (isAnimating && currentCycle < 40) {
      interval = setInterval(() => {
        setCurrentCycle((prev) => {
          const next = Math.min(prev + 0.3, 40);
          if (next >= 40) {
            setIsAnimating(false);
          }
          return next;
        });
      }, 25);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isAnimating, currentCycle]);

  const handlePlay = () => {
    if (currentCycle >= 40) {
      setCurrentCycle(0);
    }
    setIsAnimating(true);
  };

  const handleReset = () => {
    setCurrentCycle(0);
    setIsAnimating(false);
    setSelectedSample(null);
  };

  const toggleQuestion = (index: number) => {
    setExpandedQuestion((current) => (current === index ? null : index));
  };

  const getPath = (sample: Sample, maxCycle: number) => {
    let points = "M 0 100";
    for (let i = 0; i <= maxCycle; i += 0.4) {
      const progress = 1 / (1 + Math.exp(-(i - sample.shift) / SLOPE));
      const y = 100 - progress * sample.plateau;
      const x = (i / 40) * 100;
      points += ` L ${x} ${y}`;
    }
    return points;
  };

  return (
    <div className="glass-pcr-card rounded-[2.5rem] border border-slate-700/30 p-4 md:p-6 space-y-6" dir="rtl">
      <header className="w-full flex flex-col lg:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-4 pl-24 md:pl-36">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <Microscope className="text-blue-400" size={24} />
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold tracking-tight text-white leading-none">
              qPCR <span className="text-blue-400 font-light italic">Precision</span>
            </h2>
            <p className="text-slate-500 text-[9px] uppercase tracking-widest mt-1">Laboratory Simulation v6.4</p>
          </div>
        </div>

        <nav className="bg-slate-900/50 backdrop-blur-md p-1 rounded-xl border border-slate-800 flex flex-wrap justify-center gap-1 max-w-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-300 ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-lg"
                  : "hover:bg-slate-800 text-slate-300"
              }`}
            >
              {tab.icon}
              <span className="font-bold text-xs uppercase tracking-wide">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="w-full">
        {activeTab === "intro" && (
          <div className="bg-slate-900/30 p-8 md:p-10 rounded-[2.5rem] border border-slate-800 animate-in fade-in duration-700">
            <h3 className="text-3xl md:text-4xl font-light text-white mb-8 border-r-4 border-blue-500/50 pr-6">
              מבוא ל-qPCR
            </h3>
            <div className="grid md:grid-cols-2 gap-8 md:gap-10">
              <div className="space-y-6">
                <div className="bg-slate-800/40 p-6 rounded-[1.75rem] border border-slate-700/50 shadow-xl">
                  <h4 className="text-xl font-bold text-blue-400 mb-4 flex items-center justify-start gap-3">
                    <Activity size={24} />
                    <span>מטרה מרכזית</span>
                  </h4>
                  <p className="text-lg md:text-xl leading-relaxed font-light text-slate-200">
                    קביעת כמות יחסית של מולקולות mRNA ששועתקו בגוף כביטוי לגנים. השיטה מאפשרת השוואה מדויקת בין
                    רקמות ותנאים שונים.
                  </p>
                </div>
                <div className="bg-slate-800/40 p-6 rounded-[1.75rem] border border-slate-700/50 shadow-xl">
                  <h4 className="text-xl font-bold text-blue-400 mb-4 flex items-center justify-start gap-3">
                    <CheckCircle2 size={24} />
                    <span>הבדל מ-PCR רגיל</span>
                  </h4>
                  <ul className="text-base md:text-lg space-y-3 font-light">
                    <li className="flex items-center gap-3 justify-start">
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0" />
                      <span>
                        ניטור כמות ה-DNA <span className="font-bold text-white">בזמן אמת</span> (Real-Time).
                      </span>
                    </li>
                    <li className="flex items-center gap-3 justify-start">
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0" />
                      <span>ביטול הצורך בהרצת ג&apos;ל אלקטרופורזה בסיום התהליך.</span>
                    </li>
                    <li className="flex items-center gap-3 justify-start">
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0" />
                      <span>קבלת תוצאה כמותית (קוונטיטטיבית) מדויקת ומהירה.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center bg-blue-500/5 rounded-[2.5rem] border border-blue-500/10 p-10 shadow-inner">
                <div className="text-8xl mb-6 drop-shadow-[0_0_25px_rgba(59,130,246,0.4)] animate-pulse text-white opacity-60">
                  🧬
                </div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] leading-loose text-center">
                  Quantitative
                  <br />
                  Polymerase Chain Reaction
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "process" && (
          <div className="bg-slate-900/30 p-8 md:p-10 rounded-[2.5rem] border border-slate-800 animate-in fade-in duration-700">
            <h3 className="text-3xl md:text-4xl font-light text-white mb-8 border-r-4 border-blue-500/50 pr-6">שלבי התהליך</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/40 shadow-lg">
                <div className="flex items-center gap-4 mb-4 justify-start">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    1
                  </div>
                  <h4 className="text-2xl font-bold text-white">Reverse Transcription (RT)</h4>
                </div>
                <p className="text-lg md:text-xl text-slate-300 font-light leading-relaxed">
                  הפיכת ה-mRNA ל-cDNA (DNA משלים) באמצעות אנזים RT, תחל Oligo-dT ונוקלאוטידים.
                </p>
              </div>
              <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/40 shadow-lg">
                <div className="flex items-center gap-4 mb-4 justify-start">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    2
                  </div>
                  <h4 className="text-2xl font-bold text-white">Amplification (הגברה)</h4>
                </div>
                <p className="text-lg md:text-xl text-slate-300 font-light leading-relaxed">
                  שכפול ה-DNA בעזרת Taq פולימראז ותחלים ספציפיים, תוך ניטור פלואורסצנציה בזמן אמת.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "methods" && (
          <div className="bg-slate-900/30 p-8 md:p-10 rounded-[2.5rem] border border-slate-800 animate-in fade-in duration-700">
            <h3 className="text-3xl md:text-4xl font-light text-white mb-8 border-r-4 border-blue-500/50 pr-6">שיטות גילוי</h3>

            <div className="flex gap-4 mb-10 justify-center">
              <button
                onClick={() => setActiveMethod("sybr")}
                className={`px-10 py-3.5 rounded-2xl text-sm font-black tracking-widest transition-all ${
                  activeMethod === "sybr"
                    ? "bg-green-600 text-white shadow-xl scale-105"
                    : "bg-slate-800 text-slate-500 hover:text-slate-400"
                }`}
              >
                SYBR GREEN
              </button>
              <button
                onClick={() => setActiveMethod("taqman")}
                className={`px-10 py-3.5 rounded-2xl text-sm font-black tracking-widest transition-all ${
                  activeMethod === "taqman"
                    ? "bg-blue-600 text-white shadow-xl scale-105"
                    : "bg-slate-800 text-slate-500 hover:text-slate-400"
                }`}
              >
                TAQMAN PROBE
              </button>
            </div>

            {activeMethod === "sybr" ? (
              <div className="grid md:grid-cols-2 gap-10 items-center max-w-5xl mx-auto">
                <div className="space-y-6">
                  <h4 className="text-3xl font-bold text-green-400 italic">SYBR Green I</h4>
                  <p className="text-lg md:text-xl leading-relaxed font-light text-slate-300">
                    חומר פלואורסצנטי הנקשר לכל <span className="font-bold text-white">DNA דו-גדילי</span> באופן לא
                    ספציפי. הקרינה גדלה משמעותית עם קשירת ה-DNA החדש שנוצר.
                  </p>
                  <div className="p-6 bg-green-500/5 border border-green-500/20 rounded-[1.75rem] border-r-8 border-r-green-600 shadow-lg">
                    <p className="text-lg italic text-slate-300 leading-relaxed">
                      בזמן הדנטורציה מולקולות הצבע משתחררות והאות יורד. במהלך ההתארכות, יותר מולקולות נקשרות והקרינה
                      מוגברת ומנוטרת בזמן אמת.
                    </p>
                  </div>
                </div>
                <div className="bg-black/50 rounded-[2.5rem] border border-slate-800 p-10 text-center flex flex-col items-center shadow-2xl">
                  <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse mb-8 border border-green-500/30">
                    <Zap className="text-green-400" size={48} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-[0.4em] text-green-500/60">Intercalating Dye</span>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-10 items-center max-w-5xl mx-auto">
                <div className="space-y-6">
                  <h4 className="text-3xl font-bold text-blue-400 italic">TaqMan Probe</h4>
                  <p className="text-lg md:text-xl leading-relaxed font-light text-slate-300">
                    גלאי ספציפי הכולל שתי מולקולות המחוברות לרצף המשלים ל-DNA המבוקש.
                  </p>
                  <ul className="text-lg space-y-4 font-light">
                    <li className="flex items-center gap-4 justify-start">
                      <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />
                      <span className="text-slate-200">
                        <span className="font-bold text-white">Fluorophore (R)</span>: פולט קרינה כשמשתחרר מהקרבה
                        ל-Quencher.
                      </span>
                    </li>
                    <li className="flex items-center gap-4 justify-start">
                      <div className="w-3 h-3 bg-slate-600 rounded-full" />
                      <span className="text-slate-200">
                        <span className="font-bold text-white">Quencher (Q)</span>: מדכא את הפלואורסצנציה כל עוד הגלאי
                        שלם.
                      </span>
                    </li>
                    <li className="flex items-start gap-4 justify-start text-slate-400 italic bg-blue-500/5 p-4 rounded-xl border border-blue-500/10">
                      <Scissors size={24} className="mt-1 flex-shrink-0" />
                      <span className="text-lg">כשהפולימראז מפרק את הגלאי, ה-Fluorophore משתחרר והאות נמדד במכשיר.</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-black/50 rounded-[2.5rem] border border-slate-800 p-10 text-center flex flex-col items-center shadow-2xl">
                  <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mb-8 border border-blue-500/30">
                    <Target className="text-blue-400" size={48} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-[0.4em] text-blue-500/60">Sequence Specific</span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "results" && (
          <div className="grid lg:grid-cols-12 gap-6 animate-in fade-in duration-1000">
            <div className="lg:col-span-3 space-y-4 order-2 lg:order-1">
              <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800 shadow-2xl">
                <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <Activity className="text-blue-400" size={18} />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Controls</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePlay}
                      disabled={isAnimating}
                      className="bg-blue-600 hover:bg-blue-500 p-2.5 rounded-xl text-white transition-all shadow-lg disabled:opacity-50"
                    >
                      <Play size={16} fill="currentColor" />
                    </button>
                    <button
                      onClick={handleReset}
                      className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl text-slate-300 transition-all border border-slate-700"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-slate-800/50 mb-6">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cycle:</span>
                  <span className="text-3xl font-light text-blue-400 tabular-nums italic">{Math.floor(currentCycle)}</span>
                </div>

                <div className="space-y-2">
                  {samples.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSample(s.id === selectedSample ? null : s.id)}
                      className={`w-full p-4 rounded-xl border transition-all flex items-center justify-between ${
                        selectedSample === s.id
                          ? "border-blue-500 bg-blue-500/10 shadow-lg"
                          : "border-transparent bg-slate-900/60 hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: s.color, boxShadow: `0 0 10px ${s.color}` }}
                        />
                        <span className={`text-base font-medium ${selectedSample === s.id ? "text-white" : "text-slate-400"}`}>
                          {s.name}
                        </span>
                      </div>
                      {currentCycle >= s.ct && s.id !== "NTC" && (
                        <span className="text-sm font-black text-white bg-white/10 px-2 py-0.5 rounded italic">Ct {s.ct}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-[2rem] shadow-lg">
                <h4 className="text-base font-black text-blue-400 uppercase tracking-widest mb-3">System Status</h4>
                <p className="text-lg text-slate-300 leading-relaxed font-medium">
                  הסימולציה מציגה כימות מולקולרי מדויק. חציית הסף מהווה את נקודת המדידה הקריטית (Ct).
                </p>
              </div>
            </div>

            <div className="lg:col-span-9 bg-slate-950/30 p-6 rounded-[2.5rem] border border-slate-900 flex flex-col order-1 lg:order-2 overflow-visible shadow-2xl">
              <div className="px-6 py-2 flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-slate-100 uppercase tracking-[0.3em]">Amplification Plot (Real-Time)</h4>
                <div className="flex items-center gap-4 px-4 py-2 bg-red-500/5 border border-red-500/10 rounded-full">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_#ef4444]" />
                  <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest">Threshold Active</span>
                </div>
              </div>

              <div className="bg-[#010409] rounded-[2rem] px-10 md:px-20 py-12 relative border border-slate-900 flex-1 min-h-[560px] shadow-inner">
                <div className="h-full relative border-l-2 border-b-2 border-slate-800/60">
                  <div className="absolute -left-28 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-bold text-white tracking-[0.2em] whitespace-nowrap z-10 text-center">
                    פלואורסצנציה (RFU)
                  </div>

                  <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {[25, 50, 75].map((y) => (
                      <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#111827" strokeWidth="0.1" />
                    ))}
                    <line
                      x1="0"
                      y1={THRESHOLD_Y}
                      x2="100"
                      y2={THRESHOLD_Y}
                      stroke="#ef4444"
                      strokeWidth="0.25"
                      strokeDasharray="2,1"
                      opacity="0.8"
                    />
                    {samples.map((sample) => (
                      <path
                        key={sample.id}
                        d={getPath(sample, currentCycle)}
                        fill="none"
                        stroke={sample.color}
                        strokeWidth={selectedSample === sample.id ? 0.7 : 0.4}
                        className="transition-all duration-500 ease-out"
                        opacity={!selectedSample || selectedSample === sample.id ? 1 : 0.05}
                      />
                    ))}
                    <line
                      x1={(currentCycle / 40) * 100}
                      y1="0"
                      x2={(currentCycle / 40) * 100}
                      y2="100"
                      stroke="#3b82f6"
                      strokeWidth="0.2"
                      opacity="0.3"
                    />
                  </svg>

                  {samples.map(
                    (sample) =>
                      currentCycle >= sample.ct &&
                      sample.id !== "NTC" && (
                        <div
                          key={`label-${sample.id}`}
                          className="absolute flex flex-col items-center animate-in fade-in zoom-in duration-500"
                          style={{
                            left: `${(sample.ct / 40) * 100}%`,
                            top: `${THRESHOLD_Y}%`,
                            transform: "translate(-50%, -50%)",
                            opacity: !selectedSample || selectedSample === sample.id ? 1 : 0.2,
                            zIndex: 20,
                          }}
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full animate-pulse border border-white/20"
                            style={{ backgroundColor: sample.color, boxShadow: `0 0 10px ${sample.color}` }}
                          />
                          <div
                            className="w-[1px] h-14 bg-slate-600/50 mt-1 mb-1"
                            style={{ backgroundColor: sample.color, opacity: 0.4, transform: "translateY(-70px)" }}
                          />
                          <div
                            className="w-14 h-14 rounded-full border-2 flex items-center justify-center bg-[#010409] shadow-2xl absolute"
                            style={{
                              borderColor: sample.color,
                              transform: "translateY(-70px)",
                              aspectRatio: "1 / 1",
                            }}
                          >
                            <span className="text-white font-black text-base italic" style={{ textShadow: `0 0 8px ${sample.color}` }}>
                              {sample.ct}
                            </span>
                          </div>
                        </div>
                      )
                  )}
                </div>

                <div className="flex justify-between mt-8 px-2 text-[16px] font-bold text-white uppercase tracking-[0.6em]">
                  <span>0</span>
                  <span>10</span>
                  <span>20</span>
                  <span>30</span>
                  <span>40</span>
                </div>
                <div className="w-full text-center mt-8 text-base font-bold text-white tracking-[0.2em] uppercase">
                  מספר מחזורי PCR (Cycles)
                </div>
              </div>

              <div className="mt-10 mx-2 p-6 bg-blue-900/10 border border-blue-500/30 rounded-[2rem] animate-in fade-in shadow-lg">
                <div className="flex items-center gap-4 justify-start mb-4">
                  <Fingerprint className="text-blue-400" size={32} />
                  <h4 className="text-base font-black text-blue-400 uppercase tracking-widest">Methodology</h4>
                </div>
                <p className="text-lg md:text-xl font-bold text-white leading-relaxed">
                  ערך ה-Ct נקבע בנקודת החיתוך המדויקת עם ה-Threshold.
                  <br />
                  ככל שהריכוז גבוה יותר, ה-Ct נמוך יותר.
                </p>
              </div>

              <div className="px-4 md:px-10 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
                {[
                  { name: "Baseline", start: 0, end: 15, color: "blue" as const },
                  { name: "Log Phase", start: 15, end: 32, color: "green" as const },
                  { name: "Plateau", start: 32, end: 40, color: "amber" as const },
                ].map((phase, idx) => {
                  const isActive = currentCycle >= phase.start && (idx === 2 || currentCycle < phase.end);
                  const width =
                    currentCycle >= phase.end
                      ? "100%"
                      : currentCycle > phase.start
                        ? `${((currentCycle - phase.start) / (phase.end - phase.start)) * 100}%`
                        : "0%";
                  return (
                    <div key={phase.name} className={`text-center transition-all duration-700 ${isActive ? "opacity-100 scale-105" : "opacity-20"}`}>
                      <div className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-3">{phase.name}</div>
                      <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden shadow-inner border border-slate-800">
                        <div className={`h-full transition-all duration-500 ${progressColorClasses[phase.color]}`} style={{ width }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "quiz" && (
          <div className="w-full max-w-5xl mx-auto p-2 md:p-4 space-y-6 animate-in fade-in duration-700">
            <div className="flex items-center gap-4 border-r-4 border-blue-500 pr-6 mb-8">
              <div className="p-3 bg-blue-500/10 rounded-2xl">
                <HelpCircle className="text-blue-400" size={32} />
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-bold text-white">שאלות תרגול והבנה</h2>
                <p className="text-slate-400 text-sm mt-1 uppercase tracking-wider">qPCR Theory &amp; Normalization</p>
              </div>
            </div>

            <div className="space-y-4">
              {quizQuestions.map((item, index) => (
                <div
                  key={item.q}
                  className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden transition-all duration-300 hover:border-slate-700"
                >
                  <button
                    onClick={() => toggleQuestion(index)}
                    className="w-full p-6 flex items-center justify-between hover:bg-slate-800/50 transition-all text-right"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <span className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-base flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-xl font-bold text-slate-100 leading-tight">{item.q}</span>
                    </div>
                    <div className="mr-4">
                      {expandedQuestion === index ? (
                        <ChevronUp className="text-blue-400" size={24} />
                      ) : (
                        <ChevronDown className="text-slate-500" size={24} />
                      )}
                    </div>
                  </button>

                  {expandedQuestion === index && (
                    <div className="px-12 pb-8 animate-in slide-in-from-top-2 duration-300">
                      <div className="p-6 bg-blue-500/5 border-r-4 border-blue-500 rounded-2xl">
                        <h4 className="text-blue-400 text-xs font-black uppercase tracking-widest mb-3">הסבר מדעי:</h4>
                        <p className="text-lg text-slate-300 leading-relaxed">{item.a}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 bg-slate-900/50 rounded-[2rem] border border-dashed border-slate-800 text-center">
              <p className="text-slate-500 text-sm italic">לחצו על השאלות כדי לראות את התשובות וההסברים המורחבים.</p>
            </div>
          </div>
        )}

        {activeTab === "glossary" && (
          <div className="grid md:grid-cols-2 gap-6 animate-in fade-in duration-1000">
            {[
              { term: "Threshold", def: "רמת הזהירה הנבחרת מעל לרעש הרקע (Baseline); משמשת לקביעת ה-Ct." },
              { term: "Ct Value", def: "המחזור המדויק שבו האות חוצה את הסף. עומד ביחס הפוך לריכוז ההתחלתי." },
              { term: "NTC", def: "No Template Control - ביקורת שלילית לווידוא ניקיון המערכת מזיהומים זרים." },
              { term: "Log Phase", def: "השלב האקספוננציאלי בו מתרחשת ההגברה היעילה ביותר של ה-DNA." },
            ].map((item) => (
              <div key={item.term} className="bg-slate-900/30 p-8 rounded-[2rem] border border-slate-800 hover:border-blue-500/30 transition-all group shadow-xl">
                <span className="text-blue-400 font-bold text-xl block mb-4 tracking-tight italic group-hover:text-blue-300 transition-colors border-r-2 border-blue-500/20 pr-4">
                  {item.term}
                </span>
                <p className="text-lg text-slate-400 leading-relaxed font-light">{item.def}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
