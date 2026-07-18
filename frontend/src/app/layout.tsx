"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LayoutDashboard, Database, BarChart3, Settings, BrainCircuit, Play, Bot, TrendingUp, FileText } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import { Toaster } from "react-hot-toast";
import { useState, useEffect } from "react";
import axios from "axios";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {


  return (
    <html lang="en" className="dark transition-colors duration-300">
      <head>
        <title>InsightForge AI</title>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-[#09090b] text-gray-900 dark:text-gray-200 flex h-screen overflow-hidden print:h-auto print:overflow-visible transition-colors duration-300`}
      >
        <SettingsProvider>
          <Toaster position="bottom-right" toastOptions={{
            style: {
              background: 'var(--toast-bg, #18181b)',
              color: 'var(--toast-color, #fff)',
              border: '1px solid rgba(255,255,255,0.1)'
            }
          }} />

          <Sidebar />

          {/* Main Content */}
          <main className="flex-1 flex flex-col h-full overflow-y-auto bg-gray-50 dark:bg-[#09090b] ml-20 md:ml-0 transition-all duration-300 print:h-auto print:overflow-visible">
            <div className="p-8 max-w-[1400px] w-full mx-auto print:p-0">
              {children}
            </div>
          </main>

          {/* Professional Watermark */}
          <a 
            href="https://adityasingh81201.wixsite.com/professional-portfol" 
            target="_blank" 
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 pointer-events-none print:hidden"
          >
            <div className="backdrop-blur-md bg-white/40 dark:bg-[#111113]/60 border border-gray-200 dark:border-white/10 px-5 py-2.5 rounded-full shadow-xl shadow-black/5 flex items-center gap-2 transition-all duration-500 hover:bg-white/80 dark:hover:bg-[#111113]/90 hover:scale-105 hover:shadow-2xl hover:shadow-rose-500/10 cursor-pointer pointer-events-auto group">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Built by</span>
              <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-indigo-500 group-hover:from-rose-400 group-hover:to-indigo-400 transition-all duration-300">
                Aditya Kumar Singh
              </span>
            </div>
          </a>
        </SettingsProvider>
      </body>
    </html>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const [datasets, setDatasets] = useState<any[]>([]);

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const res = await axios.get("https://insightforge-ai-7lzg.onrender.com/api/dataset/");
        setDatasets(res.data.datasets || []);
      } catch (err) {
        console.error("Failed to fetch datasets for sidebar", err);
      }
    };
    fetchDatasets();
  }, []);

  return (
    <aside className="group w-20 hover:w-64 bg-gray-50 dark:bg-[#09090b] border-r border-gray-200 dark:border-white/5 h-full flex flex-col transition-all duration-300 ease-in-out z-50 absolute md:relative overflow-hidden print:hidden">

      {/* Logo Section */}
      <div className="px-4 py-6 flex flex-col gap-1 whitespace-nowrap min-w-[256px]">
        <div className="flex items-center gap-3">
          <Image src="/logo2.png" alt="InsightForge AI Logo (Dark)" width={35} height={35} className="shrink-0 object-contain w-auto h-auto hidden dark:block" />
          <Image src="/logo-light.png" alt="InsightForge AI Logo (Light)" width={35} height={35} className="shrink-0 object-contain w-auto h-auto block dark:hidden" />
          <h1 className="font-bold text-xl text-gray-900 dark:text-white tracking-tight opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            InsightForge AI
          </h1>
        </div>
        <p className="text-[11px] text-gray-400 ml-[46px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          Intelligent ML Workspace
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-x-hidden overflow-y-auto mt-2 min-w-[256px] custom-scrollbar">
        <NavItem href="/" icon={<LayoutDashboard size={20} />} label="Home" active={pathname === "/"} />

        <div className="py-2">
          <NavItem href="/datasets" icon={<Database size={20} />} label="Datasets" active={pathname === "/datasets"} />
          <div className="pl-12 pr-4 mt-2 space-y-1 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto">
            <div className="text-[10px] font-bold text-gray-500 tracking-wider mb-2">Recent Datasets</div>
            {datasets.slice(0, 5).map(ds => (
              <Link key={ds.dataset_id} href={`/datasets/${ds.dataset_id}`} className={`text-sm truncate block py-1.5 transition-colors ${pathname === `/datasets/${ds.dataset_id}` ? 'text-blue-500 font-medium' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}>
                {ds.original_filename}
              </Link>
            ))}
            {datasets.length === 0 && <span className="text-xs text-gray-500">No datasets yet</span>}
          </div>
        </div>
      </nav>

      <div className="px-3 pb-2 min-w-[256px]">
        <NavItem href="/settings" icon={<Settings size={20} />} label="Settings" active={pathname === "/settings"} />
      </div>

      {/* User Profile / Version Bottom Area */}
      <UserProfileCard />
    </aside>
  );
}

function NavItem({ href, icon, label, active = false }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 px-3.5 py-3 rounded-xl transition-colors text-sm font-medium whitespace-nowrap ${active
        ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
        : "text-gray-400 hover:bg-white/5 hover:text-white"
        }`}
    >
      <div className="shrink-0">{icon}</div>
      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">{label}</span>
    </Link>
  );
}

function UserProfileCard() {
  const { settings } = useSettings();
  const name = settings.profile.name || "User";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="p-4 border-t border-gray-200 dark:border-white/5 whitespace-nowrap min-w-[256px]">
      <div className="bg-white dark:bg-[#18181b] p-2.5 rounded-xl border border-gray-200 dark:border-white/5 flex items-center gap-3 shadow-sm dark:shadow-none">
        <div className="h-9 w-9 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-500 rounded-full flex items-center justify-center font-bold text-sm shrink-0" style={{ color: 'var(--accent, #3b82f6)', backgroundColor: 'color-mix(in srgb, var(--accent) 20%, transparent)' }}>
          {initial}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{name}</p>
          <p className="text-xs text-gray-500">Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
}
