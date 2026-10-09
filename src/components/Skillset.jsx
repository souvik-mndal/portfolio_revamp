// import { useLayoutEffect, useRef } from "react";
// import gsap from "gsap";
// import { ScrollTrigger } from "gsap/ScrollTrigger";

// gsap.registerPlugin(ScrollTrigger);

// // Edit copy here. Rows render from this array.
// const SKILLS = [
//   {
//     title: "Frontend Engineering",
//     desc: "React, Next.js and TypeScript. Component systems, routing and state that stay readable at scale.",
//   },
//   {
//     title: "Motion & Interaction",
//     desc: "GSAP, ScrollTrigger and Lenis. Scroll-driven sequences that run at 60fps without fighting the layout.",
//   },
//   {
//     title: "Styling & Design Systems",
//     desc: "Tailwind, CSS architecture and tokens. Responsive, accessible UI that survives real content.",
//   },
//   {
//     title: "Tooling & Delivery",
//     desc: "Git, Vite, testing and CI. Fast builds, clean deploys and performance budgets that get enforced.",
//   },
// ];

// export default function Skillset() {
//   const root = useRef(null);

//   useLayoutEffect(() => {
//     const mm = gsap.matchMedia();

//     // Respect reduced motion: content stays visible, no animation.
//     mm.add("(prefers-reduced-motion: no-preference)", () => {
//       const ctx = gsap.context(() => {
//         const tl = gsap.timeline({
//           scrollTrigger: { trigger: root.current, start: "top 70%", once: true },
//         });

//         // Heading: masked slide-up
//         tl.from("[data-heading]", {
//           yPercent: 110,
//           duration: 1,
//           ease: "power4.out",
//         });

//         // Dividers draw left -> right (top line + each row's bottom line)
//         tl.from(
//           "[data-line]",
//           {
//             scaleX: 0,
//             transformOrigin: "left center",
//             duration: 1.1,
//             ease: "power3.inOut",
//             stagger: 0.12,
//           },
//           "-=0.6"
//         );

//         // Row content follows its line
//         tl.from(
//           "[data-cell]",
//           {
//             y: 24,
//             opacity: 0,
//             duration: 0.8,
//             ease: "power3.out",
//             stagger: 0.06,
//           },
//           "-=0.9"
//         );
//       }, root);

//       return () => ctx.revert();
//     });

//     return () => mm.revert();
//   }, []);

//   return (
//     <section
//       ref={root}
//       className="bg-[#0e0e0c] px-6 py-24 text-[#efefe9] md:px-10 md:py-40"
//     >
//       <div className="mx-auto w-full max-w-[1200px]">
//         {/* overflow-hidden = mask for the slide-up */}
//         <div className="overflow-hidden pb-2">
//           <h2
//             data-heading
//             className="text-[clamp(3.5rem,9vw,6.25rem)] font-semibold leading-[1] tracking-[-0.03em]"
//           >
//             Skillset
//           </h2>
//         </div>

//         <div className="mt-10 md:mt-12">
//           <div data-line className="h-px w-full bg-white/25" />

//           <ul>
//             {SKILLS.map((s, i) => (
//               <li key={s.title}>
//                 {/* Single grid for every row => no per-row offset drift */}
//                 <div className="grid grid-cols-[2rem_1fr] items-start gap-x-4 gap-y-3 py-8 md:grid-cols-[100px_1fr_38%] md:gap-x-0 md:py-[42px]">
//                   <span
//                     data-cell
//                     className="pt-1.5 text-[13px] tabular-nums text-white/50 md:pt-2.5"
//                   >
//                     {String(i + 1).padStart(2, "0")}
//                   </span>

//                   <h3
//                     data-cell
//                     className="text-[clamp(1.5rem,2.6vw,2rem)] font-semibold leading-tight tracking-[-0.01em]"
//                   >
//                     {s.title}
//                   </h3>

//                   <p
//                     data-cell
//                     className="col-start-2 max-w-[44ch] text-[13px] leading-[1.75] text-white/55 md:col-start-3 md:pt-1.5"
//                   >
//                     {s.desc}
//                   </p>
//                 </div>
//                 <div data-line className="h-px w-full bg-white/25" />
//               </li>
//             ))}
//           </ul>
//         </div>
//       </div>
//     </section>
//   );
// }


























// import { useLayoutEffect, useRef } from "react";
// import gsap from "gsap";
// import { ScrollTrigger } from "gsap/ScrollTrigger";

// gsap.registerPlugin(ScrollTrigger);

// // Replace `img` with your real assets later.
// const SKILLS = [
//   {
//     title: "Frontend Engineering",
//     desc: "React, Next.js and TypeScript. Component systems, routing and state that stay readable at scale.",
//     img: "https://picsum.photos/seed/skill-frontend/720/520",
//   },
//   {
//     title: "Motion & Interaction",
//     desc: "GSAP, ScrollTrigger and Lenis. Scroll-driven sequences that run at 60fps without fighting the layout.",
//     img: "https://picsum.photos/seed/skill-motion/720/520",
//   },
//   {
//     title: "Styling & Design Systems",
//     desc: "Tailwind, CSS architecture and tokens. Responsive, accessible UI that survives real content.",
//     img: "https://picsum.photos/seed/skill-styling/720/520",
//   },
//   {
//     title: "Tooling & Delivery",
//     desc: "Git, Vite, testing and CI. Fast builds, clean deploys and performance budgets that get enforced.",
//     img: "https://picsum.photos/seed/skill-tooling/720/520",
//   },
// ];

// const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// export default function Skillset() {
//   const root = useRef(null);
//   const list = useRef(null);
//   const preview = useRef(null);

//   useLayoutEffect(() => {
//     const mm = gsap.matchMedia();

//     // 1) Heading + top rule: plays ONCE on enter (not scrubbed)
//     // 2) Rows: scrubbed, replay in both directions on every scroll
//     mm.add("(prefers-reduced-motion: no-preference)", () => {
//       const ctx = gsap.context(() => {
//         gsap
//           .timeline({
//             scrollTrigger: { trigger: root.current, start: "top 70%", once: true },
//           })
//           .from("[data-heading]", { yPercent: 110, duration: 1, ease: "power4.out" })
//           .from(
//             "[data-top-line]",
//             { scaleX: 0, transformOrigin: "left center", duration: 1.1, ease: "power3.inOut" },
//             "-=0.6"
//           );

//         gsap.utils.toArray("[data-row]").forEach((row) => {
//           gsap
//             .timeline({
//               scrollTrigger: {
//                 trigger: row,
//                 start: "top 65%",
//                 end: "top 30%",
//                 scrub: 0.8,
//               },
//             })
//             // Content slides in from the right while fading in
//             .from(row.querySelector("[data-slide]"), { xPercent: 28, opacity: 0, ease: "none" })
//             // Divider travels ~3.6x farther, so it trails in from the far right edge
//             .from(row.querySelector("[data-line]"), { xPercent: 100, ease: "none" }, 0);
//         });
//       }, root);
//       return () => ctx.revert();
//     });

//     // Hover preview: desktop / fine pointer only
//     mm.add("(hover: hover) and (pointer: fine)", () => {
//       const box = preview.current;
//       const imgs = box.querySelectorAll("[data-img]");
//       const contents = root.current.querySelectorAll("[data-content]");
//       const rows = root.current.querySelectorAll("[data-row]");

//       gsap.set(box, { xPercent: -50, yPercent: -50, autoAlpha: 0, scale: 0.85 });
//       gsap.set(imgs, { opacity: 0 });

//       const xTo = gsap.quickTo(box, "x", { duration: 0.5, ease: "power3" });
//       const yTo = gsap.quickTo(box, "y", { duration: 0.5, ease: "power3" });
//       const rotTo = gsap.quickTo(box, "rotation", { duration: 0.6, ease: "power3" });

//       let lastX = 0;
//       let settle;

//       const onMove = (e) => {
//         xTo(e.clientX);
//         yTo(e.clientY);
//         // Tilt follows horizontal velocity, then settles back to 0
//         rotTo(clamp((e.clientX - lastX) * 0.6, -14, 14));
//         lastX = e.clientX;
//         clearTimeout(settle);
//         settle = setTimeout(() => rotTo(0), 90);
//       };

//       const onListEnter = (e) => {
//         gsap.set(box, { x: e.clientX, y: e.clientY });
//         lastX = e.clientX;
//         gsap.to(box, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "power3.out", overwrite: "auto" });
//       };

//       const onListLeave = () => {
//         gsap.to(box, { autoAlpha: 0, scale: 0.85, duration: 0.35, ease: "power3.in", overwrite: "auto" });
//         gsap.to(contents, { opacity: 1, duration: 0.4, overwrite: "auto" });
//       };

//       const rowHandlers = [...rows].map((_, i) => {
//         const fn = () => {
//           gsap.to(imgs, { opacity: (n) => (n === i ? 1 : 0), duration: 0.3, overwrite: "auto" });
//           gsap.to(contents, { opacity: (n) => (n === i ? 1 : 0.3), duration: 0.35, overwrite: "auto" });
//         };
//         rows[i].addEventListener("mouseenter", fn);
//         return fn;
//       });

//       const el = list.current;
//       el.addEventListener("mouseenter", onListEnter);
//       el.addEventListener("mouseleave", onListLeave);
//       el.addEventListener("mousemove", onMove);

//       return () => {
//         clearTimeout(settle);
//         el.removeEventListener("mouseenter", onListEnter);
//         el.removeEventListener("mouseleave", onListLeave);
//         el.removeEventListener("mousemove", onMove);
//         rows.forEach((r, i) => r.removeEventListener("mouseenter", rowHandlers[i]));
//         gsap.set([box, ...imgs, ...contents], { clearProps: "all" });
//       };
//     });

//     return () => mm.revert();
//   }, []);

//   return (
//     <section
//       ref={root}
//       className="bg-[#0e0e0c] px-6 py-24 text-[#efefe9] md:px-10 md:py-44"
//     >
//       <div className="mx-auto w-full max-w-[1400px]">
//         <div className="overflow-hidden pb-2">
//           <h2
//             data-heading
//             className="text-[clamp(3.5rem,9vw,7rem)] font-semibold leading-[1] tracking-[-0.03em]"
//           >
//             Skillset
//           </h2>
//         </div>

//         <div className="mt-10 md:mt-14">
//           <div data-top-line className="h-px w-full bg-white/25" />

//           <ul ref={list}>
//             {SKILLS.map((s, i) => (
//               <li key={s.title} data-row className="cursor-default overflow-hidden">
//                 <div data-slide>
//                 <div
//                   data-content
//                   className="grid grid-cols-[2rem_1fr] items-start gap-x-4 gap-y-3 py-10 md:grid-cols-[120px_1fr_36%] md:gap-x-0 md:py-14"
//                 >
//                   <span
//                     className="pt-2 text-[15px] tabular-nums text-white/50 md:pt-3"
//                   >
//                     {String(i + 1).padStart(2, "0")}
//                   </span>

//                   <h3
//                     className="text-[clamp(1.75rem,3.2vw,2.75rem)] font-semibold leading-tight tracking-[-0.015em]"
//                   >
//                     {s.title}
//                   </h3>

//                   <p
//                     className="col-start-2 max-w-[46ch] text-[15px] leading-[1.7] text-white/60 md:col-start-3 md:pt-2"
//                   >
//                     {s.desc}
//                   </p>
//                 </div>
//                 </div>
//                 <div data-line className="h-px w-full bg-white/25" />
//               </li>
//             ))}
//           </ul>
//         </div>
//       </div>

//       {/* Cursor-following preview. Fixed + pointer-events-none so it never blocks hover. */}
//       <div
//         ref={preview}
//         aria-hidden="true"
//         className="pointer-events-none fixed left-0 top-0 z-50 hidden h-[200px] w-[290px] will-change-transform md:block"
//       >
//         {SKILLS.map((s) => (
//           <img
//             key={s.title}
//             data-img
//             src={s.img}
//             alt=""
//             draggable={false}
//             className="absolute inset-0 h-full w-full object-cover"
//           />
//         ))}
//       </div>
//     </section>
//   );
// }





























import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Replace `img` with your real assets later.
const SKILLS = [
  {
    title: "Frontend Engineering",
    desc: "React, Next.js and TypeScript. Component systems, routing and state that stay readable at scale.",
    img: "https://picsum.photos/seed/skill-frontend/720/520",
  },
  {
    title: "Motion & Interaction",
    desc: "GSAP, ScrollTrigger and Lenis. Scroll-driven sequences that run at 60fps without fighting the layout.",
    img: "https://picsum.photos/seed/skill-motion/720/520",
  },
  {
    title: "Styling & Design Systems",
    desc: "Tailwind, CSS architecture and tokens. Responsive, accessible UI that survives real content.",
    img: "https://picsum.photos/seed/skill-styling/720/520",
  },
  {
    title: "Tooling & Delivery",
    desc: "Git, Vite, testing and CI. Fast builds, clean deploys and performance budgets that get enforced.",
    img: "https://picsum.photos/seed/skill-tooling/720/520",
  },
];

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export default function Skillset() {
  const root = useRef(null);
  const list = useRef(null);
  const preview = useRef(null);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();

    // 1) Heading + top rule: plays ONCE on enter (not scrubbed)
    // 2) Rows: scrubbed, replay in both directions on every scroll
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap
          .timeline({
            scrollTrigger: { trigger: root.current, start: "top 70%", once: true },
          })
          .from("[data-heading]", { yPercent: 110, duration: 1, ease: "power4.out" })
          .from(
            "[data-top-line]",
            { scaleX: 0, transformOrigin: "left center", duration: 1.1, ease: "power3.inOut" },
            "-=0.6"
          );

        gsap.utils.toArray("[data-row]").forEach((row) => {
          gsap
            .timeline({
              scrollTrigger: {
                trigger: row,
                start: "top 85%",
                end: "top 80%",
                scrub: 0.8,
              },
            })
            // Content slides in from the right while fading in
            .from(row.querySelector("[data-slide]"), { xPercent: 28, opacity: 0, ease: "none" })
            // Divider travels ~3.6x farther, so it trails in from the far right edge
            .from(row.querySelector("[data-line]"), { xPercent: 100, ease: "none" }, 0);
        });
      }, root);
      return () => ctx.revert();
    });

    // Hover preview: desktop / fine pointer only
    mm.add("(hover: hover) and (pointer: fine)", () => {
      const box = preview.current;
      const imgs = box.querySelectorAll("[data-img]");
      const contents = root.current.querySelectorAll("[data-content]");
      const rows = root.current.querySelectorAll("[data-row]");

      gsap.set(box, { xPercent: -50, yPercent: -50, autoAlpha: 0, scale: 0.85 });
      gsap.set(imgs, { opacity: 0 });

      const xTo = gsap.quickTo(box, "x", { duration: 0.5, ease: "power3" });
      const yTo = gsap.quickTo(box, "y", { duration: 0.5, ease: "power3" });
      const rotTo = gsap.quickTo(box, "rotation", { duration: 0.6, ease: "power3" });

      let lastX = 0;
      let settle;

      const onMove = (e) => {
        xTo(e.clientX);
        yTo(e.clientY);
        // Tilt follows horizontal velocity, then settles back to 0
        rotTo(clamp((e.clientX - lastX) * 0.6, -14, 14));
        lastX = e.clientX;
        clearTimeout(settle);
        settle = setTimeout(() => rotTo(0), 90);
      };

      const onListEnter = (e) => {
        gsap.set(box, { x: e.clientX, y: e.clientY });
        lastX = e.clientX;
        gsap.to(box, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "power3.out", overwrite: "auto" });
      };

      const onListLeave = () => {
        gsap.to(box, { autoAlpha: 0, scale: 0.85, duration: 0.35, ease: "power3.in", overwrite: "auto" });
        gsap.to(contents, { opacity: 1, duration: 0.4, overwrite: "auto" });
      };

      const rowHandlers = [...rows].map((_, i) => {
        const fn = () => {
          gsap.to(imgs, { opacity: (n) => (n === i ? 1 : 0), duration: 0.3, overwrite: "auto" });
          gsap.to(contents, { opacity: (n) => (n === i ? 1 : 0.3), duration: 0.35, overwrite: "auto" });
        };
        rows[i].addEventListener("mouseenter", fn);
        return fn;
      });

      const el = list.current;
      el.addEventListener("mouseenter", onListEnter);
      el.addEventListener("mouseleave", onListLeave);
      el.addEventListener("mousemove", onMove);

      return () => {
        clearTimeout(settle);
        el.removeEventListener("mouseenter", onListEnter);
        el.removeEventListener("mouseleave", onListLeave);
        el.removeEventListener("mousemove", onMove);
        rows.forEach((r, i) => r.removeEventListener("mouseenter", rowHandlers[i]));
        gsap.set([box, ...imgs, ...contents], { clearProps: "all" });
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={root}
      className="bg-[#121212] px-6 py-24 text-[#f5f5dc] md:px-10 md:py-44 font-teka"
    >
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="overflow-hidden pb-2">
          <h2
            data-heading
            className="text-[clamp(3.5rem,9vw,7rem)] font-[600] leading-[1] tracking-[-0.03em]"
          >
            Skillset
          </h2>
        </div>

        <div className="mt-10 md:mt-14">
          <div data-top-line className="h-px w-full bg-white/25" />

          <ul ref={list}>
            {SKILLS.map((s, i) => (
              <li key={s.title} data-row className="cursor-default overflow-hidden leading-none">
                <div data-slide>
                <div
                  data-content
                                    className="grid grid-cols-[2rem_1fr] items-center gap-x-4 gap-y-3 py-10 md:grid-cols-[120px_1fr_36%] md:gap-x-0 md:py-14"
                >
                  <span
                    className=" text-3xl tabular-nums text-white/50 leading-none font-oswald"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <h3
                    className="text-[clamp(1.75rem,3.2vw,2.75rem)] font-[550] leading-none tracking-[-0.015em]"
                  >
                    {s.title}
                  </h3>

                  <p
                    className="col-start-2 max-w-[46ch] text-[18px] leading-[1.7] text-white/60 md:col-start-3 md:pt-2"
                  >
                    {s.desc}
                  </p>
                </div>
                </div>
                <div data-line className="h-px w-full bg-white/25" />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Cursor-following preview. Fixed + pointer-events-none so it never blocks hover. */}
      <div
        ref={preview}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-50 hidden h-[200px] w-[290px] will-change-transform md:block"
      >
        {SKILLS.map((s) => (
          <img
            key={s.title}
            data-img
            src={s.img}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ))}
      </div>
    </section>
  );
}