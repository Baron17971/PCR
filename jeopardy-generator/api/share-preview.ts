type ShareAccess = "view" | "edit";
type GameType = "jeopardy" | "quick-trivia" | "hudomino";

const SHARE_QUERY_PARAM = "game";
const SERVER_GAME_QUERY_PARAM = "sgame";
const SERVER_ACCESS_QUERY_PARAM = "access";
const SUPABASE_GAMES_TABLE = "jeopardy_games";
const PREVIEW_ACCESS_QUERY_PARAM = "a";
const PREVIEW_TITLE_QUERY_PARAM = "t";
const PREVIEW_TYPE_QUERY_PARAM = "g";
const PREVIEW_CATEGORIES_QUERY_PARAM = "c";
const PREVIEW_ROWS_QUERY_PARAM = "r";
const PREVIEW_QUESTIONS_QUERY_PARAM = "q";

const GAME_TYPE_LABELS: Record<GameType, string> = {
  jeopardy: "Jeopardy",
  "quick-trivia": "Millionaire",
  hudomino: "Hudomino",
};

function normalizeGameType(value: string | null): GameType {
  if (value === "quick-trivia" || value === "hudomino" || value === "jeopardy") return value;
  return "jeopardy";
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf-8");
}

function getProtocol(req: { headers?: Record<string, string | string[] | undefined> }): string {
  const raw = req.headers?.["x-forwarded-proto"];
  const header = Array.isArray(raw) ? raw[0] : raw;
  return header && header.trim() ? header : "https";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toPositiveInt(value: string | null): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed);
}

function buildSummary(gameType: GameType, categories: number | null, rows: number | null, questions: number | null): string {
  if (gameType === "jeopardy" && categories && rows) {
    return `${categories} categories x ${rows} rows`;
  }
  if (gameType === "quick-trivia" && questions) {
    return `${questions} questions`;
  }
  if (gameType === "hudomino" && rows) {
    return `${rows}x${rows} board`;
  }
  return "Interactive game board";
}

type ParsedGame = {
  gameType?: string;
  gameTopic?: string;
  board?: Array<{ cells?: unknown[] }>;
  quickTriviaQuestions?: unknown[];
  hudominoPuzzle?: { size?: number };
  hudominoDifficulty?: "easy" | "medium" | "hard";
};

type GameDetails = {
  gameType: GameType;
  gameTitle: string;
  categories: number | null;
  rows: number | null;
  questions: number | null;
};

function applyGameSnapshot(snapshot: ParsedGame, fallback: GameDetails): GameDetails {
  const next: GameDetails = { ...fallback };

  if (snapshot.gameType) {
    next.gameType = normalizeGameType(snapshot.gameType);
  }
  if (typeof snapshot.gameTopic === "string" && snapshot.gameTopic.trim()) {
    next.gameTitle = snapshot.gameTopic.trim();
  }

  if (next.gameType === "jeopardy") {
    next.categories = Array.isArray(snapshot.board) ? snapshot.board.length : next.categories;
    next.rows =
      Array.isArray(snapshot.board) && Array.isArray(snapshot.board?.[0]?.cells)
        ? snapshot.board[0].cells.length
        : next.rows;
  } else if (next.gameType === "quick-trivia") {
    next.questions = Array.isArray(snapshot.quickTriviaQuestions)
      ? snapshot.quickTriviaQuestions.length
      : next.questions;
  } else if (next.gameType === "hudomino") {
    const puzzleSize = Number(snapshot.hudominoPuzzle?.size);
    if (Number.isFinite(puzzleSize) && puzzleSize > 0) {
      next.rows = Math.round(puzzleSize);
      next.categories = next.rows;
    } else if (snapshot.hudominoDifficulty === "easy") {
      next.rows = 2;
      next.categories = 2;
    } else if (snapshot.hudominoDifficulty === "hard") {
      next.rows = 4;
      next.categories = 4;
    } else if (snapshot.hudominoDifficulty === "medium") {
      next.rows = 3;
      next.categories = 3;
    }
  }

  return next;
}

async function fetchServerGameDetails(serverGameId: string): Promise<{ title: string; payload: ParsedGame } | null> {
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL)?.trim();
  const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)?.trim();
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const restUrl =
    `${supabaseUrl}/rest/v1/${SUPABASE_GAMES_TABLE}` +
    `?id=eq.${encodeURIComponent(serverGameId)}&select=title,payload&limit=1`;

  const response = await fetch(restUrl, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) return null;
  const rows = (await response.json()) as Array<{ title?: string; payload?: ParsedGame | { game?: ParsedGame } }>;
  const first = rows[0];
  const rawPayload = first?.payload;
  if (!rawPayload || typeof rawPayload !== "object") return null;

  const payloadRecord = rawPayload as ParsedGame & { game?: ParsedGame };
  const parsedGame = payloadRecord.game && typeof payloadRecord.game === "object" ? payloadRecord.game : payloadRecord;
  if (!parsedGame || typeof parsedGame !== "object") return null;

  const resolvedTitle =
    typeof first.title === "string" && first.title.trim()
      ? first.title.trim()
      : typeof parsedGame.gameTopic === "string" && parsedGame.gameTopic.trim()
        ? parsedGame.gameTopic.trim()
        : "Trivia Game";

  return {
    title: resolvedTitle,
    payload: parsedGame,
  };
}

export default async function handler(req: any, res: any) {
  const protocol = getProtocol(req);
  const host = req.headers?.host || "localhost";
  const requestUrl = new URL(req.url || "/", `${protocol}://${host}`);
  const params = requestUrl.searchParams;

  const encodedGame = params.get(SHARE_QUERY_PARAM);
  const serverGameId = params.get(SERVER_GAME_QUERY_PARAM);
  const previewAccess = params.get(PREVIEW_ACCESS_QUERY_PARAM);
  const shareAccess: ShareAccess =
    previewAccess === "e" || params.get(SERVER_ACCESS_QUERY_PARAM) === "edit" ? "edit" : "view";
  const encodedTitle = params.get(PREVIEW_TITLE_QUERY_PARAM);
  let decodedTitle: string | null = null;
  if (encodedTitle) {
    try {
      decodedTitle = decodeBase64Url(encodedTitle);
    } catch {
      decodedTitle = null;
    }
  }

  let details: GameDetails = {
    gameType: normalizeGameType(params.get(PREVIEW_TYPE_QUERY_PARAM) || params.get("type")),
    gameTitle:
      (decodedTitle || params.get("title") || "Trivia Game").trim() || "Trivia Game",
    categories: toPositiveInt(params.get(PREVIEW_CATEGORIES_QUERY_PARAM) || params.get("cats")),
    rows: toPositiveInt(params.get(PREVIEW_ROWS_QUERY_PARAM) || params.get("rows")),
    questions: toPositiveInt(params.get(PREVIEW_QUESTIONS_QUERY_PARAM)),
  };

  if (encodedGame) {
    try {
      const decodedPayload = decodeBase64Url(encodedGame);
      const parsed = JSON.parse(decodedPayload) as { game?: ParsedGame };
      if (parsed.game) {
        details = applyGameSnapshot(parsed.game, details);
      }
    } catch {
      // Keep fallback values.
    }
  } else if (serverGameId) {
    try {
      const serverDetails = await fetchServerGameDetails(serverGameId);
      if (serverDetails) {
        details.gameTitle = serverDetails.title;
        details = applyGameSnapshot(serverDetails.payload, details);
      }
    } catch {
      // Keep fallback values.
    }
  }

  const appUrl = new URL("/", `${protocol}://${host}`);
  if (encodedGame) {
    appUrl.searchParams.set(SHARE_QUERY_PARAM, encodedGame);
  }
  if (serverGameId) {
    appUrl.searchParams.set(SERVER_GAME_QUERY_PARAM, serverGameId);
    appUrl.searchParams.set(SERVER_ACCESS_QUERY_PARAM, shareAccess);
  }

  const imageUrl = new URL("/api/og-image", `${protocol}://${host}`);
  imageUrl.searchParams.set("type", details.gameType);
  imageUrl.searchParams.set("title", details.gameTitle);
  if (details.categories) imageUrl.searchParams.set("cats", String(details.categories));
  if (details.rows) imageUrl.searchParams.set("rows", String(details.rows));
  if (details.questions) imageUrl.searchParams.set("q", String(details.questions));

  const gameTypeLabel = GAME_TYPE_LABELS[details.gameType];
  const summary = buildSummary(details.gameType, details.categories, details.rows, details.questions);
  const description = `${gameTypeLabel} - ${summary}`;
  const pageTitle = `${details.gameTitle} | ${gameTypeLabel}`;
  const escapedPageTitle = escapeHtml(pageTitle);
  const escapedDescription = escapeHtml(description);
  const escapedImageUrl = escapeHtml(imageUrl.toString());
  const escapedAppUrl = escapeHtml(appUrl.toString());

  const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapedPageTitle}</title>
  <meta name="description" content="${escapedDescription}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Jeopardy Generator" />
  <meta property="og:locale" content="he_IL" />
  <meta property="og:title" content="${escapedPageTitle}" />
  <meta property="og:description" content="${escapedDescription}" />
  <meta property="og:image" content="${escapedImageUrl}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${escapedAppUrl}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapedPageTitle}" />
  <meta name="twitter:description" content="${escapedDescription}" />
  <meta name="twitter:image" content="${escapedImageUrl}" />
  <meta http-equiv="refresh" content="0; url=${escapedAppUrl}" />
</head>
<body>
  <script>window.location.replace(${JSON.stringify(appUrl.toString())});</script>
  <p>Redirecting to game... If it does not open, <a href="${escapedAppUrl}">click here</a>.</p>
</body>
</html>`;

  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=0, s-maxage=300");
  res.status(200).send(html);
}
