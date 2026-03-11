"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpenText,
  CheckCircle2,
  Circle,
  Fingerprint,
  FlaskConical,
  RefreshCcw,
  Sigma
} from "lucide-react";

interface GeneticFingerprintPageProps {
  onComplete: () => void;
}

interface PracticeQuestion {
  id: string;
  level: "הבנה" | "יישום";
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

function RepeatStrip({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={`repeat-${count}-${index}`}
          className="h-4 w-4 rounded-[3px] border border-slate-200/30 bg-cyan-300/80"
        />
      ))}
    </div>
  );
}

const QUESTIONS: PracticeQuestion[] = [
  {
    id: "q1",
    level: "הבנה",
    prompt: "מהו STR?",
    options: [
      "רצף מקודד ארוך שמייצר חלבון",
      "רצף קצר שחוזר בטנדם ומספר החזרות בו משתנה בין אנשים",
      "אנזים שמשכפל DNA",
      "סוג של פריימר מלאכותי"
    ],
    correctIndex: 1,
    explanation:
      "STR הם רצפים קצרים חוזרים (Short Tandem Repeats), לרוב באזורים לא מקודדים, ומספר החזרות בהם משתנה בין פרטים."
  },
  {
    id: "q2",
    level: "הבנה",
    prompt: "למה STR מתאים לזיהוי פלילי?",
    options: [
      "כי רצפי STR זהים לחלוטין אצל כל בני האדם",
      "כי מספר החזרות ב-STR משתנה בין אנשים ויוצר פרופיל אישי",
      "כי STR נמצא רק בכרומוזום Y",
      "כי STR מופיע רק בגנים מקודדים"
    ],
    correctIndex: 1,
    explanation:
      "השונות במספר החזרות בכל לוקוס STR מאפשרת לבנות פרופיל גנטי שמבדיל בין אנשים."
  },
  {
    id: "q3",
    level: "יישום",
    prompt:
      "אם ההסתברות להתאמה אקראית בלוקוס 1 היא 1/10 ובלוקוס 2 היא 1/20, מהי ההסתברות המשולבת לפי חוק המכפלה?",
    options: ["1/30", "1/200", "1/2", "1/100"],
    correctIndex: 1,
    explanation:
      "בחוק המכפלה כופלים הסתברויות: 1/10 × 1/20 = 1/200. ככל שמוסיפים לוקוסים, ההסתברות להתאמה אקראית קטנה מאוד."
  },
  {
    id: "q4",
    level: "יישום",
    prompt: "מה קורה סטטיסטית כשמוסיפים עוד לוקוסים להשוואה בפרופיל STR?",
    options: [
      "סיכוי הטעות גדל",
      "סיכוי הטעות לא משתנה",
      "סיכוי הטעות קטן כי מכפילים בעוד הסתברויות קטנות",
      "אי אפשר יותר לחשב הסתברות"
    ],
    correctIndex: 2,
    explanation:
      "לוקוסים נוספים מוסיפים גורמי מכפלה קטנים, ולכן ההסתברות להתאמה אקראית שואפת לאפס."
  }
];

export default function GeneticFingerprintPage({ onComplete }: GeneticFingerprintPageProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const total = QUESTIONS.length;
  const allAnswered = QUESTIONS.every((question) => typeof answers[question.id] === "number");

  const score = useMemo(() => {
    return QUESTIONS.reduce((acc, question) => {
      return answers[question.id] === question.correctIndex ? acc + 1 : acc;
    }, 0);
  }, [answers]);

  const percentage = Math.round((score / total) * 100);

  const handleSelect = (questionId: string, optionIndex: number) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = () => {
    if (!allAnswered) return;
    setSubmitted(true);
  };

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <div className="glass-pcr-card rounded-[2.5rem] border border-slate-700/30 p-6 md:p-8 space-y-6" dir="rtl">
      <div className="text-right space-y-3">
        <h2 className="text-3xl font-black text-white flex items-center gap-3 justify-start">
          <Fingerprint className="w-8 h-8 text-blue-400" />
          טביעת אצבע גנטית (STR)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed max-w-4xl">
          דף זה מציג את עקרונות ה-STR בזיהוי פלילי, כולל היגיון ביולוגי והשוואה סטטיסטית.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <article className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 space-y-3">
          <h3 className="text-xl font-black text-white flex items-center gap-2 justify-start">
            <BookOpenText className="w-5 h-5 text-emerald-300" />
            מהו STR?
          </h3>
          <p className="text-slate-300 leading-relaxed">
            STR (Short Tandem Repeats) הם רצפים קצרים שחוזרים מספר פעמים באותו לוקוס, לרוב באזורים לא מקודדים של
            ה-DNA. מספר החזרות משתנה בין אנשים ולכן מאפשר בידול בין פרופילים גנטיים.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 space-y-3">
          <h3 className="text-xl font-black text-white flex items-center gap-2 justify-start">
            <BookOpenText className="w-5 h-5 text-violet-300" />
            אנלוגיה פשוטה
          </h3>
          <p className="text-slate-300 leading-relaxed">
            דמיינו את ה-DNA כספר: לכולנו יש אותן מילים בסיסיות, אבל בעמודים מסוימים יש מילה שחוזרת מספר שונה של
            פעמים. דפוס החזרות הזה יוצר חתימה אישית.
          </p>
        </article>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <article className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 space-y-3">
          <h3 className="text-xl font-black text-white">בסיס גנטי של STR</h3>
          <p className="text-slate-300 leading-relaxed">
            כל אדם נושא בכל תא מערך כפול של כרומוזומים, ולכן בכל לוקוס קיימים שני אללים. המשמעות היא שאדם יכול להיות
            הומוזיגוט או הטרוזיגוט לא רק ביחס לגנים מקודדים, אלא גם ביחס למקטעים פולימורפיים מסוג STR.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 space-y-4">
          <h3 className="text-xl font-black text-white">דוגמה: הטרוזיגוט מול הומוזיגוט</h3>

          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 space-y-2">
            <p className="text-cyan-100 font-bold">אדם א׳: הטרוזיגוט (4/6 חזרות)</p>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <span className="w-12">אלל 1:</span>
              <RepeatStrip count={4} />
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <span className="w-12">אלל 2:</span>
              <RepeatStrip count={6} />
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
            <p className="text-emerald-100 font-bold">אדם ב׳: הומוזיגוט (5/5 חזרות)</p>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <span className="w-12">אלל 1:</span>
              <RepeatStrip count={5} />
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <span className="w-12">אלל 2:</span>
              <RepeatStrip count={5} />
            </div>
          </div>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 space-y-3">
        <h3 className="text-xl font-black text-white">זרימת העבודה בזיהוי STR</h3>
        <div className="space-y-2 text-slate-300 leading-relaxed">
          <p>1. אוספים דגימות DNA מן הקורבן ומהחשודים.</p>
          <p>2. מגבירים את המקטעים המכילים STR ב-PCR.</p>
          <p>3. מריצים את הדגימות בג׳ל אלקטרופורזה.</p>
          <p>4. משווים את דפוסי הפסים של דגימת השטח מול הקורבן והחשודים.</p>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 space-y-3">
        <h3 className="text-xl font-black text-white flex items-center gap-2 justify-start">
          <Sigma className="w-5 h-5 text-amber-300" />
          חוק המכפלה (השוואה סטטיסטית)
        </h3>
        <p className="text-slate-300 leading-relaxed">
          אם ההסתברות להתאמה אקראית בכל לוקוס היא קטנה, מכפילים בין הלוקוסים:
        </p>
        <div className="rounded-xl border border-slate-700/60 bg-slate-950/70 p-3 text-slate-100 font-mono text-sm text-left" dir="ltr">
          P(match) = p1 × p2 × p3 × ... × pn
        </div>
        <p className="text-slate-300 leading-relaxed">
          לכן ככל שבודקים יותר לוקוסים (Loci), המכפלה קטנה מאוד והסיכוי לטעות בזיהוי שואף לאפס.
        </p>
      </article>

      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/55 p-5 space-y-4">
        <h3 className="text-2xl font-black text-white">שאלות תרגול: הבנה ויישום</h3>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {QUESTIONS.map((question, questionIndex) => {
            const selectedIndex = answers[question.id];
            const isCorrect = selectedIndex === question.correctIndex;

            return (
              <motion.article
                key={question.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: questionIndex * 0.04 }}
                className={`rounded-2xl border p-4 space-y-3 ${
                  submitted
                    ? isCorrect
                      ? "border-emerald-500/45 bg-emerald-500/10"
                      : "border-red-500/45 bg-red-500/10"
                    : "border-slate-700/60 bg-slate-950/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2 py-1 rounded-full border border-blue-400/30 bg-blue-500/10 text-blue-200">
                    {question.level}
                  </span>
                </div>

                <p className="text-slate-100 font-bold leading-relaxed">{question.prompt}</p>

                <div className="space-y-2">
                  {question.options.map((option, optionIndex) => {
                    const isSelected = selectedIndex === optionIndex;
                    return (
                      <button
                        key={`${question.id}-option-${optionIndex}`}
                        onClick={() => handleSelect(question.id, optionIndex)}
                        disabled={submitted}
                        className={`w-full text-right rounded-xl border px-3 py-2 text-sm transition-colors ${
                          isSelected
                            ? "border-blue-400 bg-blue-500/15 text-blue-100"
                            : "border-slate-700 bg-slate-900/70 text-slate-200 hover:border-blue-400/60"
                        } ${submitted ? "cursor-default" : ""}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {submitted && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-red-400" />
                        )}
                        <span className={`font-bold ${isCorrect ? "text-emerald-300" : "text-red-300"}`}>
                          {isCorrect ? "תשובה נכונה" : "תשובה שגויה"}
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{question.explanation}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 p-4 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-slate-300 font-bold">סטטוס תרגול</p>
            <p className="text-slate-500 text-sm">
              {Object.keys(answers).length} מתוך {total} שאלות סומנו
            </p>
            {submitted && (
              <p className="text-sm font-bold text-emerald-300">
                ציון: {score}/{total} ({percentage}%)
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || submitted}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-xl transition-all"
            >
              בדיקת תשובות
            </button>
            <button
              onClick={handleReset}
              className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold px-6 py-2.5 rounded-xl transition-all border border-slate-600 flex items-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              איפוס
            </button>
            <button
              onClick={onComplete}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl transition-all flex items-center gap-2"
            >
              <FlaskConical className="w-4 h-4" />
              המשך לשלב הבא
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

