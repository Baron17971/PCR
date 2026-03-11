"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FlaskConical, RefreshCcw, Search } from "lucide-react";

interface StrCaseLabPageProps {
  onComplete: () => void;
}

type LocusId = "A" | "B" | "C" | "D";
type SuspectId = "suspect1" | "suspect2" | "suspect3";
type AllelePair = [number, number];
type Profile = Record<LocusId, AllelePair>;

interface LocusMeta {
  id: LocusId;
  label: string;
  color: string;
}

interface SuspectMeta {
  id: SuspectId;
  label: string;
}

const LOCI: LocusMeta[] = [
  { id: "A", label: "לוקוס A (כחול)", color: "#60a5fa" },
  { id: "B", label: "לוקוס B (ירוק)", color: "#34d399" },
  { id: "C", label: "לוקוס C (צהוב)", color: "#facc15" },
  { id: "D", label: "לוקוס D (אדום)", color: "#f87171" }
];

const SUSPECTS: SuspectMeta[] = [
  { id: "suspect1", label: "חשוד 1" },
  { id: "suspect2", label: "חשוד 2" },
  { id: "suspect3", label: "חשוד 3" }
];

const CRIME_SCENE_PROFILE: Profile = {
  A: [12, 12],
  B: [28, 31],
  C: [10, 14],
  D: [7, 9.3]
};

const INITIAL_SUSPECT_PROFILES: Record<SuspectId, Profile> = {
  suspect1: {
    A: [12, 14],
    B: [28, 28],
    C: [10, 14],
    D: [7, 8]
  },
  suspect2: {
    A: [12, 12],
    B: [28, 31],
    C: [10, 14],
    D: [7, 9.3]
  },
  suspect3: {
    A: [13, 15],
    B: [30, 31],
    C: [12, 12],
    D: [9.3, 9.3]
  }
};

const ALLELE_MIN = 5;
const ALLELE_MAX = 35;
const EPSILON = 0.0001;
const LADDER_VALUES = [35, 30, 25, 20, 15, 10, 5];
const GEL_HEIGHT = 460;
const ZONE_GAP = 12;
const ZONE_PADDING = 10;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function approxEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON;
}

function isHomozygous(pair: AllelePair): boolean {
  return approxEqual(pair[0], pair[1]);
}

function sortPair(pair: AllelePair): AllelePair {
  return pair[0] <= pair[1] ? pair : [pair[1], pair[0]];
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function formatPair(pair: AllelePair): string {
  const stateLabel = isHomozygous(pair) ? "הומוזיגוט" : "הטרוזיגוט";
  return `${formatNumber(pair[0])}, ${formatNumber(pair[1])} (${stateLabel})`;
}

function pairsEqual(a: AllelePair, b: AllelePair): boolean {
  const [a1, a2] = sortPair(a);
  const [b1, b2] = sortPair(b);
  return approxEqual(a1, b1) && approxEqual(a2, b2);
}

function profileMatches(profileA: Profile, profileB: Profile): boolean {
  return LOCI.every((locus) => pairsEqual(profileA[locus.id], profileB[locus.id]));
}

interface FixedTableProps {
  title: string;
  profile: Profile;
}

function FixedTable({ title, profile }: FixedTableProps) {
  return (
    <article className="rounded-2xl border border-slate-700/60 bg-slate-900/65 p-4 space-y-3">
      <h3 className="text-center text-lg font-black text-cyan-200">{title}</h3>

      <div className="overflow-hidden rounded-xl border border-slate-700/70">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-800/95 text-slate-200">
            <tr>
              <th className="px-3 py-2 border-b border-slate-700">לוקוס</th>
              <th className="px-3 py-2 border-b border-slate-700">אללים</th>
            </tr>
          </thead>
          <tbody>
            {LOCI.map((locus, index) => (
              <tr key={`fixed-${locus.id}`} className={index % 2 === 0 ? "bg-slate-900/70" : "bg-slate-950/70"}>
                <td className="px-3 py-2 border-t border-slate-800 text-slate-100 font-bold">{locus.label}</td>
                <td className="px-3 py-2 border-t border-slate-800 text-slate-300">{formatPair(profile[locus.id])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

interface EditableTableProps {
  title: string;
  suspectId: SuspectId;
  profile: Profile;
  onAlleleChange: (suspectId: SuspectId, locus: LocusId, alleleIndex: 0 | 1, value: number) => void;
}

function EditableTable({ title, suspectId, profile, onAlleleChange }: EditableTableProps) {
  return (
    <article className="rounded-2xl border border-slate-700/60 bg-slate-900/65 p-4 space-y-3">
      <h3 className="text-center text-lg font-black text-emerald-200">{title}</h3>

      <div className="overflow-hidden rounded-xl border border-slate-700/70">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-800/95 text-slate-200">
            <tr>
              <th className="px-3 py-2 border-b border-slate-700">לוקוס</th>
              <th className="px-3 py-2 border-b border-slate-700">אלל 1</th>
              <th className="px-3 py-2 border-b border-slate-700">אלל 2</th>
            </tr>
          </thead>
          <tbody>
            {LOCI.map((locus, index) => (
              <tr key={`${suspectId}-${locus.id}`} className={index % 2 === 0 ? "bg-slate-900/70" : "bg-slate-950/70"}>
                <td className="px-3 py-2 border-t border-slate-800 text-slate-100 font-bold">{locus.id}</td>
                <td className="px-2 py-2 border-t border-slate-800">
                  <input
                    type="number"
                    min={ALLELE_MIN}
                    max={ALLELE_MAX}
                    step={0.1}
                    value={profile[locus.id][0]}
                    onChange={(event) => {
                      const parsed = Number.parseFloat(event.target.value);
                      if (!Number.isNaN(parsed)) onAlleleChange(suspectId, locus.id, 0, parsed);
                    }}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800/90 px-2 py-1 text-center text-slate-100"
                  />
                </td>
                <td className="px-2 py-2 border-t border-slate-800">
                  <input
                    type="number"
                    min={ALLELE_MIN}
                    max={ALLELE_MAX}
                    step={0.1}
                    value={profile[locus.id][1]}
                    onChange={(event) => {
                      const parsed = Number.parseFloat(event.target.value);
                      if (!Number.isNaN(parsed)) onAlleleChange(suspectId, locus.id, 1, parsed);
                    }}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800/90 px-2 py-1 text-center text-slate-100"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

interface GelBandsProps {
  pair: AllelePair;
  color: string;
  zoneTop: number;
  zoneHeight: number;
}

function GelBands({ pair, color, zoneTop, zoneHeight }: GelBandsProps) {
  const innerHeight = zoneHeight - ZONE_PADDING * 2;
  const mapToY = (allele: number): number => {
    const normalized = (clamp(allele, ALLELE_MIN, ALLELE_MAX) - ALLELE_MIN) / (ALLELE_MAX - ALLELE_MIN);
    return zoneTop + ZONE_PADDING + (1 - normalized) * innerHeight;
  };

  if (isHomozygous(pair)) {
    return (
      <span
        className="absolute left-1/2 -translate-x-1/2 w-[74%] rounded-full border"
        style={{
          top: mapToY(pair[0]),
          height: 5,
          backgroundColor: color,
          borderColor: "rgba(240,248,255,0.95)",
          opacity: 1,
          boxShadow: `0 0 10px ${color}`
        }}
      />
    );
  }

  return (
    <>
      <span
        className="absolute left-1/2 -translate-x-1/2 w-[74%] rounded-full border"
        style={{
          top: mapToY(pair[0]),
          height: 2,
          backgroundColor: color,
          borderColor: "rgba(240,248,255,0.75)",
          opacity: 0.85,
          boxShadow: `0 0 7px ${color}`
        }}
      />
      <span
        className="absolute left-1/2 -translate-x-1/2 w-[74%] rounded-full border"
        style={{
          top: mapToY(pair[1]),
          height: 2,
          backgroundColor: color,
          borderColor: "rgba(240,248,255,0.75)",
          opacity: 0.85,
          boxShadow: `0 0 7px ${color}`
        }}
      />
    </>
  );
}

export default function StrCaseLabPage({ onComplete }: StrCaseLabPageProps) {
  const [suspects, setSuspects] = useState<Record<SuspectId, Profile>>(INITIAL_SUSPECT_PROFILES);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [matchedSuspects, setMatchedSuspects] = useState<SuspectId[]>([]);

  const lanes = useMemo(
    () => [
      { id: "scene", label: "זירה", profile: CRIME_SCENE_PROFILE },
      { id: "suspect1", label: "חשוד 1", profile: suspects.suspect1 },
      { id: "suspect2", label: "חשוד 2", profile: suspects.suspect2 },
      { id: "suspect3", label: "חשוד 3", profile: suspects.suspect3 }
    ],
    [suspects]
  );

  const zoneHeight = (GEL_HEIGHT - ZONE_GAP * (LOCI.length + 1)) / LOCI.length;

  const handleAlleleChange = (suspectId: SuspectId, locus: LocusId, alleleIndex: 0 | 1, value: number) => {
    const normalized = clamp(value, ALLELE_MIN, ALLELE_MAX);
    setSuspects((prev) => {
      const pair = prev[suspectId][locus];
      const nextPair: AllelePair = alleleIndex === 0 ? [normalized, pair[1]] : [pair[0], normalized];
      return {
        ...prev,
        [suspectId]: {
          ...prev[suspectId],
          [locus]: nextPair
        }
      };
    });
    setFeedback(null);
    setMatchedSuspects([]);
  };

  const handleCheckMatch = () => {
    const matches = SUSPECTS.filter((suspect) => profileMatches(CRIME_SCENE_PROFILE, suspects[suspect.id])).map(
      (suspect) => suspect.id
    );
    setMatchedSuspects(matches);

    if (matches.length > 0) {
      const labels = matches
        .map((suspectId) => SUSPECTS.find((suspect) => suspect.id === suspectId)?.label)
        .filter((value): value is string => Boolean(value));
      setFeedback({
        tone: "success",
        text: `נמצאה התאמה מלאה לממצא מהזירה: ${labels.join(", ")}.`
      });
      return;
    }

    setFeedback({
      tone: "error",
      text: "אין כרגע התאמה מלאה. עדכנו את האללים של החשודים ונסו שוב."
    });
  };

  const handleReset = () => {
    setSuspects(INITIAL_SUSPECT_PROFILES);
    setFeedback(null);
    setMatchedSuspects([]);
  };

  return (
    <section dir="rtl" className="glass-pcr-card rounded-[2.5rem] border border-slate-700/30 p-6 md:p-8 space-y-6">
      <header className="space-y-3 text-right">
        <h2 className="text-3xl font-black text-white flex items-center justify-start gap-3">
          <Search className="w-8 h-8 text-cyan-300" />
          לימוד זיהוי פלילי באמצעות DNA
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed max-w-5xl">
          השוו את ממצא ה-DNA מהזירה לפרופיל של שלושה חשודים. כל שינוי באללים בטבלאות יעדכן מיד את הפסים בג&apos;ל.
          התאמה מלאה בין כל ארבעת הלוקוסים מצביעה על חשוד מתאים.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <FixedTable title="ממצא מזירת הפשע" profile={CRIME_SCENE_PROFILE} />

        {SUSPECTS.map((suspect) => (
          <EditableTable
            key={suspect.id}
            title={suspect.label}
            suspectId={suspect.id}
            profile={suspects[suspect.id]}
            onAlleleChange={handleAlleleChange}
          />
        ))}
      </div>

      <section className="rounded-2xl border border-slate-700/60 bg-slate-950/85 p-4 md:p-5 space-y-4">
        <h3 className="text-xl font-black text-white text-right">ג&apos;ל ויזואלי להשוואת פרופילים</h3>

        <div className="rounded-xl border border-slate-700/60 bg-black p-4 overflow-x-auto" dir="ltr">
          <div className="min-w-[1040px] flex gap-4">
            <div className="relative w-[112px] border border-slate-700/70 bg-slate-950" style={{ height: GEL_HEIGHT }}>
              <div className="absolute top-2 left-0 right-0 text-center text-[11px] font-bold text-slate-200">Ladder</div>

              {LOCI.map((locus, locusIndex) => {
                const zoneTop = ZONE_GAP + locusIndex * (zoneHeight + ZONE_GAP);
                const innerHeight = zoneHeight - ZONE_PADDING * 2;

                return (
                  <React.Fragment key={`ladder-zone-${locus.id}`}>
                    <div
                      className="absolute left-2 right-2 rounded-md border border-slate-700/60 bg-slate-900/55"
                      style={{ top: zoneTop, height: zoneHeight }}
                    />
                    <span
                      className="absolute right-3 text-[10px] font-black"
                      style={{ top: zoneTop + 4, color: locus.color }}
                    >
                      {locus.id}
                    </span>

                    {LADDER_VALUES.map((value) => {
                      const normalized = (value - ALLELE_MIN) / (ALLELE_MAX - ALLELE_MIN);
                      const y = zoneTop + ZONE_PADDING + (1 - normalized) * innerHeight;
                      return (
                        <React.Fragment key={`ladder-${locus.id}-${value}`}>
                          <span className="absolute left-2 right-7 h-[1px] bg-slate-200/75" style={{ top: y }} />
                          <span
                            className="absolute right-1 -translate-y-1/2 text-[10px] text-slate-300 font-medium"
                            style={{ top: y }}
                          >
                            {value}
                          </span>
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>

            <div className="grid grid-cols-4 gap-3 flex-1">
              {lanes.map((lane) => {
                const isMatchedLane = lane.id !== "scene" && matchedSuspects.includes(lane.id as SuspectId);

                return (
                  <div key={lane.id} className="space-y-2">
                    <div className="text-center text-sm font-black text-slate-100">{lane.label}</div>

                    <div
                      className={`relative border bg-slate-950 ${
                        isMatchedLane ? "border-emerald-400/85 shadow-[0_0_14px_rgba(16,185,129,0.35)]" : "border-slate-700/70"
                      }`}
                      style={{ height: GEL_HEIGHT }}
                    >
                      {LOCI.map((locus, locusIndex) => {
                        const zoneTop = ZONE_GAP + locusIndex * (zoneHeight + ZONE_GAP);
                        const pair = lane.profile[locus.id];
                        return (
                          <React.Fragment key={`${lane.id}-${locus.id}`}>
                            <div
                              className="absolute left-2 right-2 rounded-md border border-slate-700/60 bg-slate-900/50"
                              style={{ top: zoneTop, height: zoneHeight }}
                            />
                            <span
                              className="absolute right-3 text-[10px] font-black"
                              style={{ top: zoneTop + 4, color: locus.color }}
                            >
                              {locus.id}
                            </span>
                            <GelBands pair={pair} color={locus.color} zoneTop={zoneTop} zoneHeight={zoneHeight} />
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCheckMatch}
            className="rounded-xl bg-blue-600 px-6 py-2.5 font-bold text-white transition-all hover:bg-blue-500"
          >
            בדוק התאמה
          </button>

          <button
            onClick={handleReset}
            className="rounded-xl border border-slate-600 bg-slate-800 px-6 py-2.5 font-bold text-slate-100 transition-all hover:bg-slate-700 flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            אפס נתונים
          </button>

          <button
            onClick={onComplete}
            disabled={matchedSuspects.length === 0}
            className="rounded-xl bg-emerald-600 px-6 py-2.5 font-bold text-white transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
          >
            <FlaskConical className="w-4 h-4" />
            המשך לשלב הבא
          </button>
        </div>

        {feedback && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              feedback.tone === "success"
                ? "border-emerald-500/45 bg-emerald-500/10 text-emerald-200"
                : "border-amber-500/45 bg-amber-500/10 text-amber-200"
            }`}
          >
            <div className="mb-1 flex items-center gap-2 font-bold">
              {feedback.tone === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {feedback.tone === "success" ? "נמצאה התאמה" : "נדרשת בדיקה נוספת"}
            </div>
            <p>{feedback.text}</p>
          </div>
        )}
      </section>
    </section>
  );
}

