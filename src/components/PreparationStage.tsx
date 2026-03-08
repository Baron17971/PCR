"use client";
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronLeft, Beaker, XCircle } from 'lucide-react';
import { INGREDIENTS, IngredientId, Ingredient } from '@/types';

interface PreparationStageProps {
  onComplete: () => void;
}

export default function PreparationStage({ onComplete }: PreparationStageProps) {
  const [addedIngredients, setAddedIngredients] = useState<Set<IngredientId>>(new Set());
  const [activeInstruction, setActiveInstruction] = useState<IngredientId | null>(null);
  const [feedback, setFeedback] = useState<{ text: string, isCorrect: boolean } | null>(null);
  const [shakeTube, setShakeTube] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Memoize shuffled ingredients so the order stays the same during the same session
  const shuffledIngredients = useMemo(() => {
    return [...INGREDIENTS].sort(() => Math.random() - 0.5);
  }, []);

  const requiredCount = INGREDIENTS.filter(i => i.isRequired).length;

  const handleAddIngredient = (item: Ingredient) => {
    setActiveInstruction(item.id);
    
    if (item.isRequired) {
      setAddedIngredients(prev => {
        const next = new Set(prev);
        next.add(item.id);
        
        // Auto-show modal when complete
        if (next.size === requiredCount) {
          setTimeout(() => setShowModal(true), 800);
        }
        
        return next;
      });
      setFeedback({ text: item.feedbackText, isCorrect: true });
    } else {
      setFeedback({ text: item.feedbackText, isCorrect: false });
      setShakeTube(true);
      setTimeout(() => setShakeTube(false), 500);
    }
  };

  const isComplete = addedIngredients.size === requiredCount;

  const renderIngredientGraphic = (id: IngredientId) => {
    switch (id) {
      case 'dna':
        return (
          <motion.div 
            key="dna"
            className="absolute drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] z-20"
            initial={{ opacity: 0, y: -400 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            style={{ left: '50%', bottom: '25%' }}
          >
            <div style={{ transform: 'translate(-50%, 50%) rotate(45deg)' }}>
              <svg viewBox="0 0 120 40" className="w-20 h-7">
                <rect x="0" y="5" width="120" height="6" fill="#88c9d9" />
                <rect x="0" y="29" width="120" height="6" fill="#88c9d9" />
                {[...Array(14)].map((_, i) => (
                  <g key={i} transform={`translate(${4 + i * 8}, 11)`}>
                    <rect x="0" y="0" width="4" height="8" fill="#1473b8" />
                    <rect x="0" y="10" width="4" height="8" fill="#1473b8" />
                  </g>
                ))}
              </svg>
            </div>
          </motion.div>
        );
      case 'primers':
        const primersLoc = [
          {l: '35%', b: '15%', r: 15}, {l: '55%', b: '25%', r: -30}, 
          {l: '70%', b: '40%', r: 70}, {l: '30%', b: '45%', r: 120}, 
          {l: '50%', b: '55%', r: -10}, {l: '60%', b: '20%', r: 45}, 
          {l: '40%', b: '65%', r: -50}, {l: '70%', b: '50%', r: 80}
        ];
        return (
          <>
            {primersLoc.map((pos, idx) => (
              <motion.div 
                key={`primer-${idx}`} 
                initial={{ opacity: 0, y: -400 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, type: "spring", stiffness: 120, damping: 14 }}
                className="absolute drop-shadow-md z-20" 
                style={{ left: pos.l, bottom: pos.b }}
              >
                <div style={{ transform: `translate(-50%, 50%) rotate(${pos.r}deg)` }}>
                  <svg viewBox="0 0 50 20" className="w-9 h-3.5">
                    <rect x="0" y="0" width="50" height="6" fill="#f89c45" />
                    {[...Array(5)].map((_, i) => (
                      <rect key={i} x={4 + i * 9} y="6" width="6" height="12" fill="#f47f20" />
                    ))}
                  </svg>
                </div>
              </motion.div>
            ))}
          </>
        );
      case 'taq':
        const taqLoc = [
          {l: '45%', b: '20%', r: 40}, {l: '65%', b: '30%', r: -15}, 
          {l: '25%', b: '40%', r: 110}, {l: '50%', b: '60%', r: -60}, 
          {l: '35%', b: '70%', r: 85}, {l: '75%', b: '55%', r: -25}
        ];
        return (
          <>
             {taqLoc.map((pos, idx) => (
               <motion.div 
                 key={`taq-${idx}`} 
                 initial={{ opacity: 0, y: -400 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: idx * 0.05, type: "spring", stiffness: 120, damping: 14 }}
                 className="absolute drop-shadow-lg z-20" 
                 style={{ left: pos.l, bottom: pos.b }}
               >
                 <div style={{ transform: `translate(-50%, 50%) rotate(${pos.r}deg)` }}>
                   <svg viewBox="0 0 60 90" className="w-9 h-11 -ml-1 -mt-1 drop-shadow-lg">
                     <path d="M 20 10 C -10 30, -10 60, 20 80 C 50 100, 70 70, 55 45 C 50 30, 45 -10, 20 10 Z" fill="#7cc65e" />
                     <text x="32" y="55" fontSize="16" fill="#1b4511" fontWeight="bold" textAnchor="middle" transform="rotate(-15 32 55)">Taq</text>
                   </svg>
                 </div>
               </motion.div>
             ))}
          </>
        );
      case 'dntps':
        const dntpLoc = [
          {l: '50%', b: '10%', r: 10}, {l: '40%', b: '18%', r: 40}, 
          {l: '60%', b: '22%', r: -10}, {l: '30%', b: '30%', r: 80}, 
          {l: '65%', b: '35%', r: -30}, {l: '25%', b: '45%', r: 50}, 
          {l: '50%', b: '35%', r: -70}, {l: '45%', b: '50%', r: 20}, 
          {l: '70%', b: '45%', r: -50}, {l: '35%', b: '60%', r: 60}, 
          {l: '65%', b: '65%', r: -15}, {l: '50%', b: '75%', r: 35},
          {l: '30%', b: '65%', r: -80}, {l: '70%', b: '70%', r: 15}, 
          {l: '55%', b: '55%', r: 45}, {l: '40%', b: '40%', r: -25}
        ];
        return (
          <>
            {dntpLoc.map((pos, idx) => {
              const types = [
                { color1: '#f24646', color2: '#e68080', letter: 'T' },
                { color1: '#186a87', color2: '#58a0b8', letter: 'A' },
                { color1: '#e88933', color2: '#e8b180', letter: 'C' },
                { color1: '#359c83', color2: '#80cbb8', letter: 'G' }
              ];
              const t = types[idx % 4];
              return (
                <motion.div 
                  key={`dntp-${idx}`} 
                  initial={{ opacity: 0, y: -400 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02, type: "spring", stiffness: 120, damping: 14 }}
                  className="absolute z-20" 
                  style={{ left: pos.l, bottom: pos.b }}
                >
                  <div style={{ transform: `translate(-50%, 50%) rotate(${pos.r}deg)` }}>
                    <svg viewBox="0 0 40 40" className="w-5.5 h-5.5 drop-shadow-md">
                      <rect x="12" y="4" width="16" height="20" fill={t.color1} />
                      <rect x="4" y="24" width="32" height="12" fill={t.color2} />
                      <text x="20" y="18" fontSize="12" fill="white" fontWeight="bold" textAnchor="middle">{t.letter}</text>
                    </svg>
                  </div>
                </motion.div>
              );
            })}
          </>
        );
      case 'buffer':
        return null; // The liquid animation handles the buffer
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 glass-pcr-card rounded-[3rem] p-6 md:p-10 shadow-3xl">
      
      {/* Completion Modal Overlay */}
      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-slate-700 p-8 rounded-[2rem] shadow-4xl max-w-sm w-full text-center space-y-6"
            >
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-100">המבחנה מוכנה!</h3>
                <p className="text-slate-400">הוספת את כל המרכיבים הדרושים לתגובת ה-PCR.</p>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onComplete}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 group"
                >
                  התחל סימולציית PCR
                  <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </motion.button>
                <button 
                  onClick={() => setShowModal(false)}
                  className="w-full py-3 text-slate-500 hover:text-slate-300 transition-colors font-medium"
                >
                  סגור וצפה במבחנה
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left side: Ingredients List & Information */}
      <div className="flex-[1.4] space-y-8">
        <div className="space-y-2 w-full text-right">
          <h2 className="text-xl font-bold text-slate-100 flex items-center justify-start gap-2">
            <Beaker className="text-blue-400 w-5 h-5" />
             שלב ההכנה
          </h2>
          <p className="text-slate-400">
            בחר את המרכיבים הנכונים שיש להכניס למבחנה כדי לבצע את תהליך ה-PCR.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shuffledIngredients.map((ingredient) => {
            const isAdded = addedIngredients.has(ingredient.id);
            return (
              <motion.button
                key={ingredient.id}
                whileHover={!isAdded ? { scale: 1.02 } : {}}
                whileTap={!isAdded ? { scale: 0.98 } : {}}
                onClick={() => handleAddIngredient(ingredient)}
                disabled={isAdded}
                className={`
                  relative overflow-hidden flex flex-col p-4 rounded-xl text-right transition-all
                  ${isAdded 
                    ? 'bg-emerald-900/30 border-emerald-800 text-emerald-500 cursor-not-allowed' 
                    : 'bg-slate-800 border-slate-600 hover:border-blue-500 hover:bg-slate-800 text-slate-200 cursor-pointer shadow-lg'}
                  border
                `}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-semibold text-[13px]">{ingredient.name}</span>
                  {isAdded && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                </div>
                {!isAdded && (
                  <span className="text-xs text-slate-400 uppercase tracking-tighter">לחץ לבחירה</span>
                )}
                
                {/* Active info drawer */}
                {activeInstruction === ingredient.id && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-300 leading-relaxed"
                  >
                    {ingredient.description}
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Feedback Alert - Relocated from right column */}
        <div className="h-20 w-full flex items-center justify-center -mt-4">
           <AnimatePresence mode="wait">
             {feedback && (
               <motion.div
                 key={feedback.text}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.9 }}
                 className={`w-full p-4 rounded-xl border flex gap-3 text-sm font-medium shadow-lg backdrop-blur-md
                    ${feedback.isCorrect ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-200' : 'bg-red-900/40 border-red-500/50 text-red-200'}
                 `}
                 dir="rtl"
               >
                 {feedback.isCorrect ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                 <span>{feedback.text}</span>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>

      {/* Right side: Test Tube Visualization & Legend */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col md:flex-row items-center justify-center bg-slate-950/50 rounded-2xl p-6 border border-slate-800/50 relative overflow-hidden min-h-[500px] gap-8">
          
          {/* Fill level indicator - REMOVED per user request */}

          {/* Molecular Legend Section - Integrated on the right side of the tube */}
          <div className="flex-1 max-w-[240px] order-2 md:order-2">
            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-700/30 backdrop-blur-sm">
              <h3 className="text-lg font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-start gap-2 w-full text-right" dir="rtl">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shrink-0" />
                <span>רכיבים שנוספו:</span>
              </h3>
              <div className="space-y-2">
                <AnimatePresence>
                  {['dna', 'primers', 'taq', 'dntps'].map(id => {
                    if (!addedIngredients.has(id as IngredientId)) return null;
                    const label = id === 'dna' ? 'DNA' : id === 'primers' ? 'פריימרים' : id === 'taq' ? 'Taq פולימראז' : 'dNTPs';
                    return (
                      <motion.div key={id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 bg-slate-800/60 p-1.5 rounded-lg border border-slate-700/20">
                        <div className="w-8 h-8 bg-slate-900/80 rounded flex items-center justify-center shrink-0 border border-slate-700/40">
                           {id === 'dna' && <svg viewBox="0 0 120 40" className="w-6 h-2 rotate-45"><rect x="0" y="5" width="120" height="6" fill="#88c9d9" /><rect x="0" y="29" width="120" height="6" fill="#88c9d9" /></svg>}
                           {id === 'primers' && <svg viewBox="0 0 50 20" className="w-5 h-1.5"><rect x="0" y="0" width="50" height="6" fill="#f89c45" /><rect x="4" y="6" width="6" height="12" fill="#f47f20" /></svg>}
                           {id === 'taq' && <svg viewBox="0 0 60 90" className="w-4 h-5"><path d="M 20 10 C -10 30, -10 60, 20 80 C 50 100, 70 70, 55 45 C 50 30, 45 -10, 20 10 Z" fill="#7cc65e" /></svg>}
                           {id === 'dntps' && <svg viewBox="0 0 40 40" className="w-3 h-3"><rect x="12" y="4" width="16" height="20" fill="#f24646" /><rect x="4" y="24" width="32" height="12" fill="#e68080" /></svg>}
                        </div>
                        <span className="text-xs font-bold text-slate-300">{label}</span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {!Array.from(addedIngredients).some(id => ['dna', 'primers', 'taq', 'dntps'].includes(id)) && (
                  <p className="text-[9px] text-slate-600 italic text-center py-2">הוסיפו רכיבים...</p>
                )}
              </div>
            </div>

            {/* Show view-modal trigger button IF complete but modal closed - Moved to bottom-right corner */}
            {isComplete && !showModal && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setShowModal(true)}
                className="absolute bottom-6 right-6 py-3 px-6 bg-blue-600/90 hover:bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-2xl z-50 backdrop-blur-sm border border-blue-400/30"
              >
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                הצג כפתור התחלה
                <ChevronLeft className="w-4 h-4" />
              </motion.button>
            )}
          </div>

          {/* Center/Left: Test Tube Visualization */}
          <div className="flex-[1.5] flex flex-col items-center order-1 md:order-1 mt-4">
            {/* Eppendorf Tube Container */}
            <div className="relative w-64 h-[350px] flex shrink-0 justify-center">
               
              <motion.div 
                animate={shakeTube ? { x: [-8, 8, -8, 8, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="absolute inset-x-0 bottom-0 top-6 flex flex-col items-center justify-end w-full z-10 scale-[1.4] origin-bottom"
              >
                {/* Tube SVG Background & Liquid Mask */}
                <svg viewBox="0 0 100 150" className="absolute inset-0 w-full h-full overflow-visible drop-shadow-xl z-30 pointer-events-none">
                    <defs>
                       <clipPath id="tube-mask">
                          <path d="M 30 20 L 70 20 L 70 80 C 70 100, 55 140, 50 145 C 45 140, 30 100, 30 80 Z" />
                       </clipPath>
                    </defs>

                    {/* Hinge */}
                    <path d="M 28 20 Q 20 15 15 5" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round" />
                    {/* Open Cap */}
                    <g transform="translate(15, 5) rotate(-60) translate(-30, -10)">
                       <rect x="3" y="0" width="22" height="15" rx="3" fill="rgba(255, 255, 255, 0.15)" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="2" />
                       <path d="M 3 5 L -2 5 L -2 10 L 3 10" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
                    </g>

                    {/* Back of the tube (very faint) */}
                    <path d="M 30 20 L 70 20 L 70 80 C 70 100, 55 140, 50 145 C 45 140, 30 100, 30 80 Z" fill="rgba(255, 255, 255, 0.05)" stroke="none" />

                    {/* Animated Liquid */}
                    <g clipPath="url(#tube-mask)">
                      <motion.rect 
                        x="25" 
                        y="145"
                        width="50" 
                        fill={addedIngredients.has('buffer') ? 'rgba(255,255,255,0.3)' : 'transparent'}
                        initial={{ y: 145, height: 0 }}
                        animate={{ 
                          y: 145 - Math.max(0, (addedIngredients.size / requiredCount) * 115), 
                          height: Math.max(0, (addedIngredients.size / requiredCount) * 115) 
                        }}
                        transition={{ type: "spring", stiffness: 60, damping: 15 }}
                      />
                      {addedIngredients.size > 0 && addedIngredients.has('buffer') && (
                         <motion.line 
                            x1="25" x2="75"
                            stroke="rgba(255,255,255,0.4)" strokeWidth="1"
                            initial={{ y1: 145, y2: 145 }}
                            animate={{ 
                              y1: 145 - Math.max(0, (addedIngredients.size / requiredCount) * 115), 
                              y2: 145 - Math.max(0, (addedIngredients.size / requiredCount) * 115) 
                            }}
                            transition={{ type: "spring", stiffness: 60, damping: 15 }}
                         />
                      )}
                    </g>

                    {/* Tube Lip */}
                    <path d="M 28 20 C 28 20, 28 17, 30 17 L 70 17 C 72 17, 72 20, 72 20 Z" fill="rgba(255, 255, 255, 0.3)" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="2" />
                    
                    {/* Tube Body Front Glass */}
                    <path d="M 30 20 L 70 20 L 70 80 C 70 100, 55 140, 50 145 C 45 140, 30 100, 30 80 Z" fill="rgba(255, 255, 255, 0.1)" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="2" />
                </svg>

                {/* Inner Container for Ingredients (floating inside the tube) */}
                <div className="absolute z-20 pointer-events-none" 
                     style={{ 
                         top: '13.33%', bottom: '3.33%', 
                         left: '30%', width: '40%', 
                         clipPath: 'polygon(0% 0%, 100% 0%, 100% 48%, 50% 100%, 0% 48%)' 
                     }}>
                     <AnimatePresence>
                         {Array.from(addedIngredients).map(id => renderIngredientGraphic(id))}
                     </AnimatePresence>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
