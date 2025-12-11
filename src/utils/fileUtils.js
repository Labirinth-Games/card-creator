// Utilitário para salvar e carregar dados em arquivo JSON local

export const saveToFile = (data, filename = 'card-creator-backup.json') => {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const loadFromFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

export const autoSaveToFile = (data) => {
  // Salvar automaticamente com timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `card-creator-autosave-${timestamp}.json`;
  saveToFile(data, filename);
};

export const exportProject = (project, projectName) => {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${projectName}-${timestamp}.json`;
  saveToFile(project, filename);
};
