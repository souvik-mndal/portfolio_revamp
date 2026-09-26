// import { createContext, useContext, useEffect, useRef, useState } from 'react';
// import Lenis from 'lenis';

// /* ==========================================================================
//  *  Shared Lenis instance — one smooth-scroll driver for the whole app,
//  *  independent of route. Mount <LenisProvider> once, above <Routes>.
//  * ========================================================================== */

// const LenisContext = createContext(null);

// /**
//  * Access the shared Lenis instance from any component, e.g.:
//  *   const lenis = useLenisInstance();
//  *   lenis?.scrollTo('#section', { offset: -80 });
//  */
// export function useLenisInstance() {
//   return useContext(LenisContext);
// }

// export function LenisProvider({ children, options }) {
//   const [lenis, setLenis] = useState(null);
//   const rafRef = useRef(null);

//   useEffect(() => {
//     const instance = new Lenis({
//       duration: 1.2,
//       easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
//       smoothWheel: true,
//       wheelMultiplier: 1,
//       touchMultiplier: 1.2,
//       ...options,
//     });

//     const raf = (time) => {
//       instance.raf(time);
//       rafRef.current = requestAnimationFrame(raf);
//     };
//     rafRef.current = requestAnimationFrame(raf);

//     setLenis(instance);

//     return () => {
//       cancelAnimationFrame(rafRef.current);
//       instance.destroy();
//       setLenis(null);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
// }




























import { createContext, useContext, useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ==========================================================================
 *  Shared Lenis instance — one smooth-scroll driver for the whole app,
 *  independent of route. Mount <LenisProvider> once, above <Routes>.
 * ========================================================================== */

const LenisContext = createContext(null);

/**
 * Access the shared Lenis instance from any component, e.g.:
 *   const lenis = useLenisInstance();
 *   lenis?.scrollTo('#section', { offset: -80 });
 */
export function useLenisInstance() {
  return useContext(LenisContext);
}

export function LenisProvider({ children, options }) {
  const [lenis, setLenis] = useState(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const instance = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.2,
      ...options,
    });

    // --- ADDED: tell ScrollTrigger to recalc on every Lenis scroll tick ---
    instance.on('scroll', ScrollTrigger.update);

    const raf = (time) => {
      instance.raf(time);
      rafRef.current = requestAnimationFrame(raf);
    };
    rafRef.current = requestAnimationFrame(raf);

    // --- ADDED: stop GSAP's own lag smoothing from fighting Lenis's easing ---
    gsap.ticker.lagSmoothing(0);

    setLenis(instance);

    return () => {
      cancelAnimationFrame(rafRef.current);
      instance.destroy();
      setLenis(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}