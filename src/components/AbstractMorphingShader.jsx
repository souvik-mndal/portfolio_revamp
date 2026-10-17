// import { useEffect, useRef } from 'react';
// import * as THREE from 'three';

// const AbstractMorphingShader = () => {
//   const containerRef = useRef(null);

//   useEffect(() => {
//     if (!containerRef.current) return;

//     const container = containerRef.current;

//     const renderer = new THREE.WebGLRenderer({
//       antialias: true,
//       powerPreference: 'high-performance'
//     });

//     // ⚡ PERFORMANCE FIX 1: lower pixel ratio
//     renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

//     const scale = 0.85;

//     const width = container.clientWidth * scale;
//     const height = container.clientHeight * scale;

//     renderer.setSize(width, height, false);
//     renderer.outputColorSpace = THREE.SRGBColorSpace;

//     container.appendChild(renderer.domElement);

//     const scene = new THREE.Scene();
//     const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

//     const uniforms = {
//       iTime: { value: 0 },
//       iResolution: {
//         value: new THREE.Vector3(width, height, 1)
//       },
//       iOpacity: { value: 0 }
//     };

//     const vertexShader = `
//       precision highp float;
//       varying vec2 vUv;

//       void main() {
//         vUv = uv;
//         gl_Position = vec4(position.xy, 0.0, 1.0);
//       }
//     `;

//     const fragmentShader = `
//       precision highp float;

//       uniform vec3 iResolution;
//       uniform float iTime;
//       uniform float iOpacity;

//       varying vec2 vUv;

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
//         float amp = 0.5;

//         // ⚡ PERFORMANCE FIX 2: reduced iterations (4 → 3)
//         for (int i = 0; i < 3; i++) {
//           value += amp * noise(p);
//           p *= 1.8;
//           amp *= 0.5;
//         }

//         return value;
//       }

//       mat2 rot(float a) {
//         float s = sin(a), c = cos(a);
//         return mat2(c, -s, s, c);
//       }

//       void main() {
//         vec2 uv = vUv;
//         vec2 p = uv * 2.0 - 1.0;

//         float aspect = iResolution.x / iResolution.y;
//         p.x *= aspect;

//         // ⚡ optimized speed (balanced)
//         float t = iTime * 0.45;

//         vec2 warp = vec2(
//           fbm(p * 0.8 + t),
//           fbm(p * 0.8 - t)
//         );

//         p += (warp - 0.5) * 0.7;

//         float angle = fbm(p * 0.5 + t * 0.8) * 1.6;
//         p = rot(angle) * p;

//         float flow = sin(p.x * 3.0 + fbm(p * 2.0) * 3.0 + t);
//         flow += cos(p.y * 2.0 - fbm(p * 1.5) * 2.0 - t);
//         flow *= 0.5;
//         flow = smoothstep(-0.3, 0.3, flow);

//         float blob = fbm(p * 1.2 - t * 0.2);
//         blob = smoothstep(0.4, 0.7, blob);

//         float finalPattern = mix(flow, 1.0 - flow, blob);

//         // 🖤 strong contrast
//         float c = finalPattern;
//         c = smoothstep(0.2, 0.75, c);
//         c = pow(c, 1.6);

//         vec3 col = vec3(c);

//         gl_FragColor = vec4(col, iOpacity);
//       }
//     `;

//     const material = new THREE.ShaderMaterial({
//       uniforms,
//       vertexShader,
//       fragmentShader
//     });

//     const geometry = new THREE.PlaneGeometry(2, 2);
//     const mesh = new THREE.Mesh(geometry, material);
//     scene.add(mesh);

//     let animationFrameId;
//     let lastTime = 0;
//     const fps = 45; // ⚡ PERFORMANCE FIX 3: FPS cap
//     let startTime = null;
//     const fadeInDuration = 2000;

//     const animate = (time) => {
//       animationFrameId = requestAnimationFrame(animate);

//       // FPS throttle
//       if (time - lastTime < 1000 / fps) return;
//       lastTime = time;

//       if (!startTime) startTime = time;

//       const elapsed = time - startTime;

//       uniforms.iTime.value = time * 0.001;
//       uniforms.iOpacity.value = Math.min(elapsed / fadeInDuration, 1.0);

//       renderer.render(scene, camera);
//     };

//     animate(0);

//     // ⚡ PERFORMANCE FIX 4: debounced resize
//     let resizeTimeout;

//     const handleResize = () => {
//       clearTimeout(resizeTimeout);

//       resizeTimeout = setTimeout(() => {
//         const w = container.clientWidth * scale;
//         const h = container.clientHeight * scale;

//         renderer.setSize(w, h, false);
//         uniforms.iResolution.value.set(w, h, 1);
//       }, 150);
//     };

//     window.addEventListener('resize', handleResize);

//     return () => {
//       window.removeEventListener('resize', handleResize);
//       cancelAnimationFrame(animationFrameId);
//       renderer.dispose();
//       geometry.dispose();
//       material.dispose();
//       container.removeChild(renderer.domElement);
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

const AbstractMorphingShader = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const renderer = new THREE.WebGLRenderer({
      antialias: false,           // antialias off — imperceptible at this scale, saves GPU
      powerPreference: 'default', // 'high-performance' keeps discrete GPU awake, not needed
      alpha: true,
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const scale = 0.85;
    const width  = container.clientWidth  * scale;
    const height = container.clientHeight * scale;

    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

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
        const w = container.clientWidth  * scale;
        const h = container.clientHeight * scale;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
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
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
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