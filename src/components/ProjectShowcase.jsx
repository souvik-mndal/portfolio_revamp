// "use client";
// /**
//  * ProjectShowcase.jsx  (v6: virtual scroll + continuous magnetic pull)
//  * ---------------------------------------------------------------
//  * Scroll model (same maths as the reference, re-implemented):
//  *
//  *  - The section is a plain 100vh block. When it reaches the top of the page it
//  *    ENGAGES: page scroll is held, and wheel / touch / keys drive a virtual
//  *    position instead.  It RELEASES at the first / last project (on a fresh gesture).
//  *  - every frame:   pos += 0.69 * delta                (input moves you directly)
//  *                   pos += 0.05 * (snapTarget - pos)   (always-on magnetic pull)
//  *    snapTarget = nearest project with a 27% bias in the direction you scroll.
//  *    No idle timer, no threshold animation, no locked transition.
//  *  - delta also feeds the glitch energy:  e += 0.003*(|delta|-1);  e *= 0.92
//  *      e > 0.1 -> scramble + white bars,  e high -> tiles + barrel lens
//  *  - ArrowDown/ArrowUp/PageDown/PageUp/Space = delta 100 -> 1 over 0.5s (about one project)
//  *
//  * Lenis: pass your instance (or ref) as the `lenis` prop so it is held while engaged.
//  * Install:  npm i gsap three     (needs Tailwind CSS)
//  */
// import { useLayoutEffect, useRef } from "react";
// import * as THREE from "three";
// import gsap from "gsap";

// /* ------------------------------------------------------------------ */
// /* Data. client / agency may contain "\n". title line = string or      */
// /* { text, indent, size, lower } (indent/size in em of title size)     */
// /* ------------------------------------------------------------------ */
// const DEFAULT_PROJECTS = [
//   {
//     title: ["TIDAL", "ATLAS"],
//     client: "Northwind",
//     type: "Websites",
//     agency: "Studio Ono",
//     date: "March 2025",
//     href: "#",
//   },
//   {
//     title: ["PAPER", "ORBIT"],
//     client: "Halden\nMuseum",
//     type: "Installations",
//     agency: "In-house",
//     date: "July 2024",
//     href: "#",
//   },
//   {
//     title: ["WORLD", "MAKER", { text: "β version", indent: 0.05, size: 0.88, lower: true }],
//     client: "Kite Games",
//     type: "Websites",
//     agency: "Fieldwork",
//     date: "September 2023",
//     href: "#",
//   },
//   {
//     title: ["LOW", "TIDE"],
//     client: "Meridian Bank",
//     type: "Apps",
//     agency: "Brightside",
//     date: "May 2022",
//     href: "#",
//   },
//   {
//     title: ["KAJIMA", "DX", "LABO"],
//     subtitle: "A birds-eye glimpse of the entire Naruse Dam",
//     client: "Kajima\nCorporation",
//     type: "Websites / XR",
//     agency: "Pylon\nStudio",
//     date: "December 2021",
//     href: "#",
//   },
//   {
//     title: ["AFTER", "IMAGE"],
//     client: "Oku Watches",
//     type: "Websites",
//     agency: "Cherry & Co",
//     date: "August 2020",
//     href: "#",
//   },
// ];

// const DEFAULT_NAV = [
//   { label: "WORKS", href: "#works", active: true },
//   { label: "ABOUT", href: "#about" },
//   { label: "CONTACT", href: "#contact" },
// ];

// const TITLE_FONT = "'Oswald','Arial Narrow',Impact,sans-serif";
// const PANEL_FONT = "'Padauk','Helvetica Neue',Arial,sans-serif";
// const CHARSET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789[]#&%=-";

// /* info panel is drawn on a 512x700 (base units) canvas at O x */
// const O = 2;
// const CW = 512 * O;
// const CH = 700 * O;

// /* layout numbers measured from the reference frames */
// const LAYOUT = {
//   originX: 0.1717, // panel left, fraction of width
//   originY: 0.216, // panel top, fraction of height
//   kH: 0.000757, // panel scale per px of viewport height
//   kW: 0.00044, // panel scale per px of viewport width
//   titleStride: 1.1407, // distance between two titles, in viewport heights
// };

// /* ------------------------------------------------------------------ */
// /* GLSL (one full-screen pass: titles + tiled panel, then the lens)    */
// /* ------------------------------------------------------------------ */
// const VERT = /* glsl */ `
//   void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }
// `;

// const FRAG = /* glsl */ `
//   precision highp float;
//   uniform sampler2D uPanel;
//   uniform sampler2D uTitleA;
//   uniform sampler2D uTitleB;
//   uniform vec2  uRes;          // css px
//   uniform float uDpr;
//   uniform vec2  uOrigin;       // panel top-left, css px
//   uniform vec2  uPanelSize;    // panel size, css px
//   uniform float uPanelPos;     // scroll position in projects (eased)
//   uniform vec2  uTitleSize;
//   uniform float uTitleStride;
//   uniform float uTitleScroll;  // px the title drum has moved
//   uniform float uPow;          // scroll energy
//   uniform float uGlitch;       // hover flicker
//   uniform float uTime;

//   float rnd(vec2 st){ return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453123); }
//   float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
//   float vn(vec2 p){
//     vec2 i = floor(p), f = fract(p);
//     float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
//     vec2 u = f * f * (3.0 - 2.0 * f);
//     return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
//   }
//   float fbm(vec2 p){
//     float v = 0.0, a = 0.5;
//     mat2 r = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
//     for (int i = 0; i < 4; i++){ v += a * vn(p); p = r * p * 2.0 + vec2(100.0); a *= 0.5; }
//     return v;
//   }

//   // Brown-Conrady lens
//   vec2 lens(vec2 uv, float d){
//     uv = uv * 2.0 - 1.0;
//     float r2 = dot(uv, uv);
//     uv *= 1.0 + 0.11 * d * r2 - 0.02375 * d * r2 * r2;
//     return uv * 0.5 + 0.5;
//   }

//   void main(){
//     vec2 sp = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;  // css px, top-left
//     vec2 uv = sp / uRes;

//     // ---- whole-frame barrel distortion, edges re-mapped so no black borders ----
//     float dp = min(uPow * 5.5, 8.0);
//     float au = min(dp * 0.01, 0.2);
//     float av = min(dp * 0.015, 0.2);
//     uv = lens(uv, dp);
//     vec2 mn = lens(vec2(-au, -av), dp);
//     vec2 mx = lens(vec2(1.0 + au, 1.0 + av), dp);
//     uv = (uv - mn) / (mx - mn);
//     vec2 P  = uv * uRes;     // position in flat "content" space (css px)
//     vec2 uc = uv;            // content uv (for the static noise / centre distance)

//     // ---- titles (two stacked: current + next) ----
//     vec2  tc = vec2(P.x, P.y + uTitleScroll);
//     float gm = 1.0;
//     if (uGlitch > 0.0 && uPow < 0.05) {
//       float r = rnd(vec2(uc.y) * (0.5 + fract(uTime * 0.37)));
//       tc.x += (r - 0.5) * uGlitch * uRes.x;
//       gm = clamp(pow(r, 0.05), 0.0, 0.98);
//     }
//     float yA = tc.y;
//     float yB = tc.y - uTitleStride;
//     float inX = step(0.0, tc.x) * step(tc.x, uTitleSize.x);
//     float mA = inX * step(0.0, yA) * step(yA, uTitleSize.y);
//     float mB = inX * step(0.0, yB) * step(yB, uTitleSize.y);
//     float tA = texture2D(uTitleA, clamp(vec2(tc.x / uTitleSize.x, 1.0 - yA / uTitleSize.y), 0.0, 1.0)).a * mA;
//     float tB = texture2D(uTitleB, clamp(vec2(tc.x / uTitleSize.x, 1.0 - yB / uTitleSize.y), 0.0, 1.0)).a * mB;
//     float title = max(tA, tB) * gm;

//     // ---- info panel: ONE texture, repeated; main tile always visible ----
//     vec2 q = uc - uOrigin / uRes;
//     q = (q - 0.25) * (uPow * 0.8 + 1.0) + 0.25;      // tiles pull away from the centre with speed
//     vec2 g = q * uRes / uPanelSize;                  // panel units, top-left
//     float screenGy = g.y;
//     g.y += uPanelPos * 2.0;                          // 2 panel heights per project

//     float inMain = step(0.0, g.x) * step(g.x, 1.0)
//                  * step(mod(g.y, 2.0), 1.0)
//                  * step(-0.5, screenGy) * step(screenGy, 1.5);

//     vec4 tx = texture2D(uPanel, vec2(fract(g.x), 1.0 - fract(g.y)));
//     float panel = tx.r * tx.a;

//     if (inMain < 0.5) {
//       // static noise + distance from centre decide which repeats are revealed
//       float noise = 0.8 * fbm(uc * 10.0);
//       float t = clamp(clamp(1.0 - length(uc - 0.5), 0.0, 1.0) * uPow * 0.1, 0.0, 1.0);
//       float v = pow(max(noise * t, 1e-6), 0.3) + t;
//       if (v < 0.2) {
//         vec2 gj = g - (noise - 0.2) * 0.06;          // torn, dim edge of the dissolve
//         vec4 t2 = texture2D(uPanel, vec2(fract(gj.x), 1.0 - fract(gj.y)));
//         panel = t2.r * pow(v * 2.7, 2.0) * 0.9;
//       }
//     }
//     panel *= max(0.0, 1.0 - uPow * 0.2);

//     float a = clamp(panel + title, 0.0, 1.0);
//     gl_FragColor = vec4(vec3(a), 1.0);
//   }
// `;

// /* ------------------------------------------------------------------ */
// /* Helpers                                                             */
// /* ------------------------------------------------------------------ */
// const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// const splitLines = (s) => String(s ?? "").split("\n");

// /** random permutation of the charset (no repeated letters), cut to length */
// function scrambled(len) {
//   const a = CHARSET.split("");
//   for (let i = a.length - 1; i > 0; i--) {
//     const j = (Math.random() * (i + 1)) | 0;
//     [a[i], a[j]] = [a[j], a[i]];
//   }
//   return a.join("").slice(0, Math.max(1, len));
// }

// function wrapWords(ctx, text, maxW) {
//   const lines = [];
//   let cur = "";
//   String(text)
//     .split(" ")
//     .forEach((w) => {
//       const test = cur ? cur + " " + w : w;
//       if (ctx.measureText(test).width > maxW && cur) {
//         lines.push(cur);
//         cur = w;
//       } else cur = test;
//     });
//   if (cur) lines.push(cur);
//   return lines;
// }

// /** info panel text. scr = true -> every value replaced by a scrambled string of same length */
// function paintPanel(ctx, proj, idx, total, scr) {
//   const X = 32 * O;
//   let y = 22 * O;
//   const T = (s) => (scr ? scrambled(s.length) : s);
//   const label = (s) => {
//     ctx.fillStyle = "rgb(90,90,90)";
//     ctx.font = `200 ${23 * O}px 'Oswald','Arial Narrow',sans-serif`;
//     ctx.fillText(s, X, y);
//   };
//   const value = (s, weight, size) => {
//     ctx.fillStyle = "rgb(255,255,255)";
//     ctx.font = `${weight} ${size * O}px ${PANEL_FONT}`;
//     ctx.fillText(s, X, y);
//   };
//   ctx.textBaseline = "alphabetic";

//   value(`WORKS ${idx + 1} / ${total}`, 700, 26);
//   y += 64 * O;
//   label("CLIENT");
//   y += 46 * O;
//   splitLines(proj.client).forEach((l) => {
//     value(T(l), 700, 50);
//     y += 48 * O;
//   });
//   y += 16 * O;
//   label("TYPE");
//   y += 28 * O;
//   value(T(proj.type || ""), 400, 24);
//   y += 64 * O;
//   label("AGENCY");
//   y += 28 * O;
//   const ag = splitLines(proj.agency);
//   ag.forEach((l, i) => {
//     value(T(l), 400, 24);
//     if (i < ag.length - 1) y += 32 * O;
//   });
//   y += 64 * O;
//   label("RELEASE DATE");
//   y += 28 * O;
//   value(T(proj.date || ""), 400, 24);
//   return { yDate: y };
// }

// /** one project's giant title, laid out for a W x H viewport */
// function drawTitle(ctx, proj, W, H, sc) {
//   ctx.setTransform(sc, 0, 0, sc, 0, 0);
//   ctx.clearRect(0, 0, W, H);
//   if (!proj) return;

//   const small = W < 768;
//   const fs = clamp(W * 0.116, 56, 230);
//   const lh = fs * 0.92;
//   const lines = (Array.isArray(proj.title) ? proj.title : [proj.title]).map((l) =>
//     typeof l === "string" ? { text: l } : l
//   );
//   const x0 = small ? W * 0.08 : W * 0.41;
//   const blockH = lines.length * lh;
//   const top = (small ? H * 0.4 : H * 0.47) - blockH / 2;

//   ctx.fillStyle = "#fff";
//   ctx.textBaseline = "alphabetic";

//   let blockW = 0;
//   lines.forEach((o, k) => {
//     const size = fs * (o.size || 1);
//     const indent = o.indent ?? (k > 0 ? 0.78 : 0);
//     ctx.font = `700 ${size}px ${TITLE_FONT}`;
//     try {
//       ctx.letterSpacing = `${-0.01 * size}px`;
//     } catch (e) {}
//     const text = o.lower ? o.text : o.text.toUpperCase();
//     ctx.fillText(text, x0 + indent * fs, top + k * lh + 0.912 * fs);
//     blockW = Math.max(blockW, indent * fs + ctx.measureText(text).width);
//   });

//   if (proj.subtitle) {
//     const fsS = clamp(W * 0.035, 20, 70);
//     ctx.font = `italic 200 ${fsS}px ${TITLE_FONT}`;
//     try {
//       ctx.letterSpacing = "0px";
//     } catch (e) {}
//     const side = lines.length >= 3;
//     const sx = side ? x0 + blockW * 0.62 : x0 + blockW * 0.02;
//     const maxW = side ? blockW * 0.58 : fsS * 13;
//     const sy = side ? top + lh + 0.1 * fs + fsS * 0.85 : top + blockH + W * 0.015 + fsS;
//     wrapWords(ctx, proj.subtitle, maxW).forEach((ln, i) =>
//       ctx.fillText(ln, sx, sy + i * fsS * 1.1)
//     );
//   }
// }

// /* ------------------------------------------------------------------ */
// /* Component                                                           */
// /* ------------------------------------------------------------------ */
// export default function ProjectShowcase({
//   projects = DEFAULT_PROJECTS,
//   navItems = DEFAULT_NAV,
//   lenis, // optional: Lenis instance or ref ({ current })
//   intensity = 1, // multiplies delta for the glitch energy
//   wheelGain = 1, // multiplier on the reference wheel scale (1 = exact). lower = more scroll needed
//   touchGain = 5, // touch px -> delta (reference uses 5)
//   stepScale = 1, // scroll distance per project (1 = reference)
//   snapSpeed = 1, // speed of the pull (settle back / go to next). 1 = reference (0.05 per frame)
//   hint = ["To see more of this work,", "press the typography to the right."],
//   onSelect, // (project, index) => void
// }) {
//   const rootRef = useRef(null);
//   const hostRef = useRef(null);
//   const linkRefs = useRef([]);
//   const dotRef = useRef(null);
//   const progressRef = useRef(null);
//   const hoverRef = useRef(false);
//   const lenisRef = useRef(lenis);
//   lenisRef.current = lenis;
//   const n = projects.length;
//   const hintLines = Array.isArray(hint) ? hint : String(hint).split("\n");
//   const hintKey = hintLines.join("|");

//   useLayoutEffect(() => {
//     const root = rootRef.current;
//     const host = hostRef.current;
//     if (!root || !host || n === 0) return;

//     const dpr = Math.min(window.devicePixelRatio || 1, 2);
//     const state = { dirty: true, titleDirty: true, visible: true, W: 1, H: 1, tsc: 1 };

//     /* ---------- fonts ---------- */
//     const markDirty = () => {
//       state.dirty = true;
//       state.titleDirty = true;
//     };
//     const loadFonts = () =>
//       Promise.all(
//         [
//           "700 20px Oswald",
//           "300 13px Oswald",
//           "200 20px Oswald",
//           "italic 200 20px Oswald",
//           "400 20px Padauk",
//           "700 20px Padauk",
//         ].map((f) => document.fonts.load(f))
//       )
//         .then(markDirty)
//         .catch(() => {});
//     let link = document.getElementById("showcase-fonts");
//     if (!link) {
//       link = document.createElement("link");
//       link.id = "showcase-fonts";
//       link.rel = "stylesheet";
//       link.href =
//         "https://fonts.googleapis.com/css2?family=Oswald:wght@200;300;400;700&family=Padauk:wght@400;700&display=swap";
//       document.head.appendChild(link);
//     }
//     link.addEventListener("load", loadFonts);
//     loadFonts();
//     document.fonts.ready.then(markDirty);

//     /* ---------- info panel canvas -> texture ---------- */
//     const panel = document.createElement("canvas");
//     panel.width = CW;
//     panel.height = CH;
//     const pctx = panel.getContext("2d");
//     const tex = new THREE.CanvasTexture(panel);
//     tex.minFilter = THREE.LinearFilter;
//     tex.magFilter = THREE.LinearFilter;
//     tex.generateMipmaps = false;

//     let idx = 0; // committed project (27% rule)
//     let drawnIdx = -1;
//     let texDirty = false;
//     const hintT = { v: 1 };

//     const paintReal = (v = 1) => {
//       pctx.setTransform(1, 0, 0, 1, 0, 0);
//       pctx.clearRect(0, 0, CW, CH);
//       const { yDate } = paintPanel(pctx, projects[idx], idx, n, false);
//       const yH = yDate + 76 * O;
//       pctx.fillStyle = "rgb(150,150,150)";
//       pctx.font = `200 ${20 * O}px ${PANEL_FONT}`;
//       const [l1 = "", l2 = ""] = hintLines;
//       const a1 = Math.floor(v > 0.5 ? l1.length : l1.length * v * 2);
//       const a2 = Math.floor(v < 0.5 ? 0 : l2.length * (v - 0.5) * 2);
//       pctx.fillText(l1.slice(0, a1), 32 * O, yH);
//       pctx.fillText(l2.slice(0, a2), 32 * O, yH + 20 * O);
//       pctx.fillStyle = "rgb(65,65,65)";
//       pctx.fillRect(0, 1 * O, 2 * O, (yH + 22 * O) * v);
//       drawnIdx = idx;
//     };
//     const paintScr = () => {
//       pctx.setTransform(1, 0, 0, 1, 0, 0);
//       pctx.clearRect(0, 0, CW, CH);
//       paintPanel(pctx, projects[idx], idx, n, true);
//     };
//     const startReal = () => {
//       gsap.killTweensOf(hintT);
//       hintT.v = 0;
//       paintReal(0);
//       gsap.to(hintT, {
//         v: 1,
//         duration: 0.5,
//         ease: "power1.out",
//         onUpdate: () => {
//           paintReal(hintT.v);
//           texDirty = true;
//         },
//       });
//     };

//     /* ---------- white bars (canvas rects, tweened) ---------- */
//     const rects = Array.from({ length: 8 }, () => ({ x: 6 * O, y: 0, w: 0, h: 0 }));
//     const startRects = () => {
//       const proj = projects[idx];
//       const cl = Math.min(5, splitLines(proj.client).length);
//       const al = splitLines(proj.agency).length;
//       const extra = 32 * O * Math.max(al - 1, 0);
//       rects.forEach((r) => {
//         gsap.killTweensOf(r);
//         r.x = 6 * O;
//         r.w = 0;
//       });
//       const wipe = (r) =>
//         gsap.fromTo(
//           r,
//           { x: 6 * O, w: 380 * O },
//           {
//             x: 386 * O,
//             w: 0,
//             duration: 0.25,
//             ease: "power4.out",
//             onComplete: () => {
//               r.x = 6 * O;
//               r.w = 0;
//             },
//           }
//         );
//       const sweep = (r, delay) =>
//         gsap.fromTo(
//           r,
//           { w: 0 },
//           { delay, w: 380 * O, duration: 0.4, ease: "power4.in", onComplete: () => wipe(r) }
//         );
//       let c = 0;
//       for (let d = 0; d < cl; d++) {
//         const r = rects[d];
//         r.y = (94 + 48 * d) * O;
//         r.h = 44 * O;
//         sweep(r, c);
//         c += d === 2 ? 0.15 : 0.05;
//       }
//       for (let d = 5; d < 8; d++) {
//         const r = rects[d];
//         r.y = (94 + 48 * cl + 60 + 92 * (d - 5)) * O + (d >= 7 ? extra : 0);
//         r.h = 24 * O;
//         sweep(r, c);
//         c += 0.05;
//       }
//     };
//     const drawRects = () => {
//       pctx.fillStyle = "#fff";
//       rects.forEach((r) => {
//         if (r.w > 0.5) pctx.fillRect(r.x, r.y, r.w, r.h);
//       });
//     };

//     /* ---------- two title canvases: A = lower project, B = next ---------- */
//     const makeTitle = () => {
//       const c = document.createElement("canvas");
//       c.width = 4;
//       c.height = 4;
//       const t = new THREE.CanvasTexture(c);
//       t.minFilter = THREE.LinearFilter;
//       t.magFilter = THREE.LinearFilter;
//       t.generateMipmaps = false;
//       return { c, ctx: c.getContext("2d"), tex: t, idx: -2 };
//     };
//     let TA = makeTitle();
//     let TB = makeTitle();
//     const paintTitle = (T, i) => {
//       T.idx = i;
//       drawTitle(T.ctx, i >= 0 && i < n ? projects[i] : null, state.W, state.H, state.tsc);
//       T.tex.needsUpdate = true;
//     };
//     const ensureTitles = (lo) => {
//       if (state.titleDirty) {
//         paintTitle(TA, lo);
//         paintTitle(TB, lo + 1);
//         state.titleDirty = false;
//       } else if (TA.idx === lo && TB.idx === lo + 1) {
//         // up to date
//       } else if (TB.idx === lo) {
//         [TA, TB] = [TB, TA];
//         paintTitle(TB, lo + 1);
//       } else if (TA.idx === lo + 1) {
//         [TA, TB] = [TB, TA];
//         paintTitle(TA, lo);
//       } else {
//         paintTitle(TA, lo);
//         paintTitle(TB, lo + 1);
//       }
//       uniforms.uTitleA.value = TA.tex;
//       uniforms.uTitleB.value = TB.tex;
//     };

//     /* ---------- three.js ---------- */
//     const renderer = new THREE.WebGLRenderer({
//       antialias: false,
//       powerPreference: "high-performance",
//     });
//     renderer.setClearColor(0x000000, 1);
//     renderer.domElement.className = "block h-full w-full";
//     host.appendChild(renderer.domElement);

//     const scene = new THREE.Scene();
//     const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
//     const uniforms = {
//       uPanel: { value: tex },
//       uTitleA: { value: TA.tex },
//       uTitleB: { value: TB.tex },
//       uRes: { value: new THREE.Vector2(1, 1) },
//       uDpr: { value: dpr },
//       uOrigin: { value: new THREE.Vector2(0, 0) },
//       uPanelSize: { value: new THREE.Vector2(320, 440) },
//       uPanelPos: { value: 0 },
//       uTitleSize: { value: new THREE.Vector2(1, 1) },
//       uTitleStride: { value: 1 },
//       uTitleScroll: { value: 0 },
//       uPow: { value: 0 },
//       uGlitch: { value: 0 },
//       uTime: { value: 0 },
//     };
//     const material = new THREE.ShaderMaterial({
//       vertexShader: VERT,
//       fragmentShader: FRAG,
//       uniforms,
//       depthTest: false,
//       depthWrite: false,
//     });
//     const geometry = new THREE.PlaneGeometry(2, 2);
//     scene.add(new THREE.Mesh(geometry, material));

//     let pos = 0; // virtual scroll position in px
//     let step = 1; // px per project
//     const layout = () => {
//       const w = host.clientWidth || window.innerWidth;
//       const h = host.clientHeight || window.innerHeight;
//       const small = w < 768;
//       const k = small ? 0.5 : Math.min(h * LAYOUT.kH, w * LAYOUT.kW);

//       renderer.setPixelRatio(dpr);
//       renderer.setSize(w, h, false);

//       const tNow = pos / step;
//       // reference: step = 0.5 * canvasHeight, canvas quality = 2 (<= dpr), Windows/Safari 1.5, >2000px wide 1
//       const uaq = navigator.userAgent.toLowerCase();
//       const safari = uaq.includes("safari") && !uaq.includes("chrome") && !uaq.includes("edg");
//       let quality = Math.min(2, window.devicePixelRatio || 1);
//       if (safari) quality = Math.min(1.5, quality);
//       if (uaq.includes("windows")) quality = 1.5;
//       if (w > 2000) quality = 1;
//       step = h * 0.5 * quality * stepScale;
//       pos = tNow * step;

//       uniforms.uRes.value.set(w, h);
//       uniforms.uDpr.value = dpr;
//       uniforms.uPanelSize.value.set(512 * k, 700 * k);
//       uniforms.uOrigin.value.set(small ? 16 : w * LAYOUT.originX, small ? 64 : h * LAYOUT.originY);

//       state.W = w;
//       state.H = h;
//       state.tsc = Math.min(dpr, 1.5, Math.sqrt(12e6 / (w * h)));
//       [TA, TB].forEach((T) => {
//         T.c.width = Math.max(4, Math.round(w * state.tsc));
//         T.c.height = Math.max(4, Math.round(h * state.tsc));
//         T.tex.dispose();
//       });
//       uniforms.uTitleSize.value.set(w, h);
//       uniforms.uTitleStride.value = h * LAYOUT.titleStride;
//       state.dirty = true;
//       state.titleDirty = true;
//     };
//     layout();
//     const ro = new ResizeObserver(layout);
//     ro.observe(host);

//     const io = new IntersectionObserver(
//       ([e]) => {
//         state.visible = e.isIntersecting;
//       },
//       { threshold: 0 }
//     );
//     io.observe(root);

//     /* ---------- virtual scroll input ---------- */
//     const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
//     const LOCK_MS = 350; // swallow momentum right after landing on the section
//     const GAP_MS = 220; // a "fresh gesture" = this long since the last input
//     // ---- exact replica of the reference's SmoothWheel (type "fixed") ----
//     const ua = navigator.userAgent.toLowerCase();
//     const isFF = ua.includes("firefox");
//     const isEdge = ua.includes("edg");
//     const isWin = !(navigator.platform || "").toLowerCase().includes("mac");
//     const DECEL = isWin ? (isFF ? 0.12 : 0.05) : isFF ? 0.16 : 0.13;
//     const MULT = (isWin ? (isFF ? 1.7 : isEdge ? 2 : 1.6) : isFF ? 1.5 : 1.1) * wheelGain;
//     const sw = { scrollPos: 0, current: 0, target: 0, until: 0 };
//     const swReset = () => {
//       sw.scrollPos = sw.current = sw.target = 0;
//       sw.until = 0;
//     };
//     const END = 0.02;
//     const SETTLE_MS = 450; // must rest on the first/last project this long before you can leave
//     const OVER_PX = 140; // ...then this much extra scroll in the same direction lets you out
//     const COOLDOWN_MS = 700; // no re-engage right after leaving
//     let active = false;
//     let engagedAt = 0;
//     let lastInputAt = 0;
//     let lastReleaseAt = 0;
//     let armed = true; // may engage again only after the page has moved out of the pin zone
//     let lastOutside = 0; // -1 = section is below us (we are above it), +1 = we are below it
//     let edgeFreeAt = 0; // last time we were NOT resting on the first/last project
//     let overscroll = 0;
//     const keyTween = { d: 0 };
//     let keyActive = false;

//     const getLenis = () => {
//       const l = lenisRef.current;
//       const inst = l && l.current !== undefined ? l.current : l;
//       return inst && typeof inst.stop === "function" ? inst : null;
//     };
//     const startY = () => root.getBoundingClientRect().top + window.scrollY;

//     const engage = (side) => {
//       if (active) return;
//       active = true;
//       engagedAt = edgeFreeAt = performance.now();
//       overscroll = 0;
//       swReset();
//       const y = startY();
//       const l = getLenis();
//       if (l) {
//         try {
//           l.scrollTo(y, { immediate: true, force: true });
//           l.stop();
//         } catch (e) {}
//       }
//       window.scrollTo({ top: y, behavior: "instant" });
//       pos = side === "top" ? 0 : (n - 1) * step;
//       vp = pos / step;
//       lastDelta = side === "top" ? 1 : -1;
//     };
//     const release = () => {
//       if (!active) return;
//       active = false;
//       armed = false;
//       swReset();
//       keyActive = false;
//       gsap.killTweensOf(keyTween);
//       const l = getLenis();
//       if (l) {
//         try {
//           l.start();
//         } catch (e) {}
//       }
//     };
//     const atTop = () => pos / step <= END;
//     const atEnd = () => pos / step >= n - 1 - END;
//     const edgeDir = (dy) => (dy < 0 && atTop()) || (dy > 0 && atEnd());

//     /* hand scrolling back to the page (first/last project, outward input) */
//     const leave = (dy) => {
//       release();
//       lastReleaseAt = performance.now();
//       const l = getLenis();
//       if (l) {
//         try {
//           l.scrollTo(window.scrollY + Math.sign(dy) * state.H * 0.5, { duration: 0.9 });
//         } catch (e) {}
//       }
//     };
//     // true = we left the section. A fresh gesture leaves at once; a continuous one
//     // needs OVER_PX of extra scroll once the project has settled.
//     const tryLeave = (dy, now, gap) => {
//       if (!edgeDir(dy)) {
//         overscroll = 0;
//         return false;
//       }
//       if (now - engagedAt < LOCK_MS || now - edgeFreeAt < SETTLE_MS) return false;
//       overscroll += Math.abs(dy);
//       if (gap > GAP_MS || overscroll > OVER_PX) {
//         leave(dy);
//         return true;
//       }
//       return false;
//     };

//     /* pin check: state based (not edge based), so slow Lenis tails and fast jumps both pin */
//     const zoneOf = (y, sy) => (y < sy - 2 ? -1 : y > sy + 2 ? 1 : 0);
//     const checkPin = () => {
//       const y = window.scrollY;
//       const sy = startY();
//       const now = performance.now();
//       if (active) {
//         const drift = Math.abs(y - sy);
//         if (drift > 3) {
//           if (drift > state.H * 0.4) {
//             release(); // anchor jump / scrollbar drag far away
//             lastReleaseAt = now;
//           } else {
//             // something nudged us: pin again
//             const l = getLenis();
//             if (l) {
//               try {
//                 l.scrollTo(sy, { immediate: true, force: true });
//               } catch (e) {}
//             }
//             window.scrollTo({ top: sy, behavior: "instant" });
//           }
//         }
//         return;
//       }
//       const z = zoneOf(y, sy);
//       if (armed && now - lastReleaseAt > COOLDOWN_MS && lastOutside !== 0) {
//         // reached the zone, or jumped across it
//         if (z === 0 || z !== lastOutside) {
//           engage(lastOutside < 0 ? "top" : "bottom");
//           return;
//         }
//       }
//       if (z !== 0) {
//         lastOutside = z;
//         armed = true;
//       }
//     };
//     const onScroll = checkPin;
//     window.addEventListener("scroll", onScroll, { passive: true });

//     const onWheel = (e) => {
//       if (!active || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
//       const now = performance.now();
//       const gap = now - lastInputAt;
//       lastInputAt = now;
//       const dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? state.H : 1);
//       if (tryLeave(dy, now, gap)) return; // not prevented -> the page scrolls on
//       e.preventDefault();
//       if (now - engagedAt < LOCK_MS) return;
//       sw.scrollPos = clamp(sw.scrollPos + dy * MULT, sw.current - 2500, sw.current + 2500);
//       sw.until = now + 1000;
//     };

//     let touchY = 0;
//     let touchFresh = false;
//     const onTouchStart = (e) => {
//       if (!active || !e.touches[0]) return;
//       touchY = e.touches[0].clientY;
//       touchFresh = performance.now() - lastInputAt > GAP_MS;
//     };
//     const onTouchMove = (e) => {
//       if (!active || !e.touches[0]) return;
//       const now = performance.now();
//       const y = e.touches[0].clientY;
//       const dy = touchY - y;
//       touchY = y;
//       const tgap = touchFresh ? 1e9 : 0;
//       touchFresh = false;
//       if (tryLeave(dy * 3, now, tgap)) return;
//       lastInputAt = now;
//       if (e.cancelable) e.preventDefault();
//       if (now - engagedAt < LOCK_MS) return;
//       sw.scrollPos = clamp(sw.scrollPos + dy * touchGain, sw.current - 2500, sw.current + 2500);
//       sw.until = now + 1000;
//     };

//     const onKey = (e) => {
//       if (!active) return;
//       const tag = e.target && e.target.tagName;
//       if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target && e.target.isContentEditable)) return;
//       let sgn = 0;
//       if (e.key === "ArrowDown" || e.key === "PageDown") sgn = 1;
//       else if (e.key === "ArrowUp" || e.key === "PageUp") sgn = -1;
//       else if (e.key === " ") sgn = e.shiftKey ? -1 : 1;
//       else return;
//       const now = performance.now();
//       if (edgeDir(sgn) && now - engagedAt > LOCK_MS && now - edgeFreeAt > SETTLE_MS) {
//         leave(sgn);
//         return;
//       }
//       e.preventDefault();
//       if (now - engagedAt < LOCK_MS) return;
//       lastInputAt = now;
//       gsap.killTweensOf(keyTween);
//       keyActive = true;
//       keyTween.d = sgn * 100;
//       gsap.to(keyTween, {
//         d: sgn,
//         duration: 0.5,
//         ease: "power1.out",
//         onComplete: () => {
//           keyActive = false;
//           lastDelta = sgn;
//           keyTween.d = 0;
//         },
//       });
//     };
//     window.addEventListener("wheel", onWheel, { passive: false });
//     window.addEventListener("touchstart", onTouchStart, { passive: true });
//     window.addEventListener("touchmove", onTouchMove, { passive: false });
//     window.addEventListener("keydown", onKey);

//     /* ---------- cursor circle: reference follow = per-frame lerp, c += 0.2 * (target - c) ---------- */
//     const dot = dotRef.current;
//     let setX, setY;
//     let tx = -1000;
//     let ty = -1000;
//     let cx = -1000;
//     let cy = -1000;
//     let seeded = false;
//     if (dot) {
//       gsap.set(dot, { xPercent: -50, yPercent: -50, x: -1000, y: -1000, scale: 0 });
//       setX = gsap.quickSetter(dot, "x", "px");
//       setY = gsap.quickSetter(dot, "y", "px");
//     }
//     const onMove = (e) => {
//       const b = root.getBoundingClientRect();
//       tx = e.clientX - b.left;
//       ty = e.clientY - b.top;
//       if (!seeded) {
//         cx = tx;
//         cy = ty;
//         seeded = true;
//       }
//     };
//     root.addEventListener("pointermove", onMove);

//     /* ---------- render loop ---------- */
//     let energy = 0;
//     let prevE = 0;
//     let vp = 0; // eased position in projects (reference: u_position += 0.1 * (g - u_position))
//     let lastDelta = 1; // reference: GLWheel.delta (keeps its last non-zero value)
//     let snapIdx = 0;
//     let acc = 0;
//     let frameN = 0;

//     const tick = (time) => {
//       checkPin();
//       if (!state.visible) return;
//       const dr = gsap.ticker.deltaRatio(60);
//       if (setX) {
//         // fast move -> circle trails behind; slow down -> it settles exactly on the cursor
//         const k = 1 - Math.pow(1 - 0.2, dr);
//         cx += (tx - cx) * k;
//         cy += (ty - cy) * k;
//         setX(cx);
//         setY(cy);
//       }
//       const now = performance.now();

//       // ---- fixed 60Hz simulation (the reference does all of this once per frame) ----
//       acc += dr;
//       let steps = Math.floor(acc);
//       acc -= steps;
//       steps = Math.min(steps, 5);
//       for (let i = 0; i < steps; i++) {
//         // SmoothWheel: exponential approach to the target, truncated to whole px
//         let d = 0;
//         if (active) {
//           if (keyActive) d = keyTween.d;
//           else if (now < sw.until) {
//             sw.target += ((sw.scrollPos - sw.current) * DECEL) | 0;
//             d = sw.target - sw.current;
//             sw.current = sw.target;
//           }
//         }
//         // 1) input moves you directly
//         if (d !== 0) {
//           lastDelta = d;
//           // elastic ends: input past the first/last project meets growing resistance
//           const maxPos = (n - 1) * step;
//           const over = pos < 0 ? -pos : pos > maxPos ? pos - maxPos : 0;
//           const outward = (pos < 0 && d < 0) || (pos > maxPos && d > 0);
//           const k = outward ? Math.pow(1 - Math.min(over / (0.3 * step), 1), 2) : 1;
//           pos += 0.69 * d * k;
//           if (outward && over > 0.25 * step) sw.scrollPos = sw.current; // drop leftover momentum
//         }
//         // 2) always-on pull to the nearest project (27% bias, direction = last delta)
//         const t0 = pos / step;
//         snapIdx = clamp(lastDelta >= 0 ? Math.floor(t0 + 1 - 0.27) : Math.floor(t0 + 0.27), 0, n - 1);
//         pos += (snapIdx * step - pos) * (reduce ? 0.2 : clamp(0.05 * snapSpeed, 0.01, 0.5));
//         pos = clamp(pos, -0.3 * step, (n - 1 + 0.3) * step);
//         if (!atTop() && !atEnd()) edgeFreeAt = now;
//         // 3) glitch energy: e += 0.003*(|delta|-1); e *= 0.92
//         const sp = Math.abs(d) * intensity; // this step only: no frozen glitch when input stops
//         if (!reduce && sp > 1) energy += 0.003 * (sp - 1);
//         energy = clamp(energy * 0.92, 0, 4);
//       }
//       const t = pos / step;
//       idx = snapIdx;

//       // reference: the TITLE layer follows the position directly (no extra easing);
//       // only the info PANEL layer is eased (u_position += 0.1 * (g - u_position))
//       vp += (t - vp) * (1 - Math.pow(0.9, dr));
//       const lo = n > 1 ? clamp(Math.floor(t), 0, n - 2) : 0;
//       const f = n > 1 ? t - lo : 0;
//       ensureTitles(lo);

//       // ---- panel texture: scramble / bars / real text ----
//       let need = false;
//       if (energy > 0.1 && ++frameN % 2 === 1) {
//         paintScr();
//         need = true;
//       }
//       if (prevE <= 0.1 && energy > 0.1) {
//         gsap.killTweensOf(hintT);
//         startRects();
//       } else if (prevE > 0.1 && energy <= 0.1) {
//         startReal();
//         need = true;
//       }
//       if (energy > 0.1) {
//         drawRects();
//         need = true;
//       }
//       prevE = energy;
//       if (energy <= 0.1 && drawnIdx !== idx) {
//         startReal();
//         need = true;
//       }
//       if (state.dirty) {
//         state.dirty = false;
//         if (energy > 0.1) paintScr();
//         else paintReal(hintT.v);
//         need = true;
//       }
//       if (texDirty) {
//         texDirty = false;
//         need = true;
//       }
//       if (need) tex.needsUpdate = true;

//       uniforms.uPow.value = energy;
//       uniforms.uPanelPos.value = vp;
//       uniforms.uTitleScroll.value = f * uniforms.uTitleStride.value;
//       uniforms.uGlitch.value = hoverRef.current && energy < 0.05 ? 0.003 : 0;
//       uniforms.uTime.value = time;
//       renderer.render(scene, camera);

//       // hit-area only over the resting project
//       const resting = energy <= 0.1 && Math.abs(t - idx) < 0.03;
//       if (!resting && hoverRef.current) {
//         hoverRef.current = false;
//         if (dot) gsap.to(dot, { scale: 0, duration: 0.3, ease: "power3.out", overwrite: "auto" });
//       }
//       for (let i = 0; i < n; i++) {
//         const a = linkRefs.current[i];
//         if (a) a.style.pointerEvents = resting && i === idx ? "auto" : "none";
//       }
//       if (progressRef.current) {
//         progressRef.current.style.transform = `scaleY(${n > 1 ? clamp(t / (n - 1), 0, 1) : 1})`;
//       }
//     };
//     // section already at the top of the page (e.g. it is the first block): engage right away
//     if (Math.abs(window.scrollY - startY()) <= 2) engage("top");

//     gsap.ticker.add(tick);

//     return () => {
//       gsap.ticker.remove(tick);
//       gsap.killTweensOf(hintT);
//       rects.forEach((r) => gsap.killTweensOf(r));
//       release();
//       ro.disconnect();
//       io.disconnect();
//       window.removeEventListener("scroll", onScroll);
//       window.removeEventListener("wheel", onWheel);
//       window.removeEventListener("touchstart", onTouchStart);
//       window.removeEventListener("touchmove", onTouchMove);
//       window.removeEventListener("keydown", onKey);
//       root.removeEventListener("pointermove", onMove);
//       link.removeEventListener("load", loadFonts);
//       geometry.dispose();
//       material.dispose();
//       tex.dispose();
//       TA.tex.dispose();
//       TB.tex.dispose();
//       renderer.dispose();
//       if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [n, intensity, wheelGain, touchGain, stepScale, snapSpeed, hintKey]);

//   const grow = (on) => {
//     hoverRef.current = on;
//     if (dotRef.current) {
//       gsap.to(dotRef.current, { scale: on ? 1 : 0, duration: 0.45, ease: "power3.out", overwrite: "auto" });
//     }
//   };

//   return (
//     <section
//       ref={rootRef}
//       id="works"
//       className="relative h-screen w-full overflow-hidden bg-black text-white"
//     >
//       {/* WebGL layer: titles + tiled info panel + lens */}
//       <div ref={hostRef} className="absolute inset-0 z-0" aria-hidden="true" />

//       {/* Accessible, invisible hit-areas over the title of the current project */}
//       <div className="pointer-events-none absolute inset-0 z-10">
//         {projects.map((p, i) => {
//           const label = (Array.isArray(p.title) ? p.title : [p.title])
//             .map((l) => (typeof l === "string" ? l : l.text))
//             .join(" ");
//           return (
//             <a
//               key={p.id ?? i}
//               ref={(el) => (linkRefs.current[i] = el)}
//               href={p.href || "#"}
//               onClick={(e) => {
//                 if (onSelect) {
//                   e.preventDefault();
//                   onSelect(p, i);
//                 } else if (!p.href) e.preventDefault();
//               }}
//               onMouseEnter={() => grow(true)}
//               onMouseLeave={() => grow(false)}
//               className="pointer-events-none cursor-pointer absolute left-[8%] top-[22%] block h-[44%] w-[84%] md:left-[41%] md:top-[18%] md:h-[58%] md:w-[52%]"
//               style={{ pointerEvents: i === 0 ? "auto" : "none" }}
//             >
//               <span className="sr-only">{`${label}: view project`}</span>
//             </a>
//           );
//         })}
//       </div>

//       {/* Right rail */}
//       <aside className="absolute right-4 top-0 z-20 flex h-full flex-col items-center justify-between py-6 md:right-6">
//         <svg width="22" height="26" viewBox="0 0 22 26" fill="none" aria-hidden="true">
//           {[3, 7, 11, 15, 19].map((x, k) => (
//             <rect
//               key={x}
//               x={x}
//               y={[8, 0, 12, 4, 10][k]}
//               width="1.6"
//               height={[18, 26, 14, 22, 16][k]}
//               fill="#fff"
//             />
//           ))}
//         </svg>

//         <nav className="flex flex-col items-center gap-10">
//           {navItems.map((it) => (
//             <a
//               key={it.label}
//               href={it.href}
//               className={`text-[11px] font-normal tracking-[0.18em] transition-opacity hover:opacity-100 [writing-mode:vertical-rl] ${
//                 it.active ? "opacity-100" : "opacity-50"
//               }`}
//               style={{ fontFamily: TITLE_FONT }}
//             >
//               {it.label}
//             </a>
//           ))}
//         </nav>

//         <div className="flex flex-col items-center gap-3">
//           <span
//             className="text-[10px] font-light tracking-[0.2em] opacity-60 [writing-mode:vertical-rl]"
//             style={{ fontFamily: TITLE_FONT }}
//           >
//             SCROLL
//           </span>
//           <div className="relative h-24 w-px bg-white/25">
//             <div
//               ref={progressRef}
//               className="absolute inset-0 origin-top bg-white"
//               style={{ transform: "scaleY(0)" }}
//             />
//           </div>
//         </div>
//       </aside>

//       {/* Cursor dot */}
//       <div
//         ref={dotRef}
//         className="pointer-events-none absolute left-0 top-0 z-30 rounded-full bg-white [@media(pointer:coarse)]:hidden"
//         style={{ width: 246, height: 246 }}
//         aria-hidden="true"
//       />
//     </section>
//   );
// }










































// "use client";
// /**
//  * ProjectShowcase.jsx  (v6: virtual scroll + continuous magnetic pull)
//  * ---------------------------------------------------------------
//  * Scroll model (same maths as the reference, re-implemented):
//  *
//  *  - The section is a plain 100vh block. When it reaches the top of the page it
//  *    ENGAGES: page scroll is held, and wheel / touch / keys drive a virtual
//  *    position instead.  It RELEASES at the first / last project (on a fresh gesture).
//  *  - every frame:   pos += 0.69 * delta                (input moves you directly)
//  *                   pos += 0.05 * (snapTarget - pos)   (always-on magnetic pull)
//  *    snapTarget = nearest project with a 27% bias in the direction you scroll.
//  *    No idle timer, no threshold animation, no locked transition.
//  *  - delta also feeds the glitch energy:  e += 0.003*(|delta|-1);  e *= 0.92
//  *      e > 0.1 -> scramble + white bars,  e high -> tiles + barrel lens
//  *  - ArrowDown/ArrowUp/PageDown/PageUp/Space = delta 100 -> 1 over 0.5s (about one project)
//  *
//  * Lenis: pass your instance (or ref) as the `lenis` prop so it is held while engaged.
//  * Install:  npm i gsap three     (needs Tailwind CSS)
//  */
// import { useLayoutEffect, useRef } from "react";
// import * as THREE from "three";
// import gsap from "gsap";

// /* ------------------------------------------------------------------ */
// /* Data. client / agency may contain "\n". title line = string or      */
// /* { text, indent, size, lower } (indent/size in em of title size)     */
// /* ------------------------------------------------------------------ */
// const DEFAULT_PROJECTS = [
//   {
//     title: ["TIDAL", "ATLAS"],
//     client: "Northwind",
//     type: "Websites",
//     agency: "Studio Ono",
//     date: "March 2025",
//     href: "#",
//   },
//   {
//     title: ["PAPER", "ORBIT"],
//     client: "Halden\nMuseum",
//     type: "Installations",
//     agency: "In-house",
//     date: "July 2024",
//     href: "#",
//   },
//   {
//     title: ["WORLD", "MAKER", { text: "β version", indent: 0.05, size: 0.88, lower: true }],
//     client: "Kite Games",
//     type: "Websites",
//     agency: "Fieldwork",
//     date: "September 2023",
//     href: "#",
//   },
//   {
//     title: ["LOW", "TIDE"],
//     client: "Meridian Bank",
//     type: "Apps",
//     agency: "Brightside",
//     date: "May 2022",
//     href: "#",
//   },
//   {
//     title: ["KAJIMA", "DX", "LABO"],
//     subtitle: "A birds-eye glimpse of the entire Naruse Dam",
//     client: "Kajima\nCorporation",
//     type: "Websites / XR",
//     agency: "Pylon\nStudio",
//     date: "December 2021",
//     href: "#",
//   },
//   {
//     title: ["AFTER", "IMAGE"],
//     client: "Oku Watches",
//     type: "Websites",
//     agency: "Cherry & Co",
//     date: "August 2020",
//     href: "#",
//   },
// ];

// const DEFAULT_NAV = [
//   { label: "WORKS", href: "#works", active: true },
//   { label: "ABOUT", href: "#about" },
//   { label: "CONTACT", href: "#contact" },
// ];

// const TITLE_FONT = "'Oswald','Arial Narrow',Impact,sans-serif";
// const PANEL_FONT = "'Padauk','Helvetica Neue',Arial,sans-serif";
// const CHARSET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789[]#&%=-";

// /* info panel is drawn on a 512x700 (base units) canvas at O x */
// const O = 2;
// const CW = 512 * O;
// const CH = 700 * O;

// /* layout numbers measured from the reference frames */
// const LAYOUT = {
//   originX: 0.1717, // panel left, fraction of width
//   originY: 0.216, // panel top, fraction of height
//   kH: 0.000757, // panel scale per px of viewport height
//   kVW: 0.00039, // panel scale per px of viewport width (= 0.75 at 1920px)
//   titleStride: 1.1407, // distance between two titles, in viewport heights
// };

// /* ------------------------------------------------------------------ */
// /* GLSL (one full-screen pass: titles + tiled panel, then the lens)    */
// /* ------------------------------------------------------------------ */
// const VERT = /* glsl */ `
//   void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }
// `;

// const FRAG = /* glsl */ `
//   precision highp float;
//   uniform sampler2D uPanel;
//   uniform sampler2D uTitleA;
//   uniform sampler2D uTitleB;
//   uniform vec2  uRes;          // css px
//   uniform float uDpr;
//   uniform vec2  uOrigin;       // panel top-left, css px
//   uniform vec2  uPanelSize;    // panel size, css px
//   uniform float uPanelPos;     // scroll position in projects (eased)
//   uniform vec2  uTitleSize;
//   uniform float uTitleStride;
//   uniform float uTitleScroll;  // px the title drum has moved
//   uniform float uPow;          // scroll energy
//   uniform float uGlitch;       // hover flicker
//   uniform float uTime;

//   float rnd(vec2 st){ return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453123); }
//   float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
//   float vn(vec2 p){
//     vec2 i = floor(p), f = fract(p);
//     float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
//     vec2 u = f * f * (3.0 - 2.0 * f);
//     return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
//   }
//   float fbm(vec2 p){
//     float v = 0.0, a = 0.5;
//     mat2 r = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
//     for (int i = 0; i < 4; i++){ v += a * vn(p); p = r * p * 2.0 + vec2(100.0); a *= 0.5; }
//     return v;
//   }

//   // Brown-Conrady lens
//   vec2 lens(vec2 uv, float d){
//     uv = uv * 2.0 - 1.0;
//     float r2 = dot(uv, uv);
//     uv *= 1.0 + 0.11 * d * r2 - 0.02375 * d * r2 * r2;
//     return uv * 0.5 + 0.5;
//   }

//   void main(){
//     vec2 sp = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;  // css px, top-left
//     vec2 uv = sp / uRes;

//     // ---- whole-frame barrel distortion, edges re-mapped so no black borders ----
//     float dp = min(uPow * 5.5, 8.0);
//     float au = min(dp * 0.01, 0.2);
//     float av = min(dp * 0.015, 0.2);
//     uv = lens(uv, dp);
//     vec2 mn = lens(vec2(-au, -av), dp);
//     vec2 mx = lens(vec2(1.0 + au, 1.0 + av), dp);
//     uv = (uv - mn) / (mx - mn);
//     vec2 P  = uv * uRes;     // position in flat "content" space (css px)
//     vec2 uc = uv;            // content uv (for the static noise / centre distance)

//     // ---- titles (two stacked: current + next) ----
//     vec2  tc = vec2(P.x, P.y + uTitleScroll);
//     float gm = 1.0;
//     if (uGlitch > 0.0 && uPow < 0.05) {
//       float r = rnd(vec2(uc.y) * (0.5 + fract(uTime * 0.37)));
//       tc.x += (r - 0.5) * uGlitch * uRes.x;
//       gm = clamp(pow(r, 0.05), 0.0, 0.98);
//     }
//     float yA = tc.y;
//     float yB = tc.y - uTitleStride;
//     float inX = step(0.0, tc.x) * step(tc.x, uTitleSize.x);
//     float mA = inX * step(0.0, yA) * step(yA, uTitleSize.y);
//     float mB = inX * step(0.0, yB) * step(yB, uTitleSize.y);
//     float tA = texture2D(uTitleA, clamp(vec2(tc.x / uTitleSize.x, 1.0 - yA / uTitleSize.y), 0.0, 1.0)).a * mA;
//     float tB = texture2D(uTitleB, clamp(vec2(tc.x / uTitleSize.x, 1.0 - yB / uTitleSize.y), 0.0, 1.0)).a * mB;
//     float title = max(tA, tB) * gm;

//     // ---- info panel: ONE texture, repeated; main tile always visible ----
//     vec2 q = uc - uOrigin / uRes;
//     q = (q - 0.25) * (uPow * 0.8 + 1.0) + 0.25;      // tiles pull away from the centre with speed
//     vec2 g = q * uRes / uPanelSize;                  // panel units, top-left
//     float screenGy = g.y;
//     g.y += uPanelPos * 2.0;                          // 2 panel heights per project

//     float inMain = step(0.0, g.x) * step(g.x, 1.0)
//                  * step(mod(g.y, 2.0), 1.0)
//                  * step(-0.5, screenGy) * step(screenGy, 1.5);

//     vec4 tx = texture2D(uPanel, vec2(fract(g.x), 1.0 - fract(g.y)));
//     float panel = tx.r * tx.a;

//     if (inMain < 0.5) {
//       // static noise + distance from centre decide which repeats are revealed
//       float noise = 0.8 * fbm(uc * 10.0);
//       float t = clamp(clamp(1.0 - length(uc - 0.5), 0.0, 1.0) * uPow * 0.1, 0.0, 1.0);
//       float v = pow(max(noise * t, 1e-6), 0.3) + t;
//       if (v < 0.2) {
//         vec2 gj = g - (noise - 0.2) * 0.06;          // torn, dim edge of the dissolve
//         vec4 t2 = texture2D(uPanel, vec2(fract(gj.x), 1.0 - fract(gj.y)));
//         panel = t2.r * pow(v * 2.7, 2.0) * 0.9;
//       }
//     }
//     panel *= max(0.0, 1.0 - uPow * 0.2);

//     float a = clamp(panel + title, 0.0, 1.0);
//     gl_FragColor = vec4(vec3(a), 1.0);
//   }
// `;

// /* ------------------------------------------------------------------ */
// /* Helpers                                                             */
// /* ------------------------------------------------------------------ */
// const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// const splitLines = (s) => String(s ?? "").split("\n");

// /** random permutation of the charset (no repeated letters), cut to length */
// function scrambled(len) {
//   const a = CHARSET.split("");
//   for (let i = a.length - 1; i > 0; i--) {
//     const j = (Math.random() * (i + 1)) | 0;
//     [a[i], a[j]] = [a[j], a[i]];
//   }
//   return a.join("").slice(0, Math.max(1, len));
// }

// function wrapWords(ctx, text, maxW) {
//   const lines = [];
//   let cur = "";
//   String(text)
//     .split(" ")
//     .forEach((w) => {
//       const test = cur ? cur + " " + w : w;
//       if (ctx.measureText(test).width > maxW && cur) {
//         lines.push(cur);
//         cur = w;
//       } else cur = test;
//     });
//   if (cur) lines.push(cur);
//   return lines;
// }

// /** info panel text. scr = true -> every value replaced by a scrambled string of same length */
// function paintPanel(ctx, proj, idx, total, scr) {
//   const X = 32 * O;
//   let y = 22 * O;
//   const T = (s) => (scr ? scrambled(s.length) : s);
//   const label = (s) => {
//     ctx.fillStyle = "rgb(90,90,90)";
//     ctx.font = `200 ${23 * O}px 'Oswald','Arial Narrow',sans-serif`;
//     ctx.fillText(s, X, y);
//   };
//   const value = (s, weight, size) => {
//     ctx.fillStyle = "rgb(255,255,255)";
//     ctx.font = `${weight} ${size * O}px ${PANEL_FONT}`;
//     ctx.fillText(s, X, y);
//   };
//   ctx.textBaseline = "alphabetic";

//   value(`WORKS ${idx + 1} / ${total}`, 700, 26);
//   y += 64 * O;
//   label("CLIENT");
//   y += 46 * O;
//   splitLines(proj.client).forEach((l) => {
//     value(T(l), 700, 50);
//     y += 48 * O;
//   });
//   y += 16 * O;
//   label("TYPE");
//   y += 28 * O;
//   value(T(proj.type || ""), 400, 24);
//   y += 64 * O;
//   label("AGENCY");
//   y += 28 * O;
//   const ag = splitLines(proj.agency);
//   ag.forEach((l, i) => {
//     value(T(l), 400, 24);
//     if (i < ag.length - 1) y += 32 * O;
//   });
//   y += 64 * O;
//   label("RELEASE DATE");
//   y += 28 * O;
//   value(T(proj.date || ""), 400, 24);
//   return { yDate: y };
// }

// /** one project's giant title, laid out for a W x H viewport */
// function drawTitle(ctx, proj, W, H, sc) {
//   ctx.setTransform(sc, 0, 0, sc, 0, 0);
//   ctx.clearRect(0, 0, W, H);
//   if (!proj) return;

//   const small = W < 768;
//   const fs = Math.max(56, W * 0.116); // vw based: no upper cap, grows with the screen
//   const lh = fs * 0.92;
//   const lines = (Array.isArray(proj.title) ? proj.title : [proj.title]).map((l) =>
//     typeof l === "string" ? { text: l } : l
//   );
//   const x0 = small ? W * 0.08 : W * 0.41;
//   const blockH = lines.length * lh;
//   const top = (small ? H * 0.4 : H * 0.47) - blockH / 2;

//   ctx.fillStyle = "#fff";
//   ctx.textBaseline = "alphabetic";

//   let blockW = 0;
//   lines.forEach((o, k) => {
//     const size = fs * (o.size || 1);
//     const indent = o.indent ?? (k > 0 ? 0.78 : 0);
//     ctx.font = `700 ${size}px ${TITLE_FONT}`;
//     try {
//       ctx.letterSpacing = `${-0.01 * size}px`;
//     } catch (e) {}
//     const text = o.lower ? o.text : o.text.toUpperCase();
//     ctx.fillText(text, x0 + indent * fs, top + k * lh + 0.912 * fs);
//     blockW = Math.max(blockW, indent * fs + ctx.measureText(text).width);
//   });

//   if (proj.subtitle) {
//     const fsS = Math.max(20, W * 0.035);
//     ctx.font = `italic 200 ${fsS}px ${TITLE_FONT}`;
//     try {
//       ctx.letterSpacing = "0px";
//     } catch (e) {}
//     const side = lines.length >= 3;
//     const sx = side ? x0 + blockW * 0.62 : x0 + blockW * 0.02;
//     const maxW = side ? blockW * 0.58 : fsS * 13;
//     const sy = side ? top + lh + 0.1 * fs + fsS * 0.85 : top + blockH + W * 0.015 + fsS;
//     wrapWords(ctx, proj.subtitle, maxW).forEach((ln, i) =>
//       ctx.fillText(ln, sx, sy + i * fsS * 1.1)
//     );
//   }
// }

// /* ------------------------------------------------------------------ */
// /* Component                                                           */
// /* ------------------------------------------------------------------ */
// export default function ProjectShowcase({
//   projects = DEFAULT_PROJECTS,
//   navItems = DEFAULT_NAV,
//   lenis, // optional: Lenis instance or ref ({ current })
//   intensity = 1, // multiplies delta for the glitch energy
//   wheelGain = 1, // multiplier on the reference wheel scale (1 = exact). lower = more scroll needed
//   touchGain = 5, // touch px -> delta (reference uses 5)
//   stepScale = 1, // scroll distance per project (1 = reference)
//   snapSpeed = 1, // speed of the pull (settle back / go to next). 1 = reference (0.05 per frame)
//   hint = ["To see more of this work,", "press the typography to the right."],
//   onSelect, // (project, index) => void
// }) {
//   const rootRef = useRef(null);
//   const hostRef = useRef(null);
//   const linkRefs = useRef([]);
//   const dotRef = useRef(null);
//   const progressRef = useRef(null);
//   const hoverRef = useRef(false);
//   const lenisRef = useRef(lenis);
//   lenisRef.current = lenis;
//   const n = projects.length;
//   const hintLines = Array.isArray(hint) ? hint : String(hint).split("\n");
//   const hintKey = hintLines.join("|");

//   useLayoutEffect(() => {
//     const root = rootRef.current;
//     const host = hostRef.current;
//     if (!root || !host || n === 0) return;

//     const dpr = Math.min(window.devicePixelRatio || 1, 2);
//     const state = { dirty: true, titleDirty: true, visible: true, W: 1, H: 1, tsc: 1 };

//     /* ---------- fonts ---------- */
//     const markDirty = () => {
//       state.dirty = true;
//       state.titleDirty = true;
//     };
//     const loadFonts = () =>
//       Promise.all(
//         [
//           "700 20px Oswald",
//           "300 13px Oswald",
//           "200 20px Oswald",
//           "italic 200 20px Oswald",
//           "400 20px Padauk",
//           "700 20px Padauk",
//         ].map((f) => document.fonts.load(f))
//       )
//         .then(markDirty)
//         .catch(() => {});
//     let link = document.getElementById("showcase-fonts");
//     if (!link) {
//       link = document.createElement("link");
//       link.id = "showcase-fonts";
//       link.rel = "stylesheet";
//       link.href =
//         "https://fonts.googleapis.com/css2?family=Oswald:wght@200;300;400;700&family=Padauk:wght@400;700&display=swap";
//       document.head.appendChild(link);
//     }
//     link.addEventListener("load", loadFonts);
//     loadFonts();
//     document.fonts.ready.then(markDirty);

//     /* ---------- info panel canvas -> texture ---------- */
//     const panel = document.createElement("canvas");
//     panel.width = CW;
//     panel.height = CH;
//     const pctx = panel.getContext("2d");
//     const tex = new THREE.CanvasTexture(panel);
//     tex.minFilter = THREE.LinearFilter;
//     tex.magFilter = THREE.LinearFilter;
//     tex.generateMipmaps = false;

//     let idx = 0; // committed project (27% rule)
//     let drawnIdx = -1;
//     let texDirty = false;
//     const hintT = { v: 1 };

//     const paintReal = (v = 1) => {
//       pctx.setTransform(1, 0, 0, 1, 0, 0);
//       pctx.clearRect(0, 0, CW, CH);
//       const { yDate } = paintPanel(pctx, projects[idx], idx, n, false);
//       const yH = yDate + 76 * O;
//       pctx.fillStyle = "rgb(150,150,150)";
//       pctx.font = `200 ${20 * O}px ${PANEL_FONT}`;
//       const [l1 = "", l2 = ""] = hintLines;
//       const a1 = Math.floor(v > 0.5 ? l1.length : l1.length * v * 2);
//       const a2 = Math.floor(v < 0.5 ? 0 : l2.length * (v - 0.5) * 2);
//       pctx.fillText(l1.slice(0, a1), 32 * O, yH);
//       pctx.fillText(l2.slice(0, a2), 32 * O, yH + 20 * O);
//       pctx.fillStyle = "rgb(65,65,65)";
//       pctx.fillRect(0, 1 * O, 2 * O, (yH + 22 * O) * v);
//       drawnIdx = idx;
//     };
//     const paintScr = () => {
//       pctx.setTransform(1, 0, 0, 1, 0, 0);
//       pctx.clearRect(0, 0, CW, CH);
//       paintPanel(pctx, projects[idx], idx, n, true);
//     };
//     const startReal = () => {
//       gsap.killTweensOf(hintT);
//       hintT.v = 0;
//       paintReal(0);
//       gsap.to(hintT, {
//         v: 1,
//         duration: 0.5,
//         ease: "power1.out",
//         onUpdate: () => {
//           paintReal(hintT.v);
//           texDirty = true;
//         },
//       });
//     };

//     /* ---------- white bars (canvas rects, tweened) ---------- */
//     const rects = Array.from({ length: 8 }, () => ({ x: 6 * O, y: 0, w: 0, h: 0 }));
//     const startRects = () => {
//       const proj = projects[idx];
//       const cl = Math.min(5, splitLines(proj.client).length);
//       const al = splitLines(proj.agency).length;
//       const extra = 32 * O * Math.max(al - 1, 0);
//       rects.forEach((r) => {
//         gsap.killTweensOf(r);
//         r.x = 6 * O;
//         r.w = 0;
//       });
//       const wipe = (r) =>
//         gsap.fromTo(
//           r,
//           { x: 6 * O, w: 380 * O },
//           {
//             x: 386 * O,
//             w: 0,
//             duration: 0.25,
//             ease: "power4.out",
//             onComplete: () => {
//               r.x = 6 * O;
//               r.w = 0;
//             },
//           }
//         );
//       const sweep = (r, delay) =>
//         gsap.fromTo(
//           r,
//           { w: 0 },
//           { delay, w: 380 * O, duration: 0.4, ease: "power4.in", onComplete: () => wipe(r) }
//         );
//       let c = 0;
//       for (let d = 0; d < cl; d++) {
//         const r = rects[d];
//         r.y = (94 + 48 * d) * O;
//         r.h = 44 * O;
//         sweep(r, c);
//         c += d === 2 ? 0.15 : 0.05;
//       }
//       for (let d = 5; d < 8; d++) {
//         const r = rects[d];
//         r.y = (94 + 48 * cl + 60 + 92 * (d - 5)) * O + (d >= 7 ? extra : 0);
//         r.h = 24 * O;
//         sweep(r, c);
//         c += 0.05;
//       }
//     };
//     const drawRects = () => {
//       pctx.fillStyle = "#fff";
//       rects.forEach((r) => {
//         if (r.w > 0.5) pctx.fillRect(r.x, r.y, r.w, r.h);
//       });
//     };

//     /* ---------- two title canvases: A = lower project, B = next ---------- */
//     const makeTitle = () => {
//       const c = document.createElement("canvas");
//       c.width = 4;
//       c.height = 4;
//       const t = new THREE.CanvasTexture(c);
//       t.minFilter = THREE.LinearFilter;
//       t.magFilter = THREE.LinearFilter;
//       t.generateMipmaps = false;
//       return { c, ctx: c.getContext("2d"), tex: t, idx: -2 };
//     };
//     let TA = makeTitle();
//     let TB = makeTitle();
//     const paintTitle = (T, i) => {
//       T.idx = i;
//       drawTitle(T.ctx, i >= 0 && i < n ? projects[i] : null, state.W, state.H, state.tsc);
//       T.tex.needsUpdate = true;
//     };
//     const ensureTitles = (lo) => {
//       if (state.titleDirty) {
//         paintTitle(TA, lo);
//         paintTitle(TB, lo + 1);
//         state.titleDirty = false;
//       } else if (TA.idx === lo && TB.idx === lo + 1) {
//         // up to date
//       } else if (TB.idx === lo) {
//         [TA, TB] = [TB, TA];
//         paintTitle(TB, lo + 1);
//       } else if (TA.idx === lo + 1) {
//         [TA, TB] = [TB, TA];
//         paintTitle(TA, lo);
//       } else {
//         paintTitle(TA, lo);
//         paintTitle(TB, lo + 1);
//       }
//       uniforms.uTitleA.value = TA.tex;
//       uniforms.uTitleB.value = TB.tex;
//     };

//     /* ---------- three.js ---------- */
//     const renderer = new THREE.WebGLRenderer({
//       antialias: false,
//       powerPreference: "high-performance",
//     });
//     renderer.setClearColor(0x000000, 1);
//     renderer.domElement.className = "block h-full w-full";
//     host.appendChild(renderer.domElement);

//     const scene = new THREE.Scene();
//     const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
//     const uniforms = {
//       uPanel: { value: tex },
//       uTitleA: { value: TA.tex },
//       uTitleB: { value: TB.tex },
//       uRes: { value: new THREE.Vector2(1, 1) },
//       uDpr: { value: dpr },
//       uOrigin: { value: new THREE.Vector2(0, 0) },
//       uPanelSize: { value: new THREE.Vector2(320, 440) },
//       uPanelPos: { value: 0 },
//       uTitleSize: { value: new THREE.Vector2(1, 1) },
//       uTitleStride: { value: 1 },
//       uTitleScroll: { value: 0 },
//       uPow: { value: 0 },
//       uGlitch: { value: 0 },
//       uTime: { value: 0 },
//     };
//     const material = new THREE.ShaderMaterial({
//       vertexShader: VERT,
//       fragmentShader: FRAG,
//       uniforms,
//       depthTest: false,
//       depthWrite: false,
//     });
//     const geometry = new THREE.PlaneGeometry(2, 2);
//     scene.add(new THREE.Mesh(geometry, material));

//     let pos = 0; // virtual scroll position in px
//     let step = 1; // px per project
//     const layout = () => {
//       const w = host.clientWidth || window.innerWidth;
//       const h = host.clientHeight || window.innerHeight;
//       const small = w < 768;
//       const k = small ? 0.5 : w * LAYOUT.kVW; // panel scale follows viewport WIDTH (vw)

//       renderer.setPixelRatio(dpr);
//       renderer.setSize(w, h, false);

//       const tNow = pos / step;
//       // reference: step = 0.5 * canvasHeight, canvas quality = 2 (<= dpr), Windows/Safari 1.5, >2000px wide 1
//       const uaq = navigator.userAgent.toLowerCase();
//       const safari = uaq.includes("safari") && !uaq.includes("chrome") && !uaq.includes("edg");
//       let quality = Math.min(2, window.devicePixelRatio || 1);
//       if (safari) quality = Math.min(1.5, quality);
//       if (uaq.includes("windows")) quality = 1.5;
//       if (w > 2000) quality = 1;
//       step = h * 0.5 * quality * stepScale;
//       pos = tNow * step;

//       uniforms.uRes.value.set(w, h);
//       uniforms.uDpr.value = dpr;
//       uniforms.uPanelSize.value.set(512 * k, 700 * k);
//       uniforms.uOrigin.value.set(small ? 16 : w * LAYOUT.originX, small ? 64 : h * LAYOUT.originY);

//       state.W = w;
//       state.H = h;
//       state.tsc = Math.min(dpr, 1.5, Math.sqrt(12e6 / (w * h)));
//       [TA, TB].forEach((T) => {
//         T.c.width = Math.max(4, Math.round(w * state.tsc));
//         T.c.height = Math.max(4, Math.round(h * state.tsc));
//         T.tex.dispose();
//       });
//       uniforms.uTitleSize.value.set(w, h);
//       uniforms.uTitleStride.value = h * LAYOUT.titleStride;
//       state.dirty = true;
//       state.titleDirty = true;
//     };
//     layout();
//     const ro = new ResizeObserver(layout);
//     ro.observe(host);

//     const io = new IntersectionObserver(
//       ([e]) => {
//         state.visible = e.isIntersecting;
//       },
//       { threshold: 0 }
//     );
//     io.observe(root);

//     /* ---------- virtual scroll input ---------- */
//     const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
//     const LOCK_MS = 350; // swallow momentum right after landing on the section
//     const GAP_MS = 220; // a "fresh gesture" = this long since the last input
//     // ---- exact replica of the reference's SmoothWheel (type "fixed") ----
//     const ua = navigator.userAgent.toLowerCase();
//     const isFF = ua.includes("firefox");
//     const isEdge = ua.includes("edg");
//     const isWin = !(navigator.platform || "").toLowerCase().includes("mac");
//     const DECEL = isWin ? (isFF ? 0.12 : 0.05) : isFF ? 0.16 : 0.13;
//     const MULT = (isWin ? (isFF ? 1.7 : isEdge ? 2 : 1.6) : isFF ? 1.5 : 1.1) * wheelGain;
//     const sw = { scrollPos: 0, current: 0, target: 0, until: 0 };
//     const swReset = () => {
//       sw.scrollPos = sw.current = sw.target = 0;
//       sw.until = 0;
//     };
//     const END = 0.02;
//     const SETTLE_MS = 450; // must rest on the first/last project this long before you can leave
//     const OVER_PX = 140; // ...then this much extra scroll in the same direction lets you out
//     const COOLDOWN_MS = 700; // no re-engage right after leaving
//     let active = false;
//     let engagedAt = 0;
//     let lastInputAt = 0;
//     let lastReleaseAt = 0;
//     let armed = true; // may engage again only after the page has moved out of the pin zone
//     let lastOutside = 0; // -1 = section is below us (we are above it), +1 = we are below it
//     let edgeFreeAt = 0; // last time we were NOT resting on the first/last project
//     let overscroll = 0;
//     const keyTween = { d: 0 };
//     let keyActive = false;

//     const getLenis = () => {
//       const l = lenisRef.current;
//       const inst = l && l.current !== undefined ? l.current : l;
//       return inst && typeof inst.stop === "function" ? inst : null;
//     };
//     const startY = () => root.getBoundingClientRect().top + window.scrollY;

//     const engage = (side) => {
//       if (active) return;
//       active = true;
//       engagedAt = edgeFreeAt = performance.now();
//       overscroll = 0;
//       swReset();
//       const y = startY();
//       const l = getLenis();
//       if (l) {
//         try {
//           l.scrollTo(y, { immediate: true, force: true });
//           l.stop();
//         } catch (e) {}
//       }
//       window.scrollTo({ top: y, behavior: "instant" });
//       pos = side === "top" ? 0 : (n - 1) * step;
//       vp = pos / step;
//       lastDelta = side === "top" ? 1 : -1;
//     };
//     const release = () => {
//       if (!active) return;
//       active = false;
//       armed = false;
//       swReset();
//       keyActive = false;
//       gsap.killTweensOf(keyTween);
//       const l = getLenis();
//       if (l) {
//         try {
//           l.start();
//         } catch (e) {}
//       }
//     };
//     const atTop = () => pos / step <= END;
//     const atEnd = () => pos / step >= n - 1 - END;
//     const edgeDir = (dy) => (dy < 0 && atTop()) || (dy > 0 && atEnd());

//     /* hand scrolling back to the page (first/last project, outward input) */
//     const leave = (dy) => {
//       release();
//       lastReleaseAt = performance.now();
//       const l = getLenis();
//       if (l) {
//         try {
//           l.scrollTo(window.scrollY + Math.sign(dy) * state.H * 0.5, { duration: 0.9 });
//         } catch (e) {}
//       }
//     };
//     // true = we left the section. A fresh gesture leaves at once; a continuous one
//     // needs OVER_PX of extra scroll once the project has settled.
//     const tryLeave = (dy, now, gap) => {
//       if (!edgeDir(dy)) {
//         overscroll = 0;
//         return false;
//       }
//       if (now - engagedAt < LOCK_MS || now - edgeFreeAt < SETTLE_MS) return false;
//       overscroll += Math.abs(dy);
//       if (gap > GAP_MS || overscroll > OVER_PX) {
//         leave(dy);
//         return true;
//       }
//       return false;
//     };

//     /* pin check: state based (not edge based), so slow Lenis tails and fast jumps both pin */
//     const zoneOf = (y, sy) => (y < sy - 2 ? -1 : y > sy + 2 ? 1 : 0);
//     const checkPin = () => {
//       const y = window.scrollY;
//       const sy = startY();
//       const now = performance.now();
//       if (active) {
//         const drift = Math.abs(y - sy);
//         if (drift > 3) {
//           if (drift > state.H * 0.4) {
//             release(); // anchor jump / scrollbar drag far away
//             lastReleaseAt = now;
//           } else {
//             // something nudged us: pin again
//             const l = getLenis();
//             if (l) {
//               try {
//                 l.scrollTo(sy, { immediate: true, force: true });
//               } catch (e) {}
//             }
//             window.scrollTo({ top: sy, behavior: "instant" });
//           }
//         }
//         return;
//       }
//       const z = zoneOf(y, sy);
//       if (armed && now - lastReleaseAt > COOLDOWN_MS && lastOutside !== 0) {
//         // reached the zone, or jumped across it
//         if (z === 0 || z !== lastOutside) {
//           engage(lastOutside < 0 ? "top" : "bottom");
//           return;
//         }
//       }
//       if (z !== 0) {
//         lastOutside = z;
//         armed = true;
//       }
//     };
//     const onScroll = checkPin;
//     window.addEventListener("scroll", onScroll, { passive: true });

//     const onWheel = (e) => {
//       if (!active || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
//       const now = performance.now();
//       const gap = now - lastInputAt;
//       lastInputAt = now;
//       const dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? state.H : 1);
//       if (tryLeave(dy, now, gap)) return; // not prevented -> the page scrolls on
//       e.preventDefault();
//       if (now - engagedAt < LOCK_MS) return;
//       sw.scrollPos = clamp(sw.scrollPos + dy * MULT, sw.current - 2500, sw.current + 2500);
//       sw.until = now + 1000;
//     };

//     let touchY = 0;
//     let touchFresh = false;
//     const onTouchStart = (e) => {
//       if (!active || !e.touches[0]) return;
//       touchY = e.touches[0].clientY;
//       touchFresh = performance.now() - lastInputAt > GAP_MS;
//     };
//     const onTouchMove = (e) => {
//       if (!active || !e.touches[0]) return;
//       const now = performance.now();
//       const y = e.touches[0].clientY;
//       const dy = touchY - y;
//       touchY = y;
//       const tgap = touchFresh ? 1e9 : 0;
//       touchFresh = false;
//       if (tryLeave(dy * 3, now, tgap)) return;
//       lastInputAt = now;
//       if (e.cancelable) e.preventDefault();
//       if (now - engagedAt < LOCK_MS) return;
//       sw.scrollPos = clamp(sw.scrollPos + dy * touchGain, sw.current - 2500, sw.current + 2500);
//       sw.until = now + 1000;
//     };

//     const onKey = (e) => {
//       if (!active) return;
//       const tag = e.target && e.target.tagName;
//       if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target && e.target.isContentEditable)) return;
//       let sgn = 0;
//       if (e.key === "ArrowDown" || e.key === "PageDown") sgn = 1;
//       else if (e.key === "ArrowUp" || e.key === "PageUp") sgn = -1;
//       else if (e.key === " ") sgn = e.shiftKey ? -1 : 1;
//       else return;
//       const now = performance.now();
//       if (edgeDir(sgn) && now - engagedAt > LOCK_MS && now - edgeFreeAt > SETTLE_MS) {
//         leave(sgn);
//         return;
//       }
//       e.preventDefault();
//       if (now - engagedAt < LOCK_MS) return;
//       lastInputAt = now;
//       gsap.killTweensOf(keyTween);
//       keyActive = true;
//       keyTween.d = sgn * 100;
//       gsap.to(keyTween, {
//         d: sgn,
//         duration: 0.5,
//         ease: "power1.out",
//         onComplete: () => {
//           keyActive = false;
//           lastDelta = sgn;
//           keyTween.d = 0;
//         },
//       });
//     };
//     window.addEventListener("wheel", onWheel, { passive: false });
//     window.addEventListener("touchstart", onTouchStart, { passive: true });
//     window.addEventListener("touchmove", onTouchMove, { passive: false });
//     window.addEventListener("keydown", onKey);

//     /* ---------- cursor circle: reference follow = per-frame lerp, c += 0.2 * (target - c) ---------- */
//     const dot = dotRef.current;
//     let setX, setY;
//     let tx = -1000;
//     let ty = -1000;
//     let cx = -1000;
//     let cy = -1000;
//     let seeded = false;
//     if (dot) {
//       gsap.set(dot, { xPercent: -50, yPercent: -50, x: -1000, y: -1000, scale: 0 });
//       setX = gsap.quickSetter(dot, "x", "px");
//       setY = gsap.quickSetter(dot, "y", "px");
//     }
//     const onMove = (e) => {
//       const b = root.getBoundingClientRect();
//       tx = e.clientX - b.left;
//       ty = e.clientY - b.top;
//       if (!seeded) {
//         cx = tx;
//         cy = ty;
//         seeded = true;
//       }
//     };
//     root.addEventListener("pointermove", onMove);

//     /* ---------- render loop ---------- */
//     let energy = 0;
//     let prevE = 0;
//     let vp = 0; // eased position in projects (reference: u_position += 0.1 * (g - u_position))
//     let lastDelta = 1; // reference: GLWheel.delta (keeps its last non-zero value)
//     let snapIdx = 0;
//     let acc = 0;
//     let frameN = 0;

//     const tick = (time) => {
//       checkPin();
//       if (!state.visible) return;
//       const dr = gsap.ticker.deltaRatio(60);
//       if (setX) {
//         // fast move -> circle trails behind; slow down -> it settles exactly on the cursor
//         const k = 1 - Math.pow(1 - 0.2, dr);
//         cx += (tx - cx) * k;
//         cy += (ty - cy) * k;
//         setX(cx);
//         setY(cy);
//       }
//       const now = performance.now();

//       // ---- fixed 60Hz simulation (the reference does all of this once per frame) ----
//       acc += dr;
//       let steps = Math.floor(acc);
//       acc -= steps;
//       steps = Math.min(steps, 5);
//       for (let i = 0; i < steps; i++) {
//         // SmoothWheel: exponential approach to the target, truncated to whole px
//         let d = 0;
//         if (active) {
//           if (keyActive) d = keyTween.d;
//           else if (now < sw.until) {
//             sw.target += ((sw.scrollPos - sw.current) * DECEL) | 0;
//             d = sw.target - sw.current;
//             sw.current = sw.target;
//           }
//         }
//         // 1) input moves you directly
//         if (d !== 0) {
//           lastDelta = d;
//           // elastic ends: input past the first/last project meets growing resistance
//           const maxPos = (n - 1) * step;
//           const over = pos < 0 ? -pos : pos > maxPos ? pos - maxPos : 0;
//           const outward = (pos < 0 && d < 0) || (pos > maxPos && d > 0);
//           const k = outward ? Math.pow(1 - Math.min(over / (0.3 * step), 1), 2) : 1;
//           pos += 0.69 * d * k;
//           if (outward && over > 0.25 * step) sw.scrollPos = sw.current; // drop leftover momentum
//         }
//         // 2) always-on pull to the nearest project (27% bias, direction = last delta)
//         const t0 = pos / step;
//         snapIdx = clamp(lastDelta >= 0 ? Math.floor(t0 + 1 - 0.27) : Math.floor(t0 + 0.27), 0, n - 1);
//         pos += (snapIdx * step - pos) * (reduce ? 0.2 : clamp(0.05 * snapSpeed, 0.01, 0.5));
//         pos = clamp(pos, -0.3 * step, (n - 1 + 0.3) * step);
//         if (!atTop() && !atEnd()) edgeFreeAt = now;
//         // 3) glitch energy: e += 0.003*(|delta|-1); e *= 0.92
//         const sp = Math.abs(d) * intensity; // this step only: no frozen glitch when input stops
//         if (!reduce && sp > 1) energy += 0.003 * (sp - 1);
//         energy = clamp(energy * 0.92, 0, 4);
//       }
//       const t = pos / step;
//       idx = snapIdx;

//       // reference: the TITLE layer follows the position directly (no extra easing);
//       // only the info PANEL layer is eased (u_position += 0.1 * (g - u_position))
//       vp += (t - vp) * (1 - Math.pow(0.9, dr));
//       const lo = n > 1 ? clamp(Math.floor(t), 0, n - 2) : 0;
//       const f = n > 1 ? t - lo : 0;
//       ensureTitles(lo);

//       // ---- panel texture: scramble / bars / real text ----
//       let need = false;
//       if (energy > 0.1 && ++frameN % 2 === 1) {
//         paintScr();
//         need = true;
//       }
//       if (prevE <= 0.1 && energy > 0.1) {
//         gsap.killTweensOf(hintT);
//         startRects();
//       } else if (prevE > 0.1 && energy <= 0.1) {
//         startReal();
//         need = true;
//       }
//       if (energy > 0.1) {
//         drawRects();
//         need = true;
//       }
//       prevE = energy;
//       if (energy <= 0.1 && drawnIdx !== idx) {
//         startReal();
//         need = true;
//       }
//       if (state.dirty) {
//         state.dirty = false;
//         if (energy > 0.1) paintScr();
//         else paintReal(hintT.v);
//         need = true;
//       }
//       if (texDirty) {
//         texDirty = false;
//         need = true;
//       }
//       if (need) tex.needsUpdate = true;

//       uniforms.uPow.value = energy;
//       uniforms.uPanelPos.value = vp;
//       uniforms.uTitleScroll.value = f * uniforms.uTitleStride.value;
//       uniforms.uGlitch.value = hoverRef.current && energy < 0.05 ? 0.003 : 0;
//       uniforms.uTime.value = time;
//       renderer.render(scene, camera);

//       // hit-area only over the resting project
//       const resting = energy <= 0.1 && Math.abs(t - idx) < 0.03;
//       if (!resting && hoverRef.current) {
//         hoverRef.current = false;
//         if (dot) gsap.to(dot, { scale: 0, duration: 0.3, ease: "power3.out", overwrite: "auto" });
//       }
//       for (let i = 0; i < n; i++) {
//         const a = linkRefs.current[i];
//         if (a) a.style.pointerEvents = resting && i === idx ? "auto" : "none";
//       }
//       if (progressRef.current) {
//         progressRef.current.style.transform = `scaleY(${n > 1 ? clamp(t / (n - 1), 0, 1) : 1})`;
//       }
//     };
//     // section already at the top of the page (e.g. it is the first block): engage right away
//     if (Math.abs(window.scrollY - startY()) <= 2) engage("top");

//     gsap.ticker.add(tick);

//     return () => {
//       gsap.ticker.remove(tick);
//       gsap.killTweensOf(hintT);
//       rects.forEach((r) => gsap.killTweensOf(r));
//       release();
//       ro.disconnect();
//       io.disconnect();
//       window.removeEventListener("scroll", onScroll);
//       window.removeEventListener("wheel", onWheel);
//       window.removeEventListener("touchstart", onTouchStart);
//       window.removeEventListener("touchmove", onTouchMove);
//       window.removeEventListener("keydown", onKey);
//       root.removeEventListener("pointermove", onMove);
//       link.removeEventListener("load", loadFonts);
//       geometry.dispose();
//       material.dispose();
//       tex.dispose();
//       TA.tex.dispose();
//       TB.tex.dispose();
//       renderer.dispose();
//       if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [n, intensity, wheelGain, touchGain, stepScale, snapSpeed, hintKey]);

//   const grow = (on) => {
//     hoverRef.current = on;
//     if (dotRef.current) {
//       gsap.to(dotRef.current, { scale: on ? 1 : 0, duration: 0.45, ease: "power3.out", overwrite: "auto" });
//     }
//   };

//   return (
//     <section
//       ref={rootRef}
//       id="works"
//       className="relative h-screen w-full overflow-hidden bg-black text-white"
//     >
//       {/* WebGL layer: titles + tiled info panel + lens */}
//       <div ref={hostRef} className="absolute inset-0 z-0" aria-hidden="true" />

//       {/* Accessible, invisible hit-areas over the title of the current project */}
//       <div className="pointer-events-none absolute inset-0 z-10">
//         {projects.map((p, i) => {
//           const label = (Array.isArray(p.title) ? p.title : [p.title])
//             .map((l) => (typeof l === "string" ? l : l.text))
//             .join(" ");
//           return (
//             <a
//               key={p.id ?? i}
//               ref={(el) => (linkRefs.current[i] = el)}
//               href={p.href || "#"}
//               onClick={(e) => {
//                 if (onSelect) {
//                   e.preventDefault();
//                   onSelect(p, i);
//                 } else if (!p.href) e.preventDefault();
//               }}
//               onMouseEnter={() => grow(true)}
//               onMouseLeave={() => grow(false)}
//               className="pointer-events-none cursor-pointer absolute left-[8%] top-[22%] block h-[44%] w-[84%] md:left-[41%] md:top-[18%] md:h-[58%] md:w-[52%]"
//               style={{ pointerEvents: i === 0 ? "auto" : "none" }}
//             >
//               <span className="sr-only">{`${label}: view project`}</span>
//             </a>
//           );
//         })}
//       </div>

//       {/* Right rail */}
//       <aside
//         className="absolute top-0 z-20 flex h-full flex-col items-center justify-between"
//         style={{ right: "max(12px, 1.25vw)", paddingTop: "max(16px, 1.25vw)", paddingBottom: "max(16px, 1.25vw)" }}
//       >
//         <svg
//           viewBox="0 0 22 26"
//           fill="none"
//           aria-hidden="true"
//           style={{ width: "max(16px, 1.146vw)", height: "auto" }}
//         >
//           {[3, 7, 11, 15, 19].map((x, k) => (
//             <rect
//               key={x}
//               x={x}
//               y={[8, 0, 12, 4, 10][k]}
//               width="1.6"
//               height={[18, 26, 14, 22, 16][k]}
//               fill="#fff"
//             />
//           ))}
//         </svg>

//         <nav className="flex flex-col items-center" style={{ gap: "max(24px, 2.083vw)" }}>
//           {navItems.map((it) => (
//             <a
//               key={it.label}
//               href={it.href}
//               className={`font-normal tracking-[0.18em] transition-opacity hover:opacity-100 [writing-mode:vertical-rl] ${
//                 it.active ? "opacity-100" : "opacity-50"
//               }`}
//               style={{ fontFamily: TITLE_FONT, fontSize: "max(9px, 0.573vw)" }}
//             >
//               {it.label}
//             </a>
//           ))}
//         </nav>

//         <div className="flex flex-col items-center" style={{ gap: "max(8px, 0.625vw)" }}>
//           <span
//             className="font-light tracking-[0.2em] opacity-60 [writing-mode:vertical-rl]"
//             style={{ fontFamily: TITLE_FONT, fontSize: "max(8px, 0.521vw)" }}
//           >
//             SCROLL
//           </span>
//           <div className="relative w-px bg-white/25" style={{ height: "max(64px, 5vw)" }}>
//             <div
//               ref={progressRef}
//               className="absolute inset-0 origin-top bg-white"
//               style={{ transform: "scaleY(0)" }}
//             />
//           </div>
//         </div>
//       </aside>

//       {/* Cursor dot */}
//       <div
//         ref={dotRef}
//         className="pointer-events-none absolute left-0 top-0 z-30 rounded-full bg-white [@media(pointer:coarse)]:hidden"
//         style={{ width: "12.8125vw", height: "12.8125vw" }} /* 246px at 1920px wide */
//         aria-hidden="true"
//       />
//     </section>
//   );
// }













































// "use client";
// /**
//  * ProjectShowcase.jsx  (v6: virtual scroll + continuous magnetic pull)
//  * ---------------------------------------------------------------
//  * Scroll model (same maths as the reference, re-implemented):
//  *
//  *  - The section is a plain 100vh block. When it reaches the top of the page it
//  *    ENGAGES: page scroll is held, and wheel / touch / keys drive a virtual
//  *    position instead.  It RELEASES at the first / last project (on a fresh gesture).
//  *  - every frame:   pos += 0.69 * delta                (input moves you directly)
//  *                   pos += 0.05 * (snapTarget - pos)   (always-on magnetic pull)
//  *    snapTarget = nearest project with a 27% bias in the direction you scroll.
//  *    No idle timer, no threshold animation, no locked transition.
//  *  - delta also feeds the glitch energy:  e += 0.003*(|delta|-1);  e *= 0.92
//  *      e > 0.1 -> scramble + white bars,  e high -> tiles + barrel lens
//  *  - ArrowDown/ArrowUp/PageDown/PageUp/Space = delta 100 -> 1 over 0.5s (about one project)
//  *
//  * Lenis: pass your instance (or ref) as the `lenis` prop so it is held while engaged.
//  * Install:  npm i gsap three     (needs Tailwind CSS)
//  */
// import { memo, useLayoutEffect, useRef } from "react";
// import * as THREE from "three";
// import gsap from "gsap";

// /* ------------------------------------------------------------------ */
// /* Data. client / agency may contain "\n". title line = string or      */
// /* { text, indent, size, lower } (indent/size in em of title size)     */
// /* ------------------------------------------------------------------ */
// const DEFAULT_PROJECTS = [
//   {
//     title: ["TIDAL", "ATLAS"],
//     client: "Northwind",
//     type: "Websites",
//     agency: "Studio Ono",
//     date: "March 2025",
//     href: "#",
//   },
//   {
//     title: ["PAPER", "ORBIT"],
//     client: "Halden\nMuseum",
//     type: "Installations",
//     agency: "In-house",
//     date: "July 2024",
//     href: "#",
//   },
//   {
//     title: ["WORLD", "MAKER", { text: "β version", indent: 0.05, size: 0.88, lower: true }],
//     client: "Kite Games",
//     type: "Websites",
//     agency: "Fieldwork",
//     date: "September 2023",
//     href: "#",
//   },
//   {
//     title: ["LOW", "TIDE"],
//     client: "Meridian Bank",
//     type: "Apps",
//     agency: "Brightside",
//     date: "May 2022",
//     href: "#",
//   },
//   {
//     title: ["KAJIMA", "DX", "LABO"],
//     subtitle: "A birds-eye glimpse of the entire Naruse Dam",
//     client: "Kajima\nCorporation",
//     type: "Websites / XR",
//     agency: "Pylon\nStudio",
//     date: "December 2021",
//     href: "#",
//   },
//   {
//     title: ["AFTER", "IMAGE"],
//     client: "Oku Watches",
//     type: "Websites",
//     agency: "Cherry & Co",
//     date: "August 2020",
//     href: "#",
//   },
// ];

// const DEFAULT_NAV = [
//   { label: "WORKS", href: "#works", active: true },
//   { label: "ABOUT", href: "#about" },
//   { label: "CONTACT", href: "#contact" },
// ];

// const TITLE_FONT = "'Oswald','Arial Narrow',Impact,sans-serif";
// const PANEL_FONT = "'Padauk','Helvetica Neue',Arial,sans-serif";
// const CHARSET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789[]#&%=-";

// /* info panel is drawn on a 512x700 (base units) canvas at O x */
// const O = 2;
// const CW = 512 * O;
// const CH = 700 * O;

// /* layout numbers measured from the reference frames */
// const LAYOUT = {
//   originX: 0.1717, // panel left, fraction of width
//   originY: 0.216, // panel top, fraction of height
//   kH: 0.000757, // panel scale per px of viewport height
//   kVW: 0.00039, // panel scale per px of viewport width (= 0.75 at 1920px)
//   titleStride: 1.1407, // distance between two titles, in viewport heights
// };

// /* ------------------------------------------------------------------ */
// /* GLSL (one full-screen pass: titles + tiled panel, then the lens)    */
// /* ------------------------------------------------------------------ */
// const VERT = /* glsl */ `
//   void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }
// `;

// const FRAG = /* glsl */ `
//   precision highp float;
//   uniform sampler2D uPanel;
//   uniform sampler2D uTitleA;
//   uniform sampler2D uTitleB;
//   uniform vec2  uRes;          // css px
//   uniform float uDpr;
//   uniform vec2  uOrigin;       // panel top-left, css px
//   uniform vec2  uPanelSize;    // panel size, css px
//   uniform float uPanelPos;     // scroll position in projects (eased)
//   uniform vec2  uTitleSize;
//   uniform float uTitleStride;
//   uniform float uTitleScroll;  // px the title drum has moved
//   uniform float uPow;          // scroll energy
//   uniform float uGlitch;       // hover flicker
//   uniform float uTime;

//   float rnd(vec2 st){ return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453123); }
//   float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
//   float vn(vec2 p){
//     vec2 i = floor(p), f = fract(p);
//     float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
//     vec2 u = f * f * (3.0 - 2.0 * f);
//     return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
//   }
//   float fbm(vec2 p){
//     float v = 0.0, a = 0.5;
//     mat2 r = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
//     for (int i = 0; i < 4; i++){ v += a * vn(p); p = r * p * 2.0 + vec2(100.0); a *= 0.5; }
//     return v;
//   }

//   // Brown-Conrady lens
//   vec2 lens(vec2 uv, float d){
//     uv = uv * 2.0 - 1.0;
//     float r2 = dot(uv, uv);
//     uv *= 1.0 + 0.11 * d * r2 - 0.02375 * d * r2 * r2;
//     return uv * 0.5 + 0.5;
//   }

//   void main(){
//     vec2 sp = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;  // css px, top-left
//     vec2 uv = sp / uRes;

//     // ---- whole-frame barrel distortion, edges re-mapped so no black borders ----
//     float dp = min(uPow * 5.5, 8.0);
//     float au = min(dp * 0.01, 0.2);
//     float av = min(dp * 0.015, 0.2);
//     uv = lens(uv, dp);
//     vec2 mn = lens(vec2(-au, -av), dp);
//     vec2 mx = lens(vec2(1.0 + au, 1.0 + av), dp);
//     uv = (uv - mn) / (mx - mn);
//     vec2 P  = uv * uRes;     // position in flat "content" space (css px)
//     vec2 uc = uv;            // content uv (for the static noise / centre distance)

//     // ---- titles (two stacked: current + next) ----
//     vec2  tc = vec2(P.x, P.y + uTitleScroll);
//     float gm = 1.0;
//     if (uGlitch > 0.0 && uPow < 0.05) {
//       float r = rnd(vec2(uc.y) * (0.5 + fract(uTime * 0.37)));
//       tc.x += (r - 0.5) * uGlitch * uRes.x;
//       gm = clamp(pow(r, 0.05), 0.0, 0.98);
//     }
//     float yA = tc.y;
//     float yB = tc.y - uTitleStride;
//     float inX = step(0.0, tc.x) * step(tc.x, uTitleSize.x);
//     float mA = inX * step(0.0, yA) * step(yA, uTitleSize.y);
//     float mB = inX * step(0.0, yB) * step(yB, uTitleSize.y);
//     float tA = texture2D(uTitleA, clamp(vec2(tc.x / uTitleSize.x, 1.0 - yA / uTitleSize.y), 0.0, 1.0)).a * mA;
//     float tB = texture2D(uTitleB, clamp(vec2(tc.x / uTitleSize.x, 1.0 - yB / uTitleSize.y), 0.0, 1.0)).a * mB;
//     float title = max(tA, tB) * gm;

//     // ---- info panel: ONE texture, repeated; main tile always visible ----
//     vec2 q = uc - uOrigin / uRes;
//     q = (q - 0.25) * (uPow * 0.8 + 1.0) + 0.25;      // tiles pull away from the centre with speed
//     vec2 g = q * uRes / uPanelSize;                  // panel units, top-left
//     float screenGy = g.y;
//     g.y += uPanelPos * 2.0;                          // 2 panel heights per project

//     float inMain = step(0.0, g.x) * step(g.x, 1.0)
//                  * step(mod(g.y, 2.0), 1.0)
//                  * step(-0.5, screenGy) * step(screenGy, 1.5);

//     vec4 tx = texture2D(uPanel, vec2(fract(g.x), 1.0 - fract(g.y)));
//     float panel = tx.r * tx.a;

//     if (inMain < 0.5) {
//       // static noise + distance from centre decide which repeats are revealed
//       float noise = 0.8 * fbm(uc * 10.0);
//       float t = clamp(clamp(1.0 - length(uc - 0.5), 0.0, 1.0) * uPow * 0.1, 0.0, 1.0);
//       float v = pow(max(noise * t, 1e-6), 0.3) + t;
//       if (v < 0.2) {
//         vec2 gj = g - (noise - 0.2) * 0.06;          // torn, dim edge of the dissolve
//         vec4 t2 = texture2D(uPanel, vec2(fract(gj.x), 1.0 - fract(gj.y)));
//         panel = t2.r * pow(v * 2.7, 2.0) * 0.9;
//       }
//     }
//     panel *= max(0.0, 1.0 - uPow * 0.2);

//     float a = clamp(panel + title, 0.0, 1.0);
//     gl_FragColor = vec4(vec3(a), 1.0);
//   }
// `;

// /* ------------------------------------------------------------------ */
// /* Helpers                                                             */
// /* ------------------------------------------------------------------ */
// const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// const splitLines = (s) => String(s ?? "").split("\n");

// /** random permutation of the charset (no repeated letters), cut to length */
// const POOL = CHARSET.split("");
// function scrambled(len) {
//   const m = Math.min(Math.max(1, len), POOL.length);
//   let out = "";
//   for (let i = 0; i < m; i++) {
//     const j = i + ((Math.random() * (POOL.length - i)) | 0);
//     const tmp = POOL[i];
//     POOL[i] = POOL[j];
//     POOL[j] = tmp;
//     out += POOL[i];
//   }
//   return out;
// }

// function wrapWords(ctx, text, maxW) {
//   const lines = [];
//   let cur = "";
//   String(text)
//     .split(" ")
//     .forEach((w) => {
//       const test = cur ? cur + " " + w : w;
//       if (ctx.measureText(test).width > maxW && cur) {
//         lines.push(cur);
//         cur = w;
//       } else cur = test;
//     });
//   if (cur) lines.push(cur);
//   return lines;
// }

// /** info panel text. scr = true -> every value replaced by a scrambled string of same length */
// function paintPanel(ctx, proj, idx, total, scr) {
//   const X = 32 * O;
//   let y = 22 * O;
//   const T = (s) => (scr ? scrambled(s.length) : s);
//   const label = (s) => {
//     ctx.fillStyle = "rgb(90,90,90)";
//     ctx.font = `200 ${23 * O}px 'Oswald','Arial Narrow',sans-serif`;
//     ctx.fillText(s, X, y);
//   };
//   const value = (s, weight, size) => {
//     ctx.fillStyle = "rgb(255,255,255)";
//     ctx.font = `${weight} ${size * O}px ${PANEL_FONT}`;
//     ctx.fillText(s, X, y);
//   };
//   ctx.textBaseline = "alphabetic";

//   value(`WORKS ${idx + 1} / ${total}`, 700, 26);
//   y += 64 * O;
//   label("CLIENT");
//   y += 46 * O;
//   splitLines(proj.client).forEach((l) => {
//     value(T(l), 700, 50);
//     y += 48 * O;
//   });
//   y += 16 * O;
//   label("TYPE");
//   y += 28 * O;
//   value(T(proj.type || ""), 400, 24);
//   y += 64 * O;
//   label("AGENCY");
//   y += 28 * O;
//   const ag = splitLines(proj.agency);
//   ag.forEach((l, i) => {
//     value(T(l), 400, 24);
//     if (i < ag.length - 1) y += 32 * O;
//   });
//   y += 64 * O;
//   label("RELEASE DATE");
//   y += 28 * O;
//   value(T(proj.date || ""), 400, 24);
//   return { yDate: y };
// }

// /** one project's giant title, laid out for a W x H viewport */
// function drawTitle(ctx, proj, W, H, sc) {
//   ctx.setTransform(sc, 0, 0, sc, 0, 0);
//   ctx.clearRect(0, 0, W, H);
//   if (!proj) return;

//   const small = W < 768;
//   const fs = Math.max(56, W * 0.116); // vw based: no upper cap, grows with the screen
//   const lh = fs * 0.92;
//   const lines = (Array.isArray(proj.title) ? proj.title : [proj.title]).map((l) =>
//     typeof l === "string" ? { text: l } : l
//   );
//   const x0 = small ? W * 0.08 : W * 0.41;
//   const blockH = lines.length * lh;
//   const top = (small ? H * 0.4 : H * 0.47) - blockH / 2;

//   ctx.fillStyle = "#fff";
//   ctx.textBaseline = "alphabetic";

//   let blockW = 0;
//   lines.forEach((o, k) => {
//     const size = fs * (o.size || 1);
//     const indent = o.indent ?? (k > 0 ? 0.78 : 0);
//     ctx.font = `700 ${size}px ${TITLE_FONT}`;
//     try {
//       ctx.letterSpacing = `${-0.01 * size}px`;
//     } catch (e) {}
//     const text = o.lower ? o.text : o.text.toUpperCase();
//     ctx.fillText(text, x0 + indent * fs, top + k * lh + 0.912 * fs);
//     blockW = Math.max(blockW, indent * fs + ctx.measureText(text).width);
//   });

//   if (proj.subtitle) {
//     const fsS = Math.max(20, W * 0.035);
//     ctx.font = `italic 200 ${fsS}px ${TITLE_FONT}`;
//     try {
//       ctx.letterSpacing = "0px";
//     } catch (e) {}
//     const side = lines.length >= 3;
//     const sx = side ? x0 + blockW * 0.62 : x0 + blockW * 0.02;
//     const maxW = side ? blockW * 0.58 : fsS * 13;
//     const sy = side ? top + lh + 0.1 * fs + fsS * 0.85 : top + blockH + W * 0.015 + fsS;
//     wrapWords(ctx, proj.subtitle, maxW).forEach((ln, i) =>
//       ctx.fillText(ln, sx, sy + i * fsS * 1.1)
//     );
//   }
// }

// /* ------------------------------------------------------------------ */
// /* Component                                                           */
// /* ------------------------------------------------------------------ */
// function ProjectShowcase({
//   projects = DEFAULT_PROJECTS,
//   navItems = DEFAULT_NAV,
//   lenis, // optional: Lenis instance or ref ({ current })
//   intensity = 1, // multiplies delta for the glitch energy
//   wheelGain = 1, // multiplier on the reference wheel scale (1 = exact). lower = more scroll needed
//   touchGain = 5, // touch px -> delta (reference uses 5)
//   stepScale = 1, // scroll distance per project (1 = reference)
//   snapSpeed = 1, // speed of the pull (settle back / go to next). 1 = reference (0.05 per frame)
//   hint = ["To see more of this work,", "press the typography to the right."],
//   onSelect, // (project, index) => void
// }) {
//   const rootRef = useRef(null);
//   const hostRef = useRef(null);
//   const linkRefs = useRef([]);
//   const dotRef = useRef(null);
//   const progressRef = useRef(null);
//   const hoverRef = useRef(false);
//   const lenisRef = useRef(lenis);
//   lenisRef.current = lenis;
//   const n = projects.length;
//   const hintLines = Array.isArray(hint) ? hint : String(hint).split("\n");
//   const hintKey = hintLines.join("|");

//   useLayoutEffect(() => {
//     const root = rootRef.current;
//     const host = hostRef.current;
//     if (!root || !host || n === 0) return;

//     const dpr = Math.min(window.devicePixelRatio || 1, 2);
//     const state = { dirty: true, titleDirty: true, visible: true, W: 1, H: 1, tsc: 1, force: true };

//     /* ---------- fonts ---------- */
//     const markDirty = () => {
//       state.dirty = true;
//       state.titleDirty = true;
//     };
//     const loadFonts = () =>
//       Promise.all(
//         [
//           "700 20px Oswald",
//           "300 13px Oswald",
//           "200 20px Oswald",
//           "italic 200 20px Oswald",
//           "400 20px Padauk",
//           "700 20px Padauk",
//         ].map((f) => document.fonts.load(f))
//       )
//         .then(markDirty)
//         .catch(() => {});
//     let link = document.getElementById("showcase-fonts");
//     if (!link) {
//       link = document.createElement("link");
//       link.id = "showcase-fonts";
//       link.rel = "stylesheet";
//       link.href =
//         "https://fonts.googleapis.com/css2?family=Oswald:wght@200;300;400;700&family=Padauk:wght@400;700&display=swap";
//       document.head.appendChild(link);
//     }
//     link.addEventListener("load", loadFonts);
//     loadFonts();
//     document.fonts.ready.then(markDirty);

//     /* ---------- info panel canvas -> texture ---------- */
//     const panel = document.createElement("canvas");
//     panel.width = CW;
//     panel.height = CH;
//     const pctx = panel.getContext("2d");
//     const tex = new THREE.CanvasTexture(panel);
//     tex.minFilter = THREE.LinearFilter;
//     tex.magFilter = THREE.LinearFilter;
//     tex.generateMipmaps = false;

//     let idx = 0; // committed project (27% rule)
//     let drawnIdx = -1;
//     let texDirty = false;
//     const hintT = { v: 1 };

//     const paintReal = (v = 1) => {
//       pctx.setTransform(1, 0, 0, 1, 0, 0);
//       pctx.clearRect(0, 0, CW, CH);
//       const { yDate } = paintPanel(pctx, projects[idx], idx, n, false);
//       const yH = yDate + 76 * O;
//       pctx.fillStyle = "rgb(150,150,150)";
//       pctx.font = `200 ${20 * O}px ${PANEL_FONT}`;
//       const [l1 = "", l2 = ""] = hintLines;
//       const a1 = Math.floor(v > 0.5 ? l1.length : l1.length * v * 2);
//       const a2 = Math.floor(v < 0.5 ? 0 : l2.length * (v - 0.5) * 2);
//       pctx.fillText(l1.slice(0, a1), 32 * O, yH);
//       pctx.fillText(l2.slice(0, a2), 32 * O, yH + 20 * O);
//       pctx.fillStyle = "rgb(65,65,65)";
//       pctx.fillRect(0, 1 * O, 2 * O, (yH + 22 * O) * v);
//       drawnIdx = idx;
//     };
//     const paintScr = () => {
//       pctx.setTransform(1, 0, 0, 1, 0, 0);
//       pctx.clearRect(0, 0, CW, CH);
//       paintPanel(pctx, projects[idx], idx, n, true);
//     };
//     const startReal = () => {
//       gsap.killTweensOf(hintT);
//       hintT.v = 0;
//       paintReal(0);
//       gsap.to(hintT, {
//         v: 1,
//         duration: 0.5,
//         ease: "power1.out",
//         onUpdate: () => {
//           paintReal(hintT.v);
//           texDirty = true;
//         },
//       });
//     };

//     /* ---------- white bars (canvas rects, tweened) ---------- */
//     const rects = Array.from({ length: 8 }, () => ({ x: 6 * O, y: 0, w: 0, h: 0 }));
//     const startRects = () => {
//       const proj = projects[idx];
//       const cl = Math.min(5, splitLines(proj.client).length);
//       const al = splitLines(proj.agency).length;
//       const extra = 32 * O * Math.max(al - 1, 0);
//       rects.forEach((r) => {
//         gsap.killTweensOf(r);
//         r.x = 6 * O;
//         r.w = 0;
//       });
//       const wipe = (r) =>
//         gsap.fromTo(
//           r,
//           { x: 6 * O, w: 380 * O },
//           {
//             x: 386 * O,
//             w: 0,
//             duration: 0.25,
//             ease: "power4.out",
//             onComplete: () => {
//               r.x = 6 * O;
//               r.w = 0;
//             },
//           }
//         );
//       const sweep = (r, delay) =>
//         gsap.fromTo(
//           r,
//           { w: 0 },
//           { delay, w: 380 * O, duration: 0.4, ease: "power4.in", onComplete: () => wipe(r) }
//         );
//       let c = 0;
//       for (let d = 0; d < cl; d++) {
//         const r = rects[d];
//         r.y = (94 + 48 * d) * O;
//         r.h = 44 * O;
//         sweep(r, c);
//         c += d === 2 ? 0.15 : 0.05;
//       }
//       for (let d = 5; d < 8; d++) {
//         const r = rects[d];
//         r.y = (94 + 48 * cl + 60 + 92 * (d - 5)) * O + (d >= 7 ? extra : 0);
//         r.h = 24 * O;
//         sweep(r, c);
//         c += 0.05;
//       }
//     };
//     const drawRects = () => {
//       pctx.fillStyle = "#fff";
//       rects.forEach((r) => {
//         if (r.w > 0.5) pctx.fillRect(r.x, r.y, r.w, r.h);
//       });
//     };

//     /* ---------- two title canvases: A = lower project, B = next ---------- */
//     const makeTitle = () => {
//       const c = document.createElement("canvas");
//       c.width = 4;
//       c.height = 4;
//       const t = new THREE.CanvasTexture(c);
//       t.minFilter = THREE.LinearFilter;
//       t.magFilter = THREE.LinearFilter;
//       t.generateMipmaps = false;
//       return { c, ctx: c.getContext("2d"), tex: t, idx: -2 };
//     };
//     let TA = makeTitle();
//     let TB = makeTitle();
//     const paintTitle = (T, i) => {
//       T.idx = i;
//       drawTitle(T.ctx, i >= 0 && i < n ? projects[i] : null, state.W, state.H, state.tsc);
//       T.tex.needsUpdate = true;
//     };
//     const ensureTitles = (lo) => {
//       let painted = true;
//       if (state.titleDirty) {
//         paintTitle(TA, lo);
//         paintTitle(TB, lo + 1);
//         state.titleDirty = false;
//       } else if (TA.idx === lo && TB.idx === lo + 1) {
//         painted = false; // up to date
//       } else if (TB.idx === lo) {
//         [TA, TB] = [TB, TA];
//         paintTitle(TB, lo + 1);
//       } else if (TA.idx === lo + 1) {
//         [TA, TB] = [TB, TA];
//         paintTitle(TA, lo);
//       } else {
//         paintTitle(TA, lo);
//         paintTitle(TB, lo + 1);
//       }
//       uniforms.uTitleA.value = TA.tex;
//       uniforms.uTitleB.value = TB.tex;
//       return painted;
//     };

//     /* ---------- three.js ---------- */
//     const renderer = new THREE.WebGLRenderer({
//       antialias: false,
//       alpha: false,
//       depth: false,
//       stencil: false,
//       powerPreference: "high-performance",
//     });
//     renderer.setClearColor(0x000000, 1);
//     const onCtxLost = (e) => e.preventDefault();
//     const onCtxRestored = () => {
//       state.force = true;
//       state.dirty = true;
//       state.titleDirty = true;
//       tex.needsUpdate = true;
//     };
//     renderer.domElement.addEventListener("webglcontextlost", onCtxLost);
//     renderer.domElement.addEventListener("webglcontextrestored", onCtxRestored);
//     renderer.domElement.className = "block h-full w-full";
//     host.appendChild(renderer.domElement);

//     const scene = new THREE.Scene();
//     const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
//     const uniforms = {
//       uPanel: { value: tex },
//       uTitleA: { value: TA.tex },
//       uTitleB: { value: TB.tex },
//       uRes: { value: new THREE.Vector2(1, 1) },
//       uDpr: { value: dpr },
//       uOrigin: { value: new THREE.Vector2(0, 0) },
//       uPanelSize: { value: new THREE.Vector2(320, 440) },
//       uPanelPos: { value: 0 },
//       uTitleSize: { value: new THREE.Vector2(1, 1) },
//       uTitleStride: { value: 1 },
//       uTitleScroll: { value: 0 },
//       uPow: { value: 0 },
//       uGlitch: { value: 0 },
//       uTime: { value: 0 },
//     };
//     const material = new THREE.ShaderMaterial({
//       vertexShader: VERT,
//       fragmentShader: FRAG,
//       uniforms,
//       depthTest: false,
//       depthWrite: false,
//     });
//     const geometry = new THREE.PlaneGeometry(2, 2);
//     scene.add(new THREE.Mesh(geometry, material));

//     let pos = 0; // virtual scroll position in px
//     let step = 1; // px per project
//     // light part: runs on every resize frame (renderer size, uniforms, scroll step)
//     const layout = () => {
//       const w = host.clientWidth || window.innerWidth;
//       const h = host.clientHeight || window.innerHeight;
//       const small = w < 768;
//       const k = small ? 0.5 : w * LAYOUT.kVW; // panel scale follows viewport WIDTH (vw)

//       renderer.setPixelRatio(dpr);
//       renderer.setSize(w, h, false);

//       const tNow = pos / step;
//       // reference: step = 0.5 * canvasHeight, canvas quality = 2 (<= dpr), Windows/Safari 1.5, >2000px wide 1
//       const uaq = navigator.userAgent.toLowerCase();
//       const safari = uaq.includes("safari") && !uaq.includes("chrome") && !uaq.includes("edg");
//       let quality = Math.min(2, window.devicePixelRatio || 1);
//       if (safari) quality = Math.min(1.5, quality);
//       if (uaq.includes("windows")) quality = 1.5;
//       if (w > 2000) quality = 1;
//       step = h * 0.5 * quality * stepScale;
//       pos = tNow * step;

//       uniforms.uRes.value.set(w, h);
//       uniforms.uDpr.value = dpr;
//       uniforms.uPanelSize.value.set(512 * k, 700 * k);
//       uniforms.uOrigin.value.set(small ? 16 : w * LAYOUT.originX, small ? 64 : h * LAYOUT.originY);
//       state.force = true;
//     };
//     // heavy part: title canvases are re-allocated + repainted only once resizing settles
//     let resizeTimer = 0;
//     const layoutHeavy = () => {
//       const w = host.clientWidth || window.innerWidth;
//       const h = host.clientHeight || window.innerHeight;
//       state.W = w;
//       state.H = h;
//       state.tsc = Math.min(dpr, 1.5, Math.sqrt(12e6 / (w * h)));
//       [TA, TB].forEach((T) => {
//         T.c.width = Math.max(4, Math.round(w * state.tsc));
//         T.c.height = Math.max(4, Math.round(h * state.tsc));
//         T.tex.dispose();
//       });
//       uniforms.uTitleSize.value.set(w, h);
//       uniforms.uTitleStride.value = h * LAYOUT.titleStride;
//       state.dirty = true;
//       state.titleDirty = true;
//       state.force = true;
//     };
//     const onResize = () => {
//       layout();
//       clearTimeout(resizeTimer);
//       resizeTimer = setTimeout(layoutHeavy, 150);
//     };
//     layout();
//     layoutHeavy();
//     const ro = new ResizeObserver(onResize);
//     ro.observe(host);

//     const io = new IntersectionObserver(
//       ([e]) => {
//         state.visible = e.isIntersecting;
//         if (e.isIntersecting) state.force = true; // redraw when it comes back into view
//       },
//       { threshold: 0 }
//     );
//     io.observe(root);

//     /* ---------- virtual scroll input ---------- */
//     const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
//     const LOCK_MS = 350; // swallow momentum right after landing on the section
//     const GAP_MS = 220; // a "fresh gesture" = this long since the last input
//     // ---- exact replica of the reference's SmoothWheel (type "fixed") ----
//     const ua = navigator.userAgent.toLowerCase();
//     const isFF = ua.includes("firefox");
//     const isEdge = ua.includes("edg");
//     const isWin = !(navigator.platform || "").toLowerCase().includes("mac");
//     const DECEL = isWin ? (isFF ? 0.12 : 0.05) : isFF ? 0.16 : 0.13;
//     const MULT = (isWin ? (isFF ? 1.7 : isEdge ? 2 : 1.6) : isFF ? 1.5 : 1.1) * wheelGain;
//     const sw = { scrollPos: 0, current: 0, target: 0, until: 0 };
//     const swReset = () => {
//       sw.scrollPos = sw.current = sw.target = 0;
//       sw.until = 0;
//     };
//     const END = 0.02;
//     const SETTLE_MS = 450; // must rest on the first/last project this long before you can leave
//     const OVER_PX = 140; // ...then this much extra scroll in the same direction lets you out
//     const COOLDOWN_MS = 700; // no re-engage right after leaving
//     let active = false;
//     let engagedAt = 0;
//     let lastInputAt = 0;
//     let lastReleaseAt = 0;
//     let armed = true; // may engage again only after the page has moved out of the pin zone
//     let lastOutside = 0; // -1 = section is below us (we are above it), +1 = we are below it
//     let edgeFreeAt = 0; // last time we were NOT resting on the first/last project
//     let overscroll = 0;
//     const keyTween = { d: 0 };
//     let keyActive = false;

//     const getLenis = () => {
//       const l = lenisRef.current;
//       const inst = l && l.current !== undefined ? l.current : l;
//       return inst && typeof inst.stop === "function" ? inst : null;
//     };
//     const startY = () => root.getBoundingClientRect().top + window.scrollY;

//     const engage = (side) => {
//       if (active) return;
//       active = true;
//       engagedAt = edgeFreeAt = performance.now();
//       overscroll = 0;
//       swReset();
//       const y = startY();
//       const l = getLenis();
//       if (l) {
//         try {
//           l.scrollTo(y, { immediate: true, force: true });
//           l.stop();
//         } catch (e) {}
//       }
//       window.scrollTo({ top: y, behavior: "instant" });
//       pos = side === "top" ? 0 : (n - 1) * step;
//       vp = pos / step;
//       lastDelta = side === "top" ? 1 : -1;
//     };
//     const release = () => {
//       if (!active) return;
//       active = false;
//       armed = false;
//       swReset();
//       keyActive = false;
//       gsap.killTweensOf(keyTween);
//       const l = getLenis();
//       if (l) {
//         try {
//           l.start();
//         } catch (e) {}
//       }
//     };
//     const atTop = () => pos / step <= END;
//     const atEnd = () => pos / step >= n - 1 - END;
//     const edgeDir = (dy) => (dy < 0 && atTop()) || (dy > 0 && atEnd());

//     /* hand scrolling back to the page (first/last project, outward input) */
//     const leave = (dy) => {
//       release();
//       lastReleaseAt = performance.now();
//       const l = getLenis();
//       if (l) {
//         try {
//           l.scrollTo(window.scrollY + Math.sign(dy) * state.H * 0.5, { duration: 0.9 });
//         } catch (e) {}
//       }
//     };
//     // true = we left the section. A fresh gesture leaves at once; a continuous one
//     // needs OVER_PX of extra scroll once the project has settled.
//     const tryLeave = (dy, now, gap) => {
//       if (!edgeDir(dy)) {
//         overscroll = 0;
//         return false;
//       }
//       if (now - engagedAt < LOCK_MS || now - edgeFreeAt < SETTLE_MS) return false;
//       overscroll += Math.abs(dy);
//       if (gap > GAP_MS || overscroll > OVER_PX) {
//         leave(dy);
//         return true;
//       }
//       return false;
//     };

//     /* pin check: state based (not edge based), so slow Lenis tails and fast jumps both pin */
//     const zoneOf = (y, sy) => (y < sy - 2 ? -1 : y > sy + 2 ? 1 : 0);
//     const checkPin = () => {
//       const y = window.scrollY;
//       const sy = startY();
//       const now = performance.now();
//       if (active) {
//         const drift = Math.abs(y - sy);
//         if (drift > 3) {
//           if (drift > state.H * 0.4) {
//             release(); // anchor jump / scrollbar drag far away
//             lastReleaseAt = now;
//           } else {
//             // something nudged us: pin again
//             const l = getLenis();
//             if (l) {
//               try {
//                 l.scrollTo(sy, { immediate: true, force: true });
//               } catch (e) {}
//             }
//             window.scrollTo({ top: sy, behavior: "instant" });
//           }
//         }
//         return;
//       }
//       const z = zoneOf(y, sy);
//       if (armed && now - lastReleaseAt > COOLDOWN_MS && lastOutside !== 0) {
//         // reached the zone, or jumped across it
//         if (z === 0 || z !== lastOutside) {
//           engage(lastOutside < 0 ? "top" : "bottom");
//           return;
//         }
//       }
//       if (z !== 0) {
//         lastOutside = z;
//         armed = true;
//       }
//     };
//     const onScroll = checkPin;
//     window.addEventListener("scroll", onScroll, { passive: true });

//     const onWheel = (e) => {
//       if (!active || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
//       const now = performance.now();
//       const gap = now - lastInputAt;
//       lastInputAt = now;
//       const dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? state.H : 1);
//       if (tryLeave(dy, now, gap)) return; // not prevented -> the page scrolls on
//       e.preventDefault();
//       if (now - engagedAt < LOCK_MS) return;
//       sw.scrollPos = clamp(sw.scrollPos + dy * MULT, sw.current - 2500, sw.current + 2500);
//       sw.until = now + 1000;
//     };

//     let touchY = 0;
//     let touchFresh = false;
//     const onTouchStart = (e) => {
//       if (!active || !e.touches[0]) return;
//       touchY = e.touches[0].clientY;
//       touchFresh = performance.now() - lastInputAt > GAP_MS;
//     };
//     const onTouchMove = (e) => {
//       if (!active || !e.touches[0]) return;
//       const now = performance.now();
//       const y = e.touches[0].clientY;
//       const dy = touchY - y;
//       touchY = y;
//       const tgap = touchFresh ? 1e9 : 0;
//       touchFresh = false;
//       if (tryLeave(dy * 3, now, tgap)) return;
//       lastInputAt = now;
//       if (e.cancelable) e.preventDefault();
//       if (now - engagedAt < LOCK_MS) return;
//       sw.scrollPos = clamp(sw.scrollPos + dy * touchGain, sw.current - 2500, sw.current + 2500);
//       sw.until = now + 1000;
//     };

//     const onKey = (e) => {
//       if (!active) return;
//       const tag = e.target && e.target.tagName;
//       if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target && e.target.isContentEditable)) return;
//       let sgn = 0;
//       if (e.key === "ArrowDown" || e.key === "PageDown") sgn = 1;
//       else if (e.key === "ArrowUp" || e.key === "PageUp") sgn = -1;
//       else if (e.key === " ") sgn = e.shiftKey ? -1 : 1;
//       else return;
//       const now = performance.now();
//       if (edgeDir(sgn) && now - engagedAt > LOCK_MS && now - edgeFreeAt > SETTLE_MS) {
//         leave(sgn);
//         return;
//       }
//       e.preventDefault();
//       if (now - engagedAt < LOCK_MS) return;
//       lastInputAt = now;
//       gsap.killTweensOf(keyTween);
//       keyActive = true;
//       keyTween.d = sgn * 100;
//       gsap.to(keyTween, {
//         d: sgn,
//         duration: 0.5,
//         ease: "power1.out",
//         onComplete: () => {
//           keyActive = false;
//           lastDelta = sgn;
//           keyTween.d = 0;
//         },
//       });
//     };
//     window.addEventListener("wheel", onWheel, { passive: false });
//     window.addEventListener("touchstart", onTouchStart, { passive: true });
//     window.addEventListener("touchmove", onTouchMove, { passive: false });
//     window.addEventListener("keydown", onKey);

//     /* ---------- cursor circle: reference follow = per-frame lerp, c += 0.2 * (target - c) ---------- */
//     const dot = dotRef.current;
//     let setX, setY;
//     let tx = -1000;
//     let ty = -1000;
//     let cx = -1000;
//     let cy = -1000;
//     let seeded = false;
//     if (dot) {
//       gsap.set(dot, { xPercent: -50, yPercent: -50, x: -1000, y: -1000, scale: 0 });
//       setX = gsap.quickSetter(dot, "x", "px");
//       setY = gsap.quickSetter(dot, "y", "px");
//     }
//     let px = 0;
//     let py = 0;
//     let moved = false;
//     const onMove = (e) => {
//       px = e.clientX;
//       py = e.clientY;
//       moved = true; // rect is read once per frame in the ticker, not once per event
//     };
//     root.addEventListener("pointermove", onMove);

//     /* ---------- render loop ---------- */
//     let energy = 0;
//     let prevE = 0;
//     let vp = 0; // eased position in projects (reference: u_position += 0.1 * (g - u_position))
//     let lastDelta = 1; // reference: GLWheel.delta (keeps its last non-zero value)
//     let snapIdx = 0;
//     let acc = 0;
//     let frameN = 0;

//     // cached values: skip work (and DOM / GPU writes) when nothing changed
//     let lastPinY = -1;
//     let pinFrames = 0;
//     let rE = -1;
//     let rVp = -1;
//     let rTs = NaN;
//     let rG = false;
//     let rProg = -1;
//     const linkPE = [];

//     const tick = (time) => {
//       const sy = window.scrollY;
//       if (sy !== lastPinY || ++pinFrames >= 20) {
//         lastPinY = sy;
//         pinFrames = 0;
//         checkPin();
//       }
//       if (!state.visible) return;
//       const dr = gsap.ticker.deltaRatio(60);
//       if (moved) {
//         moved = false;
//         const b = root.getBoundingClientRect();
//         tx = px - b.left;
//         ty = py - b.top;
//         if (!seeded) {
//           cx = tx;
//           cy = ty;
//           seeded = true;
//         }
//       }
//       if (setX) {
//         const ex = tx - cx;
//         const ey = ty - cy;
//         if (Math.abs(ex) > 0.05 || Math.abs(ey) > 0.05) {
//           // fast move -> circle trails behind; slow down -> it settles exactly on the cursor
//           const k = 1 - Math.pow(1 - 0.2, dr);
//           cx += ex * k;
//           cy += ey * k;
//           setX(cx);
//           setY(cy);
//         } else if (ex !== 0 || ey !== 0) {
//           cx = tx;
//           cy = ty;
//           setX(cx);
//           setY(cy);
//         }
//       }
//       const now = performance.now();

//       // ---- fixed 60Hz simulation (the reference does all of this once per frame) ----
//       acc += dr;
//       let steps = Math.floor(acc);
//       acc -= steps;
//       steps = Math.min(steps, 5);
//       for (let i = 0; i < steps; i++) {
//         // SmoothWheel: exponential approach to the target, truncated to whole px
//         let d = 0;
//         if (active) {
//           if (keyActive) d = keyTween.d;
//           else if (now < sw.until) {
//             sw.target += ((sw.scrollPos - sw.current) * DECEL) | 0;
//             d = sw.target - sw.current;
//             sw.current = sw.target;
//           }
//         }
//         // 1) input moves you directly
//         if (d !== 0) {
//           lastDelta = d;
//           // elastic ends: input past the first/last project meets growing resistance
//           const maxPos = (n - 1) * step;
//           const over = pos < 0 ? -pos : pos > maxPos ? pos - maxPos : 0;
//           const outward = (pos < 0 && d < 0) || (pos > maxPos && d > 0);
//           const k = outward ? Math.pow(1 - Math.min(over / (0.3 * step), 1), 2) : 1;
//           pos += 0.69 * d * k;
//           if (outward && over > 0.25 * step) sw.scrollPos = sw.current; // drop leftover momentum
//         }
//         // 2) always-on pull to the nearest project (27% bias, direction = last delta)
//         const t0 = pos / step;
//         snapIdx = clamp(lastDelta >= 0 ? Math.floor(t0 + 1 - 0.27) : Math.floor(t0 + 0.27), 0, n - 1);
//         pos += (snapIdx * step - pos) * (reduce ? 0.2 : clamp(0.05 * snapSpeed, 0.01, 0.5));
//         pos = clamp(pos, -0.3 * step, (n - 1 + 0.3) * step);
//         if (d === 0 && Math.abs(snapIdx * step - pos) < 0.01) pos = snapIdx * step; // settled
//         if (!atTop() && !atEnd()) edgeFreeAt = now;
//         // 3) glitch energy: e += 0.003*(|delta|-1); e *= 0.92
//         const sp = Math.abs(d) * intensity; // this step only: no frozen glitch when input stops
//         if (!reduce && sp > 1) energy += 0.003 * (sp - 1);
//         energy = clamp(energy * 0.92, 0, 4);
//         if (energy < 5e-4) energy = 0;
//       }
//       const t = pos / step;
//       idx = snapIdx;

//       // reference: the TITLE layer follows the position directly (no extra easing);
//       // only the info PANEL layer is eased (u_position += 0.1 * (g - u_position))
//       vp += (t - vp) * (1 - Math.pow(0.9, dr));
//       if (Math.abs(t - vp) < 1e-4) vp = t; // settled
//       const lo = n > 1 ? clamp(Math.floor(t), 0, n - 2) : 0;
//       const f = n > 1 ? t - lo : 0;
//       if (ensureTitles(lo)) state.force = true;

//       // ---- panel texture: scramble / bars / real text ----
//       let need = false;
//       if (energy > 0.1 && ++frameN % 2 === 1) {
//         paintScr();
//         need = true;
//       }
//       if (prevE <= 0.1 && energy > 0.1) {
//         gsap.killTweensOf(hintT);
//         startRects();
//       } else if (prevE > 0.1 && energy <= 0.1) {
//         startReal();
//         need = true;
//       }
//       if (energy > 0.1) {
//         drawRects();
//         need = true;
//       }
//       prevE = energy;
//       if (energy <= 0.1 && drawnIdx !== idx) {
//         startReal();
//         need = true;
//       }
//       if (state.dirty) {
//         state.dirty = false;
//         if (energy > 0.1) paintScr();
//         else paintReal(hintT.v);
//         need = true;
//       }
//       if (texDirty) {
//         texDirty = false;
//         need = true;
//       }
//       if (need) tex.needsUpdate = true;

//       const tScroll = f * uniforms.uTitleStride.value;
//       const glitchOn = hoverRef.current && energy < 0.05;
//       if (
//         state.force ||
//         need ||
//         glitchOn !== rG ||
//         glitchOn ||
//         energy !== rE ||
//         vp !== rVp ||
//         tScroll !== rTs
//       ) {
//         uniforms.uPow.value = energy;
//         uniforms.uPanelPos.value = vp;
//         uniforms.uTitleScroll.value = tScroll;
//         uniforms.uGlitch.value = glitchOn ? 0.003 : 0;
//         if (glitchOn) uniforms.uTime.value = time;
//         renderer.render(scene, camera);
//         rE = energy;
//         rVp = vp;
//         rTs = tScroll;
//         rG = glitchOn;
//         state.force = false;
//       }

//       // hit-area only over the resting project
//       const resting = energy <= 0.1 && Math.abs(t - idx) < 0.03;
//       if (!resting && hoverRef.current) {
//         hoverRef.current = false;
//         if (dot) gsap.to(dot, { scale: 0, duration: 0.3, ease: "power3.out", overwrite: "auto" });
//       }
//       for (let i = 0; i < n; i++) {
//         const a = linkRefs.current[i];
//         const want = resting && i === idx ? "auto" : "none";
//         if (a && linkPE[i] !== want) {
//           a.style.pointerEvents = want;
//           linkPE[i] = want;
//         }
//       }
//       const prog = n > 1 ? clamp(t / (n - 1), 0, 1) : 1;
//       if (progressRef.current && prog !== rProg) {
//         rProg = prog;
//         progressRef.current.style.transform = `scaleY(${prog})`;
//       }
//     };
//     // section already at the top of the page (e.g. it is the first block): engage right away
//     if (Math.abs(window.scrollY - startY()) <= 2) engage("top");

//     gsap.ticker.add(tick);

//     return () => {
//       gsap.ticker.remove(tick);
//       gsap.killTweensOf(hintT);
//       rects.forEach((r) => gsap.killTweensOf(r));
//       release();
//       clearTimeout(resizeTimer);
//       ro.disconnect();
//       io.disconnect();
//       window.removeEventListener("scroll", onScroll);
//       window.removeEventListener("wheel", onWheel);
//       window.removeEventListener("touchstart", onTouchStart);
//       window.removeEventListener("touchmove", onTouchMove);
//       window.removeEventListener("keydown", onKey);
//       root.removeEventListener("pointermove", onMove);
//       link.removeEventListener("load", loadFonts);
//       geometry.dispose();
//       material.dispose();
//       tex.dispose();
//       TA.tex.dispose();
//       TB.tex.dispose();
//       renderer.domElement.removeEventListener("webglcontextlost", onCtxLost);
//       renderer.domElement.removeEventListener("webglcontextrestored", onCtxRestored);
//       renderer.dispose();
//       if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
//       // release canvas backing stores right away (Safari keeps them otherwise)
//       panel.width = panel.height = 0;
//       TA.c.width = TA.c.height = 0;
//       TB.c.width = TB.c.height = 0;
//       if (renderer.forceContextLoss) renderer.forceContextLoss();
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [n, intensity, wheelGain, touchGain, stepScale, snapSpeed, hintKey]);

//   const grow = (on) => {
//     hoverRef.current = on;
//     if (dotRef.current) {
//       gsap.to(dotRef.current, { scale: on ? 1 : 0, duration: 0.45, ease: "power3.out", overwrite: "auto" });
//     }
//   };

//   return (
//     <section
//       ref={rootRef}
//       id="works"
//       className="relative h-screen w-full overflow-hidden bg-[#121212] text-[#f5f5dc]"
//     >
//       {/* WebGL layer: titles + tiled info panel + lens */}
//       <div ref={hostRef} className="absolute inset-0 z-0" aria-hidden="true" />

//       {/* Accessible, invisible hit-areas over the title of the current project */}
//       <div className="pointer-events-none absolute inset-0 z-10">
//         {projects.map((p, i) => {
//           const label = (Array.isArray(p.title) ? p.title : [p.title])
//             .map((l) => (typeof l === "string" ? l : l.text))
//             .join(" ");
//           return (
//             <a
//               key={p.id ?? i}
//               ref={(el) => (linkRefs.current[i] = el)}
//               href={p.href || "#"}
//               onClick={(e) => {
//                 if (onSelect) {
//                   e.preventDefault();
//                   onSelect(p, i);
//                 } else if (!p.href) e.preventDefault();
//               }}
//               onMouseEnter={() => grow(true)}
//               onMouseLeave={() => grow(false)}
//               className="pointer-events-none cursor-pointer absolute left-[8%] top-[22%] block h-[44%] w-[84%] md:left-[41%] md:top-[18%] md:h-[58%] md:w-[52%]"
//               style={{ pointerEvents: i === 0 ? "auto" : "none" }}
//             >
//               <span className="sr-only">{`${label}: view project`}</span>
//             </a>
//           );
//         })}
//       </div>

//       {/* Right rail */}
//       {/* <aside
//         className="absolute top-0 z-20 flex h-full flex-col items-center justify-between"
//         style={{ right: "max(12px, 1.25vw)", paddingTop: "max(16px, 1.25vw)", paddingBottom: "max(16px, 1.25vw)" }}
//       >
//         <svg
//           viewBox="0 0 22 26"
//           fill="none"
//           aria-hidden="true"
//           style={{ width: "max(16px, 1.146vw)", height: "auto" }}
//         >
//           {[3, 7, 11, 15, 19].map((x, k) => (
//             <rect
//               key={x}
//               x={x}
//               y={[8, 0, 12, 4, 10][k]}
//               width="1.6"
//               height={[18, 26, 14, 22, 16][k]}
//               fill="#fff"
//             />
//           ))}
//         </svg>

//         <nav className="flex flex-col items-center" style={{ gap: "max(24px, 2.083vw)" }}>
//           {navItems.map((it) => (
//             <a
//               key={it.label}
//               href={it.href}
//               className={`font-normal tracking-[0.18em] transition-opacity hover:opacity-100 [writing-mode:vertical-rl] ${
//                 it.active ? "opacity-100" : "opacity-50"
//               }`}
//               style={{ fontFamily: TITLE_FONT, fontSize: "max(9px, 0.573vw)" }}
//             >
//               {it.label}
//             </a>
//           ))}
//         </nav>

//         <div className="flex flex-col items-center" style={{ gap: "max(8px, 0.625vw)" }}>
//           <span
//             className="font-light tracking-[0.2em] opacity-60 [writing-mode:vertical-rl]"
//             style={{ fontFamily: TITLE_FONT, fontSize: "max(8px, 0.521vw)" }}
//           >
//             SCROLL
//           </span>
//           <div className="relative w-px bg-white/25" style={{ height: "max(64px, 5vw)" }}>
//             <div
//               ref={progressRef}
//               className="absolute inset-0 origin-top bg-white"
//               style={{ transform: "scaleY(0)" }}
//             />
//           </div>
//         </div>
//       </aside> */}

//       {/* Cursor dot */}
//       <div
//         ref={dotRef}
//         className="pointer-events-none absolute left-0 top-0 z-30 rounded-full bg-[#f5f5dc] [@media(pointer:coarse)]:hidden"
//         style={{ width: "12.8125vw", height: "12.8125vw" }} /* 246px at 1920px wide */
//         aria-hidden="true"
//       />
//     </section>
//   );
// }

// export default memo(ProjectShowcase);




















































"use client";
/**
 * ProjectShowcase.jsx  (v6: virtual scroll + continuous magnetic pull)
 * ---------------------------------------------------------------
 * Scroll model (same maths as the reference, re-implemented):
 *
 *  - The section is a plain 100vh block. When it reaches the top of the page it
 *    ENGAGES: page scroll is held, and wheel / touch / keys drive a virtual
 *    position instead.  It RELEASES at the first / last project (on a fresh gesture).
 *  - every frame:   pos += 0.69 * delta                (input moves you directly)
 *                   pos += 0.05 * (snapTarget - pos)   (always-on magnetic pull)
 *    snapTarget = nearest project with a 27% bias in the direction you scroll.
 *    No idle timer, no threshold animation, no locked transition.
 *  - delta also feeds the glitch energy:  e += 0.003*(|delta|-1);  e *= 0.92
 *      e > 0.1 -> scramble + white bars,  e high -> tiles + barrel lens
 *  - ArrowDown/ArrowUp/PageDown/PageUp/Space = delta 100 -> 1 over 0.5s (about one project)
 *
 * Lenis: pass your instance (or ref) as the `lenis` prop so it is held while engaged.
 * Install:  npm i gsap three     (needs Tailwind CSS)
 */
import { memo, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";

/* ------------------------------------------------------------------ */
/* Data. client / agency may contain "\n". title line = string or      */
/* { text, indent, size, lower } (indent/size in em of title size)     */
/* ------------------------------------------------------------------ */
const DEFAULT_PROJECTS = [
  {
    title: ["PROJECT", "ONE"],
    name: "Northwind",
    type: "Websites",
    stack: "React / GSAP",
    status: "live - 2025",
    href: "#",
    image:"https://picsum.photos/id/10/600/400",
  },
  {
    title: ["PROJECT", "TWO"],
    name: "Halden\nMuseum",
    type: "Installations",
    stack: "TypeScript\nChrome APIs",
    status: "open source - 2024",
    href: "#",
    image:"https://picsum.photos/id/20/600/400",
  },
  {
    title: ["PROJECT", "THREE"],
    name: "Halden\nMuseum",
    type: "Installations",
    stack: "TypeScript\nChrome APIs",
    status: "open source - 2024",
    href: "#",
    image:"https://picsum.photos/id/30/600/400",
  },
  {
    title: ["PROJECT", "FOUR"],
    name: "Halden\nMuseum",
    type: "Installations",
    stack: "TypeScript\nChrome APIs",
    status: "open source - 2024",
    href: "#",
    image:"https://picsum.photos/id/40/600/400",
  },
  {
    title: ["PROJECT", "FIVE"],
    name: "Halden\nMuseum",
    type: "Installations",
    stack: "TypeScript\nChrome APIs",
    status: "open source - 2024",
    href: "#",
    image:"https://picsum.photos/id/50/600/400",
  },
  {
    title: ["PROJECT", "SIX"],
    name: "Halden\nMuseum",
    type: "Installations",
    stack: "TypeScript\nChrome APIs",
    status: "open source - 2024",
    href: "#",
    image:"https://picsum.photos/id/60/600/400",
  },
  {
    title: ["PROJECT", "SEVEN"],
    name: "Halden\nMuseum",
    type: "Installations",
    stack: "TypeScript\nChrome APIs",
    status: "open source - 2024",
    href: "#",
    image:"https://picsum.photos/id/70/600/400",
  },
  {
    title: ["PROJECT", "EIGHT"],
    name: "Halden\nMuseum",
    type: "Installations",
    stack: "TypeScript\nChrome APIs",
    status: "open source - 2024",
    href: "#",
    image:"https://picsum.photos/id/80/600/400",
  },
  // {
  //   // title: ["PROJECT", "THREE", { text: "β version", indent: .05, size: 0.88, lower: true }],
  //   title: ["PROJECT", "THREE", ],
  //   client: "Kite Games",
  //   type: "Websites",
  //   agency: "Fieldwork",
  //   date: "September 2023",
  //   href: "#",
  // },
  // {
  //   title: ["PROJECT", "FOUR"],
  //   client: "Meridian Bank",
  //   type: "Apps",
  //   agency: "Brightside",
  //   date: "May 2022",
  //   href: "#",
  // },
  // {
  //   title: ["PROJECT", "FIVE"],
  //   // subtitle: "A birds-eye glimpse of the entire Naruse Dam",
  //   subtitle: "",
  //   client: "Kajima\nCorporation",
  //   type: "Websites / XR",
  //   agency: "Pylon\nStudio",
  //   date: "December 2021",
  //   href: "#",
  // },
  // {
  //   title: ["PROJECT", "SIX"],
  //   client: "Oku Watches",
  //   type: "Websites",
  //   agency: "Cherry & Co",
  //   date: "August 2020",
  //   href: "#",
  // },
  // {
  //   title: ["PROJECT", "SEVEN"],
  //   client: "Oku Watches",
  //   type: "Websites",
  //   agency: "Cherry & Co",
  //   date: "August 2020",
  //   href: "#",
  // },
  // {
  //   title: ["PROJECT", "EIGHT"],
  //   client: "Oku Watches",
  //   type: "Websites",
  //   agency: "Cherry & Co",
  //   date: "August 2020",
  //   href: "#",
  // },
];

const DEFAULT_NAV = [
  { label: "WORKS", href: "#works", active: true },
  { label: "ABOUT", href: "#about" },
  { label: "CONTACT", href: "#contact" },
];

/* colours: foreground (all text, circle, rail) and background */
const COLOR_FG = "#f5f5dc";
const COLOR_BG = "#121212";
const hexToVec3 = (hex) => {
  const v = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255);
};

const TITLE_FONT = "'Oswald','Arial Narrow',Impact,sans-serif";
// const PANEL_FONT = "'KH Teke','inter','Padauk','Helvetica Neue',Arial,sans-serif";
const PANEL_FONT = "'KH Teka'";
const CHARSET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789[]#&%=-";

/* info panel is drawn on a 512x700 (base units) canvas at O x */
const O = 2;
const CW = 512 * O;
const CH = 700 * O;

/* layout numbers measured from the reference frames */
const LAYOUT = {
  originX: 0.1717, // panel left, fraction of width
  originY: 0.216, // panel top, fraction of height
  kH: 0.000757, // panel scale per px of viewport height
  kVW: 0.00039, // panel scale per px of viewport width (= 0.75 at 1920px)
  titleStride: 1.1407, // distance between two titles, in viewport heights
};

/* ------------------------------------------------------------------ */
/* GLSL (one full-screen pass: titles + tiled panel, then the lens)    */
/* ------------------------------------------------------------------ */
const VERT = /* glsl */ `
  void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uPanel;
  uniform sampler2D uTitleA;
  uniform sampler2D uTitleB;
  uniform vec2  uRes;          // css px
  uniform float uDpr;
  uniform vec2  uOrigin;       // panel top-left, css px
  uniform vec2  uPanelSize;    // panel size, css px
  uniform float uPanelPos;     // scroll position in projects (eased)
  uniform vec2  uTitleSize;
  uniform float uTitleStride;
  uniform float uTitleScroll;  // px the title drum has moved
  uniform float uPow;          // scroll energy
  uniform float uGlitch;       // hover flicker
  uniform float uTime;
  uniform vec3  uFg;           // foreground colour
  uniform vec3  uBg;           // background colour

  float rnd(vec2 st){ return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453123); }
  float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vn(vec2 p){
    vec2 i = floor(p), f = fract(p);
    float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    mat2 r = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 4; i++){ v += a * vn(p); p = r * p * 2.0 + vec2(100.0); a *= 0.5; }
    return v;
  }

  // Brown-Conrady lens
  vec2 lens(vec2 uv, float d){
    uv = uv * 2.0 - 1.0;
    float r2 = dot(uv, uv);
    uv *= 1.0 + 0.11 * d * r2 - 0.02375 * d * r2 * r2;
    return uv * 0.5 + 0.5;
  }

  void main(){
    vec2 sp = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;  // css px, top-left
    vec2 uv = sp / uRes;

    // ---- whole-frame barrel distortion, edges re-mapped so no black borders ----
    float dp = min(uPow * 5.5, 8.0);
    float au = min(dp * 0.01, 0.2);
    float av = min(dp * 0.015, 0.2);
    uv = lens(uv, dp);
    vec2 mn = lens(vec2(-au, -av), dp);
    vec2 mx = lens(vec2(1.0 + au, 1.0 + av), dp);
    uv = (uv - mn) / (mx - mn);
    vec2 P  = uv * uRes;     // position in flat "content" space (css px)
    vec2 uc = uv;            // content uv (for the static noise / centre distance)

    // ---- titles (two stacked: current + next) ----
    vec2  tc = vec2(P.x, P.y + uTitleScroll);
    float gm = 1.0;
    if (uGlitch > 0.0 && uPow < 0.05) {
      float r = rnd(vec2(uc.y) * (0.5 + fract(uTime * 0.37)));
      tc.x += (r - 0.5) * uGlitch * uRes.x;
      gm = clamp(pow(r, 0.05), 0.0, 0.98);
    }
    float yA = tc.y;
    float yB = tc.y - uTitleStride;
    float inX = step(0.0, tc.x) * step(tc.x, uTitleSize.x);
    float mA = inX * step(0.0, yA) * step(yA, uTitleSize.y);
    float mB = inX * step(0.0, yB) * step(yB, uTitleSize.y);
    float tA = texture2D(uTitleA, clamp(vec2(tc.x / uTitleSize.x, 1.0 - yA / uTitleSize.y), 0.0, 1.0)).a * mA;
    float tB = texture2D(uTitleB, clamp(vec2(tc.x / uTitleSize.x, 1.0 - yB / uTitleSize.y), 0.0, 1.0)).a * mB;
    float title = max(tA, tB) * gm;

    // ---- info panel: ONE texture, repeated; main tile always visible ----
    vec2 q = uc - uOrigin / uRes;
    q = (q - 0.25) * (uPow * 0.8 + 1.0) + 0.25;      // tiles pull away from the centre with speed
    vec2 g = q * uRes / uPanelSize;                  // panel units, top-left
    float screenGy = g.y;
    g.y += uPanelPos * 2.0;                          // 2 panel heights per project

    float inMain = step(0.0, g.x) * step(g.x, 1.0)
                 * step(mod(g.y, 2.0), 1.0)
                 * step(-0.5, screenGy) * step(screenGy, 1.5);

    vec4 tx = texture2D(uPanel, vec2(fract(g.x), 1.0 - fract(g.y)));
    float panel = tx.r * tx.a;

    if (inMain < 0.5) {
      // static noise + distance from centre decide which repeats are revealed
      float noise = 0.8 * fbm(uc * 10.0);
      float t = clamp(clamp(1.0 - length(uc - 0.5), 0.0, 1.0) * uPow * 0.1, 0.0, 1.0);
      float v = pow(max(noise * t, 1e-6), 0.3) + t;
      if (v < 0.2) {
        vec2 gj = g - (noise - 0.2) * 0.06;          // torn, dim edge of the dissolve
        vec4 t2 = texture2D(uPanel, vec2(fract(gj.x), 1.0 - fract(gj.y)));
        panel = t2.r * pow(v * 2.7, 2.0) * 0.9;
      }
    }
    panel *= max(0.0, 1.0 - uPow * 0.2);

    float a = clamp(panel + title, 0.0, 1.0);
    gl_FragColor = vec4(mix(uBg, uFg, a), 1.0);
  }
`;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const splitLines = (s) => String(s ?? "").split("\n");

/** random permutation of the charset (no repeated letters), cut to length */
const POOL = CHARSET.split("");
function scrambled(len) {
  const m = Math.min(Math.max(1, len), POOL.length);
  let out = "";
  for (let i = 0; i < m; i++) {
    const j = i + ((Math.random() * (POOL.length - i)) | 0);
    const tmp = POOL[i];
    POOL[i] = POOL[j];
    POOL[j] = tmp;
    out += POOL[i];
  }
  return out;
}

function wrapWords(ctx, text, maxW) {
  const lines = [];
  let cur = "";
  String(text)
    .split(" ")
    .forEach((w) => {
      const test = cur ? cur + " " + w : w;
      if (ctx.measureText(test).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else cur = test;
    });
  if (cur) lines.push(cur);
  return lines;
}

/** info panel text. scr = true -> every value replaced by a scrambled string of same length */
function paintPanel(ctx, proj, idx, total, scr) {
  const X = 32 * O;
  let y = 22 * O;
  const T = (s) => (scr ? scrambled(s.length) : s);
  const label = (s) => {
    ctx.fillStyle = "rgb(90,90,90)";
    ctx.font = `400 ${23 * O}px 'Oswald','Arial Narrow',sans-serif`;
    ctx.fillText(s, X, y);
  };
  const value = (s, weight, size) => {
    ctx.fillStyle = "rgb(255,255,255)";
    ctx.font = `${weight} ${size * O}px ${PANEL_FONT}`;
    ctx.fillText(s, X, y);
  };
  ctx.textBaseline = "alphabetic";

  value(`WORKS ${idx + 1} / ${total}`, 700, 26);
  y += 64 * O;
  // label("CLIENT");
  label("PROJECT");
  y += 46 * O;
  splitLines(proj.name).forEach((l) => {
    value(T(l), 700, 50);
    y += 48 * O;
  });
  y += 16 * O;
  label("TYPE");
  y += 28 * O;
  value(T(proj.type || ""), 400, 24);
  y += 64 * O;
  label("STACK");
  y += 28 * O;
  const ag = splitLines(proj.stack);
  ag.forEach((l, i) => {
    value(T(l), 400, 24);
    if (i < ag.length - 1) y += 32 * O;
  });
  y += 64 * O;
  label("STATUS");
  y += 28 * O;
  value(T(proj.status || ""), 400, 24);
  return { yDate: y };
}

/** one project's giant title, laid out for a W x H viewport */
function drawTitle(ctx, proj, W, H, sc) {
  ctx.setTransform(sc, 0, 0, sc, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (!proj) return;

  const small = W < 768;
  const fs = Math.max(56, W * 0.116); // vw based: no upper cap, grows with the screen
  const lh = fs * 0.92;
  const lines = (Array.isArray(proj.title) ? proj.title : [proj.title]).map((l) =>
    typeof l === "string" ? { text: l } : l
  );
  const x0 = small ? W * 0.08 : W * 0.41;
  const blockH = lines.length * lh;
  const top = (small ? H * 0.4 : H * 0.47) - blockH / 2;

  ctx.fillStyle = "#fff";
  ctx.textBaseline = "alphabetic";

  let blockW = 0;
  lines.forEach((o, k) => {
    const size = fs * (o.size || 1);
    const indent = o.indent ?? (k > 0 ? 0.78 : 0);
    ctx.font = `600 ${size}px ${TITLE_FONT}`;
    try {
      ctx.letterSpacing = `${-0.01 * size}px`;
    } catch (e) {}
    const text = o.lower ? o.text : o.text.toUpperCase();
    ctx.fillText(text, x0 + indent * fs, top + k * lh + 0.912 * fs);
    blockW = Math.max(blockW, indent * fs + ctx.measureText(text).width);
  });

  if (proj.subtitle) {
    const fsS = Math.max(20, W * 0.035);
    ctx.font = `italic 200 ${fsS}px ${TITLE_FONT}`;
    try {
      ctx.letterSpacing = "0px";
    } catch (e) {}
    const side = lines.length >= 3;
    const sx = side ? x0 + blockW * 0.62 : x0 + blockW * 0.02;
    const maxW = side ? blockW * 0.58 : fsS * 13;
    const sy = side ? top + lh + 0.1 * fs + fsS * 0.85 : top + blockH + W * 0.015 + fsS;
    wrapWords(ctx, proj.subtitle, maxW).forEach((ln, i) =>
      ctx.fillText(ln, sx, sy + i * fsS * 1.1)
    );
  }
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
function ProjectShowcase({
  projects = DEFAULT_PROJECTS,
  navItems = DEFAULT_NAV,
  lenis, // optional: Lenis instance or ref ({ current })
  intensity = 1, // multiplies delta for the glitch energy
  wheelGain = 1, // multiplier on the reference wheel scale (1 = exact). lower = more scroll needed
  touchGain = 5, // touch px -> delta (reference uses 5)
  stepScale = 1, // scroll distance per project (1 = reference)
  snapSpeed = 1, // speed of the pull (settle back / go to next). 1 = reference (0.05 per frame)
  hint = ["To see more of this work,", "hover over the typography and click on the image."],
  onSelect, // (project, index) => void
}) {
  const rootRef = useRef(null);
  const hostRef = useRef(null);
  const linkRefs = useRef([]);
  const dotRef = useRef(null);
  const progressRef = useRef(null);
  const hoverRef = useRef(false);
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;
  const n = projects.length;
  const hintLines = Array.isArray(hint) ? hint : String(hint).split("\n");
  const hintKey = hintLines.join("|");

  useLayoutEffect(() => {
    const root = rootRef.current;
    const host = hostRef.current;
    if (!root || !host || n === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const state = { dirty: true, titleDirty: true, visible: true, W: 1, H: 1, tsc: 1, force: true };

    /* ---------- fonts ---------- */
    const markDirty = () => {
      state.dirty = true;
      state.titleDirty = true;
    };
    const loadFonts = () =>
      Promise.all(
        [
          "700 20px Oswald",
          "300 13px Oswald",
          "200 20px Oswald",
          "italic 200 20px Oswald",
          "400 20px Padauk",
          "700 20px Padauk",
          "400 20px 'KH Teka'",
        ].map((f) => document.fonts.load(f))
      )
        .then(markDirty)
        .catch(() => {});
    let link = document.getElementById("showcase-fonts");
    if (!link) {
      link = document.createElement("link");
      link.id = "showcase-fonts";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Oswald:wght@200;300;400;700&family=Padauk:wght@400;700&display=swap";
      document.head.appendChild(link);
    }
    link.addEventListener("load", loadFonts);
    loadFonts();
    document.fonts.ready.then(markDirty);

    /* ---------- info panel canvas -> texture ---------- */
    const panel = document.createElement("canvas");
    panel.width = CW;
    panel.height = CH;
    const pctx = panel.getContext("2d");
    const tex = new THREE.CanvasTexture(panel);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;

    let idx = 0; // committed project (27% rule)
    let drawnIdx = -1;
    let texDirty = false;
    const hintT = { v: 1 };

    const paintReal = (v = 1) => {
      pctx.setTransform(1, 0, 0, 1, 0, 0);
      pctx.clearRect(0, 0, CW, CH);
      const { yDate } = paintPanel(pctx, projects[idx], idx, n, false);
      const yH = yDate + 76 * O;
      pctx.fillStyle = "rgb(150,150,150)";
      pctx.font = `200 ${20 * O}px ${PANEL_FONT}`;
      const [l1 = "", l2 = ""] = hintLines;
      const a1 = Math.floor(v > 0.5 ? l1.length : l1.length * v * 2);
      const a2 = Math.floor(v < 0.5 ? 0 : l2.length * (v - 0.5) * 2);
      pctx.fillText(l1.slice(0, a1), 32 * O, yH);
      pctx.fillText(l2.slice(0, a2), 32 * O, yH + 20 * O);
      pctx.fillStyle = "rgb(65,65,65)";
      pctx.fillRect(0, 1 * O, 2 * O, (yH + 22 * O) * v);
      drawnIdx = idx;
    };
    const paintScr = () => {
      pctx.setTransform(1, 0, 0, 1, 0, 0);
      pctx.clearRect(0, 0, CW, CH);
      paintPanel(pctx, projects[idx], idx, n, true);
    };
    const startReal = () => {
      gsap.killTweensOf(hintT);
      hintT.v = 0;
      paintReal(0);
      gsap.to(hintT, {
        v: 1,
        duration: 0.5,
        ease: "power1.out",
        onUpdate: () => {
          paintReal(hintT.v);
          texDirty = true;
        },
      });
    };

    /* ---------- white bars (canvas rects, tweened) ---------- */
    const rects = Array.from({ length: 8 }, () => ({ x: 6 * O, y: 0, w: 0, h: 0 }));
    const startRects = () => {
      const proj = projects[idx];
      const cl = Math.min(5, splitLines(proj.name).length);
      const al = splitLines(proj.stack).length;
      const extra = 32 * O * Math.max(al - 1, 0);
      rects.forEach((r) => {
        gsap.killTweensOf(r);
        r.x = 6 * O;
        r.w = 0;
      });
      const wipe = (r) =>
        gsap.fromTo(
          r,
          { x: 6 * O, w: 380 * O },
          {
            x: 386 * O,
            w: 0,
            duration: 0.25,
            ease: "power4.out",
            onComplete: () => {
              r.x = 6 * O;
              r.w = 0;
            },
          }
        );
      const sweep = (r, delay) =>
        gsap.fromTo(
          r,
          { w: 0 },
          { delay, w: 380 * O, duration: 0.4, ease: "power4.in", onComplete: () => wipe(r) }
        );
      let c = 0;
      for (let d = 0; d < cl; d++) {
        const r = rects[d];
        r.y = (94 + 48 * d) * O;
        r.h = 44 * O;
        sweep(r, c);
        c += d === 2 ? 0.15 : 0.05;
      }
      for (let d = 5; d < 8; d++) {
        const r = rects[d];
        r.y = (94 + 48 * cl + 60 + 92 * (d - 5)) * O + (d >= 7 ? extra : 0);
        r.h = 24 * O;
        sweep(r, c);
        c += 0.05;
      }
    };
    const drawRects = () => {
      pctx.fillStyle = "#fff";
      rects.forEach((r) => {
        if (r.w > 0.5) pctx.fillRect(r.x, r.y, r.w, r.h);
      });
    };

    /* ---------- two title canvases: A = lower project, B = next ---------- */
    const makeTitle = () => {
      const c = document.createElement("canvas");
      c.width = 4;
      c.height = 4;
      const t = new THREE.CanvasTexture(c);
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
      return { c, ctx: c.getContext("2d"), tex: t, idx: -2 };
    };
    let TA = makeTitle();
    let TB = makeTitle();
    const paintTitle = (T, i) => {
      T.idx = i;
      drawTitle(T.ctx, i >= 0 && i < n ? projects[i] : null, state.W, state.H, state.tsc);
      T.tex.needsUpdate = true;
    };
    const ensureTitles = (lo) => {
      let painted = true;
      if (state.titleDirty) {
        paintTitle(TA, lo);
        paintTitle(TB, lo + 1);
        state.titleDirty = false;
      } else if (TA.idx === lo && TB.idx === lo + 1) {
        painted = false; // up to date
      } else if (TB.idx === lo) {
        [TA, TB] = [TB, TA];
        paintTitle(TB, lo + 1);
      } else if (TA.idx === lo + 1) {
        [TA, TB] = [TB, TA];
        paintTitle(TA, lo);
      } else {
        paintTitle(TA, lo);
        paintTitle(TB, lo + 1);
      }
      uniforms.uTitleA.value = TA.tex;
      uniforms.uTitleB.value = TB.tex;
      return painted;
    };

    /* ---------- three.js ---------- */
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x121212, 1);
    const onCtxLost = (e) => e.preventDefault();
    const onCtxRestored = () => {
      state.force = true;
      state.dirty = true;
      state.titleDirty = true;
      tex.needsUpdate = true;
    };
    renderer.domElement.addEventListener("webglcontextlost", onCtxLost);
    renderer.domElement.addEventListener("webglcontextrestored", onCtxRestored);
    renderer.domElement.className = "block h-full w-full";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = {
      uPanel: { value: tex },
      uTitleA: { value: TA.tex },
      uTitleB: { value: TB.tex },
      uRes: { value: new THREE.Vector2(1, 1) },
      uDpr: { value: dpr },
      uOrigin: { value: new THREE.Vector2(0, 0) },
      uPanelSize: { value: new THREE.Vector2(320, 440) },
      uPanelPos: { value: 0 },
      uTitleSize: { value: new THREE.Vector2(1, 1) },
      uTitleStride: { value: 1 },
      uTitleScroll: { value: 0 },
      uPow: { value: 0 },
      uGlitch: { value: 0 },
      uTime: { value: 0 },
      uFg: { value: hexToVec3(COLOR_FG) },
      uBg: { value: hexToVec3(COLOR_BG) },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });
    const geometry = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(geometry, material));

    let pos = 0; // virtual scroll position in px
    let step = 1; // px per project
    // light part: runs on every resize frame (renderer size, uniforms, scroll step)
    const layout = () => {
      const w = host.clientWidth || window.innerWidth;
      const h = host.clientHeight || window.innerHeight;
      const small = w < 768;
      const k = small ? 0.5 : w * LAYOUT.kVW; // panel scale follows viewport WIDTH (vw)

      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);

      const tNow = pos / step;
      // reference: step = 0.5 * canvasHeight, canvas quality = 2 (<= dpr), Windows/Safari 1.5, >2000px wide 1
      const uaq = navigator.userAgent.toLowerCase();
      const safari = uaq.includes("safari") && !uaq.includes("chrome") && !uaq.includes("edg");
      let quality = Math.min(2, window.devicePixelRatio || 1);
      if (safari) quality = Math.min(1.5, quality);
      if (uaq.includes("windows")) quality = 1.5;
      if (w > 2000) quality = 1;
      step = h * 0.5 * quality * stepScale;
      pos = tNow * step;

      uniforms.uRes.value.set(w, h);
      uniforms.uDpr.value = dpr;
      uniforms.uPanelSize.value.set(512 * k, 700 * k);
      uniforms.uOrigin.value.set(small ? 16 : w * LAYOUT.originX, small ? 64 : h * LAYOUT.originY);
      state.force = true;
    };
    // heavy part: title canvases are re-allocated + repainted only once resizing settles
    let resizeTimer = 0;
    const layoutHeavy = () => {
      const w = host.clientWidth || window.innerWidth;
      const h = host.clientHeight || window.innerHeight;
      state.W = w;
      state.H = h;
      state.tsc = Math.min(dpr, 1.5, Math.sqrt(12e6 / (w * h)));
      [TA, TB].forEach((T) => {
        T.c.width = Math.max(4, Math.round(w * state.tsc));
        T.c.height = Math.max(4, Math.round(h * state.tsc));
        T.tex.dispose();
      });
      uniforms.uTitleSize.value.set(w, h);
      uniforms.uTitleStride.value = h * LAYOUT.titleStride;
      state.dirty = true;
      state.titleDirty = true;
      state.force = true;
    };
    const onResize = () => {
      layout();
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(layoutHeavy, 150);
    };
    layout();
    layoutHeavy();
    const ro = new ResizeObserver(onResize);
    ro.observe(host);

    const io = new IntersectionObserver(
      ([e]) => {
        state.visible = e.isIntersecting;
        if (e.isIntersecting) state.force = true; // redraw when it comes back into view
      },
      { threshold: 0 }
    );
    io.observe(root);

    /* ---------- virtual scroll input ---------- */
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const LOCK_MS = 350; // swallow momentum right after landing on the section
    const GAP_MS = 220; // a "fresh gesture" = this long since the last input
    // ---- exact replica of the reference's SmoothWheel (type "fixed") ----
    const ua = navigator.userAgent.toLowerCase();
    const isFF = ua.includes("firefox");
    const isEdge = ua.includes("edg");
    const isWin = !(navigator.platform || "").toLowerCase().includes("mac");
    const DECEL = isWin ? (isFF ? 0.12 : 0.05) : isFF ? 0.16 : 0.13;
    const MULT = (isWin ? (isFF ? 1.7 : isEdge ? 2 : 1.6) : isFF ? 1.5 : 1.1) * wheelGain;
    const sw = { scrollPos: 0, current: 0, target: 0, until: 0 };
    const swReset = () => {
      sw.scrollPos = sw.current = sw.target = 0;
      sw.until = 0;
    };
    const END = 0.02;
    const SETTLE_MS = 450; // must rest on the first/last project this long before you can leave
    const OVER_PX = 140; // ...then this much extra scroll in the same direction lets you out
    const COOLDOWN_MS = 700; // no re-engage right after leaving
    let active = false;
    let engagedAt = 0;
    let lastInputAt = 0;
    let lastReleaseAt = 0;
    let armed = true; // may engage again only after the page has moved out of the pin zone
    let lastOutside = 0; // -1 = section is below us (we are above it), +1 = we are below it
    let edgeFreeAt = 0; // last time we were NOT resting on the first/last project
    let overscroll = 0;
    const keyTween = { d: 0 };
    let keyActive = false;

    const getLenis = () => {
      const l = lenisRef.current;
      const inst = l && l.current !== undefined ? l.current : l;
      return inst && typeof inst.stop === "function" ? inst : null;
    };
    // const startY = () => root.getBoundingClientRect().top + window.scrollY;
    const anchorEl = root.closest("[data-tear-anchor]") || root;
    const startY = () => anchorEl.getBoundingClientRect().top + window.scrollY;

    const engage = (side) => {
      if (active) return;
      active = true;
      engagedAt = edgeFreeAt = performance.now();
      overscroll = 0;
      swReset();
      const y = startY();
      const l = getLenis();
      if (l) {
        try {
          l.scrollTo(y, { immediate: true, force: true });
          l.stop();
        } catch (e) {}
      }
      window.scrollTo({ top: y, behavior: "instant" });
      pos = side === "top" ? 0 : (n - 1) * step;
      vp = pos / step;
      lastDelta = side === "top" ? 1 : -1;
    };
    const release = () => {
      if (!active) return;
      active = false;
      armed = false;
      swReset();
      keyActive = false;
      gsap.killTweensOf(keyTween);
      const l = getLenis();
      if (l) {
        try {
          l.start();
        } catch (e) {}
      }
    };
    const atTop = () => pos / step <= END;
    const atEnd = () => pos / step >= n - 1 - END;
    const edgeDir = (dy) => (dy < 0 && atTop()) || (dy > 0 && atEnd());

    /* hand scrolling back to the page (first/last project, outward input) */
    const leave = (dy) => {
      release();
      lastReleaseAt = performance.now();
      const l = getLenis();
      if (l) {
        try {
          l.scrollTo(window.scrollY + Math.sign(dy) * state.H * 0.5, { duration: 0.9 });
        } catch (e) {}
      }
    };
    // true = we left the section. A fresh gesture leaves at once; a continuous one
    // needs OVER_PX of extra scroll once the project has settled.
    const tryLeave = (dy, now, gap) => {
      if (!edgeDir(dy)) {
        overscroll = 0;
        return false;
      }
      if (now - engagedAt < LOCK_MS || now - edgeFreeAt < SETTLE_MS) return false;
      overscroll += Math.abs(dy);
      if (gap > GAP_MS || overscroll > OVER_PX) {
        leave(dy);
        return true;
      }
      return false;
    };

    /* pin check: state based (not edge based), so slow Lenis tails and fast jumps both pin */
    const zoneOf = (y, sy) => (y < sy - 2 ? -1 : y > sy + 2 ? 1 : 0);
    const checkPin = () => {
      const y = window.scrollY;
      const sy = startY();
      const now = performance.now();
      if (active) {
        const drift = Math.abs(y - sy);
        if (drift > 3) {
          if (drift > state.H * 0.4) {
            release(); // anchor jump / scrollbar drag far away
            lastReleaseAt = now;
          } else {
            // something nudged us: pin again
            const l = getLenis();
            if (l) {
              try {
                l.scrollTo(sy, { immediate: true, force: true });
              } catch (e) {}
            }
            window.scrollTo({ top: sy, behavior: "instant" });
          }
        }
        return;
      }
      const z = zoneOf(y, sy);
      if (armed && now - lastReleaseAt > COOLDOWN_MS && lastOutside !== 0) {
        // reached the zone, or jumped across it
        if (z === 0 || z !== lastOutside) {
          engage(lastOutside < 0 ? "top" : "bottom");
          return;
        }
      }
      if (z !== 0) {
        lastOutside = z;
        armed = true;
      }
    };
    const onScroll = checkPin;
    window.addEventListener("scroll", onScroll, { passive: true });

    const onWheel = (e) => {
      if (!active || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const now = performance.now();
      const gap = now - lastInputAt;
      lastInputAt = now;
      const dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? state.H : 1);
      if (tryLeave(dy, now, gap)) return; // not prevented -> the page scrolls on
      e.preventDefault();
      if (now - engagedAt < LOCK_MS) return;
      sw.scrollPos = clamp(sw.scrollPos + dy * MULT, sw.current - 2500, sw.current + 2500);
      sw.until = now + 1000;
    };

    let touchY = 0;
    let touchFresh = false;
    const onTouchStart = (e) => {
      if (!active || !e.touches[0]) return;
      touchY = e.touches[0].clientY;
      touchFresh = performance.now() - lastInputAt > GAP_MS;
    };
    const onTouchMove = (e) => {
      if (!active || !e.touches[0]) return;
      const now = performance.now();
      const y = e.touches[0].clientY;
      const dy = touchY - y;
      touchY = y;
      const tgap = touchFresh ? 1e9 : 0;
      touchFresh = false;
      if (tryLeave(dy * 3, now, tgap)) return;
      lastInputAt = now;
      if (e.cancelable) e.preventDefault();
      if (now - engagedAt < LOCK_MS) return;
      sw.scrollPos = clamp(sw.scrollPos + dy * touchGain, sw.current - 2500, sw.current + 2500);
      sw.until = now + 1000;
    };

    const onKey = (e) => {
      if (!active) return;
      const tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target && e.target.isContentEditable)) return;
      let sgn = 0;
      if (e.key === "ArrowDown" || e.key === "PageDown") sgn = 1;
      else if (e.key === "ArrowUp" || e.key === "PageUp") sgn = -1;
      else if (e.key === " ") sgn = e.shiftKey ? -1 : 1;
      else return;
      const now = performance.now();
      if (edgeDir(sgn) && now - engagedAt > LOCK_MS && now - edgeFreeAt > SETTLE_MS) {
        leave(sgn);
        return;
      }
      e.preventDefault();
      if (now - engagedAt < LOCK_MS) return;
      lastInputAt = now;
      gsap.killTweensOf(keyTween);
      keyActive = true;
      keyTween.d = sgn * 100;
      gsap.to(keyTween, {
        d: sgn,
        duration: 0.5,
        ease: "power1.out",
        onComplete: () => {
          keyActive = false;
          lastDelta = sgn;
          keyTween.d = 0;
        },
      });
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKey);

    /* ---------- cursor circle: reference follow = per-frame lerp, c += 0.2 * (target - c) ---------- */
    const dot = dotRef.current;
    let setX, setY;
    let tx = -1000;
    let ty = -1000;
    let cx = -1000;
    let cy = -1000;
    let seeded = false;
    if (dot) {
      gsap.set(dot, { xPercent: -50, yPercent: -50, x: -1000, y: -1000, scale: 0 });
      setX = gsap.quickSetter(dot, "x", "px");
      setY = gsap.quickSetter(dot, "y", "px");
    }
    let px = 0;
    let py = 0;
    let moved = false;
    const onMove = (e) => {
      px = e.clientX;
      py = e.clientY;
      moved = true; // rect is read once per frame in the ticker, not once per event
    };
    root.addEventListener("pointermove", onMove);

    /* ---------- render loop ---------- */
    let energy = 0;
    let prevE = 0;
    let vp = 0; // eased position in projects (reference: u_position += 0.1 * (g - u_position))
    let lastDelta = 1; // reference: GLWheel.delta (keeps its last non-zero value)
    let snapIdx = 0;
    let acc = 0;
    let frameN = 0;

    // cached values: skip work (and DOM / GPU writes) when nothing changed
    let lastPinY = -1;
    let pinFrames = 0;
    let rE = -1;
    let rVp = -1;
    let rTs = NaN;
    let rG = false;
    let rProg = -1;
    const linkPE = [];

    const tick = (time) => {
      const sy = window.scrollY;
      if (sy !== lastPinY || ++pinFrames >= 20) {
        lastPinY = sy;
        pinFrames = 0;
        checkPin();
      }
      if (!state.visible) return;
      const dr = gsap.ticker.deltaRatio(60);
      if (moved) {
        moved = false;
        const b = root.getBoundingClientRect();
        tx = px - b.left;
        ty = py - b.top;
        if (!seeded) {
          cx = tx;
          cy = ty;
          seeded = true;
        }
      }
      if (setX) {
        const ex = tx - cx;
        const ey = ty - cy;
        if (Math.abs(ex) > 0.05 || Math.abs(ey) > 0.05) {
          // fast move -> circle trails behind; slow down -> it settles exactly on the cursor
          const k = 1 - Math.pow(1 - 0.2, dr);
          cx += ex * k;
          cy += ey * k;
          setX(cx);
          setY(cy);
        } else if (ex !== 0 || ey !== 0) {
          cx = tx;
          cy = ty;
          setX(cx);
          setY(cy);
        }
      }
      const now = performance.now();

      // ---- fixed 60Hz simulation (the reference does all of this once per frame) ----
      acc += dr;
      let steps = Math.floor(acc);
      acc -= steps;
      steps = Math.min(steps, 5);
      for (let i = 0; i < steps; i++) {
        // SmoothWheel: exponential approach to the target, truncated to whole px
        let d = 0;
        if (active) {
          if (keyActive) d = keyTween.d;
          else if (now < sw.until) {
            sw.target += ((sw.scrollPos - sw.current) * DECEL) | 0;
            d = sw.target - sw.current;
            sw.current = sw.target;
          }
        }
        // 1) input moves you directly
        if (d !== 0) {
          lastDelta = d;
          // elastic ends: input past the first/last project meets growing resistance
          const maxPos = (n - 1) * step;
          const over = pos < 0 ? -pos : pos > maxPos ? pos - maxPos : 0;
          const outward = (pos < 0 && d < 0) || (pos > maxPos && d > 0);
          const k = outward ? Math.pow(1 - Math.min(over / (0.3 * step), 1), 2) : 1;
          pos += 0.69 * d * k;
          if (outward && over > 0.25 * step) sw.scrollPos = sw.current; // drop leftover momentum
        }
        // 2) always-on pull to the nearest project (27% bias, direction = last delta)
        const t0 = pos / step;
        snapIdx = clamp(lastDelta >= 0 ? Math.floor(t0 + 1 - 0.27) : Math.floor(t0 + 0.27), 0, n - 1);
        pos += (snapIdx * step - pos) * (reduce ? 0.2 : clamp(0.05 * snapSpeed, 0.01, 0.5));
        pos = clamp(pos, -0.3 * step, (n - 1 + 0.3) * step);
        if (d === 0 && Math.abs(snapIdx * step - pos) < 0.01) pos = snapIdx * step; // settled
        if (!atTop() && !atEnd()) edgeFreeAt = now;
        // 3) glitch energy: e += 0.003*(|delta|-1); e *= 0.92
        const sp = Math.abs(d) * intensity; // this step only: no frozen glitch when input stops
        if (!reduce && sp > 1) energy += 0.003 * (sp - 1);
        // energy = clamp(energy * 0.92, 0, 4);
        energy = clamp(energy * 0.88, 0, 4);
        if (energy < 5e-4) energy = 0;
      }
      const t = pos / step;
      idx = snapIdx;

      // reference: the TITLE layer follows the position directly (no extra easing);
      // only the info PANEL layer is eased (u_position += 0.1 * (g - u_position))
      vp += (t - vp) * (1 - Math.pow(0.9, dr));
      if (Math.abs(t - vp) < 1e-4) vp = t; // settled
      const lo = n > 1 ? clamp(Math.floor(t), 0, n - 2) : 0;
      const f = n > 1 ? t - lo : 0;
      if (ensureTitles(lo)) state.force = true;

      // ---- panel texture: scramble / bars / real text ----
      let need = false;
      if (energy > 0.1 && ++frameN % 2 === 1) {
        paintScr();
        need = true;
      }
      if (prevE <= 0.1 && energy > 0.1) {
        gsap.killTweensOf(hintT);
        startRects();
      } else if (prevE > 0.1 && energy <= 0.1) {
        startReal();
        need = true;
      }
      if (energy > 0.1) {
        drawRects();
        need = true;
      }
      prevE = energy;
      if (energy <= 0.1 && drawnIdx !== idx) {
        startReal();
        need = true;
      }
      if (state.dirty) {
        state.dirty = false;
        if (energy > 0.1) paintScr();
        else paintReal(hintT.v);
        need = true;
      }
      if (texDirty) {
        texDirty = false;
        need = true;
      }
      if (need) tex.needsUpdate = true;

      const tScroll = f * uniforms.uTitleStride.value;
      const glitchOn = hoverRef.current && energy < 0.05;
      if (
        state.force ||
        need ||
        glitchOn !== rG ||
        glitchOn ||
        energy !== rE ||
        vp !== rVp ||
        tScroll !== rTs
      ) {
        uniforms.uPow.value = energy;
        uniforms.uPanelPos.value = vp;
        uniforms.uTitleScroll.value = tScroll;
        uniforms.uGlitch.value = glitchOn ? 0.003 : 0;
        if (glitchOn) uniforms.uTime.value = time;
        renderer.render(scene, camera);
        rE = energy;
        rVp = vp;
        rTs = tScroll;
        rG = glitchOn;
        state.force = false;
      }

      // hit-area only over the resting project
      const resting = energy <= 0.1 && Math.abs(t - idx) < 0.03;
      if (!resting && hoverRef.current) {
        hoverRef.current = false;
        if (dot) gsap.to(dot, { scale: 0, duration: 0.3, ease: "power3.out", overwrite: "auto" });
      }
      for (let i = 0; i < n; i++) {
        const a = linkRefs.current[i];
        const want = resting && i === idx ? "auto" : "none";
        if (a && linkPE[i] !== want) {
          a.style.pointerEvents = want;
          linkPE[i] = want;
        }
      }
      const prog = n > 1 ? clamp(t / (n - 1), 0, 1) : 1;
      if (progressRef.current && prog !== rProg) {
        rProg = prog;
        progressRef.current.style.transform = `scaleY(${prog})`;
      }
    };
    // section already at the top of the page (e.g. it is the first block): engage right away
    if (Math.abs(window.scrollY - startY()) <= 2) engage("top");

    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      gsap.killTweensOf(hintT);
      rects.forEach((r) => gsap.killTweensOf(r));
      release();
      clearTimeout(resizeTimer);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      root.removeEventListener("pointermove", onMove);
      link.removeEventListener("load", loadFonts);
      geometry.dispose();
      material.dispose();
      tex.dispose();
      TA.tex.dispose();
      TB.tex.dispose();
      renderer.domElement.removeEventListener("webglcontextlost", onCtxLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onCtxRestored);
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
      // release canvas backing stores right away (Safari keeps them otherwise)
      panel.width = panel.height = 0;
      TA.c.width = TA.c.height = 0;
      TB.c.width = TB.c.height = 0;
      if (renderer.forceContextLoss) renderer.forceContextLoss();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, intensity, wheelGain, touchGain, stepScale, snapSpeed, hintKey]);

  // const grow = (on) => {
  //   hoverRef.current = on;
  //   if (dotRef.current) {
  //     gsap.to(dotRef.current, { scale: on ? 1.05 : 0, duration: 0.5, ease: "power3.out", overwrite: "auto" , border:"2px solid #f5f5dc", backgroundColor:"transparent" });
  //   }
  // };
     const grow = (on, img) => {
     hoverRef.current = on;
     const dot = dotRef.current;
     if (!dot) return;
     if (on) dot.style.backgroundImage = img ? `url(${img})` : "none";
     gsap.to(dot, { scale: on ? 1 : 0, duration: 0.45, ease: "power3.out", overwrite: "auto" });
   };

  return (
    <section
      ref={rootRef}
      id="works"
      className="relative h-screen w-full overflow-hidden"
      style={{ backgroundColor: COLOR_BG, color: COLOR_FG }}
    >
      {/* WebGL layer: titles + tiled info panel + lens */}
      <div ref={hostRef} className="absolute inset-0 z-0" aria-hidden="true" />

      {/* Accessible, invisible hit-areas over the title of the current project */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {projects.map((p, i) => {
          const label = (Array.isArray(p.title) ? p.title : [p.title])
            .map((l) => (typeof l === "string" ? l : l.text))
            .join(" ");
          return (
            <a 
              key={p.id ?? i}
              ref={(el) => (linkRefs.current[i] = el)}
              href={p.href || "#"}
              onClick={(e) => {
                if (onSelect) {
                  e.preventDefault();
                  onSelect(p, i);
                } else if (!p.href) e.preventDefault();
              }}
              // onMouseEnter={() => grow(true)}
                 onMouseEnter={() => grow(true, p.image)}
              onMouseLeave={() => grow(false)}
              className="pointer-events-none cursor-pointer absolute left-[8%] top-[22%] block h-[44%] w-[84%] md:left-[41%] md:top-[18%] md:h-[58%] md:w-[52%]"
              style={{ pointerEvents: i === 0 ? "auto" : "none" }}
            >
              <span className="sr-only border ">{`${label}: view project`}</span>
            </a>
          );
        })}
      </div>

      {/* Right rail */}
      <aside
        className="absolute bottom-0 z-20 flex h-fit flex-col items-center justify-between "
        style={{ right: "max(12px, 1.25vw)", paddingTop: "max(16px, 1.25vw)", paddingBottom: "0px" }}
      >
        {/* <svg
          viewBox="0 0 22 26"
          fill="none"
          aria-hidden="true"
          style={{ width: "max(16px, 1.146vw)", height: "auto" }}
        >
          {[3, 7, 11, 15, 19].map((x, k) => (
            <rect
              key={x}
              x={x}
              y={[8, 0, 12, 4, 10][k]}
              width="1.6"
              height={[18, 26, 14, 22, 16][k]}
              fill="currentColor"
            />
          ))}
        </svg> */}

        {/* <nav className="flex flex-col items-center" style={{ gap: "max(24px, 2.083vw)" }}>
          {navItems.map((it) => (
            <a
              key={it.label}
              href={it.href}
              className={`font-normal tracking-[0.18em] transition-opacity hover:opacity-100 [writing-mode:vertical-rl] ${
                it.active ? "opacity-100" : "opacity-50"
              }`}
              style={{ fontFamily: TITLE_FONT, fontSize: "max(9px, 0.573vw)" }}
            >
              {it.label}
            </a>
          ))}
        </nav> */}

        <div className="flex flex-col items-center" style={{ gap: "max(8px, 0.625vw)" }}>
          <span
            className="font-light tracking-[0.2em] opacity-60 [writing-mode:vertical-rl]"
            style={{ fontFamily: TITLE_FONT, fontSize: "max(8px, 0.521vw)" }}
          >
            SCROLL
          </span>
          <div
          className="relative w-px"
          style={{ height: "max(64px, 5vw)", backgroundColor: "rgba(245,245,220,0.25)" }}
        >
            <div
              ref={progressRef}
              className="absolute inset-0 origin-top"
              style={{ transform: "scaleY(0)", backgroundColor: COLOR_FG }}
            />
          </div>
        </div>
      </aside> 

      {/* Cursor dot */}
      <div
        ref={dotRef}
        className="pointer-events-none absolute left-0 top-0 z-30 rounded-full [@media(pointer:coarse)]:hidden"
        style={{ width: "14vw", height: "14vw", backgroundColor: COLOR_FG ,backgroundSize: "cover",
  backgroundPosition: "center",border: "1px solid #F5F5DC", }} /* 269px at 1920px wide */
        aria-hidden="true"
      />
    </section>
  );
}

export default memo(ProjectShowcase);