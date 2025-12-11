import React, { useEffect, useState, useRef } from 'react';
import Designer from './components/Designer';
import CardTable from './components/CardTable';
import ProjectDecks from './components/ProjectDecks';
import DeckManager from './components/DeckManager';
import PrintPreview from './components/PrintPreview';
import { AlertModal } from './components/Modal';
import { saveToFile, loadFromFile } from './utils/fileUtils';
import './App.css';
import { FiUpload, FiDownload, FiArrowLeft, FiGrid, FiLayers, FiEdit, FiList } from 'react-icons/fi';

const LOCAL_KEY = 'cardCreatorData';

function App() {
  const [data, setData] = useState({
    projects: [],
    selectedProject: null,
    selectedDeck: null,
    cards: [],
    designer: [],
  });
  const [activeTab, setActiveTab] = useState('designer');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const fileInputRef = useRef(null);
  const lastSaveRef = useRef(null);





  const saveDataToFile = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `card-creator-backup-${timestamp}.json`;
    saveToFile(data, filename);
  };

  const handleExportData = async () => {
    // Solicita o handle do arquivo ao usuário


    setAlertMessage('Dados exportados com sucesso!');
  };

  const handleImportData = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const importedData = await loadFromFile(file);
        setData(importedData);
        setAlertMessage('Dados importados com sucesso!');
      } catch (error) {
        setAlertMessage('Erro ao importar arquivo: ' + error.message);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const selectProject = (idx) => {
    setData({ ...data, selectedProject: idx, selectedDeck: null });
    setActiveTab('designer');
  };

  const selectDeck = (deckIdx) => {
    setData({ ...data, selectedDeck: deckIdx });
    setActiveTab('designer');
  };

  const backToProjects = () => {
    setData({ ...data, selectedProject: null, selectedDeck: null });
  };

  const backToDecks = () => {
    setData({ ...data, selectedDeck: null });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'designer':
        return <Designer data={data} setData={setData} />;
      case 'cards':
        return <CardTable data={data} setData={setData} setShowPrintPreview={setShowPrintPreview} />;
      default:
        return null;
    }
  };

  return (
    <div className="container">
      {data.selectedProject === null && (
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1>Card Creator</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Crie e personalize suas cartas de jogo com facilidade.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={handleExportData} title="Exportar todos os dados para arquivo JSON">
              <FiDownload /> Exportar
            </button>
            <button onClick={triggerFileInput} title="Importar dados de arquivo JSON" className="secondary">
              <FiUpload /> Importar
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportData}
              style={{ display: 'none' }}
            />
          </div>
        </header>
      )}
      
      {data.selectedProject === null ? (
        <>
          <h2><FiGrid /> Meus Projetos</h2>
          <ProjectDecks data={data} setData={setData} selectProject={selectProject} />
        </>
      ) : data.selectedDeck === null ? (
        <div>
          <button onClick={backToProjects} style={{ marginBottom: '1.5rem' }}>
            <FiArrowLeft /> Voltar aos Projetos
          </button>
          <h2><FiLayers /> Decks do Projeto</h2>
          <DeckManager data={data} setData={setData} onSelectDeck={selectDeck} />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div className="sidebar">
            <button onClick={backToDecks} style={{ marginBottom: '1.5rem', width: '100%' }}>
              <FiArrowLeft /> Voltar aos Decks
            </button>
            <div className="tabs-vertical">
              <div className={`tab ${activeTab === 'designer' ? 'active' : ''}`} onClick={() => setActiveTab('designer')}>
                <FiEdit /> Designer
              </div>
              <div className={`tab ${activeTab === 'cards' ? 'active' : ''}`} onClick={() => setActiveTab('cards')}>
                <FiList /> Cartas
              </div>
            </div>
          </div>
          <div className="tab-content">
            {renderTabContent()}
          </div>
        </div>
      )}

      {showPrintPreview && (
        <div className="modal-overlay" onClick={() => setShowPrintPreview(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto'}}>
            <PrintPreview data={data} />
            <button onClick={() => setShowPrintPreview(false)} style={{marginTop: '1rem'}}>Fechar</button>
          </div>
        </div>
      )}

      {alertMessage && (
        <AlertModal
          message={alertMessage}
          onClose={() => setAlertMessage(null)}
        />
      )}
    </div>
  );
}

export default App;
