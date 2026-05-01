
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, ChatMessage } from '../../types';

interface ChatAssistantProps {
    currentUser: User | null;
    appScriptUrl: string;
    onNavigate?: (module: string) => void;
}

// Optimization Constants
const ACTIVE_POLLING_MS = 6000; 
const HEARTBEAT_INTERVAL_MS = 15000; 
const MAX_MESSAGES_PER_CONVERSATION = 50; 
const DAILY_LIMIT_PER_CONVERSATION = 30;
const IDLE_CLOSE_MS = 120000; // 2 Minutes to auto-close and save API calls

const ChatAssistant: React.FC<ChatAssistantProps> = ({ currentUser, appScriptUrl, onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'list' | 'chat'>('list');
    const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
    const [input, setInput] = useState('');
    
    // Live status derived from heartbeat messages in the sheet
    const [staffStatuses, setStaffStatuses] = useState<Record<string, { lastSeen?: string, isTyping?: boolean }>>({});
    
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        const cached = localStorage.getItem('sc_chat_cache_messages');
        return cached ? JSON.parse(cached) : [];
    });
    
    const [staff, setStaff] = useState<User[]>(() => {
        const cached = localStorage.getItem('sc_chat_cache_staff');
        return cached ? JSON.parse(cached) : [];
    });

    const [isSending, setIsSending] = useState(false);
    const [isLocalTyping, setIsLocalTyping] = useState(false);
    const [limitReached, setLimitReached] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastFetchRef = useRef<number>(0);
    const pollTimerRef = useRef<number | null>(null);
    const typingTimeoutRef = useRef<number | null>(null);
    const idleTimerRef = useRef<number | null>(null);

    const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin';
    const normalize = (id?: string) => (id || '').toLowerCase().trim();

    // Reset idle timer on any activity within the component
    const resetIdleTimer = () => {
        if (!isOpen) return;
        if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = window.setTimeout(() => {
            setIsOpen(false);
        }, IDLE_CLOSE_MS);
    };

    // 1. Filter chat messages vs system presence rows
    const chatOnlyMessages = useMemo(() => {
        return messages.filter(m => m.message !== 'HB' && m.status !== 'Presence' && m.status !== 'Typing');
    }, [messages]);

    // 2. Recency Sorting
    const sortedStaff = useMemo(() => {
        if (!currentUser) return staff;
        const myUid = normalize(currentUser.username);

        return [...staff].sort((a, b) => {
            const uidA = normalize(a.username);
            const uidB = normalize(b.username);

            const lastMsgA = [...chatOnlyMessages].reverse().find(m => 
                (normalize(m.senderId) === uidA && normalize(m.receiverId) === myUid) ||
                (normalize(m.senderId) === myUid && normalize(m.receiverId) === uidA)
            );

            const lastMsgB = [...chatOnlyMessages].reverse().find(m => 
                (normalize(m.senderId) === uidB && normalize(m.receiverId) === myUid) ||
                (normalize(m.senderId) === myUid && normalize(m.receiverId) === uidB)
            );

            const timeA = lastMsgA ? new Date(lastMsgA.timestamp).getTime() : 0;
            const timeB = lastMsgB ? new Date(lastMsgB.timestamp).getTime() : 0;

            return timeB - timeA;
        });
    }, [staff, chatOnlyMessages, currentUser]);

    // Update derived staff presence from fetched messages
    useEffect(() => {
        const newStatuses: Record<string, { lastSeen?: string, isTyping?: boolean }> = {};
        messages.filter(m => m.message === 'HB').forEach(m => {
            const uid = normalize(m.senderId);
            const ts = m.timestamp;
            const isTyping = m.status === 'Typing';
            if (!newStatuses[uid] || new Date(ts) > new Date(newStatuses[uid].lastSeen || 0)) {
                newStatuses[uid] = { lastSeen: ts, isTyping };
            }
        });
        setStaffStatuses(newStatuses);
    }, [messages]);

    // 3. Mark as Read Logic (Immediate local UI cleanup)
    useEffect(() => {
        if (selectedStaff && view === 'chat' && currentUser) {
            const myUid = normalize(currentUser.username);
            const partnerUid = normalize(selectedStaff.username);
            
            const hasIncomingUnread = messages.some(m => 
                normalize(m.senderId) === partnerUid && normalize(m.receiverId) === myUid && m.status === 'Sent'
            );

            if (hasIncomingUnread) {
                // Optimistic local update to clear bubble/ticks immediately
                setMessages(prev => prev.map(m => {
                    if (normalize(m.senderId) === partnerUid && normalize(m.receiverId) === myUid && m.status === 'Sent') {
                        return { ...m, status: 'Read' };
                    }
                    return m;
                }));
                
                // Fire and forget to server
                fetch(appScriptUrl, { 
                    method: 'POST', 
                    body: JSON.stringify({ action: 'mark_read', username: myUid, senderId: partnerUid }),
                    mode: 'no-cors'
                }).catch(() => {});
            }
        }
    }, [selectedStaff, view, messages.length]);

    const sentTodayCount = useMemo(() => {
        if (!currentUser) return 0;
        const myUid = normalize(currentUser.username);
        const partnerUid = selectedStaff ? normalize(selectedStaff.username) : 'ALL';
        const today = new Date().toISOString().split('T')[0];
        return chatOnlyMessages.filter(m => m.timestamp.startsWith(today) && normalize(m.senderId) === myUid && normalize(m.receiverId) === partnerUid).length;
    }, [chatOnlyMessages, currentUser, selectedStaff]);

    useEffect(() => { setLimitReached(sentTodayCount >= DAILY_LIMIT_PER_CONVERSATION); }, [sentTodayCount]);

    const filteredMessagesForView = useMemo(() => {
        if (!currentUser) return [];
        const myUid = normalize(currentUser.username);
        const partnerUid = selectedStaff ? normalize(selectedStaff.username) : null;
        const relevant = chatOnlyMessages.filter(m => {
            if (!selectedStaff) return (m.message || '').startsWith('[BROADCAST]:') || normalize(m.receiverId) === 'all';
            const sender = normalize(m.senderId);
            const receiver = normalize(m.receiverId);
            return (sender === myUid && receiver === partnerUid) || (sender === partnerUid && receiver === myUid);
        });
        return relevant.slice(-MAX_MESSAGES_PER_CONVERSATION);
    }, [chatOnlyMessages, selectedStaff, currentUser]);

    const totalUnreadCount = useMemo(() => {
        if (!currentUser) return 0;
        const myUid = normalize(currentUser.username);
        return new Set(chatOnlyMessages.filter(m => normalize(m.receiverId) === myUid && m.status === 'Sent').map(m => normalize(m.senderId))).size;
    }, [chatOnlyMessages, currentUser]);

    const isUserOnline = (username: string) => {
        const status = staffStatuses[normalize(username)];
        if (!status?.lastSeen) return false;
        return Date.now() - new Date(status.lastSeen).getTime() < 45000;
    };

    const sendHeartbeat = async () => {
        if (!appScriptUrl || !currentUser || !navigator.onLine) return;
        try {
            await fetch(appScriptUrl, {
                method: 'POST',
                body: JSON.stringify({ action: 'heartbeat', username: currentUser.username, name: currentUser.name, isTyping: isLocalTyping }),
                mode: 'no-cors'
            });
        } catch (e) {}
    };

    const fetchData = async () => {
        if (!appScriptUrl || !currentUser || !navigator.onLine) return;
        const now = Date.now();
        if (now - lastFetchRef.current < 4000) return; 
        lastFetchRef.current = now;

        try {
            const [uResp, mResp] = await Promise.all([
                fetch(appScriptUrl, { method: 'POST', body: JSON.stringify({ action: 'get_users' }) }),
                fetch(`${appScriptUrl}?t=${now}`)
            ]);

            if (uResp.ok) {
                const uData = await uResp.json();
                if (uData.status === 'success') {
                    const filtered = uData.users.filter((u: User) => normalize(u.username) !== normalize(currentUser.username));
                    setStaff(filtered);
                    localStorage.setItem('sc_chat_cache_staff', JSON.stringify(filtered));
                }
            }

            if (mResp.ok) {
                const json = await mResp.json();
                const chatData = json['Messages'];
                if (Array.isArray(chatData) && chatData.length > 1) {
                    const serverMsgs: ChatMessage[] = chatData.slice(1).map((row: any[]) => ({
                        id: String(row[0]), senderId: row[1], senderName: row[2],
                        receiverId: row[3], message: row[4] || '', timestamp: row[5], status: row[6] || 'Sent'
                    }));
                    setMessages(prev => {
                        const serverIds = new Set(serverMsgs.map(m => m.id));
                        const localOnly = prev.filter(m => m.status === 'Sending' && !serverIds.has(m.id));
                        const combined = [...serverMsgs, ...localOnly].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                        localStorage.setItem('sc_chat_cache_messages', JSON.stringify(combined));
                        return combined;
                    });
                }
            }
        } catch (e) {}
    };

    useEffect(() => {
        fetchData();
        pollTimerRef.current = window.setInterval(fetchData, ACTIVE_POLLING_MS);
        const hbTimer = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
        return () => { 
            if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
            window.clearInterval(hbTimer);
            if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
        };
    }, [isOpen, appScriptUrl, currentUser?.username]);

    // Handle typing status sync
    const handleInputChange = (val: string) => {
        setInput(val);
        resetIdleTimer();
        if (!isLocalTyping) {
            setIsLocalTyping(true);
            sendHeartbeat(); // Immediate sync when typing starts
        }
        if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = window.setTimeout(() => {
            setIsLocalTyping(false);
            sendHeartbeat(); // Immediate sync when typing stops
        }, 3000);
    };

    const handleSendMessage = async (isGlobalAnnouncement = false) => {
        if (!input.trim() || isSending || !currentUser || limitReached) return;
        if (isGlobalAnnouncement && !isAdmin) return;

        resetIdleTimer();
        const msgText = input.trim();
        const receiver = isGlobalAnnouncement ? 'ALL' : selectedStaff ? selectedStaff.username : 'ALL';
        const msgPrefix = isGlobalAnnouncement ? '[BROADCAST]: ' : '';
        const msgId = "LOCAL-" + Date.now();
        const timestamp = new Date().toISOString();

        const optimisticMsg: ChatMessage = {
            id: msgId, senderId: currentUser.username, senderName: currentUser.name,
            receiverId: receiver, message: `${msgPrefix}${msgText}`, timestamp: timestamp, status: 'Sending'
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setInput('');
        setIsSending(true);

        try {
            await fetch(appScriptUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'create', sheet: 'Messages',
                    headers: ['ID', 'SenderID', 'SenderName', 'ReceiverID', 'Message', 'Timestamp', 'Status'],
                    row: ["M-" + Date.now(), currentUser.username, currentUser.name, receiver, `${msgPrefix}${msgText}`, timestamp, 'Sent']
                }),
                mode: 'no-cors'
            });
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'Sent' } : m));
            fetchData();
        } catch (e) {
            setMessages(prev => prev.filter(m => m.id !== msgId));
            setInput(msgText);
        } finally { setIsSending(false); }
    };

    const MessageTicks = ({ status }: { status: string }) => {
        if (status === 'Sending') return <div className="w-2.5 h-2.5 border border-slate-300 border-t-transparent rounded-full animate-spin ml-1" />;
        const isRead = status === 'Read';
        const isDelivered = status === 'Sent' || status === 'Read';
        return (
            <div className="flex items-center ml-1 shrink-0">
                <svg className={`w-3 h-3 ${isRead ? 'text-indigo-500' : 'text-slate-300'}`} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
                {isDelivered && <svg className={`w-3 h-3 -ml-1.5 ${isRead ? 'text-indigo-500' : 'text-slate-300'}`} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>}
            </div>
        );
    };

    useEffect(() => { if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [filteredMessagesForView]);

    return (
        <div 
            className="fixed bottom-6 right-6 z-[110] no-print flex flex-col items-end font-sans"
            onMouseMove={resetIdleTimer}
            onClick={resetIdleTimer}
        >
            {isOpen && (
                <div className="mb-4 w-[330px] sm:w-[350px] h-[480px] bg-white rounded-[2rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fadeIn origin-bottom-right">
                    <div className="bg-[#0f172a] p-4 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#4f46e5] rounded-xl flex items-center justify-center text-white shadow-lg"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg></div>
                            <h3 className="text-[10px] font-bold text-white tracking-widest uppercase">System Chat</h3>
                        </div>
                        <div className="flex items-center gap-1">
                            {isAdmin && <button onClick={() => { setSelectedStaff(null); setView('chat'); }} className="bg-[#4f46e5] hover:bg-[#4338ca] text-white px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all">Broadcast</button>}
                            <button onClick={() => setIsOpen(false)} className="p-1 text-slate-400 hover:text-white transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                    </div>

                    {view === 'list' ? (
                        <div className="flex-1 overflow-y-auto scrollbar-hide bg-white">
                            <div className="divide-y divide-slate-50">
                                {sortedStaff.map((member, i) => {
                                    const unread = chatOnlyMessages.filter(m => normalize(m.senderId) === normalize(member.username) && normalize(m.receiverId) === normalize(currentUser?.username || '') && m.status === 'Sent').length;
                                    const online = isUserOnline(member.username);
                                    const statusObj = staffStatuses[normalize(member.username)];
                                    const lastSeenTime = statusObj?.lastSeen ? new Date(statusObj.lastSeen).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : null;
                                    const statusText = online ? (statusObj?.isTyping ? 'Typing...' : 'Online') : (lastSeenTime ? 'Last seen ' + lastSeenTime : 'Offline');
                                    
                                    return (
                                        <button key={i} onClick={() => { setSelectedStaff(member); setView('chat'); }} className={`w-full px-5 py-4 hover:bg-slate-50 transition-all flex items-center gap-4 relative ${unread > 0 ? 'bg-indigo-50/20' : ''}`}>
                                            <div className="relative shrink-0">
                                                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${unread > 0 ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>
                                                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full transition-colors ${online ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <h4 className={`text-[11px] uppercase tracking-tight truncate ${unread > 0 ? 'font-black text-indigo-900' : 'font-bold text-slate-800'}`}>{member.name}</h4>
                                                <p className={`text-[9px] font-medium truncate mt-0.5 ${online ? 'text-emerald-600' : 'text-slate-400'}`}>{member.role} • {statusText}</p>
                                            </div>
                                            {unread > 0 && <div className="h-5 min-w-[20px] bg-indigo-600 text-white text-[8px] font-black rounded-full px-1.5 flex items-center justify-center border border-white shadow-sm">{unread}</div>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <button onClick={() => setView('list')} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-all rounded-lg shrink-0"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M15 19l-7-7 7-7" /></svg></button>
                                    <div className="min-w-0">
                                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest truncate">{selectedStaff ? selectedStaff.name : 'System Announcements'}</h4>
                                        <p className="text-[8px] font-bold uppercase tracking-widest mt-0.5">
                                            {selectedStaff ? (isUserOnline(selectedStaff.username) ? (staffStatuses[normalize(selectedStaff.username)]?.isTyping ? 'Typing...' : 'Online') : 'Status: Offline') : 'Broadcast Channel'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-slate-50/40 scrollbar-hide">
                                {filteredMessagesForView.map((msg, idx) => {
                                    const isMe = normalize(msg.senderId) === normalize(currentUser?.username);
                                    const isB = (msg.message || '').startsWith('[BROADCAST]:');
                                    return (
                                        <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            {!isMe && <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1.5">{msg.senderName}</span>}
                                            <div className={`max-w-[80%] p-3.5 text-[11px] font-medium leading-relaxed shadow-sm border transition-all ${isMe ? 'bg-[#0f172a] text-white rounded-2xl rounded-tr-none border-[#0f172a]' : isB ? 'bg-indigo-50 text-indigo-900 border-indigo-100 rounded-2xl rounded-tl-none' : 'bg-white text-slate-700 border-slate-200 rounded-2xl rounded-tl-none'}`}>
                                                {msg.message.replace('[BROADCAST]: ', '').replace('[CRITICAL ALERT]: ', '')}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1.5 px-1.5">
                                                <span className="text-[7px] text-slate-300 font-bold uppercase">{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                {isMe && <MessageTicks status={msg.status} />}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="px-4 py-3 bg-white border-t border-slate-100">
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${limitReached ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-indigo-50 text-indigo-500 border-indigo-100'}`}>Quota: {sentTodayCount}/{DAILY_LIMIT_PER_CONVERSATION}</span>
                                </div>
                                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(view === 'chat' && !selectedStaff); }} className={`flex gap-3 shrink-0 ${limitReached ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                                    <input type="text" value={input} onChange={(e) => handleInputChange(e.target.value)} disabled={limitReached || isSending} placeholder={limitReached ? "Daily Limit Reached" : "Type a message..."} className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-xs outline-none focus:ring-4 focus:ring-indigo-50 transition-all font-medium placeholder:text-slate-300" />
                                    <button type="submit" disabled={!input.trim() || isSending || limitReached} className="w-12 h-12 bg-[#0f172a] text-white rounded-2xl flex items-center justify-center hover:bg-black transition-all active:scale-95 disabled:bg-slate-200 shadow-lg border-t border-white/10">
                                        {isSending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg className="w-5 h-5 rotate-45 -translate-x-0.5 translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
                                    </button>
                                </form>
                            </div>
                        </>
                    )}
                </div>
            )}
            <button 
                onClick={() => { 
                    setIsOpen(!isOpen); 
                    if (!isOpen) resetIdleTimer(); 
                }} 
                className={`h-14 w-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-500 relative border-t border-white/10 ${isOpen ? 'bg-[#4f46e5] rotate-180' : 'bg-[#0f172a] hover:scale-110 active:scale-95'}`}
            >
                {isOpen ? <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg> : (
                    <div className="relative"><svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
                        {totalUnreadCount > 0 && <div className="absolute -top-3 -right-3 h-5 min-w-[20px] bg-[#ef4444] text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-[#0f172a] px-1">{totalUnreadCount}</div>}
                    </div>
                )}
            </button>
        </div>
    );
};

export default ChatAssistant;
