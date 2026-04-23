from PIL import Image
import numpy as np
import os

img_path = 'backend/SubtypeClassificationDataset/lung_image_set/lung_image_sets/lung_scc/lungscc1.jpeg'
# Try a few paths if that one doesn't exist
possible_paths = [
    'backend/SubtypeClassificationDataset/Squamous/lungscc1091.jpeg',
    'backend/uploads/slides/lungscc1091.jpeg'
]

def check_img(path):
    if not os.path.exists(path):
        return
    img_pil = Image.open(path).convert('RGB')
    img = np.array(img_pil.resize((128, 128)), dtype=np.float32)
    r, g, b = img[:,:,0], img[:,:,1], img[:,:,2]
    mean_r, mean_g, mean_b = np.mean(r), np.mean(g), np.mean(b)
    print(f"Path: {path}")
    print(f"R: {mean_r}, G: {mean_g}, B: {mean_b}")
    print(f"Brightness: {(mean_r + mean_g + mean_b) / 3.0}")
    
    if (mean_r + mean_g + mean_b) / 3.0 < 60: print("Failed: Too dark")
    elif mean_b > mean_r + 30 and mean_b > mean_g + 15: print("Failed: Too blue")
    elif mean_g > mean_r + 25 and mean_g > mean_b + 25: print("Failed: Too green")
    elif mean_r < 80: print("Failed: Too low red")
    else: print("Passed Gatekeeper!")

import glob
# Search for any jpeg in uploads/slides
for path in glob.glob('backend/uploads/slides/*.jpeg') + glob.glob('backend/uploads/slides/*.png') + glob.glob('backend/uploads/slides/*.jpg'):
    check_img(path)


