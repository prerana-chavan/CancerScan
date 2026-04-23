# -------------------------
# Lung Cancer Diagnostic System - Main UI
# -------------------------
import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
import warnings
warnings.filterwarnings("ignore")

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from PIL import Image, ImageTk, ImageEnhance
import numpy as np
import cv2
from tensorflow.keras.models import load_model
import datetime
import database
import report_generator
import re

# Global
current_patient_data = None
uploaded_img_path = None

# Initialize Database
database.init_db()

# -------------------------
# Load Models
# -------------------------
GATEKEEPER_MODEL = "gatekeeper_model.h5"
CANCER_MODEL = "lung_cancer_model_final.h5"
# Prefer the improved subtype model; fall back to original if not yet trained
SUBTYPE_MODEL_IMPROVED = "subtype_model_improved.h5"
SUBTYPE_MODEL_FALLBACK = "subtype_model.h5"
SURVIVAL_MODEL = "survival_model.h5"

IMG_SIZE = (224, 224)

# Subtype class labels — must match the alphabetical order flow_from_directory uses
# lung_aca -> 0, lung_scc -> 1
SUBTYPE_CLASSES = ["Adenocarcinoma (ACA)", "Squamous Cell Carcinoma (SCC)"]

try:
    gatekeeper = load_model(GATEKEEPER_MODEL)
    cancer_model = load_model(CANCER_MODEL)
    # Load improved subtype model if available, else fall back
    if os.path.exists(SUBTYPE_MODEL_IMPROVED):
        print(f"Loading improved subtype model: {SUBTYPE_MODEL_IMPROVED}")
        subtype_model = load_model(SUBTYPE_MODEL_IMPROVED)
    else:
        print(f"Improved model not found. Using fallback: {SUBTYPE_MODEL_FALLBACK}")
        subtype_model = load_model(SUBTYPE_MODEL_FALLBACK)
    survival_model = load_model(SURVIVAL_MODEL)
except Exception as e:
    print(f"Error loading models: {e}")

# -------------------------
# Processing Functions
# -------------------------
def rgb2od(I):
    I = I.astype(np.float32)
    I[I == 0] = 1
    return -np.log((I + 1) / 255.0 + 1e-8)

def od2rgb(OD):
    return (np.exp(-OD) * 255).clip(0, 255).astype(np.uint8)

def get_stain_matrix_safe(I):
    OD = rgb2od(I).reshape(-1, 3)
    OD = OD[np.linalg.norm(OD, axis=1) > 0.15]
    if OD.shape[0] < 100:
        return None
    _, _, Vt = np.linalg.svd(OD, full_matrices=False)
    return Vt[:2].T

def normalize_macenko(img, alpha=99):
    try:
        img_small = cv2.resize(img, (224, 224))
        M = get_stain_matrix_safe(img_small)
        if M is None:
            return img_small
        OD = rgb2od(img_small).reshape(-1, 3).T
        C = np.dot(np.linalg.pinv(M), OD)
        maxC = np.percentile(C, alpha, axis=1)
        maxC[maxC == 0] = 1.0
        Cn = C / maxC[:, None]
        target = np.array([[0.65, 0.07], [0.70, 0.99], [0.29, 0.11]], dtype=np.float32)
        OD_hat = np.dot(target, Cn)
        return od2rgb(OD_hat.T.reshape(img_small.shape))
    except Exception:
        return cv2.resize(img, (224, 224))

def is_he_stained(img_path):
    """
    Quick color-based check to reject obviously non-histopathology images.
    Real H&E slides are dominated by pink/purple tones (high R+B, moderate G).
    Images that are mostly blue/teal/dark/green/bright-colored are NOT H&E slides.
    Returns True if the image COULD be an H&E slide based on color.
    """
    try:
        img = np.array(Image.open(img_path).convert("RGB").resize((128, 128)), dtype=np.float32)
        r, g, b = img[:,:,0], img[:,:,1], img[:,:,2]
        
        mean_r = np.mean(r)
        mean_g = np.mean(g)
        mean_b = np.mean(b)
        
        # Rule 1: Reject if image is too dark overall (like glowing blue DNA on black bg)
        brightness = (mean_r + mean_g + mean_b) / 3.0
        if brightness < 60:
            return False
        
        # Rule 2: Reject if blue channel strongly dominates both R and G
        # H&E slides never look mostly blue/teal
        if mean_b > mean_r + 30 and mean_b > mean_g + 15:
            return False
        
        # Rule 3: Reject if green channel strongly dominates (greenish images)
        if mean_g > mean_r + 25 and mean_g > mean_b + 25:
            return False
        
        # Rule 4: H&E slides have substantial pink/red (R channel higher than B on average)
        if mean_r < 80:
            return False
        
        return True
    except Exception:
        return True  # If check fails, let the ML model decide

def is_histopathology(img_path):
    # Stage 1: Fast color-based filter (rejects non-medical images like DNA illustrations)
    if not is_he_stained(img_path):
        return False
    
    # Stage 2: ML gatekeeper model
    img = Image.open(img_path).convert("RGB").resize(IMG_SIZE)
    arr = np.array(img) / 255.0
    arr = np.expand_dims(arr, axis=0)
    pred = gatekeeper.predict(arr, verbose=0)[0][0]
    return pred < 0.5


def predict_image(img_path):
    try:
        img_pil = Image.open(img_path).convert("RGB")
    except Exception:
        return "❌ Invalid input", 0.0, "File could not be opened."

    if not is_histopathology(img_path):
        return "❌ Invalid input", 0.0, "Not a histopathology slide."

    img_resized = img_pil.resize(IMG_SIZE)
    arr = np.array(img_resized).astype(np.float32) / 255.0
    arr = np.expand_dims(arr, axis=0)

    pred = cancer_model.predict(arr, verbose=0)[0][0]
    label = "⚠️ Cancer Detected" if pred > 0.5 else "✅ Benign"
    confidence = pred if pred > 0.5 else 1 - pred
    return label, float(confidence), None

def predict_subtype(img_path):
    img = cv2.imread(img_path)
    if img is None:
        return "Unknown", 0.0
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img_norm = normalize_macenko(img)
    img_norm = cv2.resize(img_norm, IMG_SIZE)
    arr = img_norm.astype(np.float32) / 255.0
    arr = np.expand_dims(arr, axis=0)
    pred = subtype_model.predict(arr, verbose=0)[0]
    class_idx = int(np.argmax(pred))
    confidence = float(pred[class_idx])
    # SUBTYPE_CLASSES is ordered to match flow_from_directory alphabetical order:
    # lung_aca -> index 0 -> Adenocarcinoma, lung_scc -> index 1 -> Squamous Cell
    return SUBTYPE_CLASSES[class_idx], confidence

def predict_survival(age, gender):
    assumed_stage = 2
    age_norm = age / 100.0
    gender_val = 0 if gender == "Male" else 1
    stage_norm = (assumed_stage - 1) / 3.0
    x = np.array([[age_norm, gender_val, stage_norm]], dtype=np.float32)
    prob = survival_model.predict(x, verbose=0)[0][0]
    return float(np.clip(prob, 0, 1))

# =======================================================
#                       UI SECTION
# =======================================================
root = tk.Tk()
root.title("CancerScan - Lung Cancer Diagnostic System")
root.geometry("1400x900")

# Background Gradient Canvas
canvas = tk.Canvas(root, highlightthickness=0)
canvas.pack(fill="both", expand=True)

# Background image
_working_bg_photo = None  # keep reference to prevent GC
_WORKING_BG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "workingImg.png")

def draw_dashboard_background(event=None):
    global _working_bg_photo
    width = root.winfo_width() or 1400
    height = root.winfo_height() or 900
    if width < 50 or height < 50:
        return

    canvas.delete("gradient")

    try:
        img = Image.open(_WORKING_BG_PATH).convert("RGB")
        # Cover-mode scaling
        img_ratio = img.width / img.height
        win_ratio = width / height
        if win_ratio > img_ratio:
            new_w = width
            new_h = int(width / img_ratio)
        else:
            new_h = height
            new_w = int(height * img_ratio)
        img = img.resize((new_w, new_h), Image.LANCZOS)
        # Crop to center
        left = (new_w - width) // 2
        top = (new_h - height) // 2
        img = img.crop((left, top, left + width, top + height))
        # Slightly darken so white panel cards stay readable
        img = ImageEnhance.Brightness(img).enhance(0.70)
        _working_bg_photo = ImageTk.PhotoImage(img)
        canvas.create_image(0, 0, anchor="nw", image=_working_bg_photo, tags="gradient")
    except Exception:
        # Fallback: light blue gradient
        r1, g1, b1 = (239, 246, 255)
        r2, g2, b2 = (219, 234, 254)
        steps = 100
        for i in range(steps):
            r = int(r1 + (r2 - r1) * i / steps)
            g = int(g1 + (g2 - g1) * i / steps)
            b = int(b1 + (b2 - b1) * i / steps)
            color = f"#{r:02x}{g:02x}{b:02x}"
            y0 = i * height / steps
            y1 = (i + 1) * height / steps
            canvas.create_rectangle(0, y0, width, y1, fill=color, outline="", tags="gradient")

root.bind("<Configure>", draw_dashboard_background)

# --- Header Bar (Fixed on Top) ---
# We place frames on top of canvas using window objects or place()
header_frame = tk.Frame(root, bg="#1E3A8A", height=70, padx=30)
header_frame.place(x=0, y=0, relwidth=1)
header_frame.pack_propagate(False)

tk.Label(header_frame, text="🧬 CancerScan", font=("Helvetica", 22, "bold"), bg="#1E3A8A", fg="white").pack(side=tk.LEFT, pady=10)
# Profile removed as requested

# --- Main Container ---
# Centered on canvas, below header
main_frame = tk.Frame(root, bg="") # Transparents aren't real, but we will place frames
# Actually, since Tkinter frames aren't transparent, we'll just place the panels directly or use a container with matching bg color? 
# Best is to place Left and Right panels directly on canvas relative coordinates or use a container frame if solid bg is ok.
# User wants "Soft Gradient Background". If we use a Frame, it blocks gradient.
# Solution: Place LeftPanel and RightPanel as Windows on Canvas or using place().

content_y_start = 100
panel_height = 750

# === Left Panel: Patient Details ===
left_card = tk.Frame(root, bg="white", padx=25, pady=25)
# Add a "shadow" border effect? Tkinter: Frame inside Frame with slight offset color?
# Keeping it simple clean white card.
left_card.place(relx=0.05, y=content_y_start, relwidth=0.4, height=panel_height)

tk.Label(left_card, text="Patient Details", font=("Helvetica", 16, "bold"), bg="white", fg="#1E3A8A").pack(anchor="w", pady=(0, 20))
tk.Frame(left_card, bg="#E2E8F0", height=2).pack(fill=tk.X, pady=(0, 20))

entries = {}
vcmd_name = (root.register(lambda t: not t or re.match(r"^[a-zA-Z\s]*$", t)), '%P')

def create_field(parent, label, icon, key, vcmd=None, combo_values=None):
    f = tk.Frame(parent, bg="white", pady=8)
    f.pack(fill=tk.X)
    
    tk.Label(f, text=f"{icon}  {label}", font=("Helvetica", 11, "bold"), bg="white", fg="#475569").pack(anchor="w")
    
    if combo_values:
        w = ttk.Combobox(f, values=combo_values, font=("Helvetica", 11), state="readonly")
        w.pack(fill=tk.X, pady=(5, 0), ipady=5)
        if combo_values: w.current(0)
    else:
        w = ttk.Entry(f, font=("Helvetica", 11))
        if vcmd: w.config(validate="key", validatecommand=vcmd)
        w.pack(fill=tk.X, pady=(5, 0), ipady=5)
        
    entries[key] = w
    return w

create_field(left_card, "Patient Name", "👤", "Patient Name:", vcmd_name)
create_field(left_card, "Age", "🎂", "Age:")
create_field(left_card, "Diagnosis Date (DD/MM/YYYY)", "📅", "Diagnosis Date:")
create_field(left_card, "Pathologist Name", "🔬", "Pathologist Name:", vcmd_name)

hospitals = sorted(["Apollo Hospital", "Breach Candy Hospital", "Garud Hospital", "Neuron Plus", "Vikhe Patil Hospital", "Tata Memorial"])
create_field(left_card, "Hospital Name", "🏥", "Hospital Name:", combo_values=hospitals)

create_field(left_card, "Gender", "⚧", "Gender:", combo_values=["Male", "Female", "Other"])
create_field(left_card, "Smoking History", "🚬", "Smoking:", combo_values=["Yes", "No"])


# === Right Panel: Analysis & Results ===
right_card = tk.Frame(root, bg="white", padx=25, pady=25)
right_card.place(relx=0.5, y=content_y_start, relwidth=0.45, height=panel_height)

tk.Label(right_card, text="Analysis & Results", font=("Helvetica", 16, "bold"), bg="white", fg="#1E3A8A").pack(anchor="w", pady=(0, 20))
tk.Frame(right_card, bg="#E2E8F0", height=2).pack(fill=tk.X, pady=(0, 20))

# Image Area
preview_frame = tk.Frame(right_card, bg="#F8FAFC", bd=2, relief="groove")
preview_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
preview_frame.pack_propagate(False) # Let it expand but keep constraints if set

image_label = tk.Label(preview_frame, text="No Slide Image Uploaded", bg="#F8FAFC", fg="#94A3B8", font=("Helvetica", 12))
image_label.place(relx=0.5, rely=0.5, anchor="center")

def browse_file():
    global uploaded_img_path
    path = filedialog.askopenfilename(filetypes=[("Image files", "*.jpg *.jpeg *.png *.tif *.tiff")])
    if path:
        uploaded_img_path = path
        img = Image.open(path).convert("RGB")
        img.thumbnail((400, 300))
        img_tk = ImageTk.PhotoImage(img)
        image_label.config(image=img_tk, text="")
        image_label.image = img_tk

# Upload Button
tk.Button(right_card, text="📂 Upload Slide Image", command=browse_file, 
          bg="#2563EB", fg="white", font=("Helvetica", 12, "bold"), relief="flat", pady=10).pack(fill=tk.X, pady=20)

# Results Card (Lower Section)
result_frame = tk.Frame(right_card, bg="#F1F5F9", padx=20, pady=20, relief="flat") # Light gray card inside
result_frame.pack(fill=tk.BOTH, expand=True)

tk.Label(result_frame, text="Analysis Report", font=("Helvetica", 14, "bold"), bg="#F1F5F9", fg="#334155").pack(anchor="w", pady=(0, 10))

# Result Labels (Placeholders for on_predict to fill)
# We need to expose a container for on_predict or let it rebuild.
# Looking at on_predict, it rebuilds `result_frame` children. We should keep `result_frame` accessible.

# Footer Buttons
btn_frame = tk.Frame(right_card, bg="white", pady=20)
btn_frame.pack(fill=tk.X)
# Buttons will be created after function definitions

def on_predict():
    if not uploaded_img_path:
        messagebox.showwarning("Warning", "Please upload an image first.")
        return

    # 1. Validation
    try:
        p_name = entries["Patient Name:"].get().strip()
        p_age = entries["Age:"].get().strip()
        p_date = entries["Diagnosis Date:"].get().strip()
        p_hosp = entries["Hospital Name:"].get()
        p_patho = entries["Pathologist Name:"].get().strip()
        p_gender = entries["Gender:"].get()
        p_smoking = entries["Smoking:"].get()
    except KeyError:
        return

    if not all([p_name, p_age, p_date, p_hosp, p_patho]):
        messagebox.showwarning("Validation Error", "All fields are mandatory.")
        return

    # Name: Alpha only (already restricted by vcmd somewhat, but double check)
    if not re.match(r"^[a-zA-Z\s]+$", p_name):
        messagebox.showerror("Validation Error", "Patient Name must contain only alphabets.")
        return

    # Date: DD/MM/YYYY
    if not re.match(r"^\d{2}/\d{2}/\d{4}$", p_date):
        messagebox.showerror("Validation Error", "Date must be in DD/MM/YYYY format.")
        return

    # Age: Numeric
    if not p_age.isdigit():
        messagebox.showerror("Validation Error", "Age must be a valid number.")
        return

    # 2. Prediction
    label, conf, err = predict_image(uploaded_img_path)
    if err:
        messagebox.showerror("Error", err)
        return

    subtype = "N/A"
    survival_text = "N/A"
    color = "#10B981" # Green

    if "Cancer Detected" in label:
        subtype, sub_conf = predict_subtype(uploaded_img_path)
        try: age_val = int(p_age)
        except: age_val = 60
        survival = predict_survival(age_val, p_gender)
        survival_text = f"{survival*100:.1f}%"
        color = "#EF4444" # Red
    
    # 3. Update Result UI (Card Layout)
    for widget in result_frame.winfo_children():
        widget.destroy()

    card = tk.Frame(result_frame, bg="white", padx=10, pady=10) # Flat inside result frame
    card.pack(fill=tk.BOTH, expand=True)

    tk.Label(card, text="Analysis Summary", font=("Helvetica", 12, "bold"), bg="white", fg="#1E3A8A").pack(pady=(0, 10))
    
    # Helper for rows
    def add_row(parent, label_t, value_t, val_color="black"):
        row_f = tk.Frame(parent, bg="white")
        row_f.pack(fill=tk.X, pady=2)
        tk.Label(row_f, text=label_t, font=("Helvetica", 10, "bold"), bg="white", fg="#64748B").pack(side=tk.LEFT)
        tk.Label(row_f, text=value_t, font=("Helvetica", 10, "bold"), bg="white", fg=val_color).pack(side=tk.RIGHT)

    add_row(card, "Status:", label, color)
    add_row(card, "Confidence:", f"{conf*100:.1f}%")
    add_row(card, "Subtype:", subtype)
    add_row(card, "Survival:", survival_text)

    # 4. Save to Database
    db_data = {
         "patient_name": p_name, 
         "age": p_age,
         "gender": p_gender, 
         "smoking_history": p_smoking,
         "diagnosis_date": p_date,
         "hospital_name": p_hosp, 
         "pathologist_name": p_patho,
         "image_path": uploaded_img_path, 
         "prediction_result": label, 
         "subtype_result": subtype, 
         "survival_rate": survival_text
    }
    
    p_id = database.add_patient(db_data)
    
    if p_id:
        messagebox.showinfo("Success", "Record Saved & Analyzed")
        global current_patient_data
        current_patient_data = db_data.copy()
        current_patient_data["patient_id"] = p_id
        # keys map
        current_patient_data["name"] = p_name
        current_patient_data["date"] = p_date
        current_patient_data["hospital"] = p_hosp
        current_patient_data["pathologist"] = p_patho
        current_patient_data["prediction"] = label
        current_patient_data["subtype"] = subtype
        current_patient_data["survival"] = survival_text
    else:
        messagebox.showerror("Error", "Analysis done but DB Save failed")

def on_report():
    if not current_patient_data:
        messagebox.showwarning("Warning", "Run analysis first.")
        return
    fn = filedialog.asksaveasfilename(defaultextension=".pdf", filetypes=[("PDF", "*.pdf")], initialfile=f"Report_{current_patient_data['patient_id']}.pdf")
    if fn and report_generator.generate_report(current_patient_data, fn):
        messagebox.showinfo("Success", "Report Generated")

# Footer Buttons (Moved here to ensure functions are defined)
tk.Button(btn_frame, text="⚡ Start Analysis", command=on_predict, bg="#059669", fg="white", font=("Helvetica", 12, "bold"), relief="flat", padx=20, pady=5).pack(side=tk.RIGHT, padx=5)
tk.Button(btn_frame, text="📄 Generate Report", command=on_report, bg="#7C3AED", fg="white", font=("Helvetica", 12, "bold"), relief="flat", padx=20, pady=5).pack(side=tk.RIGHT, padx=5)

root.mainloop()
