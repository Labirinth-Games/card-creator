import React, { useState, useEffect } from 'react';
import './PrintPreview.css';

function PrintPreview({ data }) {
  const [cardGap, setCardGap] = useState(2); // mm entre cartas
  const [safetyMargin, setSafetyMargin] = useState(5); // mm de margem de segurança
  const [deckData, setDeckData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allFonts, setAllFonts] = useState([]);
  
  if (data.selectedProject === null || data.selectedDeck === null || !data.projects[data.selectedProject]) {
    return <p>Selecione um projeto e deck primeiro.</p>;
  }

  // Carregar e aplicar fontes customizadas no preview
  useEffect(() => {
    async function loadFonts() {
      if (!deckData || !deckData.designer) return;
      
      try {
        const { getGlobalFonts } = await import('../utils/firebase');
        const globalFonts = await getGlobalFonts();
        const designerFonts = deckData.designer.customFonts || [];
        
        // Mesclar fontes globais com fontes do designer
        const mergedFonts = [...globalFonts];
        designerFonts.forEach(df => {
          if (!mergedFonts.some(gf => gf.name === df.name)) {
            mergedFonts.push(df);
          }
        });
        
        setAllFonts(mergedFonts);
        
        // Aplicar @font-face no documento para o preview
        mergedFonts.forEach(font => {
          if (!document.getElementById(`print-preview-font-${font.name}`)) {
            const style = document.createElement('style');
            style.id = `print-preview-font-${font.name}`;
            style.textContent = `
              @font-face {
                font-family: '${font.name}';
                src: url(${font.data});
                font-display: swap;
              }
            `;
            document.head.appendChild(style);
          }
        });
      } catch (error) {
        console.error('Erro ao carregar fontes:', error);
      }
    }
    
    loadFonts();
  }, [deckData]);

  useEffect(() => {
    async function fetchDeckAndCards() {
      setLoading(true);
      const project = data.projects[data.selectedProject];
      let deck = project.decks?.[data.selectedDeck];
      if (!deck && project.decks) {
        deck = Object.values(project.decks).find(d => d.id === data.selectedDeck || d.key === data.selectedDeck);
      }
      // Se ainda não encontrar, busca do Firestore
      if (project && project.id) {
        try {
          const { getAllDecks } = await import('../utils/firebase');
          const decks = await getAllDecks(project.id);
          deck = decks[data.selectedDeck] || Object.values(decks).find(d => d.id === data.selectedDeck || d.key === data.selectedDeck);
        } catch (e) {
          deck = null;
        }
      }
      // Buscar cartas do Firestore
      let cards = [];
      if (deck && deck.id && project && project.id) {
        try {
          const { db } = await import('../utils/firebase');
          const { collection, getDocs } = await import('firebase/firestore');
          const cardsCol = collection(db, 'projects', project.id, 'decks', deck.id, 'cards');
          const cardsSnap = await getDocs(cardsCol);
          cards = cardsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
          cards = deck.cards || [];
        }
      } else {
        cards = deck?.cards || [];
      }
      setDeckData(deck ? { ...deck, cards } : null);
      setLoading(false);
    }
    fetchDeckAndCards();
  }, [data.selectedProject, data.selectedDeck]);

  if (loading) {
    return <p>Carregando deck...</p>;
  }
  if (!deckData) {
    return <p>Deck não encontrado. Selecione o deck correto ou recarregue a página.</p>;
  }
  const designer = deckData.designer;
  const cards = deckData.cards || [];

  if (!designer || !designer.elements || designer.elements.length === 0) {
    return <p>Crie um designer com campos primeiro.</p>;
  }

  if (cards.length === 0) {
    return <p>Adicione cartas na aba "Detalhes de Cartas" primeiro.</p>;
  }

  // Expandir cartas com base nas cópias
  const expandedCards = [];
  cards.forEach(card => {
    for (let i = 0; i < (card.copias || 1); i++) {
      expandedCards.push(card);
    }
  });

  const cardsPerPage = 9; // 3x3 em A4
  const pages = [];
  for (let i = 0; i < expandedCards.length; i += cardsPerPage) {
    pages.push(expandedCards.slice(i, i + cardsPerPage));
  }

  const renderCard = (card) => {
    const cardConfigBorder = designer.cardConfig || { borderRadius: 8, borderWidth: 2, borderColor: '#333' };
    
    // Extrair dimensões em mm do nome do tipo (ex: "63x88mm")
    const match = designer.tipo.nome.match(/(\d+)x(\d+)mm/);
    const widthMm = match ? parseFloat(match[1]) : (designer.tipo.width / 4);
    const heightMm = match ? parseFloat(match[2]) : (designer.tipo.height / 4);
    
    // Calcular fator de escala: mm real / pixels do designer
    const scaleFactor = widthMm / designer.tipo.width;
    
    return (
      <div className="card-container" style={{
        position: 'relative',
        width: widthMm + 'mm',
        height: heightMm + 'mm',
        border: `${Math.max(0.5, cardConfigBorder.borderWidth * scaleFactor)}mm solid ${cardConfigBorder.borderColor}`,
        borderRadius: `${cardConfigBorder.borderRadius * scaleFactor}mm`,
        background: cardConfigBorder.backgroundColor || '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}>
        {[...designer.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map((el, idx) => {
          // Para imagens padrão, usar el.src; para outras, usar o valor da carta
          const value = el.type === 'image' && el.isDefault ? el.src : (card[el.fieldName] || el.value);
          if (el.type === 'text') {
            return (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  left: (el.x / designer.tipo.width * 100) + '%',
                  top: (el.y / designer.tipo.height * 100) + '%',
                  width: ((el.width || 150) / designer.tipo.width * 100) + '%',
                  height: ((el.height || 30) / designer.tipo.height * 100) + '%',
                  color: el.color,
                  fontSize: (el.fontSize * scaleFactor) + 'mm',
                  fontFamily: el.fontFamily || 'Arial',
                  textAlign: el.textAlign || 'left',
                  overflow: 'hidden',
                  wordWrap: 'break-word',
                  boxSizing: 'border-box',
                  zIndex: el.zIndex || 0,
                  transform: `rotate(${el.rotation || 0}deg)`,
                }}
              >
                {value}
              </div>
            );
          } else if (el.type === 'image' && value) {
            return (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  left: el.fullScreen ? 0 : (el.x / designer.tipo.width * 100) + '%',
                  top: el.fullScreen ? 0 : (el.y / designer.tipo.height * 100) + '%',
                  width: el.fullScreen ? '100%' : (el.width / designer.tipo.width * 100) + '%',
                  height: el.fullScreen ? '100%' : (el.height / designer.tipo.height * 100) + '%',
                  zIndex: el.zIndex || 0,
                }}
              >
                <img 
                  src={value} 
                  alt={el.fieldName}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    imageRendering: 'pixelated'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            );
          } else if (el.type === 'shape') {
            return (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  left: (el.x / designer.tipo.width * 100) + '%',
                  top: (el.y / designer.tipo.height * 100) + '%',
                  width: ((el.width || 100) / designer.tipo.width * 100) + '%',
                  height: ((el.height || 100) / designer.tipo.height * 100) + '%',
                  backgroundColor: el.fillColor,
                  border: el.hasBorder ? `${el.borderWidth || 2}px solid ${el.borderColor || '#1e40af'}` : 'none',
                  borderRadius: el.shapeType === 'circle' ? '50%' : `${el.borderRadius || 0}px`,
                  zIndex: el.zIndex || 0,
                  boxSizing: 'border-box'
                }}
              />
            );
          }
          return null;
        })}
      </div>
    );
  };

  const handlePrint = () => {
    // Função para gerar HTML de um lado da carta
    const generateCardHTML = (card, elements, scaleFactor, widthMm, heightMm, cardConfigBorder, isVerso = false) => {
      const elementsHTML = [...elements]
        .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
        .map(el => {
          // Para verso, usar apenas valores padrão (não buscar de card[fieldName])
          const value = isVerso 
            ? (el.value || (el.type === 'image' ? el.src : ''))
            : (el.type === 'image' && el.isDefault ? el.src : (card[el.fieldName] || el.value));
          
          if (el.type === 'text') {
            return `
              <div style="
                position: absolute;
                left: ${(el.x / designer.tipo.width * 100)}%;
                top: ${(el.y / designer.tipo.height * 100)}%;
                width: ${((el.width || 150) / designer.tipo.width * 100)}%;
                height: ${((el.height || 30) / designer.tipo.height * 100)}%;
                color: ${el.color};
                font-size: ${el.fontSize * scaleFactor}mm;
                font-family: ${el.fontFamily || 'Arial'};
                text-align: ${el.textAlign || 'left'};
                overflow: hidden;
                word-wrap: break-word;
                box-sizing: border-box;
                z-index: ${el.zIndex || 0};
                transform: rotate(${el.rotation || 0}deg);
              ">${value || ''}</div>
            `;
          } else if (el.type === 'image' && value) {
            return `
              <div style="
                position: absolute;
                left: ${el.fullScreen ? 0 : (el.x / designer.tipo.width * 100)}%;
                top: ${el.fullScreen ? 0 : (el.y / designer.tipo.height * 100)}%;
                width: ${el.fullScreen ? '100%' : (el.width / designer.tipo.width * 100) + '%'};
                height: ${el.fullScreen ? '100%' : (el.height / designer.tipo.height * 100) + '%'};
                z-index: ${el.zIndex || 0};
              ">
                <img src="${value}" style="
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                  image-rendering: pixelated;
                " />
              </div>
            `;
          } else if (el.type === 'shape') {
            return `
              <div style="
                position: absolute;
                left: ${(el.x / designer.tipo.width * 100)}%;
                top: ${(el.y / designer.tipo.height * 100)}%;
                width: ${((el.width || 100) / designer.tipo.width * 100)}%;
                height: ${((el.height || 100) / designer.tipo.height * 100)}%;
                background: ${el.fillColor};
                border: ${el.hasBorder ? `${el.borderWidth || 2}px solid ${el.borderColor || '#1e40af'}` : 'none'};
                border-radius: ${el.shapeType === 'circle' ? '50%' : `${el.borderRadius || 0}px`};
                z-index: ${el.zIndex || 0};
                box-sizing: border-box;
              "></div>
            `;
          }
          return '';
        }).join('');
      
      return `
        <div style="
          position: relative;
          width: ${widthMm}mm;
          height: ${heightMm}mm;
          border: ${Math.max(0.5, cardConfigBorder.borderWidth * scaleFactor)}mm solid ${cardConfigBorder.borderColor};
          border-radius: ${cardConfigBorder.borderRadius * scaleFactor}mm;
          background: ${cardConfigBorder.backgroundColor || '#fff'};
          overflow: hidden;
          box-sizing: border-box;
        ">
          ${elementsHTML}
        </div>
      `;
    };

    const cardConfigBorder = designer.cardConfig || { borderRadius: 8, borderWidth: 2, borderColor: '#333' };
    const match = designer.tipo.nome.match(/(\d+)x(\d+)mm/);
    const widthMm = match ? parseFloat(match[1]) : (designer.tipo.width / 4);
    const heightMm = match ? parseFloat(match[2]) : (designer.tipo.height / 4);
    const scaleFactor = widthMm / designer.tipo.width;

    const hasVerso = designer.versoElements && designer.versoElements.length > 0;

    // Gerar HTML das frentes
    const printContentFrentes = pages.map((page, pidx) => `
      <div class="print-page" style="
        width: 210mm;
        height: 297mm;
        padding: ${safetyMargin}mm;
        box-sizing: border-box;
        page-break-after: ${!hasVerso && pidx === pages.length - 1 ? 'auto' : 'always'};
        page-break-inside: avoid;
      ">
        <div style="
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: ${cardGap}mm;
          justify-items: center;
        ">
          ${page.map(card => generateCardHTML(card, designer.elements, scaleFactor, widthMm, heightMm, cardConfigBorder)).join('')}
        </div>
      </div>
    `).join('');

    // Gerar HTML dos versos (se existirem)
    let printContentVersos = '';
    if (hasVerso) {
      printContentVersos = pages.map((page, pidx) => `
        <div class="print-page" style="
          width: 210mm;
          height: 297mm;
          padding: ${safetyMargin}mm;
          box-sizing: border-box;
          page-break-after: ${pidx === pages.length - 1 ? 'auto' : 'always'};
          page-break-inside: avoid;
        ">
          <div style="
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: ${cardGap}mm;
            justify-items: center;
            transform: scaleX(-1);
          ">
            ${page.map(card => `<div style="transform: scaleX(-1);">${generateCardHTML(card, designer.versoElements, scaleFactor, widthMm, heightMm, cardConfigBorder, true)}</div>`).join('')}
          </div>
        </div>
      `).join('');
    }

    const printContent = printContentFrentes + printContentVersos;

    // Criar nova janela com apenas as cartas
    // Detectar fontes usadas e embutir fontes customizadas salvas no designer
    const usedFonts = new Set();
    designer.elements.forEach(el => {
      if (el.type === 'text' && el.fontFamily) usedFonts.add(el.fontFamily);
    });

    // Usar as fontes já carregadas (globais + designer)
    let fontFaceCSS = '';
    // Incluir @font-face para fontes customizadas (data URLs)
    allFonts.forEach(f => {
      if (f && f.name && f.data) {
        fontFaceCSS += `@font-face { font-family: '${f.name}'; src: url('${f.data}'); font-display: swap; }\n`;
        // Remover da lista de usados para não tentar buscar no Google
        usedFonts.delete(f.name);
      }
    });

    // Para fontes restantes (possivelmente do Google), incluir link para Google Fonts
    const systemFonts = ['Arial','sans-serif','serif','monospace','Times New Roman','Courier New','Verdana','Tahoma','Georgia'];
    let googleLinks = '';
    Array.from(usedFonts).forEach(fn => {
      if (!systemFonts.includes(fn)) {
        const fontUrl = `https://fonts.googleapis.com/css2?family=${fn.replace(/ /g, '+')}:wght@400;700&display=swap`;
        googleLinks += `<link href="${fontUrl}" rel="stylesheet">\n`;
      }
    });

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Impressão de Cartas</title>
          ${googleLinks}
          <style>
            ${fontFaceCSS}
            * {
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              color-adjust: exact;
            }
            body {
              margin: 0;
              padding: 0;
            }
            @page {
              size: A4;
              margin: 0;
            }
            @media print {
              .print-page {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    // Aguardar carregamento das imagens antes de imprimir
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  return (
    <div>
      <h2 className="no-print">Preview de Impressão</h2>
      
      <div className="no-print" style={{ marginBottom: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <label>
          Margem entre cartas:
          <input 
            type="number" 
            value={cardGap} 
            onChange={e => setCardGap(Number(e.target.value))} 
            min={0} 
            max={10} 
            step={0.5}
            style={{ width: '80px', marginLeft: '0.5rem' }} 
          /> mm
        </label>
        <label>
          Margem de segurança (borda da página):
          <input 
            type="number" 
            value={safetyMargin} 
            onChange={e => setSafetyMargin(Number(e.target.value))} 
            min={0} 
            max={20} 
            step={1}
            style={{ width: '80px', marginLeft: '0.5rem' }} 
          /> mm
        </label>
      </div>
      
      <p className="no-print">Total de cartas: {expandedCards.length} (em {pages.length} página{pages.length > 1 ? 's' : ''})</p>
      <div>
        {pages.map((page, pidx) => (
          <div key={pidx} className="print-page" style={{
            width: '210mm',
            minHeight: '297mm',
            border: '2px solid #333',
            background: '#fafafa',
            padding: `${safetyMargin}mm`,
            boxSizing: 'border-box',
            position: 'relative',
          }}>
            <div className="no-print" style={{ position: 'absolute', top: 10, left: 10, fontWeight: 'bold', fontSize: '12px' }}>Página {pidx + 1}</div>
            <div className="cards-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: `${cardGap}mm`,
              marginTop: '5mm',
              justifyItems: 'center',
            }}>
              {page.map((card, idx) => (
                <div key={idx} className="card-wrapper">
                  {renderCard(card)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button className="no-print" style={{ marginTop: 20 }} onClick={handlePrint}>Imprimir Cartas</button>
    </div>
  );
}

export default PrintPreview;
