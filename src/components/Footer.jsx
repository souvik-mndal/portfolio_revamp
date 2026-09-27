// import { useEffect, useRef } from "react";
// import gsap from "gsap";
// import { ScrollTrigger } from "gsap/ScrollTrigger";

// gsap.registerPlugin(ScrollTrigger);

// /**
//  * Sticky footer. Sits as the LAST element in the page, pinned to the
//  * bottom of the viewport once you scroll far enough — the browser's
//  * native `position: sticky` does the "reveal" for us, no manual
//  * transform math needed.
//  *
//  * GSAP is only used here to drive the brightness/saturation ramp
//  * (dim -> full color) as the footer becomes visible.
//  */
// export default function Footer() {
//   const footerRef = useRef(null);
//   const marqueeWrapperRef = useRef(null);

//   useEffect(() => {
//     const footer = footerRef.current;
//     if (!footer) return;

//     const ctx = gsap.context(() => {
//       footer.style.filter = "brightness(0.35) saturate(0.15)";

//       ScrollTrigger.create({
//         trigger: footer,
//         start: "top bottom",
//         end: "bottom top",
//         scrub: true,
//         // markers: true,
//         onUpdate: (self) => {
//           const p = self.progress; // 0 -> 1 as footer becomes visible

//           const rampEnd = 0.75; // full color/no-red only once 75% revealed
//           const t = Math.min(p / rampEnd, 1);
//           const eased = gsap.parseEase("power2.out")(t);

//           const brightness = gsap.utils.interpolate(0.35, 1, eased);
//           const saturate = gsap.utils.interpolate(0.15, 1, eased);

//           footer.style.filter = `brightness(${brightness}) saturate(${saturate})`;

//           // Marquee: starts below its resting spot at 0% visible,
//           // slides up into place by the time footer is 70% visible.
//           if (marqueeWrapperRef.current) {
//             const marqueeRampEnd = 0.7;
//             const mt = Math.min(p / marqueeRampEnd, 1);
//             const marqueeEased = gsap.parseEase("power2.out")(mt);

//             const startOffsetVh = 40; // how far below resting position it starts — tweak this
//             const yOffset = gsap.utils.interpolate(
//               startOffsetVh,
//               0,
//               marqueeEased,
//             );

//             marqueeWrapperRef.current.style.transform = `translateY(${yOffset}vh)`;
//           }
//         },
//       });
//     });

//     return () => ctx.revert();
//   }, []);

//   return (
//     // <footer
//     //   ref={footerRef}
//     //   id="site-footer"
//     //   className="sticky bottom-0 z-0 h-[80vh] overflow-hidden bg-[#f5f5dc] text-[#121212] flex flex-col justify-between"
//     //   style={{ willChange: "filter" }}
//     // >
//     //   <div className="flex-1 flex items-center px-8 md:px-16">
//     //     <div className="max-w-3xl">
//     //       <p className="uppercase tracking-wide text-sm mb-6">
//     //         Let's build something
//     //       </p>
//     //       <h2 className="text-4xl md:text-6xl leading-tight font-serif italic mb-8">
//     //         Got a project in mind?
//     //         <br />
//     //         We'd love to hear about it.
//     //       </h2>
//     //
//     //         href="#"
//     //         className="inline-flex items-center justify-center w-32 h-32 rounded-full border border-white/70 text-sm tracking-wide  transition-colors duration-300"
//     //       >
//     //         [ Let's talk ]
//     //       </a>
//     //     </div>
//     //   </div>

//     //   <div className="select-none overflow-hidden leading-none">
//     //     <div className="whitespace-nowrap font-black text-[18vw] md:text-[14vw] tracking-tight -mb-4">
//     //       NEUTOMNI
//     //     </div>
//     //   </div>

//     //   <div className="flex justify-between items-center px-8 md:px-16 py-6 text-xs border-t border-white/10">
//     //     <span>&copy; 2026 Neutomni</span>
//     //     <span>Kolkata · Remote</span>
//     //   </div>
//     // </footer>
//     <footer
//       ref={footerRef}
//       id="site-footer"
//       className="sticky h-[100vh] bottom-0 z-0 overflow-hidden bg-[#f5f5dc] text-[#121212] font-teka flex flex-col"
//       style={{ willChange: "filter" }}
//     >

//       {/* MIDDLE SECTION — 3 columns on desktop */}
//       <div className="w-full px-[2vw] grid grid-cols-1 lg:grid-cols-3 gap-[4vw] lg:gap-[2vw] pt-[3vh]">
//         {/* Column 1 — heading text */}
//         <div className="flex flex-col justify-center">
//           <p className="text-[6vw] sm:text-[5vw] lg:text-[3vw] leading-none tracking-tight">
//             <span className=" text-[#8a8a85]">Let&apos;s explore</span>
//             <br />
//             <span className=" text-[#121212]">what&apos;s next</span>
//           </p>
//         </div>

//         {/* Column 2 — email */}
//         <div className="flex items-start lg:items-center">
//           <a
//             href="mailto:souvkmndal@gmail.com"
//             className="text-[4vw] sm:text-[3vw] lg:text-[2vw] underline underline-offset-[.5vw] decoration-[.02vw] hover:text-[#8a8a85] transition-colors leading-none"
//           >
//             souvkmndal@gmail.com
//           </a>
//         </div>

//         {/* Column 3 — socials with tumble hover effect */}
//         <div className="flex items-start lg:items-center lg:justify-end">
//           <div className="flex flex-col text-[3vw] sm:text-[2vw] lg:text-[1.4vw] text-left">
//             {["Linkedin", "Github", "Twitter"].map((social, index) => (
//               <div
//                 key={index}
//                 className="group overflow-hidden cursor-pointer font-oswald"
//               >
//                 <a href="#" className="relative inline-flex">
//                   {social.split("").map((letter, i) => (
//                     <span
//                       key={i}
//                       className="relative inline-block overflow-hidden"
//                     >
//                       <span
//                         className="block transition-transform duration-500 group-hover:-translate-y-full"
//                         style={{ transitionDelay: `${i * 50}ms` }}
//                       >
//                         {letter}
//                       </span>
//                       <span
//                         className="block absolute left-0 top-full transition-transform duration-500 group-hover:-translate-y-full"
//                         style={{ transitionDelay: `${i * 50}ms` }}
//                       >
//                         {letter}
//                       </span>
//                     </span>
//                   ))}
//                 </a>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>

//       <div className="absolute bottom-[30vh] left-0 w-full px-[2vw] h-[50vh] bg-red-400 z-[0]">
//         <h2>dgdf</h2>
//       </div>

//       {/* Marquee — still in normal flow, sits at its natural resting spot,
//       layered ABOVE the red section wherever they visually overlap */}
//       <div
//         ref={marqueeWrapperRef}
//         className="mt-auto w-full overflow-x-hidden overflow-y-hidden h-[25vw] z-[10] relative border border-black"
//       >
//         <div className="flex w-max animate-marquee whitespace-nowrap ">
//           {[...Array(2)].map((_, i) => (
//             <div
//               key={i}
//               className="flex items-center shrink-0"
//               aria-hidden={i === 1}
//             >
//               {[...Array(4)].map((_, j) => (
//                 <span
//                   key={j}
//                   className="text-[260px] sm:text-[325px] lg:text-[30vw] font-[400] tracking-tighter leading-none mr-[12.5vw] 2xl:mr-[10vw] select-none"
//                 >
//                   Get in touch
//                 </span>
//               ))}
//             </div>
//           ))}
//         </div>
//       </div>
//     </footer>
//   );
// }





































import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Sticky footer. Sits as the LAST element in the page, pinned to the
 * bottom of the viewport once you scroll far enough — the browser's
 * native `position: sticky` does the "reveal" for us, no manual
 * transform math needed.
 *
 * GSAP drives:
 * 1. The brightness/saturation ramp (dim -> full color) as the footer becomes visible.
 * 2. The marquee sliding up into its resting position.
 * 3. A typewriter-style clip-path reveal for heading -> email -> socials.
 */
export default function Footer() {
  const footerRef = useRef(null);
  const marqueeWrapperRef = useRef(null);
  const headingLine1Ref = useRef(null);
  const headingLine2Ref = useRef(null);
  const emailRef = useRef(null);
  const socialsRef = useRef(null);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const ctx = gsap.context(() => {
      footer.style.filter = "brightness(0.35) saturate(0.15)";

      // Brightness/saturation + marquee slide-up, driven by footer visibility
      ScrollTrigger.create({
        trigger: footer,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
        // markers: true,
        onUpdate: (self) => {
          const p = self.progress; // 0 -> 1 as footer becomes visible

          const rampEnd = 0.75; // full color/no-red only once 75% revealed
          const t = Math.min(p / rampEnd, 1);
          const eased = gsap.parseEase("power2.out")(t);

          const brightness = gsap.utils.interpolate(0.35, 1, eased);
          const saturate = gsap.utils.interpolate(0.15, 1, eased);

          footer.style.filter = `brightness(${brightness}) saturate(${saturate})`;

          // Marquee: starts below its resting spot at 0% visible,
          // slides up into place by the time footer is 70% visible.
          if (marqueeWrapperRef.current) {
            const marqueeRampEnd = 0.7;
            const mt = Math.min(p / marqueeRampEnd, 1);
            const marqueeEased = gsap.parseEase("power2.out")(mt);

            const startOffsetVh = 40;
            const yOffset = gsap.utils.interpolate(
              startOffsetVh,
              0,
              marqueeEased,
            );

            marqueeWrapperRef.current.style.transform = `translateY(${yOffset}vh)`;
          }
        },
      });

      // Typewriter reveal: heading line 1 -> line 2 -> email -> socials
      const revealTl = gsap.timeline({
        scrollTrigger: {
          trigger: footer,
          start: "top 20%",
          end: "top 0%",
          scrub: true,
          // markers: true,
        },
      });

      revealTl
        .fromTo(
          headingLine1Ref.current,
          { clipPath: "inset(0 100% 0 0)" },
          { clipPath: "inset(0 0% 0 0)", ease: "none" },
        )
        .fromTo(
          headingLine2Ref.current,
          { clipPath: "inset(0 100% 0 0)" },
          { clipPath: "inset(0 0% 0 0)", ease: "none" },
          "+=0.1",
        )
        .fromTo(
          emailRef.current,
          { clipPath: "inset(0 100% 0 0)" },
          { clipPath: "inset(0 0% 0 0)", ease: "none" },
          "+=0.1",
        )
        .fromTo(
          socialsRef.current,
          { clipPath: "inset(0 100% 0 0)" },
          { clipPath: "inset(0 0% 0 0)", ease: "none" },
          "+=0.1",
        );
    });

    return () => ctx.revert();
  }, []);

  return (
    // <footer
    //   ref={footerRef}
    //   id="site-footer"
    //   className="sticky bottom-0 z-0 h-[80vh] overflow-hidden bg-[#f5f5dc] text-[#121212] flex flex-col justify-between"
    //   style={{ willChange: "filter" }}
    // >
    //   <div className="flex-1 flex items-center px-8 md:px-16">
    //     <div className="max-w-3xl">
    //       <p className="uppercase tracking-wide text-sm mb-6">
    //         Let's build something
    //       </p>
    //       <h2 className="text-4xl md:text-6xl leading-tight font-serif italic mb-8">
    //         Got a project in mind?
    //         <br />
    //         We'd love to hear about it.
    //       </h2>
    //
    //         href="#"
    //         className="inline-flex items-center justify-center w-32 h-32 rounded-full border border-white/70 text-sm tracking-wide  transition-colors duration-300"
    //       >
    //         [ Let's talk ]
    //       </a>
    //     </div>
    //   </div>

    //   <div className="select-none overflow-hidden leading-none">
    //     <div className="whitespace-nowrap font-black text-[18vw] md:text-[14vw] tracking-tight -mb-4">
    //       NEUTOMNI
    //     </div>
    //   </div>

    //   <div className="flex justify-between items-center px-8 md:px-16 py-6 text-xs border-t border-white/10">
    //     <span>&copy; 2026 Neutomni</span>
    //     <span>Kolkata · Remote</span>
    //   </div>
    // </footer>
    <footer
      ref={footerRef}
      id="site-footer"
      className="h-[100vh] sticky bottom-0 z-0 overflow-hidden bg-[#f5f5dc] text-[#121212] font-teka flex flex-col"
      style={{ willChange: "filter" }}
    >
      {/* MIDDLE SECTION — 3 columns on desktop */}
      <div className="w-full px-[2vw] grid grid-cols-1 lg:grid-cols-3 gap-[4vw] lg:gap-[2vw] pt-[3vh]">
        {/* Column 1 — heading text */}
        <div className="flex flex-col justify-center">
          <p className="text-[6vw] sm:text-[5vw] lg:text-[3vw] tracking-tight leading-none">
            <span
              ref={headingLine1Ref}
              className="text-[#8a8a85] block overflow-hidden whitespace-nowrap"
              style={{ clipPath: "inset(0 100% 0 0)" }}
            >
              Let&apos;s explore
            </span>
            <span
              ref={headingLine2Ref}
              className="text-[#121212] block overflow-hidden whitespace-nowrap"
              style={{ clipPath: "inset(0 100% 0 0)" }}
            >
              what&apos;s next
            </span>
          </p>
        </div>

        {/* Column 2 — email */}
        <div className="flex items-start lg:items-center overflow-hidden">
          <a
            ref={emailRef}
            href="mailto:souvkmndal@gmail.com"
            className="text-[4vw] sm:text-[3vw] lg:text-[2vw] underline underline-offset-[.5vw] decoration-[.02vw] hover:text-[#8a8a85] transition-colors leading-none inline-block whitespace-nowrap"
            style={{ clipPath: "inset(0 100% 0 0)" }}
          >
            souvkmndal@gmail.com
          </a>
        </div>

        {/* Column 3 — socials with tumble hover effect */}
        <div className="flex items-start lg:items-center lg:justify-end">
          <div
            ref={socialsRef}
            className="flex flex-col text-[3vw] sm:text-[2vw] lg:text-[1.4vw] text-left overflow-hidden"
            style={{ clipPath: "inset(0 100% 0 0)" }}
          >
            {["Linkedin", "Github", "Twitter"].map((social, index) => (
              <div
                key={index}
                className="group overflow-hidden cursor-pointer font-oswald"
              >
                <a href="#" className="relative inline-flex">
                  {social.split("").map((letter, i) => (
                    <span
                      key={i}
                      className="relative inline-block overflow-hidden"
                    >
                      <span
                        className="block transition-transform duration-500 group-hover:-translate-y-full"
                        style={{ transitionDelay: `${i * 50}ms` }}
                      >
                        {letter}
                      </span>
                      <span
                        className="block absolute left-0 top-full transition-transform duration-500 group-hover:-translate-y-full"
                        style={{ transitionDelay: `${i * 50}ms` }}
                      >
                        {letter}
                      </span>
                    </span>
                  ))}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-[30vh] left-0 w-full px-[2vw] h-[50vh] bg-red-400 z-[0]">
        
      </div>

      {/* Marquee — still in normal flow, sits at its natural resting spot,
      layered ABOVE the red section wherever they visually overlap */}
      <div
        ref={marqueeWrapperRef}
        className="mt-auto w-full overflow-x-hidden overflow-y-hidden h-[25vw] z-[10] relative "
      >
        <div className="flex w-max animate-marquee whitespace-nowrap ">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="flex items-center shrink-0"
              aria-hidden={i === 1}
            >
              {[...Array(4)].map((_, j) => (
                <span
                  key={j}
                  className="text-[260px] sm:text-[325px] lg:text-[30vw] font-[400] tracking-tighter leading-none mr-[12.5vw] 2xl:mr-[10vw] select-none"
                >
                  Get in touch
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}







































