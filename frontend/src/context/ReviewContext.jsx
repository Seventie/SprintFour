import { createContext, useReducer, useContext } from 'react';

const ReviewContext = createContext();

const initialState = {
  documents: [],
  activeDocId: null,
  detections: {},
  corrections: {},
  flagged: {},
  history: [],
  sidebarOpen: true
};

function reviewReducer(state, action) {
  switch (action.type) {
    case 'LOAD_SESSION':
      return {
        ...state,
        documents: action.payload.documents,
        detections: action.payload.detections,
        activeDocId: action.payload.documents.length > 0 ? action.payload.documents[0].doc_id : null,
        history: []
      };
    case 'SET_ACTIVE_DOC':
      return { ...state, activeDocId: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'UPDATE_DETECTION_STATUS': {
      const { docId, detectionId, status } = action.payload;
      const docDetections = state.detections[docId].map(d => 
        d.id === detectionId ? { ...d, status } : d
      );
      
      // Save to history (simplified undo stack)
      const prevDetection = state.detections[docId].find(d => d.id === detectionId);
      const newHistory = [...state.history, { type: 'RESTORE_STATUS', payload: { docId, detectionId, prevStatus: prevDetection.status } }].slice(-20);

      return {
        ...state,
        detections: { ...state.detections, [docId]: docDetections },
        history: newHistory
      };
    }
    case 'UNDO': {
      if (state.history.length === 0) return state;
      const lastAction = state.history[state.history.length - 1];
      const newHistory = state.history.slice(0, -1);
      
      if (lastAction.type === 'RESTORE_STATUS') {
        const { docId, detectionId, prevStatus } = lastAction.payload;
        const docDetections = state.detections[docId].map(d => 
          d.id === detectionId ? { ...d, status: prevStatus } : d
        );
        return { ...state, detections: { ...state.detections, [docId]: docDetections }, history: newHistory };
      }
      return { ...state, history: newHistory };
    }
    default:
      return state;
  }
}

export const ReviewProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reviewReducer, initialState);

  return (
    <ReviewContext.Provider value={{ state, dispatch }}>
      {children}
    </ReviewContext.Provider>
  );
};

export const useReview = () => useContext(ReviewContext);
