import React, { useRef } from 'react';
import Image from '../../../components/AppImage';
import Icon from '../../../components/AppIcon';

interface ImageCaptureProps {
  imagePreview: string;
  onImageSelect: (file: File) => void;
  error?: string;
}

const ImageCapture: React.FC<ImageCaptureProps> = ({
  imagePreview,
  onImageSelect,
  error
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageSelect(file);
    }
  };

  const handleCaptureClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-text-primary mb-2">
        Photo <span className="text-error">*</span>
      </label>
      
      <div 
        onClick={handleCaptureClick}
        className={`relative w-full aspect-[4/3] rounded-lg overflow-hidden cursor-pointer transition-smooth ${
          error ? 'border-2 border-error' : 'border-2 border-border hover:border-accent'
        }`}
      >
        {imagePreview ? (
          <>
            <Image
              src={imagePreview}
              alt="Horse observation preview showing captured photo for health monitoring"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-primary/0 hover:bg-primary/10 transition-smooth flex items-center justify-center">
              <div className="bg-background/90 rounded-full p-3 opacity-0 hover:opacity-100 transition-smooth">
                <Icon name="Camera" size={24} className="text-accent" />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
              <Icon name="Camera" size={32} className="text-accent" />
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-medium text-text-primary">Take Photo</p>
              <p className="text-xs text-secondary mt-1">Tap to capture or select from gallery</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-error mt-2 flex items-center gap-1">
          <Icon name="AlertCircle" size={14} />
          {error}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default ImageCapture;