import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import {
    Download, Printer, FileText, ShieldAlert, Calendar, Search,
    ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Eye, Send,
    FileSearch, X, CheckCircle, AlertCircle, Info, ImageOff, Copy, Check, Loader2
} from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import { generatePatientPDF } from '../services/pdfGenerator';
import WSIImage from '../components/WSIImage';

const isCancerDiagnosis = (p) => {
    if (!p) return false;
    const diagnosis = p.ai_diagnosis || p.prediction_result || p.aiDiagnosis || '';
    const d = String(diagnosis).toLowerCase();
    return d.includes('cancer') && !d.includes('no cancer');
}

const getStatusStyle = (diagnosis) => {
    const isCancer = (d) => {
        if (!d) return false
        const s = String(d).toLowerCase()
        return s.includes('cancer') && !s.includes('no cancer')
    }
    
    if (isCancer(diagnosis)) {
        return { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-500' };
    }
    return { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500' };
}

const DOC_COLORS = ['bg-blue-600', 'bg-purple-600', 'bg-emerald-600', 'bg-rose-600'];
const getDocColor = (name) => {
    if (!name) return DOC_COLORS[0];
    return DOC_COLORS[name.length % DOC_COLORS.length];
};
const getInitials = (name) => {
    if (!name) return '?';
    return name.replace('Dr. ', '').split(' ').map(n => n?.[0] || '').join('').toUpperCase();
};

const formatTime = (ts) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return 'N/A';
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000 && d.getDate() === now.getDate()) return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (diff < 172800000 && d.getDate() === now.getDate() - 1) return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return d.toLocaleDateString('en-GB'); // DD/MM/YYYY
};

export default function ReportsPage() {
    const { patients } = usePatients();

    const reports = useMemo(() =>
        [...patients]
            .sort((a, b) => new Date(b.createdAt || b.created_at || b.date || 0) - new Date(a.createdAt || a.created_at || a.date || 0))
            .map(p => ({
                id: p.id || p.dbId || Math.random(),
                reportId: p.reportId || p.report_id || 'N/A',
                clinicalId: p.patient_id || 'N/A',
                patientName: p.full_name || 'Unknown Patient',
                age: p.age || 0,
                gender: p.gender || '-',
                smokingHistory: p.smokingHistory || p.smoking_history || '-',
                scanDate: p.date || p.scan_date || p.diagnosis_date || new Date().toISOString().split('T')[0],
                diagnosis: isCancerDiagnosis(p) ? 'Cancer Detected' : 'Benign',
                category: "Full Diagnostic",
                pathologist: p.attendingPathologist || p.pathologist_name || 'System User',
                hospital: p.hospitalNetwork || p.hospital || p.hospital_name || 'Unknown Hospital',
                generatedOn: p.createdAt || p.created_at || p.date || new Date().toISOString(),
                size: '1.2 MB',
                specimenType: p.specimenType || p.specimen_type || '-',
                clinicalHistory: p.clinical_history || p.clinicalHistory || '',
                notes: p.notes || '',
                uploadedImage: p.uploaded_image || p.uploadedImage || p.uploaded_image_path || p.image_path || '',
                slideRefId: p.slideRefId || p.slide_ref_id || '',
                subtype: p.subtype || '',
                subtype_confidence: p.subtype_confidence || 0,
                survival_probability: p.survival_probability || 0,
                survival_months: p.survival_months || 0,
                risk_category: p.risk_category || '',
            }))
        , [patients]);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterDiag, setFilterDiag] = useState('All Diagnoses');
    const [filterTime, setFilterTime] = useState('All History');

    const [sortKey, setSortKey] = useState('generatedOn');
    const [sortDir, setSortDir] = useState('desc');

    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    const [showExportMenu, setShowExportMenu] = useState(false);
    const [previewReport, setPreviewReport] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);

    const [toasts, setToasts] = useState([]);

    const addToast = React.useCallback((msg, type) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    }, []);

    const handlePrintAll = () => {
        window.print();
    };

    const handleExportZip = () => {
        setShowExportMenu(false);
        addToast(`Downloading ${filteredReports.length} clinical reports...`, 'info');

        filteredReports.forEach((report, index) => {
            setTimeout(() => {
                const fullRecord = patients.find(p => p.reportId === report.reportId);
                generatePatientPDF(fullRecord || {
                    ...report,
                    date: report.scanDate,
                    attendingPathologist: report.pathologist,
                    hospitalNetwork: report.hospital,
                    aiDiagnosis: report.diagnosis,
                    createdAt: report.generatedOn
                });
                if (index === filteredReports.length - 1) {
                    addToast('All reports downloaded', 'success');
                }
            }, index * 800);
        });
    };

    const handleExportCSV = () => {
        setShowExportMenu(false);
        const header = "Report ID,Patient Name,Scan Date,Diagnosis,Category,Subtype,Subtype Conf,Survival Prob,Est. Survival (Months),Risk Category,Pathologist,Generated On\n";
        const body = filteredReports.map(r =>
            `${r.reportId},"${r.patientName}",${r.scanDate.split('-').reverse().join('/')},"${r.diagnosis}","${r.category}","${r.subtype || ''}","${r.subtype_confidence ? r.subtype_confidence + '%' : ''}","${r.survival_probability ? r.survival_probability + '%' : ''}","${r.survival_months || ''}","${r.risk_category || ''}","${r.pathologist}","${formatTime(r.generatedOn)}"`
        ).join("\n");
        const uri = encodeURI("data:text/csv;charset=utf-8," + header + body);
        const link = document.createElement("a");
        link.href = uri; link.download = "reports_summary.csv";
        document.body.appendChild(link); link.click(); link.remove();
    };

    const downloadSinglePDF = (e, report) => {
        e.stopPropagation();
        setDownloadingId(report.reportId);
        setTimeout(() => {
            const fullRecord = patients.find(p => p.reportId === report.reportId);
            generatePatientPDF(fullRecord || {
                ...report,
                date: report.scanDate,
                attendingPathologist: report.pathologist,
                hospitalNetwork: report.hospital,
                aiDiagnosis: report.diagnosis,
                createdAt: report.generatedOn
            });
            addToast(`Report for ${report.patientName} downloaded successfully`, 'success');
            setDownloadingId(null);
        }, 800);
    };

    const stats = useMemo(() => {
        const now = new Date();
        const thisMonthCases = reports.filter(r => {
            const d = new Date(r.generatedOn);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const isCancer = (diag) => {
            const d = String(diag || '').toLowerCase();
            return (d.includes('cancer') || d.includes('malignant')) && !d.includes('no cancer');
        };

        return {
            total: reports.length,
            cancer: reports.filter(r => isCancer(r.diagnosis)).length,
            thisMonth: thisMonthCases.length
        };
    }, [reports]);

    const filteredReports = useMemo(() => {
        return reports.filter(r => {
            if (searchQuery && r.patientName && !r.patientName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (filterDiag !== 'All Diagnoses' && r.diagnosis !== filterDiag) return false;

            if (filterTime !== 'All History') {
                const d = new Date(r.generatedOn);
                const now = new Date();
                const diffDays = (now - d) / 86400000;
                if (filterTime === 'Today' && (diffDays > 1 || d.getDate() !== now.getDate())) return false;
                if (filterTime === 'This Week' && diffDays > 7) return false;
                if (filterTime === 'This Month' && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return false;
                if (filterTime === 'Last 3 Months' && diffDays > 90) return false;
            }
            return true;
        });
    }, [reports, searchQuery, filterDiag, filterTime]);

    const sortedReports = useMemo(() => {
        return [...filteredReports].sort((a, b) => {
            let aVal = a[sortKey]; let bVal = b[sortKey];
            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredReports, sortKey, sortDir]);

    const paginatedReports = useMemo(() => {
        const s = (page - 1) * itemsPerPage;
        return sortedReports.slice(s, s + itemsPerPage);
    }, [sortedReports, page]);

    const totalPages = Math.ceil(sortedReports.length / itemsPerPage);



    const isFiltered = searchQuery || filterDiag !== 'All Diagnoses' || filterTime !== 'All History';

    const handleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
    };

    return (
        <div className="min-h-screen bg-[color:var(--bg-primary)] text-[color:var(--text-primary)] p-8 font-sans pb-24 print:bg-white print:text-black print:p-0">

            {/* SECTION 1: HEADER */}
            <div className="flex justify-between items-start mb-8 print:hidden">
                <div>
                    <h1 className="text-[28px] font-bold text-[color:var(--text-primary)] leading-tight">Diagnostic Reports</h1>
                    <p className="text-[color:var(--text-muted)]">Formal clinical analysis reports for patient records and interdepartmental sharing.</p>
                </div>
                <div className="flex gap-3 relative">
                    <button onClick={handlePrintAll} className="flex items-center gap-2 px-4 py-2 border border-[color:var(--border-subtle)] text-[color:var(--text-primary)] rounded-md hover:bg-[color:var(--bg-surface-alt)] transition-colors text-sm font-medium">
                        <Printer size={16} /> Print All
                    </button>

                    <div>
                        <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex items-center gap-2 px-4 py-2 bg-[color:var(--accent-teal)] text-black rounded-md hover:bg-[#00cbb2] transition-colors text-sm font-medium">
                            <Download size={16} /> Batch Export All
                        </button>
                        {showExportMenu && (
                            <div className="absolute right-0 top-12 w-56 bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] rounded-md shadow-xl py-1 z-20">
                                <button onClick={handleExportZip} className="w-full text-left px-4 py-2 text-sm text-[color:var(--text-primary)] hover:bg-[color:var(--bg-surface-alt)] transition-colors">Export All as ZIP (PDF files)</button>
                                <button onClick={handleExportCSV} className="w-full text-left px-4 py-2 text-sm text-[color:var(--text-primary)] hover:bg-[color:var(--bg-surface-alt)] transition-colors">Export Summary as CSV</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* SECTION 2: STATS */}
            <div className="grid grid-cols-3 gap-4 mb-8 print:hidden">
                {[
                    { label: 'TOTAL REPORTS', val: stats.total, icon: FileText, color: 'text-[color:var(--text-primary)]' },
                    { label: 'CANCER DETECTED REPORTS', val: stats.cancer, icon: ShieldAlert, color: 'text-[#f85149]' },
                    { label: 'REPORTS THIS MONTH', val: stats.thisMonth, icon: Calendar, color: 'text-[color:var(--accent-teal)]' },
                ].map((s, i) => (
                    <div key={i} className="bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] rounded-lg p-5 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-[color:var(--text-muted)] mb-1 tracking-wider">{s.label}</p>
                            <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                        </div>
                        <s.icon size={24} className={s.color} />
                    </div>
                ))}
            </div>

            {/* SECTION 3: SEARCH & FILTER */}
            <div className="flex items-start justify-between mb-4 print:hidden">
                <div className="w-[60%]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" size={18} />
                        <input
                            type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                            placeholder="Search by patient name..."
                            className="w-full bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] text-[color:var(--text-primary)] rounded-md pl-10 pr-4 py-2 text-sm outline-none focus:border-[#00e5cc] transition-colors"
                        />
                    </div>
                    {searchQuery && <p className="text-[color:var(--text-muted)] text-[12px] mt-1.5 ml-1">{filteredReports.length} results found</p>}
                </div>

                <div className="flex items-center gap-3">
                    <select value={filterDiag} onChange={e => { setFilterDiag(e.target.value); setPage(1); }} className="bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] text-[color:var(--text-primary)] text-sm rounded-md px-3 py-2 focus:border-[#00e5cc] outline-none">
                        {['All Diagnoses', 'Cancer Detected', 'Benign'].map(o => <option key={o}>{o}</option>)}
                    </select>
                    <select value={filterTime} onChange={e => { setFilterTime(e.target.value); setPage(1); }} className="bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] text-[color:var(--text-primary)] text-sm rounded-md px-3 py-2 focus:border-[#00e5cc] outline-none">
                        {['All History', 'Today', 'This Week', 'This Month', 'Last 3 Months'].map(o => <option key={o}>{o}</option>)}
                    </select>
                    {isFiltered && (
                        <button onClick={() => { setSearchQuery(''); setFilterDiag('All Diagnoses'); setFilterTime('All History'); setPage(1); }} className="text-[color:var(--accent-teal)] hover:text-[#00cbb2] text-sm ml-2 underline underline-offset-2">
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* SECTION 4: TABLE */}
            <div className="bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] rounded-lg overflow-hidden flex flex-col print:border-none print:shadow-none">

                {/* Print Header (Only visible when printing) */}
                <div className="hidden print:block p-8 border-b border-black text-center mb-8">
                    <h1 className="text-2xl font-bold uppercase mb-2">Diagnostic Reports Register</h1>
                    <p className="text-gray-600">Generated on {new Date().toLocaleDateString()}</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px] print:text-sm">
                        <thead>
                            <tr className="border-b border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] print:bg-gray-100 print:text-black">
                                {[{ key: 'patientName', label: 'PATIENT INFO' }, { key: 'scanDate', label: 'SCAN DATE', sort: true }, { key: 'diagnosis', label: 'DIAGNOSIS' }, { key: 'category', label: 'CATEGORY' }, { key: 'pathologist', label: 'PATHOLOGIST' }, { key: 'generatedOn', label: 'GENERATED ON', sort: true }].map(col => (
                                    <th key={col.key} onClick={() => col.sort && handleSort(col.key)} className={`p-4 text-xs font-semibold text-[color:var(--text-muted)] uppercase tracking-wider print:text-black print:font-bold ${col.sort ? 'cursor-pointer hover:text-[color:var(--text-primary)] transition-colors' : ''}`}>
                                        <div className="flex items-center gap-1">
                                            {col.label}
                                            {col.sort && sortKey === col.key && (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                        </div>
                                    </th>
                                ))}
                                <th className="p-4 text-right text-xs font-semibold text-[color:var(--text-muted)] uppercase tracking-wider pr-6 print:hidden">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#21262d] print:divide-gray-300">
                            {paginatedReports.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-16">
                                        <div className="flex flex-col items-center justify-center text-[color:var(--text-muted)]">
                                            <FileSearch size={48} className="mb-4 opacity-50" />
                                            <p className="text-lg text-[color:var(--text-primary)] font-medium mb-1">No reports found</p>
                                            <p className="text-sm mb-4">Try adjusting your search or filters</p>
                                            {isFiltered && <button onClick={() => { setSearchQuery(''); setFilterDiag('All Diagnoses'); setFilterTime('All History'); setPage(1); }} className="px-4 py-2 border border-[#00e5cc] text-[color:var(--accent-teal)] rounded hover:bg-[color:var(--accent-teal)]/10 transition-colors text-sm font-medium">Clear Filters</button>}
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedReports.map(r => (
                                <tr key={r.id} onClick={() => setPreviewReport(r)} className="hover:bg-[color:var(--bg-surface-alt)] transition-colors cursor-pointer print:hover:bg-transparent">
                                    <td className="p-4">
                                        <div className="font-bold text-[14px] text-[color:var(--text-primary)] print:text-black">{r.patientName}</div>
                                        <div className="text-[12px] text-[color:var(--accent-teal)] mt-0.5 print:text-gray-600 hover:underline" onClick={(e) => e.stopPropagation()}>{r.clinicalId}</div>
                                    </td>
                                    <td className="p-4 text-[13px] text-[color:var(--text-muted)] print:text-black">{r.scanDate ? r.scanDate.split('-').reverse().join('/') : '-'}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-md text-[10px] font-bold border ${getStatusStyle(r.diagnosis).bg}/10 ${getStatusStyle(r.diagnosis).text} ${getStatusStyle(r.diagnosis).border}/20 print:border-none print:bg-transparent print:p-0`}>
                                            {r.diagnosis === 'Cancer Detected' ? <ShieldAlert size={12} className="inline mr-1 mb-0.5" /> : <CheckCircle size={12} className="inline mr-1 mb-0.5" />}
                                            {r.diagnosis.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2.5 py-1 rounded-[4px] text-[11px] font-medium border border-[#8b949e]/40 text-[color:var(--text-primary)] print:text-black print:border-none print:p-0" title={r.category === 'Full Diagnostic' ? 'Complete AI analysis with tissue classification and staging' : r.category === 'Subtype Only' ? 'Cancer subtype classification only, no staging included' : r.category === 'Follow-Up' ? 'Comparative report against previous scan' : 'Initial screening result, no deep analysis'}>
                                            {r.category}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-[color:var(--text-primary)] ${getDocColor(r.pathologist)} print:hidden`}>{getInitials(r.pathologist)}</div>
                                            <span className="text-[13px] text-[color:var(--text-muted)] print:text-black">{r.pathologist}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-[13px] text-[color:var(--text-muted)]" title={r.generatedOn && !isNaN(new Date(r.generatedOn).getTime()) ? new Date(r.generatedOn).toLocaleString() : 'N/A'}>{formatTime(r.generatedOn)}</td>
                                    <td className="p-4 text-right pr-6 print:hidden">
                                        <div className="flex items-center justify-end gap-3">
                                            <button onClick={(e) => { e.stopPropagation(); setPreviewReport(r); }} className="text-[color:var(--text-muted)] hover:text-[color:var(--accent-teal)] p-1" title="Preview Report"><Eye size={18} /></button>
                                            <button onClick={(e) => downloadSinglePDF(e, r)} className="text-[color:var(--text-muted)] hover:text-[color:var(--accent-teal)] p-1" title="Download PDF">
                                                {downloadingId === r.reportId ? <Loader2 size={18} className="animate-spin text-[color:var(--accent-teal)]" /> : <Download size={18} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION */}
                <div className="flex items-center justify-between p-4 border-t border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] print:hidden">
                    <span className="text-sm text-[color:var(--text-muted)]">Showing {Math.min((page - 1) * itemsPerPage + 1, sortedReports.length || 0)}–{Math.min(page * itemsPerPage, sortedReports.length)} of {sortedReports.length} reports</span>
                    <div className="flex gap-1">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] disabled:opacity-50 flex items-center gap-1"><ChevronLeft size={16} /> Prev</button>
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${page === i + 1 ? 'bg-[color:var(--accent-teal)] text-black' : 'text-[color:var(--text-primary)] border border-[color:var(--border-subtle)] hover:bg-[color:var(--bg-surface-alt)]'}`}>{i + 1}</button>
                        ))}
                        <button disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] disabled:opacity-50 flex items-center gap-1">Next <ChevronRight size={16} /></button>
                    </div>
                </div>
            </div>

            {/* SECTION 5: REPORT PREVIEW MODAL */}
            <AnimatePresence>
                {previewReport && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-6 print:hidden">
                        <motion.div initial={{ scale: 0.98, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.98, y: 10 }} className="bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] rounded-xl w-full max-w-[800px] h-full max-h-[90vh] flex flex-col shadow-2xl">

                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-[color:var(--border-subtle)]">
                                <div>
                                    <h2 className="text-2xl font-bold text-[color:var(--text-primary)] mb-1">Diagnostic Report</h2>
                                    <div className="text-[13px] text-[color:var(--accent-teal)] font-medium">{previewReport.reportId}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={(e) => downloadSinglePDF(e, previewReport)} className="flex items-center gap-2 bg-[color:var(--accent-teal)] text-black px-4 py-2 rounded-md hover:bg-[#00cbb2] transition-colors text-sm font-bold">
                                        {downloadingId === previewReport.reportId ? <><Loader2 size={16} className="animate-spin" /> Downloading...</> : <><Download size={16} /> Download PDF</>}
                                    </button>
                                    <button onClick={() => setPreviewReport(null)} className="text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] ml-2"><X size={24} /></button>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[color:var(--bg-primary)]">

                                {/* SECTION A */}
                                <div className="grid grid-cols-2 gap-8 pt-2">
                                    <div className="space-y-4">
                                        <div><span className="text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider block mb-1">PATIENT NAME</span><div className="text-base text-[color:var(--text-primary)] font-medium">{previewReport.patientName}</div></div>
                                        <div><span className="text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider block mb-1">CLINICAL ID</span><div className="text-sm text-[color:var(--accent-teal)]">{previewReport.clinicalId}</div></div>
                                        <div><span className="text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider block mb-1">AGE / GENDER</span><div className="text-sm text-[color:var(--text-primary)]">{previewReport.age} yrs • {previewReport.gender}</div></div>
                                        <div><span className="text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider block mb-1">SMOKING</span><div className="text-sm text-[color:var(--text-primary)]">{previewReport.smokingHistory === 'Yes' ? 'Smoker' : 'Non-Smoker'}</div></div>
                                    </div>
                                    <div className="space-y-4">
                                        <div><span className="text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider block mb-1">SCAN DATE</span><div className="text-sm text-[color:var(--text-primary)]">{previewReport.scanDate ? previewReport.scanDate.split('-').reverse().join('/') : '-'}</div></div>
                                        <div><span className="text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider block mb-1">GENERATED ON</span><div className="text-sm text-[color:var(--text-primary)]">{previewReport.generatedOn && !isNaN(new Date(previewReport.generatedOn).getTime()) ? new Date(previewReport.generatedOn).toLocaleString() : 'N/A'}</div></div>
                                        <div><span className="text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider block mb-1">PATHOLOGIST</span><div className="text-sm text-[color:var(--text-primary)]">{previewReport.pathologist}</div></div>
                                        <div><span className="text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider block mb-1">HOSPITAL</span><div className="text-sm text-[color:var(--text-primary)]">{previewReport.hospital}</div></div>
                                    </div>
                                </div>

                                <hr className="border-[color:var(--border-subtle)]" />

                                {/* SECTION B */}
                                <div className="text-center py-4">
                                    <span className={`inline-block px-4 py-2 rounded-md text-[16px] font-bold border ${getStatusStyle(previewReport.diagnosis).bg}/10 ${getStatusStyle(previewReport.diagnosis).text} ${getStatusStyle(previewReport.diagnosis).border}/20 mb-6`}>
                                        {previewReport.diagnosis === 'Cancer Detected' ? <ShieldAlert size={18} className="inline mr-2 mb-1" /> : <CheckCircle size={18} className="inline mr-2 mb-1" />}
                                        {previewReport.diagnosis.toUpperCase()}
                                    </span>
                                    <div className="flex justify-center">
                                        <span className="px-3 py-1 rounded-md text-[12px] font-medium border border-[#8b949e]/20 text-[color:var(--text-muted)]">{previewReport.category.toUpperCase()}</span>
                                    </div>
                                </div>

                                <hr className="border-[color:var(--border-subtle)]" />

                                {/* SECTION C */}
                                <div>
                                    <div className="text-[11px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider mb-3">HISTOPATHOLOGY SLIDE</div>
                                    <div className="w-full h-[200px] rounded-lg flex flex-col items-center justify-center text-[color:var(--text-muted)] bg-[color:var(--bg-surface)]">
                                        <WSIImage uploadedImagePath={previewReport.uploadedImage} />
                                    </div>
                                </div>

                                {/* SECTION D */}
                                <div>
                                    <div className="text-[11px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider mb-3">CLINICAL FINDINGS</div>
                                    <div className="bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] rounded-lg p-5 text-[15px] leading-relaxed text-[color:var(--text-primary)]">
                                        {previewReport.clinicalHistory || (getStatusStyle(previewReport.diagnosis).bg === 'bg-[#f85149]' ?
                                            "Tissue sample analysis requested based on patient symptoms. See details in diagnostic registry."
                                            :
                                            "Routine screening/biopsy analysis. No significant pre-diagnostic findings reported.")
                                        }
                                    </div>
                                </div>

                                {/* SECTION E */}
                                <div>
                                    <div className="text-[11px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider mb-3">PATHOLOGIST NOTES</div>
                                    <div className="bg-[color:var(--bg-surface)]/50 border border-[color:var(--border-subtle)] rounded-lg p-5 text-[15px] leading-relaxed text-[color:var(--text-muted)] font-mono whitespace-pre-line">
                                        {previewReport.notes || "No additional pathologist observations recorded for this report."}
                                    </div>
                                </div>

                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] flex justify-between">
                                <button onClick={handlePrintAll} className="px-5 py-2 border border-[color:var(--border-subtle)] text-[color:var(--text-primary)] rounded-md hover:bg-[color:var(--bg-surface-alt)] transition-colors text-sm font-medium flex items-center gap-2"><Printer size={16} /> Print Report</button>
                                <button onClick={() => setPreviewReport(null)} className="px-6 py-2 bg-[color:var(--accent-teal)] text-black rounded-md hover:bg-[#00cbb2] transition-colors text-sm font-bold">Close</button>
                            </div>

                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SECTION 7: TOAST NOTIFICATIONS */}
            <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div key={t.id} initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }} className={`pointer-events-auto bg-[#1c2128] border border-[color:var(--border-subtle)] border-l-4 rounded-lg shadow-xl px-5 py-3 flex items-center gap-3 min-w-[280px] ${t.type === 'success' ? 'border-l-[#3fb950]' : t.type === 'error' ? 'border-l-[#f85149]' : 'border-l-[#00e5cc]'}`}>
                            {t.type === 'success' ? <CheckCircle size={18} className="text-[#3fb950]" /> : t.type === 'error' ? <AlertCircle size={18} className="text-[#f85149]" /> : <Info size={18} className="text-[color:var(--accent-teal)]" />}
                            <span className="text-[14px] text-[color:var(--text-primary)] font-medium">{t.msg}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

        </div>
    );
}

