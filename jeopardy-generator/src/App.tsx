import { useMemo, useRef, useState } from "react";
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

interface ExportPayload {
  version: number;
  settings: {
    gameTopic: string;
    categoryCount: number;
    rowCount: number;
    baseValue: number;
    teamCount: number;
    teamNames: string[];
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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

function DnaMark({ value }: { value: number }) {
  return (
    <span className="dna-mark" dir="ltr">
      <span>{value}</span>
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M8 3c6 5 10 5 16 0M8 29c6-5 10-5 16 0M10 5c8 7 8 15 0 22M22 5c-8 7-8 15 0 22M10 10h12M8.8 16h14.4M10 22h12" />
      </svg>
    </span>
  );
}

function App() {
  const [mode, setMode] = useState<AppMode>("editor");
  const [gameTopic, setGameTopic] = useState("משחק ג'פרדי");
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
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const csvImportInputRef = useRef<HTMLInputElement | null>(null);

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

  const copyAiPromptToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(AI_CSV_PROMPT_TEMPLATE);
      setStatusMessage("הפרומפט הועתק ללוח.");
    } catch {
      setStatusMessage("לא ניתן להעתיק אוטומטית. סמני את הטקסט והעתיקי ידנית.");
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
    setStatusMessage("");
    setMode("game");
  };

  const returnToEditor = () => {
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
            <button type="button" onClick={resetGameBoard}>
              איפוס ניקוד ולוח
            </button>
            <button type="button" onClick={returnToEditor} className="primary-button">
              חזרה לעריכה
            </button>
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
            <textarea className="ai-prompt-textarea" readOnly rows={6} value={AI_CSV_PROMPT_TEMPLATE} />
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
                      <DnaMark value={cell.value} />
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

          <section className="teams-scoreboard">
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
                  <strong>{team.name}</strong>
                  <span>{team.score}</span>
                  {isCurrent && <small>תור נוכחי</small>}
                </div>
              );
            })}
          </section>

          <section className="game-board">
            <div className="game-grid" style={{ gridTemplateColumns: `repeat(${categoryCount}, minmax(0, 1fr))` }}>
              {board.map((category, categoryIndex) => (
                <div key={`game-category-${categoryIndex}`} className="game-category-title">
                  {category.title}
                </div>
              ))}

              {Array.from({ length: rowCount }, (_, rowIndex) =>
                board.map((category, categoryIndex) => {
                  const cell = category.cells[rowIndex];
                  const isDisabled = !cell || cell.used;
                  return (
                    <button
                      key={`game-cell-${categoryIndex}-${rowIndex}`}
                      type="button"
                      onClick={() => openQuestion(categoryIndex, rowIndex)}
                      disabled={isDisabled}
                      className={`game-cell ${isDisabled ? "used" : ""}`}
                    >
                      {isDisabled ? "✓" : <DnaMark value={cell.value} />}
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
          <div className="modal">
            <div className="modal-header">
              <DnaMark value={activeQuestion.value} />
              <button type="button" onClick={closeQuestion}>
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



