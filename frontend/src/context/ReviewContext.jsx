import { createContext, useReducer, useContext, useEffect } from 'react';

const ReviewContext = createContext();

// --- SessionStorage helpers (survives refresh, clears on tab close) ---
const STORAGE_KEY = 'conseal_session';

function loadSession() {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('Failed to load session:', e);
  }
  return null;
}

function saveSession(state) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      documents: state.documents,
      detections: state.detections,
      activeDocId: state.activeDocId,
      sidebarOpen: state.sidebarOpen,
    }));
  } catch (e) {
    console.warn('Failed to save session:', e);
  }
}

const defaultState = {
  documents: [],
  activeDocId: null,
  detections: {},
  corrections: {},
  flagged: {},
  history: [],
  sidebarOpen: true,
  isProcessing: false,
};

const savedSession = loadSession();
const initialState = savedSession
  ? { ...defaultState, ...savedSession, history: [], isProcessing: false }
  : defaultState;

function reviewReducer(state, action) {
  switch (action.type) {
    case 'LOAD_SESSION': {
      const newState = {
        ...state,
        documents: action.payload.documents,
        detections: action.payload.detections,
        activeDocId: action.payload.documents.length > 0 ? action.payload.documents[0].doc_id : null,
        history: [],
        isProcessing: false,
      };
      return newState;
    }
    case 'SET_ACTIVE_DOC':
      return { ...state, activeDocId: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
    case 'UPDATE_DETECTION_STATUS': {
      const { docId, detectionId, status } = action.payload;
      const docDetections = (state.detections[docId] || []).map(d =>
        d.id === detectionId ? { ...d, status } : d
      );
      const prevDetection = (state.detections[docId] || []).find(d => d.id === detectionId);
      const newHistory = [
        ...state.history,
        { type: 'RESTORE_STATUS', payload: { docId, detectionId, prevStatus: prevDetection?.status } }
      ].slice(-20);
      return {
        ...state,
        detections: { ...state.detections, [docId]: docDetections },
        history: newHistory,
      };
    }
    case 'ADD_DETECTION': {
      const { docId, detection } = action.payload;
      const existing = state.detections[docId] || [];
      const updated = [...existing, detection].sort((a, b) => a.char_start - b.char_start);
      return {
        ...state,
        detections: { ...state.detections, [docId]: updated },
      };
    }
    case 'BULK_ACCEPT': {
      const { docId, threshold } = action.payload;
      const docDets = (state.detections[docId] || []).map(d => {
        if (d.status === 'missed' && d.confidence >= threshold) {
          return { ...d, status: 'redacted' };
        }
        return d;
      });
      const bulkHistory = {
        type: 'BULK_RESTORE',
        payload: {
          docId,
          previous: (state.detections[docId] || []).filter(
            d => d.status === 'missed' && d.confidence >= threshold
          ).map(d => ({ detectionId: d.id, prevStatus: d.status }))
        }
      };
      return {
        ...state,
        detections: { ...state.detections, [docId]: docDets },
        history: [...state.history, bulkHistory].slice(-20),
      };
    }
    case 'UNDO': {
      if (state.history.length === 0) return state;
      const lastAction = state.history[state.history.length - 1];
      const newHistory = state.history.slice(0, -1);
      if (lastAction.type === 'RESTORE_STATUS') {
        const { docId, detectionId, prevStatus } = lastAction.payload;
        const docDetections = (state.detections[docId] || []).map(d =>
          d.id === detectionId ? { ...d, status: prevStatus } : d
        );
        return { ...state, detections: { ...state.detections, [docId]: docDetections }, history: newHistory };
      }
      if (lastAction.type === 'BULK_RESTORE') {
        const { docId, previous } = lastAction.payload;
        let docDets = [...(state.detections[docId] || [])];
        previous.forEach(({ detectionId, prevStatus }) => {
          docDets = docDets.map(d => d.id === detectionId ? { ...d, status: prevStatus } : d);
        });
        return { ...state, detections: { ...state.detections, [docId]: docDets }, history: newHistory };
      }
      return { ...state, history: newHistory };
    }
    case 'CLEAR_SESSION':
      sessionStorage.removeItem(STORAGE_KEY);
      return defaultState;
    default:
      return state;
  }
}

export const ReviewProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reviewReducer, initialState);

  // Persist to sessionStorage on every state change
  useEffect(() => {
    if (state.documents.length > 0) {
      saveSession(state);
    }
  }, [state.documents, state.detections, state.activeDocId, state.sidebarOpen]);

  return (
    <ReviewContext.Provider value={{ state, dispatch }}>
      {children}
    </ReviewContext.Provider>
  );
};

export const useReview = () => useContext(ReviewContext);
