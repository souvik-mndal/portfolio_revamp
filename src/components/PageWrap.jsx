import { useRef } from "react";

/**
 * Wraps ALL normal page content (everything except <Footer />).
 * No manual positioning math here — this is just a normal block in
 * document flow. The reveal illusion comes entirely from Footer's
 * `sticky` behavior (see Footer.jsx): as this block scrolls past,
 * the footer naturally slides into view from underneath.
 */
export default function PageWrap({ children }) {
  const wrapRef = useRef(null);

  return (
    <div ref={wrapRef} className="relative z-10 bg-white">
      {children}
    </div>
  );
}