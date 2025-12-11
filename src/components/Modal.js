import React, { useState } from 'react';
import { FiAlertTriangle, FiCheck, FiX, FiHelpCircle } from 'react-icons/fi';

export function AlertModal({ message, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FiAlertTriangle color="var(--warning-color)" /> Aviso
        </h3>
        <p>{message}</p>
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
}

export function PromptModal({ message, onConfirm, onCancel, placeholder = '', isLoading = false }) {
  const [value, setValue] = useState('');

  const handleConfirm = () => {
    onConfirm(value);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Entrada de Dados</h3>
        <p>{message}</p>
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
          style={{ marginTop: '1rem' }}
          autoFocus
          onKeyPress={e => e.key === 'Enter' && handleConfirm()}
        />
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="secondary" onClick={onCancel} disabled={isLoading}><FiX /> Cancelar</button>
          <button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Criando...' : <><FiCheck /> Confirmar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SelectModal({ message, options, onConfirm, onCancel }) {
  const [selected, setSelected] = useState(0);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Selecione uma Opção</h3>
        <p>{message}</p>
        <div style={{ marginTop: '1rem' }}>
          {options.map((opt, idx) => (
            <div
              key={idx}
              onClick={() => setSelected(idx)}
              className="tab"
              style={{
                background: selected === idx ? 'var(--primary-color)' : 'var(--background-color)',
                color: selected === idx ? 'white' : 'var(--text-primary)',
                marginBottom: '0.5rem',
              }}
            >
              {opt}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="secondary" onClick={onCancel}><FiX /> Cancelar</button>
          <button onClick={() => onConfirm(selected)}><FiCheck /> Confirmar</button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FiHelpCircle color="var(--primary-color)" /> Confirmação
        </h3>
        <p>{message}</p>
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="secondary" onClick={onCancel}><FiX /> Não</button>
          <button className="danger" onClick={onConfirm}><FiCheck /> Sim</button>
        </div>
      </div>
    </div>
  );
}
