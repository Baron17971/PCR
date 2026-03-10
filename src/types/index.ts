export type SimulationPhase = 'landing' | 'preparation' | 'pcr-running' | 'master-mixer-game' | 'replication-comparison' | 'pcr-principles-game' | 'pcr-applications' | 'completed' | 'gene-expression-lab';

export type IngredientId = 'dna' | 'primers' | 'taq' | 'dntps' | 'buffer' | 'rna-pol' | 'helicase' | 'ribosome';

export interface Ingredient {
  id: IngredientId;
  name: string;
  shortName: string;
  description: string;
  isRequired: boolean;
  feedbackText: string;
}

export const INGREDIENTS: Ingredient[] = [
  {
    id: 'dna',
    name: 'תבנית DNA',
    shortName: 'DNA',
    description: 'מולקולת ה-DNA המקורית שממנה אנו רוצים לשכפל מקטע ספציפי.',
    isRequired: true,
    feedbackText: 'מצוין! תבנית ה-DNA מכילה את רצף המטרה שאנו רוצים לשכפל. ללא תבנית, לפולימראז לא יהיה מה להעתיק.'
  },
  {
    id: 'primers',
    name: 'תחלים (Primers)',
    shortName: 'תחלים',
    description: 'רצפי DNA קצרים המשלימים לקצוות המקטע שאותו אנו רוצים לשכפל. הם מסמנים לפולימראז היכן להתחיל.',
    isRequired: true,
    feedbackText: 'נכון מאוד! התחלים מגדירים את גבולות המקטע לשכפול ומספקים נקודת התחלה אנזימטית הכרחית לשכפול.'
  },
  {
    id: 'taq',
    name: 'Taq פולימראז',
    shortName: 'Taq',
    description: 'אנזים הבונה את גדיל ה-DNA החדש. הוא מיוחד בכך שהוא עמיד בטמפרטורות גבוהות.',
    isRequired: true,
    feedbackText: 'מעולה! ה-Taq פולימראז הוא הפועל שמרכיב את העותקים. עמידותו לחום קריטית כי התהליך יגיע ל-95 מעלות.'
  },
  {
    id: 'dntps',
    name: 'נוקלאוטידים (dNTPs)',
    shortName: 'dNTPs',
    description: 'אבני הבניין של ה-DNA (A, T, C, G) שבעזרתן האנזים בונה את הגדיל החדש.',
    isRequired: true,
    feedbackText: 'תשובה נכונה! אלו הן "אבני הבניין" החופשיות שהפולימראז יחבר כדי ליצור לעותקי ה-DNA החדשים.'
  },
  {
    id: 'buffer',
    name: 'תמיסת בופר (Buffer)',
    shortName: 'בופר',
    description: 'תמיסה השומרת על רמת חומציות (pH) ותנאים אופטימליים לפעילות האנזים.',
    isRequired: true,
    feedbackText: 'יופי! תמיסת הבופר עשירה במגנזיום (Mg2+) ושומרת על pH מדויק שמבטיח פעילות אופטימלית של האנזים.'
  },
  {
    id: 'rna-pol',
    name: 'RNA פולימראז',
    shortName: 'RNA Pol',
    description: 'אנזים המעתיק תבנית DNA לתעתיק של RNA (כגון mRNA).',
    isRequired: false,
    feedbackText: 'טעות. ב-PCR אנו מבצעים שכפול של DNA ל-DNA, ולכן אין צורך באנזים הבונה מולקולות משלים של RNA שיקרוס בחום.'
  },
  {
    id: 'helicase',
    name: 'הליקאז (Helicase)',
    shortName: 'הליקאז',
    description: 'אנזים שתפקידו לפרום את הסליל הכפול של ה-DNA בתא חי.',
    isRequired: false,
    feedbackText: 'לא נחוץ ב-PCR! בתא החי (in-vivo) הליקאז פותח את קשרי המימן בין גדילי ה-DNA, אך בסימולציית מבחנה אנו משתמשים בחום (95°C) לאותה מטרה.'
  },
  {
    id: 'ribosome',
    name: 'ריבוזום (Ribosome)',
    shortName: 'ריבוזום',
    description: 'האברון בתא בו מיוצרים חלבונים על ידי תרגום של RNA.',
    isRequired: false,
    feedbackText: 'טעות. הריבוזום משמש לייצור חלבונים ואין לו תפקיד בסימולציה, שמתמקדת אך ורק בשכפול רצפים של DNA.'
  }
];
