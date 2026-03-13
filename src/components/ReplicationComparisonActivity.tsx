"use client";
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, CheckCircle2, Circle, Dna, FlaskConical, RefreshCcw } from 'lucide-react';

type BucketId = 'cell' | 'tube' | 'both';

interface Bucket {
  id: BucketId;
  label: string;
  activeClass: string;
}

interface Statement {
  id: string;
  text: string;
  correct: BucketId;
  explanation: string;
}

interface ComparisonRow {
  feature: string;
  cell: string;
  tube: string;
}

interface ReplicationComparisonActivityProps {
  onComplete: () => void;
}

const BUCKETS: Bucket[] = [
  { id: 'cell', label: 'שכפול בתא', activeClass: 'bg-emerald-600 border-emerald-400 text-white' },
  { id: 'tube', label: 'שכפול במבחנה', activeClass: 'bg-blue-600 border-blue-400 text-white' },
  { id: 'both', label: 'בשניהם', activeClass: 'bg-violet-600 border-violet-400 text-white' }
];

const STATEMENTS: Statement[] = [
  {
    id: 's1',
    text: 'חומר המוצא הוא דנ"א דו-גדילי.',
    correct: 'both',
    explanation: 'גם בתא וגם ב-PCR עובדים על תבנית DNA דו-גדילית.'
  },
  {
    id: 's2',
    text: 'התחלת השכפול נעשית בעזרת תחלים טבעיים מסוג RNA.',
    correct: 'cell',
    explanation: 'בתא primase מייצר תחלי RNA לצורך התחלת השכפול.'
  },
  {
    id: 's3',
    text: 'התחלת השכפול נעשית בעזרת תחלים סינתטיים (Primers).',
    correct: 'tube',
    explanation: 'במבחנת PCR משתמשים באוליגונוקלאוטידים סינתטיים.'
  },
  {
    id: 's4',
    text: 'הפרדת הגדילים מתבצעת באמצעות חימום במחזורי טמפרטורה.',
    correct: 'tube',
    explanation: 'ב-PCR שלב הדנטורציה מחליף את פעילות ההליקאז.'
  },
  {
    id: 's5',
    text: 'הפרדת הגדילים מתבצעת בעזרת אנזימים וחלבונים תאיים.',
    correct: 'cell',
    explanation: 'בתא ההליקאז וחלבונים נוספים פותחים את הגדילים.'
  },
  {
    id: 's6',
    text: 'משוכפל רק מקטע DNA מוגדר, מספר רב של פעמים.',
    correct: 'tube',
    explanation: 'PCR מכוון למקטע ספציפי בין זוג תחלים.'
  },
  {
    id: 's7',
    text: 'בדרך כלל כל הגנום משוכפל פעם אחת במחזור התא.',
    correct: 'cell',
    explanation: 'לפני חלוקת תא מתבצע שכפול של כלל ה-DNA הכרומוזומלי.'
  },
  {
    id: 's8',
    text: 'נדרשים מנגנוני תיקון שגיאות יעילים מאוד.',
    correct: 'cell',
    explanation: 'לתא יש מערכות תיקון רבות ששומרות על יציבות גנומית.'
  },
  {
    id: 's9',
    text: 'יכולת תיקון טעויות לרוב מוגבלת יותר.',
    correct: 'tube',
    explanation: 'לאנזימי PCR נפוצים יש proofreading מוגבל או חסר.'
  }
];

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    feature: 'חומר מוצא',
    cell: 'דנ"א דו-גדילי',
    tube: 'דנ"א דו-גדילי'
  },
  {
    feature: 'דרישה להתחלת שכפול',
    cell: 'תחלים טבעיים בתא (RNA primers)',
    tube: 'תחלים סינתטיים (DNA oligonucleotides)'
  },
  {
    feature: 'מרכיבים הכרחיים נוספים',
    cell: 'DNA פולימראז, הליקאז, פרימאז, dNTPs וחלבונים נוספים',
    tube: 'Taq polymerase, dNTPs, primers, buffer ו-Mg²⁺'
  },
  {
    feature: 'הפרדת גדילים לצורך שכפול',
    cell: 'באמצעות אנזימים וחלבונים תאיים',
    tube: 'באמצעות שינויי טמפרטורה (דנטורציה)'
  },
  {
    feature: 'מה משוכפל?',
    cell: 'כל הדנ"א של התא, בדרך כלל פעם אחת במחזור',
    tube: 'רק מקטע מוגדר, מספר רב של פעמים'
  },
  {
    feature: 'תיקון טעויות בזמן שכפול',
    cell: 'תיקון יעיל מאוד',
    tube: 'יכולת מוגבלת יותר, תלוי באנזים'
  }
];

function bucketLabel(id: BucketId): string {
  return BUCKETS.find((bucket) => bucket.id === id)?.label ?? '';
}

export default function ReplicationComparisonActivity({ onComplete }: ReplicationComparisonActivityProps) {
  const [answers, setAnswers] = useState<Record<string, BucketId>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showSummaryTable, setShowSummaryTable] = useState(false);

  const total = STATEMENTS.length;
  const allAnswered = STATEMENTS.every((statement) => Boolean(answers[statement.id]));

  const score = useMemo(() => {
    return STATEMENTS.reduce((acc, statement) => {
      return answers[statement.id] === statement.correct ? acc + 1 : acc;
    }, 0);
  }, [answers]);

  const percentage = Math.round((score / total) * 100);

  const handleSelect = (statementId: string, bucketId: BucketId) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [statementId]: bucketId }));
  };

  const handleSubmit = () => {
    if (!allAnswered) return;
    setSubmitted(true);
    setShowSummaryTable(true);
  };

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
    setShowSummaryTable(false);
  };

  return (
    <div className="glass-pcr-card rounded-[2.5rem] border border-slate-700/30 p-6 md:p-8 space-y-6">
      <div className="text-right space-y-3" dir="rtl">
        <h2 className="text-3xl font-black text-white flex items-center gap-3 justify-start">
          <ArrowLeftRight className="w-8 h-8 text-blue-400" />
          פעילות השוואה: שכפול DNA בתא לעומת במבחנה
        </h2>
        <p className="text-slate-300 text-lg leading-relaxed">
          סמנו לכל היגד האם הוא מתאים לשכפול בתא, לשכפול במבחנה (PCR), או לשניהם.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {STATEMENTS.map((statement, index) => {
          const selected = answers[statement.id];
          const isCorrect = selected === statement.correct;

          return (
            <motion.article
              key={statement.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`rounded-2xl border p-4 text-right space-y-4 transition-all ${
                submitted
                  ? isCorrect
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-red-500/50 bg-red-500/10'
                  : 'border-slate-700/40 bg-slate-900/40'
              }`}
              dir="rtl"
            >
              <p className="text-slate-100 text-base leading-relaxed font-medium">{statement.text}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {BUCKETS.map((bucket) => {
                  const isSelected = selected === bucket.id;
                  return (
                    <button
                      key={bucket.id}
                      type="button"
                      disabled={submitted}
                      onClick={() => handleSelect(statement.id, bucket.id)}
                      className={`rounded-xl border px-3 py-2 text-sm font-bold transition-all ${
                        isSelected
                          ? bucket.activeClass
                          : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-500'
                      } ${submitted ? 'cursor-default' : ''}`}
                    >
                      {bucket.label}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence>
                {submitted && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-red-400" />
                      )}
                      <span className={isCorrect ? 'text-emerald-300 font-bold' : 'text-red-300 font-bold'}>
                        {isCorrect ? 'תשובה נכונה' : `תשובה נכונה: ${bucketLabel(statement.correct)}`}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{statement.explanation}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 p-4 md:p-6 space-y-4" dir="rtl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-slate-300 font-bold">התקדמות פעילות</p>
            <p className="text-slate-500 text-sm">
              {Object.keys(answers).length} מתוך {total} היגדים סומנו
            </p>
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
          </div>
        </div>

        <AnimatePresence>
          {submitted && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 space-y-3"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="flex items-center gap-2 text-blue-300 font-bold">
                  <Dna className="w-5 h-5" />
                  ציון פעילות: {score}/{total} ({percentage}%)
                </div>
                <button
                  onClick={() => setShowSummaryTable((prev) => !prev)}
                  className="text-sm px-4 py-2 rounded-lg border border-blue-400/30 text-blue-200 hover:bg-blue-500/15 transition-all w-fit"
                >
                  {showSummaryTable ? 'הסתר טבלת השוואה' : 'הצג טבלת השוואה מלאה'}
                </button>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-l from-emerald-400 to-blue-400 transition-all duration-700"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="flex justify-start">
                <button
                  onClick={onComplete}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl transition-all flex items-center gap-2"
                >
                  <FlaskConical className="w-4 h-4" />
                  המשך לשלב הבא
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {submitted && showSummaryTable && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border border-slate-700/40 overflow-hidden bg-slate-900/30"
            dir="rtl"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-right">
                <thead>
                  <tr className="bg-slate-800/90 text-slate-100">
                    <th className="p-4 border border-slate-700 font-black">מרכיבים ומאפיינים</th>
                    <th className="p-4 border border-slate-700 font-black">שכפול דנ&quot;א בתא</th>
                    <th className="p-4 border border-slate-700 font-black">שכפול דנ&quot;א במבחנה</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.feature} className="odd:bg-slate-900/60 even:bg-slate-950/60">
                      <td className="p-4 border border-slate-800 text-slate-200 font-bold">{row.feature}</td>
                      <td className="p-4 border border-slate-800 text-slate-300 leading-relaxed">{row.cell}</td>
                      <td className="p-4 border border-slate-800 text-slate-300 leading-relaxed">{row.tube}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
