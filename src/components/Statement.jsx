











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

//       // 2. Exit: headline recedes as the showcase approaches
//       gsap.to("[data-head]", {
//         scale: 0.9,
//         yPercent: -6,
//         ease: "none",
//         scrollTrigger: {
//           // trigger: root.current,
//           // start: "center center",
//           // end: "bottom top",





//           trigger: wrap,
//           start: "top top",
//           end: "bottom bottom",




//           scrub: true,
//         },
//       });
//     });

//     // Custom fonts change layout height -> recalc trigger positions once loaded
//     document.fonts?.ready.then(() => ScrollTrigger.refresh());

//     return () => mm.revert();
//   }, []);

//   return (
//     <section
//       ref={root}
//       className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-[#121212] px-[5vw] text-[#f5f5dc] font-oswald "
//     >
//       <h2
//         data-head
//         className="origin-center text-center font-black uppercase leading-[0.9] tracking-[-0.045em]"
//       >
//         {/* Small line */}
//         <span className="block overflow-hidden px-[0.1em] pb-[0.15em]">
//           <span
//             data-line
//             className="block text-[7.5vw] font-[700] md:text-[length:min(5vw,9.5vh)]"
//           >
//             Every idea, eventually,
//           </span>
//         </span>

//         {/* Huge line: stacked on mobile, single line from md up */}
//         <span className="block overflow-hidden px-[0.05em] pb-[0.08em]">
//           <span
//             data-line
//             className="block text-[19vw] leading-[0.88] font-[650] md:text-[length:min(11vw,21vh)] md:whitespace-nowrap"
//           >
//             Compiled.
//             <br className="md:hidden" />{" "}
//             Alive.
//           </span>
//         </span>
//       </h2>

//       <p className="mt-[5vh] max-w-[34ch] text-center text-[clamp(0.95rem,1vw,1.6rem)] leading-snug tracking-[-0.01em] text-[#f5f5dc]/70 font-teka font-[400]">
//         Some became models. Some became tools. All of them started as a question.
//       </p>
//     </section>
//   );
// }


























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

//       // Shared scrub range so shrink + lightening stay in sync
//       const exit = {
//         trigger: wrap,
//         start: "top top",
//         end: "top top-=45%",
//         scrub: true,
//       };

//       // 2. Exit: headline recedes as the showcase approaches
//       gsap.to("[data-head]", {
//         scale: 0.85,
//         yPercent: -6,
//         ease: "none",
//         scrollTrigger: { ...exit },
//       });

//       // 3. Background lightens while the headline recedes
//       gsap.to(root.current, {
//         backgroundColor: "#1c1c1c",
//         ease: "none",
//         scrollTrigger: { ...exit },
//       });
//     });

//     // Custom fonts change layout height -> recalc trigger positions once loaded
//     document.fonts?.ready.then(() => ScrollTrigger.refresh());

//     return () => mm.revert();
//   }, []);

//   return (
//     <section
//       ref={root}
//       className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-[#121212] px-[5vw] text-[#f5f5dc] font-oswald "
//     >
//       <h2
//         data-head
//         className="origin-center text-center font-black uppercase leading-[0.9] tracking-[-0.045em]"
//       >
//         {/* Small line */}
//         <span className="block overflow-hidden px-[0.1em] pb-[0.15em]">
//           <span
//             data-line
//             className="block text-[7.5vw] font-[700] md:text-[length:min(5vw,9.5vh)]"
//           >
//             Every idea, eventually,
//           </span>
//         </span>

//         {/* Huge line: stacked on mobile, single line from md up */}
//         <span className="block overflow-hidden px-[0.05em] pb-[0.08em]">
//           <span
//             data-line
//             className="block text-[19vw] leading-[0.88] font-[650] md:text-[length:min(11vw,21vh)] md:whitespace-nowrap"
//           >
//             Compiled.
//             <br className="md:hidden" />{" "}
//             Alive.
//           </span>
//         </span>
//       </h2>

//       <p className="mt-[5vh] max-w-[34ch] text-center text-[clamp(0.95rem,1vw,1.6rem)] leading-snug tracking-[-0.01em] text-[#f5f5dc]/70 font-teka font-[400]">
//         Some became models. Some became tools. All of them started as a question.
//       </p>
//     </section>
//   );
// }



























import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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

      // Shared scrub range so shrink + lightening stay in sync
      const exit = {
        trigger: wrap,
        start: "top top",
        end: "top top-=45%",
        scrub: true,
      };

      // 2. Exit: headline + sentence recede as the showcase approaches
      gsap.to("[data-head]", {
        scale: 0.85,
        yPercent: -6,
        ease: "none",
        scrollTrigger: { ...exit },
      });

      // 3. Background lightens while the group recedes
      gsap.to(root.current, {
        backgroundColor: "#1e1e1e",
        ease: "none",
        scrollTrigger: { ...exit },
      });
    });

    // Custom fonts change layout height -> recalc trigger positions once loaded
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-[#121212] px-[5vw] text-[#f5f5dc] font-oswald "
    >
      <div data-head className="flex w-full origin-center flex-col items-center">
        <h2 className="text-center font-black uppercase leading-[0.9] tracking-[-0.045em]">
          {/* Small line */}
          <span className="block overflow-hidden px-[0.1em] pb-[0.15em]">
            <span
              data-line
              className="block text-[7.5vw] font-[700] md:text-[length:min(5vw,9.5vh)]"
            >
              Every idea, eventually,
            </span>
          </span>

          {/* Huge line: stacked on mobile, single line from md up */}
          <span className="block overflow-hidden px-[0.05em] pb-[0.08em]">
            <span
              data-line
              className="block text-[19vw] leading-[0.88] font-[650] md:text-[length:min(11vw,21vh)] md:whitespace-nowrap"
            >
              Compiled.
              <br className="md:hidden" />{" "}
              Alive.
            </span>
          </span>
        </h2>

        <p className="mt-[5vh] max-w-[34ch] text-center text-[clamp(0.95rem,1vw,1.6rem)] leading-snug tracking-[-0.01em] text-[#f5f5dc]/70 font-teka font-[400]">
          Some became models. Some became tools. All of them started as a question.
        </p>
      </div>
    </section>
  );
}