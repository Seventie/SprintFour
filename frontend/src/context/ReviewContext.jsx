import { createContext, useReducer, useContext, useEffect, useRef } from 'react';
import axios from 'axios';

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
    case 'BATCH_STARTED': {
      const newDocs = action.payload; // array of {doc_id, filename, status}
      // Initialize detections for each to empty array
      const newDetections = {};
      newDocs.forEach(d => {
        newDetections[d.doc_id] = [];
      });
      return {
        ...state,
        documents: newDocs.map(d => ({ ...d, content: '' })),
        detections: newDetections,
        activeDocId: newDocs.length > 0 ? newDocs[0].doc_id : null,
        history: [],
      };
    }
    case 'UPDATE_DOCUMENT': {
      const { doc_id, text, detections, status } = action.payload;
      const newDocs = state.documents.map(d => d.doc_id === doc_id ? { ...d, content: text, status } : d);
      let newActiveDocId = state.activeDocId;
      
      // Auto-switch to the first completed document if the current one is still processing
      const currentActiveDoc = newDocs.find(d => d.doc_id === state.activeDocId);
      if (status === 'COMPLETED' && currentActiveDoc && currentActiveDoc.status !== 'COMPLETED') {
         newActiveDocId = doc_id;
      }

      return {
        ...state,
        documents: newDocs,
        detections: { ...state.detections, [doc_id]: detections },
        activeDocId: newActiveDocId
      };
    }
    case 'UPDATE_DOCUMENT_PROGRESS': {
      const { doc_id, chunks_processed, total_chunks, start_time, status } = action.payload;
      return {
        ...state,
        documents: state.documents.map(d => d.doc_id === doc_id ? { ...d, chunks_processed, total_chunks, start_time, status } : d),
      };
    }
    case 'SET_ACTIVE_DOC':
      return { ...state, activeDocId: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
    case 'UPDATE_DETECTION_STATUS': {
      const { docId, detectionId, status, actionMode, customReplacement } = action.payload;
      const docDetections = (state.detections[docId] || []).map(d =>
        d.id === detectionId ? {
          ...d,
          status,
          ...(actionMode ? { action_mode: actionMode } : {}),
          ...(customReplacement !== undefined ? { custom_replacement: customReplacement } : {})
        } : d
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
    case 'BULK_UPDATE_ALL': {
      const { docId, status } = action.payload;
      const docDets = (state.detections[docId] || []).map(d => {
        if (d.status === 'missed' || d.status === 'false_positive') {
          return { ...d, status };
        }
        return d;
      });
      const bulkHistory = {
        type: 'BULK_RESTORE',
        payload: {
          docId,
          previous: (state.detections[docId] || []).filter(
            d => d.status === 'missed' || d.status === 'false_positive'
          ).map(d => ({ detectionId: d.id, prevStatus: d.status }))
        }
      };
      return {
        ...state,
        detections: { ...state.detections, [docId]: docDets },
        history: [...state.history, bulkHistory].slice(-20),
      };
    }
    case 'BULK_ACCEPT_GLOBAL': {
      const { threshold } = action.payload;
      const newDetections = { ...state.detections };
      const previousStates = [];

      Object.keys(newDetections).forEach(docId => {
        const docDets = newDetections[docId].map(d => {
          if (d.status === 'missed' && d.confidence >= threshold) {
            previousStates.push({ docId, detectionId: d.id, prevStatus: d.status });
            return { ...d, status: 'redacted' };
          }
          return d;
        });
        newDetections[docId] = docDets;
      });

      const bulkHistory = { type: 'BULK_RESTORE_GLOBAL', payload: { previous: previousStates } };
      return { ...state, detections: newDetections, history: [...state.history, bulkHistory].slice(-20) };
    }
    case 'BULK_REJECT_GLOBAL': {
      const newDetections = { ...state.detections };
      const previousStates = [];

      Object.keys(newDetections).forEach(docId => {
        const docDets = newDetections[docId].map(d => {
          if (d.status === 'missed' || d.status === 'false_positive') {
            previousStates.push({ docId, detectionId: d.id, prevStatus: d.status });
            return { ...d, status: 'dismissed' };
          }
          return d;
        });
        newDetections[docId] = docDets;
      });

      const bulkHistory = { type: 'BULK_RESTORE_GLOBAL', payload: { previous: previousStates } };
      return { ...state, detections: newDetections, history: [...state.history, bulkHistory].slice(-20) };
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
      if (lastAction.type === 'BULK_RESTORE_GLOBAL') {
        const { previous } = lastAction.payload;
        const newDetections = { ...state.detections };
        previous.forEach(({ docId, detectionId, prevStatus }) => {
          if (!newDetections[docId]) return;
          newDetections[docId] = newDetections[docId].map(d => d.id === detectionId ? { ...d, status: prevStatus } : d);
        });
        return { ...state, detections: newDetections, history: newHistory };
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
  const isPolling = useRef(false);

  // Persist to sessionStorage on every state change
  useEffect(() => {
    if (state.documents.length > 0) {
      saveSession(state);
    }
  }, [state.documents, state.detections, state.activeDocId, state.sidebarOpen]);

  // Batch Streaming Poller
  useEffect(() => {
    const incompleteDocs = state.documents.filter(d => d.status !== 'COMPLETED' && d.status !== 'ERROR');
    if (incompleteDocs.length === 0) return;

    const poll = async () => {
      if (isPolling.current) return;
      isPolling.current = true;
      try {
        const { data } = await axios.get('http://localhost:8000/api/batch/progress');
        const batchProgress = data.documents || {};
        
        let hasUpdates = false;
        const updatesToDispatch = [];

        const fetchPromises = [];

        for (const doc of incompleteDocs) {
          const progress = batchProgress[doc.doc_id];
          if (progress) {
            if (progress.status === 'COMPLETED') {
              // Fetch full document progress to get text concurrently
              fetchPromises.push((async () => {
                try {
                  const fullRes = await axios.get(`http://localhost:8000/api/batch/progress/${doc.doc_id}`);
                  const fullProgress = fullRes.data;
                  updatesToDispatch.push({
                    type: 'UPDATE_DOCUMENT',
                    payload: {
                      doc_id: doc.doc_id,
                      text: fullProgress.text,
                      detections: fullProgress.detections,
                      status: 'COMPLETED'
                    }
                  });
                } catch (e) { console.error('Failed to fetch full doc', e); }
              })());
            } else if (progress.status === 'ERROR') {
               updatesToDispatch.push({
                type: 'UPDATE_DOCUMENT',
                payload: {
                  doc_id: doc.doc_id,
                  text: 'Error processing document: ' + progress.error,
                  detections: [],
                  status: 'ERROR'
                }
              });
            } else {
               // Update progress
               updatesToDispatch.push({
                 type: 'UPDATE_DOCUMENT_PROGRESS',
                 payload: {
                   doc_id: doc.doc_id,
                   chunks_processed: progress.chunks_processed,
                   total_chunks: progress.total_chunks,
                   start_time: progress.start_time,
                   status: progress.status
                 }
               });
            }
          } else {
            // Missing from tracker! Backend likely restarted.
            updatesToDispatch.push({
              type: 'UPDATE_DOCUMENT',
              payload: {
                doc_id: doc.doc_id,
                text: 'Error: Processing interrupted. The backend server restarted or lost the task. Please upload the file again.',
                detections: [],
                status: 'ERROR'
              }
            });
          }
        }

        // Wait for all concurrent full document fetches to finish
        await Promise.all(fetchPromises);

        // Apply updates
        for (const update of updatesToDispatch) {
          dispatch(update);
          // Clear it from the server's RAM once we've successfully ingested it
          if (update.type === 'UPDATE_DOCUMENT' && update.payload.status === 'COMPLETED') {
            axios.delete(`http://localhost:8000/api/batch/progress/${update.payload.doc_id}`).catch(e => console.error('Failed to clear doc', e));
          }
        }

      } catch (err) {
        console.error("Batch polling error", err);
      } finally {
        isPolling.current = false;
      }
    };

    const interval = setInterval(poll, 500);
    return () => clearInterval(interval);
  }, [state.documents]);

  return (
    <ReviewContext.Provider value={{ state, dispatch }}>
      {children}
    </ReviewContext.Provider>
  );
};

export const useReview = () => useContext(ReviewContext);
