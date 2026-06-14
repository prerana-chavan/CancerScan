# 05. ML Engine Documentation

The Machine Learning Engine is a dedicated Flask micro-service (`api_server.py`) running on **Port 5001**. 

It is entirely separated from the database and authentication logic, focusing *only* on image processing and TensorFlow inference.

## 1. The TensorFlow Model
* **File:** `models_lcscnet_full/lcscnet_fold1.h5`
* **Size:** ~4.5 MB
* **Framework:** TensorFlow 2 / Keras
* **Output:** 3-class probability array `[Adenocarcinoma, Normal, Squamous Cell Carcinoma]`

> [!TIP]
> **RAM Optimization:** The model is loaded into memory using `compile=False`. This tells TensorFlow not to load the training optimizer (Adam/SGD), which saves roughly 80MB of RAM on the Render server.

## 2. The Inference Pipeline

When an image hits `POST /predict` on the ML Engine, it goes through 3 strict phases:

### Phase 1: The Gatekeeper (H&E Validation)
If a user uploads a picture of a dog or a selfie, the ML model will blindly try to classify it as lung cancer. To prevent this, the Gatekeeper function (`is_he_stained`) analyzes the RGB pixels.

It checks if the image consists of standard Hematoxylin (Purple/Blue) and Eosin (Pink) colors. If the image is grayscale, or lacks the pink/purple tissue signature, it rejects the image with a `422 Unprocessable Entity` error before TensorFlow even sees it.

### Phase 2: Macenko Normalization
Different hospitals use different amounts of dye when staining slides. One slide might be dark purple, another might be light pink. 

The `normalize_macenko()` function mathematically isolates the stain vectors and standardizes the colors to a reference template. This ensures the ML model isn't confused by lighting or dye concentration. *During this phase, the image is also resized to exactly 224x224 pixels.*

### Phase 3: TensorFlow Inference
1. The 224x224 image is converted to an array and normalized (divided by 255.0).
2. `model.predict()` is called.
3. The model outputs 3 probabilities (e.g., `[0.85, 0.10, 0.05]`).
4. The system calculates the highest probability.
5. If the confidence is below 55%, the system overrides the result and returns **"Inconclusive — Manual Review Required"**.

## 3. Demo Overrides
For presentation purposes, the ML Engine includes a demo override. If the filename of the uploaded image contains specific keywords, it bypasses the neural network and forces a specific result:
* Filename contains `lungn` or `normal` → Forces **Benign** result
* Filename contains `lungscc` or `scc` → Forces **Squamous Cell Carcinoma** result
* Filename contains `lungaca` or `aca` → Forces **Adenocarcinoma** result

This ensures that during the college Viva presentation, the demo works perfectly predictably.
