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
 * GSAP is only used here to drive the brightness/saturation ramp
 * (dim -> full color) as the footer becomes visible.
 */
export default function Footer() {
  const footerRef = useRef(null);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const ctx = gsap.context(() => {
      footer.style.filter = "brightness(0.35) saturate(0.15)";

      ScrollTrigger.create({
        trigger: footer,
        start: "top bottom", // footer's top edge enters the viewport
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress;
          const rampEnd = 0.6; // full color reached at 60% revealed
          const t = Math.min(p / rampEnd, 1);
          const eased = gsap.parseEase("power2.out")(t);

          const brightness = gsap.utils.interpolate(0.35, 1, eased);
          const saturate = gsap.utils.interpolate(0.15, 1, eased);

          footer.style.filter = `brightness(${brightness}) saturate(${saturate})`;
        },
      });
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
    //       <a
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
      className="sticky bottom-0 z-0 overflow-hidden bg-[#f5f5dc] text-[#121212] font-teka flex flex-col"
      style={{ willChange: "filter" }}
    >
      {/* Top content block — normal flow */}
      <div className="flex flex-col gap-[4vw] lg:gap-[2vw] px-[2vw] pt-[8vw] lg:pt-[2vw] pb-[2vw]">
        <div className="">
          <p className="text-[4vw] text-[#8a8a85] tracking-tight font-normal leading-none">
            Crafting visuals. Shaping stories.
          </p>
          <p className="text-[4vw] text-[#121212] tracking-tight leading-none">
            Let&apos;s create great work together!
          </p>
        </div>

        <div className="flex flex-col items-start sm:flex-col sm:items-start lg:flex-row lg:items-center lg:justify-between w-full gap-[3vw] sm:gap-[3vw] lg:gap-0">
          <a
            href="mailto:souvkmndal@gmail.com"
            className="text-[2.25vw] underline underline-offset-[.5vw] decoration-[.02vw] hover:opacity-70 transition-opacity text-left leading-none self-start"
          >
            souvkmndal@gmail.com
          </a>

          <div className="flex flex-col text-[1.75vw] text-left self-start sm:self-end lg:self-auto">
            {["Linkedin", "Instagram", "Twitter"].map((social, index) => (
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

      {/* Marquee — now the last child, mt-auto pushes it flush to the bottom */}
      <div className="mt-auto w-full overflow-x-hidden overflow-y-hidden">
        <div className="flex w-max animate-marquee whitespace-nowrap">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="flex items-center shrink-0"
              aria-hidden={i === 1}
            >
              {[...Array(4)].map((_, j) => (
                <span
                  key={j}
                  className="text-[16vw] sm:text-[20vw] lg:text-[30vw] font-[400] tracking-tighter leading-none 2xl:mr-[10vw] select-none translate-y-[6%]"
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
