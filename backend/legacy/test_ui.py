# -------------------------
# Lung Cancer Detection UI (with Gatekeeper)
# -------------------------
import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"  # hide TF info/warnings
import warnings
warnings.filterwarnings("ignore")

import tkinter as tk
from tkinter import filedialog, Label, Button, messagebox
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
# Functions
# -------------------------
def is_histopathology(img_path):
    """Gatekeeper check: is this a histopathology slide?"""
    img = Image.open(img_path).convert("RGB").resize(IMG_SIZE)
    arr = np.array(img) / 255.0
    arr = np.expand_dims(arr, axis=0)
    pred = gatekeeper.predict(arr, verbose=0)[0][0]
    return pred < 0.5  # True = histopathology, False = invalid


def predict_image(img_path):
    """Runs gatekeeper first, then cancer detection if valid."""
    try:
        img = Image.open(img_path).convert("RGB")
    except Exception:
        return "❌ Invalid input", 0.0, "File could not be opened."

    # Gatekeeper model
    if not is_histopathology(img_path):
        return "❌ Invalid input", 0.0, "Not a histopathology slide."

    # Preprocess for cancer model
    img_resized = img.resize(IMG_SIZE)
    arr = keras_image.img_to_array(img_resized) / 255.0
    arr = np.expand_dims(arr, axis=0)

    pred = cancer_model.predict(arr, verbose=0)[0][0]
    label = "⚠️ Cancer Detected" if pred > 0.5 else "✅ benign"
    confidence = pred if pred > 0.5 else 1 - pred
    return label, float(confidence), None

# -------------------------
# GUI
# -------------------------
def browse_file():
    file_path = filedialog.askopenfilename(
        filetypes=[("Image files", "*.jpg *.jpeg *.png *.tif *.tiff")]
    )
    if not file_path:
        return

    # Show preview
    try:
        preview = Image.open(file_path).convert("RGB")
        disp = preview.copy()
        disp.thumbnail((320, 320))
        img_tk = ImageTk.PhotoImage(disp)
        image_label.config(image=img_tk)
        image_label.image = img_tk
    except Exception:
        messagebox.showerror("Error", "Could not open image.")
        return

    label, conf, err = predict_image(file_path)
    if err:
        result_label.config(text=label + "\n" + err, fg="orange")
    else:
        result_label.config(
            text=f"{label}\nConfidence: {conf*100:.2f}%",
            fg=("red" if "Cancer" in label else "green")
        )

# Window
root = tk.Tk()
root.title("Lung Cancer Detection (with Gatekeeper)")
root.geometry("460x520")

title = Label(root, text="Lung Cancer Detection – Model 1", font=("Arial", 16, "bold"))
title.pack(pady=10)

info = Label(root, text="Step 1: Gatekeeper checks histopathology validity\n"
                        "Step 2: Cancer vs Benign detection if valid", font=("Arial", 10))
info.pack()

Button(root, text="Browse Image", command=browse_file, font=("Arial", 14)).pack(pady=15)

image_label = Label(root)
image_label.pack()

result_label = Label(root, text="", font=("Arial", 14, "bold"))
result_label.pack(pady=20)

root.mainloop()
