"use client";
import React from 'react';
import { ChevronRight, Thermometer, Zap, Share2, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import DNAAnimation from './DNAAnimation';

const PCR_STEPS = [
  {
    title: 'דנטורציה (Denaturation)',
    temp: '95°C',
    description: 'בחום גבוה קשרי המימן בסליל הכפול נשברים, מה שגורם להפרדת גדילי ה-DNA לשניים.',
    icon: <Zap className="w-5 h-5 text-amber-400" />,
    color: 'border-amber-500/30 bg-amber-500/5'
  },
  {
    title: 'צימוד תחלים (Annealing)',
    temp: '55°C - 65°C',
    description: 'הטמפרטורה יורדת כדי לאפשר לתחלים (Primers) להיקשר באופן ספציפי לקצוות מקטע המטרה.',
    icon: <Share2 className="w-5 h-5 text-blue-400" />,
    color: 'border-blue-500/30 bg-blue-500/5'
  },
  {
    title: 'הארכה (Extension)',
    temp: '72°C',
    description: 'אנזים ה-Taq פולימראז בונה גדיל DNA חדש על ידי הוספת נוקלאוטידים התואמים לתבנית.',
    icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
    color: 'border-emerald-500/30 bg-emerald-500/5'
  }
];

export default function ThermalCycler({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Simulation Content Area */}
      <div className="flex flex-col lg:flex-row-reverse gap-6">
        
        {/* PCR Step Guide Sidebar */}
        <div className="flex-[0.6] flex flex-col gap-4">
          <div className="glass-pcr-card rounded-3xl p-6 border border-slate-700/30 flex flex-col gap-5">
            <h3 className="text-xl font-bold text-slate-100 flex items-center justify-start gap-3 border-b border-slate-700/50 pb-4" dir="rtl">
              <Thermometer className="text-blue-400 w-6 h-6" />
              שלבי מחזור ה-PCR
            </h3>
            
            <div className="flex flex-col gap-3">
              {PCR_STEPS.map((step, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.2 }}
                  className={`p-4 rounded-2xl border ${step.color} space-y-2`}
                  dir="rtl"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-900/50 rounded-lg border border-white/5">
                        {step.icon}
                      </div>
                      <span className="font-bold text-slate-100">{step.title}</span>
                    </div>
                    <span className="text-sm font-black text-blue-400/80 bg-blue-400/10 px-4 py-1 rounded-full border border-blue-400/20 whitespace-nowrap">
                      {step.temp}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed font-medium pr-1">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Animation Display */}
        <div className="flex-[1.4] glass-pcr-card rounded-3xl shadow-4xl flex flex-col border border-slate-700/30 overflow-hidden">
          <DNAAnimation />
        </div>
      </div>

    </div>
  );
}
