import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

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
  pageBackgroundImage: string | null;
  pageBackgroundOverlay: number;
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

interface GamePageBackgroundPreset {
  id: string;
  name: string;
  image: string;
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

interface ArchiveGameRecord {
  id: string;
  title: string;
  payload: unknown;
  created_at: string;
  updated_at: string;
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
const SERVER_GAME_QUERY_PARAM = "sgame";
const SERVER_ACCESS_QUERY_PARAM = "access";
const SUPABASE_GAMES_TABLE = "jeopardy_games";

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

const GAME_PAGE_BACKGROUND_FILES = [
  "/backgrounds/ant7119__teenager_boy_watching_the_moon_bright_watercolors_a__31e023b8-01bb-44cf-8772-9afc48f25a89_1.png",
  "/backgrounds/ant7119_a_delicate_watercolor_flowers_beguige_tones_high_reso_f69ab29d-5270-47bb-a31d-7c77c8a902b2_3.png",
  "/backgrounds/ant7119_a_delicate_watercolor_flowers_blue_tones_high_resolut_e1d76836-106d-4b7a-b432-4a5c035df3a0_3.png",
  "/backgrounds/ant7119_a_delicate_watercolor_flowers_brown_tones_Moses_high__e1cdaa02-f3f9-44e3-8a25-36ae3bf4dc66_3.png",
  "/backgrounds/ant7119_a_delicate_watercolor_flowers_pink_tones_high_resolut_cc02b3aa-fc34-455e-b7e9-b1e4cf255eaf_0.png",
  "/backgrounds/ant7119_a_delicate_watercolor_stars_white_blue_and_green_tones__ac562747-efef-4bd3-9332-b72920010597.png",
  "/backgrounds/ant7119_a_photograph_of_DNA_copy_space_banner_--ar_4726_--qua_0b263ee9-bcbc-41db-b45c-68e0270be771_2.png",
  "/backgrounds/ant7119_A_watercolor_painting_of_a_woman_seen_from_behind_her_d92727ba-d49e-4a92-b281-a4da3efb4b9b_3.png",
  "/backgrounds/ant7119_ancient_Egypt_copy_space_with_spacefortext_--ar_169_-_1886861f-294a-4136-b7d2-233130708e13_1.png",
  "/backgrounds/ant7119_ancient_Egypt_piramids_copy_space_with_spacefortext_--a_1c25f057-f12d-4024-9169-364fbc87dcdb.png",
  "/backgrounds/ant7119_banner_hd_cow_milk_wheat_beige_light_blue_light_soft__7fcf58d5-ed94-47ff-86a4-f9852150b4dc_2.png",
  "/backgrounds/ant7119_banner_hd_cow_milk_wheat_beige_light_blue_light_soft_co_b7385156-3f60-4602-9566-8425a5b3ec32.png",
  "/backgrounds/ant7119_beige_light_blue_soft_colors_background_--ar_74_--quali_6b709ff6-35c3-4cd4-9d80-fc071148d2d6.png",
  "/backgrounds/ant7119_beige_light_blue_ultra_soft_colors_background_--ar_74_-_6f04d9b5-9183-412f-a5d2-ede46af325d6.png",
  "/backgrounds/ant7119_biblical_figures_in_a_desert_with_sheep_--ar_169_--v__7fa14871-4807-473a-81e6-09da6d7caa45_2.png",
  "/backgrounds/ant7119_Calamagrostis_canescens_one_of_the_most_common_species__78e53fbc-8c2b-4a08-9a79-574cee20734d.png",
  "/backgrounds/ant7119_empty_interior_of_a_museum-like_building_completely_e_95fc752a-5a67-48b1-bc1d-8a8068d110b8_2.png",
  "/backgrounds/ant7119_flip-flops_on_the_beach_on_a_full_moon_night_--ar_169_e1d1a921-dd74-465d-a434-b7d3fa09ecb0_0.png",
  "/backgrounds/ant7119_httpss.mj.run5riRyCCJkfo_an_illustration_of_teen_girl_b17a3664-3e16-4a8d-a5eb-10b53a8297cc_1.png",
  "/backgrounds/ant7119_illustration_of_a_laboratory_sketch_black_and_whitespla_46c9c6ab-9f00-40dc-a53a-415c705557d8.png",
  "/backgrounds/ant7119_interior_of_a_museum-like_building__photorealistic_3d_r_c2d44078-8cf4-4261-be0c-9acadfb0828f.png",
  "/backgrounds/ant7119_Life_Drawing_style_sketch_of_a_inspiring_female_teach_f4f856e6-bdd6-40ef-b136-2241c42a216c_3.png",
  "/backgrounds/ant7119_Life_Drawing_style_sketch_of_a_inspiring_female_teacher_c8c39d51-a598-481f-921e-99ac90bbca14.png",
  "/backgrounds/ant7119_light_blue_and_beige_oil_painting_of_the_horizon_--ar_17028ed6-1343-4063-80e8-59393982f99c_0.png",
  "/backgrounds/ant7119_mistirios_laboratory_with_modern_lab_equipment_alarmed__1c9e6572-f41d-4ccf-9477-86d8134d47d5.png",
  "/backgrounds/ant7119_mistirios_office_with_sofa_pictures_on_the_walls_--ar_1_b65c91f6-51db-4d76-8d4e-20e85b5af0ea.png",
  "/backgrounds/ant7119_spring_delicate_light_begiuge_watercolor_illustration_14685c51-86a1-434a-ac8d-56e28d663b43_2.png",
  "/backgrounds/ant7119_spring_delicate_light_begiuge_watercolor_illustration_c77a4ecd-0217-45cc-95a1-31996fcf13fb_0.png",
  "/backgrounds/ant7119_spring_delicate_light_watercolor_illustration_with_ro_a6c8d853-1984-48d4-aeb5-9dd67caf7edf_3.png",
  "/backgrounds/ant7119_Watercolor_illustration_pastel_blue_green_and_brown_c_356a5bb1-589b-49d1-bf10-38935608746e_2.png",
  "/backgrounds/ant7119_west_wall_Jerusalem_gold_--ar_169_--v_5.1_4daa2642-74b4-422a-9d43-e5824cd8149f_3.png",
  "/backgrounds/ant7119_Wet-on-wet_technique_Soft_feathers_floating_in_the_ai_8871cbea-dc05-454b-83b2-0c5dcd463263_2.png",
  "/backgrounds/mist-teal.svg",
  "/backgrounds/pastel-bloom.svg",
  "/backgrounds/sunset-haze.svg",
] as const;

const GAME_PAGE_BACKGROUND_PRESETS: GamePageBackgroundPreset[] = GAME_PAGE_BACKGROUND_FILES.map(
  (image, index) => ({
    id: `local-bg-${index + 1}`,
    name: buildBackgroundPresetName(image, index),
    image,
  }),
);

const GAME_PAGE_BACKGROUND_MIN_WIDTH = 1920;
const GAME_PAGE_BACKGROUND_MIN_HEIGHT = 1080;
const GAME_PAGE_BACKGROUND_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const GAME_PAGE_BACKGROUND_TARGET_RATIO = 16 / 9;
const GAME_PAGE_BACKGROUND_RATIO_TOLERANCE = 0.22;

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
  pageBackgroundImage: null,
  pageBackgroundOverlay: 58,
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

function getReadableTextColor(
  preferredTextColor: string,
  backgroundColor: string,
  minimumContrast = 3.6,
): string {
  const preferred = normalizeHexColor(preferredTextColor);
  const background = normalizeHexColor(backgroundColor);
  if (!preferred || !background) {
    return getTextColorForBackground(backgroundColor);
  }

  return getContrastRatio(preferred, background) >= minimumContrast
    ? preferred
    : getTextColorForBackground(background);
}

function withAlpha(color: string, alpha: number): string {
  const normalized = normalizeHexColor(color);
  if (!normalized) return color;
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${clamp(alpha, 0, 1)})`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("failed"));
    reader.readAsDataURL(file);
  });
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const dimensions = {
        width: image.naturalWidth,
        height: image.naturalHeight,
      };
      URL.revokeObjectURL(objectUrl);
      resolve(dimensions);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("invalid-image"));
    };
    image.src = objectUrl;
  });
}

function buildBackgroundPresetName(imagePath: string, index: number): string {
  const filename = imagePath.split("/").pop() ?? "";
  const base = filename.replace(/\.[^.]+$/, "");
  const cleaned = base
    .replace(/^ant\d+_?/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b[0-9a-f]{8,}\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return `רקע ${index + 1}`;
  }

  const words = cleaned.split(" ").slice(0, 5);
  return words.join(" ");
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
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
  const boardOverlay = Number.isFinite(theme.boardBackgroundOverlay)
    ? clamp(theme.boardBackgroundOverlay as number, 0, 100)
    : DEFAULT_BOARD_THEME.boardBackgroundOverlay;
  const pageOverlay = Number.isFinite(theme.pageBackgroundOverlay)
    ? clamp(theme.pageBackgroundOverlay as number, 0, 100)
    : DEFAULT_BOARD_THEME.pageBackgroundOverlay;

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
    boardBackgroundOverlay: boardOverlay,
    pageBackgroundImage: theme.pageBackgroundImage ?? DEFAULT_BOARD_THEME.pageBackgroundImage,
    pageBackgroundOverlay: pageOverlay,
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
  const [overlayMessage, setOverlayMessage] = useState<string>("");
  const [overlayAnchor, setOverlayAnchor] = useState<ShareAccess | null>(null);
  const [isSharedViewOnly, setIsSharedViewOnly] = useState(false);
  const [canCreateEditShare, setCanCreateEditShare] = useState(true);
  const [archiveGames, setArchiveGames] = useState<ArchiveGameRecord[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveActionKey, setArchiveActionKey] = useState<string | null>(null);
  const [activeArchiveGameId, setActiveArchiveGameId] = useState<string | null>(null);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [pendingDeleteRecord, setPendingDeleteRecord] = useState<ArchiveGameRecord | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const csvImportInputRef = useRef<HTMLInputElement | null>(null);
  const boardBackgroundInputRef = useRef<HTMLInputElement | null>(null);
  const pageBackgroundInputRef = useRef<HTMLInputElement | null>(null);
  const overlayTimeoutRef = useRef<number | null>(null);

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
  const pageOverlayAlpha = boardTheme.pageBackgroundOverlay / 100;
  const pageImageOverlayStrong = clamp(0.16 + pageOverlayAlpha * 0.72, 0, 0.92);
  const pageImageOverlaySoft = clamp(0.12 + pageOverlayAlpha * 0.58, 0, 0.86);
  const palettePageBackgroundImage =
    `radial-gradient(circle at 82% 10%, ${withAlpha(boardTheme.categoryBgStart, 0.24)}, transparent 46%), ` +
    `radial-gradient(circle at 14% 88%, ${withAlpha(boardTheme.cellBorderColor, 0.2)}, transparent 42%), ` +
    `linear-gradient(145deg, ${boardTheme.boardBackgroundColor}, ${boardTheme.categoryBgEnd} 48%, ${boardTheme.cellBgColor})`;
  const gamePageBackgroundImage = boardTheme.pageBackgroundImage
    ? `linear-gradient(135deg, ${withAlpha(boardTheme.boardBackgroundColor, pageImageOverlayStrong)}, ${withAlpha(boardTheme.categoryBgEnd, pageImageOverlaySoft)}), url("${boardTheme.pageBackgroundImage}")`
    : palettePageBackgroundImage;
  const gameShellTextColor = getTextColorForBackground(boardTheme.categoryBgEnd);
  const gameShellControlTextColor = getTextColorForBackground(boardTheme.boardBackgroundColor);
  const gameShellTopicTextColor = getReadableTextColor(
    boardTheme.categoryTextColor,
    boardTheme.categoryBgEnd,
  );
  const pageShellStyle =
    mode === "game"
      ? {
          backgroundImage: gamePageBackgroundImage,
          backgroundSize: boardTheme.pageBackgroundImage ? "cover" : undefined,
          backgroundPosition: boardTheme.pageBackgroundImage ? "center" : undefined,
          backgroundAttachment: boardTheme.pageBackgroundImage ? "fixed" : undefined,
          ["--game-shell-card-bg" as string]: withAlpha(boardTheme.boardBackgroundColor, 0.64),
          ["--game-shell-card-border" as string]: withAlpha(boardTheme.boardBorderColor, 0.55),
          ["--game-shell-accent-bg" as string]: withAlpha(boardTheme.categoryBgEnd, 0.44),
          ["--game-shell-accent-border" as string]: withAlpha(boardTheme.cellBorderColor, 0.52),
          ["--game-shell-text-color" as string]: gameShellTextColor,
          ["--game-shell-control-bg" as string]: withAlpha(boardTheme.boardBackgroundColor, 0.82),
          ["--game-shell-control-border" as string]: withAlpha(boardTheme.cellBorderColor, 0.62),
          ["--game-shell-control-text" as string]: gameShellControlTextColor,
          ["--game-shell-pill-bg" as string]: withAlpha(boardTheme.categoryBgStart, 0.42),
          ["--game-shell-pill-border" as string]: withAlpha(boardTheme.boardBorderColor, 0.65),
          ["--game-shell-topic-text" as string]: gameShellTopicTextColor,
        }
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

  const buildCurrentGameSnapshot = (options?: { stripInlineImages?: boolean }): SharePayload["game"] => {
    const sanitizeImage = (image: string | null): string | null => {
      if (!image) return null;
      if (options?.stripInlineImages && image.startsWith("data:")) {
        return null;
      }
      return image;
    };

    return {
      gameTopic: resolvedGameTopic,
      boardTheme: {
        ...boardTheme,
        boardBackgroundImage: sanitizeImage(boardTheme.boardBackgroundImage),
        pageBackgroundImage: sanitizeImage(boardTheme.pageBackgroundImage),
      },
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
    };
  };

  const applySharedGameState = (
    sharedGame: SharePayload["game"],
    options: {
      mode: AppMode;
      access: ShareAccess;
      canShareEdit: boolean;
    },
  ) => {
    if (!sharedGame || !Array.isArray(sharedGame.board) || sharedGame.board.length === 0) {
      throw new Error("Invalid game payload");
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
    setIsSharedViewOnly(options.access === "view");
    setCanCreateEditShare(options.canShareEdit);
    setMode(options.mode);
    setStatusMessage("");
  };

  const buildServerGameLink = (gameId: string, access: ShareAccess): string => {
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.delete(SHARE_QUERY_PARAM);
    shareUrl.searchParams.set(SERVER_GAME_QUERY_PARAM, gameId);
    shareUrl.searchParams.set(SERVER_ACCESS_QUERY_PARAM, access);
    return shareUrl.toString();
  };

  const showOverlayMessage = (message: string, anchor: ShareAccess, durationMs = 1000) => {
    setOverlayAnchor(anchor);
    setOverlayMessage(message);
    if (overlayTimeoutRef.current !== null) {
      window.clearTimeout(overlayTimeoutRef.current);
    }
    overlayTimeoutRef.current = window.setTimeout(() => {
      setOverlayMessage("");
      setOverlayAnchor(null);
      overlayTimeoutRef.current = null;
    }, durationMs);
  };

  useEffect(() => {
    return () => {
      if (overlayTimeoutRef.current !== null) {
        window.clearTimeout(overlayTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const encodedGame = params.get(SHARE_QUERY_PARAM);
    const serverGameId = params.get(SERVER_GAME_QUERY_PARAM);
    if (!encodedGame && !serverGameId) return;

    const loadSharedGame = async () => {
      if (encodedGame) {
        const decodedPayload = decodeBase64Url(encodedGame);
        const parsed = JSON.parse(decodedPayload) as Partial<SharePayload>;
        const shareAccess: ShareAccess = parsed.access === "edit" ? "edit" : "view";
        const canShareEditFromLink =
          typeof parsed.canShareEdit === "boolean" ? parsed.canShareEdit : shareAccess === "edit";
        if (!parsed.game) {
          throw new Error("Invalid share payload");
        }
        setActiveArchiveGameId(null);
        applySharedGameState(parsed.game, {
          mode: "game",
          access: shareAccess,
          canShareEdit: canShareEditFromLink,
        });
        return;
      }

      if (!serverGameId) {
        return;
      }
      if (!supabase) {
        setStatusMessage("חסרה הגדרת Supabase לטעינת משחק מהשרת.");
        return;
      }

      const shareAccess: ShareAccess = params.get(SERVER_ACCESS_QUERY_PARAM) === "edit" ? "edit" : "view";
      const { data, error } = await supabase
        .from(SUPABASE_GAMES_TABLE)
        .select("id, payload")
        .eq("id", serverGameId)
        .single();

      if (error || !data) {
        throw new Error("Server game not found");
      }

      applySharedGameState(data.payload as SharePayload["game"], {
        mode: "game",
        access: shareAccess,
        canShareEdit: shareAccess === "edit",
      });
      setActiveArchiveGameId(data.id);
    };

    void loadSharedGame().catch(() => {
      setIsSharedViewOnly(false);
      setCanCreateEditShare(true);
      setStatusMessage("לא ניתן לטעון את המשחק מהקישור.");
    });
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

  const loadArchiveGames = useCallback(async () => {
    if (!supabase) return;
    setArchiveLoading(true);
    try {
      const { data, error } = await supabase
        .from(SUPABASE_GAMES_TABLE)
        .select("id, title, payload, created_at, updated_at")
        .order("updated_at", { ascending: false });

      if (error) {
        throw error;
      }

      setArchiveGames((data ?? []) as ArchiveGameRecord[]);
    } catch {
      setStatusMessage("לא ניתן לטעון את ארכיון המשחקים מהשרת.");
    } finally {
      setArchiveLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || mode !== "editor") return;
    void loadArchiveGames();
  }, [loadArchiveGames, mode]);

  useEffect(() => {
    if (mode !== "editor") {
      setIsArchiveOpen(false);
      setPendingDeleteRecord(null);
    }
  }, [mode]);

  useEffect(() => {
    if (!isArchiveOpen) {
      setPendingDeleteRecord(null);
      return;
    }
  }, [isArchiveOpen]);

  useEffect(() => {
    if (!isArchiveOpen && !pendingDeleteRecord) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (pendingDeleteRecord) {
          setPendingDeleteRecord(null);
          return;
        }
        setIsArchiveOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isArchiveOpen, pendingDeleteRecord]);

  const saveArchiveGameAsNew = async () => {
    if (!supabase) {
      setStatusMessage("חסרה הגדרת Supabase לשמירה בשרת.");
      return;
    }

    setArchiveActionKey("save-new");
    try {
      const { error, data } = await supabase
        .from(SUPABASE_GAMES_TABLE)
        .insert({
          title: resolvedGameTopic,
          payload: buildCurrentGameSnapshot(),
        })
        .select("id")
        .single();

      if (error || !data) {
        throw error;
      }

      setActiveArchiveGameId(data.id);
      setStatusMessage("המשחק נשמר בארכיון כקובץ חדש.");
      await loadArchiveGames();
    } catch {
      setStatusMessage("שמירה כחדש נכשלה.");
    } finally {
      setArchiveActionKey(null);
    }
  };

  const loadArchiveGameIntoEditor = (record: ArchiveGameRecord) => {
    try {
      applySharedGameState(record.payload as SharePayload["game"], {
        mode: "editor",
        access: "edit",
        canShareEdit: true,
      });
      setActiveArchiveGameId(record.id);
      setStatusMessage(`נטען מהארכיון: ${record.title || "ללא כותרת"}.`);
    } catch {
      setStatusMessage("לא ניתן לטעון את הרשומה שנבחרה מהארכיון.");
    }
  };

  const updateArchiveGame = async (recordId: string) => {
    if (!supabase) {
      setStatusMessage("חסרה הגדרת Supabase לעדכון בשרת.");
      return;
    }

    setArchiveActionKey(`update-${recordId}`);
    try {
      const { error } = await supabase
        .from(SUPABASE_GAMES_TABLE)
        .update({
          title: resolvedGameTopic,
          payload: buildCurrentGameSnapshot(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", recordId);

      if (error) {
        throw error;
      }

      setActiveArchiveGameId(recordId);
      setStatusMessage("השינויים נשמרו בארכיון.");
      await loadArchiveGames();
    } catch {
      setStatusMessage("עדכון הרשומה נכשל.");
    } finally {
      setArchiveActionKey(null);
    }
  };

  const requestDeleteArchiveGame = (record: ArchiveGameRecord) => {
    if (archiveActionKey !== null) return;
    setPendingDeleteRecord(record);
  };

  const deleteArchiveGame = async () => {
    const recordId = pendingDeleteRecord?.id;
    if (!recordId) return;
    if (!supabase) {
      setStatusMessage("חסרה הגדרת Supabase למחיקה מהשרת.");
      return;
    }

    setArchiveActionKey(`delete-${recordId}`);
    try {
      const { error } = await supabase.from(SUPABASE_GAMES_TABLE).delete().eq("id", recordId);
      if (error) {
        throw error;
      }

      if (activeArchiveGameId === recordId) {
        setActiveArchiveGameId(null);
      }
      setStatusMessage("הרשומה נמחקה מהארכיון.");
      await loadArchiveGames();
    } catch {
      setStatusMessage("מחיקת הרשומה נכשלה.");
    } finally {
      setArchiveActionKey(null);
      setPendingDeleteRecord(null);
    }
  };

  const copyArchiveViewLink = async (recordId: string) => {
    try {
      await navigator.clipboard.writeText(buildServerGameLink(recordId, "view"));
      setStatusMessage("קישור לצפייה הועתק מהארכיון.");
    } catch {
      setStatusMessage("לא ניתן להעתיק קישור צפייה כרגע.");
    }
  };

  const activePaletteId = useMemo(() => {
    const matched = BOARD_THEME_PALETTES.find((palette) =>
      BOARD_THEME_COLOR_KEYS.every((key) => boardTheme[key] === palette.colors[key]),
    );
    return matched?.id ?? null;
  }, [boardTheme]);

  const activePageBackgroundPresetId = useMemo(() => {
    const matched = GAME_PAGE_BACKGROUND_PRESETS.find(
      (preset) => preset.image === boardTheme.pageBackgroundImage,
    );
    return matched?.id ?? null;
  }, [boardTheme.pageBackgroundImage]);

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

  const updatePageBackgroundOverlay = (value: number) => {
    setBoardTheme((previous) => ({ ...previous, pageBackgroundOverlay: clamp(value, 0, 100) }));
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
      const dataUrl = await fileToDataUrl(file);
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

  const applyPageBackgroundPreset = (image: string | null) => {
    setBoardTheme((previous) => ({ ...previous, pageBackgroundImage: image }));
    setStatusMessage(image ? "הוחל רקע כללי מגלריית הרקעים." : "הוחל רקע כללי לפי פלטת הצבעים.");
  };

  const importPageBackgroundImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatusMessage("ניתן להעלות רק קובצי תמונה לרקע הכללי.");
      event.target.value = "";
      return;
    }

    if (file.size > GAME_PAGE_BACKGROUND_MAX_UPLOAD_BYTES) {
      setStatusMessage("תמונת רקע כללית גדולה מדי. המקסימום הוא 5MB.");
      event.target.value = "";
      return;
    }

    try {
      const { width, height } = await readImageDimensions(file);
      const ratio = width / height;
      const ratioDelta = Math.abs(ratio - GAME_PAGE_BACKGROUND_TARGET_RATIO);

      if (width < GAME_PAGE_BACKGROUND_MIN_WIDTH || height < GAME_PAGE_BACKGROUND_MIN_HEIGHT) {
        setStatusMessage("רזולוציית הרקע נמוכה מדי. נדרש לפחות 1920x1080.");
        event.target.value = "";
        return;
      }

      if (ratioDelta > GAME_PAGE_BACKGROUND_RATIO_TOLERANCE) {
        setStatusMessage("יחס התמונה אינו מתאים. מומלץ יחס 16:9 לרקע כללי.");
        event.target.value = "";
        return;
      }

      const dataUrl = await fileToDataUrl(file);
      setBoardTheme((previous) => ({ ...previous, pageBackgroundImage: dataUrl }));
      setStatusMessage("תמונת הרקע הכללית נטענה בהצלחה.");
    } catch {
      setStatusMessage("שגיאה בטעינת תמונת הרקע הכללית.");
    } finally {
      event.target.value = "";
    }
  };

  const removePageBackgroundImage = () => {
    setBoardTheme((previous) => ({ ...previous, pageBackgroundImage: null }));
    setStatusMessage("תמונת הרקע הכללית הוסרה.");
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
        game: buildCurrentGameSnapshot({ stripInlineImages: true }),
      };

      const encodedPayload = encodeBase64Url(JSON.stringify(payload));
      const shareUrl = new URL(window.location.href);
      shareUrl.searchParams.delete(SERVER_GAME_QUERY_PARAM);
      shareUrl.searchParams.delete(SERVER_ACCESS_QUERY_PARAM);
      shareUrl.searchParams.set(SHARE_QUERY_PARAM, encodedPayload);
      const directLink = shareUrl.toString();
      await navigator.clipboard.writeText(directLink);
      showOverlayMessage(
        access === "view"
          ? "קישור שיתוף לצפייה הועתק ללוח."
          : "קישור שיתוף לעריכה הועתק ללוח.",
        access,
      );
      setStatusMessage("");
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
    <div className="page-shell" dir="rtl" style={pageShellStyle}>
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
            {isSupabaseConfigured && (
              <button type="button" onClick={() => setIsArchiveOpen(true)}>
                ארכיון משחקים
              </button>
            )}
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
            <div className="share-link-anchor">
              <button type="button" onClick={() => copyActiveGameLink("view")}>
                שיתוף לצפייה
              </button>
              {overlayMessage && overlayAnchor === "view" && (
                <div className="share-link-toast" role="status" aria-live="polite">
                  {overlayMessage}
                </div>
              )}
            </div>
            {canCreateEditShare && (
              <div className="share-link-anchor">
                <button type="button" onClick={() => copyActiveGameLink("edit")}>
                  שיתוף לעריכה
                </button>
                {overlayMessage && overlayAnchor === "edit" && (
                  <div className="share-link-toast" role="status" aria-live="polite">
                    {overlayMessage}
                  </div>
                )}
              </div>
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

      {mode === "editor" && isSupabaseConfigured && isArchiveOpen && (
        <div className="archive-drawer-backdrop" onClick={() => setIsArchiveOpen(false)}>
          <aside
            className="archive-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="ארכיון משחקים"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="archive-drawer-header">
              <h2>ארכיון משחקים</h2>
              <button type="button" onClick={() => setIsArchiveOpen(false)}>
                סגירה
              </button>
            </div>

            <div className="archive-drawer-actions">
              <button
                type="button"
                onClick={saveArchiveGameAsNew}
                disabled={archiveLoading || archiveActionKey !== null}
              >
                שמור כחדש
              </button>
              <button
                type="button"
                onClick={() => void loadArchiveGames()}
                disabled={archiveLoading || archiveActionKey !== null}
              >
                רענון
              </button>
            </div>

            <div className="archive-drawer-content">
              {archiveLoading ? (
                <p className="archive-empty">טוען ארכיון משחקים...</p>
              ) : archiveGames.length === 0 ? (
                <p className="archive-empty">אין עדיין משחקים בארכיון.</p>
              ) : (
                <div className="archive-list">
                  {archiveGames.map((record) => {
                    const isActiveRecord = activeArchiveGameId === record.id;
                    const isBusy = archiveActionKey !== null;
                    return (
                      <article
                        key={record.id}
                        className={`archive-row ${isActiveRecord ? "is-active" : ""}`}
                      >
                        <div className="archive-row-main">
                          <strong>{record.title?.trim() || "ללא כותרת"}</strong>
                          <small>עודכן: {formatDateTime(record.updated_at)}</small>
                        </div>
                        <div className="archive-row-actions">
                          <button type="button" onClick={() => loadArchiveGameIntoEditor(record)} disabled={isBusy}>
                            טען לעריכה
                          </button>
                          <button type="button" onClick={() => void updateArchiveGame(record.id)} disabled={isBusy}>
                            עדכן
                          </button>
                          <button type="button" onClick={() => void copyArchiveViewLink(record.id)} disabled={isBusy}>
                            קישור לצפייה
                          </button>
                          <button
                            type="button"
                            className="danger-button"
                            onClick={() => requestDeleteArchiveGame(record)}
                            disabled={isBusy}
                          >
                            מחק
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {pendingDeleteRecord && (
        <div className="archive-confirm-backdrop" onClick={() => setPendingDeleteRecord(null)}>
          <div className="archive-confirm-dialog" onClick={(event) => event.stopPropagation()}>
            <h3>למחוק מהארכיון?</h3>
            <p>
              הרשומה
              {" "}
              <strong>{pendingDeleteRecord.title?.trim() || "ללא כותרת"}</strong>
              {" "}
              תימחק לצמיתות.
            </p>
            <div className="archive-confirm-actions">
              <button type="button" onClick={() => setPendingDeleteRecord(null)} disabled={archiveActionKey !== null}>
                ביטול
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => void deleteArchiveGame()}
                disabled={archiveActionKey !== null}
              >
                מחק
              </button>
            </div>
          </div>
        </div>
      )}

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

            <div className="page-background-section">
              <div className="board-theme-header page-background-header">
                <h3>רקע כללי של דף המשחק</h3>
                <div className="board-theme-actions">
                  <button type="button" onClick={() => applyPageBackgroundPreset(null)}>
                    רקע לפי פלטה
                  </button>
                  <button type="button" onClick={() => pageBackgroundInputRef.current?.click()}>
                    העלאת תמונה אישית
                  </button>
                  <input
                    ref={pageBackgroundInputRef}
                    type="file"
                    accept="image/*"
                    onChange={importPageBackgroundImage}
                    hidden
                  />
                  <button type="button" onClick={removePageBackgroundImage} disabled={!boardTheme.pageBackgroundImage}>
                    הסרת תמונה
                  </button>
                </div>
              </div>
              <p className="page-background-note">
                אפשר לבחור רקע מתוך התיקייה הלוקאלית `public/backgrounds` או להעלות תמונה אישית
                (מינימום 1920x1080, יחס קרוב ל-16:9, עד 5MB).
              </p>

              <div className="page-background-gallery">
                {GAME_PAGE_BACKGROUND_PRESETS.map((preset) => {
                  const isActive = activePageBackgroundPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPageBackgroundPreset(preset.image)}
                      className={`page-background-card ${isActive ? "is-active" : ""}`}
                    >
                      <span
                        className="page-background-thumb"
                        style={{ backgroundImage: `url("${preset.image}")` }}
                        aria-hidden="true"
                      />
                      <strong>{preset.name}</strong>
                    </button>
                  );
                })}
              </div>

              <label className="overlay-control">
                כהות שכבה מעל הרקע הכללי: {boardTheme.pageBackgroundOverlay}%
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={boardTheme.pageBackgroundOverlay}
                  onChange={(event) => updatePageBackgroundOverlay(Number(event.target.value))}
                  disabled={!boardTheme.pageBackgroundImage}
                />
              </label>

              <div className="page-background-preview">
                <div
                  className="page-background-preview-surface"
                  style={{
                    backgroundImage: gamePageBackgroundImage,
                    backgroundSize: boardTheme.pageBackgroundImage ? "cover" : undefined,
                    backgroundPosition: boardTheme.pageBackgroundImage ? "center" : undefined,
                  }}
                >
                  <span>תצוגה מקדימה לרקע הכללי</span>
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

          {!isSharedViewOnly && (
            <p className="hint-text">
              התקדמות משחק: {usedCount} מתוך {totalQuestions} שאלות סומנו כמשומשות.
            </p>
          )}
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




