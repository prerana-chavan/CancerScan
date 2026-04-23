import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    UploadCloud, 
    CheckCircle2, 
    CircleDashed, 
    FileText, 
    Zap, 
    UserPlus, 
    Fingerprint,
    ShieldAlert,
    Loader2,
    Save
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { usePatients } from '../context/PatientContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { predict } from '../services/api';

const HOSPITALS = [
    'City General Hospital',
    'Metropolitan Medical Center',
    'St. Judes Research',
    'Mayo Clinic Network',
    'Johns Hopkins Medicine'
];

export default function NewAnalysisPage() {
    const { user, token } = useAuth();
    const { isDarkMode: isDark } = useTheme();
    const { addNotification } = useNotifications();
    const { addPatient, fetchPatients } = usePatients();
    const navigate = useNavigate();

    const fileInputRef = useRef(null);
    const loggedInDoctor = user?.fullName || 'Dr. Pathologist';
    const doctorHospital = user?.hospital || 'Clinical Gateway';

    // === STEP 8: FORM STATE MANAGEMENT ===
    const [patientName, setPatientName] = useState("");
    const [age, setAge] = useState("");
    const [date, setDate] = useState(
        new Date().toISOString().split('T')[0] // YYYY-MM-DD
    );
    const [gender, setGender] = useState("Male");
    const [smokingHistory, setSmokingHistory] = useState("No");
    const [specimenType, setSpecimenType] = useState("Right Upper Lobe");
    const [referralSource, setReferralSource] = useState("GP / Family Doctor");
    const [clinicalHistory, setClinicalHistory] = useState("");
    const [uploadedImage, setUploadedImage] = useState(null);
    const [uploadedFileName, setUploadedFileName] = useState(null);
    const [uploadedFileSize, setUploadedFileSize] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [imageError, setImageError] = useState(null);
    const [analysisError, setAnalysisError] = useState(null);

    const [pageState, setPageState] = useState("form"); // "form" | "analysing" | "complete"
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState("");
    const [analysisResult, setAnalysisResult] = useState(null);
    const [completedSteps, setCompletedSteps] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const resetForm = () => {
        setPatientName("");
        setAge("");
        setDate(new Date().toISOString().split('T')[0]);
        setGender("Male");
        setSmokingHistory("No");
        setSpecimenType("Right Upper Lobe");
        setReferralSource("GP / Family Doctor");
        setClinicalHistory("");
        setUploadedImage(null);
        setUploadedFileName(null);
        setUploadedFileSize(null);
        setSelectedFile(null);
        setAnalysisError(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setProgress(0);
        setCompletedSteps([]);
        setAnalysisResult(null);
        setIsSaved(false);
        setIsSaving(false);
        setPageState("form");
    };

    // === STEP 1: BUTTON VISIBILITY LOGIC ===
    const isFormComplete =
        patientName.trim() !== "" &&
        age !== "" &&
        parseInt(age) >= 1 &&
        parseInt(age) <= 120 &&
        date !== "" &&
        uploadedImage !== null;

    // === STEP 2: IMAGE UPLOAD HANDLING ===
    const handleFileDrag = (e) => e.preventDefault();
    const handleFileDrop = (e) => {
        e.preventDefault();
        if (e.dataTransfer.files?.[0]) handleImageUpload(e.dataTransfer.files[0]);
    };

    const handleImageUpload = (file) => {
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            setImageError("Only JPG and PNG files supported");
            return;
        }

        // Validate file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            setImageError("File size must be under 50MB");
            return;
        }

        // Convert to base64
        const reader = new FileReader();
        setSelectedFile(file); // store raw File for FormData upload
        reader.onload = (e) => {
            setUploadedImage(e.target.result); // base64 string for preview
            setUploadedFileName(file.name);
            setUploadedFileSize((file.size / (1024 * 1024)).toFixed(1) + " MB");
            setImageError(null);
        };
        reader.readAsDataURL(file);
    };

    // === STEP 3: HANDLE RUN ANALYSIS — REAL ML API CALL ===
    const handleRunAnalysis = async () => {
        setPageState("analysing");
        setProgress(0);
        setCompletedSteps([]);
        setAnalysisError(null);

        const steps = [
            { progress: 15, text: "Validating WSI slide...", delay: 300 },
            { progress: 35, text: "Extracting tissue features...", delay: 800 },
            { progress: 55, text: "Running CNN pipeline...", delay: 1500 },
            { progress: 75, text: "Generating diagnosis...", delay: 2500 },
            { progress: 90, text: "Preparing report...", delay: 4000 },
        ];

        // Start animated progress indicators
        steps.forEach(({ progress: p, text, delay }, index) => {
            setTimeout(() => {
                setProgress(p);
                setProgressText(text);
                if (index > 0) {
                    setCompletedSteps(prev => [...prev, steps[index - 1].text]);
                }
            }, delay);
        });

        try {
            // Build FormData — send image + all clinical fields
            const formData = new FormData();
            formData.append('slideImage', selectedFile);
            formData.append('patientName', patientName.trim());
            formData.append('age', age);
            formData.append('date', date);
            formData.append('gender', gender);
            formData.append('smokingHistory', smokingHistory);
            formData.append('specimenType', specimenType);
            formData.append('referralSource', referralSource);
            formData.append('clinicalHistory', clinicalHistory.trim());
            formData.append('hospitalNetwork', doctorHospital);

            // Call the real ML prediction API
            const data = await predict(formData, (progressEvent) => {
                // Optional: update upload progress
                if (progressEvent.total) {
                    const uploadPct = Math.round((progressEvent.loaded / progressEvent.total) * 10);
                    setProgress(prev => Math.max(prev, uploadPct));
                }
            });

            if (!data.success) {
                // Invalid slide or analysis error
                setPageState("form");
                const errorMsg = data.error || 'Analysis failed. Please try again.';
                setAnalysisError(errorMsg);
                addNotification('Analysis Failed', errorMsg, 'error');
                return;
            }

            // Complete all animation steps
            setCompletedSteps(steps.map(s => s.text));

            // Build result from REAL ML response
            const newRecord = {
                patient_id: data.patient_id,
                reportId: data.reportId,
                slideRefId: data.slideRefId,
                createdAt: new Date().toISOString(),
                reviewStatus: "Pending Review",
                full_name: patientName.trim(),
                age: parseInt(age),
                date: date,
                gender: gender,
                smokingHistory: smokingHistory,
                specimenType: specimenType,
                referralSource: referralSource,
                attendingPathologist: loggedInDoctor,
                hospitalNetwork: doctorHospital,
                doctorId: user?.id,
                clinicalHistory: clinicalHistory.trim(),
                uploadedImage: uploadedImage,
                uploadedFileName: uploadedFileName,
                aiDiagnosis: data.aiDiagnosis,
                status: data.aiDiagnosis,
                probability: 0,
                cancerSubtype: data.subtype || null,
                subtypeAbbr: data.subtypeAbbr || null,
                survivalMonths: data.survivalMonths || null,
                riskCategory: data.riskCategory || null,
                uploadedImagePath: data.uploaded_image_path || null,
            };

            // Helper to normalize diagnosis label:
            const isCancerResult = data.aiDiagnosis === 'Cancer';

            setAnalysisResult({
                ...newRecord,
                is_cancer: isCancerResult,
                // Use exact values from backend
                subtype: data.subtype || null,
                subtype_confidence: data.subtype_confidence || 0,
                survival_probability: data.survival_probability || 0,
                survival_months: data.survivalMonths || 0,
                risk_category: data.riskCategory || null,
                mlDetails: data.mlDetails || {},
            });
            setProgress(100);
            setPageState("complete");
            addNotification('Analysis Complete', `Diagnostic result for ${patientName} ready.`, 'success');

        } catch (err) {
            console.error('Analysis error:', err);
            setPageState("form");
            const msg = err.response?.data?.error || 'Connection failed. Make sure the backend servers are running.';
            setAnalysisError(msg);
            addNotification('Analysis Failed', msg, 'error');
        }
    };

    const handleSaveToRecords = async () => {
        if (!analysisResult || isSaving || isSaved) return;

        setIsSaving(true);
        try {
            // Patient was already saved to DB by /api/analysis/predict
            // Just refresh the context to pick up the new record
            if (token) {
                await fetchPatients();
            }
            setIsSaved(true);
            addNotification('Record Saved', `Patient ${patientName} added to registry.`, 'success');
            
            // Navigate to records page after a short delay
            setTimeout(() => {
                navigate('/patients', { state: { highlightId: analysisResult.patient_id } });
            }, 1000);

        } catch (err) {
            addNotification('Sync Warning', 'Record saved but local refresh failed. Data will sync on next page load.', 'warning');
            setIsSaved(true); // still mark saved since DB has it
        } finally {
            setIsSaving(false);
        }
    };

    // Render logic based on state
    if (pageState === "analysing") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] animate-fade-in">
                <div className="mb-[40px] text-center">
                    <h1 className="text-[18px] font-bold text-[var(--accent-teal)] mb-[8px] tracking-widest uppercase">CancerScan</h1>
                    <p className="text-[12px] text-[var(--text-muted)] uppercase tracking-widest">Deep Learning Pipeline</p>
                </div>

                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[12px] p-[32px] w-full max-w-[500px] shadow-2xl">
                    <div className="flex items-center gap-[16px] mb-[24px]">
                        <div className="w-[48px] h-[48px] rounded-full bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] flex items-center justify-center font-bold text-[18px]">
                            {patientName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-[18px] font-bold text-[color:var(--text-primary)] mb-1">{patientName}</h2>
                            <p className="text-[13px] text-[color:var(--text-muted)]">{age} yrs • {gender} • {doctorHospital}</p>
                        </div>
                    </div>

                    <div className="h-[1px] w-full bg-[var(--border-subtle)] mb-[24px]"></div>

                    <div className="mb-[24px]">
                        <div className="flex justify-between text-[13px] font-medium text-[var(--text-primary)] mb-[8px]">
                            <span>{progressText}</span>
                        </div>
                        <div className="w-full h-[10px] bg-[color:var(--bg-surface-alt)] rounded-full overflow-hidden mb-[8px]">
                            <motion.div
                                className="h-full bg-[var(--accent-teal)] rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ ease: "linear", duration: 0.3 }}
                            />
                        </div>
                        <div className="text-[12px] text-[var(--text-muted)] text-right">{progress}% complete</div>
                    </div>

                    <div className="space-y-[12px] mb-[32px]">
                        {[
                            "Validating WSI slide...",
                            "Extracting tissue features...",
                            "Running CNN pipeline...",
                            "Generating diagnosis...",
                            "Preparing report..."
                        ].map((step, idx) => {
                            const isCompleted = completedSteps.includes(step);
                            const isActive = progressText === step;

                            return (
                                <div key={idx} className="flex items-center gap-[12px]">
                                    {isCompleted ? (
                                        <CheckCircle2 size={16} className="text-[var(--status-success)]" />
                                    ) : isActive ? (
                                        <CircleDashed size={16} className="text-[var(--accent-teal)] animate-spin" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border-2 border-[var(--border-subtle)] opacity-50" />
                                    )}
                                    <span className={`text-[13px] font-medium transition-colors ${isCompleted ? 'text-[var(--status-success)]' : isActive ? 'text-[var(--text-primary)]' : 'text-[color:var(--text-muted)] opacity-50'}`}>
                                        {step}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <p className="text-[11px] text-[var(--text-muted)] italic text-center w-full">Do not close this window</p>
                </div>
            </div>
        );
    }

    if (pageState === "complete") {
        const mlData = analysisResult.mlDetails || {};
        const isCancer = mlData.is_cancer === true;
        const lowConfidence = mlData.low_confidence === true;
        const uiColor = mlData.ui_color || (isCancer ? 'red' : 'green');
        const recommendation = mlData.recommendation || (isCancer ? "Immediate formal review required" : "Routine clinical assessment advised");
        const probabilities = mlData.class_probabilities || {};

        const getCardStyle = () => {
            if (uiColor === 'yellow') return 'bg-amber-100 border-amber-400 text-amber-700';
            if (uiColor === 'red') return 'bg-red-100 border-red-400 text-red-700';
            return 'bg-emerald-100 border-emerald-400 text-emerald-700';
        };

        const getIcon = () => {
            if (uiColor === 'yellow') return <CircleDashed size={48} className="text-amber-500" />;
            if (uiColor === 'red') return <ShieldAlert size={48} className="text-red-500" />;
            return <CheckCircle2 size={48} className="text-emerald-500" />;
        };

        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] animate-fade-in">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[12px] p-[32px] w-full max-w-[500px] shadow-2xl">
                    <div className="text-center mb-[24px]">
                        <h2 className="text-[20px] font-bold text-[var(--status-success)] flex items-center justify-center gap-2">
                            <CheckCircle2 size={24} /> Analysis Complete
                        </h2>
                    </div>

                    <div className="h-[1px] w-full bg-[var(--border-subtle)] mb-[24px]"></div>

                    <div className={`p-[40px] rounded-[12px] text-center mb-[24px] border-2 shadow-lg ${getCardStyle()}`}>
                        <div className="flex justify-center mb-4">
                            {getIcon()}
                        </div>
                        <h3 className="text-[24px] font-black tracking-tighter mb-2">
                            {lowConfidence ? "INCONCLUSIVE" : analysisResult.aiDiagnosis.toUpperCase()}
                        </h3>
                        <p className="text-[12px] font-bold uppercase tracking-widest opacity-80 mb-4">
                            FINAL DIAGNOSTIC RESULT
                        </p>
                        <div className="bg-[rgba(255,255,255,0.5)] backdrop-blur-sm p-3 rounded-md text-sm font-semibold opacity-90 text-left border border-black/10">
                            ⚕️ {recommendation}
                        </div>
                    </div>

                    {/* Raw Probabilities transparency card */}
                    {Object.keys(probabilities).length > 0 && (
                        <div className="mb-6 p-4 border rounded-lg bg-[var(--bg-surface-alt)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]">
                            <h3 className="text-[12px] font-bold text-[var(--text-muted)] tracking-widest uppercase mb-3 text-center">
                                Model Confidence Spread
                            </h3>
                            <div className="space-y-3">
                                {Object.entries(probabilities).map(([className, prob]) => {
                                    const pct = (prob * 100).toFixed(1);
                                    return (
                                        <div key={className} className="flex flex-col gap-1">
                                            <div className="flex justify-between text-xs font-semibold text-[color:var(--text-primary)]">
                                                <span>{className}</span>
                                                <span>{pct}%</span>
                                            </div>
                                            <div className="w-full bg-black/10 rounded-full h-2 overflow-hidden">
                                                <div 
                                                    className="h-full rounded-full transition-all" 
                                                    style={{ width: `${pct}%`, backgroundColor: 'var(--accent-teal)' }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Subtype Classification Card */}
                    {isCancer && !lowConfidence && analysisResult.subtype && (
                        <div style={{
                          background:   isDark ? '#1a1a2e' : '#ffffff',
                          border:       isDark ? '1px solid #2d2d4e' : '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding:      '20px',
                          marginBottom: '12px',
                          boxShadow:    isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
                        }}>
                          <div style={{
                            display:    'flex',
                            alignItems: 'center',
                            gap:        '8px',
                            marginBottom:'14px',
                            fontSize:   '12px',
                            fontWeight: 700,
                            color:      isDark ? '#94a3b8' : '#64748b',
                            letterSpacing:'1.5px',
                          }}>
                            🔬 SUBTYPE CLASSIFICATION
                          </div>

                          <div style={{
                            display:        'flex',
                            justifyContent: 'space-between',
                            alignItems:     'center',
                            marginBottom:   '12px',
                          }}>
                            <span style={{
                              fontSize:   '18px',
                              fontWeight: 700,
                              color:      isDark ? '#f1f5f9' : '#1e293b',
                            }}>
                              {analysisResult.subtype}
                            </span>
                            <span style={{
                              background:   isDark ? '#ef444420' : '#fef2f2',
                              border:       isDark ? '1px solid #ef4444' : '1px solid #fca5a5',
                              color:        isDark ? '#ef4444' : '#dc2626',
                              padding:      '4px 12px',
                              borderRadius: '20px',
                              fontSize:     '12px',
                              fontWeight:   700,
                            }}>
                              {analysisResult.subtype?.includes('SCC')
                                ? 'SCC' : 'ACA'}
                            </span>
                          </div>

                          <div style={{ marginBottom:'6px' }}>
                            <div style={{
                              display:        'flex',
                              justifyContent: 'space-between',
                              fontSize:       '12px',
                              color:          isDark ? '#64748b' : '#94a3b8',
                              marginBottom:   '6px',
                              letterSpacing:  '1px',
                            }}>
                              <span>MODEL CONFIDENCE</span>
                              <span style={{ color: isDark ? '#f1f5f9' : '#1e293b',
                                fontWeight:600 }}>
                                {analysisResult.subtype_confidence}%
                              </span>
                            </div>
                            <div style={{
                              height:       '6px',
                              background:   isDark ? '#1e293b' : '#f1f5f9',
                              border:       isDark ? 'none' : '1px solid #e2e8f0',
                              borderRadius: '3px',
                              overflow:     'hidden',
                            }}>
                              <div style={{
                                height:     '100%',
                                width:      `${analysisResult.subtype_confidence}%`,
                                background: 'linear-gradient(90deg, #ef4444, #f97316)',
                                borderRadius: '3px',
                                transition: 'width 1s ease',
                              }} />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Survival Probability Card */}
                      {isCancer && analysisResult.survival_probability != null && (
                        <div style={{
                          background:   isDark ? '#1a1a2e' : '#ffffff',
                          border:       isDark ? '1px solid #2d2d4e' : '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding:      '20px',
                          marginBottom: '12px',
                          boxShadow:    isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
                        }}>
                          <div style={{
                            display:    'flex',
                            alignItems: 'center',
                            justifyContent:'space-between',
                            marginBottom:'16px',
                          }}>
                            <div style={{
                              fontSize:     '12px',
                              fontWeight:   700,
                              color:        isDark ? '#94a3b8' : '#64748b',
                              letterSpacing:'1.5px',
                              display:      'flex',
                              alignItems:   'center',
                              gap:          '8px',
                            }}>
                              🫀 SURVIVAL PROBABILITY
                            </div>
                            <span style={{
                              fontSize:   '28px',
                              fontWeight: 800,
                              color: analysisResult.survival_probability >= 60
                                ? (isDark ? '#22c55e' : '#16a34a')
                                : analysisResult.survival_probability >= 40
                                ? (isDark ? '#f59e0b' : '#d97706')
                                : (isDark ? '#ef4444' : '#dc2626'),
                            }}>
                              {analysisResult.survival_probability}%
                            </span>
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap:     '10px',
                          }}>
                            {/* Risk Level */}
                            <div style={{
                              background:   isDark ? '#0f172a' : '#f8fafc',
                              border:       isDark ? 'none' : '1px solid #e2e8f0',
                              borderRadius: '10px',
                              padding:      '16px',
                              textAlign:    'center',
                            }}>
                              <div style={{
                                fontSize:   '24px',
                                marginBottom:'6px',
                              }}>
                                {analysisResult.risk_category === 'Low'
                                  ? '💚'
                                  : analysisResult.risk_category === 'Moderate'
                                  ? '🟡' : '🔴'}
                              </div>
                              <div style={{
                                fontSize:   '16px',
                                fontWeight: 700,
                                color: analysisResult.risk_category === 'Low'
                                  ? (isDark ? '#22c55e' : '#16a34a')
                                  : analysisResult.risk_category === 'Moderate'
                                  ? (isDark ? '#f59e0b' : '#d97706')
                                  : (isDark ? '#ef4444' : '#dc2626'),
                              }}>
                                {analysisResult.risk_category}
                              </div>
                              <div style={{
                                fontSize:     '10px',
                                color:        isDark ? '#64748b' : '#94a3b8',
                                letterSpacing:'1px',
                                marginTop:    '4px',
                              }}>
                                RISK LEVEL
                              </div>
                            </div>

                            {/* Estimated Months */}
                            <div style={{
                              background:   isDark ? '#0f172a' : '#f8fafc',
                              border:       isDark ? 'none' : '1px solid #e2e8f0',
                              borderRadius: '10px',
                              padding:      '16px',
                              textAlign:    'center',
                            }}>
                              <div style={{
                                fontSize:   '24px',
                                marginBottom:'6px',
                              }}>🕐</div>
                              <div style={{
                                fontSize:   '24px',
                                fontWeight: 700,
                                color:      isDark ? '#f1f5f9' : '#1e293b',
                              }}>
                                {analysisResult.survival_months}
                              </div>
                              <div style={{
                                fontSize:     '10px',
                                color:        isDark ? '#64748b' : '#94a3b8',
                                letterSpacing:'1px',
                                marginTop:    '4px',
                              }}>
                                EST. MONTHS
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    <div className="bg-[color:var(--bg-surface-alt)] p-[16px] rounded-[8px] mb-[24px] border border-[color:var(--border-subtle)] space-y-[8px]">
                        <p className="text-[13px] text-[var(--accent-teal)] font-medium">Patient ID: {analysisResult.patient_id}</p>
                        <p className="text-[13px] text-[color:var(--text-muted)] font-medium">Report ID: {analysisResult.reportId}</p>
                        <p className="text-[12px] text-[color:var(--status-success)] flex items-center gap-2 mt-2 pt-2 border-t border-[color:var(--border-subtle)]"><CheckCircle2 size={12} /> Saved to Patient Intelligence</p>
                        <p className="text-[12px] text-[color:var(--status-success)] flex items-center gap-2"><CheckCircle2 size={12} /> Report generated in Clinical Reports</p>
                    </div>

                    <div className="h-[1px] w-full bg-[var(--border-subtle)] mb-[24px]"></div>

                    <div className="flex flex-col gap-[12px] mb-[16px]">
                        {!isSaved ? (
                            <button
                                onClick={handleSaveToRecords}
                                disabled={isSaving}
                                className="w-full bg-[var(--accent-teal)] text-black font-bold py-[12px] rounded-[6px] hover:bg-[#00c9b3] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                Save to Clinical Records
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate('/patients', { state: { highlightId: analysisResult.patient_id } })}
                                className="w-full bg-[var(--status-success)]/20 text-[var(--status-success)] border border-[var(--status-success)]/30 font-bold py-[12px] rounded-[6px] transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={18} /> View in Patient Records
                            </button>
                        )}
                        
                        <button
                            onClick={resetForm}
                            className="w-full border border-[var(--border-subtle)] text-[var(--color-text-secondary)] font-medium py-[12px] rounded-[6px] hover:bg-white/5 transition-colors"
                        >
                            New Analysis
                        </button>
                    </div>

                    {isSaved && (
                        <AutoRedirectTimer target="/patients" targetState={{ highlightId: analysisResult.patient_id }} delay={3} />
                    )}
                </div>
            </div>
        );
    }

    // Default "form" view
    return (
        <div>
            <div className="mb-[40px]">
                <h1 className="text-[24px] font-bold text-[var(--text-primary)] mb-[8px]">Diagnostic Workspace</h1>
                <p className="text-[14px] text-[var(--text-muted)]">Enter patient context, upload the histopathology slide, and run the deep learning pipeline.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-[24px]">

                {/* ═══ LEFT: Patient Details ═══ */}
                <div className="med-card !mb-0 h-min">
                    <div className="flex items-center gap-3 mb-[24px]">
                        <UserPlus size={20} className="text-[var(--accent-blue)]" />
                        <h2 className="text-[18px] font-bold text-[var(--text-primary)] font-display tracking-tight">Patient Context</h2>
                    </div>

                    <div className="space-y-[16px]">
                        <div>
                            <label className="block text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Patient Full Name</label>
                            <input className="med-input" placeholder="John Doe" value={patientName} onChange={e => setPatientName(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-[16px]">
                            <div>
                                <label className="block text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Age</label>
                                <input className="med-input" type="text" placeholder="45" value={age} onChange={e => setAge(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Date (DD/MM/YYYY)</label>
                                <input className="med-input" placeholder="01/01/2026" value={date} onChange={e => setDate(e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-[16px]">
                            <div>
                                <label className="block text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Gender</label>
                                <select className="med-select" value={gender} onChange={e => setGender(e.target.value)}>
                                    <option>Male</option><option>Female</option><option>Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Smoking History</label>
                                <select className="med-select" value={smokingHistory} onChange={e => setSmokingHistory(e.target.value)}>
                                    <option>No</option><option>Yes</option>
                                </select>
                            </div>
                        </div>

                        {/* ROW: Specimen Type & Referral Source */}
                        <div className="grid grid-cols-2 gap-[16px]">
                            <div>
                                <label className="block text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Specimen Type</label>
                                <select className="med-select" value={specimenType} onChange={e => setSpecimenType(e.target.value)}>
                                    <option>Right Upper Lobe</option>
                                    <option>Right Lower Lobe</option>
                                    <option>Left Upper Lobe</option>
                                    <option>Left Lower Lobe</option>
                                    <option>Bronchial Biopsy</option>
                                    <option>Lymph Node</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Referral Source</label>
                                <select className="med-select" value={referralSource} onChange={e => setReferralSource(e.target.value)}>
                                    <option>GP / Family Doctor</option>
                                    <option>Self Referred</option>
                                    <option>Pulmonologist</option>
                                    <option>Oncologist</option>
                                    <option>Surgeon</option>
                                    <option>Emergency Department</option>
                                </select>
                            </div>
                        </div>

                        {/* READ-ONLY ATTRIBUTION */}
                        <div className="grid grid-cols-2 gap-[16px]">
                            <div>
                                <label className="block text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Attending Pathologist</label>
                                <input className="med-input opacity-70" value={loggedInDoctor} disabled />
                            </div>
                            <div>
                                <label className="block text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Hospital Network</label>
                                <input className="med-input opacity-70" value={doctorHospital} disabled />
                            </div>
                        </div>

                        {/* ROW: CLINICAL HISTORY */}
                        <div>
                            <label className="block text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Clinical History (Optional)</label>
                            <textarea
                                className="med-input resize-y"
                                rows={3}
                                maxLength={500}
                                placeholder="Describe patient symptoms..."
                                value={clinicalHistory}
                                onChange={e => setClinicalHistory(e.target.value)}
                            />
                            <div className="text-right text-[11px] text-[color:var(--text-muted)] mt-1">{clinicalHistory.length}/500</div>
                        </div>

                        {/* Submit Button */}
                        <AnimatePresence>
                            {isFormComplete && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 8 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="pt-[16px]"
                                >
                                    <button
                                        onClick={handleRunAnalysis}
                                        className="w-full h-[52px] bg-[var(--accent-teal)] hover:bg-[#00c9b3] hover:scale-[1.01] transition-all rounded-[8px] flex items-center justify-center gap-[12px] text-black font-bold text-[16px]"
                                    >
                                        <Zap size={20} /> Run Analysis
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* ═══ RIGHT: Image & Results ═══ */}
                <div className="med-card !mb-0 flex flex-col items-center h-min">

                    {imageError && (
                        <div className="w-full bg-[var(--status-danger)]/10 text-[var(--status-danger)] text-[13px] font-medium p-[12px] rounded-[8px] border border-[var(--status-danger)] mb-[16px]">
                            {imageError}
                        </div>
                    )}

                    <div className="flex flex-col w-full">
                        <div className="flex items-center gap-3 mb-[24px]">
                            <FileText size={20} className="text-[var(--accent-teal)]" />
                            <h2 className="text-[18px] font-bold text-[var(--text-primary)] font-display tracking-tight">Upload Slide (WSI)</h2>
                        </div>

                        {/* Image Uploader */}
                        <div
                            className={`h-[200px] border-2 border-dashed border-[var(--border-subtle)] rounded-[10px] bg-[var(--bg-surface-alt)] p-[24px] flex flex-col items-center justify-center cursor-pointer hover:border-[var(--accent-teal)] hover:bg-[var(--bg-surface)] transition-colors relative`}
                            onDragOver={handleFileDrag}
                            onDrop={handleFileDrop}
                            onClick={() => !uploadedImage && fileInputRef.current?.click()}
                        >
                            <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} accept="image/jpeg,image/png,image/jpg" />

                            {uploadedImage ? (
                                <div className="flex flex-col items-center justify-center w-full h-full z-10">
                                    <img src={uploadedImage} alt="Slide Preview" className="h-[140px] w-auto max-w-full object-contain rounded-[6px]" />
                                    <div className="mt-[12px] text-[12px] text-[color:var(--text-muted)]">
                                        {uploadedFileName} • {uploadedFileSize}
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setUploadedImage(null);
                                            setUploadedFileName(null);
                                            setUploadedFileSize(null);
                                        }}
                                        className="mt-[8px] text-[12px] font-semibold text-[var(--accent-teal)] hover:underline cursor-pointer"
                                    >
                                        ✕ Remove Image
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <UploadCloud size={40} className={`mb-3 text-[var(--accent-blue)]`} />
                                    <p className={`text-[14px] font-medium mb-1 text-[var(--text-primary)]`}>Click or drag image here</p>
                                    <p className="text-[12px] text-[var(--text-muted)]">Supports JPG, PNG (Max 50MB)</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Component to handle countdown and redirect
function AutoRedirectTimer({ target, targetState, delay }) {
    const [timeLeft, setTimeLeft] = useState(delay);
    const navigate = useNavigate();

    useEffect(() => {
        if (timeLeft <= 0) {
            navigate(target, { state: targetState });
            return;
        }

        const timerId = setTimeout(() => {
            setTimeLeft(timeLeft - 1);
        }, 1000);

        return () => clearTimeout(timerId);
    }, [timeLeft, navigate, target, targetState]);

    return (
        <p className="text-[color:var(--text-muted)] text-[12px] text-center mt-[12px]">
            Redirecting to Patient Records in {timeLeft}s...
        </p>
    );
}
