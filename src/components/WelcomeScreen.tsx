import { PlayCircle, FlaskConical, Dna, LineChart } from 'lucide-react';

interface WelcomeScreenProps {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <section className="flex-1 flex items-center justify-center py-8">
      <div className="w-full max-w-6xl rounded-[2.5rem] border border-slate-700/40 bg-slate-900/45 backdrop-blur-xl p-8 md:p-12 space-y-8 text-right relative overflow-hidden shadow-2xl">
        <div className="absolute -top-28 -right-24 w-96 h-96 bg-blue-500/15 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-500/10 blur-[120px] pointer-events-none" />

        <div className="space-y-4 relative z-10">
          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight bg-gradient-to-l from-blue-200 via-white to-emerald-300 bg-clip-text text-transparent">
            PCR Master: המדריך המלא לשכפול גנטי
          </h1>
          <p className="text-lg md:text-2xl text-slate-300 max-w-4xl leading-relaxed">
            כל הכלים ל-PCR, RT-PCR ו-qPCR במקום אחד. מתכנון פריימרים ועד ניתוח תוצאות.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          <article className="rounded-2xl border border-blue-400/25 bg-blue-500/10 p-5 space-y-3">
            <div className="flex items-center justify-start gap-2 text-blue-300">
              <FlaskConical className="w-5 h-5" />
              <h2 className="text-lg font-bold">PCR</h2>
            </div>
            <p className="text-slate-200 leading-relaxed">
              מרכיבי השיטה, שלביה ויישומה.
            </p>
          </article>

          <article className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-5 space-y-3">
            <div className="flex items-center justify-start gap-2 text-emerald-300">
              <Dna className="w-5 h-5" />
              <h2 className="text-lg font-bold">RT-PCR</h2>
            </div>
            <p className="text-slate-200 leading-relaxed">
              מ - mRNA ל - DNA באמצעות RT. המטרה: איפיון ביטוי גנים בתאים.
            </p>
          </article>

          <article className="rounded-2xl border border-violet-400/25 bg-violet-500/10 p-5 space-y-3">
            <div className="flex items-center justify-start gap-2 text-violet-300">
              <LineChart className="w-5 h-5" />
              <h2 className="text-lg font-bold">qPCR</h2>
            </div>
            <p className="text-slate-200 leading-relaxed">
              חישובי <span className="font-mono text-white">2<sup>-ΔΔC<sub>T</sub></sup></span> וניתוח כימות יחסי בזמן אמת.
            </p>
          </article>
        </div>

        <div className="flex justify-start relative z-10">
          <button
            onClick={onStart}
            className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl shadow-[0_10px_25px_rgba(59,130,246,0.25)] transition-all hover:scale-105 active:scale-95"
          >
            <PlayCircle className="w-5 h-5" />
            התחל סימולציה
          </button>
        </div>
      </div>
    </section>
  );
}
