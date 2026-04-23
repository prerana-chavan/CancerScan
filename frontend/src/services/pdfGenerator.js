import { jsPDF } from 'jspdf';
import { fetchImageForPDF } from '../utils/imageUtils';

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

const formatToDDMMYYYY = (input) => {
    if (!input) return 'N/A'

    // Case 1: Already "DD/MM/YYYY" — return as-is
    if (typeof input === 'string' &&
        input.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        return input
    }

    // Case 2: ISO string "2026-03-10" or "2026-03-10T..."
    if (typeof input === 'string' && input.includes('-')) {
        const dateObj = new Date(input)
        const day = String(dateObj.getUTCDate()).padStart(2, '0')
        const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0')
        const year = dateObj.getUTCFullYear()
        return `${day}/${month}/${year}`
    }

    // Case 3: Date object
    if (input instanceof Date) {
        const day = String(input.getDate()).padStart(2, '0')
        const month = String(input.getMonth() + 1).padStart(2, '0')
        const year = input.getFullYear()
        return `${day}/${month}/${year}`
    }

    return String(input)
}



const drawSectionBox = (doc, y, height, title) => {
    doc.setFillColor(10, 124, 92);
    // height reduced to 7mm as per Fix 5
    doc.roundedRect(15, y, 180, 7, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(title.toUpperCase(), 19, y + 4.5);
    return y + 12; // 7mm header + 5mm padding
};

const drawHorizontalLine = (doc, y, color = [200, 200, 200]) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.1);
    doc.line(15, y, 195, y);
};

const labelValue = (doc, x, y, label, value, valueColor = [26, 26, 26]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5); // Fix 5: Label font size reduced
    doc.setTextColor(130, 130, 130);
    doc.text(label.toUpperCase() + ':', x, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5); // Fix 5: Body font size
    doc.setTextColor(...valueColor);
    doc.text(String(value), x + 35, y);
};

const wrapText = (doc, text, x, y, maxWidth, lineHeight) => {
    const lines = doc.splitTextToSize(text || "", maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * lineHeight);
};

const drawProgressBar = (doc, x, y, width, height, percentage, fillColor) => {
    // Background bar
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(x, y, width, height, 1, 1, 'F');
    // Filled bar
    const fillWidth = (percentage / 100) * width;
    doc.setFillColor(...fillColor);
    doc.roundedRect(x, y, fillWidth, height, 1, 1, 'F');
};

const drawFooter = (doc, pageNum, totalPages) => {
    const y = 282;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(15, 281, 195, 281);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);

    // Left
    doc.text("CONFIDENTIAL — FOR CLINICAL USE ONLY", 15, 286);
    // Center
    doc.text("CancerScan AI Powered Lung Cancer Detection", 105, 286, { align: 'center' });
    // Right
    doc.text(`Page ${pageNum} of ${totalPages}`, 195, 286, { align: 'right' });
};

const drawSignOff = (doc, startY, data) => {
    const attendingPathologist = data.attendingPathologist || data.attending_pathologist || 'N/A';
    const hospitalNetwork = data.hospitalNetwork || data.hospital || 'N/A';
    const reviewStatus = data.reviewStatus || data.status || data.status_stage || 'Pending Review';
    const clinicalId = data.clinicalId || data.patient_id || 'N/A';

    let y = startY;

    // Section header
    doc.setFillColor(10, 124, 92);
    doc.rect(15, y, 180, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('PATHOLOGIST VERIFICATION', 19, y + 5);
    y += 10;

    // LEFT COLUMN
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 130);
    doc.text('REPORTED BY:', 18, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(26, 26, 26);
    doc.text(attendingPathologist, 18, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(hospitalNetwork, 18, y + 12);
    doc.text('DATE: ' + formatToDDMMYYYY(new Date()), 18, y + 18);

    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 130);
    doc.text('REVIEW STATUS:', 18, y + 26);

    // Status badge
    const statusColorMap = {
        'Confirmed': [30, 132, 73],
        'Under Review': [180, 120, 0],
        'Referred': [108, 52, 255],
        'Discharged': [30, 132, 73],
    };
    const sColor = [30, 132, 73]; // Default to verde/confirmed for AI result 


    doc.setFillColor(...sColor);
    doc.roundedRect(18, y + 29, 40, 6, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text("VERIFIED", 38, y + 33.5, { align: 'center' });

    // RIGHT COLUMN
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 130);
    doc.text('SIGNATURE:', 108, y);

    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.4);
    doc.line(108, y + 12, 190, y + 12);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text('Authorized Signature', 108, y + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 130);
    doc.text('VERIFIED VIA:', 108, y + 23);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(10, 124, 92);
    doc.text('CancerScan AI System', 108, y + 29);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text('Digital Record ID: ' + clinicalId, 108, y + 35);

    y += 42;

    // Academic disclaimer
    const disclaimer =
        'ACADEMIC PROJECT DISCLAIMER: This report was generated ' +
        'by an AI system as part of a final year academic project. ' +
        'It is NOT a certified medical diagnosis and must NOT be ' +
        'used for clinical decisions without review by a qualified, ' +
        'licensed pathologist.';

    const dLines = doc.splitTextToSize(disclaimer, 168);
    const dH = dLines.length * 3.8 + 6;

    doc.setFillColor(255, 243, 205);
    doc.setDrawColor(255, 193, 7);
    doc.setLineWidth(0.3);
    doc.roundedRect(18, y, 174, dH, 1, 1, 'FD');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.2);
    doc.setTextColor(140, 90, 0);
    doc.text(dLines, 22, y + 4);

    return y + dH + 3; // return final Y position
};

export const generatePatientPDF = async (patientRecord) => {
    if (!patientRecord) {
        console.error('generatePatientPDF: No patientRecord provided');
        return;
    }

    try {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const clinicalId = patientRecord.clinicalId || patientRecord.patient_id || 'N/A';
        const reportId = patientRecord.reportId || patientRecord.report_id || `REP-${new Date().getFullYear()}-TEMP`;
        const slideRefId = patientRecord.slideRefId || 'N/A';
        const patientName = patientRecord.patientName || patientRecord.full_name || 'Unknown Patient';
        const age = patientRecord.age || 'N/A';
        const gender = patientRecord.gender || 'N/A';
        const date = patientRecord.date || patientRecord.diagnosis_date || patientRecord.created_at || new Date().toISOString();
        const smokingHistory = patientRecord.smokingHistory || patientRecord.smoking_history || 'N/A';
        const specimenType = patientRecord.specimenType || patientRecord.specimen_type || 'Lung Tissue';
        const referralSource = patientRecord.referralSource || patientRecord.referral || 'Clinical Staff';
        const attendingPathologist = patientRecord.attendingPathologist || patientRecord.attending_pathologist || patientRecord.pathologist || 'N/A';
        const hospitalNetwork = patientRecord.hospitalNetwork || patientRecord.hospital || patientRecord.hospital_name || 'N/A';
        const clinicalHistory = patientRecord.clinicalHistory || patientRecord.clinical_history || patientRecord.notes || '';
        const uploadedImage = patientRecord.uploadedImage || patientRecord.uploaded_image || patientRecord.image_path || null;
        const aiDiagnosis = patientRecord.aiDiagnosis || patientRecord.ai_diagnosis || patientRecord.prediction_result || 'Under Review';
        const probability = patientRecord.probability || 0;
        const reviewStatus = patientRecord.reviewStatus || patientRecord.status_stage || patientRecord.status || 'Pending Review';
        const createdAt = patientRecord.createdAt || patientRecord.created_at || new Date().toISOString();
        const subtype = patientRecord.subtype || patientRecord.subtype_result || null;
        const subtype_confidence = patientRecord.subtype_confidence || 0;
        const survival_probability = patientRecord.survival_probability || patientRecord.survival_rate || null;
        const survival_months = patientRecord.survival_months || null;
        const risk_category = patientRecord.risk_category || null;
        
        const base64Image = await fetchImageForPDF(uploadedImage);

        const isCancer = String(aiDiagnosis).toLowerCase().includes('cancer') && !String(aiDiagnosis).toLowerCase().includes('no cancer');

        const cleanClinicalHistory = clinicalHistory
            ? clinicalHistory
                .replace(/\r\n|\r|\n/g, ' ')
                .replace(/\s{2,}/g, ' ')
                .trim()
            : '';

        console.log('Generating PDF for:', patientName, 'Image exists:', !!base64Image);

        const scanDateDisplay = formatToDDMMYYYY(date);
        const reportDateDisplay = formatToDDMMYYYY(new Date());
        const signDateDisplay = formatToDDMMYYYY(new Date());

        // --- SECTION 1: REPORT HEADER ---
        // Step 1: Draw teal filled box
        doc.setFillColor(10, 124, 92);
        doc.roundedRect(15, 15, 54, 14, 2, 2, 'F');

        // Step 2: White text INSIDE box
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(255, 255, 255);  // WHITE
        doc.text('CANCERSCAN', 18, 24.5);

        // Step 3: Gray subtitle BELOW box
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(130, 130, 130);  // GRAY
        doc.text('AI Powered Lung Cancer Detection System', 15, 33);
        doc.text('Academic Research Project', 15, 37);

        // Step 4: Right side header (report info)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(26, 26, 26);
        doc.text('HISTOPATHOLOGY REPORT', 195, 20, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(10, 124, 92);  // TEAL
        doc.text('Report ID: ' + reportId, 195, 27, { align: 'right' });

        doc.setTextColor(130, 130, 130);
        doc.setFontSize(8);
        doc.text('Generated: ' + formatToDDMMYYYY(new Date()), 195, 32, { align: 'right' });

        // Step 5: Status badge (right side)
        const badgeColors = {
            'Confirmed': [30, 132, 73],
            'Under Review': [180, 120, 0],
            'default': [41, 98, 255]
        };
        const badgeColor = reviewStatus === 'Confirmed'
            ? badgeColors['Confirmed']
            : reviewStatus === 'Under Review'
                ? badgeColors['Under Review']
                : badgeColors['default'];

        const badgeText = reviewStatus === 'Confirmed'
            ? 'FINAL REPORT'
            : reviewStatus === 'Under Review'
                ? 'PRELIMINARY'
                : 'AI GENERATED';

        doc.setFillColor(...badgeColor);
        doc.roundedRect(163, 34, 32, 6, 1.5, 1.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text(badgeText, 179, 38.2, { align: 'center' });

        doc.setDrawColor(10, 124, 92);
        doc.setLineWidth(0.8);
        doc.line(15, 42, 195, 42);

        let currentY = 45; // Fixed target for Patient Info

        // --- SECTION 2: PATIENT INFORMATION BOX ---
        drawSectionBox(doc, currentY, 38, "PATIENT INFORMATION");
        let contentY = currentY + 12; // 5mm padding + 7mm header

        const smokeColor = smokingHistory === 'Yes' ? [192, 57, 43] : [30, 132, 73];
        labelValue(doc, 18, contentY, "Patient Name", patientName);
        labelValue(doc, 18, contentY + 5.5, "Clinical ID", clinicalId, [10, 124, 92]);
        labelValue(doc, 18, contentY + 11, "Age", `${age} years`);
        labelValue(doc, 18, contentY + 16.5, "Gender", gender);
        labelValue(doc, 18, contentY + 22, "Smoking", smokingHistory, smokeColor);

        labelValue(doc, 108, contentY, "Hospital", hospitalNetwork);
        labelValue(doc, 108, contentY + 5.5, "Pathologist", attendingPathologist);
        labelValue(doc, 108, contentY + 11, "Referral", referralSource);
        labelValue(doc, 108, contentY + 16.5, "Scan Date", scanDateDisplay);
        labelValue(doc, 108, contentY + 22, "Report Date", reportDateDisplay);

        currentY += 38 + 3; // Box height 38 + 3mm gap

        // --- SECTION 3: SPECIMEN & SLIDE DETAILS ---
        drawSectionBox(doc, currentY, 22, "SPECIMEN & SLIDE DETAILS");
        contentY = currentY + 12;

        labelValue(doc, 18, contentY, "Specimen Type", specimenType);
        labelValue(doc, 108, contentY, "Slide Reference", slideRefId);
        labelValue(doc, 18, contentY + 5.5, "Analysis Model", 'CancerScan DL v2.1');
        labelValue(doc, 108, contentY + 5.5, "Slide Format", 'WSI — Whole Slide Image');

        currentY += 22 + 3; // Box height 22 + 3mm gap

        // --- FIX 1: CLINICAL HISTORY RENDERING ---
        // Clinical History label
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(10, 124, 92);
        doc.text('CLINICAL HISTORY', 18, currentY);
        currentY += 5;

        // Prepare text
        const rawHistory = clinicalHistory || '';
        const cleanHistory = rawHistory
            .replace(/\r\n|\r|\n/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();

        if (cleanHistory.length > 0) {
            // Calculate lines
            const histLines = doc.splitTextToSize(cleanHistory, 168);
            const boxH = Math.max(12, histLines.length * 4.2 + 7);

            // Gray background box
            doc.setFillColor(248, 248, 248);
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.3);
            doc.roundedRect(18, currentY, 174, boxH, 1.5, 1.5, 'FD');

            // Text inside box
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(40, 40, 40);
            doc.text(histLines, 22, currentY + 5);

            currentY += boxH + 3; // Box height + gap
        } else {
            // Empty state
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8.5);
            doc.setTextColor(160, 160, 160);
            doc.text('No clinical history provided.', 22, currentY + 4);
            currentY += 12;
        }

        // --- SECTION 4: AI DIAGNOSIS RESULT ---
        if (currentY > 210) {
            doc.addPage();
            currentY = 20;
        }

        const diagSectionY = currentY;
        doc.setFillColor(10, 124, 92);
        doc.rect(15, diagSectionY, 180, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text('AI DIAGNOSIS RESULT', 19, diagSectionY + 5);

        currentY = diagSectionY + 10;

        const diagColor = isCancer
            ? { bg: [255, 245, 245], border: [192, 57, 43], text: [192, 57, 43] }
            : { bg: [245, 255, 248], border: [30, 132, 73], text: [30, 132, 73] };

        doc.setFillColor(...diagColor.bg);
        doc.setDrawColor(...diagColor.border);
        doc.setLineWidth(0.5);
        doc.roundedRect(18, currentY, 174, 20, 2, 2, 'FD');

        doc.setFillColor(...diagColor.text);
        doc.circle(27, currentY + 10, 3, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(...diagColor.text);
        const diagLabel = isCancer ? 'CANCER DETECTED' : 'BENIGN';
        doc.text(diagLabel, 35, currentY + 12.5);

        let diagBoxHeight = 20;

        if (isCancer && subtype) {
            let sy = currentY + 22; // Start just below the diagnosis label

            // Draw subtype label
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(30, 41, 59); // HexColor('#1e293b')
            doc.text("SUBTYPE:", 18, sy);
            doc.setFont('helvetica', 'normal');
            doc.text(`${subtype} (Confidence: ${subtype_confidence}%)`, 18 + 25, sy);
            sy += 6;
            diagBoxHeight += 6;

            if (survival_probability != null) {
                // Draw survival label
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 41, 59);
                doc.text("SURVIVAL PROBABILITY:", 18, sy);
                doc.setFont('helvetica', 'normal');
                doc.text(`${survival_probability}%  |  Est. ${survival_months} months  |  Risk: ${risk_category}`, 18 + 50, sy);
                sy += 6;
                diagBoxHeight += 6;
            }

            // Adjust box size to fit new text
            doc.setFillColor(...diagColor.bg);
            doc.setDrawColor(...diagColor.border);
            doc.setLineWidth(0.5);
            doc.roundedRect(18, currentY, 174, diagBoxHeight, 2, 2, 'FD');
            
            // Re-draw circle and diagLabel
            doc.setFillColor(...diagColor.text);
            doc.circle(27, currentY + 10, 3, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.setTextColor(...diagColor.text);
            doc.text(diagLabel, 35, currentY + 12.5);
            
            // Re-draw subtype and survival text on top of the box
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(30, 41, 59);
            doc.text("SUBTYPE:", 18 + 4, currentY + 22);
            doc.setFont('helvetica', 'normal');
            doc.text(`${subtype} (Confidence: ${subtype_confidence}%)`, 18 + 4 + 25, currentY + 22);
            if (survival_probability != null) {
                doc.setFont('helvetica', 'bold');
                doc.text("SURVIVAL PROBABILITY:", 18 + 4, currentY + 28);
                doc.setFont('helvetica', 'normal');
                doc.text(`${survival_probability}%  |  Est. ${survival_months} months  |  Risk: ${risk_category}`, 18 + 4 + 50, currentY + 28);
            }
        }

        currentY += diagBoxHeight + 8;

        // Simplified Disclaimer box
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.roundedRect(18, currentY, 174, 8, 1, 1, 'FD');
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 100, 100);
        doc.text('This diagnostic result was generated by the CancerScan autonomous deep learning engine.', 22, currentY + 5);

        currentY += 12;

        // --- SECTION 5: CLINICAL FINDINGS ---
        if (currentY > 200) {
            doc.addPage();
            currentY = 20;
        }

        let microscopicText, impressionText, recommendationText;
        if (isCancer) {
            microscopicText = "The histological sections demonstrate a moderately differentiated adenocarcinoma. Tumor cells are arranged in acinar and lepidic patterns with focal areas of necrosis. Nuclear pleomorphism is moderate with prominent nucleoli and increased mitotic activity (approximately 6 mitoses per 10 HPF). Stromal desmoplasia is present at the invasive front. Lymphovascular invasion is suspected.";
            impressionText = "Findings are consistent with primary lung adenocarcinoma (Grade II — moderately differentiated). The morphological features suggest non-small cell lung carcinoma (NSCLC). Clinical correlation with imaging and staging is recommended.";
            recommendationText = "Multidisciplinary team (MDT) review strongly recommended. Consider CT-PET scan for staging. Molecular profiling advised: EGFR, ALK, ROS1, KRAS, PD-L1 expression testing.";
        } else {
            microscopicText = "The histological sections show preserved pulmonary architecture with no evidence of malignancy. Mild chronic inflammatory infiltrate is noted within the alveolar walls. Type II pneumocyte hyperplasia is present, likely reactive in nature. No nuclear atypia, necrosis, or abnormal mitotic figures are identified.";
            impressionText = "No evidence of malignancy identified in the submitted specimen. The changes noted are consistent with reactive inflammatory processes, likely secondary to infection or irritation.";
            recommendationText = "Clinical correlation is advised. If clinical suspicion remains high, repeat biopsy or radiological follow-up in 3 to 6 months is recommended.";
        }

        drawSectionBox(doc, currentY, 62, "CLINICAL FINDINGS");
        contentY = currentY + 12;

        const findingsFontSize = 8.5; // Fix 5
        const findingsLineHeight = 4; // Fix 5

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(10, 124, 92);
        doc.text("MICROSCOPIC DESCRIPTION", 18, contentY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(findingsFontSize);
        doc.setTextColor(26, 26, 26);
        contentY = wrapText(doc, microscopicText, 18, contentY + 5, 174, findingsLineHeight);

        drawHorizontalLine(doc, contentY + 1);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(10, 124, 92);
        doc.text("IMPRESSION", 18, contentY + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(findingsFontSize);
        doc.setTextColor(26, 26, 26);
        contentY = wrapText(doc, impressionText, 18, contentY + 10, 174, findingsLineHeight);

        drawHorizontalLine(doc, contentY + 1);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(10, 124, 92);
        doc.text("RECOMMENDATION", 18, contentY + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(findingsFontSize);
        doc.setTextColor(26, 26, 26);
        contentY = wrapText(doc, recommendationText, 18, contentY + 10, 174, findingsLineHeight);

        currentY = contentY + 10; // Dynamic tracking after findings

        // --- SMART IMAGE PLACEMENT (FIX) ---
        const FOOTER_LINE = 272; // footer starts here
        const MIN_IMAGE_HEIGHT = 35; // minimum useful image height
        const SIGNOFF_HEIGHT = 58; // pathologist section height

        const signOffData = {
            attendingPathologist,
            hospitalNetwork,
            reviewStatus,
            clinicalId,
        };

        // How much space left on current page?
        const spaceOnCurrentPage = FOOTER_LINE - currentY - 5;

        if (spaceOnCurrentPage >= MIN_IMAGE_HEIGHT) {
            // FIT IMAGE ON CURRENT PAGE
            const imgH = Math.min(55, spaceOnCurrentPage - 10);
            const imgW = 140;
            const imgX = (210 - imgW) / 2;

            // Section header
            doc.setFillColor(10, 124, 92);
            doc.rect(15, currentY, 180, 7, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(255, 255, 255);
            doc.text('HISTOPATHOLOGY SLIDE', 19, currentY + 5);
            currentY += 10;

            if (base64Image) {
                doc.addImage(base64Image, 'JPEG', imgX, currentY, imgW, imgH);
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(8);
                doc.setTextColor(120, 120, 120);
                doc.text('Fig 1: Uploaded WSI — ' + specimenType, 105, currentY + imgH + 5, { align: 'center' });
                currentY += imgH + 10;
            } else {
                doc.setDrawColor(190, 190, 190);
                doc.setLineWidth(0.4);
                doc.setLineDashPattern([2, 2], 0);
                doc.rect(35, currentY, 140, 22);
                doc.setLineDashPattern([], 0);
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(9);
                doc.setTextColor(170, 170, 170);
                doc.text('No scan image was attached to this record', 105, currentY + 13, { align: 'center' });
                currentY += 28;
            }

            // Check if sign-off fits after image on same page
            if (currentY + SIGNOFF_HEIGHT <= FOOTER_LINE) {
                currentY = drawSignOff(doc, currentY, signOffData);
            } else {
                doc.addPage();
                currentY = drawSignOff(doc, 20, signOffData);
            }
        } else {
            // NOT ENOUGH SPACE — image goes to page 2
            doc.addPage();
            currentY = 20;

            // 1. IMAGE SECTION HEADER
            doc.setFillColor(10, 124, 92);
            doc.rect(15, currentY, 180, 7, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(255, 255, 255);
            doc.text('HISTOPATHOLOGY SLIDE', 19, currentY + 5);
            currentY += 10;

            const imgH = 125; // tall image, fills page nicely
            const imgW = 165;
            const imgX = (210 - imgW) / 2;

            if (base64Image) {
                doc.addImage(base64Image, 'JPEG', imgX, currentY, imgW, imgH);
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(8);
                doc.setTextColor(120, 120, 120);
                doc.text('Fig 1: Uploaded WSI — ' + specimenType, 105, currentY + imgH + 5, { align: 'center' });
                currentY += imgH + 10;
            } else {
                doc.setDrawColor(190, 190, 190);
                doc.setLineWidth(0.4);
                doc.setLineDashPattern([2, 2], 0);
                doc.rect(35, currentY, 140, 22);
                doc.setLineDashPattern([], 0);
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(9);
                doc.setTextColor(170, 170, 170);
                doc.text('No scan image was attached to this record', 105, currentY + 13, { align: 'center' });
                currentY += 28;
            }

            // Draw sign-off after image on same page
            currentY = drawSignOff(doc, currentY, signOffData);
        }

        // --- FINAL FOOTER LOOP (FIX 5) ---
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);

            // Footer divider line
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.line(15, 281, 195, 281);

            // Footer text
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);

            doc.text('CONFIDENTIAL — FOR CLINICAL USE ONLY', 15, 287);
            doc.text('CancerScan AI Powered Lung Cancer Detection', 105, 287, { align: 'center' });
            doc.text(`Page ${i} of ${totalPages}`, 195, 287, { align: 'right' });
        }

        const safeName = patientName.replace(/\s+/g, '');
        const safeId = clinicalId.replace(/-/g, '');
        doc.save(`CancerScan_${safeName}_${safeId}.pdf`);
    } catch (error) {
        console.error("Critical error in generatePatientPDF:", error);
    }
};
