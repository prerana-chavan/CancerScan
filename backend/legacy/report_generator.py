# legacy/report_generator.py — Currently unused. Frontend generates PDFs with jsPDF.
# This file is archived for potential future use (e.g., server-side automated reports).

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import os
from datetime import datetime

def generate_report(patient_data, filename="report.pdf"):
    """
    Generates a PDF report for a patient.
    patient_data: dict containing keys: 
                  patient_id, name, age, gender, date, hospital, 
                  pathologist, prediction, subtype, survival, image_path
    """
    try:
        c = canvas.Canvas(filename, pagesize=letter)
        width, height = letter
        
        # Title
        c.setFont("Helvetica-Bold", 20)
        c.drawString(50, height - 50, "Lung Cancer Diagnostic Report")
        
        c.setLineWidth(1)
        c.line(50, height - 60, width - 50, height - 60)
        
        # Patient Details
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, height - 100, "Patient Details")
        
        c.setFont("Helvetica", 12)
        y = height - 130
        left_margin = 50
        gap = 20
        
        details = [
            f"Patient ID: {patient_data.get('patient_id', 'N/A')}",
            f"Patient Name: {patient_data.get('name', 'N/A')}",
            f"Age: {patient_data.get('age', 'N/A')}",
            f"Gender: {patient_data.get('gender', 'N/A')}",
            f"Diagnosis Date: {patient_data.get('date', 'N/A')}",
            f"Hospital: {patient_data.get('hospital', 'N/A')}",
            f"Pathologist: {patient_data.get('pathologist', 'N/A')}"
        ]
        
        for line in details:
            c.drawString(left_margin, y, line)
            y -= gap
            
        # Analysis Results
        y -= 20
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, y, "Histopathological Analysis Results")
        y -= 30
        
        c.setFont("Helvetica", 12)
        c.drawString(left_margin, y, f"Prediction: {patient_data.get('prediction', 'N/A')}")
        y -= gap
        
        # ── Subtype + Survival (ADD THESE) ──────
        _subtype = (patient_data.get('subtype') or '')
        _sub_conf = (patient_data.get('subtype_confidence') or 0)
        _surv_prob = (patient_data.get('survival_probability') or 0)
        _surv_months = (patient_data.get('survival_months') or 0)
        _risk = (patient_data.get('risk_category') or '')

        if _subtype:
            y -= 6
            c.setFont("Helvetica-Bold", 9)
            c.drawString(left_margin, y, "SUBTYPE:")
            c.setFont("Helvetica", 9)
            c.drawString(
                left_margin + 55, y,
                f"{_subtype}  (Confidence: {_sub_conf}%)"
            )
            y -= gap

        if _surv_prob:
            c.setFont("Helvetica-Bold", 9)
            c.drawString(
                left_margin, y,
                "SURVIVAL PROBABILITY:"
            )
            c.setFont("Helvetica", 9)
            c.drawString(
                left_margin + 130, y,
                f"{_surv_prob}%  |  Est. {_surv_months} months  |  Risk: {_risk}"
            )
            y -= gap
            y -= 6
        # ── End of new block ─────────────────────
            
        # Image Section
        y -= 20
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, y, "Analyzed Slide Image")
        y -= 220 # Reserve space for image
        
        img_path = patient_data.get('image_path')
        if img_path and os.path.exists(img_path):
            try:
                # Add image
                c.drawImage(ImageReader(img_path), 50, y, width=200, height=200)
            except Exception as e:
                c.drawString(50, y + 100, f"[Image load failed: {str(e)}]")
        else:
            c.drawString(50, y + 100, "[No Image Available]")
            
        # Footer
        c.setFont("Helvetica-Oblique", 10)
        c.drawString(50, 50, f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        c.drawString(50, 35, "Note: This is an AI-generated predictive analysis. Please consult a specialist.")
        
        c.save()
        return True
    except Exception as e:
        print(f"Error generating PDF: {e}")
        return False
