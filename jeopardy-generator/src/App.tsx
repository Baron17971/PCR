import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import "./App.css";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

type AppMode = "editor" | "game";
type GameType = "jeopardy" | "quick-trivia" | "hudomino";
type QuickTriviaDifficulty = "easy" | "medium" | "hard";
type HudominoDifficulty = "easy" | "medium" | "hard";
type HudominoPlayMode = "learning" | "challenge";
type HudominoScoringMode = "cooperative" | "competitive";
type HudominoSideDirection = "north" | "east" | "south" | "west";

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

interface QuickTriviaQuestion {
  id: string;
  value: number;
  question: string;
  answer: string;
  wrongAnswer1: string;
  wrongAnswer2: string;
  wrongAnswer3: string;
  difficulty: QuickTriviaDifficulty;
  used: boolean;
}

interface HudominoPair {
  id: string;
  term: string;
  definition: string;
}

interface HudominoSide {
  text: string;
  pairId: string | null;
  kind: "term" | "definition" | "distractor";
}

interface HudominoCube {
  id: string;
  rotation: number;
  sides: Record<HudominoSideDirection, HudominoSide>;
}

interface HudominoPuzzleState {
  size: number;
  boardSlots: Array<string | null>;
  bankOrder: string[];
  cubes: HudominoCube[];
  isChallengeReveal: boolean;
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
    gameType?: GameType;
    categoryCount: number;
    rowCount: number;
    baseValue: number;
    teamCount: number;
    teamNames: string[];
    boardTheme?: Partial<BoardTheme>;
    hudominoDifficulty?: HudominoDifficulty;
    hudominoPlayMode?: HudominoPlayMode;
    hudominoScoringMode?: HudominoScoringMode;
  };
  categories: Array<{
    title: string;
    cells: Array<{
      value: number;
      question: string;
      answer: string;
    }>;
  }>;
  quickTriviaQuestions?: Array<{
    value: number;
    question: string;
    answer: string;
    wrongAnswer1?: string;
    wrongAnswer2?: string;
    wrongAnswer3?: string;
    difficulty?: QuickTriviaDifficulty;
  }>;
  hudominoPairs?: Array<{
    term: string;
    definition: string;
  }>;
  hudominoPuzzle?: HudominoPuzzleState;
}

type ShareAccess = "view" | "edit";

interface SharePayload {
  version: number;
  access?: ShareAccess;
  canShareEdit?: boolean;
  game: {
    gameType?: GameType;
    gameTopic: string;
    boardTheme?: Partial<BoardTheme>;
    board?: Array<{
      title: string;
      cells: Array<{
        value: number;
        question: string;
        answer: string;
        used: boolean;
      }>;
    }>;
    quickTriviaQuestions?: Array<{
      value: number;
      question: string;
      answer: string;
      wrongAnswer1?: string;
      wrongAnswer2?: string;
      wrongAnswer3?: string;
      difficulty?: QuickTriviaDifficulty;
      used?: boolean;
    }>;
    hudominoPairs?: Array<{
      term: string;
      definition: string;
    }>;
    hudominoDifficulty?: HudominoDifficulty;
    hudominoPlayMode?: HudominoPlayMode;
    hudominoScoringMode?: HudominoScoringMode;
    hudominoPuzzle?: HudominoPuzzleState;
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

interface QuickTriviaLifelinesState {
  fifty: boolean;
  phone: boolean;
  audience: boolean;
}

interface QuickTriviaModalState {
  open: boolean;
  title: string;
  content: string;
  buttonLabel: string;
  resetAfterClose: boolean;
}

const MIN_CATEGORIES = 2;
const MAX_CATEGORIES = 8;
const MIN_ROWS = 3;
const MAX_ROWS = 6;
const MIN_TEAMS = 2;
const MAX_TEAMS = 5;
const MIN_BASE_VALUE = 100;
const MAX_BASE_VALUE = 500;
const QUICK_TRIVIA_PRIZE_VALUES = [
  100,
  200,
  300,
  500,
  1_000,
  2_000,
  4_000,
  8_000,
  16_000,
  32_000,
  64_000,
  125_000,
  250_000,
  500_000,
  1_000_000,
] as const;
const QUICK_TRIVIA_MIN_QUESTIONS = QUICK_TRIVIA_PRIZE_VALUES.length;
const QUICK_TRIVIA_MAX_QUESTIONS = QUICK_TRIVIA_PRIZE_VALUES.length;
const QUICK_TRIVIA_DEFAULT_QUESTIONS = QUICK_TRIVIA_PRIZE_VALUES.length;
const QUICK_TRIVIA_MAX_VALUE = QUICK_TRIVIA_PRIZE_VALUES[QUICK_TRIVIA_PRIZE_VALUES.length - 1];
const QUICK_TRIVIA_DIFFICULTY_RANK: Record<QuickTriviaDifficulty, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};
const QUICK_TRIVIA_DEFAULT_LIFELINES: QuickTriviaLifelinesState = {
  fifty: true,
  phone: true,
  audience: true,
};
const HUDOMINO_MIN_PAIRS = 8;
const HUDOMINO_MAX_PAIRS = 80;
const HUDOMINO_DEFAULT_PAIR_COUNT = 18;
const HUDOMINO_POINT_PER_MATCH = 1;
const DEFAULT_GAME_TOPIC = "הכנס את שם המשחק כאן";
const HUDOMINO_SIDE_DIRECTIONS: HudominoSideDirection[] = ["north", "east", "south", "west"];
const SHARE_QUERY_PARAM = "game";
const SERVER_GAME_QUERY_PARAM = "sgame";
const SERVER_ACCESS_QUERY_PARAM = "access";
const SUPABASE_GAMES_TABLE = "jeopardy_games";

const GAME_TYPE_OPTIONS: Array<{ value: GameType; label: string }> = [
  { value: "jeopardy", label: "ג׳פרדי קלאסי" },
  { value: "quick-trivia", label: "מי רוצה להיות מליונר" },
  { value: "hudomino", label: "חודומינו" },
];
const ARCHIVE_GAME_TYPE_LABELS: Record<GameType, string> = {
  jeopardy: "ג׳פרדי",
  "quick-trivia": "מליונר",
  hudomino: "חודומינו",
};

const HUDOMINO_DIFFICULTY_OPTIONS: Array<{
  value: HudominoDifficulty;
  label: string;
  size: number;
}> = [
  { value: "easy", label: "קל (2×2)", size: 2 },
  { value: "medium", label: "בינוני (3×3)", size: 3 },
  { value: "hard", label: "קשה (4×4)", size: 4 },
];

const HUDOMINO_PLAY_MODE_OPTIONS: Array<{ value: HudominoPlayMode; label: string }> = [
  { value: "learning", label: "מצב למידה" },
  { value: "challenge", label: "מצב אתגר" },
];

const HUDOMINO_SCORING_MODE_OPTIONS: Array<{ value: HudominoScoringMode; label: string }> = [
  { value: "cooperative", label: "שיתופי" },
  { value: "competitive", label: "תחרותי" },
];

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
const AI_HUDOMINO_CSV_PROMPT_TEMPLATE =
  "צור קובץ CSV UTF-8 עם העמודות: term, definition. " +
  "מלא אותו ב-18 זוגות מושגים בנושא [נושא], כך שבכל שורה יש קשר לוגי ברור וחד-משמעי בין המושג לבין ההגדרה, המאפיין, התפקיד או התוצאה הקשורים אליו. " +
  "הקפד על עברית מלאה ותקינה, התאמה לרמת תלמידי [כיתה], וללא כפילויות מושגיות בין הזוגות.\n\n" +
  "מגבלת אורך חובה:\n" +
  "term יכיל עד 3 מילים\n" +
  "definition תכיל עד 8 מילים\n\n" +
  "יש להעדיף ניסוחים קצרים, פשוטים וחדים.\n" +
  "אין להשתמש במשפטים ארוכים, פסיקים מרובים או הסברים מפורטים.\n" +
  "כל זוג צריך להיות ברור גם במבט מהיר על הלוח.\n\n" +
  "אם מצורף קובץ, יש להתבסס רק על התוכן שבו בלבד, ללא הוספת מידע חיצוני, ותוך שמירה על המינוחים המקוריים של הקובץ ככל האפשר. " +
  "שמור כ-CSV UTF-8.";
const AI_MILLIONAIRE_CSV_PROMPT_TEMPLATE = `צור קובץ CSV UTF-8 מוכן להעלאה למשחק "מי רוצה להיות מיליונר".
הקובץ צריך לכלול [הוסף מספר] שאלות בנושא [נושא], בהתאמה לרמת תלמידי [כיתה/שכבת גיל].
מבנה הקובץ יהיה בדיוק עם העמודות הבאות:
question, correct_answer, wrong_answer_1, wrong_answer_2, wrong_answer_3, difficulty
פירוט העמודות:
question = השאלה
correct_answer = התשובה הנכונה
wrong_answer_1 = מסיח ראשון
wrong_answer_2 = מסיח שני
wrong_answer_3 = מסיח שלישי
difficulty = רמת הקושי של השאלה
הנחיות:
צור [מספר שאלות רצוי] שאלות בנושא [נושא]
סדר את השאלות לפי רמת קושי עולה
השתמש ברמות קושי ברורות, למשל: קל, בינוני, קשה
לכל שאלה צריכות להיות 4 תשובות אפשריות בלבד: תשובה נכונה אחת ו־3 מסיחים
הקפד שהתשובה הנכונה תהיה חד-משמעית וברורה
הקפד שהמסיחים יהיו סבירים, אמינים ומבלבלים במידה, אך לא נכונים
הקפד שלא יהיו כפילויות מושגיות בין השאלות
השאלות צריכות להיות ברורות, קצרות יחסית ומנוסחות בעברית מלאה ותקינה
התאם את רמת הדיוק, השפה והמורכבות ל־[כיתה/שכבת גיל]
הקפד על דיוק לימודי/מדעי
הימנע משאלות טריוויה שוליות מדי, אלא אם כן התבקש אחרת
העדף שאלות שבודקות הבנה, זיהוי, השוואה ויישום, ולא רק שינון
מגבלת אורך מומלצת:
question עד 16 מילים
כל תשובה עד 6 מילים
יש להעדיף ניסוחים קצרים, פשוטים וחדים, שייראו טוב על המסך
אם מצורף קובץ:
יש להתבסס רק על התוכן שבו בלבד
אין להוסיף מידע חיצוני
יש לשמור ככל האפשר על המינוחים המקוריים של הקובץ
אם חסר מידע, אין להשלים ממקורות אחרים
דרישות נוספות:
שמור את הקובץ בפורמט CSV UTF-8
אל תוסיף הסברים מחוץ לקובץ
הפלט הסופי צריך להיות קובץ CSV מוכן להעלאה בלבד`;

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
  "/backgrounds/ant7119_A_delicate_and_pastoral_background_in_bright_shades_o_5025c836-c78f-4993-bf08-187c0bf2e3dd_0.png",
  "/backgrounds/ant7119_A_delicate_and_pastoral_background_in_bright_shades_o_5025c836-c78f-4993-bf08-187c0bf2e3dd_1.png",
  "/backgrounds/ant7119_A_delicate_and_pastoral_background_in_bright_shades_o_5025c836-c78f-4993-bf08-187c0bf2e3dd_2.png",
  "/backgrounds/ant7119_A_delicate_and_pastoral_background_in_bright_shades_o_5025c836-c78f-4993-bf08-187c0bf2e3dd_3.png",
  "/backgrounds/ant7119_A_delicate_and_pastoral_background_in_bright_shades_o_64354d36-0572-45b7-86fa-06a529233fed_0.png",
  "/backgrounds/ant7119_A_delicate_and_pastoral_background_in_bright_shades_o_64354d36-0572-45b7-86fa-06a529233fed_1.png",
  "/backgrounds/ant7119_A_delicate_and_pastoral_background_in_bright_shades_o_64354d36-0572-45b7-86fa-06a529233fed_2.png",
  "/backgrounds/ant7119_A_delicate_and_pastoral_background_in_bright_shades_o_64354d36-0572-45b7-86fa-06a529233fed_3.png",
  "/backgrounds/ant7119_A_delicate_and_pastoral_background_in_bright_shades_o_f5bd31db-a237-4946-b468-520d01d96177_0.png",
  "/backgrounds/ant7119_A_delicate_and_pastoral_background_in_bright_shades_o_f5bd31db-a237-4946-b468-520d01d96177_1.png",
  "/backgrounds/ant7119_A_delicate_and_pastoral_background_in_bright_shades_o_f5bd31db-a237-4946-b468-520d01d96177_2.png",
  "/backgrounds/ant7119_A_delicate_and_pastoral_background_in_bright_shades_o_f5bd31db-a237-4946-b468-520d01d96177_3.png",
  "/backgrounds/ant7119_A_delicate_and_pastoral_background_in_light_tones_of__c9527932-47d2-4f21-b296-2713deffe4bd_0.png",
  "/backgrounds/ant7119_A_delicate_and_pastoral_background_in_light_tones_of__c9527932-47d2-4f21-b296-2713deffe4bd_1.png",
  "/backgrounds/ant7119_A_delicate_and_pastoral_background_in_light_tones_of__c9527932-47d2-4f21-b296-2713deffe4bd_3.png",
  "/backgrounds/ant7119_A_delicate_and_pastoral_background_of_the_landscapes__1e1336f4-c0cf-480f-afe7-49f52580a075_0.png",
  "/backgrounds/ant7119_A_delicate_and_pastoral_background_of_the_landscapes__1e1336f4-c0cf-480f-afe7-49f52580a075_1.png",
  "/backgrounds/ant7119_A_delicate_and_pastoral_background_of_the_landscapes__1e1336f4-c0cf-480f-afe7-49f52580a075_2.png",
  "/backgrounds/ant7119_A_delicate_and_pastoral_background_of_the_landscapes__1e1336f4-c0cf-480f-afe7-49f52580a075_3.png",
  "/backgrounds/ant7119_A_delicate_and_pastoral_background_of_the_landscapes__e45e908d-fb40-4f64-9ff7-7472fc830617_0.png",
  "/backgrounds/ant7119_A_delicate_and_pastoral_background_of_the_landscapes__e45e908d-fb40-4f64-9ff7-7472fc830617_1.png",
  "/backgrounds/ant7119_A_delicate_background_in_bright_shades_of_the_Western_f7697d8c-aa93-435b-96ac-7dd7923ac82c_1.png",
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
  "/backgrounds/c0001-1.png",
  "/backgrounds/lion.png",
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

const GAME_PAGE_BACKGROUND_MIN_WIDTH = 1280;
const GAME_PAGE_BACKGROUND_MIN_HEIGHT = 720;
const GAME_PAGE_BACKGROUND_MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const GAME_PAGE_BACKGROUND_TARGET_RATIO = 16 / 9;
const GAME_PAGE_BACKGROUND_RATIO_TOLERANCE = 0.35;

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
    name: "זריחה אופטימית",
    description: "זהב רך ונעים: רקע קרמי, כותרות שמשיות ותאי ניקוד חמים לקריאות גבוהה.",
    colors: {
      boardBorderColor: "#f5ecd5",
      boardBackgroundColor: "#fffdf7",
      categoryBgStart: "#f4e3ab",
      categoryBgEnd: "#e9d28a",
      categoryTextColor: "#43300f",
      cellBgColor: "#cfaf66",
      cellTextColor: "#fffbef",
      cellBorderColor: "#fff8e8",
      usedCellBgColor: "#ece1bf",
      usedCellTextColor: "#725d2f",
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
    name: "שיש וניל מלכותי",
    description: "גווני שיש שמפניה רכים עם ניגודיות אלגנטית ונקייה ללוח המשחק.",
    colors: {
      boardBorderColor: "#b8acac",
      boardBackgroundColor: "#f4f4ea",
      categoryBgStart: "#ecd2b8",
      categoryBgEnd: "#fcecc3",
      categoryTextColor: "#4d4242",
      cellBgColor: "#fcfcec",
      cellTextColor: "#4d4242",
      cellBorderColor: "#b8acac",
      usedCellBgColor: "#f4f4ea",
      usedCellTextColor: "#8e7f7f",
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

function shuffleArray<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function resolveArchiveGameType(payload: unknown): GameType {
  if (!payload || typeof payload !== "object") return "jeopardy";
  const candidate = (payload as { gameType?: unknown }).gameType;
  if (candidate === "quick-trivia" || candidate === "hudomino" || candidate === "jeopardy") {
    return candidate;
  }
  return "jeopardy";
}

function getHudominoBoardSize(difficulty: HudominoDifficulty): number {
  return HUDOMINO_DIFFICULTY_OPTIONS.find((option) => option.value === difficulty)?.size ?? 3;
}

function getHudominoRequiredPairs(boardSize: number): number {
  // Cyclic layout: all four sides of all cubes are paired (N*N*4 sides / 2).
  return boardSize * boardSize * 2;
}

function getHudominoInternalMatchTarget(boardSize: number): number {
  // Visible board interfaces (without wrap): horizontal + vertical internal edges.
  return boardSize * (boardSize - 1) * 2;
}

function getHudominoBaseDirection(
  displayDirection: HudominoSideDirection,
  rotation: number,
): HudominoSideDirection {
  const displayIndex = HUDOMINO_SIDE_DIRECTIONS.indexOf(displayDirection);
  const baseIndex = (displayIndex - (rotation % 4) + 4) % 4;
  return HUDOMINO_SIDE_DIRECTIONS[baseIndex];
}

function getHudominoDisplaySide(cube: HudominoCube, direction: HudominoSideDirection): HudominoSide {
  const baseDirection = getHudominoBaseDirection(direction, cube.rotation);
  return cube.sides[baseDirection];
}

function isHudominoSideMatch(left: HudominoSide, right: HudominoSide): boolean {
  if (!left.pairId || !right.pairId) return false;
  if (left.pairId !== right.pairId) return false;
  return (
    (left.kind === "term" && right.kind === "definition") ||
    (left.kind === "definition" && right.kind === "term")
  );
}

function createHudominoPairs(count = HUDOMINO_DEFAULT_PAIR_COUNT): HudominoPair[] {
  const normalizedCount = clamp(count, HUDOMINO_MIN_PAIRS, HUDOMINO_MAX_PAIRS);
  return Array.from({ length: normalizedCount }, (_, index) => ({
    id: `hudomino-pair-${index + 1}`,
    term: "",
    definition: "",
  }));
}

function normalizeHudominoPairs(
  source:
    | Array<{
        term: string;
        definition: string;
      }>
    | null
    | undefined,
  targetCount = HUDOMINO_DEFAULT_PAIR_COUNT,
): HudominoPair[] {
  const normalizedCount = clamp(targetCount, HUDOMINO_MIN_PAIRS, HUDOMINO_MAX_PAIRS);
  const normalizedSource = Array.isArray(source) ? source : [];
  const limited = normalizedSource.slice(0, normalizedCount);
  const mapped = limited.map((pair, index) => ({
    id: `hudomino-pair-${index + 1}`,
    term: typeof pair?.term === "string" ? pair.term : "",
    definition: typeof pair?.definition === "string" ? pair.definition : "",
  }));
  if (mapped.length >= normalizedCount) {
    return mapped;
  }
  const additions = Array.from({ length: normalizedCount - mapped.length }, (_, offset) => ({
    id: `hudomino-pair-${mapped.length + offset + 1}`,
    term: "",
    definition: "",
  }));
  return [...mapped, ...additions];
}

function createDefaultHudominoSide(text = "מסיח"): HudominoSide {
  return {
    text,
    pairId: null,
    kind: "distractor",
  };
}

function createHudominoPuzzle(
  pairs: HudominoPair[],
  boardSize: number,
  playMode: HudominoPlayMode,
): HudominoPuzzleState {
  const cubeCount = boardSize * boardSize;
  const requiredPairs = getHudominoRequiredPairs(boardSize);
  const shuffledPairs = shuffleArray(pairs).slice(0, requiredPairs);

  const draftCubes: Array<{
    id: string;
    sides: Record<HudominoSideDirection, HudominoSide | null>;
  }> = Array.from({ length: cubeCount }, (_, index) => ({
    id: `hudocube-${index + 1}`,
    sides: {
      north: null,
      east: null,
      south: null,
      west: null,
    },
  }));

  let pairCursor = 0;

  const assignPairToEdge = (
    firstIndex: number,
    firstDirection: HudominoSideDirection,
    secondIndex: number,
    secondDirection: HudominoSideDirection,
    pair: HudominoPair,
  ) => {
    const termOnFirst = Math.random() >= 0.5;
    draftCubes[firstIndex].sides[firstDirection] = {
      text: termOnFirst ? pair.term : pair.definition,
      pairId: pair.id,
      kind: termOnFirst ? "term" : "definition",
    };
    draftCubes[secondIndex].sides[secondDirection] = {
      text: termOnFirst ? pair.definition : pair.term,
      pairId: pair.id,
      kind: termOnFirst ? "definition" : "term",
    };
  };

  // Horizontal cyclic edges (includes rightmost -> leftmost per row).
  for (let rowIndex = 0; rowIndex < boardSize; rowIndex += 1) {
    for (let colIndex = 0; colIndex < boardSize; colIndex += 1) {
      const leftIndex = rowIndex * boardSize + colIndex;
      const rightCol = (colIndex + 1) % boardSize;
      const rightIndex = rowIndex * boardSize + rightCol;
      const pair = shuffledPairs[pairCursor];
      pairCursor += 1;
      if (!pair) continue;
      assignPairToEdge(leftIndex, "east", rightIndex, "west", pair);
    }
  }

  // Vertical cyclic edges (includes bottom -> top per column).
  for (let rowIndex = 0; rowIndex < boardSize; rowIndex += 1) {
    for (let colIndex = 0; colIndex < boardSize; colIndex += 1) {
      const topIndex = rowIndex * boardSize + colIndex;
      const bottomRow = (rowIndex + 1) % boardSize;
      const bottomIndex = bottomRow * boardSize + colIndex;
      const pair = shuffledPairs[pairCursor];
      pairCursor += 1;
      if (!pair) continue;
      assignPairToEdge(topIndex, "south", bottomIndex, "north", pair);
    }
  }

  const usedPairIds = new Set(shuffledPairs.map((pair) => pair.id));
  const unusedDistractors = shuffleArray(
    pairs
      .filter((pair) => !usedPairIds.has(pair.id))
      .flatMap((pair) => [pair.term.trim(), pair.definition.trim()])
      .filter(Boolean),
  );
  const fallbackDistractors = shuffleArray(
    pairs.flatMap((pair) => [pair.term.trim(), pair.definition.trim()]).filter(Boolean),
  );
  let distractorCursor = 0;
  const getNextDistractor = () => {
    const source = unusedDistractors.length > 0 ? unusedDistractors : fallbackDistractors;
    if (source.length === 0) return "מסיח";
    const value = source[distractorCursor % source.length];
    distractorCursor += 1;
    return value;
  };

  const cubes: HudominoCube[] = draftCubes.map((cube) => ({
    id: cube.id,
    rotation: Math.floor(Math.random() * 4),
    sides: {
      north: cube.sides.north ?? createDefaultHudominoSide(getNextDistractor()),
      east: cube.sides.east ?? createDefaultHudominoSide(getNextDistractor()),
      south: cube.sides.south ?? createDefaultHudominoSide(getNextDistractor()),
      west: cube.sides.west ?? createDefaultHudominoSide(getNextDistractor()),
    },
  }));

  const buildRandomizedCubes = (): HudominoCube[] =>
    cubes.map((cube) => ({
      ...cube,
      rotation: Math.floor(Math.random() * 4),
    }));

  const internalMatchTarget = getHudominoInternalMatchTarget(boardSize);
  let randomizedCubes = buildRandomizedCubes();
  let randomizedSlots = shuffleArray(randomizedCubes.map((cube) => cube.id));
  let attempts = 0;
  while (attempts < 40) {
    const matchCount = collectHudominoMatchEdgeKeys({
      size: boardSize,
      boardSlots: randomizedSlots,
      bankOrder: [],
      cubes: randomizedCubes,
      isChallengeReveal: playMode === "learning",
    }).size;
    if (matchCount < internalMatchTarget) break;
    randomizedCubes = buildRandomizedCubes();
    randomizedSlots = shuffleArray(randomizedCubes.map((cube) => cube.id));
    attempts += 1;
  }

  return {
    size: boardSize,
    boardSlots: randomizedSlots,
    bankOrder: [],
    cubes: randomizedCubes,
    isChallengeReveal: playMode === "learning",
  };
}

function normalizeHudominoPuzzleState(
  source: HudominoPuzzleState | null | undefined,
  fallbackPairs: HudominoPair[],
  boardSize: number,
  playMode: HudominoPlayMode,
): HudominoPuzzleState {
  if (!source) {
    return createHudominoPuzzle(fallbackPairs, boardSize, playMode);
  }

  const expectedCount = boardSize * boardSize;
  const validCubes = Array.isArray(source.cubes)
    ? source.cubes.filter(
        (cube) =>
          cube &&
          typeof cube.id === "string" &&
          cube.sides &&
          HUDOMINO_SIDE_DIRECTIONS.every(
            (direction) => typeof cube.sides[direction]?.text === "string",
          ),
      )
    : [];

  if (validCubes.length !== expectedCount) {
    return createHudominoPuzzle(fallbackPairs, boardSize, playMode);
  }

  const cubeIds = new Set(validCubes.map((cube) => cube.id));
  const usedOnBoard = new Set<string>();
  const normalizedBoard = Array.isArray(source.boardSlots)
    ? source.boardSlots.slice(0, expectedCount).map((cubeId) => {
        if (typeof cubeId !== "string") return null;
        if (!cubeIds.has(cubeId)) return null;
        if (usedOnBoard.has(cubeId)) return null;
        usedOnBoard.add(cubeId);
        return cubeId;
      })
    : Array.from({ length: expectedCount }, () => null);
  while (normalizedBoard.length < expectedCount) {
    normalizedBoard.push(null);
  }

  const normalizedBank: string[] = [];
  if (Array.isArray(source.bankOrder)) {
    source.bankOrder.forEach((cubeId) => {
      if (typeof cubeId !== "string") return;
      if (!cubeIds.has(cubeId)) return;
      if (usedOnBoard.has(cubeId)) return;
      if (normalizedBank.includes(cubeId)) return;
      normalizedBank.push(cubeId);
    });
  }

  const remainingIds = validCubes
    .map((cube) => cube.id)
    .filter((cubeId) => !usedOnBoard.has(cubeId) && !normalizedBank.includes(cubeId));
  const fillQueue = [...normalizedBank, ...remainingIds];
  for (let slotIndex = 0; slotIndex < normalizedBoard.length; slotIndex += 1) {
    if (normalizedBoard[slotIndex]) continue;
    const nextId = fillQueue.shift() ?? null;
    normalizedBoard[slotIndex] = nextId;
    if (nextId) usedOnBoard.add(nextId);
  }

  const missingAfterFill = validCubes
    .map((cube) => cube.id)
    .filter((cubeId) => !usedOnBoard.has(cubeId));
  for (let slotIndex = 0; slotIndex < normalizedBoard.length; slotIndex += 1) {
    if (normalizedBoard[slotIndex]) continue;
    normalizedBoard[slotIndex] = missingAfterFill.shift() ?? null;
  }

  validCubes.forEach((cube) => {
    if (!usedOnBoard.has(cube.id) && !normalizedBank.includes(cube.id)) {
      normalizedBank.push(cube.id);
    }
  });

  return {
    size: boardSize,
    boardSlots: normalizedBoard,
    bankOrder: [],
    cubes: validCubes.map((cube) => ({
      ...cube,
      rotation: clamp(Math.round(Number(cube.rotation) || 0), 0, 3),
      sides: {
        north: cube.sides.north ?? createDefaultHudominoSide(),
        east: cube.sides.east ?? createDefaultHudominoSide(),
        south: cube.sides.south ?? createDefaultHudominoSide(),
        west: cube.sides.west ?? createDefaultHudominoSide(),
      },
    })),
    isChallengeReveal: playMode === "learning" ? true : Boolean(source.isChallengeReveal),
  };
}

function buildHudominoEdgeKey(firstSlot: number, secondSlot: number): string {
  return firstSlot < secondSlot ? `${firstSlot}-${secondSlot}` : `${secondSlot}-${firstSlot}`;
}

function collectHudominoMatchEdgeKeys(state: HudominoPuzzleState): Set<string> {
  const cubeById = new Map(state.cubes.map((cube) => [cube.id, cube]));
  const matches = new Set<string>();

  for (let slotIndex = 0; slotIndex < state.boardSlots.length; slotIndex += 1) {
    const cubeId = state.boardSlots[slotIndex];
    if (!cubeId) continue;
    const cube = cubeById.get(cubeId);
    if (!cube) continue;
    const row = Math.floor(slotIndex / state.size);
    const col = slotIndex % state.size;

    if (col < state.size - 1) {
      const neighborIndex = slotIndex + 1;
      const neighborId = state.boardSlots[neighborIndex];
      const neighbor = neighborId ? cubeById.get(neighborId) : null;
      if (neighbor) {
        const rightSide = getHudominoDisplaySide(cube, "east");
        const leftSide = getHudominoDisplaySide(neighbor, "west");
        if (isHudominoSideMatch(rightSide, leftSide)) {
          matches.add(buildHudominoEdgeKey(slotIndex, neighborIndex));
        }
      }
    }

    if (row < state.size - 1) {
      const neighborIndex = slotIndex + state.size;
      const neighborId = state.boardSlots[neighborIndex];
      const neighbor = neighborId ? cubeById.get(neighborId) : null;
      if (neighbor) {
        const bottomSide = getHudominoDisplaySide(cube, "south");
        const topSide = getHudominoDisplaySide(neighbor, "north");
        if (isHudominoSideMatch(bottomSide, topSide)) {
          matches.add(buildHudominoEdgeKey(slotIndex, neighborIndex));
        }
      }
    }
  }

  return matches;
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

function mixHexColors(colorA: string, colorB: string, weightToB: number): string {
  const normalizedA = normalizeHexColor(colorA);
  const normalizedB = normalizeHexColor(colorB);
  if (!normalizedA || !normalizedB) {
    return normalizedA ?? normalizedB ?? colorA;
  }

  const weight = clamp(weightToB, 0, 1);
  const readChannel = (color: string, start: number) => Number.parseInt(color.slice(start, start + 2), 16);
  const blendChannel = (channelA: number, channelB: number) =>
    Math.round(channelA * (1 - weight) + channelB * weight)
      .toString(16)
      .padStart(2, "0");

  const red = blendChannel(readChannel(normalizedA, 1), readChannel(normalizedB, 1));
  const green = blendChannel(readChannel(normalizedA, 3), readChannel(normalizedB, 3));
  const blue = blendChannel(readChannel(normalizedA, 5), readChannel(normalizedB, 5));

  return `#${red}${green}${blue}`;
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

function getQuickTriviaDifficultyForIndex(
  index: number,
  total: number,
): QuickTriviaDifficulty {
  if (total <= 0) return "medium";
  const progress = (index + 1) / total;
  if (progress <= 0.4) return "easy";
  if (progress <= 0.8) return "medium";
  return "hard";
}

function normalizeQuickTriviaDifficulty(value: string): QuickTriviaDifficulty | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (["easy", "e", "קל", "קלה", "beginner"].includes(normalized)) return "easy";
  if (["medium", "med", "m", "בינוני", "בינונית", "intermediate"].includes(normalized)) return "medium";
  if (["hard", "h", "קשה", "challenging", "advanced"].includes(normalized)) return "hard";
  return null;
}

function getQuickTriviaValueForIndex(index: number): number {
  const clampedIndex = clamp(index, 0, QUICK_TRIVIA_PRIZE_VALUES.length - 1);
  return QUICK_TRIVIA_PRIZE_VALUES[clampedIndex];
}

function createQuickTriviaQuestions(
  count = QUICK_TRIVIA_DEFAULT_QUESTIONS,
): QuickTriviaQuestion[] {
  const normalizedCount = clamp(count, QUICK_TRIVIA_MIN_QUESTIONS, QUICK_TRIVIA_MAX_QUESTIONS);
  return Array.from({ length: normalizedCount }, (_, index) => ({
    id: `quick-q-${index + 1}`,
    value: getQuickTriviaValueForIndex(index),
    question: "",
    answer: "",
    wrongAnswer1: "",
    wrongAnswer2: "",
    wrongAnswer3: "",
    difficulty: getQuickTriviaDifficultyForIndex(index, normalizedCount),
    used: false,
  }));
}

function normalizeQuickTriviaQuestions(
  source: Array<{
    value: number;
    question: string;
    answer: string;
    wrongAnswer1?: string;
    wrongAnswer2?: string;
    wrongAnswer3?: string;
    difficulty?: QuickTriviaDifficulty;
    wrongAnswers?: string[];
    used?: boolean;
  }> | null | undefined,
): QuickTriviaQuestion[] {
  if (!Array.isArray(source) || source.length === 0) {
    return createQuickTriviaQuestions();
  }

  const limited = source.slice(0, QUICK_TRIVIA_MAX_QUESTIONS);
  const normalizedCount = Math.max(limited.length, QUICK_TRIVIA_MIN_QUESTIONS);
  return Array.from({ length: normalizedCount }, (_, index) => {
    const item = limited[index];
    return {
    id: `quick-q-${index + 1}`,
    value: getQuickTriviaValueForIndex(index),
    question: typeof item?.question === "string" ? item.question : "",
    answer: typeof item?.answer === "string" ? item.answer : "",
    wrongAnswer1:
      typeof item?.wrongAnswer1 === "string"
        ? item.wrongAnswer1
        : typeof item?.wrongAnswers?.[0] === "string"
          ? item.wrongAnswers[0]
          : "",
    wrongAnswer2:
      typeof item?.wrongAnswer2 === "string"
        ? item.wrongAnswer2
        : typeof item?.wrongAnswers?.[1] === "string"
          ? item.wrongAnswers[1]
          : "",
    wrongAnswer3:
      typeof item?.wrongAnswer3 === "string"
        ? item.wrongAnswer3
        : typeof item?.wrongAnswers?.[2] === "string"
          ? item.wrongAnswers[2]
          : "",
    difficulty:
      normalizeQuickTriviaDifficulty(typeof item?.difficulty === "string" ? item.difficulty : "") ??
      getQuickTriviaDifficultyForIndex(index, normalizedCount),
    used: Boolean(item?.used),
    };
  });
}

function ValueMark({ value }: { value: number }) {
  return (
    <span className="value-mark" dir="ltr">
      {value.toLocaleString("en-US")}
    </span>
  );
}

function App() {
  const [mode, setMode] = useState<AppMode>("editor");
  const [gameType, setGameType] = useState<GameType>("jeopardy");
  const [gameTopic, setGameTopic] = useState(DEFAULT_GAME_TOPIC);
  const [aiPromptText, setAiPromptText] = useState(AI_CSV_PROMPT_TEMPLATE);
  const [hudominoAiPromptText, setHudominoAiPromptText] = useState(AI_HUDOMINO_CSV_PROMPT_TEMPLATE);
  const [millionaireAiPromptText, setMillionaireAiPromptText] = useState(
    AI_MILLIONAIRE_CSV_PROMPT_TEMPLATE,
  );
  const [boardTheme, setBoardTheme] = useState<BoardTheme>(DEFAULT_BOARD_THEME);
  const [categoryCount, setCategoryCount] = useState(6);
  const [rowCount, setRowCount] = useState(5);
  const [baseValue, setBaseValue] = useState(200);
  const [board, setBoard] = useState<CategoryData[]>(() => createBoard(6, 5, 200));
  const [quickTriviaQuestions, setQuickTriviaQuestions] = useState<QuickTriviaQuestion[]>(() =>
    createQuickTriviaQuestions(),
  );
  const [hudominoDifficulty, setHudominoDifficulty] = useState<HudominoDifficulty>("medium");
  const [hudominoPlayMode, setHudominoPlayMode] = useState<HudominoPlayMode>("learning");
  const [hudominoScoringMode, setHudominoScoringMode] = useState<HudominoScoringMode>("cooperative");
  const [hudominoPairs, setHudominoPairs] = useState<HudominoPair[]>(() => createHudominoPairs());
  const [hudominoPuzzle, setHudominoPuzzle] = useState<HudominoPuzzleState | null>(null);
  const [hudominoDraggedCubeId, setHudominoDraggedCubeId] = useState<string | null>(null);
  const [teams, setTeams] = useState<TeamData[]>(() => createTeams(2));
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [activeQuickQuestionId, setActiveQuickQuestionId] = useState<string | null>(null);
  const [quickTriviaCurrentOptions, setQuickTriviaCurrentOptions] = useState<string[]>([]);
  const [quickTriviaCorrectOptionIndex, setQuickTriviaCorrectOptionIndex] = useState<number | null>(null);
  const [quickTriviaHiddenOptionIndexes, setQuickTriviaHiddenOptionIndexes] = useState<number[]>([]);
  const [quickTriviaSelectedOptionIndex, setQuickTriviaSelectedOptionIndex] = useState<number | null>(null);
  const [quickTriviaCanAnswer, setQuickTriviaCanAnswer] = useState(true);
  const [quickTriviaScore, setQuickTriviaScore] = useState(0);
  const [quickTriviaLifelines, setQuickTriviaLifelines] = useState<QuickTriviaLifelinesState>(
    QUICK_TRIVIA_DEFAULT_LIFELINES,
  );
  const [quickTriviaModal, setQuickTriviaModal] = useState<QuickTriviaModalState>({
    open: false,
    title: "",
    content: "",
    buttonLabel: "סגור",
    resetAfterClose: false,
  });
  const [isGameIntroModalOpen, setIsGameIntroModalOpen] = useState(false);
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
  const [isBackgroundPickerOpen, setIsBackgroundPickerOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const csvImportInputRef = useRef<HTMLInputElement | null>(null);
  const quickTriviaCsvImportInputRef = useRef<HTMLInputElement | null>(null);
  const hudominoCsvImportInputRef = useRef<HTMLInputElement | null>(null);
  const pageBackgroundInputRef = useRef<HTMLInputElement | null>(null);
  const overlayTimeoutRef = useRef<number | null>(null);

  const hudominoBoardSize = useMemo(
    () => getHudominoBoardSize(hudominoDifficulty),
    [hudominoDifficulty],
  );
  const hudominoRequiredPairs = useMemo(
    () => getHudominoRequiredPairs(hudominoBoardSize),
    [hudominoBoardSize],
  );
  const hudominoInternalMatchTarget = useMemo(
    () => getHudominoInternalMatchTarget(hudominoBoardSize),
    [hudominoBoardSize],
  );
  const hudominoValidPairs = useMemo(
    () => hudominoPairs.filter((pair) => pair.term.trim() && pair.definition.trim()),
    [hudominoPairs],
  );
  const hudominoMissingPairsCount = Math.max(0, hudominoRequiredPairs - hudominoValidPairs.length);
  const hudominoMatchEdgeKeys = useMemo(
    () => (hudominoPuzzle ? collectHudominoMatchEdgeKeys(hudominoPuzzle) : new Set<string>()),
    [hudominoPuzzle],
  );
  const hudominoMatchedConnectionsCount = hudominoMatchEdgeKeys.size;

  const activeQuestion =
    gameType === "hudomino"
      ? null
      : activeCell
        ? board[activeCell.categoryIndex]?.cells[activeCell.rowIndex] ?? null
        : null;

  const jeopardyMissingFieldsCount = useMemo(() => {
    return board.reduce((total, category) => {
      return (
        total +
        category.cells.filter((cell) => !cell.question.trim() || !cell.answer.trim()).length
      );
    }, 0);
  }, [board]);

  const quickTriviaMissingFieldsCount = useMemo(() => {
    return quickTriviaQuestions.filter(
      (question) =>
        !question.question.trim() ||
        !question.answer.trim() ||
        !question.wrongAnswer1.trim() ||
        !question.wrongAnswer2.trim() ||
        !question.wrongAnswer3.trim(),
    ).length;
  }, [quickTriviaQuestions]);

  const missingFieldsCount = (() => {
    if (gameType === "quick-trivia") return quickTriviaMissingFieldsCount;
    if (gameType === "hudomino") return hudominoMissingPairsCount;
    return jeopardyMissingFieldsCount;
  })();

  const jeopardyUsedCount = useMemo(() => {
    return board.reduce((total, category) => total + category.cells.filter((cell) => cell.used).length, 0);
  }, [board]);

  const quickTriviaUsedCount = useMemo(() => {
    return quickTriviaQuestions.filter((question) => question.used).length;
  }, [quickTriviaQuestions]);
  const quickTriviaMillionaireOrder = useMemo(
    () =>
      [...quickTriviaQuestions].sort((left, right) => {
        const difficultyGap =
          QUICK_TRIVIA_DIFFICULTY_RANK[left.difficulty] - QUICK_TRIVIA_DIFFICULTY_RANK[right.difficulty];
        if (difficultyGap !== 0) return difficultyGap;
        return left.value - right.value;
      }),
    [quickTriviaQuestions],
  );
  const quickTriviaStepById = useMemo(
    () => new Map(quickTriviaMillionaireOrder.map((question, index) => [question.id, index + 1])),
    [quickTriviaMillionaireOrder],
  );
  const quickTriviaLadder = useMemo(() => [...quickTriviaMillionaireOrder], [quickTriviaMillionaireOrder]);
  const nextQuickTriviaQuestion = useMemo(
    () => quickTriviaMillionaireOrder.find((question) => !question.used) ?? null,
    [quickTriviaMillionaireOrder],
  );
  const quickTriviaOptionLetters = ["א", "ב", "ג", "ד"];

  const usedCount = (() => {
    if (gameType === "quick-trivia") return quickTriviaUsedCount;
    if (gameType === "hudomino") return hudominoMatchedConnectionsCount;
    return jeopardyUsedCount;
  })();
  const totalQuestions = (() => {
    if (gameType === "quick-trivia") return quickTriviaQuestions.length;
    if (gameType === "hudomino") return hudominoInternalMatchTarget;
    return categoryCount * rowCount;
  })();
  const canStartGame =
    gameType === "hudomino"
      ? hudominoValidPairs.length >= hudominoRequiredPairs
      : missingFieldsCount === 0 && totalQuestions > 0;
  const isHudominoCompetitive = gameType === "hudomino" && hudominoScoringMode === "competitive";
  const usesTeamPlay = gameType === "jeopardy" || (gameType === "hudomino" && isHudominoCompetitive);
  const currentTeam = teams[currentTurnIndex] ?? teams[0];
  const resolvedGameTopic = gameTopic.trim() || DEFAULT_GAME_TOPIC;
  const millionaireHeaderTitle = gameTopic.trim() || DEFAULT_GAME_TOPIC;
  const gameIntroContent = useMemo(() => {
    if (gameType === "quick-trivia") {
      return {
        title: "ברוכים הבאים למליונר",
        lines: [
          "בכל סבב תופיע שאלה אחת עם 4 תשובות אפשריות.",
          "יש לבחור תשובה אחת. תשובה נכונה מקדמת בסולם הזכייה.",
          "אפשר להשתמש בגלגלי ההצלה פעם אחת לכל סוג.",
        ],
      };
    }
    if (gameType === "hudomino") {
      return {
        title: "ברוכים הבאים לחודומינו",
        lines: [
          `מטרת המשחק: לחבר זוגות מושג-הגדרה על לוח ${hudominoBoardSize}x${hudominoBoardSize}.`,
          isHudominoCompetitive
            ? "במצב תחרותי כל חיבור נכון מזכה נקודות ומעביר תור לקבוצה הבאה."
            : "במצב שיתופי כל הקבוצות פותרות יחד עד השלמת כל החיבורים.",
          hudominoPlayMode === "challenge"
            ? "מצב אתגר: קודם ממקמים, ורק אחר כך חושפים התאמות."
            : "מצב למידה: ההתאמות נראות תוך כדי משחק.",
        ],
      };
    }
    return {
      title: "ברוכים הבאים לג׳פרדי קלאסי",
      lines: [
        "בחרו תא מהלוח, קראו את השאלה וחשפו את התשובה.",
        "לאחר כל שאלה אפשר לעדכן ניקוד לקבוצה הפעילה.",
        "משחקים עד שכל התאים בלוח סומנו כמשומשים.",
      ],
    };
  }, [gameType, hudominoBoardSize, hudominoPlayMode, isHudominoCompetitive]);
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
  const pageOverlayAlpha = boardTheme.pageBackgroundOverlay / 100;
  const pageImageOverlayStrong = clamp(0.08 + pageOverlayAlpha * 0.72, 0, 0.9);
  const pageImageOverlaySoft = clamp(0.06 + pageOverlayAlpha * 0.58, 0, 0.84);
  const palettePageBackgroundImage =
    `radial-gradient(circle at 82% 10%, ${withAlpha(boardTheme.categoryBgStart, 0.24)}, transparent 46%), ` +
    `radial-gradient(circle at 14% 88%, ${withAlpha(boardTheme.cellBorderColor, 0.2)}, transparent 42%), ` +
    `linear-gradient(145deg, ${boardTheme.boardBackgroundColor}, ${boardTheme.categoryBgEnd} 48%, ${boardTheme.cellBgColor})`;
  const pageBackgroundOverlayLayer =
    `linear-gradient(135deg, ${withAlpha(boardTheme.boardBackgroundColor, pageImageOverlayStrong)}, ` +
    `${withAlpha(boardTheme.categoryBgEnd, pageImageOverlaySoft)})`;
  const gamePageBackgroundImage = boardTheme.pageBackgroundImage
    ? `${pageBackgroundOverlayLayer}, url("${boardTheme.pageBackgroundImage}")`
    : `${pageBackgroundOverlayLayer}, ${palettePageBackgroundImage}`;
  const normalizedBoardBackground = normalizeHexColor(boardTheme.boardBackgroundColor);
  const boardBackgroundLuminance = normalizedBoardBackground
    ? getRelativeLuminance(normalizedBoardBackground)
    : 0.25;
  const isLightBoardTheme = boardBackgroundLuminance >= 0.62;
  const shellCardAlpha = isLightBoardTheme ? 0.9 : 0.64;
  const shellCardBorderAlpha = isLightBoardTheme ? 0.74 : 0.55;
  const shellAccentAlpha = isLightBoardTheme ? 0.78 : 0.44;
  const shellAccentBorderAlpha = isLightBoardTheme ? 0.68 : 0.52;
  const shellControlAlpha = isLightBoardTheme ? 0.94 : 0.82;
  const shellControlBorderAlpha = isLightBoardTheme ? 0.72 : 0.62;
  const shellPillAlpha = isLightBoardTheme ? 0.68 : 0.42;
  const shellPillBorderAlpha = isLightBoardTheme ? 0.74 : 0.65;
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
          ["--game-shell-card-bg" as string]: withAlpha(boardTheme.boardBackgroundColor, shellCardAlpha),
          ["--game-shell-card-border" as string]: withAlpha(boardTheme.boardBorderColor, shellCardBorderAlpha),
          ["--game-shell-accent-bg" as string]: withAlpha(boardTheme.categoryBgEnd, shellAccentAlpha),
          ["--game-shell-accent-border" as string]: withAlpha(
            boardTheme.cellBorderColor,
            shellAccentBorderAlpha,
          ),
          ["--game-shell-text-color" as string]: gameShellTextColor,
          ["--game-shell-control-bg" as string]: withAlpha(boardTheme.boardBackgroundColor, shellControlAlpha),
          ["--game-shell-control-border" as string]: withAlpha(
            boardTheme.cellBorderColor,
            shellControlBorderAlpha,
          ),
          ["--game-shell-control-text" as string]: gameShellControlTextColor,
          ["--game-shell-pill-bg" as string]: withAlpha(boardTheme.categoryBgStart, shellPillAlpha),
          ["--game-shell-pill-border" as string]: withAlpha(boardTheme.boardBorderColor, shellPillBorderAlpha),
          ["--game-shell-topic-text" as string]: gameShellTopicTextColor,
        }
      : undefined;
  const modalTextColor = getTextColorForBackground(boardTheme.boardBackgroundColor);
  const modalQuestionTextColor = getReadableTextColor(
    boardTheme.categoryTextColor,
    boardTheme.cellBgColor,
    4.5,
  );
  const modalAnswerTextColor = getReadableTextColor(
    boardTheme.categoryTextColor,
    boardTheme.usedCellBgColor,
    4.5,
  );
  const hudominoAxisTheme = useMemo(() => {
    const candidates = [boardTheme.categoryBgStart, boardTheme.categoryBgEnd]
      .map((color) => normalizeHexColor(color))
      .filter((color): color is string => Boolean(color));

    const fallbackBase = "#3f3f9f";
    const baseTone =
      candidates.length > 0
        ? candidates.reduce((darkest, candidate) =>
            getRelativeLuminance(candidate) < getRelativeLuminance(darkest) ? candidate : darkest,
          )
        : fallbackBase;
    let darkShade = mixHexColors(baseTone, "#000000", 0.24);
    let darkShadeLuminance = getRelativeLuminance(darkShade);
    for (let step = 0; step < 8 && darkShadeLuminance < 0.13; step += 1) {
      darkShade = mixHexColors(darkShade, "#ffffff", 0.12);
      darkShadeLuminance = getRelativeLuminance(darkShade);
    }

    let lightShade = mixHexColors(baseTone, "#ffffff", 0.83);
    let lightShadeLuminance = getRelativeLuminance(lightShade);
    for (let step = 0; step < 4 && lightShadeLuminance > 0.94; step += 1) {
      lightShade = mixHexColors(lightShade, baseTone, 0.08);
      lightShadeLuminance = getRelativeLuminance(lightShade);
    }

    return {
      darkShade,
      darkText: "#f8fafc",
      lightShade,
      lightText: "#0f172a",
    };
  }, [
    boardTheme.boardBackgroundColor,
    boardTheme.categoryBgEnd,
    boardTheme.categoryBgStart,
  ]);
  const hudominoGlowTheme = useMemo(() => {
    const glowBase = mixHexColors(boardTheme.categoryBgStart, boardTheme.categoryBgEnd, 0.5);
    const glowSoft = mixHexColors(hudominoAxisTheme.lightShade, "#ffffff", 0.24);
    const glowCore = mixHexColors(glowBase, "#ffffff", 0.3);
    const glowEdge = mixHexColors(glowBase, hudominoAxisTheme.darkShade, 0.26);

    return {
      glowSoft,
      glowCore,
      glowShadowNear: withAlpha(glowCore, 0.94),
      glowShadowMid: withAlpha(glowCore, 0.8),
      glowShadowFar: withAlpha(glowEdge, 0.68),
      borderTone: mixHexColors(hudominoAxisTheme.lightShade, hudominoAxisTheme.darkShade, 0.2),
    };
  }, [
    boardTheme.categoryBgEnd,
    boardTheme.categoryBgStart,
    hudominoAxisTheme.darkShade,
    hudominoAxisTheme.lightShade,
  ]);
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
  const activeQuestionText = activeQuestion?.question?.trim() || "לא הוזן טקסט לשאלה זו.";
  const activeAnswerText = activeQuestion?.answer?.trim() || "לא הוזן טקסט לתשובה זו.";
  const isActiveQuestionTextMissing = !activeQuestion?.question?.trim();
  const isActiveAnswerTextMissing = !activeQuestion?.answer?.trim();
  const hudominoCubeById = useMemo(
    () => new Map((hudominoPuzzle?.cubes ?? []).map((cube) => [cube.id, cube])),
    [hudominoPuzzle],
  );
  const shouldShowHudominoMatches = mode === "game";

  useEffect(() => {
    if (mode !== "game" || gameType !== "quick-trivia") {
      setQuickTriviaCurrentOptions([]);
      setQuickTriviaCorrectOptionIndex(null);
      setQuickTriviaHiddenOptionIndexes([]);
      setQuickTriviaSelectedOptionIndex(null);
      setQuickTriviaCanAnswer(true);
      return;
    }

    if (!nextQuickTriviaQuestion) {
      setActiveQuickQuestionId(null);
      setQuickTriviaCurrentOptions([]);
      setQuickTriviaCorrectOptionIndex(null);
      setQuickTriviaHiddenOptionIndexes([]);
      setQuickTriviaSelectedOptionIndex(null);
      setQuickTriviaCanAnswer(false);
      return;
    }

    const optionPool = [
      { text: nextQuickTriviaQuestion.answer.trim(), isCorrect: true },
      { text: nextQuickTriviaQuestion.wrongAnswer1.trim(), isCorrect: false },
      { text: nextQuickTriviaQuestion.wrongAnswer2.trim(), isCorrect: false },
      { text: nextQuickTriviaQuestion.wrongAnswer3.trim(), isCorrect: false },
    ];
    const shuffled = shuffleArray(optionPool);
    setActiveQuickQuestionId(nextQuickTriviaQuestion.id);
    setQuickTriviaCurrentOptions(shuffled.map((option) => option.text));
    setQuickTriviaCorrectOptionIndex(shuffled.findIndex((option) => option.isCorrect));
    setQuickTriviaHiddenOptionIndexes([]);
    setQuickTriviaSelectedOptionIndex(null);
    setQuickTriviaCanAnswer(true);
  }, [gameType, mode, nextQuickTriviaQuestion]);
  const getHudominoSideMatchesForSlot = useCallback(
    (slotIndex: number): Record<HudominoSideDirection, boolean> => {
      const result: Record<HudominoSideDirection, boolean> = {
        north: false,
        east: false,
        south: false,
        west: false,
      };
      if (!hudominoPuzzle) return result;
      if (!hudominoPuzzle.boardSlots[slotIndex]) return result;

      const size = hudominoPuzzle.size;
      const row = Math.floor(slotIndex / size);
      const col = slotIndex % size;
      const neighbors: Array<{ direction: HudominoSideDirection; slot: number | null }> = [
        { direction: "north", slot: row > 0 ? slotIndex - size : null },
        { direction: "east", slot: col < size - 1 ? slotIndex + 1 : null },
        { direction: "south", slot: row < size - 1 ? slotIndex + size : null },
        { direction: "west", slot: col > 0 ? slotIndex - 1 : null },
      ];

      neighbors.forEach(({ direction, slot }) => {
        if (slot === null) return;
        if (!hudominoPuzzle.boardSlots[slot]) return;
        const key = buildHudominoEdgeKey(slotIndex, slot);
        if (hudominoMatchEdgeKeys.has(key)) {
          result[direction] = true;
        }
      });
      return result;
    },
    [hudominoMatchEdgeKeys, hudominoPuzzle],
  );

  const buildCurrentGameSnapshot = (options?: { stripInlineImages?: boolean }): SharePayload["game"] => {
    const sanitizeImage = (image: string | null): string | null => {
      if (!image) return null;
      if (options?.stripInlineImages && image.startsWith("data:")) {
        return null;
      }
      return image;
    };

    return {
      gameType,
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
      quickTriviaQuestions: quickTriviaQuestions.map((question) => ({
        value: question.value,
        question: question.question,
        answer: question.answer,
        wrongAnswer1: question.wrongAnswer1,
        wrongAnswer2: question.wrongAnswer2,
        wrongAnswer3: question.wrongAnswer3,
        difficulty: question.difficulty,
        used: question.used,
      })),
      hudominoPairs: hudominoPairs.map((pair) => ({
        term: pair.term,
        definition: pair.definition,
      })),
      hudominoDifficulty,
      hudominoPlayMode,
      hudominoScoringMode,
      hudominoPuzzle: hudominoPuzzle ?? undefined,
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
    if (!sharedGame) {
      throw new Error("Invalid game payload");
    }

    const sharedGameType: GameType =
      sharedGame.gameType === "quick-trivia"
        ? "quick-trivia"
        : sharedGame.gameType === "hudomino"
          ? "hudomino"
          : "jeopardy";
    const sharedBoard = Array.isArray(sharedGame.board) ? sharedGame.board : [];
    const hasSharedBoard = sharedBoard.length > 0;
    if (sharedGameType === "jeopardy" && !hasSharedBoard) {
      throw new Error("Invalid game payload");
    }

    if (hasSharedBoard) {
      const importedCategoryCount = clamp(sharedBoard.length, MIN_CATEGORIES, MAX_CATEGORIES);
      const maxRowsInBoard = Math.max(...sharedBoard.map((category) => category?.cells?.length ?? 0));
      const importedRowCount = clamp(maxRowsInBoard || MIN_ROWS, MIN_ROWS, MAX_ROWS);
      const explicitValues = sharedBoard.reduce<number[]>((values, category) => {
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
        const sourceCategory = sharedBoard?.[categoryIndex];
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

      setCategoryCount(importedCategoryCount);
      setRowCount(importedRowCount);
      setBaseValue(importedBaseValue);
      setBoard(nextBoard);
    }

    const sharedTeams = Array.isArray(sharedGame.teams) ? sharedGame.teams : [];
    const importedTeamCount = clamp(sharedTeams.length || 2, MIN_TEAMS, MAX_TEAMS);
    const normalizedTurnIndex = Number.isFinite(Number(sharedGame.currentTurnIndex))
      ? clamp(Math.round(Number(sharedGame.currentTurnIndex)), 0, importedTeamCount - 1)
      : 0;

    const sharedHudominoDifficulty: HudominoDifficulty =
      sharedGame.hudominoDifficulty === "easy" ||
      sharedGame.hudominoDifficulty === "medium" ||
      sharedGame.hudominoDifficulty === "hard"
        ? sharedGame.hudominoDifficulty
        : "medium";
    const sharedHudominoPlayMode: HudominoPlayMode =
      sharedGame.hudominoPlayMode === "challenge" ? "challenge" : "learning";
    const sharedHudominoScoringMode: HudominoScoringMode =
      sharedGame.hudominoScoringMode === "cooperative" || sharedGame.hudominoScoringMode === "competitive"
        ? sharedGame.hudominoScoringMode
        : "competitive";
    const sharedHudominoBoardSize = getHudominoBoardSize(sharedHudominoDifficulty);
    const sharedHudominoRequiredPairs = getHudominoRequiredPairs(sharedHudominoBoardSize);
    const normalizedHudominoPairs = normalizeHudominoPairs(
      sharedGame.hudominoPairs,
      sharedHudominoRequiredPairs,
    );

    setGameType(sharedGameType);
    setGameTopic(sharedGame.gameTopic?.trim() || DEFAULT_GAME_TOPIC);
    setBoardTheme(resolveBoardTheme(sharedGame.boardTheme));
    setQuickTriviaQuestions(normalizeQuickTriviaQuestions(sharedGame.quickTriviaQuestions));
    setHudominoDifficulty(sharedHudominoDifficulty);
    setHudominoPlayMode(sharedHudominoPlayMode);
    setHudominoScoringMode(sharedHudominoScoringMode);
    setHudominoPairs(normalizedHudominoPairs);
    setHudominoPuzzle(
      normalizeHudominoPuzzleState(
        sharedGame.hudominoPuzzle,
        normalizedHudominoPairs,
        sharedHudominoBoardSize,
        sharedHudominoPlayMode,
      ),
    );
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
    setActiveQuickQuestionId(null);
    setHudominoDraggedCubeId(null);
    setShowAnswer(false);
    setDidScoreCurrentQuestion(false);
    setIsSharedViewOnly(options.access === "view");
    setCanCreateEditShare(options.canShareEdit);
    setIsGameIntroModalOpen(options.mode === "game");
    setMode(options.mode);
    setStatusMessage("");
  };

  const buildSharePreviewLink = (options: {
    access: ShareAccess;
    encodedGame?: string;
    serverGameId?: string;
    gameTitle?: string;
    gameType?: GameType;
    categories?: number;
    rows?: number;
    questionCount?: number;
  }): string => {
    const shareUrl = new URL(window.location.href);
    shareUrl.pathname = "/api/share-preview";
    shareUrl.search = "";
    shareUrl.searchParams.set("a", options.access === "edit" ? "e" : "v");
    if (options.encodedGame) {
      shareUrl.searchParams.set(SHARE_QUERY_PARAM, options.encodedGame);
    }
    if (options.serverGameId) {
      shareUrl.searchParams.set(SERVER_GAME_QUERY_PARAM, options.serverGameId);
    }
    if (options.gameTitle) {
      shareUrl.searchParams.set("t", encodeBase64Url(options.gameTitle));
    }
    if (options.gameType) {
      shareUrl.searchParams.set("g", options.gameType);
    }
    if (typeof options.categories === "number") {
      shareUrl.searchParams.set("c", String(options.categories));
    }
    if (typeof options.rows === "number") {
      shareUrl.searchParams.set("r", String(options.rows));
    }
    if (typeof options.questionCount === "number") {
      shareUrl.searchParams.set("q", String(options.questionCount));
    }
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
    if (mode !== "game" && isGameIntroModalOpen) {
      setIsGameIntroModalOpen(false);
    }
  }, [isGameIntroModalOpen, mode]);

  useEffect(() => {
    if (!isGameIntroModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsGameIntroModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isGameIntroModalOpen]);

  useEffect(() => {
    if (gameType !== "hudomino") return;
    if (!hudominoPuzzle) return;
    const needsMigration =
      hudominoPuzzle.bankOrder.length > 0 || hudominoPuzzle.boardSlots.some((slot) => slot === null);
    if (!needsMigration) return;
    setHudominoPuzzle((previous) =>
      previous
        ? normalizeHudominoPuzzleState(previous, hudominoValidPairs, hudominoBoardSize, hudominoPlayMode)
        : previous,
    );
  }, [gameType, hudominoBoardSize, hudominoPlayMode, hudominoPuzzle, hudominoValidPairs]);

  useEffect(() => {
    if (gameType !== "hudomino") return;
    setHudominoPairs((previous) => normalizeHudominoPairs(previous, hudominoRequiredPairs));
  }, [gameType, hudominoRequiredPairs]);

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

  const updateQuickTriviaCount = (nextValue: number) => {
    const clamped = clamp(nextValue, QUICK_TRIVIA_MIN_QUESTIONS, QUICK_TRIVIA_MAX_QUESTIONS);
    setQuickTriviaQuestions((previous) => {
      if (clamped === previous.length) {
        return previous;
      }
      if (clamped < previous.length) {
        return previous.slice(0, clamped);
      }
      const additions = Array.from({ length: clamped - previous.length }, (_, offset) => ({
        id: `quick-q-${previous.length + offset + 1}`,
        value: getQuickTriviaValueForIndex(previous.length + offset),
        question: "",
        answer: "",
        wrongAnswer1: "",
        wrongAnswer2: "",
        wrongAnswer3: "",
        difficulty: getQuickTriviaDifficultyForIndex(previous.length + offset, clamped),
        used: false,
      }));
      return [...previous, ...additions];
    });
  };

  const updateQuickTriviaQuestion = (
    questionId: string,
    field:
      | "value"
      | "question"
      | "answer"
      | "wrongAnswer1"
      | "wrongAnswer2"
      | "wrongAnswer3"
      | "difficulty",
    nextValue: string | number,
  ) => {
    setQuickTriviaQuestions((previous) =>
      previous.map((question, index) => {
        if (question.id !== questionId) return question;
        if (field === "value") {
          return {
            ...question,
            value: getQuickTriviaValueForIndex(index),
          };
        }
        if (field === "difficulty") {
          const normalizedDifficulty = normalizeQuickTriviaDifficulty(String(nextValue)) ?? question.difficulty;
          return { ...question, difficulty: normalizedDifficulty };
        }
        return { ...question, [field]: String(nextValue) };
      }),
    );
  };

  const updateHudominoPair = (
    pairId: string,
    field: "term" | "definition",
    nextValue: string,
  ) => {
    setHudominoPairs((previous) =>
      previous.map((pair) => (pair.id === pairId ? { ...pair, [field]: nextValue } : pair)),
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

  const applyHudominoPuzzleUpdate = (
    producer: (state: HudominoPuzzleState) => HudominoPuzzleState,
  ) => {
    if (!hudominoPuzzle) return;
    const beforeState = hudominoPuzzle;
    const nextState = producer(beforeState);
    if (nextState === beforeState) return;

    setHudominoPuzzle(nextState);

    if (mode !== "game" || gameType !== "hudomino") return;

    const beforeMatches = collectHudominoMatchEdgeKeys(beforeState);
    const afterMatches = collectHudominoMatchEdgeKeys(nextState);
    const newConnections = Array.from(afterMatches).filter((key) => !beforeMatches.has(key)).length;
    const points = newConnections * HUDOMINO_POINT_PER_MATCH;

    if (points > 0) {
      if (hudominoScoringMode === "competitive") {
        setTeams((previous) =>
          previous.map((team, index) =>
            index === currentTurnIndex ? { ...team, score: team.score + points } : team,
          ),
        );
      }
    }

    if (hudominoScoringMode === "competitive") {
      const teamCount = teams.length;
      setCurrentTurnIndex((previous) => (teamCount > 0 ? (previous + 1) % teamCount : 0));
    }
  };

  const moveHudominoCube = (cubeId: string, targetSlot: number) => {
    applyHudominoPuzzleUpdate((state) => {
      const sourceSlot = state.boardSlots.findIndex((slotCubeId) => slotCubeId === cubeId);
      if (sourceSlot === -1) return state;
      if (targetSlot < 0 || targetSlot >= state.boardSlots.length) return state;
      if (targetSlot === sourceSlot) return state;

      const nextBoard = [...state.boardSlots];
      const occupiedCubeId = nextBoard[targetSlot];
      nextBoard[targetSlot] = cubeId;
      if (occupiedCubeId) {
        nextBoard[sourceSlot] = occupiedCubeId;
      } else {
        nextBoard[sourceSlot] = null;
      }

      return {
        ...state,
        boardSlots: nextBoard,
      };
    });
  };

  const rotateHudominoCube = (cubeId: string) => {
    applyHudominoPuzzleUpdate((state) => {
      const cubeIndex = state.cubes.findIndex((cube) => cube.id === cubeId);
      if (cubeIndex === -1) return state;
      const nextCubes = [...state.cubes];
      nextCubes[cubeIndex] = {
        ...nextCubes[cubeIndex],
        rotation: (nextCubes[cubeIndex].rotation + 1) % 4,
      };
      return {
        ...state,
        cubes: nextCubes,
      };
    });
  };

  const onHudominoDragStart = (event: DragEvent<HTMLElement>, cubeId: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", cubeId);
    setHudominoDraggedCubeId(cubeId);
  };

  const onHudominoDragEnd = () => {
    setHudominoDraggedCubeId(null);
  };

  const dropHudominoToSlot = (slotIndex: number, cubeIdFromDrop?: string) => {
    const draggedCubeId = cubeIdFromDrop || hudominoDraggedCubeId;
    if (!draggedCubeId) return;
    moveHudominoCube(draggedCubeId, slotIndex);
    setHudominoDraggedCubeId(null);
  };

  const revealHudominoChallenge = () => {
    setHudominoPuzzle((previous) => (previous ? { ...previous, isChallengeReveal: true } : previous));
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
      setIsBackgroundPickerOpen(false);
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

  useEffect(() => {
    if (!isBackgroundPickerOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsBackgroundPickerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isBackgroundPickerOpen]);

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

  const copyArchiveViewLink = async (record: ArchiveGameRecord) => {
    try {
      const archiveGameType = resolveArchiveGameType(record.payload);
      let categories: number | undefined;
      let rows: number | undefined;
      let questionCount: number | undefined;

      if (record.payload && typeof record.payload === "object") {
        const payloadRecord = record.payload as {
          board?: Array<{ cells?: unknown[] }>;
          quickTriviaQuestions?: unknown[];
          hudominoPuzzle?: { size?: unknown };
        };
        if (archiveGameType === "jeopardy") {
          categories = Array.isArray(payloadRecord.board) ? payloadRecord.board.length : undefined;
          rows = Array.isArray(payloadRecord.board?.[0]?.cells) ? payloadRecord.board[0].cells.length : undefined;
        } else if (archiveGameType === "quick-trivia") {
          questionCount = Array.isArray(payloadRecord.quickTriviaQuestions)
            ? payloadRecord.quickTriviaQuestions.length
            : undefined;
        } else if (archiveGameType === "hudomino") {
          const puzzleSize = Number(payloadRecord.hudominoPuzzle?.size);
          rows = Number.isFinite(puzzleSize) ? Math.round(puzzleSize) : undefined;
          categories = rows;
        }
      }

      const previewLink = buildSharePreviewLink({
        access: "view",
        serverGameId: record.id,
        gameTitle: record.title?.trim() || DEFAULT_GAME_TOPIC,
        gameType: archiveGameType,
        categories,
        rows,
        questionCount,
      });
      await navigator.clipboard.writeText(previewLink);
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

  const updatePageBackgroundOverlay = (value: number) => {
    setBoardTheme((previous) => ({ ...previous, pageBackgroundOverlay: clamp(value, 0, 100) }));
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
      setStatusMessage("תמונת רקע כללית גדולה מדי. המקסימום הוא 12MB.");
      event.target.value = "";
      return;
    }

    try {
      const { width, height } = await readImageDimensions(file);
      const ratio = width / height;
      const ratioDelta = Math.abs(ratio - GAME_PAGE_BACKGROUND_TARGET_RATIO);
      const isLowResolution =
        width < GAME_PAGE_BACKGROUND_MIN_WIDTH || height < GAME_PAGE_BACKGROUND_MIN_HEIGHT;
      const isFarFromTargetRatio = ratioDelta > GAME_PAGE_BACKGROUND_RATIO_TOLERANCE;

      const dataUrl = await fileToDataUrl(file);
      setBoardTheme((previous) => ({ ...previous, pageBackgroundImage: dataUrl }));
      if (isLowResolution && isFarFromTargetRatio) {
        setStatusMessage("התמונה נטענה. מומלץ להשתמש בתמונה חדה יותר וביחס קרוב ל-16:9.");
      } else if (isLowResolution) {
        setStatusMessage("התמונה נטענה. מומלץ להשתמש בתמונה חדה יותר (לפחות 1280x720).");
      } else if (isFarFromTargetRatio) {
        setStatusMessage("התמונה נטענה. מומלץ יחס קרוב ל-16:9 לתצוגה מיטבית.");
      } else {
        setStatusMessage("תמונת הרקע הכללית נטענה בהצלחה.");
      }
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

  const copyPromptToClipboard = async (promptText: string) => {
    try {
      await navigator.clipboard.writeText(promptText);
      setStatusMessage("הפרומפט הועתק ללוח.");
    } catch {
      setStatusMessage("לא ניתן להעתיק אוטומטית. סמני את הטקסט והעתיקי ידנית.");
    }
  };

  const persistShareSnapshotToServer = async (snapshot: SharePayload["game"]): Promise<string | null> => {
    if (!supabase) return null;

    if (activeArchiveGameId) {
      const { error } = await supabase
        .from(SUPABASE_GAMES_TABLE)
        .update({
          title: resolvedGameTopic,
          payload: snapshot,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeArchiveGameId);
      if (!error) {
        return activeArchiveGameId;
      }
    }

    const { error, data } = await supabase
      .from(SUPABASE_GAMES_TABLE)
      .insert({
        title: resolvedGameTopic,
        payload: snapshot,
      })
      .select("id")
      .single();

    if (error || !data) return null;
    setActiveArchiveGameId(data.id);
    return data.id;
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

      const serverGameId = await persistShareSnapshotToServer(payload.game);
      const previewLink = serverGameId
        ? buildSharePreviewLink({
            access,
            serverGameId,
          })
        : buildSharePreviewLink({
            access,
            encodedGame: encodeBase64Url(JSON.stringify(payload)),
            gameTitle: resolvedGameTopic,
            gameType,
            categories: gameType === "jeopardy" ? categoryCount : gameType === "hudomino" ? hudominoBoardSize : undefined,
            rows: gameType === "jeopardy" ? rowCount : gameType === "hudomino" ? hudominoBoardSize : undefined,
            questionCount: gameType === "quick-trivia" ? quickTriviaQuestions.length : undefined,
          });
      await navigator.clipboard.writeText(previewLink);
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
      if (gameType === "hudomino") {
        setStatusMessage(`לחודומינו נדרשים בדיוק ${hudominoRequiredPairs} זוגות מושג-הגדרה מלאים.`);
      } else {
        setStatusMessage("אי אפשר להתחיל משחק לפני שממלאים את כל השאלות והתשובות.");
      }
      return;
    }

    if (!gameTopic.trim()) {
      setGameTopic(DEFAULT_GAME_TOPIC);
    }

    if (gameType === "quick-trivia") {
      setQuickTriviaQuestions((previous) => previous.map((question) => ({ ...question, used: false })));
      setQuickTriviaScore(0);
      setQuickTriviaLifelines(QUICK_TRIVIA_DEFAULT_LIFELINES);
      setQuickTriviaModal((previous) => ({ ...previous, open: false, resetAfterClose: false }));
      setQuickTriviaHiddenOptionIndexes([]);
      setQuickTriviaSelectedOptionIndex(null);
      setQuickTriviaCanAnswer(true);
    } else if (gameType === "hudomino") {
      const nextPuzzle = createHudominoPuzzle(hudominoValidPairs, hudominoBoardSize, hudominoPlayMode);
      setHudominoPuzzle(nextPuzzle);
      setHudominoDraggedCubeId(null);
    } else {
      setBoard((previous) =>
        previous.map((category) => ({
          ...category,
          cells: category.cells.map((cell) => ({ ...cell, used: false })),
        })),
      );
    }
    setTeams((previous) => previous.map((team) => ({ ...team, score: 0 })));
    setCurrentTurnIndex(0);
    setActiveCell(null);
    setActiveQuickQuestionId(null);
    setHudominoDraggedCubeId(null);
    setShowAnswer(false);
    setDidScoreCurrentQuestion(false);
    setQuickTriviaModal((previous) => ({ ...previous, open: false, resetAfterClose: false }));
    setIsSharedViewOnly(false);
    setCanCreateEditShare(true);
    setIsGameIntroModalOpen(true);
    setStatusMessage("");
    setMode("game");
  };

  const returnToEditor = () => {
    if (isSharedViewOnly) {
      setStatusMessage("קישור זה מוגדר לצפייה בלבד.");
      return;
    }
    setActiveCell(null);
    setActiveQuickQuestionId(null);
    setHudominoDraggedCubeId(null);
    setShowAnswer(false);
    setDidScoreCurrentQuestion(false);
    setQuickTriviaModal((previous) => ({ ...previous, open: false, resetAfterClose: false }));
    setIsGameIntroModalOpen(false);
    setMode("editor");
  };

  const openQuestion = (categoryIndex: number, rowIndex: number) => {
    if (gameType !== "jeopardy") return;
    const cell = board[categoryIndex]?.cells[rowIndex];
    if (!cell || cell.used) return;

    setActiveCell({ categoryIndex, rowIndex });
    setActiveQuickQuestionId(null);
    setShowAnswer(false);
    setDidScoreCurrentQuestion(false);
  };

  const closeQuestion = () => {
    setActiveCell(null);
    setActiveQuickQuestionId(null);
    setShowAnswer(false);
    setDidScoreCurrentQuestion(false);
  };

  const openQuickTriviaModal = (
    title: string,
    content: string,
    buttonLabel = "סגור",
    resetAfterClose = false,
  ) => {
    setQuickTriviaModal({
      open: true,
      title,
      content,
      buttonLabel,
      resetAfterClose,
    });
  };

  const closeQuickTriviaModal = () => {
    const shouldReset = quickTriviaModal.resetAfterClose;
    setQuickTriviaModal((previous) => ({ ...previous, open: false, resetAfterClose: false }));
    if (shouldReset) {
      resetGameBoard();
    }
  };

  const checkQuickTriviaAnswer = (optionIndex: number) => {
    if (mode !== "game" || gameType !== "quick-trivia") return;
    if (!nextQuickTriviaQuestion) return;
    if (quickTriviaCorrectOptionIndex === null) return;
    if (!quickTriviaCanAnswer) return;
    if (quickTriviaHiddenOptionIndexes.includes(optionIndex)) return;

    const isCorrect = optionIndex === quickTriviaCorrectOptionIndex;
    const isLastQuestion = quickTriviaUsedCount + 1 >= quickTriviaMillionaireOrder.length;
    const currentQuestionValue = nextQuickTriviaQuestion.value;
    const previousScore = quickTriviaScore;

    setQuickTriviaCanAnswer(false);
    setQuickTriviaSelectedOptionIndex(optionIndex);

    if (isCorrect) {
      setQuickTriviaScore(currentQuestionValue);
      window.setTimeout(() => {
        setQuickTriviaQuestions((previous) =>
          previous.map((question) =>
            question.id === nextQuickTriviaQuestion.id ? { ...question, used: true } : question,
          ),
        );
        if (isLastQuestion) {
          openQuickTriviaModal(
            "ניצחתם!",
            `מזל טוב! הגעתם לסכום ${currentQuestionValue.toLocaleString()} ₪.`,
            "התחל מחדש",
            true,
          );
        }
      }, 1300);
      return;
    }

    window.setTimeout(() => {
      const correctAnswer = quickTriviaCurrentOptions[quickTriviaCorrectOptionIndex] ?? nextQuickTriviaQuestion.answer;
      setQuickTriviaSelectedOptionIndex(quickTriviaCorrectOptionIndex);
      openQuickTriviaModal(
        "טעות!",
        `התשובה הנכונה הייתה: ${correctAnswer}. סיימתם עם ₪ ${previousScore.toLocaleString()}.`,
        "נסה שוב",
        true,
      );
    }, 1300);
  };

  const useQuickTriviaFiftyFifty = () => {
    if (mode !== "game" || gameType !== "quick-trivia") return;
    if (!quickTriviaLifelines.fifty || !quickTriviaCanAnswer) return;
    if (quickTriviaCorrectOptionIndex === null) return;

    const candidates = quickTriviaCurrentOptions
      .map((_, index) => index)
      .filter(
        (index) => index !== quickTriviaCorrectOptionIndex && !quickTriviaHiddenOptionIndexes.includes(index),
      );
    const toHide = shuffleArray(candidates).slice(0, 2);
    setQuickTriviaHiddenOptionIndexes((previous) => Array.from(new Set([...previous, ...toHide])));
    setQuickTriviaLifelines((previous) => ({ ...previous, fifty: false }));
  };

  const useQuickTriviaPhoneFriend = () => {
    if (mode !== "game" || gameType !== "quick-trivia") return;
    if (!quickTriviaLifelines.phone || !quickTriviaCanAnswer) return;
    if (quickTriviaCorrectOptionIndex === null) return;

    const visibleOptionIndexes = quickTriviaCurrentOptions
      .map((_, index) => index)
      .filter((index) => !quickTriviaHiddenOptionIndexes.includes(index));

    let suggestionIndex = quickTriviaCorrectOptionIndex;
    if (Math.random() <= 0.2) {
      const alternativeIndexes = visibleOptionIndexes.filter((index) => index !== quickTriviaCorrectOptionIndex);
      if (alternativeIndexes.length > 0) {
        suggestionIndex = shuffleArray(alternativeIndexes)[0];
      }
    }

    const suggestionText = quickTriviaCurrentOptions[suggestionIndex] ?? "";
    const optionLabel = quickTriviaOptionLetters[suggestionIndex] ?? "";

    setQuickTriviaLifelines((previous) => ({ ...previous, phone: false }));
    openQuickTriviaModal(
      "החבר הטלפוני אומר:",
      `אני די בטוח שהתשובה היא ${optionLabel}: ${suggestionText}`,
    );
  };

  const useQuickTriviaAskAudience = () => {
    if (mode !== "game" || gameType !== "quick-trivia") return;
    if (!quickTriviaLifelines.audience || !quickTriviaCanAnswer) return;
    if (quickTriviaCorrectOptionIndex === null) return;

    const results = [0, 0, 0, 0];
    const visibleOptionIndexes = quickTriviaCurrentOptions
      .map((_, index) => index)
      .filter((index) => !quickTriviaHiddenOptionIndexes.includes(index));
    if (visibleOptionIndexes.length === 0) return;

    let remaining = 100;
    if (visibleOptionIndexes.includes(quickTriviaCorrectOptionIndex)) {
      const correctShare = Math.floor(Math.random() * 26) + 50;
      results[quickTriviaCorrectOptionIndex] = correctShare;
      remaining -= correctShare;
    }

    const otherIndexes = visibleOptionIndexes.filter((index) => index !== quickTriviaCorrectOptionIndex);
    otherIndexes.forEach((index, position) => {
      if (position === otherIndexes.length - 1) {
        results[index] += remaining;
        return;
      }
      const maxAllowed = Math.max(0, remaining - (otherIndexes.length - position - 1));
      const share = Math.floor(Math.random() * (maxAllowed + 1));
      results[index] += share;
      remaining -= share;
    });

    setQuickTriviaLifelines((previous) => ({ ...previous, audience: false }));
    openQuickTriviaModal(
      "תוצאות הקהל:",
      quickTriviaOptionLetters.map((label, index) => `${label}: ${results[index]}%`).join(" | "),
    );
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
    if (gameType === "quick-trivia") {
      if (!activeQuickQuestionId) return;
      setQuickTriviaQuestions((previous) =>
        previous.map((question) =>
          question.id === activeQuickQuestionId ? { ...question, used: true } : question,
        ),
      );
      setCurrentTurnIndex((previous) => (teams.length > 0 ? (previous + 1) % teams.length : 0));
      closeQuestion();
      return;
    }

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
    if (gameType === "quick-trivia") {
      setQuickTriviaQuestions((previous) => previous.map((question) => ({ ...question, used: false })));
      setQuickTriviaScore(0);
      setQuickTriviaLifelines(QUICK_TRIVIA_DEFAULT_LIFELINES);
      setQuickTriviaCurrentOptions([]);
      setQuickTriviaCorrectOptionIndex(null);
      setQuickTriviaHiddenOptionIndexes([]);
      setQuickTriviaSelectedOptionIndex(null);
      setQuickTriviaCanAnswer(true);
      setQuickTriviaModal((previous) => ({ ...previous, open: false, resetAfterClose: false }));
    } else if (gameType === "hudomino") {
      setHudominoPuzzle(createHudominoPuzzle(hudominoValidPairs, hudominoBoardSize, hudominoPlayMode));
      setHudominoDraggedCubeId(null);
    } else {
      setBoard((previous) =>
        previous.map((category) => ({
          ...category,
          cells: category.cells.map((cell) => ({ ...cell, used: false })),
        })),
      );
    }
    setTeams((previous) => previous.map((team) => ({ ...team, score: 0 })));
    setCurrentTurnIndex(0);
    closeQuestion();
  };

  const exportBoardToJson = () => {
    const payload: ExportPayload = {
      version: 1,
      settings: {
        gameTopic: resolvedGameTopic,
        gameType,
        categoryCount,
        rowCount,
        baseValue,
        teamCount: teams.length,
        teamNames: teams.map((team) => team.name),
        boardTheme,
        hudominoDifficulty,
        hudominoPlayMode,
        hudominoScoringMode,
      },
      categories: board.map((category) => ({
        title: category.title,
        cells: category.cells.map((cell) => ({
          value: cell.value,
          question: cell.question,
          answer: cell.answer,
        })),
      })),
      quickTriviaQuestions: quickTriviaQuestions.map((question) => ({
        value: question.value,
        question: question.question,
        answer: question.answer,
        wrongAnswer1: question.wrongAnswer1,
        wrongAnswer2: question.wrongAnswer2,
        wrongAnswer3: question.wrongAnswer3,
        difficulty: question.difficulty,
      })),
      hudominoPairs: hudominoPairs.map((pair) => ({
        term: pair.term,
        definition: pair.definition,
      })),
      hudominoPuzzle: hudominoPuzzle ?? undefined,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      gameType === "quick-trivia"
        ? "quick-trivia-board.json"
        : gameType === "hudomino"
          ? "hudomino-board.json"
          : "dna-jeopardy-board.json";
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

  const downloadQuickTriviaCsvTemplate = () => {
    const templateLines = [
      "question,correct_answer,wrong_answer_1,wrong_answer_2,wrong_answer_3,difficulty",
    ];
    createQuickTriviaQuestions().forEach((question) => {
      templateLines.push(`,,,,,${question.difficulty}`);
    });
    const csvContent = `\uFEFF${templateLines.join("\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "quick-trivia-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadHudominoCsvTemplate = () => {
    const templateLines = ["term,definition"];
    const templateRowCount = clamp(hudominoRequiredPairs, HUDOMINO_MIN_PAIRS, HUDOMINO_MAX_PAIRS);
    for (let index = 0; index < templateRowCount; index += 1) {
      templateLines.push(",");
    }
    const csvContent = `\uFEFF${templateLines.join("\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "hudomino-template.csv";
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

  const importQuickTriviaFromCsvFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      const getRequiredHeaderIndex = (headerName: string) => headers.findIndex((header) => header === headerName);

      const questionIndex = getRequiredHeaderIndex("question");
      const correctAnswerIndex = getRequiredHeaderIndex("correctanswer");
      const wrongAnswer1Index = getRequiredHeaderIndex("wronganswer1");
      const wrongAnswer2Index = getRequiredHeaderIndex("wronganswer2");
      const wrongAnswer3Index = getRequiredHeaderIndex("wronganswer3");
      const difficultyIndex = getRequiredHeaderIndex("difficulty");

      if (
        questionIndex === -1 ||
        correctAnswerIndex === -1 ||
        wrongAnswer1Index === -1 ||
        wrongAnswer2Index === -1 ||
        wrongAnswer3Index === -1 ||
        difficultyIndex === -1
      ) {
        throw new Error("Missing required columns.");
      }

      const parsedQuestions: Array<{
        question: string;
        answer: string;
        wrongAnswer1: string;
        wrongAnswer2: string;
        wrongAnswer3: string;
        difficulty: QuickTriviaDifficulty;
        sourceIndex: number;
      }> = [];

      rows.slice(1).forEach((row, rowNumber) => {
        const question = (row[questionIndex] ?? "").trim();
        const answer = (row[correctAnswerIndex] ?? "").trim();
        const wrongAnswer1 = (row[wrongAnswer1Index] ?? "").trim();
        const wrongAnswer2 = (row[wrongAnswer2Index] ?? "").trim();
        const wrongAnswer3 = (row[wrongAnswer3Index] ?? "").trim();
        const difficulty = (row[difficultyIndex] ?? "").trim();
        const isBlankRow = !question && !answer && !wrongAnswer1 && !wrongAnswer2 && !wrongAnswer3 && !difficulty;
        if (isBlankRow) return;

        if (!question || !answer || !wrongAnswer1 || !wrongAnswer2 || !wrongAnswer3 || !difficulty) {
          throw new Error(`Row ${rowNumber + 2} is missing required values.`);
        }

        const normalizedDifficulty = normalizeQuickTriviaDifficulty(difficulty);
        if (!normalizedDifficulty) {
          throw new Error(`Row ${rowNumber + 2} has invalid difficulty.`);
        }

        parsedQuestions.push({
          question,
          answer,
          wrongAnswer1,
          wrongAnswer2,
          wrongAnswer3,
          difficulty: normalizedDifficulty,
          sourceIndex: rowNumber,
        });
      });

      if (parsedQuestions.length === 0) {
        throw new Error("No valid rows found in CSV.");
      }

      const limitedQuestions = parsedQuestions.slice(0, QUICK_TRIVIA_MAX_QUESTIONS);
      if (limitedQuestions.length < QUICK_TRIVIA_MIN_QUESTIONS) {
        throw new Error("Not enough rows.");
      }

      const sortedQuestions = [...limitedQuestions].sort((left, right) => {
        const difficultyGap =
          QUICK_TRIVIA_DIFFICULTY_RANK[left.difficulty] - QUICK_TRIVIA_DIFFICULTY_RANK[right.difficulty];
        if (difficultyGap !== 0) return difficultyGap;
        return left.sourceIndex - right.sourceIndex;
      });

      const normalizedQuestions = sortedQuestions.map((question, index) => ({
        value: getQuickTriviaValueForIndex(index),
        question: question.question,
        answer: question.answer,
        wrongAnswer1: question.wrongAnswer1,
        wrongAnswer2: question.wrongAnswer2,
        wrongAnswer3: question.wrongAnswer3,
        difficulty: question.difficulty,
      }));

      setQuickTriviaQuestions(normalizeQuickTriviaQuestions(normalizedQuestions));
      setCurrentTurnIndex(0);
      setActiveCell(null);
      setActiveQuickQuestionId(null);
      setShowAnswer(false);
      setDidScoreCurrentQuestion(false);
      setMode("editor");

      const cutNotice =
        parsedQuestions.length > limitedQuestions.length
          ? ` שאלות עודפות קוצרו למקסימום ${QUICK_TRIVIA_MAX_QUESTIONS}.`
          : "";
      setStatusMessage(`ייבוא CSV לטריוויה הושלם בהצלחה.${cutNotice}`);
    } catch {
      setStatusMessage(
        "שגיאה בייבוא CSV לטריוויה. יש להשתמש בדיוק בעמודות: question, correct_answer, wrong_answer_1, wrong_answer_2, wrong_answer_3, difficulty.",
      );
    } finally {
      event.target.value = "";
    }
  };

  const importHudominoPairsFromCsvFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = (await file.text()).replace(/^\uFEFF/, "");
      const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
      const delimiter = detectDelimiter(firstLine);
      const rows = parseCsvRows(text, delimiter);
      if (rows.length === 0) {
        throw new Error("CSV is empty.");
      }

      const headers = rows[0].map(normalizeHeader);
      const findHeaderIndex = (aliases: string[]) => headers.findIndex((header) => aliases.includes(header));

      const detectedTermIndex = findHeaderIndex(["term", "concept", "keyword", "מושג", "מונח"]);
      const detectedDefinitionIndex = findHeaderIndex([
        "definition",
        "meaning",
        "description",
        "הגדרה",
        "פירוש",
      ]);

      const hasHeader = detectedTermIndex !== -1 && detectedDefinitionIndex !== -1;
      const termIndex = hasHeader ? detectedTermIndex : 0;
      const definitionIndex = hasHeader ? detectedDefinitionIndex : 1;

      if (!hasHeader && (rows[0]?.length ?? 0) < 2) {
        throw new Error("CSV must include term and definition columns.");
      }

      const sourceRows = hasHeader ? rows.slice(1) : rows;
      const parsedPairs: Array<{ term: string; definition: string }> = [];

      sourceRows.forEach((row, rowIndex) => {
        const term = (row[termIndex] ?? "").trim();
        const definition = (row[definitionIndex] ?? "").trim();
        const isBlankRow = !term && !definition;
        if (isBlankRow) return;
        if (!term || !definition) {
          throw new Error(`Row ${rowIndex + (hasHeader ? 2 : 1)} is missing term/definition.`);
        }
        parsedPairs.push({ term, definition });
      });

      if (parsedPairs.length === 0) {
        throw new Error("No valid term/definition pairs found.");
      }

      setHudominoPairs(normalizeHudominoPairs(parsedPairs, hudominoRequiredPairs));
      setHudominoPuzzle(null);
      setHudominoDraggedCubeId(null);
      setMode("editor");

      const cutNotice =
        parsedPairs.length > hudominoRequiredPairs
          ? ` זוגות עודפים קוצרו ל-${hudominoRequiredPairs} לפי גודל הלוח.`
          : "";
      const fillNotice =
        parsedPairs.length < hudominoRequiredPairs
          ? ` נוספו ${hudominoRequiredPairs - parsedPairs.length} שורות ריקות להשלמה לפי גודל הלוח.`
          : "";
      setStatusMessage(`ייבוא CSV לזוגות הושלם בהצלחה.${cutNotice}${fillNotice}`);
    } catch {
      setStatusMessage("שגיאה בייבוא CSV לזוגות. ודאי שיש שתי עמודות: term ו-definition.");
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
      const importedGameType: GameType =
        parsed.settings?.gameType === "quick-trivia"
          ? "quick-trivia"
          : parsed.settings?.gameType === "hudomino"
            ? "hudomino"
            : "jeopardy";
      const hasCategories = Array.isArray(parsed.categories) && parsed.categories.length > 0;
      const hasQuickTrivia =
        Array.isArray(parsed.quickTriviaQuestions) && parsed.quickTriviaQuestions.length > 0;
      const hasHudomino = Array.isArray(parsed.hudominoPairs) && parsed.hudominoPairs.length > 0;
      if (!hasCategories && !hasQuickTrivia && !hasHudomino) {
        throw new Error("קובץ לא תקין.");
      }

      if (hasCategories) {
        const importedCategoryCount = clamp(parsed.categories!.length, MIN_CATEGORIES, MAX_CATEGORIES);
        const importedRowCount = clamp(
          parsed.settings?.rowCount ?? parsed.categories?.[0]?.cells?.length ?? 5,
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

        setCategoryCount(importedCategoryCount);
        setRowCount(importedRowCount);
        setBaseValue(importedBaseValue);
        setBoard(nextBoard);
      }

      const importedTeamNames = parsed.settings?.teamNames ?? [];
      const importedTeamCount = clamp(
        parsed.settings?.teamCount ?? importedTeamNames.length ?? 2,
        MIN_TEAMS,
        MAX_TEAMS,
      );

      setGameType(importedGameType);
      setQuickTriviaQuestions(normalizeQuickTriviaQuestions(parsed.quickTriviaQuestions));
      const importedHudominoDifficulty: HudominoDifficulty =
        parsed.settings?.hudominoDifficulty === "easy" ||
        parsed.settings?.hudominoDifficulty === "medium" ||
        parsed.settings?.hudominoDifficulty === "hard"
          ? parsed.settings.hudominoDifficulty
          : "medium";
      const importedHudominoPlayMode: HudominoPlayMode =
        parsed.settings?.hudominoPlayMode === "challenge" ? "challenge" : "learning";
      const importedHudominoScoringMode: HudominoScoringMode =
        parsed.settings?.hudominoScoringMode === "cooperative" ||
        parsed.settings?.hudominoScoringMode === "competitive"
          ? parsed.settings.hudominoScoringMode
          : "competitive";
      const importedHudominoBoardSize = getHudominoBoardSize(importedHudominoDifficulty);
      const importedHudominoRequiredPairs = getHudominoRequiredPairs(importedHudominoBoardSize);
      const normalizedHudominoPairs = normalizeHudominoPairs(
        parsed.hudominoPairs,
        importedHudominoRequiredPairs,
      );
      setHudominoDifficulty(importedHudominoDifficulty);
      setHudominoPlayMode(importedHudominoPlayMode);
      setHudominoScoringMode(importedHudominoScoringMode);
      setHudominoPairs(normalizedHudominoPairs);
      setHudominoPuzzle(
        normalizeHudominoPuzzleState(
          parsed.hudominoPuzzle,
          normalizedHudominoPairs,
          importedHudominoBoardSize,
          importedHudominoPlayMode,
        ),
      );
      setGameTopic(parsed.settings?.gameTopic?.trim() || DEFAULT_GAME_TOPIC);
      setBoardTheme(resolveBoardTheme(parsed.settings?.boardTheme));
      setTeams(
        Array.from({ length: importedTeamCount }, (_, index) => ({
          id: `team-${index + 1}`,
          name: importedTeamNames[index] || `קבוצה ${index + 1}`,
          score: 0,
        })),
      );
      setCurrentTurnIndex(0);
      setActiveCell(null);
      setActiveQuickQuestionId(null);
      setHudominoDraggedCubeId(null);
      setShowAnswer(false);
      setDidScoreCurrentQuestion(false);
      setMode("editor");
      setStatusMessage(
        importedGameType === "quick-trivia"
          ? "משחק מי רוצה להיות מליונר נטען בהצלחה."
          : importedGameType === "hudomino"
            ? "משחק חודומינו נטען בהצלחה."
            : "הלוח נטען בהצלחה.",
      );
    } catch {
      setStatusMessage("שגיאה בייבוא הקובץ. ודאי שזה JSON בפורמט הנתמך.");
    } finally {
      event.target.value = "";
    }
  };

  const renderHudominoCube = (
    cubeId: string,
    context: { zone: "bank" | "board"; slotIndex?: number },
  ) => {
    const cube = hudominoCubeById.get(cubeId);
    if (!cube) return null;
    const sideMatches =
      context.zone === "board" && typeof context.slotIndex === "number"
        ? getHudominoSideMatchesForSlot(context.slotIndex)
        : {
            north: false,
            east: false,
            south: false,
            west: false,
          };

    return (
      <button
        key={`${context.zone}-${cubeId}`}
        type="button"
        className="hudomino-cube"
        draggable
        onDragStart={(event) => onHudominoDragStart(event, cubeId)}
        onDragEnd={onHudominoDragEnd}
        onClick={() => rotateHudominoCube(cubeId)}
      >
        {HUDOMINO_SIDE_DIRECTIONS.map((direction) => {
          const side = getHudominoDisplaySide(cube, direction);
          const isMatch = shouldShowHudominoMatches && sideMatches[direction];
          return (
            <span
              key={`${cube.id}-${direction}`}
              className={`hudomino-side hudomino-side-${direction} hudomino-side-kind-${side.kind} ${
                isMatch ? "is-match" : ""
              }`}
              title={side.text}
            >
              <span className="hudomino-side-text">{side.text}</span>
            </span>
          );
        })}
        <span className="hudomino-center">↻</span>
      </button>
    );
  };

  return (
    <div className="page-shell" dir="rtl" style={pageShellStyle}>
      {!(mode === "game" && isSharedViewOnly) && (
        <header className="top-header">
          {mode === "editor" ? (
            <>
              <h1>
                {gameType === "quick-trivia"
                  ? "מחולל מי רוצה להיות מליונר"
                  : gameType === "hudomino"
                    ? "מחולל חודומינו"
                    : "מחולל Jeperdy"}
              </h1>
                <p>
                  {gameType === "quick-trivia"
                    ? "מצב עריכה: מגדירים נושא ורשימת שאלות למשחק מי רוצה להיות מליונר."
                    : gameType === "hudomino"
                      ? "מצב עריכה: מזינים זוגות מושג-הגדרה, בוחרים קושי ומצב משחק, ומייצרים פאזל."
                      : "מצב עריכה: בונים את הלוח, מגדירים נושא, קבוצות ושאלות."}
                </p>
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
            {gameType === "jeopardy" && (
              <>
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
              </>
            )}
            {gameType === "quick-trivia" && (
              <>
                <button type="button" onClick={downloadQuickTriviaCsvTemplate}>
                  הורדת תבנית CSV
                </button>
                <button type="button" onClick={() => quickTriviaCsvImportInputRef.current?.click()}>
                  ייבוא CSV
                </button>
                <input
                  ref={quickTriviaCsvImportInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={importQuickTriviaFromCsvFile}
                  hidden
                />
              </>
            )}
            {gameType === "hudomino" && (
              <>
                <button type="button" onClick={downloadHudominoCsvTemplate}>
                  הורדת תבנית CSV
                </button>
                <button type="button" onClick={() => hudominoCsvImportInputRef.current?.click()}>
                  ייבוא CSV
                </button>
                <input
                  ref={hudominoCsvImportInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={importHudominoPairsFromCsvFile}
                  hidden
                />
              </>
            )}
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
            {isSharedViewOnly && usesTeamPlay && (
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
              {gameType === "quick-trivia" ? "איפוס ניקוד ושאלות" : "איפוס ניקוד ולוח"}
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
                    const archiveGameType = resolveArchiveGameType(record.payload);
                    const archiveGameTypeLabel = ARCHIVE_GAME_TYPE_LABELS[archiveGameType];
                    return (
                      <article
                        key={record.id}
                        className={`archive-row ${isActiveRecord ? "is-active" : ""}`}
                      >
                        <div className="archive-row-main">
                          <div className="archive-row-title">
                            <strong>{record.title?.trim() || "ללא כותרת"}</strong>
                            <span className="archive-game-type">{archiveGameTypeLabel}</span>
                          </div>
                          <small>עודכן: {formatDateTime(record.updated_at)}</small>
                        </div>
                        <div className="archive-row-actions">
                          <button type="button" onClick={() => loadArchiveGameIntoEditor(record)} disabled={isBusy}>
                            טען לעריכה
                          </button>
                          <button type="button" onClick={() => void updateArchiveGame(record.id)} disabled={isBusy}>
                            עדכן
                          </button>
                          <button type="button" onClick={() => void copyArchiveViewLink(record)} disabled={isBusy}>
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

      {mode === "editor" && isBackgroundPickerOpen && (
        <div className="background-picker-backdrop" onClick={() => setIsBackgroundPickerOpen(false)}>
          <section
            className="background-picker-modal"
            role="dialog"
            aria-modal="true"
            aria-label="רקע חיצוני כללי"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="background-picker-header">
              <h3>רקע חיצוני כללי</h3>
              <button type="button" onClick={() => setIsBackgroundPickerOpen(false)}>
                סגירה
              </button>
            </div>

            <div className="page-background-section background-picker-section">
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
              <p className="page-background-note">
                אפשר לבחור רקע מתוך התיקייה הלוקאלית `public/backgrounds` או להעלות תמונה אישית
                (מומלץ יחס קרוב ל-16:9, מומלץ לפחות 1280x720, עד 12MB).
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
        </div>
      )}

      {mode === "editor" ? (
        <>
          <section className="card">
            <h2>הגדרות לוח</h2>
            <div className="settings-grid">
              <label className="game-type-field">
                סוג משחק
                <select
                  className="game-type-select"
                  value={gameType}
                  onChange={(event) => {
                    const nextType: GameType =
                      event.target.value === "quick-trivia"
                        ? "quick-trivia"
                        : event.target.value === "hudomino"
                          ? "hudomino"
                          : "jeopardy";
                    setGameType(nextType);
                    setMode("editor");
                    setStatusMessage("");
                    setActiveCell(null);
                    setActiveQuickQuestionId(null);
                    setHudominoDraggedCubeId(null);
                    setShowAnswer(false);
                    setDidScoreCurrentQuestion(false);
                    if (!gameTopic.trim()) {
                      setGameTopic(DEFAULT_GAME_TOPIC);
                    }
                  }}
                >
                  {GAME_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="topic-field topic-field-highlight">
                נושא המשחק
                <input
                  type="text"
                  value={gameTopic}
                  onChange={(event) => setGameTopic(event.target.value)}
                  placeholder="לדוגמה: ביולוגיה מולקולרית"
                />
              </label>
              {gameType === "jeopardy" ? (
                <>
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
                </>
              ) : gameType === "quick-trivia" ? (
                <label>
                  מספר שאלות
                  <input
                    type="number"
                    min={QUICK_TRIVIA_MIN_QUESTIONS}
                    max={QUICK_TRIVIA_MAX_QUESTIONS}
                    value={quickTriviaQuestions.length}
                    onChange={(event) => updateQuickTriviaCount(Number(event.target.value))}
                  />
                </label>
              ) : (
                <>
                  <label>
                    רמת קושי
                    <select
                      value={hudominoDifficulty}
                      onChange={(event) =>
                        setHudominoDifficulty(
                          event.target.value === "easy" ||
                            event.target.value === "medium" ||
                            event.target.value === "hard"
                            ? event.target.value
                            : "medium",
                        )
                      }
                    >
                      {HUDOMINO_DIFFICULTY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    מצב משחק
                    <select
                      value={hudominoPlayMode}
                      onChange={(event) =>
                        setHudominoPlayMode(event.target.value === "challenge" ? "challenge" : "learning")
                      }
                    >
                      {HUDOMINO_PLAY_MODE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    אופי משחק
                    <select
                      value={hudominoScoringMode}
                      onChange={(event) =>
                        setHudominoScoringMode(
                          event.target.value === "competitive" ? "competitive" : "cooperative",
                        )
                      }
                    >
                      {HUDOMINO_SCORING_MODE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    מספר זוגות קבוע
                    <input
                      type="number"
                      value={hudominoRequiredPairs}
                      readOnly
                      disabled
                    />
                  </label>
                </>
              )}
              {usesTeamPlay && (
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
              )}
            </div>
            <p className="hint-text">
              {gameType === "quick-trivia"
                ? `יש למלא שאלה, תשובה נכונה ושלושה מסיחים לכל פריט. חסרות כרגע: ${missingFieldsCount}.`
                : gameType === "hudomino"
                  ? `לחודומינו (גודל ${hudominoBoardSize}×${hudominoBoardSize}) נדרשים ${hudominoRequiredPairs} זוגות מלאים. חסרים כרגע: ${missingFieldsCount}.`
                  : `חייבים למלא את כל השאלות והתשובות לפני הפעלת המשחק. חסרים כרגע: ${missingFieldsCount}.`}
            </p>
          </section>

          <section className="card board-theme-card">
            <div className="board-theme-header">
              <h2>עיצוב לוח</h2>
              <div className="board-theme-actions">
                <button
                  type="button"
                  onClick={() => setIsBackgroundPickerOpen(true)}
                  className="theme-action-btn theme-action-library"
                >
                  רקע חיצוני כללי
                </button>
                <button type="button" onClick={resetBoardTheme} className="theme-action-btn theme-action-reset">
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

            <div className="board-theme-preview" style={{ borderColor: boardTheme.boardBorderColor }}>
              <div
                className="board-theme-preview-surface"
                style={{
                  backgroundColor: boardTheme.boardBackgroundColor,
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

          {usesTeamPlay && (
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
                      <input
                        value={team.name}
                        onChange={(event) => updateTeamName(team.id, event.target.value)}
                        aria-label={`שם קבוצה ${index + 1}`}
                        placeholder={`שם קבוצה ${index + 1}`}
                      />
                    </label>
                  );
                })}
              </div>
            </section>
          )}

          {gameType === "jeopardy" ? (
            <>
              <section className="card ai-prompt-card">
                <div className="ai-prompt-header">
                  <h2>פרומפט מוכן ליצירת CSV ב-AI</h2>
                  <button type="button" onClick={() => void copyPromptToClipboard(aiPromptText)}>
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
          ) : gameType === "quick-trivia" ? (
            <>
              <section className="card ai-prompt-card">
                <div className="ai-prompt-header">
                  <h2>פרומפט מומלץ לשאלות מי רוצה להיות מליונר</h2>
                  <button type="button" onClick={() => void copyPromptToClipboard(millionaireAiPromptText)}>
                    העתקת הפרומפט
                  </button>
                </div>
                <p className="ai-prompt-note">
                  אפשר להדביק את הטקסט בכל מחולל שפה, להחליף את הערכים שבסוגריים מרובעים, ולבקש פלט CSV.
                </p>
                <textarea
                  className="ai-prompt-textarea"
                  rows={20}
                  value={millionaireAiPromptText}
                  onChange={(event) => setMillionaireAiPromptText(event.target.value)}
                />
              </section>

              <section className="card">
                <h2>שאלות מי רוצה להיות מליונר</h2>
                <p className="hint-text">כל שאלה נפתחת ככרטיס עצמאי במהלך המשחק.</p>
                <div className="quick-trivia-editor-list">
                  {quickTriviaQuestions.map((question, index) => (
                    <article key={question.id} className="quick-trivia-editor-item">
                      <div className="quick-trivia-editor-header">
                        <strong>שאלה {index + 1}</strong>
                        <label>
                          ניקוד
                          <input
                            type="number"
                            min={MIN_BASE_VALUE}
                            max={QUICK_TRIVIA_MAX_VALUE}
                            step={100}
                            value={question.value}
                            readOnly
                          />
                        </label>
                      </div>
                      <label>
                        שאלה
                        <textarea
                          rows={3}
                          value={question.question}
                          onChange={(event) =>
                            updateQuickTriviaQuestion(question.id, "question", event.target.value)
                          }
                        />
                      </label>
                      <label>
                        תשובה
                        <textarea
                          rows={3}
                          value={question.answer}
                          onChange={(event) =>
                            updateQuickTriviaQuestion(question.id, "answer", event.target.value)
                          }
                        />
                      </label>
                      <label>
                        תשובה שגויה 1
                        <input
                          type="text"
                          value={question.wrongAnswer1}
                          onChange={(event) =>
                            updateQuickTriviaQuestion(question.id, "wrongAnswer1", event.target.value)
                          }
                        />
                      </label>
                      <label>
                        תשובה שגויה 2
                        <input
                          type="text"
                          value={question.wrongAnswer2}
                          onChange={(event) =>
                            updateQuickTriviaQuestion(question.id, "wrongAnswer2", event.target.value)
                          }
                        />
                      </label>
                      <label>
                        תשובה שגויה 3
                        <input
                          type="text"
                          value={question.wrongAnswer3}
                          onChange={(event) =>
                            updateQuickTriviaQuestion(question.id, "wrongAnswer3", event.target.value)
                          }
                        />
                      </label>
                      <label>
                        רמת קושי
                        <select
                          value={question.difficulty}
                          onChange={(event) =>
                            updateQuickTriviaQuestion(question.id, "difficulty", event.target.value)
                          }
                        >
                          <option value="easy">easy</option>
                          <option value="medium">medium</option>
                          <option value="hard">hard</option>
                        </select>
                      </label>
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="card ai-prompt-card">
                <div className="ai-prompt-header">
                  <h2>פרומפט מומלץ לזוגות חודומינו</h2>
                  <button type="button" onClick={() => void copyPromptToClipboard(hudominoAiPromptText)}>
                    העתקת הפרומפט
                  </button>
                </div>
                <p className="ai-prompt-note">
                  אפשר להדביק את הטקסט בכל מחולל שפה, להחליף את הערכים שבסוגריים מרובעים, ולבקש פלט CSV.
                </p>
                <textarea
                  className="ai-prompt-textarea"
                  rows={10}
                  value={hudominoAiPromptText}
                  onChange={(event) => setHudominoAiPromptText(event.target.value)}
                />
              </section>

              <section className="card">
                <h2>זוגות מושג-הגדרה לחודומינו</h2>
                <p className="hint-text">
                  ללוח {hudominoBoardSize}×{hudominoBoardSize} נדרשים בדיוק {hudominoRequiredPairs} זוגות מלאים.
                </p>
                <div className="hudomino-pairs-list">
                  {hudominoPairs.map((pair, index) => (
                    <article key={pair.id} className="hudomino-pair-item">
                      <strong>זוג {index + 1}</strong>
                      <label>
                        מושג
                        <input
                          type="text"
                          value={pair.term}
                          onChange={(event) => updateHudominoPair(pair.id, "term", event.target.value)}
                          placeholder="לדוגמה: פלסמיד"
                        />
                      </label>
                      <label>
                        הגדרה
                        <input
                          type="text"
                          value={pair.definition}
                          onChange={(event) => updateHudominoPair(pair.id, "definition", event.target.value)}
                          placeholder="לדוגמה: מקטע DNA מעגלי המשמש כווקטור"
                        />
                      </label>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
        </>
      ) : (
        <>
          <section className="game-topic-card">
            <h2>{resolvedGameTopic}</h2>
          </section>

          {usesTeamPlay && (
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
          )}

          {gameType === "jeopardy" ? (
            <section
              className="game-board"
              style={{
                borderColor: boardTheme.boardBorderColor,
                backgroundColor: boardTheme.boardBackgroundColor,
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
          ) : gameType === "quick-trivia" ? (
            <section
              className="game-board millionaire-board"
              style={{
                borderColor: boardTheme.boardBorderColor,
                backgroundColor: boardTheme.boardBackgroundColor,
                ["--millionaire-stage-bg" as string]: withAlpha(boardTheme.cellBgColor, 0.82),
                ["--millionaire-ladder-bg" as string]: withAlpha(boardTheme.usedCellBgColor, 0.88),
                ["--millionaire-surface-border" as string]: boardTheme.cellBorderColor,
                ["--millionaire-accent-bg" as string]: boardTheme.categoryBgStart,
                ["--millionaire-accent-text" as string]: getReadableTextColor(
                  boardTheme.categoryTextColor,
                  boardTheme.categoryBgStart,
                ),
                ["--millionaire-text-main" as string]: getReadableTextColor(
                  boardTheme.cellTextColor,
                  boardTheme.cellBgColor,
                ),
                ["--millionaire-text-muted" as string]: withAlpha(
                  getReadableTextColor(boardTheme.usedCellTextColor, boardTheme.usedCellBgColor),
                  0.9,
                ),
              }}
            >
              <div className="millionaire-game-grid">
                <section className="millionaire-main">
                  <div className="millionaire-progress-panel" aria-live="polite">
                    <div className="millionaire-logo" role="img" aria-label="לוגו מי רוצה להיות מיליונר">
                      <span className="millionaire-logo-word">מיליונר</span>
                    </div>
                    <h3 className="millionaire-brand">{millionaireHeaderTitle}</h3>
                  </div>

                  <div className="millionaire-question-box">
                    {nextQuickTriviaQuestion
                      ? nextQuickTriviaQuestion.question
                      : "כל השאלות הושלמו. לחצו על איפוס כדי להתחיל מחדש."}
                  </div>

                  {nextQuickTriviaQuestion && (
                    <div className="millionaire-answers-grid">
                      {quickTriviaOptionLetters.map((letter, index) => {
                        const optionText = quickTriviaCurrentOptions[index] ?? "";
                        const isHidden = quickTriviaHiddenOptionIndexes.includes(index);
                        const isSelected = quickTriviaSelectedOptionIndex === index;
                        const isCorrect = quickTriviaCorrectOptionIndex === index;
                        const showCorrect = quickTriviaSelectedOptionIndex !== null && isCorrect;
                        const showWrong = quickTriviaSelectedOptionIndex !== null && isSelected && !isCorrect;
                        return (
                          <button
                            key={`millionaire-option-${index}`}
                            type="button"
                            className={`millionaire-answer-btn ${isHidden ? "is-hidden" : ""} ${
                              showCorrect ? "is-correct" : ""
                            } ${showWrong ? "is-wrong" : ""}`}
                            onClick={() => checkQuickTriviaAnswer(index)}
                            disabled={
                              !nextQuickTriviaQuestion || isHidden || !quickTriviaCanAnswer || !optionText.trim()
                            }
                          >
                            <span className="millionaire-answer-letter">{letter}:</span>
                            <span>{optionText}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="millionaire-footer">
                    <div className="millionaire-lifelines">
                      <button
                        type="button"
                        className={`millionaire-lifeline millionaire-lifeline--audience ${
                          !quickTriviaLifelines.audience ? "is-used" : ""
                        }`}
                        onClick={useQuickTriviaAskAudience}
                        disabled={!quickTriviaLifelines.audience || !quickTriviaCanAnswer || !nextQuickTriviaQuestion}
                        aria-label="שאלת קהל"
                      >
                        <svg viewBox="0 0 24 24" className="millionaire-lifeline-icon" aria-hidden="true">
                          <circle cx="9.2" cy="8" r="2.6" fill="currentColor" />
                          <circle cx="15.4" cy="8.9" r="2.2" fill="currentColor" />
                          <path
                            d="M4.8 16.5c0-2.35 1.95-4.26 4.35-4.26 2.41 0 4.36 1.91 4.36 4.26"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                          />
                          <path
                            d="M12.7 16.4c.2-1.7 1.73-3.02 3.58-3.02 2 0 3.62 1.43 3.62 3.2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className={`millionaire-lifeline millionaire-lifeline--fifty ${
                          !quickTriviaLifelines.fifty ? "is-used" : ""
                        }`}
                        onClick={useQuickTriviaFiftyFifty}
                        disabled={!quickTriviaLifelines.fifty || !quickTriviaCanAnswer || !nextQuickTriviaQuestion}
                      >
                        <span className="millionaire-lifeline-label">50:50</span>
                      </button>
                      <button
                        type="button"
                        className={`millionaire-lifeline millionaire-lifeline--phone ${
                          !quickTriviaLifelines.phone ? "is-used" : ""
                        }`}
                        onClick={useQuickTriviaPhoneFriend}
                        disabled={!quickTriviaLifelines.phone || !quickTriviaCanAnswer || !nextQuickTriviaQuestion}
                        aria-label="טלפון לחבר"
                      >
                        <svg viewBox="0 0 24 24" className="millionaire-lifeline-icon" aria-hidden="true">
                          <path
                            d="M7.12 4.7c.33-.34.86-.37 1.22-.07l1.9 1.62c.4.34.5.91.22 1.36L9.6 9.2c-.14.3-.1.66.12.92a13.6 13.6 0 0 0 4.16 4.16c.27.22.62.27.92.12l1.6-.86c.44-.28 1.02-.18 1.36.23l1.62 1.9c.3.35.27.88-.07 1.21l-1.27 1.27c-.52.52-1.28.74-2 .56-2.78-.7-5.38-2.2-7.54-4.37-2.16-2.16-3.66-4.75-4.36-7.53-.19-.73.03-1.48.56-2Z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </section>

                <aside className="millionaire-ladder-panel" aria-label="סולם זכייה">
                  <ol>
                    {quickTriviaLadder.map((question) => {
                      const step = quickTriviaStepById.get(question.id) ?? 1;
                      const isActive = nextQuickTriviaQuestion?.id === question.id;
                      const isUsed = question.used;
                      return (
                        <li
                          key={question.id}
                          className={`millionaire-ladder-item ${isActive ? "is-active" : ""} ${
                            isUsed ? "is-used" : ""
                          }`}
                        >
                          <span className="millionaire-ladder-amount">
                            <ValueMark value={question.value} />
                            {" "}
                            ₪
                          </span>
                          <span className="millionaire-ladder-step">{step}</span>
                        </li>
                      );
                    })}
                  </ol>
                </aside>
              </div>
            </section>
          ) : (
            <section
              className="game-board hudomino-board-shell"
              style={{
                borderColor: hudominoAxisTheme.lightShade,
                backgroundColor: boardTheme.boardBackgroundColor,
                ["--hudomino-axis-a-bg" as string]: hudominoAxisTheme.darkShade,
                ["--hudomino-axis-a-text" as string]: hudominoAxisTheme.darkText,
                ["--hudomino-axis-b-bg" as string]: hudominoAxisTheme.lightShade,
                ["--hudomino-axis-b-text" as string]: hudominoAxisTheme.lightText,
                ["--hudomino-border" as string]: hudominoGlowTheme.borderTone,
                ["--hudomino-glow-soft" as string]: hudominoGlowTheme.glowSoft,
                ["--hudomino-glow-core" as string]: hudominoGlowTheme.glowCore,
                ["--hudomino-glow-shadow-near" as string]: hudominoGlowTheme.glowShadowNear,
                ["--hudomino-glow-shadow-mid" as string]: hudominoGlowTheme.glowShadowMid,
                ["--hudomino-glow-shadow-far" as string]: hudominoGlowTheme.glowShadowFar,
                ["--hudomino-shell-bg" as string]: boardTheme.boardBackgroundColor,
              }}
            >
              {hudominoPlayMode === "challenge" &&
                hudominoPuzzle &&
                !hudominoPuzzle.isChallengeReveal &&
                !shouldShowHudominoMatches && (
                <div className="hudomino-challenge-actions">
                  <button type="button" className="primary-button" onClick={revealHudominoChallenge}>
                    הפעל זרם
                  </button>
                </div>
              )}
              <div className="hudomino-layout">
                <section
                  className="hudomino-board-grid"
                  style={{
                    gridTemplateColumns: `repeat(${hudominoPuzzle?.size ?? hudominoBoardSize}, minmax(0, 1fr))`,
                  }}
                >
                  {(hudominoPuzzle?.boardSlots ?? []).map((cubeId, slotIndex) => {
                    const slotMatches =
                      cubeId && shouldShowHudominoMatches ? getHudominoSideMatchesForSlot(slotIndex) : null;
                    const hasNorthMatch = Boolean(slotMatches?.north);
                    const hasEastMatch = Boolean(slotMatches?.east);
                    const hasSouthMatch = Boolean(slotMatches?.south);
                    const hasWestMatch = Boolean(slotMatches?.west);
                    return (
                      <div
                        key={`hudomino-slot-${slotIndex}`}
                        className={`hudomino-slot ${cubeId ? "has-cube" : "is-empty"} ${
                          hasNorthMatch ? "has-match-north" : ""
                        } ${
                          hasEastMatch ? "has-match-east" : ""
                        } ${hasSouthMatch ? "has-match-south" : ""} ${hasWestMatch ? "has-match-west" : ""}`}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          dropHudominoToSlot(slotIndex, event.dataTransfer.getData("text/plain"));
                        }}
                      >
                        {cubeId ? (
                          renderHudominoCube(cubeId, { zone: "board", slotIndex })
                        ) : (
                          <span className="hudomino-slot-index">{slotIndex + 1}</span>
                        )}
                        {hasNorthMatch && <span className="hudomino-edge-glow hudomino-edge-glow-north" />}
                        {hasEastMatch && <span className="hudomino-edge-glow hudomino-edge-glow-east" />}
                        {hasSouthMatch && <span className="hudomino-edge-glow hudomino-edge-glow-south" />}
                        {hasWestMatch && <span className="hudomino-edge-glow hudomino-edge-glow-west" />}
                      </div>
                    );
                  })}
                </section>
              </div>
            </section>
          )}

          {!isSharedViewOnly && gameType !== "quick-trivia" && (
            <p className="hint-text">
              {gameType === "hudomino"
                ? `התקדמות חיבורים: ${usedCount} מתוך ${totalQuestions} ממשקים נדלקו.`
                : `התקדמות משחק: ${usedCount} מתוך ${totalQuestions} שאלות סומנו כמשומשות.`}
            </p>
          )}
        </>
      )}

      {quickTriviaModal.open && gameType === "quick-trivia" && mode === "game" && (
        <div className="millionaire-modal-backdrop" role="dialog" aria-modal="true">
          <div className="millionaire-modal">
            <h2>{quickTriviaModal.title}</h2>
            <p>{quickTriviaModal.content}</p>
            <button type="button" onClick={closeQuickTriviaModal}>
              {quickTriviaModal.buttonLabel}
            </button>
          </div>
        </div>
      )}

      {isGameIntroModalOpen && mode === "game" && (
        <div className="modal-overlay game-intro-overlay" role="dialog" aria-modal="true">
          <div className="modal game-intro-modal" style={modalThemeStyle}>
            <h2 className="game-intro-title">{gameIntroContent.title}</h2>
            <p className="game-intro-topic">{resolvedGameTopic}</p>
            <ul className="game-intro-list">
              {gameIntroContent.lines.map((line, index) => (
                <li key={`game-intro-line-${index}`}>{line}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setIsGameIntroModalOpen(false)}
              className="primary-button full-width"
            >
              התחל משחק
            </button>
          </div>
        </div>
      )}

      {activeQuestion && gameType !== "quick-trivia" && (
        <div className="modal-overlay">
          <div className="modal" style={modalThemeStyle}>
            <div className="modal-header">
              <ValueMark value={activeQuestion.value} />
              <button type="button" onClick={closeQuestion} className="modal-close-button">
                סגירה
              </button>
            </div>

            <div className={`modal-question ${isActiveQuestionTextMissing ? "is-empty" : ""}`}>
              {activeQuestionText}
            </div>

            {!showAnswer ? (
              <button type="button" onClick={() => setShowAnswer(true)} className="primary-button full-width">
                חשיפת תשובה
              </button>
            ) : (
              <div className="answer-panel">
                <h4>תשובה</h4>
                <p className={isActiveAnswerTextMissing ? "is-empty" : ""}>{activeAnswerText}</p>

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

