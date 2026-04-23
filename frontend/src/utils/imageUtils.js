import { BASE_URL } from '../config/api';

export const getImageUrl = (filename) => {
    if (!filename) return null;
    if (filename.startsWith('data:image')) return filename; // For immediate preview from dropzone
    const f = filename.split(/[\\/]/).pop();
    return `${BASE_URL}/api/images/slides/${f}`;
};

export const fetchImageForPDF = async (uploadedImagePath) => {
    if (!uploadedImagePath) return null;
    
    try {
        if (uploadedImagePath.startsWith('data:image')) {
            return uploadedImagePath;
        }

        const filename = uploadedImagePath.split(/[\\/]/).pop();
        const url = `${BASE_URL}/api/images/slides/${filename}`;
        
        const response = await fetch(url);
        
        if (!response.ok) return null;
        
        const blob = await response.blob();
        
        // Convert to base64 for jsPDF
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
};
