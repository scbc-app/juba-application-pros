import React, { useState, useMemo } from 'react';
import { InspectionData } from '../../types';
import SubscriptionLock from '../ui/SubscriptionLock';

interface DashboardTemplateProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    colorTheme: 'emerald' | 'orange' | 'rose' | 'purple' | 'blue' | 'slate';
    stats: { total: number, passRate: number | string };
    startNewInspection: () => void;
    fetchHistory: (force?: boolean) => void;
    searchDatabase?: (term: string) => Promise<InspectionData[]>;
    isLoadingHistory: boolean;
    historyList: InspectionData[];
    onViewReport: (item: InspectionData) => void;
    onPrint: (item: InspectionData) => void;
    userRole?: string;
    titlePrefix?: string;
    isLocked?: boolean;
    lockReason?: 'maintenance' | 'license';
    maintenanceMessage?: string;
}

const DashboardTemplate: React.FC<DashboardTemplateProps> = ({ 
    title, description, icon, stats, 
    startNewInspection, fetchHistory, searchDatabase, isLoadingHistory, historyList, 
    onViewReport, userRole,
    isLocked = false,
    lockReason = 'license',
    maintenanceMessage
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<InspectionData[] | null>(null);
    const [isDeepSearching, setIsDeepSearching] = useState(false);

    const displayList = useMemo(() => {
        if (searchResults) return searchResults;

        let list = historyList;
        if (searchTerm.trim()) {
            const lowerSearch = searchTerm.toLowerCase();
            list = list.filter(item => 
                (item.truckNo && String(item.truckNo).toLowerCase().includes(lowerSearch)) ||
                (item.driverName && String(item.driverName).toLowerCase().includes(lowerSearch)) ||
                (item.inspectedBy && String(item.inspectedBy).toLowerCase().includes(lowerSearch))
            );
        } else {
            list = list.slice(0, 20); // Professional limit to last 20
        }
        return list;
    }, [historyList, searchTerm, searchResults]);

    const handleDeepSearch = async () => {
        if (!searchTerm.trim() || !searchDatabase) return;
        setIsDeepSearching(true);
        const results = await searchDatabase(searchTerm);
        setSearchResults(results);
        setIsDeepSearching(false);
    };

    // Reset search results when term is cleared
    React.useEffect(() => {
        if (!searchTerm.trim()) setSearchResults(null);
    }, [searchTerm]);

    const isSearchMode = searchTerm.trim().length > 0;
    const hasMoreHidden = historyList.length > 20 && !isSearchMode && !searchResults;

    const isSuperAdmin = userRole === 'SuperAdmin';
    const canCreate = (userRole === 'Admin' || userRole === 'Inspector' || userRole === 'SuperAdmin') && !isLocked;

    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn py-1">
          <SubscriptionLock 
            isLocked={isLocked} 
            lockReason={lockReason} 
            maintenanceMessage={maintenanceMessage}
            isSuperAdmin={isSuperAdmin}
          >
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8">
                   <div className="flex-1 w-full">
                       <div className="flex items-center gap-3 mb-2">
                           <span className="p-2.5 rounded-2xl bg-slate-50 text-slate-600 shadow-inner">{icon}</span>
                           <h2 className="text-xl sm:text-2xl font-medium text-slate-800 tracking-tight uppercase">{title}</h2>
                       </div>
                       
                       <div className="flex flex-col sm:flex-row gap-3 mt-6">
                           {canCreate && (
                               <button 
                                 onClick={startNewInspection}
                                 className="px-7 py-3.5 bg-slate-900 hover:bg-black text-white text-[10px] font-black rounded-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] shadow-lg active:scale-95 border-t border-white/10"
                               >
                                   <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M12 4v16m8-8H4"></path></svg>
                                   Start Inspection
                               </button>
                           )}
                           <button 
                             onClick={() => fetchHistory(true)}
                             disabled={isLoadingHistory}
                             className="px-6 py-3.5 bg-white border border-slate-200 text-slate-500 text-[10px] font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-95 shadow-sm disabled:opacity-50"
                           >
                               <svg className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                               Sync Hub
                           </button>
                       </div>
                   </div>
                   
                   <div className="flex gap-3 sm:gap-5 w-full sm:w-auto">
                       <div className="flex-1 sm:flex-none bg-slate-50 rounded-[1.5rem] p-4 sm:p-5 text-center min-w-[90px] border border-slate-100 shadow-inner">
                           <div className="text-2xl sm:text-3xl font-medium text-slate-800 leading-none">{stats.total}</div>
                           <div className="text-[8px] sm:text-[9px] text-slate-400 uppercase font-medium tracking-[0.2em] mt-2">Logs</div>
                       </div>
                       <div className="flex-1 sm:flex-none bg-emerald-50 rounded-[1.5rem] p-4 sm:p-5 text-center min-w-[90px] border border-emerald-100 shadow-inner">
                           <div className="text-2xl sm:text-3xl font-medium text-emerald-600 leading-none">{stats.passRate}%</div>
                           <div className="text-[8px] sm:text-[9px] text-slate-400 uppercase font-medium tracking-[0.2em] mt-2">Pass</div>
                       </div>
                   </div>
              </div>
          </SubscriptionLock>

          <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm flex flex-col min-h-0">
              <div className="px-6 py-4 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center bg-slate-50/30 gap-4">
                  <div className="flex items-center gap-4 self-start">
                      <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.3em]">Inspection History</h3>
                      {isLocked && (
                          <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 uppercase">View Only</span>
                      )}
                  </div>
                  <div className="relative w-full sm:w-auto flex gap-2">
                    <div className="relative flex-1 sm:w-60">
                        <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        <input 
                            type="text" 
                            placeholder="Search logs..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleDeepSearch()}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] outline-none font-normal focus:ring-4 focus:ring-indigo-50/50 transition-all"
                        />
                    </div>
                    {isSearchMode && !searchResults && (
                        <button 
                            onClick={handleDeepSearch}
                            disabled={isDeepSearching}
                            className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-md active:scale-95 disabled:opacity-50 h-full"
                        >
                            {isDeepSearching ? 'Searching...' : 'Deep Search'}
                        </button>
                    )}
                  </div>
              </div>

              <div className="flex-1 overflow-hidden">
                {isLoadingHistory && !searchResults ? (
                    <div className="py-24 text-center">
                        <div className="w-8 h-8 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-[9px] font-semibold text-slate-300 uppercase tracking-[0.3em]">Downloading archive</p>
                    </div>
                ) : displayList.length === 0 ? (
                    <div className="py-24 text-center">
                        <p className="text-[10px] font-medium text-slate-300 uppercase tracking-[0.3em] mb-4">No records found</p>
                        {isSearchMode && !searchResults && (
                            <button 
                                onClick={handleDeepSearch}
                                className="text-indigo-600 text-[10px] font-black underline uppercase tracking-widest hover:text-indigo-800"
                            >
                                Pull from entire database
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="divide-y divide-slate-50">
                            {displayList.map((item, i) => (
                                <div key={i} className="flex flex-col sm:flex-row sm:items-center px-6 py-4 hover:bg-slate-50/50 transition-colors gap-4">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={`flex items-center justify-center w-10 h-10 rounded-xl text-sm font-black text-white shadow-sm shrink-0
                                            ${Number(item.rate) >= 4 ? 'bg-emerald-500' : Number(item.rate) === 3 ? 'bg-amber-500' : 'bg-rose-500'}
                                        `}>
                                            {item.rate}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-slate-800 text-sm truncate uppercase tracking-tight">{item.truckNo}</div>
                                            <div className="text-[10px] text-slate-400 font-medium truncate uppercase tracking-wider">{item.trailerNo || 'Solo Unit'}</div>
                                        </div>
                                    </div>

                                    {/* Shared Data Block: Personnel & Time */}
                                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-4 sm:gap-10 shrink-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-400 border border-slate-200 uppercase shrink-0">
                                                {String(item.inspectedBy || '?').charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-[10px] font-bold text-slate-600 truncate">{item.inspectedBy}</div>
                                                <div className="text-[8px] text-slate-400 uppercase tracking-widest">Auditor</div>
                                            </div>
                                        </div>
                                        <div className="text-right sm:text-left">
                                            <div className="text-[10px] font-bold text-slate-600">{new Date(item.timestamp).toLocaleDateString()}</div>
                                            <div className="text-[8px] text-slate-400 uppercase tracking-widest">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                        </div>
                                    </div>

                                    {/* Action */}
                                    <div className="sm:ml-4 border-t sm:border-t-0 border-slate-50 pt-3 sm:pt-0 shrink-0">
                                        <button 
                                          onClick={() => onViewReport(item)}
                                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-xl transition-all uppercase tracking-widest border border-indigo-100 shadow-sm"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                            View Report
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Professional Footer Message */}
                        <div className="bg-slate-50/50 p-4 border-t border-slate-50 flex flex-col items-center text-center gap-2">
                             {hasMoreHidden && (
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                    Limited to last <span className="text-indigo-600">20</span> records
                                </p>
                             )}
                             <p className="text-[9px] text-slate-400 font-medium italic">
                                {isSearchMode ? 
                                    `Found ${displayList.length} matches in current view.` : 
                                    "You can search for the all inspections not showing here limited to 20 only. Search will automatically pull more data from the database."}
                             </p>
                        </div>
                    </>
                )}
              </div>
          </div>
      </div>
    );
};

export default DashboardTemplate;