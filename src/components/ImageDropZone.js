import React, { useState, useRef } from 'react';
import { FiUploadCloud, FiX } from 'react-icons/fi';

function ImageDropZone({ value, onChange, placeholder = "Arraste uma imagem ou cole a URL" }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const processFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, envie apenas arquivos de imagem');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      onChange(event.target.result);
      setIsUploading(false);
    };
    reader.onerror = () => {
      alert('Erro ao ler o arquivo');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleFileInput = (e) => {
    processFile(e.target.files[0]);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        processFile(file);
        e.preventDefault();
        return;
      }
    }
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className="image-drop-zone-container">
      <div
        className={`image-drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          accept="image/*"
          style={{ display: 'none' }}
        />
        {isUploading ? (
          <div className="status-text">Carregando...</div>
        ) : value ? (
          <div className="image-preview-container">
            <img src={value} alt="Preview" className="image-preview" />
            <button onClick={handleRemoveImage} className="remove-image-btn" title="Remover Imagem">
              <FiX />
            </button>
          </div>
        ) : (
          <div className="placeholder-content">
            <FiUploadCloud size={24} />
            <span>{placeholder}</span>
          </div>
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ou cole a URL da imagem aqui"
        className="url-input"
      />
    </div>
  );
}

export default ImageDropZone;
