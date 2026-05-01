import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SystemSettings, User, TemplateConfig } from '../types';
import { BACKEND_SCRIPT_TEMPLATE, BACKEND_FILES } from '../constants';
import { TemplateHeaderPreview } from '../components/TemplateHeaderPreview';

interface SettingsViewProps {
    settings: SystemSettings;
    setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
    appScriptUrl: string;
    setAppScriptUrl: (url: string) => void;
    handleSaveSettings: () => void;
    isSavingSettings: boolean;
    showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
    user?: User | null;
}

const SectionHeader = ({ label }: { label: string }) => (
    <div className="w-full flex items-center gap-4 mb-6 opacity-60">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">{label}</span>
        <div className="h-px flex-1 bg-slate-200"></div>
    </div>
);

const SettingsView: React.FC<SettingsViewProps> = ({ 
    settings, setSettings, appScriptUrl, setAppScriptUrl, handleSaveSettings, isSavingSettings, user, showToast
}) => {
    const [logoError, setLogoError] = useState(false);
    const [activeTab, setActiveTab] = useState<'app' | 'backend'>('app');
    const [selectedBackendFile, setSelectedBackendFile] = useState<string>('1_Controller.gs');
    const [previewingTemplate, setPreviewingTemplate] = useState<{key: string, config: TemplateConfig} | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setLogoError(false); }, [settings.companyLogo]);

    const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'Admin';

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 1 * 1024 * 1024) {
            showToast("Logo must be under 1MB", "error");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64String = event.target?.result as string;
            setSettings(s => ({ ...s, companyLogo: base64String }));
            showToast("Logo updated", "success");
        };
        reader.readAsDataURL(file);
    };

    const handleCopyFile = () => {
        const content = BACKEND_FILES[selectedBackendFile];
        navigator.clipboard.writeText(content);
        showToast(`${selectedBackendFile} copied to clipboard`, "success");
    };

    const handleCopyFullBackend = () => {
        navigator.clipboard.writeText(BACKEND_SCRIPT_TEMPLATE);
        showToast("Full Merged Script copied", "success");
    };

    const inputClasses = "w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all disabled:opacity-50";
    const labelClasses = "block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 ml-1";
    
    const handleTemplateChange = (moduleKey: string, field: keyof TemplateConfig, value: string) => {
        setSettings(prev => {
            const currentTemplates = prev.templates || {};
            const currentTemplate = currentTemplates[moduleKey] || {
                title: '',
                docNo: '',
                revisionNo: '',
                revisionDate: '',
                initialIssueDate: ''
            };
            
            return {
                ...prev,
                templates: {
                    ...currentTemplates,
                    [moduleKey]: {
                        ...currentTemplate,
                        [field]: value
                    }
                }
            };
        });
    };

    return (
        <div className="max-w-4xl mx-auto py-4 sm:py-8 space-y-8 animate-fadeIn px-2">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-semibold text-slate-800 tracking-tight uppercase">System Configuration</h2>
                    <p className="text-xs text-slate-400 font-medium mt-1">Manage workspace and cloud integration</p>
                </div>
                {!isAdmin && (
                    <div className="px-3 py-1 bg-amber-50 border border-amber-100 rounded-lg">
                        <span className="text-[10px] font-bold text-amber-600 uppercase">Read-Only</span>
                    </div>
                )}
             </div>

             <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                <button 
                    onClick={() => setActiveTab('app')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'app' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Application
                </button>
                <button 
                    onClick={() => setActiveTab('backend')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'backend' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Cloud Backend
                </button>
             </div>

             {activeTab === 'app' ? (
                <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-10">
                    <section>
                        <SectionHeader label="Organization" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className={labelClasses}>Organization Name</label>
                                <input type="text" disabled={!isAdmin} value={settings.companyName} onChange={(e) => setSettings(s => ({...s, companyName: e.target.value}))} className={inputClasses} placeholder="Enter company name" />
                            </div>
                            <div className="space-y-1">
                                <label className={labelClasses}>Admin Contact Email</label>
                                <input type="email" disabled={!isAdmin} value={settings.managerEmail} onChange={(e) => setSettings(s => ({...s, managerEmail: e.target.value}))} className={inputClasses} placeholder="admin@company.com" />
                            </div>
                        </div>
                    </section>

                    <section>
                        <SectionHeader label="System Links" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className={labelClasses}>Cloud Script URL</label>
                                <input type="url" disabled={!isAdmin} value={appScriptUrl} onChange={(e) => setAppScriptUrl(e.target.value)} placeholder="https://script.google.com/..." className={inputClasses} />
                            </div>
                            <div className="space-y-1">
                                <label className={labelClasses}>Mobile App (APK) Link</label>
                                <input type="url" disabled={!isAdmin} value={settings.mobileApkLink || ''} onChange={(e) => setSettings(s => ({...s, mobileApkLink: e.target.value}))} placeholder="Download link for mobile app" className={inputClasses} />
                            </div>
                        </div>
                    </section>

                    <section>
                        <SectionHeader label="Template Configuration" />
                        <div className="space-y-8">
                            {Object.entries(settings.templates || {}).map(([key, config]) => (
                                <div key={key} className="p-6 bg-slate-50/50 border border-slate-100 rounded-[2rem] space-y-6">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{key.replace('_', ' ')}</h4>
                                        </div>
                                        <button 
                                            onClick={() => setPreviewingTemplate({ key, config })}
                                            className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-bold text-slate-500 uppercase tracking-tighter hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all flex items-center gap-2 group"
                                        >
                                            <svg className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                            Preview Header
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <label className={labelClasses}>Document Title</label>
                                            <input 
                                                type="text" 
                                                disabled={!isAdmin} 
                                                value={config.title} 
                                                onChange={(e) => handleTemplateChange(key, 'title', e.target.value)} 
                                                className={inputClasses} 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className={labelClasses}>Doc No.</label>
                                            <input 
                                                type="text" 
                                                disabled={!isAdmin} 
                                                value={config.docNo} 
                                                onChange={(e) => handleTemplateChange(key, 'docNo', e.target.value)} 
                                                className={inputClasses} 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className={labelClasses}>Revision No.</label>
                                            <input 
                                                type="text" 
                                                disabled={!isAdmin} 
                                                value={config.revisionNo} 
                                                onChange={(e) => handleTemplateChange(key, 'revisionNo', e.target.value)} 
                                                className={inputClasses} 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className={labelClasses}>Revision Date</label>
                                            <input 
                                                type="text" 
                                                disabled={!isAdmin} 
                                                value={config.revisionDate} 
                                                onChange={(e) => handleTemplateChange(key, 'revisionDate', e.target.value)} 
                                                className={inputClasses} 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className={labelClasses}>Initial Issue Date</label>
                                            <input 
                                                type="text" 
                                                disabled={!isAdmin} 
                                                value={config.initialIssueDate} 
                                                onChange={(e) => handleTemplateChange(key, 'initialIssueDate', e.target.value)} 
                                                className={inputClasses} 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className={labelClasses}>Next Revision Date</label>
                                            <input 
                                                type="text" 
                                                disabled={!isAdmin} 
                                                value={config.nextRevisionDate || ''} 
                                                onChange={(e) => handleTemplateChange(key, 'nextRevisionDate', e.target.value)} 
                                                className={inputClasses} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <SectionHeader label="Branding" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                            <div className="space-y-3">
                                <label className={labelClasses}>Company Logo</label>
                                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleLogoUpload} disabled={!isAdmin} />
                                <button onClick={() => fileInputRef.current?.click()} disabled={!isAdmin} className="w-full py-8 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-slate-100 transition-all disabled:opacity-50">
                                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Upload Identity</span>
                                </button>
                            </div>
                            <div className="flex flex-col">
                                <label className={labelClasses}>Preview</label>
                                <div className="w-full h-32 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center p-4">
                                    {settings.companyLogo && !logoError ? (
                                        <img src={settings.companyLogo} alt="Preview" className="max-h-full object-contain" onError={() => setLogoError(true)} />
                                    ) : (
                                        <span className="text-[10px] font-bold text-slate-300 uppercase">No Logo Configured</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {isAdmin && (
                        <div className="pt-6 border-t border-slate-100 flex justify-end">
                            <button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-full sm:w-auto px-10 py-3.5 bg-slate-900 hover:bg-black text-white font-black rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 text-[10px] uppercase tracking-[0.2em]">
                                {isSavingSettings ? 'Synchronizing...' : 'Save All Changes'}
                            </button>
                        </div>
                    )}
                </div>
             ) : (
                <div className="bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] shadow-2xl border border-white/5 space-y-8 animate-fadeIn">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                        <div className="max-w-md">
                            <h3 className="text-white text-lg font-black uppercase tracking-tight">Cloud Integration Engine</h3>
                            <p className="text-slate-400 text-[10px] font-medium leading-relaxed mt-2 uppercase tracking-widest">
                                Your private fleet backend is modular. Copy each file below into your Google Sheet script editor for a complete deployment.
                            </p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <button 
                                onClick={handleCopyFile}
                                className="flex-1 md:flex-none px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
                            >
                                Copy File
                            </button>
                            <button 
                                onClick={handleCopyFullBackend}
                                className="flex-1 md:flex-none px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 border border-white/5"
                            >
                                Copy Full (All)
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* File Explorer Sidebar */}
                        <div className="lg:w-64 shrink-0 space-y-1.5">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-2">Project Files</h4>
                            {Object.keys(BACKEND_FILES).map((fileName) => (
                                <button
                                    key={fileName}
                                    onClick={() => setSelectedBackendFile(fileName)}
                                    className={`w-full px-4 py-3 rounded-xl text-left text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-between group
                                        ${selectedBackendFile === fileName 
                                            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/20' 
                                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <svg className={`w-3.5 h-3.5 ${selectedBackendFile === fileName ? 'text-indigo-200' : 'text-slate-600 group-hover:text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                        <span className="truncate">{fileName}</span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Code Display Area */}
                        <div className="flex-1 relative group">
                            <div className="absolute inset-0 bg-indigo-500/5 blur-2xl rounded-3xl group-hover:bg-indigo-500/10 transition-colors"></div>
                            <div className="relative h-[450px] bg-black/40 border border-white/10 rounded-3xl p-6 overflow-hidden flex flex-col">
                                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em]">{selectedBackendFile}</span>
                                    <span className="text-[8px] font-bold text-slate-600 uppercase">Google Apps Script</span>
                                </div>
                                <pre className="flex-1 text-indigo-300/80 font-mono text-[10px] leading-relaxed overflow-y-auto scrollbar-hide select-all">
                                    {BACKEND_FILES[selectedBackendFile]}
                                </pre>
                                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none"></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-950/40 border border-indigo-900/50 p-6 rounded-[2rem] space-y-4">
                        <h4 className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Deployment Checklist</h4>
                        <ul className="text-slate-300 text-[10px] font-medium space-y-2 list-disc pl-4">
                            <li>Create a new <span className="text-white">Apps Script</span> project within your Google Sheet.</li>
                            <li>Add files in the script editor matching the names on the left (e.g. 1_Controller.gs).</li>
                            <li>Paste the corresponding code for each file.</li>
                            <li>Click <span className="text-white">Deploy &gt; New Deployment</span>.</li>
                            <li>Set "Who has access" to <span className="text-white font-bold uppercase text-emerald-400">"Anyone"</span>.</li>
                        </ul>
                    </div>
                </div>
             )}

             {/* Template Header Preview Modal */}
             <AnimatePresence>
                {previewingTemplate && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
                    >
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setPreviewingTemplate(null)}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                        ></motion.div>

                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
                            style={{ height: 'auto', maxHeight: '90vh' }}
                        >
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Document Header Preview</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Report Type: {previewingTemplate.key.replace('_', ' ')}</p>
                                </div>
                                <button 
                                    onClick={() => setPreviewingTemplate(null)}
                                    className="p-2 hover:bg-slate-200 rounded-xl transition-all text-slate-400 hover:text-slate-600"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                                </button>
                            </div>

                            <div className="flex-1 p-4 sm:p-12 overflow-hidden flex items-center justify-center bg-slate-100/50">
                                <div className="w-full max-w-4xl shadow-lg transform origin-top md:scale-100 scale-75 overflow-visible">
                                    <TemplateHeaderPreview 
                                        config={previewingTemplate.config} 
                                        logoUrl={settings.companyLogo}
                                        type={previewingTemplate.key as any}
                                    />
                                </div>
                            </div>

                            <div className="p-6 bg-indigo-600 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-100">This is how the document header will look on your generated PDF reports.</p>
                                <button 
                                    onClick={() => setPreviewingTemplate(null)}
                                    className="w-full sm:w-auto px-8 py-2 bg-white text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-md active:scale-95"
                                >
                                    Got it, Back to settings
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
             </AnimatePresence>
        </div>
    );
}

export default SettingsView;