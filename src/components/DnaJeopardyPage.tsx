"use client";

import React, { useMemo, useState } from "react";
import { RefreshCcw, Trophy, Users } from "lucide-react";

interface DnaJeopardyPageProps {
  onComplete: () => void;
}

interface JeopardyCell {
  value: number;
  question: string;
  answer: string;
}

interface JeopardyCategory {
  title: string;
  cells: JeopardyCell[];
}

interface Team {
  id: string;
  name: string;
  score: number;
}

interface ActiveCell {
  categoryIndex: number;
  cellIndex: number;
}

const MIN_TEAMS = 2;
const MAX_TEAMS = 5;

const TEAM_COLORS = [
  { accent: "#22d3ee", cardBg: "rgba(34, 211, 238, 0.08)", border: "rgba(34, 211, 238, 0.5)" },
  { accent: "#4ade80", cardBg: "rgba(74, 222, 128, 0.08)", border: "rgba(74, 222, 128, 0.5)" },
  { accent: "#a78bfa", cardBg: "rgba(167, 139, 250, 0.08)", border: "rgba(167, 139, 250, 0.5)" },
  { accent: "#fbbf24", cardBg: "rgba(251, 191, 36, 0.08)", border: "rgba(251, 191, 36, 0.5)" },
  { accent: "#fb7185", cardBg: "rgba(251, 113, 133, 0.08)", border: "rgba(251, 113, 133, 0.5)" }
] as const;

const JEOPARDY_CATEGORIES: JeopardyCategory[] = [
  {
    title: "יסודות PCR",
    cells: [
      {
        value: 200,
        question: "מה פירוש ראשי התיבות PCR?",
        answer: "Polymerase Chain Reaction - תגובת שרשרת של פולימראז."
      },
      {
        value: 400,
        question: "איזה אנזים מבצע את השכפול במבחנה?",
        answer: "Taq Polymerase."
      },
      {
        value: 600,
        question: "מה תפקיד הפריימרים בתהליך?",
        answer: "להגדיר את גבולות המקטע ולתת נקודת התחלה לשכפול."
      },
      {
        value: 800,
        question: "מה קורה בשלב הדנטורציה?",
        answer: "ה-DNA הדו-גדילי נפתח לשני גדילים בודדים בטמפרטורה גבוהה."
      },
      {
        value: 1000,
        question: "למה חייבים dNTPs?",
        answer: "אלה אבני הבניין ליצירת גדיל DNA חדש."
      }
    ]
  },
  {
    title: "רכיבים והכנה",
    cells: [
      {
        value: 200,
        question: "איזה רכיב שומר על תנאי pH מתאימים בתגובה?",
        answer: "Buffer."
      },
      {
        value: 400,
        question: "איזה רכיב אינו נדרש ב-PCR רגיל: הליקאז או פריימרים?",
        answer: "הליקאז אינו נדרש; הפריימרים כן."
      },
      {
        value: 600,
        question: "למה דווקא Taq מתאים ל-PCR?",
        answer: "כי הוא עמיד לחום הגבוה של המחזורים."
      },
      {
        value: 800,
        question: "מה יקרה אם לא נוסיף פריימרים?",
        answer: "לא תתרחש הגברה ספציפית של המקטע."
      },
      {
        value: 1000,
        question: "מהי חשיבות הוספת יוני מגנזיום לתערובת ה - PCR?",
        answer: "יוני מגנזיום משמשים קו פקטור לאנזים Taq פולימראז."
      }
    ]
  },
  {
    title: "RT-PCR וביטוי",
    cells: [
      {
        value: 200,
        question: "למה צריך שלב RT לפני qPCR על mRNA?",
        answer: "כדי להפוך RNA ל-cDNA שהפולימראז יכול לשכפל."
      },
      {
        value: 400,
        question: "מה ההבדל המרכזי בין PCR רגיל ל-RT-PCR?",
        answer: "RT-PCR מתחיל מ-RNA וכולל המרה ל-cDNA לפני ההגברה."
      },
      {
        value: 600,
        question: "מהו גן מנרמל (Housekeeping Gene)?",
        answer: "גן שביטויו יציב ומשמש לבקרה פנימית בניתוח תוצאות."
      },
      {
        value: 800,
        question: "מה מייצג Delta Ct?",
        answer: "הפרש בין Ct של גן המטרה ל-Ct של הגן המנרמל."
      },
      {
        value: 1000,
        question: "איזו בדיקה טובה יותר לזיהוי ביטוי גנים: PCR רגיל או RT-PCR?",
        answer: "RT-PCR, כי היא בודקת RNA ולכן משקפת ביטוי בפועל."
      }
    ]
  },
  {
    title: "qPCR",
    cells: [
      {
        value: 200,
        question: "מהו Ct?",
        answer: "מספר המחזור שבו האות חוצה את ה-threshold."
      },
      {
        value: 400,
        question: "איך ריכוז התחלתי גבוה משפיע על Ct?",
        answer: "Ct נמוך יותר (חציית סף מוקדמת יותר)."
      },
      {
        value: 600,
        question: "מהו Threshold בגרף qPCR?",
        answer: "זוהי רמת עוצמת האור (פלואורסצנציה) שנקבעת על ידי המערכת כגבול העליון של רעשי הרקע."
      },
      {
        value: 800,
        question: "מה ההבדל העיקרי בין SYBR Green ל-TaqMan?",
        answer: "SYBR לא ספציפי לכל dsDNA, TaqMan ספציפי לרצף מטרה."
      },
      {
        value: 1000,
        question: "מה לא מכילה תערובת ה - NTC המשמשת כביקורת שלילית?",
        answer: "את כל רכיבי הריאקציה (Master Mix, פריימרים, מים) ללא דגימת ה-DNA או ה-cDNA (במקומה מוסיפים מים סטריליים)."
      }
    ]
  },
  {
    title: "STR ופורנזיקה",
    cells: [
      {
        value: 200,
        question: "מהו STR?",
        answer: "רצף קצר חוזר שמספר החזרות בו משתנה בין אנשים."
      },
      {
        value: 400,
        question: "מה פירוש הטרוזיגוט בלוקוס STR?",
        answer: "שני אללים שונים באותו לוקוס."
      },
      {
        value: 600,
        question: "מהו חוק המכפלה בזיהוי סטטיסטי?",
        answer: "מכפילים הסתברויות בין לוקוסים בלתי תלויים."
      },
      {
        value: 800,
        question: "בחידת אבהות, מה כלל המפתח?",
        answer: "אלל בילד שלא הגיע מהאם חייב להגיע מהאב הביולוגי."
      },
      {
        value: 1000,
        question: "למה הוספת לוקוסים מורידה סיכוי להתאמה אקראית?",
        answer: "כי מכפילים עוד הסתברויות קטנות ולכן הסיכוי קטן מאוד."
      }
    ]
  },
  {
    title: "יישומים ונגזרות",
    cells: [
      {
        value: 200,
        question: "תנו דוגמה ליישום רפואי של PCR.",
        answer: "אבחון פתוגנים או זיהוי מוטציות תורשתיות."
      },
      {
        value: 400,
        question: "תנו דוגמה ליישום פורנזי של PCR.",
        answer: "השוואת פרופילי STR מזירה לחשודים."
      },
      {
        value: 600,
        question: "באבחון מוטציה מותנית, מה משמעות הגברה עם אלל מוטנטי?",
        answer: "יש נשאות למוטציה לפחות באחד האללים."
      },
      {
        value: 800,
        question: "מתי נעדיף qPCR על PCR רגיל?",
        answer: "כשצריך מדידה כמותית בזמן אמת ולא רק נוכחות/היעדר."
      },
      {
        value: 1000,
        question: "מדוע שימוש ב - PCR חשוב מאוד במחקר?",
        answer: "כי הוא מאפשר גם זיהוי וגם כימות והשוואה מדויקת בין דגימות."
      }
    ]
  }
];

function createTeams(count: number): Team[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `team-${index + 1}`,
    name: `קבוצה ${index + 1}`,
    score: 0
  }));
}

function cellKey(categoryIndex: number, cellIndex: number): string {
  return `${categoryIndex}-${cellIndex}`;
}

function clampTeamCount(value: number): number {
  return Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, value));
}

function formatPoints(value: number): string {
  return `${value}`;
}

function PointsMark({
  value,
  className
}: {
  value: string | number;
  className?: string;
}) {
  return (
    <span dir="ltr" className={`inline-flex items-center ${className ?? ""}`}>
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

export default function DnaJeopardyPage({ onComplete }: DnaJeopardyPageProps) {
  const [teamCount, setTeamCount] = useState<number>(MIN_TEAMS);
  const [teams, setTeams] = useState<Team[]>(() => createTeams(MIN_TEAMS));
  const [usedCells, setUsedCells] = useState<Record<string, boolean>>({});
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [didScoreCurrentQuestion, setDidScoreCurrentQuestion] = useState<boolean>(false);

  const activeQuestion = activeCell ? JEOPARDY_CATEGORIES[activeCell.categoryIndex].cells[activeCell.cellIndex] : null;
  const usedCount = Object.keys(usedCells).length;
  const totalQuestions = JEOPARDY_CATEGORIES.length * JEOPARDY_CATEGORIES[0].cells.length;
  const leaders = useMemo(() => [...teams].sort((a, b) => b.score - a.score), [teams]);
  const currentTurnTeam = teams[currentTurnIndex] ?? teams[0];
  const currentTurnColor = TEAM_COLORS[currentTurnIndex % TEAM_COLORS.length];

  const updateTeamCount = (nextCount: number) => {
    const clamped = clampTeamCount(nextCount);
    setTeamCount(clamped);
    setCurrentTurnIndex((prev) => (clamped > 0 ? prev % clamped : 0));
    setTeams((prev) =>
      Array.from({ length: clamped }, (_, index) => {
        const existing = prev[index];
        return (
          existing ?? {
            id: `team-${index + 1}`,
            name: `קבוצה ${index + 1}`,
            score: 0
          }
        );
      })
    );
  };

  const updateTeamName = (teamId: string, name: string) => {
    setTeams((prev) => prev.map((team) => (team.id === teamId ? { ...team, name } : team)));
  };

  const advanceTurn = () => {
    setCurrentTurnIndex((prev) => (teamCount > 0 ? (prev + 1) % teamCount : 0));
  };

  const applyScoreForCurrentTeam = (delta: number) => {
    if (didScoreCurrentQuestion) return;
    setTeams((prev) =>
      prev.map((team, index) => (index === currentTurnIndex ? { ...team, score: team.score + delta } : team))
    );
    setDidScoreCurrentQuestion(true);
  };

  const openCell = (categoryIndex: number, cellIndex: number) => {
    const key = cellKey(categoryIndex, cellIndex);
    if (usedCells[key]) return;
    setActiveCell({ categoryIndex, cellIndex });
    setShowAnswer(false);
    setDidScoreCurrentQuestion(false);
  };

  const closeQuestionModal = (markAsUsed: boolean) => {
    if (!activeCell) return;
    advanceTurn();
    if (markAsUsed) {
      const key = cellKey(activeCell.categoryIndex, activeCell.cellIndex);
      setUsedCells((prev) => ({ ...prev, [key]: true }));
    }
    setActiveCell(null);
    setShowAnswer(false);
    setDidScoreCurrentQuestion(false);
  };

  const finishCurrentQuestion = () => {
    closeQuestionModal(true);
  };

  const resetGame = () => {
    setTeams((prev) =>
      prev.map((team, index) => ({
        ...team,
        name: team.name.trim() ? team.name : `קבוצה ${index + 1}`,
        score: 0
      }))
    );
    setCurrentTurnIndex(0);
    setUsedCells({});
    setActiveCell(null);
    setShowAnswer(false);
    setDidScoreCurrentQuestion(false);
  };

  return (
    <section dir="rtl" className="glass-pcr-card rounded-[2.5rem] border border-slate-700/30 p-6 md:p-8 space-y-6">
      <header className="text-right space-y-2">
        <h2 className="text-3xl md:text-4xl font-black text-white flex items-center justify-start gap-3">
          ג&apos;פרדי DNA - אתגר מסכם
        </h2>
        <p className="text-slate-300 text-lg leading-relaxed">
          משחק תחרותי לקבוצות: בחרו קטגוריה ושווי שאלה, חשפו תשובה וחלקו ניקוד. מתאים ל-2 עד 5 קבוצות.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-950/45 p-4 md:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-cyan-300" />
            <span className="font-bold text-slate-200">מספר קבוצות</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateTeamCount(teamCount - 1)}
                disabled={teamCount <= MIN_TEAMS}
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 font-bold text-slate-100 disabled:opacity-40"
              >
                -
              </button>
              <span className="w-8 text-center font-black text-cyan-200">{teamCount}</span>
              <button
                type="button"
                onClick={() => updateTeamCount(teamCount + 1)}
                disabled={teamCount >= MAX_TEAMS}
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 font-bold text-slate-100 disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={resetGame}
              className="rounded-xl border border-slate-600 bg-slate-900/80 hover:bg-slate-800 px-4 py-2 text-slate-100 font-bold flex items-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              איפוס משחק
            </button>
            <button
              type="button"
              onClick={onComplete}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-white font-bold"
            >
              סיום וחזרה לפתיחה
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div
            className="grid gap-2 min-w-[760px]"
            style={{ gridTemplateColumns: `repeat(${teams.length}, minmax(0, 1fr))` }}
          >
            {teams.map((team, teamIndex) => {
              const teamColor = TEAM_COLORS[teamIndex % TEAM_COLORS.length];
              const isCurrentTurn = teamIndex === currentTurnIndex;
              return (
                <div
                  key={team.id}
                  className={`rounded-lg border p-2 space-y-2 transition-all duration-300 ${
                    isCurrentTurn ? "animate-pulse" : ""
                  }`}
                  style={{
                    borderColor: isCurrentTurn ? teamColor.accent : teamColor.border,
                    background: teamColor.cardBg,
                    boxShadow: isCurrentTurn ? `0 0 0 1px ${teamColor.accent}, 0 0 18px rgba(15, 23, 42, 0.65)` : undefined
                  }}
                >
                  <div className="h-1.5 rounded-full" style={{ backgroundColor: teamColor.accent }} />
                  <input
                    value={team.name}
                    onChange={(event) => updateTeamName(team.id, event.target.value)}
                    className="w-full rounded-md border bg-slate-950/90 px-2 py-1 text-slate-100 font-bold text-center text-base"
                    style={{ borderColor: teamColor.border }}
                  />
                  <div
                    className="text-center text-xl md:text-2xl font-black tabular-nums"
                    style={{ color: teamColor.accent }}
                  >
                    {team.score}
                  </div>
                  {isCurrentTurn && (
                    <div className="text-center text-[11px] md:text-xs font-black tracking-wide" style={{ color: teamColor.accent }}>
                      תור נוכחי
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-500/25 bg-blue-950/25 p-3 md:p-4">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${JEOPARDY_CATEGORIES.length}, minmax(0, 1fr))` }}
        >
          {JEOPARDY_CATEGORIES.map((category) => (
            <div
              key={`category-${category.title}`}
              className="min-h-[88px] rounded-xl border border-cyan-400/30 bg-gradient-to-b from-blue-700 to-blue-900 px-3 py-3 flex items-center justify-center text-center"
            >
              <span className="text-base md:text-lg font-extrabold text-white leading-snug">{category.title}</span>
            </div>
          ))}

          {JEOPARDY_CATEGORIES[0].cells.map((_, rowIndex) =>
            JEOPARDY_CATEGORIES.map((category, categoryIndex) => {
              const cell = category.cells[rowIndex];
              const key = cellKey(categoryIndex, rowIndex);
              const isUsed = !!usedCells[key];

              return (
                <button
                  key={`cell-${key}`}
                  type="button"
                  onClick={() => openCell(categoryIndex, rowIndex)}
                  disabled={isUsed}
                  className={`min-h-[84px] rounded-xl border transition-all flex items-center justify-center ${
                    isUsed
                      ? "border-slate-800 bg-slate-950/60 text-slate-600 cursor-not-allowed"
                      : "border-blue-500/40 bg-blue-900/80 hover:bg-blue-800 text-amber-300 shadow-[inset_0_0_18px_rgba(0,0,0,0.35)]"
                  }`}
                >
                  <PointsMark
                    value={formatPoints(cell.value)}
                    className="text-lg md:text-xl font-extrabold tracking-tight drop-shadow-[2px_2px_0_rgba(0,0,0,0.45)]"
                  />
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 md:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-slate-300 font-bold">התקדמות לוח</p>
            <p className="text-slate-500 text-sm">
              נענו {usedCount} מתוך {totalQuestions} שאלות
            </p>
          </div>
          <div className="flex items-center gap-2 text-amber-300">
            <Trophy className="w-5 h-5" />
            <span className="font-bold">
              מובילה: {leaders[0]?.name ?? "—"} ({leaders[0]?.score ?? 0})
            </span>
          </div>
        </div>
      </div>

      {activeQuestion && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center">
          <div className="w-full max-w-3xl rounded-[2rem] border border-cyan-400/30 bg-slate-950/95 p-5 md:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <PointsMark
                value={formatPoints(activeQuestion.value)}
                className="text-lg md:text-xl font-extrabold text-amber-300"
              />
              <button
                type="button"
                onClick={() => closeQuestionModal(false)}
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-slate-200 font-bold"
              >
                סגירה
              </button>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 md:p-5">
              <p className="text-lg md:text-xl text-white font-bold leading-relaxed text-right">{activeQuestion.question}</p>
            </div>

            {!showAnswer ? (
              <button
                type="button"
                onClick={() => setShowAnswer(true)}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black py-3"
              >
                חשיפת תשובה
              </button>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
                  <p className="text-emerald-200 font-bold text-sm mb-1">תשובה:</p>
                  <p className="text-white text-base md:text-lg font-bold leading-relaxed">{activeQuestion.answer}</p>
                </div>

                {currentTurnTeam && (
                  <div
                    className="rounded-xl border p-3 md:p-4"
                    style={{ borderColor: currentTurnColor.border, background: currentTurnColor.cardBg }}
                  >
                    <div className="h-1.5 rounded-full mb-2" style={{ backgroundColor: currentTurnColor.accent }} />
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-black text-lg md:text-xl text-slate-100">{currentTurnTeam.name}</span>
                      <span className="font-black tabular-nums text-xl md:text-2xl" style={{ color: currentTurnColor.accent }}>
                        {currentTurnTeam.score}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => applyScoreForCurrentTeam(activeQuestion.value)}
                        disabled={didScoreCurrentQuestion}
                        className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-2.5"
                      >
                        <span className="block text-sm md:text-base">תשובה נכונה</span>
                        <span className="block text-xs text-emerald-100/90 mt-0.5">+{formatPoints(activeQuestion.value)} נקודות</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyScoreForCurrentTeam(-activeQuestion.value)}
                        disabled={didScoreCurrentQuestion}
                        className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-2.5"
                      >
                        <span className="block text-sm md:text-base">תשובה שגויה</span>
                        <span className="block text-xs text-red-100/90 mt-0.5">-{formatPoints(activeQuestion.value)} נקודות</span>
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={finishCurrentQuestion}
                  className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black py-3"
                >
                  סיום שאלה וסימון כמשומשת
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

