import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Upload from './pages/Upload';
import Review from './pages/Review';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/review" element={<Review />} />
      </Routes>
    </Router>
  );
}

export default App;
