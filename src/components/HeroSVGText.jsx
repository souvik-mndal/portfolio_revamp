



import { useRef, useEffect } from "react";
import gsap from "gsap";

const DEFAULT_SCALES = [
  0.80, 0.90, 0.85, 0.75, 0.82, 0.75, 0.85, 0.75, 0.65, 0.78, 0.85, 0.70
];

const MIDDLE_INDICES = [5, 6];

const INTRO_DELAY = .6;

export default function HeroSVGText({ isLoaded }) {
  const svgRef = useRef(null);
  const total  = DEFAULT_SCALES.length;

  useEffect(() => {
    const paths = svgRef.current.querySelectorAll("path");
    gsap.set(paths, { scaleY: 0, transformOrigin: "top" });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const paths = svgRef.current.querySelectorAll("path");
    const tween = gsap.to(paths, {
      scaleY: (i) => DEFAULT_SCALES[i],
      transformOrigin: "top",
      duration: 1.2,
      ease: "power3.out",
      stagger: 0.05,
      delay: INTRO_DELAY,
    });
    return () => tween.kill();
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;

    const paths  = svgRef.current.querySelectorAll("path");
    let currentX = 0.5;
    let targetX  = 0.5;
    let velocity = 0;
    let rafId    = null;
    let isVisible = true;

    const ease             = 0.08;
    const velocityStrength = 0.25;

    const handleMove = (e) => {
      targetX = e.clientX / window.innerWidth;
    };

    const animate = () => {
      rafId = requestAnimationFrame(animate);

      if (!isVisible) return;

      const prevX = currentX;
      currentX += (targetX - currentX) * ease;
      velocity   = currentX - prevX;

      paths.forEach((path, i) => {
        const letterPos      = i / (total - 1);
        const distance       = Math.abs(currentX - letterPos);
        const influence      = Math.max(0, 1 - distance * 1.5);
        const centerDistance = Math.abs(i - (total - 1) / 2);
        const centerFactor   = 0.6 + (centerDistance / (total / 2)) * 0.4;
        const finalInfluence = influence * centerFactor;
        const velocityBoost  = velocity * velocityStrength;
        const stretchFactor  = 1.2;

        let scale = DEFAULT_SCALES[i] + finalInfluence * (stretchFactor - DEFAULT_SCALES[i]);

        if (MIDDLE_INDICES.includes(i)) {
          const base = DEFAULT_SCALES[i];
          scale = Math.max(base - 0.1, Math.min(base + 0.1, scale));
        }

        // exactly as original
        gsap.to(path, {
          scaleY: scale,
          transformOrigin: "top",
          duration: 0.5,
          ease: "none",
        });
      });
    };

    const observer = new IntersectionObserver(
      ([entry]) => { isVisible = entry.isIntersecting; },
      { threshold: 0 }
    );
    observer.observe(svgRef.current);

    // window.addEventListener("mousemove", handleMove, { passive: true });
    // rafId = requestAnimationFrame(animate);
        window.addEventListener("mousemove", handleMove, { passive: true });
    const startTimer = setTimeout(() => {
      rafId = requestAnimationFrame(animate);
    }, INTRO_DELAY * 1000);

    return () => {
      clearTimeout(startTimer);
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(rafId);
      observer.disconnect();
      gsap.killTweensOf(Array.from(paths));
    };
  }, [total, isLoaded]);

  return (
    <svg ref={svgRef} viewBox="0 0 922 340" className="" style={{ width: "100%", height: "80%" }}>
      <path d="M39.2 280C13.6 280 0 266.778 0 242.278V38.1111C0 13.2222 13.6 0 39.2 0C65.2 0 78.4 13.2222 77.2 38.1111L74 113.167H43.2L46.8 40.4445C47.2 32.6667 44.4 28.3889 39.2 28.3889C33.6 28.3889 30.8 32.6667 30.8 40.4445V239.944C30.8 247.333 33.6 251.611 39.2 251.611C44 251.611 46.8 247.333 46.8 239.944V158.278H77.2V242.278C77.2 266.778 64 280 39.2 280Z" fill="#2B2B2B" style={{ transformBox: "fill-box" }}/>
      <path d="M87 280V0H125.8C151 0 164.6 13.6 164.6 38.8V92.4C164.6 116.8 153.8 130 133.8 130H131.4V134.4H153.8L168.6 280H138.2L126.2 152.4H118.2V280H87ZM118.2 124.8H125.8C131 124.8 133.8 120.4 133.8 112.8V41.2C133.8 33.2 131 29.2 125.8 29.2H118.2V124.8Z" fill="#2B2B2B" style={{ transformBox: "fill-box" }}/>
      <path d="M177 280V0H241V29.2H207.8V120H237V149.2H207.8V250.8H241V280H177Z" fill="#2B2B2B" style={{ transformBox: "fill-box" }}/>
      <path d="M303.4 280L299.4 185.6H283L279 280H249L261.4 0H321.4L333.8 280H303.4ZM284.6 156.4H298.2L295.4 88.8L294.6 28H288.2L287.4 88.8L284.6 156.4Z" fill="#2B2B2B" style={{ transformBox: "fill-box" }}/>
      <path d="M404.387 0V29.2H385.188V280H354.387V29.2H335.188V0H404.387Z" fill="#2B2B2B" style={{ transformBox: "fill-box" }}/>
      <path d="M413.072 280V0H443.872V280H413.072Z" fill="#2B2B2B" style={{ transformBox: "fill-box" }}/>
      <path d="M466.766 280L453.566 0H483.966L492.366 184.4L493.566 251.2H498.766L499.966 184.4L508.366 0H538.766L525.566 280H466.766Z" fill="#2B2B2B" style={{ transformBox: "fill-box" }}/>
      <path d="M548.228 280V0H612.228V29.2H579.028V120H608.228V149.2H579.028V250.8H612.228V280H548.228Z" fill="#2B2B2B" style={{ transformBox: "fill-box" }}/>
      <path d="M622 36.8V0H654V33.6L640.4 86.8H628.8L634.4 36.8H622Z" fill="#2B2B2B" style={{ transformBox: "fill-box" }}/>
      <path d="M669 280V0H707.8C733 0 746.6 13.6 746.6 38.8V241.6C746.6 266.4 733 280 707.8 280H669ZM699.8 250.8H707.8C713 250.8 715.8 246.8 715.8 239.2V41.2C715.8 33.2 713 29.2 707.8 29.2H699.8V250.8Z" fill="#2B2B2B" style={{ transformBox: "fill-box" }}/>
      <path d="M759 280V0H823V29.2H789.8V120H819V149.2H789.8V250.8H823V280H759Z" fill="#2B2B2B" style={{ transformBox: "fill-box" }}/>
      <path d="M849.2 280L836 0H866.4L874.8 184.4L876 251.2H881.2L882.4 184.4L890.8 0H921.2L908 280H849.2Z" fill="#2B2B2B" style={{ transformBox: "fill-box" }}/>
    </svg>
  );
}