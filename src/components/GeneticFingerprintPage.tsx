"use client";

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpenText,
  CheckCircle2,
  Circle,
  Fingerprint,
  FlaskConical,
  RefreshCcw,
  Sigma
} from 'lucide-react';

interface GeneticFingerprintPageProps {
  onComplete: () => void;
}

interface PracticeQuestion {
  id: string;
  level: '׳”׳‘׳ ׳”' | '׳™׳™׳©׳•׳';
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
    id: 'q1',
    level: '׳”׳‘׳ ׳”',
    prompt: '׳׳”׳• STR?',
    options: [
      '׳¨׳¦׳£ ׳׳§׳•׳“׳“ ׳׳¨׳•׳ ׳©׳׳™׳™׳¦׳¨ ׳—׳׳‘׳•׳',
      '׳¨׳¦׳£ ׳§׳¦׳¨ ׳©׳—׳•׳–׳¨ ׳‘׳˜׳ ׳“׳ ׳‘׳׳¡׳₪׳¨ ׳—׳–׳¨׳•׳× ׳׳©׳×׳ ׳” ׳‘׳™׳ ׳׳ ׳©׳™׳',
      '׳׳ ׳–׳™׳ ׳©׳׳¢׳×׳™׳§ DNA',
      '׳¡׳•׳’ ׳©׳ ׳₪׳¨׳™׳™׳׳¨ ׳׳׳׳›׳•׳×׳™'
    ],
    correctIndex: 1,
    explanation:
      'STR ׳”׳ ׳¨׳¦׳₪׳™׳ ׳§׳¦׳¨׳™׳ ׳—׳•׳–׳¨׳™׳ (Short Tandem Repeats), ׳׳¨׳•׳‘ ׳‘׳׳–׳•׳¨׳™׳ ׳׳ ׳׳§׳•׳“׳“׳™׳, ׳•׳׳¡׳₪׳¨ ׳”׳—׳–׳¨׳•׳× ׳‘׳”׳ ׳׳©׳×׳ ׳” ׳‘׳™׳ ׳₪׳¨׳˜׳™׳.'
  },
  {
    id: 'q2',
    level: '׳”׳‘׳ ׳”',
    prompt: '׳׳׳” STR ׳׳×׳׳™׳ ׳׳–׳™׳”׳•׳™ ׳₪׳׳™׳׳™?',
    options: [
      '׳›׳™ ׳¨׳¦׳₪׳™ STR ׳–׳”׳™׳ ׳׳—׳׳•׳˜׳™׳ ׳׳¦׳ ׳›׳ ׳‘׳ ׳™ ׳”׳׳“׳',
      '׳›׳™ ׳׳¡׳₪׳¨ ׳”׳—׳–׳¨׳•׳× ׳‘-STR ׳׳©׳×׳ ׳” ׳‘׳™׳ ׳׳ ׳©׳™׳ ׳•׳™׳•׳¦׳¨ ׳₪׳¨׳•׳₪׳™׳ ׳׳™׳©׳™',
      '׳›׳™ STR ׳ ׳׳¦׳ ׳¨׳§ ׳‘׳›׳¨׳•׳׳•׳–׳•׳ Y',
      '׳›׳™ STR ׳׳•׳₪׳™׳¢ ׳¨׳§ ׳‘׳’׳ ׳™׳ ׳׳§׳•׳“׳“׳™׳'
    ],
    correctIndex: 1,
    explanation:
      '׳”׳©׳•׳ ׳•׳× ׳‘׳׳¡׳₪׳¨ ׳”׳—׳–׳¨׳•׳× ׳‘׳›׳ ׳׳•׳§׳•׳¡ STR ׳׳׳₪׳©׳¨׳× ׳׳‘׳ ׳•׳× ׳₪׳¨׳•׳₪׳™׳ ׳’׳ ׳˜׳™ ׳©׳׳‘׳“׳™׳ ׳‘׳™׳ ׳׳ ׳©׳™׳.'
  },
  {
    id: 'q3',
    level: '׳™׳™׳©׳•׳',
    prompt: '׳׳ ׳”׳”׳¡׳×׳‘׳¨׳•׳× ׳׳”׳×׳׳׳” ׳׳§׳¨׳׳™׳× ׳‘׳׳•׳§׳•׳¡ 1 ׳”׳™׳ 1/10 ׳•׳‘׳׳•׳§׳•׳¡ 2 ׳”׳™׳ 1/20, ׳׳”׳™ ׳”׳”׳¡׳×׳‘׳¨׳•׳× ׳”׳׳©׳•׳׳‘׳× ׳׳₪׳™ ׳—׳•׳§ ׳”׳׳›׳₪׳׳”?',
    options: ['1/30', '1/200', '1/2', '1/100'],
    correctIndex: 1,
    explanation:
      '׳‘׳—׳•׳§ ׳”׳׳›׳₪׳׳” ׳›׳•׳₪׳׳™׳ ׳”׳¡׳×׳‘׳¨׳•׳™׳•׳×: 1/10 ֳ— 1/20 = 1/200. ׳›׳›׳ ׳©׳׳•׳¡׳™׳₪׳™׳ ׳׳•׳§׳•׳¡׳™׳, ׳”׳”׳¡׳×׳‘׳¨׳•׳× ׳׳”׳×׳׳׳” ׳׳§׳¨׳׳™׳× ׳§׳˜׳ ׳” ׳׳׳•׳“.'
  },
  {
    id: 'q4',
    level: '׳™׳™׳©׳•׳',
    prompt: '׳׳” ׳§׳•׳¨׳” ׳¡׳˜׳˜׳™׳¡׳˜׳™׳× ׳›׳©׳׳•׳¡׳™׳₪׳™׳ ׳¢׳•׳“ ׳׳•׳§׳•׳¡׳™׳ ׳׳”׳©׳•׳•׳׳” ׳‘׳₪׳¨׳•׳₪׳™׳ STR?',
    options: [
      '׳¡׳™׳›׳•׳™ ׳”׳˜׳¢׳•׳× ׳’׳“׳',
      '׳¡׳™׳›׳•׳™ ׳”׳˜׳¢׳•׳× ׳׳ ׳׳©׳×׳ ׳”',
      '׳¡׳™׳›׳•׳™ ׳”׳˜׳¢׳•׳× ׳§׳˜׳ ׳›׳™ ׳׳›׳₪׳™׳׳™׳ ׳‘׳¢׳•׳“ ׳”׳¡׳×׳‘׳¨׳•׳™׳•׳× ׳§׳˜׳ ׳•׳×',
      '׳׳™ ׳׳₪׳©׳¨ ׳™׳•׳×׳¨ ׳׳—׳©׳‘ ׳”׳¡׳×׳‘׳¨׳•׳×'
    ],
    correctIndex: 2,
    explanation:
      '׳׳•׳§׳•׳¡׳™׳ ׳ ׳•׳¡׳₪׳™׳ ׳׳•׳¡׳™׳₪׳™׳ ׳’׳•׳¨׳׳™ ׳׳›׳₪׳׳” ׳§׳˜׳ ׳™׳, ׳•׳׳›׳ ׳”׳”׳¡׳×׳‘׳¨׳•׳× ׳׳”׳×׳׳׳” ׳׳§׳¨׳׳™׳× ׳©׳•׳׳₪׳× ׳׳׳₪׳¡.'
  }
];

export default function GeneticFingerprintPage({ onComplete }: GeneticFingerprintPageProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const total = QUESTIONS.length;
  const allAnswered = QUESTIONS.every((question) => typeof answers[question.id] === 'number');

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
          ׳˜׳‘׳™׳¢׳× ׳׳¦׳‘׳¢ ׳’׳ ׳˜׳™׳× (STR)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed max-w-4xl">
          ׳“׳£ ׳–׳” ׳׳¦׳™׳’ ׳׳× ׳¢׳§׳¨׳•׳ ׳•׳× ׳”-STR ׳‘׳–׳™׳”׳•׳™ ׳₪׳׳™׳׳™, ׳›׳•׳׳ ׳”׳™׳’׳™׳•׳ ׳‘׳™׳•׳׳•׳’׳™ ׳•׳”׳©׳•׳•׳׳” ׳¡׳˜׳˜׳™׳¡׳˜׳™׳×.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <article className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 space-y-3">
          <h3 className="text-xl font-black text-white flex items-center gap-2 justify-start">
            <BookOpenText className="w-5 h-5 text-emerald-300" />
            ׳׳”׳• STR?
          </h3>
          <p className="text-slate-300 leading-relaxed">
            STR (Short Tandem Repeats) ׳”׳ ׳¨׳¦׳₪׳™׳ ׳§׳¦׳¨׳™׳ ׳©׳—׳•׳–׳¨׳™׳ ׳׳¡׳₪׳¨ ׳₪׳¢׳׳™׳ ׳‘׳׳•׳×׳• ׳׳•׳§׳•׳¡, ׳׳¨׳•׳‘ ׳‘׳׳–׳•׳¨׳™׳ ׳׳ ׳׳§׳•׳“׳“׳™׳ ׳©׳ ׳”-DNA.
            ׳׳¡׳₪׳¨ ׳”׳—׳–׳¨׳•׳× ׳׳©׳×׳ ׳” ׳‘׳™׳ ׳׳ ׳©׳™׳ ׳•׳׳›׳ ׳׳׳₪׳©׳¨ ׳‘׳™׳“׳•׳ ׳‘׳™׳ ׳₪׳¨׳•׳₪׳™׳׳™׳ ׳’׳ ׳˜׳™׳™׳.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 space-y-3">
          <h3 className="text-xl font-black text-white flex items-center gap-2 justify-start">
            <BookOpenText className="w-5 h-5 text-violet-300" />
            ׳׳ ׳׳•׳’׳™׳” ׳₪׳©׳•׳˜׳”
          </h3>
          <p className="text-slate-300 leading-relaxed">
            ׳“׳׳™׳™׳ ׳׳× ׳”-DNA ׳›׳¡׳₪׳¨: ׳׳›׳•׳׳ ׳• ׳™׳© ׳׳•׳×׳ ׳׳™׳׳™׳ ׳‘׳¡׳™׳¡׳™׳•׳×, ׳׳‘׳ ׳‘׳¢׳׳•׳“׳™׳ ׳׳¡׳•׳™׳׳™׳ ׳™׳© ׳׳™׳׳” ׳©׳—׳•׳–׳¨׳× ׳׳¡׳₪׳¨ ׳©׳•׳ ׳” ׳©׳ ׳₪׳¢׳׳™׳.
            ׳“׳₪׳•׳¡ ׳”׳—׳–׳¨׳•׳× ׳”׳–׳” ׳™׳•׳¦׳¨ ׳—׳×׳™׳׳” ׳׳™׳©׳™׳×.
          </p>
        </article>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <article className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 space-y-3">
          <h3 className="text-xl font-black text-white">׳‘׳¡׳™׳¡ ׳’׳ ׳˜׳™ ׳©׳ STR</h3>
          <p className="text-slate-300 leading-relaxed">
            ׳›׳ ׳׳“׳ ׳ ׳•׳©׳ ׳‘׳›׳ ׳×׳ ׳׳¢׳¨׳ ׳›׳₪׳•׳ ׳©׳ ׳›׳¨׳•׳׳•׳–׳•׳׳™׳, ׳•׳׳›׳ ׳‘׳›׳ ׳׳•׳§׳•׳¡ ׳§׳™׳™׳׳™׳ ׳©׳ ׳™ ׳׳׳׳™׳. ׳”׳׳©׳׳¢׳•׳× ׳”׳™׳ ׳©׳׳“׳ ׳™׳›׳•׳ ׳׳”׳™׳•׳×
            ׳”׳•׳׳•׳–׳™׳’׳•׳˜ ׳׳• ׳”׳˜׳¨׳•׳–׳™׳’׳•׳˜ ׳׳ ׳¨׳§ ׳‘׳™׳—׳¡ ׳׳’׳ ׳™׳ ׳׳§׳•׳“׳“׳™׳, ׳׳׳ ׳’׳ ׳‘׳™׳—׳¡ ׳׳׳§׳˜׳¢׳™׳ ׳₪׳•׳׳™׳׳•׳¨׳₪׳™׳™׳ ׳׳¡׳•׳’ STR.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 space-y-4">
          <h3 className="text-xl font-black text-white">׳“׳•׳’׳׳”: ׳”׳˜׳¨׳•׳–׳™׳’׳•׳˜ ׳׳•׳ ׳”׳•׳׳•׳–׳™׳’׳•׳˜</h3>

          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 space-y-2">
            <p className="text-cyan-100 font-bold">׳׳“׳ ׳׳³: ׳”׳˜׳¨׳•׳–׳™׳’׳•׳˜ (4/6 ׳—׳–׳¨׳•׳×)</p>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <span className="w-12">׳׳׳ 1:</span>
              <RepeatStrip count={4} />
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <span className="w-12">׳׳׳ 2:</span>
              <RepeatStrip count={6} />
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
            <p className="text-emerald-100 font-bold">׳׳“׳ ׳‘׳³: ׳”׳•׳׳•׳–׳™׳’׳•׳˜ (5/5 ׳—׳–׳¨׳•׳×)</p>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <span className="w-12">׳׳׳ 1:</span>
              <RepeatStrip count={5} />
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <span className="w-12">׳׳׳ 2:</span>
              <RepeatStrip count={5} />
            </div>
          </div>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 space-y-3">
        <h3 className="text-xl font-black text-white">׳–׳¨׳™׳׳× ׳”׳¢׳‘׳•׳“׳” ׳‘׳–׳™׳”׳•׳™ STR</h3>
        <div className="space-y-2 text-slate-300 leading-relaxed">
          <p>1. ׳׳•׳¡׳₪׳™׳ ׳“׳’׳™׳׳•׳× DNA ׳׳ ׳”׳§׳•׳¨׳‘׳ ׳•׳׳”׳—׳©׳•׳“׳™׳.</p>
          <p>2. ׳׳’׳‘׳™׳¨׳™׳ ׳׳× ׳”׳׳§׳˜׳¢׳™׳ ׳”׳׳›׳™׳׳™׳ STR ׳‘-PCR.</p>
          <p>3. ׳׳¨׳™׳¦׳™׳ ׳׳× ׳”׳“׳’׳™׳׳•׳× ׳‘׳’׳³׳ ׳׳׳§׳˜׳¨׳•׳₪׳•׳¨׳–׳”.</p>
          <p>4. ׳׳©׳•׳•׳™׳ ׳׳× ׳“׳₪׳•׳¡׳™ ׳”׳₪׳¡׳™׳ ׳©׳ ׳“׳’׳™׳׳× ׳”׳©׳˜׳— ׳׳•׳ ׳”׳§׳•׳¨׳‘׳ ׳•׳”׳—׳©׳•׳“׳™׳.</p>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 space-y-3">
        <h3 className="text-xl font-black text-white flex items-center gap-2 justify-start">
          <Sigma className="w-5 h-5 text-amber-300" />
          ׳—׳•׳§ ׳”׳׳›׳₪׳׳” (׳”׳©׳•׳•׳׳” ׳¡׳˜׳˜׳™׳¡׳˜׳™׳×)
        </h3>
        <p className="text-slate-300 leading-relaxed">
          ׳׳ ׳”׳”׳¡׳×׳‘׳¨׳•׳× ׳׳”׳×׳׳׳” ׳׳§׳¨׳׳™׳× ׳‘׳›׳ ׳׳•׳§׳•׳¡ ׳”׳™׳ ׳§׳˜׳ ׳”, ׳׳›׳₪׳™׳׳™׳ ׳‘׳™׳ ׳”׳׳•׳§׳•׳¡׳™׳:
        </p>
        <div className="rounded-xl border border-slate-700/60 bg-slate-950/70 p-3 text-slate-100 font-mono text-sm text-left" dir="ltr">
          P(match) = p1 ֳ— p2 ֳ— p3 ֳ— ... ֳ— pn
        </div>
        <p className="text-slate-300 leading-relaxed">
          ׳׳›׳ ׳›׳›׳ ׳©׳‘׳•׳“׳§׳™׳ ׳™׳•׳×׳¨ ׳׳•׳§׳•׳¡׳™׳ (Loci), ׳”׳׳›׳₪׳׳” ׳§׳˜׳ ׳” ׳׳׳•׳“ ׳•׳”׳¡׳™׳›׳•׳™ ׳׳˜׳¢׳•׳× ׳‘׳–׳™׳”׳•׳™ ׳©׳•׳׳£ ׳׳׳₪׳¡.
        </p>
      </article>

      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/55 p-5 space-y-4">
        <h3 className="text-2xl font-black text-white">׳©׳׳׳•׳× ׳×׳¨׳’׳•׳: ׳”׳‘׳ ׳” ׳•׳™׳™׳©׳•׳</h3>

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
                      ? 'border-emerald-500/45 bg-emerald-500/10'
                      : 'border-red-500/45 bg-red-500/10'
                    : 'border-slate-700/60 bg-slate-950/60'
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
                            ? 'border-blue-400 bg-blue-500/15 text-blue-100'
                            : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-blue-400/60'
                        } ${submitted ? 'cursor-default' : ''}`}
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
                        <span className={`font-bold ${isCorrect ? 'text-emerald-300' : 'text-red-300'}`}>
                          {isCorrect ? '׳×׳©׳•׳‘׳” ׳ ׳›׳•׳ ׳”' : '׳×׳©׳•׳‘׳” ׳©׳’׳•׳™׳”'}
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
            <p className="text-slate-300 font-bold">׳¡׳˜׳˜׳•׳¡ ׳×׳¨׳’׳•׳</p>
            <p className="text-slate-500 text-sm">
              {Object.keys(answers).length} ׳׳×׳•׳ {total} ׳©׳׳׳•׳× ׳¡׳•׳׳ ׳•
            </p>
            {submitted && (
              <p className="text-sm font-bold text-emerald-300">
                ׳¦׳™׳•׳: {score}/{total} ({percentage}%)
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || submitted}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-xl transition-all"
            >
              ׳‘׳“׳™׳§׳× ׳×׳©׳•׳‘׳•׳×
            </button>
            <button
              onClick={handleReset}
              className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold px-6 py-2.5 rounded-xl transition-all border border-slate-600 flex items-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              ׳׳™׳₪׳•׳¡
            </button>
            <button
              onClick={onComplete}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl transition-all flex items-center gap-2"
            >
              <FlaskConical className="w-4 h-4" />
              ׳”׳׳©׳ ׳׳©׳׳‘ ׳”׳‘׳
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


