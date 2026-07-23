"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import axios from "axios";
import {
  BarChart3, FileType, Database, Settings, Table, FileText,
  BrainCircuit, Activity, PieChart, ChevronLeft, Loader2, AlertTriangle, Fingerprint,
  DownloadCloud, Send, User, MessageSquare, TrendingUp, Wand2, CheckCircle2, Search, Bot
} from "lucide-react";
import dynamic from 'next/dynamic';
import { useSettings } from "@/contexts/SettingsContext";
import toast from "react-hot-toast";

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

type TabType = "Overview" | "Preview" | "Profiling" | "Analytics" | "AI Assistant" | "Models" | "Forecasting" | "Reports";

export default function DatasetWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const datasetId = params.id as string;
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

  const plotFontColor = isDark ? '#a1a1aa' : '#52525b';

  const [activeTab, setActiveTab] = useState<TabType>("Overview");
  const [loading, setLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [profiling, setProfiling] = useState<any>(null);
  const [eda, setEda] = useState<any>(null);
  const [ai, setAi] = useState<any>(null);
  const [tableFilter, setTableFilter] = useState("");

  // Model Training States
  const [targetCol, setTargetCol] = useState("");
  const [modelType, setModelType] = useState("random_forest");
  const [isTraining, setIsTraining] = useState(false);
  const [modelResults, setModelResults] = useState<any>(null);
  const [excludedFeatures, setExcludedFeatures] = useState<string[]>([]);
  const [outlierMultiplier, setOutlierMultiplier] = useState<number>(1.5);

  // Chat Bot States
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Forecasting States
  const [forecastDateCol, setForecastDateCol] = useState("");
  const [forecastTargetCol, setForecastTargetCol] = useState("");
  const [forecastHorizon, setForecastHorizon] = useState<number>(30);
  const [isForecasting, setIsForecasting] = useState(false);
  const [forecastResults, setForecastResults] = useState<any>(null);

  // Dynamically determine task type based on target column
  const targetProfile = profiling?.columns_profile?.find((c: any) => c.column === targetCol);
  const isClassification = targetProfile ? (targetProfile.dtype === 'object' || targetProfile.unique_values < 20) : true;

  // Set default model type when target changes
  useEffect(() => {
    if (isClassification) {
      if (['random_forest_clf', 'logistic_regression', 'gradient_boosting_clf', 'svc'].includes(settings.workspace.defaultAlgorithm)) {
        setModelType(settings.workspace.defaultAlgorithm);
      } else {
        setModelType('random_forest_clf');
      }
    } else {
      if (['linear_regression', 'random_forest_reg', 'gradient_boosting_reg'].includes(settings.workspace.defaultAlgorithm)) {
        setModelType(settings.workspace.defaultAlgorithm);
      } else {
        setModelType('random_forest_reg');
      }
    }
  }, [targetCol, isClassification, settings.workspace.defaultAlgorithm]);

  useEffect(() => {
    if (datasetId) fetchDatasetData();
  }, [datasetId]);

  const fetchDatasetData = async () => {
    setLoading(true);
    setError(null);
    try {
      const overviewRes = await axios.get(`https://insightforge-ai-7lzg.onrender.com/api/dataset/${datasetId}/overview`);
      setOverview(overviewRes.data);

      const previewRes = await axios.get(`https://insightforge-ai-7lzg.onrender.com/api/dataset/${datasetId}/preview`);
      setPreview(previewRes.data);

      const profilingRes = await axios.get(`https://insightforge-ai-7lzg.onrender.com/api/dataset/${datasetId}/profiling`);
      setProfiling(profilingRes.data);

      const edaRes = await axios.get(`https://insightforge-ai-7lzg.onrender.com/api/dataset/${datasetId}/eda`);
      setEda(edaRes.data);

      const aiRes = await axios.get(`https://insightforge-ai-7lzg.onrender.com/api/dataset/${datasetId}/ai`);
      setAi(aiRes.data);

    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load dataset information.");
    } finally {
      setLoading(false);
      if (settings.notifications.reportReady) {
        toast.success("Report Ready: Analysis and profiling completed!", { icon: "📊" });
      }
    }
  };

  useEffect(() => {
    // Auto-select target column if AI suggestions exist
    if (ai?.model_suggestions?.length > 0 && !targetCol) {
      setTargetCol(ai.model_suggestions[0].target);
    }
  }, [ai]);

  const handleSheetToggle = async (sheetName: string) => {
    let newSelected = [...(overview?.selected_sheets || [])];
    if (newSelected.includes(sheetName)) {
      newSelected = newSelected.filter(s => s !== sheetName);
    } else {
      newSelected.push(sheetName);
    }
    // ensure at least one sheet is selected
    if (newSelected.length === 0) return;

    try {
      await axios.post(`https://insightforge-ai-7lzg.onrender.com/api/dataset/${datasetId}/update_sheets`, {
        selected_sheets: newSelected
      });
      // immediately re-fetch dataset data
      await fetchDatasetData();
    } catch (err: any) {
      toast.error("Failed to update sheets.");
    }
  };

  const handleSelectAllSheets = async () => {
    if (!overview?.available_sheets) return;
    const isAllSelected = overview.selected_sheets?.length === overview.available_sheets.length;
    // If all selected, revert to just the first sheet. Otherwise select all.
    const newSelected = isAllSelected ? [overview.available_sheets[0]] : [...overview.available_sheets];
    
    try {
      await axios.post(`https://insightforge-ai-7lzg.onrender.com/api/dataset/${datasetId}/update_sheets`, {
        selected_sheets: newSelected
      });
      await fetchDatasetData();
    } catch (err: any) {
      toast.error("Failed to update sheets.");
    }
  };

  const handleTrainModel = async () => {
    if (!targetCol) return;
    
    setIsTraining(true);
    try {
      const response = await axios.post(`https://insightforge-ai-7lzg.onrender.com/api/dataset/${datasetId}/train`, {
        target: targetCol,
        model_type: modelType,
        exclude_features: excludedFeatures
      });
      setModelResults(response.data);
      if (settings.notifications.modelTraining) {
        toast.success(`Model Training Complete: ${response.data.task}`, {
          icon: '🚀',
        });
      }
    } catch (err: any) {
      console.error("Failed to train model:", err);
      toast.error(err.response?.data?.detail || "Failed to train model");
    } finally {
      setIsTraining(false);
    }
  };

  const handleCleanData = async () => {
    setIsCleaning(true);
    const cleaningToast = toast.loading("Cleaning Data: Standardizing columns, dropping NAs, handling outliers...", { icon: '🧹' });
    try {
      await axios.post(`https://insightforge-ai-7lzg.onrender.com/api/dataset/${datasetId}/clean`, {
        outlier_multiplier: outlierMultiplier
      });
      toast.success("Data successfully cleaned! Reloading charts...", { id: cleaningToast });
      await fetchDatasetData();
    } catch (err: any) {
      console.error("Failed to clean data:", err);
      toast.error(err.response?.data?.detail || "Failed to clean data", { id: cleaningToast });
    } finally {
      setIsCleaning(false);
    }
  };

  const handleForecast = async () => {
    if (!forecastDateCol || !forecastTargetCol) {
      toast.error("Please select both Date and Target columns.");
      return;
    }
    
    setIsForecasting(true);
    setForecastResults(null);
    
    try {
      const response = await axios.post(`https://insightforge-ai-7lzg.onrender.com/api/dataset/${datasetId}/forecast`, {
        date_col: forecastDateCol,
        target_col: forecastTargetCol,
        horizon: forecastHorizon
      });
      
      if (response.data) {
        setForecastResults(response.data);
        toast.success("Forecast generated successfully!", { icon: '📈' });
      }
    } catch (err: any) {
      console.error("Failed to generate forecast:", err);
      toast.error(err.response?.data?.detail || "Failed to generate forecast.");
    } finally {
      setIsForecasting(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isChatLoading) return;
    
    // Add user message
    const newUserMsg = { role: 'user' as const, content: text };
    setChatMessages(prev => [...prev, newUserMsg]);
    setChatInput("");
    setIsChatLoading(true);

    // Mock AI response logic
    setTimeout(() => {
      let aiResponse = "I'm your AI Data Scientist! I can help you analyze this dataset, find insights, and build models.";
      
      const lowerText = text.toLowerCase();
      if (lowerText.includes("explain")) {
        aiResponse = ai?.summary || "This dataset contains various features that can be used for predictive modeling. I can help you uncover patterns, identify correlations, and build highly accurate machine learning models.";
      } else if (lowerText.includes("missing")) {
        const missingCount = overview?.total_missing || 0;
        if (missingCount > 0) {
            aiResponse = `I found exactly ${missingCount.toLocaleString()} missing cells in this dataset. You can easily clean them by clicking the 'Clean Data' button, which will automatically handle them.`;
        } else {
            aiResponse = "Great news! I scanned the entire dataset and found exactly 0 missing values. Your data is completely intact.";
        }
      } else if (lowerText.includes("row") || lowerText.includes("record") || lowerText.includes("size")) {
        aiResponse = `This dataset contains ${overview?.rows?.toLocaleString() || 0} rows and ${overview?.columns?.toLocaleString() || 0} columns. The total file size is ${formatBytes(overview?.size_bytes || 0)}.`;
      } else if (lowerText.includes("duplicate")) {
        const duplicates = overview?.total_duplicates || 0;
        aiResponse = duplicates > 0 
            ? `I detected ${duplicates.toLocaleString()} duplicate rows in this dataset.`
            : `I checked the dataset and found 0 duplicate rows!`;
      } else if (lowerText.includes("important") || lowerText.includes("column")) {
        aiResponse = `Based on the automated profiling, the most important columns typically have high variance and strong correlations with your target variable. For example, ${ai?.model_suggestions?.[0]?.target ? 'we identified "' + ai.model_suggestions[0].target + '" as a strong target candidate.' : 'you can check the correlation heatmap in the Analytics tab.'}`;
      } else if (lowerText.includes("business")) {
        aiResponse = "By training a machine learning model on this data, you can automate decision-making, forecast trends, or classify incoming data in real-time. This helps in reducing operational costs, improving customer targeting, and accelerating data-driven strategies.";
      } else if (lowerText.includes("random forest")) {
        aiResponse = "Random Forest usually performs well because it's an ensemble learning method. It builds multiple decision trees and merges them together to get a more accurate and stable prediction. It handles non-linear relationships very effectively and is highly resistant to overfitting compared to a single decision tree.";
      } else if (lowerText.includes("accuracy") || lowerText.includes("f1")) {
        aiResponse = "Accuracy is the straightforward percentage of correct predictions out of all predictions. However, the F1-Score is the harmonic mean of Precision and Recall. F1-Score is much more useful than Accuracy when you are dealing with imbalanced datasets (e.g., detecting fraud where 99% of transactions are normal).";
      } else if (lowerText.includes("leakage") || lowerText.includes("imbalance") || lowerText.includes("outliers")) {
        aiResponse = "During my automated scan of this dataset, I check for high correlation (which can indicate data leakage), class imbalance in categorical targets, and statistical outliers in numerical distributions. If any severe issues are found, they will be flagged in the Data Profiling tab.";
      }
      
      setChatMessages(prev => [...prev, { role: 'ai', content: aiResponse }]);
      setIsChatLoading(false);
    }, 1200);
  };

  const handleDownloadNotebook = (type: "eda" | "ml" | "full") => {
    let url = `https://insightforge-ai-7lzg.onrender.com/api/dataset/${datasetId}/export-notebook?type=${type}`;
    if ((type === "ml" || type === "full") && targetCol && modelType) {
      url += `&target_col=${targetCol}&model_type=${modelType}`;
    }
    window.open(url, "_blank");
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const TABS: TabType[] = ["Overview", "Preview", "Profiling", "Analytics", "AI Assistant", "Models", "Forecasting", "Reports"];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-6 animate-in fade-in duration-700">
        <div className="relative flex items-center justify-center h-32 w-32">
          <div className="absolute w-24 h-24 bg-blue-500/20 rounded-full animate-ping"></div>
          <div className="absolute w-16 h-16 bg-blue-500/40 rounded-full animate-pulse"></div>
          <Image src="/logo2.png" alt="Logo" width={45} height={45} className="relative z-10 hidden dark:block animate-bounce" />
          <Image src="/logo-light.png" alt="Logo" width={45} height={45} className="relative z-10 block dark:hidden animate-bounce" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">InsightForge AI</h2>
          <p className="text-gray-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            Loading workspace...
          </p>
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
          <Activity size={32} />
        </div>
        <h2 className="text-xl font-bold text-white">Error Loading Dataset</h2>
        <p className="text-gray-400">{error}</p>
        <button onClick={() => router.push('/')} className="mt-4 bg-[#18181b] hover:bg-[#27272a] text-white px-6 py-2.5 rounded-lg border border-white/5 transition-colors">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 print:pb-0 print:space-y-4">

      {/* Header */}
      <div className="bg-[#111113] border border-white/5 p-6 rounded-2xl shadow-xl shrink-0">
        <div className="flex flex-col gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 shrink-0">
              <BarChart3 className="text-blue-400" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Dataset Workspace</h1>
              <p className="text-gray-400 text-sm mt-0.5">{overview.original_filename}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <FileType size={16} className="text-gray-500" />
              <span>{overview.format}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Table size={16} className="text-emerald-500" />
              <span>{overview.rows.toLocaleString()} Rows</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Database size={16} className="text-blue-500" />
              <span>{overview.columns.toLocaleString()} Columns</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <FileText size={16} className="text-purple-500" />
              <span>{formatBytes(overview.size_bytes)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none shrink-0 print:hidden">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap
              ${activeTab === tab
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20 border border-blue-500/50"
                : "bg-[#111113] text-gray-400 hover:text-white hover:bg-white/5 border border-white/5"
              }
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-[#111113] border border-white/5 rounded-2xl flex-1 flex flex-col min-h-[500px]">

        {/* OVERVIEW TAB */}
        {activeTab === "Overview" && (
          <div className="p-6 space-y-6 overflow-y-auto animate-in fade-in h-full">
            <h3 className="text-lg font-semibold text-white">Dataset Overview</h3>
            
            {/* Excel Sheet Selector */}
            {overview.available_sheets && overview.available_sheets.length > 1 && (
              <div className="bg-[#09090b] p-5 rounded-xl border border-white/5 mt-4 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold text-white">Excel Sheets Included</h4>
                  <button 
                    onClick={handleSelectAllSheets}
                    className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-2 py-1 rounded"
                  >
                    {overview.selected_sheets?.length === overview.available_sheets.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {overview.available_sheets.map((sheet: string) => {
                    const isSelected = overview.selected_sheets?.includes(sheet);
                    return (
                      <button
                        key={sheet}
                        onClick={() => handleSheetToggle(sheet)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                          isSelected 
                            ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' 
                            : 'bg-[#18181b] border-white/10 text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                          isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-500'
                        }`}>
                          {isSelected && <CheckCircle2 size={10} className="text-[#09090b]" />}
                        </div>
                        {sheet}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#09090b] p-5 rounded-xl border border-white/5">
                <p className="text-gray-400 text-sm mb-1">Total Rows</p>
                <p className="text-2xl font-bold text-white">{overview.rows.toLocaleString()}</p>
              </div>
              <div className="bg-[#09090b] p-5 rounded-xl border border-white/5">
                <p className="text-gray-400 text-sm mb-1">Total Columns</p>
                <p className="text-2xl font-bold text-white">{overview.columns.toLocaleString()}</p>
              </div>
              <div className="bg-[#09090b] p-5 rounded-xl border border-white/5">
                <p className="text-gray-400 text-sm mb-1">File Size</p>
                <p className="text-2xl font-bold text-white">{formatBytes(overview.size_bytes)}</p>
              </div>
              <div className="bg-[#09090b] p-5 rounded-xl border border-red-500/10">
                <div className="flex items-center gap-2 text-red-400 mb-1">
                  <AlertTriangle size={14} />
                  <p className="text-sm">Total Missing Cells</p>
                </div>
                <p className="text-2xl font-bold text-white">{overview.total_missing?.toLocaleString()}</p>
              </div>
              <div className="bg-[#09090b] p-5 rounded-xl border border-orange-500/10">
                <div className="flex items-center gap-2 text-orange-400 mb-1">
                  <Fingerprint size={14} />
                  <p className="text-sm">Duplicate Rows</p>
                </div>
                <p className="text-2xl font-bold text-white">{overview.total_duplicates?.toLocaleString()}</p>
              </div>
              <div className="bg-[#09090b] p-5 rounded-xl border border-white/5">
                <p className="text-gray-400 text-sm mb-1">Total Elements</p>
                <p className="text-2xl font-bold text-white">{overview.size?.toLocaleString()}</p>
              </div>
              <div className="bg-[#09090b] p-5 rounded-xl border border-white/5">
                <p className="text-gray-400 text-sm mb-1">Memory Usage</p>
                <p className="text-2xl font-bold text-white">{(overview.memory_usage_kb / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          </div>
        )}

        {/* PREVIEW TAB */}
        {activeTab === "Preview" && preview && (
          <div className="flex flex-col h-full animate-in fade-in">
            <div className="p-4 border-b border-white/5 shrink-0 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Full Data Preview</h3>
                <p className="text-xs text-gray-500">
                  {tableFilter 
                    ? `Showing ${preview.data.filter((row: any) => Object.values(row).some((val: any) => String(val).toLowerCase().includes(tableFilter.toLowerCase()))).length} of ${preview.data.length} rows` 
                    : `Showing all ${preview.data.length} rows`}
                </p>
              </div>
              
              {/* Search Filter */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="text"
                  placeholder="Search in all columns..."
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-[#18181b] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition-colors w-full sm:w-64"
                />
              </div>
            </div>
            <div className="overflow-auto bg-[#09090b] custom-scrollbar max-h-[600px]">
              <table className="w-full text-left text-sm text-gray-300 whitespace-nowrap min-w-max">
                <thead className="text-xs uppercase bg-[#18181b] text-gray-400 border-b border-white/10 sticky top-0 z-10 shadow-md shadow-black/50">
                  <tr>
                    {preview.columns.map((col: string, i: number) => (
                      <th key={i} className="px-6 py-4 font-semibold">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {preview.data
                    .filter((row: any) => {
                      if (!tableFilter) return true;
                      return Object.values(row).some((val: any) => 
                        String(val).toLowerCase().includes(tableFilter.toLowerCase())
                      );
                    })
                    .map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      {preview.columns.map((col: string, j: number) => (
                        <td key={j} className="px-6 py-3">{row[col] !== null ? String(row[col]) : <span className="text-red-500/50 italic">null</span>}</td>
                      ))}
                    </tr>
                  ))}
                  {preview.data.filter((row: any) => {
                      if (!tableFilter) return true;
                      return Object.values(row).some((val: any) => 
                        String(val).toLowerCase().includes(tableFilter.toLowerCase())
                      );
                    }).length === 0 && (
                      <tr>
                        <td colSpan={preview.columns.length} className="px-6 py-8 text-center text-gray-500">
                          No rows match your search "{tableFilter}"
                        </td>
                      </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PROFILING TAB */}
        {activeTab === "Profiling" && profiling && (
          <div className="flex flex-col h-full animate-in fade-in">
            <div className="p-4 border-b border-white/5 shrink-0">
              <h3 className="text-lg font-semibold text-white">Data Profiling</h3>
              <p className="text-sm text-gray-400">Dataset info and memory usage.</p>
            </div>
            <div className="overflow-auto bg-[#09090b] custom-scrollbar max-h-[600px] rounded-xl border border-white/10 m-6 mt-0">
              <table className="w-full text-left text-sm text-gray-300 whitespace-nowrap min-w-max">
                <thead className="text-xs uppercase bg-[#18181b] text-gray-400 border-b border-white/10 sticky top-0 z-10 shadow-md shadow-black/50">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Column</th>
                    <th className="px-6 py-4 font-semibold">Non-Null Count</th>
                    <th className="px-6 py-4 font-semibold">Dtype</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {profiling.columns_profile?.map((col: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3 font-medium text-white">{col.column}</td>
                      <td className="px-6 py-3">{col.non_null_count} non-null</td>
                      <td className="px-6 py-3">
                        <span className="text-xs text-blue-400 font-mono px-2 py-0.5 bg-blue-500/10 rounded inline-block">
                          {col.dtype}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "Analytics" && eda && (
          <div className="flex flex-col h-full animate-in fade-in">
            <div className="p-4 border-b border-white/5 shrink-0 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-white">Exploratory Data Analysis</h3>
                <p className="text-sm text-gray-400">Descriptive statistics and visual plots.</p>
              </div>
              <button 
                onClick={() => handleDownloadNotebook("eda")}
                className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-4 py-2 rounded-lg border border-blue-500/20 flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <DownloadCloud size={16} />
                Export Notebook
              </button>
            </div>
            <div className="overflow-auto bg-[#09090b] custom-scrollbar max-h-[600px] p-6">

              {/* Clean Data Action */}
              <div className="bg-gradient-to-r from-blue-900/20 to-emerald-900/20 p-6 rounded-2xl border border-blue-500/20 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <h4 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                    <Wand2 className="text-blue-400" size={20} />
                    Auto-Clean Dataset
                  </h4>
                  <p className="text-gray-400 text-sm max-w-xl">
                    Standardizes column names (lowercase, underscores), drops missing values, and removes extreme outliers from numeric columns using the Interquartile Range (IQR) method.
                  </p>
                  
                  {/* Advanced Outlier Filter */}
                  <div className="mt-4 bg-[#18181b] rounded-xl p-4 border border-white/5 max-w-sm">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-300">Outlier Filter Aggressiveness</label>
                      <span className="text-xs font-mono bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">
                        {outlierMultiplier.toFixed(1)}x IQR
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.1"
                      value={outlierMultiplier}
                      onChange={(e) => setOutlierMultiplier(parseFloat(e.target.value))}
                      className="w-full accent-blue-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>Aggressive (Drops more)</span>
                      <span>Lenient (Keeps more)</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleCleanData}
                  disabled={isCleaning}
                  className="shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-6 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all shadow-lg"
                >
                  {isCleaning ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                  {isCleaning ? "Cleaning..." : "Clean Data"}
                </button>
              </div>

              {/* Descriptive Stats Table */}
              <div className="mb-8">
                <h4 className="text-white font-semibold mb-4">Descriptive Statistics (Numerical)</h4>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-sm text-gray-300 whitespace-nowrap min-w-max">
                    <thead className="text-xs uppercase bg-[#18181b] text-gray-400 border-b border-white/10">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Statistic</th>
                        {eda.describe?.columns?.map((col: string, i: number) => (
                          <th key={i} className="px-6 py-4 font-semibold">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {eda.describe?.index?.map((statName: string, i: number) => (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-3 font-medium text-blue-400">{statName}</td>
                          {eda.describe?.data[i]?.map((val: any, j: number) => (
                            <td key={j} className="px-6 py-3">{val !== null ? Number(val).toFixed(2) : '-'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Plots Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* Correlation Heatmap */}
                {eda.heatmap && (
                  <div className="bg-white dark:bg-[#111113] p-4 rounded-xl border border-gray-200 dark:border-white/5 flex flex-col items-center overflow-hidden shadow-sm dark:shadow-none">
                    <h4 className="text-gray-900 dark:text-white font-medium mb-4 self-start">Correlation Heatmap</h4>
                    <Plot
                      data={[{
                        z: eda.heatmap.z,
                        x: eda.heatmap.x,
                        y: eda.heatmap.y,
                        type: 'heatmap',
                        colorscale: 'RdBu',
                        hoverongaps: false
                      }]}
                      layout={{
                        width: 500, height: 400,
                        paper_bgcolor: 'rgba(0,0,0,0)',
                        plot_bgcolor: 'rgba(0,0,0,0)',
                        font: { color: plotFontColor },
                        margin: { t: 10, l: 80, r: 10, b: 80 },
                        xaxis: { showgrid: false, zeroline: false },
                        yaxis: { showgrid: false, zeroline: false }
                      }}
                      config={{ displayModeBar: false }}
                    />
                  </div>
                )}

                {/* Missing Values Bar Chart */}
                {eda.null_counts && (
                  <div className="bg-white dark:bg-[#111113] p-4 rounded-xl border border-gray-200 dark:border-white/5 flex flex-col items-center overflow-hidden shadow-sm dark:shadow-none">
                    <h4 className="text-gray-900 dark:text-white font-medium mb-4 self-start">Missing Values Distribution</h4>
                    <Plot
                      data={[{
                        x: eda.null_counts.x,
                        y: eda.null_counts.y,
                        type: 'bar',
                        marker: { color: '#ef4444' }
                      }]}
                      layout={{
                        width: 500, height: 400,
                        paper_bgcolor: 'rgba(0,0,0,0)',
                        plot_bgcolor: 'rgba(0,0,0,0)',
                        font: { color: plotFontColor },
                        margin: { t: 10, l: 50, r: 10, b: 80 },
                        xaxis: { showgrid: false, zeroline: false },
                        yaxis: { showgrid: false, zeroline: false }
                      }}
                      config={{ displayModeBar: false }}
                    />
                  </div>
                )}

                {/* Box Plots */}
                {eda.box_plots && Object.keys(eda.box_plots).length > 0 && (
                  <div className="bg-white dark:bg-[#111113] p-4 rounded-xl border border-gray-200 dark:border-white/5 flex flex-col items-center xl:col-span-2 overflow-hidden shadow-sm dark:shadow-none">
                    <h4 className="text-gray-900 dark:text-white font-medium mb-4 self-start">Box Plots (Outlier Detection)</h4>
                    <Plot
                      data={Object.keys(eda.box_plots).map((col) => ({
                        y: eda.box_plots[col],
                        type: 'box',
                        name: col,
                        boxpoints: 'outliers'
                      }))}
                      layout={{
                        width: 1000, height: 450,
                        paper_bgcolor: 'rgba(0,0,0,0)',
                        plot_bgcolor: 'rgba(0,0,0,0)',
                        font: { color: plotFontColor },
                        margin: { t: 10, l: 50, r: 10, b: 80 },
                        showlegend: false,
                        xaxis: { showgrid: false, zeroline: false },
                        yaxis: { showgrid: false, zeroline: false }
                      }}
                      config={{ displayModeBar: false }}
                      useResizeHandler={true}
                      style={{ width: "100%", height: "100%" }}
                    />
                  </div>
                )}

                {/* Categorical Counts */}
                {eda.categorical && eda.categorical.map((cat: any, idx: number) => (
                  <div key={idx} className="bg-white dark:bg-[#111113] p-4 rounded-xl border border-gray-200 dark:border-white/5 flex flex-col items-center overflow-hidden shadow-sm dark:shadow-none">
                    <h4 className="text-gray-900 dark:text-white font-medium mb-4 self-start">Top Categories: {cat.column}</h4>
                    <Plot
                      data={[{
                        labels: cat.labels,
                        values: cat.values,
                        type: 'pie',
                        hole: 0.4,
                        textinfo: 'label+percent',
                        marker: { colors: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'] }
                      }]}
                      layout={{
                        width: 500, height: 400,
                        paper_bgcolor: 'rgba(0,0,0,0)',
                        plot_bgcolor: 'rgba(0,0,0,0)',
                        font: { color: plotFontColor },
                        margin: { t: 10, l: 10, r: 10, b: 10 },
                        showlegend: true,
                        xaxis: { showgrid: false, zeroline: false },
                        yaxis: { showgrid: false, zeroline: false }
                      }}
                      config={{ displayModeBar: false }}
                    />
                  </div>
                ))}

              </div>

            </div>
          </div>
        )}

        {/* AI Assistant TAB */}
        {activeTab === "AI Assistant" && (
          <div className="flex flex-col h-full animate-in fade-in relative">
            <div className="p-4 border-b border-white/5 shrink-0 bg-[#09090b] rounded-t-2xl z-10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <BrainCircuit className="text-purple-500" size={20} />
                AI Data Scientist
              </h3>
              <p className="text-sm text-gray-400">Ask questions, get insights, and understand your dataset instantly.</p>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-[#09090b] p-6 space-y-6 pb-32 custom-scrollbar">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in zoom-in duration-500">
                  <div className="w-16 h-16 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center">
                    <BrainCircuit size={32} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">How can I help you analyze this data?</h4>
                    <p className="text-gray-400 max-w-md mx-auto text-sm">
                      I can help you understand the dataset, detect anomalies, recommend models, and explain complex metrics.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 max-w-2xl mt-4">
                    {["Explain this dataset", "Which column is most important?", "What business problem can this solve?", "What does Accuracy mean?"].map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(prompt)}
                        className="bg-[#111113] hover:bg-purple-900/30 text-gray-300 hover:text-purple-300 border border-white/5 hover:border-purple-500/30 px-4 py-2 rounded-full text-sm transition-all"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-purple-500/20 text-purple-400'}`}>
                        {msg.role === 'user' ? <User size={16} /> : <BrainCircuit size={16} />}
                      </div>
                      <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-[#111113] border border-white/5 text-gray-200 rounded-tl-sm'}`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                        <BrainCircuit size={16} className="animate-pulse" />
                      </div>
                      <div className="bg-[#111113] border border-white/5 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-purple-500/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-purple-500/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#09090b] via-[#09090b] to-transparent pt-10">
              <div className="max-w-4xl mx-auto relative">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(chatInput)}
                  placeholder="Ask me anything about this dataset..."
                  className="w-full bg-[#111113] border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all shadow-lg shadow-black/20"
                />
                <button
                  onClick={() => handleSendMessage(chatInput)}
                  disabled={!chatInput.trim() || isChatLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 text-white rounded-xl transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODELS TAB */}
        {activeTab === "Models" && (
          <div className="flex flex-col h-full animate-in fade-in">
            <div className="p-4 border-b border-white/5 shrink-0 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-white">Machine Learning Studio</h3>
                <p className="text-sm text-gray-400">Train models and evaluate metrics dynamically.</p>
              </div>
              {modelResults && (
                <button 
                  onClick={() => handleDownloadNotebook("ml")}
                  className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 px-4 py-2 rounded-lg border border-emerald-500/20 flex items-center gap-2 text-sm font-medium transition-colors"
                >
                  <DownloadCloud size={16} />
                  Export Notebook
                </button>
              )}
            </div>
            <div className="overflow-auto bg-[#09090b] custom-scrollbar max-h-[600px] p-6">

              {/* Dataset Analysis Report Header */}
              {ai && (
                <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 p-6 rounded-2xl border border-purple-500/20 mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                      <BrainCircuit size={24} />
                    </div>
                    <h4 className="text-xl font-bold text-white">Dataset Analysis Report</h4>
                  </div>
                  <p className="text-gray-300 leading-relaxed mb-6">
                    {ai.summary}
                  </p>

                  <h5 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Model Recommendations</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ai.model_suggestions?.map((suggestion: any, i: number) => (
                      <div key={i} className="bg-[#111113] p-4 rounded-xl border border-white/5 shadow-md">
                        <div className="flex items-center gap-2 mb-2">
                          <Settings size={16} className="text-blue-400" />
                          <h6 className="font-bold text-white">{suggestion.model}</h6>
                        </div>
                        <p className="text-sm text-gray-400">{suggestion.reason}</p>
                        <p className="text-xs text-emerald-500 mt-3 flex items-center gap-1">
                          <Activity size={12} /> Target: {suggestion.target}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="bg-[#111113] p-6 rounded-2xl border border-white/10 shadow-lg mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Target Variable</label>
                    <select
                      value={targetCol}
                      onChange={(e) => setTargetCol(e.target.value)}
                      className="w-full bg-[#18181b] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="">Select a column...</option>
                      {profiling?.columns_profile?.map((c: any) => (
                        <option key={c.column} value={c.column}>{c.column}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Algorithm</label>
                    <select
                      value={modelType}
                      onChange={(e) => setModelType(e.target.value)}
                      className="w-full bg-[#18181b] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      {isClassification ? (
                        <>
                          <option value="random_forest_clf">Random Forest Classifier</option>
                          <option value="logistic_regression">Logistic Regression</option>
                          <option value="decision_tree_clf">Decision Tree Classifier</option>
                          <option value="gradient_boosting_clf">Gradient Boosting Classifier</option>
                          <option value="svc">Support Vector Classifier (SVC)</option>
                        </>
                      ) : (
                        <>
                          <option value="random_forest_reg">Random Forest Regressor</option>
                          <option value="linear_regression">Linear Regression</option>
                          <option value="decision_tree_reg">Decision Tree Regressor</option>
                          <option value="gradient_boosting_reg">Gradient Boosting Regressor</option>
                          <option value="svr">Support Vector Regressor (SVR)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* Feature Selection Filter */}
                {targetCol && (
                  <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-sm font-medium text-gray-400 mb-3">Feature Selection (Exclude Irrelevant Columns)</label>
                    <div className="bg-[#18181b] border border-white/10 rounded-xl p-4 max-h-60 overflow-y-auto">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {profiling?.columns_profile
                          ?.filter((c: any) => c.column !== targetCol)
                          .map((c: any) => {
                            const isExcluded = excludedFeatures.includes(c.column);
                            return (
                              <button
                                key={c.column}
                                onClick={() => {
                                  if (isExcluded) {
                                    setExcludedFeatures(excludedFeatures.filter(f => f !== c.column));
                                  } else {
                                    setExcludedFeatures([...excludedFeatures, c.column]);
                                  }
                                }}
                                className={`flex items-center gap-2 p-2 rounded-lg text-left transition-colors border text-sm ${
                                  !isExcluded 
                                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                                    : 'bg-[#111113] border-white/5 text-gray-500 hover:border-white/10'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded flex flex-shrink-0 items-center justify-center border transition-colors ${
                                  !isExcluded ? 'bg-blue-500 border-blue-500' : 'border-gray-600 bg-[#18181b]'
                                }`}>
                                  {!isExcluded && <CheckCircle2 size={12} className="text-[#111113]" />}
                                </div>
                                <span className="truncate flex-1" title={c.column}>{c.column}</span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleTrainModel}
                  disabled={!targetCol || isTraining}
                  className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg font-semibold transition-all ${!targetCol || isTraining
                    ? 'bg-emerald-500/20 text-emerald-500/50 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                    }`}
                >
                  {isTraining ? (
                    <><Loader2 className="animate-spin" size={20} /> Training Model (Pre-processing data...)</>
                  ) : (
                    <><BrainCircuit size={20} /> Train Model Now</>
                  )}
                </button>
              </div>

              {/* Results */}
              {modelResults && (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-3 mb-6">
                    <Activity className="text-emerald-400" size={24} />
                    <h3 className="text-2xl font-bold text-white">Training Results ({modelResults.task})</h3>
                  </div>

                  {/* Metrics Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {Object.entries(modelResults.metrics).map(([key, value]: any) => (
                      <div key={key} className="bg-white dark:bg-[#111113] p-5 rounded-xl border border-gray-200 dark:border-white/5 relative overflow-hidden group shadow-sm dark:shadow-none">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <p className="text-gray-400 text-sm mb-1">{key}</p>
                        <p className="text-3xl font-bold text-white">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* ROC Curve */}
                  {modelResults.roc_data && (
                    <div className="bg-white dark:bg-[#111113] p-6 rounded-2xl border border-gray-200 dark:border-white/5 flex flex-col items-center mb-8 shadow-sm dark:shadow-none">
                      <h4 className="text-gray-900 dark:text-white font-semibold mb-4 self-start">Receiver Operating Characteristic (ROC)</h4>
                      <Plot
                        data={[
                          {
                            x: modelResults.roc_data.fpr,
                            y: modelResults.roc_data.tpr,
                            type: 'scatter',
                            mode: 'lines',
                            line: { color: '#10b981', width: 3 },
                            name: `AUC = ${modelResults.roc_data.auc}`
                          },
                          {
                            x: [0, 1],
                            y: [0, 1],
                            type: 'scatter',
                            mode: 'lines',
                            line: { color: '#52525b', width: 2, dash: 'dash' },
                            name: 'Random Guess'
                          }
                        ]}
                        layout={{
                        autosize: true,
                        paper_bgcolor: 'rgba(0,0,0,0)',
                        plot_bgcolor: 'rgba(0,0,0,0)',
                        font: { color: plotFontColor },
                          margin: { t: 20, l: 60, r: 20, b: 60 },
                          xaxis: { title: 'False Positive Rate', showgrid: false, zeroline: false },
                          yaxis: { title: 'True Positive Rate', showgrid: false, zeroline: false },
                          legend: { x: 0.7, y: 0.1 }
                        }}
                        config={{ displayModeBar: false }}
                      />
                    </div>
                  )}

                  {/* Confusion Matrix */}
                  {modelResults.extra_data?.confusion_matrix && (
                    <div className="bg-white dark:bg-[#111113] p-6 rounded-2xl border border-gray-200 dark:border-white/5 flex flex-col items-center mb-8">
                      <h4 className="text-gray-900 dark:text-white font-semibold mb-4 self-start">Confusion Matrix</h4>
                      <Plot
                        data={[{
                          z: modelResults.extra_data.confusion_matrix.z,
                          x: modelResults.extra_data.confusion_matrix.x,
                          y: modelResults.extra_data.confusion_matrix.y,
                          type: 'heatmap',
                          colorscale: 'Greens',
                          showscale: true
                        }]}
                        layout={{
                          width: 500, height: 400,
                          paper_bgcolor: 'rgba(0,0,0,0)',
                          plot_bgcolor: 'rgba(0,0,0,0)',
                          font: { color: isDark ? '#a1a1aa' : '#374151' },
                          margin: { t: 20, l: 80, r: 20, b: 80 },
                          xaxis: { title: 'Predicted Label' },
                          yaxis: { title: 'True Label', autorange: 'reversed' }
                        }}
                        config={{ displayModeBar: false }}
                      />
                    </div>
                  )}

                  {/* Classification Report */}
                  {modelResults.extra_data?.classification_report && (
                    <div className="bg-white dark:bg-[#111113] p-6 rounded-2xl border border-gray-200 dark:border-white/5 print:break-inside-avoid print:shadow-none shadow-sm dark:shadow-none">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-white/10 pb-3">Classification Report</h3>
                      <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-[#18181b] text-gray-300">
                          <tr>
                            <th className="px-4 py-3 rounded-tl-lg">Class / Metric</th>
                            <th className="px-4 py-3">Precision</th>
                            <th className="px-4 py-3">Recall</th>
                            <th className="px-4 py-3">F1-Score</th>
                            <th className="px-4 py-3 rounded-tr-lg">Support</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(modelResults.extra_data.classification_report).map(([key, metrics]: any, idx) => {
                            if (key === 'accuracy') return null; // Accuracy is already shown above
                            return (
                              <tr key={key} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-300">{key}</td>
                                <td className="px-4 py-3">{metrics.precision?.toFixed(4) ?? '-'}</td>
                                <td className="px-4 py-3">{metrics.recall?.toFixed(4) ?? '-'}</td>
                                <td className="px-4 py-3">{metrics['f1-score']?.toFixed(4) ?? '-'}</td>
                                <td className="px-4 py-3">{metrics.support?.toFixed(0) ?? '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              )}

            </div>
          </div>
        )}

        {/* Forecasting TAB */}
        {activeTab === "Forecasting" && (
          <div className="flex flex-col h-full animate-in fade-in">
            <div className="p-4 border-b border-white/5 shrink-0 bg-[#09090b] rounded-t-2xl z-10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="text-emerald-500" size={20} />
                  Time Series Forecasting
                </h3>
                <p className="text-sm text-gray-400">Predict future values using historical time-series data.</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#09090b] p-6 space-y-6 pb-32 custom-scrollbar">
              
              {/* Controls */}
              <div className="bg-[#111113] p-6 rounded-2xl border border-white/5 relative shadow-lg">
                <h3 className="text-lg font-bold text-white mb-6">Forecast Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  
                  {/* Date Column */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Date / Time Column</label>
                    <select
                      value={forecastDateCol}
                      onChange={(e) => setForecastDateCol(e.target.value)}
                      className="w-full bg-[#18181b] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="">-- Select Date Column --</option>
                      {profiling?.columns_profile?.map((col: any) => (
                        <option key={col.column} value={col.column}>{col.column} ({col.dtype})</option>
                      ))}
                    </select>
                  </div>

                  {/* Target Column */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Target (Value to Predict)</label>
                    <select
                      value={forecastTargetCol}
                      onChange={(e) => setForecastTargetCol(e.target.value)}
                      className="w-full bg-[#18181b] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="">-- Select Target --</option>
                      {profiling?.columns_profile?.filter((col: any) => col.dtype === 'float64' || col.dtype === 'int64').map((col: any) => (
                        <option key={col.column} value={col.column}>{col.column} ({col.dtype})</option>
                      ))}
                    </select>
                  </div>

                  {/* Horizon */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Forecast Horizon (Days)</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={forecastHorizon || ""}
                      onChange={(e) => setForecastHorizon(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#18181b] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <button
                  onClick={handleForecast}
                  disabled={!forecastDateCol || !forecastTargetCol || isForecasting}
                  className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg font-semibold transition-all ${!forecastDateCol || !forecastTargetCol || isForecasting
                    ? 'bg-emerald-500/20 text-emerald-500/50 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                    }`}
                >
                  {isForecasting ? (
                    <><Loader2 className="animate-spin" size={20} /> Generating Forecast...</>
                  ) : (
                    <><TrendingUp size={20} /> Generate Forecast</>
                  )}
                </button>
              </div>

              {/* Chart */}
              {forecastResults && (
                <div className="bg-[#111113] p-6 rounded-2xl border border-white/5 animate-in slide-in-from-bottom-4 duration-500">
                  <h4 className="text-white font-semibold mb-4">Historical & Forecasted Data</h4>
                  <div className="flex flex-col items-center">
                    <Plot
                      data={[
                        {
                          x: forecastResults.historical.map((d: any) => d.date),
                          y: forecastResults.historical.map((d: any) => d.value),
                          type: 'scatter',
                          mode: 'lines',
                          line: { color: '#3b82f6', width: 2 },
                          name: 'Historical'
                        },
                        {
                          x: forecastResults.forecast.map((d: any) => d.date),
                          y: forecastResults.forecast.map((d: any) => d.value),
                          type: 'scatter',
                          mode: 'lines',
                          line: { color: '#10b981', width: 2, dash: 'dash' },
                          name: 'Forecast'
                        }
                      ]}
                      layout={{
                        width: 1000,
                        height: 500,
                        paper_bgcolor: 'rgba(0,0,0,0)',
                        plot_bgcolor: 'rgba(0,0,0,0)',
                        font: { color: plotFontColor },
                        margin: { t: 20, l: 60, r: 20, b: 60 },
                        xaxis: { title: 'Date', showgrid: false, zeroline: false },
                        yaxis: { title: forecastTargetCol, showgrid: true, zeroline: false, gridcolor: 'rgba(255,255,255,0.1)' },
                        legend: { orientation: "h", yanchor: "bottom", y: 1.02, xanchor: "right", x: 1 }
                      }}
                      config={{ displayModeBar: false }}
                      useResizeHandler={true}
                      style={{ width: "100%", height: "100%" }}
                    />
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Reports TAB */}
        {activeTab === "Reports" && (
          <div className="flex flex-col animate-in fade-in pb-10 print:pb-0">
            {/* Action Bar (Hidden on Print) */}
            <div className="flex justify-end gap-4 mb-6 print:hidden">
              <button
                onClick={() => handleDownloadNotebook("full")}
                className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
              >
                <DownloadCloud size={16} />
                Download Full Notebook
              </button>
              <button
                onClick={() => {
                  const originalTitle = document.title;
                  document.title = `InsightForge AI_${overview.original_filename.replace(/\.[^/.]+$/, "")}`;
                  if (settings.notifications.reportReady) {
                    toast.success("Preparing PDF Report...");
                  }
                  window.print();
                  setTimeout(() => { document.title = originalTitle; }, 500);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
              >
                <FileText size={16} />
                Print / Save to PDF
              </button>
            </div>

            {/* Printable Report Wrapper */}
            <div className="bg-[#111113] print:bg-white p-8 rounded-2xl border border-white/5 print:border-none relative">

              {/* Watermark (Repeats on every printed page natively if fixed) */}
              <div className="hidden print:flex fixed inset-0 pointer-events-none items-center justify-center opacity-[0.03] z-0 overflow-hidden">
                <Image src="/logo2.png" alt="Watermark" width={800} height={800} className="object-contain" />
              </div>

              {/* Report Header */}
              <div className="border-b border-white/10 print:border-gray-300 pb-6 mb-8 flex justify-between items-start relative z-10">
                <div>
                  <h1 className="text-3xl font-bold text-white print:text-black mb-2 flex items-center gap-3">
                    <Image src="/logo2.png" alt="InsightForge AI" width={40} height={40} className="shrink-0" />
                    Dataset Analysis Report
                  </h1>
                  <p className="text-gray-400 print:text-gray-600 text-lg ml-[48px]">{overview.original_filename}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 print:text-gray-500 text-sm font-medium">InsightForge AI</p>
                  <p className="text-gray-500 print:text-gray-400 text-sm mt-1">{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="mb-10 relative z-10">
                <h2 className="text-xl font-bold text-white print:text-black mb-4 flex items-center gap-2">
                  <Database size={20} className="text-blue-500 print:text-blue-700" /> Executive Summary
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-[#18181b] print:bg-gray-50 p-4 rounded-xl border border-white/5 print:border-gray-200">
                    <p className="text-gray-500 print:text-gray-600 text-xs font-medium uppercase mb-1">Total Rows</p>
                    <p className="text-white print:text-black text-xl font-bold">{overview.rows.toLocaleString()}</p>
                  </div>
                  <div className="bg-[#18181b] print:bg-gray-50 p-4 rounded-xl border border-white/5 print:border-gray-200">
                    <p className="text-gray-500 print:text-gray-600 text-xs font-medium uppercase mb-1">Total Columns</p>
                    <p className="text-white print:text-black text-xl font-bold">{overview.columns.toLocaleString()}</p>
                  </div>
                  <div className="bg-[#18181b] print:bg-gray-50 p-4 rounded-xl border border-white/5 print:border-gray-200">
                    <p className="text-gray-500 print:text-gray-600 text-xs font-medium uppercase mb-1">Missing Cells</p>
                    <p className="text-white print:text-black text-xl font-bold">{overview.total_missing?.toLocaleString() || 0}</p>
                  </div>
                  <div className="bg-[#18181b] print:bg-gray-50 p-4 rounded-xl border border-white/5 print:border-gray-200">
                    <p className="text-gray-500 print:text-gray-600 text-xs font-medium uppercase mb-1">Duplicates</p>
                    <p className="text-white print:text-black text-xl font-bold">{overview.total_duplicates?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>

              {/* AI Highlights */}
              {ai && (
                <div className="mb-10">
                  <h2 className="text-xl font-bold text-white print:text-black mb-4 flex items-center gap-2">
                    <BrainCircuit size={20} className="text-purple-500 print:text-purple-700" /> AI Highlights
                  </h2>
                  <div className="space-y-4">
                    {/* Summary */}
                    {ai.summary && (
                      <div className="p-4 rounded-xl bg-[#18181b] print:bg-gray-50 border border-white/5 print:border-gray-200">
                        <h3 className="text-white print:text-black font-bold mb-2">Overview</h3>
                        <p className="text-gray-400 print:text-gray-700 text-sm leading-relaxed">{ai.summary}</p>
                      </div>
                    )}
                    {/* Anomalies */}
                    <div className="p-4 rounded-xl bg-[#18181b] print:bg-gray-50 border border-white/5 print:border-gray-200">
                      <h3 className="text-orange-400 print:text-orange-700 font-bold mb-2">Outliers & Anomalies</h3>
                      {ai.anomalies && ai.anomalies.length > 0 ? (
                        <ul className="list-disc list-inside text-gray-300 print:text-gray-700 text-sm space-y-1">
                          {ai.anomalies.map((a: any, i: number) => (
                            <li key={i}><strong>{a.column}</strong>: {a.count} potential outliers detected.</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 text-sm">No significant anomalies detected.</p>
                      )}
                    </div>
                    {/* Correlations */}
                    <div className="p-4 rounded-xl bg-[#18181b] print:bg-gray-50 border border-white/5 print:border-gray-200">
                      <h3 className="text-blue-400 print:text-blue-700 font-bold mb-2">Strong Correlations</h3>
                      {ai.correlations && ai.correlations.length > 0 ? (
                        <ul className="list-disc list-inside text-gray-300 print:text-gray-700 text-sm space-y-1">
                          {ai.correlations.map((c: any, i: number) => (
                            <li key={i}><strong>{c.col1}</strong> and <strong>{c.col2}</strong> have a score of {c.score.toFixed(2)}.</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 text-sm">No strong correlations detected.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ML Model Evaluated */}
              <div className="mb-10 page-break-before">
                <h2 className="text-xl font-bold text-white print:text-black mb-4 flex items-center gap-2">
                  <Activity size={20} className="text-emerald-500 print:text-emerald-700" /> Model Results {modelResults ? `(${modelResults.task})` : ''}
                </h2>
                {modelResults ? (
                  <>
                    <div className="bg-[#18181b] print:bg-gray-50 p-5 rounded-xl border border-white/5 print:border-gray-200 mb-4">
                      <p className="text-gray-400 print:text-gray-600 mb-4">Target Variable: <strong>{targetCol}</strong> using <strong>{modelType.replace(/_/g, ' ')}</strong></p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(modelResults.metrics).map(([key, val]: any) => (
                          <div key={key}>
                            <p className="text-gray-500 print:text-gray-600 text-xs font-medium uppercase">{key}</p>
                            <p className="text-white print:text-black text-lg font-bold">{val}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {modelResults.classification_report && (
                      <div className="bg-[#18181b] print:bg-gray-50 p-5 rounded-xl border border-white/5 print:border-gray-200 mb-4 overflow-x-auto">
                        <p className="text-gray-500 print:text-gray-600 text-sm font-medium uppercase mb-3">Classification Report</p>
                        <pre className="text-xs text-gray-300 print:text-gray-800 font-mono">
                          {JSON.stringify(modelResults.classification_report, null, 2).replace(/[\{\}\"]/g, '').replace(/,/g, '')}
                        </pre>
                      </div>
                    )}

                    {modelResults.confusion_matrix && (
                      <div className="bg-[#18181b] print:bg-gray-50 p-5 rounded-xl border border-white/5 print:border-gray-200">
                        <p className="text-gray-500 print:text-gray-600 text-sm font-medium uppercase mb-3">Confusion Matrix</p>
                        <div className="inline-block border border-white/10 print:border-gray-300 rounded overflow-hidden">
                          {modelResults.confusion_matrix.map((row: any, i: number) => (
                            <div key={i} className="flex">
                              {row.map((cell: any, j: number) => (
                                <div key={j} className="w-12 h-12 flex items-center justify-center border-r border-b border-white/10 print:border-gray-300 text-gray-300 print:text-black text-sm">
                                  {cell}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-[#18181b] print:bg-gray-50 p-5 rounded-xl border border-white/5 print:border-gray-200 text-gray-400 print:text-gray-600">
                    No machine learning model has been trained for this dataset in the current session. Go to the Models tab to train one and it will appear here.
                  </div>
                )}
              </div>

              {/* Numeric Statistical Summary */}
              {eda && eda.describe && (
                <div className="mb-10 page-break-before">
                  <h2 className="text-xl font-bold text-white print:text-black mb-4 flex items-center gap-2">
                    <BarChart3 size={20} className="text-blue-400 print:text-blue-600" /> Statistical Summary
                  </h2>
                  <div className="overflow-x-visible">
                    <table className="w-full text-left text-xs text-gray-400 print:text-gray-700 border-collapse border border-white/10 print:border-gray-300">
                      <thead className="bg-[#18181b] print:bg-gray-100 text-gray-300 print:text-gray-800">
                        <tr>
                          <th className="px-3 py-2 border border-white/10 print:border-gray-300">Feature</th>
                          {eda.describe.index.map((metric: string) => (
                            <th key={metric} className="px-3 py-2 border border-white/10 print:border-gray-300">{metric}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {eda.describe.columns.map((colName: string, i: number) => (
                          <tr key={colName}>
                            <td className="px-3 py-2 font-bold border border-white/10 print:border-gray-300 text-white print:text-black bg-[#18181b]/50 print:bg-gray-50">{colName}</td>
                            {eda.describe.index.map((_: any, j: number) => {
                              const val = eda.describe.data[j][i];
                              return (
                                <td key={j} className="px-3 py-2 border border-white/10 print:border-gray-300">
                                  {typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(4)) : '-'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Data Visualizations */}
              <div className="mb-10 page-break-before">
                <h2 className="text-xl font-bold text-white print:text-black mb-6 flex items-center gap-2">
                  <BarChart3 size={20} className="text-blue-400 print:text-blue-600" /> Data Visualizations
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Correlation Heatmap */}
                  {eda?.heatmap && (
                    <div className="bg-[#18181b] print:bg-white p-4 rounded-xl border border-white/5 print:border-gray-200 flex flex-col items-center">
                      <h4 className="text-white print:text-black font-medium mb-4 self-start">Correlation Heatmap</h4>
                      <Plot
                        data={[{
                          z: eda.heatmap.z,
                          x: eda.heatmap.x,
                          y: eda.heatmap.y,
                          type: 'heatmap',
                          colorscale: 'RdBu',
                          hoverongaps: false
                        }]}
                        layout={{
                          width: 450, height: 400,
                          paper_bgcolor: 'rgba(0,0,0,0)',
                          plot_bgcolor: 'rgba(0,0,0,0)',
                          font: { color: plotFontColor },
                          margin: { t: 10, l: 80, r: 10, b: 80 },
                          xaxis: { showgrid: false, zeroline: false },
                          yaxis: { showgrid: false, zeroline: false }
                        }}
                        config={{ displayModeBar: false }}
                      />
                    </div>
                  )}

                  {/* Missing Values Chart */}
                  {eda?.null_counts && (
                    <div className="bg-[#18181b] print:bg-white p-4 rounded-xl border border-white/5 print:border-gray-200 flex flex-col items-center">
                      <h4 className="text-white print:text-black font-medium mb-4 self-start">Missing Values</h4>
                      <Plot
                        data={[{
                          x: eda.null_counts.x,
                          y: eda.null_counts.y,
                          type: 'bar',
                          marker: { color: '#ef4444' }
                        }]}
                        layout={{
                          width: 450, height: 400,
                          paper_bgcolor: 'rgba(0,0,0,0)',
                          plot_bgcolor: 'rgba(0,0,0,0)',
                          font: { color: plotFontColor },
                          margin: { t: 10, l: 50, r: 10, b: 80 },
                          xaxis: { showgrid: false, zeroline: false },
                          yaxis: { showgrid: false, zeroline: false }
                        }}
                        config={{ displayModeBar: false }}
                      />
                    </div>
                  )}

                  {/* ROC Curve */}
                  {modelResults?.roc_data && (
                    <div className="bg-[#18181b] print:bg-white p-4 rounded-xl border border-white/5 print:border-gray-200 flex flex-col items-center md:col-span-2">
                      <h4 className="text-white print:text-black font-medium mb-4 self-start">ROC Curve ({modelResults.task})</h4>
                      <Plot
                        data={[
                          {
                            x: modelResults.roc_data.fpr,
                            y: modelResults.roc_data.tpr,
                            type: 'scatter',
                            mode: 'lines',
                            line: { color: '#10b981', width: 3 },
                            name: `AUC = ${modelResults.roc_data.auc}`
                          },
                          {
                            x: [0, 1],
                            y: [0, 1],
                            type: 'scatter',
                            mode: 'lines',
                            line: { color: '#4b5563', width: 2, dash: 'dash' },
                            showlegend: false
                          }
                        ]}
                        layout={{
                          width: 500, height: 400,
                          paper_bgcolor: 'rgba(0,0,0,0)',
                          plot_bgcolor: 'rgba(0,0,0,0)',
                          font: { color: plotFontColor },
                          margin: { t: 10, l: 50, r: 10, b: 50 },
                          xaxis: { title: 'False Positive Rate', showgrid: true, gridcolor: '#27272a', zeroline: false },
                          yaxis: { title: 'True Positive Rate', showgrid: true, gridcolor: '#27272a', zeroline: false }
                        }}
                        config={{ displayModeBar: false }}
                      />
                    </div>
                  )}

                  {/* Categorical Counts */}
                  {eda?.categorical && eda.categorical.map((cat: any, idx: number) => (
                    <div key={idx} className="bg-[#18181b] print:bg-white p-4 rounded-xl border border-white/5 print:border-gray-200 flex flex-col items-center page-break-inside-avoid">
                      <h4 className="text-white print:text-black font-medium mb-4 self-start">Categories: {cat.column}</h4>
                      <Plot
                        data={[{
                          labels: cat.labels,
                          values: cat.values,
                          type: 'pie',
                          hole: 0.4,
                          textinfo: 'label+percent',
                          marker: { colors: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'] }
                        }]}
                        layout={{
                          width: 450, height: 400,
                          paper_bgcolor: 'rgba(0,0,0,0)',
                          plot_bgcolor: 'rgba(0,0,0,0)',
                          font: { color: plotFontColor },
                          margin: { t: 10, l: 10, r: 10, b: 10 },
                          showlegend: true,
                          xaxis: { showgrid: false, zeroline: false },
                          yaxis: { showgrid: false, zeroline: false }
                        }}
                        config={{ displayModeBar: false }}
                      />
                    </div>
                  ))}

                  {/* Box Plots */}
                  {eda?.box_plots && Object.keys(eda.box_plots).length > 0 && (
                    <div className="bg-[#18181b] print:bg-white p-4 rounded-xl border border-white/5 print:border-gray-200 flex flex-col items-center md:col-span-2 page-break-inside-avoid">
                      <h4 className="text-white print:text-black font-medium mb-4 self-start">Box Plots (Outliers)</h4>
                      <Plot
                        data={Object.keys(eda.box_plots).map((col) => ({
                          y: eda.box_plots[col],
                          type: 'box',
                          name: col,
                          boxpoints: 'outliers'
                        }))}
                        layout={{
                          width: 1000, height: 450,
                          paper_bgcolor: 'rgba(0,0,0,0)',
                          plot_bgcolor: 'rgba(0,0,0,0)',
                          font: { color: plotFontColor },
                          margin: { t: 10, l: 50, r: 10, b: 80 },
                          showlegend: false,
                          xaxis: { showgrid: false, zeroline: false },
                          yaxis: { showgrid: false, zeroline: false }
                        }}
                        config={{ displayModeBar: false }}
                        useResizeHandler={true}
                        style={{ width: "100%", height: "100%" }}
                      />
                    </div>
                  )}

                </div>
              </div>

              {/* Data Dictionary */}
              {profiling && profiling.columns_profile && (
                <div>
                  <h2 className="text-xl font-bold text-white print:text-black mb-4 flex items-center gap-2">
                    <Table size={20} className="text-gray-400 print:text-gray-600" /> Data Dictionary
                  </h2>
                  <table className="w-full text-left text-sm text-gray-400 print:text-gray-700 border-collapse">
                    <thead className="bg-[#18181b] print:bg-gray-100 text-gray-300 print:text-gray-800 border-b border-white/10 print:border-gray-300">
                      <tr>
                        <th className="px-4 py-3">Column Name</th>
                        <th className="px-4 py-3">Data Type</th>
                        <th className="px-4 py-3">Non-Null Count</th>
                        <th className="px-4 py-3">Unique Values</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiling.columns_profile.map((col: any) => (
                        <tr key={col.column} className="border-b border-white/5 print:border-gray-200">
                          <td className="px-4 py-3 font-medium text-gray-300 print:text-gray-800">{col.column}</td>
                          <td className="px-4 py-3">
                            <span className="bg-white/5 print:bg-gray-200 px-2 py-1 rounded text-xs">{col.dtype}</span>
                          </td>
                          <td className="px-4 py-3">{col.non_null_count?.toLocaleString()}</td>
                          <td className="px-4 py-3">{col.unique_values?.toLocaleString() || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footer */}
              <div className="mt-16 pt-8 border-t border-white/10 print:border-gray-300 text-center relative z-10">
                <p className="text-gray-500 print:text-gray-400 text-sm font-medium flex items-center justify-center gap-2">
                  <Image src="/logo2.png" alt="Logo" width={16} height={16} className="opacity-50 grayscale" />
                  Designed & Generated by InsightForge AI
                </p>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Floating AI Assistant Button */}
      {activeTab !== "AI Assistant" && (
        <button
          onClick={() => setActiveTab("AI Assistant")}
          className="fixed bottom-24 right-6 z-40 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white p-4 rounded-full shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:-translate-y-1 transition-all duration-300 group print:hidden flex items-center justify-center"
          title="Ask AI Assistant"
        >
          <Bot size={24} className="group-hover:animate-pulse" />
        </button>
      )}
    </div>
  );
}
