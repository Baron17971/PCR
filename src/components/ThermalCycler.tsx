"use client";
import React from 'react';
import { ChevronRight } from 'lucide-react';
import DNAAnimation from './DNAAnimation';

export default function ThermalCycler({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Animation Display */}
      <div className="glass-pcr-card rounded-3xl p-8 shadow-4xl flex flex-col gap-8">
        <DNAAnimation />
      </div>

      <div className="flex justify-center mt-4">
         <button 
            onClick={onComplete}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            שלב הבא: סיכום התהליך
            <ChevronRight className="w-5 h-5" />
          </button>
      </div>
    </div>
  );
}
