"use client";

import { useState, useEffect } from "react";
import { 
  Database, Activity, BrainCircuit, FileText, 
  Upload, ChevronRight, BarChart3, Settings, TrendingUp 
} from "lucide-react";
import Link from "next/link";
import axios from "axios";
import dynamic from 'next/dynamic';
import { useSettings } from "@/contexts/SettingsContext";

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function Dashboard() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({ datasets_count: 0, experiments_count: 0, file_types: {}, model_counts: {}, best_score: 0 });
  const { settings } = useSettings();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      if (settings.appearance.theme === 'dark') return true;
      if (settings.appearance.theme === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    };
    setIsDark(checkTheme());
    
    if (settings.appearance.theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => setIsDark(mq.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [settings.appearance.theme]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dsRes, statsRes] = await Promise.all([
          axios.get("https://insightforge-ai-7lzg.onrender.com/api/dataset/"),
          axios.get("https://insightforge-ai-7lzg.onrender.com/api/stats")
        ]);
        setDatasets(dsRes.data.datasets || []);
        setStats(statsRes.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const hasData = datasets.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-[#111113] dark:to-[#18181b] p-6 sm:p-8 rounded-2xl border border-blue-500 dark:border-white/5 shadow-xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            Hi {settings.profile.name ? settings.profile.name.split(" ")[0] : "there"} 👋
          </h1>
          <p className="text-blue-100 dark:text-gray-400 max-w-2xl text-sm sm:text-base">
            Upload datasets, build machine learning models, generate AI insights, and create professional reports from one intelligent workspace.
          </p>
        </div>
        <Link href="/datasets/new" className="bg-white text-blue-700 hover:bg-gray-100 dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors shadow-sm whitespace-nowrap">
          <Upload size={16} />
          Upload Dataset
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Datasets", value: stats.datasets_count.toString(), icon: <Database size={20} className="text-blue-500" /> },
          { label: "Experiments", value: stats.experiments_count.toString(), icon: <Activity size={20} className="text-emerald-500" /> },
          { label: "Models Trained", value: stats.experiments_count.toString(), icon: <BrainCircuit size={20} className="text-purple-500" /> },
          { label: "Best Score", value: stats.best_score > 0 ? `${stats.best_score}%` : "N/A", icon: <TrendingUp size={20} className="text-orange-500" /> },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-[#111113] p-5 rounded-xl border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-colors shadow-sm dark:shadow-none">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gray-50 dark:bg-[#18181b] rounded-lg border border-gray-200 dark:border-white/5">
                {stat.icon}
              </div>
              <span className="text-gray-500 dark:text-gray-400 font-medium text-sm">{stat.label}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-auto">
          
          {/* File Types Pie Chart */}
          <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden flex flex-col p-5 items-center shadow-sm dark:shadow-none">
            <h2 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 self-start flex items-center gap-2">
              <FileText size={18} className="text-orange-400" />
              File Types Uploaded
            </h2>
            {Object.keys(stats.file_types || {}).length > 0 ? (
              <Plot
                data={[{
                  labels: Object.keys(stats.file_types),
                  values: Object.values(stats.file_types),
                  type: 'pie',
                  hole: 0.4,
                  marker: { colors: ['#3b82f6', '#10b981', '#f59e0b'] }
                }]}
                layout={{
                  width: 300, height: 300,
                  paper_bgcolor: 'rgba(0,0,0,0)',
                  plot_bgcolor: 'rgba(0,0,0,0)',
                  font: { color: isDark ? '#a1a1aa' : '#52525b' },
                  margin: { t: 10, l: 10, r: 10, b: 10 },
                  showlegend: true
                }}
                config={{ displayModeBar: false }}
              />
            ) : (
              <p className="text-gray-500 text-sm mt-10">No files uploaded yet.</p>
            )}
          </div>

          {/* Models Trained Bar Chart */}
          <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden flex flex-col p-5 items-center shadow-sm dark:shadow-none">
            <h2 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 self-start flex items-center gap-2">
              <BrainCircuit size={18} className="text-purple-400" />
              Models Evaluated
            </h2>
            {Object.keys(stats.model_counts || {}).length > 0 ? (
              <Plot
                data={[{
                  x: Object.keys(stats.model_counts).map(k => k.replace(/_/g, ' ')),
                  y: Object.values(stats.model_counts),
                  type: 'bar',
                  marker: { color: '#a855f7' }
                }]}
                layout={{
                  width: 350, height: 300,
                  paper_bgcolor: 'rgba(0,0,0,0)',
                  plot_bgcolor: 'rgba(0,0,0,0)',
                  font: { color: isDark ? '#a1a1aa' : '#52525b' },
                  margin: { t: 10, l: 30, r: 10, b: 80 },
                  xaxis: { showgrid: false, zeroline: false },
                  yaxis: { showgrid: false, zeroline: false }
                }}
                config={{ displayModeBar: false }}
              />
            ) : (
              <p className="text-gray-500 text-sm mt-10">No models trained yet.</p>
            )}
          </div>
          
      </div>
    </div>
  );
}
