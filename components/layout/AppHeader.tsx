
import React from 'react';
import { User, SystemSettings, AppNotification } from '../../types';
import NotificationCenter from '../ui/NotificationCenter';
import SubscriptionAlert from '../ui/SubscriptionAlert';

interface AppHeaderProps {
    settings: SystemSettings;
    currentUser: User;
    activeModule: string;
    isAtRoot: boolean;
    isAdmin: boolean;
    isSystemLocked: boolean;
    lockReason: 'maintenance' | 'license' | null;
    subscription: any;
    notifications: AppNotification[];
    isCheckingMaint: boolean;
    onNavigateHome: () => void;
    handleMarkNotificationRead: (id: string, navigate: any) => void;
    handleDismissNotification: (id: string) => void;
    handleClearAllNotifications: () => void;
    handleGlobalAcknowledge: (id: string) => void;
    handleNavigate: (module: string) => void;
    setIsProfileModalOpen: (open: boolean) => void;
    handleCheckMaintStatus: () => void;
    setActiveModule: (module: string) => void;
    setIsSolutionsOpen: (open: boolean) => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
    settings, currentUser, activeModule, isAtRoot, isAdmin, isSystemLocked, lockReason,
    subscription, notifications, isCheckingMaint, onNavigateHome, 
    handleMarkNotificationRead, handleDismissNotification, handleClearAllNotifications,
    handleGlobalAcknowledge, handleNavigate, setIsProfileModalOpen, handleCheckMaintStatus, setActiveModule,
    setIsSolutionsOpen
}) => {
    return (
        <div className="no-print">
            {settings.maintenanceMode && (
                <div className="bg-amber-600 px-4 py-2.5 flex items-center justify-center gap-4 text-white shadow relative z-[101]">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-amber-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        <p className="text-xs font-black">{settings.maintenanceMessage || 'SYSTEM MAINTENANCE IN PROGRESS'}</p>
                    </div>
                    <button onClick={handleCheckMaintStatus} disabled={isCheckingMaint} className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/30 rounded text-[10px] font-black transition-all uppercase tracking-widest">
                        {isCheckingMaint ? 'SYNCING...' : 'CHECK STATUS'}
                    </button>
                </div>
            )}
            
            <SubscriptionAlert subscription={subscription} user={currentUser} onManage={() => setActiveModule('maintenance')} />

            <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-2 flex items-center justify-between h-14">
                <div className="flex items-center gap-2">
                    {!isAtRoot && (
                        <button onClick={onNavigateHome} className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-all flex items-center group">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path></svg>
                            <span className="text-[10px] font-black ml-1 hidden sm:inline uppercase tracking-widest">Dashboard</span>
                        </button>
                    )}
                </div>
                <button onClick={onNavigateHome} className="flex flex-col items-center hover:opacity-80 transition-opacity absolute left-1/2 -translate-x-1/2">
                    <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tighter leading-none uppercase">{settings.companyName || 'SAFETYCHECK PRO'}</h1>
                </button>
                <div className="flex items-center gap-2">
                    {!isSystemLocked && (
                        <button 
                            onClick={() => setIsSolutionsOpen(true)}
                            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors relative group"
                            title="Enterprise Solutions"
                        >
                            <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500 border border-white"></span>
                            </span>
                        </button>
                    )}
                    <NotificationCenter id="notification-bell" notifications={notifications} onMarkAsRead={(id) => handleMarkNotificationRead(id, handleNavigate)} onDismiss={handleDismissNotification} onClearAll={handleClearAllNotifications} onAcknowledge={handleGlobalAcknowledge} canAcknowledge={isAdmin} />
                    <button id="profile-trigger" onClick={() => setIsProfileModalOpen(true)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    </button>
                </div>
            </header>

            {isSystemLocked && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 flex items-center justify-center gap-2">
                    <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    <span className="text-[9px] font-black text-amber-800 uppercase tracking-[0.2em]">
                        {lockReason === 'maintenance' ? 'LOCKED: CORE MAINTENANCE' : 'RESTRICTED: VIEW-ONLY MODE'}
                    </span>
                </div>
            )}
        </div>
    );
};

export default AppHeader;
