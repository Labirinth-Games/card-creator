import React, { useState, useEffect } from 'react';
import './Skeleton.css';
import { collection, addDoc, updateDoc, deleteDoc, getDocs, doc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import './CardTable.css';
import ImageDropZone from './ImageDropZone';
import { FiPlus, FiPrinter, FiTrash2 } from 'react-icons/fi';

function CardTable({ data, setData, setShowPrintPreview }) {
  const [cards, setCards] = useState([]);
  const [designerFields, setDesignerFields] = useState([]);
  const [designer, setDesigner] = useState(null);
  const [loadingCards, setLoadingCards] = useState(false);

  // Carregar cards do Firestore ao selecionar deck
  useEffect(() => {
    async function fetchCards() {
      if (data.selectedProject !== null && data.selectedDeck !== null) {
        setLoadingCards(true);
        try {
          const project = data.projects[data.selectedProject];
          if (project && project.id) {
            // Buscar decks do Firestore
            const decksCol = collection(db, 'projects', project.id, 'decks');
            const decksSnap = await getDocs(decksCol);
            const decks = decksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const deck = decks[data.selectedDeck];
            if (deck && deck.id) {
              // Buscar cards do Firestore
              const cardsCol = collection(db, 'projects', project.id, 'decks', deck.id, 'cards');
              const cardsSnap = await getDocs(cardsCol);
              setCards(cardsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
              setDesigner(deck.designer);
              // Extrair campos do designer
              if (deck.designer && deck.designer.elements) {
                const fields = deck.designer.elements
                  .filter(el => el.type !== 'image' || !el.isDefault)
                  .filter(el => el.type !== 'shape') // NÃO mostrar shape na tabela
                  .map(el => ({
                    name: el.fieldName,
                    type: el.type,
                    dataType: el.dataType || 'string',
                    isDefault: el.isDefault || false
                  }));
                setDesignerFields(fields);
              }
            }
          }
        } finally {
          setLoadingCards(false);
        }
      }
    }
    fetchCards();
    // eslint-disable-next-line
  }, [data.selectedProject, data.selectedDeck, data.projects]);

  // Não salva mais cards como array local

  async function addCard() {
    if (designerFields.length === 0) {
      return;
    }
    const newCard = { copias: 1 };
    designerFields.forEach(field => {
      newCard[field.name] = '';
    });
    if (data.selectedProject !== null && data.selectedDeck !== null) {
      const project = data.projects[data.selectedProject];
      if (project && project.id) {
        // Buscar decks do Firestore
        const decksCol = collection(db, 'projects', project.id, 'decks');
        const decksSnap = await getDocs(decksCol);
        const decks = decksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const deck = decks[data.selectedDeck];
        if (deck && deck.id) {
          const cardsCol = collection(db, 'projects', project.id, 'decks', deck.id, 'cards');
          await addDoc(cardsCol, newCard);
          // Atualiza lista
          const cardsSnap = await getDocs(cardsCol);
          setCards(cardsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      }
    }
  }

  async function updateCard(idx, field, value) {
    const card = cards[idx];
    if (!card || !card.id) return;
    const updated = { ...card, [field]: value };
    setCards(cards.map((c, i) => i === idx ? updated : c));
    if (data.selectedProject !== null && data.selectedDeck !== null) {
      const project = data.projects[data.selectedProject];
      if (project && project.id) {
        const decksCol = collection(db, 'projects', project.id, 'decks');
        const decksSnap = await getDocs(decksCol);
        const decks = decksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const deck = decks[data.selectedDeck];
        if (deck && deck.id) {
          const cardRef = doc(db, 'projects', project.id, 'decks', deck.id, 'cards', card.id);
          await updateDoc(cardRef, { [field]: value });
        }
      }
    }
  }

  async function removeCard(idx) {
    const card = cards[idx];
    if (!card || !card.id) return;
    setCards(cards.filter((_, i) => i !== idx));
    if (data.selectedProject !== null && data.selectedDeck !== null) {
      const project = data.projects[data.selectedProject];
      if (project && project.id) {
        const decksCol = collection(db, 'projects', project.id, 'decks');
        const decksSnap = await getDocs(decksCol);
        const decks = decksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const deck = decks[data.selectedDeck];
        if (deck && deck.id) {
          const cardRef = doc(db, 'projects', project.id, 'decks', deck.id, 'cards', card.id);
          await deleteDoc(cardRef);
        }
      }
    }
  }

  return (
    <div>
      <h2>Cartas</h2>
        {loadingCards ? (
          <div style={{ padding: '1.5rem 0' }}>
            <div className="skeleton title" style={{width: '40%', marginBottom: 12}} />
            <div className="modern-table-container">
              <table className="modern-table skeleton-table">
                <thead>
                  <tr>
                    <th style={{width: '8%'}}> </th>
                    {Array.from({length:4}).map((_,i) => (
                      <th key={i}><div className="skeleton small" style={{width:'80%'}}/></th>
                    ))}
                    <th style={{width: '5%'}}> </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({length:5}).map((_,r) => (
                    <tr key={r}>
                      <td><div className="skeleton" style={{height:28, width:40}}/></td>
                      {Array.from({length:4}).map((_,c) => <td key={c}><div className="skeleton" style={{height:28}}/></td>)}
                      <td><div className="skeleton" style={{height:28, width:28, borderRadius:6}}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : designerFields.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '3rem', padding: '2rem', backgroundColor: '#F9FAFB', borderRadius: 'var(--border-radius)' }}>
            <p style={{margin: 0}}>Crie e nomeie campos no "Designer" primeiro.</p>
            <p style={{margin: '0.5rem 0 0 0'}}>Depois, volte aqui para adicionar os dados de cada carta.</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{margin: 0, color: 'var(--text-secondary)'}}>Adicione e edite os dados para cada carta do seu deck.</p>
              <div style={{display: 'flex', gap: '0.75rem'}}>
                <button onClick={addCard}><FiPlus /> Adicionar Carta</button>
                <button onClick={() => setShowPrintPreview(true)} className="secondary"><FiPrinter /> Imprimir</button>
              </div>
            </div>
            
            <div className="modern-table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Cópias</th>
                    {designerFields.map((field, idx) => (
                      <th key={idx}>{field.name}</th>
                    ))}
                    <th style={{width: '5%'}}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((card, idx) => (
                    <tr key={idx}>
                      <td>
                        <input 
                          type="number" 
                          value={card.copias} 
                          min={1} 
                          onChange={e => updateCard(idx, 'copias', Number(e.target.value))} 
                          className="modern-input"
                        />
                      </td>
                      {designerFields.map((field, fidx) => (
                        <td key={fidx}>
                          {field.dataType === 'text' ? (
                            <textarea 
                              value={card[field.name] || ''} 
                              onChange={e => updateCard(idx, field.name, e.target.value)}
                              className="modern-input modern-textarea"
                              placeholder={field.name}
                              rows={2}
                              style={{ width: '100%', boxSizing: 'border-box' }}
                            />
                          ) : field.type === 'image' ? (
                            <ImageDropZone
                              value={card[field.name] || ''}
                              onChange={(newValue) => updateCard(idx, field.name, newValue)}
                              placeholder="Arraste uma imagem ou cole a URL"
                            />
                          ) : field.dataType === 'number' ? (
                            <input 
                              type="number"
                              value={card[field.name] || ''} 
                              onChange={e => updateCard(idx, field.name, e.target.value)}
                              className="modern-input"
                              placeholder={field.name}
                            />
                          ) : (
                            <input 
                              type="text"
                              value={card[field.name] || ''} 
                              onChange={e => updateCard(idx, field.name, e.target.value)}
                              className="modern-input"
                              placeholder={field.name}
                            />
                          )}
                        </td>
                      ))}
                      <td>
                        <button className="danger" onClick={() => removeCard(idx)} title="Remover carta"><FiTrash2 /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
    </div>
  );
}

export default CardTable;
