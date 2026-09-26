// import { Routes, Route } from "react-router-dom";
// import NotFound404 from "./pages/NotFound404";
// import Hero from "./components/Hero";
// import Loader from "./components/Loader";

// function App() {
//   return (
//     <Routes>
//       <Route
//         path="/"
//         element={
//           <Loader minDuration={4500}>
//             <Hero />
//             {/* Rest of your website sections */}
//           </Loader>
//         }
//       />
//       <Route path="*" element={<NotFound404 />} />
//     </Routes>
//   );
// }

// export default App;
















// import { Routes, Route } from "react-router-dom";
// import NotFound404 from "./pages/NotFound404";
// import Hero from "./components/Hero";
// import Loader from "./components/Loader";
// import { LenisProvider } from "./hooks/useLenis";

// function App() {
//   return (
//     <LenisProvider>
//       <Routes>
//         <Route
//           path="/"
//           element={
//             <Loader minDuration={4500}>
//               <Hero />
//               {/* <Hero /> */}
//               {/* Rest of your website sections */}
//             </Loader>
//           }
//         />
//         <Route path="*" element={<NotFound404 />} />
//       </Routes>
//     </LenisProvider>
//   );
// }

// export default App;
































import { Routes, Route } from "react-router-dom";
import NotFound404 from "./pages/NotFound404";
import Hero from "./components/Hero";
import Loader from "./components/Loader";
import { LenisProvider } from "./hooks/useLenis";

import Footer from "./components/Footer";
import PageWrap from "./components/PageWrap";

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
                <Hero />
                {/* Rest of your website sections go here too */}
              </PageWrap>
              <Footer />
            </Loader>
          }
        />
        <Route path="*" element={<NotFound404 />} />
      </Routes>
    </LenisProvider>
  );
}

export default App;