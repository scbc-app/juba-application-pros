import React from 'react';
import { TemplateConfig } from '../types';

interface TemplateHeaderPreviewProps {
    config: TemplateConfig;
    logoUrl?: string;
    type: 'petroleum' | 'acid' | 'general' | 'petroleum_v2';
}

export const TemplateHeaderPreview: React.FC<TemplateHeaderPreviewProps> = ({ config, logoUrl, type }) => {
    const defaultLogo = "https://www.juba-transport.com/wp-content/uploads/2019/08/juba-logo-sgs.png";
    const logo = logoUrl || defaultLogo;

    // Different layouts for different report types to match the real reports
    if (type === 'acid') {
        return (
            <div className="bg-white p-4 border-2 border-black font-sans text-black">
                <div className="grid grid-cols-[1fr_150px] divide-x-2 divide-black border-b-2 border-black">
                    <div className="flex flex-col">
                        <div className="border-b-2 border-black px-3 py-1 text-[10px] font-bold">Doc No: {config.docNo}</div>
                        <div className="flex-1 flex items-center justify-center p-4">
                            <h1 className="text-xl font-black uppercase tracking-widest text-center leading-tight">{config.title}</h1>
                        </div>
                    </div>
                    <div className="text-[9px] divide-y divide-black bg-white">
                        <div className="grid grid-cols-[1fr_70px]"><span className="p-1 pl-2 border-r border-black font-semibold">Issue Date</span><span className="p-1 text-center">{config.initialIssueDate}</span></div>
                        <div className="grid grid-cols-[1fr_70px]"><span className="p-1 pl-2 border-r border-black font-semibold">Rev. Date:</span><span className="p-1 text-center">{config.revisionDate}</span></div>
                        <div className="grid grid-cols-[1fr_70px]"><span className="p-1 pl-2 border-r border-black font-semibold">Rev. No.</span><span className="p-1 text-center">{config.revisionNo}</span></div>
                        <div className="grid grid-cols-[1fr_70px]"><span className="p-1 pl-2 border-r border-black font-semibold">Next Rev:</span><span className="p-1 text-center">{config.nextRevisionDate || 'N/A'}</span></div>
                    </div>
                </div>
                <div className="flex justify-between items-center p-2">
                    <img src={logo} alt="Logo" className="h-10 object-contain" referrerPolicy="no-referrer" />
                    <div className="text-right">
                        <p className="text-[10px] font-bold">JUBA TRANSPORT LIMITED</p>
                        <p className="text-[8px]">Quality Management System</p>
                    </div>
                </div>
            </div>
        );
    }

    if (type === 'petroleum_v2') {
        return (
            <div className="bg-white p-4 font-sans text-black">
                <div className="border border-black overflow-hidden">
                    <div className="grid grid-cols-[120px_1fr_220px] divide-x divide-black">
                        <div className="p-2 flex items-center justify-center">
                            <img src={logo} alt="Logo" className="max-h-12 w-auto object-contain" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex flex-col">
                            <div className="border-b border-black px-2 py-1 text-[10px] font-medium">Doc No: {config.docNo}</div>
                            <div className="flex-1 flex items-center justify-center p-2">
                                <h1 className="text-lg font-bold uppercase tracking-wider text-center">{config.title}</h1>
                            </div>
                        </div>
                        <div className="text-[9px] divide-y divide-black">
                            <div className="grid grid-cols-[1fr_80px]"><span className="p-1 pl-2 border-r border-black">Initial Issue Date</span><span className="p-1 text-center">{config.initialIssueDate}</span></div>
                            <div className="grid grid-cols-[1fr_80px]"><span className="p-1 pl-2 border-r border-black">Revision Date:</span><span className="p-1 text-center">{config.revisionDate}</span></div>
                            <div className="grid grid-cols-[1fr_80px]"><span className="p-1 pl-2 border-r border-black">Revision No.</span><span className="p-1 text-center">{config.revisionNo}</span></div>
                            <div className="grid grid-cols-[1fr_80px]"><span className="p-1 pl-2 border-r border-black">Next Review Date:</span><span className="p-1 text-center">{config.nextRevisionDate || 'N/A'}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Default (General / Petroleum V1)
    return (
        <div className="bg-white p-4 font-sans text-black">
            <div className="border border-black flex items-stretch">
                <div className="w-[120px] border-r border-black p-2 flex items-center justify-center">
                    <img src={logo} alt="Logo" className="max-h-12 w-auto object-contain" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 border-r border-black flex flex-col items-center justify-center p-4">
                    <h1 className="text-lg font-bold text-center leading-tight">{config.title}</h1>
                </div>
                <div className="w-[180px] text-[9px]">
                    <div className="grid grid-cols-[1fr_70px] border-b border-black">
                        <span className="p-1 pl-2 border-r border-black font-semibold">Initial Issue Date</span>
                        <span className="p-1 text-center">{config.initialIssueDate}</span>
                    </div>
                    <div className="grid grid-cols-[1fr_70px] border-b border-black">
                        <span className="p-1 pl-2 border-r border-black font-semibold">Revision Date:</span>
                        <span className="p-1 text-center">{config.revisionDate}</span>
                    </div>
                    <div className="grid grid-cols-[1fr_70px] border-b border-black">
                        <span className="p-1 pl-2 border-r border-black font-semibold">Revision No.</span>
                        <span className="p-1 text-center">{config.revisionNo}</span>
                    </div>
                    <div className="grid grid-cols-[1fr_70px]">
                        <span className="p-1 pl-2 border-r border-black font-semibold">Next Revision:</span>
                        <span className="p-1 text-center">{config.nextRevisionDate || 'N/A'}</span>
                    </div>
                </div>
            </div>
            <div className="mt-1 border border-black p-1 text-[8px] font-bold text-center">
                Doc No: {config.docNo}
            </div>
        </div>
    );
};
