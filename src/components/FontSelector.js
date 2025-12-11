import React, { useState, useEffect, useRef } from 'react';
import { FiUpload, FiTrash2 } from 'react-icons/fi';
import { getGlobalFonts, saveGlobalFont, removeGlobalFont } from '../utils/firebase';

const GOOGLE_FONTS = [
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Raleway', 'Poppins', 
  'Playfair Display', 'Merriweather', 'Ubuntu', 'Nunito', 'PT Sans', 
  'Oswald', 'Crimson Text', 'Dancing Script', 'Pacifico', 
  'Press Start 2P', 'Creepster'
];

const SYSTEM_FONTS = [
  'Arial', 'Verdana', 'Helvetica', 'Tahoma', 'Trebuchet MS', 'Times New Roman', 
  'Georgia', 'Garamond', 'Courier New', 'Brush Script MT'
];

function FontSelector({ selectedFont, onSelectFont, customFonts, onCustomFontsChange }) {
  const [isUploading, setIsUploading] = useState(false);
  const [globalFonts, setGlobalFonts] = useState([]);
  const fileInputRef = useRef(null);

  // Carregar fontes globais do Firebase ao montar
  useEffect(() => {
    async function loadGlobalFonts() {
      const fonts = await getGlobalFonts();
      setGlobalFonts(fonts);
      // Mesclar com as fontes do designer atual
      if (onCustomFontsChange) {
        const mergedFonts = [...fonts, ...customFonts.filter(cf => !fonts.some(gf => gf.name === cf.name))];
        onCustomFontsChange(mergedFonts);
      }
    }
    loadGlobalFonts();
  }, []);

  useEffect(() => {
    const loadedFonts = new Set();
    const allCustomFonts = [...globalFonts, ...customFonts];
    const fontsToLoad = [...GOOGLE_FONTS, ...allCustomFonts.map(f => f.name)];
    
    fontsToLoad.forEach(fontName => {
      if (loadedFonts.has(fontName) || SYSTEM_FONTS.includes(fontName)) return;

      const fontUrl = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;700&display=swap`;
      
      if (!document.querySelector(`link[href="${fontUrl}"]`)) {
        const link = document.createElement('link');
        link.href = fontUrl;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        loadedFonts.add(fontName);
      }
    });

    allCustomFonts.forEach(font => {
      if (!document.getElementById(`font-style-${font.name}`)) {
        const style = document.createElement('style');
        style.id = `font-style-${font.name}`;
        style.textContent = `
          @font-face {
            font-family: '${font.name}';
            src: url(${font.data});
          }
        `;
        document.head.appendChild(style);
      }
    });

  }, [customFonts, globalFonts]);

  const handleFontUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
    if (!validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
      alert('Por favor, envie um arquivo de fonte válido (.ttf, .otf, .woff, .woff2)');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      const fontData = event.target.result;
      const fontName = file.name.replace(/\.[^/.]+$/, "");
      
      try {
        // Salvar fonte globalmente no Firebase
        await saveGlobalFont({ name: fontName, data: fontData });
        
        // Atualizar lista global
        const updatedGlobalFonts = await getGlobalFonts();
        setGlobalFonts(updatedGlobalFonts);
        
        // Adicionar ao designer atual
        const newCustomFonts = [...customFonts, { name: fontName, data: fontData }];
        onCustomFontsChange(newCustomFonts);
        onSelectFont(fontName);
        setIsUploading(false);
      } catch (error) {
        alert('Erro ao salvar a fonte no banco de dados');
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      alert('Erro ao carregar a fonte');
      setIsUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const removeCustomFont = async (fontNameToRemove) => {
    try {
      // Remover globalmente do Firebase
      await removeGlobalFont(fontNameToRemove);
      
      // Atualizar lista global
      const updatedGlobalFonts = await getGlobalFonts();
      setGlobalFonts(updatedGlobalFonts);
      
      // Remover do designer atual
      const newCustomFonts = customFonts.filter(f => f.name !== fontNameToRemove);
      onCustomFontsChange(newCustomFonts);
      
      if (selectedFont === fontNameToRemove) {
        onSelectFont('Arial'); // Volta para a fonte padrão
      }
      
      const styleElement = document.getElementById(`font-style-${fontNameToRemove}`);
      if (styleElement) {
        styleElement.remove();
      }
    } catch (error) {
      alert('Erro ao remover fonte');
    }
  };

  return (
    <div className="font-selector-container">
      <select 
        value={selectedFont} 
        onChange={(e) => onSelectFont(e.target.value)}
        className="font-select"
      >
        <optgroup label="Fontes Customizadas">
          {[...globalFonts, ...customFonts.filter(cf => !globalFonts.some(gf => gf.name === cf.name))].map(font => (
            <option key={font.name} value={font.name} style={{ fontFamily: font.name }}>
              {font.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="Fontes do Google">
          {GOOGLE_FONTS.map(font => (
            <option key={font} value={font} style={{ fontFamily: font }}>
              {font}
            </option>
          ))}
        </optgroup>
        <optgroup label="Fontes do Sistema">
          {SYSTEM_FONTS.map(font => (
            <option key={font} value={font} style={{ fontFamily: font }}>
              {font}
            </option>
          ))}
        </optgroup>
      </select>

      <div className="custom-fonts-management">
        <button 
          className="upload-font-btn" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <FiUpload /> {isUploading ? 'Enviando...' : 'Enviar Fonte'}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFontUpload}
          accept=".ttf,.otf,.woff,.woff2"
          style={{ display: 'none' }}
        />
        {([...globalFonts, ...customFonts.filter(cf => !globalFonts.some(gf => gf.name === cf.name))].length > 0) && (
          <div className="custom-font-list">
            {[...globalFonts, ...customFonts.filter(cf => !globalFonts.some(gf => gf.name === cf.name))].map(font => (
              <div key={font.name} className="custom-font-item">
                <span style={{ fontFamily: font.name }}>{font.name}</span>
                <button onClick={() => removeCustomFont(font.name)} title="Remover fonte">
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FontSelector;
