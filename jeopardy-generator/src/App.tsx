import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

type AppMode = "editor" | "game";

interface CellData {
  value: number;
  question: string;
  answer: string;
  used: boolean;
}

interface CategoryData {
  title: string;
  cells: CellData[];
}

interface TeamData {
  id: string;
  name: string;
  score: number;
}

interface ActiveCell {
  categoryIndex: number;
  rowIndex: number;
}

interface BoardTheme {
  boardBorderColor: string;
  boardBackgroundColor: string;
  categoryBgStart: string;
  categoryBgEnd: string;
  categoryTextColor: string;
  cellBgColor: string;
  cellTextColor: string;
  cellBorderColor: string;
  usedCellBgColor: string;
  usedCellTextColor: string;
  boardBackgroundImage: string | null;
  boardBackgroundOverlay: number;
}

type BoardThemeColorKey =
  | "boardBorderColor"
  | "boardBackgroundColor"
  | "categoryBgStart"
  | "categoryBgEnd"
  | "categoryTextColor"
  | "cellBgColor"
  | "cellTextColor"
  | "cellBorderColor"
  | "usedCellBgColor"
  | "usedCellTextColor";

type BoardThemeColorSet = Pick<BoardTheme, BoardThemeColorKey>;

interface BoardThemePalette {
  id: string;
  name: string;
  description: string;
  colors: BoardThemeColorSet;
}

interface ExportPayload {
  version: number;
  settings: {
    gameTopic: string;
    categoryCount: number;
    rowCount: number;
    baseValue: number;
    teamCount: number;
    teamNames: string[];
    boardTheme?: Partial<BoardTheme>;
  };
  categories: Array<{
    title: string;
    cells: Array<{
      value: number;
      question: string;
      answer: string;
    }>;
  }>;
}

type ShareAccess = "view" | "edit";

interface SharePayload {
  version: number;
  access?: ShareAccess;
  canShareEdit?: boolean;
  game: {
    gameTopic: string;
    boardTheme?: Partial<BoardTheme>;
    board: Array<{
      title: string;
      cells: Array<{
        value: number;
        question: string;
        answer: string;
        used: boolean;
      }>;
    }>;
    teams: Array<{
      name: string;
      score: number;
    }>;
    currentTurnIndex: number;
  };
}

interface CsvQuestionRow {
  category: string;
  value: number | null;
  question: string;
  answer: string;
}

const MIN_CATEGORIES = 2;
const MAX_CATEGORIES = 8;
const MIN_ROWS = 3;
const MAX_ROWS = 6;
const MIN_TEAMS = 2;
const MAX_TEAMS = 5;
const MIN_BASE_VALUE = 100;
const MAX_BASE_VALUE = 500;
const SHARE_QUERY_PARAM = "game";

const TEAM_COLORS = [
  "#22d3ee",
  "#4ade80",
  "#fbbf24",
  "#f472b6",
  "#a78bfa",
];

const AI_CSV_PROMPT_TEMPLATE =
  "צור קובץ CSV UTF-8 עם העמודות: category, value, question, answer. " +
  "מלא אותו ב-6 קטגוריות שונות בנושא [הכנס נושא]. בכל קטגוריה צור 5 שאלות בערכים 200, 400, 600, 800, 1000, " +
  "בסדר קושי עולה ובהתאמה לרמת תלמידי כיתה [הכנס כיתה]. " +
  "נסח את השאלות בסגנון ג׳פרדי, בעברית מלאה ותקינה, והקפד שלא יהיו כפילויות מושגיות בין השאלות. " +
  "לכל שאלה הוסף תשובה קצרה, מדויקת וברורה. " +
  "אם מצורף קובץ, יש להתבסס רק על התוכן שבו בלבד, ללא הוספת מידע חיצוני, ותוך שמירה על המינוחים המקוריים של הקובץ ככל האפשר.";

const DEFAULT_BOARD_THEME: BoardTheme = {
  boardBorderColor: "#38bdf8",
  boardBackgroundColor: "#0d224f",
  categoryBgStart: "#1d4ed8",
  categoryBgEnd: "#1e3a8a",
  categoryTextColor: "#e2e8f0",
  cellBgColor: "#233d8f",
  cellTextColor: "#fbbf24",
  cellBorderColor: "#38bdf8",
  usedCellBgColor: "#020617",
  usedCellTextColor: "#64748b",
  boardBackgroundImage: null,
  boardBackgroundOverlay: 55,
};

const BOARD_THEME_COLOR_KEYS: BoardThemeColorKey[] = [
  "boardBorderColor",
  "boardBackgroundColor",
  "categoryBgStart",
  "categoryBgEnd",
  "categoryTextColor",
  "cellBgColor",
  "cellTextColor",
  "cellBorderColor",
  "usedCellBgColor",
  "usedCellTextColor",
];

const BOARD_THEME_PALETTES: BoardThemePalette[] = [
  {
    id: "classic-blue",
    name: "קלאסי כחול",
    description: "סגנון תחרות טלוויזיה קלאסי עם ניגודיות גבוהה.",
    colors: {
      boardBorderColor: "#38bdf8",
      boardBackgroundColor: "#0d224f",
      categoryBgStart: "#1d4ed8",
      categoryBgEnd: "#1e3a8a",
      categoryTextColor: "#e2e8f0",
      cellBgColor: "#233d8f",
      cellTextColor: "#fbbf24",
      cellBorderColor: "#38bdf8",
      usedCellBgColor: "#020617",
      usedCellTextColor: "#64748b",
    },
  },
  {
    id: "emerald-arena",
    name: "אמרלד ארנה",
    description: "אמרלד בהשראת שיש טורקיז-לילך, עם ערכים בגוון סגלגל וזהב רך.",
    colors: {
      boardBorderColor: "#a895bf",
      boardBackgroundColor: "#e5f2f4",
      categoryBgStart: "#8bd4d8",
      categoryBgEnd: "#b29fc7",
      categoryTextColor: "#202737",
      cellBgColor: "#67557d",
      cellTextColor: "#f2e4be",
      cellBorderColor: "#9d8fb4",
      usedCellBgColor: "#d6e1e8",
      usedCellTextColor: "#586476",
    },
  },
  {
    id: "sunset-arcade",
    name: "שקיעה ארקייד",
    description: "בהשראת שקיעה סגולה-כתומה: אפרסק זהוב, כתום בוער וסגול עמוק.",
    colors: {
      boardBorderColor: "#f8b766",
      boardBackgroundColor: "#2b2140",
      categoryBgStart: "#f8b766",
      categoryBgEnd: "#db6635",
      categoryTextColor: "#2f1d1a",
      cellBgColor: "#692e5e",
      cellTextColor: "#f5dcb7",
      cellBorderColor: "#ac5a54",
      usedCellBgColor: "#3a2a4b",
      usedCellTextColor: "#c5b9cf",
    },
  },
  {
    id: "cyber-neon",
    name: "ניאון סייבר",
    description: "כחול-טורקיז עם הדגשות ורודות למראה עתידני.",
    colors: {
      boardBorderColor: "#22d3ee",
      boardBackgroundColor: "#0a1028",
      categoryBgStart: "#0ea5e9",
      categoryBgEnd: "#2563eb",
      categoryTextColor: "#e0f2fe",
      cellBgColor: "#1e1b4b",
      cellTextColor: "#f9a8d4",
      cellBorderColor: "#22d3ee",
      usedCellBgColor: "#0f172a",
      usedCellTextColor: "#94a3b8",
    },
  },
  {
    id: "light-ice",
    name: "קרח בהיר",
    description: "תצוגה בהירה ונקייה לכיתה מוארת או מקרן חלש.",
    colors: {
      boardBorderColor: "#0284c7",
      boardBackgroundColor: "#e0f2fe",
      categoryBgStart: "#38bdf8",
      categoryBgEnd: "#0ea5e9",
      categoryTextColor: "#082f49",
      cellBgColor: "#bae6fd",
      cellTextColor: "#0c4a6e",
      cellBorderColor: "#0284c7",
      usedCellBgColor: "#cbd5e1",
      usedCellTextColor: "#475569",
    },
  },
  {
    id: "vintage-mint",
    name: "מנטה וינטג׳",
    description: "מנטה מעודנת ובהירה עם תחושת וינטג׳ נקייה ונעימה לעין.",
    colors: {
      boardBorderColor: "#a7c8c0",
      boardBackgroundColor: "#e6f1ef",
      categoryBgStart: "#9bc8c1",
      categoryBgEnd: "#7faea7",
      categoryTextColor: "#163036",
      cellBgColor: "#c7ded9",
      cellTextColor: "#20363b",
      cellBorderColor: "#9fbfb8",
      usedCellBgColor: "#dce8e5",
      usedCellTextColor: "#54676d",
    },
  },
  {
    id: "desert-sage",
    name: "סייג׳ מדברי",
    description: "בהשראת סוקולנטים ופודרה, עם ניגודיות גבוהה לטקסט.",
    colors: {
      boardBorderColor: "#afbfaa",
      boardBackgroundColor: "#23312e",
      categoryBgStart: "#93a79f",
      categoryBgEnd: "#7a8e88",
      categoryTextColor: "#f8fafc",
      cellBgColor: "#5f5956",
      cellTextColor: "#f4d5c6",
      cellBorderColor: "#a8bca8",
      usedCellBgColor: "#2e3133",
      usedCellTextColor: "#a0aab2",
    },
  },
  {
    id: "peach-garden",
    name: "לגונת לילך",
    description: "פריחת לילך על רקע תכול, עם ערכים בסגול אפרפר וניגודיות נקייה.",
    colors: {
      boardBorderColor: "#a79bb8",
      boardBackgroundColor: "#dbf7f4",
      categoryBgStart: "#7cd8e8",
      categoryBgEnd: "#9fb2de",
      categoryTextColor: "#203040",
      cellBgColor: "#70627f",
      cellTextColor: "#fce7f3",
      cellBorderColor: "#b8adc6",
      usedCellBgColor: "#d8e0e6",
      usedCellTextColor: "#566372",
    },
  },
  {
    id: "cherry-blossom",
    name: "פריחת דובדבן",
    description: "ורוד-לבנדר רגוע עם תאי ניקוד כהים לטקסט חד וברור.",
    colors: {
      boardBorderColor: "#9aaec0",
      boardBackgroundColor: "#232735",
      categoryBgStart: "#c86392",
      categoryBgEnd: "#9f7fa8",
      categoryTextColor: "#f8fafc",
      cellBgColor: "#5f6f84",
      cellTextColor: "#ffe8f6",
      cellBorderColor: "#b8acc6",
      usedCellBgColor: "#2a2e3a",
      usedCellTextColor: "#9ca3af",
    },
  },
  {
    id: "lilac-spring",
    name: "לילך אביבי",
    description: "גווני לילך וזית בהירים עם היררכיה ברורה בין כותרות לערכים.",
    colors: {
      boardBorderColor: "#b7c7d6",
      boardBackgroundColor: "#243126",
      categoryBgStart: "#b28ab6",
      categoryBgEnd: "#8d6a96",
      categoryTextColor: "#f8fafc",
      cellBgColor: "#6e7f5a",
      cellTextColor: "#f3e8ff",
      cellBorderColor: "#c7b1d1",
      usedCellBgColor: "#2b3328",
      usedCellTextColor: "#a3acb6",
    },
  },
  {
    id: "blue-door-cat",
    name: "חתול ליד דלת תכלת",
    description: "כחול מאובק ואבן טבעית עם ניגודיות קריאה ללוח משחק.",
    colors: {
      boardBorderColor: "#8faec1",
      boardBackgroundColor: "#2c3238",
      categoryBgStart: "#7a9db4",
      categoryBgEnd: "#5f8198",
      categoryTextColor: "#f8fafc",
      cellBgColor: "#6f6864",
      cellTextColor: "#f5efe7",
      cellBorderColor: "#a3b8c5",
      usedCellBgColor: "#2d3338",
      usedCellTextColor: "#a3abb4",
    },
  },
  {
    id: "pastel-bloom",
    name: "פריחה פסטלית",
    description: "לבנדר בהיר עם ירוק ערפילי, רגוע וקריא ללוח ולחלונות קופצים.",
    colors: {
      boardBorderColor: "#9bb3b6",
      boardBackgroundColor: "#e9ecf2",
      categoryBgStart: "#c8b6e2",
      categoryBgEnd: "#ae9ad3",
      categoryTextColor: "#251c34",
      cellBgColor: "#b8c8bf",
      cellTextColor: "#233238",
      cellBorderColor: "#9fb4aa",
      usedCellBgColor: "#dfe5e2",
      usedCellTextColor: "#56646b",
    },
  },
  {
    id: "frosted-marsh",
    name: "ערפל ביצות",
    description: "פלטה שקטה של ירוק-אפור בהיר עם טיפוגרפיה חדה ללוח ולמודאל.",
    colors: {
      boardBorderColor: "#b8c9c6",
      boardBackgroundColor: "#24363a",
      categoryBgStart: "#9fb4b1",
      categoryBgEnd: "#7f9693",
      categoryTextColor: "#102127",
      cellBgColor: "#3f585a",
      cellTextColor: "#f2e7d5",
      cellBorderColor: "#a8bbb8",
      usedCellBgColor: "#1a2529",
      usedCellTextColor: "#95a4ac",
    },
  },
  {
    id: "blush-botanic",
    name: "בוטניקה ורדרדה",
    description: "קורל-ורוד וסייג׳ בהירים כרקע, עם טקסט כהה לחדות גבוהה.",
    colors: {
      boardBorderColor: "#aebec4",
      boardBackgroundColor: "#e5ecef",
      categoryBgStart: "#e79aa1",
      categoryBgEnd: "#f0bcc0",
      categoryTextColor: "#2c1f24",
      cellBgColor: "#b9cbbd",
      cellTextColor: "#23353d",
      cellBorderColor: "#9fb1a8",
      usedCellBgColor: "#d7e0e4",
      usedCellTextColor: "#516069",
    },
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeHexColor(value: string): string | null {
  const normalized = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return normalized.toLowerCase();
  }
  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    const r = normalized[1];
    const g = normalized[2];
    const b = normalized[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

function getRelativeLuminance(color: string): number {
  const red = Number.parseInt(color.slice(1, 3), 16) / 255;
  const green = Number.parseInt(color.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(color.slice(5, 7), 16) / 255;

  const toLinear = (channel: number) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

  const linearRed = toLinear(red);
  const linearGreen = toLinear(green);
  const linearBlue = toLinear(blue);

  return 0.2126 * linearRed + 0.7152 * linearGreen + 0.0722 * linearBlue;
}

function getContrastRatio(colorA: string, colorB: string): number {
  const luminanceA = getRelativeLuminance(colorA);
  const luminanceB = getRelativeLuminance(colorB);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

function getTextColorForBackground(backgroundColor: string): string {
  const normalized = normalizeHexColor(backgroundColor);
  if (!normalized) return "#f8fafc";
  const darkText = "#0f172a";
  const lightText = "#f8fafc";
  return getContrastRatio(normalized, darkText) >= getContrastRatio(normalized, lightText)
    ? darkText
    : lightText;
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(`${normalized}${padding}`);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]/g, "");
}

function detectDelimiter(firstLine: string): "," | ";" {
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

function parseCsvRows(text: string, delimiter: "," | ";"): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentCell);
      if (currentRow.some((cell) => cell.trim() !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  if (currentRow.some((cell) => cell.trim() !== "")) {
    rows.push(currentRow);
  }

  return rows;
}

function resolveBoardTheme(theme?: Partial<BoardTheme>): BoardTheme {
  if (!theme) return DEFAULT_BOARD_THEME;
  const overlay = Number.isFinite(theme.boardBackgroundOverlay)
    ? clamp(theme.boardBackgroundOverlay as number, 0, 100)
    : DEFAULT_BOARD_THEME.boardBackgroundOverlay;

  return {
    boardBorderColor: theme.boardBorderColor ?? DEFAULT_BOARD_THEME.boardBorderColor,
    boardBackgroundColor: theme.boardBackgroundColor ?? DEFAULT_BOARD_THEME.boardBackgroundColor,
    categoryBgStart: theme.categoryBgStart ?? DEFAULT_BOARD_THEME.categoryBgStart,
    categoryBgEnd: theme.categoryBgEnd ?? DEFAULT_BOARD_THEME.categoryBgEnd,
    categoryTextColor: theme.categoryTextColor ?? DEFAULT_BOARD_THEME.categoryTextColor,
    cellBgColor: theme.cellBgColor ?? DEFAULT_BOARD_THEME.cellBgColor,
    cellTextColor: theme.cellTextColor ?? DEFAULT_BOARD_THEME.cellTextColor,
    cellBorderColor: theme.cellBorderColor ?? DEFAULT_BOARD_THEME.cellBorderColor,
    usedCellBgColor: theme.usedCellBgColor ?? DEFAULT_BOARD_THEME.usedCellBgColor,
    usedCellTextColor: theme.usedCellTextColor ?? DEFAULT_BOARD_THEME.usedCellTextColor,
    boardBackgroundImage: theme.boardBackgroundImage ?? DEFAULT_BOARD_THEME.boardBackgroundImage,
    boardBackgroundOverlay: overlay,
  };
}

function createBoard(categoryCount: number, rowCount: number, baseValue: number): CategoryData[] {
  return Array.from({ length: categoryCount }, (_, categoryIndex) => ({
    title: `קטגוריה ${categoryIndex + 1}`,
    cells: Array.from({ length: rowCount }, (_, rowIndex) => ({
      value: (rowIndex + 1) * baseValue,
      question: "",
      answer: "",
      used: false,
    })),
  }));
}

function resizeBoard(
  previous: CategoryData[],
  categoryCount: number,
  rowCount: number,
  baseValue: number,
): CategoryData[] {
  return Array.from({ length: categoryCount }, (_, categoryIndex) => {
    const previousCategory = previous[categoryIndex];

    return {
      title: previousCategory?.title ?? `קטגוריה ${categoryIndex + 1}`,
      cells: Array.from({ length: rowCount }, (_, rowIndex) => {
        const previousCell = previousCategory?.cells[rowIndex];
        return {
          value: (rowIndex + 1) * baseValue,
          question: previousCell?.question ?? "",
          answer: previousCell?.answer ?? "",
          used: false,
        };
      }),
    };
  });
}

function createTeams(teamCount: number): TeamData[] {
  return Array.from({ length: teamCount }, (_, index) => ({
    id: `team-${index + 1}`,
    name: `קבוצה ${index + 1}`,
    score: 0,
  }));
}

function ValueMark({ value }: { value: number }) {
  return (
    <span className="value-mark" dir="ltr">
      {value}
    </span>
  );
}

function App() {
  const [mode, setMode] = useState<AppMode>("editor");
  const [gameTopic, setGameTopic] = useState("משחק ג'פרדי");
  const [aiPromptText, setAiPromptText] = useState(AI_CSV_PROMPT_TEMPLATE);
  const [boardTheme, setBoardTheme] = useState<BoardTheme>(DEFAULT_BOARD_THEME);
  const [categoryCount, setCategoryCount] = useState(6);
  const [rowCount, setRowCount] = useState(5);
  const [baseValue, setBaseValue] = useState(200);
  const [board, setBoard] = useState<CategoryData[]>(() => createBoard(6, 5, 200));
  const [teams, setTeams] = useState<TeamData[]>(() => createTeams(2));
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [didScoreCurrentQuestion, setDidScoreCurrentQuestion] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isSharedViewOnly, setIsSharedViewOnly] = useState(false);
  const [canCreateEditShare, setCanCreateEditShare] = useState(true);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const csvImportInputRef = useRef<HTMLInputElement | null>(null);
  const boardBackgroundInputRef = useRef<HTMLInputElement | null>(null);

  const activeQuestion = activeCell
    ? board[activeCell.categoryIndex]?.cells[activeCell.rowIndex] ?? null
    : null;

  const missingFieldsCount = useMemo(() => {
    return board.reduce((total, category) => {
      return (
        total +
        category.cells.filter((cell) => !cell.question.trim() || !cell.answer.trim()).length
      );
    }, 0);
  }, [board]);

  const usedCount = useMemo(() => {
    return board.reduce((total, category) => total + category.cells.filter((cell) => cell.used).length, 0);
  }, [board]);

  const totalQuestions = categoryCount * rowCount;
  const canStartGame = missingFieldsCount === 0;
  const currentTeam = teams[currentTurnIndex] ?? teams[0];
  const resolvedGameTopic = gameTopic.trim() || "משחק ג'פרדי";
  const boardTypography = useMemo(() => {
    const categoryScale = clamp(6 / categoryCount, 0.72, 1.28);
    const rowScale = clamp(5 / rowCount, 0.82, 1.18);
    const scale = clamp(categoryScale * rowScale, 0.78, 1.3);

    return {
      categoryFontSize: `${clamp(1.08 * scale, 0.92, 1.5).toFixed(3)}rem`,
      cellFontSize: `${clamp(1.34 * scale, 1.02, 2).toFixed(3)}rem`,
      teamNameFontSize: `${clamp(0.96 * scale, 0.9, 1.2).toFixed(3)}rem`,
      teamScoreFontSize: `${clamp(1.34 * scale, 1.2, 1.9).toFixed(3)}rem`,
    };
  }, [categoryCount, rowCount]);
  const boardOverlayAlpha = boardTheme.boardBackgroundOverlay / 100;
  const boardBackgroundImage = boardTheme.boardBackgroundImage
    ? `linear-gradient(rgba(2, 6, 23, ${boardOverlayAlpha}), rgba(2, 6, 23, ${boardOverlayAlpha})), url("${boardTheme.boardBackgroundImage}")`
    : undefined;
  const modalTextColor = getTextColorForBackground(boardTheme.boardBackgroundColor);
  const modalQuestionTextColor = getTextColorForBackground(boardTheme.cellBgColor);
  const modalAnswerTextColor = getTextColorForBackground(boardTheme.usedCellBgColor);
  const modalPrimaryTextColor = getTextColorForBackground(boardTheme.categoryBgStart);
  const modalCloseTextColor = getTextColorForBackground(boardTheme.usedCellBgColor);
  const modalThemeStyle = {
    ["--modal-border-color" as string]: boardTheme.boardBorderColor,
    ["--modal-bg-color" as string]: `linear-gradient(160deg, ${boardTheme.boardBackgroundColor}, ${boardTheme.usedCellBgColor})`,
    ["--modal-text-color" as string]: modalTextColor,
    ["--modal-question-bg-color" as string]: boardTheme.cellBgColor,
    ["--modal-question-border-color" as string]: boardTheme.cellBorderColor,
    ["--modal-question-text-color" as string]: modalQuestionTextColor,
    ["--modal-answer-label-color" as string]: boardTheme.cellTextColor,
    ["--modal-answer-bg-color" as string]: `linear-gradient(135deg, ${boardTheme.usedCellBgColor}, ${boardTheme.boardBackgroundColor})`,
    ["--modal-answer-border-color" as string]: boardTheme.cellBorderColor,
    ["--modal-answer-text-color" as string]: modalAnswerTextColor,
    ["--modal-turn-bg-color" as string]: boardTheme.boardBackgroundColor,
    ["--modal-turn-border-color" as string]: boardTheme.cellBorderColor,
    ["--modal-value-color" as string]: boardTheme.cellTextColor,
    ["--modal-primary-start" as string]: boardTheme.categoryBgStart,
    ["--modal-primary-end" as string]: boardTheme.categoryBgEnd,
    ["--modal-primary-text" as string]: modalPrimaryTextColor,
    ["--modal-close-bg-color" as string]: boardTheme.usedCellBgColor,
    ["--modal-close-border-color" as string]: boardTheme.cellBorderColor,
    ["--modal-close-text-color" as string]: modalCloseTextColor,
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const encodedGame = params.get(SHARE_QUERY_PARAM);
    if (!encodedGame) return;

    try {
      const decodedPayload = decodeBase64Url(encodedGame);
      const parsed = JSON.parse(decodedPayload) as Partial<SharePayload>;
      const shareAccess: ShareAccess = parsed.access === "edit" ? "edit" : "view";
      const canShareEditFromLink =
        typeof parsed.canShareEdit === "boolean" ? parsed.canShareEdit : shareAccess === "edit";
      const sharedGame = parsed.game;
      if (!sharedGame || !Array.isArray(sharedGame.board) || sharedGame.board.length === 0) {
        throw new Error("Invalid share payload");
      }

      const importedCategoryCount = clamp(sharedGame.board.length, MIN_CATEGORIES, MAX_CATEGORIES);
      const maxRowsInBoard = Math.max(...sharedGame.board.map((category) => category?.cells?.length ?? 0));
      const importedRowCount = clamp(maxRowsInBoard || MIN_ROWS, MIN_ROWS, MAX_ROWS);
      const explicitValues = sharedGame.board.reduce<number[]>((values, category) => {
        const categoryValues = (category?.cells ?? [])
          .map((cell) => Number(cell?.value))
          .filter((value): value is number => Number.isFinite(value) && value > 0);
        return values.concat(categoryValues);
      }, []);
      const importedBaseValue = clamp(
        explicitValues.length > 0 ? Math.min(...explicitValues) : 200,
        MIN_BASE_VALUE,
        MAX_BASE_VALUE,
      );

      const nextBoard: CategoryData[] = Array.from({ length: importedCategoryCount }, (_, categoryIndex) => {
        const sourceCategory = sharedGame.board?.[categoryIndex];
        return {
          title:
            typeof sourceCategory?.title === "string" && sourceCategory.title.trim()
              ? sourceCategory.title
              : `קטגוריה ${categoryIndex + 1}`,
          cells: Array.from({ length: importedRowCount }, (_, rowIndex) => {
            const sourceCell = sourceCategory?.cells?.[rowIndex];
            const rawValue = Number(sourceCell?.value);
            return {
              value:
                Number.isFinite(rawValue) && rawValue > 0
                  ? Math.round(rawValue)
                  : (rowIndex + 1) * importedBaseValue,
              question: typeof sourceCell?.question === "string" ? sourceCell.question : "",
              answer: typeof sourceCell?.answer === "string" ? sourceCell.answer : "",
              used: Boolean(sourceCell?.used),
            };
          }),
        };
      });

      const sharedTeams = Array.isArray(sharedGame.teams) ? sharedGame.teams : [];
      const importedTeamCount = clamp(sharedTeams.length || 2, MIN_TEAMS, MAX_TEAMS);
      const normalizedTurnIndex = Number.isFinite(Number(sharedGame.currentTurnIndex))
        ? clamp(Math.round(Number(sharedGame.currentTurnIndex)), 0, importedTeamCount - 1)
        : 0;

      setCategoryCount(importedCategoryCount);
      setRowCount(importedRowCount);
      setBaseValue(importedBaseValue);
      setGameTopic(sharedGame.gameTopic?.trim() || "משחק ג'פרדי");
      setBoardTheme(resolveBoardTheme(sharedGame.boardTheme));
      setBoard(nextBoard);
      setTeams(
        Array.from({ length: importedTeamCount }, (_, index) => {
          const sourceTeam = sharedTeams[index];
          const sourceScore = Number(sourceTeam?.score);
          return {
            id: `team-${index + 1}`,
            name:
              typeof sourceTeam?.name === "string" && sourceTeam.name.trim()
                ? sourceTeam.name
                : `קבוצה ${index + 1}`,
            score: Number.isFinite(sourceScore) ? Math.round(sourceScore) : 0,
          };
        }),
      );
      setCurrentTurnIndex(normalizedTurnIndex);
      setActiveCell(null);
      setShowAnswer(false);
      setDidScoreCurrentQuestion(false);
      setIsSharedViewOnly(shareAccess === "view");
      setCanCreateEditShare(canShareEditFromLink);
      setMode("game");
      setStatusMessage("");
    } catch {
      setIsSharedViewOnly(false);
      setCanCreateEditShare(true);
      setStatusMessage("קישור המשחק אינו תקין או פגום.");
    }
  }, []);

  const updateBoardShape = (nextCategoryCount: number, nextRowCount: number, nextBaseValue: number) => {
    setBoard((previous) => resizeBoard(previous, nextCategoryCount, nextRowCount, nextBaseValue));
  };

  const updateCategoryCount = (nextValue: number) => {
    const clamped = clamp(nextValue, MIN_CATEGORIES, MAX_CATEGORIES);
    setCategoryCount(clamped);
    updateBoardShape(clamped, rowCount, baseValue);
  };

  const updateRowCount = (nextValue: number) => {
    const clamped = clamp(nextValue, MIN_ROWS, MAX_ROWS);
    setRowCount(clamped);
    updateBoardShape(categoryCount, clamped, baseValue);
  };

  const updateBaseValue = (nextValue: number) => {
    const clamped = clamp(nextValue, MIN_BASE_VALUE, MAX_BASE_VALUE);
    setBaseValue(clamped);
    updateBoardShape(categoryCount, rowCount, clamped);
  };

  const updateCategoryTitle = (categoryIndex: number, title: string) => {
    setBoard((previous) =>
      previous.map((category, index) => (index === categoryIndex ? { ...category, title } : category)),
    );
  };

  const updateCellText = (
    categoryIndex: number,
    rowIndex: number,
    field: "question" | "answer",
    text: string,
  ) => {
    setBoard((previous) =>
      previous.map((category, cIndex) => {
        if (cIndex !== categoryIndex) return category;
        return {
          ...category,
          cells: category.cells.map((cell, rIndex) =>
            rIndex === rowIndex ? { ...cell, [field]: text } : cell,
          ),
        };
      }),
    );
  };

  const updateTeamCount = (nextCount: number) => {
    const clamped = clamp(nextCount, MIN_TEAMS, MAX_TEAMS);
    setTeams((previous) =>
      Array.from({ length: clamped }, (_, index) => {
        return (
          previous[index] ?? {
            id: `team-${index + 1}`,
            name: `קבוצה ${index + 1}`,
            score: 0,
          }
        );
      }),
    );
    setCurrentTurnIndex((previous) => (clamped > 0 ? previous % clamped : 0));
  };

  const updateTeamName = (teamId: string, name: string) => {
    setTeams((previous) => previous.map((team) => (team.id === teamId ? { ...team, name } : team)));
  };

  const activePaletteId = useMemo(() => {
    const matched = BOARD_THEME_PALETTES.find((palette) =>
      BOARD_THEME_COLOR_KEYS.every((key) => boardTheme[key] === palette.colors[key]),
    );
    return matched?.id ?? null;
  }, [boardTheme]);

  const applyPalette = (paletteId: string) => {
    const palette = BOARD_THEME_PALETTES.find((candidate) => candidate.id === paletteId);
    if (!palette) return;
    setBoardTheme((previous) => ({
      ...previous,
      ...palette.colors,
    }));
    setStatusMessage(`הוחלה פלטת צבעים: ${palette.name}.`);
  };

  const updateBoardThemeOverlay = (value: number) => {
    setBoardTheme((previous) => ({ ...previous, boardBackgroundOverlay: clamp(value, 0, 100) }));
  };

  const importBoardBackgroundImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatusMessage("ניתן להעלות רק קובצי תמונה לרקע.");
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("failed"));
        reader.readAsDataURL(file);
      });
      setBoardTheme((previous) => ({ ...previous, boardBackgroundImage: dataUrl }));
      setStatusMessage("תמונת הרקע נטענה בהצלחה.");
    } catch {
      setStatusMessage("שגיאה בטעינת תמונת הרקע.");
    } finally {
      event.target.value = "";
    }
  };

  const removeBoardBackgroundImage = () => {
    setBoardTheme((previous) => ({ ...previous, boardBackgroundImage: null }));
    setStatusMessage("תמונת הרקע הוסרה.");
  };

  const resetBoardTheme = () => {
    setBoardTheme(DEFAULT_BOARD_THEME);
    setStatusMessage("עיצוב הלוח אופס לברירת המחדל.");
  };

  const copyAiPromptToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(aiPromptText);
      setStatusMessage("הפרומפט הועתק ללוח.");
    } catch {
      setStatusMessage("לא ניתן להעתיק אוטומטית. סמני את הטקסט והעתיקי ידנית.");
    }
  };

  const copyActiveGameLink = async (access: ShareAccess) => {
    if (mode !== "game") {
      setStatusMessage("קישור שיתוף זמין רק בזמן משחק פעיל.");
      return;
    }
    if (access === "edit" && !canCreateEditShare) {
      setStatusMessage("בקישור זה אין הרשאה ליצירת שיתוף לעריכה.");
      return;
    }

    try {
      const payload: SharePayload = {
        version: 1,
        access,
        canShareEdit: access === "edit",
        game: {
          gameTopic: resolvedGameTopic,
          boardTheme: { ...boardTheme, boardBackgroundImage: null },
          board: board.map((category) => ({
            title: category.title,
            cells: category.cells.map((cell) => ({
              value: cell.value,
              question: cell.question,
              answer: cell.answer,
              used: cell.used,
            })),
          })),
          teams: teams.map((team) => ({
            name: team.name,
            score: team.score,
          })),
          currentTurnIndex,
        },
      };

      const encodedPayload = encodeBase64Url(JSON.stringify(payload));
      const shareUrl = new URL(window.location.href);
      shareUrl.searchParams.set(SHARE_QUERY_PARAM, encodedPayload);
      const directLink = shareUrl.toString();
      await navigator.clipboard.writeText(directLink);
      setStatusMessage(
        access === "view"
          ? "קישור שיתוף לצפייה הועתק ללוח."
          : "קישור שיתוף לעריכה הועתק ללוח.",
      );
    } catch {
      setStatusMessage("לא ניתן ליצור קישור שיתוף כרגע.");
    }
  };

  const startGame = () => {
    if (!canStartGame) {
      setStatusMessage("אי אפשר להתחיל משחק לפני שממלאים את כל השאלות והתשובות.");
      return;
    }

    if (!gameTopic.trim()) {
      setGameTopic("משחק ג'פרדי");
    }

    setBoard((previous) =>
      previous.map((category) => ({
        ...category,
        cells: category.cells.map((cell) => ({ ...cell, used: false })),
      })),
    );
    setTeams((previous) => previous.map((team) => ({ ...team, score: 0 })));
    setCurrentTurnIndex(0);
    setActiveCell(null);
    setShowAnswer(false);
    setDidScoreCurrentQuestion(false);
    setIsSharedViewOnly(false);
    setCanCreateEditShare(true);
    setStatusMessage("");
    setMode("game");
  };

  const returnToEditor = () => {
    if (isSharedViewOnly) {
      setStatusMessage("קישור זה מוגדר לצפייה בלבד.");
      return;
    }
    setActiveCell(null);
    setShowAnswer(false);
    setDidScoreCurrentQuestion(false);
    setMode("editor");
  };

  const openQuestion = (categoryIndex: number, rowIndex: number) => {
    const cell = board[categoryIndex]?.cells[rowIndex];
    if (!cell || cell.used) return;

    setActiveCell({ categoryIndex, rowIndex });
    setShowAnswer(false);
    setDidScoreCurrentQuestion(false);
  };

  const closeQuestion = () => {
    setActiveCell(null);
    setShowAnswer(false);
    setDidScoreCurrentQuestion(false);
  };

  const applyScore = (delta: number) => {
    if (!currentTeam || didScoreCurrentQuestion) return;
    setTeams((previous) =>
      previous.map((team, index) =>
        index === currentTurnIndex ? { ...team, score: team.score + delta } : team,
      ),
    );
    setDidScoreCurrentQuestion(true);
  };

  const finishQuestion = () => {
    if (!activeCell) return;

    setBoard((previous) =>
      previous.map((category, cIndex) => {
        if (cIndex !== activeCell.categoryIndex) return category;
        return {
          ...category,
          cells: category.cells.map((cell, rIndex) =>
            rIndex === activeCell.rowIndex ? { ...cell, used: true } : cell,
          ),
        };
      }),
    );

    setCurrentTurnIndex((previous) => (teams.length > 0 ? (previous + 1) % teams.length : 0));
    closeQuestion();
  };

  const resetGameBoard = () => {
    setBoard((previous) =>
      previous.map((category) => ({
        ...category,
        cells: category.cells.map((cell) => ({ ...cell, used: false })),
      })),
    );
    setTeams((previous) => previous.map((team) => ({ ...team, score: 0 })));
    setCurrentTurnIndex(0);
    closeQuestion();
  };

  const exportBoardToJson = () => {
    const payload: ExportPayload = {
      version: 1,
      settings: {
        gameTopic: resolvedGameTopic,
        categoryCount,
        rowCount,
        baseValue,
        teamCount: teams.length,
        teamNames: teams.map((team) => team.name),
        boardTheme,
      },
      categories: board.map((category) => ({
        title: category.title,
        cells: category.cells.map((cell) => ({
          value: cell.value,
          question: cell.question,
          answer: cell.answer,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "dna-jeopardy-board.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsvTemplate = () => {
    const templateLines = ["category,value,question,answer"];
    const defaultValues = [200, 400, 600, 800, 1000];
    for (let category = 1; category <= 6; category += 1) {
      defaultValues.forEach((value) => {
        templateLines.push(`${category},${value},,`);
      });
    }
    const csvContent = `\uFEFF${templateLines.join("\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "jeopardy-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importBoardFromCsvFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = (await file.text()).replace(/^\uFEFF/, "");
      const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
      const delimiter = detectDelimiter(firstLine);
      const rows = parseCsvRows(text, delimiter);
      if (rows.length < 2) {
        throw new Error("CSV must contain header and at least one data row.");
      }

      const headers = rows[0].map(normalizeHeader);
      const findHeaderIndex = (aliases: string[]) => headers.findIndex((header) => aliases.includes(header));

      const categoryIndex = findHeaderIndex(["category", "קטגוריה", "topic", "subject", "נושא"]);
      const valueIndex = findHeaderIndex(["value", "points", "score", "ניקוד", "ערך"]);
      const questionIndex = findHeaderIndex(["question", "q", "שאלה"]);
      const answerIndex = findHeaderIndex(["answer", "a", "תשובה"]);

      if (categoryIndex === -1 || questionIndex === -1 || answerIndex === -1) {
        throw new Error("Missing required columns.");
      }

      const parsedRows: CsvQuestionRow[] = [];
      rows.slice(1).forEach((row, rowNumber) => {
        const category = (row[categoryIndex] ?? "").trim();
        const rawValue = valueIndex !== -1 ? (row[valueIndex] ?? "").trim() : "";
        const question = (row[questionIndex] ?? "").trim();
        const answer = (row[answerIndex] ?? "").trim();
        const isBlankRow = !category && !rawValue && !question && !answer;
        if (isBlankRow) return;

        if (!category) {
          throw new Error(`Row ${rowNumber + 2} is missing category.`);
        }

        let value: number | null = null;
        if (valueIndex !== -1) {
          if (rawValue) {
            const parsedValue = Number(rawValue.replace(",", "."));
            if (Number.isFinite(parsedValue) && parsedValue > 0) {
              value = Math.round(parsedValue);
            }
          }
        }

        parsedRows.push({ category, question, answer, value });
      });

      if (parsedRows.length === 0) {
        throw new Error("No valid rows found in CSV.");
      }

      const groupedByCategory = new Map<string, CsvQuestionRow[]>();
      parsedRows.forEach((row) => {
        if (!groupedByCategory.has(row.category)) {
          groupedByCategory.set(row.category, []);
        }
        groupedByCategory.get(row.category)?.push(row);
      });

      const categoryNames = Array.from(groupedByCategory.keys()).slice(0, MAX_CATEGORIES);
      if (categoryNames.length < MIN_CATEGORIES) {
        throw new Error("At least 2 categories are required.");
      }

      const maxRowsInCategory = Math.max(
        ...categoryNames.map((categoryName) => groupedByCategory.get(categoryName)?.length ?? 0),
      );
      const importedRowCount = clamp(maxRowsInCategory, MIN_ROWS, MAX_ROWS);

      const explicitValues = parsedRows
        .map((row) => row.value)
        .filter((value): value is number => value !== null && Number.isFinite(value) && value > 0);
      const importedBaseValue = clamp(
        explicitValues.length > 0 ? Math.min(...explicitValues) : baseValue,
        MIN_BASE_VALUE,
        MAX_BASE_VALUE,
      );

      const importedBoard: CategoryData[] = categoryNames.map((categoryName) => {
        const sourceRows = (groupedByCategory.get(categoryName) ?? []).slice(0, importedRowCount);
        return {
          title: categoryName,
          cells: Array.from({ length: importedRowCount }, (_, rowIndex) => {
            const source = sourceRows[rowIndex];
            return {
              value: source?.value ?? (rowIndex + 1) * importedBaseValue,
              question: source?.question ?? "",
              answer: source?.answer ?? "",
              used: false,
            };
          }),
        };
      });

      setCategoryCount(categoryNames.length);
      setRowCount(importedRowCount);
      setBaseValue(importedBaseValue);
      setBoard(importedBoard);
      setCurrentTurnIndex(0);
      setActiveCell(null);
      setShowAnswer(false);
      setDidScoreCurrentQuestion(false);
      setMode("editor");

      const categoryCutNotice =
        groupedByCategory.size > categoryNames.length ? " חלק מהקטגוריות קוצרו למקסימום הנתמך." : "";
      const rowCutNotice = maxRowsInCategory > importedRowCount ? " חלק מהשאלות קוצרו למקסימום השורות." : "";
      setStatusMessage(`ייבוא CSV הצליח.${categoryCutNotice}${rowCutNotice}`);
    } catch {
      setStatusMessage("שגיאה בייבוא CSV. ודאי שיש עמודות category/question/answer.");
    } finally {
      event.target.value = "";
    }
  };

  const importBoardFromFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<ExportPayload>;
      if (!parsed.categories || !Array.isArray(parsed.categories) || parsed.categories.length === 0) {
        throw new Error("קובץ לא תקין.");
      }

      const importedCategoryCount = clamp(parsed.categories.length, MIN_CATEGORIES, MAX_CATEGORIES);
      const importedRowCount = clamp(
        parsed.settings?.rowCount ?? parsed.categories[0]?.cells?.length ?? 5,
        MIN_ROWS,
        MAX_ROWS,
      );
      const importedBaseValue = clamp(parsed.settings?.baseValue ?? 200, MIN_BASE_VALUE, MAX_BASE_VALUE);

      const nextBoard = Array.from({ length: importedCategoryCount }, (_, categoryIndex) => {
        const sourceCategory = parsed.categories?.[categoryIndex];
        return {
          title:
            typeof sourceCategory?.title === "string" && sourceCategory.title.trim()
              ? sourceCategory.title
              : `קטגוריה ${categoryIndex + 1}`,
          cells: Array.from({ length: importedRowCount }, (_, rowIndex) => {
            const sourceCell = sourceCategory?.cells?.[rowIndex];
            return {
              value: (rowIndex + 1) * importedBaseValue,
              question: typeof sourceCell?.question === "string" ? sourceCell.question : "",
              answer: typeof sourceCell?.answer === "string" ? sourceCell.answer : "",
              used: false,
            };
          }),
        };
      });

      const importedTeamNames = parsed.settings?.teamNames ?? [];
      const importedTeamCount = clamp(
        parsed.settings?.teamCount ?? importedTeamNames.length ?? 2,
        MIN_TEAMS,
        MAX_TEAMS,
      );

      setCategoryCount(importedCategoryCount);
      setRowCount(importedRowCount);
      setBaseValue(importedBaseValue);
      setGameTopic(parsed.settings?.gameTopic?.trim() || "משחק ג'פרדי");
      setBoardTheme(resolveBoardTheme(parsed.settings?.boardTheme));
      setBoard(nextBoard);
      setTeams(
        Array.from({ length: importedTeamCount }, (_, index) => ({
          id: `team-${index + 1}`,
          name: importedTeamNames[index] || `קבוצה ${index + 1}`,
          score: 0,
        })),
      );
      setCurrentTurnIndex(0);
      setMode("editor");
      setStatusMessage("הלוח נטען בהצלחה.");
    } catch {
      setStatusMessage("שגיאה בייבוא הקובץ. ודאי שזה JSON בפורמט הנתמך.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="page-shell" dir="rtl">
      {!(mode === "game" && isSharedViewOnly) && (
        <header className="top-header">
          {mode === "editor" ? (
            <>
              <h1>מחולל ג'פרדי</h1>
              <p>מצב עריכה: בונים את הלוח, מגדירים נושא, קבוצות ושאלות.</p>
            </>
          ) : (
            <>
              <h1>{resolvedGameTopic}</h1>
              <p>מצב משחק פעיל: הלוח נעול לעריכה עד חזרה למצב עריכה.</p>
            </>
          )}
        </header>
      )}

      {mode === "editor" ? (
        <section className="toolbar-card editor-toolbar">
          <div className="toolbar-group">
            <strong>מצב:</strong>
            <span className="mode-pill">עריכת לוח</span>
          </div>
          <div className="toolbar-actions">
            <button type="button" onClick={downloadCsvTemplate}>
              הורדת תבנית CSV
            </button>
            <button type="button" onClick={() => csvImportInputRef.current?.click()}>
              ייבוא CSV
            </button>
            <input
              ref={csvImportInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={importBoardFromCsvFile}
              hidden
            />
            <button type="button" onClick={exportBoardToJson}>
              ייצוא JSON
            </button>
            <button type="button" onClick={() => importInputRef.current?.click()}>
              ייבוא JSON
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              onChange={importBoardFromFile}
              hidden
            />
            <button type="button" onClick={startGame} className="primary-button" disabled={!canStartGame}>
              הפעל משחק
            </button>
          </div>
        </section>
      ) : (
        <section className="toolbar-card game-toolbar">
          <div className="toolbar-group">
            <strong>מצב:</strong>
            <span className="mode-pill">משחק פעיל</span>
          </div>
          <div className="toolbar-actions">
            <button type="button" onClick={() => copyActiveGameLink("view")}>
              שיתוף לצפייה
            </button>
            {canCreateEditShare && (
              <button type="button" onClick={() => copyActiveGameLink("edit")}>
                שיתוף לעריכה
              </button>
            )}
            {isSharedViewOnly && (
              <label className="viewer-team-count">
                מספר קבוצות
                <select
                  value={teams.length}
                  onChange={(event) => updateTeamCount(Number(event.target.value))}
                  aria-label="בחירת מספר קבוצות"
                >
                  {Array.from({ length: MAX_TEAMS - MIN_TEAMS + 1 }, (_, index) => {
                    const count = MIN_TEAMS + index;
                    return (
                      <option key={`shared-team-count-${count}`} value={count}>
                        {count}
                      </option>
                    );
                  })}
                </select>
              </label>
            )}
            <button type="button" onClick={resetGameBoard}>
              איפוס ניקוד ולוח
            </button>
            {!isSharedViewOnly && (
              <button type="button" onClick={returnToEditor} className="primary-button">
                חזרה לעריכה
              </button>
            )}
            {isSharedViewOnly && <span className="mode-pill readonly-pill">צפייה בלבד</span>}
          </div>
        </section>
      )}

      {statusMessage && <div className="status-message">{statusMessage}</div>}

      {mode === "editor" ? (
        <>
          <section className="card">
            <h2>הגדרות לוח</h2>
            <div className="settings-grid">
              <label className="topic-field">
                נושא המשחק
                <input
                  type="text"
                  value={gameTopic}
                  onChange={(event) => setGameTopic(event.target.value)}
                  placeholder="לדוגמה: ביולוגיה מולקולרית"
                />
              </label>
              <label>
                מספר קטגוריות
                <input
                  type="number"
                  min={MIN_CATEGORIES}
                  max={MAX_CATEGORIES}
                  value={categoryCount}
                  onChange={(event) => updateCategoryCount(Number(event.target.value))}
                />
              </label>
              <label>
                מספר שורות ניקוד
                <input
                  type="number"
                  min={MIN_ROWS}
                  max={MAX_ROWS}
                  value={rowCount}
                  onChange={(event) => updateRowCount(Number(event.target.value))}
                />
              </label>
              <label>
                ניקוד בסיס
                <input
                  type="number"
                  min={MIN_BASE_VALUE}
                  max={MAX_BASE_VALUE}
                  step={100}
                  value={baseValue}
                  onChange={(event) => updateBaseValue(Number(event.target.value))}
                />
              </label>
              <label>
                מספר קבוצות
                <input
                  type="number"
                  min={MIN_TEAMS}
                  max={MAX_TEAMS}
                  value={teams.length}
                  onChange={(event) => updateTeamCount(Number(event.target.value))}
                />
              </label>
            </div>
            <p className="hint-text">
              חייבים למלא את כל השאלות והתשובות לפני הפעלת המשחק. חסרים כרגע: {missingFieldsCount}.
            </p>
          </section>

          <section className="card board-theme-card">
            <div className="board-theme-header">
              <h2>עיצוב לוח</h2>
              <div className="board-theme-actions">
                <button type="button" onClick={() => boardBackgroundInputRef.current?.click()}>
                  העלאת תמונת רקע
                </button>
                <input
                  ref={boardBackgroundInputRef}
                  type="file"
                  accept="image/*"
                  onChange={importBoardBackgroundImage}
                  hidden
                />
                <button type="button" onClick={removeBoardBackgroundImage} disabled={!boardTheme.boardBackgroundImage}>
                  הסרת תמונה
                </button>
                <button type="button" onClick={resetBoardTheme}>
                  איפוס עיצוב
                </button>
              </div>
            </div>

            <div className="palette-grid">
              {BOARD_THEME_PALETTES.map((palette) => {
                const isActive = activePaletteId === palette.id;
                return (
                  <button
                    key={palette.id}
                    type="button"
                    onClick={() => applyPalette(palette.id)}
                    className={`palette-card ${isActive ? "is-active" : ""}`}
                    style={{ borderColor: isActive ? palette.colors.boardBorderColor : undefined }}
                  >
                    <div className="palette-title-row">
                      <strong>{palette.name}</strong>
                      {isActive && <span>נבחרה</span>}
                    </div>
                    <p>{palette.description}</p>
                    <div className="palette-swatches">
                      <span style={{ backgroundColor: palette.colors.boardBackgroundColor }} />
                      <span style={{ backgroundColor: palette.colors.categoryBgStart }} />
                      <span style={{ backgroundColor: palette.colors.categoryBgEnd }} />
                      <span style={{ backgroundColor: palette.colors.cellBgColor }} />
                      <span style={{ backgroundColor: palette.colors.cellTextColor }} />
                    </div>
                  </button>
                );
              })}
            </div>

            <label className="overlay-control">
              כהות שכבת רקע מעל התמונה: {boardTheme.boardBackgroundOverlay}%
              <input
                type="range"
                min={0}
                max={100}
                value={boardTheme.boardBackgroundOverlay}
                onChange={(event) => updateBoardThemeOverlay(Number(event.target.value))}
              />
            </label>

            <div className="board-theme-preview" style={{ borderColor: boardTheme.boardBorderColor }}>
              <div
                className="board-theme-preview-surface"
                style={{
                  backgroundColor: boardTheme.boardBackgroundColor,
                  backgroundImage: boardBackgroundImage,
                  backgroundSize: boardTheme.boardBackgroundImage ? "cover" : undefined,
                  backgroundPosition: boardTheme.boardBackgroundImage ? "center" : undefined,
                }}
              >
                <div
                  className="board-theme-preview-category"
                  style={{
                    borderColor: boardTheme.cellBorderColor,
                    color: boardTheme.categoryTextColor,
                    backgroundColor: boardTheme.categoryBgStart,
                  }}
                >
                  קטגוריה לדוגמה
                </div>
                <div
                  className="board-theme-preview-cell"
                  style={{
                    borderColor: boardTheme.cellBorderColor,
                    color: boardTheme.cellTextColor,
                    backgroundColor: boardTheme.cellBgColor,
                  }}
                >
                  400
                </div>
              </div>
            </div>
          </section>

          <section className="card">
            <h2>שמות קבוצות</h2>
            <div className="teams-edit-grid">
              {teams.map((team, index) => {
                const teamColor = TEAM_COLORS[index % TEAM_COLORS.length];
                return (
                <label
                  key={team.id}
                  className="team-name-field"
                  style={{
                    ["--team-accent" as string]: teamColor,
                    ["--team-accent-soft" as string]: `${teamColor}22`,
                  }}
                >
                  קבוצה {index + 1}
                  <input value={team.name} onChange={(event) => updateTeamName(team.id, event.target.value)} />
                </label>
              );
            })}
            </div>
          </section>

          <section className="card ai-prompt-card">
            <div className="ai-prompt-header">
              <h2>פרומפט מוכן ליצירת CSV ב-AI</h2>
              <button type="button" onClick={copyAiPromptToClipboard}>
                העתקת הפרומפט
              </button>
            </div>
            <p className="ai-prompt-note">
              אפשר להדביק את הטקסט בכל מחולל שפה, להחליף את הערכים שבסוגריים מרובעים, ולבקש פלט CSV.
            </p>
            <textarea
              className="ai-prompt-textarea"
              rows={6}
              value={aiPromptText}
              onChange={(event) => setAiPromptText(event.target.value)}
            />
          </section>

          <section
            className="editor-grid"
            style={{ gridTemplateColumns: `repeat(${categoryCount}, minmax(0, 1fr))` }}
          >
            {board.map((category, categoryIndex) => (
              <article key={`editor-${categoryIndex}`} className="category-editor">
                <label className="category-title-input">
                  <span>שם קטגוריה</span>
                  <input
                    value={category.title}
                    onChange={(event) => updateCategoryTitle(categoryIndex, event.target.value)}
                  />
                </label>

                {category.cells.map((cell, rowIndex) => (
                  <div key={`cell-${categoryIndex}-${rowIndex}`} className="cell-editor">
                    <h3>
                      <ValueMark value={cell.value} />
                    </h3>
                    <label>
                      שאלה
                      <textarea
                        rows={3}
                        value={cell.question}
                        onChange={(event) =>
                          updateCellText(categoryIndex, rowIndex, "question", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      תשובה
                      <textarea
                        rows={3}
                        value={cell.answer}
                        onChange={(event) =>
                          updateCellText(categoryIndex, rowIndex, "answer", event.target.value)
                        }
                      />
                    </label>
                  </div>
                ))}
              </article>
            ))}
          </section>
        </>
      ) : (
        <>
          <section className="game-topic-card">
            <h2>{resolvedGameTopic}</h2>
          </section>

          <section
            className="teams-scoreboard"
            style={{
              ["--team-name-font-size" as string]: boardTypography.teamNameFontSize,
              ["--team-score-font-size" as string]: boardTypography.teamScoreFontSize,
            }}
          >
            {teams.map((team, index) => {
              const isCurrent = index === currentTurnIndex;
              const teamColor = TEAM_COLORS[index % TEAM_COLORS.length];
              return (
                <div
                  key={`score-${team.id}`}
                  className={`team-score-card ${isCurrent ? "is-current-turn" : ""}`}
                  style={{
                    ["--team-accent" as string]: teamColor,
                    ["--team-accent-soft" as string]: `${teamColor}20`,
                    ["--team-accent-strong" as string]: `${teamColor}55`,
                  }}
                >
                  {isSharedViewOnly ? (
                    <input
                      className="team-score-name-input"
                      value={team.name}
                      onChange={(event) => updateTeamName(team.id, event.target.value)}
                      aria-label={`שם קבוצה ${index + 1}`}
                    />
                  ) : (
                    <strong>{team.name}</strong>
                  )}
                  <span>{team.score}</span>
                  {isCurrent && <small>תור נוכחי</small>}
                </div>
              );
            })}
          </section>

          <section
            className="game-board"
            style={{
              borderColor: boardTheme.boardBorderColor,
              backgroundColor: boardTheme.boardBackgroundColor,
              backgroundImage: boardBackgroundImage,
              backgroundSize: boardTheme.boardBackgroundImage ? "cover" : undefined,
              backgroundPosition: boardTheme.boardBackgroundImage ? "center" : undefined,
            }}
          >
            <div
              className="game-grid"
              style={{
                gridTemplateColumns: `repeat(${categoryCount}, minmax(0, 1fr))`,
                ["--category-font-size" as string]: boardTypography.categoryFontSize,
                ["--cell-font-size" as string]: boardTypography.cellFontSize,
                ["--category-bg-start" as string]: boardTheme.categoryBgStart,
                ["--category-bg-end" as string]: boardTheme.categoryBgEnd,
                ["--category-text-color" as string]: boardTheme.categoryTextColor,
                ["--cell-bg-color" as string]: boardTheme.cellBgColor,
                ["--cell-text-color" as string]: boardTheme.cellTextColor,
                ["--cell-border-color" as string]: boardTheme.cellBorderColor,
                ["--used-cell-bg-color" as string]: boardTheme.usedCellBgColor,
                ["--used-cell-text-color" as string]: boardTheme.usedCellTextColor,
              }}
            >
              {board.map((category, categoryIndex) => (
                <div key={`game-category-${categoryIndex}`} className="game-category-title">
                  {category.title}
                </div>
              ))}

              {Array.from({ length: rowCount }, (_, rowIndex) =>
                board.map((category, categoryIndex) => {
                  const cell = category.cells[rowIndex];
                  const isUsed = !cell || cell.used;
                  return (
                    <button
                      key={`game-cell-${categoryIndex}-${rowIndex}`}
                      type="button"
                      onClick={() => openQuestion(categoryIndex, rowIndex)}
                      disabled={isUsed}
                      className={`game-cell ${isUsed ? "used" : ""}`}
                    >
                      {isUsed ? "✓" : <ValueMark value={cell.value} />}
                    </button>
                  );
                }),
              )}
            </div>
          </section>

          <p className="hint-text">
            התקדמות משחק: {usedCount} מתוך {totalQuestions} שאלות סומנו כמשומשות.
          </p>
        </>
      )}

      {activeQuestion && (
        <div className="modal-overlay">
          <div className="modal" style={modalThemeStyle}>
            <div className="modal-header">
              <ValueMark value={activeQuestion.value} />
              <button type="button" onClick={closeQuestion} className="modal-close-button">
                סגירה
              </button>
            </div>

            <div className="modal-question">{activeQuestion.question}</div>

            {!showAnswer ? (
              <button type="button" onClick={() => setShowAnswer(true)} className="primary-button full-width">
                חשיפת תשובה
              </button>
            ) : (
              <div className="answer-panel">
                <h4>תשובה</h4>
                <p>{activeQuestion.answer}</p>

                {currentTeam && (
                  <div className="turn-card">
                    <div className="turn-row">
                      <strong>{currentTeam.name}</strong>
                      <span>{currentTeam.score}</span>
                    </div>
                    <div className="score-actions">
                      <button
                        type="button"
                        disabled={didScoreCurrentQuestion}
                        onClick={() => applyScore(activeQuestion.value)}
                        className="correct-button"
                      >
                        תשובה נכונה (+{activeQuestion.value})
                      </button>
                      <button
                        type="button"
                        disabled={didScoreCurrentQuestion}
                        onClick={() => applyScore(-activeQuestion.value)}
                        className="wrong-button"
                      >
                        תשובה שגויה (-{activeQuestion.value})
                      </button>
                    </div>
                  </div>
                )}

                <button type="button" onClick={finishQuestion} className="primary-button full-width">
                  סיום שאלה והעברת תור לקבוצה הבאה
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;




