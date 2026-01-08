import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const ImageUploader = ({ onImageSelected, className = '', disabled = false }) => {
    const { t } = useTranslation();
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = async (e) => {
        if (disabled) return;
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError(t('common.invalid_file_type', 'Invalid file type. Please upload an image.'));
            return;
        }

        setUploading(true);
        setError('');

        try {
            const resizedImage = await resizeImage(file, 1280, 720); // Max dimensions
            onImageSelected(resizedImage);
        } catch (err) {
            console.error(err);
            setError(t('common.upload_error', 'Error processing image.'));
        } finally {
            setUploading(false);
        }
    };
    const resizeImage = (file, maxWidth, maxHeight) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to base64 string
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // 80% quality
                    resolve(dataUrl);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    return (
        <div className={`relative ${className}`}>
            <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="image-upload"
                disabled={uploading || disabled}
            />
            <label
                htmlFor="image-upload"
                className={`cursor-pointer inline-flex items-center justify-center px-4 py-2 glass-button ${uploading || disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {uploading ? (
                    <span className="flex items-center gap-2">
                        <span className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></span>
                        {t('common.processing', 'Processing...')}
                    </span>
                ) : (
                    <span className="flex items-center gap-2">
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                         {t('common.add_photo', 'Add Photo')}
                    </span>
                )}
            </label>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
};

export default ImageUploader;
