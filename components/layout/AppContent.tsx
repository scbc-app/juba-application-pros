import React from 'react';
import { InspectionData, User, SystemSettings, ValidationLists } from '../../types';

// Views
import OverviewDashboard from '../../views/OverviewDashboard';
import AnalyticsDashboard from '../../views/AnalyticsDashboard';
import FleetWallView from '../../views/FleetWallView';
import LibraryView from '../../views/LibraryView';
import SettingsView from '../../views/SettingsView';
import MaintenanceView from '../../views/MaintenanceView';
import GeneralDashboard from '../../views/GeneralDashboard';
import PetroleumDashboard from '../../views/PetroleumDashboard';
import PetroleumV2Dashboard from '../../views/PetroleumV2Dashboard';
import AcidDashboard from '../../views/AcidDashboard';
import UserManagementView from '../../views/UserManagementView';
import SupportView from '../../views/SupportView';
import RequestTrackingView from '../../views/RequestTrackingView';
import FleetRegistryView from '../../views/FleetRegistryView';
import InspectionFormView from '../../views/InspectionFormView';

interface AppContentProps {
    viewMode: 'dashboard' | 'form';
    activeModule: string;
    currentUser: User;
    settings: SystemSettings;
    appScriptUrl: string;
    historyList: InspectionData[];
    isLoadingHistory: boolean;
    validationLists: ValidationLists;
    stats: any;
    notifications: any[];
    isSystemLocked: boolean;
    lockReason: 'maintenance' | 'license' | null;
    formInitialData: InspectionData;
    submissionStatus: any;
    supportPrefill: any;
    subscription: any;
    subHistory: any[];
    handleOpenInspectionFlow: (module: string) => void;
    handleSaveDraft: (data: InspectionData) => void;
    handleExitForm: () => void;
    handleGoogleSheetSubmit: (data: InspectionData) => void;
    handleViewReport: (data: InspectionData) => void;
    handleNavigate: (module: string) => void;
    handleSaveSettings: () => void;
    isSavingSettings: boolean;
    setSettings: any;
    setAppScriptUrl: any;
    showToast: any;
    refreshSubscription: () => void;
    fetchHistory: (force?: boolean) => void;
    searchDatabase: (term: string) => Promise<InspectionData[]>;
    setIsRequestModalOpen: (open: boolean) => void;
    setSupportPrefill: (data: any) => void;
}

const AppContent: React.FC<AppContentProps> = ({
    viewMode, activeModule, currentUser, settings, appScriptUrl, historyList, isLoadingHistory,
    validationLists, stats, notifications, isSystemLocked, lockReason, formInitialData,
    submissionStatus, supportPrefill, subscription, subHistory,
    handleOpenInspectionFlow, handleSaveDraft, handleExitForm, handleGoogleSheetSubmit,
    handleViewReport, handleNavigate, handleSaveSettings, isSavingSettings,
    setSettings, setAppScriptUrl, showToast, refreshSubscription, fetchHistory,
    searchDatabase, setIsRequestModalOpen, setSupportPrefill
}) => {
    const isAdmin = currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin';
    const isSuperAdmin = currentUser.role === 'SuperAdmin';

    if (viewMode === 'form') {
        return (
            <InspectionFormView 
                initialData={formInitialData} 
                activeModule={activeModule} 
                validationLists={validationLists} 
                settings={settings} 
                onSaveDraft={handleSaveDraft} 
                onExit={handleExitForm} 
                onSubmit={handleGoogleSheetSubmit} 
                submissionStatus={submissionStatus} 
                onViewReport={handleViewReport} 
            />
        );
    }

    return (
        <div className="animate-fadeIn">
            {activeModule === 'overview' && <OverviewDashboard appScriptUrl={appScriptUrl} onNavigate={handleNavigate} userRole={currentUser.role} historyList={historyList} isLoading={isLoadingHistory} onViewReport={handleViewReport} isMaintenanceActive={settings.maintenanceMode} pendingAlertsCount={notifications.filter(n => !n.read && n.type === 'critical').length} isLocked={isSystemLocked} />}
            {activeModule === 'analytics' && <AnalyticsDashboard historyList={historyList} isLoading={isLoadingHistory} />}
            {activeModule === 'fleet_wall' && <FleetWallView historyList={historyList} isLoading={isLoadingHistory} onClose={() => handleNavigate('overview')} />}
            {activeModule === 'library' && <LibraryView />}
            {(activeModule === 'settings' && isAdmin) && <SettingsView settings={settings} setSettings={setSettings} appScriptUrl={appScriptUrl} setAppScriptUrl={setAppScriptUrl} handleSaveSettings={handleSaveSettings} isSavingSettings={isSavingSettings} showToast={showToast} user={currentUser} />}
            {(activeModule === 'maintenance' && isSuperAdmin) && <MaintenanceView user={currentUser} appScriptUrl={appScriptUrl} settings={settings} onSettingsUpdate={(s) => setSettings((p:any) => ({...p, ...s}))} showToast={showToast} onRefreshSubscription={refreshSubscription} subscription={subscription} history={subHistory} />}
            {activeModule === 'general' && <GeneralDashboard userRole={currentUser.role} stats={stats} startNewInspection={() => handleOpenInspectionFlow('general')} fetchHistory={fetchHistory} searchDatabase={searchDatabase} isLoadingHistory={isLoadingHistory} historyList={historyList} onViewReport={handleViewReport} onPrint={() => {}} isLocked={isSystemLocked} lockReason={lockReason || undefined} maintenanceMessage={settings.maintenanceMessage} />}
            {activeModule === 'petroleum' && <PetroleumDashboard userRole={currentUser.role} stats={stats} startNewInspection={() => handleOpenInspectionFlow('petroleum')} fetchHistory={fetchHistory} searchDatabase={searchDatabase} isLoadingHistory={isLoadingHistory} historyList={historyList} onViewReport={handleViewReport} onPrint={() => {}} isLocked={isSystemLocked} lockReason={lockReason || undefined} maintenanceMessage={settings.maintenanceMessage} />}
            {activeModule === 'petroleum_v2' && <PetroleumV2Dashboard userRole={currentUser.role} stats={stats} startNewInspection={() => handleOpenInspectionFlow('petroleum_v2')} fetchHistory={fetchHistory} searchDatabase={searchDatabase} isLoadingHistory={isLoadingHistory} historyList={historyList} onViewReport={handleViewReport} onPrint={() => {}} isLocked={isSystemLocked} lockReason={lockReason || undefined} maintenanceMessage={settings.maintenanceMessage} />}
            {activeModule === 'acid' && <AcidDashboard userRole={currentUser.role} stats={stats} startNewInspection={() => handleOpenInspectionFlow('acid')} fetchHistory={fetchHistory} searchDatabase={searchDatabase} isLoadingHistory={isLoadingHistory} historyList={historyList} onViewReport={handleViewReport} onPrint={() => {}} isLocked={isSystemLocked} lockReason={lockReason || undefined} maintenanceMessage={settings.maintenanceMessage} />}
            {(activeModule === 'users' && isAdmin) && <UserManagementView currentUser={currentUser} appScriptUrl={appScriptUrl} showToast={showToast} validationLists={validationLists} settings={settings} />}
            {activeModule === 'support' && <SupportView appScriptUrl={appScriptUrl} currentUser={currentUser} showToast={showToast} settings={settings} validationLists={validationLists} prefillData={supportPrefill} onPrefillConsumed={() => setSupportPrefill(null)} />}
            {activeModule === 'track_requests' && <RequestTrackingView appScriptUrl={appScriptUrl} currentUser={currentUser} showToast={showToast} onRequestNew={() => setIsRequestModalOpen(true)} />}
            {activeModule === 'registry' && <FleetRegistryView appScriptUrl={appScriptUrl} validationLists={validationLists} onRefresh={() => fetchHistory(true)} showToast={showToast} isLocked={isSystemLocked} />}
        </div>
    );
};

export default AppContent;