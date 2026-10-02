

// import { createContext, useContext, useEffect, useRef, useState } from 'react';
// import Lenis from 'lenis';
// import gsap from 'gsap';
// import { ScrollTrigger } from 'gsap/ScrollTrigger';

// gsap.registerPlugin(ScrollTrigger);

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

//     // --- ADDED: tell ScrollTrigger to recalc on every Lenis scroll tick ---
//     instance.on('scroll', ScrollTrigger.update);

//     const raf = (time) => {
//       instance.raf(time);
//       rafRef.current = requestAnimationFrame(raf);
//     };
//     rafRef.current = requestAnimationFrame(raf);

//     // --- ADDED: stop GSAP's own lag smoothing from fighting Lenis's easing ---
//     gsap.ticker.lagSmoothing(0);

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


























// import React, { createContext, useContext, useEffect, useState } from 'react';
// import Lenis from 'lenis';
// import gsap from 'gsap';
// import { ScrollTrigger } from 'gsap/ScrollTrigger';

// gsap.registerPlugin(ScrollTrigger);

// const LenisContext = createContext(null);

// export function useLenisInstance() {
//   return useContext(LenisContext);
// }

// export function LenisProvider({ children, options }) {
//   const [lenis, setLenis] = useState(null);

//   useEffect(() => {
//     const instance = new Lenis({
//       duration: 1.8, // Heavy-liquid smooth scroll glide
//       easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential deceleration
//       smoothWheel: true,
//       wheelMultiplier: 0.85,
//       touchMultiplier: 1.5,
//       ...options,
//     });

//     // 1. Notify ScrollTrigger on every Lenis scroll event
//     instance.on('scroll', ScrollTrigger.update);

//     // 2. Drive Lenis updates via GSAP ticker for 100% frame sync
//     const updateLenis = (time) => {
//       instance.raf(time * 1000);
//     };
//     gsap.ticker.add(updateLenis);

//     // 3. Disable lag smoothing to prevent scrubbing stutters
//     gsap.ticker.lagSmoothing(0);

//     setLenis(instance);

//     // 4. Force ScrollTrigger layout recalculation
//     ScrollTrigger.refresh();

//     return () => {
//       gsap.ticker.remove(updateLenis);
//       instance.destroy();
//       setLenis(null);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
// }



























import React, { createContext, useContext, useEffect, useState } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const LenisContext = createContext(null);

export function useLenisInstance() {
  return useContext(LenisContext);
}

export function LenisProvider({ children, options }) {
  const [lenis, setLenis] = useState(null);

  useEffect(() => {
    // 1. Turn off browser's automatic scroll memory globally
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // 2. Reset native window scroll immediately
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const instance = new Lenis({
      duration: 1.8,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.5,
      ...options,
    });

    // 3. Force Lenis to position 0 immediately
    instance.scrollTo(0, { immediate: true });

    instance.on('scroll', ScrollTrigger.update);

    const updateLenis = (time) => {
      instance.raf(time * 1000);
    };
    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    setLenis(instance);

    // 4. Listen for page unload/refresh and reset scroll before browser caches position
    const handleBeforeUnload = () => {
      window.scrollTo(0, 0);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      gsap.ticker.remove(updateLenis);
      instance.destroy();
      setLenis(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}