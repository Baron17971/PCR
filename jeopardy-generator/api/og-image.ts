type GameType = "jeopardy" | "quick-trivia" | "hudomino";

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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default function handler(req: any, res: any) {
  const protocolHeader = req.headers?.["x-forwarded-proto"];
  const protocol = Array.isArray(protocolHeader) ? protocolHeader[0] : protocolHeader || "https";
  const host = req.headers?.host || "localhost";
  const requestUrl = new URL(req.url || "/", `${protocol}://${host}`);
  const searchParams = requestUrl.searchParams;

  const gameType = normalizeGameType(searchParams.get("type"));
  const titleRaw = (searchParams.get("title") || "משחק טריוויה").trim();
  const title = escapeXml(titleRaw.slice(0, 64) || "משחק טריוויה");
  const categoryCount = clamp(toPositiveInt(searchParams.get("cats")) ?? 4, 2, 8);
  const rowCount = clamp(toPositiveInt(searchParams.get("rows")) ?? 4, 2, 6);
  const questionCount = clamp(toPositiveInt(searchParams.get("q")) ?? 15, 4, 30);

  const palette =
    gameType === "quick-trivia"
      ? {
          bg: "#090d3f",
          panel: "#132067",
          accent: "#f59e0b",
          cellA: "#1b2f8f",
          cellB: "#2641ad",
        }
      : gameType === "hudomino"
        ? {
            bg: "#111827",
            panel: "#1f2937",
            accent: "#e879f9",
            cellA: "#4c1d95",
            cellB: "#7e22ce",
          }
        : {
            bg: "#0b1b52",
            panel: "#132c74",
            accent: "#22d3ee",
            cellA: "#1d4ed8",
            cellB: "#2563eb",
          };

  const subtitle =
    gameType === "quick-trivia"
      ? `מי רוצה להיות מליונר • ${questionCount} שאלות`
      : gameType === "hudomino"
        ? `חודומינו • לוח ${rowCount}×${rowCount}`
        : `ג׳פרדי • ${categoryCount} קטגוריות × ${rowCount} שורות`;

  const boardY = 180;
  const boardHeight = 360;
  const boardWidth = 1104;
  const gridGap = 8;
  const colCount = gameType === "quick-trivia" ? 2 : categoryCount;
  const rowVisualCount = gameType === "quick-trivia" ? Math.max(2, Math.ceil(questionCount / 8)) + 1 : rowCount;
  const cellWidth = (boardWidth - gridGap * (colCount - 1)) / colCount;
  const cellHeight = (boardHeight - gridGap * (rowVisualCount - 1)) / rowVisualCount;

  let cellsSvg = "";
  for (let row = 0; row < rowVisualCount; row += 1) {
    for (let col = 0; col < colCount; col += 1) {
      const x = 48 + col * (cellWidth + gridGap);
      const y = boardY + row * (cellHeight + gridGap);
      const fill = (row + col) % 2 === 0 ? palette.cellA : palette.cellB;
      const radius = gameType === "quick-trivia" && row === 0 ? 16 : 12;
      const stroke = gameType === "quick-trivia" && row === 0 ? palette.accent : "#dbeafe66";
      cellsSvg += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${cellWidth.toFixed(
        2,
      )}" height="${cellHeight.toFixed(2)}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="2" />`;
    }
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.bg}" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <radialGradient id="glow" cx="0.2" cy="0.15" r="0.7">
      <stop offset="0%" stop-color="${palette.accent}66" />
      <stop offset="100%" stop-color="transparent" />
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <rect width="1200" height="630" fill="url(#glow)" />
  <rect x="30" y="30" width="1140" height="570" rx="24" fill="${palette.panel}EE" stroke="${palette.accent}" stroke-width="2" />
  <text x="1150" y="90" fill="#f8fafc" font-size="42" font-family="Arial, sans-serif" font-weight="700" text-anchor="end" direction="rtl">${title}</text>
  <text x="1150" y="130" fill="#e2e8f0" font-size="27" font-family="Arial, sans-serif" text-anchor="end" direction="rtl">${escapeXml(
    subtitle,
  )}</text>
  ${cellsSvg}
  <text x="1150" y="585" fill="#cbd5e1" font-size="22" font-family="Arial, sans-serif" text-anchor="end">Jeopardy Generator</text>
</svg>`;

  res.setHeader("content-type", "image/svg+xml; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=0, s-maxage=300");
  res.status(200).send(svg);
}
