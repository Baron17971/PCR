type ShareAccess = "view" | "edit";
type GameType = "jeopardy" | "quick-trivia" | "hudomino";

const SHARE_QUERY_PARAM = "game";
const SERVER_GAME_QUERY_PARAM = "sgame";
const SERVER_ACCESS_QUERY_PARAM = "access";

const GAME_TYPE_LABELS: Record<GameType, string> = {
  jeopardy: "ג׳פרדי",
  "quick-trivia": "מליונר",
  hudomino: "חודומינו",
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
    return `${categories} קטגוריות × ${rows} שורות`;
  }
  if (gameType === "quick-trivia" && questions) {
    return `${questions} שאלות`;
  }
  if (gameType === "hudomino" && rows) {
    return `לוח ${rows}×${rows}`;
  }
  return "תצוגת משחק אינטראקטיבית";
}

export default function handler(req: any, res: any) {
  const protocol = getProtocol(req);
  const host = req.headers?.host || "localhost";
  const requestUrl = new URL(req.url || "/", `${protocol}://${host}`);
  const params = requestUrl.searchParams;

  const encodedGame = params.get(SHARE_QUERY_PARAM);
  const serverGameId = params.get(SERVER_GAME_QUERY_PARAM);
  const shareAccess: ShareAccess = params.get(SERVER_ACCESS_QUERY_PARAM) === "edit" ? "edit" : "view";

  let gameType = normalizeGameType(params.get("type"));
  let gameTitle = (params.get("title") || "משחק טריוויה").trim() || "משחק טריוויה";
  let categories = toPositiveInt(params.get("cats"));
  let rows = toPositiveInt(params.get("rows"));
  let questions = toPositiveInt(params.get("q"));

  if (encodedGame) {
    try {
      const decodedPayload = decodeBase64Url(encodedGame);
      const parsed = JSON.parse(decodedPayload) as {
        game?: {
          gameType?: string;
          gameTopic?: string;
          board?: Array<{ cells?: unknown[] }>;
          quickTriviaQuestions?: unknown[];
          hudominoPuzzle?: { size?: number };
          hudominoDifficulty?: "easy" | "medium" | "hard";
        };
      };

      if (parsed.game?.gameType) {
        gameType = normalizeGameType(parsed.game.gameType);
      }
      if (typeof parsed.game?.gameTopic === "string" && parsed.game.gameTopic.trim()) {
        gameTitle = parsed.game.gameTopic.trim();
      }

      if (gameType === "jeopardy") {
        categories = Array.isArray(parsed.game?.board) ? parsed.game.board.length : categories;
        rows =
          Array.isArray(parsed.game?.board) && Array.isArray(parsed.game.board?.[0]?.cells)
            ? parsed.game.board[0].cells.length
            : rows;
      } else if (gameType === "quick-trivia") {
        questions = Array.isArray(parsed.game?.quickTriviaQuestions)
          ? parsed.game.quickTriviaQuestions.length
          : questions;
      } else if (gameType === "hudomino") {
        const puzzleSize = Number(parsed.game?.hudominoPuzzle?.size);
        if (Number.isFinite(puzzleSize) && puzzleSize > 0) {
          rows = Math.round(puzzleSize);
          categories = rows;
        } else if (parsed.game?.hudominoDifficulty === "easy") {
          rows = 2;
          categories = 2;
        } else if (parsed.game?.hudominoDifficulty === "hard") {
          rows = 4;
          categories = 4;
        } else if (parsed.game?.hudominoDifficulty === "medium") {
          rows = 3;
          categories = 3;
        }
      }
    } catch {
      // Keep fallback values if payload is not decodable.
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
  imageUrl.searchParams.set("type", gameType);
  imageUrl.searchParams.set("title", gameTitle);
  if (categories) imageUrl.searchParams.set("cats", String(categories));
  if (rows) imageUrl.searchParams.set("rows", String(rows));
  if (questions) imageUrl.searchParams.set("q", String(questions));

  const gameTypeLabel = GAME_TYPE_LABELS[gameType];
  const summary = buildSummary(gameType, categories, rows, questions);
  const description = `${gameTypeLabel} • ${summary}`;
  const pageTitle = `${gameTitle} | ${gameTypeLabel}`;
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
  <p>מעביר למשחק... אם ההעברה לא בוצעה, <a href="${escapedAppUrl}">לחצו כאן</a>.</p>
</body>
</html>`;

  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=0, s-maxage=300");
  res.status(200).send(html);
}
