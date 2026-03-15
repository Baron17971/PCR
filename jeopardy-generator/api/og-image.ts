import { Resvg } from "@resvg/resvg-js";

type GameType = "jeopardy" | "quick-trivia" | "hudomino";

type Palette = {
  bg: string;
  panel: string;
  accent: string;
  cellA: string;
  cellB: string;
};

const MILLIONAIRE_LADDER = [
  100,
  200,
  300,
  500,
  1000,
  2000,
  4000,
  8000,
  16000,
  32000,
  64000,
  125000,
  250000,
  500000,
  1000000,
];

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

function formatAmount(value: number): string {
  return value.toLocaleString("en-US");
}

function resolvePalette(gameType: GameType): Palette {
  if (gameType === "quick-trivia") {
    return {
      bg: "#090d3f",
      panel: "#132067",
      accent: "#f59e0b",
      cellA: "#1b2f8f",
      cellB: "#2641ad",
    };
  }

  if (gameType === "hudomino") {
    return {
      bg: "#111827",
      panel: "#1f2937",
      accent: "#e879f9",
      cellA: "#4c1d95",
      cellB: "#7e22ce",
    };
  }

  return {
    bg: "#0b1b52",
    panel: "#132c74",
    accent: "#22d3ee",
    cellA: "#1d4ed8",
    cellB: "#2563eb",
  };
}

function renderMillionaireLayout(title: string, questionCount: number, palette: Palette): string {
  const subtitle = `Millionaire - ${questionCount} questions`;
  const stageX = 56;
  const stageY = 172;
  const stageW = 760;
  const stageH = 396;

  const answerBoxes = [
    { x: 74, y: 320, label: "A", text: "Answer option" },
    { x: 452, y: 320, label: "B", text: "Answer option" },
    { x: 74, y: 400, label: "C", text: "Answer option" },
    { x: 452, y: 400, label: "D", text: "Answer option" },
  ];

  const answersSvg = answerBoxes
    .map(
      (answer) => `
    <rect x="${answer.x}" y="${answer.y}" width="338" height="64" rx="14" fill="${palette.cellA}" stroke="${palette.accent}" stroke-width="2" />
    <circle cx="${answer.x + 32}" cy="${answer.y + 32}" r="18" fill="#10215e" stroke="${palette.accent}" stroke-width="2" />
    <text x="${answer.x + 32}" y="${answer.y + 39}" fill="${palette.accent}" font-size="20" font-family="Arial, sans-serif" font-weight="700" text-anchor="middle">${answer.label}</text>
    <text x="${answer.x + 300}" y="${answer.y + 40}" fill="#e2e8f0" font-size="26" font-family="Arial, sans-serif" text-anchor="end" direction="rtl">${answer.text}</text>`,
    )
    .join("");

  const ladderX = 846;
  const ladderY = 172;
  const ladderWidth = 312;
  const ladderHeight = 396;
  const ladderRowHeight = ladderHeight / MILLIONAIRE_LADDER.length;

  const ladderSvg = MILLIONAIRE_LADDER.map((amount, index) => {
    const y = ladderY + index * ladderRowHeight;
    const isActive = index === 0;
    const fill = isActive ? palette.accent : "#12225e";
    const amountColor = isActive ? "#111827" : "#f8fafc";
    const stepColor = isActive ? "#111827" : palette.accent;
    return `
    <rect x="${ladderX}" y="${y.toFixed(2)}" width="${ladderWidth}" height="${(ladderRowHeight - 2).toFixed(
      2,
    )}" rx="8" fill="${fill}" stroke="#dbeafe66" stroke-width="1.5" />
    <text x="${ladderX + ladderWidth - 42}" y="${(y + ladderRowHeight * 0.68).toFixed(
      2,
    )}" fill="${amountColor}" font-size="18" font-family="Arial, sans-serif" font-weight="700" text-anchor="end">${formatAmount(
      amount,
    )}</text>
    <text x="${ladderX + ladderWidth - 12}" y="${(y + ladderRowHeight * 0.68).toFixed(
      2,
    )}" fill="${stepColor}" font-size="16" font-family="Arial, sans-serif" font-weight="700" text-anchor="end">${index + 1}</text>`;
  }).join("");

  return `
  <rect x="30" y="30" width="1140" height="570" rx="24" fill="${palette.panel}EE" stroke="${palette.accent}" stroke-width="2" />
  <text x="1150" y="92" fill="#f8fafc" font-size="42" font-family="Arial, sans-serif" font-weight="700" text-anchor="end" direction="rtl">${title}</text>
  <text x="1150" y="132" fill="#e2e8f0" font-size="27" font-family="Arial, sans-serif" text-anchor="end">${subtitle}</text>
  <rect x="${stageX}" y="${stageY}" width="${stageW}" height="${stageH}" rx="20" fill="#0e1b52" stroke="#dbeafe66" stroke-width="2" />
  <rect x="74" y="214" width="716" height="74" rx="16" fill="${palette.cellB}" stroke="${palette.accent}" stroke-width="2" />
  <text x="432" y="260" fill="${palette.accent}" font-size="32" font-family="Arial, sans-serif" font-weight="700" text-anchor="middle">Question preview</text>
  ${answersSvg}
  <circle cx="320" cy="530" r="26" fill="#1a2f82" stroke="${palette.accent}" stroke-width="2" />
  <text x="320" y="538" fill="#22c55e" font-size="16" font-family="Arial, sans-serif" font-weight="700" text-anchor="middle">CALL</text>
  <circle cx="398" cy="530" r="26" fill="#1a2f82" stroke="${palette.accent}" stroke-width="2" />
  <text x="398" y="538" fill="#f8fafc" font-size="20" font-family="Arial, sans-serif" font-weight="700" text-anchor="middle">50:50</text>
  <circle cx="476" cy="530" r="26" fill="#1a2f82" stroke="${palette.accent}" stroke-width="2" />
  <text x="476" y="538" fill="#f8fafc" font-size="14" font-family="Arial, sans-serif" font-weight="700" text-anchor="middle">AUD</text>
  ${ladderSvg}
  <text x="1150" y="586" fill="#cbd5e1" font-size="22" font-family="Arial, sans-serif" text-anchor="end">Jeopardy Generator</text>`;
}

function renderGridLayout(
  title: string,
  gameType: GameType,
  categoryCount: number,
  rowCount: number,
  palette: Palette,
): string {
  const subtitle =
    gameType === "hudomino"
      ? `Hudomino - ${rowCount}x${rowCount} board`
      : `Jeopardy - ${categoryCount} categories x ${rowCount} rows`;

  const boardY = 180;
  const boardHeight = 360;
  const boardWidth = 1104;
  const gridGap = 8;
  const colCount = categoryCount;
  const rowVisualCount = rowCount;
  const cellWidth = (boardWidth - gridGap * (colCount - 1)) / colCount;
  const cellHeight = (boardHeight - gridGap * (rowVisualCount - 1)) / rowVisualCount;

  let cellsSvg = "";
  for (let row = 0; row < rowVisualCount; row += 1) {
    for (let col = 0; col < colCount; col += 1) {
      const x = 48 + col * (cellWidth + gridGap);
      const y = boardY + row * (cellHeight + gridGap);
      const fill = (row + col) % 2 === 0 ? palette.cellA : palette.cellB;
      cellsSvg += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${cellWidth.toFixed(
        2,
      )}" height="${cellHeight.toFixed(2)}" rx="12" fill="${fill}" stroke="#dbeafe66" stroke-width="2" />`;
    }
  }

  return `
  <rect x="30" y="30" width="1140" height="570" rx="24" fill="${palette.panel}EE" stroke="${palette.accent}" stroke-width="2" />
  <text x="1150" y="90" fill="#f8fafc" font-size="42" font-family="Arial, sans-serif" font-weight="700" text-anchor="end" direction="rtl">${title}</text>
  <text x="1150" y="130" fill="#e2e8f0" font-size="27" font-family="Arial, sans-serif" text-anchor="end">${subtitle}</text>
  ${cellsSvg}
  <text x="1150" y="585" fill="#cbd5e1" font-size="22" font-family="Arial, sans-serif" text-anchor="end">Jeopardy Generator</text>`;
}

export default function handler(req: any, res: any) {
  const protocolHeader = req.headers?.["x-forwarded-proto"];
  const protocol = Array.isArray(protocolHeader) ? protocolHeader[0] : protocolHeader || "https";
  const host = req.headers?.host || "localhost";
  const requestUrl = new URL(req.url || "/", `${protocol}://${host}`);
  const searchParams = requestUrl.searchParams;

  const gameType = normalizeGameType(searchParams.get("type"));
  const titleRaw = (searchParams.get("title") || "Trivia Game").trim();
  const title = escapeXml(titleRaw.slice(0, 64) || "Trivia Game");
  const categoryCount = clamp(toPositiveInt(searchParams.get("cats")) ?? 4, 2, 8);
  const rowCount = clamp(toPositiveInt(searchParams.get("rows")) ?? 4, 2, 6);
  const questionCount = clamp(toPositiveInt(searchParams.get("q")) ?? 15, 4, 30);

  const palette = resolvePalette(gameType);
  const body =
    gameType === "quick-trivia"
      ? renderMillionaireLayout(title, questionCount, palette)
      : renderGridLayout(title, gameType, categoryCount, rowCount, palette);

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
  ${body}
</svg>`;

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: 1200,
    },
    font: {
      loadSystemFonts: true,
      defaultFontFamily: "Arial",
    },
  });
  const png = resvg.render().asPng();

  res.setHeader("content-type", "image/png");
  res.setHeader("cache-control", "public, max-age=0, s-maxage=300");
  res.status(200).send(Buffer.from(png));
}
