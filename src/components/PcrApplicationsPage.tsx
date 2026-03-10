"use client";
import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRightCircle,
  Dna,
  Fingerprint,
  FlaskConical,
  Microscope,
  ShieldCheck,
  X
} from 'lucide-react';

type ApplicationId =
  | 'clinical-diagnostics'
  | 'genetic-screening'
  | 'forensics'
  | 'food-safety'
  | 'gene-expression';

interface PcrApplication {
  id: ApplicationId;
  title: string;
  shortDescription: string;
  pcrMethod: string;
  sampleType: string;
  readout: string;
  steps: string[];
}

interface PcrApplicationsPageProps {
  onComplete: () => void;
}

const APPLICATIONS: PcrApplication[] = [
  {
    id: 'clinical-diagnostics',
    title: 'אבחון זיהומים קליניים',
    shortDescription: 'זיהוי מהיר של נגיפים או חיידקים בדגימות מטופלים.',
    pcrMethod: 'RT-qPCR או qPCR',
    sampleType: 'משטח לוע/אף, דם או נוזל ביולוגי',
    readout: 'Ct ופלואורסצנציה ספציפית לגן המטרה',
    steps: [
      'מפיקים חומצות גרעין מהדגימה הקלינית.',
      'כאשר המטרה היא RNA, מבצעים RT ליצירת cDNA.',
      'מריצים qPCR עם פריימרים ופרוב ספציפיים לפתוגן.',
      'מפרשים את ערך Ct מול ביקורת חיובית ושלילית ומדווחים תשובה.'
    ]
  },
  {
    id: 'genetic-screening',
    title: 'בדיקות גנטיות תורשתיות',
    shortDescription: 'איתור וריאנטים גנטיים הקשורים למחלות תורשתיות.',
    pcrMethod: 'PCR קונבנציונלי / Allele-specific PCR',
    sampleType: 'דם היקפי או רוק',
    readout: 'נוכחות/היעדר מקטע או תבנית אללים',
    steps: [
      'מפיקים DNA גנומי מהנבדק.',
      'מגבירים אזור ספציפי שבו ידועה המוטציה.',
      'מנתחים את תוצרי ההגברה בג\'ל או בשיטה מולקולרית משלימה.',
      'משווים לביקורות ומסיקים האם הווריאנט קיים.'
    ]
  },
  {
    id: 'forensics',
    title: 'זיהוי פלילי (DNA Profiling)',
    shortDescription: 'השוואת פרופילי STR לצורך שיוך דגימות לזירות אירוע.',
    pcrMethod: 'Multiplex PCR',
    sampleType: 'שיער, רוק, דם, תאי עור',
    readout: 'פרופיל STR והשוואה סטטיסטית',
    steps: [
      'מפיקים DNA מדגימה מזירת האירוע ומדגימות ייחוס.',
      'מגבירים במקביל לוקוסים STR מרובים ב-Multiplex PCR.',
      'קוראים את אורכי האללים ומרכיבים פרופיל גנטי.',
      'משווים בין פרופילים ומחשבים הסתברות התאמה.'
    ]
  },
  {
    id: 'food-safety',
    title: 'בטיחות מזון ומים',
    shortDescription: 'זיהוי מזהמים פתוגניים או עקבות DNA במזון.',
    pcrMethod: 'qPCR',
    sampleType: 'מזון מעובד, מים או משטחי ייצור',
    readout: 'אות פלואורסצנטי וכימות עומס מזהם',
    steps: [
      'נוטלים דגימה ממוצר, מים או משטח עבודה.',
      'ממצים DNA ומסירים מעכבי PCR ככל האפשר.',
      'מריצים qPCR מול מטרות ספציפיות לחיידקים/נגיפים.',
      'מעריכים כמות יחסית ומחליטים על כשירות אצווה.'
    ]
  },
  {
    id: 'gene-expression',
    title: 'מחקר ביטוי גנים',
    shortDescription: 'השוואת רמות ביטוי בין רקמות או תנאי טיפול שונים.',
    pcrMethod: 'RT-qPCR',
    sampleType: 'RNA מתאים/רקמות',
    readout: 'Delta Ct / Delta Delta Ct וכימות יחסי',
    steps: [
      'מבודדים RNA באיכות גבוהה מהדגימות.',
      'מבצעים שעתוק לאחור ל-cDNA.',
      'מריצים qPCR לגן המטרה ולגן ייחוס.',
      'מחשבים ביטוי יחסי ומסיקים הבדלים ביולוגיים.'
    ]
  }
];

function appIcon(id: ApplicationId) {
  if (id === 'clinical-diagnostics') return <AlertCircle className="w-5 h-5 text-rose-300" />;
  if (id === 'genetic-screening') return <Fingerprint className="w-5 h-5 text-cyan-300" />;
  if (id === 'forensics') return <ShieldCheck className="w-5 h-5 text-violet-300" />;
  if (id === 'food-safety') return <FlaskConical className="w-5 h-5 text-emerald-300" />;
  return <Microscope className="w-5 h-5 text-blue-300" />;
}

export default function PcrApplicationsPage({ onComplete }: PcrApplicationsPageProps) {
  const [selectedId, setSelectedId] = useState<ApplicationId | null>(null);

  const selectedApplication = useMemo(() => {
    return APPLICATIONS.find((application) => application.id === selectedId) ?? null;
  }, [selectedId]);

  return (
    <div className="glass-pcr-card rounded-[2.5rem] border border-slate-700/30 p-6 md:p-8 space-y-6" dir="rtl">
      <div className="text-right space-y-3">
        <h2 className="text-3xl font-black text-white flex items-center gap-3 justify-start">
          <Dna className="w-8 h-8 text-blue-400" />
          יישומי PCR בעולם האמיתי
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed max-w-4xl">
          לחצו על כל יישום כדי לפתוח חלון הסבר: סוג הבדיקה, סוג הדגימה, אופן הביצוע ופענוח התוצאה.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {APPLICATIONS.map((application, index) => (
          <motion.button
            key={application.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => setSelectedId(application.id)}
            className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 text-right space-y-3 hover:border-blue-400/40 hover:bg-slate-900 transition-all shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                {appIcon(application.id)}
                {application.pcrMethod}
              </span>
              <span className="text-blue-300 text-xs font-bold">לחץ לפתיחת חלון</span>
            </div>
            <h3 className="text-xl font-black text-white leading-tight">{application.title}</h3>
            <p className="text-slate-300 leading-relaxed">{application.shortDescription}</p>
          </motion.button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-700/40 bg-slate-900/35 p-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <p className="text-slate-300 font-medium">
          לאחר שעיינתם ביישומים, המשיכו לשלב הבא בסימולציה.
        </p>
        <button
          onClick={onComplete}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2 w-fit"
        >
          <ArrowRightCircle className="w-5 h-5" />
          המשך לשלב הבא
        </button>
      </div>

      <AnimatePresence>
        {selectedApplication && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedId(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="w-full max-w-3xl rounded-3xl border border-slate-600/60 bg-slate-950/95 shadow-2xl overflow-hidden"
              dir="rtl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4">
                <button
                  onClick={() => setSelectedId(null)}
                  className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                  aria-label="סגור חלון"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="space-y-2 text-right flex-1">
                  <h3 className="text-2xl font-black text-white">{selectedApplication.title}</h3>
                  <p className="text-slate-300 leading-relaxed">{selectedApplication.shortDescription}</p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
                    <p className="text-xs text-blue-300 font-bold mb-1">סוג בדיקה</p>
                    <p className="text-slate-100 font-semibold">{selectedApplication.pcrMethod}</p>
                  </div>
                  <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3">
                    <p className="text-xs text-violet-300 font-bold mb-1">סוג דגימה</p>
                    <p className="text-slate-100 font-semibold">{selectedApplication.sampleType}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                    <p className="text-xs text-emerald-300 font-bold mb-1">פענוח תוצאה</p>
                    <p className="text-slate-100 font-semibold">{selectedApplication.readout}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4">
                  <p className="text-slate-100 font-black mb-3">אופן הבדיקה</p>
                  <ol className="space-y-2 text-slate-300 leading-relaxed">
                    {selectedApplication.steps.map((step, index) => (
                      <li key={step} className="flex items-start gap-2">
                        <span className="min-w-6 h-6 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-200 text-xs font-bold flex items-center justify-center mt-0.5">
                          {index + 1}
                        </span>
                        <span className="flex-1">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
