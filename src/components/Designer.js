import React, { useState, useEffect, useRef } from 'react';
import './Skeleton.css';
import { updateDeckDesigner, getAllDecks } from '../utils/firebase';
import { AlertModal, PromptModal, SelectModal } from './Modal';
import ImageDropZone from './ImageDropZone';
import FontSelector from './FontSelector';
import { 
  FiType, FiImage, FiPlus, FiTrash2, FiCopy, FiLayers, FiArrowUp, FiArrowDown, 
  FiAlignCenter, FiAlignLeft, FiAlignRight, FiBold, FiItalic, FiUnderline, FiSquare, FiSave, FiAlertCircle, FiMoreVertical, FiDownload, FiUpload, FiRotateCw
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

  const handleWheel = (e) => {
    if (e.shiftKey) {
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

  function handleMouseDown(e, idx) {
    e.stopPropagation();
    e.preventDefault();
    const currentElements = currentSide === 'frente' ? elements : versoElements;
    const el = currentElements[idx];
    const canvasRect = (currentSide === 'frente' ? canvasRef.current : versoCanvasRef.current).getBoundingClientRect();
    
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
    } else {
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
    const newElements = elements.map((el, i) => i === idx ? { ...el, [field]: value } : el);
    setElements(newElements);
  }

  function updateVersoElement(idx, field, value) {
    const newVersoElements = versoElements.map((el, i) => i === idx ? { ...el, [field]: value } : el);
    setVersoElements(newVersoElements);
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
            <button onClick={() => moveLayer(editingIdx, 'up')} title="Mover para frente"><FiArrowUp /></button>
            <button onClick={() => moveLayer(editingIdx, 'down')} title="Mover para trás"><FiArrowDown /></button>
            <button onClick={() => duplicateElement(editingIdx)} title="Duplicar (Ctrl+D)"><FiCopy /></button>
            <button className="danger" onClick={() => removeFn(editingIdx)} title="Remover"><FiTrash2 /></button>
          </div>
        </div>

        <div className="prop-group">
          <label>Nome do Campo</label>
          <input type="text" value={el.fieldName} onChange={e => updateFn(editingIdx, 'fieldName', e.target.value)} />
        </div>

        <div className="prop-grid">
          <div className="prop-group">
            <label>X</label>
            <input type="number" value={Math.round(el.x)} onChange={e => updateFn(editingIdx, 'x', Number(e.target.value))} />
          </div>
          <div className="prop-group">
            <label>Y</label>
            <input type="number" value={Math.round(el.y)} onChange={e => updateFn(editingIdx, 'y', Number(e.target.value))} />
          </div>
          <div className="prop-group">
            <label>Largura</label>
            <input type="number" value={Math.round(el.width)} onChange={e => updateFn(editingIdx, 'width', Number(e.target.value))} />
          </div>
          <div className="prop-group">
            <label>Altura</label>
            <input type="number" value={Math.round(el.height)} onChange={e => updateFn(editingIdx, 'height', Number(e.target.value))} />
          </div>
        </div>

        {el.type === 'text' && (
          <>
            <div className="prop-group">
              <label>Fonte</label>
              <FontSelector
                selectedFont={el.fontFamily}
                onSelectFont={font => updateFn(editingIdx, 'fontFamily', font)}
                customFonts={customFonts}
                onCustomFontsChange={setCustomFonts}
              />
            </div>
            <div className="prop-grid">
              <div className="prop-group">
                <label>Tamanho</label>
                <input type="number" value={el.fontSize} onChange={e => updateFn(editingIdx, 'fontSize', Number(e.target.value))} />
              </div>
              <div className="prop-group">
                <label>Cor</label>
                <input type="color" value={el.color} onChange={e => updateFn(editingIdx, 'color', e.target.value)} />
              </div>
            </div>
            <div className="prop-group">
              <label>Alinhamento</label>
              <div className="button-group">
                <button className={el.textAlign === 'left' ? 'active' : ''} onClick={() => updateFn(editingIdx, 'textAlign', 'left')}><FiAlignLeft /></button>
                <button className={el.textAlign === 'center' ? 'active' : ''} onClick={() => updateFn(editingIdx, 'textAlign', 'center')}><FiAlignCenter /></button>
                <button className={el.textAlign === 'right' ? 'active' : ''} onClick={() => updateFn(editingIdx, 'textAlign', 'right')}><FiAlignRight /></button>
              </div>
            </div>
            <div className="prop-group">
              <label>Estilo</label>
              <div className="button-group">
                <button className={el.fontWeight === 'bold' ? 'active' : ''} onClick={() => updateFn(editingIdx, 'fontWeight', el.fontWeight === 'bold' ? 'normal' : 'bold')}><FiBold /></button>
                <button className={el.fontStyle === 'italic' ? 'active' : ''} onClick={() => updateFn(editingIdx, 'fontStyle', el.fontStyle === 'italic' ? 'normal' : 'italic')}><FiItalic /></button>
                <button className={el.textDecoration === 'underline' ? 'active' : ''} onClick={() => updateFn(editingIdx, 'textDecoration', el.textDecoration === 'underline' ? 'none' : 'underline')}><FiUnderline /></button>
              </div>
            </div>
            <div className="prop-group">
              <label>Tipo de Dado (para tabela)</label>
              <select value={el.dataType} onChange={e => updateFn(editingIdx, 'dataType', e.target.value)}>
                <option value="string">Texto Curto</option>
                <option value="text">Texto Longo</option>
                <option value="number">Número</option>
              </select>
            </div>
            <div className="prop-group">
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
                <button onClick={() => updateFn(editingIdx, 'rotation', 0)} title="Resetar Rotação"><FiRotateCw /></button>
              </div>
            </div>
          </>
        )}

        {el.type === 'image' && (
          <>
            <div className="prop-group">
              <label>Fonte da Imagem</label>
              <ImageDropZone
                value={el.src}
                onChange={src => updateFn(editingIdx, 'src', src)}
                placeholder="Arraste uma imagem ou cole a URL"
              />
            </div>
            <div className="prop-group checkbox">
              <input type="checkbox" id="isDefault" checked={el.isDefault} onChange={e => updateFn(editingIdx, 'isDefault', e.target.checked)} />
              <label htmlFor="isDefault">Imagem Padrão (não aparece na tabela)</label>
            </div>
          </>
        )}

        {el.type === 'shape' && (
          <>
            <div className="prop-group">
              <label>Tipo de Forma</label>
              <select value={el.shapeType || 'rectangle'} onChange={e => updateFn(editingIdx, 'shapeType', e.target.value)}>
                <option value="rectangle">Retângulo</option>
                <option value="circle">Círculo</option>
              </select>
            </div>
            <div className="prop-group">
              <label>Cor de Preenchimento</label>
              <input type="color" value={el.fillColor || '#3b82f6'} onChange={e => updateFn(editingIdx, 'fillColor', e.target.value)} />
            </div>
            <div className="prop-group checkbox">
              <input 
                type="checkbox" 
                id="hasBorder" 
                checked={el.hasBorder || false} 
                onChange={e => updateFn(editingIdx, 'hasBorder', e.target.checked)} 
              />
              <label htmlFor="hasBorder">Adicionar Borda</label>
            </div>
            {el.hasBorder && (
              <>
                <div className="prop-grid">
                  <div className="prop-group">
                    <label>Cor da Borda</label>
                    <input type="color" value={el.borderColor || '#1e40af'} onChange={e => updateFn(editingIdx, 'borderColor', e.target.value)} />
                  </div>
                  <div className="prop-group">
                    <label>Espessura da Borda</label>
                    <input type="number" min="0" value={el.borderWidth || 2} onChange={e => updateFn(editingIdx, 'borderWidth', Number(e.target.value))} />
                  </div>
                </div>
              </>
            )}
            {el.shapeType !== 'circle' && (
              <div className="prop-group">
                <label>Arredondamento</label>
                <input type="number" min="0" value={el.borderRadius || 0} onChange={e => updateFn(editingIdx, 'borderRadius', Number(e.target.value))} />
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderCardConfigEditor = () => {
    return (
      <div className="property-editor">
        <h4>Configurações da Carta</h4>
        <div className="prop-grid">
          <div className="prop-group">
            <label>Cor de Fundo</label>
            <input type="color" value={cardConfig.backgroundColor} onChange={e => setCardConfig({...cardConfig, backgroundColor: e.target.value})} />
          </div>
          <div className="prop-group">
            <label>Cor da Borda</label>
            <input type="color" value={cardConfig.borderColor} onChange={e => setCardConfig({...cardConfig, borderColor: e.target.value})} />
          </div>
          <div className="prop-group">
            <label>Largura da Borda (px)</label>
            <input type="number" min="0" value={cardConfig.borderWidth} onChange={e => setCardConfig({...cardConfig, borderWidth: Number(e.target.value)})} />
          </div>
          <div className="prop-group">
            <label>Raio da Borda (px)</label>
            <input type="number" min="0" value={cardConfig.borderRadius} onChange={e => setCardConfig({...cardConfig, borderRadius: Number(e.target.value)})} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="designer-container">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,marginBottom:8}}>
        <h2 style={{margin:0}}>Designer de Carta</h2>
        <div style={{display:'flex',alignItems:'center',gap:8,position:'relative'}}>
          <button
            onClick={saveDesigner}
            disabled={isSaving || !isDirty}
            className={`primary${isDirty ? ' unsaved' : ''}`}
            title={isDirty ? 'Existem alterações não salvas' : 'Tudo salvo'}
            style={{minWidth:160}}
          >
            {isSaving ? (
              <><FiSave style={{verticalAlign:'middle'}} /> Salvando...</>
            ) : (
              <><FiSave style={{verticalAlign:'middle'}} /> Salvar Designer</>
            )}
            {isDirty && !isSaving && (
              <span style={{color:'#eab308',marginLeft:8,verticalAlign:'middle'}} title="Existem alterações não salvas"><FiAlertCircle /></span>
            )}
          </button>
          <button style={{marginLeft:8}} onClick={()=>setShowMenu(v=>!v)} title="Mais opções"><FiMoreVertical size={22}/></button>
          {showMenu && (
            <div style={{
              position: 'absolute',
              top: '110%',
              right: 0,
              background: 'rgba(255,255,255,0.98)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
              borderRadius: 10,
              zIndex: 100,
              minWidth: 170,
              padding: '10px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              border: '1px solid #ececec'
            }}>
              <button style={{
                width: '100%',
                justifyContent: 'flex-start',
                gap: 10,
                padding: '10px 18px',
                background: 'none',
                border: 'none',
                borderRadius: 0,
                textAlign: 'left',
                fontSize: 15,
                cursor: 'pointer',
                transition: 'background 0.15s',
                outline: 'none',
                color: '#222',
                fontWeight: 500
              }}
                onClick={()=>{setShowMenu(false); /* TODO: export logic */}}
                onMouseOver={e=>{e.currentTarget.style.background='#f5f5f5';e.currentTarget.style.color='#1e40af';}}
                onMouseOut={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color='#222';}}
              ><FiDownload style={{color:'#1e40af'}}/> Exportar</button>
              <button style={{
                width: '100%',
                justifyContent: 'flex-start',
                gap: 10,
                padding: '10px 18px',
                background: 'none',
                border: 'none',
                borderRadius: 0,
                textAlign: 'left',
                fontSize: 15,
                cursor: 'pointer',
                transition: 'background 0.15s',
                outline: 'none',
                color: '#222',
                fontWeight: 500
              }}
                onClick={()=>{setShowMenu(false); /* TODO: import logic */}}
                onMouseOver={e=>{e.currentTarget.style.background='#f5f5f5';e.currentTarget.style.color='#1e40af';}}
                onMouseOut={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color='#222';}}
              ><FiUpload style={{color:'#1e40af'}}/> Importar</button>
              <button style={{
                width: '100%',
                justifyContent: 'flex-start',
                gap: 10,
                padding: '10px 18px',
                background: 'none',
                border: 'none',
                borderRadius: 0,
                textAlign: 'left',
                fontSize: 15,
                cursor: 'pointer',
                transition: 'background 0.15s',
                outline: 'none',
                color: '#222',
                fontWeight: 500
              }}
                onClick={()=>{setShowMenu(false); setShowHotkeys(true);}}
                onMouseOver={e=>{e.currentTarget.style.background='#f5f5f5';e.currentTarget.style.color='#1e40af';}}
                onMouseOut={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color='#222';}}
              ><span style={{width:18,display:'inline-block',color:'#1e40af'}}>?</span> Hotkeys</button>
            </div>
          )}
        </div>
      </div>
      {isDirty && !isSaving && (
        <div style={{color:'#eab308',fontSize:12,marginTop:-8,marginBottom:8,display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end'}}>
          <FiAlertCircle /> Existem alterações não salvas
        </div>
      )}
      {loadingDesigner ? (
        <div className="designer-placeholder">
          <div style={{width: '100%', display: 'flex', gap: 16}}>
            <div style={{flex: 1}}>
              <div className="skeleton title" style={{width: '50%', marginBottom: 12}} />
              <div className="skeleton block" style={{height: 220}} />
            </div>
            <div style={{width: 320}}>
              <div className="skeleton title" style={{width: '80%', marginBottom: 12}} />
              <div className="skeleton-grid">
                {Array.from({length:6}).map((_,i) => (
                  <div key={i} className="skeleton row" />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : !currentDesign ? (
        <div className="designer-placeholder">
          <p>Nenhum designer de carta selecionado para este deck.</p>
          <button onClick={createDesigner}><FiPlus /> Criar Novo Designer</button>
        </div>
      ) : (
        <div className="designer-layout">
          <div className="designer-content-wrapper">
            <div className="designer-toolbar">
              <div className="toolbar-section">
                <p>Adicionar Elementos</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button onClick={addText}><FiType /> Texto</button>
                  <button onClick={addImage}><FiImage /> Imagem</button>
                  <button onClick={addShape}><FiSquare /> Forma</button>
                </div>
              </div>
              <div className="toolbar-section">
                {/* Botão de salvar movido para o topo */}
              </div>
              <div className="toolbar-section">
                <p>Lado da Carta</p>
                <div className="button-group">
                  <button className={currentSide === 'frente' ? 'active' : ''} onClick={() => { if (isDirty) saveDesigner(); setCurrentSide('frente'); }}>Frente</button>
                  <button className={currentSide === 'verso' ? 'active' : ''} onClick={() => { if (isDirty) saveDesigner(); setCurrentSide('verso'); }}>Verso</button>
                </div>
              </div>
              <div className="toolbar-section">
                <p>Camadas</p>
                <div className="layer-list">
                  {[...(currentSide === 'frente' ? elements : versoElements)]
                    .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
                    .map((el) => {
                      const originalIndex = (currentSide === 'frente' ? elements : versoElements).findIndex(item => item.id === el.id);
                      const isEditing = originalIndex === (currentSide === 'frente' ? editingElement : editingVersoElement);
                      const isDragging = draggingLayerIndex === originalIndex;
                      return (
                        <div 
                          key={el.id} 
                          className={`layer-item ${isEditing ? 'editing' : ''} ${isDragging ? 'dragging' : ''}`}
                          draggable
                          onDragStart={(e) => handleLayerDragStart(e, originalIndex)}
                          onDragOver={handleLayerDragOver}
                          onDrop={(e) => handleLayerDrop(e, originalIndex)}
                          onDragEnd={handleLayerDragEnd}
                          onClick={() => {
                            if (currentSide === 'frente') {
                              setEditingElement(originalIndex);
                              setEditingVersoElement(null);
                            } else {
                              setEditingVersoElement(originalIndex);
                              setEditingElement(null);
                            }
                          }}
                        >
                          <FiLayers style={{ flexShrink: 0 }} />
                          <span className="layer-name">{el.fieldName}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
               <div className="toolbar-section">
                <p>Config. da Carta</p>
                <button onClick={() => { setEditingElement(null); setEditingVersoElement(null); }}>Editar Aparência</button>
              </div>
            </div>

            <div className="designer-canvas-area" onWheel={handleWheel}>
              <div
                ref={canvasRef}
                className="card-canvas"
                style={{
                  width: currentDesign.tipo.width,
                  height: currentDesign.tipo.height,
                  backgroundColor: cardConfig.backgroundColor,
                  borderRadius: `${cardConfig.borderRadius}px`,
                  border: `${cardConfig.borderWidth}px solid ${cardConfig.borderColor}`,
                  display: currentSide === 'frente' ? 'block' : 'none',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center'
                }}
              >
                {elements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map((el, i) => {
                  const originalIndex = elements.findIndex(item => item.id === el.id);
                  const isEditing = editingElement === originalIndex;
                  const isEditingText = editingTextElement === originalIndex;
                  const isResizing = resizingElement === originalIndex;
                  const cursor = isResizing ? getCursorForHandle(resizeHandle) : 'grab';

                  return (
                    <div
                      key={el.id}
                      onMouseDown={e => handleMouseDown(e, originalIndex)}
                      onDoubleClick={e => handleDoubleClick(e, originalIndex)}
                      style={{
                        position: 'absolute',
                        left: el.x,
                        top: el.y,
                        width: el.width,
                        height: el.height,
                        border: isEditing ? '2px dashed var(--primary-color)' : 'none',
                        cursor: cursor,
                        zIndex: el.zIndex,
                        boxSizing: 'border-box',
                        transform: `rotate(${el.rotation || 0}deg)`
                      }}
                    >
                      {el.type === 'text' && !isEditingText && (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          color: el.color,
                          fontSize: `${el.fontSize}px`,
                          fontFamily: el.fontFamily,
                          textAlign: el.textAlign,
                          fontWeight: el.fontWeight,
                          fontStyle: el.fontStyle,
                          textDecoration: el.textDecoration,
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start',
                          padding: '2px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>{el.value}</div>
                      )}
                      {el.type === 'text' && isEditingText && (
                        <textarea
                          ref={inputRef}
                          value={el.value}
                          onChange={e => handleTextChange(idx, e.target.value)}
                          onBlur={finishEditingText}
                          style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            background: 'rgba(255,255,255,0.8)',
                            color: el.color,
                            fontSize: `${el.fontSize}px`,
                            fontFamily: el.fontFamily,
                            textAlign: el.textAlign,
                            fontWeight: el.fontWeight,
                          fontStyle: el.fontStyle,
                          textDecoration: el.textDecoration,
                            resize: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      )}
                      {el.type === 'image' && (
                        el.src ? (
                          <img
                            src={el.src}
                            alt={el.fieldName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }}
                            draggable="false"
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f0f0f0',
                            color: '#aaa',
                            fontSize: 14,
                            fontStyle: 'italic',
                            border: '1px dashed #ccc'
                          }}>
                            Imagem não definida
                          </div>
                        )
                      )}
                      {el.type === 'shape' && (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: el.fillColor,
                          border: el.hasBorder ? `${el.borderWidth || 2}px solid ${el.borderColor || '#1e40af'}` : 'none',
                          borderRadius: el.shapeType === 'circle' ? '50%' : `${el.borderRadius || 0}px`,
                          boxSizing: 'border-box'
                        }} />
                      )}
                      {isEditing && (
                        <>
                          <div className="resize-handle nw" />
                          <div className="resize-handle n" />
                          <div className="resize-handle ne" />
                          <div className="resize-handle w" />
                          <div className="resize-handle e" />
                          <div className="resize-handle sw" />
                          <div className="resize-handle s" />
                          <div className="resize-handle se" />
                        </>
                      )}
                    </div>
                  );
                })}
                {snapLines.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      backgroundColor: 'red',
                      ...(line.type === 'vertical'
                        ? { left: line.pos, top: 0, width: 1, height: '100%' }
                        : { top: line.pos, left: 0, height: 1, width: '100%' }),
                    }}
                  />
                ))}
              </div>
              
              {/* Canvas do Verso */}
              <div
                ref={versoCanvasRef}
                className="card-canvas"
                style={{
                  width: currentDesign.tipo.width,
                  height: currentDesign.tipo.height,
                  backgroundColor: cardConfig.backgroundColor,
                  borderRadius: `${cardConfig.borderRadius}px`,
                  border: `${cardConfig.borderWidth}px solid ${cardConfig.borderColor}`,
                  display: currentSide === 'verso' ? 'block' : 'none',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center'
                }}
              >
                {versoElements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map((el, i) => {
                  const originalIndex = versoElements.findIndex(item => item.id === el.id);
                  const isEditing = editingVersoElement === originalIndex;
                  const isEditingText = editingVersoTextElement === originalIndex;
                  const isResizing = resizingElement === originalIndex;
                  const cursor = isResizing ? getCursorForHandle(resizeHandle) : 'grab';

                  return (
                    <div
                      key={el.id}
                      onMouseDown={e => handleMouseDown(e, originalIndex)}
                      onDoubleClick={e => handleDoubleClick(e, originalIndex)}
                      style={{
                        position: 'absolute',
                        left: el.x,
                        top: el.y,
                        width: el.width,
                        height: el.height,
                        border: isEditing ? '2px dashed var(--primary-color)' : 'none',
                        cursor: cursor,
                        zIndex: el.zIndex,
                        boxSizing: 'border-box',
                        transform: `rotate(${el.rotation || 0}deg)`
                      }}
                    >
                      {el.type === 'text' && !isEditingText && (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          color: el.color,
                          fontSize: `${el.fontSize}px`,
                          fontFamily: el.fontFamily,
                          textAlign: el.textAlign,
                          fontWeight: el.fontWeight,
                          fontStyle: el.fontStyle,
                          textDecoration: el.textDecoration,
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start',
                          padding: '2px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>{el.value}</div>
                      )}
                      {el.type === 'text' && isEditingText && (
                        <textarea
                          ref={versoInputRef}
                          value={el.value}
                          onChange={e => handleTextChange(idx, e.target.value)}
                          onBlur={finishEditingText}
                          style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            background: 'rgba(255,255,255,0.8)',
                            color: el.color,
                            fontSize: `${el.fontSize}px`,
                            fontFamily: el.fontFamily,
                            textAlign: el.textAlign,
                            fontWeight: el.fontWeight,
                          fontStyle: el.fontStyle,
                          textDecoration: el.textDecoration,
                            resize: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      )}
                      {el.type === 'image' && (
                        <img
                          src={el.src}
                          alt={el.fieldName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }}
                          draggable="false"
                        />
                      )}
                      {el.type === 'shape' && (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: el.fillColor,
                          border: el.hasBorder ? `${el.borderWidth || 2}px solid ${el.borderColor || '#1e40af'}` : 'none',
                          borderRadius: el.shapeType === 'circle' ? '50%' : `${el.borderRadius || 0}px`,
                          boxSizing: 'border-box'
                        }} />
                      )}
                      {isEditing && (
                        <>
                          <div className="resize-handle nw" />
                          <div className="resize-handle n" />
                          <div className="resize-handle ne" />
                          <div className="resize-handle w" />
                          <div className="resize-handle e" />
                          <div className="resize-handle sw" />
                          <div className="resize-handle s" />
                          <div className="resize-handle se" />
                        </>
                      )}
                    </div>
                  );
                })}
                {versoSnapLines.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      backgroundColor: 'red',
                      ...(line.type === 'vertical'
                        ? { left: line.pos, top: 0, width: 1, height: '100%' }
                        : { top: line.pos, left: 0, height: 1, width: '100%' }),
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="designer-properties-wrapper">
            <div className="designer-properties">
              {(editingElement !== null || editingVersoElement !== null) ? renderPropertyEditor() : renderCardConfigEditor()}
            </div>
          </div>
        </div>
      )}

      {showModal === 'promptTextName' && (
        <PromptModal
          message="Digite o nome do campo de texto (ex: 'Nome', 'Ataque', 'Descrição'):"
          placeholder="Nome do Campo"
          onConfirm={handleTextNameConfirm}
          onCancel={() => setShowModal(null)}
        />
      )}
      {showModal === 'promptImageName' && (
        <PromptModal
          message="Digite o nome do campo de imagem (ex: 'Ilustração', 'Ícone'):"
          placeholder="Nome do Campo"
          onConfirm={handleImageNameConfirm}
          onCancel={() => setShowModal(null)}
        />
      )}
      {showModal === 'selectType' && (
        <SelectModal
          message="Selecione o tamanho da carta:"
          options={CARD_TYPES.map(t => t.nome)}
          onConfirm={handleTypeSelect}
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
