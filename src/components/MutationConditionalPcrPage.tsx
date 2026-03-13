"use client";

export default function MutationConditionalPcrPage() {
  return (
    <div className="glass-pcr-card rounded-[2.5rem] border border-slate-700/30 p-4 md:p-6 space-y-4" dir="rtl">
      <div className="text-right">
        <h2 className="text-2xl md:text-3xl font-black text-white">PCR מותנה מוטציה</h2>
        <p className="text-slate-300 text-sm md:text-base mt-1">סימולציית אבחון ואתגר תכנון פריימרים</p>
      </div>

      <div className="rounded-2xl border border-slate-700/60 overflow-hidden bg-slate-950/70">
        <iframe
          title="הגברה מותנית מוטציה לאבחון מחלה תורשתית"
          src="/pages/mutation-conditional-pcr.html"
          className="w-full h-[1120px] bg-slate-950"
        />
      </div>
    </div>
  );
}

