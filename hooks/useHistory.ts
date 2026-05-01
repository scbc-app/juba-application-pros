import { useState, useMemo, useEffect, useRef } from 'react';
import { InspectionData, ValidationLists, User } from '../types';
import { CACHE_TTL, SHEET_HEADERS, PETROLEUM_HEADERS, PETROLEUM_V2_HEADERS, ACID_HEADERS } from '../constants';

// Professional constraints to prevent server overload
const MIN_MANUAL_REFRESH_INTERVAL = 15000; // 15 seconds minimum between network calls for manual clicks

export const useHistory = (appScriptUrl: string, activeModule: string, currentUser: User | null) => {
    const [historyList, setHistoryList] = useState<InspectionData[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isBackgroundFetching, setIsBackgroundFetching] = useState(false);
    
    // Ref to track the last time we actually hit the network
    const lastNetworkRequestRef = useRef<number>(0);
    // Ref to track the current active module for async response guarding
    const currentModuleRef = useRef<string>(activeModule);
    // Global request tracker to prevent redundant API calls from different instances 
    const pendingRequestRef = useRef<Record<string, Promise<any> | undefined>>({});

    const [validationLists, setValidationLists] = useState<ValidationLists>({
        trucks: [],
        trailers: [],
        drivers: [],
        inspectors: [],
        locations: [],
        positions: []
    });

    // Sync ref with prop
    useEffect(() => {
        currentModuleRef.current = activeModule;
    }, [activeModule]);

    // Auto-fetch data on module or URL change
    useEffect(() => {
        if (appScriptUrl && currentUser) {
            // CRITICAL: Immediately clear current list when module changes 
            // to prevent "ghost" data from showing in the new view.
            setHistoryList([]); 
            fetchHistory(false); 
        }
    }, [activeModule, appScriptUrl, currentUser?.username]);

    // Internal helper to clean up junk data from Google Sheets source
    const sanitizeList = (list: any[], type: 'reg' | 'text') => {
        if (!Array.isArray(list)) return [];
        // Unique set to keep results clean
        const unique = new Set<string>();
        
        list.forEach(item => {
            const str = String(item).trim();
            // Basic cleanup
            if (!str || str === "" || str === "N/A" || str === "null" || str === "undefined" || str === "0") return;
            
            // Filter out system messages and control tokens
            if (str.startsWith('[BROADCAST]') || str.startsWith('HB-') || str === 'HB' || str === 'Presence' || str === 'Typing' || str.includes('sent to')) return;
            
            // Filter out obviously wrong data for registrations (Truck/Trailer)
            if (type === 'reg') {
                // Reg numbers shouldn't be long sentences, have @, or be system roles
                // Relaxed: split(' ').length > 4 to allow plates like "ABC 123 GP ZA"
                if (str.includes('@') || str.split(' ').length > 4 || str.length > 20 || str.length < 2) return;
                if (['SuperAdmin', 'Admin', 'System', 'Inspector', 'Manager', 'User'].includes(str)) return;
                // Shouldn't be just a single digit (like a rating)
                if (/^\d$/.test(str)) return;
            } else {
                // For names/locations, filter out pure numbers (ratings) or things that look like IDs/Regs
                // Names/Locations shouldn't be single digits 1-5 (ratings)
                if (/^[1-5]$/.test(str)) return;
                // Locations often have at least 3 chars
                if (str.length < 2) return;
                // Filter out obviously high-entropy IDs
                if (str.startsWith('ID-') || str.startsWith('REQ-')) return;
            }
            
            unique.add(str);
        });

        return Array.from(unique).sort();
    };

    const fetchHistory = async (forceRefresh: boolean | any = false) => {
        if (!appScriptUrl || typeof appScriptUrl !== 'string' || !appScriptUrl.startsWith('https://script.google.com')) return;
        
        // Capture the module name at the start of this specific request
        const requestModule = activeModule;
        const isManualForced = forceRefresh === true;
        
        const now = Date.now();
        const urlHash = btoa(appScriptUrl).substring(0, 8); // Simple hash for cache isolation
        const userPrefix = currentUser ? `${currentUser.username}_` : 'anon_';
        const cacheKey = `sc_history_${urlHash}_${userPrefix}${activeModule}`;
        const listCacheKey = `sc_val_lists_${urlHash}`;
        
        const cachedData = localStorage.getItem(cacheKey);
        let hasCachedData = false;

        // 1. Check Long-Term Cache (only if not a manual force refresh)
        if (cachedData && !isManualForced) {
            try {
                const parsed = JSON.parse(cachedData);
                if (parsed.data && Array.isArray(parsed.data)) {
                    // Only apply if the module hasn't changed while we were parsing
                    if (currentModuleRef.current === requestModule) {
                        setHistoryList(parsed.data);
                        hasCachedData = true;
                    }
                    
                    const cachedLists = localStorage.getItem(listCacheKey);
                    let listsFound = false;
                    if (cachedLists) {
                        const parsedLists = JSON.parse(cachedLists);
                        // If lists are actually populated, use them
                        if (parsedLists.trucks && parsedLists.trucks.length > 0) {
                            setValidationLists(parsedLists);
                            listsFound = true;
                        }
                    }
                    
                    // If cache is still within TTL AND we have validation lists, return early
                    if (now - parsed.timestamp < CACHE_TTL && listsFound) {
                        setIsLoadingHistory(false);
                        return; 
                    }
                }
            } catch (e) {
                console.error("Cache parsing error", e);
            }
        }

        // 2. CONCURRENCY PROTECTION: If another component/instance is already fetching this exact resource, reuse the promise
        const requestSignature = `${cacheKey}_${activeModule}`;
        if (pendingRequestRef.current[requestSignature]) {
            console.debug("[PRO-SYNC] Attaching to existing network request for", activeModule);
            setIsBackgroundFetching(true);
            try {
                await pendingRequestRef.current[requestSignature];
                return;
            } catch (e) { return; }
        }

        // 3. Throttling: Prevent spamming the 'Refresh' button
        if (isManualForced && (now - lastNetworkRequestRef.current < MIN_MANUAL_REFRESH_INTERVAL)) {
            console.debug("Fetch throttled to protect server.");
            return;
        }

        if (!hasCachedData) setIsLoadingHistory(true);
        else setIsBackgroundFetching(true);
        
        if (!navigator.onLine) {
            setIsLoadingHistory(false);
            setIsBackgroundFetching(false);
            return;
        }

        const fetchJob = (async () => {
            try {
                lastNetworkRequestRef.current = now; 
                const cacheBuster = `t=${now}`;
                const finalUrl = `${appScriptUrl}${appScriptUrl.includes('?') ? '&' : '?'}${cacheBuster}`;
                
                const response = await fetch(finalUrl);
                if (!response.ok) throw new Error("Network response was not ok");
                
                const text = await response.text();
                if (!text || text.trim().startsWith('<')) throw new Error("Invalid response format");
                
                return JSON.parse(text);
            } finally {
                delete pendingRequestRef.current[requestSignature];
            }
        })();

        pendingRequestRef.current[requestSignature] = fetchJob;

        try {
            const json = await fetchJob;

            // RACE CONDITION GUARD: 
            if (currentModuleRef.current !== requestModule) return;

            const validationData = json['Validation_Data'];
            if (validationData) {
                const newLists = {
                    trucks: sanitizeList(validationData['Truck_Reg_No'] || [], 'reg'),
                    trailers: sanitizeList(validationData['Trailer_Reg_No'] || [], 'reg'),
                    drivers: sanitizeList(validationData['Driver_Name'] || [], 'text'),
                    inspectors: sanitizeList(validationData['Inspector_Name'] || [], 'text'),
                    locations: sanitizeList(validationData['Location'] || [], 'text'),
                    positions: sanitizeList(validationData['Position'] || [], 'text')
                };
                setValidationLists(newLists);
                localStorage.setItem(listCacheKey, JSON.stringify(newLists));
            }
            
            let targetSheet = 'General';
            let targetHeaders = SHEET_HEADERS;

            if (activeModule === 'petroleum') {
                targetSheet = 'Petroleum';
                targetHeaders = PETROLEUM_HEADERS;
            } else if (activeModule === 'petroleum_v2') {
                targetSheet = 'Petroleum_V2';
                targetHeaders = PETROLEUM_V2_HEADERS;
            } else if (activeModule === 'acid') {
                targetSheet = 'Acid';
                targetHeaders = ACID_HEADERS;
            }
            
            const rawRows = json[targetSheet];
            let historyData: InspectionData[] = [];

            if (rawRows !== undefined && Array.isArray(rawRows) && rawRows.length > 1) {
                historyData = rawRows.slice(1).map((row: any[]) => {
                    const item: any = {};
                    targetHeaders.forEach((header, index) => {
                    item[header] = row[index] !== undefined ? row[index] : null;
                    });
                    return item as InspectionData;
                }).reverse();
            }

            setHistoryList(historyData);
            localStorage.setItem(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                data: historyData
            }));

        } catch (error) {
            // Silence background errors
        } finally {
            setIsLoadingHistory(false);
            setIsBackgroundFetching(false);
        }
    };

    const stats = useMemo(() => {
        if (!historyList.length) return { total: 0, avgRate: 0, passRate: 0 };
        const total = historyList.length;
        const goodInspections = historyList.filter(i => Number(i.rate) >= 4).length;
        const passRate = ((goodInspections / total) * 100).toFixed(0);
        return { total, avgRate: 0, passRate };
    }, [historyList]);

    const searchDatabase = async (searchTerm: string) => {
        if (!appScriptUrl || !searchTerm.trim()) return [];
        setIsLoadingHistory(true);
        try {
            let targetSheet = 'General';
            if (activeModule === 'petroleum') targetSheet = 'Petroleum';
            else if (activeModule === 'petroleum_v2') targetSheet = 'Petroleum_V2';
            else if (activeModule === 'acid') targetSheet = 'Acid';

            const response = await fetch(appScriptUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'search_history',
                    sheet: targetSheet,
                    searchTerm: searchTerm
                })
            });
            const res = await response.json();
            if (res.status === 'success' && Array.isArray(res.data)) {
                return res.data as InspectionData[];
            }
            return [];
        } catch (e) {
            console.error("Search failed", e);
            return [];
        } finally {
            setIsLoadingHistory(false);
        }
    };

    return { 
        historyList, 
        isLoadingHistory, 
        isBackgroundFetching, 
        validationLists, 
        stats, 
        fetchHistory,
        searchDatabase
    };
};