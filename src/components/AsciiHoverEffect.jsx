import React, { useEffect, useRef } from 'react';

// Character sets
const BASE_CHARS = ['.', '`', ':', '^', '~', '-', ';', '=', '+', '<', '>', '?', '/', '(', ')', '[', ']', '{', '}', '\\', '|'];
const GLITCH_CHARS = ['±', '∏', '§', '≈', '®', '@', '‡', 'µ', '£', '¥', '€', '█', '░', '▒', '▓', '▲', '▼', '◆'];

// Grid Configuration
const COLS = 120;
const ROWS = 45;

// Simple 2D Perlin Noise implementation for jagged/organic edges
class SimpleNoise {
  constructor() {
    this.p = new Uint8Array(512);
    for (let i = 0; i < 256; i++) {
      this.p[i] = this.p[i + 256] = Math.floor(Math.random() * 256);
    }
  }
  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(t, a, b) { return a + t * (b - a); }
  grad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
  noise(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = this.fade(x), v = this.fade(y);
    const A = this.p[X] + Y, B = this.p[X + 1] + Y;
    return this.lerp(v, 
      this.lerp(u, this.grad(this.p[A], x, y), this.grad(this.p[B], x - 1, y)),
      this.lerp(u, this.grad(this.p[A + 1], x, y - 1), this.grad(this.p[B + 1], x - 1, y - 1))
    );
  }
}

export default function AsciiHoverEffect() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const noise = new SimpleNoise();
    const heatMap = new Float32Array(COLS * ROWS);
    const mouse = { x: -100, y: -100, active: false };

    // Initialize static background grid
    const grid = [];
    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        const charIndex = Math.floor(Math.random() * BASE_CHARS.length);
        grid[r][c] = BASE_CHARS[charIndex];
      }
    }

    // Mouse position listeners
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const charWidth = 10.4; // Approximate pixel width of monospace char
      const charHeight = 14;  // Approximate line height in pixels
      
      mouse.x = Math.floor((e.clientX - rect.left) / charWidth);
      mouse.y = Math.floor((e.clientY - rect.top) / charHeight);
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    let animationFrameId;
    let time = 0;

    // Render loop
    const render = () => {
      time += 0.05;
      let htmlOutput = '';

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const idx = r * COLS + c;

          // Decay heat intensity over time
          heatMap[idx] *= 0.88;

          // Inject heat near the cursor using Perlin Noise for jagged boundaries
          if (mouse.active) {
            const dx = c - mouse.x;
            const dy = r - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const n = noise.noise(c * 0.2 + time, r * 0.2 + time) * 3;

            if (dist + n < 6) {
              heatMap[idx] = Math.min(1.0, heatMap[idx] + 0.6);
            }
          }

          const heat = heatMap[idx];

          // Replicate DOM highlight styling match (Inspect panel)
          if (heat > 0.45) {
            const glitchChar = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
            htmlOutput += `<span style="color:#0a0a0a;background:#ff3b14;display:inline-block">${glitchChar}</span>`;
          } else {
            htmlOutput += grid[r][c];
          }
        }
        htmlOutput += '\n';
      }

      container.innerHTML = htmlOutput;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      style={{
        backgroundColor: '#000000',
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        margin: 0,
        padding: '20px',
        boxSizing: 'border-box'
      }}
    >
      <pre
        ref={containerRef}
        style={{
          color: '#ff3b14',
          fontFamily: 'monospace',
          fontSize: '14px',
          lineHeight: '14px',
          letterSpacing: '2px',
          whiteSpace: 'pre',
          cursor: 'crosshair',
          userSelect: 'none',
          margin: 0
        }}
      />
    </div>
  );
}