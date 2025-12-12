import React, { useState, useEffect } from 'react';
import { PromptModal, ConfirmModal } from './Modal';
import { exportProject } from '../utils/fileUtils';
import { FiPlus, FiDownload, FiTrash2, FiBox } from 'react-icons/fi';
import { createProject, deleteProject, getAllProjects } from '../utils/firebase';

function ProjectDecks({ data, setData, selectProject, user }) {
  const userId = user?.uid || null;
  const [showModal, setShowModal] = useState(null);
  const [projectToRemove, setProjectToRemove] = useState(null);
  const [isCreating, setIsCreating] = useState(false);


  // Carregar projetos do Firestore ao iniciar
  useEffect(() => {
    async function fetchProjects() {
      const projects = await getAllProjects();
      // Only keep projects that belong to the current user
      const userProjects = (projects || []).filter(p => p.userId === userId);
      setData(prev => ({ ...prev, projects: userProjects }));
    }
    fetchProjects();
    // eslint-disable-next-line
  }, []);

  function addProject() {
    setShowModal('promptName');
  }

  async function handleProjectNameConfirm(nome) {
    if (nome && nome.trim()) {
      setIsCreating(true);
      try {
        // Vincula o projeto ao usuário logado
        const newProject = { nome: nome.trim(), userId };
        const id = await createProject(newProject);
        // Recarrega projetos do Firestore (apenas do usuário atual)
        const projects = await getAllProjects();
        const userProjects = (projects || []).filter(p => p.userId === userId).map(p => {
          const { decks, ...rest } = p;
          return rest;
        });
        setData(prev => {
          // Seleciona o novo projeto automaticamente within the filtered list
          const idx = userProjects.findIndex(p => p.id === id);
          return { ...prev, projects: userProjects, selectedProject: idx };
        });
        setShowModal(null);
      } finally {
        setIsCreating(false);
      }
    } else {
      setShowModal(null);
    }
  }

  function removeProject(idx, e) {
    e.stopPropagation();
    setProjectToRemove(idx);
    setShowModal('confirmRemove');
  }

  async function handleRemoveConfirm() {
    const project = data.projects[projectToRemove];
    if (project && project.id) {
      await deleteProject(project.id);
      // Recarrega projetos do Firestore (apenas do usuário atual)
      const projects = await getAllProjects();
      const userProjects = (projects || []).filter(p => p.userId === userId).map(p => {
        const { decks, ...rest } = p;
        return rest;
      });
      setData(prev => ({ ...prev, projects: userProjects, selectedProject: null }));
    }
    setShowModal(null);
    setProjectToRemove(null);
  }

  function handleExportProject(idx, e) {
    e.stopPropagation();
    const project = data.projects[idx];
    exportProject(project, project.nome);
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={addProject}><FiPlus /> Novo Projeto</button>
      </div>
      <div className="project-grid">
        {data.projects.map((proj, idx) => (
          <div key={proj.id || idx} className="project-card" onClick={() => {
            // Garante que o id do projeto é único e seleciona pelo id
            const selectedIdx = data.projects.findIndex(p => p.id === proj.id);
            if (selectProject) selectProject(selectedIdx);
          }}>
            <h3>{proj.nome}</h3>
            <p style={{fontSize: '0.85em', color: '#888'}}>ID: {proj.id}</p>
            <p>
              <FiBox /> Decks: (subcoleção)
            </p>
            <div className="actions">
              <button 
                onClick={(e) => handleExportProject(idx, e)} 
                className="secondary"
                title="Exportar este projeto"
              >
                <FiDownload /> Exportar
              </button>
              <button 
                className="danger" 
                onClick={(e) => removeProject(idx, e)}
              >
                <FiTrash2 /> Remover
              </button>
            </div>
          </div>
        ))}
      </div>
      {data.projects.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '3rem', padding: '2rem', backgroundColor: 'var(--card-background)', borderRadius: 'var(--border-radius)' }}>
          <p style={{margin: 0}}>Nenhum projeto criado ainda.</p>
          <p style={{margin: '0.5rem 0 0 0'}}>Clique em "Novo Projeto" para começar a criar suas cartas.</p>
        </div>
      )}
      
      {showModal === 'promptName' && (
        <PromptModal
          message="Digite o nome do novo projeto:"
          placeholder="Ex: Jogo de Fantasia Medieval"
          onConfirm={handleProjectNameConfirm}
          onCancel={() => setShowModal(null)}
          isLoading={isCreating}
        />
      )}
      
      {showModal === 'confirmRemove' && (
        <ConfirmModal
          message={`Deseja realmente remover o projeto "${data.projects[projectToRemove]?.nome}"?`}
          onConfirm={handleRemoveConfirm}
          onCancel={() => { setShowModal(null); setProjectToRemove(null); }}
        />
      )}
    </div>
  );
}

export default ProjectDecks;
