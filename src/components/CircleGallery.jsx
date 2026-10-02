// import React, { useEffect, useRef } from 'react';
// import gsap from 'gsap';
// import { ScrollTrigger } from 'gsap/ScrollTrigger';

// gsap.registerPlugin(ScrollTrigger);

// const GALLERY_IMAGES = [
//   'https://picsum.photos/id/10/600/400',
//   'https://picsum.photos/id/20/600/400',
//   'https://picsum.photos/id/30/600/400',
//   'https://picsum.photos/id/40/600/400',
//   'https://picsum.photos/id/50/600/400',
//   'https://picsum.photos/id/60/600/400',
//   'https://picsum.photos/id/70/600/400',
//   'https://picsum.photos/id/80/600/400',
// ];

// export default function CircleGallery() {
//   const scrollWrapRef = useRef(null);
//   const pinRef = useRef(null);
//   const phraseRef = useRef(null);

//   useEffect(() => {
//     const scrollWrap = scrollWrapRef.current;
//     const pinEl = pinRef.current;
//     const phraseEl = phraseRef.current;

//     if (!scrollWrap || !pinEl || !phraseEl) return;

//     let triggerInstance = null;
//     let isCancelled = false;

//     // Asset preloader helper
//     const preloadImage = (url) => {
//       return new Promise((resolve) => {
//         const img = new Image();
//         img.crossOrigin = 'anonymous';
//         img.src = url;
//         if (img.complete) resolve(img);
//         else {
//           img.onload = () => resolve(img);
//           img.onerror = () => resolve(img);
//         }
//       });
//     };

//     const setupGallery = async () => {
//       await Promise.all(GALLERY_IMAGES.map((url) => preloadImage(url)));
//       if (isCancelled) return;

//       const vw = window.innerWidth;
//       const SLICES = 12;
//       const imgW = Math.min(Math.max(140, vw * 0.16), 220);
//       const imgH = imgW * (2 / 3);

//       const orbitR = (vw * 0.42 + 600) / 2;
//       const cylR = orbitR * 0.8;
//       const sliceW = imgW / SLICES;

//       const bendRad = imgW / cylR;
//       const totalBendDeg = (bendRad * 180) / Math.PI;
//       const stepDeg = totalBendDeg / SLICES;

//       // 1. Build 3D Cylindrical Slices
//       const rawImages = pinEl.querySelectorAll('.cg-raw-img');
//       const cgImgNodes = [];

//       rawImages.forEach((img) => {
//         const src = img.getAttribute('src');
//         const wrapper = document.createElement('div');
//         wrapper.className =
//           'cg-img absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 pointer-events-none';
//         wrapper.style.width = `${imgW}px`;
//         wrapper.style.height = `${imgH}px`;
//         wrapper.style.transformStyle = 'preserve-3d';

//         for (let s = 0; s < SLICES; s++) {
//           const sl = document.createElement('div');
//           sl.className = 'cg-slice absolute top-0 h-full bg-no-repeat';

//           const displayW = sliceW + 1.5;
//           sl.style.width = `${displayW.toFixed(1)}px`;
//           sl.style.left = '50%';
//           sl.style.marginLeft = `${(-displayW / 2).toFixed(1)}px`;
//           sl.style.backgroundImage = `url("${src}")`;
//           sl.style.backgroundSize = `${imgW.toFixed(1)}px ${imgH.toFixed(1)}px`;
//           sl.style.backgroundPosition = `${(-s * sliceW).toFixed(1)}px 0`;

//           sl.style.transformStyle = 'preserve-3d';
//           sl.style.webkitBackfaceVisibility = 'visible';
//           sl.style.backfaceVisibility = 'visible';
//           sl.style.transformOrigin = `50% 50% ${(-cylR).toFixed(1)}px`;

//           const angle = (s - (SLICES - 1) / 2) * stepDeg;
//           sl.style.transform = `rotateY(${angle.toFixed(2)}deg)`;
//           wrapper.appendChild(sl);
//         }

//         img.parentNode.replaceChild(wrapper, img);
//         cgImgNodes.push(wrapper);
//       });

//       // 2. Wrap Phrase Words
//       if (!phraseEl.querySelector('.word')) {
//         const walker = document.createTreeWalker(phraseEl, NodeFilter.SHOW_TEXT);
//         const textNodes = [];
//         while (walker.nextNode()) textNodes.push(walker.currentNode);

//         textNodes.forEach((node) => {
//           const words = node.textContent.split(/(\s+)/);
//           const frag = document.createDocumentFragment();
//           words.forEach((w) => {
//             if (/^\s+$/.test(w)) {
//               frag.appendChild(document.createTextNode(w));
//             } else if (w) {
//               const span = document.createElement('span');
//               span.className =
//                 'word inline-block opacity-0 blur-[8px] transition-[filter] duration-100 ease-out';
//               span.textContent = w;
//               frag.appendChild(span);
//             }
//           });
//           node.parentNode.replaceChild(frag, node);
//         });
//       }

//       const cgPhraseWords = gsap.utils.toArray(phraseEl.querySelectorAll('.word'));
//       const count = cgImgNodes.length;

//       // 3. Orbit Geometry Parametrization
//       const rx = vw * 0.42;
//       const rz = 650;
//       const tiltY = vw <= 768 ? 100 : 220;
//       const entryAngle = Math.PI / 2;
//       const offX = vw * 0.95;

//       function getPos(t) {
//         if (t <= 0.12) {
//           const p = t / 0.12;
//           return {
//             x: -offX * (1 - p),
//             y: tiltY,
//             z: rz * p,
//             rotY: 0,
//           };
//         }
//         if (t <= 0.88) {
//           const p = (t - 0.12) / 0.76;
//           const angle = entryAngle - p * Math.PI * 2;
//           const x = Math.cos(angle) * rx;
//           const z = Math.sin(angle) * rz;
//           const ry = p * Math.PI * 2;

//           return {
//             x,
//             y: (z / rz) * tiltY,
//             z,
//             rotY: ry,
//           };
//         }
//         const p = (t - 0.88) / 0.12;
//         return {
//           x: offX * p,
//           y: tiltY,
//           z: rz * (1 - p),
//           rotY: Math.PI * 2,
//         };
//       }

//       const stagger = 0.09;
//       const totalRange = 1 + stagger * (count - 1);

//       // 4. GSAP ScrollTrigger with scrub: 1.8 for fluid drift inertia
//       triggerInstance = ScrollTrigger.create({
//         trigger: scrollWrap,
//         start: 'top top',
//         end: 'bottom bottom',
//         pin: pinEl,
//         scrub: 1.8,
//         onUpdate: (self) => {
//           const progress = self.progress;

//           // Position Cards
//           cgImgNodes.forEach((node, i) => {
//             const imgT = progress * totalRange - i * stagger;

//             if (imgT <= 0 || imgT >= 1) {
//               node.style.opacity = '0';
//               return;
//             }

//             let alpha = 1;
//             if (imgT < 0.06) alpha = imgT / 0.06;
//             else if (imgT > 0.94) alpha = (1 - imgT) / 0.06;

//             const pos = getPos(imgT);
//             const rotDeg = ((pos.rotY * 180) / Math.PI).toFixed(1);

//             node.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(
//               1
//             )}px, ${pos.z.toFixed(1)}px) rotateY(${rotDeg}deg)`;
//             node.style.opacity = alpha;
//             node.style.zIndex = Math.min(Math.round(pos.z + 200), 40);
//           });

//           // Text Y-Translation & Word Blur
//           const phraseStart = 0.22;
//           const phraseEnd = 0.78;
//           const travelY = 180;

//           if (progress < phraseStart || progress > phraseEnd) {
//             phraseEl.style.opacity = '0';
//           } else {
//             const globalP = (progress - phraseStart) / (phraseEnd - phraseStart);
//             const yOffset = travelY * (0.5 - globalP);
//             phraseEl.style.transform = `translateY(${yOffset.toFixed(1)}px)`;

//             const revealEnd = 0.4;
//             cgPhraseWords.forEach((w, wi) => {
//               if (globalP < revealEnd) {
//                 const revealP = globalP / revealEnd;
//                 const wordT = revealP * (cgPhraseWords.length + 4) - wi;
//                 const wP = Math.max(0, Math.min(1, wordT / 3));
//                 w.style.opacity = wP;
//                 w.style.filter = `blur(${(8 * (1 - wP)).toFixed(1)}px)`;
//               } else {
//                 w.style.opacity = '1';
//                 w.style.filter = 'blur(0px)';
//               }
//             });

//             let alpha = 1;
//             if (globalP < 0.1) alpha = globalP / 0.1;
//             else if (globalP > 0.75) alpha = (1 - globalP) / 0.25;
//             phraseEl.style.opacity = alpha;
//           }
//         },
//       });

//       ScrollTrigger.refresh();
//     };

//     setupGallery();

//     const handleResize = () => ScrollTrigger.refresh();
//     window.addEventListener('resize', handleResize);

//     return () => {
//       isCancelled = true;
//       window.removeEventListener('resize', handleResize);
//       if (triggerInstance) triggerInstance.kill();
//     };
//   }, []);

//   return (
//     <div ref={scrollWrapRef} className="scroll-wrap relative h-[500vh] w-full bg-[#0a0a0a]">
//       <section
//         ref={pinRef}
//         className="circle-gallery-pin sticky top-0 flex h-screen w-screen items-center justify-center overflow-hidden [perspective:1400px] [transform-style:preserve-3d]"
//       >
//         {/* Hidden Raw Source Images */}
//         {GALLERY_IMAGES.map((src, idx) => (
//           <img
//             key={idx}
//             className="cg-raw-img absolute hidden"
//             src={src}
//             alt={`Project ${idx + 1}`}
//           />
//         ))}

//         {/* Center Phrase with Flexbox Centering */}
//         <div className="pointer-events-none absolute inset-0 z-[100] flex items-center justify-center">
//           <p
//             ref={phraseRef}
//             style={{ opacity: 0 }}
//             className="cg-phrase m-0 max-w-[750px] text-center text-[clamp(2.2rem,4.5vw,3.8rem)] font-normal leading-[1.2] text-white"
//           >
//             Each project is a chance to{' '}
//             <span className="font-serif italic text-white">learn</span>,{' '}
//             <span className="font-serif italic text-white">experiment</span> and push my limits.
//           </p>
//         </div>
//       </section>
//     </div>
//   );
// }

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const GALLERY_IMAGES = [
  "https://picsum.photos/id/10/600/400",
  "https://picsum.photos/id/20/600/400",
  "https://picsum.photos/id/30/600/400",
  "https://picsum.photos/id/40/600/400",
  "https://picsum.photos/id/50/600/400",
  "https://picsum.photos/id/60/600/400",
  "https://picsum.photos/id/70/600/400",
  "https://picsum.photos/id/80/600/400",
];

export default function CircleGallery() {
  const scrollWrapRef = useRef(null);
  const pinRef = useRef(null);
  const phraseRef = useRef(null);

  useEffect(() => {
    const scrollWrap = scrollWrapRef.current;
    const pinEl = pinRef.current;
    const phraseEl = phraseRef.current;

    if (!scrollWrap || !pinEl || !phraseEl) return;

    let triggerInstance = null;
    let isCancelled = false;

    const preloadImage = (url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;
        if (img.complete) resolve(img);
        else {
          img.onload = () => resolve(img);
          img.onerror = () => resolve(img);
        }
      });
    };

    const setupGallery = async () => {
      await Promise.all(GALLERY_IMAGES.map((url) => preloadImage(url)));
      if (isCancelled) return;

      const vw = window.innerWidth;

      // Exact dimensions from indexLuke.js
      const SLICES = 10;
      const imgW = Math.min(Math.max(120, vw * 0.14), 210);
      const imgH = imgW * (2 / 3);

      const orbitR = (vw * 0.34 + 500) / 2;
      const cylR = orbitR;
      const sliceW = imgW / SLICES;

      const bendRad = imgW / orbitR;
      const totalBendDeg = (bendRad * 180) / Math.PI;
      const stepDeg = totalBendDeg / SLICES;

      // 1. Build 3D Cylindrical Slices
      const rawImages = pinEl.querySelectorAll(".cg-raw-img");
      const cgImgNodes = [];

      rawImages.forEach((img) => {
        const src = img.getAttribute("src");
        const wrapper = document.createElement("div");
        wrapper.className =
          "cg-img absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 pointer-events-none";
        wrapper.style.width = `${imgW}px`;
        wrapper.style.height = `${imgH}px`;
        wrapper.style.transformStyle = "preserve-3d";

        for (let s = 0; s < SLICES; s++) {
          const sl = document.createElement("div");
          sl.className = "cg-slice absolute top-0 h-full bg-no-repeat";

          const displayW = sliceW + 1.5;
          sl.style.width = `${displayW.toFixed(1)}px`;
          sl.style.left = "50%";
          sl.style.marginLeft = `${(-displayW / 2).toFixed(1)}px`;
          sl.style.backgroundImage = `url("${src}")`;
          sl.style.backgroundSize = `${imgW.toFixed(1)}px ${imgH.toFixed(1)}px`;
          sl.style.backgroundPosition = `${(-s * sliceW).toFixed(1)}px 0`;

          sl.style.transformStyle = "preserve-3d";
          sl.style.webkitBackfaceVisibility = "visible";
          sl.style.backfaceVisibility = "visible";
          sl.style.transformOrigin = `50% 50% ${(-cylR).toFixed(1)}px`;

          const angle = (s - (SLICES - 1) / 2) * stepDeg;
          sl.style.transform = `rotateY(${angle.toFixed(2)}deg)`;
          wrapper.appendChild(sl);
        }

        img.parentNode.replaceChild(wrapper, img);
        cgImgNodes.push(wrapper);
      });

      // 2. Wrap Phrase Words into Spans
      if (!phraseEl.querySelector(".word")) {
        const walker = document.createTreeWalker(
          phraseEl,
          NodeFilter.SHOW_TEXT,
        );
        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);

        textNodes.forEach((node) => {
          const words = node.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          words.forEach((w) => {
            if (/^\s+$/.test(w)) {
              frag.appendChild(document.createTextNode(w));
            } else if (w) {
              const span = document.createElement("span");
              span.className =
                "word inline-block opacity-0 blur-[8px] transition-[filter] duration-100 ease-out";
              span.textContent = w;
              frag.appendChild(span);
            }
          });
          node.parentNode.replaceChild(frag, node);
        });
      }

      const cgPhraseWords = gsap.utils.toArray(
        phraseEl.querySelectorAll(".word"),
      );
      const count = cgImgNodes.length;

      // 3. Orbit Geometry Parametrization
      const rx = vw * 0.34; // Keeps cards contained nicely inside side padding
      const rz = 500;
      const tiltY = vw <= 768 ? 80 : 180;
      const entryAngle = Math.PI / 2;
      const offX = vw * 0.85;

      function getPos(t) {
        if (t <= 0.12) {
          const p = t / 0.12;
          return {
            x: -offX * (1 - p),
            y: tiltY,
            z: rz * p,
            rotY: 0,
          };
        }
        if (t <= 0.88) {
          const p = (t - 0.12) / 0.76;
          const angle = entryAngle - p * Math.PI * 2;
          const x = Math.cos(angle) * rx;
          const z = Math.sin(angle) * rz;
          const ry = p * Math.PI * 2;

          return {
            x,
            y: (z / rz) * tiltY,
            z,
            rotY: ry,
          };
        }
        const p = (t - 0.88) / 0.12;
        return {
          x: offX * p,
          y: tiltY,
          z: rz * (1 - p),
          rotY: Math.PI * 2,
        };
      }

      const stagger = 0.09;
      const totalRange = 1 + stagger * (count - 1);

      // 4. GSAP ScrollTrigger Integration
      triggerInstance = ScrollTrigger.create({
        trigger: scrollWrap,
        start: "top top",
        end: "bottom bottom",
        pin: pinEl,
        scrub: 1.8,
        onUpdate: (self) => {
          const progress = self.progress;

          // Position Cards
          cgImgNodes.forEach((node, i) => {
            const imgT = progress * totalRange - i * stagger;

            if (imgT <= 0 || imgT >= 1) {
              node.style.opacity = "0";
              return;
            }

            let alpha = 1;
            if (imgT < 0.06) alpha = imgT / 0.06;
            else if (imgT > 0.94) alpha = (1 - imgT) / 0.06;

            const pos = getPos(imgT);
            const rotDeg = ((pos.rotY * 180) / Math.PI).toFixed(1);

            node.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(
              1,
            )}px, ${pos.z.toFixed(1)}px) rotateY(${rotDeg}deg)`;
            node.style.opacity = alpha;
            node.style.zIndex = Math.min(Math.round(pos.z + 600), 40);
          });

          // Text Y-Translation & Word Blur
          const phraseStart = 0.25;
          const phraseEnd = 0.75;
          const travelY = 200;

          if (progress < phraseStart || progress > phraseEnd) {
            phraseEl.style.opacity = "0";
          } else {
            const globalP =
              (progress - phraseStart) / (phraseEnd - phraseStart);
            const yOffset = travelY * (0.5 - globalP);
            phraseEl.style.transform = `translateY(${yOffset.toFixed(1)}px)`;

            const revealEnd = 0.4;
            cgPhraseWords.forEach((w, wi) => {
              if (globalP < revealEnd) {
                const revealP = globalP / revealEnd;
                const wordT = revealP * (cgPhraseWords.length + 4) - wi;
                const wP = Math.max(0, Math.min(1, wordT / 3));
                w.style.opacity = wP;
                w.style.filter = `blur(${(8 * (1 - wP)).toFixed(1)}px)`;
              } else {
                w.style.opacity = "1";
                w.style.filter = "blur(0px)";
              }
            });

            let alpha = 1;
            if (globalP < 0.1) alpha = globalP / 0.1;
            else if (globalP > 0.75) alpha = (1 - globalP) / 0.25;
            phraseEl.style.opacity = alpha;
          }
        },
      });

      ScrollTrigger.refresh();
    };

    setupGallery();

    const handleResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", handleResize);

    return () => {
      isCancelled = true;
      window.removeEventListener("resize", handleResize);
      if (triggerInstance) triggerInstance.kill();
    };
  }, []);

  return (
    <div
      ref={scrollWrapRef}
      className="scroll-wrap relative h-[500vh] w-full bg-[#0a0a0a]"
    >
      <section
        ref={pinRef}
        className="circle-gallery-pin sticky top-0 flex h-screen w-screen items-center justify-center overflow-hidden [perspective:1200px] [transform-style:preserve-3d]"
      >
        {/* Source images */}
        {GALLERY_IMAGES.map((src, idx) => (
          <img
            key={idx}
            className="cg-raw-img absolute hidden"
            src={src}
            alt={`Project ${idx + 1}`}
          />
        ))}

        {/* Center Phrase text */}
        <div className="pointer-events-none absolute inset-0 z-[100] flex items-center justify-center">
          <p
            ref={phraseRef}
            style={{ opacity: 0 }}
            className="cg-phrase m-0 max-w-[700px] text-center text-[clamp(2rem,4vw,3.5rem)] font-normal leading-[1.25] text-white"
          >
            Each project is a chance to{" "}
            <span className="font-serif italic text-white">learn</span>,{" "}
            <span className="font-serif italic text-white">experiment</span> and
            push my limits.
          </p>
        </div>
      </section>
    </div>
  );
}
