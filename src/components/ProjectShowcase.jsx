import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const projects = [
  {
    id: "shonen-jum-maga-campus",
    number: "10 / 30",
    client: "SHUEISHA /\nKODANSHA",
    type: "Websites",
    agency: "PARTY",
    releaseDate: "April 2019",
    titleLines: ["SHONEN", "JUM-MAGA", "CAMPUS"],
  },
  {
    id: "the-name-of-japans-new-era",
    number: "11 / 30",
    client: "Twitter",
    type: "Websites",
    agency: "DENTSU",
    releaseDate: "March 2019",
    titleLines: ["THE NAME", "OF JAPAN’S", "NEW ERA"],
  },
];

export default function ProjectShowcase() {
  const [selectedProject, setSelectedProject] = useState(null);
  
  const outerContainerRef = useRef(null);
  const pinContainerRef = useRef(null);
  const sliderRef = useRef(null);

  const currentIndexRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const scrollForceRef = useRef(0);
  const resetTimerRef = useRef(null);

  // FORCE THRESHOLD: Amount of scroll delta needed to trigger a slide change
  const FORCE_THRESHOLD = 140;

  useEffect(() => {
    const outerElem = outerContainerRef.current;
    const pinElem = pinContainerRef.current;
    const sliderElem = sliderRef.current;

    if (!outerElem || !pinElem || !sliderElem) return;

    // 1. GSAP ScrollTrigger setup to pin the outer container strictly at top: 0
    const trigger = ScrollTrigger.create({
      trigger: outerElem,
      pin: pinElem,
      start: "top top",
      end: () => `+=${projects.length * 100}%`,
      pinSpacing: true,
      anticipatePin: 1,
    });

    // Helper to animate slides using GSAP
    const goToSlide = (index) => {
      isAnimatingRef.current = true;
      currentIndexRef.current = index;

      gsap.to(sliderElem, {
        y: `-${index * 100}vh`,
        duration: 0.8,
        ease: "power3.inOut",
        onComplete: () => {
          isAnimatingRef.current = false;
        },
      });
    };

    // 2. Wheel event handler for the threshold force
    const handleWheel = (e) => {
      if (selectedProject) return;

      // Check if current scroll position is within the GSAP pinned region
      const isPinned = trigger.isActive;
      if (!isPinned) return;

      const delta = e.deltaY;
      const isAtLast = currentIndexRef.current === projects.length - 1;
      const isAtFirst = currentIndexRef.current === 0;

      // If at boundaries and scrolling outwards, unblock wheel so page continues scrolling
      if ((isAtLast && delta > 0) || (isAtFirst && delta < 0)) {
        return;
      }

      // Intercept scroll event to calculate force
      e.preventDefault();

      if (isAnimatingRef.current) return;

      // Accumulate scroll force
      scrollForceRef.current += delta;

      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        scrollForceRef.current = 0;
      }, 200);

      // Check force thresholds
      if (scrollForceRef.current >= FORCE_THRESHOLD) {
        scrollForceRef.current = 0;
        if (currentIndexRef.current < projects.length - 1) {
          goToSlide(currentIndexRef.current + 1);
        }
      } else if (scrollForceRef.current <= -FORCE_THRESHOLD) {
        scrollForceRef.current = 0;
        if (currentIndexRef.current > 0) {
          goToSlide(currentIndexRef.current - 1);
        }
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      trigger.kill();
      clearTimeout(resetTimerRef.current);
    };
  }, [selectedProject]);

  return (
    <div className="w-full bg-black text-white font-sans selection:bg-white selection:text-black">
      {/* Top Left Indicator Logo */}
      <div className="fixed top-8 left-8 z-50 pointer-events-none">
        <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
      </div>

      {/* 1. GSAP PINNING OUTER CONTAINER */}
      <div ref={outerContainerRef} className="relative w-full">
        {/* 2. GSAP PINNED ELEMENT */}
        <div 
          ref={pinContainerRef} 
          className="w-screen h-screen overflow-hidden bg-black select-none"
        >
          {/* 3. SLIDER TRACK ANIMATED BY GSAP */}
          <div ref={sliderRef} className="w-full h-full">
            {projects.map((project) => (
              <section
                key={project.id}
                className="w-screen h-screen flex items-center justify-between px-10 md:px-20 lg:px-28 relative bg-black shrink-0"
              >
                {/* Left Metadata Panel */}
                <div className="pl-6 border-l border-neutral-700/60 max-w-[280px] z-20 flex flex-col justify-center">
                  <div className="text-[12px] tracking-[0.22em] font-mono text-neutral-300 uppercase mb-8">
                    WORKS <span className="ml-2 font-sans font-bold text-white">{project.number}</span>
                  </div>

                  <div className="space-y-5 text-[10px] tracking-[0.18em] uppercase">
                    <div>
                      <p className="text-neutral-500 font-medium mb-1">CLIENT</p>
                      <p className="text-white font-bold text-[14px] leading-tight tracking-tight whitespace-pre-line">
                        {project.client}
                      </p>
                    </div>

                    <div>
                      <p className="text-neutral-500 font-medium mb-1">TYPE</p>
                      <p className="text-white font-normal text-[11px] tracking-tight">{project.type}</p>
                    </div>

                    <div>
                      <p className="text-neutral-500 font-medium mb-1">AGENCY</p>
                      <p className="text-white font-normal text-[11px] tracking-tight">{project.agency}</p>
                    </div>

                    <div>
                      <p className="text-neutral-500 font-medium mb-1">RELEASE DATE</p>
                      <p className="text-white font-normal text-[11px] tracking-tight">{project.releaseDate}</p>
                    </div>
                  </div>

                  <p className="text-[10px] text-neutral-500 leading-normal normal-case mt-10 font-normal">
                    To see more of this work,<br />
                    press the typography to the right.
                  </p>
                </div>

                {/* Right Large Stretched Typography */}
                <div
                  onClick={() => setSelectedProject(project)}
                  className="flex-1 flex justify-end items-center pl-10 cursor-pointer group z-10"
                >
                  <h1 className="font-bebas text-right uppercase text-white leading-[0.76] tracking-tight transition-opacity duration-200 group-hover:opacity-85">
                    {project.titleLines.map((line, idx) => (
                      <span
                        key={idx}
                        className="block text-[clamp(5rem,12.5vw,15rem)] font-normal origin-right transform scale-y-[1.42] scale-x-[0.84]"
                      >
                        {line}
                      </span>
                    ))}
                  </h1>
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      {/* NEXT OUTSIDE SECTION */}
      <section className="w-screen h-screen bg-neutral-950 flex items-center justify-center border-t border-neutral-800">
        <div className="text-center">
          <h2 className="text-3xl font-bold uppercase tracking-widest text-neutral-400">
            Next Section Outside Showcase
          </h2>
          <p className="text-sm text-neutral-600 mt-2 font-mono">
            Unpins automatically after GSAP finishes pinning.
          </p>
        </div>
      </section>

      {/* Detail Overlay Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-10 md:p-20 animate-in fade-in duration-200">
          <div className="flex justify-between items-start border-b border-neutral-800 pb-6">
            <div>
              <span className="text-xs text-neutral-500 font-mono tracking-widest uppercase">
                PROJECT SHOWCASE
              </span>
              <h2 className="text-3xl font-bold mt-2">
                {selectedProject.titleLines.join(' ')}
              </h2>
            </div>
            <button
              onClick={() => setSelectedProject(null)}
              className="text-xs font-mono tracking-widest text-neutral-400 hover:text-white uppercase border border-neutral-700 hover:border-white px-5 py-2.5 transition-colors"
            >
              Close [ESC]
            </button>
          </div>

          <div className="max-w-xl my-auto space-y-4">
            <p className="text-neutral-400 text-sm md:text-base leading-relaxed">
              Detailed case study view for{' '}
              <span className="text-white font-semibold">
                {selectedProject.titleLines.join(' ')}
              </span>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}