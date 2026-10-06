


// import { Routes, Route } from "react-router-dom";
// import { LenisProvider, useLenisInstance } from "./hooks/useLenis";
// import TestTearTransition from "./components/TestTearTransition";
// import ProjectShowcase from "./components/ProjectShowcase";
// import CircleGallery from "./components/CircleGallery";
// import NotFound404 from "./pages/NotFound404";
// import Loader from "./components/Loader";
// import PageWrap from "./components/PageWrap";

// function Home() {
//   const lenis = useLenisInstance();
//   return (
//     <Loader minDuration={4500}>
//       <PageWrap>
//         {/* <Hero /> */}
//         <ProjectShowcase lenis={lenis} />
//         <CircleGallery />
//         {/* <TestTearTransition /> */}
//       </PageWrap>
//       {/* <Footer /> */}
//     </Loader>
//   );
// }

// function App() {
//   return (
//     <LenisProvider>
//       <Routes>
//         <Route path="/" element={<Home />} />
//         <Route path="*" element={<NotFound404 />} />
//       </Routes>
//     </LenisProvider>
//   );
// }

// export default App;












import { Routes, Route } from "react-router-dom";

import { LenisProvider, useLenisInstance } from "./hooks/useLenis";
import TearTransition from "./components/TearTransition";
import ProjectShowcase from "./components/ProjectShowcase";
import CircleGallery from "./components/CircleGallery";

// ↓ KEEP YOUR EXISTING IMPORT LINES FOR THESE (paths unknown to me)
import Loader from "./components/Loader";
import PageWrap from "./components/PageWrap";
import NotFound404 from "./pages/NotFound404";
import Hero from "./components/Hero";
import Footer from "./components/Footer";
import Statement from "./components/Statement";

function Home() {
  const lenis = useLenisInstance();
  return (
    <Loader minDuration={4500}>
      <PageWrap>
        <Hero />
        <Statement />
        <TearTransition
          from={<ProjectShowcase lenis={lenis} />}
          to={<CircleGallery />}
        />
      </PageWrap>
      <Footer />
    </Loader>
  );
}

function App() {
  return (
    <LenisProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<NotFound404 />} />
      </Routes>
    </LenisProvider>
  );
}

export default App;











// import { LenisProvider, useLenisInstance } from "./hooks/useLenis";
// import TestTearTransition from "./components/TestTearTransition";

// function Home() {
//   const lenis = useLenisInstance();
//   return (
//     <Loader minDuration={4500}>
//       <TestTearTransition />
//     </Loader>
//   );
// }

// function App() {
//   return (
//     <LenisProvider>
//       <Routes>
//         <Route path="/" element={<Home />} />
//         <Route path="*" element={<NotFound404 />} />
//       </Routes>
//     </LenisProvider>
//   );
// }

// export default App;