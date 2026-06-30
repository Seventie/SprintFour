import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Upload from './pages/Upload';
import Review from './pages/Review';
import Export from './pages/Export';
import { ReviewProvider } from './context/ReviewContext';
import BackgroundAtmosphere from './components/layout/BackgroundAtmosphere';

function App() {
  return (
    <ReviewProvider>
      <Router>
        <BackgroundAtmosphere />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/review" element={<Review />} />
          <Route path="/export" element={<Export />} />
        </Routes>
      </Router>
    </ReviewProvider>
  );
}

export default App;
