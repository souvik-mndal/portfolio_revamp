// import { useEffect, useRef } from "react";
// import gsap from "gsap";
// import { ScrollTrigger } from "gsap/ScrollTrigger";

// gsap.registerPlugin(ScrollTrigger);

// /* tear shape: same values as the demo */
// const TEAR = { amp: 0.175, scale: 12.2, soft: 0.001, lens: -0.275, octaves: 5 };

// const VERT = `
//   attribute vec2 aPos;
//   varying vec2 vUv;
//   void main() {
//     vUv = aPos * 0.5 + 0.5;
//     gl_Position = vec4(aPos, 0.0, 1.0);
//   }
// `;

// const FRAG = `
//   precision highp float;
//   varying vec2 vUv;

//   uniform float uP;
//   uniform float uAspect;
//   uniform vec3  uColor;
//   uniform float uDispAmp;
//   uniform float uDispScale;
//   uniform float uSoft;
//   uniform float uLens;
//   uniform int   uDetail;

//   float hash(vec2 p) {
//     return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
//   }

//   float vnoise(vec2 p) {
//     vec2 i = floor(p);
//     vec2 f = fract(p);
//     vec2 u = f * f * (3.0 - 2.0 * f);
//     return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
//                mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
//   }

//   float fbm(vec2 p, int oct) {
//     float v = 0.0;
//     float a = 0.5;
//     for (int i = 0; i < 6; i++) {
//       if (i >= oct) break;
//       v += a * vnoise(p);
//       p *= 2.03;
//       a *= 0.5;
//     }
//     return v;
//   }

//   vec2 lensAt(vec2 uv, float k) {
//     vec2 d = uv - 0.5;
//     return 0.5 + d * (1.0 + k * dot(d, d) * 4.0);
//   }

//   void main() {
//     vec2 uv = (uLens == 0.0) ? vUv : lensAt(vUv, uLens);
//     uv = clamp(uv, 0.0, 1.0);

//     float noise = fbm(vec2(uv.x * uAspect, uv.y) * uDispScale, uDetail) - 0.5;
//     float edge = mix(-uDispAmp, 1.0 + uDispAmp, uP);
//     float field = (edge - uv.y) + noise * uDispAmp * 2.0;

//     float a = smoothstep(-uSoft, uSoft, field);
//     a = max(a, smoothstep(0.985, 1.0, uP));

//     gl_FragColor = vec4(uColor * a, a); // premultiplied alpha
//   }
// `;

// const hexToRgb = (hex) => {
//   const v = parseInt(hex.replace("#", ""), 16);
//   return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
// };

// export default function TearTransition({
//   from,
//   to,
//   color = "#F5F5DC", // must match the first viewport of `to`
//   distance = 1, // tear length, in viewport heights of scroll
//   finish = 0.92, // fraction of `distance` at which the tear is complete
// }) {
//   const wrapRef = useRef(null);
//   const stageRef = useRef(null);
//   const hostRef = useRef(null);

//   useEffect(() => {
//     const wrap = wrapRef.current;
//     const stage = stageRef.current;
//     const host = hostRef.current;
//     if (!wrap || !stage || !host) return;

//     const canvas = document.createElement("canvas");
//     canvas.className = "block h-full w-full";
//     canvas.setAttribute("aria-hidden", "true");
//     canvas.style.visibility = "hidden";
//     host.appendChild(canvas);

//     let gl = null;
//     let loc = null;
//     let ok = false;
//     let progress = 0;
//     let shown = false;

//     const setup = () => {
//       gl = canvas.getContext("webgl", {
//         alpha: true,
//         premultipliedAlpha: true,
//         antialias: false,
//         depth: false,
//         stencil: false,
//       });
//       if (!gl) return false;

//       const compile = (type, src) => {
//         const s = gl.createShader(type);
//         gl.shaderSource(s, src);
//         gl.compileShader(s);
//         if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
//           console.error("[TearTransition] shader compile failed:", gl.getShaderInfoLog(s));
//           return null;
//         }
//         return s;
//       };
//       const vs = compile(gl.VERTEX_SHADER, VERT);
//       const fs = compile(gl.FRAGMENT_SHADER, FRAG);
//       if (!vs || !fs) return false;

//       const prog = gl.createProgram();
//       gl.attachShader(prog, vs);
//       gl.attachShader(prog, fs);
//       gl.linkProgram(prog);
//       if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
//         console.error("[TearTransition] program link failed:", gl.getProgramInfoLog(prog));
//         return false;
//       }
//       gl.useProgram(prog);

//       const buf = gl.createBuffer();
//       gl.bindBuffer(gl.ARRAY_BUFFER, buf);
//       gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
//       const aPos = gl.getAttribLocation(prog, "aPos");
//       gl.enableVertexAttribArray(aPos);
//       gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

//       const u = (n) => gl.getUniformLocation(prog, n);
//       loc = { p: u("uP"), aspect: u("uAspect") };
//       gl.uniform3fv(u("uColor"), hexToRgb(color));
//       gl.uniform1f(u("uDispAmp"), TEAR.amp);
//       gl.uniform1f(u("uDispScale"), TEAR.scale);
//       gl.uniform1f(u("uSoft"), TEAR.soft);
//       gl.uniform1f(u("uLens"), TEAR.lens);
//       gl.uniform1i(u("uDetail"), TEAR.octaves);
//       gl.clearColor(0, 0, 0, 0);
//       return true;
//     };

//     const resize = () => {
//       const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
//       const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
//       const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
//       if (canvas.width === w && canvas.height === h) return;
//       canvas.width = w; // resizing clears the buffer: caller must redraw
//       canvas.height = h;
//       if (ok) {
//         gl.viewport(0, 0, w, h);
//         gl.uniform1f(loc.aspect, w / h);
//       }
//     };

//     const draw = (p) => {
//       progress = p;
//       const show = p > 0.001;
//       if (show !== shown) {
//         shown = show;
//         canvas.style.visibility = show ? "visible" : "hidden";
//       }
//       if (!show) return;
//       if (!ok) {
//         // no WebGL: plain fade to `color`
//         canvas.style.backgroundColor = color;
//         canvas.style.opacity = String(p);
//         return;
//       }
//       gl.uniform1f(loc.p, p);
//       gl.clear(gl.COLOR_BUFFER_BIT);
//       gl.drawArrays(gl.TRIANGLES, 0, 3);
//     };

//     const onLost = (e) => {
//       e.preventDefault();
//       ok = false;
//     };
//     const onRestored = () => {
//       ok = setup();
//       canvas.style.opacity = "1";
//       resize();
//       draw(progress);
//     };
//     canvas.addEventListener("webglcontextlost", onLost);
//     canvas.addEventListener("webglcontextrestored", onRestored);

//     ok = setup();
//     resize();

//     const ro = new ResizeObserver(() => {
//       resize();
//       draw(progress);
//     });
//     ro.observe(stage);

//     const toProgress = (self) => Math.min(self.progress / finish, 1);
//     const st = ScrollTrigger.create({
//       trigger: wrap,
//       start: "top top",
//       end: () => `+=${stage.offsetHeight * distance}`,
//       invalidateOnRefresh: true,
//       onUpdate: (self) => draw(toProgress(self)),
//       onRefresh: (self) => draw(toProgress(self)),
//     });

//     return () => {
//       st.kill();
//       ro.disconnect();
//       canvas.removeEventListener("webglcontextlost", onLost);
//       canvas.removeEventListener("webglcontextrestored", onRestored);
//       if (gl) gl.getExtension("WEBGL_lose_context")?.loseContext();
//       if (canvas.parentNode === host) host.removeChild(canvas);
//     };
//   }, [color, distance, finish]);

//   return (
//     <>
//       <div
//         ref={wrapRef}
//         data-tear-anchor
//         className="relative w-full"
//         style={{ height: `${(1 + distance) * 100}vh` }}
//       >
//         <div ref={stageRef} className="sticky top-0 h-screen w-full overflow-hidden">
//           {from}
//           <div ref={hostRef} className="pointer-events-none absolute inset-0 z-50" aria-hidden="true" />
//         </div>
//       </div>
//       {to}
//     </>
//   );
// }




































// import { useEffect, useRef } from "react";
// import gsap from "gsap";
// import { ScrollTrigger } from "gsap/ScrollTrigger";

// gsap.registerPlugin(ScrollTrigger);

// /**
//  * TearTransition
//  * --------------
//  * <TearTransition from={<ProjectShowcase />} to={<CircleGallery />} />
//  *
//  * Layout:
//  *   wrapper (data-tear-anchor, 200vh)
//  *     └─ sticky stage (100vh)  = `from` + tear canvas on top
//  *   `to` follows in normal flow.
//  *
//  * The stage sticks for `distance` viewport-heights of native scroll. While it
//  * is stuck, a WebGL canvas paints `color` through a noisy rising edge, so
//  * `from` is torn away. At the end the stage is solid `color`, which must equal
//  * the first viewport of `to`, so the hand-off is invisible.
//  *
//  * No toDataURL / CSS mask: the canvas IS the reveal layer (no GPU readback).
//  * `color` must be a 6-digit hex.
//  */

// /* tear shape: same values as the demo */
// const TEAR = { amp: 0.175, scale: 12.2, soft: 0.001, lens: -0.275, octaves: 5 };

// /* Measured on 16:9, 21:9, 4:3, 1:1 and phone: the first pixel of the tear shows at
//    p~0.17 and the screen is fully covered by p~0.83. Outside that band scrolling
//    changes nothing on screen, so scroll is mapped onto [P0, P1] only. */
// const P0 = 0.15;
// const P1 = 0.84;

// const VERT = `
//   attribute vec2 aPos;
//   varying vec2 vUv;
//   void main() {
//     vUv = aPos * 0.5 + 0.5;
//     gl_Position = vec4(aPos, 0.0, 1.0);
//   }
// `;

// const FRAG = `
//   precision highp float;
//   varying vec2 vUv;

//   uniform float uP;
//   uniform float uAspect;
//   uniform vec3  uColor;
//   uniform float uDispAmp;
//   uniform float uDispScale;
//   uniform float uSoft;
//   uniform float uLens;
//   uniform int   uDetail;

//   float hash(vec2 p) {
//     return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
//   }

//   float vnoise(vec2 p) {
//     vec2 i = floor(p);
//     vec2 f = fract(p);
//     vec2 u = f * f * (3.0 - 2.0 * f);
//     return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
//                mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
//   }

//   float fbm(vec2 p, int oct) {
//     float v = 0.0;
//     float a = 0.5;
//     for (int i = 0; i < 6; i++) {
//       if (i >= oct) break;
//       v += a * vnoise(p);
//       p *= 2.03;
//       a *= 0.5;
//     }
//     return v;
//   }

//   vec2 lensAt(vec2 uv, float k) {
//     vec2 d = uv - 0.5;
//     return 0.5 + d * (1.0 + k * dot(d, d) * 4.0);
//   }

//   void main() {
//     vec2 uv = (uLens == 0.0) ? vUv : lensAt(vUv, uLens);
//     uv = clamp(uv, 0.0, 1.0);

//     float noise = fbm(vec2(uv.x * uAspect, uv.y) * uDispScale, uDetail) - 0.5;
//     float edge = mix(-uDispAmp, 1.0 + uDispAmp, uP);
//     float field = (edge - uv.y) + noise * uDispAmp * 2.0;

//     float a = smoothstep(-uSoft, uSoft, field);
//     a = max(a, smoothstep(0.985, 1.0, uP));

//     gl_FragColor = vec4(uColor * a, a); // premultiplied alpha
//   }
// `;

// const hexToRgb = (hex) => {
//   const v = parseInt(hex.replace("#", ""), 16);
//   return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
// };

// export default function TearTransition({
//   from,
//   to,
//   color = "#F5F5DC", // must match the first viewport of `to`
//   distance = 1, // tear length, in viewport heights of scroll
//   finish = 0.95, // fraction of `distance` at which the tear is complete (short hold before unstick) (short hold before unstick)
// }) {
//   const wrapRef = useRef(null);
//   const stageRef = useRef(null);
//   const hostRef = useRef(null);

//   useEffect(() => {
//     const wrap = wrapRef.current;
//     const stage = stageRef.current;
//     const host = hostRef.current;
//     if (!wrap || !stage || !host) return;

//     // created here (not in JSX) so StrictMode remounts get a fresh GL context
//     const canvas = document.createElement("canvas");
//     canvas.className = "block h-full w-full";
//     canvas.setAttribute("aria-hidden", "true");
//     canvas.style.visibility = "hidden";
//     host.appendChild(canvas);

//     let gl = null;
//     let loc = null;
//     let ok = false;
//     let progress = 0;
//     let shown = false;

//     const setup = () => {
//       gl = canvas.getContext("webgl", {
//         alpha: true,
//         premultipliedAlpha: true,
//         antialias: false,
//         depth: false,
//         stencil: false,
//       });
//       if (!gl) return false;

//       const compile = (type, src) => {
//         const s = gl.createShader(type);
//         gl.shaderSource(s, src);
//         gl.compileShader(s);
//         if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
//           console.error("[TearTransition] shader compile failed:", gl.getShaderInfoLog(s));
//           return null;
//         }
//         return s;
//       };
//       const vs = compile(gl.VERTEX_SHADER, VERT);
//       const fs = compile(gl.FRAGMENT_SHADER, FRAG);
//       if (!vs || !fs) return false;

//       const prog = gl.createProgram();
//       gl.attachShader(prog, vs);
//       gl.attachShader(prog, fs);
//       gl.linkProgram(prog);
//       if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
//         console.error("[TearTransition] program link failed:", gl.getProgramInfoLog(prog));
//         return false;
//       }
//       gl.useProgram(prog);

//       const buf = gl.createBuffer();
//       gl.bindBuffer(gl.ARRAY_BUFFER, buf);
//       gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
//       const aPos = gl.getAttribLocation(prog, "aPos");
//       gl.enableVertexAttribArray(aPos);
//       gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

//       const u = (n) => gl.getUniformLocation(prog, n);
//       loc = { p: u("uP"), aspect: u("uAspect") };
//       // static uniforms: set once
//       gl.uniform3fv(u("uColor"), hexToRgb(color));
//       gl.uniform1f(u("uDispAmp"), TEAR.amp);
//       gl.uniform1f(u("uDispScale"), TEAR.scale);
//       gl.uniform1f(u("uSoft"), TEAR.soft);
//       gl.uniform1f(u("uLens"), TEAR.lens);
//       gl.uniform1i(u("uDetail"), TEAR.octaves);
//       gl.clearColor(0, 0, 0, 0);
//       return true;
//     };

//     const resize = () => {
//       const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
//       const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
//       const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
//       if (canvas.width === w && canvas.height === h) return;
//       canvas.width = w; // resizing clears the buffer: caller must redraw
//       canvas.height = h;
//       if (ok) {
//         gl.viewport(0, 0, w, h);
//         gl.uniform1f(loc.aspect, w / h);
//       }
//     };

//     const draw = (t) => {
//       progress = t;
//       const p = t >= 1 ? 1 : P0 + (P1 - P0) * t; // t=1 forces full cover
//       const show = t > 0; // fully hidden at 0: nothing can peek through
//       if (show !== shown) {
//         shown = show;
//         canvas.style.visibility = show ? "visible" : "hidden";
//       }
//       if (!show) return;
//       if (!ok) {
//         // no WebGL: plain fade to `color` so the page still works
//         canvas.style.backgroundColor = color;
//         canvas.style.opacity = String(t);
//         return;
//       }
//       gl.uniform1f(loc.p, p);
//       gl.clear(gl.COLOR_BUFFER_BIT);
//       gl.drawArrays(gl.TRIANGLES, 0, 3);
//     };

//     const onLost = (e) => {
//       e.preventDefault();
//       ok = false;
//     };
//     const onRestored = () => {
//       ok = setup();
//       canvas.style.opacity = "1";
//       resize();
//       draw(progress);
//     };
//     canvas.addEventListener("webglcontextlost", onLost);
//     canvas.addEventListener("webglcontextrestored", onRestored);

//     ok = setup();
//     resize();

//     const ro = new ResizeObserver(() => {
//       resize();
//       draw(progress); // keeps the tear correct after a resize
//     });
//     ro.observe(stage);

//     const apply = (self) => {
//       // stage is on top of `to`; once the tear is complete both are the same colour,
//       // so hide it and let `to` start animating immediately
//       stage.style.visibility = self.progress >= 1 ? "hidden" : "visible";
//       draw(Math.min(self.progress / finish, 1));
//     };
//     const st = ScrollTrigger.create({
//       trigger: wrap,
//       start: "top top",
//       end: () => `+=${stage.offsetHeight * distance}`, // matches the CSS sticky distance exactly
//       invalidateOnRefresh: true,
//       onUpdate: apply,
//       onRefresh: apply,
//     });

//     return () => {
//       st.kill();
//       ro.disconnect();
//       canvas.removeEventListener("webglcontextlost", onLost);
//       canvas.removeEventListener("webglcontextrestored", onRestored);
//       if (gl) gl.getExtension("WEBGL_lose_context")?.loseContext();
//       if (canvas.parentNode === host) host.removeChild(canvas);
//     };
//   }, [color, distance, finish]);

//   return (
//     <>
//       {/* data-tear-anchor: non-sticky element that ProjectShowcase uses as its engage point */}
//       <div
//         ref={wrapRef}
//         data-tear-anchor
//         className="relative w-full"
//         style={{ height: `${(1 + distance) * 100}vh` }}
//       >
//         <div ref={stageRef} className="sticky top-0 z-10 h-screen w-full overflow-hidden">
//           {from}
//           <div ref={hostRef} className="pointer-events-none absolute inset-0 z-50" aria-hidden="true" />
//         </div>
//       </div>
//       {/* pulled up by one viewport: `to` starts exactly when the tear ends (no blank scroll) */}
//       <div className="relative z-0" style={{ marginTop: "-100vh" }}>
//         {to}
//       </div>
//     </>
//   );
// }


















































import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * TearTransition
 * --------------
 * <TearTransition from={<ProjectShowcase />} to={<CircleGallery />} />
 *
 * Layout:
 *   wrapper (data-tear-anchor, 200vh)
 *     └─ sticky stage (100vh)  = `from` + tear canvas on top
 *   `to` follows in normal flow.
 *
 * The stage sticks for `distance` viewport-heights of native scroll. While it
 * is stuck, a WebGL canvas paints `color` through a noisy rising edge, so
 * `from` is torn away. At the end the stage is solid `color`, which must equal
 * the first viewport of `to`, so the hand-off is invisible.
 *
 * No toDataURL / CSS mask: the canvas IS the reveal layer (no GPU readback).
 * `color` must be a 6-digit hex.
 */

/* tear shape: same values as the demo */
const TEAR = { amp: 0.175, scale: 12.2, soft: 0.001, lens: -0.275, octaves: 5 };

/* Measured on 16:9, 21:9, 4:3, 1:1 and phone: the first pixel of the tear shows at
   p~0.17 and the screen is fully covered by p~0.83. Outside that band scrolling
   changes nothing on screen, so scroll is mapped onto [P0, P1] only. */
const P0 = 0.15;
const P1 = 0.84;

const VERT = `
  attribute vec2 aPos;
  varying vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

const FRAG = `
  precision highp float;
  varying vec2 vUv;

  uniform float uP;
  uniform float uAspect;
  uniform vec3  uColor;
  uniform float uDispAmp;
  uniform float uDispScale;
  uniform float uSoft;
  uniform float uLens;
  uniform int   uDetail;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 p, int oct) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 6; i++) {
      if (i >= oct) break;
      v += a * vnoise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }

  vec2 lensAt(vec2 uv, float k) {
    vec2 d = uv - 0.5;
    return 0.5 + d * (1.0 + k * dot(d, d) * 4.0);
  }

  void main() {
    vec2 uv = (uLens == 0.0) ? vUv : lensAt(vUv, uLens);
    uv = clamp(uv, 0.0, 1.0);

    float noise = fbm(vec2(uv.x * uAspect, uv.y) * uDispScale, uDetail) - 0.5;
    float edge = mix(-uDispAmp, 1.0 + uDispAmp, uP);
    float field = (edge - uv.y) + noise * uDispAmp * 2.0;

    float a = smoothstep(-uSoft, uSoft, field);
    a = max(a, smoothstep(0.985, 1.0, uP));

    gl_FragColor = vec4(uColor * a, a); // premultiplied alpha
  }
`;

const hexToRgb = (hex) => {
  const v = parseInt(hex.replace("#", ""), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};

export default function TearTransition({
  from,
  to,
  color = "#F5F5DC", // must match the first viewport of `to`
  distance = 1, // tear length, in viewport heights of scroll
  finish = 0.95, // fraction of `distance` at which the tear is complete (short hold before unstick) (short hold before unstick)
}) {
  const wrapRef = useRef(null);
  const stageRef = useRef(null);
  const hostRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    const host = hostRef.current;
    if (!wrap || !stage || !host) return;

    // created here (not in JSX) so StrictMode remounts get a fresh GL context
    const canvas = document.createElement("canvas");
    canvas.className = "block h-full w-full";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.visibility = "hidden";
    host.appendChild(canvas);

    let gl = null;
    let loc = null;
    let ok = false;
    let progress = 0;
    let shown = false;

    const setup = () => {
      gl = canvas.getContext("webgl", {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false,
      });
      if (!gl) return false;

      const compile = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          console.error("[TearTransition] shader compile failed:", gl.getShaderInfoLog(s));
          return null;
        }
        return s;
      };
      const vs = compile(gl.VERTEX_SHADER, VERT);
      const fs = compile(gl.FRAGMENT_SHADER, FRAG);
      if (!vs || !fs) return false;

      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("[TearTransition] program link failed:", gl.getProgramInfoLog(prog));
        return false;
      }
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(prog, "aPos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      const u = (n) => gl.getUniformLocation(prog, n);
      loc = { p: u("uP"), aspect: u("uAspect") };
      // static uniforms: set once
      gl.uniform3fv(u("uColor"), hexToRgb(color));
      gl.uniform1f(u("uDispAmp"), TEAR.amp);
      gl.uniform1f(u("uDispScale"), TEAR.scale);
      gl.uniform1f(u("uSoft"), TEAR.soft);
      gl.uniform1f(u("uLens"), TEAR.lens);
      gl.uniform1i(u("uDetail"), TEAR.octaves);
      gl.clearColor(0, 0, 0, 0);
      return true;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w; // resizing clears the buffer: caller must redraw
      canvas.height = h;
      if (ok) {
        gl.viewport(0, 0, w, h);
        gl.uniform1f(loc.aspect, w / h);
      }
    };

    const draw = (t) => {
      progress = t;
      const p = t >= 1 ? 1 : P0 + (P1 - P0) * t; // t=1 forces full cover
      const show = t > 0; // fully hidden at 0: nothing can peek through
      if (show !== shown) {
        shown = show;
        canvas.style.visibility = show ? "inherit" : "hidden"; // "inherit", not "visible": must obey the stage when it is hidden
      }
      if (!show) return;
      if (!ok) {
        // no WebGL: plain fade to `color` so the page still works
        canvas.style.backgroundColor = color;
        canvas.style.opacity = String(t);
        return;
      }
      gl.uniform1f(loc.p, p);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const onLost = (e) => {
      e.preventDefault();
      ok = false;
    };
    const onRestored = () => {
      ok = setup();
      canvas.style.opacity = "1";
      resize();
      draw(progress);
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    ok = setup();
    resize();

    const ro = new ResizeObserver(() => {
      resize();
      draw(progress); // keeps the tear correct after a resize
    });
    ro.observe(stage);

    const apply = (self) => {
      // stage is on top of `to`; once the tear is complete both are the same colour,
      // so hide it and let `to` start animating immediately
      const done = self.progress >= 1;
      stage.style.visibility = done ? "hidden" : "visible";
      stage.style.opacity = done ? "0" : "1"; // belt and braces: hides everything inside, even children that set their own visibility
      draw(Math.min(self.progress / finish, 1));
    };
    const st = ScrollTrigger.create({
      trigger: wrap,
      start: "top top",
      end: () => `+=${stage.offsetHeight * distance}`, // matches the CSS sticky distance exactly
      invalidateOnRefresh: true,
      onUpdate: apply,
      onRefresh: apply,
    });

    return () => {
      st.kill();
      ro.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      if (gl) gl.getExtension("WEBGL_lose_context")?.loseContext();
      if (canvas.parentNode === host) host.removeChild(canvas);
    };
  }, [color, distance, finish]);

  return (
    <>
      {/* data-tear-anchor: non-sticky element that ProjectShowcase uses as its engage point */}
      <div
        ref={wrapRef}
        data-tear-anchor
        className="relative w-full"
        style={{ height: `${(1 + distance) * 100}vh` }}
      >
        <div ref={stageRef} className="sticky top-0 z-10 h-screen w-full overflow-hidden">
          {from}
          <div ref={hostRef} className="pointer-events-none absolute inset-0 z-50" aria-hidden="true" />
        </div>
      </div>
      {/* pulled up by one viewport: `to` starts exactly when the tear ends (no blank scroll) */}
      <div className="relative z-0" style={{ marginTop: "-100vh" }}>
        {to}
      </div>
    </>
  );
}