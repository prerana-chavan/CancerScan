import React, { useState } from 'react';
import { getImageUrl } from '../utils/imageUtils';

const WSIImage = ({ uploadedImagePath }) => {
    const [error, setError] = useState(false);
    
    const imageUrl = getImageUrl(uploadedImagePath);
    
    if (!imageUrl || error) {
        return (
            <div style={{
                width: '100%',
                height: '160px',
                background: '#1a1a2e',
                border: '1px dashed #333',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                gap: '8px'
            }}>
                <span style={{fontSize:'24px'}}>🔬</span>
                <span style={{
                    color: '#666',
                    fontSize: '12px'
                }}>
                    Scan image not available
                </span>
            </div>
        );
    }
    
    return (
        <img
            src={imageUrl}
            alt="WSI Histopathology Scan"
            onError={() => setError(true)}
            style={{
                width: '100%',
                borderRadius: '8px',
                objectFit: 'cover',
                maxHeight: '200px'
            }}
        />
    );
};

export default WSIImage;
