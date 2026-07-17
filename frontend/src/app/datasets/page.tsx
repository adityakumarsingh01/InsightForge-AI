"use client";

import { useState, useEffect } from "react";
import { Database, FileText, ChevronRight, Upload, Search } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { useSettings } from "@/contexts/SettingsContext";

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { settings } = useSettings();

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const res = await axios.get("https://insightforge-ai-7lzg.onrender.com/api/dataset/");
        setDatasets(res.data.datasets || []);
      } catch (err) {
        console.error("Failed to fetch datasets", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDatasets();
  }, []);

  const filteredDatasets = datasets.filter((ds) => 
    ds.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-[#111113] dark:to-[#18181b] p-6 sm:p-8 rounded-2xl border border-blue-500 dark:border-white/5 shadow-xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
            <Database size={28} className="text-blue-300" />
            My Datasets
          </h1>
          <p className="text-blue-100 dark:text-gray-400 max-w-2xl text-sm sm:text-base">
            Browse and manage all your uploaded datasets. Select a dataset to open its workspace and begin analysis.
          </p>
        </div>
        <Link href="/datasets/new" className="bg-white text-blue-700 hover:bg-gray-100 dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors shadow-sm whitespace-nowrap">
          <Upload size={16} />
          Upload Dataset
        </Link>
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-xl overflow-hidden min-h-[500px] flex flex-col">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-white/5 bg-gray-50/80 dark:bg-[#18181b]/50 flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search datasets..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-[#09090b] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm"
            />
          </div>
          <div className="text-sm text-gray-500 font-medium px-4">
            {filteredDatasets.length} {filteredDatasets.length === 1 ? "dataset" : "datasets"} found
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto custom-scrollbar p-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-4 animate-in fade-in duration-700">
              <div className="relative flex items-center justify-center h-24 w-24">
                <div className="absolute w-20 h-20 bg-blue-500/20 rounded-full animate-ping"></div>
                <div className="absolute w-12 h-12 bg-blue-500/40 rounded-full animate-pulse"></div>
                <Image src="/logo2.png" alt="Logo" width={35} height={35} className="relative z-10 hidden dark:block animate-bounce" />
                <Image src="/logo-light.png" alt="Logo" width={35} height={35} className="relative z-10 block dark:hidden animate-bounce" />
              </div>
              <p className="text-gray-500 text-sm font-medium">Loading datasets...</p>
            </div>
          ) : filteredDatasets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
              {filteredDatasets.map((dataset) => (
                <Link 
                  key={dataset.dataset_id} 
                  href={`/datasets/${dataset.dataset_id}`}
                  className="bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-white/5 p-5 rounded-xl hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-md transition-all group block"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText size={24} />
                    </div>
                    <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={dataset.original_filename}>
                    {dataset.original_filename}
                  </h3>
                  <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                    <span className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-[#09090b] rounded-md border border-gray-200 dark:border-white/5">
                      <span className="text-blue-500">{dataset.rows?.toLocaleString() || 0}</span> rows
                    </span>
                    <span className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-[#09090b] rounded-md border border-gray-200 dark:border-white/5">
                      <span className="text-emerald-500">{dataset.cols?.toLocaleString() || dataset.columns?.toLocaleString() || 0}</span> cols
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 border border-gray-100 dark:border-white/5">
                <Database size={28} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {searchQuery ? "No matching datasets" : "No datasets uploaded yet"}
              </h3>
              <p className="text-sm text-gray-500 max-w-sm">
                {searchQuery 
                  ? "Try adjusting your search terms to find what you're looking for." 
                  : "Upload your first dataset to start analyzing and building models."}
              </p>
              {!searchQuery && (
                <Link href="/datasets/new" className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
                  Upload Now
                </Link>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
