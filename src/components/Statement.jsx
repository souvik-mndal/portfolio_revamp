// import { useLayoutEffect, useRef } from "react";
// import gsap from "gsap";
// import { ScrollTrigger } from "gsap/ScrollTrigger";

// gsap.registerPlugin(ScrollTrigger);

// export default function Statement() {
//   const root = useRef(null);

//   useLayoutEffect(() => {
//     const mm = gsap.matchMedia(root);

//     const wrap = root.current.closest("[data-pin-wrap]") || root.current;

//     // Everything below only runs if the user has NOT asked for reduced motion.
//     mm.add("(prefers-reduced-motion: no-preference)", () => {
//       // 1. Entrance: masked line reveal (the two headline lines only)
//       gsap.from("[data-line]", {
//         yPercent: 115,
//         duration: 1.3,
//         ease: "expo.out",
//         stagger: 0.14,
//         scrollTrigger: { trigger: root.current, start: "top 65%", once: true },
//       });

//             // Colour change finishes early (10%)
//       const colorExit = {
//         trigger: wrap,
//         start: "top top",
//         end: "top top-=10%",
//         scrub: true,
//       };

//       // Scale keeps going much longer (45%)
//       const scaleExit = {
//         trigger: wrap,
//         start: "top top",
//         end: "top top-=45%",
//         scrub: true,
//       };

//       // 2. Exit: headline + sentence keep receding for 45%
//       gsap.to("[data-head]", {
//         scale: 0.85,
//         yPercent: -6,
//         ease: "none",
//         scrollTrigger: { ...scaleExit },
//       });

//       // 3. Background and text colour switch within the first 10%
//       gsap.to(root.current, {
//         backgroundColor: "#1e1e1e",
//         color: "#F5F0E8",
//         ease: "none",
//         scrollTrigger: { ...colorExit },
//       });
//     });

//     // Custom fonts change layout height -> recalc trigger positions once loaded
//     document.fonts?.ready.then(() => ScrollTrigger.refresh());

//     return () => mm.revert();
//   }, []);

//   return (
//     <section
//       ref={root}
//       className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-[#F5F0E8] px-[5vw] text-[#2b2b2b] font-oswald "
//     >
//       <div data-head className="flex w-full origin-center flex-col items-center">
//         <h2 className="text-center font-black uppercase leading-[0.9] tracking-[-0.045em]">
//           {/* Small line */}
//           <span className="block overflow-hidden px-[0.1em] pb-[0.15em]">
//             <span
//               data-line
//               className="block text-[7.5vw] font-[600] md:text-[length:min(6.5vw,11vh)] tracking-tight text-[#2b2b2bd9]"
//             >
//               Every idea, eventually,
//             </span>
//           </span>

//           {/* Huge line: stacked on mobile, single line from md up */}
//           <span className="block overflow-hidden px-[0.05em] pb-[0.08em]">
//             <span
//               data-line
//               className="block text-[19vw] leading-[0.88] font-[600] md:text-[length:min(13vw,23vh)] md:whitespace-nowrap"
//             >
//               Compiled.
//               <br className="md:hidden" />{" "}
//               Alive.
//             </span>
//           </span>
//         </h2>

//         <p className="mt-[5vh] max-w-[34ch] text-center text-[clamp(0.95rem,1.1vw,1.6rem)] leading-snug tracking-[-0.01em] opacity-80 font-teka font-[400] text-[#2b2b2bd9]">
//           Some became models. Some became tools. All of them started as a question.
//         </p>
//       </div>
//     </section>
//   );
// }























import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Beige used after the scroll colour switch
const BEIGE_FULL = "#F5F0E8";               // big "Compiled. Alive."
const BEIGE_SOFT = "rgba(245,240,232,0.6)"; // small line + sentence (lower opacity)

export default function Statement() {
  const root = useRef(null);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia(root);

    const wrap = root.current.closest("[data-pin-wrap]") || root.current;

    // Everything below only runs if the user has NOT asked for reduced motion.
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // 1. Entrance: masked line reveal (the two headline lines only)
      gsap.from("[data-line]", {
        yPercent: 115,
        duration: 1.3,
        ease: "expo.out",
        stagger: 0.14,
        scrollTrigger: { trigger: root.current, start: "top 65%", once: true },
      });

      // Colour change finishes early (10%)
      const colorExit = {
        trigger: wrap,
        start: "top top",
        end: "top top-=10%",
        scrub: true,
      };

      // Scale keeps going much longer (45%)
      const scaleExit = {
        trigger: wrap,
        start: "top top",
        end: "top top-=45%",
        scrub: true,
      };

      // 2. Exit: headline + sentence keep receding for 45%
      gsap.to("[data-head]", {
        scale: 0.85,
        yPercent: -6,
        ease: "none",
        scrollTrigger: { ...scaleExit },
      });

      // 3a. Background + big text ("Compiled. Alive.") -> full beige
      gsap.to(root.current, {
        backgroundColor: "#1e1e1e",
        color: BEIGE_FULL,
        ease: "none",
        scrollTrigger: { ...colorExit },
      });

      // 3b. Small line + sentence -> softer, lower-opacity beige
      gsap.to("[data-soft]", {
        color: BEIGE_SOFT,
        ease: "none",
        scrollTrigger: { ...colorExit },
      });
    });

    // Custom fonts change layout height -> recalc trigger positions once loaded
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-[#F5F0E8] px-[5vw] text-[#121212] font-oswald "
    >
      <div data-head className="flex w-full origin-center flex-col items-center">
        <h2 className="text-center font-black uppercase leading-[0.9] tracking-[-0.045em]">
          {/* Small line */}
          <span className="block overflow-hidden px-[0.1em] pb-[0.15em]">
            <span
              data-line
              data-soft
              className="block text-[7.5vw] font-[600] md:text-[length:min(6.5vw,11vh)] tracking-tight"
            >
              Every idea, eventually,
            </span>
          </span>

          {/* Huge line: stacked on mobile, single line from md up */}
          <span className="block overflow-hidden px-[0.05em] pb-[0.08em]">
            <span
              data-line
              className="block text-[19vw] leading-[0.88] font-[600] md:text-[length:min(13vw,23vh)] md:whitespace-nowrap"
            >
              Compiled.
              <br className="md:hidden" />{" "}
              Alive.
            </span>
          </span>
        </h2>

        <p
          data-soft
          className="mt-[5vh] max-w-[34ch] text-center text-[clamp(0.95rem,1.1vw,1.6rem)] leading-snug tracking-[-0.01em] font-teka font-[400]"
        >
          Some became models. Some became tools. All of them started as a question.
        </p>
      </div>
    </section>
  );
}