import { ImageResponse } from "@vercel/og";

type GameType = "jeopardy" | "quick-trivia" | "hudomino";

export const config = {
  runtime: "edge",
};

function normalizeGameType(value: string | null): GameType {
  if (value === "quick-trivia" || value === "hudomino" || value === "jeopardy") return value;
  return "jeopardy";
}

function toPositiveInt(value: string | null): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const gameType = normalizeGameType(searchParams.get("type"));
  const title = (searchParams.get("title") || "משחק טריוויה").trim().slice(0, 64);
  const categoryCount = clamp(toPositiveInt(searchParams.get("cats")) ?? 4, 2, 8);
  const rowCount = clamp(toPositiveInt(searchParams.get("rows")) ?? 4, 2, 6);
  const questionCount = clamp(toPositiveInt(searchParams.get("q")) ?? 15, 4, 30);

  const palette =
    gameType === "quick-trivia"
      ? {
          background: "#090d3f",
          panel: "#132067",
          accent: "#f59e0b",
          soft: "#fde68a",
          cellA: "#1b2f8f",
          cellB: "#2641ad",
        }
      : gameType === "hudomino"
        ? {
            background: "#111827",
            panel: "#1f2937",
            accent: "#e879f9",
            soft: "#f5d0fe",
            cellA: "#4c1d95",
            cellB: "#7e22ce",
          }
        : {
            background: "#0b1b52",
            panel: "#132c74",
            accent: "#22d3ee",
            soft: "#a5f3fc",
            cellA: "#1d4ed8",
            cellB: "#2563eb",
          };

  const rows = Array.from({ length: rowCount }, (_, rowIndex) => rowIndex);
  const cols = Array.from({ length: categoryCount }, (_, colIndex) => colIndex);
  const quickOptionRows = Math.max(2, Math.ceil(questionCount / 8));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `radial-gradient(circle at 20% 20%, ${palette.accent}44 0%, transparent 40%), ${palette.background}`,
          color: "#f8fafc",
          padding: "48px",
          boxSizing: "border-box",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: `${palette.panel}EE`,
            border: `2px solid ${palette.soft}`,
            borderRadius: "24px",
            padding: "26px",
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: 28, fontWeight: 700, display: "flex" }}>{title || "משחק טריוויה"}</div>
            <div style={{ fontSize: 18, opacity: 0.88, display: "flex" }}>
              {gameType === "quick-trivia"
                ? `מי רוצה להיות מליונר • ${questionCount} שאלות`
                : gameType === "hudomino"
                  ? `חודומינו • לוח ${rowCount}×${rowCount}`
                  : `ג׳פרדי • ${categoryCount} קטגוריות × ${rowCount} שורות`}
            </div>
          </div>

          {gameType === "quick-trivia" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%" }}>
              <div
                style={{
                  width: "100%",
                  height: "92px",
                  borderRadius: "14px",
                  border: `2px solid ${palette.accent}`,
                  background: `${palette.cellA}CC`,
                  display: "flex",
                }}
              />
              {Array.from({ length: quickOptionRows }).map((_, rowIndex) => (
                <div key={`quick-options-row-${rowIndex}`} style={{ display: "flex", gap: "12px", width: "100%" }}>
                  {Array.from({ length: 2 }).map((__, colIndex) => (
                    <div
                      key={`quick-option-${rowIndex}-${colIndex}`}
                      style={{
                        flex: 1,
                        height: "56px",
                        borderRadius: "12px",
                        border: `1px solid ${palette.soft}`,
                        background: colIndex % 2 === 0 ? `${palette.cellB}CC` : `${palette.cellA}CC`,
                        display: "flex",
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
              {rows.map((rowIndex) => (
                <div key={`row-${rowIndex}`} style={{ display: "flex", gap: "10px", width: "100%" }}>
                  {cols.map((colIndex) => (
                    <div
                      key={`cell-${rowIndex}-${colIndex}`}
                      style={{
                        flex: 1,
                        height: gameType === "hudomino" ? "64px" : "52px",
                        borderRadius: "10px",
                        border: `1px solid ${palette.soft}`,
                        background: (rowIndex + colIndex) % 2 === 0 ? `${palette.cellA}CC` : `${palette.cellB}CC`,
                        boxShadow: `inset 0 0 0 1px ${palette.accent}44`,
                        display: "flex",
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              display: "flex",
              width: "100%",
              justifyContent: "flex-end",
              fontSize: 16,
              opacity: 0.8,
            }}
          >
            Jeopardy Generator
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
