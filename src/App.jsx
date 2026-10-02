import { Routes, Route } from "react-router-dom";
import NotFound404 from "./pages/NotFound404";
import Hero from "./components/Hero";
import Loader from "./components/Loader";
import { LenisProvider } from "./hooks/useLenis";

import Footer from "./components/Footer";
import PageWrap from "./components/PageWrap";
import ProjectShowcase from "./components/ProjectShowcase";
import CircleGallery from "./components/CircleGallery";

function App() {
  return (
    <LenisProvider>
      <Routes>
        <Route
          path="/"
          element={
            <Loader minDuration={4500}>
              {/*
                IMPORTANT: with the sticky approach, Footer must be a
                normal sibling AFTER PageWrap, both in the same flow —
                NOT positioned fixed/outside. Sticky needs to be a real
                child in the scrolling document to work.
              */}
              <PageWrap>
                {/* <Hero /> */}
                {/* <ProjectShowcase /> */}
                <CircleGallery />
                {/* Rest of your website sections go here too */}
              </PageWrap>
              {/* <Footer /> */}
            </Loader>
          }
        />
        <Route path="*" element={<NotFound404 />} />
      </Routes>
    </LenisProvider>
  );
}

export default App;