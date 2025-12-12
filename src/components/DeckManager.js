import React, { useState, useEffect, useRef } from 'react';
import { PromptModal, ConfirmModal } from './Modal';
import { FiPlus, FiEdit, FiTrash2, FiCheckSquare, FiXSquare, FiList, FiPrinter } from 'react-icons/fi';
import { addDeck, deleteDeck, getAllDecks, db } from '../utils/firebase';
import { doc as fsDoc, getDoc } from 'firebase/firestore';
import './DeckManager.css';

function DeckManager({ data, setData, onSelectDeck, onPrintDeck, user }) {
  const [showModal, setShowModal] = useState(null);
  const [deckToRemove, setDeckToRemove] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const currentProject = data.projects[data.selectedProject] && data.projects[data.selectedProject].id
    ? data.projects[data.selectedProject]
    : null;
  const [decks, setDecks] = useState([]);

  // If decks are missing `designer`, fetch designer field for those decks individually
  useEffect(() => {
    let cancelled = false;
    async function fetchMissingDesigners() {
      if (!currentProject || !currentProject.id) return;
      const toFetch = decks.map((d, i) => ({ d, i })).filter(x => x.d && x.d.id && !x.d.designer);
      if (toFetch.length === 0) return;
      await Promise.all(toFetch.map(async ({ d, i }) => {
        try {
          const ref = fsDoc(db, 'projects', currentProject.id, 'decks', d.id);
          const snap = await getDoc(ref);
          if (!snap.exists()) return;
          const data = snap.data();
          if (data && data.designer && !cancelled) {
            setDecks(prev => prev.map((p, idx) => idx === i ? { ...p, designer: data.designer } : p));
          }
        } catch (e) {
          console.warn('Error fetching designer for deck', d.id, e);
        }
      }));
    }
    fetchMissingDesigners();
    return () => { cancelled = true; };
  }, [decks, currentProject]);

  // Canvas-based inline preview component
  function InlineCanvasPreview({ designer, cardWidth, cardHeight, previewWidth, previewHeight }) {
    const canvasRef = useRef(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !designer) return;

      // Set canvas internal resolution to designer units and scale via CSS for crisp scaling
      canvas.width = cardWidth || 252;
      canvas.height = cardHeight || 352;
      canvas.style.width = previewWidth + 'px';
      canvas.style.height = previewHeight + 'px';

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background + border
      const bg = designer.cardConfig?.backgroundColor || '#fff';
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (designer.cardConfig && designer.cardConfig.borderWidth) {
        ctx.strokeStyle = designer.cardConfig.borderColor || '#333';
        ctx.lineWidth = designer.cardConfig.borderWidth;
        // Draw inner rect stroke
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
      }

      const elements = (designer.elements || []).slice().sort((a,b)=> (a.zIndex||0)-(b.zIndex||0));
      elements.forEach(el => {
        const x = el.x || 0;
        const y = el.y || 0;
        const w = el.width || 100;
        const h = el.height || 30;

        if (el.type === 'shape') {
          ctx.save();
          if (el.rotation) ctx.translate(x + w/2, y + h/2), ctx.rotate((el.rotation * Math.PI) / 180), ctx.translate(-(x + w/2), -(y + h/2));
          ctx.fillStyle = el.fillColor || '#ccc';
          if (el.shapeType === 'circle') {
            const cx = x + w/2;
            const cy = y + h/2;
            const r = Math.min(w,h)/2;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            if (el.hasBorder) { ctx.strokeStyle = el.borderColor || '#000'; ctx.lineWidth = el.borderWidth || 1; ctx.stroke(); }
          } else {
            if ((el.borderRadius || 0) > 0) {
              // rounded rect
              const rx = el.borderRadius || 0;
              const ry = rx;
              roundRect(ctx, x, y, w, h, rx);
              ctx.fillStyle = el.fillColor || '#ccc';
              ctx.fill();
              if (el.hasBorder) { ctx.strokeStyle = el.borderColor || '#000'; ctx.lineWidth = el.borderWidth || 1; ctx.stroke(); }
            } else {
              ctx.fillRect(x, y, w, h);
              if (el.hasBorder) { ctx.strokeStyle = el.borderColor || '#000'; ctx.lineWidth = el.borderWidth || 1; ctx.strokeRect(x, y, w, h); }
            }
          }
          ctx.restore();
        }

        if (el.type === 'image' && el.src) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.save();
            if (el.rotation) ctx.translate(x + w/2, y + h/2), ctx.rotate((el.rotation * Math.PI) / 180), ctx.translate(-(x + w/2), -(y + h/2));
            // cover behavior
            ctx.drawImage(img, x, y, w, h);
            ctx.restore();
          };
          img.onerror = () => {
            // ignore
          };
          img.src = el.src;
        }

        if (el.type === 'text') {
          const text = el.value || el.fieldName || '';
          const fontSize = el.fontSize || 14;
          ctx.save();
          ctx.font = `${fontSize}px ${el.fontFamily || 'Arial'}`;
          ctx.fillStyle = el.color || '#000';
          // alignment
          ctx.textAlign = el.textAlign || 'left';
          // vertical alignment fallback to top
          ctx.textBaseline = 'top';
          if (el.rotation) ctx.translate(x, y), ctx.rotate((el.rotation * Math.PI) / 180), ctx.translate(-x, -y);
          // simple single-line draw (preview small)
          ctx.fillText(text, x, y);
          ctx.restore();
        }
      });

    }, [designer, cardWidth, cardHeight, previewWidth, previewHeight]);

    // helper for rounded rect
    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    return <canvas ref={canvasRef} style={{ display: 'block', width: previewWidth + 'px', height: previewHeight + 'px' }} />;
  }

  // Carregar decks do Firestore ao selecionar projeto
  useEffect(() => {
    async function fetchDecks() {
      if (currentProject && currentProject.id && user?.uid) {
        const decks = await getAllDecks(currentProject.id, user.uid);
        console.log({ decks, currentProject, user})
        setDecks(decks);
      } else {
        setDecks([]);
      }
    }
    fetchDecks();
    // eslint-disable-next-line
  }, [currentProject && currentProject.id, user?.uid]);

  function openAddDeckModal() {
    setShowModal('promptName');
  }

  async function handleDeckNameConfirm(nome) {
    if (nome && nome.trim() && currentProject && currentProject.id && user?.uid) {
      setIsCreating(true);
      try {
        console.log('Tentando criar deck em projeto:', currentProject.id, 'com nome:', nome.trim());
        await addDeck(currentProject.id, { nome: nome.trim() }, user.uid);
        console.log('Deck criado!');
        // Recarrega decks do Firestore (apenas do usuário logado)
        const decks = await getAllDecks(currentProject.id, user.uid);
        setDecks(decks);
        setShowModal(null);
      } finally {
        setIsCreating(false);
      }
    } else {
      console.warn('Dados insuficientes para criar deck:', { nome, currentProject, user });
      setShowModal(null);
    }
  }

  function removeDeck(deckIdx, e) {
    e.stopPropagation();
    setDeckToRemove(deckIdx);
    setShowModal('confirmRemove');
  }

  async function handleRemoveConfirm() {
    if (currentProject && currentProject.id && decks[deckToRemove]?.id && user?.uid) {
      await deleteDeck(currentProject.id, decks[deckToRemove].id);
      // Recarrega decks do Firestore (apenas do usuário logado)
      const newDecks = await getAllDecks(currentProject.id, user.uid);
      setDecks(newDecks);
    }
    setShowModal(null);
    setDeckToRemove(null);
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={openAddDeckModal}><FiPlus /> Novo Deck</button>
      </div>
      
      <div className="deck-grid">
        {decks && decks.length > 0 ? (
          decks.map((deck, idx) => {
            const designer = deck.designer;
            // Debug log: inspect designer used for preview (temporary)
            try {
              console.log('DeckManager preview debug', { idx, deckId: deck.id, hasDesigner: !!designer, tipo: designer?.tipo, elementsCount: designer?.elements?.length || 0, cardConfig: designer?.cardConfig });
            } catch (e) {
              console.log('DeckManager preview debug error', e);
            }
            const cardWidth = designer?.tipo?.width || 252;
            const cardHeight = designer?.tipo?.height || 352;
            
            const previewHeight = 140;
            const scale = previewHeight / cardHeight;
            const previewWidth = cardWidth * scale;

            const cardCount = deck.cards ? deck.cards.length : 0;
            const totalCopies = deck.cards ? deck.cards.reduce((acc, card) => acc + (Number(card.copies) || 1), 0) : 0;

            return (
              <div key={idx} className="deck-card">
                <div className="deck-card-preview-wrapper" onClick={() => onSelectDeck(idx)}>
                  {designer ? (
                    <div 
                      className="deck-card-preview"
                      style={{
                        width: previewWidth,
                        height: previewHeight,
                        backgroundColor: designer.cardConfig?.backgroundColor || '#fff',
                        border: `${(designer.cardConfig?.borderWidth || 2) * scale}px solid ${designer.cardConfig?.borderColor || '#333'}`,
                        borderRadius: (designer.cardConfig?.borderRadius || 8) * scale,
                      }}
                    >
                      <InlineCanvasPreview designer={designer} cardWidth={cardWidth} cardHeight={cardHeight} previewWidth={previewWidth} previewHeight={previewHeight} />
                    </div>
                  ) : (
                    <div className="deck-card-no-preview" style={{ width: previewWidth, height: previewHeight }}>
                      <FiList />
                      <span>Nenhum designer</span>
                    </div>
                  )}
                </div>
                <div className="deck-card-info">
                  <h3 onClick={() => onSelectDeck(idx)}>{deck.nome}</h3>
                  <div className="deck-card-stats">
                    <span>{cardCount} carta{cardCount !== 1 ? 's' : ''}</span>
                    <span className="separator">|</span>
                    <span>{totalCopies} cópia{totalCopies !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="deck-card-actions">
                    <button onClick={() => onSelectDeck(idx)} className="primary">
                      <FiEdit /> Designer
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (onPrintDeck && currentProject) onPrintDeck(currentProject, deck); }}
                      className="secondary"
                      title="Imprimir deck"
                    >
                      <FiPrinter />
                    </button>
                    <button onClick={(e) => removeDeck(idx, e)} className="danger icon-only" title="Remover deck">
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-secondary)', marginTop: '3rem', padding: '2rem', backgroundColor: 'var(--card-background)', borderRadius: 'var(--border-radius)' }}>
            <p style={{margin: 0}}>Nenhum deck criado para este projeto.</p>
            <p style={{margin: '0.5rem 0 0 0'}}>Clique em "Novo Deck" para começar.</p>
          </div>
        )}
      </div>
      
      {showModal === 'promptName' && (
        <PromptModal
          message="Digite o nome do novo deck:"
          placeholder="Ex: Cartas de Ataque, Cartas de Defesa"
          onConfirm={handleDeckNameConfirm}
          onCancel={() => setShowModal(null)}
          isLoading={isCreating}
        />
      )}
      
      {showModal === 'confirmRemove' && (
        <ConfirmModal
          message={`Deseja realmente remover o deck "${decks[deckToRemove]?.nome}"?`}
          onConfirm={handleRemoveConfirm}
          onCancel={() => { setShowModal(null); setDeckToRemove(null); }}
        />
      )}
    </div>
  );
}

export default DeckManager;
