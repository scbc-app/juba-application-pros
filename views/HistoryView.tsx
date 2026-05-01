import React, { useState, useMemo } from 'react';
import { InspectionData } from '../types';

interface HistoryViewProps {
    activeModule: string;
    isLoadingHistory: boolean;
    historyList: InspectionData[];
    fetchHistory: (force?: boolean) => void;
    onViewReport: (item: InspectionData) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ activeModule, isLoadingHistory, historyList, fetchHistory, onViewReport }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Filter results based on search term
    const filteredHistory = useMemo(() => {
        if (!searchTerm.trim()) {
            return historyList.slice(0, 20); // Limit to last 20 by default
        }
        
        const term = searchTerm.toLowerCase();
        return historyList.filter(item => 
            (item.truckNo && String(item.truckNo).toLowerCase().includes(term)) ||
            (item.trailerNo && String(item.trailerNo).toLowerCase().includes(term)) ||
            (item.inspectedBy && String(item.inspectedBy).toLowerCase().includes(term)) ||
            (item.driverName && String(item.driverName).toLowerCase().includes(term)) ||
            (item.location && String(item.location).toLowerCase().includes(term)) ||
            (item.timestamp && String(item.timestamp).toLowerCase().includes(term))
        );
    }, [historyList, searchTerm]);

    const isSearchMode = searchTerm.trim().length > 0;
    const hasMoreHidden = historyList.length > 20 && !isSearchMode;

    return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <span className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </span>
              {activeModule === 'petroleum' ? 'Petroleum History' : 
               activeModule === 'petroleum_v2' ? 'Petroleum V2 History' :
               activeModule === 'acid' ? 'Acid Tanker History' : 'General History'}
          </h2>
          <p className="text-xs text-gray-400 mt-1">Showing the latest inspection records from the database</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <input 
                    type="text" 
                    placeholder="Search records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                {searchTerm && (
                    <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                )}
            </div>
            
            <button 
                onClick={() => fetchHistory(true)} 
                disabled={isLoadingHistory}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait shrink-0 shadow-sm"
            >
                <svg className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                <span className="hidden sm:inline">Refresh</span>
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoadingHistory && filteredHistory.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                Loading history records...
            </div>
        ) : filteredHistory.length === 0 ? (
            <div className="p-12 text-center">
                <div className="text-gray-400 mb-2">No inspections found matching your criteria.</div>
                <p className="text-sm text-gray-500">Try searching with a different keyword or truck number.</p>
                {isSearchMode && (
                    <button 
                        onClick={() => setSearchTerm('')}
                        className="mt-4 text-blue-600 text-sm font-bold underline"
                    >
                        Clear Search
                    </button>
                )}
            </div>
        ) : (
            <>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Vehicle / Trailer</th>
                                <th className="px-6 py-4">Inspector</th>
                                <th className="px-6 py-4">Rating</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredHistory.map((item, i) => (
                                <tr key={i} className="hover:bg-blue-50/50 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {new Date(item.timestamp).toLocaleDateString()}
                                        <div className="text-xs text-gray-400 font-normal">{new Date(item.timestamp).toLocaleTimeString()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-800">{item.truckNo || 'N/A'}</div>
                                        <div className="text-xs text-gray-500">{item.trailerNo}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{item.inspectedBy}</td>
                                    <td className="px-6 py-4">
                                        {item.rate && (
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                Number(item.rate) >= 4 ? 'bg-green-100 text-green-700' : 
                                                Number(item.rate) === 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {item.rate}/5
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                         <button 
                                            onClick={() => onViewReport(item)}
                                            className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase tracking-wider bg-blue-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-blue-200 transition-all opacity-0 group-hover:opacity-100"
                                         >
                                             View Report
                                         </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Professional Footer Message */}
                <div className="bg-gray-50/80 p-4 border-t border-gray-100 flex flex-col items-center text-center gap-2">
                    {hasMoreHidden && (
                        <p className="text-[11px] text-gray-500 font-medium">
                            Records limited to the last <span className="text-blue-600 font-bold">20</span> entries for optimal performance.
                        </p>
                    )}
                    <p className="text-[10px] text-slate-400 italic">
                        {isSearchMode ? 
                            `Showing ${filteredHistory.length} search results from the database.` : 
                            "You can search for all inspections not showing here using the search box above (limited to the most recent 300 records in shared view)."}
                    </p>
                </div>
            </>
        )}
      </div>
    </div>
  );
}

export default HistoryView;