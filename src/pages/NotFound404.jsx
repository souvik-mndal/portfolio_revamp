// import React, { useEffect, useRef, useState } from 'react';

// /**
//  * OPTIMIZED & RESPONSIVE 404 BREAKOUT GAME
//  * -----------------------------------------
//  * - < 600px  : Compact 4-tier stacked mobile layout
//  * - < 1280px : Tight-gap, vertically shifted 3-line layout (Prevents score overlap)
//  * - >= 1280px: Native Full Desktop horizontal single-line layout, FLUID via vw
//  *              from 1280px up to 2560px (the "4xl" cap), then frozen in px
//  *              beyond 2560px so it stops growing on ultra-wide/4K screens.
//  *
//  * VW-SCALING MODEL (new)
//  * ---------------------------------------------------------------
//  * Canvas drawing can't use CSS `vw` units directly — everything is plain
//  * pixel math — so `vw` is replicated manually:
//  *
//  *   pxValue = (vwPercent / 100) * min(clientWidth, DESKTOP_VW_CAP)
//  *
//  * DESKTOP_VW_CAP = 2560. So for a 1920px-wide screen, a "40vw" value
//  * resolves to 0.40 * 1920 = 768px. At exactly 2560px it resolves to
//  * 0.40 * 2560 = 1024px, and it STOPS growing past that — any width above
//  * 2560px still multiplies against the capped 2560, not the real
//  * clientWidth. This exactly matches: "for a 1920 width screen, 40vw ->
//  * at 4xl (2561px) it becomes 1024px, and then stops growing."
//  *
//  * Every desktopNative-only size (font sizes, emoji radius, paddle/ball
//  * size, gaps, button size) is now expressed as a vw percentage constant
//  * and resolved through `vw()` at layout-build time, instead of a single
//  * fixed px number. The other three breakpoints (mobileStacked,
//  * tablet3Line, laptop3Line) are unchanged fixed-px layouts, as before.
//  *
//  * PERFORMANCE PASS (carried over from previous version) — VISUAL OUTPUT
//  * FOR THOSE PARTS IS UNCHANGED
//  * ---------------------------------------------------------------
//  * 1. BRICK BITMAP CACHING: alive bricks are pre-rendered once into an
//  *    offscreen bitmap and blitted with a single `drawImage` call per
//  *    frame, instead of hundreds/thousands of `fillRect` calls every
//  *    frame. Rebuilt only when a brick actually dies or layout regenerates.
//  * 2. SHADOW BLUR REMOVED FROM LIVE FILLS: replaced by pre-baked
//  *    radial-gradient shadow sprites (ballShadowSprite / paddleShadowSprite)
//  *    drawn underneath, same look, far cheaper.
//  * 3. LOWER MAX DEVICE PIXEL RATIO: capped from 2 to 1.5.
//  * 4. RESIZE / REGENERATION GUARD: brick layout only regenerates on a real
//  *    `clientWidth` change, not on DPR-only fluctuations.
//  * 5. STATIC GAME-OVER / WIN SCREEN THROTTLE: final frame is cached and
//  *    reused while idling on that screen instead of redrawing at 60fps.
//  *
//  * BUGFIXES IN THIS PASS
//  * ---------------------------------------------------------------
//  * - Explosive chain-reaction now guards `exB.alive` immediately before
//  *   removing from the grid (was already effectively safe since `alive`
//  *   was checked in the loop condition, but the removal call is now
//  *   wrapped defensively so a brick can never be grid-removed twice even
//  *   if two overlapping explosions resolve in the same frame).
//  * - Touch play no longer risks mobile-Safari scroll-jank: `touchstart`
//  *   during active gameplay now calls `preventDefault()` (falls back to a
//  *   non-passive listener for that one handler) so the page doesn't
//  *   rubber-band while the player is tapping to launch the ball.
//  * - Ball gradient cache is now keyed by radius AND left with an explicit
//  *   comment / guard note: if per-ball sizes are ever introduced, this
//  *   cache must be keyed per-ball, not globally — documented so it isn't
//  *   a silent trap later.
//  */

// export default function NotFound404() {
//   const canvasRef = useRef(null);
//   const containerRef = useRef(null);
//   const paddleXRef = useRef(null);

//   const [cursorStyle, setCursorStyle] = useState('cursor-none');
//   const cursorStyleRef = useRef('cursor-none');

//   const MAX_CONTAINER_WIDTH = 3840;
//   const MAX_BUFFS_PER_GAME = 175;
//   const BUFF_DURATION_MS = 10000;
//   const MAX_DPR = 1.5; // was 2 — halves-ish total rendered pixels on retina/4K with no visible change

//   // --- VW-SCALING CONSTANTS (desktopNative only, >= 1280px) ---
//   // Everything desktop-side grows as vw from 1280px up to this cap, then
//   // freezes at the px value it had at the cap.
//   const DESKTOP_VW_CAP = 2560;

//   const gameStateRef = useRef({
//     isMoving: false,
//     isGameOver: false,
//     isWin: false,
//     balls: [],
//     bullets: [],
//     score: 0,
//     highScore: 0,
//     bricks: [],
//     powerUps: [],
//     buffsSpawned: 0,
//     paddleWidth: 160,
//     activeEffects: {
//       sticky: false,
//       brickplow: false,
//       explosive: false,
//       cannons: false,
//       slow: false,
//       fast: false,
//     },
//     timers: {},
//     lastTime: 0,
//   });

//   const iconsRef = useRef({});
//   const cacheRef = useRef({
//     paddleGrad: null,
//     paddleGradWidth: null,
//     ballShadowSprite: null,
//     paddleShadowSprite: null,
//     ballGrad: null,
//     ballGradRadius: null,
//     brickBitmap: null,
//     brickBitmapDirty: true,
//     lastClientWidth: null,
//     staticFrameValid: false,
//   });

//   const configCacheRef = useRef({
//     layoutMode: null,
//     clientWidthBucket: null, // for desktopNative we also bucket by exact width, since sizes are fluid
//     config: null,
//   });

//   useEffect(() => {
//     const powerUpTypes = [
//       { id: 'wide', path: '/src/assets/icons/powerup-wide-paddle.svg' },
//       { id: 'sticky', path: '/src/assets/icons/powerup-sticky-paddle.svg' },
//       { id: 'cannons', path: '/src/assets/icons/powerup-cannons.svg' },
//       { id: 'multiball', path: '/src/assets/icons/powerup-multiball.svg' },
//       { id: 'brickplow', path: '/src/assets/icons/powerup-brickplow.svg' },
//       { id: 'slowball', path: '/src/assets/icons/powerup-slowball.svg' },
//       { id: 'explosiveball', path: '/src/assets/icons/powerup-explosiveball.svg' },
//       { id: 'fastball', path: '/src/assets/icons/powerup-fastball.svg' },
//       { id: 'shrink', path: '/src/assets/icons/powerup-shrink-paddle.svg' },
//     ];

//     powerUpTypes.forEach((p) => {
//       const img = new Image();
//       img.loaded = false;
//       img.onload = () => { img.loaded = true; };
//       img.onerror = () => { img.loaded = false; };
//       img.src = p.path;
//       iconsRef.current[p.id] = img;
//     });

//     const canvas = canvasRef.current;
//     if (!canvas) return;
//     const ctx = canvas.getContext('2d', { alpha: false });

//     let animationFrameId;

//     // Resolves a vw percentage into a px value, capped at `cap`.
//     // e.g. vw(40, clientWidth, 2560) on a 1920px screen -> 768px. On a
//     // 2561px+ screen -> 1024px (frozen, computed against the cap, not the
//     // real width). Each breakpoint passes its OWN cap (its own upper
//     // boundary) so sizing scales fluidly across that breakpoint's range
//     // and then freezes, instead of growing forever.
//     const vw = (percent, clientWidth, cap) => {
//       const effectiveWidth = Math.min(clientWidth, cap);
//       return (percent / 100) * effectiveWidth;
//     };

//     // Caps for each breakpoint's own fluid range — sizing scales with vw
//     // from the breakpoint's start up to its own cap, then freezes:
//     //   mobileStacked : fluid  0–599px,   frozen beyond MOBILE_VW_CAP (599)
//     //   tablet3Line   : fluid  600–1023px, frozen beyond TABLET_VW_CAP (1023)
//     //   laptop3Line   : fluid  1024–1279px, frozen beyond LAPTOP_VW_CAP (1279)
//     //   desktopNative : fluid  1280–2560px, frozen beyond DESKTOP_VW_CAP (2560)
//     const MOBILE_VW_CAP = 599;
//     const TABLET_VW_CAP = 1023;
//     const LAPTOP_VW_CAP = 1279;

//     // --- PLAY AREA (centered, capped at 2560px) -------------------------
//     // Sizes freeze at 2560px via vw(), but POSITIONS also need to stay
//     // inside a centered 2560px-wide column beyond that point — otherwise
//     // on an ultra-wide screen the paddle/ball/button/HUD text keep
//     // spreading out to the real screen edges (using raw clientWidth) while
//     // everything's SIZE has already stopped growing, which is exactly the
//     // "paddle goes outside the centered 2560px area" bug. This helper is
//     // the single source of truth for "where does the playable area start
//     // and how wide is it" — every piece of positional math (paddle clamp,
//     // ball walls, button X, HUD/win text centering) goes through it
//     // instead of clientWidth directly, so everything is centered inside
//     // the same boundary consistently.
//     const getPlayArea = (clientWidth) => {
//       const playWidth = Math.min(clientWidth, DESKTOP_VW_CAP);
//       const offsetX = (clientWidth - playWidth) / 2;
//       return { playWidth, offsetX };
//     };

//     const getLayoutMode = (clientWidth) => {
//       if (clientWidth < 600) return 'mobileStacked';
//       if (clientWidth < 1024) return 'tablet3Line';
//       if (clientWidth < 1280) return 'laptop3Line';
//       return 'desktopNative';
//     };

//     const buildResponsiveConfig = (layoutMode, clientWidth) => {
//       switch (layoutMode) {
//         case 'mobileStacked': {
//           // Fluid vw sizing, base values tuned @ 375px reference width
//           // (a common phone width), frozen beyond MOBILE_VW_CAP (599px —
//           // this breakpoint's own ceiling, just like desktop freezes at
//           // 2560px).
//           const capW = MOBILE_VW_CAP;
//           return {
//             layoutMode,
//             paddleHeight: vw(3.2, clientWidth, capW),        // 12px @ 375w
//             ballRadius: vw(1.6, clientWidth, capW),          // 6px @ 375w
//             powerUpSize: vw(12.8, clientWidth, capW),        // 48px @ 375w
//             paddleNormalWidth: vw(29.33, clientWidth, capW), // 110px @ 375w
//             paddleMaxWidth: vw(58.67, clientWidth, capW),    // 220px @ 375w
//             paddleMinWidth: vw(13.33, clientWidth, capW),    // 50px @ 375w
//             paddleStepSize: vw(8.0, clientWidth, capW),      // 30px @ 375w
//             buttonWidth: vw(40.0, clientWidth, capW),        // 150px @ 375w
//             buttonHeight: vw(11.73, clientWidth, capW),      // 44px @ 375w
//             buttonBottomOffset: vw(29.33, clientWidth, capW), // 110px @ 375w
//             scoreFontSize: vw(4.27, clientWidth, capW),      // 16px @ 375w
//             buttonFontSize: vw(4.8, clientWidth, capW),      // 18px @ 375w
//             winTitleFontSize: vw(10.13, clientWidth, capW),  // 38px @ 375w
//             winScoreFontSize: vw(4.8, clientWidth, capW),    // 18px @ 375w
//           };
//         }
//         case 'tablet3Line': {
//           // Same layout/logic as laptop3Line below — just a different
//           // reference width and its own freeze point (TABLET_VW_CAP,
//           // 1023px, this breakpoint's own ceiling before laptop3Line takes
//           // over at 1024px).
//           const capW = TABLET_VW_CAP;
//           return {
//             layoutMode,
//             paddleHeight: vw(2.0, clientWidth, capW),        // 16px @ 800w
//             ballRadius: vw(1.0, clientWidth, capW),          // 8px @ 800w
//             powerUpSize: vw(8.0, clientWidth, capW),         // 64px @ 800w
//             paddleNormalWidth: vw(18.125, clientWidth, capW), // 145px @ 800w
//             paddleMaxWidth: vw(40.0, clientWidth, capW),     // 320px @ 800w
//             paddleMinWidth: vw(9.375, clientWidth, capW),    // 75px @ 800w
//             paddleStepSize: vw(4.75, clientWidth, capW),     // 38px @ 800w
//             buttonWidth: vw(21.875, clientWidth, capW),      // 175px @ 800w
//             buttonHeight: vw(6.0, clientWidth, capW),        // 48px @ 800w
//             buttonBottomOffset: vw(13.75, clientWidth, capW), // 110px @ 800w
//             scoreFontSize: vw(2.0, clientWidth, capW),       // 16px @ 800w
//             buttonFontSize: vw(2.25, clientWidth, capW),     // 18px @ 800w
//             winTitleFontSize: vw(4.75, clientWidth, capW),   // 38px @ 800w
//             winScoreFontSize: vw(2.25, clientWidth, capW),   // 18px @ 800w
//           };
//         }
//         case 'laptop3Line': {
//           // Same layout/logic as tablet3Line above (same relative
//           // proportions, same sizing model) — different reference width
//           // and its own freeze point (LAPTOP_VW_CAP, 1279px, before
//           // desktopNative takes over at 1280px).
//           const capW = LAPTOP_VW_CAP;
//           return {
//             layoutMode,
//             paddleHeight: vw(1.416, clientWidth, capW),      // 17px @ 1200w
//             ballRadius: vw(0.708, clientWidth, capW),        // 8.5px @ 1200w
//             powerUpSize: vw(5.667, clientWidth, capW),       // 68px @ 1200w
//             paddleNormalWidth: vw(12.917, clientWidth, capW), // 155px @ 1200w
//             paddleMaxWidth: vw(29.167, clientWidth, capW),   // 350px @ 1200w
//             paddleMinWidth: vw(6.667, clientWidth, capW),    // 80px @ 1200w
//             paddleStepSize: vw(3.333, clientWidth, capW),    // 40px @ 1200w
//             buttonWidth: vw(15.0, clientWidth, capW),        // 180px @ 1200w
//             buttonHeight: vw(4.167, clientWidth, capW),      // 50px @ 1200w
//             buttonBottomOffset: vw(9.167, clientWidth, capW), // 110px @ 1200w
//             scoreFontSize: vw(1.333, clientWidth, capW),     // 16px @ 1200w
//             buttonFontSize: vw(1.5, clientWidth, capW),      // 18px @ 1200w
//             winTitleFontSize: vw(3.167, clientWidth, capW),  // 38px @ 1200w
//             winScoreFontSize: vw(1.5, clientWidth, capW),    // 18px @ 1200w
//           };
//         }
//         default: {
//           // desktopNative: fluid vw-based sizing, capped at DESKTOP_VW_CAP (2560px).
//           // Base values below were tuned so that at clientWidth === 1280px
//           // (the breakpoint's own start) they land close to the OLD fixed
//           // px defaults (18 / 9 / 72 / 160 / 380 / 80 / 40 / 180 / 50),
//           // then scale up smoothly with vw() from there.
//           //
//           // IMPORTANT: clientWidth passed in here must be a STABLE reference
//           // width, not the live per-frame clientWidth. Browser zoom changes
//           // clientWidth (CSS px viewport shrinks/grows) independent of any
//           // real layout change, and this function has no way to tell the
//           // difference — that distinction is enforced by the caller
//           // (getResponsiveConfig), which only re-invokes this with a new
//           // width when the width has crossed a real, debounced threshold.
//           return {
//             layoutMode,
//             paddleHeight: vw(0.9375, clientWidth, DESKTOP_VW_CAP),   // 18px @ 1920w reference
//             ballRadius: vw(0.46875, clientWidth, DESKTOP_VW_CAP),    // 9px @ 1920w
//             powerUpSize: vw(3.75, clientWidth, DESKTOP_VW_CAP),       // 72px @ 1920w
//             paddleNormalWidth: vw(8.333, clientWidth, DESKTOP_VW_CAP),  // 160px @ 1920w
//             paddleMaxWidth: vw(19.79, clientWidth, DESKTOP_VW_CAP),     // 380px @ 1920w
//             paddleMinWidth: vw(4.167, clientWidth, DESKTOP_VW_CAP),     // 80px @ 1920w
//             paddleStepSize: vw(2.083, clientWidth, DESKTOP_VW_CAP),     // 40px @ 1920w
//             buttonWidth: vw(9.375, clientWidth, DESKTOP_VW_CAP),        // 180px @ 1920w
//             buttonHeight: vw(2.604, clientWidth, DESKTOP_VW_CAP),       // 50px @ 1920w
//             // Button vertical offset from the bottom of the screen — was a
//             // hardcoded 110px that never scaled with the rest of the
//             // desktop UI. Now expressed as vw so the button's hit-box and
//             // its drawn position always agree at any width in the fluid
//             // range, and edge clicks never miss.
//             buttonBottomOffset: vw(5.729, clientWidth, DESKTOP_VW_CAP), // 110px @ 1920w
//             // Score / high-score HUD text and button/win-screen text now
//             // also scale with vw on desktop, same reference basis as
//             // everything else in this block (values @ 1920w).
//             scoreFontSize: vw(0.8333, clientWidth, DESKTOP_VW_CAP),      // 16px @ 1920w
//             buttonFontSize: vw(0.9375, clientWidth, DESKTOP_VW_CAP),     // 18px @ 1920w
//             winTitleFontSize: vw(1.979, clientWidth, DESKTOP_VW_CAP),    // 38px @ 1920w
//             winScoreFontSize: vw(0.9375, clientWidth, DESKTOP_VW_CAP),   // 18px @ 1920w
//           };
//         }
//       }
//     };

//     // Drop-in replacement for the old getResponsiveConfig: same signature
//     // and return shape. Every layout mode is now vw-based/fluid, so ALL of
//     // them use the same threshold-gated rebuild — not just desktopNative —
//     // otherwise mobile/tablet/laptop would rebuild on every zoom-induced
//     // clientWidth tick the same way desktop used to before this guard
//     // existed, causing the exact same paddle/ball drift-on-zoom bug at
//     // those breakpoints.
//     const getResponsiveConfig = (clientWidth) => {
//       const layoutMode = getLayoutMode(clientWidth);
//       const cache = configCacheRef.current;

//       // Rebuild ONLY when clientWidth has moved past a real threshold
//       // (16px), not on every fractional value zoom produces.
//       //
//       // WHY THIS MATTERS: browser zoom changes `clientWidth` (the CSS px
//       // viewport shrinks/grows) completely independent of any real
//       // responsive/container resize. Without this guard, every zoom tick
//       // feeds a slightly different clientWidth into buildResponsiveConfig,
//       // which recomputes paddle/ball/button sizes via vw() against that
//       // shifted width — while the brick bitmap (generated from a
//       // SEPARATELY-gated `lastClientWidth`) stays on its old proportions.
//       // Result: bricks stay "perfect" but the paddle/ball visibly resize
//       // and drift out of sync on zoom. This threshold keeps
//       // paddle/ball/button sizing locked to real layout changes only,
//       // matching brick behavior 1:1, at every breakpoint.
//       const THRESHOLD = 16;
//       const bucketed = cache.clientWidthBucket;
//       const isRealChange =
//         cache.layoutMode !== layoutMode ||
//         bucketed === null ||
//         bucketed === undefined ||
//         Math.abs(clientWidth - bucketed) >= THRESHOLD;

//       if (cache.layoutMode === layoutMode && cache.config && !isRealChange) {
//         return cache.config;
//       }
//       const config = buildResponsiveConfig(layoutMode, clientWidth);
//       cache.layoutMode = layoutMode;
//       cache.clientWidthBucket = clientWidth;
//       cache.config = config;
//       return config;
//     };

//     const generateBricks = (clientWidth) => {
//       const config = getResponsiveConfig(clientWidth);
//       // Brick art must stay inside the SAME cap each breakpoint's own vw
//       // sizing freezes at — not the wider 3840px absolute safety cap —
//       // otherwise bricks would keep spreading past the point where
//       // paddle/ball/button sizing has already stopped growing.
//       const capByMode = {
//         mobileStacked: MOBILE_VW_CAP,
//         tablet3Line: TABLET_VW_CAP,
//         laptop3Line: LAPTOP_VW_CAP,
//         desktopNative: DESKTOP_VW_CAP,
//       };
//       const modeCap = capByMode[config.layoutMode] || MAX_CONTAINER_WIDTH;
//       const effectiveWidth = config.layoutMode === 'desktopNative'
//         ? getPlayArea(clientWidth).playWidth
//         : Math.min(clientWidth, modeCap, MAX_CONTAINER_WIDTH);

//       const offscreen = document.createElement('canvas');
//       const offCtx = offscreen.getContext('2d');

//       let offWidth, offHeight, startY;

//       if (config.layoutMode === 'mobileStacked') {
//         offWidth = 1000;
//         offHeight = 1150;
//         startY = 80;
//       } else if (config.layoutMode === 'tablet3Line') {
//         offWidth = 1500;
//         offHeight = 1250;
//         startY = 120;
//       } else if (config.layoutMode === 'laptop3Line') {
//         offWidth = 1650;
//         offHeight = 1300;
//         startY = 110;
//       } else {
//         offWidth = 1600;
//         offHeight = 520;
//         startY = 0;
//       }

//       offscreen.width = offWidth;
//       offscreen.height = offHeight;

//       offCtx.fillStyle = '#121212';
//       offCtx.fillRect(0, 0, offWidth, offHeight);
//       offCtx.fillStyle = '#FFFFFF';
//       offCtx.textAlign = 'center';
//       offCtx.textBaseline = 'middle';

//       if (config.layoutMode === 'mobileStacked') {
//         offCtx.font = '900 360px "Arial Black", Impact, sans-serif';
//         offCtx.fillText('404', offWidth / 2, startY + 190);

//         const emojiX = offWidth / 2;
//         const emojiY = startY + 490;
//         const emojiRadius = 120;
//         offCtx.beginPath();
//         offCtx.arc(emojiX, emojiY, emojiRadius, 0, Math.PI * 2);
//         offCtx.lineWidth = 26;
//         offCtx.strokeStyle = '#FFFFFF';
//         offCtx.stroke();

//         offCtx.font = '900 80px sans-serif';
//         offCtx.fillText('✕', emojiX - 40, emojiY - 22);
//         offCtx.fillText('✕', emojiX + 40, emojiY - 22);

//         offCtx.beginPath();
//         offCtx.arc(emojiX, emojiY + 70, 48, Math.PI * 1.15, Math.PI * 1.85);
//         offCtx.lineWidth = 18;
//         offCtx.strokeStyle = '#FFFFFF';
//         offCtx.stroke();

//         offCtx.font = '700 115px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
//         offCtx.letterSpacing = '-2px';
//         offCtx.fillText('OOPS ! PAGE', offWidth / 2, startY + 750);
//         offCtx.fillText('NOT FOUND', offWidth / 2, startY + 890);

//       } else if (config.layoutMode === 'tablet3Line' || config.layoutMode === 'laptop3Line') {
//         const isTablet = config.layoutMode === 'tablet3Line';

//         const font404 = isTablet ? '900 420px "Arial Black", Impact, sans-serif' : '900 450px "Arial Black", Impact, sans-serif';
//         const emojiRadius = isTablet ? 140 : 150;
//         const gap = isTablet ? 60 : 80;
//         const textFont = isTablet ? '700 185px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : '700 200px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

//         const rowY = startY + 200;

//         offCtx.font = font404;
//         const width404 = offCtx.measureText('404').width;
//         const emojiDiameter = emojiRadius * 2;
//         const totalRowWidth = width404 + gap + emojiDiameter;

//         const rowStartX = (offWidth - totalRowWidth) / 2;
//         const text404X = rowStartX + width404 / 2;
//         const emojiX = rowStartX + width404 + gap + emojiRadius;

//         offCtx.textAlign = 'center';
//         offCtx.fillText('404', text404X, rowY);

//         offCtx.beginPath();
//         offCtx.arc(emojiX, rowY - 12, emojiRadius, 0, Math.PI * 2);
//         offCtx.lineWidth = 30;
//         offCtx.strokeStyle = '#FFFFFF';
//         offCtx.stroke();

//         offCtx.font = '900 90px sans-serif';
//         offCtx.fillText('✕', emojiX - 45, rowY - 25);
//         offCtx.fillText('✕', emojiX + 45, rowY - 25);

//         offCtx.beginPath();
//         offCtx.arc(emojiX, rowY + 80, 58, Math.PI * 1.15, Math.PI * 1.85);
//         offCtx.lineWidth = 20;
//         offCtx.strokeStyle = '#FFFFFF';
//         offCtx.stroke();

//         offCtx.font = textFont;
//         offCtx.letterSpacing = '-4px';
//         offCtx.fillText('OOPS ! PAGE', offWidth / 2, startY + 530);
//         offCtx.fillText('NOT FOUND', offWidth / 2, startY + 710);

//       } else {
//         const rowY = startY + 175;

//         offCtx.font = '900 325px "Arial Black", Impact, sans-serif';
//         offCtx.fillText('404', offWidth / 2 - 180, rowY);

//         const emojiX = offWidth / 2 + 300;
//         const emojiRadius = 115;
//         offCtx.beginPath();
//         offCtx.arc(emojiX, rowY - 10, emojiRadius, 0, Math.PI * 2);
//         offCtx.lineWidth = 25;
//         offCtx.strokeStyle = '#FFFFFF';
//         offCtx.stroke();

//         offCtx.font = '900 75px sans-serif';
//         offCtx.fillText('✕', emojiX - 38, rowY - 25);
//         offCtx.fillText('✕', emojiX + 38, rowY - 25);

//         offCtx.beginPath();
//         offCtx.arc(emojiX, rowY + 70, 46, Math.PI * 1.15, Math.PI * 1.85);
//         offCtx.lineWidth = 16;
//         offCtx.strokeStyle = '#FFFFFF';
//         offCtx.stroke();

//         offCtx.font = '650 130px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
//         offCtx.letterSpacing = '-3.5px';
//         offCtx.fillText('OOPS! PAGE NOT FOUND', offWidth / 2, startY + 375);
//       }

//       const imgData = offCtx.getImageData(0, 0, offWidth, offHeight);
//       const data = imgData.data;

//       const pixelSize = 3;
//       const pixelGap = 1;
//       const step = pixelSize + pixelGap;

//       const scale = effectiveWidth / offWidth;
//       const offsetX = (clientWidth - effectiveWidth) / 2;
//       const bricks = [];
//       let maxBrickY = 0;

//       for (let y = 0; y < offHeight; y += step) {
//         const rowBase = Math.floor(y) * offWidth;
//         for (let x = 0; x < offWidth; x += step) {
//           const index = (rowBase + Math.floor(x)) * 4;
//           if (data[index] > 128) {
//             const brickY = y * scale;
//             const brickBottom = brickY + pixelSize * scale;
//             if (brickBottom > maxBrickY) maxBrickY = brickBottom;
//             bricks.push({
//               x: offsetX + x * scale,
//               y: brickY,
//               w: pixelSize * scale,
//               h: pixelSize * scale,
//               alive: true,
//               hasBuff: false,
//               buffType: null,
//             });
//           }
//         }
//       }

//       const availableTypes = [
//         'wide', 'shrink', 'sticky', 'multiball', 'brickplow',
//         'slowball', 'fastball', 'explosiveball', 'cannons',
//       ];

//       const totalToAssign = Math.min(MAX_BUFFS_PER_GAME, bricks.length);
//       const indices = Array.from({ length: bricks.length }, (_, i) => i);

//       for (let i = indices.length - 1; i > 0; i--) {
//         const j = Math.floor(Math.random() * (i + 1));
//         const tmp = indices[i];
//         indices[i] = indices[j];
//         indices[j] = tmp;
//       }

//       for (let i = 0; i < totalToAssign; i++) {
//         const brickIdx = indices[i];
//         bricks[brickIdx].hasBuff = true;
//         bricks[brickIdx].buffType =
//           availableTypes[Math.floor(Math.random() * availableTypes.length)];
//       }

//       // Attach the art's bottom edge (in on-screen px) to the array itself so
//       // callers can position UI (like the "click to play" hint) right below
//       // the brick text without recomputing it separately.
//       bricks.maxBrickY = maxBrickY;

//       return bricks;
//     };

//     let gridCellSize = 64;
//     let brickGrid = new Map();

//     const cellKey = (cx, cy) => cx + ',' + cy;

//     const buildBrickGrid = (bricks) => {
//       brickGrid = new Map();
//       if (bricks.length === 0) return;

//       const avgBrickW = bricks[0].w || 4;
//       gridCellSize = Math.max(24, avgBrickW * 8);

//       for (let i = 0; i < bricks.length; i++) {
//         const b = bricks[i];
//         if (!b.alive) continue;
//         const cxMin = Math.floor(b.x / gridCellSize);
//         const cxMax = Math.floor((b.x + b.w) / gridCellSize);
//         const cyMin = Math.floor(b.y / gridCellSize);
//         const cyMax = Math.floor((b.y + b.h) / gridCellSize);
//         for (let cy = cyMin; cy <= cyMax; cy++) {
//           for (let cx = cxMin; cx <= cxMax; cx++) {
//             const key = cellKey(cx, cy);
//             let arr = brickGrid.get(key);
//             if (!arr) {
//               arr = [];
//               brickGrid.set(key, arr);
//             }
//             arr.push(i);
//           }
//         }
//       }
//     };

//     const removeBrickFromGrid = (b, idx) => {
//       const cxMin = Math.floor(b.x / gridCellSize);
//       const cxMax = Math.floor((b.x + b.w) / gridCellSize);
//       const cyMin = Math.floor(b.y / gridCellSize);
//       const cyMax = Math.floor((b.y + b.h) / gridCellSize);
//       for (let cy = cyMin; cy <= cyMax; cy++) {
//         for (let cx = cxMin; cx <= cxMax; cx++) {
//           const arr = brickGrid.get(cellKey(cx, cy));
//           if (arr) {
//             const pos = arr.indexOf(idx);
//             if (pos !== -1) arr.splice(pos, 1);
//           }
//         }
//       }
//     };

//     const getCandidateBrickIndices = (minX, minY, maxX, maxY) => {
//       const cxMin = Math.floor(minX / gridCellSize);
//       const cxMax = Math.floor(maxX / gridCellSize);
//       const cyMin = Math.floor(minY / gridCellSize);
//       const cyMax = Math.floor(maxY / gridCellSize);
//       const seen = new Set();
//       const out = [];
//       for (let cy = cyMin; cy <= cyMax; cy++) {
//         for (let cx = cxMin; cx <= cxMax; cx++) {
//           const arr = brickGrid.get(cellKey(cx, cy));
//           if (!arr) continue;
//           for (let k = 0; k < arr.length; k++) {
//             const idx = arr[k];
//             if (!seen.has(idx)) {
//               seen.add(idx);
//               out.push(idx);
//             }
//           }
//         }
//       }
//       return out;
//     };

//     const sweptCircleAABB = (x0, y0, dx, dy, radius, box) => {
//       const bx0 = box.x - radius;
//       const by0 = box.y - radius;
//       const bx1 = box.x + box.w + radius;
//       const by1 = box.y + box.h + radius;

//       let tEnterX = -Infinity;
//       let tExitX = Infinity;
//       let tEnterY = -Infinity;
//       let tExitY = Infinity;

//       if (Math.abs(dx) < 1e-8) {
//         if (x0 < bx0 || x0 > bx1) return null;
//       } else {
//         const tx1 = (bx0 - x0) / dx;
//         const tx2 = (bx1 - x0) / dx;
//         tEnterX = Math.min(tx1, tx2);
//         tExitX = Math.max(tx1, tx2);
//       }

//       if (Math.abs(dy) < 1e-8) {
//         if (y0 < by0 || y0 > by1) return null;
//       } else {
//         const ty1 = (by0 - y0) / dy;
//         const ty2 = (by1 - y0) / dy;
//         tEnterY = Math.min(ty1, ty2);
//         tExitY = Math.max(ty1, ty2);
//       }

//       const tEnter = Math.max(tEnterX, tEnterY, 0);
//       const tExit = Math.min(tExitX, tExitY, 1);

//       if (tEnter > tExit || tEnter > 1 || tExit < 0) return null;

//       const iy = y0 + dy * tEnter;

//       let axis;
//       if (tEnterX > tEnterY) {
//         axis = 'x';
//       } else if (tEnterY > tEnterX) {
//         axis = 'y';
//       } else {
//         const withinYSpan = iy >= box.y - 0.001 && iy <= box.y + box.h + 0.001;
//         axis = withinYSpan ? 'x' : 'y';
//       }

//       return { t: Math.max(0, tEnter), axis };
//     };

//     const buildShadowSprites = () => {
//       const ballShadow = document.createElement('canvas');
//       ballShadow.width = 40;
//       ballShadow.height = 16;
//       const bsCtx = ballShadow.getContext('2d');
//       const bg = bsCtx.createRadialGradient(20, 8, 0, 20, 8, 16);
//       bg.addColorStop(0, 'rgba(0,0,0,0.35)');
//       bg.addColorStop(1, 'rgba(0,0,0,0)');
//       bsCtx.fillStyle = bg;
//       bsCtx.fillRect(0, 0, 40, 16);
//       cacheRef.current.ballShadowSprite = ballShadow;

//       const paddleShadow = document.createElement('canvas');
//       paddleShadow.width = 400;
//       paddleShadow.height = 24;
//       const psCtx = paddleShadow.getContext('2d');
//       const pg = psCtx.createRadialGradient(200, 12, 0, 200, 12, 200);
//       pg.addColorStop(0, 'rgba(0,0,0,0.25)');
//       pg.addColorStop(1, 'rgba(0,0,0,0)');
//       psCtx.fillStyle = pg;
//       psCtx.fillRect(0, 0, 400, 24);
//       cacheRef.current.paddleShadowSprite = paddleShadow;
//     };
//     buildShadowSprites();

//     if (containerRef.current) {
//       const clientW = containerRef.current.clientWidth;
//       const config = getResponsiveConfig(clientW);
//       const initialPlayArea = getPlayArea(clientW);
//       const initialX = initialPlayArea.offsetX + initialPlayArea.playWidth / 2;

//       gameStateRef.current.paddleWidth = config.paddleNormalWidth;
//       gameStateRef.current.bricks = generateBricks(clientW);
//       buildBrickGrid(gameStateRef.current.bricks);
//       cacheRef.current.lastClientWidth = clientW;
//       cacheRef.current.brickBitmapDirty = true;
//       gameStateRef.current.balls = [
//         {
//           x: initialX,
//           y: containerRef.current.clientHeight - 40 - config.ballRadius,
//           vx: 0,
//           vy: 0,
//           attached: true,
//         },
//       ];
//     }

//     const checkAndSpawnPowerUp = (brick, config) => {
//       const state = gameStateRef.current;
//       if (brick.hasBuff && brick.buffType) {
//         state.powerUps.push({
//           x: brick.x + brick.w / 2,
//           y: brick.y + brick.h / 2,
//           type: brick.buffType,
//           size: config.powerUpSize,
//           vy: 150,
//         });
//         brick.hasBuff = false;
//       }
//     };

//     const setTimedEffect = (effectKey) => {
//       const state = gameStateRef.current;
//       state.activeEffects[effectKey] = true;

//       if (state.timers[effectKey]) {
//         clearTimeout(state.timers[effectKey]);
//       }

//       state.timers[effectKey] = setTimeout(() => {
//         state.activeEffects[effectKey] = false;
//       }, BUFF_DURATION_MS);
//     };

//     const applyPowerUp = (type, config) => {
//       const state = gameStateRef.current;

//       switch (type) {
//         case 'wide':
//           state.paddleWidth = Math.min(config.paddleMaxWidth, state.paddleWidth + config.paddleStepSize);
//           break;
//         case 'shrink':
//           state.paddleWidth = Math.max(config.paddleMinWidth, state.paddleWidth - config.paddleStepSize);
//           break;
//         case 'sticky':
//           setTimedEffect('sticky');
//           break;
//         case 'cannons':
//           setTimedEffect('cannons');
//           break;
//         case 'brickplow':
//           setTimedEffect('brickplow');
//           break;
//         case 'slowball':
//           setTimedEffect('slow');
//           break;
//         case 'fastball':
//           setTimedEffect('fast');
//           break;
//         case 'explosiveball':
//           setTimedEffect('explosive');
//           break;
//         case 'multiball': {
//           const baseBall = state.balls[0] || { x: paddleXRef.current || 400, y: 300 };
//           state.balls.push(
//             { x: baseBall.x, y: baseBall.y - 5, vx: -260, vy: -360, attached: false },
//             { x: baseBall.x, y: baseBall.y - 5, vx: 260, vy: -360, attached: false }
//           );
//           state.isMoving = true;
//           break;
//         }
//         default:
//           break;
//       }
//     };

//     const applyCursorStyle = (next) => {
//       if (cursorStyleRef.current !== next) {
//         cursorStyleRef.current = next;
//         setCursorStyle(next);
//       }
//     };

//     const updatePointerPosition = (clientX, clientY) => {
//       if (!containerRef.current) return;
//       const rect = containerRef.current.getBoundingClientRect();
//       const { clientWidth, clientHeight } = containerRef.current;

//       // Map the raw pointer position into the SAME coordinate space used
//       // for drawing (clientWidth/clientHeight), instead of using
//       // rect-relative px directly. getBoundingClientRect() returns
//       // fractional, zoom-scaled values that can drift a few px away from
//       // clientWidth/clientHeight under non-100% browser zoom — that drift
//       // is exactly why only the button's TEXT (near dead-center, where
//       // both coordinate spaces roughly agree) used to register clicks
//       // while the edges of the button did not.
//       const scaleX = rect.width > 0 ? clientWidth / rect.width : 1;
//       const scaleY = rect.height > 0 ? clientHeight / rect.height : 1;
//       const mouseX = (clientX - rect.left) * scaleX;
//       const mouseY = (clientY - rect.top) * scaleY;

//       const state = gameStateRef.current;
//       const pWidth = state.paddleWidth;
//       // Clamp the paddle to the centered play area, not the raw screen
//       // edges — beyond 2560px wide, `playArea.offsetX` is the left margin
//       // outside the centered column, so minX/maxX shift inward with it
//       // (this is what keeps the paddle from drifting past the bricks on
//       // ultra-wide screens).
//       const playArea = getPlayArea(clientWidth);
//       const minX = playArea.offsetX + pWidth / 2;
//       const maxX = playArea.offsetX + playArea.playWidth - pWidth / 2;
//       const clampedX = Math.max(minX, Math.min(maxX, mouseX));

//       paddleXRef.current = clampedX;

//       const balls = state.balls;
//       for (let i = 0; i < balls.length; i++) {
//         if (balls[i].attached) balls[i].x = clampedX;
//       }

//       if (state.isGameOver || state.isWin) {
//         const config = getResponsiveConfig(clientWidth);
//         const centerX = playArea.offsetX + playArea.playWidth / 2;
//         const btnX = centerX - config.buttonWidth / 2;
//         const btnY = clientHeight - config.buttonBottomOffset;

//         const isOverButton =
//           mouseX >= btnX && mouseX <= btnX + config.buttonWidth &&
//           mouseY >= btnY && mouseY <= btnY + config.buttonHeight;

//         applyCursorStyle(isOverButton ? 'cursor-pointer' : 'cursor-default');
//       } else {
//         applyCursorStyle('cursor-none');
//       }
//     };

//     const handleMouseMove = (e) => updatePointerPosition(e.clientX, e.clientY);

//     const handleTouchMove = (e) => {
//       if (e.touches.length > 0) {
//         updatePointerPosition(e.touches[0].clientX, e.touches[0].clientY);
//       }
//     };

//     const handleActionTrigger = (clientX, clientY) => {
//       if (!containerRef.current) return;
//       const rect = containerRef.current.getBoundingClientRect();
//       const { clientWidth, clientHeight } = containerRef.current;

//       // Same coordinate-space fix as updatePointerPosition: map the click
//       // into clientWidth/clientHeight space rather than trusting
//       // rect-relative px directly, so the button's clickable area always
//       // matches its drawn area exactly (including under browser zoom).
//       const scaleX = rect.width > 0 ? clientWidth / rect.width : 1;
//       const scaleY = rect.height > 0 ? clientHeight / rect.height : 1;
//       const clickX = (clientX - rect.left) * scaleX;
//       const clickY = (clientY - rect.top) * scaleY;

//       const config = getResponsiveConfig(clientWidth);
//       const playArea = getPlayArea(clientWidth);
//       const centerX = playArea.offsetX + playArea.playWidth / 2;
//       const btnX = centerX - config.buttonWidth / 2;
//       const btnY = clientHeight - config.buttonBottomOffset;
//       const state = gameStateRef.current;

//       if (state.isGameOver || state.isWin) {
//         if (
//           clickX >= btnX && clickX <= btnX + config.buttonWidth &&
//           clickY >= btnY && clickY <= btnY + config.buttonHeight
//         ) {
//           Object.values(state.timers).forEach((t) => clearTimeout(t));

//           const startX = paddleXRef.current || centerX;
//           state.isGameOver = false;
//           state.isWin = false;
//           state.isMoving = false;
//           state.score = 0;
//           state.paddleWidth = config.paddleNormalWidth;
//           state.buffsSpawned = 0;
//           state.powerUps = [];
//           state.bullets = [];
//           state.bricks = generateBricks(clientWidth);
//           buildBrickGrid(state.bricks);
//           cacheRef.current.lastClientWidth = clientWidth;
//           cacheRef.current.brickBitmapDirty = true;
//           cacheRef.current.staticFrameValid = false;
//           state.balls = [
//             { x: startX, y: clientHeight - 40 - config.ballRadius, vx: 0, vy: 0, attached: true },
//           ];
//           state.activeEffects = {
//             sticky: false, brickplow: false, explosive: false,
//             cannons: false, slow: false, fast: false,
//           };

//           applyCursorStyle('cursor-none');
//         }
//         return;
//       }

//       const pX = paddleXRef.current || centerX;
//       const pY = clientHeight - 40;

//       if (state.activeEffects.cannons) {
//         const halfW = state.paddleWidth / 2;
//         state.bullets.push(
//           { x: pX - halfW + 10, y: pY - 8, vy: -1200 },
//           { x: pX + halfW - 10, y: pY - 8, vy: -1200 }
//         );
//       }

//       const balls = state.balls;
//       for (let i = 0; i < balls.length; i++) {
//         if (balls[i].attached) {
//           balls[i].attached = false;
//           balls[i].vx = (Math.random() - 0.5) * 320;
//           balls[i].vy = -410;
//           state.isMoving = true;
//         }
//       }
//     };

//     const handleClick = (e) => handleActionTrigger(e.clientX, e.clientY);

//     // Non-passive on purpose: during active gameplay we want to be able to
//     // preventDefault() so a tap-to-launch doesn't also trigger mobile
//     // Safari's scroll/rubber-band. touchmove stays passive (no
//     // preventDefault needed there — we're not blocking scroll mid-drag,
//     // only the initial tap while a game is in progress).
//     const handleTouchStart = (e) => {
//       if (e.touches.length > 0) {
//         const state = gameStateRef.current;
//         // Only swallow the default when a game is actually in progress
//         // (ball in flight / about to launch) — leave normal touch/scroll
//         // behavior alone on the game-over/win screen and before first load.
//         if (!state.isGameOver) {
//           e.preventDefault();
//         }
//         updatePointerPosition(e.touches[0].clientX, e.touches[0].clientY);
//         handleActionTrigger(e.touches[0].clientX, e.touches[0].clientY);
//       }
//     };

//     const formatScore = (num) => String(num).padStart(5, '0');

//     const getPaddleGradient = (ctx2d, pLeft, pY, pWidth, pHeight) => {
//       const cache = cacheRef.current;
//       if (cache.paddleGrad && cache.paddleGradWidth === pWidth) {
//         return cache.paddleGrad;
//       }
//       const grad = ctx2d.createLinearGradient(0, pY, 0, pY + pHeight);
//       grad.addColorStop(0, '#FFFFFF');
//       grad.addColorStop(0.3, '#D0D0D0');
//       grad.addColorStop(0.7, '#666666');
//       grad.addColorStop(1, '#222222');
//       cache.paddleGrad = grad;
//       cache.paddleGradWidth = pWidth;
//       return grad;
//     };

//     // Ball radial gradient is defined around local origin (0,0) at a fixed
//     // radius and reused for every ball via ctx.translate(), instead of
//     // rebuilding a new gradient per ball per frame. Invalidated only when
//     // the radius (responsive breakpoint) actually changes.
//     //
//     // NOTE: this cache is keyed ONLY by radius, on the assumption that all
//     // balls on screen share the same radius (true today). If per-ball
//     // sizes are ever introduced (e.g. a "shrink ball" power-up), this
//     // cache MUST become per-ball / per-radius-bucket, or balls with a
//     // different radius will silently render with the wrong gradient scale.
//     const getBallGradient = (ctx2d, radius) => {
//       const cache = cacheRef.current;
//       if (cache.ballGrad && cache.ballGradRadius === radius) {
//         return cache.ballGrad;
//       }
//       const grad = ctx2d.createRadialGradient(
//         -radius * 0.3, -radius * 0.3, radius * 0.1,
//         0, 0, radius
//       );
//       grad.addColorStop(0, '#FFFFFF');
//       grad.addColorStop(0.3, '#E0E0E0');
//       grad.addColorStop(0.75, '#555555');
//       grad.addColorStop(1, '#1A1A1A');
//       cache.ballGrad = grad;
//       cache.ballGradRadius = radius;
//       return grad;
//     };

//     // Renders all currently-alive bricks into an offscreen bitmap once.
//     // Called only when the bitmap is marked dirty (a brick died, or the
//     // layout was regenerated) instead of every single frame.
//     const rebuildBrickBitmap = (bricks, clientWidth, clientHeight, dpr) => {
//       let bmp = cacheRef.current.brickBitmap;
//       if (!bmp) {
//         bmp = document.createElement('canvas');
//         cacheRef.current.brickBitmap = bmp;
//       }
//       const targetW = Math.max(1, Math.round(clientWidth * dpr));
//       const targetH = Math.max(1, Math.round(clientHeight * dpr));
//       if (bmp.width !== targetW || bmp.height !== targetH) {
//         bmp.width = targetW;
//         bmp.height = targetH;
//       }
//       const bctx = bmp.getContext('2d');
//       bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
//       bctx.clearRect(0, 0, clientWidth, clientHeight);
//       bctx.fillStyle = '#121212';
//       for (let i = 0; i < bricks.length; i++) {
//         const b = bricks[i];
//         if (b.alive) bctx.fillRect(b.x, b.y, b.w, b.h);
//       }
//       cacheRef.current.brickBitmapDirty = false;
//     };

//     const MAX_BOUNCES_PER_SUBSTEP = 4;

//     const moveBallWithCollisions = (ball, subDt, state, bricks, pX, pY, pWidth, config) => {
//       let remaining = 1;
//       let bounces = 0;

//       while (remaining > 0 && bounces < MAX_BOUNCES_PER_SUBSTEP) {
//         const dx = ball.vx * subDt * remaining;
//         const dy = ball.vy * subDt * remaining;

//         if (dx === 0 && dy === 0) break;

//         let bestT = 1;
//         let bestAxis = null;
//         let bestIsPaddle = false;
//         let bestBrickIdx = -1;

//         if (dy > 0) {
//           const paddleBox = { x: pX - pWidth / 2, y: pY, w: pWidth, h: config.paddleHeight };
//           const hit = sweptCircleAABB(ball.x, ball.y, dx, dy, config.ballRadius, paddleBox);
//           if (hit && hit.t < bestT) {
//             bestT = hit.t;
//             bestAxis = hit.axis;
//             bestIsPaddle = true;
//           }
//         }

//         const sweptMinX = Math.min(ball.x, ball.x + dx) - config.ballRadius;
//         const sweptMaxX = Math.max(ball.x, ball.x + dx) + config.ballRadius;
//         const sweptMinY = Math.min(ball.y, ball.y + dy) - config.ballRadius;
//         const sweptMaxY = Math.max(ball.y, ball.y + dy) + config.ballRadius;
//         const candidates = getCandidateBrickIndices(sweptMinX, sweptMinY, sweptMaxX, sweptMaxY);

//         for (let ci = 0; ci < candidates.length; ci++) {
//           const idx = candidates[ci];
//           const b = bricks[idx];
//           if (!b || !b.alive) continue;
//           const hit = sweptCircleAABB(ball.x, ball.y, dx, dy, config.ballRadius, b);
//           if (hit && hit.t < bestT) {
//             bestT = hit.t;
//             bestAxis = hit.axis;
//             bestIsPaddle = false;
//             bestBrickIdx = idx;
//           }
//         }

//         if (bestAxis === null) {
//           ball.x += dx;
//           ball.y += dy;
//           remaining = 0;
//           break;
//         }

//         const EPS = 0.01;
//         ball.x += dx * bestT;
//         ball.y += dy * bestT;

//         if (bestIsPaddle) {
//           if (state.activeEffects.sticky) {
//             ball.attached = true;
//             ball.x = Math.max(pX - pWidth / 2, Math.min(pX + pWidth / 2, ball.x));
//             ball.y = pY - config.ballRadius;
//             return true;
//           }
//           const hitPoint = (ball.x - pX) / (pWidth / 2);
//           ball.vx = hitPoint * 380;
//           ball.vy = -Math.max(340, Math.abs(ball.vy));
//           ball.y -= EPS;
//         } else {
//           const b = bricks[bestBrickIdx];
//           b.alive = false;
//           checkAndSpawnPowerUp(b, config);
//           removeBrickFromGrid(b, bestBrickIdx);
//           cacheRef.current.brickBitmapDirty = true;

//           if (!state.activeEffects.brickplow) {
//             if (bestAxis === 'x') {
//               ball.vx *= -1;
//               ball.x += ball.vx > 0 ? EPS : -EPS;
//             } else {
//               ball.vy *= -1;
//               ball.y += ball.vy > 0 ? EPS : -EPS;
//             }
//           }

//           if (state.activeEffects.explosive) {
//             for (let j = 0; j < bricks.length; j++) {
//               const exB = bricks[j];
//               // Guard exB.alive right up against the removal call itself
//               // (not just at the top of the loop) so an overlapping
//               // explosion resolved earlier in this same pass can never
//               // cause exB to be grid-removed twice.
//               if (exB.alive && Math.hypot(exB.x - b.x, exB.y - b.y) < 35) {
//                 exB.alive = false;
//                 checkAndSpawnPowerUp(exB, config);
//                 if (!exB._gridRemoved) {
//                   removeBrickFromGrid(exB, j);
//                   exB._gridRemoved = true;
//                 }
//               }
//             }
//           }

//           state.score += 10;
//           if (state.score > state.highScore) state.highScore = state.score;
//         }

//         remaining *= (1 - bestT);
//         bounces++;
//       }

//       return false;
//     };

//     const drawScene = (timestamp) => {
//       const state = gameStateRef.current;
//       if (!state.lastTime) state.lastTime = timestamp;
//       let dt = (timestamp - state.lastTime) / 1000;
//       state.lastTime = timestamp;
//       if (dt > 0.25) dt = 1 / 60;
//       dt = Math.min(dt, 0.032);

//       if (!containerRef.current) return;
//       const { clientWidth, clientHeight } = containerRef.current;
//       const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
//       const config = getResponsiveConfig(clientWidth); // cached per breakpoint bucket

//       // Once the game is fully settled on the game-over/win screen, nothing
//       // in the scene changes frame-to-frame (button hover is pure CSS
//       // cursor, not a canvas redraw), so skip re-rendering entirely and
//       // just keep the RAF loop alive cheaply.
//       if ((state.isGameOver || state.isWin) && cacheRef.current.staticFrameValid) {
//         animationFrameId = requestAnimationFrame(drawScene);
//         return;
//       }

//       const sizeChanged = canvas.width !== Math.round(clientWidth * dpr) || canvas.height !== Math.round(clientHeight * dpr);
//       if (sizeChanged) {
//         canvas.width = Math.round(clientWidth * dpr);
//         canvas.height = Math.round(clientHeight * dpr);
//         // Only regenerate the brick layout when the CSS width itself
//         // changed (a real breakpoint/container resize) — not on pure DPR
//         // fluctuations, which used to trigger a full getImageData pass.
//         if (cacheRef.current.lastClientWidth !== clientWidth) {
//           state.bricks = generateBricks(clientWidth);
//           buildBrickGrid(state.bricks);
//           cacheRef.current.lastClientWidth = clientWidth;
//         }
//         cacheRef.current.paddleGrad = null;
//         cacheRef.current.ballGrad = null;
//         cacheRef.current.brickBitmapDirty = true;
//       }

//       ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
//       ctx.fillStyle = '#f5f5dc';
//       ctx.fillRect(0, 0, clientWidth, clientHeight);

//       // Single source of truth for this frame's centered play-area bounds —
//       // everything positional below (paddle fallback, ball walls, hint
//       // text, HUD, win text, button) reads from this instead of raw
//       // clientWidth, so it all stays inside the same centered boundary as
//       // the bricks on ultra-wide screens.
//       const playArea = getPlayArea(clientWidth);
//       const centerX = playArea.offsetX + playArea.playWidth / 2;

//       const bricks = state.bricks;
//       let anyAlive = false;
//       for (let i = 0; i < bricks.length; i++) {
//         if (bricks[i].alive) { anyAlive = true; break; }
//       }
//       const allBricksCleared = bricks.length > 0 && !anyAlive;

//       if (allBricksCleared && !state.isWin) {
//         state.isWin = true;
//         state.isMoving = false;
//         applyCursorStyle('cursor-default');
//       }

//       // --- Bricks: single blit instead of hundreds/thousands of fillRect calls ---
//       if (cacheRef.current.brickBitmapDirty || !cacheRef.current.brickBitmap) {
//         rebuildBrickBitmap(bricks, clientWidth, clientHeight, dpr);
//       }
//       ctx.drawImage(cacheRef.current.brickBitmap, 0, 0, clientWidth, clientHeight);

//       // --- "(click to play)" hint text ---
//       if (!state.isMoving && !state.isGameOver && !state.isWin) {
//         const hintFontSize = Math.max(13, Math.round(16 * (config.ballRadius / 9)));
//         ctx.save();
//         ctx.font = `600 ${hintFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
//         ctx.textAlign = 'center';
//         ctx.textBaseline = 'top';
//         ctx.fillStyle = '#121212';
//         ctx.fillText('( click to play )', centerX, (bricks.maxBrickY || 0) + 16);
//         ctx.restore();
//       }

//       const currentScoreStr = formatScore(state.score);
//       const highScoreStr = formatScore(state.highScore);

//       // HUD text anchors to the LEFT EDGE OF THE PLAY AREA (offsetX + a
//       // small margin), not the raw canvas edge — otherwise on an
//       // ultra-wide screen the score would sit far outside the centered
//       // 2560px column while the bricks/paddle stay inside it.
//       ctx.save();
//       ctx.font = `700 ${config.scoreFontSize}px "Courier New", Courier, monospace`;
//       ctx.textAlign = 'left';
//       ctx.textBaseline = 'top';
//       ctx.fillStyle = '#777777';
//       ctx.fillText(`HI ${highScoreStr}`, playArea.offsetX + 25, 20);
//       ctx.fillStyle = '#222222';
//       ctx.fillText(` ${currentScoreStr}`, playArea.offsetX + 130, 20);
//       ctx.restore();

//       const pX = paddleXRef.current || centerX;
//       const pY = clientHeight - 40;
//       const pWidth = state.paddleWidth;

//       let speedMultiplier = 1.0;
//       if (state.activeEffects.slow) speedMultiplier *= 0.65;
//       if (state.activeEffects.fast) speedMultiplier *= 1.45;

//       if (!state.isWin && !state.isGameOver) {
//         const bullets = state.bullets;
//         for (let i = bullets.length - 1; i >= 0; i--) {
//           const bullet = bullets[i];
//           const prevY = bullet.y;
//           bullet.y += bullet.vy * dt;

//           ctx.fillStyle = '#FF5A1F';
//           ctx.fillRect(bullet.x - 2, bullet.y, 4, 16);

//           let bulletHit = false;
//           const candidates = getCandidateBrickIndices(
//             bullet.x - 3, Math.min(bullet.y, prevY), bullet.x + 3, Math.max(bullet.y, prevY)
//           );
//           for (let ci = 0; ci < candidates.length; ci++) {
//             const j = candidates[ci];
//             const b = bricks[j];
//             if (b && b.alive &&
//               bullet.x + 3 >= b.x && bullet.x - 3 <= b.x + b.w &&
//               bullet.y <= b.y + b.h && prevY >= b.y
//             ) {
//               b.alive = false;
//               checkAndSpawnPowerUp(b, config);
//               removeBrickFromGrid(b, j);
//               cacheRef.current.brickBitmapDirty = true;
//               state.score += 10;
//               if (state.score > state.highScore) state.highScore = state.score;
//               bulletHit = true;
//             }
//           }

//           if (bulletHit || bullet.y < -20) bullets.splice(i, 1);
//         }
//       }

//       const SUB_STEPS = state.activeEffects.fast ? 3 : 1;
//       const subDt = dt * speedMultiplier / SUB_STEPS;

//       if (!state.isWin && !state.isGameOver) {
//         const balls = state.balls;
//         for (let bIdx = balls.length - 1; bIdx >= 0; bIdx--) {
//           const ball = balls[bIdx];

//           if (!ball.attached) {
//             for (let step = 0; step < SUB_STEPS; step++) {
//               const becameAttached = moveBallWithCollisions(ball, subDt, state, bricks, pX, pY, pWidth, config);

//               if (ball.x - config.ballRadius <= playArea.offsetX) {
//                 ball.x = playArea.offsetX + config.ballRadius;
//                 ball.vx = Math.abs(ball.vx);
//               } else if (ball.x + config.ballRadius >= playArea.offsetX + playArea.playWidth) {
//                 ball.x = playArea.offsetX + playArea.playWidth - config.ballRadius;
//                 ball.vx = -Math.abs(ball.vx);
//               }
//               if (ball.y - config.ballRadius <= 0) {
//                 ball.y = config.ballRadius;
//                 ball.vy = Math.abs(ball.vy);
//               }

//               if (becameAttached) break;
//             }
//           }

//           if (ball.y - config.ballRadius > clientHeight) {
//             balls.splice(bIdx, 1);
//           }
//         }
//       }

//       if (state.balls.length === 0 && !state.isGameOver && !state.isWin) {
//         state.isGameOver = true;
//         state.isMoving = false;
//         applyCursorStyle('cursor-default');
//       }

//       const powerUps = state.powerUps;
//       for (let i = powerUps.length - 1; i >= 0; i--) {
//         const p = powerUps[i];
//         if (!state.isWin) p.y += p.vy * dt;

//         const img = iconsRef.current[p.type];
//         if (img && img.loaded) {
//           ctx.drawImage(img, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
//         } else {
//           ctx.fillStyle = '#FFFFFF';
//           ctx.beginPath();
//           ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
//           ctx.fill();
//         }

//         const pLeft = pX - pWidth / 2;
//         const pRight = pX + pWidth / 2;
//         if (p.y >= pY - 10 && p.y <= pY + config.paddleHeight && p.x >= pLeft && p.x <= pRight) {
//           applyPowerUp(p.type, config);
//           powerUps.splice(i, 1);
//         } else if (p.y > clientHeight + 50) {
//           powerUps.splice(i, 1);
//         }
//       }

//       if (!state.isGameOver && !state.isWin) {
//         const shadowCache = cacheRef.current;

//         if (shadowCache.paddleShadowSprite) {
//           ctx.drawImage(
//             shadowCache.paddleShadowSprite,
//             pX - pWidth * 0.55, pY + config.paddleHeight - 4,
//             pWidth * 1.1, 24
//           );
//         }

//         const pLeft = pX - pWidth / 2;
//         ctx.save();
//         const paddleGrad = getPaddleGradient(ctx, pLeft, pY, pWidth, config.paddleHeight);
//         ctx.beginPath();
//         ctx.roundRect(pLeft, pY, pWidth, config.paddleHeight, 8);
//         ctx.fillStyle = paddleGrad;
//         ctx.fill();

//         ctx.beginPath();
//         ctx.roundRect(pLeft + 3, pY + 2, pWidth - 6, 2, 1);
//         ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
//         ctx.fill();

//         if (state.activeEffects.cannons) {
//           ctx.fillStyle = '#FF5A1F';
//           ctx.fillRect(pLeft + 6, pY - 8, 8, 8);
//           ctx.fillRect(pLeft + pWidth - 14, pY - 8, 8, 8);
//         }
//         ctx.restore();

//         const balls = state.balls;
//         const ballGrad = getBallGradient(ctx, config.ballRadius);
//         for (let i = 0; i < balls.length; i++) {
//           const ball = balls[i];
//           const bX = ball.x;
//           const bY = ball.y;

//           if (shadowCache.ballShadowSprite) {
//             ctx.drawImage(shadowCache.ballShadowSprite, bX - 20, bY + config.ballRadius - 6, 40, 16);
//           }

//           ctx.save();
//           ctx.translate(bX, bY);
//           ctx.beginPath();
//           ctx.arc(0, 0, config.ballRadius, 0, Math.PI * 2);
//           ctx.fillStyle = ballGrad;
//           ctx.fill();
//           ctx.restore();
//         }
//       }

//       if (state.isWin) {
//         ctx.fillStyle = '#121212';
//         ctx.font = `700 ${config.winTitleFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
//         ctx.textAlign = 'center';
//         ctx.textBaseline = 'middle';
//         ctx.fillText('404 DESTROYED!', centerX, clientHeight / 2 - 20);

//         ctx.font = `700 ${config.winScoreFontSize}px "Courier New", Courier, monospace`;
//         ctx.fillStyle = '#121212';
//         ctx.fillText(`TOTAL SCORE: ${formatScore(state.score)}`, centerX, clientHeight / 2 + 25);
//       }

//       if (state.isGameOver || state.isWin) {
//         const btnX = centerX - config.buttonWidth / 2;
//         const btnY = clientHeight - config.buttonBottomOffset;

//         ctx.beginPath();
//         ctx.roundRect(btnX, btnY + 4, config.buttonWidth, config.buttonHeight, 14);
//         ctx.fillStyle = 'rgba(18, 18, 18, 0.3)';
//         ctx.fill();

//         ctx.beginPath();
//         ctx.roundRect(btnX, btnY, config.buttonWidth, config.buttonHeight, 14);
//         ctx.fillStyle = '#121212';
//         ctx.strokeStyle = '#f5f5dc';
//         ctx.lineWidth = 2.5;
//         ctx.fill();
//         ctx.stroke();

//         ctx.fillStyle = '#f5f5dc';
//         ctx.font = `bold ${config.buttonFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
//         ctx.textAlign = 'center';
//         ctx.textBaseline = 'middle';
//         ctx.fillText(
//           state.isWin ? 'PLAY AGAIN' : 'RETRY',
//           centerX,
//           btnY + config.buttonHeight / 2
//         );

//         // The game-over/win screen is now fully drawn and won't change
//         // until a restart resets these flags — mark it so subsequent
//         // frames can skip the entire redraw above.
//         cacheRef.current.staticFrameValid = true;
//       }

//       animationFrameId = requestAnimationFrame(drawScene);
//     };

//     animationFrameId = requestAnimationFrame(drawScene);

//     const target = containerRef.current || window;
//     target.addEventListener('mousemove', handleMouseMove);
//     target.addEventListener('click', handleClick);
//     target.addEventListener('touchmove', handleTouchMove, { passive: true });
//     // Non-passive: handleTouchStart calls preventDefault() during active
//     // gameplay to stop mobile-Safari scroll-jank on tap-to-launch.
//     target.addEventListener('touchstart', handleTouchStart, { passive: false });

//     const handleVisibility = () => {
//       if (document.hidden) {
//         cancelAnimationFrame(animationFrameId);
//       } else {
//         gameStateRef.current.lastTime = 0;
//         animationFrameId = requestAnimationFrame(drawScene);
//       }
//     };
//     document.addEventListener('visibilitychange', handleVisibility);

//     return () => {
//       cancelAnimationFrame(animationFrameId);
//       target.removeEventListener('mousemove', handleMouseMove);
//       target.removeEventListener('click', handleClick);
//       target.removeEventListener('touchmove', handleTouchMove);
//       target.removeEventListener('touchstart', handleTouchStart);
//       document.removeEventListener('visibilitychange', handleVisibility);
//       Object.values(gameStateRef.current.timers).forEach((t) => clearTimeout(t));
//     };
//   }, []);

//   // --- ZOOM-CHANGE RELOAD ---------------------------------------------
//   // Ctrl +/- (or the browser zoom menu) changes window.devicePixelRatio
//   // without firing a normal `resize` the way a real window-size change
//   // does — DPR is the reliable signal for "the user just used ctrl+/-
//   // zoom", whereas clientWidth/`resize` alone would also fire on ordinary
//   // window resizing (which we do NOT want to reload for). Touch
//   // pinch-zoom is intentionally NOT handled here.
//   //
//   // Deliberately a separate, self-contained effect from the game-loop
//   // effect above so it can never interfere with RAF timing, canvas sizing,
//   // or brick/paddle state — it does exactly one thing: watch DPR, and
//   // reload once if it changes.
//   useEffect(() => {
//     let lastDpr = window.devicePixelRatio || 1;
//     let debounceId = null;
//     let reloaded = false;

//     const checkZoom = () => {
//       if (reloaded) return;
//       const currentDpr = window.devicePixelRatio || 1;
//       // Compare with a small epsilon — devicePixelRatio can report tiny
//       // floating-point jitter (e.g. 1.5000000000000002) that isn't an
//       // actual zoom change.
//       if (Math.abs(currentDpr - lastDpr) > 0.001) {
//         reloaded = true;
//         window.location.reload();
//       }
//     };

//     // Debounced so a single zoom gesture (which can fire several rapid
//     // resize events) only ever triggers ONE reload, never a loop or a
//     // burst of reloads mid-gesture.
//     const handlePossibleZoom = () => {
//       if (debounceId) clearTimeout(debounceId);
//       debounceId = setTimeout(checkZoom, 300);
//     };

//     window.addEventListener('resize', handlePossibleZoom);

//     return () => {
//       if (debounceId) clearTimeout(debounceId);
//       window.removeEventListener('resize', handlePossibleZoom);
//     };
//   }, []);

//   return (
//     <div
//       ref={containerRef}
//       className={`relative w-full h-screen bg-[#f5f5dc] overflow-hidden select-none p-0 m-0 ${cursorStyle}`}
//     >
//       <canvas ref={canvasRef} className="block w-full h-full p-0 m-0" />
//     </div>
//   );
// }















































import React, { useEffect, useRef, useState } from 'react';

/**
 * 404 BREAKOUT GAME — DESKTOP-ONLY UNCAPPED VW SCALING
 * -----------------------------------------
 * The uncapped vw scaling applies ONLY to the desktopNative breakpoint
 * (clientWidth >= 1280px). Mobile/tablet/laptop breakpoints keep their
 * original capped px sizing (frozen at their own breakpoint ceiling),
 * exactly as before the uncapped-vw change.
 *
 * On desktop, since there is no cap, browser zoom-out (Ctrl + "-")
 * increases the effective CSS-pixel clientWidth, so the game scales up on
 * zoom-out rather than staying fixed. That's an intentional consequence
 * of removing the desktop cap.
 *
 * The play area on desktop always spans the full clientWidth (offsetX=0,
 * no centered column). Mobile/tablet/laptop keep their original centered
 * play-area behavior.
 */

export default function NotFound404() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const paddleXRef = useRef(null);

  const [cursorStyle, setCursorStyle] = useState('cursor-none');
  const cursorStyleRef = useRef('cursor-none');

  const MAX_CONTAINER_WIDTH = 3840;
  const MAX_BUFFS_PER_GAME = 175;
  const BUFF_DURATION_MS = 10000;
  const MAX_DPR = 1.5; // was 2 — halves-ish total rendered pixels on retina/4K with no visible change

  const gameStateRef = useRef({
    isMoving: false,
    isGameOver: false,
    isWin: false,
    balls: [],
    bullets: [],
    score: 0,
    highScore: 0,
    bricks: [],
    powerUps: [],
    buffsSpawned: 0,
    paddleWidth: 160,
    activeEffects: {
      sticky: false,
      brickplow: false,
      explosive: false,
      cannons: false,
      slow: false,
      fast: false,
    },
    timers: {},
    lastTime: 0,
  });

  const iconsRef = useRef({});
  const cacheRef = useRef({
    paddleGrad: null,
    paddleGradWidth: null,
    ballShadowSprite: null,
    paddleShadowSprite: null,
    ballGrad: null,
    ballGradRadius: null,
    brickBitmap: null,
    brickBitmapDirty: true,
    lastClientWidth: null,
    staticFrameValid: false,
  });

  const configCacheRef = useRef({
    layoutMode: null,
    clientWidthBucket: null,
    clientHeightBucket: null,
    config: null,
  });

  useEffect(() => {
    const powerUpTypes = [
      { id: 'wide', path: '/src/assets/icons/powerup-wide-paddle.svg' },
      { id: 'sticky', path: '/src/assets/icons/powerup-sticky-paddle.svg' },
      { id: 'cannons', path: '/src/assets/icons/powerup-cannons.svg' },
      { id: 'multiball', path: '/src/assets/icons/powerup-multiball.svg' },
      { id: 'brickplow', path: '/src/assets/icons/powerup-brickplow.svg' },
      { id: 'slowball', path: '/src/assets/icons/powerup-slowball.svg' },
      { id: 'explosiveball', path: '/src/assets/icons/powerup-explosiveball.svg' },
      { id: 'fastball', path: '/src/assets/icons/powerup-fastball.svg' },
      { id: 'shrink', path: '/src/assets/icons/powerup-shrink-paddle.svg' },
    ];

    powerUpTypes.forEach((p) => {
      const img = new Image();
      img.loaded = false;
      img.onload = () => { img.loaded = true; };
      img.onerror = () => { img.loaded = false; };
      img.src = p.path;
      iconsRef.current[p.id] = img;
    });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });

    let animationFrameId;

    // Own ceiling per non-desktop breakpoint — sizing scales with vw up to
    // this width, then freezes (as it did before the desktop-only change).
    const MOBILE_VW_CAP = 599;
    const TABLET_VW_CAP = 1023;
    const LAPTOP_VW_CAP = 1279;

    // Resolves a vw percentage into a px value. `cap` is optional: pass it
    // for mobile/tablet/laptop (frozen ceiling); omit it for desktop
    // (uncapped — scales linearly against the real clientWidth forever).
    const vw = (percent, clientWidth, cap) => {
      const effectiveWidth = cap != null ? Math.min(clientWidth, cap) : clientWidth;
      return (percent / 100) * effectiveWidth;
    };

    // Resolves a vh percentage into a px value, against clientHeight.
    // Vertical measurements (paddle bottom offset, HUD top margin) must
    // scale off clientHeight, not clientWidth — reusing a width-based vw
    // value for a vertical position drifts out of sync with the real
    // top/bottom of the viewport whenever width and height don't change
    // in the same proportion (which is the normal case, since the
    // viewport isn't square). `cap` behaves the same as in vw(): omit it
    // for desktop (uncapped), pass it for mobile/tablet/laptop (frozen).
    const vh = (percent, clientHeight, cap) => {
      const effectiveHeight = cap != null ? Math.min(clientHeight, cap) : clientHeight;
      return (percent / 100) * effectiveHeight;
    };

    // Desktop: play area always spans the full clientWidth (no centered
    // column, offsetX 0 — uncapped). Non-desktop modes keep a centered
    // play area capped at their own breakpoint ceiling.
    const getPlayArea = (clientWidth, layoutMode) => {
      if (layoutMode === 'desktopNative' || !layoutMode) {
        return { playWidth: clientWidth, offsetX: 0 };
      }
      const capByMode = {
        mobileStacked: MOBILE_VW_CAP,
        tablet3Line: TABLET_VW_CAP,
        laptop3Line: LAPTOP_VW_CAP,
      };
      const cap = capByMode[layoutMode] || clientWidth;
      const playWidth = Math.min(clientWidth, cap);
      const offsetX = (clientWidth - playWidth) / 2;
      return { playWidth, offsetX };
    };

    const getLayoutMode = (clientWidth) => {
      if (clientWidth < 600) return 'mobileStacked';
      if (clientWidth < 1024) return 'tablet3Line';
      if (clientWidth < 1280) return 'laptop3Line';
      return 'desktopNative';
    };

    const buildResponsiveConfig = (layoutMode, clientWidth, clientHeight) => {
      switch (layoutMode) {
        case 'mobileStacked': {
          const capW = MOBILE_VW_CAP;
          const capH = MOBILE_VW_CAP; // reference height cap for this breakpoint
          return {
            layoutMode,
            paddleHeight: vw(3.2, clientWidth, capW),
            ballRadius: vw(1.6, clientWidth, capW),
            powerUpSize: vw(12.8, clientWidth, capW),
            paddleNormalWidth: vw(29.33, clientWidth, capW),
            paddleMaxWidth: vw(58.67, clientWidth, capW),
            paddleMinWidth: vw(13.33, clientWidth, capW),
            paddleStepSize: vw(8.0, clientWidth, capW),
            buttonWidth: vw(40.0, clientWidth, capW),
            buttonHeight: vw(11.73, clientWidth, capW),
            buttonBottomOffset: vh(16.0, clientHeight, capH), // 110px @ 667h (vertical, off clientHeight)
            scoreFontSize: vw(4.27, clientWidth, capW),
            buttonFontSize: vw(4.8, clientWidth, capW),
            winTitleFontSize: vw(10.13, clientWidth, capW),
            winScoreFontSize: vw(4.8, clientWidth, capW),
            paddleBottomOffset: vh(6.0, clientHeight, capH), // 40px @ 667h (vertical, off clientHeight)
          };
        }
        case 'tablet3Line': {
          const capW = TABLET_VW_CAP;
          const capH = TABLET_VW_CAP;
          return {
            layoutMode,
            paddleHeight: vw(2.0, clientWidth, capW),
            ballRadius: vw(1.0, clientWidth, capW),
            powerUpSize: vw(8.0, clientWidth, capW),
            paddleNormalWidth: vw(18.125, clientWidth, capW),
            paddleMaxWidth: vw(40.0, clientWidth, capW),
            paddleMinWidth: vw(9.375, clientWidth, capW),
            paddleStepSize: vw(4.75, clientWidth, capW),
            buttonWidth: vw(21.875, clientWidth, capW),
            buttonHeight: vw(6.0, clientWidth, capW),
            buttonBottomOffset: vh(11.0, clientHeight, capH), // 110px @ 1000h
            scoreFontSize: vw(2.0, clientWidth, capW),
            buttonFontSize: vw(2.25, clientWidth, capW),
            winTitleFontSize: vw(4.75, clientWidth, capW),
            winScoreFontSize: vw(2.25, clientWidth, capW),
            paddleBottomOffset: vh(4.0, clientHeight, capH), // 40px @ 1000h
          };
        }
        case 'laptop3Line': {
          const capW = LAPTOP_VW_CAP;
          const capH = LAPTOP_VW_CAP;
          return {
            layoutMode,
            paddleHeight: vw(1.416, clientWidth, capW),
            ballRadius: vw(0.708, clientWidth, capW),
            powerUpSize: vw(5.667, clientWidth, capW),
            paddleNormalWidth: vw(12.917, clientWidth, capW),
            paddleMaxWidth: vw(29.167, clientWidth, capW),
            paddleMinWidth: vw(6.667, clientWidth, capW),
            paddleStepSize: vw(3.333, clientWidth, capW),
            buttonWidth: vw(15.0, clientWidth, capW),
            buttonHeight: vw(4.167, clientWidth, capW),
            buttonBottomOffset: vh(13.75, clientHeight, capH), // 110px @ 800h
            scoreFontSize: vw(1.333, clientWidth, capW),
            buttonFontSize: vw(1.5, clientWidth, capW),
            winTitleFontSize: vw(3.167, clientWidth, capW),
            winScoreFontSize: vw(1.5, clientWidth, capW),
            paddleBottomOffset: vh(5.0, clientHeight, capH), // 40px @ 800h
          };
        }
        default: {
          // desktopNative: fluid vw-based sizing for horizontal metrics, NO
          // cap — keeps growing past 2560px and on zoom-out. Vertical
          // metrics (paddleBottomOffset, buttonBottomOffset) use vh()
          // against clientHeight instead, uncapped as well, so they stay
          // pinned to the real bottom/top of the viewport regardless of
          // aspect ratio.
          return {
            layoutMode,
            paddleHeight: vw(0.9375, clientWidth),
            ballRadius: vw(0.46875, clientWidth),
            powerUpSize: vw(3.75, clientWidth),
            paddleNormalWidth: vw(8.333, clientWidth),
            paddleMaxWidth: vw(19.79, clientWidth),
            paddleMinWidth: vw(4.167, clientWidth),
            paddleStepSize: vw(2.083, clientWidth),
            buttonWidth: vw(9.375, clientWidth),
            buttonHeight: vw(2.604, clientWidth),
            buttonBottomOffset: vh(10.185, clientHeight), // 110px @ 1080h, uncapped
            scoreFontSize: vw(0.8333, clientWidth),
            buttonFontSize: vw(0.9375, clientWidth),
            winTitleFontSize: vw(1.979, clientWidth),
            winScoreFontSize: vw(0.9375, clientWidth),
            paddleBottomOffset: vh(3.704, clientHeight), // 40px @ 1080h, uncapped
          };
        }
      }
    };

    const getResponsiveConfig = (clientWidth, clientHeight) => {
      const layoutMode = getLayoutMode(clientWidth);
      const cache = configCacheRef.current;

      const THRESHOLD = 16;
      const bucketedW = cache.clientWidthBucket;
      const bucketedH = cache.clientHeightBucket;
      const isRealChange =
        cache.layoutMode !== layoutMode ||
        bucketedW === null ||
        bucketedW === undefined ||
        Math.abs(clientWidth - bucketedW) >= THRESHOLD ||
        bucketedH === null ||
        bucketedH === undefined ||
        Math.abs((clientHeight || 0) - bucketedH) >= THRESHOLD;

      if (cache.layoutMode === layoutMode && cache.config && !isRealChange) {
        return cache.config;
      }
      const config = buildResponsiveConfig(layoutMode, clientWidth, clientHeight || 0);
      cache.layoutMode = layoutMode;
      cache.clientWidthBucket = clientWidth;
      cache.clientHeightBucket = clientHeight || 0;
      cache.config = config;
      return config;
    };

    const generateBricks = (clientWidth, clientHeight) => {
      const config = getResponsiveConfig(clientWidth, clientHeight);
      // Desktop: uncapped, full clientWidth. Non-desktop: capped at the
      // breakpoint's own ceiling, same as before.
      const capByMode = {
        mobileStacked: MOBILE_VW_CAP,
        tablet3Line: TABLET_VW_CAP,
        laptop3Line: LAPTOP_VW_CAP,
      };
      const modeCap = capByMode[config.layoutMode];
      const effectiveWidth = config.layoutMode === 'desktopNative'
        ? clientWidth
        : Math.min(clientWidth, modeCap, MAX_CONTAINER_WIDTH);

      const offscreen = document.createElement('canvas');
      const offCtx = offscreen.getContext('2d');

      let offWidth, offHeight, startY;

      if (config.layoutMode === 'mobileStacked') {
        offWidth = 1000;
        offHeight = 1150;
        startY = 80;
      } else if (config.layoutMode === 'tablet3Line') {
        offWidth = 1500;
        offHeight = 1250;
        startY = 120;
      } else if (config.layoutMode === 'laptop3Line') {
        offWidth = 1650;
        offHeight = 1300;
        startY = 110;
      } else {
        offWidth = 1600;
        offHeight = 520;
        startY = 0;
      }

      offscreen.width = offWidth;
      offscreen.height = offHeight;

      offCtx.fillStyle = '#121212';
      offCtx.fillRect(0, 0, offWidth, offHeight);
      offCtx.fillStyle = '#FFFFFF';
      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'middle';

      if (config.layoutMode === 'mobileStacked') {
        offCtx.font = '900 360px "Arial Black", Impact, sans-serif';
        offCtx.fillText('404', offWidth / 2, startY + 190);

        const emojiX = offWidth / 2;
        const emojiY = startY + 490;
        const emojiRadius = 120;
        offCtx.beginPath();
        offCtx.arc(emojiX, emojiY, emojiRadius, 0, Math.PI * 2);
        offCtx.lineWidth = 26;
        offCtx.strokeStyle = '#FFFFFF';
        offCtx.stroke();

        offCtx.font = '900 80px sans-serif';
        offCtx.fillText('✕', emojiX - 40, emojiY - 22);
        offCtx.fillText('✕', emojiX + 40, emojiY - 22);

        offCtx.beginPath();
        offCtx.arc(emojiX, emojiY + 70, 48, Math.PI * 1.15, Math.PI * 1.85);
        offCtx.lineWidth = 18;
        offCtx.strokeStyle = '#FFFFFF';
        offCtx.stroke();

        offCtx.font = '700 115px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        offCtx.letterSpacing = '-2px';
        offCtx.fillText('OOPS ! PAGE', offWidth / 2, startY + 750);
        offCtx.fillText('NOT FOUND', offWidth / 2, startY + 890);

      } else if (config.layoutMode === 'tablet3Line' || config.layoutMode === 'laptop3Line') {
        const isTablet = config.layoutMode === 'tablet3Line';

        const font404 = isTablet ? '900 420px "Arial Black", Impact, sans-serif' : '900 450px "Arial Black", Impact, sans-serif';
        const emojiRadius = isTablet ? 140 : 150;
        const gap = isTablet ? 60 : 80;
        const textFont = isTablet ? '700 185px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : '700 200px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

        const rowY = startY + 200;

        offCtx.font = font404;
        const width404 = offCtx.measureText('404').width;
        const emojiDiameter = emojiRadius * 2;
        const totalRowWidth = width404 + gap + emojiDiameter;

        const rowStartX = (offWidth - totalRowWidth) / 2;
        const text404X = rowStartX + width404 / 2;
        const emojiX = rowStartX + width404 + gap + emojiRadius;

        offCtx.textAlign = 'center';
        offCtx.fillText('404', text404X, rowY);

        offCtx.beginPath();
        offCtx.arc(emojiX, rowY - 12, emojiRadius, 0, Math.PI * 2);
        offCtx.lineWidth = 30;
        offCtx.strokeStyle = '#FFFFFF';
        offCtx.stroke();

        offCtx.font = '900 90px sans-serif';
        offCtx.fillText('✕', emojiX - 45, rowY - 25);
        offCtx.fillText('✕', emojiX + 45, rowY - 25);

        offCtx.beginPath();
        offCtx.arc(emojiX, rowY + 80, 58, Math.PI * 1.15, Math.PI * 1.85);
        offCtx.lineWidth = 20;
        offCtx.strokeStyle = '#FFFFFF';
        offCtx.stroke();

        offCtx.font = textFont;
        offCtx.letterSpacing = '-4px';
        offCtx.fillText('OOPS ! PAGE', offWidth / 2, startY + 530);
        offCtx.fillText('NOT FOUND', offWidth / 2, startY + 710);

      } else {
        const rowY = startY + 175;

        offCtx.font = '900 325px "Arial Black", Impact, sans-serif';
        offCtx.fillText('404', offWidth / 2 - 180, rowY);

        const emojiX = offWidth / 2 + 300;
        const emojiRadius = 115;
        offCtx.beginPath();
        offCtx.arc(emojiX, rowY - 10, emojiRadius, 0, Math.PI * 2);
        offCtx.lineWidth = 25;
        offCtx.strokeStyle = '#FFFFFF';
        offCtx.stroke();

        offCtx.font = '900 75px sans-serif';
        offCtx.fillText('✕', emojiX - 38, rowY - 25);
        offCtx.fillText('✕', emojiX + 38, rowY - 25);

        offCtx.beginPath();
        offCtx.arc(emojiX, rowY + 70, 46, Math.PI * 1.15, Math.PI * 1.85);
        offCtx.lineWidth = 16;
        offCtx.strokeStyle = '#FFFFFF';
        offCtx.stroke();

        offCtx.font = '650 130px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        offCtx.letterSpacing = '-3.5px';
        offCtx.fillText('OOPS! PAGE NOT FOUND', offWidth / 2, startY + 375);
      }

      const imgData = offCtx.getImageData(0, 0, offWidth, offHeight);
      const data = imgData.data;

      const pixelSize = 3;
      const pixelGap = 1;
      const step = pixelSize + pixelGap;

      const scale = effectiveWidth / offWidth;
      const offsetX = (clientWidth - effectiveWidth) / 2;
      const bricks = [];
      let maxBrickY = 0;

      for (let y = 0; y < offHeight; y += step) {
        const rowBase = Math.floor(y) * offWidth;
        for (let x = 0; x < offWidth; x += step) {
          const index = (rowBase + Math.floor(x)) * 4;
          if (data[index] > 128) {
            const brickY = y * scale;
            const brickBottom = brickY + pixelSize * scale;
            if (brickBottom > maxBrickY) maxBrickY = brickBottom;
            bricks.push({
              x: offsetX + x * scale,
              y: brickY,
              w: pixelSize * scale,
              h: pixelSize * scale,
              alive: true,
              hasBuff: false,
              buffType: null,
            });
          }
        }
      }

      const availableTypes = [
        'wide', 'shrink', 'sticky', 'multiball', 'brickplow',
        'slowball', 'fastball', 'explosiveball', 'cannons',
      ];

      const totalToAssign = Math.min(MAX_BUFFS_PER_GAME, bricks.length);
      const indices = Array.from({ length: bricks.length }, (_, i) => i);

      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = indices[i];
        indices[i] = indices[j];
        indices[j] = tmp;
      }

      for (let i = 0; i < totalToAssign; i++) {
        const brickIdx = indices[i];
        bricks[brickIdx].hasBuff = true;
        bricks[brickIdx].buffType =
          availableTypes[Math.floor(Math.random() * availableTypes.length)];
      }

      bricks.maxBrickY = maxBrickY;

      return bricks;
    };

    let gridCellSize = 64;
    let brickGrid = new Map();

    const cellKey = (cx, cy) => cx + ',' + cy;

    const buildBrickGrid = (bricks) => {
      brickGrid = new Map();
      if (bricks.length === 0) return;

      const avgBrickW = bricks[0].w || 4;
      gridCellSize = Math.max(24, avgBrickW * 8);

      for (let i = 0; i < bricks.length; i++) {
        const b = bricks[i];
        if (!b.alive) continue;
        const cxMin = Math.floor(b.x / gridCellSize);
        const cxMax = Math.floor((b.x + b.w) / gridCellSize);
        const cyMin = Math.floor(b.y / gridCellSize);
        const cyMax = Math.floor((b.y + b.h) / gridCellSize);
        for (let cy = cyMin; cy <= cyMax; cy++) {
          for (let cx = cxMin; cx <= cxMax; cx++) {
            const key = cellKey(cx, cy);
            let arr = brickGrid.get(key);
            if (!arr) {
              arr = [];
              brickGrid.set(key, arr);
            }
            arr.push(i);
          }
        }
      }
    };

    const removeBrickFromGrid = (b, idx) => {
      const cxMin = Math.floor(b.x / gridCellSize);
      const cxMax = Math.floor((b.x + b.w) / gridCellSize);
      const cyMin = Math.floor(b.y / gridCellSize);
      const cyMax = Math.floor((b.y + b.h) / gridCellSize);
      for (let cy = cyMin; cy <= cyMax; cy++) {
        for (let cx = cxMin; cx <= cxMax; cx++) {
          const arr = brickGrid.get(cellKey(cx, cy));
          if (arr) {
            const pos = arr.indexOf(idx);
            if (pos !== -1) arr.splice(pos, 1);
          }
        }
      }
    };

    const getCandidateBrickIndices = (minX, minY, maxX, maxY) => {
      const cxMin = Math.floor(minX / gridCellSize);
      const cxMax = Math.floor(maxX / gridCellSize);
      const cyMin = Math.floor(minY / gridCellSize);
      const cyMax = Math.floor(maxY / gridCellSize);
      const seen = new Set();
      const out = [];
      for (let cy = cyMin; cy <= cyMax; cy++) {
        for (let cx = cxMin; cx <= cxMax; cx++) {
          const arr = brickGrid.get(cellKey(cx, cy));
          if (!arr) continue;
          for (let k = 0; k < arr.length; k++) {
            const idx = arr[k];
            if (!seen.has(idx)) {
              seen.add(idx);
              out.push(idx);
            }
          }
        }
      }
      return out;
    };

    const sweptCircleAABB = (x0, y0, dx, dy, radius, box) => {
      const bx0 = box.x - radius;
      const by0 = box.y - radius;
      const bx1 = box.x + box.w + radius;
      const by1 = box.y + box.h + radius;

      let tEnterX = -Infinity;
      let tExitX = Infinity;
      let tEnterY = -Infinity;
      let tExitY = Infinity;

      if (Math.abs(dx) < 1e-8) {
        if (x0 < bx0 || x0 > bx1) return null;
      } else {
        const tx1 = (bx0 - x0) / dx;
        const tx2 = (bx1 - x0) / dx;
        tEnterX = Math.min(tx1, tx2);
        tExitX = Math.max(tx1, tx2);
      }

      if (Math.abs(dy) < 1e-8) {
        if (y0 < by0 || y0 > by1) return null;
      } else {
        const ty1 = (by0 - y0) / dy;
        const ty2 = (by1 - y0) / dy;
        tEnterY = Math.min(ty1, ty2);
        tExitY = Math.max(ty1, ty2);
      }

      const tEnter = Math.max(tEnterX, tEnterY, 0);
      const tExit = Math.min(tExitX, tExitY, 1);

      if (tEnter > tExit || tEnter > 1 || tExit < 0) return null;

      const iy = y0 + dy * tEnter;

      let axis;
      if (tEnterX > tEnterY) {
        axis = 'x';
      } else if (tEnterY > tEnterX) {
        axis = 'y';
      } else {
        const withinYSpan = iy >= box.y - 0.001 && iy <= box.y + box.h + 0.001;
        axis = withinYSpan ? 'x' : 'y';
      }

      return { t: Math.max(0, tEnter), axis };
    };

    const buildShadowSprites = () => {
      const ballShadow = document.createElement('canvas');
      ballShadow.width = 40;
      ballShadow.height = 16;
      const bsCtx = ballShadow.getContext('2d');
      const bg = bsCtx.createRadialGradient(20, 8, 0, 20, 8, 16);
      bg.addColorStop(0, 'rgba(0,0,0,0.35)');
      bg.addColorStop(1, 'rgba(0,0,0,0)');
      bsCtx.fillStyle = bg;
      bsCtx.fillRect(0, 0, 40, 16);
      cacheRef.current.ballShadowSprite = ballShadow;

      const paddleShadow = document.createElement('canvas');
      paddleShadow.width = 400;
      paddleShadow.height = 24;
      const psCtx = paddleShadow.getContext('2d');
      const pg = psCtx.createRadialGradient(200, 12, 0, 200, 12, 200);
      pg.addColorStop(0, 'rgba(0,0,0,0.25)');
      pg.addColorStop(1, 'rgba(0,0,0,0)');
      psCtx.fillStyle = pg;
      psCtx.fillRect(0, 0, 400, 24);
      cacheRef.current.paddleShadowSprite = paddleShadow;
    };
    buildShadowSprites();

    if (containerRef.current) {
      const clientW = containerRef.current.clientWidth;
      const clientH = containerRef.current.clientHeight;
      const config = getResponsiveConfig(clientW, clientH);
      const initialPlayArea = getPlayArea(clientW, config.layoutMode);
      const initialX = initialPlayArea.offsetX + initialPlayArea.playWidth / 2;

      gameStateRef.current.paddleWidth = config.paddleNormalWidth;
      gameStateRef.current.bricks = generateBricks(clientW, clientH);
      buildBrickGrid(gameStateRef.current.bricks);
      cacheRef.current.lastClientWidth = clientW;
      cacheRef.current.brickBitmapDirty = true;
      gameStateRef.current.balls = [
        {
          x: initialX,
          y: clientH - config.paddleBottomOffset - config.ballRadius,
          vx: 0,
          vy: 0,
          attached: true,
        },
      ];
    }

    const checkAndSpawnPowerUp = (brick, config) => {
      const state = gameStateRef.current;
      if (brick.hasBuff && brick.buffType) {
        state.powerUps.push({
          x: brick.x + brick.w / 2,
          y: brick.y + brick.h / 2,
          type: brick.buffType,
          size: config.powerUpSize,
          vy: 150,
        });
        brick.hasBuff = false;
      }
    };

    const setTimedEffect = (effectKey) => {
      const state = gameStateRef.current;
      state.activeEffects[effectKey] = true;

      if (state.timers[effectKey]) {
        clearTimeout(state.timers[effectKey]);
      }

      state.timers[effectKey] = setTimeout(() => {
        state.activeEffects[effectKey] = false;
      }, BUFF_DURATION_MS);
    };

    const applyPowerUp = (type, config) => {
      const state = gameStateRef.current;

      switch (type) {
        case 'wide':
          state.paddleWidth = Math.min(config.paddleMaxWidth, state.paddleWidth + config.paddleStepSize);
          break;
        case 'shrink':
          state.paddleWidth = Math.max(config.paddleMinWidth, state.paddleWidth - config.paddleStepSize);
          break;
        case 'sticky':
          setTimedEffect('sticky');
          break;
        case 'cannons':
          setTimedEffect('cannons');
          break;
        case 'brickplow':
          setTimedEffect('brickplow');
          break;
        case 'slowball':
          setTimedEffect('slow');
          break;
        case 'fastball':
          setTimedEffect('fast');
          break;
        case 'explosiveball':
          setTimedEffect('explosive');
          break;
        case 'multiball': {
          const baseBall = state.balls[0] || { x: paddleXRef.current || 400, y: 300 };
          state.balls.push(
            { x: baseBall.x, y: baseBall.y - 5, vx: -260, vy: -360, attached: false },
            { x: baseBall.x, y: baseBall.y - 5, vx: 260, vy: -360, attached: false }
          );
          state.isMoving = true;
          break;
        }
        default:
          break;
      }
    };

    const applyCursorStyle = (next) => {
      if (cursorStyleRef.current !== next) {
        cursorStyleRef.current = next;
        setCursorStyle(next);
      }
    };

    const updatePointerPosition = (clientX, clientY) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const { clientWidth, clientHeight } = containerRef.current;

      const scaleX = rect.width > 0 ? clientWidth / rect.width : 1;
      const scaleY = rect.height > 0 ? clientHeight / rect.height : 1;
      const mouseX = (clientX - rect.left) * scaleX;
      const mouseY = (clientY - rect.top) * scaleY;

      const state = gameStateRef.current;
      const pWidth = state.paddleWidth;
      const layoutMode = getLayoutMode(clientWidth);
      const playArea = getPlayArea(clientWidth, layoutMode);
      const minX = playArea.offsetX + pWidth / 2;
      const maxX = playArea.offsetX + playArea.playWidth - pWidth / 2;
      const clampedX = Math.max(minX, Math.min(maxX, mouseX));

      paddleXRef.current = clampedX;

      const balls = state.balls;
      for (let i = 0; i < balls.length; i++) {
        if (balls[i].attached) balls[i].x = clampedX;
      }

      if (state.isGameOver || state.isWin) {
        const config = getResponsiveConfig(clientWidth, clientHeight);
        const centerX = playArea.offsetX + playArea.playWidth / 2;
        const btnX = centerX - config.buttonWidth / 2;
        const btnY = clientHeight - config.buttonBottomOffset;

        const isOverButton =
          mouseX >= btnX && mouseX <= btnX + config.buttonWidth &&
          mouseY >= btnY && mouseY <= btnY + config.buttonHeight;

        applyCursorStyle(isOverButton ? 'cursor-pointer' : 'cursor-default');
      } else {
        applyCursorStyle('cursor-none');
      }
    };

    const handleMouseMove = (e) => updatePointerPosition(e.clientX, e.clientY);

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        updatePointerPosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleActionTrigger = (clientX, clientY) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const { clientWidth, clientHeight } = containerRef.current;

      const scaleX = rect.width > 0 ? clientWidth / rect.width : 1;
      const scaleY = rect.height > 0 ? clientHeight / rect.height : 1;
      const clickX = (clientX - rect.left) * scaleX;
      const clickY = (clientY - rect.top) * scaleY;

      const config = getResponsiveConfig(clientWidth, clientHeight);
      const playArea = getPlayArea(clientWidth, config.layoutMode);
      const centerX = playArea.offsetX + playArea.playWidth / 2;
      const btnX = centerX - config.buttonWidth / 2;
      const btnY = clientHeight - config.buttonBottomOffset;
      const state = gameStateRef.current;

      if (state.isGameOver || state.isWin) {
        if (
          clickX >= btnX && clickX <= btnX + config.buttonWidth &&
          clickY >= btnY && clickY <= btnY + config.buttonHeight
        ) {
          Object.values(state.timers).forEach((t) => clearTimeout(t));

          const startX = paddleXRef.current || centerX;
          state.isGameOver = false;
          state.isWin = false;
          state.isMoving = false;
          state.score = 0;
          state.paddleWidth = config.paddleNormalWidth;
          state.buffsSpawned = 0;
          state.powerUps = [];
          state.bullets = [];
          state.bricks = generateBricks(clientWidth, clientHeight);
          buildBrickGrid(state.bricks);
          cacheRef.current.lastClientWidth = clientWidth;
          cacheRef.current.brickBitmapDirty = true;
          cacheRef.current.staticFrameValid = false;
          state.balls = [
            { x: startX, y: clientHeight - config.paddleBottomOffset - config.ballRadius, vx: 0, vy: 0, attached: true },
          ];
          state.activeEffects = {
            sticky: false, brickplow: false, explosive: false,
            cannons: false, slow: false, fast: false,
          };

          applyCursorStyle('cursor-none');
        }
        return;
      }

      const pX = paddleXRef.current || centerX;
      const pY = clientHeight - config.paddleBottomOffset;

      if (state.activeEffects.cannons) {
        const halfW = state.paddleWidth / 2;
        state.bullets.push(
          { x: pX - halfW + 10, y: pY - 8, vy: -1200 },
          { x: pX + halfW - 10, y: pY - 8, vy: -1200 }
        );
      }

      const balls = state.balls;
      for (let i = 0; i < balls.length; i++) {
        if (balls[i].attached) {
          balls[i].attached = false;
          balls[i].vx = (Math.random() - 0.5) * 320;
          balls[i].vy = -410;
          state.isMoving = true;
        }
      }
    };

    const handleClick = (e) => handleActionTrigger(e.clientX, e.clientY);

    const handleTouchStart = (e) => {
      if (e.touches.length > 0) {
        const state = gameStateRef.current;
        if (!state.isGameOver) {
          e.preventDefault();
        }
        updatePointerPosition(e.touches[0].clientX, e.touches[0].clientY);
        handleActionTrigger(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const formatScore = (num) => String(num).padStart(5, '0');

    const getPaddleGradient = (ctx2d, pLeft, pY, pWidth, pHeight) => {
      const cache = cacheRef.current;
      if (cache.paddleGrad && cache.paddleGradWidth === pWidth) {
        return cache.paddleGrad;
      }
      const grad = ctx2d.createLinearGradient(0, pY, 0, pY + pHeight);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.3, '#D0D0D0');
      grad.addColorStop(0.7, '#666666');
      grad.addColorStop(1, '#222222');
      cache.paddleGrad = grad;
      cache.paddleGradWidth = pWidth;
      return grad;
    };

    const getBallGradient = (ctx2d, radius) => {
      const cache = cacheRef.current;
      if (cache.ballGrad && cache.ballGradRadius === radius) {
        return cache.ballGrad;
      }
      const grad = ctx2d.createRadialGradient(
        -radius * 0.3, -radius * 0.3, radius * 0.1,
        0, 0, radius
      );
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.3, '#E0E0E0');
      grad.addColorStop(0.75, '#555555');
      grad.addColorStop(1, '#1A1A1A');
      cache.ballGrad = grad;
      cache.ballGradRadius = radius;
      return grad;
    };

    const rebuildBrickBitmap = (bricks, clientWidth, clientHeight, dpr) => {
      let bmp = cacheRef.current.brickBitmap;
      if (!bmp) {
        bmp = document.createElement('canvas');
        cacheRef.current.brickBitmap = bmp;
      }
      const targetW = Math.max(1, Math.round(clientWidth * dpr));
      const targetH = Math.max(1, Math.round(clientHeight * dpr));
      if (bmp.width !== targetW || bmp.height !== targetH) {
        bmp.width = targetW;
        bmp.height = targetH;
      }
      const bctx = bmp.getContext('2d');
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.clearRect(0, 0, clientWidth, clientHeight);
      bctx.fillStyle = '#121212';
      for (let i = 0; i < bricks.length; i++) {
        const b = bricks[i];
        if (b.alive) bctx.fillRect(b.x, b.y, b.w, b.h);
      }
      cacheRef.current.brickBitmapDirty = false;
    };

    const MAX_BOUNCES_PER_SUBSTEP = 4;

    const moveBallWithCollisions = (ball, subDt, state, bricks, pX, pY, pWidth, config) => {
      let remaining = 1;
      let bounces = 0;

      while (remaining > 0 && bounces < MAX_BOUNCES_PER_SUBSTEP) {
        const dx = ball.vx * subDt * remaining;
        const dy = ball.vy * subDt * remaining;

        if (dx === 0 && dy === 0) break;

        let bestT = 1;
        let bestAxis = null;
        let bestIsPaddle = false;
        let bestBrickIdx = -1;

        if (dy > 0) {
          const paddleBox = { x: pX - pWidth / 2, y: pY, w: pWidth, h: config.paddleHeight };
          const hit = sweptCircleAABB(ball.x, ball.y, dx, dy, config.ballRadius, paddleBox);
          if (hit && hit.t < bestT) {
            bestT = hit.t;
            bestAxis = hit.axis;
            bestIsPaddle = true;
          }
        }

        const sweptMinX = Math.min(ball.x, ball.x + dx) - config.ballRadius;
        const sweptMaxX = Math.max(ball.x, ball.x + dx) + config.ballRadius;
        const sweptMinY = Math.min(ball.y, ball.y + dy) - config.ballRadius;
        const sweptMaxY = Math.max(ball.y, ball.y + dy) + config.ballRadius;
        const candidates = getCandidateBrickIndices(sweptMinX, sweptMinY, sweptMaxX, sweptMaxY);

        for (let ci = 0; ci < candidates.length; ci++) {
          const idx = candidates[ci];
          const b = bricks[idx];
          if (!b || !b.alive) continue;
          const hit = sweptCircleAABB(ball.x, ball.y, dx, dy, config.ballRadius, b);
          if (hit && hit.t < bestT) {
            bestT = hit.t;
            bestAxis = hit.axis;
            bestIsPaddle = false;
            bestBrickIdx = idx;
          }
        }

        if (bestAxis === null) {
          ball.x += dx;
          ball.y += dy;
          remaining = 0;
          break;
        }

        const EPS = 0.01;
        ball.x += dx * bestT;
        ball.y += dy * bestT;

        if (bestIsPaddle) {
          if (state.activeEffects.sticky) {
            ball.attached = true;
            ball.x = Math.max(pX - pWidth / 2, Math.min(pX + pWidth / 2, ball.x));
            ball.y = pY - config.ballRadius;
            return true;
          }
          const hitPoint = (ball.x - pX) / (pWidth / 2);
          ball.vx = hitPoint * 380;
          ball.vy = -Math.max(340, Math.abs(ball.vy));
          ball.y -= EPS;
        } else {
          const b = bricks[bestBrickIdx];
          b.alive = false;
          checkAndSpawnPowerUp(b, config);
          removeBrickFromGrid(b, bestBrickIdx);
          cacheRef.current.brickBitmapDirty = true;

          if (!state.activeEffects.brickplow) {
            if (bestAxis === 'x') {
              ball.vx *= -1;
              ball.x += ball.vx > 0 ? EPS : -EPS;
            } else {
              ball.vy *= -1;
              ball.y += ball.vy > 0 ? EPS : -EPS;
            }
          }

          if (state.activeEffects.explosive) {
            for (let j = 0; j < bricks.length; j++) {
              const exB = bricks[j];
              if (exB.alive && Math.hypot(exB.x - b.x, exB.y - b.y) < 35) {
                exB.alive = false;
                checkAndSpawnPowerUp(exB, config);
                if (!exB._gridRemoved) {
                  removeBrickFromGrid(exB, j);
                  exB._gridRemoved = true;
                }
              }
            }
          }

          state.score += 10;
          if (state.score > state.highScore) state.highScore = state.score;
        }

        remaining *= (1 - bestT);
        bounces++;
      }

      return false;
    };

    const drawScene = (timestamp) => {
      const state = gameStateRef.current;
      if (!state.lastTime) state.lastTime = timestamp;
      let dt = (timestamp - state.lastTime) / 1000;
      state.lastTime = timestamp;
      if (dt > 0.25) dt = 1 / 60;
      dt = Math.min(dt, 0.032);

      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const config = getResponsiveConfig(clientWidth, clientHeight);

      if ((state.isGameOver || state.isWin) && cacheRef.current.staticFrameValid) {
        animationFrameId = requestAnimationFrame(drawScene);
        return;
      }

      const sizeChanged = canvas.width !== Math.round(clientWidth * dpr) || canvas.height !== Math.round(clientHeight * dpr);
      if (sizeChanged) {
        canvas.width = Math.round(clientWidth * dpr);
        canvas.height = Math.round(clientHeight * dpr);
        if (cacheRef.current.lastClientWidth !== clientWidth) {
          state.bricks = generateBricks(clientWidth, clientHeight);
          buildBrickGrid(state.bricks);
          cacheRef.current.lastClientWidth = clientWidth;
        }
        cacheRef.current.paddleGrad = null;
        cacheRef.current.ballGrad = null;
        cacheRef.current.brickBitmapDirty = true;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#f5f5dc';
      ctx.fillRect(0, 0, clientWidth, clientHeight);

      const playArea = getPlayArea(clientWidth, config.layoutMode);
      const centerX = playArea.offsetX + playArea.playWidth / 2;

      // HUD text needs a gap between "HI ▒▒▒▒▒" and the score that scales
      // with the (now uncapped, on desktop) scoreFontSize — a fixed px gap
      // caused the two strings to overlap once font size grew past the
      // point the gap could contain it. Scaled off measured text width
      // instead of a magic-number offset so it never overlaps regardless
      // of font size.

      const bricks = state.bricks;
      let anyAlive = false;
      for (let i = 0; i < bricks.length; i++) {
        if (bricks[i].alive) { anyAlive = true; break; }
      }
      const allBricksCleared = bricks.length > 0 && !anyAlive;

      if (allBricksCleared && !state.isWin) {
        state.isWin = true;
        state.isMoving = false;
        applyCursorStyle('cursor-default');
      }

      if (cacheRef.current.brickBitmapDirty || !cacheRef.current.brickBitmap) {
        rebuildBrickBitmap(bricks, clientWidth, clientHeight, dpr);
      }
      ctx.drawImage(cacheRef.current.brickBitmap, 0, 0, clientWidth, clientHeight);

      if (!state.isMoving && !state.isGameOver && !state.isWin) {
        const hintFontSize = Math.max(13, Math.round(16 * (config.ballRadius / 9)));
        ctx.save();
        ctx.font = `600 ${hintFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#121212';
        ctx.fillText('( click to play )', centerX, (bricks.maxBrickY || 0) + 16);
        ctx.restore();
      }

      const currentScoreStr = formatScore(state.score);
      const highScoreStr = formatScore(state.highScore);

      // Left margin and gap are horizontal, so they correctly scale off
      // scoreFontSize (a width-based vw value). Top margin is a VERTICAL
      // measurement, so it must scale off clientHeight via vh(), not off
      // a width-derived font size — otherwise it drifts out of sync with
      // the real top of the viewport whenever width and height change in
      // different proportions (the normal case, since 1920x1080 isn't
      // square, and zoom doesn't scale both axes identically in every
      // browser). This mirrors the paddleBottomOffset/buttonBottomOffset
      // fix (vh, not vw).
      const hudLeftMargin = config.scoreFontSize * 1.5;
      const hudTopMargin = vh(1.852, clientHeight); // ~20px @ 1080h, uncapped
      const hudGap = config.scoreFontSize * 0.5;

      ctx.save();
      ctx.font = `700 ${config.scoreFontSize}px "Courier New", Courier, monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#777777';
      const hiText = `HI ${highScoreStr}`;
      ctx.fillText(hiText, playArea.offsetX + hudLeftMargin, hudTopMargin);
      const hiTextWidth = ctx.measureText(hiText).width;
      ctx.fillStyle = '#222222';
      ctx.fillText(
        ` ${currentScoreStr}`,
        playArea.offsetX + hudLeftMargin + hiTextWidth + hudGap,
        hudTopMargin
      );
      ctx.restore();

      const pX = paddleXRef.current || centerX;
      const pY = clientHeight - config.paddleBottomOffset;
      const pWidth = state.paddleWidth;

      let speedMultiplier = 1.0;
      if (state.activeEffects.slow) speedMultiplier *= 0.65;
      if (state.activeEffects.fast) speedMultiplier *= 1.45;

      if (!state.isWin && !state.isGameOver) {
        const bullets = state.bullets;
        for (let i = bullets.length - 1; i >= 0; i--) {
          const bullet = bullets[i];
          const prevY = bullet.y;
          bullet.y += bullet.vy * dt;

          ctx.fillStyle = '#FF5A1F';
          ctx.fillRect(bullet.x - 2, bullet.y, 4, 16);

          let bulletHit = false;
          const candidates = getCandidateBrickIndices(
            bullet.x - 3, Math.min(bullet.y, prevY), bullet.x + 3, Math.max(bullet.y, prevY)
          );
          for (let ci = 0; ci < candidates.length; ci++) {
            const j = candidates[ci];
            const b = bricks[j];
            if (b && b.alive &&
              bullet.x + 3 >= b.x && bullet.x - 3 <= b.x + b.w &&
              bullet.y <= b.y + b.h && prevY >= b.y
            ) {
              b.alive = false;
              checkAndSpawnPowerUp(b, config);
              removeBrickFromGrid(b, j);
              cacheRef.current.brickBitmapDirty = true;
              state.score += 10;
              if (state.score > state.highScore) state.highScore = state.score;
              bulletHit = true;
            }
          }

          if (bulletHit || bullet.y < -20) bullets.splice(i, 1);
        }
      }

      const SUB_STEPS = state.activeEffects.fast ? 3 : 1;
      const subDt = dt * speedMultiplier / SUB_STEPS;

      if (!state.isWin && !state.isGameOver) {
        const balls = state.balls;
        for (let bIdx = balls.length - 1; bIdx >= 0; bIdx--) {
          const ball = balls[bIdx];

          if (!ball.attached) {
            for (let step = 0; step < SUB_STEPS; step++) {
              const becameAttached = moveBallWithCollisions(ball, subDt, state, bricks, pX, pY, pWidth, config);

              if (ball.x - config.ballRadius <= playArea.offsetX) {
                ball.x = playArea.offsetX + config.ballRadius;
                ball.vx = Math.abs(ball.vx);
              } else if (ball.x + config.ballRadius >= playArea.offsetX + playArea.playWidth) {
                ball.x = playArea.offsetX + playArea.playWidth - config.ballRadius;
                ball.vx = -Math.abs(ball.vx);
              }
              if (ball.y - config.ballRadius <= 0) {
                ball.y = config.ballRadius;
                ball.vy = Math.abs(ball.vy);
              }

              if (becameAttached) break;
            }
          }

          if (ball.y - config.ballRadius > clientHeight) {
            balls.splice(bIdx, 1);
          }
        }
      }

      if (state.balls.length === 0 && !state.isGameOver && !state.isWin) {
        state.isGameOver = true;
        state.isMoving = false;
        applyCursorStyle('cursor-default');
      }

      const powerUps = state.powerUps;
      for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i];
        if (!state.isWin) p.y += p.vy * dt;

        const img = iconsRef.current[p.type];
        if (img && img.loaded) {
          ctx.drawImage(img, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        } else {
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        const pLeft = pX - pWidth / 2;
        const pRight = pX + pWidth / 2;
        if (p.y >= pY - 10 && p.y <= pY + config.paddleHeight && p.x >= pLeft && p.x <= pRight) {
          applyPowerUp(p.type, config);
          powerUps.splice(i, 1);
        } else if (p.y > clientHeight + 50) {
          powerUps.splice(i, 1);
        }
      }

      if (!state.isGameOver && !state.isWin) {
        const shadowCache = cacheRef.current;

        if (shadowCache.paddleShadowSprite) {
          ctx.drawImage(
            shadowCache.paddleShadowSprite,
            pX - pWidth * 0.55, pY + config.paddleHeight - 4,
            pWidth * 1.1, 24
          );
        }

        const pLeft = pX - pWidth / 2;
        ctx.save();
        const paddleGrad = getPaddleGradient(ctx, pLeft, pY, pWidth, config.paddleHeight);
        ctx.beginPath();
        ctx.roundRect(pLeft, pY, pWidth, config.paddleHeight, 8);
        ctx.fillStyle = paddleGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.roundRect(pLeft + 3, pY + 2, pWidth - 6, 2, 1);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();

        if (state.activeEffects.cannons) {
          ctx.fillStyle = '#FF5A1F';
          ctx.fillRect(pLeft + 6, pY - 8, 8, 8);
          ctx.fillRect(pLeft + pWidth - 14, pY - 8, 8, 8);
        }
        ctx.restore();

        const balls = state.balls;
        const ballGrad = getBallGradient(ctx, config.ballRadius);
        for (let i = 0; i < balls.length; i++) {
          const ball = balls[i];
          const bX = ball.x;
          const bY = ball.y;

          if (shadowCache.ballShadowSprite) {
            ctx.drawImage(shadowCache.ballShadowSprite, bX - 20, bY + config.ballRadius - 6, 40, 16);
          }

          ctx.save();
          ctx.translate(bX, bY);
          ctx.beginPath();
          ctx.arc(0, 0, config.ballRadius, 0, Math.PI * 2);
          ctx.fillStyle = ballGrad;
          ctx.fill();
          ctx.restore();
        }
      }

      if (state.isWin) {
        ctx.fillStyle = '#121212';
        ctx.font = `700 ${config.winTitleFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('404 DESTROYED!', centerX, clientHeight / 2 - 20);

        ctx.font = `700 ${config.winScoreFontSize}px "Courier New", Courier, monospace`;
        ctx.fillStyle = '#121212';
        ctx.fillText(`TOTAL SCORE: ${formatScore(state.score)}`, centerX, clientHeight / 2 + 25);
      }

      if (state.isGameOver || state.isWin) {
        const btnX = centerX - config.buttonWidth / 2;
        const btnY = clientHeight - config.buttonBottomOffset;

        ctx.beginPath();
        ctx.roundRect(btnX, btnY + 4, config.buttonWidth, config.buttonHeight, 14);
        ctx.fillStyle = 'rgba(18, 18, 18, 0.3)';
        ctx.fill();

        ctx.beginPath();
        ctx.roundRect(btnX, btnY, config.buttonWidth, config.buttonHeight, 14);
        ctx.fillStyle = '#121212';
        ctx.strokeStyle = '#f5f5dc';
        ctx.lineWidth = 2.5;
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f5f5dc';
        ctx.font = `bold ${config.buttonFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          state.isWin ? 'PLAY AGAIN' : 'RETRY',
          centerX,
          btnY + config.buttonHeight / 2
        );

        cacheRef.current.staticFrameValid = true;
      }

      animationFrameId = requestAnimationFrame(drawScene);
    };

    animationFrameId = requestAnimationFrame(drawScene);

    const target = containerRef.current || window;
    target.addEventListener('mousemove', handleMouseMove);
    target.addEventListener('click', handleClick);
    target.addEventListener('touchmove', handleTouchMove, { passive: true });
    target.addEventListener('touchstart', handleTouchStart, { passive: false });

    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else {
        gameStateRef.current.lastTime = 0;
        animationFrameId = requestAnimationFrame(drawScene);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelAnimationFrame(animationFrameId);
      target.removeEventListener('mousemove', handleMouseMove);
      target.removeEventListener('click', handleClick);
      target.removeEventListener('touchmove', handleTouchMove);
      target.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('visibilitychange', handleVisibility);
      Object.values(gameStateRef.current.timers).forEach((t) => clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    let lastDpr = window.devicePixelRatio || 1;
    let debounceId = null;
    let reloaded = false;

    const checkZoom = () => {
      if (reloaded) return;
      const currentDpr = window.devicePixelRatio || 1;
      if (Math.abs(currentDpr - lastDpr) > 0.001) {
        reloaded = true;
        window.location.reload();
      }
    };

    const handlePossibleZoom = () => {
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(checkZoom, 300);
    };

    window.addEventListener('resize', handlePossibleZoom);

    return () => {
      if (debounceId) clearTimeout(debounceId);
      window.removeEventListener('resize', handlePossibleZoom);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-screen bg-[#f5f5dc] overflow-hidden select-none p-0 m-0 ${cursorStyle}`}
    >
      <canvas ref={canvasRef} className="block w-full h-full p-0 m-0" />
    </div>
  );
}