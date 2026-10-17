



// import { useEffect, useRef } from "react";
// import gsap from "gsap";

// export default function ScrollIndicator() {
//   const fillRef  = useRef(null);
//   const trackRef = useRef(null);

//   useEffect(() => {
//     // quickTo — reuses one tween, no new allocation per scroll event
//     const setScaleY = gsap.quickTo(fillRef.current, "scaleY", {
//       duration: 0.3,
//       ease: "power2.out",
//     });

//     const onScroll = () => {
//       const scrollTop = window.scrollY;
//       const docHeight = document.documentElement.scrollHeight - window.innerHeight;
//       setScaleY(scrollTop / docHeight);
//     };

//     window.addEventListener("scroll", onScroll, { passive: true });
//     return () => {
//       window.removeEventListener("scroll", onScroll);
//       gsap.killTweensOf(fillRef.current);
//     };
//   }, []);

//   useEffect(() => {
//     const tween = gsap.fromTo(
//       trackRef.current,
//       { autoAlpha: 0 },
//       { autoAlpha: 1, duration: 0.6, ease: "power2.out" }
//     );
//     return () => tween.kill();
//   }, []);

//   return (
//     <div
//       ref={trackRef}
//       style={{
//         position: "fixed",
//         right: "1.15vw",
//         top: "50%",
//         transform: "translateY(-50%)",
//         height: "20vh",
//         width: ".4vw",
//         backgroundColor: "gray",
//         borderRadius: "999px",
//         zIndex: 9999,
//       }}
//     >
//       <div
//         ref={fillRef}
//         style={{
//           width: "100%",
//           height: "100%",
//           backgroundColor: "var(--accent)",
//           borderRadius: "999px",
//           transformOrigin: "top",
//           transform: "scaleY(0)",
//         }}
//       />
//     </div>
//   );
// }


























import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useLoader } from "./Loader"; // adjust path if needed

// Wrapper: only mounts the indicator once the loader is completely done
export default function ScrollIndicator() {
  const { done } = useLoader();
  return done ? <Indicator /> : null;
}

function Indicator() {
  const fillRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    // quickTo — reuses one tween, no new allocation per scroll event
    const setScaleY = gsap.quickTo(fillRef.current, "scaleY", {
      duration: 0.3,
      ease: "power2.out",
    });

    const onScroll = () => {
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const p = docHeight > 0 ? window.scrollY / docHeight : 0;
      setScaleY(Math.min(1, Math.max(0, p)));
    };

    onScroll(); // sync once on mount
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      gsap.killTweensOf(fillRef.current);
    };
  }, []);

  useEffect(() => {
    const tween = gsap.fromTo(
      trackRef.current,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.6, ease: "power2.out" }
    );
    return () => tween.kill();
  }, []);

  return (
    <div className="overflow-hidden"
      ref={trackRef}
      style={{
        position: "fixed",
        right: "1.15vw",
        top: "50%",
        transform: "translateY(-50%)",
        height: "20vh",
        width: ".4vw",
        backgroundColor: "gray",
        borderRadius: "999px",
        zIndex: 20,
        pointerEvents: "none",
      }}
    >
      <div
        ref={fillRef}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#FF5A1F",
          borderRadius: "999px",
          transformOrigin: "top",
          transform: "scaleY(0)",
        }}
      />
    </div>
  );
}