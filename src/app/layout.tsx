import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";

const rubik = Rubik({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["hebrew", "latin"],
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  title: "סימולציית PCR",
  description: "אפליקציית סימולציה של תהליך ה-PCR לתלמידי י״ב",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${rubik.className} antialiased bg-pcr-mesh min-h-screen overflow-x-hidden`}>
        {/* Soft, Flowing Atmospheric Background Layers - No rigid graphics */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Organic Sweeping Light Beams */}
          <div className="fluid-beam opacity-40" />
          <div className="fluid-beam opacity-30" style={{ animationDirection: 'reverse', animationDuration: '25s' }} />
          
          {/* Main Atmospheric Glows */}
          <div className="absolute top-[-10%] left-[-10%] w-[1200px] h-[1200px] rounded-full bg-blue-500/20 blur-[150px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[1000px] h-[1000px] rounded-full bg-emerald-500/15 blur-[150px] animate-[pulse_10s_infinite]" />
          
          {/* High-Visibility Floating "Molecules" - Softened */}
          <div className="bg-blob w-[800px] h-[800px] bg-blue-400/25 top-[5%] left-[-5%]" 
               style={{ '--x': '200px', '--y': '150px', '--x2': '-100px', '--y2': '300px', '--duration': '30s' } as any} />
          <div className="bg-blob w-[700px] h-[700px] bg-emerald-400/20 bottom-[5%] right-[-12%]" 
               style={{ '--x': '-250px', '--y': '-200px', '--x2': '150px', '--y2': '100px', '--duration': '40s' } as any} />
          <div className="bg-blob w-[600px] h-[600px] bg-indigo-400/25 top-[40%] left-[30%]" 
               style={{ '--x': '350px', '--y': '-150px', '--x2': '-250px', '--y2': '200px', '--duration': '25s' } as any} />
        </div>
        
        {/* Main Content Layer - Higher z-index to be above background but allows transparency */}
        <div id="app-shell" className="relative z-10 min-h-screen selection:bg-blue-500/30">
          {children}
        </div>
      </body>
    </html>
  );
}
