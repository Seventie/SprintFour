import { createContext, useReducer, useContext } from 'react';

const ReviewContext = createContext();

const initialState = {
  documents: [
    // Mock data for demo
    { doc_id: '1', filename: 'legal_contract.pdf', file_type: 'pdf', status: 'ready', char_count: 1500 }
  ],
  activeDocId: '1',
  detections: {
    '1': [
      { id: 'd1', text: 'Arjun Sharma', char_start: 0, char_end: 12, type: 'NAME', confidence: 0.95, status: 'redacted', reason: 'Matches NAME pattern' },
      { id: 'd2', text: 'arjun.s@law.in', char_start: 21, char_end: 35, type: 'EMAIL', confidence: 0.97, status: 'redacted', reason: 'Matches EMAIL format' },
      { id: 'd3', text: '9876543210', char_start: 50, char_end: 60, type: 'PHONE', confidence: 0.38, status: 'missed', reason: 'Low conf PHONE' }
    ]
  },
  corrections: {},
  flagged: {},
  history: [],
  sidebarOpen: true
};

function reviewReducer(state, action) {
  switch (action.type) {
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
