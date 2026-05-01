import React from 'react';
import { InspectionData, SystemSettings, InspectionStatus } from '../../types';
import { PETROLEUM_INSPECTION_ITEMS } from '../../constants';

const PrintablePetroleumReport: React.FC<{data: InspectionData, settings: SystemSettings}> = ({data, settings}) => {
    const config = settings.templates?.petroleum || {
        title: 'PETROLEUM TANKER CHECKLIST',
        docNo: 'MNT-F-002',
        revisionNo: '05',
        revisionDate: '01/02/2024',
        initialIssueDate: '03/02/2017',
        nextRevisionDate: '12/04/2026'
    };
    const logoUrl = settings.companyLogo || "https://www.juba-transport.com/wp-content/uploads/2019/08/juba-logo-sgs.png";
    const dateStr = new Date(data.timestamp).toLocaleString('en-GB');

    return (
        <div className="max-w-[210mm] mx-auto text-sm leading-tight text-gray-900 font-sans p-[10mm] bg-white min-h-[297mm] flex flex-col box-border">
            {/* Header Table - No Background Colors */}
            <table className="w-full border-collapse border-2 border-black mb-4">
                <tbody>
                    <tr>
                        <td className="border-2 border-black p-0 w-[180px]">
                            <table className="w-full border-collapse text-[9px]">
                                <tbody>
                                    <tr className="border-b border-black">
                                        <td className="p-1 pl-2 border-r border-black font-semibold">Initial Issue Date</td>
                                        <td className="p-1 text-center">{config.initialIssueDate}</td>
                                    </tr>
                                    <tr className="border-b border-black">
                                        <td className="p-1 pl-2 border-r border-black font-semibold">Revision Date:</td>
                                        <td className="p-1 text-center">{config.revisionDate}</td>
                                    </tr>
                                    <tr className="border-b border-black">
                                        <td className="p-1 pl-2 border-r border-black font-semibold">Revision No.</td>
                                        <td className="p-1 text-center">{config.revisionNo}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-1 pl-2 border-r border-black font-semibold">Next Revision:</td>
                                        <td className="p-1 text-center">{config.nextRevisionDate}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                        <td className="border-2 border-black p-0">
                            <table className="w-full border-collapse h-full">
                                <tbody>
                                    <tr><td className="border-b-2 border-black px-2 py-1 text-[10px] font-bold">Doc No: {config.docNo}</td></tr>
                                    <tr><td className="text-center py-4"><h1 className="text-lg font-black uppercase tracking-wider">{config.title}</h1></td></tr>
                                </tbody>
                            </table>
                        </td>
                        <td className="border-2 border-black p-2 text-center align-middle w-[120px]">
                             <img src={logoUrl} alt="Logo" className="w-20 object-contain mx-auto" />
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Asset Metadata - Removed bg-gray-50 */}
            <div className="bg-white p-4 border-2 border-black mb-4">
                <table className="w-full text-xs font-mono">
                    <tbody>
                        <tr>
                            <td className="py-1">TRUCK #: <span className="font-bold">{data.truckNo || 'N/A'}</span></td>
                            <td className="py-1">TRAILER #: <span className="font-bold">{data.trailerNo || 'N/A'}</span></td>
                        </tr>
                        <tr>
                            <td className="py-1">JOB CARD #: <span className="font-bold">{data.jobCard || 'N/A'}</span></td>
                            <td className="py-1">DATE/TIME: <span className="font-bold">{dateStr}</span></td>
                        </tr>
                        <tr>
                            <td className="py-1">ODOMETER: <span className="font-bold">{data.odometer || '0'} km</span></td>
                            <td className="py-1">LOCATION: <span className="font-bold">{data.location || 'N/A'}</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Main Checklist Table - Removed bg-gray-200 and alternate bg colors */}
            <table className="w-full border-collapse border-2 border-black text-[9px] flex-1">
                <thead>
                    <tr className="font-bold text-center border-b-2 border-black bg-white">
                        <td className="border-r border-black w-8 py-1.5">No.</td>
                        <td className="border-r border-black text-left pl-2">ITEM DESCRIPTION</td>
                        <td className="border-r border-black w-10">Good</td>
                        <td className="border-r border-black w-10">Attn</td>
                        <td className="border-r border-black w-10">Crit</td>
                        <td className="pl-2 text-left">COMMENTS</td>
                    </tr>
                </thead>
                <tbody>
                    {PETROLEUM_INSPECTION_ITEMS.map((item, idx) => {
                        const status = data[item.id];
                        const isGood = status === InspectionStatus.GOOD;
                        const isAttn = status === InspectionStatus.ATTENTION;
                        const isBad = status === InspectionStatus.BAD;
                        const splitLabel = item.label.split('. ');
                        const number = splitLabel[0];
                        const text = splitLabel.slice(1).join('. ');

                        return (
                            <tr key={item.id} className="border-b border-black bg-white">
                                <td className="border-r border-black text-center py-1 font-bold">{number}</td>
                                <td className="border-r border-black pl-2 py-1 leading-tight">{text}</td>
                                <td className="border-r border-black text-center font-bold text-green-600">{isGood ? '✓' : ''}</td>
                                <td className="border-r border-black text-center font-bold text-amber-600">{isAttn ? '!' : ''}</td>
                                <td className="border-r border-black text-center font-bold text-red-600">{isBad ? 'X' : ''}</td>
                                <td className="pl-2 py-1 italic text-gray-500 text-[8px]">{isBad ? 'CRITICAL FAULT' : ''}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Decision Section - Removed background colors */}
            <div className="mt-4 space-y-2 break-inside-avoid">
                <table className="w-full border-collapse border-2 border-black">
                    <tbody>
                        <tr>
                            <td className="border-r-2 border-black p-2 font-bold uppercase text-[9px] bg-white w-1/4 text-center">Safe to Load Status</td>
                            <td className={`p-2 font-black text-center text-sm bg-white ${data.safeToLoad === 'Yes' ? 'text-green-700' : 'text-red-700'}`}>
                                {data.safeToLoad?.toUpperCase() || 'NOT SPECIFIED'}
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div className="border-2 border-black p-2 min-h-[50px] text-xs bg-white">
                    <span className="font-bold uppercase text-[9px]">Inspector Remarks:</span>
                    <p className="mt-1 italic">{data.remarks || 'ok'}</p>
                </div>
            </div>

            {/* Signatures - Removed backgrounds */}
            <table className="w-full mt-auto pt-4 border-t-2 border-black break-inside-avoid">
                <tbody>
                    <tr>
                        <td className="w-1/2 pr-6">
                            <div className="flex justify-between border-b border-black pb-0.5 text-[10px]">
                                <span className="font-bold text-gray-500 uppercase tracking-widest text-[8px]">Inspector:</span>
                                <span className="font-black uppercase">{data.inspectedBy || 'N/A'}</span>
                            </div>
                            <div className="h-16 flex items-center justify-center border-b border-black mt-2 bg-white">
                                {data.inspectorSignature && <img src={data.inspectorSignature} className="max-h-14 object-contain" alt="Inspector Sig" />}
                            </div>
                            <p className="text-center font-bold uppercase text-[8px] mt-1 text-gray-400">Official Signature</p>
                        </td>
                        <td className="w-1/2 pl-6">
                            <div className="flex justify-between border-b border-black pb-0.5 text-[10px]">
                                <span className="font-bold text-gray-500 uppercase tracking-widest text-[8px]">Driver:</span>
                                <span className="font-black uppercase">{data.driverName || 'N/A'}</span>
                            </div>
                            <div className="h-16 flex items-center justify-center border-b border-black mt-2 bg-white">
                                {data.driverSignature && <img src={data.driverSignature} className="max-h-14 object-contain" alt="Driver Sig" />}
                            </div>
                            <p className="text-center font-bold uppercase text-[8px] mt-1 text-gray-400">Driver Acknowledgement</p>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

export default PrintablePetroleumReport;