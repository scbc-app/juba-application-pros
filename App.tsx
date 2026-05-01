
import React, { useState, useEffect, useMemo } from 'react';
import { INITIAL_DATA, InspectionData, User } from './types';
import { 
    SHEET_HEADERS, PETROLEUM_HEADERS, PETROLEUM_V2_HEADERS, ACID_HEADERS,
    INSPECTION_ITEMS, PETROLEUM_INSPECTION_ITEMS, PETROLEUM_V2_ITEMS, ACID_INSPECTION_ITEMS
} from './constants';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useSettings } from './hooks/useSettings';
import { useNotifications } from './hooks/useNotifications';
import { useHistory } from './hooks/useHistory';
import { useOfflineSync } from './hooks/useOfflineSync';
import { useSubscription } from './hooks/useSubscription';

// Services
import { analyzeInspection } from './services/geminiService';

// UI Components
import Toast from './components/ui/Toast';
import SubmissionOverlay from './components/ui/SubmissionOverlay';
import SystemTour from './components/ui/SystemTour'; 
import InstallPwaPrompt from './components/ui/InstallPwaPrompt';
import OnboardingWizard from './components/ui/OnboardingWizard'; 
import ChatAssistant from './components/ui/ChatAssistant';

// Layout Components
import AppHeader from './components/layout/AppHeader';
import AppContent from './components/layout/AppContent';
import AppModals from './components/layout/AppModals';
import AppFooter from './components/layout/AppFooter';

// Views
import LoginView from './views/LoginView';

// Main Application Logic
const App = () => {
  // Core Business Hooks
  const { currentUser, setCurrentUser, handleLogin, handleLogout, sessionExpired, setSessionExpired } = useAuth();
  const { settings, setSettings, appScriptUrl, setAppScriptUrl, isSavingSettings, handleSaveSettings, fetchSystemSettings } = useSettings();
  const { subscription, history: subHistory, refreshSubscription } = useSubscription(appScriptUrl, currentUser);

  // View Routing State
  const [activeModule, setActiveModule] = useState('overview'); 
  const [viewMode, setViewMode] = useState<'dashboard' | 'form'>('dashboard');
  
  // UI Interaction State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSolutionsOpen, setIsSolutionsOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info' | 'warning'} | null>(null);
  const [showTour, setShowTour] = useState(false);
  const [isCheckingMaint, setIsCheckingMaint] = useState(false);
  
  // Data Handlers State
  const [lastSubmittedData, setLastSubmittedData] = useState<InspectionData | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);
  const [selectedReportData, setSelectedReportData] = useState<InspectionData | null>(null);
  const [formInitialData, setFormInitialData] = useState<InspectionData>(INITIAL_DATA);
  const [supportPrefill, setSupportPrefill] = useState<{subject: string, description: string} | null>(null);
  const [pendingModule, setPendingModule] = useState<string | null>(null);
  const [hasExistingDraft, setHasExistingDraft] = useState(false);
  
  // Core Data Fetching Hook
  const { historyList, isLoadingHistory, validationLists, stats, fetchHistory, searchDatabase } = useHistory(appScriptUrl, activeModule, currentUser);
  
  // Handlers
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 4000);
  };

  const { submissionStatus, setSubmissionStatus, isSyncing, addToQueue } = useOfflineSync(appScriptUrl, showToast, () => fetchHistory(true));

  const lockInfo = useMemo(() => {
      const isSuperAdmin = currentUser?.role === 'SuperAdmin';
      const isSubExpired = subscription ? (subscription.status === 'Expired' || subscription.daysRemaining <= 0) : false;
      const isMaintActive = settings.maintenanceMode === true;
      if (isSuperAdmin) return { isLocked: false, reason: null as any };
      if (isMaintActive) return { isLocked: true, reason: 'maintenance' as const };
      if (isSubExpired) return { isLocked: true, reason: 'license' as const };
      return { isLocked: false, reason: null as any };
  }, [subscription, settings.maintenanceMode, currentUser?.role]);
  
  const isSystemLocked = lockInfo.isLocked;

  useEffect(() => {
    (window as any).isSubscriptionLocked = isSystemLocked;
  }, [isSystemLocked]);

  useEffect(() => {
    if (currentUser && !currentUser.needsSetup) {
        setActiveModule('overview');
        setViewMode('dashboard');
    }
  }, [currentUser?.username, currentUser?.needsSetup]);

  useEffect(() => {
      if (sessionExpired === 'idle') showToast("Session expired due to inactivity.", 'warning');
      else if (sessionExpired === 'max_duration') showToast("Session limit reached. Log in again.", 'info');
      if (sessionExpired) setSessionExpired(null);
  }, [sessionExpired]);

  const handleNavigate = async (module: string) => {
    if (module.startsWith('support:info:')) {
        const solutionName = module.replace('support:info:', '');
        setSupportPrefill({
            subject: `Inquiry: ${solutionName}`,
            description: `Automated Request: User is interested in learning more about integrating the "${solutionName}" module into the current fleet workflow.`
        });
        setActiveModule('support');
        setViewMode('dashboard');
        setIsSolutionsOpen(false);
        return;
    }

    if (module.startsWith('request:start_inspection')) {
        if (isSystemLocked) { showToast("System is in View-Only mode.", "error"); return; }
        const parts = module.split('|');
        const type = parts[1]?.toLowerCase();
        const truck = parts[2];
        const trailer = parts[3];
        const requester = parts[4];
        const reason = parts[5];
        let moduleKey = 'general';
        if (type === 'petroleum') moduleKey = 'petroleum';
        else if (type === 'petroleum_v2') moduleKey = 'petroleum_v2';
        else if (type === 'acid') moduleKey = 'acid';

        setActiveModule(moduleKey);
        startFreshInspection(moduleKey, {
            truckNo: truck,
            trailerNo: trailer,
            remarks: `Requested by ${requester}: ${reason}`,
            requestId: parts[0].split('-')[1]
        });
        return;
    }

    if (module !== 'support') setSupportPrefill(null);
    setActiveModule(module);
    setViewMode('dashboard');
  };

  const handleOpenInspectionFlow = (module: string) => {
    if (isSystemLocked) { showToast("System is currently in view-only mode.", "error"); return; }
    const draftKey = `sc_draft_${module}`;
    const draft = localStorage.getItem(draftKey);
    if (draft) {
        setPendingModule(module);
        setHasExistingDraft(true);
        setIsStartModalOpen(true);
    } else {
        startFreshInspection(module);
    }
  };

  const { notifications, handleMarkNotificationRead, handleDismissNotification, handleClearAllNotifications, handleGlobalAcknowledge } = useNotifications(appScriptUrl, currentUser, showToast);

  const startFreshInspection = (module: string, prefill?: Partial<InspectionData>) => {
      if (isSystemLocked) { showToast("Access Restricted: View-Only mode active.", "error"); return; }
      setLastSubmittedData(null);
      setAiAnalysisResult(null);
      setFormInitialData({ ...INITIAL_DATA, timestamp: new Date().toISOString(), inspectedBy: currentUser?.name || '', ...prefill });
      setViewMode('form');
  };

  const handleResumeDraft = () => {
    if (!pendingModule) return;
    const draftKey = `sc_draft_${pendingModule}`;
    const draftData = localStorage.getItem(draftKey);
    if (draftData) {
        setFormInitialData(JSON.parse(draftData));
        setActiveModule(pendingModule);
        setViewMode('form');
    }
    setIsStartModalOpen(false);
  };

  const handleDiscardAndStartNew = () => {
    if (!pendingModule) return;
    localStorage.removeItem(`sc_draft_${pendingModule}`);
    setActiveModule(pendingModule);
    startFreshInspection(pendingModule);
    setIsStartModalOpen(false);
  };

  const handleSaveDraft = (data: InspectionData) => {
    localStorage.setItem(`sc_draft_${activeModule}`, JSON.stringify(data));
    setViewMode('dashboard');
  };

  const handleExitForm = () => setViewMode('dashboard');

  const handleGoogleSheetSubmit = async (formData: InspectionData) => {
    if (isSystemLocked) { showToast("System is in View-Only mode. Submission blocked.", "error"); return; }
    if (!appScriptUrl) { showToast("Application URL not configured", "error"); return; }

    setSubmissionStatus('submitting');
    setLastSubmittedData(formData);
    setAiAnalysisResult(null);

    let sheetName = 'General', headers = SHEET_HEADERS, moduleTitle = "General Vehicle Inspection", activeItems = INSPECTION_ITEMS;
    if (activeModule === 'petroleum') { 
        sheetName = 'Petroleum'; headers = PETROLEUM_HEADERS; moduleTitle = "Petroleum Tanker Inspection"; activeItems = PETROLEUM_INSPECTION_ITEMS;
    } else if (activeModule === 'petroleum_v2') { 
        sheetName = 'Petroleum_V2'; headers = PETROLEUM_V2_HEADERS; moduleTitle = "Petroleum Tanker Inspection V2"; activeItems = PETROLEUM_V2_ITEMS;
    } else if (activeModule === 'acid') { 
        sheetName = 'Acid'; headers = ACID_HEADERS; moduleTitle = "Acid Tanker Inspection"; activeItems = ACID_INSPECTION_ITEMS;
    }

    const row = headers.map(h => formData[h] !== undefined ? formData[h] : "");
    
    // Explicitly define report data to avoid undefined fields in Apps Script
    const reportData = {
        title: moduleTitle, 
        timestamp: formData.timestamp || new Date().toISOString(), 
        truckNo: formData.truckNo || 'N/A', 
        trailerNo: formData.trailerNo || 'N/A', 
        jobCard: formData.jobCard || '',
        location: formData.location || 'N/A', 
        odometer: formData.odometer || '0', 
        inspectedBy: formData.inspectedBy || currentUser?.name || 'Inspector', 
        driverName: formData.driverName || 'N/A',
        remarks: formData.remarks || '', 
        rate: formData.rate || 0, 
        safeToLoad: formData.safeToLoad || 'Not Specified', 
        signatures: { 
            inspector: formData.inspectorSignature || null, 
            driver: formData.driverSignature || null 
        },
        photos: { 
            front: formData.photoFront || null, 
            ls: formData.photoLS || null, 
            rs: formData.photoRS || null, 
            back: formData.photoBack || null, 
            damage: formData.photoDamage || null 
        },
        items: activeItems.map(item => ({ 
            label: item.label, 
            category: item.category, 
            status: formData[item.id] || 'N/A' 
        })),
        companyName: settings.companyName || 'Fleet Portal', 
        companyLogo: settings.companyLogo || null,
        templateConfig: settings.templates?.[activeModule] || null
    };

    const payload = { 
        action: 'create', 
        sheet: sheetName, 
        headers: headers, 
        row: row, 
        requestId: formData.requestId || null, 
        reportData: reportData 
    };

    if (!navigator.onLine) {
        addToQueue(payload); 
        localStorage.removeItem(`sc_draft_${activeModule}`);
        setSubmissionStatus('offline_saved'); 
        setTimeout(() => { setSubmissionStatus('idle'); setViewMode('dashboard'); }, 3500); 
        return;
    }

    try {
        await fetch(appScriptUrl, { method: 'POST', body: JSON.stringify(payload), mode: 'no-cors' });
        setSubmissionStatus('success'); 
        localStorage.removeItem(`sc_draft_${activeModule}`);
        try { 
            const analysis = await analyzeInspection(formData); 
            setAiAnalysisResult(analysis); 
        } catch (aiErr) { 
            setAiAnalysisResult("AI analysis currently unavailable."); 
        }
        fetchHistory(true); 
    } catch (error) {
        addToQueue(payload); 
        localStorage.removeItem(`sc_draft_${activeModule}`);
        setSubmissionStatus('offline_saved'); 
        setTimeout(() => { setSubmissionStatus('idle'); setViewMode('dashboard'); }, 3500);
    }
  };

  const handleRequestSubmit = async (data: any) => {
      if (isSystemLocked) { showToast("Requests are disabled in View-Only mode.", "error"); return; }
      if (!appScriptUrl) return;
      try { await fetch(appScriptUrl, { method: 'POST', body: JSON.stringify({ action: 'request_inspection', requester: currentUser?.name, role: currentUser?.role, ...data }), mode: 'no-cors' }); showToast("Inspection request submitted successfully", "success"); } catch (e) { showToast("Failed to submit request", "error"); }
  };

  const handleViewReport = (item: InspectionData | null) => {
    setSelectedReportData(item);
    setIsReportModalOpen(true);
  };

  const handleOnboardingComplete = (updatedUser: User) => {
      const userWithSetup = { ...updatedUser, needsSetup: false };
      setCurrentUser(userWithSetup);
      localStorage.setItem('safetyCheck_user', JSON.stringify(userWithSetup));
      setActiveModule('overview'); setViewMode('dashboard');
      showToast("Profile verified successfully.", "success"); setShowTour(true);
  };

  const handleCheckMaintStatus = async () => {
    setIsCheckingMaint(true);
    try { await fetchSystemSettings(appScriptUrl, true); showToast("Status updated.", "info"); } finally { setIsCheckingMaint(false); }
  };

  if (!currentUser) {
      return (
          <>
            <InstallPwaPrompt />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <LoginView onLogin={handleLogin} appScriptUrl={appScriptUrl} setAppScriptUrl={setAppScriptUrl} settings={settings} />
          </>
      );
  }

  if (currentUser && currentUser.needsSetup) {
      return <OnboardingWizard user={currentUser} appScriptUrl={appScriptUrl} onComplete={handleOnboardingComplete} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 relative">
      <SubmissionOverlay 
        status={submissionStatus} 
        onClose={() => { setSubmissionStatus('idle'); setViewMode('dashboard'); }}
        onViewReport={() => lastSubmittedData && handleViewReport(lastSubmittedData)}
        aiAnalysis={aiAnalysisResult}
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {showTour && <SystemTour onComplete={() => setShowTour(false)} />}

      <AppModals
        isProfileModalOpen={isProfileModalOpen} isSolutionsOpen={isSolutionsOpen} isRequestModalOpen={isRequestModalOpen}
        isStartModalOpen={isStartModalOpen} isReportModalOpen={isReportModalOpen} currentUser={currentUser}
        settings={settings} appScriptUrl={appScriptUrl} validationLists={validationLists} hasExistingDraft={hasExistingDraft}
        pendingModule={pendingModule} activeModule={activeModule} selectedReportData={selectedReportData}
        setIsProfileModalOpen={setIsProfileModalOpen} setIsSolutionsOpen={setIsSolutionsOpen}
        setIsRequestModalOpen={setIsRequestModalOpen} setIsStartModalOpen={setIsStartModalOpen}
        setIsReportModalOpen={setIsReportModalOpen} showToast={showToast} setCurrentUser={setCurrentUser}
        handleLogout={handleLogout} handleNavigate={handleNavigate} handleRequestSubmit={handleRequestSubmit}
        handleDiscardAndStartNew={handleDiscardAndStartNew} handleResumeDraft={handleResumeDraft}
      />

      <div className="relative z-10 min-h-screen flex flex-col">
          <AppHeader 
            settings={settings} currentUser={currentUser} activeModule={activeModule} isAdmin={currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin'}
            isAtRoot={activeModule === 'overview'} isSystemLocked={isSystemLocked} lockReason={lockInfo.reason}
            subscription={subscription} notifications={notifications} isCheckingMaint={isCheckingMaint}
            onNavigateHome={() => { setActiveModule('overview'); setViewMode('dashboard'); }}
            handleMarkNotificationRead={handleMarkNotificationRead} handleDismissNotification={handleDismissNotification}
            handleClearAllNotifications={handleClearAllNotifications} handleGlobalAcknowledge={handleGlobalAcknowledge}
            handleNavigate={handleNavigate} setIsProfileModalOpen={setIsProfileModalOpen}
            handleCheckMaintStatus={handleCheckMaintStatus} setActiveModule={setActiveModule}
            setIsSolutionsOpen={setIsSolutionsOpen}
          />

          <main className="flex-1 p-4 md:p-6 w-full max-w-7xl mx-auto no-print">
              <AppContent 
                viewMode={viewMode} activeModule={activeModule} currentUser={currentUser} settings={settings}
                appScriptUrl={appScriptUrl} historyList={historyList} isLoadingHistory={isLoadingHistory}
                validationLists={validationLists} stats={stats} notifications={notifications}
                isSystemLocked={isSystemLocked} lockReason={lockInfo.reason} formInitialData={formInitialData}
                submissionStatus={submissionStatus} supportPrefill={supportPrefill}
                subscription={subscription} subHistory={subHistory}
                handleOpenInspectionFlow={handleOpenInspectionFlow} handleSaveDraft={handleSaveDraft}
                handleExitForm={handleExitForm} handleGoogleSheetSubmit={handleGoogleSheetSubmit}
                handleViewReport={handleViewReport} handleNavigate={handleNavigate}
                handleSaveSettings={handleSaveSettings} isSavingSettings={isSavingSettings}
                setSettings={setSettings} setAppScriptUrl={setAppScriptUrl} showToast={showToast}
                refreshSubscription={refreshSubscription} fetchHistory={fetchHistory}
                searchDatabase={searchDatabase}
                setIsRequestModalOpen={setIsRequestModalOpen} setSupportPrefill={setSupportPrefill}
              />
          </main>

          {!isSystemLocked && viewMode === 'dashboard' && (
              <ChatAssistant currentUser={currentUser} appScriptUrl={appScriptUrl} onNavigate={handleNavigate} />
          )}

          <AppFooter />
      </div>
    </div>
  );
};

export default App;
