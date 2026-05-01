import { useState, useEffect, useRef } from 'react';
import { SystemSettings } from '../types';
import { PRE_CONFIGURED_SCRIPT_URL, TEMPLATE_CONFIGS } from '../constants';

export const useSettings = () => {
    const [appScriptUrl, setAppScriptUrl] = useState<string>(() => {
        // Fix: Explicitly cast to string to avoid narrowing to 'never' 
        // when PRE_CONFIGURED_SCRIPT_URL is defined as an empty string literal in constants.ts.
        const preConfigured = PRE_CONFIGURED_SCRIPT_URL as string;
        if (preConfigured && preConfigured.length > 0) return preConfigured;
        if (typeof window !== 'undefined') return localStorage.getItem('safetyCheck_scriptUrl') || '';
        return '';
    });

    const [settings, setSettings] = useState<SystemSettings>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('safetyCheck_settings');
            if (saved) {
                try { return JSON.parse(saved); } catch (e) { console.error("Failed to parse local settings", e); }
            }
        }
        return { 
            companyName: 'SafetyCheck Pro', 
            managerEmail: '',
            templates: TEMPLATE_CONFIGS
        };
    });

    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const isFetchingRef = useRef(false);
    const isWritingRef = useRef(false);

    useEffect(() => {
        if (appScriptUrl && appScriptUrl.startsWith('https://script.google.com')) {
            fetchSystemSettings(appScriptUrl);

            const intervalId = setInterval(() => {
                if (!isWritingRef.current) {
                    fetchSystemSettings(appScriptUrl);
                }
            }, 30000);

            return () => clearInterval(intervalId);
        }
    }, [appScriptUrl]);

    const fetchSystemSettings = async (url: string, force: boolean = false) => {
        if (!url || !url.startsWith('https://script.google.com')) return;
        if (!navigator.onLine || (isFetchingRef.current && !force)) return;

        isFetchingRef.current = true;
        try {
            const cacheBuster = `t=${new Date().getTime()}`;
            const finalUrl = `${url}${url.includes('?') ? '&' : '?'}${cacheBuster}`;
            
            const response = await fetch(finalUrl, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-store'
            });
            
            if (!response.ok) return;
            
            const json = await response.json();
            const settingsRows = json['System_Settings'];
            
            if (settingsRows && Array.isArray(settingsRows) && settingsRows.length > 1) {
                const latestConfig = settingsRows[1]; 
                // Checks for index 8 because index 9 is maintenance message, but index 1-7 are vital.
                if (latestConfig && latestConfig.length >= 9) {
                    const rawMaintenanceVal = String(latestConfig[8]).toUpperCase().trim();
                    const isMaintActive = rawMaintenanceVal === 'TRUE';
                    
                    const remoteSettings: SystemSettings = {
                        companyName: latestConfig[1] || 'SafetyCheck Pro',
                        managerEmail: latestConfig[2] || '',
                        companyLogo: (latestConfig[5] && String(latestConfig[5]).length > 100) ? latestConfig[5] : undefined,
                        mobileApkLink: latestConfig[6] || '', 
                        webAppUrl: latestConfig[7] || '',
                        maintenanceMode: isMaintActive,
                        maintenanceMessage: latestConfig[9] || 'System under scheduled maintenance.',
                        templates: latestConfig[10] ? JSON.parse(latestConfig[10]) : settings.templates || TEMPLATE_CONFIGS
                    };
                    
                    setSettings(prev => {
                        const hasChanged = JSON.stringify(prev) !== JSON.stringify(remoteSettings);
                        if (hasChanged) {
                            localStorage.setItem('safetyCheck_settings', JSON.stringify(remoteSettings));
                            return remoteSettings;
                        }
                        return prev;
                    });
                }
            }
        } catch (error) {
            // Quiet fail for network
        } finally {
            isFetchingRef.current = false;
        }
    };

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        isWritingRef.current = true;
        try {
            localStorage.setItem('safetyCheck_settings', JSON.stringify(settings));
            localStorage.setItem('safetyCheck_scriptUrl', appScriptUrl);

            if (appScriptUrl && appScriptUrl.startsWith('https') && navigator.onLine) {
                 await fetch(appScriptUrl, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'update_settings',
                        ...settings
                    }),
                    mode: 'no-cors' 
                });
            }
        } catch (error) {
            console.error("Save Settings Failed", error);
        } finally {
            setTimeout(() => {
                setIsSavingSettings(false);
                isWritingRef.current = false;
            }, 800);
        }
    };

    return { 
        settings, 
        setSettings, 
        appScriptUrl, 
        setAppScriptUrl, 
        isSavingSettings, 
        handleSaveSettings,
        fetchSystemSettings
    };
};