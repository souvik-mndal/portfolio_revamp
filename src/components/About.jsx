import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
// import flareHeadshot from "../assets/images/headshotflare.webp"; // adjust path if your images live elsewhere

gsap.registerPlugin(ScrollTrigger);

const LETTERS = ["H", "E", "L", "L", "O", "O", "O", "O", "O", "O"];

const TiltCard = ({ cardRef, tiltRef }) => {
  const targetX = useRef(0);
  const targetY = useRef(0);
  const currentX = useRef(0);
  const currentY = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    let isVisible = true;

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      if (!isVisible) return;

      const el = tiltRef.current;
      if (!el) return;

      currentX.current += (targetX.current - currentX.current) * 0.08;
      currentY.current += (targetY.current - currentY.current) * 0.08;

      const shadowX = (currentY.current / 22.5) * -20;
      const shadowY = (currentX.current / 22.5) * 20;

      el.style.transform = `perspective(800px) rotateX(${currentX.current}deg) rotateY(${currentY.current}deg)`;
      el.style.boxShadow = `${shadowX}px ${shadowY}px 40px rgba(0,0,0,0.4)`;
    };

    const handleMouseMove = (e) => {
      // compute center fresh each call — handles resize correctly
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      targetX.current = ((e.clientY - centerY) / centerY) * -22.5;
      targetY.current = ((e.clientX - centerX) / centerX) * 22.5;
    };

    const handleMouseLeave = () => {
      targetX.current = 0;
      targetY.current = 0;
    };

    // pause RAF when card is not in viewport
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    if (tiltRef.current) observer.observe(tiltRef.current);

    rafRef.current = requestAnimationFrame(animate);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave, { passive: true });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      observer.disconnect();
    };
  }, [tiltRef]);

  return (
    <div className="w-[28vw] h-[37.5vw] top-[15%] left-[32.5%] absolute z-[21]">
      <div ref={cardRef} className="w-full h-full">
        <div
          ref={tiltRef}
          className="w-full h-full bg-[#F5F0E8] flex justify-center items-start"
        >
          <div className="w-[86%] h-[75%]" style={{ marginTop: "7.65%" }}>
            <img
              // src={flareHeadshot}
              className="h-full w-full object-cover"
              alt="Souvik Mondal"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default function About() {
  const wrapperRef = useRef(null);
  const bottomRef = useRef(null);
  const lettersRef = useRef([]);
  const cardRef = useRef(null);
  const tiltRef = useRef(null);

  useEffect(() => {
    // gsap.context scopes cleanup to THIS component only.
    // ctx.revert() kills only About's triggers, never the footer/gallery ones.
    const ctx = gsap.context(() => {
      // 1. Beige curtain slides up over the Hero
      gsap.to(bottomRef.current, {
        y: "-45vh",
        ease: "none",
        scrollTrigger: {
          trigger: wrapperRef.current,
          start: "top bottom",
          end: "top 40%",
          scrub: true,
        },
      });

      // 2. HELLOOOOOO letters rise, staggered
      gsap.fromTo(
        lettersRef.current,
        { y: "100%", opacity: 0 },
        {
          y: "0%",
          opacity: 1,
          ease: "power1.out",
          stagger: 0.06,
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top 60%",
            end: "top 30%",
            scrub: 1,
          },
        }
      );

      // 3. Headshot card slides up
      gsap.fromTo(
        cardRef.current,
        { y: "100%", opacity: 0 },
        {
          y: "0%",
          opacity: 1,
          ease: "power1.out",
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top 30%",
            end: "top 25%",
            scrub: 1,
          },
        }
      );
    }, wrapperRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={wrapperRef}
      id="about"
      className="relative h-[105vh] z-10"
    >
      <div ref={bottomRef} className="absolute inset-0 z-0 bg-[#F5F0E8]" />

      <div
        className="relative z-10 h-full bg-[#F5F0E8] text-[#2b2b2be9] flex flex-col justify-between"
        style={{ padding: "0% 2% 2%" }}
      >
        <div className="flex justify-center items-end overflow-hidden">
          <h1
            aria-label="Hello"
            className="text-[40vw] leading-none flex"
            style={{
              fontFamily: "Hardbop-Bold, sans-serif",
              marginTop: "-0.10em",
              marginBottom: "-0.10em",
            }}
          >
            {LETTERS.map((letter, i) => (
              <span
                key={i}
                aria-hidden="true"
                ref={(el) => (lettersRef.current[i] = el)}
                className="inline-block text-[#2b2b2b]"
              >
                {letter}
              </span>
            ))}
          </h1>
        </div>

        <TiltCard cardRef={cardRef} tiltRef={tiltRef} />

        <div
          className="w-full flex justify-between items-center"
          style={{ padding: "0% 3%" }}
        >
          <div className="w-[30%] tracking-normal font-teka text-[1.15vw] font-[400] leading-[1.4]">
            <h2>
              Hi, I'm Souvik. I build things that live on the internet — from
              creative frontends to browser extensions and ML experiments.
            </h2>
          </div>
          <div className="w-[35%] tracking-normal font-teka text-[1.15vw] font-[400] leading-[1.4]">
            <h2>
              I create modern, interactive websites with a focus on performance
              and user experience. Along the way, I build Chrome extensions,
              explore machine learning, and dive into cybersecurity to better
              understand how systems really work.
              <br />
              <br />
              I'm here to learn, build, and create things that stand out.
            </h2>
            <br />
            <div className="group w-fit">
              <h2
                className="relative cursor-pointer h-fit w-fit font-oswald font-[700] text-[1.8vw] text-[#2b2b2bbc] tracking-tighter
                  hover:text-[#2b2b2be9] transition-colors duration-300
                  after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-0
                  after:h-[.2vw] after:bg-[#FF5A1F] after:transition-all after:duration-500
                  after:w-0 hover:after:w-full"
              >
                MORE ABOUT ME
              </h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}