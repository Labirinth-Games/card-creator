import React, { useState, useEffect, useRef } from 'react';
import './Skeleton.css';
import './Designer.css'; // Importar o CSS do Designer
import { updateDeckDesigner, getAllDecks } from '../utils/firebase';
import { AlertModal, PromptModal, SelectModal } from './Modal';
import ImageDropZone from './ImageDropZone';
import FontSelector from './FontSelector';
import { 
  FiType, FiImage, FiPlus, FiTrash2, FiCopy, FiLayers, FiArrowUp, FiArrowDown, 
  FiAlignCenter, FiAlignLeft, FiAlignRight, FiAlignJustify, FiBold, FiItalic, FiUnderline, FiSquare, FiSave, FiAlertCircle, FiMoreVertical, FiDownload, FiUpload, FiRotateCw
} from 'react-icons/fi';

const CARD_TYPES = [
  { nome: 'Poker (63x88mm)', width: 252, height: 352 },
  { nome: 'Tarot (70x120mm)', width: 280, height: 480 },
  { nome: 'Mini Europeu (44x68mm)', width: 176, height: 272 },
  { nome: 'TCG Padrão (63x88mm)', width: 252, height: 352 },
  { nome: 'Quadrado (70x70mm)', width: 280, height: 280 },
];

const SNAP_THRESHOLD = 5;

function Designer({ data, setData }) {
  // Estado para detectar alterações não salvas
  const [isDirty, setIsDirty] = useState(false);
  const [loadingDesigner, setLoadingDesigner] = useState(false);
  const [elements, setElements] = useState([]);
  const [versoElements, setVersoElements] = useState([]);
  const [currentDesign, setCurrentDesign] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [tempDesignerName, setTempDesignerName] = useState('');
  const [editingElement, setEditingElement] = useState(null);
  const [editingTextElement, setEditingTextElement] = useState(null);
  const [editingVersoElement, setEditingVersoElement] = useState(null);
  const [editingVersoTextElement, setEditingVersoTextElement] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Quando salvar, resetar dirty (já feito no saveDesigner)
  const [cardConfig, setCardConfig] = useState({ borderRadius: 8, borderWidth: 2, borderColor: '#333', backgroundColor: '#fff' });
  // Detecta alterações profundas em elementos, versoElements ou cardConfig
  useEffect(() => {
    // Serializa para comparar mudanças profundas
    const serialized = JSON.stringify({ elements, versoElements, cardConfig });
    if (currentDesign) {
      // Só marca dirty se já existe um designer carregado
      setIsDirty(prev => {
        // Só marca dirty se não está salvando
        if (!isSaving) return true;
        return prev;
      });
    }
    // eslint-disable-next-line
  }, [elements, versoElements, cardConfig]);
  const [draggingElement, setDraggingElement] = useState(null);
  const [draggingVersoElement, setDraggingVersoElement] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [versoDragOffset, setVersoDragOffset] = useState({ x: 0, y: 0 });
  const [snapLines, setSnapLines] = useState([]);
  const [versoSnapLines, setVersoSnapLines] = useState([]);
  const [currentSide, setCurrentSide] = useState('frente');
  const [customFonts, setCustomFonts] = useState([]);
  const [resizingElement, setResizingElement] = useState(null);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [elementCursors, setElementCursors] = useState({});
  const [zoom, setZoom] = useState(1);
  const [draggingLayerIndex, setDraggingLayerIndex] = useState(null);
  const canvasRef = useRef(null);
  const versoCanvasRef = useRef(null);
  const inputRef = useRef(null);
  const versoInputRef = useRef(null);

  const handleCanvasMouseDown = (e) => {
    // Clicked on the canvas background, so deselect everything
    if (e.target === e.currentTarget) {
      setEditingElement(null);
      setEditingVersoElement(null);
      setEditingTextElement(null);
      setEditingVersoTextElement(null);
    }
  };

  const handleMouseMove = (e) => {
    // This will be handled by the window event listeners for dragging/resizing
  };

  const handleMouseUp = (e) => {
    // This will be handled by the window event listeners for dragging/resizing
  };

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) { // Use Ctrl or Cmd for zooming
      e.preventDefault();
      const delta = e.deltaY * -0.001;
      setZoom(prevZoom => Math.min(Math.max(prevZoom + delta, 0.1), 5));
    }
  };

  // Hotkeys popup
  const [showHotkeys, setShowHotkeys] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '?' && e.shiftKey) {
        setShowHotkeys(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    async function fetchDeckDesigner() {
      if (data.selectedProject !== null && data.selectedDeck !== null) {
        setLoadingDesigner(true);
        try {
          const project = data.projects[data.selectedProject];
          if (project && project.id) {
            const decks = await getAllDecks(project.id);
            const deck = decks[data.selectedDeck];
            if (deck && deck.designer) {
              setCurrentDesign(deck.designer);
              setElements(deck.designer.elements || []);
              setVersoElements(deck.designer.versoElements || []);
              
              // Carregar fontes customizadas salvas no designer E fontes globais
              const { getGlobalFonts } = await import('../utils/firebase');
              const globalFonts = await getGlobalFonts();
              const designerFonts = deck.designer.customFonts || [];
              
              // Mesclar fontes globais com fontes do designer (sem duplicatas)
              const mergedFonts = [...globalFonts];
              designerFonts.forEach(df => {
                if (!mergedFonts.some(gf => gf.name === df.name)) {
                  mergedFonts.push(df);
                }
              });
              
              setCustomFonts(mergedFonts);
              
              if (deck.designer.cardConfig) {
                setCardConfig({ 
                  borderRadius: 8, 
                  borderWidth: 2, 
                  borderColor: '#333', 
                  backgroundColor: '#fff',
                  ...deck.designer.cardConfig 
                });
              }
              setIsDirty(false); // Ao carregar do banco, não está sujo
            } else {
              // Se não houver designer, reseta o estado mas carrega fontes globais
              const { getGlobalFonts } = await import('../utils/firebase');
              const globalFonts = await getGlobalFonts();
              setCustomFonts(globalFonts);
              
              setCurrentDesign(null);
              setElements([]);
              setVersoElements([]);
              setIsDirty(false);
            }
          }
        } finally {
          setLoadingDesigner(false);
        }
      }
    }
    fetchDeckDesigner();
    // eslint-disable-next-line
  }, [data.selectedProject, data.selectedDeck]);

  function createDesigner() { setShowModal('selectType'); }

  function handleDesignerNameConfirm(nome) {
    setTempDesignerName(nome && nome.trim() ? nome.trim() : 'Designer');
    setShowModal('selectType');
  }

  async function handleTypeSelect(idx) {
    const tipo = CARD_TYPES[idx];
    const newDesign = { 
      nome: tempDesignerName || 'Designer', 
      tipo, 
      elements: [],
      versoElements: [],
      cardConfig: { borderRadius: 8, borderWidth: 2, borderColor: '#333', backgroundColor: '#fff' },
      customFonts: []
    };
    setCurrentDesign(newDesign);
    setElements([]);
    setVersoElements([]);

    setShowModal(null);
    setTempDesignerName('');
    
    // Salva o designer inicial no Firebase
    if (data.selectedProject !== null && data.selectedDeck !== null) {
      const project = data.projects[data.selectedProject];
      if (project && project.id) {
        const decks = await getAllDecks(project.id);
        const deck = decks[data.selectedDeck];
        if (deck && deck.id) {
          await updateDeckDesigner(project.id, deck.id, newDesign);
        }
      }
    }
  }

  async function saveDesigner() {
    if (!currentDesign || data.selectedProject === null || data.selectedDeck === null) {
      return;
    }
    
    const project = data.projects[data.selectedProject];
    if (!project || !project.id) return;
    
    const decks = await getAllDecks(project.id);
    const deck = decks[data.selectedDeck];
    if (!deck || !deck.id) return;
    
    setIsSaving(true);
    try {
      const designerData = {
        ...currentDesign,
        elements,
        versoElements,
        cardConfig,
        customFonts
      };
      await updateDeckDesigner(project.id, deck.id, designerData);
      setIsDirty(false); // Após salvar, não está mais sujo
    } finally {
      setIsSaving(false);
    }
  }

  function addText() {
    if (!currentDesign) {
      // Não mostra mais alerta repetitivo
      return;
    }
    setShowModal('promptTextName');
    setIsDirty(true);
  }

  function handleTextNameConfirm(fieldName) {
    if (fieldName && fieldName.trim()) {
      setIsDirty(true);
      const newElement = { 
        id: Date.now() + Math.random(),
        type: 'text', 
        fieldName: fieldName.trim(),
        value: fieldName.trim(), 
        x: 50, 
        y: 50 + ((currentSide === 'frente' ? elements : versoElements).length * 30), 
        color: '#000', 
        fontSize: 18,
        width: 150,
        height: 30,
        textAlign: 'left',
        verticalAlign: 'center',
        dataType: 'string',
        fontFamily: 'Arial',
        rotation: 0, // Add rotation property
        zIndex: (currentSide === 'frente' ? elements : versoElements).length
      };
      
      if (currentSide === 'frente') {
        const newElements = [...elements, newElement];
        setElements(newElements);
        setEditingElement(newElements.length - 1);
      } else {
        const newVersoElements = [...versoElements, newElement];
        setVersoElements(newVersoElements);
        setEditingVersoElement(newVersoElements.length - 1);
      }
    }
    setShowModal(null);
  }

  function addImage() {
    if (!currentDesign) {
      // Não mostra mais alerta repetitivo
      return;
    }
    setShowModal('promptImageName');
    setIsDirty(true);
  }

  function handleImageNameConfirm(fieldName) {
    if (fieldName && fieldName.trim()) {
      setIsDirty(true);
      const newElement = { 
        id: Date.now() + Math.random(),
        type: 'image', 
        fieldName: fieldName.trim(),
        src: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="#cccccc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M12 11v6"></path><path d="M9 14h6"></path><path d="M17.5 7a2.5 2.5 0 0 0-5 0"></path></svg>')}`, 
        x: 100, 
        y: 100 + ((currentSide === 'frente' ? elements : versoElements).length * 30), 
        width: 80, 
        height: 80,
        fullScreen: false,
        isDefault: false,
        zIndex: (currentSide === 'frente' ? elements : versoElements).length
      };
      
      if (currentSide === 'frente') {
        const newElements = [...elements, newElement];
        setElements(newElements);
        setEditingElement(newElements.length - 1);
      } else {
        const newVersoElements = [...versoElements, newElement];
        setVersoElements(newVersoElements);
        setEditingVersoElement(newVersoElements.length - 1);
      }
    }
    setShowModal(null);
  }


  function addShape() {
    if (!currentDesign) {
      return;
    }
    setIsDirty(true);
      setIsDirty(true);
      setIsDirty(true);
      setIsDirty(true);
    const currentElements = currentSide === 'frente' ? elements : versoElements;
    const shapeCount = currentElements.filter(el => el.type === 'shape').length + 1;
    const newElement = { 
      id: Date.now() + Math.random(),
      type: 'shape',
      fieldName: `Forma ${shapeCount}`,
      shapeType: 'rectangle',
      x: 80, 
      y: 80 + ((currentSide === 'frente' ? elements : versoElements).length * 30), 
      width: 100, 
      height: 100,
      fillColor: '#3b82f6',
      hasBorder: false,
      borderColor: '#1e40af',
      borderWidth: 2,
      borderRadius: 0,
      zIndex: (currentSide === 'frente' ? elements : versoElements).length
    };
    
    if (currentSide === 'frente') {
      const newElements = [...elements, newElement];
      setElements(newElements);
      setEditingElement(newElements.length - 1);
    } else {
      const newVersoElements = [...versoElements, newElement];
      setVersoElements(newVersoElements);
      setEditingVersoElement(newVersoElements.length - 1);
    }
  }

  function getResizeHandle(e, el, canvasRect) {
    // Ajusta para zoom
    const mouseX = (e.clientX - canvasRect.left) / zoom;
    const mouseY = (e.clientY - canvasRect.top) / zoom;
    
    // Calcula o centro do elemento
    const centerX = el.x + el.width / 2;
    const centerY = el.y + el.height / 2;
    
    // Se o elemento está rotacionado, precisamos "desrotacionar" a posição do mouse
    const rotation = (el.rotation || 0) * (Math.PI / 180);
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    
    // Aplica rotação inversa
    const unrotatedX = dx * Math.cos(-rotation) - dy * Math.sin(-rotation);
    const unrotatedY = dx * Math.sin(-rotation) + dy * Math.cos(-rotation);
    
    // Agora calcula a posição relativa ao elemento não-rotacionado
    const relX = unrotatedX + el.width / 2;
    const relY = unrotatedY + el.height / 2;
    
    const edgeThreshold = 8;
    
    const nearLeft = relX < edgeThreshold;
    const nearRight = relX > (el.width || 50) - edgeThreshold;
    const nearTop = relY < edgeThreshold;
    const nearBottom = relY > (el.height || 20) - edgeThreshold;
    
    if (nearLeft && nearTop) return 'nw';
    if (nearRight && nearTop) return 'ne';
    if (nearLeft && nearBottom) return 'sw';
    if (nearRight && nearBottom) return 'se';
    if (nearLeft) return 'w';
    if (nearRight) return 'e';
    if (nearTop) return 'n';
    if (nearBottom) return 's';
    return null;
  }

  function getCursorForHandle(handle) {
    if (!handle) return 'grab';
    const cursors = {
      'n': 'ns-resize',
      's': 'ns-resize',
      'e': 'ew-resize',
      'w': 'ew-resize',
      'ne': 'nesw-resize',
      'sw': 'nesw-resize',
      'nw': 'nwse-resize',
      'se': 'nwse-resize'
    };
    return cursors[handle] || 'grab';
  }

  function handleMouseDown(e, idx, isResizeHandle = false) {
    e.stopPropagation();
    e.preventDefault();
    const currentElements = currentSide === 'frente' ? elements : versoElements;
    const el = currentElements[idx];
    const canvasRect = (currentSide === 'frente' ? canvasRef.current : versoCanvasRef.current).getBoundingClientRect();
    
    // Only check for resize handle if this is a resize handle click
    if (isResizeHandle) {
      const handle = getResizeHandle(e, el, canvasRect);
      if (handle) {
        setResizingElement(idx);
        setResizeHandle(handle);
        setResizeStart({
          x: e.clientX,
          y: e.clientY,
          width: el.width || 50,
          height: el.height || 20,
          elX: el.x,
          elY: el.y
        });
        return;
      }
    }
    
    // If not a resize handle click, handle dragging
    if (!isResizeHandle) {
      const elCenterX = el.x + el.width / 2;
      const elCenterY = el.y + el.height / 2;
      const mouseX = (e.clientX - canvasRect.left) / zoom;
      const mouseY = (e.clientY - canvasRect.top) / zoom;

      if (currentSide === 'frente') {
        setDraggingElement(idx);
        setDragOffset({
          x: mouseX - elCenterX,
          y: mouseY - elCenterY
        });
      } else {
        setDraggingVersoElement(idx);
        setVersoDragOffset({
          x: mouseX - elCenterX,
          y: mouseY - elCenterY
        });
      }
    }
    
    if (currentSide === 'frente') {
      setEditingElement(idx);
      setEditingVersoElement(null);
    } else {
      setEditingVersoElement(idx);
      setEditingElement(null);
    }
    setEditingTextElement(null);
    setEditingVersoTextElement(null);
  }

  function handleDoubleClick(e, idx) {
    e.stopPropagation();
    e.preventDefault();
    const currentElements = currentSide === 'frente' ? elements : versoElements;
    const el = currentElements[idx];
    if (el.type === 'text') {
      if (currentSide === 'frente') {
        setEditingTextElement(idx);
        setEditingElement(idx);
      } else {
        setEditingVersoTextElement(idx);
        setEditingVersoElement(idx);
      }
      setTimeout(() => inputRef.current?.focus() || versoInputRef.current?.focus(), 0);
    }
  }

  function handleTextChange(idx, newValue) {
    if (currentSide === 'frente') {
      updateElement(idx, 'value', newValue);
    } else {
      updateVersoElement(idx, 'value', newValue);
    }
  }

  function finishEditingText() {
    setEditingTextElement(null);
    setEditingVersoTextElement(null);
  }

  useEffect(() => {
    if (resizingElement !== null) {
      const moveHandler = (e) => {
        const isFrente = currentSide === 'frente';
        const currentElements = isFrente ? elements : versoElements;
        const setCurrentElements = isFrente ? setElements : setVersoElements;
        
        const deltaX = (e.clientX - resizeStart.x) / zoom;
        const deltaY = (e.clientY - resizeStart.y) / zoom;
        
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newX = resizeStart.elX;
        let newY = resizeStart.elY;
        
        if (resizeHandle.includes('e')) newWidth = Math.max(20, resizeStart.width + deltaX);
        if (resizeHandle.includes('w')) {
          newWidth = Math.max(20, resizeStart.width - deltaX);
          newX = resizeStart.elX + (resizeStart.width - newWidth);
        }
        if (resizeHandle.includes('s')) newHeight = Math.max(20, resizeStart.height + deltaY);
        if (resizeHandle.includes('n')) {
          newHeight = Math.max(20, resizeStart.height - deltaY);
          newY = resizeStart.elY + (resizeStart.height - newHeight);
        }
        
        setCurrentElements(prev => prev.map((el, i) => 
          i === resizingElement ? { ...el, width: newWidth, height: newHeight, x: newX, y: newY } : el
        ));
      };
      
      const upHandler = () => {
        setResizingElement(null);
        setResizeHandle(null);
      };
      
      window.addEventListener('mousemove', moveHandler);
      window.addEventListener('mouseup', upHandler);
      return () => {
        window.removeEventListener('mousemove', moveHandler);
        window.removeEventListener('mouseup', upHandler);
      };
    }
  }, [resizingElement, resizeHandle, resizeStart, currentSide, elements, versoElements]);

  useEffect(() => {
    if (draggingElement !== null || draggingVersoElement !== null) {
      const moveHandler = (e) => {
        const isFrente = draggingElement !== null;
        const dragIdx = isFrente ? draggingElement : draggingVersoElement;
        const currentElements = isFrente ? elements : versoElements;
        const currentOffset = isFrente ? dragOffset : versoDragOffset;
        const el = currentElements[dragIdx];
        
        const canvasRect = (isFrente ? canvasRef.current : versoCanvasRef.current).getBoundingClientRect();
        const mouseX = (e.clientX - canvasRect.left) / zoom;
        const mouseY = (e.clientY - canvasRect.top) / zoom;

        // 1. Calculate the new center based on mouse position and initial offset
        let newCenterX = mouseX - currentOffset.x;
        let newCenterY = mouseY - currentOffset.y;

        // 2. Calculate the dimensions of the rotated bounding box
        const rotationRad = (el.rotation || 0) * (Math.PI / 180);
        const absCos = Math.abs(Math.cos(rotationRad));
        const absSin = Math.abs(Math.sin(rotationRad));
        const rotatedWidth = el.width * absCos + el.height * absSin;
        const rotatedHeight = el.width * absSin + el.height * absCos;

        // 3. Clamp the center position to keep the rotated box inside the canvas
        const cardWidth = currentDesign.tipo.width;
        const cardHeight = currentDesign.tipo.height;
        newCenterX = Math.max(rotatedWidth / 2, Math.min(newCenterX, cardWidth - rotatedWidth / 2));
        newCenterY = Math.max(rotatedHeight / 2, Math.min(newCenterY, cardHeight - rotatedHeight / 2));
        
        // 4. Calculate the final top-left (x, y) from the clamped center
        let newX = newCenterX - el.width / 2;
        let newY = newCenterY - el.height / 2;

        // Snap logic (optional, can be refined)
        const lines = [];
        if (Math.abs(newCenterX - cardWidth / 2) < SNAP_THRESHOLD) {
          newX = (cardWidth / 2) - (el.width / 2);
          lines.push({ type: 'vertical', pos: cardWidth / 2 });
        }
        if (Math.abs(newCenterY - cardHeight / 2) < SNAP_THRESHOLD) {
          newY = (cardHeight / 2) - (el.height / 2);
          lines.push({ type: 'horizontal', pos: cardHeight / 2 });
        }

        if (isFrente) {
          setSnapLines(lines);
          setElements(prev => prev.map((element, i) => i === dragIdx ? { ...element, x: newX, y: newY } : element));
        } else {
          setVersoSnapLines(lines);
          setVersoElements(prev => prev.map((element, i) => i === dragIdx ? { ...element, x: newX, y: newY } : element));
        }
      };

      const upHandler = () => {
        setDraggingElement(null);
        setDraggingVersoElement(null);
        setSnapLines([]);
      };

      window.addEventListener('mousemove', moveHandler);
      window.addEventListener('mouseup', upHandler);
      return () => {
        window.removeEventListener('mousemove', moveHandler);
        window.removeEventListener('mouseup', upHandler);
      };
    }
  }, [draggingElement, draggingVersoElement, dragOffset, versoDragOffset, elements, versoElements, currentDesign]);

  function moveLayer(idx, direction) {
    const isFrente = currentSide === 'frente';
    const currentElements = isFrente ? elements : versoElements;
    const newElements = [...currentElements];
    const currentZIndex = newElements[idx].zIndex || 0;
    
    if (direction === 'up') {
      // Mover para frente (aumentar zIndex)
      const higherElements = newElements.filter(el => (el.zIndex || 0) > currentZIndex);
      if (higherElements.length > 0) {
        // Encontra o próximo zIndex mais alto
        const sortedHigher = higherElements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        const nextHigherElement = sortedHigher[0];
        const nextZIndex = nextHigherElement.zIndex;
        
        // Troca os zIndex
        newElements[idx] = { ...newElements[idx], zIndex: nextZIndex };
        const nextIdx = newElements.findIndex(el => el === nextHigherElement);
        newElements[nextIdx] = { ...newElements[nextIdx], zIndex: currentZIndex };
      }
    } else {
      // Mover para trás (diminuir zIndex)
      const lowerElements = newElements.filter(el => (el.zIndex || 0) < currentZIndex);
      if (lowerElements.length > 0) {
        // Encontra o próximo zIndex mais baixo
        const sortedLower = lowerElements.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
        const nextLowerElement = sortedLower[0];
        const nextZIndex = nextLowerElement.zIndex;
        
        // Troca os zIndex
        newElements[idx] = { ...newElements[idx], zIndex: nextZIndex };
        const nextIdx = newElements.findIndex(el => el === nextLowerElement);
        newElements[nextIdx] = { ...newElements[nextIdx], zIndex: currentZIndex };
      }
    }
    
    if (isFrente) {
      setElements(newElements);
    } else {
      setVersoElements(newElements);
    }
  }

  function updateElement(idx, field, value) {
    // Accept either an index or an id for idx
    let resolvedIdx = idx;
    if (typeof idx === 'string' || (typeof idx === 'number' && !Number.isInteger(idx))) {
      resolvedIdx = elements.findIndex(el => el.id === idx);
    }
    const newElements = elements.map((el, i) => i === resolvedIdx ? { ...el, [field]: value } : el);
    setElements(newElements);
    setIsDirty(true);
  }

  function updateVersoElement(idx, field, value) {
    let resolvedIdx = idx;
    if (typeof idx === 'string' || (typeof idx === 'number' && !Number.isInteger(idx))) {
      resolvedIdx = versoElements.findIndex(el => el.id === idx);
    }
    const newVersoElements = versoElements.map((el, i) => i === resolvedIdx ? { ...el, [field]: value } : el);
    setVersoElements(newVersoElements);
    setIsDirty(true);
  }

  function duplicateElement(idx) {
    const isFrente = currentSide === 'frente';
    const currentElements = isFrente ? elements : versoElements;
    const elementToDuplicate = currentElements[idx];
    
    const duplicated = {
      ...elementToDuplicate,
      x: elementToDuplicate.x + 20,
      y: elementToDuplicate.y + 20,
      zIndex: currentElements.length
    };
    
    if (isFrente) {
      setElements([...currentElements, duplicated]);
      setEditingElement(currentElements.length);
    } else {
      setVersoElements([...currentElements, duplicated]);
      setEditingVersoElement(currentElements.length);
    }
  }

  function removeElement(idx) {
    setElements(elements.filter((_, i) => i !== idx));
    setEditingElement(null);
  }

  function removeVersoElement(idx) {
    setVersoElements(versoElements.filter((_, i) => i !== idx));
    setEditingVersoElement(null);
  }

  function alignElementToCanvas(id, position) {
    if (!currentDesign) return;
    const cardWidth = currentDesign.tipo.width;
    const cardHeight = currentDesign.tipo.height;

    let found = elements.find(el => el.id === id);
    let isFrente = true;
    if (!found) {
      found = versoElements.find(el => el.id === id);
      isFrente = false;
    }
    if (!found) return;

    let newX = found.x;
    let newY = found.y;
    if (position === 'left') newX = 0;
    else if (position === 'center') newX = (cardWidth - found.width) / 2;
    else if (position === 'right') newX = Math.max(0, cardWidth - found.width);
    else if (position === 'top') newY = 0;
    else if (position === 'middle') newY = (cardHeight - found.height) / 2;
    else if (position === 'bottom') newY = Math.max(0, cardHeight - found.height);

    if (isFrente) {
      setElements(prev => prev.map(el => el.id === id ? { ...el, x: newX, y: newY } : el));
    } else {
      setVersoElements(prev => prev.map(el => el.id === id ? { ...el, x: newX, y: newY } : el));
    }
    setIsDirty(true);
  }

  // Funções para drag and drop de camadas
  function handleLayerDragStart(e, originalIndex) {
    setDraggingLayerIndex(originalIndex);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleLayerDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleLayerDrop(e, targetOriginalIndex) {
    e.preventDefault();
    if (draggingLayerIndex === null || draggingLayerIndex === targetOriginalIndex) {
      setDraggingLayerIndex(null);
      return;
    }

    const isFrente = currentSide === 'frente';
    const currentElements = isFrente ? elements : versoElements;
    const setCurrentElements = isFrente ? setElements : setVersoElements;

    const newElements = [...currentElements];
    const draggedElement = newElements[draggingLayerIndex];
    const targetElement = newElements[targetOriginalIndex];

    // Troca os zIndex dos elementos
    const tempZIndex = draggedElement.zIndex;
    newElements[draggingLayerIndex] = { ...draggedElement, zIndex: targetElement.zIndex };
    newElements[targetOriginalIndex] = { ...targetElement, zIndex: tempZIndex };

    setCurrentElements(newElements);
    setDraggingLayerIndex(null);
  }

  function handleLayerDragEnd() {
    setDraggingLayerIndex(null);
  }

  // Detectar Ctrl+D para duplicar e Ctrl+S para salvar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        const isFrente = currentSide === 'frente';
        const editingIdx = isFrente ? editingElement : editingVersoElement;
        if (editingIdx !== null) {
          duplicateElement(editingIdx);
        }
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (isDirty && currentDesign) {
          saveDesigner();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSide, editingElement, editingVersoElement, elements, versoElements, isDirty, currentDesign]);

  const renderPropertyEditor = () => {
    const isFrente = currentSide === 'frente';
    const editingIdx = isFrente ? editingElement : editingVersoElement;
    const currentElements = isFrente ? elements : versoElements;
    const updateFn = isFrente ? updateElement : updateVersoElement;
    const removeFn = isFrente ? removeElement : removeVersoElement;
    
    if (editingIdx === null || !currentElements[editingIdx]) return (
      <div className="property-editor-placeholder">
        <p>Selecione um elemento na carta para editar suas propriedades.</p>
      </div>
    );

    const el = currentElements[editingIdx];

    return (
      <div className="property-editor">
        <div className="prop-header">
          <h4>Editando: {el.fieldName}</h4>
          <div className="prop-actions">
            <button className="icon-btn" onClick={() => moveLayer(editingIdx, 'up')} title="Mover para frente"><FiArrowUp /></button>
            <button className="icon-btn" onClick={() => moveLayer(editingIdx, 'down')} title="Mover para trás"><FiArrowDown /></button>
            <button className="icon-btn" onClick={() => duplicateElement(editingIdx)} title="Duplicar (Ctrl+D)"><FiCopy /></button>
            <button className="icon-btn danger" onClick={() => removeFn(editingIdx)} title="Remover"><FiTrash2 /></button>
          </div>
        </div>

        <div className="property-group">
          <label>Nome do Campo</label>
          <input type="text" value={el.fieldName} onChange={e => updateFn(editingIdx, 'fieldName', e.target.value)} />
        </div>

        <div className="property-group">
          <h5>Posição e Tamanho</h5>
          <div className="property-grid">
            <div className="property-item">
              <label>X</label>
              <input type="number" value={Math.round(el.x)} onChange={e => updateFn(editingIdx, 'x', Number(e.target.value))} />
            </div>
            <div className="property-item">
              <label>Y</label>
              <input type="number" value={Math.round(el.y)} onChange={e => updateFn(editingIdx, 'y', Number(e.target.value))} />
            </div>
            <div className="property-item">
              <label>Largura</label>
              <input type="number" value={Math.round(el.width)} onChange={e => updateFn(editingIdx, 'width', Number(e.target.value))} />
            </div>
            <div className="property-item">
              <label>Altura</label>
              <input type="number" value={Math.round(el.height)} onChange={e => updateFn(editingIdx, 'height', Number(e.target.value))} />
            </div>
          </div>
        </div>

        {el.type === 'text' && (
          <>
            <div className="property-group">
              <h5>Texto</h5>
              <div className="property-item full-width">
                <label>Fonte</label>
                <FontSelector
                  selectedFont={el.fontFamily}
                  onSelectFont={font => updateFn(editingIdx, 'fontFamily', font)}
                  customFonts={customFonts}
                  onCustomFontsChange={setCustomFonts}
                />
              </div>
              <div className="property-grid">
                <div className="property-item">
                  <label>Tamanho</label>
                  <input type="number" value={el.fontSize} onChange={e => updateFn(editingIdx, 'fontSize', Number(e.target.value))} />
                </div>
                <div className="property-item">
                  <label>Cor</label>
                  <div className="color-input-wrapper">
                    <input type="color" value={el.color} onChange={e => updateFn(editingIdx, 'color', e.target.value)} />
                    <input type="text" value={el.color} onChange={e => updateFn(editingIdx, 'color', e.target.value)} />
                  </div>
                </div>
              <div className="property-item full-width">
                <label>Alinhamento</label>
                <div className="font-style-buttons">
                  <button 
                    type="button" 
                    className={`icon-btn ${el.textAlign === 'left' ? 'active' : ''}`} 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      updateFn(editingIdx, 'textAlign', 'left'); 
                    }}
                  >
                    <FiAlignLeft />
                  </button>
                  <button 
                    type="button" 
                    className={`icon-btn ${el.textAlign === 'center' ? 'active' : ''}`} 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      updateFn(editingIdx, 'textAlign', 'center'); 
                    }}
                  >
                    <FiAlignCenter />
                  </button>
                  <button 
                    type="button" 
                    className={`icon-btn ${el.textAlign === 'right' ? 'active' : ''}`} 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      updateFn(editingIdx, 'textAlign', 'right'); 
                    }}
                  >
                    <FiAlignRight />
                  </button>
                  <button
                    type="button"
                    className={`icon-btn ${el.textAlign === 'justify' ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      updateFn(editingIdx, 'textAlign', 'justify');
                    }}
                  >
                    <FiAlignJustify />
                  </button>
                </div>
              </div>
              <div className="property-item full-width">
                <label>Alinhamento Vertical</label>
                <div className="font-style-buttons">
                  <button type="button" title="Alinhar ao topo" className={`icon-btn ${el.verticalAlign === 'top' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateFn(editingIdx, 'verticalAlign', 'top'); }}>
                    <FiArrowUp />
                  </button>
                  <button type="button" title="Alinhar ao meio" className={`icon-btn ${el.verticalAlign === 'center' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateFn(editingIdx, 'verticalAlign', 'center'); }}>
                    <FiAlignCenter />
                  </button>
                  <button type="button" title="Alinhar à base" className={`icon-btn ${el.verticalAlign === 'bottom' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateFn(editingIdx, 'verticalAlign', 'bottom'); }}>
                    <FiArrowDown />
                  </button>
                </div>
              </div>
              <div className="property-item full-width">
                <label>Alinhar Elemento</label>
                <div style={{display: 'flex', gap: 8}}>
                  <div style={{display: 'flex', gap: 4}}>
                    <button className="icon-btn" type="button" title="Alinhar caixa à esquerda" onClick={() => alignElementToCanvas(el.id, 'left')}><FiAlignLeft /></button>
                    <button className="icon-btn" type="button" title="Alinhar caixa ao centro" onClick={() => alignElementToCanvas(el.id, 'center')}><FiAlignCenter /></button>
                    <button className="icon-btn" type="button" title="Alinhar caixa à direita" onClick={() => alignElementToCanvas(el.id, 'right')}><FiAlignRight /></button>
                  </div>
                  <div style={{display: 'flex', gap: 4}}>
                    <button className="icon-btn" type="button" title="Alinhar caixa ao topo" onClick={() => alignElementToCanvas(el.id, 'top')}><FiArrowUp /></button>
                    <button className="icon-btn" type="button" title="Alinhar caixa ao meio" onClick={() => alignElementToCanvas(el.id, 'middle')}><FiAlignCenter /></button>
                    <button className="icon-btn" type="button" title="Alinhar caixa à base" onClick={() => alignElementToCanvas(el.id, 'bottom')}><FiArrowDown /></button>
                  </div>
                </div>
              </div>
              </div>
              <div className="property-item full-width">
                <label>Estilo</label>
                <div className="font-style-buttons">
                  <button 
                    type="button" 
                    className={`icon-btn ${el.fontWeight === 'bold' ? 'active' : ''}`} 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      updateFn(editingIdx, 'fontWeight', el.fontWeight === 'bold' ? 'normal' : 'bold'); 
                    }}
                  >
                    <FiBold />
                  </button>
                  <button 
                    type="button" 
                    className={`icon-btn ${el.fontStyle === 'italic' ? 'active' : ''}`} 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      updateFn(editingIdx, 'fontStyle', el.fontStyle === 'italic' ? 'normal' : 'italic'); 
                    }}
                  >
                    <FiItalic />
                  </button>
                  <button 
                    type="button" 
                    className={`icon-btn ${el.textDecoration === 'underline' ? 'active' : ''}`} 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      updateFn(editingIdx, 'textDecoration', el.textDecoration === 'underline' ? 'none' : 'underline'); 
                    }}
                  >
                    <FiUnderline />
                  </button>
                </div>
              </div>
            </div>
            <div className="property-group">
              <h5>Configurações Avançadas</h5>
              <div className="property-item full-width">
                <label>Tipo de Dado (para tabela)</label>
                <select value={el.dataType} onChange={e => updateFn(editingIdx, 'dataType', e.target.value)}>
                  <option value="string">Texto Curto</option>
                  <option value="text">Texto Longo</option>
                  <option value="number">Número</option>
                </select>
              </div>
              <div className="property-item full-width">
                <label>Rotação (°)</label>
                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                  <input 
                    type="range" 
                    min="-180" 
                    max="180" 
                    value={el.rotation || 0} 
                    onChange={e => updateFn(editingIdx, 'rotation', Number(e.target.value))}
                    style={{flexGrow: 1}}
                  />
                  <input 
                    type="number" 
                    value={el.rotation || 0} 
                    onChange={e => updateFn(editingIdx, 'rotation', Number(e.target.value))}
                    style={{width: 70}}
                  />
                  <button className="icon-btn" onClick={() => updateFn(editingIdx, 'rotation', 0)} title="Resetar Rotação"><FiRotateCw /></button>
                </div>
              </div>
            </div>
          </>
        )}

        {el.type === 'image' && (
          <>
            <div className="property-group">
              <h5>Imagem</h5>
              <div className="property-item full-width">
                <label>Fonte da Imagem</label>
                <ImageDropZone
                  value={el.src}
                  onChange={src => updateFn(editingIdx, 'src', src)}
                  placeholder="Arraste uma imagem ou cole a URL"
                />
              </div>
              <div className="property-item checkbox full-width">
                <input type="checkbox" id="isDefault" checked={el.isDefault} onChange={e => updateFn(editingIdx, 'isDefault', e.target.checked)} />
                <label htmlFor="isDefault">Imagem Padrão (não aparece na tabela)</label>
              </div>
            </div>
          </>
        )}

        {el.type === 'shape' && (
          <>
            <div className="property-group">
              <h5>Forma</h5>
              <div className="property-item full-width">
                <label>Tipo de Forma</label>
                <select value={el.shapeType || 'rectangle'} onChange={e => updateFn(editingIdx, 'shapeType', e.target.value)}>
                  <option value="rectangle">Retângulo</option>
                  <option value="circle">Círculo</option>
                </select>
              </div>
              <div className="property-item full-width">
                <label>Cor de Preenchimento</label>
                <div className="color-input-wrapper">
                  <input type="color" value={el.fillColor || '#3b82f6'} onChange={e => updateFn(editingIdx, 'fillColor', e.target.value)} />
                  <input type="text" value={el.fillColor || '#3b82f6'} onChange={e => updateFn(editingIdx, 'fillColor', e.target.value)} />
                </div>
              </div>
              <div className="property-item checkbox full-width">
                <input 
                  type="checkbox" 
                  id="hasBorder" 
                  checked={el.hasBorder || false} 
                  onChange={e => updateFn(editingIdx, 'hasBorder', e.target.checked)} 
                />
                <label htmlFor="hasBorder">Adicionar Borda</label>
              </div>
              {el.hasBorder && (
                <div className="property-grid">
                  <div className="property-item">
                    <label>Cor da Borda</label>
                    <div className="color-input-wrapper">
                      <input type="color" value={el.borderColor || '#1e40af'} onChange={e => updateFn(editingIdx, 'borderColor', e.target.value)} />
                      <input type="text" value={el.borderColor || '#1e40af'} onChange={e => updateFn(editingIdx, 'borderColor', e.target.value)} />
                    </div>
                  </div>
                  <div className="property-item">
                    <label>Espessura</label>
                    <input type="number" min="0" value={el.borderWidth || 2} onChange={e => updateFn(editingIdx, 'borderWidth', Number(e.target.value))} />
                  </div>
                </div>
              )}
              {el.shapeType !== 'circle' && (
                <div className="property-item full-width">
                  <label>Arredondamento</label>
                  <input type="number" min="0" value={el.borderRadius || 0} onChange={e => updateFn(editingIdx, 'borderRadius', Number(e.target.value))} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderCardConfigEditor = () => {
    return (
      <div className="property-editor">
        <h4>Configurações da Carta</h4>
        <div className="property-group">
          <div className="property-item full-width">
            <label>Cor de Fundo</label>
            <div className="color-input-wrapper">
              <input type="color" value={cardConfig.backgroundColor} onChange={e => setCardConfig({...cardConfig, backgroundColor: e.target.value})} />
              <input type="text" value={cardConfig.backgroundColor} onChange={e => setCardConfig({...cardConfig, backgroundColor: e.target.value})} />
            </div>
          </div>
          <div className="property-item full-width">
            <label>Cor da Borda</label>
            <div className="color-input-wrapper">
              <input type="color" value={cardConfig.borderColor} onChange={e => setCardConfig({...cardConfig, borderColor: e.target.value})} />
              <input type="text" value={cardConfig.borderColor} onChange={e => setCardConfig({...cardConfig, borderColor: e.target.value})} />
            </div>
          </div>
          <div className="property-grid">
            <div className="property-item">
              <label>Largura da Borda</label>
              <input type="number" min="0" value={cardConfig.borderWidth} onChange={e => setCardConfig({...cardConfig, borderWidth: Number(e.target.value)})} />
            </div>
            <div className="property-item">
              <label>Raio da Borda</label>
              <input type="number" min="0" value={cardConfig.borderRadius} onChange={e => setCardConfig({...cardConfig, borderRadius: Number(e.target.value)})} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderElement = (el, idx) => {
    const isFrente = currentSide === 'frente';
    const isEditing = isFrente ? editingElement === idx : editingVersoElement === idx;
    const isTextEditing = isFrente ? editingTextElement === idx : editingVersoTextElement === idx;
    const cursor = elementCursors[el.id] || (isEditing ? 'move' : 'pointer');

    const baseStyle = {
      position: 'absolute',
      left: el.x,
      top: el.y,
      width: el.width,
      height: el.height,
      cursor,
      border: isEditing ? '2px dashed #6366f1' : 'none',
      boxSizing: 'border-box',
      zIndex: el.zIndex || 0,
      transform: `rotate(${el.rotation || 0}deg)`,
      transformOrigin: 'center center'
    };

    const renderResizeHandles = () => {
      if (!isEditing) return null;
      return (
        <>
          <div className="resize-handle nw" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, idx, true); }} />
          <div className="resize-handle ne" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, idx, true); }} />
          <div className="resize-handle sw" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, idx, true); }} />
          <div className="resize-handle se" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, idx, true); }} />
          <div className="resize-handle n" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, idx, true); }} />
          <div className="resize-handle s" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, idx, true); }} />
          <div className="resize-handle w" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, idx, true); }} />
          <div className="resize-handle e" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, idx, true); }} />
        </>
      );
    };

    if (el.type === 'text') {
      return (
        <div
          key={el.id}
          style={{
            ...baseStyle,
            color: el.color,
            fontSize: `${el.fontSize}px`,
            fontFamily: el.fontFamily || 'Arial',
            fontWeight: el.fontWeight || 'normal',
            fontStyle: el.fontStyle || 'normal',
            textDecoration: el.textDecoration || 'none',
            display: 'flex',
            alignItems: (function() {
              const v = el.verticalAlign || 'center';
              return v === 'top' ? 'flex-start' : (v === 'bottom' ? 'flex-end' : 'center');
            })(),
            justifyContent: (function() {
              const h = el.textAlign || 'left';
              return h === 'left' ? 'flex-start' : (h === 'center' ? 'center' : (h === 'right' ? 'flex-end' : 'flex-start'));
            })(),
            padding: '4px',
            userSelect: 'none',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
          onMouseDown={e => handleMouseDown(e, idx)}
          onDoubleClick={e => handleDoubleClick(e, idx)}
        >
          {isTextEditing ? (
            <input
              ref={isFrente ? inputRef : versoInputRef}
              type="text"
              value={el.value}
              onChange={e => handleTextChange(idx, e.target.value)}
              onBlur={finishEditingText}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: 'transparent',
                color: el.color,
                fontSize: `${el.fontSize}px`,
                fontFamily: el.fontFamily || 'Arial',
                textAlign: el.textAlign || 'left',
                outline: 'none'
              }}
            />
          ) : (
            el.value
          )}
          {renderResizeHandles()}
        </div>
      );
    }

    if (el.type === 'image') {
      return (
        <div
          key={el.id}
          style={baseStyle}
          onMouseDown={e => handleMouseDown(e, idx)}
        >
          <img src={el.src || ''} alt={el.fieldName} style={{ width: '100%', height: '100%', objectFit: el.fullScreen ? 'cover' : 'contain', pointerEvents: 'none' }} />
          {renderResizeHandles()}
        </div>
      );
    }

    if (el.type === 'shape') {
      const shapeStyle = {
        ...baseStyle,
        backgroundColor: el.fillColor || '#3b82f6',
        border: isEditing ? '2px dashed #6366f1' : (el.hasBorder ? `${el.borderWidth || 2}px solid ${el.borderColor || '#1e40af'}` : 'none'),
        borderRadius: el.shapeType === 'circle' ? '50%' : `${el.borderRadius || 0}px`
      };

      return (
        <div
          key={el.id}
          style={shapeStyle}
          onMouseDown={e => handleMouseDown(e, idx)}
        >
          {renderResizeHandles()}
        </div>
      );
    }

    return null;
  };

  const renderPropertiesPanel = () => {
    const isFrente = currentSide === 'frente';
    const editingIdx = isFrente ? editingElement : editingVersoElement;
    
    if (editingIdx === null) {
      return renderCardConfigEditor();
    }
    
    return renderPropertyEditor();
  };

  return (
    <div className="designer-view">
      {!currentDesign ? (
        <div className="no-designer-placeholder">
          <h3>Nenhum Design Selecionado</h3>
          <p>Crie um novo design para começar a personalizar suas cartas.</p>
          <button onClick={createDesigner}><FiPlus /> Criar Design</button>
        </div>
      ) : (
        <>
          <div className="designer-controls">
            {/* Controles do lado esquerdo (elementos) */}
            <div className="control-group">
              <button className="icon-btn" onClick={addText} title="Adicionar Campo de Texto (T)"><FiType /></button>
              <button className="icon-btn" onClick={addImage} title="Adicionar Imagem (I)"><FiImage /></button>
              <button className="icon-btn" onClick={addShape} title="Adicionar Forma (S)"><FiSquare /></button>
            </div>

            {/* Controles centrais (zoom, lado) */}
            <div className="control-group">
              <button className="icon-btn" onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}>-</button>
              <span className="zoom-level" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</span>
              <button className="icon-btn" onClick={() => setZoom(z => Math.min(5, z + 0.1))}>+</button>
              <button 
                onClick={() => setCurrentSide(s => s === 'frente' ? 'verso' : 'frente')} 
                className={`icon-btn ${currentSide === 'verso' ? 'active' : ''}`}
                title="Alternar Frente/Verso (V)"
              >
                <FiRotateCw />
              </button>
            </div>

            {/* Controles do lado direito (salvar) */}
            <div className="control-group">
              <button 
                onClick={saveDesigner} 
                disabled={!isDirty || isSaving} 
                className={`icon-btn ${isDirty ? 'save-button-dirty' : 'save-button-saved'}`}
                title={isSaving ? 'Salvando...' : (isDirty ? 'Salvar Alterações' : 'Salvo')}
              >
                <FiSave />
              </button>
            </div>
          </div>

          <div className="main-designer-area" onWheel={handleWheel}>
            <div className="layers-panel">
              <h4><FiLayers /> Camadas</h4>
              <div className="layer-list">
                {(currentSide === 'frente' ? elements : versoElements)
                  .slice()
                  .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
                  .map((el, sortedIdx) => {
                    const originalIndex = (currentSide === 'frente' ? elements : versoElements).findIndex(e => e.id === el.id);
                    return (
                      <div 
                        key={el.id} 
                        className={`layer-item ${editingElement === originalIndex || editingVersoElement === originalIndex ? 'active' : ''}`}
                        onClick={() => currentSide === 'frente' ? setEditingElement(originalIndex) : setEditingVersoElement(originalIndex)}
                      >
                        <span>{el.fieldName || `Elemento ${originalIndex + 1}`}</span>
                        <div className="layer-actions">
                          <button onClick={() => moveLayer(originalIndex, 1)}><FiArrowUp size={14}/></button>
                          <button onClick={() => moveLayer(originalIndex, -1)}><FiArrowDown size={14}/></button>
                        </div>
                      </div>
                    );
                })}
              </div>
            </div>

            <div className="canvas-container" ref={currentSide === 'frente' ? canvasRef : versoCanvasRef}>
              <div
                className="card-canvas"
                style={{
                  width: currentDesign.tipo.width,
                  height: currentDesign.tipo.height,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  backgroundColor: cardConfig.backgroundColor,
                  borderRadius: `${cardConfig.borderRadius}px`,
                  border: `${cardConfig.borderWidth}px solid ${cardConfig.borderColor}`,
                  boxSizing: 'border-box',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {(currentSide === 'frente' ? elements : versoElements).map((el, idx) => renderElement(el, idx))}
                {snapLines.map((line, i) => <div key={i} className={`snap-line ${line.type}`} style={{ top: line.y, left: line.x, width: line.width, height: line.height }} />)}
              </div>
            </div>

            <div className="properties-panel">
              <h4>Propriedades</h4>
              {renderPropertiesPanel()}
            </div>
          </div>
        </>
      )}

      {showModal === 'selectType' && (
        <SelectModal
          message="Selecione o tamanho da carta:"
          options={CARD_TYPES.map(t => t.nome)}
          onConfirm={handleTypeSelect}
          onCancel={() => setShowModal(null)}
        />
      )}

      {showModal === 'promptTextName' && (
        <PromptModal
          message="Nome do campo de texto:"
          onConfirm={handleTextNameConfirm}
          onCancel={() => setShowModal(null)}
        />
      )}

      {showModal === 'promptImageName' && (
        <PromptModal
          message="Nome do campo de imagem:"
          onConfirm={handleImageNameConfirm}
          onCancel={() => setShowModal(null)}
        />
      )}

      {showHotkeys && (
        <div className="modal-overlay" onClick={()=>setShowHotkeys(false)}>
          <div className="modal-content" onClick={e=>e.stopPropagation()}>
            <h3>Hotkeys</h3>
            <ul style={{marginTop:'1rem',marginBottom:'1rem'}}>
              <li><b>Shift Esquerdo + Scroll</b>: Zoom in/out na carta</li>
              <li><b>Ctrl + D</b>: Duplicar elemento selecionado</li>
              <li><b>?</b>: Abrir este popup de atalhos</li>
              <li><b>Tab</b>: Alternar entre elementos</li>
              <li><b>Delete</b>: Remover elemento selecionado</li>
            </ul>
            <button onClick={()=>setShowHotkeys(false)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Designer;
