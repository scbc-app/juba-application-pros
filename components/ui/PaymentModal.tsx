
import React, { useState } from 'react';
import { User } from '../../types';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    appScriptUrl: string;
    currentUser: User;
    showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ 
    isOpen, onClose, onSuccess, appScriptUrl, currentUser, showToast 
}) => {
    if (!isOpen) return null;

    const [phoneNumber, setPhoneNumber] = useState('');
    const [network, setNetwork] = useState<'AIRTEL' | 'MTN'>('AIRTEL');
    const [amount, setAmount] = useState('1500'); // Example: 1500 ZMW
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation for Zambian numbers
        const cleanPhone = phoneNumber.replace(/\s+/g, '');
        if (cleanPhone.length < 10) {
            showToast("Please enter a valid phone number (e.g. 097...)", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(appScriptUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'initiate_mobile_payment',
                    phoneNumber: cleanPhone,
                    network: network,
                    amount: Number(amount),
                    email: currentUser.username,
                    description: `License Renewal - ${currentUser.name}`
                })
            });

            const result = await response.json();

            if (result.status === 'success') {
                showToast(result.message, "success");
                // In a production app, you would now start polling the server for the transaction status
                // Or inform the user to check their phone and enter the PIN.
                onSuccess();
                onClose();
            } else {
                showToast(result.message || "Failed to trigger prompt.", "error");
            }
        } catch (e) {
            showToast("System connection error.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-white/20">
                <div className="bg-slate-900 p-8 text-white">
                    <h3 className="text-xl font-bold uppercase tracking-tight">Renew License</h3>
                    <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest">Mobile Money Zambia</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Network Provider</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                type="button"
                                onClick={() => setNetwork('AIRTEL')}
                                className={`py-3 rounded-xl border font-bold text-xs transition-all ${network === 'AIRTEL' ? 'bg-red-50 border-red-500 text-red-600 ring-2 ring-red-100' : 'bg-white border-slate-100 text-slate-400'}`}
                            >
                                Airtel Money
                            </button>
                            <button 
                                type="button"
                                onClick={() => setNetwork('MTN')}
                                className={`py-3 rounded-xl border font-bold text-xs transition-all ${network === 'MTN' ? 'bg-yellow-50 border-yellow-500 text-yellow-700 ring-2 ring-yellow-100' : 'bg-white border-slate-100 text-slate-400'}`}
                            >
                                MTN Money
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Mobile Number</label>
                        <input 
                            type="tel"
                            required
                            placeholder="097... / 096..."
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-slate-700"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                        <p className="text-[9px] text-slate-400 mt-2 ml-1 italic font-medium">Please enter the number linked to your wallet.</p>
                    </div>

                    <div className="bg-indigo-50 p-4 rounded-2xl flex justify-between items-center">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Total to Pay</span>
                        <span className="text-lg font-black text-indigo-600">ZMW {amount}</span>
                    </div>

                    <div className="pt-2">
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 disabled:bg-slate-300"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Requesting Prompt...
                                </div>
                            ) : "Pay with Mobile Money"}
                        </button>
                        <button 
                            type="button"
                            onClick={onClose}
                            className="w-full mt-3 py-3 text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase tracking-widest transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PaymentModal;
