import React, { useState } from 'react';

const LogoDisplay = ({ 
  url, 
  alt = 'Logo', 
  width = 100, 
  height = 40 
}) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  if (imageError) {
    return (
      <div 
        style={{ 
          width: `${width}px`, 
          height: `${height}px`, 
          backgroundColor: '#f0f0f0', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}
      >
        Logo Not Available
      </div>
    );
  }

  return (
    <img 
      src={url} 
      alt={alt}
      width={width}
      height={height}
      onError={handleImageError}
      style={{ 
        objectFit: 'contain', 
        maxWidth: '100%', 
        maxHeight: '100%' 
      }}
    />
  );
};

export default LogoDisplay;