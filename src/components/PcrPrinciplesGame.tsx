"use client";
import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BrainCircuit, CheckCircle2, FlaskConical, RefreshCcw, Target, XCircle } from 'lucide-react';

interface PcrPrinciplesGameProps {
  onComplete: () => void;
}

interface Question {
  id: string;
  level: 'בסיס' | 'מתקדם';
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const QUESTIONS: Question[] = [
  {
    id: 'q1',
    level: 'מתקדם',
    prompt: 'מה צפוי לקרות כאשר מעלים יותר מדי את טמפרטורת ה-Annealing?',
    options: [
      'עלייה בקישור לא-ספציפי של פריימרים',
      'ירידה בקישור פריימרים ולכן פחות תוצר PCR',
      'הפולימראז יפסיק לפעול מיד',
      'כמות ה-dNTPs תגדל'
    ],
    correctIndex: 1,
    explanation: 'Annealing גבוה מדי מקשה על פריימרים להיקשר לתבנית ולכן יעילות ההגברה יורדת.'
  },
  {
    id: 'q2',
    level: 'מתקדם',
    prompt: 'מדוע ב-PCR סטנדרטי משתמשים ב-Taq polymerase במקום DNA polymerase רגיל מתא אדם?',
    options: [
      'כי Taq מזהה רק RNA',
      'כי Taq עמיד לטמפרטורות גבוהות של דנטורציה',
      'כי Taq פועל רק ב-4 מעלות',
      'כי Taq מחליף את הפריימרים'
    ],
    correctIndex: 1,
    explanation: 'מחזורי PCR כוללים 95°C, ולכן נדרש אנזים תרמוסטבילי כמו Taq.'
  },
  {
    id: 'q3',
    level: 'מתקדם',
    prompt: 'ב-qPCR התקבל Cₜ=18 בדגימה A ו-Cₜ=21 בדגימה B (עם אותו גן ייחוס). מה המשמעות?',
    options: [
      'בדגימה B יש יותר תבנית התחלתית',
      'בדגימה A יש פחות תבנית התחלתית',
      'בדגימה A יש יותר תבנית התחלתית',
      'אין קשר בין Cₜ לכמות תבנית'
    ],
    correctIndex: 2,
    explanation: 'Cₜ נמוך יותר מעיד על כמות התחלתית גבוהה יותר של מולקולת המטרה.'
  },
  {
    id: 'q4',
    level: 'בסיס',
    prompt: 'מה התפקיד המרכזי של הפריימרים ב-PCR?',
    options: [
      'לספק אנרגיה לריאקציה',
      'לסמן את גבולות המקטע הרצוי לשכפול',
      'לפרק את הדנ"א הדו-גדילי',
      'לזהות זיהומים בדגימה'
    ],
    correctIndex: 1,
    explanation: 'הפריימרים נקשרים לאזורים משלימים ומגדירים את תחום ההגברה.'
  },
  {
    id: 'q5',
    level: 'מתקדם',
    prompt: 'איזו תופעה תעלה חשד לזיהום (contamination) בניסוי PCR?',
    options: [
      'אין תוצר בדגימה חיובית',
      'אות חזק בביקורת שלילית (NTC)',
      'פס יחיד בדגימת מטרה',
      'ערך Cₜ גבוה מאוד בדגימה ענייה בתבנית'
    ],
    correctIndex: 1,
    explanation: 'ביקורת שלילית אמורה להיות ללא תוצר; אות בה מעיד לרוב על זיהום.'
  },
  {
    id: 'q6',
    level: 'מתקדם',
    prompt: 'מה צפוי כשמעלים מאוד את ריכוז Mg²⁺ בתגובת PCR?',
    options: [
      'שיפור ספציפיות מוחלט ללא תופעות לוואי',
      'עלייה אפשרית בתוצרים לא-ספציפיים',
      'עצירה מלאה של פעילות הפולימראז',
      'הפחתה בכמות הפריימרים'
    ],
    correctIndex: 1,
    explanation: 'Mg²⁺ תומך בפעילות האנזים, אך עודף שלו עלול לפגוע בספציפיות.'
  },
  {
    id: 'q7',
    level: 'מתקדם',
    prompt: 'מדוע בשימוש ב-RT-PCR נדרשת תחילה יצירת cDNA?',
    options: [
      'כי PCR מגביר DNA ולא RNA',
      'כי cDNA מזהה חלבונים',
      'כי cDNA הוא בקרה שלילית',
      'כי פולימראז של PCR מפרק RNA'
    ],
    correctIndex: 0,
    explanation: 'אנזימי PCR סטנדרטיים עובדים על תבנית DNA, ולכן ממירים RNA ל-cDNA.'
  },
  {
    id: 'q8',
    level: 'מתקדם',
    prompt: 'התקבלו הרבה primer-dimers. מהו הצעד הסביר ביותר לשיפור?',
    options: [
      'להוריד את טמפרטורת הדנטורציה',
      'להגדיל את זמן הארכה פי 10',
      'לתכנן מחדש פריימרים ולהעלות Annealing בצורה מבוקרת',
      'להוציא לחלוטין את הבופר'
    ],
    correctIndex: 2,
    explanation: 'primer-dimers קשורים לתכנון וקישור לא-ספציפי; התאמת פריימרים ותנאי Annealing עוזרת.'
  }
];

export default function PcrPrinciplesGame({ onComplete }: PcrPrinciplesGameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const currentQuestion = QUESTIONS[currentIndex];
  const totalQuestions = QUESTIONS.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const isFinished = isLastQuestion && locked;
  const answeredCount = Object.keys(answers).length;

  const percentage = useMemo(() => {
    if (!isFinished) return 0;
    return Math.round((correctCount / totalQuestions) * 100);
  }, [correctCount, isFinished, totalQuestions]);

  const handlePrimaryAction = () => {
    if (!locked) {
      if (selectedOption === null) return;

      const isCorrect = selectedOption === currentQuestion.correctIndex;
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: selectedOption }));
      setLocked(true);

      if (isCorrect) {
        setCorrectCount((prev) => prev + 1);
        setStreak((prev) => {
          const next = prev + 1;
          setBestStreak((best) => Math.max(best, next));
          return next;
        });
      } else {
        setStreak(0);
      }
      return;
    }

    if (!isLastQuestion) {
      const nextIndex = currentIndex + 1;
      const nextQuestion = QUESTIONS[nextIndex];
      setCurrentIndex(nextIndex);
      setSelectedOption(answers[nextQuestion.id] ?? null);
      setLocked(false);
    }
  };

  const resetGame = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setLocked(false);
    setAnswers({});
    setCorrectCount(0);
    setStreak(0);
    setBestStreak(0);
  };

  return (
    <div className="glass-pcr-card rounded-[2.5rem] border border-slate-700/30 p-6 md:p-8 space-y-6" dir="rtl">
      <div className="text-right space-y-3">
        <h2 className="text-3xl font-black text-white flex items-center gap-3 justify-start">
          <BrainCircuit className="w-8 h-8 text-violet-300" />
          משחק אתגר: עקרונות PCR ונגזרותיו
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed max-w-4xl">
          בכל שאלה בחרו את האפשרות המדויקת ביותר, בדקו את עצמכם, והתקדמו לשאלה הבאה.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-4 md:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-right">
          <div>
            <p className="text-slate-100 font-bold">
              שאלה {currentIndex + 1} מתוך {totalQuestions}
            </p>
            <p className="text-sm text-slate-400">
              רמת קושי: <span className="text-violet-300 font-bold">{currentQuestion.level}</span>
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm text-slate-200 w-fit">
            <Target className="w-4 h-4 text-emerald-300" />
            רצף נכון נוכחי: {streak}
          </div>
        </div>

        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-l from-violet-400 to-blue-400 transition-all duration-500"
            style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <p className="text-xl text-white font-bold leading-relaxed">{currentQuestion.prompt}</p>
            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedOption === index;
                const isCorrectOption = currentQuestion.correctIndex === index;
                const showCorrect = locked && isCorrectOption;
                const showWrong = locked && isSelected && !isCorrectOption;

                return (
                  <button
                    key={option}
                    disabled={locked}
                    onClick={() => setSelectedOption(index)}
                    className={`text-right rounded-xl border px-4 py-3 transition-all font-medium ${
                      showCorrect
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                        : showWrong
                          ? 'border-red-400 bg-red-500/20 text-red-100'
                          : isSelected
                            ? 'border-blue-400 bg-blue-500/20 text-blue-100'
                            : 'border-slate-700 bg-slate-800/70 text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            <AnimatePresence>
              {locked && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-slate-700/70 bg-slate-950/70 p-4 text-right"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {selectedOption === currentQuestion.correctIndex ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span className="text-emerald-300 font-bold">תשובה נכונה</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-400" />
                        <span className="text-red-300 font-bold">תשובה לא נכונה</span>
                      </>
                    )}
                  </div>
                  <p className="text-slate-300 leading-relaxed">{currentQuestion.explanation}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <button
            onClick={resetGame}
            className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold px-5 py-2.5 rounded-xl transition-all border border-slate-600 w-fit inline-flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            התחל משחק מחדש
          </button>

          <button
            onClick={handlePrimaryAction}
            disabled={!locked && selectedOption === null}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-xl transition-all"
          >
            {locked ? (isLastQuestion ? 'הצג תוצאות' : 'לשאלה הבאה') : 'בדיקת תשובה'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-4"
          >
            <h3 className="text-2xl font-black text-white">סיכום משחק ה-PCR</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
                <p className="text-xs text-slate-400 mb-1">תשובות נכונות</p>
                <p className="text-xl font-black text-emerald-300">
                  {correctCount}/{totalQuestions}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
                <p className="text-xs text-slate-400 mb-1">ציון</p>
                <p className="text-xl font-black text-blue-300">{percentage}%</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
                <p className="text-xs text-slate-400 mb-1">הרצף הטוב ביותר</p>
                <p className="text-xl font-black text-violet-300">{bestStreak}</p>
              </div>
            </div>

            <button
              onClick={onComplete}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl transition-all inline-flex items-center gap-2"
            >
              <FlaskConical className="w-5 h-5" />
              סיום וחזרה לפתיחה
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
