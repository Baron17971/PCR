"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FlaskConical } from "lucide-react";

interface StrCaseLabPageProps {
  onComplete: () => void;
}

type Pair = [number, number];
type LaneType = "fixed" | "input";

interface MissionLane {
  label: string;
  type: LaneType;
  data: Pair[];
}

interface DataSourceRow {
  name: string;
  a: Pair;
  b: Pair;
  c: Pair;
  d: Pair;
}

interface Mission {
  id: number;
  title: string;
  explanation: string;
  question: string;
  options: string[];
  correctOption: string;
  dataSource: DataSourceRow[];
  targetLabel: string;
  targetValues: Pair[];
  lanes: MissionLane[];
  successMsg: string;
}

type ResultTone = "success" | "error" | "warn";

interface ResultState {
  tone: ResultTone;
  text: string;
}

interface RawBand {
  value: number;
  color: string;
  isHomo: boolean;
}

interface RenderBand {
  top: number;
  height: number;
  background: string;
}

const LOCI_LABELS = ["A", "B", "C", "D"] as const;
const LOCI_COLORS = ["#3b82f6", "#10b981", "#facc15", "#ef4444"] as const;
const LADDER_VALUES = [35, 30, 25, 20, 15, 10, 5] as const;
const GEL_RENDER_HEIGHT_PX = 820;
const GEL_TOP_OFFSET_REM = 5.5;

const MISSION_TEMPLATES: Mission[] = [
  {
    id: 0,
    title: "חידת אבהות: מי האבא?",
    explanation:
      "הזינו את הנתונים של האבות המועמדים מתוך טבלת המעבדה. לאחר ההזנה, השוו את הפסים של הילד לאם ולאבות. אלל של הילד שלא הגיע מהאם חייב להגיע מהאב הביולוגי.",
    question: "מיהו האב הביולוגי של הילד?",
    options: ["אב 1", "אב 2"],
    correctOption: "אב 1",
    dataSource: [
      { name: "אב 1", a: [14, 16], b: [30, 32], c: [12, 14], d: [11, 15] },
      { name: "אב 2", a: [15, 17], b: [21, 23], c: [10, 10], d: [9, 13] }
    ],
    targetLabel: "DNA הילד",
    targetValues: [
      [10, 14],
      [22, 30],
      [12, 12],
      [8, 11]
    ],
    lanes: [
      {
        label: "ילד",
        type: "fixed",
        data: [
          [10, 14],
          [22, 30],
          [12, 12],
          [8, 11]
        ]
      },
      {
        label: "אם",
        type: "fixed",
        data: [
          [10, 12],
          [22, 22],
          [12, 15],
          [8, 8]
        ]
      },
      {
        label: "אב 1",
        type: "input",
        data: [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0]
        ]
      },
      {
        label: "אב 2",
        type: "input",
        data: [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0]
        ]
      }
    ],
    successMsg: "נכון. אב 1 מספק לילד את האללים שלא הגיעו מהאם."
  },
  {
    id: 1,
    title: "שנהב הפילים: זיהוי מקור האוכלוסייה",
    explanation:
      "כדי לזהות את מקור השנהב, הזינו את הפרופילים של אוכלוסיות A, B ו־C מטבלת המעבדה. בדקו באיזה נתיב נמצאים כל הפסים של החט שנתפס.",
    question: "מאיזו אוכלוסייה הגיע השנהב?",
    options: ["Pop A", "Pop B", "Pop C"],
    correctOption: "Pop B",
    dataSource: [
      { name: "Pop A", a: [10, 16], b: [20, 24], c: [8, 10], d: [5, 6] },
      { name: "Pop B", a: [15, 19], b: [25, 29], c: [10, 12], d: [7, 9] },
      { name: "Pop C", a: [30, 34], b: [10, 14], c: [15, 16], d: [20, 22] }
    ],
    targetLabel: "החט שנתפס",
    targetValues: [
      [15, 19],
      [25, 25],
      [10, 12],
      [7, 8]
    ],
    lanes: [
      {
        label: "חט",
        type: "fixed",
        data: [
          [15, 19],
          [25, 25],
          [10, 12],
          [7, 8]
        ]
      },
      {
        label: "Pop A",
        type: "input",
        data: [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0]
        ]
      },
      {
        label: "Pop B",
        type: "input",
        data: [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0]
        ]
      },
      {
        label: "Pop C",
        type: "input",
        data: [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0]
        ]
      }
    ],
    successMsg: "מצוין. אוכלוסייה B היא המקור המתאים ביותר לפרופיל החט."
  },
  {
    id: 2,
    title: "זירת פשע: התאמה מלאה",
    explanation: "הזינו את נתוני החשודים מדוח המעבדה וחפשו התאמה מלאה בין הדגימה מהזירה לבין אחד החשודים.",
    question: "מי החשוד שמתאים לזירה?",
    options: ["חשוד 1", "חשוד 2", "חשוד 3"],
    correctOption: "חשוד 2",
    dataSource: [
      { name: "חשוד 1", a: [12, 14], b: [28, 28], c: [10, 14], d: [7, 8] },
      { name: "חשוד 2", a: [12, 12], b: [28, 31], c: [10, 14], d: [7, 9.3] },
      { name: "חשוד 3", a: [13, 15], b: [30, 31], c: [12, 12], d: [9.3, 9.3] }
    ],
    targetLabel: "דגימה מהזירה",
    targetValues: [
      [12, 12],
      [28, 31],
      [10, 14],
      [7, 9.3]
    ],
    lanes: [
      {
        label: "זירה",
        type: "fixed",
        data: [
          [12, 12],
          [28, 31],
          [10, 14],
          [7, 9.3]
        ]
      },
      {
        label: "חשוד 1",
        type: "input",
        data: [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0]
        ]
      },
      {
        label: "חשוד 2",
        type: "input",
        data: [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0]
        ]
      },
      {
        label: "חשוד 3",
        type: "input",
        data: [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0]
        ]
      }
    ],
    successMsg: "מצוין. חשוד 2 הוא בעל התאמה מלאה לדגימה מהזירה."
  }
];

function cloneMissions(missions: Mission[]): Mission[] {
  return missions.map((mission) => ({
    ...mission,
    dataSource: mission.dataSource.map((row) => ({
      ...row,
      a: [...row.a] as Pair,
      b: [...row.b] as Pair,
      c: [...row.c] as Pair,
      d: [...row.d] as Pair
    })),
    targetValues: mission.targetValues.map((pair) => [...pair] as Pair),
    lanes: mission.lanes.map((lane) => ({
      ...lane,
      data: lane.data.map((pair) => [...pair] as Pair)
    }))
  }));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function approxEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.0001;
}

function valueToPercent(value: number): number {
  const min = 5;
  const max = 35;
  const bounded = clamp(value, min, max);
  return ((max - bounded) / (max - min)) * 96 + 2;
}

function formatAllelePair(pair: Pair): string {
  return `${pair[0]}, ${pair[1]}`;
}

function buildLaneBands(data: Pair[]): RenderBand[] {
  const rawBands: RawBand[] = [];

  data.forEach((pair, locusIndex) => {
    const [a1, a2] = pair;
    const color = LOCI_COLORS[locusIndex];
    const homo = approxEqual(a1, a2);

    if (a1 > 0) rawBands.push({ value: a1, color, isHomo: homo });
    if (a2 > 0 && !homo) rawBands.push({ value: a2, color, isHomo: false });
  });

  const grouped = new Map<string, RawBand[]>();
  rawBands.forEach((band) => {
    const key = valueToPercent(band.value).toFixed(2);
    const current = grouped.get(key) ?? [];
    current.push(band);
    grouped.set(key, current);
  });

  const renderBands: RenderBand[] = [];
  grouped.forEach((list, key) => {
    const hasHomozygousBand = list.some((band) => band.isHomo);
    let height = hasHomozygousBand ? 7 : 4;
    if (list.length > 1) {
      height += (list.length - 1) * 4;
    }

    const background =
      list.length === 1 ? list[0].color : `linear-gradient(to right, ${list.map((band) => band.color).join(",")})`;
    renderBands.push({
      top: Number.parseFloat(key),
      height,
      background
    });
  });

  return renderBands;
}

export default function StrCaseLabPage({ onComplete }: StrCaseLabPageProps) {
  const [missions, setMissions] = useState<Mission[]>(() => cloneMissions(MISSION_TEMPLATES));
  const [currentMissionIdx, setCurrentMissionIdx] = useState<number>(1);
  const [selectedUserAnswer, setSelectedUserAnswer] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [comparisonLineY, setComparisonLineY] = useState<number | null>(null);

  const currentMission = missions[currentMissionIdx];

  const lanesWithBands = useMemo(
    () =>
      currentMission.lanes.map((lane) => ({
        ...lane,
        bands: buildLaneBands(lane.data)
      })),
    [currentMission]
  );

  const selectMission = (idx: number) => {
    setCurrentMissionIdx(idx);
    setSelectedUserAnswer(null);
    setResult(null);
  };

  const updateData = (laneIndex: number, locusIndex: number, valueIndex: 0 | 1, rawValue: string) => {
    const parsed = Number.parseFloat(rawValue);
    const safeValue = Number.isFinite(parsed) ? clamp(parsed, 0, 35) : 0;

    setMissions((prev) =>
      prev.map((mission, missionIndex) => {
        if (missionIndex !== currentMissionIdx) return mission;

        return {
          ...mission,
          lanes: mission.lanes.map((lane, laneIdx) => {
            if (laneIdx !== laneIndex || lane.type !== "input") return lane;

            return {
              ...lane,
              data: lane.data.map((pair, pairIdx) => {
                if (pairIdx !== locusIndex) return pair;
                const nextPair: Pair = valueIndex === 0 ? [safeValue, pair[1]] : [pair[0], safeValue];
                return nextPair;
              })
            };
          })
        };
      })
    );

    setResult(null);
  };

  const checkResult = () => {
    if (!selectedUserAnswer) {
      setResult({
        tone: "warn",
        text: "בחרו תשובה לפני הבדיקה."
      });
      return;
    }

    if (selectedUserAnswer === currentMission.correctOption) {
      setResult({
        tone: "success",
        text: currentMission.successMsg
      });
      return;
    }

    setResult({
      tone: "error",
      text: "עדיין לא. בדקו אם כל הערכים הוזנו נכון מהטבלה ונסו שוב."
    });
  };

  const handleGelMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const zoomScaleY = rect.height / event.currentTarget.offsetHeight || 1;
    const y = clamp((event.clientY - rect.top) / zoomScaleY, 0, event.currentTarget.offsetHeight);
    setComparisonLineY(y);
  };

  const handleGelMouseLeave = () => {
    setComparisonLineY(null);
  };

  return (
    <section dir="rtl" className="glass-pcr-card rounded-[2.5rem] border border-slate-700/30 p-6 md:p-8 space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-black text-white">מעבדת בלש גנטי: החידות</h1>
        <p className="text-lg font-semibold text-slate-300">בנו את הפרופילים הגנטיים בעצמכם וגלו את הפתרון</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {missions.map((mission, idx) => (
          <button
            key={mission.id}
            type="button"
            onClick={() => selectMission(idx)}
            className={`mission-card text-right rounded-2xl border-2 p-4 transition-all ${
              idx === currentMissionIdx
                ? "active border-cyan-400 bg-cyan-500/10 shadow-[0_0_22px_rgba(34,211,238,0.12)]"
                : "border-slate-700/70 bg-slate-900/70 hover:border-blue-400/60 hover:bg-blue-500/5"
            }`}
          >
            <div className="mb-1 text-xl">
              {idx === 0 ? "👨‍👩‍👦" : idx === 1 ? "🐘" : "🔍"}
            </div>
            <div className="font-black text-slate-100">{mission.title}</div>
            <div className="text-xs text-slate-400">
              {idx === 0 ? "מי האב הביולוגי?" : idx === 1 ? "מקור השנהב המוברח" : "זיהוי חשוד מהזירה"}
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-6 space-y-4">
            <h3 className="text-xl font-black text-white border-b border-slate-700 pb-2">{currentMission.title}</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{currentMission.explanation}</p>

            <div className="rounded-xl border border-slate-700/70 bg-slate-950/70 p-3">
              <p className="mb-2 text-xs font-bold text-slate-400">טבלת נתונים מהמעבדה (הזינו את הערכים למטה):</p>
              <div className="overflow-x-auto">
                <table className="data-table min-w-full text-xs">
                  <thead>
                    <tr>
                      <th>שם</th>
                      <th>A</th>
                      <th>B</th>
                      <th>C</th>
                      <th>D</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentMission.dataSource.map((row) => (
                      <tr key={row.name}>
                        <td className="font-bold">{row.name}</td>
                        <td>{formatAllelePair(row.a)}</td>
                        <td>{formatAllelePair(row.b)}</td>
                        <td>{formatAllelePair(row.c)}</td>
                        <td>{formatAllelePair(row.d)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border-r-4 border-blue-400 bg-blue-500/10 p-4">
              <div className="mb-3 font-bold text-blue-200">{currentMission.question}</div>
              <div className="flex flex-wrap gap-3">
                {currentMission.options.map((option) => {
                  const isSelected = selectedUserAnswer === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSelectedUserAnswer(option)}
                      className={`rounded-full border-2 px-4 py-2 font-bold transition-all ${
                        isSelected
                          ? "border-blue-400 bg-blue-600 text-white"
                          : "border-blue-300/70 bg-slate-900/80 text-blue-200 hover:bg-blue-600/20"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-slate-700/70 bg-slate-900/60 p-4">
            <h3 className="mb-3 font-black text-cyan-200">🎯 {currentMission.targetLabel}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-sm">
              {currentMission.targetValues.map((pair, locusIdx) => (
                <div key={`target-${locusIdx}`} className="rounded-lg border border-slate-700 bg-slate-950/80 p-2 shadow-sm">
                  <span className="block font-black" style={{ color: LOCI_COLORS[locusIdx] }}>
                    לוקוס {LOCI_LABELS[locusIdx]}
                  </span>
                  <span className="text-slate-200">{formatAllelePair(pair)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {currentMission.lanes.map((lane, laneIdx) => {
              if (lane.type !== "input") return null;

              return (
                <div key={`input-${lane.label}`} className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
                  <h4 className="mb-2 font-bold text-slate-100 underline decoration-blue-400">הזנת נתונים: {lane.label}</h4>
                  {lane.data.map((pair, locusIdx) => (
                    <div
                      key={`${lane.label}-locus-${locusIdx}`}
                      className="grid grid-cols-3 items-center gap-4 py-1 border-b border-slate-800 last:border-0"
                    >
                      <div className="text-sm font-bold text-slate-300">לוקוס {LOCI_LABELS[locusIdx]}</div>
                      <input
                        type="number"
                        step={0.1}
                        placeholder="0"
                        value={pair[0] === 0 ? "" : String(pair[0])}
                        onChange={(event) => updateData(laneIdx, locusIdx, 0, event.target.value)}
                        className="input-focus rounded-lg border border-blue-900/70 bg-slate-950/90 p-1 text-center text-sm font-bold text-slate-100"
                      />
                      <input
                        type="number"
                        step={0.1}
                        placeholder="0"
                        value={pair[1] === 0 ? "" : String(pair[1])}
                        onChange={(event) => updateData(laneIdx, locusIdx, 1, event.target.value)}
                        className="input-focus rounded-lg border border-blue-900/70 bg-slate-950/90 p-1 text-center text-sm font-bold text-slate-100"
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={checkResult}
              className="flex-1 rounded-xl bg-blue-600 py-4 text-lg font-black text-white shadow-lg transition-all hover:bg-blue-500"
            >
              בדוק תשובה
            </button>
            <button
              type="button"
              onClick={onComplete}
              className="rounded-xl bg-emerald-600 px-6 py-4 text-lg font-black text-white transition-all hover:bg-emerald-500 flex items-center justify-center gap-2"
            >
              <FlaskConical className="w-5 h-5" />
              המשך לשלב הבא
            </button>
          </div>

          {result && (
            <div
              className={`rounded-xl border p-4 text-center text-lg font-bold ${
                result.tone === "success"
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                  : result.tone === "warn"
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
                    : "border-red-500/40 bg-red-500/15 text-red-200"
              }`}
            >
              <div className="mb-1 flex items-center justify-center gap-2">
                {result.tone === "success" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
                {result.tone === "success" ? "תשובה נכונה" : "נדרש תיקון"}
              </div>
              <p>{result.text}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/75 p-6 shadow-xl">
            <h3 className="mb-2 text-center font-bold text-slate-100">תוצאות הרצה בג׳ל</h3>

            <div className="flex gap-2" style={{ height: GEL_RENDER_HEIGHT_PX }}>
              <div className="mt-[5.5rem] w-12 relative flex flex-col justify-between py-2 pr-2 text-base font-bold font-mono text-slate-400">
                <div className="absolute inset-0 flex flex-col justify-between py-2 items-end pr-2">
                  {LADDER_VALUES.map((value) => (
                    <span key={`ladder-${value}`}>{value}</span>
                  ))}
                </div>
              </div>

              <div
                id="gel-tank"
                className="gel-background flex-1 rounded-lg relative overflow-visible flex justify-around items-stretch p-2"
                style={{ marginTop: `${GEL_TOP_OFFSET_REM}rem` }}
                onMouseMove={handleGelMouseMove}
                onMouseLeave={handleGelMouseLeave}
              >
                <div
                  id="comparison-line"
                  style={{
                    top: `${comparisonLineY ?? 0}px`,
                    display: comparisonLineY === null ? "none" : "block",
                    transform: "translateY(-50%)"
                  }}
                />
                {lanesWithBands.map((lane, laneIdx) => (
                  <div
                    key={`gel-lane-${lane.label}`}
                    className={`relative mx-1 w-full ${laneIdx < lanesWithBands.length - 1 ? "border-r border-slate-700/45" : ""}`}
                  >
                    <div className="pointer-events-none absolute -top-16 w-full rounded-lg border border-slate-600 bg-slate-900/90 py-1 text-center text-base font-black text-slate-100 shadow-md select-none">
                      {lane.label}
                    </div>

                    {lane.bands.map((band, bandIdx) => (
                      <div
                        key={`band-${lane.label}-${bandIdx}`}
                        className="dna-band absolute left-[6%] right-[6%] rounded-sm"
                        style={{
                          top: `${band.top}%`,
                          height: `${band.height}px`,
                          background: band.background,
                          transform: "translateY(-50%)"
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-14 grid grid-cols-2 gap-2 text-center text-sm font-bold text-slate-200 md:grid-cols-4">
              <div className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: LOCI_COLORS[0] }} />
                לוקוס A
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: LOCI_COLORS[1] }} />
                לוקוס B
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: LOCI_COLORS[2] }} />
                לוקוס C
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: LOCI_COLORS[3] }} />
                לוקוס D
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .gel-background {
          background: linear-gradient(180deg, #0b1226 0%, #020617 100%);
          border: 3px solid #334155;
          box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.45);
          cursor: crosshair;
        }
        #comparison-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          background: rgba(255, 255, 255, 0.4);
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
          pointer-events: none;
          z-index: 50;
          display: none;
        }
        .dna-band {
          transition: all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-sizing: border-box;
          opacity: 1;
          border-top: 1px solid rgba(255, 255, 255, 0.18);
          border-bottom: 1px solid rgba(2, 6, 23, 0.35);
        }
        .input-focus:focus {
          outline: none;
          border-color: #60a5fa;
          box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.25);
        }
        .mission-card {
          cursor: pointer;
        }
        .data-table th,
        .data-table td {
          border: 1px solid rgba(71, 85, 105, 0.8);
          padding: 6px 8px;
          text-align: center;
          color: #e2e8f0;
        }
        .data-table th {
          background: rgba(30, 41, 59, 0.9);
        }
        .data-table td {
          background: rgba(15, 23, 42, 0.75);
        }
      `}</style>
    </section>
  );
}
