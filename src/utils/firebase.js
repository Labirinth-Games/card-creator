// CRUD de Usuários
export async function saveUser(user) {
  const usersCol = collection(db, 'users');
  const userDoc = doc(usersCol, user.uid);
  await setDoc(userDoc, {
    uid: user.uid,
    email: user.email,
    createdAt: new Date().toISOString()
  });
}
// firebase.js - Inicialização do Firebase e funções utilitárias CRUD
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where } from 'firebase/firestore';



import firebaseConfig from './firebaseConfig';

// (Opcional) Analytics
// import { getAnalytics } from "firebase/analytics";
// const analytics = getAnalytics(app);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Referências
const projectsCol = collection(db, 'projects');
const globalFontsDoc = doc(db, 'settings', 'customFonts');

// CRUD de Fontes Globais
export async function getGlobalFonts() {
  try {
    const docSnap = await getDoc(globalFontsDoc);
    if (docSnap.exists()) {
      return docSnap.data().fonts || [];
    }
    return [];
  } catch (error) {
    console.error('Erro ao buscar fontes:', error);
    return [];
  }
}

export async function saveGlobalFont(fontData) {
  try {
    const currentFonts = await getGlobalFonts();
    // Verifica se a fonte já existe
    const fontExists = currentFonts.some(f => f.name === fontData.name);
    if (!fontExists) {
      const updatedFonts = [...currentFonts, fontData];
      await setDoc(globalFontsDoc, { fonts: updatedFonts });
    }
    return await getGlobalFonts();
  } catch (error) {
    console.error('Erro ao salvar fonte:', error);
    throw error;
  }
}

export async function removeGlobalFont(fontName) {
  try {
    const currentFonts = await getGlobalFonts();
    const updatedFonts = currentFonts.filter(f => f.name !== fontName);
    await setDoc(globalFontsDoc, { fonts: updatedFonts });
    return updatedFonts;
  } catch (error) {
    console.error('Erro ao remover fonte:', error);
    throw error;
  }
}

// CRUD de Projetos
export async function createProject(project) {
  const docRef = await addDoc(projectsCol, project);
  return docRef.id;
}

export async function updateProject(id, data) {
  const docRef = doc(projectsCol, id);
  await updateDoc(docRef, data);
}

export async function deleteProject(id) {
  // Deletar todas as subcoleções primeiro
  const decksCol = getDecksCol(id);
  const decksSnap = await getDocs(decksCol);
  
  // Para cada deck, deletar todas as cartas
  for (const deckDoc of decksSnap.docs) {
    const cardsCol = collection(db, 'projects', id, 'decks', deckDoc.id, 'cards');
    const cardsSnap = await getDocs(cardsCol);
    
    // Deletar todas as cartas
    for (const cardDoc of cardsSnap.docs) {
      await deleteDoc(cardDoc.ref);
    }
    
    // Deletar o deck
    await deleteDoc(deckDoc.ref);
  }
  
  // Deletar o projeto
  const docRef = doc(projectsCol, id);
  await deleteDoc(docRef);
}

export async function getAllProjects() {
  const snapshot = await getDocs(projectsCol);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


// CRUD de Decks (subcoleção de cada projeto)
export function getDecksCol(projectId) {
  return collection(db, 'projects', projectId, 'decks');
}

export async function addDeck(projectId, deck, userId) {
  const decksCol = getDecksCol(projectId);
  const docRef = await addDoc(decksCol, { ...deck, userId });
  return docRef.id;
}

export async function deleteDeck(projectId, deckId) {
  // Deletar todas as cartas primeiro
  const cardsCol = collection(db, 'projects', projectId, 'decks', deckId, 'cards');
  const cardsSnap = await getDocs(cardsCol);
  for (const cardDoc of cardsSnap.docs) {
    await deleteDoc(cardDoc.ref);
  }
  // Deletar o deck
  const decksCol = getDecksCol(projectId);
  const deckRef = doc(decksCol, deckId);
  await deleteDoc(deckRef);
}

export async function getAllDecks(projectId, userId) {
  const decksCol = getDecksCol(projectId);
  let q = decksCol;
  if (userId) {
    q = query(decksCol, where('userId', '==', userId));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Atualizar designer do deck
export async function updateDeckDesigner(projectId, deckId, designer) {
  const decksCol = getDecksCol(projectId);
  const deckRef = doc(decksCol, deckId);
  await updateDoc(deckRef, { designer });
}

export { db };
