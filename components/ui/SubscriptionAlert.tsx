
import React from 'react';
import { SubscriptionDetails, User } from '../../types';

interface SubscriptionAlertProps {
    subscription: SubscriptionDetails | null;
    user: User | null;
    onManage: () => void;
}

const SubscriptionAlert: React.FC<SubscriptionAlertProps> = ({ subscription, user, onManage }) => {
    if (!user || !subscription) return null;

    const isSuperAdmin = user.role === 'SuperAdmin';
    const isExpired = subscription.status === 'Expired' || subscription.daysRemaining <= 0;
    const isNearExpiry = !isExpired && subscription.daysRemaining <= 7;

    if (!isExpired && !isNearExpiry) return null;

    return (
        <div className={`w-full px-4 py-2.5 flex items-center justify-between shadow-sm relative z-[100] animate-fadeIn no-print
            ${isExpired ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}
        `}>
            <div className="flex items-center gap-3">
                <div className="p-1 bg-white/20 rounded-full shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.1em]">
                        {isExpired ? 'License Expired' : 'License Expiring Soon'}
                    </p>
                    <p className="text-[9px] font-medium opacity-90 leading-none mt-0.5">
                        {isExpired ? 'System features are now restricted.' : `${subscription.daysRemaining} days remaining.`}
                    </p>
                </div>
            </div>
            {isSuperAdmin && (
                <button onClick={onManage} className="px-3 py-1 bg-white text-slate-900 rounded-lg text-[9px] font-bold uppercase tracking-wider hover:bg-slate-50 transition-colors shadow-sm">
                    Manage
                </button>
            )}
        </div>
    );
};

export default SubscriptionAlert;
