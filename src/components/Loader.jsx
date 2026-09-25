

// import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

// /* ==========================================================================
//  *  <Loader> – game-style loading screen with a signature that writes itself
//  *
//  *  Usage
//  *    <Loader>
//  *      <Hero />            // everything inside renders underneath the loader
//  *      <RestOfSite />      // so its images / videos / fonts really download
//  *    </Loader>
//  *
//  *  What is tracked automatically (inside the children):
//  *    - <img>  (lazy ones are switched to eager so they preload too)
//  *    - <video> / <audio>
//  *    - CSS background-image url(...)
//  *    - web fonts (document.fonts.ready) and the window "load" event
//  *    - anything mounted later while loading (MutationObserver)
//  *
//  *  Props
//  *    assets         extra things to wait for. URLs (images, video, audio, json…)
//  *                   or async functions:  (report) => Promise   (report(0..1) is optional)
//  *                   e.g. [() => import('./Hero'), '/models/scene.glb']
//  *    minDuration    ms. The signature never finishes faster than this, so the
//  *                   sign is always seen being written even on a fast/cached load.  (3030)
//  *    timeout        ms. Safety net so one dead request can't hold the site hostage.
//  *                   Failed requests already count as "done". 0 disables.             (30000)
//  *
//  *  useLoader()  ->  { status: 'loading' | 'revealing' | 'done', revealed, done }
//  *                   Use it to start your hero entrance animation when the curtain lifts.
//  *                   The same value is on <html data-loader="…"> for plain CSS.
//  * ========================================================================== */

// const EXIT_MS = 1000; // curtain slide-up
// const EXIT_EASE = 'cubic-bezier(0.76, 0, 0.24, 1)';
// const FADE_MS = 450; // used instead of the slide when the user prefers reduced motion
// const HOLD_MS = 350; // pause on 100% so the last stroke of the signature lands
// const QUIET_MS = 250; // no newly discovered assets for this long before we call it done
// const LINEAR_SPEED = 0.33; // 33% per second linear speed (~3.03s total duration)

// const LoaderContext = createContext({ status: 'done', revealed: true, done: true });
// export const useLoader = () => useContext(LoaderContext);

// const prefersReducedMotion = () =>
//   typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// /* ---------------------------------------------------------------------------
//  *  Asset tracker – the part that actually looks at what has loaded
//  * ------------------------------------------------------------------------- */

// const IMAGE_RE = /\.(avif|bmp|gif|ico|jpe?g|png|svg|webp)(?:[?#]|$)/i;
// const MEDIA_RE = /\.(aac|m4a|m4v|mov|mp3|mp4|oga|ogg|ogv|wav|webm)(?:[?#]|$)/i;
// const VIDEO_RE = /\.(m4v|mov|mp4|ogv|webm)(?:[?#]|$)/i;

// function createTracker({ root, assets, timeout }) {
//   const tasks = new Map(); // key -> { p: 0..1, label }
//   const seenEls = new WeakSet();
//   const seenUrls = new Set();
//   const cleanups = [];
//   const hold = []; // keeps detached preload elements alive
//   const startedAt = performance.now();
//   let lastAdd = startedAt;
//   let warned = false;
//   let dead = false;

//   const abs = (u) => {
//     try { return new URL(u, document.baseURI).href; } catch { return u; }
//   };
//   const add = (key, label) => {
//     if (tasks.has(key)) return false;
//     tasks.set(key, { p: 0, label });
//     lastAdd = performance.now();
//     return true;
//   };
//   const progress = (key, p) => {
//     const t = tasks.get(key);
//     if (t && p > t.p) t.p = Math.min(1, p);
//   };
//   const finish = (key) => progress(key, 1);
//   const listen = (el, type, fn) => {
//     el.addEventListener(type, fn, { once: true });
//     cleanups.push(() => el.removeEventListener(type, fn));
//   };
//   const decoded = (img) =>
//     typeof img.decode === 'function' ? img.decode().catch(() => {}) : Promise.resolve();

//   function preloadImage(url) {
//     if (!url || url.startsWith('data:') || seenUrls.has(url)) return;
//     seenUrls.add(url);
//     add(url, url);
//     const img = new Image();
//     hold.push(img);
//     img.onload = () => decoded(img).then(() => finish(url));
//     img.onerror = () => {
//       console.warn('[Loader] failed to load', url);
//       finish(url);
//     };
//     img.src = url;
//   }

//   function preloadMedia(url) {
//     if (seenUrls.has(url)) return;
//     seenUrls.add(url);
//     add(url, url);
//     const el = document.createElement(VIDEO_RE.test(url) ? 'video' : 'audio');
//     hold.push(el);
//     el.preload = 'auto';
//     el.muted = true;
//     el.addEventListener('canplay', () => finish(url), { once: true });
//     el.addEventListener('error', () => { console.warn('[Loader] failed to load', url); finish(url); }, { once: true });
//     el.src = url;
//   }

//   function trackImg(img) {
//     if (seenEls.has(img)) return;
//     seenEls.add(img);
//     if (!img.getAttribute('src') && !img.getAttribute('srcset') && !img.currentSrc) return;
//     add(img, img.currentSrc || img.getAttribute('src') || 'img');
//     if (img.loading === 'lazy') img.loading = 'eager'; // below-the-fold images must preload too
//     const ok = () => finish(img);
//     const fail = () => {
//       console.warn('[Loader] failed to load', img.currentSrc || img.getAttribute('src'));
//       finish(img);
//     };
//     if (typeof img.decode === 'function') img.decode().then(ok, fail);
//     else if (img.complete) ok();
//     else { listen(img, 'load', ok); listen(img, 'error', fail); }
//   }

//   function trackMedia(el) {
//     if (seenEls.has(el)) return;
//     seenEls.add(el);
//     if (el.preload === 'none') return; // the author asked for lazy media
//     if (!el.getAttribute('src') && !el.querySelector('source')) return;
//     if (el.poster) preloadImage(abs(el.poster));
//     add(el, el.currentSrc || el.getAttribute('src') || 'media');
//     if (el.preload !== 'auto') el.preload = 'auto';
//     if (el.readyState >= 3) return finish(el);
//     listen(el, 'canplay', () => finish(el));
//     listen(el, 'error', () => finish(el));
//   }

//   function trackBackgrounds(scope) {
//     const nodes = [scope, ...Array.from(scope.querySelectorAll?.('*') ?? []).slice(0, 4000)];
//     for (const n of nodes) {
//       if (n.nodeType !== 1) continue;
//       let bg = '';
//       try { bg = getComputedStyle(n).backgroundImage; } catch { /* ignore */ }
//       if (!bg || bg === 'none') continue;
//       for (const m of bg.matchAll(/url\((["']?)(.*?)\1\)/g)) preloadImage(abs(m[2]));
//     }
//   }

//   function scan(scope) {
//     if (scope.matches?.('img')) trackImg(scope);
//     else if (scope.matches?.('video,audio')) trackMedia(scope);
//     scope.querySelectorAll?.('img').forEach(trackImg);
//     scope.querySelectorAll?.('video,audio').forEach(trackMedia);
//     trackBackgrounds(scope);
//   }

//   /* fonts + window load ---------------------------------------------------- */
//   add('fonts', 'fonts');
//   if (document.fonts?.ready) {
//     // two frames so the first layout has already asked for the fonts it needs
//     requestAnimationFrame(() =>
//       requestAnimationFrame(() => document.fonts.ready.then(() => !dead && finish('fonts')))
//     );
//   } else finish('fonts');

//   add('window', 'window load');
//   if (document.readyState === 'complete') finish('window');
//   else {
//     const onLoad = () => finish('window');
//     window.addEventListener('load', onLoad, { once: true });
//     cleanups.push(() => window.removeEventListener('load', onLoad));
//   }

//   /* the page itself + anything that mounts while we are loading ------------ */
//   let observer = null;
//   if (root) {
//     scan(root);
//     observer = new MutationObserver((muts) => {
//       for (const m of muts) m.addedNodes.forEach((n) => n.nodeType === 1 && scan(n));
//     });
//     observer.observe(root, { childList: true, subtree: true });
//   }

//   /* extra assets passed by the developer ----------------------------------- */
//   assets.forEach((a, i) => {
//     if (typeof a === 'function') {
//       const key = `task:${i}`;
//       add(key, a.name || key);
//       Promise.resolve()
//         .then(() => a((p) => progress(key, Math.min(p, 0.99))))
//         .catch((e) => console.warn('[Loader] asset task failed', e))
//         .finally(() => finish(key));
//     } else if (typeof a === 'string') {
//       const url = abs(a);
//       if (IMAGE_RE.test(a)) preloadImage(url);
//       else if (MEDIA_RE.test(a)) preloadMedia(url);
//       else if (!seenUrls.has(url)) {
//         seenUrls.add(url);
//         add(url, url);
//         fetch(url)
//           .then((r) => {
//             if (!r.ok) console.warn('[Loader] failed to load', url, r.status);
//             return r.blob();
//           })
//           .catch((e) => console.warn('[Loader] failed to load', url, e))
//           .finally(() => finish(url));
//       }
//     }
//   });

//   return {
//     /** real progress 0..1 and whether we are truly finished */
//     read(now) {
//       let sum = 0;
//       const pending = [];
//       tasks.forEach((t) => {
//         sum += t.p;
//         if (t.p < 1) pending.push(t.label);
//       });
//       const timedOut = timeout > 0 && now - startedAt > timeout;
//       if (timedOut && pending.length && !warned) {
//         warned = true;
//         console.warn('[Loader] timed out, continuing without:', pending);
//       }
//       const settled = timedOut || (pending.length === 0 && now - lastAdd >= QUIET_MS);
//       return { target: settled ? 1 : Math.min(sum / tasks.size, 0.99), settled, pending };
//     },
//     destroy() {
//       dead = true;
//       observer?.disconnect();
//       cleanups.forEach((fn) => fn());
//     },
//   };
// }

// /* ---------------------------------------------------------------------------
//  *  The loading screen (signature + bar). Per-frame work writes straight to the
//  *  DOM, so the page underneath is never re-rendered while it animates.
//  * ------------------------------------------------------------------------- */

// function Overlay({ contentRef, assets, minDuration, timeout, exiting, reduced, onReady }) {
//   const pathRef = useRef(null);
//   const fillRef = useRef(null);
//   const pctRef = useRef(null);
//   const barRef = useRef(null);
//   const metaRef = useRef(null);
//   const latest = useRef({ assets, minDuration, timeout, onReady });
//   latest.current = { assets, minDuration, timeout, onReady };

//   useEffect(() => {
//     const { assets: list, minDuration: minMs, timeout: limit } = latest.current;
//     const tracker = createTracker({ root: contentRef.current, assets: list, timeout: limit });
//     const t0 = performance.now();
//     let last = t0;
//     let shown = 0;
//     let shownInt = -1;
//     let raf = 0;
//     let holdTimer = 0;

//     const paint = (v) => {
//       fillRef.current.style.transform = `scaleX(${v})`;
//       pathRef.current.style.strokeDashoffset = String(1000 * (1 - v));
//       const n = Math.round(v * 100);
//       if (n !== shownInt) {
//         shownInt = n;
//         pctRef.current.textContent = `${n}%`;
//         barRef.current.setAttribute('aria-valuenow', String(n));
//       }
//     };

//     const tick = (now) => {
//       const dt = Math.min(0.1, (now - last) / 1000);
//       last = now;
//       const { target } = tracker.read(now);

//       // Linear pace ramp prevents instant jump to high initial percentages
//       const timeCap = minMs > 0 ? (now - t0) / minMs : 1;
//       const goal = Math.min(target, timeCap);

//       if (goal > shown) {
//         // Step forward at 33% per second maximum
//         shown = Math.min(goal, shown + LINEAR_SPEED * dt);
//         if (goal >= 1 && 1 - shown < 0.002) shown = 1;
//       }

//       paint(shown);

//       if (shown >= 1) {
//         holdTimer = window.setTimeout(() => {
//           if (metaRef.current) metaRef.current.style.opacity = '0';
//           latest.current.onReady();
//         }, HOLD_MS);
//         return;
//       }
//       raf = requestAnimationFrame(tick);
//     };
//     raf = requestAnimationFrame(tick);

//     return () => {
//       cancelAnimationFrame(raf);
//       clearTimeout(holdTimer);
//       tracker.destroy();
//     };
//   }, [contentRef]);

//   const exitStyle = reduced
//     ? { opacity: exiting ? 0 : 1, transition: `opacity ${FADE_MS}ms ease` }
//     : {
//         transform: exiting ? 'translateY(-100%)' : 'translateY(0)',
//         transition: `transform ${EXIT_MS}ms ${EXIT_EASE}`,
//         willChange: 'transform',
//       };

//   return (
//     <div
//       className="fixed inset-0 z-[9999] bg-[#121212] flex flex-col justify-center items-center overflow-hidden select-none"
//       style={exitStyle}
//     >
//       <div className="relative w-full max-w-lg px-8 flex flex-col items-center">
//         {/* Signature – drawn in step with the real progress */}
//         <svg
//           viewBox="0 0 1330.2 636.6"
//           className="w-full h-auto max-h-[60vh] drop-shadow-[0_0_12px_rgba(245,245,220,0.15)]"
//           fill="none"
//           xmlns="http://www.w3.org/2000/svg"
//           role="img"
//           aria-label="Signature being written"
//         >
//           <path
//             ref={pathRef}
//             d={SIGNATURE_PATH}
//             stroke="#F5F5DC"
//             strokeWidth="8"
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             pathLength="1000"
//             style={{ strokeDasharray: 1000, strokeDashoffset: 1000 }}
//           />
//         </svg>

//         {/* Progress bar + percentage */}
//         <div ref={metaRef} className="mt-10 w-full" style={{ transition: 'opacity 250ms ease' }}>
//           <div
//             ref={barRef}
//             role="progressbar"
//             aria-label="Loading"
//             aria-valuemin={0}
//             aria-valuemax={100}
//             aria-valuenow={0}
//             className="h-[2px] w-full bg-[#F5F5DC]/15"
//           >
//             <div
//               ref={fillRef}
//               className="h-full w-full origin-left bg-[#F5F5DC] shadow-[0_0_10px_rgba(245,245,220,0.45)]"
//               style={{ transform: 'scaleX(0)' }}
//             />
//           </div>
//           <p
//             ref={pctRef}
//             className="mt-3 -mr-[0.3em] text-right text-[#F5F5DC]/60 text-xs tracking-[0.3em] font-mono tabular-nums"
//           >
//             0%
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }

// /* ---------------------------------------------------------------------------
//  *  Public component
//  * ------------------------------------------------------------------------- */

// export default function Loader({ children, assets = [], minDuration = 3030, timeout = 30000 }) {
//   const [status, setStatus] = useState('loading'); // loading -> revealing -> done
//   const [reduced] = useState(prefersReducedMotion);
//   const contentRef = useRef(null);

//   // expose the state to CSS and keep the hidden page out of the tab order
//   useEffect(() => {
//     document.documentElement.dataset.loader = status;
//     contentRef.current?.toggleAttribute('inert', status === 'loading');
//   }, [status]);

//   // no scrolling behind the loader
//   const finished = status === 'done';
//   useEffect(() => {
//     if (finished) return undefined;
//     const html = document.documentElement;
//     const previous = html.style.overflow;
//     html.style.overflow = 'hidden';
//     return () => { html.style.overflow = previous; };
//   }, [finished]);

//   // remove the overlay once the curtain has left the screen
//   useEffect(() => {
//     if (status !== 'revealing') return undefined;
//     const t = setTimeout(() => setStatus('done'), (reduced ? FADE_MS : EXIT_MS) + 60);
//     return () => clearTimeout(t);
//   }, [status, reduced]);

//   const ctx = useMemo(
//     () => ({ status, revealed: status !== 'loading', done: status === 'done' }),
//     [status]
//   );

//   return (
//     <LoaderContext.Provider value={ctx}>
//       {/* the page renders right away (hidden under the overlay) so its assets load */}
//       <div ref={contentRef} style={{ display: 'contents' }}>
//         {children}
//       </div>
//       {status !== 'done' && (
//         <Overlay
//           contentRef={contentRef}
//           assets={assets}
//           minDuration={minDuration}
//           timeout={timeout}
//           exiting={status === 'revealing'}
//           reduced={reduced}
//           onReady={() => setStatus('revealing')}
//         />
//       )}
//     </LoaderContext.Provider>
//   );
// }

// /* Your signature (single continuous stroke) */
// const SIGNATURE_PATH = `M118.87 548.98 C121.96 546.06 125.25 543.37 128.34 540.45 C132.68 536.33 136.85 532 141.08 527.77
//   C143.62 525.23 146.43 522.77 148.57 519.87 C152.13 515.05 152.2 508.91 156.11 503.99
//   C160.8 498.1 166.32 492.96 171.21 487.25 C184.67 471.51 198.04 455.72 211.38 439.89
//   C217.63 432.45 223.96 425.06 230.36 417.75 C233.58 414.08 236.86 410.49 239.99 406.74
//   C252.09 392.21 263.57 377.22 275.18 362.31 C277.91 358.81 280.42 355.15 283.06 351.58
//   C285.33 348.51 287.73 345.53 289.97 342.44 C292.74 338.62 295.34 334.66 298.04 330.78
//   C300.02 327.92 302.17 325.18 304.12 322.3 C306.76 318.43 309.17 314.39 311.65 310.42
//   C317.69 300.76 325.45 288.34 328.23 277.29 C329.72 271.37 332.58 259.53 329.58 254.01
//   C327.73 250.62 322.72 248.19 319.4 246.42 C311.67 242.29 311.25 243.99 304 242.56
//   C301.86 242.14 299.9 241.18 297.79 240.65 C292.39 239.29 285.28 240.63 280.05 242.36
//   C276.55 243.52 273.23 245.22 269.85 246.7 C244.55 257.79 220.73 273 198.52 289.35
//   C194.93 291.99 191.45 294.79 187.85 297.39 C185.55 299.04 183.12 300.51 180.83 302.18
//   C176.7 305.19 172.72 308.45 168.77 311.69 C162.41 316.9 156.61 322.58 150.59 328.15
//   C148.44 330.14 146.14 331.96 143.99 333.96 C139.13 338.49 134.52 343.33 129.82 348.03
//   C125.36 352.49 120.75 356.85 116.48 361.5 C114.72 363.42 113.09 365.45 111.34 367.37
//   C109.57 369.32 107.72 371.18 106 373.16 C103.46 376.09 101.07 379.15 98.51 382.06
//   C97.02 383.75 95.45 385.38 93.68 386.79 C92.46 387.76 90.92 388.51 89.9 389.71
//   C88.83 390.97 87.93 395.21 86.25 397.81 C84.36 400.74 82.1 403.41 80.12 406.27
//   C77.63 409.86 75.38 413.64 73.07 417.35 C71.42 420 69.71 422.61 68.17 425.32
//   C67.09 427.2 66.17 429.16 65.08 431.04 C63.83 433.21 62.37 435.23 61.14 437.41
//   C59.61 440.09 58.48 442.97 57.18 445.77 C51.22 458.49 48.84 466.34 50.03 480.67
//   C51 492.36 59.5 501.6 67.38 509.49 C71.58 513.69 75.65 518.14 80.21 521.96
//   C85.04 526.01 90.44 529.4 95.7 532.86 C99.85 535.59 106.5 540.04 111.21 541.28
//   C115.88 542.52 121.12 541.98 125.92 541.98 C126.61 544.11 127.16 546.51 128.28 548.46
//   C131.59 554.24 141.35 558.73 146.95 562.38 C162.26 572.38 180.04 581.93 194.17 593.23
//   C198.57 596.74 208.91 605.69 210.98 610.59 C211.65 612.19 211.61 613.65 211.87 615.35
//   C210.14 616.77 209.59 617.58 207.45 618.5 C202.27 620.75 196.4 620.81 190.91 621.8
//   C185.97 622.69 181.06 623.76 176.12 624.72 C171.68 625.59 167.27 625.84 162.79 626.32
//   C158.33 626.8 153.86 627.43 149.39 627.78 C144.77 628.15 140.1 627.98 135.47 627.98
//   C131.16 627.98 126.83 628.11 122.52 627.86 C119.95 627.71 117.4 627.3 114.83 627.13
//   C111.21 626.89 107.59 627.06 103.98 626.76 C98.25 626.28 92.6 625.34 86.92 624.48
//   C84.4 624.1 81.85 623.95 79.34 623.47 C76.9 623 74.54 622.2 72.13 621.57
//   C65.82 619.91 59.51 618.36 53.3 616.33 C49.78 615.19 46.42 613.63 43 612.24
//   C30.41 607.11 25.07 603.98 16.1 593.58 C12.02 588.84 5.58 583.61 10.29 576.97
//   C12.52 573.83 18.94 567.31 22.46 565.93 C24.25 565.22 26.18 565.09 28.09 565.03
//   C34 564.85 38.32 566.18 43.89 567.83 C47.46 568.89 51.01 569.86 54.33 571.59
//   C62.4 575.77 70.16 580.77 77.1 586.63 C79.36 588.53 81.45 590.61 83.63 592.6
//   C97.69 605.33 112.48 618.42 132.38 619.62 C136.25 619.85 140.78 619.33 144.25 617.49
//   C150.62 614.1 160.25 601.62 164.73 595.62 C168.27 590.87 171.86 586.03 174.19 580.54
//   C174.79 579.12 175.27 577.65 175.87 576.23 C176.71 574.25 177.75 572.35 178.58 570.35
//   C179.69 567.67 180.34 564.74 181.79 562.21 C182.35 561.23 182.98 560.91 183.72 559.98
//   C184.53 560.17 185.38 560.2 186.19 560.39 C190.92 561.49 194.2 565.91 198.33 568.17
//   C202.26 570.31 206.75 570.92 211.17 570.93 C221.95 570.97 232.07 565.92 240.27 559.17
//   C244.04 556.08 247.5 552.65 251.3 549.58 C261.01 541.72 271.71 534.94 283.24 530.12
//   C292.05 526.45 301.08 523.29 309.98 519.85 C312.57 518.84 315.05 517.6 317.63 516.58
//   C320.21 515.56 322.89 514.81 325.48 513.8 C329.5 512.23 333.39 510.38 337.34 508.65
//   C341.85 506.67 346.45 504.86 350.88 502.7 C354.23 501.07 357.42 499.18 360.69 497.41
//   C363.14 496.07 365.65 494.85 368.03 493.4 C373.91 489.79 379.56 485.49 384.98 481.22
//   C401.63 468.1 420.64 447.38 432.9 430.04 C434.71 427.48 436.23 424.75 437.88 422.1
//   C439.86 418.9 441.98 415.78 444.11 412.68 C453.53 398.95 462.92 385.22 471.82 371.16
//   C474.49 366.94 477.07 362.46 480.35 358.69 C483.15 355.48 486.5 352.74 488.97 349.26
//   C491.14 346.2 492.09 342.52 494.15 339.4 C495.89 336.76 498.49 334.68 499.78 331.74
//   C501.06 328.84 500.87 325.54 501.62 322.5 C502.22 320.1 503.25 317.84 504.05 315.5
//   C504.84 313.16 505.4 310.75 506.34 308.45 C508.01 304.37 511.09 301.15 512.84 297.15
//   C513.96 294.6 514.49 291.83 515.43 289.22 C517.62 283.15 520.21 277.18 522.65 271.21
//   C524.86 265.81 527.14 260.39 529.61 255.09 C531.43 251.18 533.41 247.34 535.16 243.39
//   C537.52 238.03 539.61 232.57 542.26 227.33 C544.21 223.46 546.73 219.87 548.81 216.04
//   C549.18 216.74 549.44 217.49 549.81 218.19 C551.81 221.98 553.5 223.13 553.74 227.85
//   C554.14 235.82 550.32 243.01 546.79 249.89 C541.25 260.71 534.89 271 528.39 281.27
//   C526.55 284.19 524.93 287.26 522.7 289.91 C518.06 295.4 511.9 299.76 507.91 305.79
//   C505.82 308.95 505.08 312.58 503.84 316.1 C503.12 318.13 502.27 320.12 501.64 322.19
//   C500.84 324.85 500.42 327.65 499.24 330.19 C497.66 333.6 495.01 336.35 493.47 339.8
//   C488.67 350.5 485.63 361.95 482.06 373.08 C477.06 388.69 471.7 404.26 468.01 420.26
//   C466.54 426.64 464.89 432.98 463.45 439.37 C461.79 446.71 460.4 454.13 458.97 461.51
//   C458.03 466.36 456.04 475.51 458.55 479.86 C459.57 481.62 461.01 482.63 462.46 483.98
//   C466.31 481.62 469.83 479 473.01 475.74 C476.15 472.53 478.52 468.7 481.31 465.2
//   C484.74 460.91 488.39 456.8 491.92 452.6 C494.2 449.88 496.33 447.05 498.68 444.4
//   C501.52 441.19 504.73 438.33 507.48 435.04 C509.32 432.84 510.95 430.47 512.71 428.21
//   C518.54 420.68 524.26 413.06 529.67 405.23 C533.06 400.32 536.28 395.29 539.64 390.36
//   C544.61 383.08 549.68 375.86 554.63 368.57 C557.63 364.16 560.43 359.63 563.4 355.2
//   C565.34 352.32 567.59 349.64 569.49 346.73 C570.85 344.64 571.95 342.41 573.24 340.28
//   C575.35 336.8 577.64 333.44 579.79 329.99 C581.1 327.87 582.31 325.69 583.68 323.6
//   C587.28 318.08 591.03 312.63 594.76 307.19 C596.18 305.11 597.71 303.1 599.07 300.98
//   C600.75 298.36 601.81 295.4 603.58 292.85 C606.61 288.5 615.3 280.56 619.44 276.42
//   C624.38 271.47 629.24 266.42 634.3 261.61 C636.91 259.14 639.73 256.92 642.34 254.45
//   C645.71 251.25 648.87 247.83 652.29 244.68 C659.04 238.47 663.29 236.51 668.87 228.65
//   C667.94 229.51 666.63 231.08 665.58 232.19 C663.55 234.35 661.45 236.45 659.3 238.48
//   C656.93 240.73 654.37 242.75 651.99 244.97 C648.58 248.13 645.42 251.55 642.03 254.74
//   C639.89 256.74 637.6 258.57 635.44 260.55 C632.26 263.46 629.32 266.63 626.19 269.59
//   C623.81 271.83 621.25 273.85 618.87 276.07 C614.04 280.59 609.72 285.74 604.62 289.95
//   C601.46 292.55 597.65 294.09 594.28 296.39 C585.94 302.07 577.85 308.12 569.48 313.77
//   C565.05 316.75 560.62 319.72 556.17 322.67 C554.08 324.06 552.09 325.61 549.9 326.85
//   C547.22 328.38 544.33 329.52 541.62 331 C538.36 332.79 535.17 334.67 531.75 336.13
//   C526.05 338.55 516.14 342.2 510.06 340.24 C508.26 339.67 506.71 338.57 505.4 337.23
//   C501.2 332.94 501.24 325.59 502.6 320.07 C503.19 317.68 504.12 315.36 504.83 313
//   C506.3 308.11 508.59 302.65 514.13 301.44 C521.17 299.9 525.83 304.65 530.64 308.95
//   C533.1 311.15 535.37 313.55 537.82 315.76 C540.24 317.95 542.77 320 545.12 322.27
//   C549.64 326.63 553.85 331.36 558.7 335.37 C561.18 337.41 563.79 339.28 566.18 341.44
//   C569.12 344.1 571.8 347.02 574.79 349.62 C577.22 351.73 579.79 353.68 582.26 355.74
//   C588.44 360.92 594.64 366.07 600.85 371.21 C604.85 374.52 608.68 378.02 612.65 381.35
//   C617.05 385.05 621.75 388.33 626.32 391.81 C630.15 394.71 633.89 397.75 637.58 400.83
//   C650.96 411.96 672.55 431.42 688.55 437.12 C702.04 441.93 706.68 435.34 713.81 425.02
//   C718.77 417.85 723.74 410.55 727.7 402.77 C729.52 399.2 731.05 395.49 732.7 391.84
//   C736.66 383.12 739.63 374.05 742.91 365.07 C744.39 361.02 746.09 357.05 747.51 352.98
//   C750.27 345.1 752.58 337.08 755.19 329.16 C756.83 324.18 758.8 319.31 760.49 314.35
//   C761.79 310.55 762.8 306.66 764.1 302.85 C765.09 299.92 766.18 297.04 767.09 294.09
//   C768.54 289.38 769.72 284.52 771.72 280 C773.83 275.22 777.45 271.05 779.1 266.06
//   C779.8 263.96 779.94 261.73 780.3 259.56 C780.91 255.83 781.81 252.15 782.34 248.4
//   C782.74 245.52 782.84 242.62 783.13 239.73 C783.49 236 783.61 231.97 784.65 228.36
//   C785.33 225.97 786.58 223.83 787.51 221.55 C789.5 216.64 790.62 207.54 789.49 202.35
//   C789.31 201.56 789.01 200.8 788.84 200.01 C787.54 201.52 786.22 202.86 785.19 204.57
//   C783.34 207.64 782.95 211.66 780.52 214.35 C778.44 216.64 775.22 217.12 772.72 218.78
//   C769.03 221.22 766.36 225.15 763.97 228.79 C762.61 230.87 761.44 233.07 760.14 235.2
//   C758.67 237.59 757.08 239.91 755.73 242.37 C751.88 249.35 747.7 259.37 744.97 266.91
//   C743.92 269.82 743.09 272.8 742.07 275.71 C740.96 278.92 739.58 282.02 738.56 285.26
//   C737.72 287.92 737.08 290.64 736.24 293.3 C734.29 299.48 731.66 305.42 729.73 311.6
//   C726.93 320.58 725.12 329.72 723.28 338.93 C722.36 343.55 721.33 348.16 720.56 352.8
//   C720.03 356 719.95 359.21 719.68 362.44 C719.16 368.64 718.5 374.81 719.01 381.05
//   C719.65 388.9 722.78 388.26 720.87 397.52 C722.51 393.53 724.37 389.63 725.97 385.63
//   C728.5 379.34 730.73 372.93 733.09 366.58 C736.2 358.2 739.39 349.85 742.36 341.42
//   C744.11 336.46 745.45 331.37 747.18 326.41 C755.22 303.37 763.03 280.24 769.78 256.78
//   C770.9 252.89 771.75 248.94 772.82 245.04 C773.82 241.42 775.23 238.03 777.3 234.89
//   C778.32 233.36 779.4 231.89 780.09 230.17 C780.7 228.65 780.95 227.01 781.3 225.41
//   C782.03 228.37 783.05 231.4 783.29 234.44 C783.44 236.31 783.22 238.17 783.07 240.03
//   C782.87 242.61 782.77 245.19 782.44 247.76 C781.75 253.1 780.63 258.38 779.96 263.73
//   C779.32 268.86 779.07 274 778.52 279.13 C778.03 283.59 777.27 288.03 777 292.5
//   C776.74 296.79 777.01 301.09 776.68 305.37 C776.48 307.94 776.06 310.48 775.99 313.06
//   C775.85 318.54 777.54 333.5 779.4 338.53 C780.15 340.57 781.28 342.18 782.44 343.98
//   C783.57 343.78 784.56 343.82 785.65 343.52 C789.47 342.43 792.64 339.58 794.68 336.23
//   C795.64 334.64 796.32 332.9 797.28 331.31 C799.23 328.08 801.7 325.21 803.6 321.93
//   C807.52 315.21 811.53 308.56 815.4 301.82 C817.26 298.59 819.25 295.45 820.77 292.04
//   C821.91 289.51 822.89 286.92 824.01 284.38 C826.14 279.58 828.43 274.88 830.74 270.17
//   C831.96 267.69 833.06 265.13 834.66 262.86 C835.88 261.12 837.33 259.85 838.87 258.43
//   C842.32 268.71 841.1 271.22 842.62 280.87 C843.79 288.27 846 295.38 848.85 302.29
//   C850.91 307.3 852.87 311.15 856.9 314.9 C858.05 315.97 859.28 317.01 860.71 317.67
//   C865.04 319.65 872.8 317.75 876.69 315.32 C878.89 313.95 880.7 312.07 882.64 310.37
//   C886.23 307.23 890.35 304.84 894.16 301.99 C896.2 300.47 898.08 298.71 900.26 297.38
//   C902.65 295.93 905.33 295.1 907.65 293.51 C911.37 290.95 914.36 287.48 918.08 284.9
//   C924.02 280.77 934.4 274.71 941.62 274.15 C945.48 273.85 949.32 274.49 953.13 275.02
//   C962.62 276.34 972.53 276.88 981.58 273.19 C996.19 267.22 1006.09 254.97 1015.38 242.76
//   C1019.55 237.27 1021.76 233.8 1027.2 229.31 C1033.67 234.23 1036.51 237.6 1044.47 240.73
//   C1061.56 247.45 1083.43 245.54 1100.69 240.11 C1110.2 237.12 1125.58 230.21 1134.75 225.76
//   C1144.16 221.2 1153.05 214.39 1161.5 208.26 C1167.93 203.59 1174.44 199.01 1180.57 193.94
//   C1184.83 190.42 1188.91 186.68 1193.04 183 C1197.65 178.89 1202.37 174.88 1206.95 170.73
//   C1208.91 168.96 1210.75 167.07 1212.71 165.3 C1214.88 163.33 1217.17 161.5 1219.3 159.49
//   C1226.79 152.4 1233.94 144.91 1241.24 137.61 C1246.41 132.44 1251.73 127.38 1256.73 122.03
//   C1261.63 116.8 1266.22 111.26 1271.06 105.97 C1275.34 101.28 1280.73 98.44 1283.99 94.47
//   C1285.79 92.29 1286.91 89.72 1288.26 87.27 C1290.32 83.54 1292.72 79.64 1295.54 76.45
//   C1297.6 74.12 1300.23 72.41 1302.47 70.27 C1307.63 65.31 1315.29 55.35 1318.22 48.85
//   C1320.36 44.1 1322 38.74 1321.55 33.48 C1321.34 31.08 1320.77 28.76 1320.74 26.34
//   C1320.65 20.43 1320.87 14.51 1320.87 8.6 C1320.87 12.07 1321.16 15.75 1320.34 19.15
//   C1319.76 21.57 1318.38 23.67 1317.32 25.89 C1315.99 28.68 1314.85 31.54 1313.44 34.28
//   C1309.62 41.72 1305.38 48.89 1301.87 56.49 C1300.09 60.36 1298.08 64.32 1296.79 68.39
//   C1295.95 71.07 1295.76 73.91 1294.68 76.52 C1293.37 79.68 1291.16 82.41 1289.39 85.32
//   C1287.33 88.73 1285.64 92.46 1284.2 96.17 C1282.62 100.22 1281.85 104.56 1280.8 108.77
//   C1278.61 117.55 1276.45 126.32 1274.49 135.15 C1271.9 146.83 1269.45 158.63 1268.15 170.53
//   C1267.45 176.99 1267.16 183.46 1266.72 189.94 C1266.55 192.51 1266.14 195.06 1265.99 197.63
//   C1265.85 199.93 1265.88 202.23 1265.74 204.53 C1265.56 207.43 1265.09 210.3 1264.96 213.2
//   C1264.79 216.84 1264.96 220.49 1264.76 224.12 C1264.59 227.35 1264.06 230.55 1263.94 233.78
//   C1263.77 238.08 1264 242.4 1263.73 246.7 C1263.55 249.6 1263.08 252.47 1262.95 255.37
//   C1262.76 259.68 1263 263.99 1262.75 268.29 C1262.38 274.73 1261.55 281.16 1261.06 287.59
//   C1260.78 291.2 1260.96 294.82 1260.68 298.43 C1260.35 302.57 1259.69 306.7 1259.22 310.83
//   C1258.93 313.39 1258.78 315.96 1258.47 318.52 C1257.48 326.68 1256.2 334.88 1254.76 342.98
//   C1253.62 349.47 1252.14 355.91 1250.87 362.37`;





















































// import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

// /* ==========================================================================
//  *  <Loader> – game-style loading screen with a signature that writes itself
//  * ========================================================================== */

// const FADE_MS = 450;
// const HOLD_MS = 700;
// const QUIET_MS = 250;
// const LINEAR_SPEED = 0.33; // 33% per second linear speed (~3.03s total duration)

// const LoaderContext = createContext({ status: 'done', revealed: true, done: true });
// export const useLoader = () => useContext(LoaderContext);

// const prefersReducedMotion = () =>
//   typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// /* ---------------------------------------------------------------------------
//  *  Asset tracker
//  * ------------------------------------------------------------------------- */

// const IMAGE_RE = /\.(avif|bmp|gif|ico|jpe?g|png|svg|webp)(?:[?#]|$)/i;
// const MEDIA_RE = /\.(aac|m4a|m4v|mov|mp3|mp4|oga|ogg|ogv|wav|webm)(?:[?#]|$)/i;
// const VIDEO_RE = /\.(m4v|mov|mp4|ogv|webm)(?:[?#]|$)/i;

// function createTracker({ root, assets, timeout }) {
//   const tasks = new Map();
//   const seenEls = new WeakSet();
//   const seenUrls = new Set();
//   const cleanups = [];
//   const hold = [];
//   const startedAt = performance.now();
//   let lastAdd = startedAt;
//   let warned = false;
//   let dead = false;

//   const abs = (u) => {
//     try { return new URL(u, document.baseURI).href; } catch { return u; }
//   };
//   const add = (key, label) => {
//     if (tasks.has(key)) return false;
//     tasks.set(key, { p: 0, label });
//     lastAdd = performance.now();
//     return true;
//   };
//   const progress = (key, p) => {
//     const t = tasks.get(key);
//     if (t && p > t.p) t.p = Math.min(1, p);
//   };
//   const finish = (key) => progress(key, 1);
//   const listen = (el, type, fn) => {
//     el.addEventListener(type, fn, { once: true });
//     cleanups.push(() => el.removeEventListener(type, fn));
//   };
//   const decoded = (img) =>
//     typeof img.decode === 'function' ? img.decode().catch(() => {}) : Promise.resolve();

//   function preloadImage(url) {
//     if (!url || url.startsWith('data:') || seenUrls.has(url)) return;
//     seenUrls.add(url);
//     add(url, url);
//     const img = new Image();
//     hold.push(img);
//     img.onload = () => decoded(img).then(() => finish(url));
//     img.onerror = () => {
//       console.warn('[Loader] failed to load', url);
//       finish(url);
//     };
//     img.src = url;
//   }

//   function preloadMedia(url) {
//     if (seenUrls.has(url)) return;
//     seenUrls.add(url);
//     add(url, url);
//     const el = document.createElement(VIDEO_RE.test(url) ? 'video' : 'audio');
//     hold.push(el);
//     el.preload = 'auto';
//     el.muted = true;
//     el.addEventListener('canplay', () => finish(url), { once: true });
//     el.addEventListener('error', () => { console.warn('[Loader] failed to load', url); finish(url); }, { once: true });
//     el.src = url;
//   }

//   function trackImg(img) {
//     if (seenEls.has(img)) return;
//     seenEls.add(img);
//     if (!img.getAttribute('src') && !img.getAttribute('srcset') && !img.currentSrc) return;
//     add(img, img.currentSrc || img.getAttribute('src') || 'img');
//     if (img.loading === 'lazy') img.loading = 'eager';
//     const ok = () => finish(img);
//     const fail = () => {
//       console.warn('[Loader] failed to load', img.currentSrc || img.getAttribute('src'));
//       finish(img);
//     };
//     if (typeof img.decode === 'function') img.decode().then(ok, fail);
//     else if (img.complete) ok();
//     else { listen(img, 'load', ok); listen(img, 'error', fail); }
//   }

//   function trackMedia(el) {
//     if (seenEls.has(el)) return;
//     seenEls.add(el);
//     if (el.preload === 'none') return;
//     if (!el.getAttribute('src') && !el.querySelector('source')) return;
//     if (el.poster) preloadImage(abs(el.poster));
//     add(el, el.currentSrc || el.getAttribute('src') || 'media');
//     if (el.preload !== 'auto') el.preload = 'auto';
//     if (el.readyState >= 3) return finish(el);
//     listen(el, 'canplay', () => finish(el));
//     listen(el, 'error', () => finish(el));
//   }

//   function trackBackgrounds(scope) {
//     const nodes = [scope, ...Array.from(scope.querySelectorAll?.('*') ?? []).slice(0, 4000)];
//     for (const n of nodes) {
//       if (n.nodeType !== 1) continue;
//       let bg = '';
//       try { bg = getComputedStyle(n).backgroundImage; } catch { /* ignore */ }
//       if (!bg || bg === 'none') continue;
//       for (const m of bg.matchAll(/url\((["']?)(.*?)\1\)/g)) preloadImage(abs(m[2]));
//     }
//   }

//   function scan(scope) {
//     if (scope.matches?.('img')) trackImg(scope);
//     else if (scope.matches?.('video,audio')) trackMedia(scope);
//     scope.querySelectorAll?.('img').forEach(trackImg);
//     scope.querySelectorAll?.('video,audio').forEach(trackMedia);
//     trackBackgrounds(scope);
//   }

//   /* fonts + window load */
//   add('fonts', 'fonts');
//   if (document.fonts?.ready) {
//     requestAnimationFrame(() =>
//       requestAnimationFrame(() => document.fonts.ready.then(() => !dead && finish('fonts')))
//     );
//   } else finish('fonts');

//   add('window', 'window load');
//   if (document.readyState === 'complete') finish('window');
//   else {
//     const onLoad = () => finish('window');
//     window.addEventListener('load', onLoad, { once: true });
//     cleanups.push(() => window.removeEventListener('load', onLoad));
//   }

//   /* DOM scanning */
//   let observer = null;
//   if (root) {
//     scan(root);
//     observer = new MutationObserver((muts) => {
//       for (const m of muts) m.addedNodes.forEach((n) => n.nodeType === 1 && scan(n));
//     });
//     observer.observe(root, { childList: true, subtree: true });
//   }

//   /* Extra assets */
//   assets.forEach((a, i) => {
//     if (typeof a === 'function') {
//       const key = `task:${i}`;
//       add(key, a.name || key);
//       Promise.resolve()
//         .then(() => a((p) => progress(key, Math.min(p, 0.99))))
//         .catch((e) => console.warn('[Loader] asset task failed', e))
//         .finally(() => finish(key));
//     } else if (typeof a === 'string') {
//       const url = abs(a);
//       if (IMAGE_RE.test(a)) preloadImage(url);
//       else if (MEDIA_RE.test(a)) preloadMedia(url);
//       else if (!seenUrls.has(url)) {
//         seenUrls.add(url);
//         add(url, url);
//         fetch(url)
//           .then((r) => {
//             if (!r.ok) console.warn('[Loader] failed to load', url, r.status);
//             return r.blob();
//           })
//           .catch((e) => console.warn('[Loader] failed to load', url, e))
//           .finally(() => finish(url));
//       }
//     }
//   });

//   return {
//     read(now) {
//       let sum = 0;
//       const pending = [];
//       tasks.forEach((t) => {
//         sum += t.p;
//         if (t.p < 1) pending.push(t.label);
//       });
//       const timedOut = timeout > 0 && now - startedAt > timeout;
//       if (timedOut && pending.length && !warned) {
//         warned = true;
//         console.warn('[Loader] timed out, continuing without:', pending);
//       }
//       const settled = timedOut || (pending.length === 0 && now - lastAdd >= QUIET_MS);
//       return { target: settled ? 1 : Math.min(sum / tasks.size, 0.99), settled, pending };
//     },
//     destroy() {
//       dead = true;
//       observer?.disconnect();
//       cleanups.forEach((fn) => fn());
//     },
//   };
// }

// /* ---------------------------------------------------------------------------
//  *  Overlay Component – stays permanently visible
//  * ------------------------------------------------------------------------- */

// function Overlay({ contentRef, assets, minDuration, timeout, onReady }) {
//   const pathRef = useRef(null);
//   const latest = useRef({ assets, minDuration, timeout, onReady });
//   latest.current = { assets, minDuration, timeout, onReady };

//   useEffect(() => {
//     const { assets: list, minDuration: minMs, timeout: limit } = latest.current;
//     const tracker = createTracker({ root: contentRef.current, assets: list, timeout: limit });
//     const t0 = performance.now();
//     let last = t0;
//     let shown = 0;
//     let raf = 0;
//     let holdTimer = 0;

//     const paint = (v) => {
//       if (pathRef.current) {
//         pathRef.current.style.strokeDashoffset = String(1000 * (1 - v));
//       }
//     };

//     const tick = (now) => {
//       const dt = Math.min(0.1, (now - last) / 1000);
//       last = now;
//       const { target } = tracker.read(now);

//       const timeCap = minMs > 0 ? (now - t0) / minMs : 1;
//       const goal = Math.min(target, timeCap);

//       if (goal > shown) {
//         shown = Math.min(goal, shown + LINEAR_SPEED * dt);
//         if (goal >= 1 && 1 - shown < 0.002) shown = 1;
//       }

//       paint(shown);

//       if (shown >= 1) {
//         holdTimer = window.setTimeout(() => {
//           latest.current.onReady();
//         }, HOLD_MS);
//         return;
//       }
//       raf = requestAnimationFrame(tick);
//     };
//     raf = requestAnimationFrame(tick);

//     return () => {
//       cancelAnimationFrame(raf);
//       clearTimeout(holdTimer);
//       tracker.destroy();
//     };
//   }, [contentRef]);

//   return (
//     <div className="fixed inset-0 z-[9999] bg-[#121212] flex flex-col justify-center items-center overflow-hidden select-none">
//       <div className="relative w-full max-w-2xl 2xl:max-w-[45vw] 4xl:max-w-[1152px] px-8 flex flex-col items-center">
//         <svg
//           viewBox="0 0 1330.2 636.6"
//           className="w-full h-auto max-h-[80vh] drop-shadow-[0_0_16px_rgba(245,245,220,0.2)]"
//           fill="none"
//           xmlns="http://www.w3.org/2000/svg"
//           role="img"
//           aria-label="Signature being written"
//         >
//           <path
//             ref={pathRef}
//             d={SIGNATURE_PATH}
//             stroke="#F5F5DC"
//             strokeWidth="8"
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             pathLength="1000"
//             style={{ strokeDasharray: 1000, strokeDashoffset: 1000 }}
//           />
//         </svg>
//       </div>
//     </div>
//   );
// }

// /* ---------------------------------------------------------------------------
//  *  Public component
//  * ------------------------------------------------------------------------- */

// export default function Loader({ children, assets = [], minDuration = 3030, timeout = 30000 }) {
//   const [status, setStatus] = useState('loading');
//   const contentRef = useRef(null);

//   useEffect(() => {
//     document.documentElement.dataset.loader = status;
//   }, [status]);

//   const ctx = useMemo(
//     () => ({ status, revealed: status !== 'loading', done: status === 'done' }),
//     [status]
//   );

//   return (
//     <LoaderContext.Provider value={ctx}>
//       <div ref={contentRef} style={{ display: 'contents' }}>
//         {children}
//       </div>
//       {/* Overlay stays mounted permanently */}
//       <Overlay
//         contentRef={contentRef}
//         assets={assets}
//         minDuration={minDuration}
//         timeout={timeout}
//         onReady={() => setStatus('done')}
//       />
//     </LoaderContext.Provider>
//   );
// }

// /* Signature SVG path */
// const SIGNATURE_PATH = `M118.87 548.98 C121.96 546.06 125.25 543.37 128.34 540.45 C132.68 536.33 136.85 532 141.08 527.77
//   C143.62 525.23 146.43 522.77 148.57 519.87 C152.13 515.05 152.2 508.91 156.11 503.99
//   C160.8 498.1 166.32 492.96 171.21 487.25 C184.67 471.51 198.04 455.72 211.38 439.89
//   C217.63 432.45 223.96 425.06 230.36 417.75 C233.58 414.08 236.86 410.49 239.99 406.74
//   C252.09 392.21 263.57 377.22 275.18 362.31 C277.91 358.81 280.42 355.15 283.06 351.58
//   C285.33 348.51 287.73 345.53 289.97 342.44 C292.74 338.62 295.34 334.66 298.04 330.78
//   C300.02 327.92 302.17 325.18 304.12 322.3 C306.76 318.43 309.17 314.39 311.65 310.42
//   C317.69 300.76 325.45 288.34 328.23 277.29 C329.72 271.37 332.58 259.53 329.58 254.01
//   C327.73 250.62 322.72 248.19 319.4 246.42 C311.67 242.29 311.25 243.99 304 242.56
//   C301.86 242.14 299.9 241.18 297.79 240.65 C292.39 239.29 285.28 240.63 280.05 242.36
//   C276.55 243.52 273.23 245.22 269.85 246.7 C244.55 257.79 220.73 273 198.52 289.35
//   C194.93 291.99 191.45 294.79 187.85 297.39 C185.55 299.04 183.12 300.51 180.83 302.18
//   C176.7 305.19 172.72 308.45 168.77 311.69 C162.41 316.9 156.61 322.58 150.59 328.15
//   C148.44 330.14 146.14 331.96 143.99 333.96 C139.13 338.49 134.52 343.33 129.82 348.03
//   C125.36 352.49 120.75 356.85 116.48 361.5 C114.72 363.42 113.09 365.45 111.34 367.37
//   C109.57 369.32 107.72 371.18 106 373.16 C103.46 376.09 101.07 379.15 98.51 382.06
//   C97.02 383.75 95.45 385.38 93.68 386.79 C92.46 387.76 90.92 388.51 89.9 389.71
//   C88.83 390.97 87.93 395.21 86.25 397.81 C84.36 400.74 82.1 403.41 80.12 406.27
//   C77.63 409.86 75.38 413.64 73.07 417.35 C71.42 420 69.71 422.61 68.17 425.32
//   C67.09 427.2 66.17 429.16 65.08 431.04 C63.83 433.21 62.37 435.23 61.14 437.41
//   C59.61 440.09 58.48 442.97 57.18 445.77 C51.22 458.49 48.84 466.34 50.03 480.67
//   C51 492.36 59.5 501.6 67.38 509.49 C71.58 513.69 75.65 518.14 80.21 521.96
//   C85.04 526.01 90.44 529.4 95.7 532.86 C99.85 535.59 106.5 540.04 111.21 541.28
//   C115.88 542.52 121.12 541.98 125.92 541.98 C126.61 544.11 127.16 546.51 128.28 548.46
//   C131.59 554.24 141.35 558.73 146.95 562.38 C162.26 572.38 180.04 581.93 194.17 593.23
//   C198.57 596.74 208.91 605.69 210.98 610.59 C211.65 612.19 211.61 613.65 211.87 615.35
//   C210.14 616.77 209.59 617.58 207.45 618.5 C202.27 620.75 196.4 620.81 190.91 621.8
//   C185.97 622.69 181.06 623.76 176.12 624.72 C171.68 625.59 167.27 625.84 162.79 626.32
//   C158.33 626.8 153.86 627.43 149.39 627.78 C144.77 628.15 140.1 627.98 135.47 627.98
//   C131.16 627.98 126.83 628.11 122.52 627.86 C119.95 627.71 117.4 627.3 114.83 627.13
//   C111.21 626.89 107.59 627.06 103.98 626.76 C98.25 626.28 92.6 625.34 86.92 624.48
//   C84.4 624.1 81.85 623.95 79.34 623.47 C76.9 623 74.54 622.2 72.13 621.57
//   C65.82 619.91 59.51 618.36 53.3 616.33 C49.78 615.19 46.42 613.63 43 612.24
//   C30.41 607.11 25.07 603.98 16.1 593.58 C12.02 588.84 5.58 583.61 10.29 576.97
//   C12.52 573.83 18.94 567.31 22.46 565.93 C24.25 565.22 26.18 565.09 28.09 565.03
//   C34 564.85 38.32 566.18 43.89 567.83 C47.46 568.89 51.01 569.86 54.33 571.59
//   C62.4 575.77 70.16 580.77 77.1 586.63 C79.36 588.53 81.45 590.61 83.63 592.6
//   C97.69 605.33 112.48 618.42 132.38 619.62 C136.25 619.85 140.78 619.33 144.25 617.49
//   C150.62 614.1 160.25 601.62 164.73 595.62 C168.27 590.87 171.86 586.03 174.19 580.54
//   C174.79 579.12 175.27 577.65 175.87 576.23 C176.71 574.25 177.75 572.35 178.58 570.35
//   C179.69 567.67 180.34 564.74 181.79 562.21 C182.35 561.23 182.98 560.91 183.72 559.98
//   C184.53 560.17 185.38 560.2 186.19 560.39 C190.92 561.49 194.2 565.91 198.33 568.17
//   C202.26 570.31 206.75 570.92 211.17 570.93 C221.95 570.97 232.07 565.92 240.27 559.17
//   C244.04 556.08 247.5 552.65 251.3 549.58 C261.01 541.72 271.71 534.94 283.24 530.12
//   C292.05 526.45 301.08 523.29 309.98 519.85 C312.57 518.84 315.05 517.6 317.63 516.58
//   C320.21 515.56 322.89 514.81 325.48 513.8 C329.5 512.23 333.39 510.38 337.34 508.65
//   C341.85 506.67 346.45 504.86 350.88 502.7 C354.23 501.07 357.42 499.18 360.69 497.41
//   C363.14 496.07 365.65 494.85 368.03 493.4 C373.91 489.79 379.56 485.49 384.98 481.22
//   C401.63 468.1 420.64 447.38 432.9 430.04 C434.71 427.48 436.23 424.75 437.88 422.1
//   C439.86 418.9 441.98 415.78 444.11 412.68 C453.53 398.95 462.92 385.22 471.82 371.16
//   C474.49 366.94 477.07 362.46 480.35 358.69 C483.15 355.48 486.5 352.74 488.97 349.26
//   C491.14 346.2 492.09 342.52 494.15 339.4 C495.89 336.76 498.49 334.68 499.78 331.74
//   C501.06 328.84 500.87 325.54 501.62 322.5 C502.22 320.1 503.25 317.84 504.05 315.5
//   C504.84 313.16 505.4 310.75 506.34 308.45 C508.01 304.37 511.09 301.15 512.84 297.15
//   C513.96 294.6 514.49 291.83 515.43 289.22 C517.62 283.15 520.21 277.18 522.65 271.21
//   C524.86 265.81 527.14 260.39 529.61 255.09 C531.43 251.18 533.41 247.34 535.16 243.39
//   C537.52 238.03 539.61 232.57 542.26 227.33 C544.21 223.46 546.73 219.87 548.81 216.04
//   C549.18 216.74 549.44 217.49 549.81 218.19 C551.81 221.98 553.5 223.13 553.74 227.85
//   C554.14 235.82 550.32 243.01 546.79 249.89 C541.25 260.71 534.89 271 528.39 281.27
//   C526.55 284.19 524.93 287.26 522.7 289.91 C518.06 295.4 511.9 299.76 507.91 305.79
//   C505.82 308.95 505.08 312.58 503.84 316.1 C503.12 318.13 502.27 320.12 501.64 322.19
//   C500.84 324.85 500.42 327.65 499.24 330.19 C497.66 333.6 495.01 336.35 493.47 339.8
//   C488.67 350.5 485.63 361.95 482.06 373.08 C477.06 388.69 471.7 404.26 468.01 420.26
//   C466.54 426.64 464.89 432.98 463.45 439.37 C461.79 446.71 460.4 454.13 458.97 461.51
//   C458.03 466.36 456.04 475.51 458.55 479.86 C459.57 481.62 461.01 482.63 462.46 483.98
//   C466.31 481.62 469.83 479 473.01 475.74 C476.15 472.53 478.52 468.7 481.31 465.2
//   C484.74 460.91 488.39 456.8 491.92 452.6 C494.2 449.88 496.33 447.05 498.68 444.4
//   C501.52 441.19 504.73 438.33 507.48 435.04 C509.32 432.84 510.95 430.47 512.71 428.21
//   C518.54 420.68 524.26 413.06 529.67 405.23 C533.06 400.32 536.28 395.29 539.64 390.36
//   C544.61 383.08 549.68 375.86 554.63 368.57 C557.63 364.16 560.43 359.63 563.4 355.2
//   C565.34 352.32 567.59 349.64 569.49 346.73 C570.85 344.64 571.95 342.41 573.24 340.28
//   C575.35 336.8 577.64 333.44 579.79 329.99 C581.1 327.87 582.31 325.69 583.68 323.6
//   C587.28 318.08 591.03 312.63 594.76 307.19 C596.18 305.11 597.71 303.1 599.07 300.98
//   C600.75 298.36 601.81 295.4 603.58 292.85 C606.61 288.5 615.3 280.56 619.44 276.42
//   C624.38 271.47 629.24 266.42 634.3 261.61 C636.91 259.14 639.73 256.92 642.34 254.45
//   C645.71 251.25 648.87 247.83 652.29 244.68 C659.04 238.47 663.29 236.51 668.87 228.65
//   C667.94 229.51 666.63 231.08 665.58 232.19 C663.55 234.35 661.45 236.45 659.3 238.48
//   C656.93 240.73 654.37 242.75 651.99 244.97 C648.58 248.13 645.42 251.55 642.03 254.74
//   C639.89 256.74 637.6 258.57 635.44 260.55 C632.26 263.46 629.32 266.63 626.19 269.59
//   C623.81 271.83 621.25 273.85 618.87 276.07 C614.04 280.59 609.72 285.74 604.62 289.95
//   C601.46 292.55 597.65 294.09 594.28 296.39 C585.94 302.07 577.85 308.12 569.48 313.77
//   C565.05 316.75 560.62 319.72 556.17 322.67 C554.08 324.06 552.09 325.61 549.9 326.85
//   C547.22 328.38 544.33 329.52 541.62 331 C538.36 332.79 535.17 334.67 531.75 336.13
//   C526.05 338.55 516.14 342.2 510.06 340.24 C508.26 339.67 506.71 338.57 505.4 337.23
//   C501.2 332.94 501.24 325.59 502.6 320.07 C503.19 317.68 504.12 315.36 504.83 313
//   C506.3 308.11 508.59 302.65 514.13 301.44 C521.17 299.9 525.83 304.65 530.64 308.95
//   C533.1 311.15 535.37 313.55 537.82 315.76 C540.24 317.95 542.77 320 545.12 322.27
//   C549.64 326.63 553.85 331.36 558.7 335.37 C561.18 337.41 563.79 339.28 566.18 341.44
//   C569.12 344.1 571.8 347.02 574.79 349.62 C577.22 351.73 579.79 353.68 582.26 355.74
//   C588.44 360.92 594.64 366.07 600.85 371.21 C604.85 374.52 608.68 378.02 612.65 381.35
//   C617.05 385.05 621.75 388.33 626.32 391.81 C630.15 394.71 633.89 397.75 637.58 400.83
//   C650.96 411.96 672.55 431.42 688.55 437.12 C702.04 441.93 706.68 435.34 713.81 425.02
//   C718.77 417.85 723.74 410.55 727.7 402.77 C729.52 399.2 731.05 395.49 732.7 391.84
//   C736.66 383.12 739.63 374.05 742.91 365.07 C744.39 361.02 746.09 357.05 747.51 352.98
//   C750.27 345.1 752.58 337.08 755.19 329.16 C756.83 324.18 758.8 319.31 760.49 314.35
//   C761.79 310.55 762.8 306.66 764.1 302.85 C765.09 299.92 766.18 297.04 767.09 294.09
//   C768.54 289.38 769.72 284.52 771.72 280 C773.83 275.22 777.45 271.05 779.1 266.06
//   C779.8 263.96 779.94 261.73 780.3 259.56 C780.91 255.83 781.81 252.15 782.34 248.4
//   C782.74 245.52 782.84 242.62 783.13 239.73 C783.49 236 783.61 231.97 784.65 228.36
//   C785.33 225.97 786.58 223.83 787.51 221.55 C789.5 216.64 790.62 207.54 789.49 202.35
//   C789.31 201.56 789.01 200.8 788.84 200.01 C787.54 201.52 786.22 202.86 785.19 204.57
//   C783.34 207.64 782.95 211.66 780.52 214.35 C778.44 216.64 775.22 217.12 772.72 218.78
//   C769.03 221.22 766.36 225.15 763.97 228.79 C762.61 230.87 761.44 233.07 760.14 235.2
//   C758.67 237.59 757.08 239.91 755.73 242.37 C751.88 249.35 747.7 259.37 744.97 266.91
//   C743.92 269.82 743.09 272.8 742.07 275.71 C740.96 278.92 739.58 282.02 738.56 285.26
//   C737.72 287.92 737.08 290.64 736.24 293.3 C734.29 299.48 731.66 305.42 729.73 311.6
//   C726.93 320.58 725.12 329.72 723.28 338.93 C722.36 343.55 721.33 348.16 720.56 352.8
//   C720.03 356 719.95 359.21 719.68 362.44 C719.16 368.64 718.5 374.81 719.01 381.05
//   C719.65 388.9 722.78 388.26 720.87 397.52 C722.51 393.53 724.37 389.63 725.97 385.63
//   C728.5 379.34 730.73 372.93 733.09 366.58 C736.2 358.2 739.39 349.85 742.36 341.42
//   C744.11 336.46 745.45 331.37 747.18 326.41 C755.22 303.37 763.03 280.24 769.78 256.78
//   C770.9 252.89 771.75 248.94 772.82 245.04 C773.82 241.42 775.23 238.03 777.3 234.89
//   C778.32 233.36 779.4 231.89 780.09 230.17 C780.7 228.65 780.95 227.01 781.3 225.41
//   C782.03 228.37 783.05 231.4 783.29 234.44 C783.44 236.31 783.22 238.17 783.07 240.03
//   C782.87 242.61 782.77 245.19 782.44 247.76 C781.75 253.1 780.63 258.38 779.96 263.73
//   C779.32 268.86 779.07 274 778.52 279.13 C778.03 283.59 777.27 288.03 777 292.5
//   C776.74 296.79 777.01 301.09 776.68 305.37 C776.48 307.94 776.06 310.48 775.99 313.06
//   C775.85 318.54 777.54 333.5 779.4 338.53 C780.15 340.57 781.28 342.18 782.44 343.98
//   C783.57 343.78 784.56 343.82 785.65 343.52 C789.47 342.43 792.64 339.58 794.68 336.23
//   C795.64 334.64 796.32 332.9 797.28 331.31 C799.23 328.08 801.7 325.21 803.6 321.93
//   C807.52 315.21 811.53 308.56 815.4 301.82 C817.26 298.59 819.25 295.45 820.77 292.04
//   C821.91 289.51 822.89 286.92 824.01 284.38 C826.14 279.58 828.43 274.88 830.74 270.17
//   C831.96 267.69 833.06 265.13 834.66 262.86 C835.88 261.12 837.33 259.85 838.87 258.43
//   C842.32 268.71 841.1 271.22 842.62 280.87 C843.79 288.27 846 295.38 848.85 302.29
//   C850.91 307.3 852.87 311.15 856.9 314.9 C858.05 315.97 859.28 317.01 860.71 317.67
//   C865.04 319.65 872.8 317.75 876.69 315.32 C878.89 313.95 880.7 312.07 882.64 310.37
//   C886.23 307.23 890.35 304.84 894.16 301.99 C896.2 300.47 898.08 298.71 900.26 297.38
//   C902.65 295.93 905.33 295.1 907.65 293.51 C911.37 290.95 914.36 287.48 918.08 284.9
//   C924.02 280.77 934.4 274.71 941.62 274.15 C945.48 273.85 949.32 274.49 953.13 275.02
//   C962.62 276.34 972.53 276.88 981.58 273.19 C996.19 267.22 1006.09 254.97 1015.38 242.76
//   C1019.55 237.27 1021.76 233.8 1027.2 229.31 C1033.67 234.23 1036.51 237.6 1044.47 240.73
//   C1061.56 247.45 1083.43 245.54 1100.69 240.11 C1110.2 237.12 1125.58 230.21 1134.75 225.76
//   C1144.16 221.2 1153.05 214.39 1161.5 208.26 C1167.93 203.59 1174.44 199.01 1180.57 193.94
//   C1184.83 190.42 1188.91 186.68 1193.04 183 C1197.65 178.89 1202.37 174.88 1206.95 170.73
//   C1208.91 168.96 1210.75 167.07 1212.71 165.3 C1214.88 163.33 1217.17 161.5 1219.3 159.49
//   C1226.79 152.4 1233.94 144.91 1241.24 137.61 C1246.41 132.44 1251.73 127.38 1256.73 122.03
//   C1261.63 116.8 1266.22 111.26 1271.06 105.97 C1275.34 101.28 1280.73 98.44 1283.99 94.47
//   C1285.79 92.29 1286.91 89.72 1288.26 87.27 C1290.32 83.54 1292.72 79.64 1295.54 76.45
//   C1297.6 74.12 1300.23 72.41 1302.47 70.27 C1307.63 65.31 1315.29 55.35 1318.22 48.85
//   C1320.36 44.1 1322 38.74 1321.55 33.48 C1321.34 31.08 1320.77 28.76 1320.74 26.34
//   C1320.65 20.43 1320.87 14.51 1320.87 8.6 C1320.87 12.07 1321.16 15.75 1320.34 19.15
//   C1319.76 21.57 1318.38 23.67 1317.32 25.89 C1315.99 28.68 1314.85 31.54 1313.44 34.28
//   C1309.62 41.72 1305.38 48.89 1301.87 56.49 C1300.09 60.36 1298.08 64.32 1296.79 68.39
//   C1295.95 71.07 1295.76 73.91 1294.68 76.52 C1293.37 79.68 1291.16 82.41 1289.39 85.32
//   C1287.33 88.73 1285.64 92.46 1284.2 96.17 C1282.62 100.22 1281.85 104.56 1280.8 108.77
//   C1278.61 117.55 1276.45 126.32 1274.49 135.15 C1271.9 146.83 1269.45 158.63 1268.15 170.53
//   C1267.45 176.99 1267.16 183.46 1266.72 189.94 C1266.55 192.51 1266.14 195.06 1265.99 197.63
//   C1265.85 199.93 1265.88 202.23 1265.74 204.53 C1265.56 207.43 1265.09 210.3 1264.96 213.2
//   C1264.79 216.84 1264.96 220.49 1264.76 224.12 C1264.59 227.35 1264.06 230.55 1263.94 233.78
//   C1263.77 238.08 1264 242.4 1263.73 246.7 C1263.55 249.6 1263.08 252.47 1262.95 255.37
//   C1262.76 259.68 1263 263.99 1262.75 268.29 C1262.38 274.73 1261.55 281.16 1261.06 287.59
//   C1260.78 291.2 1260.96 294.82 1260.68 298.43 C1260.35 302.57 1259.69 306.7 1259.22 310.83
//   C1258.93 313.39 1258.78 315.96 1258.47 318.52 C1257.48 326.68 1256.2 334.88 1254.76 342.98
//   C1253.62 349.47 1252.14 355.91 1250.87 362.37`;





// import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

// /* ==========================================================================
//  *  <Loader> – Signature Loader with Subtle Ambient Glow
//  * ========================================================================== */

// const HOLD_MS = 700; // 0.7s hold delay after signature finishes drawing
// const LINEAR_SPEED = 0.33; // 33% per second linear speed (~3.03s total write time)

// const LoaderContext = createContext({ status: 'done', revealed: true, done: true });
// export const useLoader = () => useContext(LoaderContext);

// /* ---------------------------------------------------------------------------
//  *  Asset Tracker
//  * ------------------------------------------------------------------------- */

// const IMAGE_RE = /\.(avif|bmp|gif|ico|jpe?g|png|svg|webp)(?:[?#]|$)/i;
// const MEDIA_RE = /\.(aac|m4a|m4v|mov|mp3|mp4|oga|ogg|ogv|wav|webm)(?:[?#]|$)/i;
// const VIDEO_RE = /\.(m4v|mov|mp4|ogv|webm)(?:[?#]|$)/i;

// function createTracker({ root, assets, timeout }) {
//   const tasks = new Map();
//   const seenEls = new WeakSet();
//   const seenUrls = new Set();
//   const cleanups = [];
//   const hold = [];
//   const startedAt = performance.now();
//   let lastAdd = startedAt;
//   let dead = false;

//   const abs = (u) => {
//     try { return new URL(u, document.baseURI).href; } catch { return u; }
//   };
//   const add = (key, label) => {
//     if (tasks.has(key)) return false;
//     tasks.set(key, { p: 0, label });
//     lastAdd = performance.now();
//     return true;
//   };
//   const progress = (key, p) => {
//     const t = tasks.get(key);
//     if (t && p > t.p) t.p = Math.min(1, p);
//   };
//   const finish = (key) => progress(key, 1);
//   const listen = (el, type, fn) => {
//     el.addEventListener(type, fn, { once: true });
//     cleanups.push(() => el.removeEventListener(type, fn));
//   };
//   const decoded = (img) =>
//     typeof img.decode === 'function' ? img.decode().catch(() => {}) : Promise.resolve();

//   function preloadImage(url) {
//     if (!url || url.startsWith('data:') || seenUrls.has(url)) return;
//     seenUrls.add(url);
//     add(url, url);
//     const img = new Image();
//     hold.push(img);
//     img.onload = () => decoded(img).then(() => finish(url));
//     img.onerror = () => { finish(url); };
//     img.src = url;
//   }

//   function preloadMedia(url) {
//     if (seenUrls.has(url)) return;
//     seenUrls.add(url);
//     add(url, url);
//     const el = document.createElement(VIDEO_RE.test(url) ? 'video' : 'audio');
//     hold.push(el);
//     el.preload = 'auto';
//     el.muted = true;
//     el.addEventListener('canplay', () => finish(url), { once: true });
//     el.addEventListener('error', () => finish(url), { once: true });
//     el.src = url;
//   }

//   function trackImg(img) {
//     if (seenEls.has(img)) return;
//     seenEls.add(img);
//     if (!img.getAttribute('src') && !img.getAttribute('srcset') && !img.currentSrc) return;
//     add(img, img.currentSrc || img.getAttribute('src') || 'img');
//     if (img.loading === 'lazy') img.loading = 'eager';
//     const ok = () => finish(img);
//     const fail = () => finish(img);
//     if (typeof img.decode === 'function') img.decode().then(ok, fail);
//     else if (img.complete) ok();
//     else { listen(img, 'load', ok); listen(img, 'error', fail); }
//   }

//   function trackMedia(el) {
//     if (seenEls.has(el)) return;
//     seenEls.add(el);
//     if (el.preload === 'none') return;
//     if (!el.getAttribute('src') && !el.querySelector('source')) return;
//     if (el.poster) preloadImage(abs(el.poster));
//     add(el, el.currentSrc || el.getAttribute('src') || 'media');
//     if (el.preload !== 'auto') el.preload = 'auto';
//     if (el.readyState >= 3) return finish(el);
//     listen(el, 'canplay', () => finish(el));
//     listen(el, 'error', () => finish(el));
//   }

//   function trackBackgrounds(scope) {
//     const nodes = [scope, ...Array.from(scope.querySelectorAll?.('*') ?? []).slice(0, 4000)];
//     for (const n of nodes) {
//       if (n.nodeType !== 1) continue;
//       let bg = '';
//       try { bg = getComputedStyle(n).backgroundImage; } catch { /* ignore */ }
//       if (!bg || bg === 'none') continue;
//       for (const m of bg.matchAll(/url\((["']?)(.*?)\1\)/g)) preloadImage(abs(m[2]));
//     }
//   }

//   function scan(scope) {
//     if (scope.matches?.('img')) trackImg(scope);
//     else if (scope.matches?.('video,audio')) trackMedia(scope);
//     scope.querySelectorAll?.('img').forEach(trackImg);
//     scope.querySelectorAll?.('video,audio').forEach(trackMedia);
//     trackBackgrounds(scope);
//   }

//   add('fonts', 'fonts');
//   if (document.fonts?.ready) {
//     requestAnimationFrame(() =>
//       requestAnimationFrame(() => document.fonts.ready.then(() => !dead && finish('fonts')))
//     );
//   } else finish('fonts');

//   add('window', 'window load');
//   if (document.readyState === 'complete') finish('window');
//   else {
//     const onLoad = () => finish('window');
//     window.addEventListener('load', onLoad, { once: true });
//     cleanups.push(() => window.removeEventListener('load', onLoad));
//   }

//   let observer = null;
//   if (root) {
//     scan(root);
//     observer = new MutationObserver((muts) => {
//       for (const m of muts) m.addedNodes.forEach((n) => n.nodeType === 1 && scan(n));
//     });
//     observer.observe(root, { childList: true, subtree: true });
//   }

//   assets.forEach((a, i) => {
//     if (typeof a === 'function') {
//       const key = `task:${i}`;
//       add(key, a.name || key);
//       Promise.resolve()
//         .then(() => a((p) => progress(key, Math.min(p, 0.99))))
//         .catch(() => {})
//         .finally(() => finish(key));
//     } else if (typeof a === 'string') {
//       const url = abs(a);
//       if (IMAGE_RE.test(a)) preloadImage(url);
//       else if (MEDIA_RE.test(a)) preloadMedia(url);
//       else if (!seenUrls.has(url)) {
//         seenUrls.add(url);
//         add(url, url);
//         fetch(url)
//           .then((r) => r.blob())
//           .catch(() => {})
//           .finally(() => finish(url));
//       }
//     }
//   });

//   return {
//     read(now) {
//       let sum = 0;
//       const pending = [];
//       tasks.forEach((t) => {
//         sum += t.p;
//         if (t.p < 1) pending.push(t.label);
//       });
//       const timedOut = timeout > 0 && now - startedAt > timeout;
//       const settled = timedOut || (pending.length === 0 && now - lastAdd >= 250);
//       return { target: settled ? 1 : Math.min(sum / tasks.size, 0.99) };
//     },
//     destroy() {
//       dead = true;
//       observer?.disconnect();
//       cleanups.forEach((fn) => fn());
//     },
//   };
// }

// /* ---------------------------------------------------------------------------
//  *  Overlay Component – Very subtle soft glow
//  * ------------------------------------------------------------------------- */

// function Overlay({ contentRef, assets, minDuration, timeout, onReady }) {
//   const pathRef = useRef(null);
//   const latest = useRef({ assets, minDuration, timeout, onReady });
//   latest.current = { assets, minDuration, timeout, onReady };

//   useEffect(() => {
//     const { assets: list, minDuration: minMs, timeout: limit } = latest.current;
//     const tracker = createTracker({ root: contentRef.current, assets: list, timeout: limit });
//     const t0 = performance.now();
//     let last = t0;
//     let shown = 0;
//     let raf = 0;
//     let holdTimer = 0;

//     const paint = (v) => {
//       if (pathRef.current) {
//         pathRef.current.style.strokeDashoffset = String(1000 * (1 - v));
//       }
//     };

//     const tick = (now) => {
//       const dt = Math.min(0.1, (now - last) / 1000);
//       last = now;
//       const { target } = tracker.read(now);

//       const timeCap = minMs > 0 ? (now - t0) / minMs : 1;
//       const goal = Math.min(target, timeCap);

//       if (goal > shown) {
//         shown = Math.min(goal, shown + LINEAR_SPEED * dt);
//         if (goal >= 1 && 1 - shown < 0.002) shown = 1;
//       }

//       paint(shown);

//       if (shown >= 1) {
//         holdTimer = window.setTimeout(() => {
//           latest.current.onReady();
//         }, HOLD_MS);
//         return;
//       }
//       raf = requestAnimationFrame(tick);
//     };
//     raf = requestAnimationFrame(tick);

//     return () => {
//       cancelAnimationFrame(raf);
//       clearTimeout(holdTimer);
//       tracker.destroy();
//     };
//   }, [contentRef]);

//   return (
//     <div className="fixed inset-0 z-[9999] bg-[#121212] flex flex-col justify-center items-center overflow-hidden select-none">
//       <div className="relative w-full max-w-2xl 2xl:max-w-[45vw] 4xl:max-w-[1152px] px-8 flex flex-col items-center">
//         <svg
//           viewBox="0 0 1330.2 636.6"
//           className="w-full h-auto max-h-[80vh] drop-shadow-[0_0_10px_rgba(245,245,220,0.12)]"
//           fill="none"
//           xmlns="http://www.w3.org/2000/svg"
//           role="img"
//           aria-label="Signature being written"
//         >
//           <path
//             ref={pathRef}
//             d={SIGNATURE_PATH}
//             stroke="#F5F5DC"
//             strokeWidth="8"
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             pathLength="1000"
//             style={{ strokeDasharray: 1000, strokeDashoffset: 1000 }}
//           />
//         </svg>
//       </div>
//     </div>
//   );
// }

// /* ---------------------------------------------------------------------------
//  *  Public Loader Component
//  * ------------------------------------------------------------------------- */

// export default function Loader({ children, assets = [], minDuration = 3030, timeout = 30000 }) {
//   const [status, setStatus] = useState('loading');
//   const contentRef = useRef(null);

//   useEffect(() => {
//     document.documentElement.dataset.loader = status;
//   }, [status]);

//   const ctx = useMemo(
//     () => ({ status, revealed: status !== 'loading', done: status === 'done' }),
//     [status]
//   );

//   return (
//     <LoaderContext.Provider value={ctx}>
//       <div ref={contentRef} style={{ display: 'contents' }}>
//         {children}
//       </div>
//       <Overlay
//         contentRef={contentRef}
//         assets={assets}
//         minDuration={minDuration}
//         timeout={timeout}
//         onReady={() => setStatus('done')}
//       />
//     </LoaderContext.Provider>
//   );
// }

// /* Signature Path Data */
// const SIGNATURE_PATH = `M118.87 548.98 C121.96 546.06 125.25 543.37 128.34 540.45 C132.68 536.33 136.85 532 141.08 527.77
//   C143.62 525.23 146.43 522.77 148.57 519.87 C152.13 515.05 152.2 508.91 156.11 503.99
//   C160.8 498.1 166.32 492.96 171.21 487.25 C184.67 471.51 198.04 455.72 211.38 439.89
//   C217.63 432.45 223.96 425.06 230.36 417.75 C233.58 414.08 236.86 410.49 239.99 406.74
//   C252.09 392.21 263.57 377.22 275.18 362.31 C277.91 358.81 280.42 355.15 283.06 351.58
//   C285.33 348.51 287.73 345.53 289.97 342.44 C292.74 338.62 295.34 334.66 298.04 330.78
//   C300.02 327.92 302.17 325.18 304.12 322.3 C306.76 318.43 309.17 314.39 311.65 310.42
//   C317.69 300.76 325.45 288.34 328.23 277.29 C329.72 271.37 332.58 259.53 329.58 254.01
//   C327.73 250.62 322.72 248.19 319.4 246.42 C311.67 242.29 311.25 243.99 304 242.56
//   C301.86 242.14 299.9 241.18 297.79 240.65 C292.39 239.29 285.28 240.63 280.05 242.36
//   C276.55 243.52 273.23 245.22 269.85 246.7 C244.55 257.79 220.73 273 198.52 289.35
//   C194.93 291.99 191.45 294.79 187.85 297.39 C185.55 299.04 183.12 300.51 180.83 302.18
//   C176.7 305.19 172.72 308.45 168.77 311.69 C162.41 316.9 156.61 322.58 150.59 328.15
//   C148.44 330.14 146.14 331.96 143.99 333.96 C139.13 338.49 134.52 343.33 129.82 348.03
//   C125.36 352.49 120.75 356.85 116.48 361.5 C114.72 363.42 113.09 365.45 111.34 367.37
//   C109.57 369.32 107.72 371.18 106 373.16 C103.46 376.09 101.07 379.15 98.51 382.06
//   C97.02 383.75 95.45 385.38 93.68 386.79 C92.46 387.76 90.92 388.51 89.9 389.71
//   C88.83 390.97 87.93 395.21 86.25 397.81 C84.36 400.74 82.1 403.41 80.12 406.27
//   C77.63 409.86 75.38 413.64 73.07 417.35 C71.42 420 69.71 422.61 68.17 425.32
//   C67.09 427.2 66.17 429.16 65.08 431.04 C63.83 433.21 62.37 435.23 61.14 437.41
//   C59.61 440.09 58.48 442.97 57.18 445.77 C51.22 458.49 48.84 466.34 50.03 480.67
//   C51 492.36 59.5 501.6 67.38 509.49 C71.58 513.69 75.65 518.14 80.21 521.96
//   C85.04 526.01 90.44 529.4 95.7 532.86 C99.85 535.59 106.5 540.04 111.21 541.28
//   C115.88 542.52 121.12 541.98 125.92 541.98 C126.61 544.11 127.16 546.51 128.28 548.46
//   C131.59 554.24 141.35 558.73 146.95 562.38 C162.26 572.38 180.04 581.93 194.17 593.23
//   C198.57 596.74 208.91 605.69 210.98 610.59 C211.65 612.19 211.61 613.65 211.87 615.35
//   C210.14 616.77 209.59 617.58 207.45 618.5 C202.27 620.75 196.4 620.81 190.91 621.8
//   C185.97 622.69 181.06 623.76 176.12 624.72 C171.68 625.59 167.27 625.84 162.79 626.32
//   C158.33 626.8 153.86 627.43 149.39 627.78 C144.77 628.15 140.1 627.98 135.47 627.98
//   C131.16 627.98 126.83 628.11 122.52 627.86 C119.95 627.71 117.4 627.3 114.83 627.13
//   C111.21 626.89 107.59 627.06 103.98 626.76 C98.25 626.28 92.6 625.34 86.92 624.48
//   C84.4 624.1 81.85 623.95 79.34 623.47 C76.9 623 74.54 622.2 72.13 621.57
//   C65.82 619.91 59.51 618.36 53.3 616.33 C49.78 615.19 46.42 613.63 43 612.24
//   C30.41 607.11 25.07 603.98 16.1 593.58 C12.02 588.84 5.58 583.61 10.29 576.97
//   C12.52 573.83 18.94 567.31 22.46 565.93 C24.25 565.22 26.18 565.09 28.09 565.03
//   C34 564.85 38.32 566.18 43.89 567.83 C47.46 568.89 51.01 569.86 54.33 571.59
//   C62.4 575.77 70.16 580.77 77.1 586.63 C79.36 588.53 81.45 590.61 83.63 592.6
//   C97.69 605.33 112.48 618.42 132.38 619.62 C136.25 619.85 140.78 619.33 144.25 617.49
//   C150.62 614.1 160.25 601.62 164.73 595.62 C168.27 590.87 171.86 586.03 174.19 580.54
//   C174.79 579.12 175.27 577.65 175.87 576.23 C176.71 574.25 177.75 572.35 178.58 570.35
//   C179.69 567.67 180.34 564.74 181.79 562.21 C182.35 561.23 182.98 560.91 183.72 559.98
//   C184.53 560.17 185.38 560.2 186.19 560.39 C190.92 561.49 194.2 565.91 198.33 568.17
//   C202.26 570.31 206.75 570.92 211.17 570.93 C221.95 570.97 232.07 565.92 240.27 559.17
//   C244.04 556.08 247.5 552.65 251.3 549.58 C261.01 541.72 271.71 534.94 283.24 530.12
//   C292.05 526.45 301.08 523.29 309.98 519.85 C312.57 518.84 315.05 517.6 317.63 516.58
//   C320.21 515.56 322.89 514.81 325.48 513.8 C329.5 512.23 333.39 510.38 337.34 508.65
//   C341.85 506.67 346.45 504.86 350.88 502.7 C354.23 501.07 357.42 499.18 360.69 497.41
//   C363.14 496.07 365.65 494.85 368.03 493.4 C373.91 489.79 379.56 485.49 384.98 481.22
//   C401.63 468.1 420.64 447.38 432.9 430.04 C434.71 427.48 436.23 424.75 437.88 422.1
//   C439.86 418.9 441.98 415.78 444.11 412.68 C453.53 398.95 462.92 385.22 471.82 371.16
//   C474.49 366.94 477.07 362.46 480.35 358.69 C483.15 355.48 486.5 352.74 488.97 349.26
//   C491.14 346.2 492.09 342.52 494.15 339.4 C495.89 336.76 498.49 334.68 499.78 331.74
//   C501.06 328.84 500.87 325.54 501.62 322.5 C502.22 320.1 503.25 317.84 504.05 315.5
//   C504.84 313.16 505.4 310.75 506.34 308.45 C508.01 304.37 511.09 301.15 512.84 297.15
//   C513.96 294.6 514.49 291.83 515.43 289.22 C517.62 283.15 520.21 277.18 522.65 271.21
//   C524.86 265.81 527.14 260.39 529.61 255.09 C531.43 251.18 533.41 247.34 535.16 243.39
//   C537.52 238.03 539.61 232.57 542.26 227.33 C544.21 223.46 546.73 219.87 548.81 216.04
//   C549.18 216.74 549.44 217.49 549.81 218.19 C551.81 221.98 553.5 223.13 553.74 227.85
//   C554.14 235.82 550.32 243.01 546.79 249.89 C541.25 260.71 534.89 271 528.39 281.27
//   C526.55 284.19 524.93 287.26 522.7 289.91 C518.06 295.4 511.9 299.76 507.91 305.79
//   C505.82 308.95 505.08 312.58 503.84 316.1 C503.12 318.13 502.27 320.12 501.64 322.19
//   C500.84 324.85 500.42 327.65 499.24 330.19 C497.66 333.6 495.01 336.35 493.47 339.8
//   C488.67 350.5 485.63 361.95 482.06 373.08 C477.06 388.69 471.7 404.26 468.01 420.26
//   C466.54 426.64 464.89 432.98 463.45 439.37 C461.79 446.71 460.4 454.13 458.97 461.51
//   C458.03 466.36 456.04 475.51 458.55 479.86 C459.57 481.62 461.01 482.63 462.46 483.98
//   C466.31 481.62 469.83 479 473.01 475.74 C476.15 472.53 478.52 468.7 481.31 465.2
//   C484.74 460.91 488.39 456.8 491.92 452.6 C494.2 449.88 496.33 447.05 498.68 444.4
//   C501.52 441.19 504.73 438.33 507.48 435.04 C509.32 432.84 510.95 430.47 512.71 428.21
//   C518.54 420.68 524.26 413.06 529.67 405.23 C533.06 400.32 536.28 395.29 539.64 390.36
//   C544.61 383.08 549.68 375.86 554.63 368.57 C557.63 364.16 560.43 359.63 563.4 355.2
//   C565.34 352.32 567.59 349.64 569.49 346.73 C570.85 344.64 571.95 342.41 573.24 340.28
//   C575.35 336.8 577.64 333.44 579.79 329.99 C581.1 327.87 582.31 325.69 583.68 323.6
//   C587.28 318.08 591.03 312.63 594.76 307.19 C596.18 305.11 597.71 303.1 599.07 300.98
//   C600.75 298.36 601.81 295.4 603.58 292.85 C606.61 288.5 615.3 280.56 619.44 276.42
//   C624.38 271.47 629.24 266.42 634.3 261.61 C636.91 259.14 639.73 256.92 642.34 254.45
//   C645.71 251.25 648.87 247.83 652.29 244.68 C659.04 238.47 663.29 236.51 668.87 228.65
//   C667.94 229.51 666.63 231.08 665.58 232.19 C663.55 234.35 661.45 236.45 659.3 238.48
//   C656.93 240.73 654.37 242.75 651.99 244.97 C648.58 248.13 645.42 251.55 642.03 254.74
//   C639.89 256.74 637.6 258.57 635.44 260.55 C632.26 263.46 629.32 266.63 626.19 269.59
//   C623.81 271.83 621.25 273.85 618.87 276.07 C614.04 280.59 609.72 285.74 604.62 289.95
//   C601.46 292.55 597.65 294.09 594.28 296.39 C585.94 302.07 577.85 308.12 569.48 313.77
//   C565.05 316.75 560.62 319.72 556.17 322.67 C554.08 324.06 552.09 325.61 549.9 326.85
//   C547.22 328.38 544.33 329.52 541.62 331 C538.36 332.79 535.17 334.67 531.75 336.13
//   C526.05 338.55 516.14 342.2 510.06 340.24 C508.26 339.67 506.71 338.57 505.4 337.23
//   C501.2 332.94 501.24 325.59 502.6 320.07 C503.19 317.68 504.12 315.36 504.83 313
//   C506.3 308.11 508.59 302.65 514.13 301.44 C521.17 299.9 525.83 304.65 530.64 308.95
//   C533.1 311.15 535.37 313.55 537.82 315.76 C540.24 317.95 542.77 320 545.12 322.27
//   C549.64 326.63 553.85 331.36 558.7 335.37 C561.18 337.41 563.79 339.28 566.18 341.44
//   C569.12 344.1 571.8 347.02 574.79 349.62 C577.22 351.73 579.79 353.68 582.26 355.74
//   C588.44 360.92 594.64 366.07 600.85 371.21 C604.85 374.52 608.68 378.02 612.65 381.35
//   C617.05 385.05 621.75 388.33 626.32 391.81 C630.15 394.71 633.89 397.75 637.58 400.83
//   C650.96 411.96 672.55 431.42 688.55 437.12 C702.04 441.93 706.68 435.34 713.81 425.02
//   C718.77 417.85 723.74 410.55 727.7 402.77 C729.52 399.2 731.05 395.49 732.7 391.84
//   C736.66 383.12 739.63 374.05 742.91 365.07 C744.39 361.02 746.09 357.05 747.51 352.98
//   C750.27 345.1 752.58 337.08 755.19 329.16 C756.83 324.18 758.8 319.31 760.49 314.35
//   C761.79 310.55 762.8 306.66 764.1 302.85 C765.09 299.92 766.18 297.04 767.09 294.09
//   C768.54 289.38 769.72 284.52 771.72 280 C773.83 275.22 777.45 271.05 779.1 266.06
//   C779.8 263.96 779.94 261.73 780.3 259.56 C780.91 255.83 781.81 252.15 782.34 248.4
//   C782.74 245.52 782.84 242.62 783.13 239.73 C783.49 236 783.61 231.97 784.65 228.36
//   C785.33 225.97 786.58 223.83 787.51 221.55 C789.5 216.64 790.62 207.54 789.49 202.35
//   C789.31 201.56 789.01 200.8 788.84 200.01 C787.54 201.52 786.22 202.86 785.19 204.57
//   C783.34 207.64 782.95 211.66 780.52 214.35 C778.44 216.64 775.22 217.12 772.72 218.78
//   C769.03 221.22 766.36 225.15 763.97 228.79 C762.61 230.87 761.44 233.07 760.14 235.2
//   C758.67 237.59 757.08 239.91 755.73 242.37 C751.88 249.35 747.7 259.37 744.97 266.91
//   C743.92 269.82 743.09 272.8 742.07 275.71 C740.96 278.92 739.58 282.02 738.56 285.26
//   C737.72 287.92 737.08 290.64 736.24 293.3 C734.29 299.48 731.66 305.42 729.73 311.6
//   C726.93 320.58 725.12 329.72 723.28 338.93 C722.36 343.55 721.33 348.16 720.56 352.8
//   C720.03 356 719.95 359.21 719.68 362.44 C719.16 368.64 718.5 374.81 719.01 381.05
//   C719.65 388.9 722.78 388.26 720.87 397.52 C722.51 393.53 724.37 389.63 725.97 385.63
//   C728.5 379.34 730.73 372.93 733.09 366.58 C736.2 358.2 739.39 349.85 742.36 341.42
//   C744.11 336.46 745.45 331.37 747.18 326.41 C755.22 303.37 763.03 280.24 769.78 256.78
//   C770.9 252.89 771.75 248.94 772.82 245.04 C773.82 241.42 775.23 238.03 777.3 234.89
//   C778.32 233.36 779.4 231.89 780.09 230.17 C780.7 228.65 780.95 227.01 781.3 225.41
//   C782.03 228.37 783.05 231.4 783.29 234.44 C783.44 236.31 783.22 238.17 783.07 240.03
//   C782.87 242.61 782.77 245.19 782.44 247.76 C781.75 253.1 780.63 258.38 779.96 263.73
//   C779.32 268.86 779.07 274 778.52 279.13 C778.03 283.59 777.27 288.03 777 292.5
//   C776.74 296.79 777.01 301.09 776.68 305.37 C776.48 307.94 776.06 310.48 775.99 313.06
//   C775.85 318.54 777.54 333.5 779.4 338.53 C780.15 340.57 781.28 342.18 782.44 343.98
//   C783.57 343.78 784.56 343.82 785.65 343.52 C789.47 342.43 792.64 339.58 794.68 336.23
//   C795.64 334.64 796.32 332.9 797.28 331.31 C799.23 328.08 801.7 325.21 803.6 321.93
//   C807.52 315.21 811.53 308.56 815.4 301.82 C817.26 298.59 819.25 295.45 820.77 292.04
//   C821.91 289.51 822.89 286.92 824.01 284.38 C826.14 279.58 828.43 274.88 830.74 270.17
//   C831.96 267.69 833.06 265.13 834.66 262.86 C835.88 261.12 837.33 259.85 838.87 258.43
//   C842.32 268.71 841.1 271.22 842.62 280.87 C843.79 288.27 846 295.38 848.85 302.29
//   C850.91 307.3 852.87 311.15 856.9 314.9 C858.05 315.97 859.28 317.01 860.71 317.67
//   C865.04 319.65 872.8 317.75 876.69 315.32 C878.89 313.95 880.7 312.07 882.64 310.37
//   C886.23 307.23 890.35 304.84 894.16 301.99 C896.2 300.47 898.08 298.71 900.26 297.38
//   C902.65 295.93 905.33 295.1 907.65 293.51 C911.37 290.95 914.36 287.48 918.08 284.9
//   C924.02 280.77 934.4 274.71 941.62 274.15 C945.48 273.85 949.32 274.49 953.13 275.02
//   C962.62 276.34 972.53 276.88 981.58 273.19 C996.19 267.22 1006.09 254.97 1015.38 242.76
//   C1019.55 237.27 1021.76 233.8 1027.2 229.31 C1033.67 234.23 1036.51 237.6 1044.47 240.73
//   C1061.56 247.45 1083.43 245.54 1100.69 240.11 C1110.2 237.12 1125.58 230.21 1134.75 225.76
//   C1144.16 221.2 1153.05 214.39 1161.5 208.26 C1167.93 203.59 1174.44 199.01 1180.57 193.94
//   C1184.83 190.42 1188.91 186.68 1193.04 183 C1197.65 178.89 1202.37 174.88 1206.95 170.73
//   C1208.91 168.96 1210.75 167.07 1212.71 165.3 C1214.88 163.33 1217.17 161.5 1219.3 159.49
//   C1226.79 152.4 1233.94 144.91 1241.24 137.61 C1246.41 132.44 1251.73 127.38 1256.73 122.03
//   C1261.63 116.8 1266.22 111.26 1271.06 105.97 C1275.34 101.28 1280.73 98.44 1283.99 94.47
//   C1285.79 92.29 1286.91 89.72 1288.26 87.27 C1290.32 83.54 1292.72 79.64 1295.54 76.45
//   C1297.6 74.12 1300.23 72.41 1302.47 70.27 C1307.63 65.31 1315.29 55.35 1318.22 48.85
//   C1320.36 44.1 1322 38.74 1321.55 33.48 C1321.34 31.08 1320.77 28.76 1320.74 26.34
//   C1320.65 20.43 1320.87 14.51 1320.87 8.6 C1320.87 12.07 1321.16 15.75 1320.34 19.15
//   C1319.76 21.57 1318.38 23.67 1317.32 25.89 C1315.99 28.68 1314.85 31.54 1313.44 34.28
//   C1309.62 41.72 1305.38 48.89 1301.87 56.49 C1300.09 60.36 1298.08 64.32 1296.79 68.39
//   C1295.95 71.07 1295.76 73.91 1294.68 76.52 C1293.37 79.68 1291.16 82.41 1289.39 85.32
//   C1287.33 88.73 1285.64 92.46 1284.2 96.17 C1282.62 100.22 1281.85 104.56 1280.8 108.77
//   C1278.61 117.55 1276.45 126.32 1274.49 135.15 C1271.9 146.83 1269.45 158.63 1268.15 170.53
//   C1267.45 176.99 1267.16 183.46 1266.72 189.94 C1266.55 192.51 1266.14 195.06 1265.99 197.63
//   C1265.85 199.93 1265.88 202.23 1265.74 204.53 C1265.56 207.43 1265.09 210.3 1264.96 213.2
//   C1264.79 216.84 1264.96 220.49 1264.76 224.12 C1264.59 227.35 1264.06 230.55 1263.94 233.78
//   C1263.77 238.08 1264 242.4 1263.73 246.7 C1263.55 249.6 1263.08 252.47 1262.95 255.37
//   C1262.76 259.68 1263 263.99 1262.75 268.29 C1262.38 274.73 1261.55 281.16 1261.06 287.59
//   C1260.78 291.2 1260.96 294.82 1260.68 298.43 C1260.35 302.57 1259.69 306.7 1259.22 310.83
//   C1258.93 313.39 1258.78 315.96 1258.47 318.52 C1257.48 326.68 1256.2 334.88 1254.76 342.98
//   C1253.62 349.47 1252.14 355.91 1250.87 362.37`;


































// import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

// /* ==========================================================================
//  *  <Loader> – Signature Loader with Subtle Ambient Glow
//  * ========================================================================== */

// const HOLD_MS = 700; // 0.7s hold delay after signature finishes drawing
// const LINEAR_SPEED = 0.33; // 33% per second linear speed (~3.03s total write time)

// const LoaderContext = createContext({ status: 'done', revealed: true, done: true });
// export const useLoader = () => useContext(LoaderContext);

// /* ---------------------------------------------------------------------------
//  *  Asset Tracker
//  * ------------------------------------------------------------------------- */

// const IMAGE_RE = /\.(avif|bmp|gif|ico|jpe?g|png|svg|webp)(?:[?#]|$)/i;
// const MEDIA_RE = /\.(aac|m4a|m4v|mov|mp3|mp4|oga|ogg|ogv|wav|webm)(?:[?#]|$)/i;
// const VIDEO_RE = /\.(m4v|mov|mp4|ogv|webm)(?:[?#]|$)/i;

// function createTracker({ root, assets, timeout }) {
//   const tasks = new Map();
//   const seenEls = new WeakSet();
//   const seenUrls = new Set();
//   const cleanups = [];
//   const hold = [];
//   const startedAt = performance.now();
//   let lastAdd = startedAt;
//   let dead = false;

//   const abs = (u) => {
//     try { return new URL(u, document.baseURI).href; } catch { return u; }
//   };
//   const add = (key, label) => {
//     if (tasks.has(key)) return false;
//     tasks.set(key, { p: 0, label });
//     lastAdd = performance.now();
//     return true;
//   };
//   const progress = (key, p) => {
//     const t = tasks.get(key);
//     if (t && p > t.p) t.p = Math.min(1, p);
//   };
//   const finish = (key) => progress(key, 1);
//   const listen = (el, type, fn) => {
//     el.addEventListener(type, fn, { once: true });
//     cleanups.push(() => el.removeEventListener(type, fn));
//   };
//   const decoded = (img) =>
//     typeof img.decode === 'function' ? img.decode().catch(() => {}) : Promise.resolve();

//   function preloadImage(url) {
//     if (!url || url.startsWith('data:') || seenUrls.has(url)) return;
//     seenUrls.add(url);
//     add(url, url);
//     const img = new Image();
//     hold.push(img);
//     img.onload = () => decoded(img).then(() => finish(url));
//     img.onerror = () => { finish(url); };
//     img.src = url;
//   }

//   function preloadMedia(url) {
//     if (seenUrls.has(url)) return;
//     seenUrls.add(url);
//     add(url, url);
//     const el = document.createElement(VIDEO_RE.test(url) ? 'video' : 'audio');
//     hold.push(el);
//     el.preload = 'auto';
//     el.muted = true;
//     el.addEventListener('canplay', () => finish(url), { once: true });
//     el.addEventListener('error', () => finish(url), { once: true });
//     el.src = url;
//   }

//   function trackImg(img) {
//     if (seenEls.has(img)) return;
//     seenEls.add(img);
//     if (!img.getAttribute('src') && !img.getAttribute('srcset') && !img.currentSrc) return;
//     add(img, img.currentSrc || img.getAttribute('src') || 'img');
//     if (img.loading === 'lazy') img.loading = 'eager';
//     const ok = () => finish(img);
//     const fail = () => finish(img);
//     if (typeof img.decode === 'function') img.decode().then(ok, fail);
//     else if (img.complete) ok();
//     else { listen(img, 'load', ok); listen(img, 'error', fail); }
//   }

//   function trackMedia(el) {
//     if (seenEls.has(el)) return;
//     seenEls.add(el);
//     if (el.preload === 'none') return;
//     if (!el.getAttribute('src') && !el.querySelector('source')) return;
//     if (el.poster) preloadImage(abs(el.poster));
//     add(el, el.currentSrc || el.getAttribute('src') || 'media');
//     if (el.preload !== 'auto') el.preload = 'auto';
//     if (el.readyState >= 3) return finish(el);
//     listen(el, 'canplay', () => finish(el));
//     listen(el, 'error', () => finish(el));
//   }

//   function trackBackgrounds(scope) {
//     const nodes = [scope, ...Array.from(scope.querySelectorAll?.('*') ?? []).slice(0, 4000)];
//     for (const n of nodes) {
//       if (n.nodeType !== 1) continue;
//       let bg = '';
//       try { bg = getComputedStyle(n).backgroundImage; } catch { /* ignore */ }
//       if (!bg || bg === 'none') continue;
//       for (const m of bg.matchAll(/url\((["']?)(.*?)\1\)/g)) preloadImage(abs(m[2]));
//     }
//   }

//   function scan(scope) {
//     if (scope.matches?.('img')) trackImg(scope);
//     else if (scope.matches?.('video,audio')) trackMedia(scope);
//     scope.querySelectorAll?.('img').forEach(trackImg);
//     scope.querySelectorAll?.('video,audio').forEach(trackMedia);
//     trackBackgrounds(scope);
//   }

//   add('fonts', 'fonts');
//   if (document.fonts?.ready) {
//     requestAnimationFrame(() =>
//       requestAnimationFrame(() => document.fonts.ready.then(() => !dead && finish('fonts')))
//     );
//   } else finish('fonts');

//   add('window', 'window load');
//   if (document.readyState === 'complete') finish('window');
//   else {
//     const onLoad = () => finish('window');
//     window.addEventListener('load', onLoad, { once: true });
//     cleanups.push(() => window.removeEventListener('load', onLoad));
//   }

//   let observer = null;
//   if (root) {
//     scan(root);
//     observer = new MutationObserver((muts) => {
//       for (const m of muts) m.addedNodes.forEach((n) => n.nodeType === 1 && scan(n));
//     });
//     observer.observe(root, { childList: true, subtree: true });
//   }

//   assets.forEach((a, i) => {
//     if (typeof a === 'function') {
//       const key = `task:${i}`;
//       add(key, a.name || key);
//       Promise.resolve()
//         .then(() => a((p) => progress(key, Math.min(p, 0.99))))
//         .catch(() => {})
//         .finally(() => finish(key));
//     } else if (typeof a === 'string') {
//       const url = abs(a);
//       if (IMAGE_RE.test(a)) preloadImage(url);
//       else if (MEDIA_RE.test(a)) preloadMedia(url);
//       else if (!seenUrls.has(url)) {
//         seenUrls.add(url);
//         add(url, url);
//         fetch(url)
//           .then((r) => r.blob())
//           .catch(() => {})
//           .finally(() => finish(url));
//       }
//     }
//   });

//   return {
//     read(now) {
//       let sum = 0;
//       const pending = [];
//       tasks.forEach((t) => {
//         sum += t.p;
//         if (t.p < 1) pending.push(t.label);
//       });
//       const timedOut = timeout > 0 && now - startedAt > timeout;
//       const settled = timedOut || (pending.length === 0 && now - lastAdd >= 250);
//       return { target: settled ? 1 : Math.min(sum / tasks.size, 0.99) };
//     },
//     destroy() {
//       dead = true;
//       observer?.disconnect();
//       cleanups.forEach((fn) => fn());
//     },
//   };
// }

// /* ---------------------------------------------------------------------------
//  *  Overlay Component – Very subtle soft glow
//  * ------------------------------------------------------------------------- */

// function Overlay({ contentRef, assets, minDuration, timeout, onReady }) {
//   const pathRef = useRef(null);
//   const latest = useRef({ assets, minDuration, timeout, onReady });
//   latest.current = { assets, minDuration, timeout, onReady };

//   useEffect(() => {
//     const { assets: list, minDuration: minMs, timeout: limit } = latest.current;
//     const tracker = createTracker({ root: contentRef.current, assets: list, timeout: limit });
//     const t0 = performance.now();
//     let last = t0;
//     let shown = 0;
//     let raf = 0;
//     let holdTimer = 0;

//     const paint = (v) => {
//       if (pathRef.current) {
//         pathRef.current.style.strokeDashoffset = String(1000 * (1 - v));
//       }
//     };

//     const tick = (now) => {
//       const dt = Math.min(0.1, (now - last) / 1000);
//       last = now;
//       const { target } = tracker.read(now);

//       const timeCap = minMs > 0 ? (now - t0) / minMs : 1;
//       const goal = Math.min(target, timeCap);

//       if (goal > shown) {
//         shown = Math.min(goal, shown + LINEAR_SPEED * dt);
//         if (goal >= 1 && 1 - shown < 0.002) shown = 1;
//       }

//       paint(shown);

//       if (shown >= 1) {
//         holdTimer = window.setTimeout(() => {
//           latest.current.onReady();
//         }, HOLD_MS);
//         return;
//       }
//       raf = requestAnimationFrame(tick);
//     };
//     raf = requestAnimationFrame(tick);

//     return () => {
//       cancelAnimationFrame(raf);
//       clearTimeout(holdTimer);
//       tracker.destroy();
//     };
//   }, [contentRef]);

//   return (
//     <div className="fixed inset-0 z-[9999] bg-[#121212] flex flex-col justify-center items-center overflow-hidden select-none">
//       <div className="relative w-full max-w-2xl 2xl:max-w-[45vw] 4xl:max-w-[1152px] px-8 flex flex-col items-center">
//         <svg
//           viewBox="0 0 1330.2 636.6"
//           className="w-full h-auto max-h-[80vh] drop-shadow-[0_0_10px_rgba(245,245,220,0.12)]"
//           fill="none"
//           xmlns="http://www.w3.org/2000/svg"
//           role="img"
//           aria-label="Signature being written"
//         >
//           <path
//             ref={pathRef}
//             d={SIGNATURE_PATH}
//             stroke="#F5F5DC"
//             strokeWidth="8"
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             pathLength="1000"
//             style={{ strokeDasharray: 1000, strokeDashoffset: 1000 }}
//           />
//         </svg>
//       </div>
//     </div>
//   );
// }

// /* ---------------------------------------------------------------------------
//  *  Public Loader Component
//  * ------------------------------------------------------------------------- */

// export default function Loader({ children, assets = [], minDuration = 3030, timeout = 30000 }) {
//   const [status, setStatus] = useState('loading');
//   const contentRef = useRef(null);

//   useEffect(() => {
//     document.documentElement.dataset.loader = status;
//   }, [status]);

//   const ctx = useMemo(
//     () => ({ status, revealed: status !== 'loading', done: status === 'done' }),
//     [status]
//   );

//   return (
//     <LoaderContext.Provider value={ctx}>
//       <div ref={contentRef} style={{ display: 'contents' }}>
//         {children}
//       </div>
//       <Overlay
//         contentRef={contentRef}
//         assets={assets}
//         minDuration={minDuration}
//         timeout={timeout}
//         onReady={() => setStatus('done')}
//       />
//     </LoaderContext.Provider>
//   );
// }

// /* Signature Path Data */
// const SIGNATURE_PATH = `M118.87 548.98 C121.96 546.06 125.25 543.37 128.34 540.45 C132.68 536.33 136.85 532 141.08 527.77
//   C143.62 525.23 146.43 522.77 148.57 519.87 C152.13 515.05 152.2 508.91 156.11 503.99
//   C160.8 498.1 166.32 492.96 171.21 487.25 C184.67 471.51 198.04 455.72 211.38 439.89
//   C217.63 432.45 223.96 425.06 230.36 417.75 C233.58 414.08 236.86 410.49 239.99 406.74
//   C252.09 392.21 263.57 377.22 275.18 362.31 C277.91 358.81 280.42 355.15 283.06 351.58
//   C285.33 348.51 287.73 345.53 289.97 342.44 C292.74 338.62 295.34 334.66 298.04 330.78
//   C300.02 327.92 302.17 325.18 304.12 322.3 C306.76 318.43 309.17 314.39 311.65 310.42
//   C317.69 300.76 325.45 288.34 328.23 277.29 C329.72 271.37 332.58 259.53 329.58 254.01
//   C327.73 250.62 322.72 248.19 319.4 246.42 C311.67 242.29 311.25 243.99 304 242.56
//   C301.86 242.14 299.9 241.18 297.79 240.65 C292.39 239.29 285.28 240.63 280.05 242.36
//   C276.55 243.52 273.23 245.22 269.85 246.7 C244.55 257.79 220.73 273 198.52 289.35
//   C194.93 291.99 191.45 294.79 187.85 297.39 C185.55 299.04 183.12 300.51 180.83 302.18
//   C176.7 305.19 172.72 308.45 168.77 311.69 C162.41 316.9 156.61 322.58 150.59 328.15
//   C148.44 330.14 146.14 331.96 143.99 333.96 C139.13 338.49 134.52 343.33 129.82 348.03
//   C125.36 352.49 120.75 356.85 116.48 361.5 C114.72 363.42 113.09 365.45 111.34 367.37
//   C109.57 369.32 107.72 371.18 106 373.16 C103.46 376.09 101.07 379.15 98.51 382.06
//   C97.02 383.75 95.45 385.38 93.68 386.79 C92.46 387.76 90.92 388.51 89.9 389.71
//   C88.83 390.97 87.93 395.21 86.25 397.81 C84.36 400.74 82.1 403.41 80.12 406.27
//   C77.63 409.86 75.38 413.64 73.07 417.35 C71.42 420 69.71 422.61 68.17 425.32
//   C67.09 427.2 66.17 429.16 65.08 431.04 C63.83 433.21 62.37 435.23 61.14 437.41
//   C59.61 440.09 58.48 442.97 57.18 445.77 C51.22 458.49 48.84 466.34 50.03 480.67
//   C51 492.36 59.5 501.6 67.38 509.49 C71.58 513.69 75.65 518.14 80.21 521.96
//   C85.04 526.01 90.44 529.4 95.7 532.86 C99.85 535.59 106.5 540.04 111.21 541.28
//   C115.88 542.52 121.12 541.98 125.92 541.98 C126.61 544.11 127.16 546.51 128.28 548.46
//   C131.59 554.24 141.35 558.73 146.95 562.38 C162.26 572.38 180.04 581.93 194.17 593.23
//   C198.57 596.74 208.91 605.69 210.98 610.59 C211.65 612.19 211.61 613.65 211.87 615.35
//   C210.14 616.77 209.59 617.58 207.45 618.5 C202.27 620.75 196.4 620.81 190.91 621.8
//   C185.97 622.69 181.06 623.76 176.12 624.72 C171.68 625.59 167.27 625.84 162.79 626.32
//   C158.33 626.8 153.86 627.43 149.39 627.78 C144.77 628.15 140.1 627.98 135.47 627.98
//   C131.16 627.98 126.83 628.11 122.52 627.86 C119.95 627.71 117.4 627.3 114.83 627.13
//   C111.21 626.89 107.59 627.06 103.98 626.76 C98.25 626.28 92.6 625.34 86.92 624.48
//   C84.4 624.1 81.85 623.95 79.34 623.47 C76.9 623 74.54 622.2 72.13 621.57
//   C65.82 619.91 59.51 618.36 53.3 616.33 C49.78 615.19 46.42 613.63 43 612.24
//   C30.41 607.11 25.07 603.98 16.1 593.58 C12.02 588.84 5.58 583.61 10.29 576.97
//   C12.52 573.83 18.94 567.31 22.46 565.93 C24.25 565.22 26.18 565.09 28.09 565.03
//   C34 564.85 38.32 566.18 43.89 567.83 C47.46 568.89 51.01 569.86 54.33 571.59
//   C62.4 575.77 70.16 580.77 77.1 586.63 C79.36 588.53 81.45 590.61 83.63 592.6
//   C97.69 605.33 112.48 618.42 132.38 619.62 C136.25 619.85 140.78 619.33 144.25 617.49
//   C150.62 614.1 160.25 601.62 164.73 595.62 C168.27 590.87 171.86 586.03 174.19 580.54
//   C174.79 579.12 175.27 577.65 175.87 576.23 C176.71 574.25 177.75 572.35 178.58 570.35
//   C179.69 567.67 180.34 564.74 181.79 562.21 C182.35 561.23 182.98 560.91 183.72 559.98
//   C184.53 560.17 185.38 560.2 186.19 560.39 C190.92 561.49 194.2 565.91 198.33 568.17
//   C202.26 570.31 206.75 570.92 211.17 570.93 C221.95 570.97 232.07 565.92 240.27 559.17
//   C244.04 556.08 247.5 552.65 251.3 549.58 C261.01 541.72 271.71 534.94 283.24 530.12
//   C292.05 526.45 301.08 523.29 309.98 519.85 C312.57 518.84 315.05 517.6 317.63 516.58
//   C320.21 515.56 322.89 514.81 325.48 513.8 C329.5 512.23 333.39 510.38 337.34 508.65
//   C341.85 506.67 346.45 504.86 350.88 502.7 C354.23 501.07 357.42 499.18 360.69 497.41
//   C363.14 496.07 365.65 494.85 368.03 493.4 C373.91 489.79 379.56 485.49 384.98 481.22
//   C401.63 468.1 420.64 447.38 432.9 430.04 C434.71 427.48 436.23 424.75 437.88 422.1
//   C439.86 418.9 441.98 415.78 444.11 412.68 C453.53 398.95 462.92 385.22 471.82 371.16
//   C474.49 366.94 477.07 362.46 480.35 358.69 C483.15 355.48 486.5 352.74 488.97 349.26
//   C491.14 346.2 492.09 342.52 494.15 339.4 C495.89 336.76 498.49 334.68 499.78 331.74
//   C501.06 328.84 500.87 325.54 501.62 322.5 C502.22 320.1 503.25 317.84 504.05 315.5
//   C504.84 313.16 505.4 310.75 506.34 308.45 C508.01 304.37 511.09 301.15 512.84 297.15
//   C513.96 294.6 514.49 291.83 515.43 289.22 C517.62 283.15 520.21 277.18 522.65 271.21
//   C524.86 265.81 527.14 260.39 529.61 255.09 C531.43 251.18 533.41 247.34 535.16 243.39
//   C537.52 238.03 539.61 232.57 542.26 227.33 C544.21 223.46 546.73 219.87 548.81 216.04
//   C549.18 216.74 549.44 217.49 549.81 218.19 C551.81 221.98 553.5 223.13 553.74 227.85
//   C554.14 235.82 550.32 243.01 546.79 249.89 C541.25 260.71 534.89 271 528.39 281.27
//   C526.55 284.19 524.93 287.26 522.7 289.91 C518.06 295.4 511.9 299.76 507.91 305.79
//   C505.82 308.95 505.08 312.58 503.84 316.1 C503.12 318.13 502.27 320.12 501.64 322.19
//   C500.84 324.85 500.42 327.65 499.24 330.19 C497.66 333.6 495.01 336.35 493.47 339.8
//   C488.67 350.5 485.63 361.95 482.06 373.08 C477.06 388.69 471.7 404.26 468.01 420.26
//   C466.54 426.64 464.89 432.98 463.45 439.37 C461.79 446.71 460.4 454.13 458.97 461.51
//   C458.03 466.36 456.04 475.51 458.55 479.86 C459.57 481.62 461.01 482.63 462.46 483.98
//   C466.31 481.62 469.83 479 473.01 475.74 C476.15 472.53 478.52 468.7 481.31 465.2
//   C484.74 460.91 488.39 456.8 491.92 452.6 C494.2 449.88 496.33 447.05 498.68 444.4
//   C501.52 441.19 504.73 438.33 507.48 435.04 C509.32 432.84 510.95 430.47 512.71 428.21
//   C518.54 420.68 524.26 413.06 529.67 405.23 C533.06 400.32 536.28 395.29 539.64 390.36
//   C544.61 383.08 549.68 375.86 554.63 368.57 C557.63 364.16 560.43 359.63 563.4 355.2
//   C565.34 352.32 567.59 349.64 569.49 346.73 C570.85 344.64 571.95 342.41 573.24 340.28
//   C575.35 336.8 577.64 333.44 579.79 329.99 C581.1 327.87 582.31 325.69 583.68 323.6
//   C587.28 318.08 591.03 312.63 594.76 307.19 C596.18 305.11 597.71 303.1 599.07 300.98
//   C600.75 298.36 601.81 295.4 603.58 292.85 C606.61 288.5 615.3 280.56 619.44 276.42
//   C624.38 271.47 629.24 266.42 634.3 261.61 C636.91 259.14 639.73 256.92 642.34 254.45
//   C645.71 251.25 648.87 247.83 652.29 244.68 C659.04 238.47 663.29 236.51 668.87 228.65
//   C667.94 229.51 666.63 231.08 665.58 232.19 C663.55 234.35 661.45 236.45 659.3 238.48
//   C656.93 240.73 654.37 242.75 651.99 244.97 C648.58 248.13 645.42 251.55 642.03 254.74
//   C639.89 256.74 637.6 258.57 635.44 260.55 C632.26 263.46 629.32 266.63 626.19 269.59
//   C623.81 271.83 621.25 273.85 618.87 276.07 C614.04 280.59 609.72 285.74 604.62 289.95
//   C601.46 292.55 597.65 294.09 594.28 296.39 C585.94 302.07 577.85 308.12 569.48 313.77
//   C565.05 316.75 560.62 319.72 556.17 322.67 C554.08 324.06 552.09 325.61 549.9 326.85
//   C547.22 328.38 544.33 329.52 541.62 331 C538.36 332.79 535.17 334.67 531.75 336.13
//   C526.05 338.55 516.14 342.2 510.06 340.24 C508.26 339.67 506.71 338.57 505.4 337.23
//   C501.2 332.94 501.24 325.59 502.6 320.07 C503.19 317.68 504.12 315.36 504.83 313
//   C506.3 308.11 508.59 302.65 514.13 301.44 C521.17 299.9 525.83 304.65 530.64 308.95
//   C533.1 311.15 535.37 313.55 537.82 315.76 C540.24 317.95 542.77 320 545.12 322.27
//   C549.64 326.63 553.85 331.36 558.7 335.37 C561.18 337.41 563.79 339.28 566.18 341.44
//   C569.12 344.1 571.8 347.02 574.79 349.62 C577.22 351.73 579.79 353.68 582.26 355.74
//   C588.44 360.92 594.64 366.07 600.85 371.21 C604.85 374.52 608.68 378.02 612.65 381.35
//   C617.05 385.05 621.75 388.33 626.32 391.81 C630.15 394.71 633.89 397.75 637.58 400.83
//   C650.96 411.96 672.55 431.42 688.55 437.12 C702.04 441.93 706.68 435.34 713.81 425.02
//   C718.77 417.85 723.74 410.55 727.7 402.77 C729.52 399.2 731.05 395.49 732.7 391.84
//   C736.66 383.12 739.63 374.05 742.91 365.07 C744.39 361.02 746.09 357.05 747.51 352.98
//   C750.27 345.1 752.58 337.08 755.19 329.16 C756.83 324.18 758.8 319.31 760.49 314.35
//   C761.79 310.55 762.8 306.66 764.1 302.85 C765.09 299.92 766.18 297.04 767.09 294.09
//   C768.54 289.38 769.72 284.52 771.72 280 C773.83 275.22 777.45 271.05 779.1 266.06
//   C779.8 263.96 779.94 261.73 780.3 259.56 C780.91 255.83 781.81 252.15 782.34 248.4
//   C782.74 245.52 782.84 242.62 783.13 239.73 C783.49 236 783.61 231.97 784.65 228.36
//   C785.33 225.97 786.58 223.83 787.51 221.55 C789.5 216.64 790.62 207.54 789.49 202.35
//   C789.31 201.56 789.01 200.8 788.84 200.01 C787.54 201.52 786.22 202.86 785.19 204.57
//   C783.34 207.64 782.95 211.66 780.52 214.35 C778.44 216.64 775.22 217.12 772.72 218.78
//   C769.03 221.22 766.36 225.15 763.97 228.79 C762.61 230.87 761.44 233.07 760.14 235.2
//   C758.67 237.59 757.08 239.91 755.73 242.37 C751.88 249.35 747.7 259.37 744.97 266.91
//   C743.92 269.82 743.09 272.8 742.07 275.71 C740.96 278.92 739.58 282.02 738.56 285.26
//   C737.72 287.92 737.08 290.64 736.24 293.3 C734.29 299.48 731.66 305.42 729.73 311.6
//   C726.93 320.58 725.12 329.72 723.28 338.93 C722.36 343.55 721.33 348.16 720.56 352.8
//   C720.03 356 719.95 359.21 719.68 362.44 C719.16 368.64 718.5 374.81 719.01 381.05
//   C719.65 388.9 722.78 388.26 720.87 397.52 C722.51 393.53 724.37 389.63 725.97 385.63
//   C728.5 379.34 730.73 372.93 733.09 366.58 C736.2 358.2 739.39 349.85 742.36 341.42
//   C744.11 336.46 745.45 331.37 747.18 326.41 C755.22 303.37 763.03 280.24 769.78 256.78
//   C770.9 252.89 771.75 248.94 772.82 245.04 C773.82 241.42 775.23 238.03 777.3 234.89
//   C778.32 233.36 779.4 231.89 780.09 230.17 C780.7 228.65 780.95 227.01 781.3 225.41
//   C782.03 228.37 783.05 231.4 783.29 234.44 C783.44 236.31 783.22 238.17 783.07 240.03
//   C782.87 242.61 782.77 245.19 782.44 247.76 C781.75 253.1 780.63 258.38 779.96 263.73
//   C779.32 268.86 779.07 274 778.52 279.13 C778.03 283.59 777.27 288.03 777 292.5
//   C776.74 296.79 777.01 301.09 776.68 305.37 C776.48 307.94 776.06 310.48 775.99 313.06
//   C775.85 318.54 777.54 333.5 779.4 338.53 C780.15 340.57 781.28 342.18 782.44 343.98
//   C783.57 343.78 784.56 343.82 785.65 343.52 C789.47 342.43 792.64 339.58 794.68 336.23
//   C795.64 334.64 796.32 332.9 797.28 331.31 C799.23 328.08 801.7 325.21 803.6 321.93
//   C807.52 315.21 811.53 308.56 815.4 301.82 C817.26 298.59 819.25 295.45 820.77 292.04
//   C821.91 289.51 822.89 286.92 824.01 284.38 C826.14 279.58 828.43 274.88 830.74 270.17
//   C831.96 267.69 833.06 265.13 834.66 262.86 C835.88 261.12 837.33 259.85 838.87 258.43
//   C842.32 268.71 841.1 271.22 842.62 280.87 C843.79 288.27 846 295.38 848.85 302.29
//   C850.91 307.3 852.87 311.15 856.9 314.9 C858.05 315.97 859.28 317.01 860.71 317.67
//   C865.04 319.65 872.8 317.75 876.69 315.32 C878.89 313.95 880.7 312.07 882.64 310.37
//   C886.23 307.23 890.35 304.84 894.16 301.99 C896.2 300.47 898.08 298.71 900.26 297.38
//   C902.65 295.93 905.33 295.1 907.65 293.51 C911.37 290.95 914.36 287.48 918.08 284.9
//   C924.02 280.77 934.4 274.71 941.62 274.15 C945.48 273.85 949.32 274.49 953.13 275.02
//   C962.62 276.34 972.53 276.88 981.58 273.19 C996.19 267.22 1006.09 254.97 1015.38 242.76
//   C1019.55 237.27 1021.76 233.8 1027.2 229.31 C1033.67 234.23 1036.51 237.6 1044.47 240.73
//   C1061.56 247.45 1083.43 245.54 1100.69 240.11 C1110.2 237.12 1125.58 230.21 1134.75 225.76
//   C1144.16 221.2 1153.05 214.39 1161.5 208.26 C1167.93 203.59 1174.44 199.01 1180.57 193.94
//   C1184.83 190.42 1188.91 186.68 1193.04 183 C1197.65 178.89 1202.37 174.88 1206.95 170.73
//   C1208.91 168.96 1210.75 167.07 1212.71 165.3 C1214.88 163.33 1217.17 161.5 1219.3 159.49
//   C1226.79 152.4 1233.94 144.91 1241.24 137.61 C1246.41 132.44 1251.73 127.38 1256.73 122.03
//   C1261.63 116.8 1266.22 111.26 1271.06 105.97 C1275.34 101.28 1280.73 98.44 1283.99 94.47
//   C1285.79 92.29 1286.91 89.72 1288.26 87.27 C1290.32 83.54 1292.72 79.64 1295.54 76.45
//   C1297.6 74.12 1300.23 72.41 1302.47 70.27 C1307.63 65.31 1315.29 55.35 1318.22 48.85
//   C1320.36 44.1 1322 38.74 1321.55 33.48 C1321.34 31.08 1320.77 28.76 1320.74 26.34
//   C1320.65 20.43 1320.87 14.51 1320.87 8.6 C1320.87 12.07 1321.16 15.75 1320.34 19.15
//   C1319.76 21.57 1318.38 23.67 1317.32 25.89 C1315.99 28.68 1314.85 31.54 1313.44 34.28
//   C1309.62 41.72 1305.38 48.89 1301.87 56.49 C1300.09 60.36 1298.08 64.32 1296.79 68.39
//   C1295.95 71.07 1295.76 73.91 1294.68 76.52 C1293.37 79.68 1291.16 82.41 1289.39 85.32
//   C1287.33 88.73 1285.64 92.46 1284.2 96.17 C1282.62 100.22 1281.85 104.56 1280.8 108.77
//   C1278.61 117.55 1276.45 126.32 1274.49 135.15 C1271.9 146.83 1269.45 158.63 1268.15 170.53
//   C1267.45 176.99 1267.16 183.46 1266.72 189.94 C1266.55 192.51 1266.14 195.06 1265.99 197.63
//   C1265.85 199.93 1265.88 202.23 1265.74 204.53 C1265.56 207.43 1265.09 210.3 1264.96 213.2
//   C1264.79 216.84 1264.96 220.49 1264.76 224.12 C1264.59 227.35 1264.06 230.55 1263.94 233.78
//   C1263.77 238.08 1264 242.4 1263.73 246.7 C1263.55 249.6 1263.08 252.47 1262.95 255.37
//   C1262.76 259.68 1263 263.99 1262.75 268.29 C1262.38 274.73 1261.55 281.16 1261.06 287.59
//   C1260.78 291.2 1260.96 294.82 1260.68 298.43 C1260.35 302.57 1259.69 306.7 1259.22 310.83
//   C1258.93 313.39 1258.78 315.96 1258.47 318.52 C1257.48 326.68 1256.2 334.88 1254.76 342.98
//   C1253.62 349.47 1252.14 355.91 1250.87 362.37`;



















































// import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

// /* ==========================================================================
//  *  <Loader> – Signature Loader → Red Tear WebGL Transition
//  * ========================================================================== */

// const HOLD_MS = 700; // 0.7s hold delay after signature finishes drawing
// const LINEAR_SPEED = 0.33; // 33% per second linear speed (~3.03s total write time)

// // -----------------------------------------------------------------------
// // Tear transition color — change this single value to re-theme the sweep.
// // Provide any CSS hex color; top/foot form a subtle vertical gradient.
// // -----------------------------------------------------------------------
// const TEAR_COLOR = {
//   top: '#E11D2A',  // brighter red
//   foot: '#8B0000', // deep red
// };

// const LoaderContext = createContext({ status: 'done', revealed: true, done: true });
// export const useLoader = () => useContext(LoaderContext);

// /* ---------------------------------------------------------------------------
//  *  Asset Tracker
//  * ------------------------------------------------------------------------- */

// const IMAGE_RE = /\.(avif|bmp|gif|ico|jpe?g|png|svg|webp)(?:[?#]|$)/i;
// const MEDIA_RE = /\.(aac|m4a|m4v|mov|mp3|mp4|oga|ogg|ogv|wav|webm)(?:[?#]|$)/i;
// const VIDEO_RE = /\.(m4v|mov|mp4|ogv|webm)(?:[?#]|$)/i;

// function createTracker({ root, assets, timeout }) {
//   const tasks = new Map();
//   const seenEls = new WeakSet();
//   const seenUrls = new Set();
//   const cleanups = [];
//   const hold = [];
//   const startedAt = performance.now();
//   let lastAdd = startedAt;
//   let dead = false;

//   const abs = (u) => {
//     try { return new URL(u, document.baseURI).href; } catch { return u; }
//   };
//   const add = (key, label) => {
//     if (tasks.has(key)) return false;
//     tasks.set(key, { p: 0, label });
//     lastAdd = performance.now();
//     return true;
//   };
//   const progress = (key, p) => {
//     const t = tasks.get(key);
//     if (t && p > t.p) t.p = Math.min(1, p);
//   };
//   const finish = (key) => progress(key, 1);
//   const listen = (el, type, fn) => {
//     el.addEventListener(type, fn, { once: true });
//     cleanups.push(() => el.removeEventListener(type, fn));
//   };
//   const decoded = (img) =>
//     typeof img.decode === 'function' ? img.decode().catch(() => {}) : Promise.resolve();

//   function preloadImage(url) {
//     if (!url || url.startsWith('data:') || seenUrls.has(url)) return;
//     seenUrls.add(url);
//     add(url, url);
//     const img = new Image();
//     hold.push(img);
//     img.onload = () => decoded(img).then(() => finish(url));
//     img.onerror = () => { finish(url); };
//     img.src = url;
//   }

//   function preloadMedia(url) {
//     if (seenUrls.has(url)) return;
//     seenUrls.add(url);
//     add(url, url);
//     const el = document.createElement(VIDEO_RE.test(url) ? 'video' : 'audio');
//     hold.push(el);
//     el.preload = 'auto';
//     el.muted = true;
//     el.addEventListener('canplay', () => finish(url), { once: true });
//     el.addEventListener('error', () => finish(url), { once: true });
//     el.src = url;
//   }

//   function trackImg(img) {
//     if (seenEls.has(img)) return;
//     seenEls.add(img);
//     if (!img.getAttribute('src') && !img.getAttribute('srcset') && !img.currentSrc) return;
//     add(img, img.currentSrc || img.getAttribute('src') || 'img');
//     if (img.loading === 'lazy') img.loading = 'eager';
//     const ok = () => finish(img);
//     const fail = () => finish(img);
//     if (typeof img.decode === 'function') img.decode().then(ok, fail);
//     else if (img.complete) ok();
//     else { listen(img, 'load', ok); listen(img, 'error', fail); }
//   }

//   function trackMedia(el) {
//     if (seenEls.has(el)) return;
//     seenEls.add(el);
//     if (el.preload === 'none') return;
//     if (!el.getAttribute('src') && !el.querySelector('source')) return;
//     if (el.poster) preloadImage(abs(el.poster));
//     add(el, el.currentSrc || el.getAttribute('src') || 'media');
//     if (el.preload !== 'auto') el.preload = 'auto';
//     if (el.readyState >= 3) return finish(el);
//     listen(el, 'canplay', () => finish(el));
//     listen(el, 'error', () => finish(el));
//   }

//   function trackBackgrounds(scope) {
//     const nodes = [scope, ...Array.from(scope.querySelectorAll?.('*') ?? []).slice(0, 4000)];
//     for (const n of nodes) {
//       if (n.nodeType !== 1) continue;
//       let bg = '';
//       try { bg = getComputedStyle(n).backgroundImage; } catch { /* ignore */ }
//       if (!bg || bg === 'none') continue;
//       for (const m of bg.matchAll(/url\((["']?)(.*?)\1\)/g)) preloadImage(abs(m[2]));
//     }
//   }

//   function scan(scope) {
//     if (scope.matches?.('img')) trackImg(scope);
//     else if (scope.matches?.('video,audio')) trackMedia(scope);
//     scope.querySelectorAll?.('img').forEach(trackImg);
//     scope.querySelectorAll?.('video,audio').forEach(trackMedia);
//     trackBackgrounds(scope);
//   }

//   add('fonts', 'fonts');
//   if (document.fonts?.ready) {
//     requestAnimationFrame(() =>
//       requestAnimationFrame(() => document.fonts.ready.then(() => !dead && finish('fonts')))
//     );
//   } else finish('fonts');

//   add('window', 'window load');
//   if (document.readyState === 'complete') finish('window');
//   else {
//     const onLoad = () => finish('window');
//     window.addEventListener('load', onLoad, { once: true });
//     cleanups.push(() => window.removeEventListener('load', onLoad));
//   }

//   let observer = null;
//   if (root) {
//     scan(root);
//     observer = new MutationObserver((muts) => {
//       for (const m of muts) m.addedNodes.forEach((n) => n.nodeType === 1 && scan(n));
//     });
//     observer.observe(root, { childList: true, subtree: true });
//   }

//   assets.forEach((a, i) => {
//     if (typeof a === 'function') {
//       const key = `task:${i}`;
//       add(key, a.name || key);
//       Promise.resolve()
//         .then(() => a((p) => progress(key, Math.min(p, 0.99))))
//         .catch(() => {})
//         .finally(() => finish(key));
//     } else if (typeof a === 'string') {
//       const url = abs(a);
//       if (IMAGE_RE.test(a)) preloadImage(url);
//       else if (MEDIA_RE.test(a)) preloadMedia(url);
//       else if (!seenUrls.has(url)) {
//         seenUrls.add(url);
//         add(url, url);
//         fetch(url)
//           .then((r) => r.blob())
//           .catch(() => {})
//           .finally(() => finish(url));
//       }
//     }
//   });

//   return {
//     read(now) {
//       let sum = 0;
//       const pending = [];
//       tasks.forEach((t) => {
//         sum += t.p;
//         if (t.p < 1) pending.push(t.label);
//       });
//       const timedOut = timeout > 0 && now - startedAt > timeout;
//       const settled = timedOut || (pending.length === 0 && now - lastAdd >= 250);
//       return { target: settled ? 1 : Math.min(sum / tasks.size, 0.99) };
//     },
//     destroy() {
//       dead = true;
//       observer?.disconnect();
//       cleanups.forEach((fn) => fn());
//     },
//   };
// }

// /* ---------------------------------------------------------------------------
//  *  Tear Transition – WebGL, ported 1:1 from the HTML reference
//  * ------------------------------------------------------------------------- */

// const VERTEX_SHADER = `
//   attribute vec2 aPos;
//   varying vec2 vUv;
//   void main() {
//     vUv = aPos * 0.5 + 0.5;
//     gl_Position = vec4(aPos, 0.0, 1.0);
//   }
// `;

// const FRAGMENT_SHADER = `
//   precision highp float;
//   varying vec2 vUv;

//   uniform float uP;
//   uniform float uTime;
//   uniform float uAspect;
//   uniform float uFlip;
//   uniform float uOut;
//   uniform float uDispAmp;
//   uniform float uDispScale;
//   uniform float uDispDrift;
//   uniform float uSoft;
//   uniform float uLens;
//   uniform float uAxis;
//   uniform int uDetail;
//   uniform vec3 uTop;
//   uniform vec3 uFoot;

//   float hash(vec2 p) {
//     return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
//   }

//   float vnoise(vec2 p) {
//     vec2 i = floor(p);
//     vec2 f = fract(p);
//     vec2 u = f * f * (3.0 - 2.0 * f);
//     return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
//                mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
//   }

//   float fbm(vec2 p, int oct) {
//     float v = 0.0;
//     float a = 0.5;
//     for (int i = 0; i < 6; i++) {
//       if (i >= oct) break;
//       v += a * vnoise(p);
//       p *= 2.03;
//       a *= 0.5;
//     }
//     return v;
//   }

//   float axisY(vec2 uv) {
//     vec2 q = (uAxis > 0.5) ? vec2(uv.y, uv.x) : uv;
//     return mix(q.y, 1.0 - q.y, uFlip);
//   }

//   float noiseAt(vec2 uv) {
//     vec2 q = (uAxis > 0.5) ? vec2(uv.y, uv.x) : uv;
//     float y = mix(q.y, 1.0 - q.y, uFlip);
//     return fbm(vec2(q.x * uAspect, y) * uDispScale + vec2(0.0, uTime * uDispDrift), uDetail) - 0.5;
//   }

//   float field(vec2 uv) {
//     float edge = mix(-uDispAmp, 1.0 + uDispAmp, uP);
//     return (edge - axisY(uv)) + noiseAt(uv) * uDispAmp * 2.0;
//   }

//   vec2 lensAt(vec2 uv, float k, out bool outside) {
//     outside = false;
//     vec2 d = uv - 0.5;
//     vec2 w = 0.5 + d * (1.0 + k * dot(d, d) * 4.0);
//     if (w.x < 0.0 || w.x > 1.0 || w.y < 0.0 || w.y > 1.0) outside = true;
//     return w;
//   }

//   void main() {
//     bool outside = false;
//     vec2 uv = (uLens == 0.0) ? vUv : lensAt(vUv, uLens, outside);
//     if (outside) uv = clamp(uv, 0.0, 1.0);

//     float a = smoothstep(-uSoft, uSoft, field(uv));
//     a = max(a, smoothstep(0.985, 1.0, uP));

//     a = mix(a, 1.0 - a, uOut);
//     if (a <= 0.001) discard;

//     vec3 col = mix(uFoot, uTop, clamp(vUv.y, 0.0, 1.0));
//     gl_FragColor = vec4(col * a, a);
//   }
// `;

// const TEAR_CONFIG = {
//   coverMs: 520,
//   uncoverMs: 1400,
//   outFrom: 0.36,
//   dispAmp: 0.175,
//   dispScale: 12.2,
//   dispDetail: 5,
//   dispDrift: 0.0,
//   soft: 0.001,
//   lens: -0.275,
//   easeTau: 500,
// };

// function easeMask(k, dur, tau) {
//   const n = Math.max(1, dur) / Math.max(1, tau);
//   return (1 - Math.exp(-k * n)) / (1 - Math.exp(-n));
// }

// function hexToRgb(hex) {
//   const n = parseInt(hex.replace('#', ''), 16);
//   return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
// }

// class TearTransition {
//   constructor(canvas) {
//     this.canvas = canvas;
//     this.gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true });
//     this.program = null;
//     this.uniforms = {};
//     this.startTime = performance.now();
//     this.isAnimating = false;
//     this._resizeHandler = () => this.resize();

//     this.initGL();
//     this.resize();
//     window.addEventListener('resize', this._resizeHandler);
//   }

//   initGL() {
//     const gl = this.gl;
//     if (!gl) return;

//     const createShader = (type, src) => {
//       const s = gl.createShader(type);
//       gl.shaderSource(s, src);
//       gl.compileShader(s);
//       if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
//       return s;
//     };

//     const prog = gl.createProgram();
//     gl.attachShader(prog, createShader(gl.VERTEX_SHADER, VERTEX_SHADER));
//     gl.attachShader(prog, createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
//     gl.linkProgram(prog);
//     gl.useProgram(prog);
//     this.program = prog;

//     const buf = gl.createBuffer();
//     gl.bindBuffer(gl.ARRAY_BUFFER, buf);
//     gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
//     const aPos = gl.getAttribLocation(prog, 'aPos');
//     gl.enableVertexAttribArray(aPos);
//     gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

//     const getU = (name) => gl.getUniformLocation(prog, name);
//     this.uniforms = {
//       p: getU('uP'),
//       time: getU('uTime'),
//       aspect: getU('uAspect'),
//       flip: getU('uFlip'),
//       out: getU('uOut'),
//       dispAmp: getU('uDispAmp'),
//       dispScale: getU('uDispScale'),
//       dispDrift: getU('uDispDrift'),
//       soft: getU('uSoft'),
//       detail: getU('uDetail'),
//       lens: getU('uLens'),
//       axis: getU('uAxis'),
//       top: getU('uTop'),
//       foot: getU('uFoot'),
//     };

//     gl.enable(gl.BLEND);
//     gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
//   }

//   resize() {
//     const dpr = Math.min(window.devicePixelRatio || 1, 2);
//     const w = Math.round(window.innerWidth * dpr);
//     const h = Math.round(window.innerHeight * dpr);
//     if (this.canvas.width !== w || this.canvas.height !== h) {
//       this.canvas.width = w;
//       this.canvas.height = h;
//     }
//     this.gl.viewport(0, 0, w, h);
//   }

//   draw(progress, outward) {
//     const gl = this.gl;
//     if (!gl) return;
//     const u = this.uniforms;
//     const w = this.canvas.width;
//     const h = this.canvas.height;

//     gl.uniform1f(u.p, progress);
//     gl.uniform1f(u.out, outward ? 1.0 : 0.0);
//     gl.uniform1f(u.time, (performance.now() - this.startTime) / 1000);
//     gl.uniform1f(u.axis, 0.0);
//     gl.uniform1f(u.aspect, w / h);
//     gl.uniform1f(u.flip, 0.0);

//     gl.uniform1f(u.dispAmp, TEAR_CONFIG.dispAmp);
//     gl.uniform1f(u.dispScale, TEAR_CONFIG.dispScale);
//     gl.uniform1f(u.dispDrift, TEAR_CONFIG.dispDrift);
//     gl.uniform1f(u.soft, TEAR_CONFIG.soft);
//     gl.uniform1i(u.detail, TEAR_CONFIG.dispDetail);
//     gl.uniform1f(u.lens, TEAR_CONFIG.lens);

//     gl.uniform3fv(u.top, hexToRgb(TEAR_COLOR.top));
//     gl.uniform3fv(u.foot, hexToRgb(TEAR_COLOR.foot));

//     gl.clearColor(0, 0, 0, 0);
//     gl.clear(gl.COLOR_BUFFER_BIT);
//     gl.drawArrays(gl.TRIANGLES, 0, 3);
//   }

//   runPass(outward, duration, fromP = 0) {
//     return new Promise((resolve) => {
//       this.canvas.classList.add('is-on');
//       const start = performance.now();
//       const dur = duration * (1 - fromP);

//       const step = (now) => {
//         const k = Math.min(1, (now - start) / dur);
//         const p = fromP + (1 - fromP) * easeMask(k, dur, TEAR_CONFIG.easeTau);
//         this.draw(p, outward);

//         if (k < 1) {
//           this._raf = requestAnimationFrame(step);
//         } else {
//           resolve();
//         }
//       };
//       this._raf = requestAnimationFrame(step);
//     });
//   }

//   async playFullSequence() {
//     if (this.isAnimating) return;
//     this.isAnimating = true;

//     // Phase 1: cover screen bottom-to-top
//     await this.runPass(false, TEAR_CONFIG.coverMs, 0);

//     // Brief pause at full cover
//     await new Promise((r) => setTimeout(r, 200));

//     // Phase 2: uncover screen bottom-to-top, revealing content
//     await this.runPass(true, TEAR_CONFIG.uncoverMs, TEAR_CONFIG.outFrom);

//     this.canvas.classList.remove('is-on');
//     this.isAnimating = false;
//   }

//   destroy() {
//     if (this._raf) cancelAnimationFrame(this._raf);
//     window.removeEventListener('resize', this._resizeHandler);
//   }
// }

// function TearCanvas({ onDone }) {
//   const canvasRef = useRef(null);
//   const instanceRef = useRef(null);

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     const transition = new TearTransition(canvas);
//     instanceRef.current = transition;

//     let cancelled = false;
//     transition.playFullSequence().then(() => {
//       if (!cancelled) onDone();
//     });

//     return () => {
//       cancelled = true;
//       transition.destroy();
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   return (
//     <canvas
//       ref={canvasRef}
//       className="sheetfx"
//       style={{
//         position: 'fixed',
//         inset: 0,
//         width: '100%',
//         height: '100%',
//         pointerEvents: 'none',
//         zIndex: 10000,
//       }}
//     />
//   );
// }

// /* ---------------------------------------------------------------------------
//  *  Overlay Component – signature draw, then hands off to the tear transition
//  * ------------------------------------------------------------------------- */

// function Overlay({ contentRef, assets, minDuration, timeout, onReady }) {
//   const pathRef = useRef(null);
//   const latest = useRef({ assets, minDuration, timeout, onReady });
//   latest.current = { assets, minDuration, timeout, onReady };

//   const [signatureDone, setSignatureDone] = useState(false);
//   const [showTear, setShowTear] = useState(false);

//   useEffect(() => {
//     const { assets: list, minDuration: minMs, timeout: limit } = latest.current;
//     const tracker = createTracker({ root: contentRef.current, assets: list, timeout: limit });
//     const t0 = performance.now();
//     let last = t0;
//     let shown = 0;
//     let raf = 0;
//     let holdTimer = 0;

//     const paint = (v) => {
//       if (pathRef.current) {
//         pathRef.current.style.strokeDashoffset = String(1000 * (1 - v));
//       }
//     };

//     const tick = (now) => {
//       const dt = Math.min(0.1, (now - last) / 1000);
//       last = now;
//       const { target } = tracker.read(now);

//       const timeCap = minMs > 0 ? (now - t0) / minMs : 1;
//       const goal = Math.min(target, timeCap);

//       if (goal > shown) {
//         shown = Math.min(goal, shown + LINEAR_SPEED * dt);
//         if (goal >= 1 && 1 - shown < 0.002) shown = 1;
//       }

//       paint(shown);

//       if (shown >= 1) {
//         // Signature finished — hold, then start the red tear transition.
//         holdTimer = window.setTimeout(() => {
//           setSignatureDone(true);
//           setShowTear(true);
//         }, HOLD_MS);
//         return;
//       }
//       raf = requestAnimationFrame(tick);
//     };
//     raf = requestAnimationFrame(tick);

//     return () => {
//       cancelAnimationFrame(raf);
//       clearTimeout(holdTimer);
//       tracker.destroy();
//     };
//   }, [contentRef]);

//   return (
//     <>
//       {!showTear && (
//         <div className="fixed inset-0 z-[9999] bg-[#121212] flex flex-col justify-center items-center overflow-hidden select-none">
//           <div className="relative w-full max-w-2xl 2xl:max-w-[45vw] 4xl:max-w-[1152px] px-8 flex flex-col items-center">
//             <svg
//               viewBox="0 0 1330.2 636.6"
//               className="w-full h-auto max-h-[80vh] drop-shadow-[0_0_10px_rgba(245,245,220,0.12)]"
//               fill="none"
//               xmlns="http://www.w3.org/2000/svg"
//               role="img"
//               aria-label="Signature being written"
//             >
//               <path
//                 ref={pathRef}
//                 d={SIGNATURE_PATH}
//                 stroke="#F5F5DC"
//                 strokeWidth="8"
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 pathLength="1000"
//                 style={{ strokeDasharray: 1000, strokeDashoffset: 1000 }}
//               />
//             </svg>
//           </div>
//         </div>
//       )}
//       {showTear && <TearCanvas onDone={onReady} />}
//     </>
//   );
// }

// /* ---------------------------------------------------------------------------
//  *  Public Loader Component
//  * ------------------------------------------------------------------------- */

// export default function Loader({ children, assets = [], minDuration = 3030, timeout = 30000 }) {
//   const [status, setStatus] = useState('loading');
//   const contentRef = useRef(null);

//   useEffect(() => {
//     document.documentElement.dataset.loader = status;
//   }, [status]);

//   const ctx = useMemo(
//     () => ({ status, revealed: status !== 'loading', done: status === 'done' }),
//     [status]
//   );

//   return (
//     <LoaderContext.Provider value={ctx}>
//       <div ref={contentRef} style={{ display: 'contents' }}>
//         {children}
//       </div>
//       <Overlay
//         contentRef={contentRef}
//         assets={assets}
//         minDuration={minDuration}
//         timeout={timeout}
//         onReady={() => setStatus('done')}
//       />
//     </LoaderContext.Provider>
//   );
// }

// /* Signature Path Data */
// const SIGNATURE_PATH = `M118.87 548.98 C121.96 546.06 125.25 543.37 128.34 540.45 C132.68 536.33 136.85 532 141.08 527.77
//   C143.62 525.23 146.43 522.77 148.57 519.87 C152.13 515.05 152.2 508.91 156.11 503.99
//   C160.8 498.1 166.32 492.96 171.21 487.25 C184.67 471.51 198.04 455.72 211.38 439.89
//   C217.63 432.45 223.96 425.06 230.36 417.75 C233.58 414.08 236.86 410.49 239.99 406.74
//   C252.09 392.21 263.57 377.22 275.18 362.31 C277.91 358.81 280.42 355.15 283.06 351.58
//   C285.33 348.51 287.73 345.53 289.97 342.44 C292.74 338.62 295.34 334.66 298.04 330.78
//   C300.02 327.92 302.17 325.18 304.12 322.3 C306.76 318.43 309.17 314.39 311.65 310.42
//   C317.69 300.76 325.45 288.34 328.23 277.29 C329.72 271.37 332.58 259.53 329.58 254.01
//   C327.73 250.62 322.72 248.19 319.4 246.42 C311.67 242.29 311.25 243.99 304 242.56
//   C301.86 242.14 299.9 241.18 297.79 240.65 C292.39 239.29 285.28 240.63 280.05 242.36
//   C276.55 243.52 273.23 245.22 269.85 246.7 C244.55 257.79 220.73 273 198.52 289.35
//   C194.93 291.99 191.45 294.79 187.85 297.39 C185.55 299.04 183.12 300.51 180.83 302.18
//   C176.7 305.19 172.72 308.45 168.77 311.69 C162.41 316.9 156.61 322.58 150.59 328.15
//   C148.44 330.14 146.14 331.96 143.99 333.96 C139.13 338.49 134.52 343.33 129.82 348.03
//   C125.36 352.49 120.75 356.85 116.48 361.5 C114.72 363.42 113.09 365.45 111.34 367.37
//   C109.57 369.32 107.72 371.18 106 373.16 C103.46 376.09 101.07 379.15 98.51 382.06
//   C97.02 383.75 95.45 385.38 93.68 386.79 C92.46 387.76 90.92 388.51 89.9 389.71
//   C88.83 390.97 87.93 395.21 86.25 397.81 C84.36 400.74 82.1 403.41 80.12 406.27
//   C77.63 409.86 75.38 413.64 73.07 417.35 C71.42 420 69.71 422.61 68.17 425.32
//   C67.09 427.2 66.17 429.16 65.08 431.04 C63.83 433.21 62.37 435.23 61.14 437.41
//   C59.61 440.09 58.48 442.97 57.18 445.77 C51.22 458.49 48.84 466.34 50.03 480.67
//   C51 492.36 59.5 501.6 67.38 509.49 C71.58 513.69 75.65 518.14 80.21 521.96
//   C85.04 526.01 90.44 529.4 95.7 532.86 C99.85 535.59 106.5 540.04 111.21 541.28
//   C115.88 542.52 121.12 541.98 125.92 541.98 C126.61 544.11 127.16 546.51 128.28 548.46
//   C131.59 554.24 141.35 558.73 146.95 562.38 C162.26 572.38 180.04 581.93 194.17 593.23
//   C198.57 596.74 208.91 605.69 210.98 610.59 C211.65 612.19 211.61 613.65 211.87 615.35
//   C210.14 616.77 209.59 617.58 207.45 618.5 C202.27 620.75 196.4 620.81 190.91 621.8
//   C185.97 622.69 181.06 623.76 176.12 624.72 C171.68 625.59 167.27 625.84 162.79 626.32
//   C158.33 626.8 153.86 627.43 149.39 627.78 C144.77 628.15 140.1 627.98 135.47 627.98
//   C131.16 627.98 126.83 628.11 122.52 627.86 C119.95 627.71 117.4 627.3 114.83 627.13
//   C111.21 626.89 107.59 627.06 103.98 626.76 C98.25 626.28 92.6 625.34 86.92 624.48
//   C84.4 624.1 81.85 623.95 79.34 623.47 C76.9 623 74.54 622.2 72.13 621.57
//   C65.82 619.91 59.51 618.36 53.3 616.33 C49.78 615.19 46.42 613.63 43 612.24
//   C30.41 607.11 25.07 603.98 16.1 593.58 C12.02 588.84 5.58 583.61 10.29 576.97
//   C12.52 573.83 18.94 567.31 22.46 565.93 C24.25 565.22 26.18 565.09 28.09 565.03
//   C34 564.85 38.32 566.18 43.89 567.83 C47.46 568.89 51.01 569.86 54.33 571.59
//   C62.4 575.77 70.16 580.77 77.1 586.63 C79.36 588.53 81.45 590.61 83.63 592.6
//   C97.69 605.33 112.48 618.42 132.38 619.62 C136.25 619.85 140.78 619.33 144.25 617.49
//   C150.62 614.1 160.25 601.62 164.73 595.62 C168.27 590.87 171.86 586.03 174.19 580.54
//   C174.79 579.12 175.27 577.65 175.87 576.23 C176.71 574.25 177.75 572.35 178.58 570.35
//   C179.69 567.67 180.34 564.74 181.79 562.21 C182.35 561.23 182.98 560.91 183.72 559.98
//   C184.53 560.17 185.38 560.2 186.19 560.39 C190.92 561.49 194.2 565.91 198.33 568.17
//   C202.26 570.31 206.75 570.92 211.17 570.93 C221.95 570.97 232.07 565.92 240.27 559.17
//   C244.04 556.08 247.5 552.65 251.3 549.58 C261.01 541.72 271.71 534.94 283.24 530.12
//   C292.05 526.45 301.08 523.29 309.98 519.85 C312.57 518.84 315.05 517.6 317.63 516.58
//   C320.21 515.56 322.89 514.81 325.48 513.8 C329.5 512.23 333.39 510.38 337.34 508.65
//   C341.85 506.67 346.45 504.86 350.88 502.7 C354.23 501.07 357.42 499.18 360.69 497.41
//   C363.14 496.07 365.65 494.85 368.03 493.4 C373.91 489.79 379.56 485.49 384.98 481.22
//   C401.63 468.1 420.64 447.38 432.9 430.04 C434.71 427.48 436.23 424.75 437.88 422.1
//   C439.86 418.9 441.98 415.78 444.11 412.68 C453.53 398.95 462.92 385.22 471.82 371.16
//   C474.49 366.94 477.07 362.46 480.35 358.69 C483.15 355.48 486.5 352.74 488.97 349.26
//   C491.14 346.2 492.09 342.52 494.15 339.4 C495.89 336.76 498.49 334.68 499.78 331.74
//   C501.06 328.84 500.87 325.54 501.62 322.5 C502.22 320.1 503.25 317.84 504.05 315.5
//   C504.84 313.16 505.4 310.75 506.34 308.45 C508.01 304.37 511.09 301.15 512.84 297.15
//   C513.96 294.6 514.49 291.83 515.43 289.22 C517.62 283.15 520.21 277.18 522.65 271.21
//   C524.86 265.81 527.14 260.39 529.61 255.09 C531.43 251.18 533.41 247.34 535.16 243.39
//   C537.52 238.03 539.61 232.57 542.26 227.33 C544.21 223.46 546.73 219.87 548.81 216.04
//   C549.18 216.74 549.44 217.49 549.81 218.19 C551.81 221.98 553.5 223.13 553.74 227.85
//   C554.14 235.82 550.32 243.01 546.79 249.89 C541.25 260.71 534.89 271 528.39 281.27
//   C526.55 284.19 524.93 287.26 522.7 289.91 C518.06 295.4 511.9 299.76 507.91 305.79
//   C505.82 308.95 505.08 312.58 503.84 316.1 C503.12 318.13 502.27 320.12 501.64 322.19
//   C500.84 324.85 500.42 327.65 499.24 330.19 C497.66 333.6 495.01 336.35 493.47 339.8
//   C488.67 350.5 485.63 361.95 482.06 373.08 C477.06 388.69 471.7 404.26 468.01 420.26
//   C466.54 426.64 464.89 432.98 463.45 439.37 C461.79 446.71 460.4 454.13 458.97 461.51
//   C458.03 466.36 456.04 475.51 458.55 479.86 C459.57 481.62 461.01 482.63 462.46 483.98
//   C466.31 481.62 469.83 479 473.01 475.74 C476.15 472.53 478.52 468.7 481.31 465.2
//   C484.74 460.91 488.39 456.8 491.92 452.6 C494.2 449.88 496.33 447.05 498.68 444.4
//   C501.52 441.19 504.73 438.33 507.48 435.04 C509.32 432.84 510.95 430.47 512.71 428.21
//   C518.54 420.68 524.26 413.06 529.67 405.23 C533.06 400.32 536.28 395.29 539.64 390.36
//   C544.61 383.08 549.68 375.86 554.63 368.57 C557.63 364.16 560.43 359.63 563.4 355.2
//   C565.34 352.32 567.59 349.64 569.49 346.73 C570.85 344.64 571.95 342.41 573.24 340.28
//   C575.35 336.8 577.64 333.44 579.79 329.99 C581.1 327.87 582.31 325.69 583.68 323.6
//   C587.28 318.08 591.03 312.63 594.76 307.19 C596.18 305.11 597.71 303.1 599.07 300.98
//   C600.75 298.36 601.81 295.4 603.58 292.85 C606.61 288.5 615.3 280.56 619.44 276.42
//   C624.38 271.47 629.24 266.42 634.3 261.61 C636.91 259.14 639.73 256.92 642.34 254.45
//   C645.71 251.25 648.87 247.83 652.29 244.68 C659.04 238.47 663.29 236.51 668.87 228.65
//   C667.94 229.51 666.63 231.08 665.58 232.19 C663.55 234.35 661.45 236.45 659.3 238.48
//   C656.93 240.73 654.37 242.75 651.99 244.97 C648.58 248.13 645.42 251.55 642.03 254.74
//   C639.89 256.74 637.6 258.57 635.44 260.55 C632.26 263.46 629.32 266.63 626.19 269.59
//   C623.81 271.83 621.25 273.85 618.87 276.07 C614.04 280.59 609.72 285.74 604.62 289.95
//   C601.46 292.55 597.65 294.09 594.28 296.39 C585.94 302.07 577.85 308.12 569.48 313.77
//   C565.05 316.75 560.62 319.72 556.17 322.67 C554.08 324.06 552.09 325.61 549.9 326.85
//   C547.22 328.38 544.33 329.52 541.62 331 C538.36 332.79 535.17 334.67 531.75 336.13
//   C526.05 338.55 516.14 342.2 510.06 340.24 C508.26 339.67 506.71 338.57 505.4 337.23
//   C501.2 332.94 501.24 325.59 502.6 320.07 C503.19 317.68 504.12 315.36 504.83 313
//   C506.3 308.11 508.59 302.65 514.13 301.44 C521.17 299.9 525.83 304.65 530.64 308.95
//   C533.1 311.15 535.37 313.55 537.82 315.76 C540.24 317.95 542.77 320 545.12 322.27
//   C549.64 326.63 553.85 331.36 558.7 335.37 C561.18 337.41 563.79 339.28 566.18 341.44
//   C569.12 344.1 571.8 347.02 574.79 349.62 C577.22 351.73 579.79 353.68 582.26 355.74
//   C588.44 360.92 594.64 366.07 600.85 371.21 C604.85 374.52 608.68 378.02 612.65 381.35
//   C617.05 385.05 621.75 388.33 626.32 391.81 C630.15 394.71 633.89 397.75 637.58 400.83
//   C650.96 411.96 672.55 431.42 688.55 437.12 C702.04 441.93 706.68 435.34 713.81 425.02
//   C718.77 417.85 723.74 410.55 727.7 402.77 C729.52 399.2 731.05 395.49 732.7 391.84
//   C736.66 383.12 739.63 374.05 742.91 365.07 C744.39 361.02 746.09 357.05 747.51 352.98
//   C750.27 345.1 752.58 337.08 755.19 329.16 C756.83 324.18 758.8 319.31 760.49 314.35
//   C761.79 310.55 762.8 306.66 764.1 302.85 C765.09 299.92 766.18 297.04 767.09 294.09
//   C768.54 289.38 769.72 284.52 771.72 280 C773.83 275.22 777.45 271.05 779.1 266.06
//   C779.8 263.96 779.94 261.73 780.3 259.56 C780.91 255.83 781.81 252.15 782.34 248.4
//   C782.74 245.52 782.84 242.62 783.13 239.73 C783.49 236 783.61 231.97 784.65 228.36
//   C785.33 225.97 786.58 223.83 787.51 221.55 C789.5 216.64 790.62 207.54 789.49 202.35
//   C789.31 201.56 789.01 200.8 788.84 200.01 C787.54 201.52 786.22 202.86 785.19 204.57
//   C783.34 207.64 782.95 211.66 780.52 214.35 C778.44 216.64 775.22 217.12 772.72 218.78
//   C769.03 221.22 766.36 225.15 763.97 228.79 C762.61 230.87 761.44 233.07 760.14 235.2
//   C758.67 237.59 757.08 239.91 755.73 242.37 C751.88 249.35 747.7 259.37 744.97 266.91
//   C743.92 269.82 743.09 272.8 742.07 275.71 C740.96 278.92 739.58 282.02 738.56 285.26
//   C737.72 287.92 737.08 290.64 736.24 293.3 C734.29 299.48 731.66 305.42 729.73 311.6
//   C726.93 320.58 725.12 329.72 723.28 338.93 C722.36 343.55 721.33 348.16 720.56 352.8
//   C720.03 356 719.95 359.21 719.68 362.44 C719.16 368.64 718.5 374.81 719.01 381.05
//   C719.65 388.9 722.78 388.26 720.87 397.52 C722.51 393.53 724.37 389.63 725.97 385.63
//   C728.5 379.34 730.73 372.93 733.09 366.58 C736.2 358.2 739.39 349.85 742.36 341.42
//   C744.11 336.46 745.45 331.37 747.18 326.41 C755.22 303.37 763.03 280.24 769.78 256.78
//   C770.9 252.89 771.75 248.94 772.82 245.04 C773.82 241.42 775.23 238.03 777.3 234.89
//   C778.32 233.36 779.4 231.89 780.09 230.17 C780.7 228.65 780.95 227.01 781.3 225.41
//   C782.03 228.37 783.05 231.4 783.29 234.44 C783.44 236.31 783.22 238.17 783.07 240.03
//   C782.87 242.61 782.77 245.19 782.44 247.76 C781.75 253.1 780.63 258.38 779.96 263.73
//   C779.32 268.86 779.07 274 778.52 279.13 C778.03 283.59 777.27 288.03 777 292.5
//   C776.74 296.79 777.01 301.09 776.68 305.37 C776.48 307.94 776.06 310.48 775.99 313.06
//   C775.85 318.54 777.54 333.5 779.4 338.53 C780.15 340.57 781.28 342.18 782.44 343.98
//   C783.57 343.78 784.56 343.82 785.65 343.52 C789.47 342.43 792.64 339.58 794.68 336.23
//   C795.64 334.64 796.32 332.9 797.28 331.31 C799.23 328.08 801.7 325.21 803.6 321.93
//   C807.52 315.21 811.53 308.56 815.4 301.82 C817.26 298.59 819.25 295.45 820.77 292.04
//   C821.91 289.51 822.89 286.92 824.01 284.38 C826.14 279.58 828.43 274.88 830.74 270.17
//   C831.96 267.69 833.06 265.13 834.66 262.86 C835.88 261.12 837.33 259.85 838.87 258.43
//   C842.32 268.71 841.1 271.22 842.62 280.87 C843.79 288.27 846 295.38 848.85 302.29
//   C850.91 307.3 852.87 311.15 856.9 314.9 C858.05 315.97 859.28 317.01 860.71 317.67
//   C865.04 319.65 872.8 317.75 876.69 315.32 C878.89 313.95 880.7 312.07 882.64 310.37
//   C886.23 307.23 890.35 304.84 894.16 301.99 C896.2 300.47 898.08 298.71 900.26 297.38
//   C902.65 295.93 905.33 295.1 907.65 293.51 C911.37 290.95 914.36 287.48 918.08 284.9
//   C924.02 280.77 934.4 274.71 941.62 274.15 C945.48 273.85 949.32 274.49 953.13 275.02
//   C962.62 276.34 972.53 276.88 981.58 273.19 C996.19 267.22 1006.09 254.97 1015.38 242.76
//   C1019.55 237.27 1021.76 233.8 1027.2 229.31 C1033.67 234.23 1036.51 237.6 1044.47 240.73
//   C1061.56 247.45 1083.43 245.54 1100.69 240.11 C1110.2 237.12 1125.58 230.21 1134.75 225.76
//   C1144.16 221.2 1153.05 214.39 1161.5 208.26 C1167.93 203.59 1174.44 199.01 1180.57 193.94
//   C1184.83 190.42 1188.91 186.68 1193.04 183 C1197.65 178.89 1202.37 174.88 1206.95 170.73
//   C1208.91 168.96 1210.75 167.07 1212.71 165.3 C1214.88 163.33 1217.17 161.5 1219.3 159.49
//   C1226.79 152.4 1233.94 144.91 1241.24 137.61 C1246.41 132.44 1251.73 127.38 1256.73 122.03
//   C1261.63 116.8 1266.22 111.26 1271.06 105.97 C1275.34 101.28 1280.73 98.44 1283.99 94.47
//   C1285.79 92.29 1286.91 89.72 1288.26 87.27 C1290.32 83.54 1292.72 79.64 1295.54 76.45
//   C1297.6 74.12 1300.23 72.41 1302.47 70.27 C1307.63 65.31 1315.29 55.35 1318.22 48.85
//   C1320.36 44.1 1322 38.74 1321.55 33.48 C1321.34 31.08 1320.77 28.76 1320.74 26.34
//   C1320.65 20.43 1320.87 14.51 1320.87 8.6 C1320.87 12.07 1321.16 15.75 1320.34 19.15
//   C1319.76 21.57 1318.38 23.67 1317.32 25.89 C1315.99 28.68 1314.85 31.54 1313.44 34.28
//   C1309.62 41.72 1305.38 48.89 1301.87 56.49 C1300.09 60.36 1298.08 64.32 1296.79 68.39
//   C1295.95 71.07 1295.76 73.91 1294.68 76.52 C1293.37 79.68 1291.16 82.41 1289.39 85.32
//   C1287.33 88.73 1285.64 92.46 1284.2 96.17 C1282.62 100.22 1281.85 104.56 1280.8 108.77
//   C1278.61 117.55 1276.45 126.32 1274.49 135.15 C1271.9 146.83 1269.45 158.63 1268.15 170.53
//   C1267.45 176.99 1267.16 183.46 1266.72 189.94 C1266.55 192.51 1266.14 195.06 1265.99 197.63
//   C1265.85 199.93 1265.88 202.23 1265.74 204.53 C1265.56 207.43 1265.09 210.3 1264.96 213.2
//   C1264.79 216.84 1264.96 220.49 1264.76 224.12 C1264.59 227.35 1264.06 230.55 1263.94 233.78
//   C1263.77 238.08 1264 242.4 1263.73 246.7 C1263.55 249.6 1263.08 252.47 1262.95 255.37
//   C1262.76 259.68 1263 263.99 1262.75 268.29 C1262.38 274.73 1261.55 281.16 1261.06 287.59
//   C1260.78 291.2 1260.96 294.82 1260.68 298.43 C1260.35 302.57 1259.69 306.7 1259.22 310.83
//   C1258.93 313.39 1258.78 315.96 1258.47 318.52 C1257.48 326.68 1256.2 334.88 1254.76 342.98
//   C1253.62 349.47 1252.14 355.91 1250.87 362.37`;

















































































import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

/* ==========================================================================
 *  <Loader> – Signature Loader → Red Tear WebGL Transition
 * ========================================================================== */

const HOLD_MS = 700; // 0.7s hold delay after signature finishes drawing
const LINEAR_SPEED = 0.33; // 33% per second linear speed (~3.03s total write time)

// -----------------------------------------------------------------------
// Tear transition color — change this single value to re-theme the sweep.
// Provide any CSS hex color; top/foot form a subtle vertical gradient.
// -----------------------------------------------------------------------
const TEAR_COLOR = {
  top: '#E11D2A',  // brighter red
  foot: '#8B0000', // deep red
};

const LoaderContext = createContext({ status: 'done', revealed: true, done: true });
export const useLoader = () => useContext(LoaderContext);

/* ---------------------------------------------------------------------------
 *  Asset Tracker
 * ------------------------------------------------------------------------- */

const IMAGE_RE = /\.(avif|bmp|gif|ico|jpe?g|png|svg|webp)(?:[?#]|$)/i;
const MEDIA_RE = /\.(aac|m4a|m4v|mov|mp3|mp4|oga|ogg|ogv|wav|webm)(?:[?#]|$)/i;
const VIDEO_RE = /\.(m4v|mov|mp4|ogv|webm)(?:[?#]|$)/i;

function createTracker({ root, assets, timeout }) {
  const tasks = new Map();
  const seenEls = new WeakSet();
  const seenUrls = new Set();
  const cleanups = [];
  const hold = [];
  const startedAt = performance.now();
  let lastAdd = startedAt;
  let dead = false;

  const abs = (u) => {
    try { return new URL(u, document.baseURI).href; } catch { return u; }
  };
  const add = (key, label) => {
    if (tasks.has(key)) return false;
    tasks.set(key, { p: 0, label });
    lastAdd = performance.now();
    return true;
  };
  const progress = (key, p) => {
    const t = tasks.get(key);
    if (t && p > t.p) t.p = Math.min(1, p);
  };
  const finish = (key) => progress(key, 1);
  const listen = (el, type, fn) => {
    el.addEventListener(type, fn, { once: true });
    cleanups.push(() => el.removeEventListener(type, fn));
  };
  const decoded = (img) =>
    typeof img.decode === 'function' ? img.decode().catch(() => {}) : Promise.resolve();

  function preloadImage(url) {
    if (!url || url.startsWith('data:') || seenUrls.has(url)) return;
    seenUrls.add(url);
    add(url, url);
    const img = new Image();
    hold.push(img);
    img.onload = () => decoded(img).then(() => finish(url));
    img.onerror = () => { finish(url); };
    img.src = url;
  }

  function preloadMedia(url) {
    if (seenUrls.has(url)) return;
    seenUrls.add(url);
    add(url, url);
    const el = document.createElement(VIDEO_RE.test(url) ? 'video' : 'audio');
    hold.push(el);
    el.preload = 'auto';
    el.muted = true;
    el.addEventListener('canplay', () => finish(url), { once: true });
    el.addEventListener('error', () => finish(url), { once: true });
    el.src = url;
  }

  function trackImg(img) {
    if (seenEls.has(img)) return;
    seenEls.add(img);
    if (!img.getAttribute('src') && !img.getAttribute('srcset') && !img.currentSrc) return;
    add(img, img.currentSrc || img.getAttribute('src') || 'img');
    if (img.loading === 'lazy') img.loading = 'eager';
    const ok = () => finish(img);
    const fail = () => finish(img);
    if (typeof img.decode === 'function') img.decode().then(ok, fail);
    else if (img.complete) ok();
    else { listen(img, 'load', ok); listen(img, 'error', fail); }
  }

  function trackMedia(el) {
    if (seenEls.has(el)) return;
    seenEls.add(el);
    if (el.preload === 'none') return;
    if (!el.getAttribute('src') && !el.querySelector('source')) return;
    if (el.poster) preloadImage(abs(el.poster));
    add(el, el.currentSrc || el.getAttribute('src') || 'media');
    if (el.preload !== 'auto') el.preload = 'auto';
    if (el.readyState >= 3) return finish(el);
    listen(el, 'canplay', () => finish(el));
    listen(el, 'error', () => finish(el));
  }

  function trackBackgrounds(scope) {
    const nodes = [scope, ...Array.from(scope.querySelectorAll?.('*') ?? []).slice(0, 4000)];
    for (const n of nodes) {
      if (n.nodeType !== 1) continue;
      let bg = '';
      try { bg = getComputedStyle(n).backgroundImage; } catch { /* ignore */ }
      if (!bg || bg === 'none') continue;
      for (const m of bg.matchAll(/url\((["']?)(.*?)\1\)/g)) preloadImage(abs(m[2]));
    }
  }

  function scan(scope) {
    if (scope.matches?.('img')) trackImg(scope);
    else if (scope.matches?.('video,audio')) trackMedia(scope);
    scope.querySelectorAll?.('img').forEach(trackImg);
    scope.querySelectorAll?.('video,audio').forEach(trackMedia);
    trackBackgrounds(scope);
  }

  add('fonts', 'fonts');
  if (document.fonts?.ready) {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => document.fonts.ready.then(() => !dead && finish('fonts')))
    );
  } else finish('fonts');

  add('window', 'window load');
  if (document.readyState === 'complete') finish('window');
  else {
    const onLoad = () => finish('window');
    window.addEventListener('load', onLoad, { once: true });
    cleanups.push(() => window.removeEventListener('load', onLoad));
  }

  let observer = null;
  if (root) {
    scan(root);
    observer = new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((n) => n.nodeType === 1 && scan(n));
    });
    observer.observe(root, { childList: true, subtree: true });
  }

  assets.forEach((a, i) => {
    if (typeof a === 'function') {
      const key = `task:${i}`;
      add(key, a.name || key);
      Promise.resolve()
        .then(() => a((p) => progress(key, Math.min(p, 0.99))))
        .catch(() => {})
        .finally(() => finish(key));
    } else if (typeof a === 'string') {
      const url = abs(a);
      if (IMAGE_RE.test(a)) preloadImage(url);
      else if (MEDIA_RE.test(a)) preloadMedia(url);
      else if (!seenUrls.has(url)) {
        seenUrls.add(url);
        add(url, url);
        fetch(url)
          .then((r) => r.blob())
          .catch(() => {})
          .finally(() => finish(url));
      }
    }
  });

  return {
    read(now) {
      let sum = 0;
      const pending = [];
      tasks.forEach((t) => {
        sum += t.p;
        if (t.p < 1) pending.push(t.label);
      });
      const timedOut = timeout > 0 && now - startedAt > timeout;
      const settled = timedOut || (pending.length === 0 && now - lastAdd >= 250);
      return { target: settled ? 1 : Math.min(sum / tasks.size, 0.99) };
    },
    destroy() {
      dead = true;
      observer?.disconnect();
      cleanups.forEach((fn) => fn());
    },
  };
}

/* ---------------------------------------------------------------------------
 *  Tear Transition – WebGL, ported 1:1 from the HTML reference
 * ------------------------------------------------------------------------- */

const VERTEX_SHADER = `
  attribute vec2 aPos;
  varying vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 vUv;

  uniform float uP;
  uniform float uTime;
  uniform float uAspect;
  uniform float uFlip;
  uniform float uOut;
  uniform float uDispAmp;
  uniform float uDispScale;
  uniform float uDispDrift;
  uniform float uSoft;
  uniform float uLens;
  uniform float uAxis;
  uniform int uDetail;
  uniform vec3 uTop;
  uniform vec3 uFoot;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 p, int oct) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 6; i++) {
      if (i >= oct) break;
      v += a * vnoise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }

  float axisY(vec2 uv) {
    vec2 q = (uAxis > 0.5) ? vec2(uv.y, uv.x) : uv;
    return mix(q.y, 1.0 - q.y, uFlip);
  }

  float noiseAt(vec2 uv) {
    vec2 q = (uAxis > 0.5) ? vec2(uv.y, uv.x) : uv;
    float y = mix(q.y, 1.0 - q.y, uFlip);
    return fbm(vec2(q.x * uAspect, y) * uDispScale + vec2(0.0, uTime * uDispDrift), uDetail) - 0.5;
  }

  float field(vec2 uv) {
    float edge = mix(-uDispAmp, 1.0 + uDispAmp, uP);
    return (edge - axisY(uv)) + noiseAt(uv) * uDispAmp * 2.0;
  }

  vec2 lensAt(vec2 uv, float k, out bool outside) {
    outside = false;
    vec2 d = uv - 0.5;
    vec2 w = 0.5 + d * (1.0 + k * dot(d, d) * 4.0);
    if (w.x < 0.0 || w.x > 1.0 || w.y < 0.0 || w.y > 1.0) outside = true;
    return w;
  }

  void main() {
    bool outside = false;
    vec2 uv = (uLens == 0.0) ? vUv : lensAt(vUv, uLens, outside);
    if (outside) uv = clamp(uv, 0.0, 1.0);

    float a = smoothstep(-uSoft, uSoft, field(uv));
    a = max(a, smoothstep(0.985, 1.0, uP));

    a = mix(a, 1.0 - a, uOut);
    if (a <= 0.001) discard;

    vec3 col = mix(uFoot, uTop, clamp(vUv.y, 0.0, 1.0));
    gl_FragColor = vec4(col * a, a);
  }
`;

const TEAR_CONFIG = {
  coverMs: 520,
  uncoverMs: 1400,
  outFrom: 0.36,
  dispAmp: 0.175,
  dispScale: 12.2,
  dispDetail: 5,
  dispDrift: 0.0,
  soft: 0.001,
  lens: -0.275,
  easeTau: 500,
};

function easeMask(k, dur, tau) {
  const n = Math.max(1, dur) / Math.max(1, tau);
  return (1 - Math.exp(-k * n)) / (1 - Math.exp(-n));
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

class TearTransition {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true });
    this.program = null;
    this.uniforms = {};
    this.startTime = performance.now();
    this.isAnimating = false;
    this._resizeHandler = () => this.resize();

    this.initGL();
    this.resize();
    window.addEventListener('resize', this._resizeHandler);
  }

  initGL() {
    const gl = this.gl;
    if (!gl) return;

    const createShader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };

    const prog = gl.createProgram();
    gl.attachShader(prog, createShader(gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(prog, createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    this.program = prog;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const getU = (name) => gl.getUniformLocation(prog, name);
    this.uniforms = {
      p: getU('uP'),
      time: getU('uTime'),
      aspect: getU('uAspect'),
      flip: getU('uFlip'),
      out: getU('uOut'),
      dispAmp: getU('uDispAmp'),
      dispScale: getU('uDispScale'),
      dispDrift: getU('uDispDrift'),
      soft: getU('uSoft'),
      detail: getU('uDetail'),
      lens: getU('uLens'),
      axis: getU('uAxis'),
      top: getU('uTop'),
      foot: getU('uFoot'),
    };

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(window.innerWidth * dpr);
    const h = Math.round(window.innerHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, w, h);
  }

  draw(progress, outward) {
    const gl = this.gl;
    if (!gl) return;
    const u = this.uniforms;
    const w = this.canvas.width;
    const h = this.canvas.height;

    gl.uniform1f(u.p, progress);
    gl.uniform1f(u.out, outward ? 1.0 : 0.0);
    gl.uniform1f(u.time, (performance.now() - this.startTime) / 1000);
    gl.uniform1f(u.axis, 0.0);
    gl.uniform1f(u.aspect, w / h);
    gl.uniform1f(u.flip, 0.0);

    gl.uniform1f(u.dispAmp, TEAR_CONFIG.dispAmp);
    gl.uniform1f(u.dispScale, TEAR_CONFIG.dispScale);
    gl.uniform1f(u.dispDrift, TEAR_CONFIG.dispDrift);
    gl.uniform1f(u.soft, TEAR_CONFIG.soft);
    gl.uniform1i(u.detail, TEAR_CONFIG.dispDetail);
    gl.uniform1f(u.lens, TEAR_CONFIG.lens);

    gl.uniform3fv(u.top, hexToRgb(TEAR_COLOR.top));
    gl.uniform3fv(u.foot, hexToRgb(TEAR_COLOR.foot));

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  runPass(outward, duration, fromP = 0) {
    return new Promise((resolve) => {
      this.canvas.classList.add('is-on');
      const start = performance.now();
      const dur = duration * (1 - fromP);

      const step = (now) => {
        const k = Math.min(1, (now - start) / dur);
        const p = fromP + (1 - fromP) * easeMask(k, dur, TEAR_CONFIG.easeTau);
        this.draw(p, outward);

        if (k < 1) {
          this._raf = requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      this._raf = requestAnimationFrame(step);
    });
  }

  async playFullSequence({ onCovered } = {}) {
    if (this.isAnimating) return;
    this.isAnimating = true;

    // Phase 1: cover screen bottom-to-top
    await this.runPass(false, TEAR_CONFIG.coverMs, 0);

    // Screen is now fully red — safe moment to swap loader content for the
    // real page underneath, hidden behind the cover.
    onCovered?.();

    // Brief pause at full cover
    await new Promise((r) => setTimeout(r, 200));

    // Phase 2: uncover screen bottom-to-top, revealing content
    await this.runPass(true, TEAR_CONFIG.uncoverMs, TEAR_CONFIG.outFrom);

    this.canvas.classList.remove('is-on');
    this.isAnimating = false;
  }

  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._resizeHandler);
  }
}

function TearCanvas({ onCovered, onDone }) {
  const canvasRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const transition = new TearTransition(canvas);
    instanceRef.current = transition;

    let cancelled = false;
    transition
      .playFullSequence({
        onCovered: () => {
          if (!cancelled) onCovered();
        },
      })
      .then(() => {
        if (!cancelled) onDone();
      });

    return () => {
      cancelled = true;
      transition.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="sheetfx"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10000,
      }}
    />
  );
}

/* ---------------------------------------------------------------------------
 *  Overlay Component – signature draw, then hands off to the tear transition
 * ------------------------------------------------------------------------- */

function Overlay({ contentRef, assets, minDuration, timeout, onReady }) {
  const pathRef = useRef(null);
  const latest = useRef({ assets, minDuration, timeout, onReady });
  latest.current = { assets, minDuration, timeout, onReady };

  const [showTear, setShowTear] = useState(false);
  // True once the tear has fully covered the screen — this is the cue to
  // swap the loader chrome (bg + signature) for the real page underneath,
  // hidden behind the solid red cover so the swap is invisible.
  const [covered, setCovered] = useState(false);

  useEffect(() => {
    const { assets: list, minDuration: minMs, timeout: limit } = latest.current;
    const tracker = createTracker({ root: contentRef.current, assets: list, timeout: limit });
    const t0 = performance.now();
    let last = t0;
    let shown = 0;
    let raf = 0;
    let holdTimer = 0;

    const paint = (v) => {
      if (pathRef.current) {
        pathRef.current.style.strokeDashoffset = String(1000 * (1 - v));
      }
    };

    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const { target } = tracker.read(now);

      const timeCap = minMs > 0 ? (now - t0) / minMs : 1;
      const goal = Math.min(target, timeCap);

      if (goal > shown) {
        shown = Math.min(goal, shown + LINEAR_SPEED * dt);
        if (goal >= 1 && 1 - shown < 0.002) shown = 1;
      }

      paint(shown);

      if (shown >= 1) {
        // Signature finished — hold, then start the red tear transition.
        holdTimer = window.setTimeout(() => {
          setShowTear(true);
        }, HOLD_MS);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(holdTimer);
      tracker.destroy();
    };
  }, [contentRef]);

  return (
    <>
      {/* Loader chrome (bg + signature) stays mounted through the cover
          phase so the signature is visible underneath the red sweep as it
          rises. It only unmounts once the screen is fully covered. */}
      {!covered && (
        <div className="fixed inset-0 z-[9999] bg-[#121212] flex flex-col justify-center items-center overflow-hidden select-none">
          <div className="relative w-full max-w-2xl 2xl:max-w-[45vw] 4xl:max-w-[1152px] px-8 flex flex-col items-center">
            <svg
              viewBox="0 0 1330.2 636.6"
              className="w-full h-auto max-h-[80vh] drop-shadow-[0_0_10px_rgba(245,245,220,0.12)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Signature being written"
            >
              <path
                ref={pathRef}
                d={SIGNATURE_PATH}
                stroke="#F5F5DC"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength="1000"
                style={{ strokeDasharray: 1000, strokeDashoffset: 1000 }}
              />
            </svg>
          </div>
        </div>
      )}
      {showTear && (
        <TearCanvas
          onCovered={() => setCovered(true)}
          onDone={onReady}
        />
      )}
    </>
  );
}

/* ---------------------------------------------------------------------------
 *  Public Loader Component
 * ------------------------------------------------------------------------- */

export default function Loader({ children, assets = [], minDuration = 3030, timeout = 30000 }) {
  const [status, setStatus] = useState('loading');
  const contentRef = useRef(null);

  useEffect(() => {
    document.documentElement.dataset.loader = status;
  }, [status]);

  const ctx = useMemo(
    () => ({ status, revealed: status !== 'loading', done: status === 'done' }),
    [status]
  );

  return (
    <LoaderContext.Provider value={ctx}>
      <div ref={contentRef} style={{ display: 'contents' }}>
        {children}
      </div>
      <Overlay
        contentRef={contentRef}
        assets={assets}
        minDuration={minDuration}
        timeout={timeout}
        onReady={() => setStatus('done')}
      />
    </LoaderContext.Provider>
  );
}

/* Signature Path Data */
const SIGNATURE_PATH = `M118.87 548.98 C121.96 546.06 125.25 543.37 128.34 540.45 C132.68 536.33 136.85 532 141.08 527.77
  C143.62 525.23 146.43 522.77 148.57 519.87 C152.13 515.05 152.2 508.91 156.11 503.99
  C160.8 498.1 166.32 492.96 171.21 487.25 C184.67 471.51 198.04 455.72 211.38 439.89
  C217.63 432.45 223.96 425.06 230.36 417.75 C233.58 414.08 236.86 410.49 239.99 406.74
  C252.09 392.21 263.57 377.22 275.18 362.31 C277.91 358.81 280.42 355.15 283.06 351.58
  C285.33 348.51 287.73 345.53 289.97 342.44 C292.74 338.62 295.34 334.66 298.04 330.78
  C300.02 327.92 302.17 325.18 304.12 322.3 C306.76 318.43 309.17 314.39 311.65 310.42
  C317.69 300.76 325.45 288.34 328.23 277.29 C329.72 271.37 332.58 259.53 329.58 254.01
  C327.73 250.62 322.72 248.19 319.4 246.42 C311.67 242.29 311.25 243.99 304 242.56
  C301.86 242.14 299.9 241.18 297.79 240.65 C292.39 239.29 285.28 240.63 280.05 242.36
  C276.55 243.52 273.23 245.22 269.85 246.7 C244.55 257.79 220.73 273 198.52 289.35
  C194.93 291.99 191.45 294.79 187.85 297.39 C185.55 299.04 183.12 300.51 180.83 302.18
  C176.7 305.19 172.72 308.45 168.77 311.69 C162.41 316.9 156.61 322.58 150.59 328.15
  C148.44 330.14 146.14 331.96 143.99 333.96 C139.13 338.49 134.52 343.33 129.82 348.03
  C125.36 352.49 120.75 356.85 116.48 361.5 C114.72 363.42 113.09 365.45 111.34 367.37
  C109.57 369.32 107.72 371.18 106 373.16 C103.46 376.09 101.07 379.15 98.51 382.06
  C97.02 383.75 95.45 385.38 93.68 386.79 C92.46 387.76 90.92 388.51 89.9 389.71
  C88.83 390.97 87.93 395.21 86.25 397.81 C84.36 400.74 82.1 403.41 80.12 406.27
  C77.63 409.86 75.38 413.64 73.07 417.35 C71.42 420 69.71 422.61 68.17 425.32
  C67.09 427.2 66.17 429.16 65.08 431.04 C63.83 433.21 62.37 435.23 61.14 437.41
  C59.61 440.09 58.48 442.97 57.18 445.77 C51.22 458.49 48.84 466.34 50.03 480.67
  C51 492.36 59.5 501.6 67.38 509.49 C71.58 513.69 75.65 518.14 80.21 521.96
  C85.04 526.01 90.44 529.4 95.7 532.86 C99.85 535.59 106.5 540.04 111.21 541.28
  C115.88 542.52 121.12 541.98 125.92 541.98 C126.61 544.11 127.16 546.51 128.28 548.46
  C131.59 554.24 141.35 558.73 146.95 562.38 C162.26 572.38 180.04 581.93 194.17 593.23
  C198.57 596.74 208.91 605.69 210.98 610.59 C211.65 612.19 211.61 613.65 211.87 615.35
  C210.14 616.77 209.59 617.58 207.45 618.5 C202.27 620.75 196.4 620.81 190.91 621.8
  C185.97 622.69 181.06 623.76 176.12 624.72 C171.68 625.59 167.27 625.84 162.79 626.32
  C158.33 626.8 153.86 627.43 149.39 627.78 C144.77 628.15 140.1 627.98 135.47 627.98
  C131.16 627.98 126.83 628.11 122.52 627.86 C119.95 627.71 117.4 627.3 114.83 627.13
  C111.21 626.89 107.59 627.06 103.98 626.76 C98.25 626.28 92.6 625.34 86.92 624.48
  C84.4 624.1 81.85 623.95 79.34 623.47 C76.9 623 74.54 622.2 72.13 621.57
  C65.82 619.91 59.51 618.36 53.3 616.33 C49.78 615.19 46.42 613.63 43 612.24
  C30.41 607.11 25.07 603.98 16.1 593.58 C12.02 588.84 5.58 583.61 10.29 576.97
  C12.52 573.83 18.94 567.31 22.46 565.93 C24.25 565.22 26.18 565.09 28.09 565.03
  C34 564.85 38.32 566.18 43.89 567.83 C47.46 568.89 51.01 569.86 54.33 571.59
  C62.4 575.77 70.16 580.77 77.1 586.63 C79.36 588.53 81.45 590.61 83.63 592.6
  C97.69 605.33 112.48 618.42 132.38 619.62 C136.25 619.85 140.78 619.33 144.25 617.49
  C150.62 614.1 160.25 601.62 164.73 595.62 C168.27 590.87 171.86 586.03 174.19 580.54
  C174.79 579.12 175.27 577.65 175.87 576.23 C176.71 574.25 177.75 572.35 178.58 570.35
  C179.69 567.67 180.34 564.74 181.79 562.21 C182.35 561.23 182.98 560.91 183.72 559.98
  C184.53 560.17 185.38 560.2 186.19 560.39 C190.92 561.49 194.2 565.91 198.33 568.17
  C202.26 570.31 206.75 570.92 211.17 570.93 C221.95 570.97 232.07 565.92 240.27 559.17
  C244.04 556.08 247.5 552.65 251.3 549.58 C261.01 541.72 271.71 534.94 283.24 530.12
  C292.05 526.45 301.08 523.29 309.98 519.85 C312.57 518.84 315.05 517.6 317.63 516.58
  C320.21 515.56 322.89 514.81 325.48 513.8 C329.5 512.23 333.39 510.38 337.34 508.65
  C341.85 506.67 346.45 504.86 350.88 502.7 C354.23 501.07 357.42 499.18 360.69 497.41
  C363.14 496.07 365.65 494.85 368.03 493.4 C373.91 489.79 379.56 485.49 384.98 481.22
  C401.63 468.1 420.64 447.38 432.9 430.04 C434.71 427.48 436.23 424.75 437.88 422.1
  C439.86 418.9 441.98 415.78 444.11 412.68 C453.53 398.95 462.92 385.22 471.82 371.16
  C474.49 366.94 477.07 362.46 480.35 358.69 C483.15 355.48 486.5 352.74 488.97 349.26
  C491.14 346.2 492.09 342.52 494.15 339.4 C495.89 336.76 498.49 334.68 499.78 331.74
  C501.06 328.84 500.87 325.54 501.62 322.5 C502.22 320.1 503.25 317.84 504.05 315.5
  C504.84 313.16 505.4 310.75 506.34 308.45 C508.01 304.37 511.09 301.15 512.84 297.15
  C513.96 294.6 514.49 291.83 515.43 289.22 C517.62 283.15 520.21 277.18 522.65 271.21
  C524.86 265.81 527.14 260.39 529.61 255.09 C531.43 251.18 533.41 247.34 535.16 243.39
  C537.52 238.03 539.61 232.57 542.26 227.33 C544.21 223.46 546.73 219.87 548.81 216.04
  C549.18 216.74 549.44 217.49 549.81 218.19 C551.81 221.98 553.5 223.13 553.74 227.85
  C554.14 235.82 550.32 243.01 546.79 249.89 C541.25 260.71 534.89 271 528.39 281.27
  C526.55 284.19 524.93 287.26 522.7 289.91 C518.06 295.4 511.9 299.76 507.91 305.79
  C505.82 308.95 505.08 312.58 503.84 316.1 C503.12 318.13 502.27 320.12 501.64 322.19
  C500.84 324.85 500.42 327.65 499.24 330.19 C497.66 333.6 495.01 336.35 493.47 339.8
  C488.67 350.5 485.63 361.95 482.06 373.08 C477.06 388.69 471.7 404.26 468.01 420.26
  C466.54 426.64 464.89 432.98 463.45 439.37 C461.79 446.71 460.4 454.13 458.97 461.51
  C458.03 466.36 456.04 475.51 458.55 479.86 C459.57 481.62 461.01 482.63 462.46 483.98
  C466.31 481.62 469.83 479 473.01 475.74 C476.15 472.53 478.52 468.7 481.31 465.2
  C484.74 460.91 488.39 456.8 491.92 452.6 C494.2 449.88 496.33 447.05 498.68 444.4
  C501.52 441.19 504.73 438.33 507.48 435.04 C509.32 432.84 510.95 430.47 512.71 428.21
  C518.54 420.68 524.26 413.06 529.67 405.23 C533.06 400.32 536.28 395.29 539.64 390.36
  C544.61 383.08 549.68 375.86 554.63 368.57 C557.63 364.16 560.43 359.63 563.4 355.2
  C565.34 352.32 567.59 349.64 569.49 346.73 C570.85 344.64 571.95 342.41 573.24 340.28
  C575.35 336.8 577.64 333.44 579.79 329.99 C581.1 327.87 582.31 325.69 583.68 323.6
  C587.28 318.08 591.03 312.63 594.76 307.19 C596.18 305.11 597.71 303.1 599.07 300.98
  C600.75 298.36 601.81 295.4 603.58 292.85 C606.61 288.5 615.3 280.56 619.44 276.42
  C624.38 271.47 629.24 266.42 634.3 261.61 C636.91 259.14 639.73 256.92 642.34 254.45
  C645.71 251.25 648.87 247.83 652.29 244.68 C659.04 238.47 663.29 236.51 668.87 228.65
  C667.94 229.51 666.63 231.08 665.58 232.19 C663.55 234.35 661.45 236.45 659.3 238.48
  C656.93 240.73 654.37 242.75 651.99 244.97 C648.58 248.13 645.42 251.55 642.03 254.74
  C639.89 256.74 637.6 258.57 635.44 260.55 C632.26 263.46 629.32 266.63 626.19 269.59
  C623.81 271.83 621.25 273.85 618.87 276.07 C614.04 280.59 609.72 285.74 604.62 289.95
  C601.46 292.55 597.65 294.09 594.28 296.39 C585.94 302.07 577.85 308.12 569.48 313.77
  C565.05 316.75 560.62 319.72 556.17 322.67 C554.08 324.06 552.09 325.61 549.9 326.85
  C547.22 328.38 544.33 329.52 541.62 331 C538.36 332.79 535.17 334.67 531.75 336.13
  C526.05 338.55 516.14 342.2 510.06 340.24 C508.26 339.67 506.71 338.57 505.4 337.23
  C501.2 332.94 501.24 325.59 502.6 320.07 C503.19 317.68 504.12 315.36 504.83 313
  C506.3 308.11 508.59 302.65 514.13 301.44 C521.17 299.9 525.83 304.65 530.64 308.95
  C533.1 311.15 535.37 313.55 537.82 315.76 C540.24 317.95 542.77 320 545.12 322.27
  C549.64 326.63 553.85 331.36 558.7 335.37 C561.18 337.41 563.79 339.28 566.18 341.44
  C569.12 344.1 571.8 347.02 574.79 349.62 C577.22 351.73 579.79 353.68 582.26 355.74
  C588.44 360.92 594.64 366.07 600.85 371.21 C604.85 374.52 608.68 378.02 612.65 381.35
  C617.05 385.05 621.75 388.33 626.32 391.81 C630.15 394.71 633.89 397.75 637.58 400.83
  C650.96 411.96 672.55 431.42 688.55 437.12 C702.04 441.93 706.68 435.34 713.81 425.02
  C718.77 417.85 723.74 410.55 727.7 402.77 C729.52 399.2 731.05 395.49 732.7 391.84
  C736.66 383.12 739.63 374.05 742.91 365.07 C744.39 361.02 746.09 357.05 747.51 352.98
  C750.27 345.1 752.58 337.08 755.19 329.16 C756.83 324.18 758.8 319.31 760.49 314.35
  C761.79 310.55 762.8 306.66 764.1 302.85 C765.09 299.92 766.18 297.04 767.09 294.09
  C768.54 289.38 769.72 284.52 771.72 280 C773.83 275.22 777.45 271.05 779.1 266.06
  C779.8 263.96 779.94 261.73 780.3 259.56 C780.91 255.83 781.81 252.15 782.34 248.4
  C782.74 245.52 782.84 242.62 783.13 239.73 C783.49 236 783.61 231.97 784.65 228.36
  C785.33 225.97 786.58 223.83 787.51 221.55 C789.5 216.64 790.62 207.54 789.49 202.35
  C789.31 201.56 789.01 200.8 788.84 200.01 C787.54 201.52 786.22 202.86 785.19 204.57
  C783.34 207.64 782.95 211.66 780.52 214.35 C778.44 216.64 775.22 217.12 772.72 218.78
  C769.03 221.22 766.36 225.15 763.97 228.79 C762.61 230.87 761.44 233.07 760.14 235.2
  C758.67 237.59 757.08 239.91 755.73 242.37 C751.88 249.35 747.7 259.37 744.97 266.91
  C743.92 269.82 743.09 272.8 742.07 275.71 C740.96 278.92 739.58 282.02 738.56 285.26
  C737.72 287.92 737.08 290.64 736.24 293.3 C734.29 299.48 731.66 305.42 729.73 311.6
  C726.93 320.58 725.12 329.72 723.28 338.93 C722.36 343.55 721.33 348.16 720.56 352.8
  C720.03 356 719.95 359.21 719.68 362.44 C719.16 368.64 718.5 374.81 719.01 381.05
  C719.65 388.9 722.78 388.26 720.87 397.52 C722.51 393.53 724.37 389.63 725.97 385.63
  C728.5 379.34 730.73 372.93 733.09 366.58 C736.2 358.2 739.39 349.85 742.36 341.42
  C744.11 336.46 745.45 331.37 747.18 326.41 C755.22 303.37 763.03 280.24 769.78 256.78
  C770.9 252.89 771.75 248.94 772.82 245.04 C773.82 241.42 775.23 238.03 777.3 234.89
  C778.32 233.36 779.4 231.89 780.09 230.17 C780.7 228.65 780.95 227.01 781.3 225.41
  C782.03 228.37 783.05 231.4 783.29 234.44 C783.44 236.31 783.22 238.17 783.07 240.03
  C782.87 242.61 782.77 245.19 782.44 247.76 C781.75 253.1 780.63 258.38 779.96 263.73
  C779.32 268.86 779.07 274 778.52 279.13 C778.03 283.59 777.27 288.03 777 292.5
  C776.74 296.79 777.01 301.09 776.68 305.37 C776.48 307.94 776.06 310.48 775.99 313.06
  C775.85 318.54 777.54 333.5 779.4 338.53 C780.15 340.57 781.28 342.18 782.44 343.98
  C783.57 343.78 784.56 343.82 785.65 343.52 C789.47 342.43 792.64 339.58 794.68 336.23
  C795.64 334.64 796.32 332.9 797.28 331.31 C799.23 328.08 801.7 325.21 803.6 321.93
  C807.52 315.21 811.53 308.56 815.4 301.82 C817.26 298.59 819.25 295.45 820.77 292.04
  C821.91 289.51 822.89 286.92 824.01 284.38 C826.14 279.58 828.43 274.88 830.74 270.17
  C831.96 267.69 833.06 265.13 834.66 262.86 C835.88 261.12 837.33 259.85 838.87 258.43
  C842.32 268.71 841.1 271.22 842.62 280.87 C843.79 288.27 846 295.38 848.85 302.29
  C850.91 307.3 852.87 311.15 856.9 314.9 C858.05 315.97 859.28 317.01 860.71 317.67
  C865.04 319.65 872.8 317.75 876.69 315.32 C878.89 313.95 880.7 312.07 882.64 310.37
  C886.23 307.23 890.35 304.84 894.16 301.99 C896.2 300.47 898.08 298.71 900.26 297.38
  C902.65 295.93 905.33 295.1 907.65 293.51 C911.37 290.95 914.36 287.48 918.08 284.9
  C924.02 280.77 934.4 274.71 941.62 274.15 C945.48 273.85 949.32 274.49 953.13 275.02
  C962.62 276.34 972.53 276.88 981.58 273.19 C996.19 267.22 1006.09 254.97 1015.38 242.76
  C1019.55 237.27 1021.76 233.8 1027.2 229.31 C1033.67 234.23 1036.51 237.6 1044.47 240.73
  C1061.56 247.45 1083.43 245.54 1100.69 240.11 C1110.2 237.12 1125.58 230.21 1134.75 225.76
  C1144.16 221.2 1153.05 214.39 1161.5 208.26 C1167.93 203.59 1174.44 199.01 1180.57 193.94
  C1184.83 190.42 1188.91 186.68 1193.04 183 C1197.65 178.89 1202.37 174.88 1206.95 170.73
  C1208.91 168.96 1210.75 167.07 1212.71 165.3 C1214.88 163.33 1217.17 161.5 1219.3 159.49
  C1226.79 152.4 1233.94 144.91 1241.24 137.61 C1246.41 132.44 1251.73 127.38 1256.73 122.03
  C1261.63 116.8 1266.22 111.26 1271.06 105.97 C1275.34 101.28 1280.73 98.44 1283.99 94.47
  C1285.79 92.29 1286.91 89.72 1288.26 87.27 C1290.32 83.54 1292.72 79.64 1295.54 76.45
  C1297.6 74.12 1300.23 72.41 1302.47 70.27 C1307.63 65.31 1315.29 55.35 1318.22 48.85
  C1320.36 44.1 1322 38.74 1321.55 33.48 C1321.34 31.08 1320.77 28.76 1320.74 26.34
  C1320.65 20.43 1320.87 14.51 1320.87 8.6 C1320.87 12.07 1321.16 15.75 1320.34 19.15
  C1319.76 21.57 1318.38 23.67 1317.32 25.89 C1315.99 28.68 1314.85 31.54 1313.44 34.28
  C1309.62 41.72 1305.38 48.89 1301.87 56.49 C1300.09 60.36 1298.08 64.32 1296.79 68.39
  C1295.95 71.07 1295.76 73.91 1294.68 76.52 C1293.37 79.68 1291.16 82.41 1289.39 85.32
  C1287.33 88.73 1285.64 92.46 1284.2 96.17 C1282.62 100.22 1281.85 104.56 1280.8 108.77
  C1278.61 117.55 1276.45 126.32 1274.49 135.15 C1271.9 146.83 1269.45 158.63 1268.15 170.53
  C1267.45 176.99 1267.16 183.46 1266.72 189.94 C1266.55 192.51 1266.14 195.06 1265.99 197.63
  C1265.85 199.93 1265.88 202.23 1265.74 204.53 C1265.56 207.43 1265.09 210.3 1264.96 213.2
  C1264.79 216.84 1264.96 220.49 1264.76 224.12 C1264.59 227.35 1264.06 230.55 1263.94 233.78
  C1263.77 238.08 1264 242.4 1263.73 246.7 C1263.55 249.6 1263.08 252.47 1262.95 255.37
  C1262.76 259.68 1263 263.99 1262.75 268.29 C1262.38 274.73 1261.55 281.16 1261.06 287.59
  C1260.78 291.2 1260.96 294.82 1260.68 298.43 C1260.35 302.57 1259.69 306.7 1259.22 310.83
  C1258.93 313.39 1258.78 315.96 1258.47 318.52 C1257.48 326.68 1256.2 334.88 1254.76 342.98
  C1253.62 349.47 1252.14 355.91 1250.87 362.37`;