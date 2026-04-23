# -------------------------
# Lung Cancer Detection UI 
# -------------------------
import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
import warnings
warnings.filterwarnings("ignore")

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from PIL import Image, ImageTk
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image as keras_image

# -------------------------
# Load Models
# -------------------------
GATEKEEPER_MODEL = "gatekeeper_model.h5"
CANCER_MODEL = "lung_cancer_model_final.h5"
IMG_SIZE = (224, 224)

gatekeeper = load_model(GATEKEEPER_MODEL)
cancer_model = load_model(CANCER_MODEL)

# -------------------------
# Model Functions
# -------------------------
def is_histopathology(img_path):
    """Gatekeeper model check"""
    img = Image.open(img_path).convert("RGB").resize(IMG_SIZE)
    arr = np.array(img) / 255.0
    arr = np.expand_dims(arr, axis=0)
    pred = gatekeeper.predict(arr, verbose=0)[0][0]
    return pred < 0.5

def predict_image(img_path):
    """Cancer detection model"""
    try:
        img = Image.open(img_path).convert("RGB")
    except Exception:
        return "❌ Invalid input", 0.0, "File could not be opened."

    if not is_histopathology(img_path):
        return "❌ Invalid input", 0.0, "Not a histopathology slide."

    img_resized = img.resize(IMG_SIZE)
    arr = keras_image.img_to_array(img_resized) / 255.0
    arr = np.expand_dims(arr, axis=0)
    pred = cancer_model.predict(arr, verbose=0)[0][0]

    label = "⚠️ Cancer Detected" if pred > 0.5 else "✅ Benign"
    confidence = pred if pred > 0.5 else 1 - pred
    return label, float(confidence), None

# -------------------------
# Scrollable Window Setup
# -------------------------
root = tk.Tk()
root.title("Lung Cancer Detection (with Gatekeeper)")
root.geometry("500x720")

# Scrollable canvas
main_canvas = tk.Canvas(root)
main_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

scrollbar = ttk.Scrollbar(root, orient=tk.VERTICAL, command=main_canvas.yview)
scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

main_canvas.configure(yscrollcommand=scrollbar.set)
main_canvas.bind("<Configure>", lambda e: main_canvas.configure(scrollregion=main_canvas.bbox("all")))

frame = tk.Frame(main_canvas)
main_canvas.create_window((0, 0), window=frame, anchor="nw")

# -------------------------
# Title
# -------------------------
tk.Label(frame, text="Lung Cancer Detection – Model 1", font=("Arial", 16, "bold")).pack(pady=10)
tk.Label(frame, text="Enter Patient Details", font=("Arial", 12, "bold")).pack()

# -------------------------
# Patient Info Section
# -------------------------
patient_frame = tk.Frame(frame)
patient_frame.pack(pady=5)

fields = {
    "Patient ID:": tk.Entry(patient_frame, width=25),
    "Patient Name:": tk.Entry(patient_frame, width=25),
    "Age:": tk.Entry(patient_frame, width=25),
}
r = 0
for label, entry in fields.items():
    tk.Label(patient_frame, text=label, font=("Arial", 10)).grid(row=r, column=0, sticky="e", padx=5, pady=3)
    entry.grid(row=r, column=1, padx=5, pady=3)
    r += 1

tk.Label(patient_frame, text="Gender:", font=("Arial", 10)).grid(row=r, column=0, sticky="e", padx=5, pady=3)
gender_combo = ttk.Combobox(patient_frame, values=["Male", "Female", "Other"], width=22, state="readonly")
gender_combo.grid(row=r, column=1, padx=5, pady=3)
gender_combo.current(0)
r += 1

tk.Label(patient_frame, text="Smoking History:", font=("Arial", 10)).grid(row=r, column=0, sticky="e", padx=5, pady=3)
smoking_combo = ttk.Combobox(patient_frame, values=["Yes", "No"], width=22, state="readonly")
smoking_combo.grid(row=r, column=1, padx=5, pady=3)
smoking_combo.current(1)
r += 1

tk.Label(patient_frame, text="Diagnosis Date (DD-MM-YYYY):", font=("Arial", 10)).grid(row=r, column=0, sticky="e", padx=5, pady=3)
diagnosis_entry = tk.Entry(patient_frame, width=25)
diagnosis_entry.grid(row=r, column=1, padx=5, pady=3)
r += 1

tk.Label(patient_frame, text="Hospital Name:", font=("Arial", 10)).grid(row=r, column=0, sticky="e", padx=5, pady=3)
hospital_entry = tk.Entry(patient_frame, width=25)
hospital_entry.grid(row=r, column=1, padx=5, pady=3)
r += 1

tk.Label(patient_frame, text="Pathologist Name:", font=("Arial", 10)).grid(row=r, column=0, sticky="e", padx=5, pady=3)
pathologist_entry = tk.Entry(patient_frame, width=25)
pathologist_entry.grid(row=r, column=1, padx=5, pady=3)

# -------------------------
# Image Upload
# -------------------------
uploaded_img_path = None
image_label = tk.Label(frame)
image_label.pack(pady=10)

def browse_file():
    global uploaded_img_path
    file_path = filedialog.askopenfilename(
        filetypes=[("Image files", "*.jpg *.jpeg *.png *.tif *.tiff")]
    )
    if not file_path:
        return
    uploaded_img_path = file_path
    try:
        preview = Image.open(file_path).convert("RGB")
        disp = preview.copy()
        disp.thumbnail((200, 200))
        img_tk = ImageTk.PhotoImage(disp)
        image_label.config(image=img_tk)
        image_label.image = img_tk
    except Exception:
        messagebox.showerror("Error", "Could not open image.")

tk.Button(frame, text="📁 Browse Image", command=browse_file, font=("Arial", 12)).pack(pady=5)

# -------------------------
# Prediction Output
# -------------------------
result_label = tk.Label(frame, text="", font=("Arial", 14, "bold"), wraplength=420, justify="center")
result_label.pack(pady=10)

def on_predict():
    root.update_idletasks()
    if not uploaded_img_path:
        messagebox.showwarning("Missing Image", "Please upload an image before prediction.")
        return
    if not fields["Patient Name:"].get() or not fields["Age:"].get() or not gender_combo.get():
        messagebox.showwarning("Missing Info", "Please fill all patient details before prediction.")
        return

    label, conf, err = predict_image(uploaded_img_path)
    if err:
        result_label.config(text=label + "\n" + err, fg="orange")
    else:
        result_label.config(
            text=f"🧾 Patient: {fields['Patient Name:'].get()} (ID: {fields['Patient ID:'].get()})\n"
                 f"Age: {fields['Age:'].get()}, Gender: {gender_combo.get()}\n"
                 f"Smoking: {smoking_combo.get()}\n"
                 f"Diagnosis Date: {diagnosis_entry.get()}\n"
                 f"Hospital: {hospital_entry.get()}\n"
                 f"Pathologist: {pathologist_entry.get()}\n\n"
                 f"{label}\nConfidence: {conf*100:.2f}%",
            fg=("red" if "Cancer" in label else "green")
        )
    frame.update_idletasks()
    main_canvas.configure(scrollregion=main_canvas.bbox("all"))

tk.Button(frame, text="🔍 Predict Result", command=on_predict,
          font=("Arial", 13, "bold"), bg="#00b894", fg="white").pack(pady=10)

# -------------------------
# Mouse Wheel Scrolling
# -------------------------
def _on_mousewheel(event):
    main_canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
main_canvas.bind_all("<MouseWheel>", _on_mousewheel)

root.mainloop()
