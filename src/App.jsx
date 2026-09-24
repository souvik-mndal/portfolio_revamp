import { Routes, Route } from "react-router-dom";
import NotFound404 from "./pages/NotFound404";
import Hero from "./components/Hero";
import Loader from "./components/Loader";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Loader minDuration={4500}>
            <Hero />
            {/* Rest of your website sections */}
          </Loader>
        }
      />
      <Route path="*" element={<NotFound404 />} />
    </Routes>
  );
}

export default App;
