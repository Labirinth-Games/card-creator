import React, { useEffect, useState, useRef } from 'react';
import Login from './components/Login';
import SignUp from './components/SignUp';
import { saveUser } from './utils/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import Designer from './components/Designer';
import CardTable from './components/CardTable';
import ProjectDecks from './components/ProjectDecks';
import DeckManager from './components/DeckManager';
import PrintPreview from './components/PrintPreview';
import { AlertModal } from './components/Modal';
import { saveToFile, loadFromFile } from './utils/fileUtils';
import HamburgerMenu from './components/HamburgerMenu'; // Importar o novo menu

import { FiGrid, FiLayers, FiEdit, FiList, FiArrowLeft, FiBox } from 'react-icons/fi';
import './App.css';

function App() {
  const [showSignUp, setShowSignUp] = useState(false);
  const [user, setUser] = useState(null);
  const [data, setData] = useState({
    projects: [],
    selectedProject: null,
    selectedDeck: null,
    cards: [],
    designer: [],
  });
  const [activeTab, setActiveTab] = useState('designer');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printDeckOverride, setPrintDeckOverride] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const fileInputRef = useRef(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Autenticação Firebase
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    (async () => {
      const auth = getAuth();
      try {
        await auth.signOut();
      } catch (e) {
        console.warn('Error signing out:', e);
      }

      // Clear in-memory React state
      setUser(null);
      setData({
        projects: [],
        selectedProject: null,
        selectedDeck: null,
        cards: [],
        designer: [],
      });

      // Clear storages
      try {
        try { localStorage.clear(); } catch (e) { console.warn('localStorage clear failed', e); }
        try { sessionStorage.clear(); } catch (e) { console.warn('sessionStorage clear failed', e); }

        // Clear CacheStorage (service worker caches)
        if (window.caches && typeof window.caches.keys === 'function') {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }

        // Unregister service workers
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) {
            try { await reg.unregister(); } catch (e) { /* ignore */ }
          }
        }

        // Attempt to delete all IndexedDB databases (if supported)
        if (indexedDB && typeof indexedDB.databases === 'function') {
          try {
            const dbs = await indexedDB.databases();
            await Promise.all(dbs.map(d => indexedDB.deleteDatabase(d.name)));
          } catch (e) {
            // Fallback: try deleting common firebase/local DBs
            try { indexedDB.deleteDatabase('firebaseLocalStorageDb'); } catch (err) {}
            try { indexedDB.deleteDatabase('firestore'); } catch (err) {}
            try { indexedDB.deleteDatabase('localforage'); } catch (err) {}
          }
        }
      } catch (e) {
        console.warn('Error clearing caches/storage:', e);
      }

      // Force a full reload to ensure no in-memory data remains
      try {
        window.location.reload(true);
      } catch (e) {
        window.location.reload();
      }
    })();
  };

  const handleExportData = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `card-creator-backup-${timestamp}.json`;
    saveToFile(data, filename);
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

  const handlePrintDeck = (project, deck) => {
    // Open print preview for a specific deck without navigating away
    setPrintDeckOverride({ project, deck });
    setShowPrintPreview(true);
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

  if (loadingAuth) {
    return (
      <div className="login-wrapper">
        <div>Carregando...</div>
      </div>
    );
  }

  if (!user) {
    if (showSignUp) {
      return <SignUp onSignUp={async (newUser) => {
        await saveUser(newUser);
        setUser(newUser);
        setShowSignUp(false);
      }} />;
    }
    return <Login onLogin={setUser} onShowSignUp={() => setShowSignUp(true)} />;
  }

  const AppHeader = () => (
    <header className="app-header">
      <div className="header-brand">
        <FiBox size={24} />
        Card Creator
      </div>
      <div className="header-user">
        <div className="user-info">
          <span className="user-name">{user.displayName || 'Usuário'}</span>
          <span className="user-email">{user.email}</span>
        </div>
        <HamburgerMenu
          onLogout={handleLogout}
          onImport={triggerFileInput}
          onExport={handleExportData}
        />
      </div>
    </header>
  );

  return (
    <div className="app-container">
      <AppHeader />
      <main className="main-content">
        <div className="central-card">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportData}
            style={{ display: 'none' }}
          />

          {data.selectedProject === null ? (
            <>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div>
                  <h1 style={{margin: 0}}>Meus Projetos</h1>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Crie e gerencie seus projetos de cartas.</p>
                </div>
              </header>
              <ProjectDecks
                data={{
                  ...data,
                  projects: (data.projects || []).filter(p => p.userId === user.uid)
                }}
                setData={setData}
                selectProject={selectProject}
                user={user}
              />
            </>
          ) : data.selectedDeck === null ? (
            <div>
              <button onClick={backToProjects} className="secondary" style={{ marginBottom: '1.5rem' }}>
                <FiArrowLeft /> Voltar aos Projetos
              </button>
              <h2 style={{marginTop: 0}}><FiLayers /> Decks do Projeto</h2>
              <DeckManager data={data} setData={setData} onSelectDeck={selectDeck} onPrintDeck={handlePrintDeck} user={user} />
            </div>
          ) : (
            <div className="designer-container">
              <div className="sidebar">
                <button onClick={backToDecks} className="secondary" style={{ marginBottom: '1rem', width: '100%' }}>
                  <FiArrowLeft /> Voltar aos Decks
                </button>
                <div className="tabs-vertical">
                  <div className={`tab ${activeTab === 'designer' ? 'active' : ''}`} onClick={() => setActiveTab('designer')}>
                    <FiEdit /> Design
                  </div>
                  <div className={`tab ${activeTab === 'cards' ? 'active' : ''}`} onClick={() => setActiveTab('cards')}>
                    <FiList /> Cartas
                  </div>
                </div>
              </div>
              <div className="canvas-area">
                {renderTabContent()}
              </div>
            </div>
          )}
        </div>
      </main>

      {showPrintPreview && (
        <div className="modal-overlay" onClick={() => { setShowPrintPreview(false); setPrintDeckOverride(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto'}}>
            <PrintPreview data={data} overrideDeck={printDeckOverride} />
            <button onClick={() => { setShowPrintPreview(false); setPrintDeckOverride(null); }} style={{marginTop: '1rem'}}>Fechar</button>
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
