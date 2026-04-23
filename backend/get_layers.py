import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
from tensorflow.keras.models import load_model

model_path = r"c:\Users\ASUS\OneDrive\Desktop\Lung_Cancer\LungCancer (4)dect+subtype+ui\backend\models_lcscnet_full\lcscnet_fold1.h5"
try:
    model = load_model(model_path)
    print("MODEL SUMMARY START")
    model.summary()
    print("MODEL SUMMARY END")
    print("LAYERS:", [layer.__class__.__name__ for layer in model.layers])
except Exception as e:
    print("Error:", e)
