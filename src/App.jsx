import { Routes, Route } from 'react-router-dom';
import NotFound404 from './pages/NotFound404';
import Hero from './components/Hero';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Hero />} />
      <Route path="*" element={<NotFound404 />} />
    </Routes>
  );
}

export default App;