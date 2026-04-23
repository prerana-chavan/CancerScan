import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import {
    Download, FileText, Users, ShieldAlert, ShieldCheck, BarChart2,
    AlertTriangle, ExternalLink, Trash2, Calendar, ChevronDown, ChevronUp, ImageOff,
    X, ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { usePatients } from '../context/PatientContext';
import { generatePatientPDF } from '../services/pdfGenerator';
import WSIImage from '../components/WSIImage';

// REMOVED local MOCK_DATA as per synchronization requirement

const STATUS_OPTIONS = [
    { label: 'Cancer Detected', color: 'bg-[#f85149]', text: 'text-[#f85149]', border: 'border-[#f85149]' },
    { label: 'Benign', color: 'bg-[#3fb950]', text: 'text-[#3fb950]', border: 'border-[#3fb950]' },
];

const getStatusStyle = (diagnosis) => {
    const isCancer = (d) => {
        if (!d) return false;
        const s = String(d).toLowerCase();
        return s.includes('cancer') && !s.includes('no cancer');
    };
    
    if (isCancer(diagnosis)) {
        return "bg-red-500/10 text-red-500 border-red-500/20";
    }
    return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
};

const getProbColor = (prob, status) => {
    const isCancer = status === 'Cancer Detected';
    if (!isCancer) {
        // High confidence in Benign is good
        if (prob > 70) return 'text-[#3fb950]'; // Green
        if (prob >= 50) return 'text-[#e3b341]'; // Yellow
        return 'text-[#f85149]'; // Red (low confidence in benign)
    } else {
        // High confidence in Cancer is bad
        if (prob > 70) return 'text-[#f85149]'; // Red
        if (prob >= 50) return 'text-[#e3b341]'; // Yellow
        return 'text-[#3fb950]'; // Green (low confidence in cancer)
    }
};

export default function PatientRecordsPage() {
    const { patients, isLoading, deletePatient, updateReviewStatus, updateNotes, mergePatients, fetchPatients, deleteAllPatients } = usePatients();
    const [selectedIds, setSelectedIds] = useState(new Set());
    const location = useLocation();

    const [clearing, setClearing] = useState(false);

    const handleClearAll = async () => {
        const confirmed = window.confirm(
            `Delete ALL ${patients.length} patient records?\n\n` +
            `This cannot be undone.`
        );
        if (!confirmed) return;

        setClearing(true);
        try {
            await deleteAllPatients();
            alert('All records deleted successfully.');
        } catch (err) {
            alert(`Failed to delete: ${err.message}`);
        } finally {
            setClearing(false);
        }
    };

    // The component expects "records" in a specific format (name instead of patientName, id instead of clinicalId etc)
    const records = useMemo(() => {
        return patients.map(p => {
            const diagStr = p.ai_diagnosis || p.prediction_result || p.aiDiagnosis || 'Unknown';
            
            const isCancer = (d) => {
                if (!d) return false;
                const s = String(d).toLowerCase();
                return s.includes('cancer') && !s.includes('no cancer');
            }
            const displayStatus = isCancer(diagStr) ? 'Cancer Detected' : 'Benign';

            return {
                id: p.patient_id || 'N/A',
                patient_id: p.patient_id,
                dbId: p.dbId || p.id,
                name: p.full_name || 'Unknown Patient',
                age: p.age || 0,
                gender: p.gender || '-',
                date: p.date || p.scan_date || p.diagnosis_date || new Date().toISOString().split('T')[0],
                smoking: p.smokingHistory || p.smoking_history || '-',
                hospital: p.hospitalNetwork || p.hospital || p.hospital_name || '-',
                pathologist: p.attending_pathologist || p.attendingPathologist || p.pathologist_name || '-',
                aiDiagnosis: diagStr,
                status: displayStatus,
                probability: p.probability !== undefined ? p.probability : (p.prediction_probability !== undefined ? p.prediction_probability : 0),
                notes: p.notes || '',
                uploadedImage: p.uploadedImage || p.uploaded_image || p.uploaded_image_path || p.image_path || null,
                reviewStatus: p.reviewStatus || p.status || p.status_stage || 'Pending Review',
                createdAt: p.createdAt || p.created_at || p.date || p.scan_date,
                specimen: p.specimenType || p.specimen_type || 'Lung Tissue',
                referral: p.referralSource || p.referral || 'Unknown',
                subtype: p.subtype || null,
                subtype_confidence: p.subtype_confidence || 0,
                survival_probability: p.survival_probability || 0,
                survival_months: p.survival_months || 0,
                risk_category: p.risk_category || null,
            };
        });
    }, [patients]);

    // Filters
    const [filterDiag, setFilterDiag] = useState('All');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Sort
    const [sortKey, setSortKey] = useState('date');
    const [sortDir, setSortDir] = useState('desc');

    // Pagination
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    // Helper for sorting dates
    const parseDateToTimestamp = (dateStr) => {
        if (!dateStr) return 0;
        // DD/MM/YYYY
        if (typeof dateStr === 'string' && dateStr.includes('/')) {
            const [d, m, y] = dateStr.split('/');
            return new Date(`${y}-${m}-${d}`).getTime();
        }
        // YYYY-MM-DD or ISO
        return new Date(dateStr).getTime();
    };

    // UI State
    const [quickViewId, setQuickViewId] = useState(null);
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [mergeGroupFilter, setMergeGroupFilter] = useState(null);


    // Stats — always from full patients array, not filtered:
    const stats = useMemo(() => {
        return {
            total: records.length,
            cancer: records.filter(r => r.status === 'Cancer Detected').length,
            benign: records.filter(r => r.status === 'Benign').length
        }
    }, [records]);

    // Duplicate detection
    const duplicateGroups = useMemo(() => {
        const groupsMap = new Map();
        records.forEach(r => {
            const key = `${r.name}|${r.age}|${r.gender}|${r.date}`;
            if (!groupsMap.has(key)) groupsMap.set(key, []);
            groupsMap.get(key).push(r);
        });
        return Array.from(groupsMap.values()).filter(g => g.length > 1);
    }, [records]);

    const duplicatesByRecordId = useMemo(() => {
        const map = new Map();
        duplicateGroups.forEach((group) => {
            group.forEach(r => map.set(r.id, group));
        });
        return map;
    }, [duplicateGroups]);

    // Filtering
    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            if (filterDiag === 'Cancer Detected' && r.status !== 'Cancer Detected') return false;
            if (filterDiag === 'Benign' && r.status !== 'Benign') return false;
            if (dateFrom && r.date < dateFrom) return false;
            if (dateTo && r.date > dateTo) return false;
            return true;
        });
    }, [records, filterDiag, dateFrom, dateTo]);

    // Sorting
    const sortedRecords = useMemo(() => {
        return [...filteredRecords].sort((a, b) => {
            let aVal = a[sortKey];
            let bVal = b[sortKey];

            // Numerical sorting
            if (sortKey === 'age') {
                return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
            }

            // Date sorting
            if (sortKey === 'date' || sortKey === 'createdAt') {
                const timeA = parseDateToTimestamp(aVal);
                const timeB = parseDateToTimestamp(bVal);
                return sortDir === 'asc' ? timeA - timeB : timeB - timeA;
            }

            // String sorting fallback
            if (typeof aVal === 'string') {
                return sortDir === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }

            return 0;
        });
    }, [filteredRecords, sortKey, sortDir]);

    // Pagination
    const paginatedRecords = useMemo(() => {
        const start = (page - 1) * itemsPerPage;
        return sortedRecords.slice(start, start + itemsPerPage);
    }, [sortedRecords, page]);

    const totalPages = Math.ceil(sortedRecords.length / itemsPerPage);

    // Effect: Highlight row if coming from New Analysis redirect
    const [activeHighlightId, setActiveHighlightId] = useState(null);
    useEffect(() => {
        if (location.state?.highlightId) {
            const hid = location.state.highlightId;
            setActiveHighlightId(hid);
            // Scroll to the item or top of the page since new items are sorted to the top usually
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Remove highlight after 3 seconds
            const timer = setTimeout(() => {
                setActiveHighlightId(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [location.state]);

    // Handlers
    const toggleSelectAll = () => {
        if (selectedIds.size === paginatedRecords.length && paginatedRecords.length > 0) {
            const newMap = new Set(selectedIds);
            paginatedRecords.forEach(r => newMap.delete(r.id));
            setSelectedIds(newMap);
        } else {
            const newMap = new Set(selectedIds);
            paginatedRecords.forEach(r => newMap.add(r.id));
            setSelectedIds(newMap);
        }
    };

    const toggleSelect = (e, id) => {
        e.stopPropagation();
        const newMap = new Set(selectedIds);
        if (newMap.has(id)) newMap.delete(id);
        else newMap.add(id);
        setSelectedIds(newMap);
    };

    const loadRecords = fetchPatients;

    const handleSort = (key) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('desc'); // Default to descending for new sort field
        }
    };

    const handleDelete = async (patientId) => {
        const confirmed = window.confirm(
            'Permanently delete this patient record? This cannot be undone.'
        );
        if (!confirmed) return;

        const result = await deletePatient(patientId);

        if (result?.success) {
            console.log('[UI] Record deleted:', patientId);
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(patientId);
                return next;
            });
            if (quickViewId === patientId) setQuickViewId(null);
        } else {
            alert('Delete failed: ' + (result?.error || 'Unknown error'));
        }
    };

    // === XLSX EXPORT (Phases 3-12) ===
    const formatDateDDMMYYYY = (dateStr) => {
        if (!dateStr || dateStr === 'Unknown' || dateStr === '-' || dateStr === 'null' || dateStr === 'NaN/NaN/NaN') return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return String(dateStr);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    };

    const getTodayDDMMYYYY = () => {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        return `${dd}${mm}${yyyy}`;
    };

    const getNowFormatted = () => {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    };

    const exportExcel = (recordsToExport, filename) => {
        const wb = XLSX.utils.book_new();
        const ws = {};

        // Column definitions
        const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
        const colCount = cols.length; // 15

        // === Compute stats for exported records ===
        const totalRecs = recordsToExport.length;
        const cancerCount = recordsToExport.filter(r => r.aiDiagnosis === 'Cancer Detected').length;
        const benignCount = recordsToExport.filter(r => r.aiDiagnosis === 'Benign').length;
        const avgProbNum = totalRecs > 0 ? (recordsToExport.reduce((s, r) => s + r.probability, 0) / totalRecs) : 0;
        const avgProb = avgProbNum % 1 === 0 ? avgProbNum : avgProbNum.toFixed(1);
        const cancerPct = totalRecs > 0 ? Math.round(cancerCount / totalRecs * 100) : 0;
        const benignPct = totalRecs > 0 ? Math.round(benignCount / totalRecs * 100) : 0;

        // === Thin border style reusable ===
        const thinBorder = {
            top: { style: 'thin', color: { rgb: 'CCCCCC' } },
            bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
            left: { style: 'thin', color: { rgb: 'CCCCCC' } },
            right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        };

        // === ROW 1: Title (row index 0) ===
        ws['A1'] = {
            v: 'CANCERSCAN \u2014 PATIENT INTELLIGENCE REPORT', t: 's',
            s: {
                font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
                fill: { fgColor: { rgb: '0d4f3c' } },
                alignment: { horizontal: 'center', vertical: 'center' }
            }
        };
        // Fill remaining merged cells with same style
        for (let c = 1; c < colCount; c++) {
            ws[cols[c] + '1'] = {
                v: '', t: 's',
                s: {
                    fill: { fgColor: { rgb: '0d4f3c' } },
                    alignment: { horizontal: 'center', vertical: 'center' }
                }
            };
        }

        // === ROW 2: Metadata (row index 1) ===
        const metaText = `Generated On: ${getNowFormatted()}   |   Pathologist: Dr. Smith   |   Hospital: CancerScan Medical Center   |   Exported By: CancerScan AI System`;
        ws['A2'] = {
            v: metaText, t: 's',
            s: {
                font: { sz: 10, color: { rgb: '8b949e' } },
                fill: { fgColor: { rgb: '1a2f26' } },
                alignment: { horizontal: 'center', vertical: 'center' }
            }
        };
        for (let c = 1; c < colCount; c++) {
            ws[cols[c] + '2'] = {
                v: '', t: 's',
                s: {
                    fill: { fgColor: { rgb: '1a2f26' } },
                    alignment: { horizontal: 'center', vertical: 'center' }
                }
            };
        }

        // === ROW 3: Empty spacer (row index 2) ===
        ws['A3'] = { v: '', t: 's', s: {} };

        // === ROW 4: Summary Statistics (row index 3) ===
        const summaryStyle = (color) => ({
            font: { bold: true, sz: 10, color: { rgb: color } },
            fill: { fgColor: { rgb: 'f0f7f4' } },
            border: thinBorder,
            alignment: { horizontal: 'center', vertical: 'center' }
        });
        const cancerColor = cancerCount === 0 ? '9e9e9e' : 'c0392b';
        const benignColor = benignCount === 0 ? '9e9e9e' : '1e8449';

        ws['A4'] = { v: `TOTAL RECORDS: ${totalRecs}`, t: 's', s: summaryStyle('1a1a1a') };
        ws['B4'] = { v: `CANCER DETECTED: ${cancerCount} (${cancerPct}%)`, t: 's', s: summaryStyle(cancerColor) };
        ws['C4'] = { v: ' ', t: 's', s: summaryStyle(cancerColor) };
        ws['D4'] = { v: `BENIGN: ${benignCount} (${benignPct}%)`, t: 's', s: summaryStyle(benignColor) };
        ws['E4'] = { v: ' ', t: 's', s: summaryStyle(benignColor) };
        ws['F4'] = { v: `AVG PROBABILITY: ${avgProb}%`, t: 's', s: summaryStyle('1a5276') };
        ws['G4'] = { v: ' ', t: 's', s: summaryStyle('1a5276') };
        ws['H4'] = { v: ' ', t: 's', s: summaryStyle('1a5276') };
        ws['I4'] = { v: ' ', t: 's', s: summaryStyle('1a1a1a') };
        ws['J4'] = { v: ' ', t: 's', s: summaryStyle('1a1a1a') };
        ws['K4'] = { v: ' ', t: 's', s: summaryStyle('1a1a1a') };
        ws['L4'] = { v: ' ', t: 's', s: summaryStyle('1a1a1a') };
        ws['M4'] = { v: ' ', t: 's', s: summaryStyle('1a1a1a') };
        ws['N4'] = { v: ' ', t: 's', s: summaryStyle('1a1a1a') };
        ws['O4'] = { v: ' ', t: 's', s: summaryStyle('1a1a1a') };

        // === ROW 5: Empty spacer (row index 4) ===
        ws['A5'] = { v: '', t: 's', s: {} };

        // === ROW 6: Column Headers (row index 5) ===
        const headers = ['CLINICAL ID', 'PATIENT NAME', 'AGE', 'GENDER', 'SCAN DATE', 'SMOKING HISTORY', 'HOSPITAL', 'ATTENDING PATHOLOGIST', 'AI DIAGNOSIS', 'PROBABILITY (%)', 'SUBTYPE', 'SUBTYPE CONFIDENCE (%)', 'SURVIVAL PROBABILITY (%)', 'EST. SURVIVAL (MONTHS)', 'RISK CATEGORY'];
        const headerTopBorder = { style: 'medium', color: { rgb: '1a3a2a' } };
        headers.forEach((h, i) => {
            let leftBorder = i === 0 ? { style: 'medium', color: { rgb: '1a3a2a' } } : thinBorder.left;
            let rightBorder = i === colCount - 1 ? { style: 'thin', color: { rgb: '1a3a2a' } } : thinBorder.right;

            ws[cols[i] + '6'] = {
                v: h, t: 's',
                s: {
                    font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
                    fill: { fgColor: { rgb: '1a3a2a' } },
                    alignment: { horizontal: 'center', vertical: 'center' },
                    border: { top: headerTopBorder, bottom: thinBorder.bottom, left: leftBorder, right: rightBorder }
                }
            };
        });

        // === ROW 7+: Data Rows (row index 6+) ===
        recordsToExport.forEach((r, idx) => {
            const rowNum = 7 + idx; // Excel row number (1-indexed)
            const isEven = idx % 2 === 1; // 0-indexed: odd index = even row visually
            const rowBg = isEven ? 'f2f9f6' : 'ffffff';
            const isLastRow = idx === recordsToExport.length - 1;

            const getBorder = (colIndex) => ({
                top: thinBorder.top,
                bottom: isLastRow ? { style: 'medium', color: { rgb: '1a3a2a' } } : thinBorder.bottom,
                left: colIndex === 0 ? { style: 'medium', color: { rgb: '1a3a2a' } } : thinBorder.left,
                right: colIndex === colCount - 1 ? { style: 'thin', color: { rgb: '1a3a2a' } } : thinBorder.right
            });

            const baseStyle = (colIndex, overrides = {}) => ({
                font: { sz: 10, color: { rgb: overrides.fontColor || '1a1a1a' }, bold: overrides.bold || false },
                fill: { fgColor: { rgb: overrides.bg || rowBg } },
                alignment: { horizontal: overrides.align || 'left', vertical: 'center', wrapText: overrides.wrap || false },
                border: getBorder(colIndex)
            });

            // A: Clinical ID
            ws[`A${rowNum}`] = { v: r.id, t: 's', s: baseStyle(0, { fontColor: '0a7c5c', bold: true }) };

            // B: Patient Name
            ws[`B${rowNum}`] = { v: r.name, t: 's', s: baseStyle(1, { bold: true }) };

            // C: Age
            ws[`C${rowNum}`] = { v: String(r.age), t: 's', s: baseStyle(2, { align: 'center' }) };

            // D: Gender
            ws[`D${rowNum}`] = { v: r.gender, t: 's', s: baseStyle(3, { align: 'center' }) };

            // E: Scan Date — stored as text to prevent ### issue
            ws[`E${rowNum}`] = { v: formatDateDDMMYYYY(r.date), t: 's', s: baseStyle(4, { align: 'center' }) };

            // F: Smoking History
            ws[`F${rowNum}`] = { v: r.smoking === 'Yes' ? 'Yes' : 'No', t: 's', s: baseStyle(5, { align: 'center' }) };

            // G: Hospital
            ws[`G${rowNum}`] = { v: r.hospital, t: 's', s: baseStyle(6, { wrap: true }) };

            // H: Attending Pathologist
            ws[`H${rowNum}`] = { v: r.pathologist, t: 's', s: baseStyle(7, {}) };

            // I: AI Diagnosis — conditional color
            let diagColor = '1a1a1a', diagBg = 'fefefe';
            if (r.aiDiagnosis === 'Cancer Detected') { diagColor = 'c0392b'; diagBg = 'fdf2f2'; }
            else if (r.aiDiagnosis === 'Benign') { diagColor = '1e8449'; diagBg = 'f2fdf5'; }
            else if (r.aiDiagnosis === 'Under Review') { diagColor = 'd68910'; }
            else if (r.aiDiagnosis === 'Confirmed') { diagColor = '1a5276'; }
            else if (r.aiDiagnosis === 'Referred') { diagColor = '6c3483'; }
            ws[`I${rowNum}`] = { v: r.aiDiagnosis, t: 's', s: baseStyle(8, { align: 'center', bold: true, fontColor: diagColor, bg: diagBg }) };
            ws[`I${rowNum}`].s.font.sz = 11;

            // J: Probability — stored as text
            let probColor = '626567', probBold = false;
            if (r.aiDiagnosis !== 'Cancer Detected') {
                if (r.probability > 70) { probColor = '1e8449'; probBold = true; } // Green
                else if (r.probability >= 50) { probColor = 'd68910'; } // Yellow
                else { probColor = 'c0392b'; } // Red
            } else {
                if (r.probability > 70) { probColor = 'c0392b'; probBold = true; } // Red
                else if (r.probability >= 50) { probColor = 'd68910'; } // Yellow
                else { probColor = '1e8449'; } // Green
            }
            const probStr = r.probability % 1 === 0 ? (() => r.probability + "%")() : (() => r.probability.toFixed(1) + "%")();
            ws[`J${rowNum}`] = { v: probStr, t: 's', s: baseStyle(9, { align: 'center', bold: probBold, fontColor: probColor }) };

            // K: Subtype
            let subtypeColor = '1a1a1a';
            const subtypeVal = r.subtype || '';
            if (subtypeVal.includes('SCC')) { subtypeColor = '7c3aed'; } // '#7C3AED'
            else if (subtypeVal.includes('ACA') || subtypeVal.includes('Adeno')) { subtypeColor = '0369a1'; } // '#0369A1'
            ws[`K${rowNum}`] = { v: subtypeVal, t: 's', s: baseStyle(10, { align: 'center', fontColor: subtypeColor, bold: subtypeVal !== '' }) };
            
            // L: Subtype Confidence
            let subtypeConfStr = '';
            if (r.subtype_confidence) {
                subtypeConfStr = Number(r.subtype_confidence).toFixed(1) + "%";
            }
            ws[`L${rowNum}`] = { v: subtypeConfStr, t: 's', s: baseStyle(11, { align: 'center' }) };
            
            // M: Survival Probability
            let survivalProbStr = '';
            if (r.survival_probability) {
                survivalProbStr = Number(r.survival_probability).toFixed(1) + "%";
            }
            ws[`M${rowNum}`] = { v: survivalProbStr, t: 's', s: baseStyle(12, { align: 'center' }) };

            // N: Estimated Survival (Months)
            ws[`N${rowNum}`] = { v: r.survival_months ? String(r.survival_months) : '', t: 's', s: baseStyle(13, { align: 'center' }) };

            // O: Risk Category
            let riskColor = '1a1a1a';
            if (r.risk_category === 'High') riskColor = 'dc2626'; // '#DC2626'
            else if (r.risk_category === 'Moderate') riskColor = 'd97706'; // '#D97706'
            else if (r.risk_category === 'Low') riskColor = '16a34a'; // '#16A34A'
            ws[`O${rowNum}`] = { v: r.risk_category || '', t: 's', s: baseStyle(14, { align: 'center', fontColor: riskColor, bold: r.risk_category !== null }) };
        });

        // === FOOTER ROW (last data row + 2) ===
        const footerRowNum = 7 + recordsToExport.length + 1; // +1 for the gap row
        const footerText = 'CONFIDENTIAL \u2014 FOR CLINICAL USE ONLY  |  CancerScan AI Powered Lung Cancer Detection System  |  This report is generated automatically and must be verified by a licensed pathologist before clinical use.';
        ws[`A${footerRowNum}`] = {
            v: footerText, t: 's',
            s: {
                font: { sz: 9, italic: true, color: { rgb: '4a4a4a' } },
                fill: { fgColor: { rgb: 'f8f9fa' } },
                alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                border: { top: { style: 'medium', color: { rgb: '7f8c8d' } } }
            }
        };
        for (let c = 1; c < colCount; c++) {
            ws[cols[c] + footerRowNum] = {
                v: '', t: 's',
                s: {
                    fill: { fgColor: { rgb: 'f8f9fa' } },
                    alignment: { horizontal: 'center', vertical: 'center' },
                    border: { top: { style: 'medium', color: { rgb: '7f8c8d' } } }
                }
            };
        }

        // === MERGES ===
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } }, // Row 1
            { s: { r: 1, c: 0 }, e: { r: 1, c: 14 } }, // Row 2
            { s: { r: 3, c: 1 }, e: { r: 3, c: 2 } }, // B4:C4 (Cancer Detected)
            { s: { r: 3, c: 3 }, e: { r: 3, c: 4 } }, // D4:E4 (Benign)
            { s: { r: 3, c: 5 }, e: { r: 3, c: 7 } }, // F4:H4 (Avg Probability)
            { s: { r: 3, c: 8 }, e: { r: 3, c: 14 } }, // I4:O4 (Blank filler)
            { s: { r: footerRowNum - 1, c: 0 }, e: { r: footerRowNum - 1, c: 14 } }, // Footer
        ];

        // === COLUMN WIDTHS ===
        ws['!cols'] = [
            { wch: 18 },  // A: Clinical ID
            { wch: 22 },  // B: Patient Name
            { wch: 7 },   // C: Age
            { wch: 10 },  // D: Gender
            { wch: 14 },  // E: Scan Date
            { wch: 16 },  // F: Smoking History
            { wch: 24 },  // G: Hospital
            { wch: 22 },  // H: Attending Pathologist
            { wch: 18 },  // I: AI Diagnosis
            { wch: 15 },  // J: Probability
            { wch: 25 },  // K: Subtype
            { wch: 25 },  // L: Subtype Confidence
            { wch: 25 },  // M: Survival Probability
            { wch: 24 },  // N: Estimated Survival
            { wch: 15 },  // O: Risk Category
        ];

        // === ROW HEIGHTS ===
        ws['!rows'] = [
            { hpt: 35 },   // Row 1: Title
            { hpt: 22 },   // Row 2: Metadata
            { hpt: 4 },    // Row 3: Spacer
            { hpt: 22 },   // Row 4: Summary
            { hpt: 6 },    // Row 5: Spacer
            { hpt: 28 },   // Row 6: Headers
        ];
        // Data row heights (22px each)
        for (let i = 0; i < recordsToExport.length; i++) {
            ws['!rows'].push({ hpt: 22 });
        }
        // Gap row + footer row
        ws['!rows'].push({ hpt: 8 });  // gap row
        ws['!rows'].push({ hpt: 30 }); // footer row

        // === SET SHEET RANGE ===
        ws['!ref'] = `A1:O${footerRowNum}`;

        // === FREEZE PANES ===
        ws['!freeze'] = { xSplit: 0, ySplit: 6 };

        // === ADD SHEET & SAVE ===
        XLSX.utils.book_append_sheet(wb, ws, 'Patient Records');
        XLSX.writeFile(wb, filename);
    };

    const exportPDF = () => {
        if (filteredRecords.length === 0) return;

        // Export each filtered record as a professional clinical report
        filteredRecords.forEach((record, index) => {
            // Find the original record from context to get all fields
            const fullRecord = patients.find(p => p.patient_id === record.id);
            if (!fullRecord) return;

            // Adding a slight delay between downloads to prevent browser blocking
            setTimeout(() => {
                generatePatientPDF(fullRecord);
            }, index * 800);
        });
    };



    const handleUpdateNotes = (val) => {
        updateNotes(quickViewId, val);
    };

    const handleMergeGroup = (groupIdentifier, keepId) => {
        const group = duplicateGroups.find(g => `${g[0].name}|${g[0].age}|${g[0].gender}|${g[0].date}` === groupIdentifier);
        if (!group) return;

        const idsToDelete = group.filter(r => r.id !== keepId).map(r => r.id);
        mergePatients(keepId, idsToDelete);

        setSelectedIds(prev => {
            const next = new Set(prev);
            idsToDelete.forEach(id => next.delete(id));
            return next;
        });
    };

    const quickViewData = records.find(r => r.id === quickViewId);

    return (
        <div className="min-h-screen bg-[color:var(--bg-primary)] text-[color:var(--text-primary)] p-8 font-sans pb-24">
            {/* SECTION 1: HEADER */}
            <div className="flex justify-between items-end mb-[24px]">
                <div>
                    <h1 className="text-[24px] font-bold text-[var(--text-primary)] mb-[8px] flex items-center gap-3">
                        Patient Records
                        <button onClick={loadRecords} className="text-[color:var(--text-muted)] hover:text-[#c9d1d9] transition-colors" title="Refresh Records">
                            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                        </button>
                    </h1>
                    <p className="text-[14px] text-[var(--text-muted)]">Manage and export all clinical analyses and diagnostic reports.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleClearAll}
                        disabled={clearing || patients.length === 0}
                        style={{
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            opacity: clearing ? 0.6 : 1,
                            fontWeight: '500',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Trash2 size={16} /> {clearing ? 'Clearing...' : 'Clear All Records'}
                    </button>
                    <button onClick={() => exportExcel(filteredRecords, `CancerScan_PatientReport_${getTodayDDMMYYYY()}.xlsx`)} className="flex items-center gap-2 px-4 py-2 border border-[color:var(--border-subtle)] text-[color:var(--text-primary)] rounded-md hover:bg-[color:var(--bg-surface-alt)] transition-colors text-sm font-medium">
                        <Download size={16} /> Export Excel
                    </button>
                    <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 bg-[color:var(--accent-teal)] text-black rounded-md hover:bg-[#00cbb2] transition-colors text-sm font-medium">
                        <FileText size={16} /> Export PDF Report
                    </button>
                </div>
            </div>

            {/* SECTION 2: STATS BAR */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'TOTAL RECORDS', val: stats.total, icon: Users, color: 'text-[color:var(--text-primary)]' },
                    { label: 'CANCER DETECTED', val: `${stats.cancer} (${stats.total ? Math.round(stats.cancer / stats.total * 100) : 0}%)`, icon: ShieldAlert, color: 'text-[#f85149]' },
                    { label: 'BENIGN', val: `${stats.benign} (${stats.total ? Math.round(stats.benign / stats.total * 100) : 0}%)`, icon: ShieldCheck, color: 'text-[#3fb950]' },
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

            {/* SECTION 3: DUPLICATE BANNER */}
            {duplicateGroups.length > 0 && (
                <div className="mb-6 flex items-center justify-between bg-[rgba(227,179,65,0.08)] border border-[#e3b341] rounded-lg p-4">
                    <div className="flex items-center gap-3 text-[#e3b341]">
                        <AlertTriangle size={20} />
                        <span className="font-semibold text-sm">Action Required: {duplicateGroups.length} potential duplicate record groups detected in the clinical registry.</span>
                    </div>
                    <button onClick={() => { setMergeGroupFilter(null); setShowMergeModal(true); }} className="px-4 py-1.5 border border-[#e3b341] text-[#e3b341] rounded hover:bg-[#e3b341]/10 text-sm font-medium transition-colors">
                        Review & Merge All
                    </button>
                </div>
            )}

            {/* SECTION 4: FILTER BAR */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex bg-transparent border border-[color:var(--border-subtle)] rounded-md overflow-hidden">
                    {['All', 'Cancer Detected', 'Benign'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFilterDiag(tab)}
                            className={`px-4 py-1.5 text-sm transition-colors border-r border-[color:var(--border-subtle)] last:border-r-0 ${filterDiag === tab ? 'bg-[color:var(--accent-teal)] text-black font-medium' : 'bg-transparent text-[color:var(--text-primary)] hover:bg-[color:var(--bg-surface-alt)]'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div className="flex gap-3">
                    <div className="flex items-center gap-2 bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] rounded-md px-3 py-1.5 text-sm">
                        <Calendar size={14} className="text-[color:var(--text-muted)]" />
                        <input type="date" className="bg-transparent text-[color:var(--text-primary)] border-none outline-none appearance-none" style={{ colorScheme: 'dark' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        <span className="text-[color:var(--text-muted)]">—</span>
                        <input type="date" className="bg-transparent text-[color:var(--text-primary)] border-none outline-none appearance-none" style={{ colorScheme: 'dark' }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* SECTION 5: RECORDS TABLE */}
            <div className="bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] rounded-lg overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="border-b border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)]">
                                <th className="p-4 w-12 text-center">
                                    <input type="checkbox" className="accent-[#00e5cc] w-4 h-4 cursor-pointer" checked={selectedIds.size > 0 && selectedIds.size === paginatedRecords.length} onChange={toggleSelectAll} />
                                </th>
                                {[
                                    { key: 'id', label: 'CLINICAL ID', sortable: false },
                                    { key: 'name', label: 'PATIENT INFO', sortable: false },
                                    { key: 'date', label: 'SCAN DATE', sortable: true },
                                    { key: 'status', label: 'DIAGNOSIS', sortable: false },
                                ].map(col => (
                                    <th key={col.key} className={`p-4 text-xs font-semibold text-[color:var(--text-muted)] uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:text-[color:var(--text-primary)] transition-colors' : ''}`} onClick={() => col.sortable && handleSort(col.key)}>
                                        <div className="flex items-center gap-1">
                                            {col.label}
                                            {col.sortable && sortKey === col.key && (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                        </div>
                                    </th>
                                ))}
                                <th className="p-4 text-right text-xs font-semibold text-[color:var(--text-muted)] uppercase tracking-wider pr-6">MANAGE</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#21262d]">
                            {paginatedRecords.length === 0 ? (
                                <tr><td colSpan={7} className="p-10 text-center text-[color:var(--text-muted)]">No records found.</td></tr>
                            ) : paginatedRecords.map(r => {
                                const duplicates = duplicatesByRecordId.get(r.id);
                                const isFirstDupInGroup = duplicates && duplicates[0].id === r.id;

                                return (
                                    <tr key={r.id} onClick={() => setQuickViewId(r.id)} className="group hover:bg-[color:var(--bg-surface-alt)] transition-colors cursor-pointer">
                                        <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                                            <input type="checkbox" className="accent-[#00e5cc] w-4 h-4 cursor-pointer" checked={selectedIds.has(r.id)} onChange={(e) => toggleSelect(e, r.id)} />
                                        </td>
                                        <td className="p-4 border-l-2 border-transparent">
                                            <span className="text-[color:var(--accent-teal)] hover:underline" onClick={(e) => { e.stopPropagation(); setQuickViewId(r.id); }}>{r.id}</span>
                                            {isFirstDupInGroup && (
                                                <span className="block mt-1 text-[10px] bg-[rgba(227,179,65,0.15)] text-[#e3b341] px-1.5 py-0.5 rounded w-max font-bold border border-[#e3b341]/30 cursor-pointer" onClick={(e) => { e.stopPropagation(); setMergeGroupFilter(`${r.name}|${r.age}|${r.gender}|${r.date}`); setShowMergeModal(true); }}>
                                                    + {duplicates.length} DUPES
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-[14px] text-[color:var(--text-primary)]">{r.name}</div>
                                            <div className="text-[12px] text-[color:var(--text-muted)] mt-0.5 flex items-center gap-2">
                                                {r.age} yrs • {r.gender.charAt(0)}
                                                {r.smoking === 'Yes' && <span className="text-[9px] uppercase tracking-wider bg-[#f85149]/10 text-[#f85149] px-1.5 py-0.5 rounded border border-[#f85149]/20">🚬 Smoker</span>}
                                            </div>
                                            <div className="text-[11px] text-[color:var(--text-muted)] mt-0.5">{r.hospital} • {r.pathologist}</div>
                                        </td>
                                        <td className="p-4 text-[13px] text-[color:var(--text-muted)]">
                                            {r.date && r.date.includes('-')
                                                ? r.date.split('-').reverse().join('/')
                                                : r.date}
                                        </td>

                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-md border shadow-sm ${getStatusStyle(r.status)}`}>
                                                {r.status === 'Cancer Detected' ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
                                                {r.status.toUpperCase()}
                                            </span>
                                        </td>

                                        <td className="p-4 text-right pr-6">
                                            <div className="flex items-center justify-end gap-3 transition-opacity">
                                                <ExternalLink size={18} className="text-[color:var(--text-muted)] hover:text-[color:var(--accent-teal)] cursor-pointer" title="Open Full View" onClick={(e) => { e.stopPropagation(); setQuickViewId(r.id); }} />
                                                <Trash2 size={18} className="text-[color:var(--text-muted)] hover:text-[#f85149] cursor-pointer" title="Delete Record" onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {/* Pagination Controls */}
                <div className="flex items-center justify-between p-4 border-t border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] mt-auto">
                    <span className="text-sm text-[color:var(--text-muted)]">Showing {Math.min((page - 1) * itemsPerPage + 1, sortedRecords.length)}–{Math.min(page * itemsPerPage, sortedRecords.length)} of {sortedRecords.length} records</span>
                    <div className="flex gap-1">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] disabled:opacity-50 flex items-center gap-1"><ChevronLeft size={16} /> Prev</button>
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${page === i + 1 ? 'bg-[color:var(--accent-teal)] text-black' : 'text-[color:var(--text-primary)] border border-[color:var(--border-subtle)] hover:bg-[color:var(--bg-surface-alt)]'}`}>{i + 1}</button>
                        ))}
                        <button disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] disabled:opacity-50 flex items-center gap-1">Next <ChevronRight size={16} /></button>
                    </div>
                </div>
            </div>

            {/* SECTION 6: BULK ACTION BAR */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="fixed bottom-0 left-0 right-0 h-[60px] bg-[color:var(--bg-surface)] border-t border-[color:var(--border-subtle)] flex items-center justify-between px-8 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                        <span className="text-[color:var(--text-primary)] font-medium">{selectedIds.size} record{selectedIds.size > 1 ? 's' : ''} selected</span>
                        <div className="flex gap-4">
                            <button onClick={() => exportExcel(records.filter(r => selectedIds.has(r.id)), `CancerScan_PatientReport_${getTodayDDMMYYYY()}.xlsx`)} className="flex items-center gap-2 border border-[color:var(--border-subtle)] text-[color:var(--text-primary)] px-4 py-1.5 rounded-md hover:bg-[color:var(--bg-surface-alt)] transition-colors text-sm font-medium">
                                <Download size={16} /> Export Selected Excel
                            </button>
                            <button onClick={() => setSelectedIds(new Set())} className="text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] text-sm font-medium px-2">✕ Clear Selection</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SECTION 7: MERGE MODAL */}
            <AnimatePresence>
                {showMergeModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] rounded-xl w-full max-w-[720px] max-h-[80vh] flex flex-col">
                            <div className="flex items-center justify-between p-5 border-b border-[color:var(--border-subtle)]">
                                <h2 className="text-xl font-bold text-[color:var(--text-primary)]">Duplicate Records Review</h2>
                                <button onClick={() => setShowMergeModal(false)} className="text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"><X size={20} /></button>
                            </div>
                            <div className="p-5 flex-1 overflow-y-auto space-y-6">
                                {(mergeGroupFilter ? duplicateGroups.filter(g => `${g[0].name}|${g[0].age}|${g[0].gender}|${g[0].date}` === mergeGroupFilter) : duplicateGroups).map((group) => {
                                    const groupIdentifier = `${group[0].name}|${group[0].age}|${group[0].gender}|${group[0].date}`;
                                    return (
                                        <MergeGroupCard key={groupIdentifier} group={group} onMerge={(keepId) => handleMergeGroup(groupIdentifier, keepId)} />
                                    );
                                })}
                            </div>
                            <div className="p-5 border-t border-[color:var(--border-subtle)] flex flex-col items-center gap-3">
                                {duplicateGroups.length > 0 && !mergeGroupFilter && <span className="text-[#e3b341] text-xs font-semibold uppercase tracking-wider">⚠ {duplicateGroups.length} groups not yet reviewed</span>}
                                <button onClick={() => setShowMergeModal(false)} className="w-full bg-[color:var(--accent-teal)] text-black font-bold py-2.5 rounded-lg hover:bg-[#00cbb2] transition-colors">Done</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SECTION 8: QUICK VIEW PANEL */}
            <AnimatePresence>
                {quickViewData && (
                    <motion.div initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 bottom-0 w-[420px] bg-[color:var(--bg-surface)] border-l border-[color:var(--border-subtle)] shadow-2xl z-40 flex flex-col">
                        <div className="p-6 flex-1 overflow-y-auto relative">
                            <button onClick={() => setQuickViewId(null)} className="absolute top-4 right-4 text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"><X size={24} /></button>

                            {/* BLOCK 1: Header */}
                            <div className="mb-6 mt-4">
                                <h2 className="text-xl font-bold text-[color:var(--text-primary)] mb-1">{quickViewData.name}</h2>
                                <div className="text-[13px] text-[color:var(--accent-teal)] font-medium mb-1">{quickViewData.id}</div>
                                <div className="text-[13px] text-[color:var(--text-muted)] flex items-center gap-2">
                                    {quickViewData.age} yrs • {quickViewData.gender}
                                    {quickViewData.smoking === 'Yes' && <span className="bg-[#f85149]/10 text-[#f85149] px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border border-[#f85149]/20">🚬 Smoker</span>}
                                </div>
                            </div>

                            {/* BLOCK 2: Facility */}
                            <div className="bg-[color:var(--bg-primary)] rounded-lg p-4 border border-[color:var(--border-subtle)] mb-6 space-y-3">
                                <div><div className="text-[10px] font-bold text-[color:var(--text-muted)] uppercase mb-0.5">HOSPITAL</div><div className="text-sm text-[color:var(--text-primary)]">{quickViewData.hospital}</div></div>
                                <div><div className="text-[10px] font-bold text-[color:var(--text-muted)] uppercase mb-0.5">ATTENDING PATHOLOGIST</div><div className="text-sm text-[color:var(--text-primary)]">{quickViewData.pathologist}</div></div>
                                <div><div className="text-[10px] font-bold text-[color:var(--text-muted)] uppercase mb-0.5">SCAN DATE</div><div className="text-sm text-[color:var(--text-primary)]">{quickViewData.date.split('-').reverse().join('/')}</div></div>
                            </div>

                            {/* BLOCK 3: AI Diagnosis */}
                            <div className="mb-6">
                                <div className="text-[10px] font-bold text-[color:var(--text-muted)] uppercase mb-2">AI DIAGNOSIS</div>
                                <div className={`flex items-center justify-between w-full px-4 py-3 rounded-lg border ${getStatusStyle(quickViewData.status)}`}>
                                    <span className="font-bold">{quickViewData.status}</span>
                                </div>
                            </div>

                            {/* BLOCK 4: Probability */}
                            <div className="mb-6 flex flex-col items-center p-6 border border-[color:var(--border-subtle)] bg-[color:var(--bg-primary)] rounded-lg">
                                <div className="text-[10px] font-bold text-[color:var(--text-muted)] uppercase mb-2 w-full">CONFIDENCE SCORE</div>
                                <div className={`text-5xl font-black ${getProbColor(quickViewData.probability, quickViewData.status)} mb-4`}>{quickViewData.probability % 1 === 0 ? quickViewData.probability : quickViewData.probability.toFixed(1)}%</div>
                                <div className="w-full h-4 bg-[#21262d] rounded-full overflow-hidden flex">
                                    <div className={`h-full ${quickViewData.status !== 'Cancer Detected' ? (quickViewData.probability > 70 ? 'bg-[#3fb950]' : quickViewData.probability >= 50 ? 'bg-[#e3b341]' : 'bg-[#f85149]') : (quickViewData.probability > 70 ? 'bg-[#f85149]' : quickViewData.probability >= 50 ? 'bg-[#e3b341]' : 'bg-[#3fb950]')}`} style={{ width: `${quickViewData.probability}%` }}></div>
                                </div>
                            </div>

                            {/* ── Subtype Classification ── */}
                            {quickViewData.status === 'Cancer Detected' &&
                             quickViewData?.subtype &&
                             quickViewData.subtype !== '' && (
                              <div style={{
                                marginTop:    '16px',
                                padding:      '16px',
                                background:   'var(--bg-primary)',
                                border:       '1px solid var(--border-subtle)',
                                borderRadius: '10px',
                              }}>
                                {/* Header */}
                                <div style={{
                                  fontSize:      '11px',
                                  fontWeight:    700,
                                  letterSpacing: '1.5px',
                                  color:         'var(--text-muted)',
                                  marginBottom:  '12px',
                                  display:       'flex',
                                  alignItems:    'center',
                                  gap:           '6px',
                                }}>
                                  🔬 SUBTYPE CLASSIFICATION
                                </div>

                                {/* Subtype name + badge */}
                                <div style={{
                                  display:        'flex',
                                  justifyContent: 'space-between',
                                  alignItems:     'center',
                                  marginBottom:   '10px',
                                }}>
                                  <span style={{
                                    fontWeight: 600,
                                    fontSize:   '15px',
                                    color:      'var(--text-primary)',
                                  }}>
                                    {quickViewData.subtype}
                                  </span>
                                  <span style={{
                                    background:   '#ef444415',
                                    color:        '#dc2626',
                                    padding:      '3px 12px',
                                    borderRadius: '20px',
                                    fontSize:     '12px',
                                    fontWeight:   700,
                                    border:       '1px solid #ef444430',
                                  }}>
                                    {quickViewData.subtype?.includes('SCC')
                                      ? 'SCC' : 'ACA'}
                                  </span>
                                </div>

                                {/* Confidence label */}
                                <div style={{
                                  display:        'flex',
                                  justifyContent: 'space-between',
                                  fontSize:       '11px',
                                  color:          'var(--text-muted)',
                                  marginBottom:   '6px',
                                  letterSpacing:  '1px',
                                }}>
                                  <span>MODEL CONFIDENCE</span>
                                  <span style={{
                                    fontWeight: 600,
                                    color:      'var(--text-primary)',
                                  }}>
                                    {quickViewData.subtype_confidence}%
                                  </span>
                                </div>

                                {/* Confidence progress bar */}
                                <div style={{
                                  height:       '6px',
                                  background:   'var(--border-subtle)',
                                  borderRadius: '3px',
                                  overflow:     'hidden',
                                }}>
                                  <div style={{
                                    height:       '100%',
                                    width: `${quickViewData.subtype_confidence
                                              || 0}%`,
                                    background:   'linear-gradient('
                                      + '90deg, #ef4444, #f97316)',
                                    borderRadius: '3px',
                                    transition:   'width 0.8s ease',
                                  }} />
                                </div>
                              </div>
                            )}

                            {/* ── Survival Analysis ── */}
                            {quickViewData.status === 'Cancer Detected' &&
                             (quickViewData?.survival_months > 0 ||
                              quickViewData?.survival_probability > 0) && (
                              <div style={{
                                marginTop:    '12px',
                                padding:      '16px',
                                background:   'var(--bg-primary)',
                                border:       '1px solid var(--border-subtle)',
                                borderRadius: '10px',
                              }}>
                                {/* Header + percentage */}
                                <div style={{
                                  display:        'flex',
                                  justifyContent: 'space-between',
                                  alignItems:     'center',
                                  marginBottom:   '14px',
                                }}>
                                  <div style={{
                                    fontSize:      '11px',
                                    fontWeight:    700,
                                    letterSpacing: '1.5px',
                                    color:         'var(--text-muted)',
                                    display:       'flex',
                                    alignItems:    'center',
                                    gap:           '6px',
                                  }}>
                                    🫀 SURVIVAL ANALYSIS
                                  </div>
                                  <span style={{
                                    fontSize:   '20px',
                                    fontWeight: 800,
                                    color:
                                      quickViewData.survival_probability >= 60
                                        ? '#16a34a'
                                      : quickViewData.survival_probability >= 40
                                        ? '#d97706'
                                      : '#dc2626',
                                  }}>
                                    {quickViewData.survival_probability}%
                                  </span>
                                </div>

                                {/* Risk + Months grid */}
                                <div style={{
                                  display:             'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  gap:                 '10px',
                                }}>

                                  {/* Risk Level box */}
                                  <div style={{
                                    padding:      '14px',
                                    background:   'var(--bg-surface)',
                                    border:       '1px solid var(--border-subtle)',
                                    borderRadius: '8px',
                                    textAlign:    'center',
                                  }}>
                                    <div style={{
                                      fontSize:     '22px',
                                      marginBottom: '4px',
                                    }}>
                                      {quickViewData.risk_category === 'Low'
                                        ? '💚'
                                        : quickViewData.risk_category === 'Moderate'
                                        ? '🟡' : '🔴'}
                                    </div>
                                    <div style={{
                                      fontWeight: 700,
                                      fontSize:   '15px',
                                      color:
                                        quickViewData.risk_category === 'Low'
                                          ? '#16a34a'
                                        : quickViewData.risk_category === 'Moderate'
                                          ? '#d97706'
                                        : '#dc2626',
                                    }}>
                                      {quickViewData.risk_category || 'N/A'}
                                    </div>
                                    <div style={{
                                      fontSize:      '10px',
                                      color:         'var(--text-muted)',
                                      letterSpacing: '1px',
                                      marginTop:     '3px',
                                    }}>
                                      RISK LEVEL
                                    </div>
                                  </div>

                                  {/* Est Months box */}
                                  <div style={{
                                    padding:      '14px',
                                    background:   'var(--bg-surface)',
                                    border:       '1px solid var(--border-subtle)',
                                    borderRadius: '8px',
                                    textAlign:    'center',
                                  }}>
                                    <div style={{
                                      fontSize:     '22px',
                                      marginBottom: '4px',
                                    }}>
                                      🕐
                                    </div>
                                    <div style={{
                                      fontWeight: 700,
                                      fontSize:   '20px',
                                      color:      'var(--text-primary)',
                                    }}>
                                      {quickViewData.survival_months || 0}
                                    </div>
                                    <div style={{
                                      fontSize:      '10px',
                                      color:         'var(--text-muted)',
                                      letterSpacing: '1px',
                                      marginTop:     '3px',
                                    }}>
                                      EST. MONTHS
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* BLOCK 5: Image */}
                            <div className="mb-6">
                                <div className="text-[10px] font-bold text-[color:var(--text-muted)] uppercase mb-2">WSI SCAN</div>
                                <div className="w-full flex justify-center text-[color:var(--text-muted)] bg-[color:var(--bg-primary)] overflow-hidden">
                                    <WSIImage uploadedImagePath={quickViewData.uploadedImage} />
                                </div>
                            </div>

                            {/* BLOCK 6: Clinical History (Read-only) */}
                            {quickViewData.clinicalHistory && (
                                <div className="mb-6">
                                    <div className="text-[10px] font-bold text-[color:var(--text-muted)] uppercase mb-2">CLINICAL HISTORY (FROM ANALYSIS)</div>
                                    <div className="w-full bg-[color:var(--bg-primary)]/50 border border-[color:var(--border-subtle)] rounded-lg p-3 text-sm text-[color:var(--text-muted)] font-mono whitespace-pre-line italic">
                                        {quickViewData.clinicalHistory}
                                    </div>
                                </div>
                            )}

                            {/* BLOCK 7: Pathologist Notes (Editable) */}
                            <div className="mb-6">
                                <div className="text-[10px] font-bold text-[color:var(--text-muted)] uppercase mb-2">PATHOLOGIST NOTES</div>
                                <textarea
                                    value={quickViewData.notes}
                                    onChange={(e) => handleUpdateNotes(e.target.value)}
                                    className="w-full h-24 bg-[color:var(--bg-primary)] border border-[color:var(--border-subtle)] rounded-lg p-3 text-sm text-[color:var(--text-primary)] font-mono outline-none focus:border-[#00e5cc] resize-none"
                                    placeholder="Add pathologist observations..."
                                />
                            </div>
                        </div>

                        {/* BLOCK 7: Footer */}
                        <div className="p-4 border-t border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    const lookupId = quickViewData.clinicalId || quickViewData.id || quickViewData.patient_id;
                                    const fullRecord = patients.find(p => p.patient_id === lookupId || p.clinicalId === lookupId);
                                    generatePatientPDF(fullRecord || {
                                        ...quickViewData,
                                        clinicalId: lookupId,
                                        patientName: quickViewData.name,
                                        smokingHistory: quickViewData.smoking,
                                        specimenType: quickViewData.specimen || "Lung Tissue",
                                        referralSource: quickViewData.referral || "Clinical Staff",
                                        clinicalHistory: quickViewData.notes,
                                        aiDiagnosis: quickViewData.status,
                                        reviewStatus: quickViewData.reviewStatus || "Pending Review",
                                        createdAt: quickViewData.createdAt || new Date().toISOString()
                                    });
                                }}
                                className="w-full bg-[color:var(--accent-teal)] text-black font-bold py-2 rounded-lg hover:bg-[#00cbb2] transition-colors flex items-center justify-center gap-2"
                            >
                                <FileText size={16} /> Export Clinical Report
                            </button>
                            <button onClick={() => exportExcel([quickViewData], `CancerScan_${quickViewData.name.replace(/\s+/g, '')}_${quickViewData.id}.xlsx`)} className="w-full border border-[color:var(--border-subtle)] text-[color:var(--text-primary)] font-medium py-2 rounded-lg hover:bg-[color:var(--bg-surface-alt)] transition-colors flex items-center justify-center gap-2">
                                <Download size={16} /> Export Excel Data
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}

// Subcomponent for Merge Modal
function MergeGroupCard({ group, onMerge }) {
    const [keepId, setKeepId] = useState(group[0].id);
    const [merged, setMerged] = useState(false);

    if (merged) {
        return (
            <div className="bg-[color:var(--accent-teal)]/10 border border-[#00e5cc]/30 rounded-lg p-6 flex flex-col items-center justify-center text-[color:var(--accent-teal)] transition-all h-32">
                <ShieldCheck size={32} className="mb-2" />
                <span className="font-bold">Records Merged Successfully</span>
            </div>
        );
    }

    return (
        <div className="bg-[color:var(--bg-primary)] border border-[color:var(--border-subtle)] rounded-lg overflow-hidden">
            <div className="bg-[#e3b341]/10 px-4 py-3 flex items-center gap-2 border-b border-[color:var(--border-subtle)]">
                <AlertTriangle size={16} className="text-[#e3b341]" />
                <span className="text-sm font-bold text-[color:var(--text-primary)]">Group: {group[0].name}</span>
            </div>
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="bg-[color:var(--bg-surface)] text-[color:var(--text-muted)] border-b border-[color:var(--border-subtle)] text-xs uppercase tracking-wider">
                        <th className="p-3 text-center">Keep</th>
                        <th className="p-3">Clinical ID</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Prob</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d]">
                    {group.map(r => (
                        <tr key={r.id} className="hover:bg-[color:var(--bg-surface-alt)]">
                            <td className="p-3 text-center"><input type="radio" className="accent-[#00e5cc]" checked={keepId === r.id} onChange={() => setKeepId(r.id)} /></td>
                            <td className="p-3 text-[color:var(--accent-teal)]">{r.id}</td>
                            <td className="p-3 text-[color:var(--text-primary)]">{r.date.split('-').reverse().join('/')}</td>
                            <td className="p-3"><span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold border ${getStatusStyle(r.status)}`}>{r.status}</span></td>
                            <td className={`p-3 font-bold ${getProbColor(r.probability)}`}>{r.probability}%</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="p-4 bg-[color:var(--bg-surface)] border-t border-[color:var(--border-subtle)] flex justify-end">
                <button onClick={() => { onMerge(keepId); setMerged(true); }} className="border border-[#00e5cc] text-[color:var(--accent-teal)] px-4 py-1.5 rounded text-sm font-medium hover:bg-[color:var(--accent-teal)]/10 transition-colors">
                    Merge Group
                </button>
            </div>
        </div>
    );
}
