import React, { useState, useEffect } from 'react';
import { PromptModal, ConfirmModal } from './Modal';
import { FiPlus, FiEdit, FiTrash2, FiCheckSquare, FiXSquare, FiList } from 'react-icons/fi';
import { addDeck, deleteDeck, getAllDecks } from '../utils/firebase';
import './DeckManager.css';

function DeckManager({ data, setData, onSelectDeck }) {
  const [showModal, setShowModal] = useState(null);
  const [deckToRemove, setDeckToRemove] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const currentProject = data.projects[data.selectedProject] && data.projects[data.selectedProject].id
    ? data.projects[data.selectedProject]
    : null;
  const [decks, setDecks] = useState([]);

  // Carregar decks do Firestore ao selecionar projeto
  useEffect(() => {
    async function fetchDecks() {
      if (currentProject && currentProject.id) {
        const decks = await getAllDecks(currentProject.id);
        setDecks(decks);
      } else {
        setDecks([]);
      }
    }
    fetchDecks();
    // eslint-disable-next-line
  }, [currentProject && currentProject.id]);

  function openAddDeckModal() {
    setShowModal('promptName');
  }

  async function handleDeckNameConfirm(nome) {
    if (nome && nome.trim() && currentProject && currentProject.id) {
      setIsCreating(true);
      try {
        console.log('Tentando criar deck em projeto:', currentProject.id, 'com nome:', nome.trim());
        await addDeck(currentProject.id, { nome: nome.trim() });
        console.log('Deck criado!');
        // Recarrega decks do Firestore
        const decks = await getAllDecks(currentProject.id);
        setDecks(decks);
        setShowModal(null);
      } finally {
        setIsCreating(false);
      }
    } else {
      console.warn('Dados insuficientes para criar deck:', { nome, currentProject });
      setShowModal(null);
    }
  }

  function removeDeck(deckIdx, e) {
    e.stopPropagation();
    setDeckToRemove(deckIdx);
    setShowModal('confirmRemove');
  }

  async function handleRemoveConfirm() {
    if (currentProject && currentProject.id && decks[deckToRemove]?.id) {
      await deleteDeck(currentProject.id, decks[deckToRemove].id);
      // Recarrega decks do Firestore
      const newDecks = await getAllDecks(currentProject.id);
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
                      {designer.elements && designer.elements.map(el => {
                        const style = {
                          position: 'absolute',
                          left: el.x * scale,
                          top: el.y * scale,
                          width: el.width * scale,
                          height: el.height * scale,
                          transformOrigin: 'top left',
                        };

                        if (el.type === 'text') {
                          return (
                            <div key={el.id} style={{
                              ...style,
                              color: el.color,
                              fontSize: el.fontSize * scale,
                              fontFamily: el.fontFamily,
                              fontWeight: el.fontWeight,
                              fontStyle: el.fontStyle,
                              textDecoration: el.textDecoration,
                              textAlign: el.textAlign,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {el.value || el.fieldName}
                            </div>
                          );
                        }

                        if (el.type === 'image' && el.src) {
                          return <img key={el.id} src={el.src} alt={el.fieldName} style={{...style, objectFit: 'cover'}} />;
                        }

                        if (el.type === 'shape') {
                          return (
                            <div key={el.id} style={{
                              ...style,
                              backgroundColor: el.fillColor,
                              border: el.hasBorder ? `${el.borderWidth * scale}px solid ${el.borderColor}` : 'none',
                              borderRadius: (el.shapeType === 'circle' ? '50%' : `${el.borderRadius * scale}px`),
                            }}></div>
                          );
                        }
                        return null;
                      })}
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
