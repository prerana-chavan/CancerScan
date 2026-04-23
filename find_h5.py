import os
import sys

output_file = 'c:\\Users\\ASUS\\OneDrive\\Desktop\\Lung_Cancer\\LungCancer (4)dect+subtype+ui\\h5_list.txt'

with open(output_file, 'w') as f:
    for root, dirs, files in os.walk('c:\\Users\\ASUS\\OneDrive\\Desktop\\Lung_Cancer\\LungCancer (4)dect+subtype+ui'):
        for file in files:
            if file.endswith('.h5') or file.endswith('.keras'):
                f.write(os.path.join(root, file) + '\n')
