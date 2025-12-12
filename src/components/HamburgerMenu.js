import React, { useState, useRef, useEffect } from 'react';
import { FiMenu, FiLogOut, FiDownload, FiUpload } from 'react-icons/fi';

const HamburgerMenu = ({ onLogout, onImport, onExport }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const toggleMenu = () => setIsOpen(!isOpen);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="menu-container" ref={menuRef}>
      <button onClick={toggleMenu} className="menu-trigger">
        <FiMenu size={24} />
      </button>
      {isOpen && (
        <div className="dropdown-menu">
          <button onClick={onImport} className="menu-item">
            <FiUpload /> Importar
          </button>
          <button onClick={onExport} className="menu-item">
            <FiDownload /> Exportar
          </button>
          <button onClick={onLogout} className="menu-item danger">
            <FiLogOut /> Sair
          </button>
        </div>
      )}
    </div>
  );
};

export default HamburgerMenu;
