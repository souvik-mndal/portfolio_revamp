import React, { useEffect, useRef, useState, useCallback } from "react";
import { socials } from "../assets/constants";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "react-scroll";
import HeroSVGText from "./HeroSVGText";
import AbstractMorphingShader from "./AbstractMorphingShader";
import { Squeeze as Hamburger } from "hamburger-react";
import { useLoader } from "./Loader"; // adjust path if Loader lives elsewhere

gsap.registerPlugin(ScrollToPlugin, ScrollTrigger);

// Debounce helper — avoids resize firing every pixel
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function getIconSize() {
  const vw = window.innerWidth;
  if (vw < 768) return 18;
  if (vw < 1280) return 20;
  if (vw < 1920) return 22;
  return 25;
}

export default function Hero() {
  // "revealed" turns true the moment the red tear fully covers the screen
  const { revealed } = useLoader();

  const navRef = useRef(null);
  const linksRef = useRef([]);
  const contactRef = useRef(null);
  const tl = useRef(null);
  const pageRef = useRef(null);
  const arrowRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [menuActive, setMenuActive] = useState(false);
  const [iconSize, setIconSize] = useState(getIconSize);

  // ── Resize — debounced ─────────────────────────────────────────────────
  useEffect(() => {
    const onResize = debounce(() => setIconSize(getIconSize()), 150);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── Menu timeline ──────────────────────────────────────────────────────
  useGSAP(() => {
    gsap.set(navRef.current, { xPercent: 100 });
    gsap.set([linksRef.current, contactRef.current], { autoAlpha: 0, x: -20 });

    tl.current = gsap.timeline({ paused: true })
      .to(navRef.current, { xPercent: 0, duration: 1, ease: "power3.out" })
      .to(
        linksRef.current,
        { autoAlpha: 1, x: 0, stagger: 0.1, duration: 0.5, ease: "power2.out" },
        "<"
      )
      .to(
        contactRef.current,
        { autoAlpha: 1, x: 0, duration: 0.5, ease: "power2.out" },
        "<+0.2"
      );

    // cleanup: kill timeline on unmount
    return () => tl.current?.kill();
  }, []);

  // ── Arrow bounce (starts when loader reveals the page) ────────────────
  useEffect(() => {
    if (!revealed || !arrowRef.current) return;

    const tween = gsap.to(arrowRef.current, {
      y: 8,
      duration: 1.2,
      ease: "power1.inOut",
      repeat: -1,
      yoyo: true,
    });

    // Pause arrow when Hero scrolls out of view, resume when back
    const st = ScrollTrigger.create({
      trigger: pageRef.current,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => (self.isActive ? tween.play() : tween.pause()),
    });

    return () => {
      tween.kill();
      st.kill();
    };
  }, [revealed]);

  // ── Force scroll to top on mount ──────────────────────────────────────
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────
  // const toggleMenu = useCallback(() => {
    // ── Block page scroll while the pointer is over the side panel ────────
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const stop = (e) => e.preventDefault();
    el.addEventListener("wheel", stop, { passive: false });
    el.addEventListener("touchmove", stop, { passive: false });
    return () => {
      el.removeEventListener("wheel", stop);
      el.removeEventListener("touchmove", stop);
    };
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────
  const toggleMenu = useCallback(() => {
    if (isOpen) {
      tl.current?.reverse();
    } else {
      tl.current?.play();
    }
    setIsOpen((prev) => !prev);
  }, [isOpen]);

  const handleClick = useCallback(() => {
    setMenuActive((prev) => !prev);
    toggleMenu();
  }, [toggleMenu]);

  const handleScroll = useCallback(() => {
    gsap.to(window, {
      duration: 2.1,
      scrollTo: { y: window.innerHeight * 2, autoKill: true },
      ease: "power2.in",
    });
  }, []);

  return (
    <div className="relative">
      <AbstractMorphingShader />
      <div
        id="page1"
        ref={pageRef}
        className="h-[100vh] text-[#2b2b2be9] relative overflow-hidden backdrop-blur-[50px] bg-white/45"
      >
        <div
          className="relative h-[10%] w-full flex items-center"
          style={{ paddingLeft: "2%" }}
        >
          <div className="group flex items-center">
            <div className="h-full" style={{ overflow: "hidden" }}>
              <h2 className="leading-none uppercase text-[1.35vw] font-[450] text-[#2b2b2be9] font-oswald">
                souvik
              </h2>
            </div>
            <div className="bg-[#FF5A1F] w-0 h-0 rounded-full opacity-0 transition-all duration-300 ease-in-out group-hover:opacity-100 group-hover:w-[.55vw] group-hover:h-[.55vw]" />
            <div style={{ overflow: "hidden" }}>
              <h2 className="leading-none uppercase font-[450] text-[1.35vw] font-oswald text-[#2b2b2be9]">
                mondal
              </h2>
            </div>
          </div>
        </div>

        <div
          className="h-[90%] w-[100%] flex flex-col items-center justify-around"
          style={{ padding: "1.5% 2% 0%" }}
        >
          <HeroSVGText isLoaded={revealed} />

          <div className="h-[20%] w-full flex justify-between items-center">
            <div>
              <div style={{ overflow: "hidden" }}>
                <h2 className="text-[#2b2b2bbc] h-fit w-fit text-[2.25vw] tracking-normal leading-none font-oswald font-[450] uppercase">
                  Crafting Interfaces
                </h2>
              </div>
              <div style={{ overflow: "hidden" }}>
                <h2 className="text-[#2b2b2be9] h-fit w-fit text-[4.15vw] tracking-normal leading-none font-oswald font-[500] uppercase">
                  Exploring Intelligence
                </h2>
              </div>
            </div>
            <div>
              <div style={{ overflow: "hidden" }}>
                <h3
                  className="font-teka tracking-normal text-[1.1vw] font-[500] flex items-center gap-[0.1vw] "
                >
                  Discover
                  <i
                    ref={arrowRef}
                    className="ri-arrow-down-long-line font-teka arrow text-[1.5vw]"
                  />
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nav overlay */}
      <div
        ref={navRef} data-lenis-prevent
        className="fixed top-0 z-30 flex flex-col justify-between h-screen w-[40%] left-[60%]  bg-[#242424]"
        style={{ padding: "4vw 2.5vw 2vw" }}
      >
        <div className="flex flex-col text-[6.5vw] leading-none uppercase">
          {["home", "about", "project", "skills", "contact"].map(
            (section, index) => (
              <div
                key={index}
                ref={(el) => (linksRef.current[index] = el)}
                className="group overflow-hidden cursor-pointer font-oswald text-white/25"
              >
                <Link
                  to={section}
                  smooth
                  offset={0}
                  duration={1000}
                  className="relative inline-flex"
                >
                  {section.split("").map((letter, i) => (
                    <span
                      key={i}
                      className="relative inline-block overflow-hidden"
                    >
                      <span
                        className="block transition-transform duration-500 group-hover:-translate-y-full group-hover:text-[#f5f5dc]"
                        style={{ transitionDelay: `${i * 50}ms` }}
                      >
                        {letter}
                      </span>
                      <span
                        className="block absolute left-0 top-full transition-transform duration-500 group-hover:-translate-y-full group-hover:text-[#f5f5dc]"
                        style={{ transitionDelay: `${i * 50}ms` }}
                      >
                        {letter}
                      </span>
                    </span>
                  ))}
                </Link>
              </div>
            )
          )}
        </div>

        <div
          ref={contactRef}
          className="flex justify-between text-white/50 flex-row "
        >
          <div className="font-light flex flex-col">
            <p className="tracking-wide font-normal text-[.9vw] uppercase">E-mail</p>
            <a
              href="mailto:souvkmndal@gmail.com"
              target="_blank"
              rel="noopener noreferrer"
              className="relative inline-block font-teka tracking-widest text-white/50 text-[.9vw] leading-loose
                hover:text-[#f5f5dc] transition-colors duration-300
                after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-0
                after:w-0 after:h-[.15vw] after:bg-[#FF5A1F] after:transition-all after:duration-300
                hover:after:w-full uppercase"
            >
              souvkmndal@gmail.com
            </a>
          </div>
          <div className="font-light">
            <p className="tracking-wide font-normal text-[.9vw] uppercase">
              Social Media
            </p>
            <div className="flex flex-wrap flex-row gap-x-[1vw] text-[.9vw]">
              {socials.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className="relative inline-block leading-loose tracking-widest 
                    hover:text-[#f5f5dc] transition-colors duration-300
                    after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-0
                    after:w-0 after:h-[.15vw] after:bg-[#FF5A1F] after:transition-all after:duration-300
                    hover:after:w-full font-teka uppercase"
                >
                  {social.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hamburger */}
      <div
        className="fixed z-30 right-[2%]"
        style={{ top: "5vh", transform: "translateY(-50%)" }}
      >
        <div
          onClick={handleClick}
          className={`
            flex items-center justify-center
            w-[3.45vw] h-[3.45vw]
            rounded-full cursor-pointer
            transition-colors duration-500 ease-in-out
            ${menuActive ? "bg-[#f5f5dc]" : "bg-[#404040]"}
          `}
        >
          <Hamburger
            toggled={menuActive}
            color={menuActive ? "#121212" : "#f5f5dc"}
            distance="sm"
            rounded
            duration={0.5}
            size={iconSize}
          />
        </div>
      </div>
    </div>
  );
}