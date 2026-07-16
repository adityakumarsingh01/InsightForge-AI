"use client";

import React, { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { User, Palette, Moon, Sun, Folder, BrainCircuit, Bell, Save, CheckCircle2, Monitor } from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { settings, updateProfile, updateAppearance, updateWorkspace, updateNotifications } = useSettings();
  
  // Local state for inputs to allow editing before saving
  const [name, setName] = useState(settings.profile.name);
  const [email, setEmail] = useState(settings.profile.email);
  const [algorithm, setAlgorithm] = useState(settings.workspace.defaultAlgorithm);
  
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    
    // Update profile
    updateProfile({ name, email });
    
    // Update workspace
    updateWorkspace({ defaultAlgorithm: algorithm });
    
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Settings saved successfully!");
    }, 600);
  };

  const accentColors = [
    { id: "blue", label: "Blue", color: "#3b82f6", bgClass: "bg-blue-500" },
    { id: "emerald", label: "Emerald", color: "#10b981", bgClass: "bg-emerald-500" },
    { id: "purple", label: "Purple", color: "#8b5cf6", bgClass: "bg-purple-500" },
    { id: "rose", label: "Rose", color: "#f43f5e", bgClass: "bg-rose-500" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your platform preferences and appearance.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent, #3b82f6)' }}
        >
          {isSaving ? <span className="animate-spin text-xl leading-none">⟳</span> : <Save size={18} />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column - Form Sections */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Profile Section */}
          <section className="bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User size={20} className="text-blue-500" style={{ color: 'var(--accent, #3b82f6)' }} /> 
              Profile
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>
          </section>

          {/* Workspace Section */}
          <section className="bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Folder size={20} className="text-blue-500" style={{ color: 'var(--accent, #3b82f6)' }} /> 
              Workspace Defaults
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                  <BrainCircuit size={14} className="text-gray-400" /> Default Algorithm
                </label>
                <select 
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <optgroup label="Classification">
                    <option value="random_forest_clf">Random Forest</option>
                    <option value="logistic_regression">Logistic Regression</option>
                    <option value="gradient_boosting_clf">Gradient Boosting</option>
                    <option value="svc">Support Vector Classifier (SVC)</option>
                  </optgroup>
                  <optgroup label="Regression">
                    <option value="linear_regression">Linear Regression</option>
                    <option value="random_forest_reg">Random Forest Regressor</option>
                    <option value="gradient_boosting_reg">Gradient Boosting Regressor</option>
                  </optgroup>
                </select>
              </div>
            </div>
          </section>

          {/* Notifications Section */}
          <section className="bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Bell size={20} className="text-blue-500" style={{ color: 'var(--accent, #3b82f6)' }} /> 
              Notifications
            </h2>
            <div className="space-y-4">
              
              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#18181b] transition-colors">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Report Ready</h4>
                  <p className="text-xs text-gray-500">Notify when EDA and PDF generation is complete.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.notifications.reportReady}
                    onChange={(e) => {
                      updateNotifications({ reportReady: e.target.checked });
                      if(e.target.checked) toast.success("Report notifications enabled");
                    }}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" style={settings.notifications.reportReady ? { backgroundColor: 'var(--accent, #3b82f6)' } : {}}></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#18181b] transition-colors">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Model Training Complete</h4>
                  <p className="text-xs text-gray-500">Notify when the ML pipeline finishes compiling and training.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.notifications.modelTraining}
                    onChange={(e) => {
                      updateNotifications({ modelTraining: e.target.checked });
                      if(e.target.checked) toast.success("Training notifications enabled");
                    }}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" style={settings.notifications.modelTraining ? { backgroundColor: 'var(--accent, #3b82f6)' } : {}}></div>
                </label>
              </div>

            </div>
          </section>

        </div>

        {/* Right Column - Appearance */}
        <div className="space-y-6">
          <section className="bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-xl sticky top-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Palette size={20} className="text-blue-500" style={{ color: 'var(--accent, #3b82f6)' }} /> 
              Appearance
            </h2>
            
            {/* Theme Toggle */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Theme</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => updateAppearance({ theme: "light" })}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    settings.appearance.theme === "light" 
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" 
                      : "border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] text-gray-500 hover:border-gray-300 dark:hover:border-white/20"
                  }`}
                  style={settings.appearance.theme === "light" ? { borderColor: 'var(--accent, #3b82f6)', color: 'var(--accent, #3b82f6)' } : {}}
                >
                  <Sun size={20} />
                  <span className="text-sm font-medium">Light</span>
                </button>
                <button
                  onClick={() => updateAppearance({ theme: "dark" })}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    settings.appearance.theme === "dark" 
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" 
                      : "border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] text-gray-500 hover:border-gray-300 dark:hover:border-white/20"
                  }`}
                  style={settings.appearance.theme === "dark" ? { borderColor: 'var(--accent, #3b82f6)', color: 'var(--accent, #3b82f6)' } : {}}
                >
                  <Moon size={20} />
                  <span className="text-sm font-medium">Dark</span>
                </button>
                <button
                  onClick={() => updateAppearance({ theme: "system" })}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    settings.appearance.theme === "system" 
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" 
                      : "border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] text-gray-500 hover:border-gray-300 dark:hover:border-white/20"
                  }`}
                  style={settings.appearance.theme === "system" ? { borderColor: 'var(--accent, #3b82f6)', color: 'var(--accent, #3b82f6)' } : {}}
                >
                  <Monitor size={20} />
                  <span className="text-sm font-medium">System</span>
                </button>
              </div>
            </div>

            {/* Accent Colors */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Accent Color</label>
              <div className="grid grid-cols-4 gap-3">
                {accentColors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => updateAppearance({ accentColor: color.id })}
                    className={`h-12 rounded-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 ${
                      settings.appearance.accentColor === color.id ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#111113] ring-gray-400 dark:ring-white" : ""
                    }`}
                    style={{ backgroundColor: color.color }}
                    title={color.label}
                  >
                    {settings.appearance.accentColor === color.id && <CheckCircle2 size={18} className="text-white drop-shadow-md" />}
                  </button>
                ))}
              </div>
            </div>
            
          </section>
        </div>

      </div>
    </div>
  );
}
