// import { useEffect, useRef } from 'react';
// import * as THREE from 'three';

// const AbstractMorphingShader = () => {
//   const containerRef = useRef(null);

//   useEffect(() => {
//     if (!containerRef.current) return;
//     const container = containerRef.current;

//     const renderer = new THREE.WebGLRenderer({
//       antialias: false,           // antialias off — imperceptible at this scale, saves GPU
//       powerPreference: 'default', // 'high-performance' keeps discrete GPU awake, not needed
//       alpha: true,
//     });

//     renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

//     const scale = 0.85;
//     const width  = container.clientWidth  * scale;
//     const height = container.clientHeight * scale;

//     // renderer.setSize(width, height, false);
//     // renderer.outputColorSpace = THREE.SRGBColorSpace;
//     // container.appendChild(renderer.domElement);

//     renderer.setSize(width, height, false);
//     renderer.outputColorSpace = THREE.SRGBColorSpace;
//     const canvas = renderer.domElement;
//     canvas.style.width = "100%";
//     canvas.style.height = "100%";
//     canvas.style.display = "block";
//     container.appendChild(canvas);

//     const scene    = new THREE.Scene();
//     const camera   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

//     const uniforms = {
//       iTime:       { value: 0 },
//       iResolution: { value: new THREE.Vector3(width, height, 1) },
//       iOpacity:    { value: 0 },
//     };

//     const vertexShader = `
//       precision mediump float;
//       varying vec2 vUv;
//       void main() {
//         vUv = uv;
//         gl_Position = vec4(position.xy, 0.0, 1.0);
//       }
//     `;

//     // mediump instead of highp — sufficient for this shader, faster on mobile
//     const fragmentShader = `
//       precision mediump float;

//       uniform vec3  iResolution;
//       uniform float iTime;
//       uniform float iOpacity;
//       varying vec2  vUv;

//       float hash(vec2 p) {
//         p = fract(p * vec2(123.34, 345.45));
//         p += dot(p, p + 34.345);
//         return fract(p.x * p.y);
//       }

//       float noise(vec2 p) {
//         vec2 i = floor(p);
//         vec2 f = fract(p);
//         vec2 u = f*f*(3.0-2.0*f);
//         float a = hash(i);
//         float b = hash(i + vec2(1.0, 0.0));
//         float c = hash(i + vec2(0.0, 1.0));
//         float d = hash(i + vec2(1.0, 1.0));
//         return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
//       }

//       float fbm(vec2 p) {
//         float value = 0.0;
//         float amp   = 0.5;
//         for (int i = 0; i < 3; i++) {
//           value += amp * noise(p);
//           p     *= 1.8;
//           amp   *= 0.5;
//         }
//         return value;
//       }

//       mat2 rot(float a) {
//         float s = sin(a), c = cos(a);
//         return mat2(c, -s, s, c);
//       }

//       void main() {
//         vec2 uv = vUv;
//         vec2 p  = uv * 2.0 - 1.0;

//         float aspect = iResolution.x / iResolution.y;
//         p.x *= aspect;

//         float t = iTime * 0.45;

//         vec2 warp = vec2(fbm(p * 0.8 + t), fbm(p * 0.8 - t));
//         p += (warp - 0.5) * 0.7;

//         float angle = fbm(p * 0.5 + t * 0.8) * 1.6;
//         p = rot(angle) * p;

//         float flow = sin(p.x * 3.0 + fbm(p * 2.0) * 3.0 + t);
//         flow      += cos(p.y * 2.0 - fbm(p * 1.5) * 2.0 - t);
//         flow      *= 0.5;
//         flow       = smoothstep(-0.3, 0.3, flow);

//         float blob = fbm(p * 1.2 - t * 0.2);
//         blob       = smoothstep(0.4, 0.7, blob);

//         float finalPattern = mix(flow, 1.0 - flow, blob);
//         float c = finalPattern;
//         c = smoothstep(0.2, 0.75, c);
//         c = pow(c, 1.6);

//         gl_FragColor = vec4(vec3(c), iOpacity);
//       }
//     `;

//     const geometry = new THREE.PlaneGeometry(2, 2);
//     const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true });
//     const mesh     = new THREE.Mesh(geometry, material);
//     scene.add(mesh);

//     // ── Animation state ───────────────────────────────────────────────────
//     let rafId       = null;
//     let lastTime    = 0;
//     let startTime   = null;
//     let isVisible   = true;           // controlled by IntersectionObserver
//     const fps       = 45;
//     const fpsInterval = 1000 / fps;
//     const fadeInDuration = 2000;

//     const animate = (time) => {
//       rafId = requestAnimationFrame(animate);

//       // Stop rendering when off screen — saves GPU entirely
//       if (!isVisible) return;

//       // FPS cap
//       if (time - lastTime < fpsInterval) return;
//       lastTime = time;

//       if (!startTime) startTime = time;
//       const elapsed = time - startTime;

//       uniforms.iTime.value    = time * 0.001;
//       uniforms.iOpacity.value = Math.min(elapsed / fadeInDuration, 1.0);

//       renderer.render(scene, camera);
//     };

//     rafId = requestAnimationFrame(animate);

//     // ── IntersectionObserver — pause when off screen ───────────────────
//     const observer = new IntersectionObserver(
//       ([entry]) => { isVisible = entry.isIntersecting; },
//       { threshold: 0 }
//     );
//     observer.observe(container);

//     // ── Debounced resize ──────────────────────────────────────────────
//     let resizeTimeout;
//     const handleResize = () => {
//       clearTimeout(resizeTimeout);
//       resizeTimeout = setTimeout(() => {
//         const w = container.clientWidth  * scale;
//         const h = container.clientHeight * scale;
//         renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
//         renderer.setSize(w, h, false);
//         uniforms.iResolution.value.set(w, h, 1);
//       }, 150);
//     };

//     window.addEventListener('resize', handleResize, { passive: true });

//     return () => {
//       window.removeEventListener('resize', handleResize);
//       cancelAnimationFrame(rafId);
//       observer.disconnect();
//       clearTimeout(resizeTimeout);
//       // Full GPU cleanup
//       scene.remove(mesh);
//       geometry.dispose();
//       material.dispose();
//       renderer.dispose();
//       renderer.forceContextLoss();
//       if (container.contains(renderer.domElement)) {
//         container.removeChild(renderer.domElement);
//       }
//     };
//   }, []);

//   return (
//     <div
//       ref={containerRef}
//       className="absolute inset-0 overflow-hidden pointer-events-none"
//       aria-label="Black and white abstract background"
//     />
//   );
// };

// export default AbstractMorphingShader;





























import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// ── Render budget ─────────────────────────────────────────────────────────
// The shader is drawn at a LOW resolution and stretched to fill the hero by
// CSS (that is the soft look). To keep that look and the GPU cost identical on
// huge / 4K screens, the render size is capped at a fixed pixel budget.
const BASE_SCALE = 0.85;      // same soft look as before on normal screens
const MAX_DPR    = 1.5;       // same cap as before
const MAX_PIXELS = 1_600_000; // ~1.6MP: roughly a 1080p screen at the old scale

const AbstractMorphingShader = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // Size of the render buffer (NOT the displayed size).
    // Under the budget => identical to the old behaviour.
    // Over the budget  => scaled down so cost + softness stay constant.
    const getRenderSize = () => {
      const cw  = container.clientWidth  || 1;
      const ch  = container.clientHeight || 1;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      let s = BASE_SCALE * dpr;
      const pixels = cw * ch * s * s;
      if (pixels > MAX_PIXELS) s *= Math.sqrt(MAX_PIXELS / pixels);
      return { w: Math.max(1, Math.round(cw * s)), h: Math.max(1, Math.round(ch * s)) };
    };

    const renderer = new THREE.WebGLRenderer({
      antialias: false,           // antialias off — imperceptible at this scale, saves GPU
      powerPreference: 'default', // 'high-performance' keeps discrete GPU awake, not needed
      alpha: true,
    });

    // Pixel ratio is already baked into getRenderSize(), so keep this at 1
    renderer.setPixelRatio(1);

    const { w: width, h: height } = getRenderSize();

    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Stretch the low-res buffer to fill the container at ANY screen size
    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const scene    = new THREE.Scene();
    const camera   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
      iTime:       { value: 0 },
      iResolution: { value: new THREE.Vector3(width, height, 1) },
      iOpacity:    { value: 0 },
    };

    const vertexShader = `
      precision mediump float;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `;

    // mediump instead of highp — sufficient for this shader, faster on mobile
    const fragmentShader = `
      precision mediump float;

      uniform vec3  iResolution;
      uniform float iTime;
      uniform float iOpacity;
      varying vec2  vUv;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 345.45));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f*f*(3.0-2.0*f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amp   = 0.5;
        for (int i = 0; i < 3; i++) {
          value += amp * noise(p);
          p     *= 1.8;
          amp   *= 0.5;
        }
        return value;
      }

      mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
      }

      void main() {
        vec2 uv = vUv;
        vec2 p  = uv * 2.0 - 1.0;

        float aspect = iResolution.x / iResolution.y;
        p.x *= aspect;

        float t = iTime * 0.45;

        vec2 warp = vec2(fbm(p * 0.8 + t), fbm(p * 0.8 - t));
        p += (warp - 0.5) * 0.7;

        float angle = fbm(p * 0.5 + t * 0.8) * 1.6;
        p = rot(angle) * p;

        float flow = sin(p.x * 3.0 + fbm(p * 2.0) * 3.0 + t);
        flow      += cos(p.y * 2.0 - fbm(p * 1.5) * 2.0 - t);
        flow      *= 0.5;
        flow       = smoothstep(-0.3, 0.3, flow);

        float blob = fbm(p * 1.2 - t * 0.2);
        blob       = smoothstep(0.4, 0.7, blob);

        float finalPattern = mix(flow, 1.0 - flow, blob);
        float c = finalPattern;
        c = smoothstep(0.2, 0.75, c);
        c = pow(c, 1.6);

        gl_FragColor = vec4(vec3(c), iOpacity);
      }
    `;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true });
    const mesh     = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // ── Animation state ───────────────────────────────────────────────────
    let rafId       = null;
    let lastTime    = 0;
    let startTime   = null;
    let isVisible   = true;           // controlled by IntersectionObserver
    const fps       = 45;
    const fpsInterval = 1000 / fps;
    const fadeInDuration = 2000;

    const animate = (time) => {
      rafId = requestAnimationFrame(animate);

      // Stop rendering when off screen — saves GPU entirely
      if (!isVisible) return;

      // FPS cap
      if (time - lastTime < fpsInterval) return;
      lastTime = time;

      if (!startTime) startTime = time;
      const elapsed = time - startTime;

      uniforms.iTime.value    = time * 0.001;
      uniforms.iOpacity.value = Math.min(elapsed / fadeInDuration, 1.0);

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    // ── IntersectionObserver — pause when off screen ───────────────────
    const observer = new IntersectionObserver(
      ([entry]) => { isVisible = entry.isIntersecting; },
      { threshold: 0 }
    );
    observer.observe(container);

    // ── Debounced resize ──────────────────────────────────────────────
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const { w, h } = getRenderSize();
        renderer.setSize(w, h, false);
        uniforms.iResolution.value.set(w, h, 1);
      }, 150);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafId);
      observer.disconnect();
      clearTimeout(resizeTimeout);
      // Full GPU cleanup
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-label="Black and white abstract background"
    />
  );
};

export default AbstractMorphingShader;