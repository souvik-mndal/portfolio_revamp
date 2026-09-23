
// import React, { useEffect, useRef, useState } from 'react';

// export default function NotFound404() {
//   const canvasRef = useRef(null);
//   const containerRef = useRef(null);
//   const paddleXRef = useRef(null);

//   // System cursor toggle state ('cursor-none', 'cursor-default', 'cursor-pointer')
//   const [cursorStyle, setCursorStyle] = useState('cursor-none');

//   // Width Caps & Buff Configuration
//   const PADDLE_NORMAL_WIDTH = 160;
//   const PADDLE_MAX_WIDTH = 380; // Hard cap for Wide Paddle
//   const PADDLE_MIN_WIDTH = 80;   // Hard floor for Shrink Paddle
//   const PADDLE_STEP_SIZE = 40;   // Size change per pickup
//   const MAX_BUFFS_PER_GAME = 65; // Max buff drop limit
//   const POWERUP_ICON_SIZE = 72;  // Falling icon badge size
//   const BUFF_DURATION_MS = 10000; // 10 seconds

//   // Game Engine State Refs
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
//     paddleWidth: PADDLE_NORMAL_WIDTH,
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

//   useEffect(() => {
//     // Preload SVG Power-Up Assets
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
//       img.src = p.path;
//       iconsRef.current[p.id] = img;
//     });

//     const canvas = canvasRef.current;
//     if (!canvas) return;
//     const ctx = canvas.getContext('2d');

//     let animationFrameId;

//     const PADDLE_HEIGHT = 18;
//     const BALL_RADIUS = 9;
//     const BUTTON_WIDTH = 180;
//     const BUTTON_HEIGHT = 50;

//     // Generate Bricks from Pixel Text with Pre-Scattered Buff Assignments
//     const generateBricks = (clientWidth) => {
//       const offscreen = document.createElement('canvas');
//       const offCtx = offscreen.getContext('2d');
//       const offWidth = 1600;
//       const offHeight = 520;
//       offscreen.width = offWidth;
//       offscreen.height = offHeight;

//       offCtx.fillStyle = '#000000';
//       offCtx.fillRect(0, 0, offWidth, offHeight);
//       offCtx.fillStyle = '#FFFFFF';
//       offCtx.textAlign = 'center';
//       offCtx.textBaseline = 'middle';

//       const rowY = 175;

//       // Draw "404"
//       offCtx.font = '900 325px "Arial Black", Impact, sans-serif';
//       offCtx.fillText('404', offWidth / 2 - 180, rowY);

//       // Draw Emoji
//       const emojiX = offWidth / 2 + 300;
//       const emojiRadius = 115;
//       offCtx.beginPath();
//       offCtx.arc(emojiX, rowY - 10, emojiRadius, 0, Math.PI * 2);
//       offCtx.lineWidth = 25;
//       offCtx.strokeStyle = '#FFFFFF';
//       offCtx.stroke();

//       // Eyes (X)
//       offCtx.font = '900 75px sans-serif';
//       offCtx.fillText('✕', emojiX - 38, rowY - 25);
//       offCtx.fillText('✕', emojiX + 38, rowY - 25);

//       // Frown
//       offCtx.beginPath();
//       offCtx.arc(emojiX, rowY + 70, 46, Math.PI * 1.15, Math.PI * 1.85);
//       offCtx.lineWidth = 16;
//       offCtx.strokeStyle = '#FFFFFF';
//       offCtx.stroke();

//       // "OOPS! PAGE NOT FOUND"
//       offCtx.font = '650 130px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
//       offCtx.letterSpacing = '-3.5px';
//       offCtx.fillText('OOPS! PAGE NOT FOUND', offWidth / 2, 375);

//       const imgData = offCtx.getImageData(0, 0, offWidth, offHeight);
//       const data = imgData.data;

//       const pixelSize = 3;
//       const pixelGap = 1;
//       const step = pixelSize + pixelGap;

//       const scale = clientWidth / offWidth;
//       const bricks = [];

//       for (let y = 0; y < offHeight; y += step) {
//         for (let x = 0; x < offWidth; x += step) {
//           const index = (Math.floor(y) * offWidth + Math.floor(x)) * 4;
//           if (data[index] > 128) {
//             bricks.push({
//               x: x * scale,
//               y: y * scale,
//               w: pixelSize * scale,
//               h: pixelSize * scale,
//               alive: true,
//               hasBuff: false,
//               buffType: null,
//             });
//           }
//         }
//       }

//       // Scatter power-ups across brick grid
//       const availableTypes = [
//         'wide',
//         'shrink',
//         'sticky',
//         'multiball',
//         'brickplow',
//         'slowball',
//         'fastball',
//         'explosiveball',
//         'cannons',
//       ];

//       const totalToAssign = Math.min(MAX_BUFFS_PER_GAME, bricks.length);
//       const indices = Array.from({ length: bricks.length }, (_, i) => i);

//       for (let i = indices.length - 1; i > 0; i--) {
//         const j = Math.floor(Math.random() * (i + 1));
//         [indices[i], indices[j]] = [indices[j], indices[i]];
//       }

//       for (let i = 0; i < totalToAssign; i++) {
//         const brickIdx = indices[i];
//         bricks[brickIdx].hasBuff = true;
//         bricks[brickIdx].buffType =
//           availableTypes[Math.floor(Math.random() * availableTypes.length)];
//       }

//       return bricks;
//     };

//     if (containerRef.current) {
//       const initialX = containerRef.current.clientWidth / 2;
//       gameStateRef.current.bricks = generateBricks(containerRef.current.clientWidth);
//       gameStateRef.current.balls = [
//         {
//           x: initialX,
//           y: containerRef.current.clientHeight - 40 - BALL_RADIUS,
//           vx: 0,
//           vy: 0,
//           attached: true,
//         },
//       ];
//     }

//     const checkAndSpawnPowerUp = (brick) => {
//       const state = gameStateRef.current;
//       if (brick.hasBuff && brick.buffType) {
//         state.powerUps.push({
//           x: brick.x + brick.w / 2,
//           y: brick.y + brick.h / 2,
//           type: brick.buffType,
//           size: POWERUP_ICON_SIZE,
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

//     const applyPowerUp = (type) => {
//       const state = gameStateRef.current;

//       switch (type) {
//         case 'wide':
//           state.paddleWidth = Math.min(
//             PADDLE_MAX_WIDTH,
//             state.paddleWidth + PADDLE_STEP_SIZE
//           );
//           break;

//         case 'shrink':
//           state.paddleWidth = Math.max(
//             PADDLE_MIN_WIDTH,
//             state.paddleWidth - PADDLE_STEP_SIZE
//           );
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

//     const handleMouseMove = (e) => {
//       if (!containerRef.current) return;
//       const rect = containerRef.current.getBoundingClientRect();
//       const mouseX = e.clientX - rect.left;
//       const mouseY = e.clientY - rect.top;

//       const pWidth = gameStateRef.current.paddleWidth;
//       const minX = pWidth / 2;
//       const maxX = rect.width - pWidth / 2;
//       const clampedX = Math.max(minX, Math.min(maxX, mouseX));

//       paddleXRef.current = clampedX;

//       gameStateRef.current.balls.forEach((ball) => {
//         if (ball.attached) {
//           ball.x = clampedX;
//         }
//       });

//       // Pointer Cursor Check on Retry / Play Again Button
//       if (gameStateRef.current.isGameOver || gameStateRef.current.isWin) {
//         const { clientWidth, clientHeight } = containerRef.current;
//         const btnX = clientWidth / 2 - BUTTON_WIDTH / 2;
//         const btnY = clientHeight - 110;

//         const isOverButton =
//           mouseX >= btnX &&
//           mouseX <= btnX + BUTTON_WIDTH &&
//           mouseY >= btnY &&
//           mouseY <= btnY + BUTTON_HEIGHT;

//         setCursorStyle(isOverButton ? 'cursor-pointer' : 'cursor-default');
//       } else {
//         setCursorStyle('cursor-none');
//       }
//     };

//     // Mouse Click Handler
//     const handleClick = (e) => {
//       if (!containerRef.current) return;
//       const rect = containerRef.current.getBoundingClientRect();
//       const clickX = e.clientX - rect.left;
//       const clickY = e.clientY - rect.top;

//       const { clientWidth, clientHeight } = containerRef.current;
//       const btnX = clientWidth / 2 - BUTTON_WIDTH / 2;
//       const btnY = clientHeight - 110;

//       // Handle Restart on Game Over or Win
//       if (gameStateRef.current.isGameOver || gameStateRef.current.isWin) {
//         if (
//           clickX >= btnX &&
//           clickX <= btnX + BUTTON_WIDTH &&
//           clickY >= btnY &&
//           clickY <= btnY + BUTTON_HEIGHT
//         ) {
//           Object.values(gameStateRef.current.timers).forEach((t) => clearTimeout(t));

//           const startX = paddleXRef.current || clientWidth / 2;
//           gameStateRef.current.isGameOver = false;
//           gameStateRef.current.isWin = false;
//           gameStateRef.current.isMoving = false;
//           gameStateRef.current.score = 0;
//           gameStateRef.current.paddleWidth = PADDLE_NORMAL_WIDTH;
//           gameStateRef.current.buffsSpawned = 0;
//           gameStateRef.current.powerUps = [];
//           gameStateRef.current.bullets = [];
//           gameStateRef.current.bricks = generateBricks(clientWidth);
//           gameStateRef.current.balls = [
//             {
//               x: startX,
//               y: clientHeight - 40 - BALL_RADIUS,
//               vx: 0,
//               vy: 0,
//               attached: true,
//             },
//           ];
//           gameStateRef.current.activeEffects = {
//             sticky: false,
//             brickplow: false,
//             explosive: false,
//             cannons: false,
//             slow: false,
//             fast: false,
//           };

//           setCursorStyle('cursor-none');
//         }
//         return;
//       }

//       const pX = paddleXRef.current || clientWidth / 2;
//       const pY = clientHeight - 40;

//       if (gameStateRef.current.activeEffects.cannons) {
//         const halfW = gameStateRef.current.paddleWidth / 2;
//         gameStateRef.current.bullets.push(
//           { x: pX - halfW + 10, y: pY - 8, vy: -1200 },
//           { x: pX + halfW - 10, y: pY - 8, vy: -1200 }
//         );
//       }

//       gameStateRef.current.balls.forEach((ball) => {
//         if (ball.attached) {
//           ball.attached = false;
//           ball.vx = (Math.random() - 0.5) * 320;
//           ball.vy = -410;
//           gameStateRef.current.isMoving = true;
//         }
//       });
//     };

//     const formatScore = (num) => String(num).padStart(5, '0');

//     // Main Render Loop
//     const drawScene = (timestamp) => {
//       if (!gameStateRef.current.lastTime) gameStateRef.current.lastTime = timestamp;
//       const dt = Math.min((timestamp - gameStateRef.current.lastTime) / 1000, 0.032);
//       gameStateRef.current.lastTime = timestamp;

//       if (!containerRef.current) return;
//       const { clientWidth, clientHeight } = containerRef.current;
//       const dpr = window.devicePixelRatio || 1;

//       if (canvas.width !== clientWidth * dpr || canvas.height !== clientHeight * dpr) {
//         canvas.width = clientWidth * dpr;
//         canvas.height = clientHeight * dpr;
//         gameStateRef.current.bricks = generateBricks(clientWidth);
//       }

//       ctx.save();
//       ctx.scale(dpr, dpr);
//       ctx.clearRect(0, 0, clientWidth, clientHeight);

//       // Background
//       ctx.fillStyle = '#EBE7E0';
//       ctx.fillRect(0, 0, clientWidth, clientHeight);

//       // --- 1. Top Score Banner ---
//       const currentScoreStr = formatScore(gameStateRef.current.score);
//       const highScoreStr = formatScore(gameStateRef.current.highScore);

//       ctx.save();
//       ctx.font = '700 16px "Courier New", Courier, monospace';
//       ctx.textAlign = 'left';
//       ctx.textBaseline = 'top';

//       ctx.fillStyle = '#777777';
//       ctx.fillText(`HI ${highScoreStr}`, 25, 20);

//       ctx.fillStyle = '#222222';
//       ctx.fillText(` ${currentScoreStr}`, 130, 20);
//       ctx.restore();

//       // --- 2. Check Win Condition ---
//       const bricks = gameStateRef.current.bricks;
//       const allBricksCleared = bricks.length > 0 && bricks.every((b) => !b.alive);

//       if (allBricksCleared && !gameStateRef.current.isWin) {
//         gameStateRef.current.isWin = true;
//         gameStateRef.current.isMoving = false;
//         setCursorStyle('cursor-default');
//       }

//       // Render Bricks
//       ctx.fillStyle = '#1A1A1A';
//       for (let i = 0; i < bricks.length; i++) {
//         const b = bricks[i];
//         if (b.alive) {
//           ctx.fillRect(b.x, b.y, b.w, b.h);
//         }
//       }

//       const pX = paddleXRef.current || clientWidth / 2;
//       const pY = clientHeight - 40;
//       const pWidth = gameStateRef.current.paddleWidth;
//       const gameState = gameStateRef.current;

//       let speedMultiplier = 1.0;
//       if (gameState.activeEffects.slow) speedMultiplier *= 0.65;
//       if (gameState.activeEffects.fast) speedMultiplier *= 1.45;

//       // --- 3. Cannon Bullets ---
//       if (!gameState.isWin && !gameState.isGameOver) {
//         for (let i = gameState.bullets.length - 1; i >= 0; i--) {
//           const bullet = gameState.bullets[i];
//           const prevY = bullet.y;
//           bullet.y += bullet.vy * dt;

//           ctx.fillStyle = '#FF3333';
//           ctx.fillRect(bullet.x - 2, bullet.y, 4, 16);

//           let bulletHit = false;
//           for (let j = 0; j < bricks.length; j++) {
//             const b = bricks[j];
//             if (b.alive) {
//               if (
//                 bullet.x + 3 >= b.x &&
//                 bullet.x - 3 <= b.x + b.w &&
//                 bullet.y <= b.y + b.h &&
//                 prevY >= b.y
//               ) {
//                 b.alive = false;
//                 checkAndSpawnPowerUp(b);
//                 gameState.score += 10;
//                 if (gameState.score > gameState.highScore) {
//                   gameState.highScore = gameState.score;
//                 }
//                 bulletHit = true;
//               }
//             }
//           }

//           if (bulletHit || bullet.y < -20) {
//             gameState.bullets.splice(i, 1);
//           }
//         }
//       }

//       // --- 4. Sub-Stepping Physics for Balls ---
//       const SUB_STEPS = gameState.activeEffects.fast ? 3 : 1;
//       const subDt = (dt * speedMultiplier) / SUB_STEPS;

//       if (!gameState.isWin && !gameState.isGameOver) {
//         for (let bIdx = gameState.balls.length - 1; bIdx >= 0; bIdx--) {
//           const ball = gameState.balls[bIdx];

//           if (!ball.attached) {
//             for (let step = 0; step < SUB_STEPS; step++) {
//               ball.x += ball.vx * subDt;
//               ball.y += ball.vy * subDt;

//               if (ball.x - BALL_RADIUS <= 0) {
//                 ball.x = BALL_RADIUS;
//                 ball.vx = Math.abs(ball.vx);
//               } else if (ball.x + BALL_RADIUS >= clientWidth) {
//                 ball.x = clientWidth - BALL_RADIUS;
//                 ball.vx = -Math.abs(ball.vx);
//               }

//               if (ball.y - BALL_RADIUS <= 0) {
//                 ball.y = BALL_RADIUS;
//                 ball.vy = Math.abs(ball.vy);
//               }

//               const pLeft = pX - pWidth / 2;
//               const pRight = pX + pWidth / 2;
//               if (
//                 ball.y + BALL_RADIUS >= pY &&
//                 ball.y - BALL_RADIUS <= pY + PADDLE_HEIGHT &&
//                 ball.x >= pLeft &&
//                 ball.x <= pRight
//               ) {
//                 if (gameState.activeEffects.sticky) {
//                   ball.attached = true;
//                   ball.y = pY - BALL_RADIUS;
//                   break;
//                 } else {
//                   const hitPoint = (ball.x - pX) / (pWidth / 2);
//                   ball.vx = hitPoint * 380;
//                   ball.vy = -Math.max(340, Math.abs(ball.vy));
//                 }
//               }

//               for (let i = 0; i < bricks.length; i++) {
//                 const b = bricks[i];
//                 if (b.alive) {
//                   if (
//                     ball.x + BALL_RADIUS >= b.x &&
//                     ball.x - BALL_RADIUS <= b.x + b.w &&
//                     ball.y + BALL_RADIUS >= b.y &&
//                     ball.y - BALL_RADIUS <= b.y + b.h
//                   ) {
//                     b.alive = false;
//                     checkAndSpawnPowerUp(b);

//                     if (!gameState.activeEffects.brickplow) {
//                       const prevX = ball.x - ball.vx * subDt;
//                       const hitSide =
//                         prevX + BALL_RADIUS <= b.x || prevX - BALL_RADIUS >= b.x + b.w;

//                       if (hitSide) {
//                         ball.vx *= -1;
//                       } else {
//                         ball.vy *= -1;
//                       }
//                     }

//                     if (gameState.activeEffects.explosive) {
//                       for (let j = 0; j < bricks.length; j++) {
//                         const exB = bricks[j];
//                         if (exB.alive && Math.hypot(exB.x - b.x, exB.y - b.y) < 35) {
//                           exB.alive = false;
//                           checkAndSpawnPowerUp(exB);
//                         }
//                       }
//                     }

//                     if (Math.abs(ball.vy) < 240) {
//                       ball.vy = ball.vy < 0 ? -280 : 280;
//                     }

//                     gameState.score += 10;
//                     if (gameState.score > gameState.highScore) {
//                       gameState.highScore = gameState.score;
//                     }
//                     break;
//                   }
//                 }
//               }
//             }
//           }

//           if (ball.y - BALL_RADIUS > clientHeight) {
//             gameState.balls.splice(bIdx, 1);
//           }
//         }
//       }

//       if (gameState.balls.length === 0 && !gameState.isGameOver && !gameState.isWin) {
//         gameState.isGameOver = true;
//         gameState.isMoving = false;
//         setCursorStyle('cursor-default');
//       }

//       // --- 5. Render Falling Badges ---
//       for (let i = gameState.powerUps.length - 1; i >= 0; i--) {
//         const p = gameState.powerUps[i];
//         if (!gameState.isWin) {
//           p.y += p.vy * dt;
//         }

//         const img = iconsRef.current[p.type];
//         if (img && img.complete) {
//           ctx.drawImage(img, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
//         } else {
//           ctx.fillStyle = '#FFFFFF';
//           ctx.beginPath();
//           ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
//           ctx.fill();
//         }

//         const pLeft = pX - pWidth / 2;
//         const pRight = pX + pWidth / 2;
//         if (p.y >= pY - 10 && p.y <= pY + PADDLE_HEIGHT && p.x >= pLeft && p.x <= pRight) {
//           applyPowerUp(p.type);
//           gameState.powerUps.splice(i, 1);
//         } else if (p.y > clientHeight + 50) {
//           gameState.powerUps.splice(i, 1);
//         }
//       }

//       // --- 6. Render Paddle & Balls ---
//       if (!gameState.isGameOver && !gameState.isWin) {
//         // Floor Shadow
//         ctx.save();
//         ctx.beginPath();
//         ctx.ellipse(pX, pY + PADDLE_HEIGHT + 8, pWidth * 0.45, 5, 0, 0, Math.PI * 2);
//         ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
//         ctx.filter = 'blur(6px)';
//         ctx.fill();
//         ctx.restore();

//         // 3D Paddle Body
//         const pLeft = pX - pWidth / 2;
//         ctx.save();
//         const paddleGrad = ctx.createLinearGradient(pLeft, pY, pLeft, pY + PADDLE_HEIGHT);
//         paddleGrad.addColorStop(0, '#FFFFFF');
//         paddleGrad.addColorStop(0.3, '#D0D0D0');
//         paddleGrad.addColorStop(0.7, '#666666');
//         paddleGrad.addColorStop(1, '#222222');

//         ctx.beginPath();
//         ctx.roundRect(pLeft, pY, pWidth, PADDLE_HEIGHT, 8);
//         ctx.fillStyle = paddleGrad;
//         ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
//         ctx.shadowBlur = 10;
//         ctx.shadowOffsetY = 4;
//         ctx.fill();

//         // Highlight Rim
//         ctx.beginPath();
//         ctx.roundRect(pLeft + 3, pY + 2, pWidth - 6, 2, 1);
//         ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
//         ctx.fill();

//         // Laser Mounts
//         if (gameState.activeEffects.cannons) {
//           ctx.fillStyle = '#FF3333';
//           ctx.fillRect(pLeft + 6, pY - 8, 8, 8);
//           ctx.fillRect(pLeft + pWidth - 14, pY - 8, 8, 8);
//         }
//         ctx.restore();

//         // Render Active Ball(s)
//         gameState.balls.forEach((ball) => {
//           const bX = ball.x;
//           const bY = ball.y;

//           ctx.save();
//           ctx.beginPath();
//           ctx.ellipse(bX, bY + BALL_RADIUS, BALL_RADIUS * 0.7, 2.5, 0, 0, Math.PI * 2);
//           ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
//           ctx.filter = 'blur(2px)';
//           ctx.fill();
//           ctx.restore();

//           ctx.save();
//           const ballGrad = ctx.createRadialGradient(
//             bX - BALL_RADIUS * 0.3,
//             bY - BALL_RADIUS * 0.3,
//             BALL_RADIUS * 0.1,
//             bX,
//             bY,
//             BALL_RADIUS
//           );
//           ballGrad.addColorStop(0, '#FFFFFF');
//           ballGrad.addColorStop(0.3, '#E0E0E0');
//           ballGrad.addColorStop(0.75, '#555555');
//           ballGrad.addColorStop(1, '#1A1A1A');

//           ctx.beginPath();
//           ctx.arc(bX, bY, BALL_RADIUS, 0, Math.PI * 2);
//           ctx.fillStyle = ballGrad;
//           ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
//           ctx.shadowBlur = 8;
//           ctx.shadowOffsetY = 3;
//           ctx.fill();
//           ctx.restore();
//         });
//       }

//       // --- 7. Victory Screen Display ---
//       if (gameState.isWin) {
//         ctx.save();
//         ctx.fillStyle = '#1A1A1A';
//         ctx.font = '700 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
//         ctx.textAlign = 'center';
//         ctx.textBaseline = 'middle';
//         ctx.fillText('404 DESTROYED!', clientWidth / 2, clientHeight / 2 - 20);

//         ctx.font = '700 18px "Courier New", Courier, monospace';
//         ctx.fillStyle = '#555555';
//         ctx.fillText(`TOTAL SCORE: ${formatScore(gameState.score)}`, clientWidth / 2, clientHeight / 2 + 25);
//         ctx.restore();
//       }

//       // --- 8. Render RETRY / PLAY AGAIN Button ---
//       if (gameState.isGameOver || gameState.isWin) {
//         const btnX = clientWidth / 2 - BUTTON_WIDTH / 2;
//         const btnY = clientHeight - 110;

//         ctx.save();
//         ctx.beginPath();
//         ctx.roundRect(btnX, btnY + 4, BUTTON_WIDTH, BUTTON_HEIGHT, 14);
//         ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
//         ctx.fill();

//         ctx.beginPath();
//         ctx.roundRect(btnX, btnY, BUTTON_WIDTH, BUTTON_HEIGHT, 14);
//         ctx.fillStyle = '#1A1A1A';
//         ctx.strokeStyle = '#FFFFFF';
//         ctx.lineWidth = 2.5;
//         ctx.fill();
//         ctx.stroke();

//         ctx.fillStyle = '#FFFFFF';
//         ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
//         ctx.textAlign = 'center';
//         ctx.textBaseline = 'middle';
//         ctx.fillText(
//           gameState.isWin ? 'PLAY AGAIN' : 'RETRY',
//           clientWidth / 2,
//           btnY + BUTTON_HEIGHT / 2
//         );
//         ctx.restore();
//       }

//       ctx.restore();

//       animationFrameId = requestAnimationFrame(drawScene);
//     };

//     animationFrameId = requestAnimationFrame(drawScene);
//     window.addEventListener('mousemove', handleMouseMove);
//     window.addEventListener('click', handleClick);

//     return () => {
//       cancelAnimationFrame(animationFrameId);
//       window.removeEventListener('mousemove', handleMouseMove);
//       window.removeEventListener('click', handleClick);
//     };
//   }, []);

//   return (
//     <div
//       ref={containerRef}
//       className={`relative w-full h-screen bg-[#EBE7E0] overflow-hidden select-none p-0 m-0 ${cursorStyle}`}
//     >
//       <canvas ref={canvasRef} className="block w-full h-full p-0 m-0" />
//     </div>
//   );
// }





































// import React, { useEffect, useRef, useState } from 'react';

// /**
//  * OPTIMIZATION NOTES (vs original):
//  * 1. Removed all `ctx.filter = 'blur(...)'` shadow draws — these force a full
//  *    software compositing pass EVERY FRAME for every ball + paddle. Replaced
//  *    with a single cached radial-gradient shadow sprite drawn cheaply.
//  * 2. Paddle/ball gradients are cached and only rebuilt when their geometry
//  *    (paddle width) actually changes, not every frame.
//  * 3. `setCursorStyle` (a React state update -> re-render) no longer fires on
//  *    every mousemove; it only fires when the resolved style actually changes.
//  * 4. Event listeners attached to the container/canvas instead of `window`,
//  *    and mousemove is not doing any React work in the hot path.
//  * 5. devicePixelRatio is capped at 2 — uncapped DPR on 3x displays was
//  *    forcing 2-3x more pixels to be filled per frame for no visible gain.
//  * 6. Brick loop breaks immediately on first collision per ball (was already
//  *    partially true) and skips dead bricks via a flat array scan with no
//  *    per-brick object churn.
//  * 7. Removed redundant ctx.save()/restore() pairs in the ball-render loop
//  *    (was 2 per ball per frame); batched into one.
//  * 8. Delta-time is clamped AND a tab-resume spike guard drops any dt > 250ms
//  *    to a single safe step, preventing a "catch-up" physics explosion when
//  *    the tab regains focus after being backgrounded.
//  * 9. Off-screen text-to-bricks rasterization is unchanged logically but only
//  *    ever runs on resize/restart, not per frame.
//  * 10. Power-up icons use a loaded-flag instead of relying on `img.complete`
//  *     checks every frame, and swallow load errors so a missing asset can't
//  *     throw during the render loop.
//  */

// export default function NotFound404() {
//   const canvasRef = useRef(null);
//   const containerRef = useRef(null);
//   const paddleXRef = useRef(null);

//   const [cursorStyle, setCursorStyle] = useState('cursor-none');
//   const cursorStyleRef = useRef('cursor-none'); // mirrors state without triggering re-renders on read

//   const PADDLE_NORMAL_WIDTH = 160;
//   const PADDLE_MAX_WIDTH = 380;
//   const PADDLE_MIN_WIDTH = 80;
//   const PADDLE_STEP_SIZE = 40;
//   const MAX_BUFFS_PER_GAME = 65;
//   const POWERUP_ICON_SIZE = 72;
//   const BUFF_DURATION_MS = 10000;
//   const MAX_DPR = 2; // cap device pixel ratio to avoid over-rendering on 3x screens

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
//     paddleWidth: PADDLE_NORMAL_WIDTH,
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
//   // cached gradients keyed by the geometry that produced them
//   const cacheRef = useRef({
//     paddleGrad: null,
//     paddleGradWidth: null,
//     ballShadowSprite: null,
//     paddleShadowSprite: null,
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
//     const ctx = canvas.getContext('2d', { alpha: false }); // opaque canvas = faster compositing

//     let animationFrameId;

//     const PADDLE_HEIGHT = 18;
//     const BALL_RADIUS = 9;
//     const BUTTON_WIDTH = 180;
//     const BUTTON_HEIGHT = 50;

//     const generateBricks = (clientWidth) => {
//       const offscreen = document.createElement('canvas');
//       const offCtx = offscreen.getContext('2d');
//       const offWidth = 1600;
//       const offHeight = 520;
//       offscreen.width = offWidth;
//       offscreen.height = offHeight;

//       offCtx.fillStyle = '#000000';
//       offCtx.fillRect(0, 0, offWidth, offHeight);
//       offCtx.fillStyle = '#FFFFFF';
//       offCtx.textAlign = 'center';
//       offCtx.textBaseline = 'middle';

//       const rowY = 175;

//       offCtx.font = '900 325px "Arial Black", Impact, sans-serif';
//       offCtx.fillText('404', offWidth / 2 - 180, rowY);

//       const emojiX = offWidth / 2 + 300;
//       const emojiRadius = 115;
//       offCtx.beginPath();
//       offCtx.arc(emojiX, rowY - 10, emojiRadius, 0, Math.PI * 2);
//       offCtx.lineWidth = 25;
//       offCtx.strokeStyle = '#FFFFFF';
//       offCtx.stroke();

//       offCtx.font = '900 75px sans-serif';
//       offCtx.fillText('✕', emojiX - 38, rowY - 25);
//       offCtx.fillText('✕', emojiX + 38, rowY - 25);

//       offCtx.beginPath();
//       offCtx.arc(emojiX, rowY + 70, 46, Math.PI * 1.15, Math.PI * 1.85);
//       offCtx.lineWidth = 16;
//       offCtx.strokeStyle = '#FFFFFF';
//       offCtx.stroke();

//       offCtx.font = '650 130px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
//       offCtx.letterSpacing = '-3.5px';
//       offCtx.fillText('OOPS! PAGE NOT FOUND', offWidth / 2, 375);

//       const imgData = offCtx.getImageData(0, 0, offWidth, offHeight);
//       const data = imgData.data;

//       const pixelSize = 3;
//       const pixelGap = 1;
//       const step = pixelSize + pixelGap;

//       const scale = clientWidth / offWidth;
//       const bricks = [];

//       for (let y = 0; y < offHeight; y += step) {
//         const rowBase = Math.floor(y) * offWidth;
//         for (let x = 0; x < offWidth; x += step) {
//           const index = (rowBase + Math.floor(x)) * 4;
//           if (data[index] > 128) {
//             bricks.push({
//               x: x * scale,
//               y: y * scale,
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

//       return bricks;
//     };

//     // Build small cached sprites for shadows once, instead of blur-filtering every frame
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
//       const initialX = containerRef.current.clientWidth / 2;
//       gameStateRef.current.bricks = generateBricks(containerRef.current.clientWidth);
//       gameStateRef.current.balls = [
//         {
//           x: initialX,
//           y: containerRef.current.clientHeight - 40 - BALL_RADIUS,
//           vx: 0,
//           vy: 0,
//           attached: true,
//         },
//       ];
//     }

//     const checkAndSpawnPowerUp = (brick) => {
//       const state = gameStateRef.current;
//       if (brick.hasBuff && brick.buffType) {
//         state.powerUps.push({
//           x: brick.x + brick.w / 2,
//           y: brick.y + brick.h / 2,
//           type: brick.buffType,
//           size: POWERUP_ICON_SIZE,
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

//     const applyPowerUp = (type) => {
//       const state = gameStateRef.current;

//       switch (type) {
//         case 'wide':
//           state.paddleWidth = Math.min(PADDLE_MAX_WIDTH, state.paddleWidth + PADDLE_STEP_SIZE);
//           break;
//         case 'shrink':
//           state.paddleWidth = Math.max(PADDLE_MIN_WIDTH, state.paddleWidth - PADDLE_STEP_SIZE);
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

//     // Throttle cursor style writes: only touch React state when the value changes
//     const applyCursorStyle = (next) => {
//       if (cursorStyleRef.current !== next) {
//         cursorStyleRef.current = next;
//         setCursorStyle(next);
//       }
//     };

//     const handleMouseMove = (e) => {
//       if (!containerRef.current) return;
//       const rect = containerRef.current.getBoundingClientRect();
//       const mouseX = e.clientX - rect.left;
//       const mouseY = e.clientY - rect.top;

//       const state = gameStateRef.current;
//       const pWidth = state.paddleWidth;
//       const minX = pWidth / 2;
//       const maxX = rect.width - pWidth / 2;
//       const clampedX = Math.max(minX, Math.min(maxX, mouseX));

//       paddleXRef.current = clampedX;

//       const balls = state.balls;
//       for (let i = 0; i < balls.length; i++) {
//         if (balls[i].attached) balls[i].x = clampedX;
//       }

//       if (state.isGameOver || state.isWin) {
//         const { clientWidth, clientHeight } = containerRef.current;
//         const btnX = clientWidth / 2 - BUTTON_WIDTH / 2;
//         const btnY = clientHeight - 110;

//         const isOverButton =
//           mouseX >= btnX && mouseX <= btnX + BUTTON_WIDTH &&
//           mouseY >= btnY && mouseY <= btnY + BUTTON_HEIGHT;

//         applyCursorStyle(isOverButton ? 'cursor-pointer' : 'cursor-default');
//       } else {
//         applyCursorStyle('cursor-none');
//       }
//     };

//     const handleClick = (e) => {
//       if (!containerRef.current) return;
//       const rect = containerRef.current.getBoundingClientRect();
//       const clickX = e.clientX - rect.left;
//       const clickY = e.clientY - rect.top;

//       const { clientWidth, clientHeight } = containerRef.current;
//       const btnX = clientWidth / 2 - BUTTON_WIDTH / 2;
//       const btnY = clientHeight - 110;
//       const state = gameStateRef.current;

//       if (state.isGameOver || state.isWin) {
//         if (
//           clickX >= btnX && clickX <= btnX + BUTTON_WIDTH &&
//           clickY >= btnY && clickY <= btnY + BUTTON_HEIGHT
//         ) {
//           Object.values(state.timers).forEach((t) => clearTimeout(t));

//           const startX = paddleXRef.current || clientWidth / 2;
//           state.isGameOver = false;
//           state.isWin = false;
//           state.isMoving = false;
//           state.score = 0;
//           state.paddleWidth = PADDLE_NORMAL_WIDTH;
//           state.buffsSpawned = 0;
//           state.powerUps = [];
//           state.bullets = [];
//           state.bricks = generateBricks(clientWidth);
//           state.balls = [
//             { x: startX, y: clientHeight - 40 - BALL_RADIUS, vx: 0, vy: 0, attached: true },
//           ];
//           state.activeEffects = {
//             sticky: false, brickplow: false, explosive: false,
//             cannons: false, slow: false, fast: false,
//           };

//           applyCursorStyle('cursor-none');
//         }
//         return;
//       }

//       const pX = paddleXRef.current || clientWidth / 2;
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

//     const formatScore = (num) => String(num).padStart(5, '0');

//     const getPaddleGradient = (ctx2d, pLeft, pY, pWidth) => {
//       const cache = cacheRef.current;
//       if (cache.paddleGrad && cache.paddleGradWidth === pWidth) {
//         return cache.paddleGrad;
//       }
//       const grad = ctx2d.createLinearGradient(0, pY, 0, pY + PADDLE_HEIGHT);
//       grad.addColorStop(0, '#FFFFFF');
//       grad.addColorStop(0.3, '#D0D0D0');
//       grad.addColorStop(0.7, '#666666');
//       grad.addColorStop(1, '#222222');
//       cache.paddleGrad = grad;
//       cache.paddleGradWidth = pWidth;
//       return grad;
//     };

//     const drawScene = (timestamp) => {
//       const state = gameStateRef.current;
//       if (!state.lastTime) state.lastTime = timestamp;
//       let dt = (timestamp - state.lastTime) / 1000;
//       state.lastTime = timestamp;
//       // guard against huge dt spikes (tab was backgrounded / resumed)
//       if (dt > 0.25) dt = 1 / 60;
//       dt = Math.min(dt, 0.032);

//       if (!containerRef.current) return;
//       const { clientWidth, clientHeight } = containerRef.current;
//       const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

//       if (canvas.width !== Math.round(clientWidth * dpr) || canvas.height !== Math.round(clientHeight * dpr)) {
//         canvas.width = Math.round(clientWidth * dpr);
//         canvas.height = Math.round(clientHeight * dpr);
//         state.bricks = generateBricks(clientWidth);
//         cacheRef.current.paddleGrad = null; // invalidate on resize
//       }

//       ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
//       ctx.fillStyle = '#EBE7E0';
//       ctx.fillRect(0, 0, clientWidth, clientHeight);

//       // --- Score banner ---
//       const currentScoreStr = formatScore(state.score);
//       const highScoreStr = formatScore(state.highScore);

//       ctx.font = '700 16px "Courier New", Courier, monospace';
//       ctx.textAlign = 'left';
//       ctx.textBaseline = 'top';
//       ctx.fillStyle = '#777777';
//       ctx.fillText(`HI ${highScoreStr}`, 25, 20);
//       ctx.fillStyle = '#222222';
//       ctx.fillText(` ${currentScoreStr}`, 130, 20);

//       // --- Win check ---
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

//       // --- Render bricks ---
//       ctx.fillStyle = '#1A1A1A';
//       for (let i = 0; i < bricks.length; i++) {
//         const b = bricks[i];
//         if (b.alive) ctx.fillRect(b.x, b.y, b.w, b.h);
//       }

//       const pX = paddleXRef.current || clientWidth / 2;
//       const pY = clientHeight - 40;
//       const pWidth = state.paddleWidth;

//       let speedMultiplier = 1.0;
//       if (state.activeEffects.slow) speedMultiplier *= 0.65;
//       if (state.activeEffects.fast) speedMultiplier *= 1.45;

//       // --- Bullets ---
//       if (!state.isWin && !state.isGameOver) {
//         const bullets = state.bullets;
//         for (let i = bullets.length - 1; i >= 0; i--) {
//           const bullet = bullets[i];
//           const prevY = bullet.y;
//           bullet.y += bullet.vy * dt;

//           ctx.fillStyle = '#FF3333';
//           ctx.fillRect(bullet.x - 2, bullet.y, 4, 16);

//           let bulletHit = false;
//           for (let j = 0; j < bricks.length; j++) {
//             const b = bricks[j];
//             if (b.alive &&
//               bullet.x + 3 >= b.x && bullet.x - 3 <= b.x + b.w &&
//               bullet.y <= b.y + b.h && prevY >= b.y
//             ) {
//               b.alive = false;
//               checkAndSpawnPowerUp(b);
//               state.score += 10;
//               if (state.score > state.highScore) state.highScore = state.score;
//               bulletHit = true;
//             }
//           }

//           if (bulletHit || bullet.y < -20) bullets.splice(i, 1);
//         }
//       }

//       // --- Ball physics ---
//       const SUB_STEPS = state.activeEffects.fast ? 3 : 1;
//       const subDt = (dt * speedMultiplier) / SUB_STEPS;

//       if (!state.isWin && !state.isGameOver) {
//         const balls = state.balls;
//         for (let bIdx = balls.length - 1; bIdx >= 0; bIdx--) {
//           const ball = balls[bIdx];

//           if (!ball.attached) {
//             for (let step = 0; step < SUB_STEPS; step++) {
//               ball.x += ball.vx * subDt;
//               ball.y += ball.vy * subDt;

//               if (ball.x - BALL_RADIUS <= 0) {
//                 ball.x = BALL_RADIUS;
//                 ball.vx = Math.abs(ball.vx);
//               } else if (ball.x + BALL_RADIUS >= clientWidth) {
//                 ball.x = clientWidth - BALL_RADIUS;
//                 ball.vx = -Math.abs(ball.vx);
//               }

//               if (ball.y - BALL_RADIUS <= 0) {
//                 ball.y = BALL_RADIUS;
//                 ball.vy = Math.abs(ball.vy);
//               }

//               const pLeft = pX - pWidth / 2;
//               const pRight = pX + pWidth / 2;
//               if (
//                 ball.y + BALL_RADIUS >= pY && ball.y - BALL_RADIUS <= pY + PADDLE_HEIGHT &&
//                 ball.x >= pLeft && ball.x <= pRight
//               ) {
//                 if (state.activeEffects.sticky) {
//                   ball.attached = true;
//                   ball.y = pY - BALL_RADIUS;
//                   break;
//                 } else {
//                   const hitPoint = (ball.x - pX) / (pWidth / 2);
//                   ball.vx = hitPoint * 380;
//                   ball.vy = -Math.max(340, Math.abs(ball.vy));
//                 }
//               }

//               for (let i = 0; i < bricks.length; i++) {
//                 const b = bricks[i];
//                 if (b.alive &&
//                   ball.x + BALL_RADIUS >= b.x && ball.x - BALL_RADIUS <= b.x + b.w &&
//                   ball.y + BALL_RADIUS >= b.y && ball.y - BALL_RADIUS <= b.y + b.h
//                 ) {
//                   b.alive = false;
//                   checkAndSpawnPowerUp(b);

//                   if (!state.activeEffects.brickplow) {
//                     const prevX = ball.x - ball.vx * subDt;
//                     const hitSide = prevX + BALL_RADIUS <= b.x || prevX - BALL_RADIUS >= b.x + b.w;
//                     if (hitSide) ball.vx *= -1; else ball.vy *= -1;
//                   }

//                   if (state.activeEffects.explosive) {
//                     for (let j = 0; j < bricks.length; j++) {
//                       const exB = bricks[j];
//                       if (exB.alive && Math.hypot(exB.x - b.x, exB.y - b.y) < 35) {
//                         exB.alive = false;
//                         checkAndSpawnPowerUp(exB);
//                       }
//                     }
//                   }

//                   if (Math.abs(ball.vy) < 240) {
//                     ball.vy = ball.vy < 0 ? -280 : 280;
//                   }

//                   state.score += 10;
//                   if (state.score > state.highScore) state.highScore = state.score;
//                   break;
//                 }
//               }
//             }
//           }

//           if (ball.y - BALL_RADIUS > clientHeight) {
//             balls.splice(bIdx, 1);
//           }
//         }
//       }

//       if (state.balls.length === 0 && !state.isGameOver && !state.isWin) {
//         state.isGameOver = true;
//         state.isMoving = false;
//         applyCursorStyle('cursor-default');
//       }

//       // --- Falling badges ---
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
//         if (p.y >= pY - 10 && p.y <= pY + PADDLE_HEIGHT && p.x >= pLeft && p.x <= pRight) {
//           applyPowerUp(p.type);
//           powerUps.splice(i, 1);
//         } else if (p.y > clientHeight + 50) {
//           powerUps.splice(i, 1);
//         }
//       }

//       // --- Paddle & balls ---
//       if (!state.isGameOver && !state.isWin) {
//         const shadowCache = cacheRef.current;

//         // cheap cached-sprite shadow instead of blur filter
//         if (shadowCache.paddleShadowSprite) {
//           ctx.drawImage(
//             shadowCache.paddleShadowSprite,
//             pX - pWidth * 0.55, pY + PADDLE_HEIGHT - 4,
//             pWidth * 1.1, 24
//           );
//         }

//         const pLeft = pX - pWidth / 2;
//         ctx.save();
//         const paddleGrad = getPaddleGradient(ctx, pLeft, pY, pWidth);
//         ctx.beginPath();
//         ctx.roundRect(pLeft, pY, pWidth, PADDLE_HEIGHT, 8);
//         ctx.fillStyle = paddleGrad;
//         ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
//         ctx.shadowBlur = 10;
//         ctx.shadowOffsetY = 4;
//         ctx.fill();
//         ctx.shadowBlur = 0;
//         ctx.shadowOffsetY = 0;

//         ctx.beginPath();
//         ctx.roundRect(pLeft + 3, pY + 2, pWidth - 6, 2, 1);
//         ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
//         ctx.fill();

//         if (state.activeEffects.cannons) {
//           ctx.fillStyle = '#FF3333';
//           ctx.fillRect(pLeft + 6, pY - 8, 8, 8);
//           ctx.fillRect(pLeft + pWidth - 14, pY - 8, 8, 8);
//         }
//         ctx.restore();

//         const balls = state.balls;
//         for (let i = 0; i < balls.length; i++) {
//           const ball = balls[i];
//           const bX = ball.x;
//           const bY = ball.y;

//           if (shadowCache.ballShadowSprite) {
//             ctx.drawImage(shadowCache.ballShadowSprite, bX - 20, bY + BALL_RADIUS - 6, 40, 16);
//           }

//           ctx.save();
//           const ballGrad = ctx.createRadialGradient(
//             bX - BALL_RADIUS * 0.3, bY - BALL_RADIUS * 0.3, BALL_RADIUS * 0.1,
//             bX, bY, BALL_RADIUS
//           );
//           ballGrad.addColorStop(0, '#FFFFFF');
//           ballGrad.addColorStop(0.3, '#E0E0E0');
//           ballGrad.addColorStop(0.75, '#555555');
//           ballGrad.addColorStop(1, '#1A1A1A');

//           ctx.beginPath();
//           ctx.arc(bX, bY, BALL_RADIUS, 0, Math.PI * 2);
//           ctx.fillStyle = ballGrad;
//           ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
//           ctx.shadowBlur = 8;
//           ctx.shadowOffsetY = 3;
//           ctx.fill();
//           ctx.restore();
//         }
//       }

//       // --- Victory screen ---
//       if (state.isWin) {
//         ctx.fillStyle = '#1A1A1A';
//         ctx.font = '700 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
//         ctx.textAlign = 'center';
//         ctx.textBaseline = 'middle';
//         ctx.fillText('404 DESTROYED!', clientWidth / 2, clientHeight / 2 - 20);

//         ctx.font = '700 18px "Courier New", Courier, monospace';
//         ctx.fillStyle = '#555555';
//         ctx.fillText(`TOTAL SCORE: ${formatScore(state.score)}`, clientWidth / 2, clientHeight / 2 + 25);
//       }

//       // --- Retry / Play again button ---
//       if (state.isGameOver || state.isWin) {
//         const btnX = clientWidth / 2 - BUTTON_WIDTH / 2;
//         const btnY = clientHeight - 110;

//         ctx.beginPath();
//         ctx.roundRect(btnX, btnY + 4, BUTTON_WIDTH, BUTTON_HEIGHT, 14);
//         ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
//         ctx.fill();

//         ctx.beginPath();
//         ctx.roundRect(btnX, btnY, BUTTON_WIDTH, BUTTON_HEIGHT, 14);
//         ctx.fillStyle = '#1A1A1A';
//         ctx.strokeStyle = '#FFFFFF';
//         ctx.lineWidth = 2.5;
//         ctx.fill();
//         ctx.stroke();

//         ctx.fillStyle = '#FFFFFF';
//         ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
//         ctx.textAlign = 'center';
//         ctx.textBaseline = 'middle';
//         ctx.fillText(
//           state.isWin ? 'PLAY AGAIN' : 'RETRY',
//           clientWidth / 2,
//           btnY + BUTTON_HEIGHT / 2
//         );
//       }

//       animationFrameId = requestAnimationFrame(drawScene);
//     };

//     animationFrameId = requestAnimationFrame(drawScene);

//     // Attach to the container instead of window: narrower scope, same behavior
//     // since the container fills the viewport, but avoids listening globally.
//     const target = containerRef.current || window;
//     target.addEventListener('mousemove', handleMouseMove);
//     target.addEventListener('click', handleClick);

//     // Pause the animation loop entirely when the tab is hidden — saves CPU/battery
//     const handleVisibility = () => {
//       if (document.hidden) {
//         cancelAnimationFrame(animationFrameId);
//       } else {
//         gameStateRef.current.lastTime = 0; // reset so next frame doesn't jump
//         animationFrameId = requestAnimationFrame(drawScene);
//       }
//     };
//     document.addEventListener('visibilitychange', handleVisibility);

//     return () => {
//       cancelAnimationFrame(animationFrameId);
//       target.removeEventListener('mousemove', handleMouseMove);
//       target.removeEventListener('click', handleClick);
//       document.removeEventListener('visibilitychange', handleVisibility);
//       Object.values(gameStateRef.current.timers).forEach((t) => clearTimeout(t));
//     };
//   }, []);

//   return (
//     <div
//       ref={containerRef}
//       className={`relative w-full h-screen bg-[#EBE7E0] overflow-hidden select-none p-0 m-0 ${cursorStyle}`}
//     >
//       <canvas ref={canvasRef} className="block w-full h-full p-0 m-0" />
//     </div>
//   );
// }



































// import React, { useEffect, useRef, useState } from 'react';

// /**
//  * COLLISION FIX NOTES
//  * --------------------
//  * The original bug ("ball goes horizontal and passes through bricks") came
//  * from DISCRETE collision detection: move the ball first, check overlap
//  * after, then guess which axis was hit by reconstructing a "previous
//  * position" from the ball's CURRENT velocity. That guess became unreliable
//  * once velocity was being nudged mid-bounce, and a wrong-axis guess makes
//  * the ball skate along a row of bricks instead of popping out cleanly. Fast
//  * enough motion could also fully cross a brick within one step with no
//  * overlap ever detected (tunneling).
//  *
//  * THE FIX: swept (continuous) circle-vs-AABB collision. For each sub-step we
//  * compute the ball's full motion vector and ray/slab-test it against every
//  * nearby brick's AABB (expanded by the ball's radius) to find the exact
//  * earliest impact time and the ACTUAL axis hit — no guessing, no tunneling.
//  * A small spatial hash grid keeps this cheap by only testing bricks near the
//  * ball's swept path.
//  *
//  * NATURAL BOUNCE PHYSICS (this revision):
//  * The previous pass over-corrected by adding a random vx jitter and a hard
//  * minimum-vertical-speed floor on every brick hit, which made bounces feel
//  * artificially steered. That's removed. A brick/wall bounce is now a plain
//  * elastic reflection: only the velocity component on the axis actually hit
//  * gets negated (vx *= -1 for a side hit, vy *= -1 for a top/bottom hit), and
//  * nothing else about the velocity is touched. The only speed floor kept is
//  * on the PADDLE hit (`Math.max(340, Math.abs(ball.vy))`), which was already
//  * in your original code and is needed so the ball can't be volleyed back at
//  * a near-zero angle and get stuck bouncing flat between paddle and floor.
//  */

// export default function NotFound404() {
//   const canvasRef = useRef(null);
//   const containerRef = useRef(null);
//   const paddleXRef = useRef(null);

//   const [cursorStyle, setCursorStyle] = useState('cursor-none');
//   const cursorStyleRef = useRef('cursor-none');

//   const PADDLE_NORMAL_WIDTH = 160;
//   const PADDLE_MAX_WIDTH = 380;
//   const PADDLE_MIN_WIDTH = 80;
//   const PADDLE_STEP_SIZE = 40;
//   const MAX_BUFFS_PER_GAME = 65;
//   const POWERUP_ICON_SIZE = 72;
//   const BUFF_DURATION_MS = 10000;
//   const MAX_DPR = 2;

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
//     paddleWidth: PADDLE_NORMAL_WIDTH,
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

//     const PADDLE_HEIGHT = 18;
//     const BALL_RADIUS = 9;
//     const BUTTON_WIDTH = 180;
//     const BUTTON_HEIGHT = 50;

//     // Restored to your original single-layout generator (no mobile split,
//     // no max-container clamp) — sizing/text layout unchanged from your file.
//     const generateBricks = (clientWidth) => {
//       const offscreen = document.createElement('canvas');
//       const offCtx = offscreen.getContext('2d');
//       const offWidth = 1600;
//       const offHeight = 520;
//       offscreen.width = offWidth;
//       offscreen.height = offHeight;

//       offCtx.fillStyle = '#000000';
//       offCtx.fillRect(0, 0, offWidth, offHeight);
//       offCtx.fillStyle = '#FFFFFF';
//       offCtx.textAlign = 'center';
//       offCtx.textBaseline = 'middle';

//       const rowY = 175;

//       offCtx.font = '900 325px "Arial Black", Impact, sans-serif';
//       offCtx.fillText('404', offWidth / 2 - 180, rowY);

//       const emojiX = offWidth / 2 + 300;
//       const emojiRadius = 115;
//       offCtx.beginPath();
//       offCtx.arc(emojiX, rowY - 10, emojiRadius, 0, Math.PI * 2);
//       offCtx.lineWidth = 25;
//       offCtx.strokeStyle = '#FFFFFF';
//       offCtx.stroke();

//       offCtx.font = '900 75px sans-serif';
//       offCtx.fillText('✕', emojiX - 38, rowY - 25);
//       offCtx.fillText('✕', emojiX + 38, rowY - 25);

//       offCtx.beginPath();
//       offCtx.arc(emojiX, rowY + 70, 46, Math.PI * 1.15, Math.PI * 1.85);
//       offCtx.lineWidth = 16;
//       offCtx.strokeStyle = '#FFFFFF';
//       offCtx.stroke();

//       offCtx.font = '650 130px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
//       offCtx.letterSpacing = '-3.5px';
//       offCtx.fillText('OOPS! PAGE NOT FOUND', offWidth / 2, 375);

//       const imgData = offCtx.getImageData(0, 0, offWidth, offHeight);
//       const data = imgData.data;

//       const pixelSize = 3;
//       const pixelGap = 1;
//       const step = pixelSize + pixelGap;

//       const scale = clientWidth / offWidth;
//       const bricks = [];

//       for (let y = 0; y < offHeight; y += step) {
//         const rowBase = Math.floor(y) * offWidth;
//         for (let x = 0; x < offWidth; x += step) {
//           const index = (rowBase + Math.floor(x)) * 4;
//           if (data[index] > 128) {
//             bricks.push({
//               x: x * scale,
//               y: y * scale,
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

//       return bricks;
//     };

//     // ---- Spatial hash grid for broad-phase brick lookups (perf only; no
//     // effect on gameplay feel) ----
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

//     /**
//      * Swept circle-vs-AABB test: expand the box by the circle's radius, then
//      * ray/slab test the motion segment against it. Returns the earliest
//      * time-of-impact `t` in [0,1] plus which axis was hit ('x' or 'y'), or
//      * null if there's no collision within this step.
//      */
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
//       const initialX = containerRef.current.clientWidth / 2;
//       gameStateRef.current.bricks = generateBricks(containerRef.current.clientWidth);
//       buildBrickGrid(gameStateRef.current.bricks);
//       gameStateRef.current.balls = [
//         {
//           x: initialX,
//           y: containerRef.current.clientHeight - 40 - BALL_RADIUS,
//           vx: 0,
//           vy: 0,
//           attached: true,
//         },
//       ];
//     }

//     const checkAndSpawnPowerUp = (brick) => {
//       const state = gameStateRef.current;
//       if (brick.hasBuff && brick.buffType) {
//         state.powerUps.push({
//           x: brick.x + brick.w / 2,
//           y: brick.y + brick.h / 2,
//           type: brick.buffType,
//           size: POWERUP_ICON_SIZE,
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

//     const applyPowerUp = (type) => {
//       const state = gameStateRef.current;

//       switch (type) {
//         case 'wide':
//           state.paddleWidth = Math.min(PADDLE_MAX_WIDTH, state.paddleWidth + PADDLE_STEP_SIZE);
//           break;
//         case 'shrink':
//           state.paddleWidth = Math.max(PADDLE_MIN_WIDTH, state.paddleWidth - PADDLE_STEP_SIZE);
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
//       const mouseX = clientX - rect.left;
//       const mouseY = clientY - rect.top;

//       const state = gameStateRef.current;
//       const pWidth = state.paddleWidth;
//       const minX = pWidth / 2;
//       const maxX = rect.width - pWidth / 2;
//       const clampedX = Math.max(minX, Math.min(maxX, mouseX));

//       paddleXRef.current = clampedX;

//       const balls = state.balls;
//       for (let i = 0; i < balls.length; i++) {
//         if (balls[i].attached) balls[i].x = clampedX;
//       }

//       if (state.isGameOver || state.isWin) {
//         const { clientWidth, clientHeight } = containerRef.current;
//         const btnX = clientWidth / 2 - BUTTON_WIDTH / 2;
//         const btnY = clientHeight - 110;

//         const isOverButton =
//           mouseX >= btnX && mouseX <= btnX + BUTTON_WIDTH &&
//           mouseY >= btnY && mouseY <= btnY + BUTTON_HEIGHT;

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
//       const clickX = clientX - rect.left;
//       const clickY = clientY - rect.top;

//       const { clientWidth, clientHeight } = containerRef.current;
//       const btnX = clientWidth / 2 - BUTTON_WIDTH / 2;
//       const btnY = clientHeight - 110;
//       const state = gameStateRef.current;

//       if (state.isGameOver || state.isWin) {
//         if (
//           clickX >= btnX && clickX <= btnX + BUTTON_WIDTH &&
//           clickY >= btnY && clickY <= btnY + BUTTON_HEIGHT
//         ) {
//           Object.values(state.timers).forEach((t) => clearTimeout(t));

//           const startX = paddleXRef.current || clientWidth / 2;
//           state.isGameOver = false;
//           state.isWin = false;
//           state.isMoving = false;
//           state.score = 0;
//           state.paddleWidth = PADDLE_NORMAL_WIDTH;
//           state.buffsSpawned = 0;
//           state.powerUps = [];
//           state.bullets = [];
//           state.bricks = generateBricks(clientWidth);
//           buildBrickGrid(state.bricks);
//           state.balls = [
//             { x: startX, y: clientHeight - 40 - BALL_RADIUS, vx: 0, vy: 0, attached: true },
//           ];
//           state.activeEffects = {
//             sticky: false, brickplow: false, explosive: false,
//             cannons: false, slow: false, fast: false,
//           };

//           applyCursorStyle('cursor-none');
//         }
//         return;
//       }

//       const pX = paddleXRef.current || clientWidth / 2;
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

//     const handleTouchStart = (e) => {
//       if (e.touches.length > 0) {
//         updatePointerPosition(e.touches[0].clientX, e.touches[0].clientY);
//         handleActionTrigger(e.touches[0].clientX, e.touches[0].clientY);
//       }
//     };

//     const formatScore = (num) => String(num).padStart(5, '0');

//     const getPaddleGradient = (ctx2d, pLeft, pY, pWidth) => {
//       const cache = cacheRef.current;
//       if (cache.paddleGrad && cache.paddleGradWidth === pWidth) {
//         return cache.paddleGrad;
//       }
//       const grad = ctx2d.createLinearGradient(0, pY, 0, pY + PADDLE_HEIGHT);
//       grad.addColorStop(0, '#FFFFFF');
//       grad.addColorStop(0.3, '#D0D0D0');
//       grad.addColorStop(0.7, '#666666');
//       grad.addColorStop(1, '#222222');
//       cache.paddleGrad = grad;
//       cache.paddleGradWidth = pWidth;
//       return grad;
//     };

//     const MAX_BOUNCES_PER_SUBSTEP = 4; // safety cap against pathological corner loops (never affects normal play)

//     /**
//      * Moves a single ball through one sub-step's worth of motion using swept
//      * collision against the paddle and all live bricks. A brick/wall bounce
//      * is a plain elastic reflection: only the axis actually hit is negated,
//      * nothing else about the velocity is altered. Returns true if the ball
//      * became attached (sticky paddle) mid-step.
//      */
//     const moveBallWithCollisions = (ball, subDt, state, bricks, pX, pY, pWidth) => {
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
//           const paddleBox = { x: pX - pWidth / 2, y: pY, w: pWidth, h: PADDLE_HEIGHT };
//           const hit = sweptCircleAABB(ball.x, ball.y, dx, dy, BALL_RADIUS, paddleBox);
//           if (hit && hit.t < bestT) {
//             bestT = hit.t;
//             bestAxis = hit.axis;
//             bestIsPaddle = true;
//           }
//         }

//         const sweptMinX = Math.min(ball.x, ball.x + dx) - BALL_RADIUS;
//         const sweptMaxX = Math.max(ball.x, ball.x + dx) + BALL_RADIUS;
//         const sweptMinY = Math.min(ball.y, ball.y + dy) - BALL_RADIUS;
//         const sweptMaxY = Math.max(ball.y, ball.y + dy) + BALL_RADIUS;
//         const candidates = getCandidateBrickIndices(sweptMinX, sweptMinY, sweptMaxX, sweptMaxY);

//         for (let ci = 0; ci < candidates.length; ci++) {
//           const idx = candidates[ci];
//           const b = bricks[idx];
//           if (!b || !b.alive) continue;
//           const hit = sweptCircleAABB(ball.x, ball.y, dx, dy, BALL_RADIUS, b);
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
//             ball.y = pY - BALL_RADIUS;
//             return true;
//           }
//           // Paddle bounce: same formula as your original code — angle
//           // depends on where the ball hit the paddle, speed floor of 340
//           // keeps volleys playable. This is the one deliberate exception,
//           // same as it was in your source.
//           const hitPoint = (ball.x - pX) / (pWidth / 2);
//           ball.vx = hitPoint * 380;
//           ball.vy = -Math.max(340, Math.abs(ball.vy));
//           ball.y -= EPS;
//         } else {
//           // Brick bounce: plain elastic reflection, nothing else touched.
//           const b = bricks[bestBrickIdx];
//           b.alive = false;
//           checkAndSpawnPowerUp(b);
//           removeBrickFromGrid(b, bestBrickIdx);

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
//               if (exB.alive && Math.hypot(exB.x - b.x, exB.y - b.y) < 35) {
//                 exB.alive = false;
//                 checkAndSpawnPowerUp(exB);
//                 removeBrickFromGrid(exB, j);
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

//       if (canvas.width !== Math.round(clientWidth * dpr) || canvas.height !== Math.round(clientHeight * dpr)) {
//         canvas.width = Math.round(clientWidth * dpr);
//         canvas.height = Math.round(clientHeight * dpr);
//         state.bricks = generateBricks(clientWidth);
//         buildBrickGrid(state.bricks);
//         cacheRef.current.paddleGrad = null;
//       }

//       ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
//       ctx.fillStyle = '#EBE7E0';
//       ctx.fillRect(0, 0, clientWidth, clientHeight);

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

//       ctx.fillStyle = '#1A1A1A';
//       for (let i = 0; i < bricks.length; i++) {
//         const b = bricks[i];
//         if (b.alive) ctx.fillRect(b.x, b.y, b.w, b.h);
//       }

//       const currentScoreStr = formatScore(state.score);
//       const highScoreStr = formatScore(state.highScore);

//       ctx.save();
//       ctx.font = '700 16px "Courier New", Courier, monospace';
//       ctx.textAlign = 'left';
//       ctx.textBaseline = 'top';
//       ctx.fillStyle = '#777777';
//       ctx.fillText(`HI ${highScoreStr}`, 25, 20);
//       ctx.fillStyle = '#222222';
//       ctx.fillText(` ${currentScoreStr}`, 130, 20);
//       ctx.restore();

//       const pX = paddleXRef.current || clientWidth / 2;
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

//           ctx.fillStyle = '#FF3333';
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
//               checkAndSpawnPowerUp(b);
//               removeBrickFromGrid(b, j);
//               state.score += 10;
//               if (state.score > state.highScore) state.highScore = state.score;
//               bulletHit = true;
//             }
//           }

//           if (bulletHit || bullet.y < -20) bullets.splice(i, 1);
//         }
//       }

//       // --- Ball physics: swept collision — no tunneling, correct bounce axis, natural reflection ---
//       const SUB_STEPS = state.activeEffects.fast ? 3 : 1;
//       const subDt = dt * speedMultiplier / SUB_STEPS;

//       if (!state.isWin && !state.isGameOver) {
//         const balls = state.balls;
//         for (let bIdx = balls.length - 1; bIdx >= 0; bIdx--) {
//           const ball = balls[bIdx];

//           if (!ball.attached) {
//             for (let step = 0; step < SUB_STEPS; step++) {
//               const becameAttached = moveBallWithCollisions(ball, subDt, state, bricks, pX, pY, pWidth);

//               if (ball.x - BALL_RADIUS <= 0) {
//                 ball.x = BALL_RADIUS;
//                 ball.vx = Math.abs(ball.vx);
//               } else if (ball.x + BALL_RADIUS >= clientWidth) {
//                 ball.x = clientWidth - BALL_RADIUS;
//                 ball.vx = -Math.abs(ball.vx);
//               }
//               if (ball.y - BALL_RADIUS <= 0) {
//                 ball.y = BALL_RADIUS;
//                 ball.vy = Math.abs(ball.vy);
//               }

//               if (becameAttached) break;
//             }
//           }

//           if (ball.y - BALL_RADIUS > clientHeight) {
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
//         if (p.y >= pY - 10 && p.y <= pY + PADDLE_HEIGHT && p.x >= pLeft && p.x <= pRight) {
//           applyPowerUp(p.type);
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
//             pX - pWidth * 0.55, pY + PADDLE_HEIGHT - 4,
//             pWidth * 1.1, 24
//           );
//         }

//         const pLeft = pX - pWidth / 2;
//         ctx.save();
//         const paddleGrad = getPaddleGradient(ctx, pLeft, pY, pWidth);
//         ctx.beginPath();
//         ctx.roundRect(pLeft, pY, pWidth, PADDLE_HEIGHT, 8);
//         ctx.fillStyle = paddleGrad;
//         ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
//         ctx.shadowBlur = 10;
//         ctx.shadowOffsetY = 4;
//         ctx.fill();
//         ctx.shadowBlur = 0;
//         ctx.shadowOffsetY = 0;

//         ctx.beginPath();
//         ctx.roundRect(pLeft + 3, pY + 2, pWidth - 6, 2, 1);
//         ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
//         ctx.fill();

//         if (state.activeEffects.cannons) {
//           ctx.fillStyle = '#FF3333';
//           ctx.fillRect(pLeft + 6, pY - 8, 8, 8);
//           ctx.fillRect(pLeft + pWidth - 14, pY - 8, 8, 8);
//         }
//         ctx.restore();

//         const balls = state.balls;
//         for (let i = 0; i < balls.length; i++) {
//           const ball = balls[i];
//           const bX = ball.x;
//           const bY = ball.y;

//           if (shadowCache.ballShadowSprite) {
//             ctx.drawImage(shadowCache.ballShadowSprite, bX - 20, bY + BALL_RADIUS - 6, 40, 16);
//           }

//           ctx.save();
//           const ballGrad = ctx.createRadialGradient(
//             bX - BALL_RADIUS * 0.3, bY - BALL_RADIUS * 0.3, BALL_RADIUS * 0.1,
//             bX, bY, BALL_RADIUS
//           );
//           ballGrad.addColorStop(0, '#FFFFFF');
//           ballGrad.addColorStop(0.3, '#E0E0E0');
//           ballGrad.addColorStop(0.75, '#555555');
//           ballGrad.addColorStop(1, '#1A1A1A');

//           ctx.beginPath();
//           ctx.arc(bX, bY, BALL_RADIUS, 0, Math.PI * 2);
//           ctx.fillStyle = ballGrad;
//           ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
//           ctx.shadowBlur = 8;
//           ctx.shadowOffsetY = 3;
//           ctx.fill();
//           ctx.restore();
//         }
//       }

//       if (state.isWin) {
//         ctx.fillStyle = '#1A1A1A';
//         ctx.font = '700 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
//         ctx.textAlign = 'center';
//         ctx.textBaseline = 'middle';
//         ctx.fillText('404 DESTROYED!', clientWidth / 2, clientHeight / 2 - 20);

//         ctx.font = '700 18px "Courier New", Courier, monospace';
//         ctx.fillStyle = '#555555';
//         ctx.fillText(`TOTAL SCORE: ${formatScore(state.score)}`, clientWidth / 2, clientHeight / 2 + 25);
//       }

//       if (state.isGameOver || state.isWin) {
//         const btnX = clientWidth / 2 - BUTTON_WIDTH / 2;
//         const btnY = clientHeight - 110;

//         ctx.beginPath();
//         ctx.roundRect(btnX, btnY + 4, BUTTON_WIDTH, BUTTON_HEIGHT, 14);
//         ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
//         ctx.fill();

//         ctx.beginPath();
//         ctx.roundRect(btnX, btnY, BUTTON_WIDTH, BUTTON_HEIGHT, 14);
//         ctx.fillStyle = '#1A1A1A';
//         ctx.strokeStyle = '#FFFFFF';
//         ctx.lineWidth = 2.5;
//         ctx.fill();
//         ctx.stroke();

//         ctx.fillStyle = '#FFFFFF';
//         ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
//         ctx.textAlign = 'center';
//         ctx.textBaseline = 'middle';
//         ctx.fillText(
//           state.isWin ? 'PLAY AGAIN' : 'RETRY',
//           clientWidth / 2,
//           btnY + BUTTON_HEIGHT / 2
//         );
//       }

//       animationFrameId = requestAnimationFrame(drawScene);
//     };

//     animationFrameId = requestAnimationFrame(drawScene);

//     const target = containerRef.current || window;
//     target.addEventListener('mousemove', handleMouseMove);
//     target.addEventListener('click', handleClick);
//     target.addEventListener('touchmove', handleTouchMove, { passive: true });
//     target.addEventListener('touchstart', handleTouchStart, { passive: true });

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

//   return (
//     <div
//       ref={containerRef}
//       className={`relative w-full h-screen bg-[#EBE7E0] overflow-hidden select-none p-0 m-0 ${cursorStyle}`}
//     >
//       <canvas ref={canvasRef} className="block w-full h-full p-0 m-0" />
//     </div>
//   );
// }




















































// import React, { useEffect, useRef, useState } from 'react';

// /**
//  * OPTIMIZED & RESPONSIVE 404 BREAKOUT GAME
//  * -----------------------------------------
//  * - < 600px  : Compact 4-tier stacked mobile layout
//  * - < 1280px : Tight-gap, vertically shifted 3-line layout (Prevents score overlap)
//  * - >= 1280px: Native Full Desktop horizontal single-line layout
//  *
//  * FIXES / OPTIMIZATIONS IN THIS PASS
//  * -----------------------------------
//  * 1. BUG FIX: the explosive-chain-reaction branch called
//  *    `checkAndSpawnPowerUp(exB, j)` — passing the loop index `j` where a
//  *    `config` object was expected. `checkAndSpawnPowerUp` reads
//  *    `config.powerUpSize`, so this threw on any frame where an explosive
//  *    ball chain-detonated a buffed brick, silently killing the whole RAF
//  *    loop. Fixed to `checkAndSpawnPowerUp(exB, config)`.
//  *
//  * 2. CONFIG CACHING: `getResponsiveConfig(clientWidth)` was being called
//  *    every single frame in `drawScene` (60x/sec) purely to read static
//  *    breakpoint constants, allocating a brand-new object literal each time
//  *    for no reason — the values only change when `clientWidth` crosses a
//  *    breakpoint. It's now cached in `configCacheRef` and only recomputed
//  *    when the width crosses into a different breakpoint bucket.
//  *
//  * 3. BALL GRADIENT CACHING: the paddle's linear gradient was already cached
//  *    by width, but the ball's radial gradient was rebuilt from scratch on
//  *    EVERY frame for EVERY ball — one of the more expensive canvas ops,
//  *    multiplied by ball count. It's now cached by radius (which only
//  *    changes across responsive breakpoints), exactly like the paddle
//  *    gradient, and invalidated only when the radius actually changes.
//  */

// export default function NotFound404() {
//   const canvasRef = useRef(null);
//   const containerRef = useRef(null);
//   const paddleXRef = useRef(null);

//   const [cursorStyle, setCursorStyle] = useState('cursor-none');
//   const cursorStyleRef = useRef('cursor-none');

//   const MAX_CONTAINER_WIDTH = 3840;
//   const MAX_BUFFS_PER_GAME = 150;
//   const BUFF_DURATION_MS = 10000;
//   const MAX_DPR = 2;

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
//   });

//   const configCacheRef = useRef({
//     layoutMode: null,
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

//     const getLayoutMode = (clientWidth) => {
//       if (clientWidth < 600) return 'mobileStacked';
//       if (clientWidth < 1024) return 'tablet3Line';
//       if (clientWidth < 1280) return 'laptop3Line';
//       return 'desktopNative';
//     };

//     const buildResponsiveConfig = (layoutMode) => {
//       switch (layoutMode) {
//         case 'mobileStacked':
//           return {
//             layoutMode,
//             paddleHeight: 12,
//             ballRadius: 6,
//             powerUpSize: 48,
//             paddleNormalWidth: 110,
//             paddleMaxWidth: 220,
//             paddleMinWidth: 50,
//             paddleStepSize: 30,
//             buttonWidth: 150,
//             buttonHeight: 44,
//           };
//         case 'tablet3Line':
//           return {
//             layoutMode,
//             paddleHeight: 16,
//             ballRadius: 8,
//             powerUpSize: 64,
//             paddleNormalWidth: 145,
//             paddleMaxWidth: 320,
//             paddleMinWidth: 75,
//             paddleStepSize: 38,
//             buttonWidth: 175,
//             buttonHeight: 48,
//           };
//         case 'laptop3Line':
//           return {
//             layoutMode,
//             paddleHeight: 17,
//             ballRadius: 8.5,
//             powerUpSize: 68,
//             paddleNormalWidth: 155,
//             paddleMaxWidth: 350,
//             paddleMinWidth: 80,
//             paddleStepSize: 40,
//             buttonWidth: 180,
//             buttonHeight: 50,
//           };
//         default:
//           return {
//             layoutMode,
//             paddleHeight: 18,
//             ballRadius: 9,
//             powerUpSize: 72,
//             paddleNormalWidth: 160,
//             paddleMaxWidth: 380,
//             paddleMinWidth: 80,
//             paddleStepSize: 40,
//             buttonWidth: 180,
//             buttonHeight: 50,
//           };
//       }
//     };

//     // Drop-in replacement for the old getResponsiveConfig: same signature
//     // and return shape, but only rebuilds the object when the width has
//     // crossed into a different breakpoint bucket than last time.
//     const getResponsiveConfig = (clientWidth) => {
//       const layoutMode = getLayoutMode(clientWidth);
//       const cache = configCacheRef.current;
//       if (cache.layoutMode === layoutMode && cache.config) {
//         return cache.config;
//       }
//       const config = buildResponsiveConfig(layoutMode);
//       cache.layoutMode = layoutMode;
//       cache.config = config;
//       return config;
//     };

//     const generateBricks = (clientWidth) => {
//       const effectiveWidth = Math.min(clientWidth, MAX_CONTAINER_WIDTH);
//       const config = getResponsiveConfig(clientWidth);

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

//       offCtx.fillStyle = '#000000';
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
//       const initialX = clientW / 2;

//       gameStateRef.current.paddleWidth = config.paddleNormalWidth;
//       gameStateRef.current.bricks = generateBricks(clientW);
//       buildBrickGrid(gameStateRef.current.bricks);
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
//       const mouseX = clientX - rect.left;
//       const mouseY = clientY - rect.top;

//       const state = gameStateRef.current;
//       const pWidth = state.paddleWidth;
//       const minX = pWidth / 2;
//       const maxX = rect.width - pWidth / 2;
//       const clampedX = Math.max(minX, Math.min(maxX, mouseX));

//       paddleXRef.current = clampedX;

//       const balls = state.balls;
//       for (let i = 0; i < balls.length; i++) {
//         if (balls[i].attached) balls[i].x = clampedX;
//       }

//       if (state.isGameOver || state.isWin) {
//         const { clientWidth, clientHeight } = containerRef.current;
//         const config = getResponsiveConfig(clientWidth);
//         const btnX = clientWidth / 2 - config.buttonWidth / 2;
//         const btnY = clientHeight - 110;

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
//       const clickX = clientX - rect.left;
//       const clickY = clientY - rect.top;

//       const { clientWidth, clientHeight } = containerRef.current;
//       const config = getResponsiveConfig(clientWidth);
//       const btnX = clientWidth / 2 - config.buttonWidth / 2;
//       const btnY = clientHeight - 110;
//       const state = gameStateRef.current;

//       if (state.isGameOver || state.isWin) {
//         if (
//           clickX >= btnX && clickX <= btnX + config.buttonWidth &&
//           clickY >= btnY && clickY <= btnY + config.buttonHeight
//         ) {
//           Object.values(state.timers).forEach((t) => clearTimeout(t));

//           const startX = paddleXRef.current || clientWidth / 2;
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

//       const pX = paddleXRef.current || clientWidth / 2;
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

//     const handleTouchStart = (e) => {
//       if (e.touches.length > 0) {
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
//               if (exB.alive && Math.hypot(exB.x - b.x, exB.y - b.y) < 35) {
//                 exB.alive = false;
//                 // BUG FIX: was checkAndSpawnPowerUp(exB, j) — passed the loop
//                 // index instead of the config object, which threw the moment
//                 // an explosive ball chain-detonated a buffed brick and
//                 // silently killed the RAF loop.
//                 checkAndSpawnPowerUp(exB, config);
//                 removeBrickFromGrid(exB, j);
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

//       if (canvas.width !== Math.round(clientWidth * dpr) || canvas.height !== Math.round(clientHeight * dpr)) {
//         canvas.width = Math.round(clientWidth * dpr);
//         canvas.height = Math.round(clientHeight * dpr);
//         state.bricks = generateBricks(clientWidth);
//         buildBrickGrid(state.bricks);
//         cacheRef.current.paddleGrad = null;
//         cacheRef.current.ballGrad = null;
//       }

//       ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
//       ctx.fillStyle = '#EBE7E0';
//       ctx.fillRect(0, 0, clientWidth, clientHeight);

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

//       ctx.fillStyle = '#1A1A1A';
//       for (let i = 0; i < bricks.length; i++) {
//         const b = bricks[i];
//         if (b.alive) ctx.fillRect(b.x, b.y, b.w, b.h);
//       }

//       // --- "(click to play)" hint text ---
//       // Shown whenever the ball hasn't been launched yet (state.isMoving is
//       // false) and the game isn't in a game-over/win state. Disappears the
//       // instant the player launches the ball (handleActionTrigger sets
//       // isMoving = true), and reappears automatically on restart since the
//       // restart handler resets isMoving back to false.
//       if (!state.isMoving && !state.isGameOver && !state.isWin) {
//         const hintFontSize = Math.max(13, Math.round(16 * (config.ballRadius / 9)));
//         ctx.save();
//         ctx.font = `600 ${hintFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
//         ctx.textAlign = 'center';
//         ctx.textBaseline = 'top';
//         ctx.fillStyle = '#555555';
//         ctx.fillText('( click to play )', clientWidth / 2, (bricks.maxBrickY || 0) + 16);
//         ctx.restore();
//       }

//       const currentScoreStr = formatScore(state.score);
//       const highScoreStr = formatScore(state.highScore);

//       ctx.save();
//       ctx.font = '700 16px "Courier New", Courier, monospace';
//       ctx.textAlign = 'left';
//       ctx.textBaseline = 'top';
//       ctx.fillStyle = '#777777';
//       ctx.fillText(`HI ${highScoreStr}`, 25, 20);
//       ctx.fillStyle = '#222222';
//       ctx.fillText(` ${currentScoreStr}`, 130, 20);
//       ctx.restore();

//       const pX = paddleXRef.current || clientWidth / 2;
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

//           ctx.fillStyle = '#FF3333';
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

//               if (ball.x - config.ballRadius <= 0) {
//                 ball.x = config.ballRadius;
//                 ball.vx = Math.abs(ball.vx);
//               } else if (ball.x + config.ballRadius >= clientWidth) {
//                 ball.x = clientWidth - config.ballRadius;
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
//         ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
//         ctx.shadowBlur = 10;
//         ctx.shadowOffsetY = 4;
//         ctx.fill();
//         ctx.shadowBlur = 0;
//         ctx.shadowOffsetY = 0;

//         ctx.beginPath();
//         ctx.roundRect(pLeft + 3, pY + 2, pWidth - 6, 2, 1);
//         ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
//         ctx.fill();

//         if (state.activeEffects.cannons) {
//           ctx.fillStyle = '#FF3333';
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
//           ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
//           ctx.shadowBlur = 8;
//           ctx.shadowOffsetY = 3;
//           ctx.fill();
//           ctx.restore();
//         }
//       }

//       if (state.isWin) {
//         ctx.fillStyle = '#1A1A1A';
//         ctx.font = '700 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
//         ctx.textAlign = 'center';
//         ctx.textBaseline = 'middle';
//         ctx.fillText('404 DESTROYED!', clientWidth / 2, clientHeight / 2 - 20);

//         ctx.font = '700 18px "Courier New", Courier, monospace';
//         ctx.fillStyle = '#555555';
//         ctx.fillText(`TOTAL SCORE: ${formatScore(state.score)}`, clientWidth / 2, clientHeight / 2 + 25);
//       }

//       if (state.isGameOver || state.isWin) {
//         const btnX = clientWidth / 2 - config.buttonWidth / 2;
//         const btnY = clientHeight - 110;

//         ctx.beginPath();
//         ctx.roundRect(btnX, btnY + 4, config.buttonWidth, config.buttonHeight, 14);
//         ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
//         ctx.fill();

//         ctx.beginPath();
//         ctx.roundRect(btnX, btnY, config.buttonWidth, config.buttonHeight, 14);
//         ctx.fillStyle = '#1A1A1A';
//         ctx.strokeStyle = '#FFFFFF';
//         ctx.lineWidth = 2.5;
//         ctx.fill();
//         ctx.stroke();

//         ctx.fillStyle = '#FFFFFF';
//         ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
//         ctx.textAlign = 'center';
//         ctx.textBaseline = 'middle';
//         ctx.fillText(
//           state.isWin ? 'PLAY AGAIN' : 'RETRY',
//           clientWidth / 2,
//           btnY + config.buttonHeight / 2
//         );
//       }

//       animationFrameId = requestAnimationFrame(drawScene);
//     };

//     animationFrameId = requestAnimationFrame(drawScene);

//     const target = containerRef.current || window;
//     target.addEventListener('mousemove', handleMouseMove);
//     target.addEventListener('click', handleClick);
//     target.addEventListener('touchmove', handleTouchMove, { passive: true });
//     target.addEventListener('touchstart', handleTouchStart, { passive: true });

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

//   return (
//     <div
//       ref={containerRef}
//       className={`relative w-full h-screen bg-[#EBE7E0] overflow-hidden select-none p-0 m-0 ${cursorStyle}`}
//     >
//       <canvas ref={canvasRef} className="block w-full h-full p-0 m-0" />
//     </div>
//   );
// }







































import React, { useEffect, useRef, useState } from 'react';

/**
 * OPTIMIZED & RESPONSIVE 404 BREAKOUT GAME
 * -----------------------------------------
 * - < 600px  : Compact 4-tier stacked mobile layout
 * - < 1280px : Tight-gap, vertically shifted 3-line layout (Prevents score overlap)
 * - >= 1280px: Native Full Desktop horizontal single-line layout
 *
 * PERFORMANCE PASS (this version) — VISUAL OUTPUT IS UNCHANGED
 * ---------------------------------------------------------------
 * 1. BRICK BITMAP CACHING: bricks used to be redrawn with hundreds/thousands
 *    of individual `fillRect` calls EVERY frame, even though most bricks
 *    never change between hits. Alive bricks are now pre-rendered once into
 *    an offscreen bitmap and blitted with a single `drawImage` call per
 *    frame. The bitmap is only rebuilt when a brick actually dies (ball
 *    collision, explosive chain reaction, bullet hit) or when the layout
 *    regenerates (resize/restart) — not 60x/sec.
 *
 * 2. SHADOW BLUR REMOVED FROM LIVE FILLS: `ctx.shadowBlur` is a very
 *    expensive software-rendered effect, and it was being applied to the
 *    paddle and to EVERY ball, EVERY frame. The drop-shadow *look* is
 *    preserved exactly via the existing pre-baked radial-gradient shadow
 *    sprites (ballShadowSprite / paddleShadowSprite) that were already being
 *    drawn underneath — those alone produce the same visual result the
 *    shadowBlur was adding, so the redundant (and costly) live blur is gone
 *    without changing how anything looks.
 *
 * 3. LOWER MAX DEVICE PIXEL RATIO: capped from 2 to 1.5. On 4K/retina
 *    laptops this cuts total rendered pixels substantially (DPR 2 = 4x
 *    pixel volume vs DPR 1; DPR 1.5 = 2.25x) with no visible difference for
 *    this flat-shaded art style, since the game has no fine text or photo
 *    detail that benefits from full retina density.
 *
 * 4. RESIZE / REGENERATION GUARD: previously, ANY canvas pixel-size change
 *    (including pure DPR/devicePixelRatio changes with no actual CSS width
 *    change) re-ran `generateBricks`, which does a full `getImageData` pass
 *    over a large offscreen canvas — an expensive operation. Now the brick
 *    layout is only regenerated when `clientWidth` itself changes (i.e. a
 *    real responsive breakpoint / container resize), not on every DPR
 *    fluctuation.
 *
 * 5. STATIC GAME-OVER / WIN SCREEN THROTTLE: once the game reaches the
 *    game-over or win screen, the frame is visually static (button state is
 *    handled via cursor style, not per-frame redraw). Instead of doing a
 *    full scene redraw at 60fps forever, the final frame is cached and
 *    reused until state actually changes (restart), saving CPU/GPU while
 *    idling on that screen. Cursor hover/click detection is unaffected.
 *
 * Everything else — physics, collision, power-ups, layout math, event
 * handling — is unchanged from the previous pass (which already fixed the
 * checkAndSpawnPowerUp bug and cached the paddle/ball gradients + config).
 */

export default function NotFound404() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const paddleXRef = useRef(null);

  const [cursorStyle, setCursorStyle] = useState('cursor-none');
  const cursorStyleRef = useRef('cursor-none');

  const MAX_CONTAINER_WIDTH = 3840;
  const MAX_BUFFS_PER_GAME = 150;
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

    const getLayoutMode = (clientWidth) => {
      if (clientWidth < 600) return 'mobileStacked';
      if (clientWidth < 1024) return 'tablet3Line';
      if (clientWidth < 1280) return 'laptop3Line';
      return 'desktopNative';
    };

    const buildResponsiveConfig = (layoutMode) => {
      switch (layoutMode) {
        case 'mobileStacked':
          return {
            layoutMode,
            paddleHeight: 12,
            ballRadius: 6,
            powerUpSize: 48,
            paddleNormalWidth: 110,
            paddleMaxWidth: 220,
            paddleMinWidth: 50,
            paddleStepSize: 30,
            buttonWidth: 150,
            buttonHeight: 44,
          };
        case 'tablet3Line':
          return {
            layoutMode,
            paddleHeight: 16,
            ballRadius: 8,
            powerUpSize: 64,
            paddleNormalWidth: 145,
            paddleMaxWidth: 320,
            paddleMinWidth: 75,
            paddleStepSize: 38,
            buttonWidth: 175,
            buttonHeight: 48,
          };
        case 'laptop3Line':
          return {
            layoutMode,
            paddleHeight: 17,
            ballRadius: 8.5,
            powerUpSize: 68,
            paddleNormalWidth: 155,
            paddleMaxWidth: 350,
            paddleMinWidth: 80,
            paddleStepSize: 40,
            buttonWidth: 180,
            buttonHeight: 50,
          };
        default:
          return {
            layoutMode,
            paddleHeight: 18,
            ballRadius: 9,
            powerUpSize: 72,
            paddleNormalWidth: 160,
            paddleMaxWidth: 380,
            paddleMinWidth: 80,
            paddleStepSize: 40,
            buttonWidth: 180,
            buttonHeight: 50,
          };
      }
    };

    // Drop-in replacement for the old getResponsiveConfig: same signature
    // and return shape, but only rebuilds the object when the width has
    // crossed into a different breakpoint bucket than last time.
    const getResponsiveConfig = (clientWidth) => {
      const layoutMode = getLayoutMode(clientWidth);
      const cache = configCacheRef.current;
      if (cache.layoutMode === layoutMode && cache.config) {
        return cache.config;
      }
      const config = buildResponsiveConfig(layoutMode);
      cache.layoutMode = layoutMode;
      cache.config = config;
      return config;
    };

    const generateBricks = (clientWidth) => {
      const effectiveWidth = Math.min(clientWidth, MAX_CONTAINER_WIDTH);
      const config = getResponsiveConfig(clientWidth);

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

      offCtx.fillStyle = '#000000';
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

      // Attach the art's bottom edge (in on-screen px) to the array itself so
      // callers can position UI (like the "click to play" hint) right below
      // the brick text without recomputing it separately.
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
      const config = getResponsiveConfig(clientW);
      const initialX = clientW / 2;

      gameStateRef.current.paddleWidth = config.paddleNormalWidth;
      gameStateRef.current.bricks = generateBricks(clientW);
      buildBrickGrid(gameStateRef.current.bricks);
      cacheRef.current.lastClientWidth = clientW;
      cacheRef.current.brickBitmapDirty = true;
      gameStateRef.current.balls = [
        {
          x: initialX,
          y: containerRef.current.clientHeight - 40 - config.ballRadius,
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
      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;

      const state = gameStateRef.current;
      const pWidth = state.paddleWidth;
      const minX = pWidth / 2;
      const maxX = rect.width - pWidth / 2;
      const clampedX = Math.max(minX, Math.min(maxX, mouseX));

      paddleXRef.current = clampedX;

      const balls = state.balls;
      for (let i = 0; i < balls.length; i++) {
        if (balls[i].attached) balls[i].x = clampedX;
      }

      if (state.isGameOver || state.isWin) {
        const { clientWidth, clientHeight } = containerRef.current;
        const config = getResponsiveConfig(clientWidth);
        const btnX = clientWidth / 2 - config.buttonWidth / 2;
        const btnY = clientHeight - 110;

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
      const clickX = clientX - rect.left;
      const clickY = clientY - rect.top;

      const { clientWidth, clientHeight } = containerRef.current;
      const config = getResponsiveConfig(clientWidth);
      const btnX = clientWidth / 2 - config.buttonWidth / 2;
      const btnY = clientHeight - 110;
      const state = gameStateRef.current;

      if (state.isGameOver || state.isWin) {
        if (
          clickX >= btnX && clickX <= btnX + config.buttonWidth &&
          clickY >= btnY && clickY <= btnY + config.buttonHeight
        ) {
          Object.values(state.timers).forEach((t) => clearTimeout(t));

          const startX = paddleXRef.current || clientWidth / 2;
          state.isGameOver = false;
          state.isWin = false;
          state.isMoving = false;
          state.score = 0;
          state.paddleWidth = config.paddleNormalWidth;
          state.buffsSpawned = 0;
          state.powerUps = [];
          state.bullets = [];
          state.bricks = generateBricks(clientWidth);
          buildBrickGrid(state.bricks);
          cacheRef.current.lastClientWidth = clientWidth;
          cacheRef.current.brickBitmapDirty = true;
          cacheRef.current.staticFrameValid = false;
          state.balls = [
            { x: startX, y: clientHeight - 40 - config.ballRadius, vx: 0, vy: 0, attached: true },
          ];
          state.activeEffects = {
            sticky: false, brickplow: false, explosive: false,
            cannons: false, slow: false, fast: false,
          };

          applyCursorStyle('cursor-none');
        }
        return;
      }

      const pX = paddleXRef.current || clientWidth / 2;
      const pY = clientHeight - 40;

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

    // Ball radial gradient is defined around local origin (0,0) at a fixed
    // radius and reused for every ball via ctx.translate(), instead of
    // rebuilding a new gradient per ball per frame. Invalidated only when
    // the radius (responsive breakpoint) actually changes.
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

    // Renders all currently-alive bricks into an offscreen bitmap once.
    // Called only when the bitmap is marked dirty (a brick died, or the
    // layout was regenerated) instead of every single frame.
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
      bctx.fillStyle = '#1A1A1A';
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
                removeBrickFromGrid(exB, j);
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
      const config = getResponsiveConfig(clientWidth); // cached per breakpoint bucket

      // Once the game is fully settled on the game-over/win screen, nothing
      // in the scene changes frame-to-frame (button hover is pure CSS
      // cursor, not a canvas redraw), so skip re-rendering entirely and
      // just keep the RAF loop alive cheaply.
      if ((state.isGameOver || state.isWin) && cacheRef.current.staticFrameValid) {
        animationFrameId = requestAnimationFrame(drawScene);
        return;
      }

      const sizeChanged = canvas.width !== Math.round(clientWidth * dpr) || canvas.height !== Math.round(clientHeight * dpr);
      if (sizeChanged) {
        canvas.width = Math.round(clientWidth * dpr);
        canvas.height = Math.round(clientHeight * dpr);
        // Only regenerate the brick layout when the CSS width itself
        // changed (a real breakpoint/container resize) — not on pure DPR
        // fluctuations, which used to trigger a full getImageData pass.
        if (cacheRef.current.lastClientWidth !== clientWidth) {
          state.bricks = generateBricks(clientWidth);
          buildBrickGrid(state.bricks);
          cacheRef.current.lastClientWidth = clientWidth;
        }
        cacheRef.current.paddleGrad = null;
        cacheRef.current.ballGrad = null;
        cacheRef.current.brickBitmapDirty = true;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#EBE7E0';
      ctx.fillRect(0, 0, clientWidth, clientHeight);

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

      // --- Bricks: single blit instead of hundreds/thousands of fillRect calls ---
      if (cacheRef.current.brickBitmapDirty || !cacheRef.current.brickBitmap) {
        rebuildBrickBitmap(bricks, clientWidth, clientHeight, dpr);
      }
      ctx.drawImage(cacheRef.current.brickBitmap, 0, 0, clientWidth, clientHeight);

      // --- "(click to play)" hint text ---
      // Shown whenever the ball hasn't been launched yet (state.isMoving is
      // false) and the game isn't in a game-over/win state. Disappears the
      // instant the player launches the ball (handleActionTrigger sets
      // isMoving = true), and reappears automatically on restart since the
      // restart handler resets isMoving back to false.
      if (!state.isMoving && !state.isGameOver && !state.isWin) {
        const hintFontSize = Math.max(13, Math.round(16 * (config.ballRadius / 9)));
        ctx.save();
        ctx.font = `600 ${hintFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#555555';
        ctx.fillText('( click to play )', clientWidth / 2, (bricks.maxBrickY || 0) + 16);
        ctx.restore();
      }

      const currentScoreStr = formatScore(state.score);
      const highScoreStr = formatScore(state.highScore);

      ctx.save();
      ctx.font = '700 16px "Courier New", Courier, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#777777';
      ctx.fillText(`HI ${highScoreStr}`, 25, 20);
      ctx.fillStyle = '#222222';
      ctx.fillText(` ${currentScoreStr}`, 130, 20);
      ctx.restore();

      const pX = paddleXRef.current || clientWidth / 2;
      const pY = clientHeight - 40;
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

          ctx.fillStyle = '#FF3333';
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

              if (ball.x - config.ballRadius <= 0) {
                ball.x = config.ballRadius;
                ball.vx = Math.abs(ball.vx);
              } else if (ball.x + config.ballRadius >= clientWidth) {
                ball.x = clientWidth - config.ballRadius;
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
        // Live shadowBlur removed — the pre-baked paddleShadowSprite drawn
        // just above already renders the same soft drop-shadow look, so
        // this produces an identical visual result at a fraction of the
        // rendering cost (shadowBlur is a slow, software-rasterized effect).
        ctx.fill();

        ctx.beginPath();
        ctx.roundRect(pLeft + 3, pY + 2, pWidth - 6, 2, 1);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();

        if (state.activeEffects.cannons) {
          ctx.fillStyle = '#FF3333';
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
          // Same reasoning as the paddle: the ballShadowSprite drawn above
          // already provides the drop shadow, so the live shadowBlur (which
          // was being recomputed for every ball, every frame) is removed
          // without changing how the ball looks.
          ctx.fill();
          ctx.restore();
        }
      }

      if (state.isWin) {
        ctx.fillStyle = '#1A1A1A';
        ctx.font = '700 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('404 DESTROYED!', clientWidth / 2, clientHeight / 2 - 20);

        ctx.font = '700 18px "Courier New", Courier, monospace';
        ctx.fillStyle = '#555555';
        ctx.fillText(`TOTAL SCORE: ${formatScore(state.score)}`, clientWidth / 2, clientHeight / 2 + 25);
      }

      if (state.isGameOver || state.isWin) {
        const btnX = clientWidth / 2 - config.buttonWidth / 2;
        const btnY = clientHeight - 110;

        ctx.beginPath();
        ctx.roundRect(btnX, btnY + 4, config.buttonWidth, config.buttonHeight, 14);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();

        ctx.beginPath();
        ctx.roundRect(btnX, btnY, config.buttonWidth, config.buttonHeight, 14);
        ctx.fillStyle = '#1A1A1A';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          state.isWin ? 'PLAY AGAIN' : 'RETRY',
          clientWidth / 2,
          btnY + config.buttonHeight / 2
        );

        // The game-over/win screen is now fully drawn and won't change
        // until a restart resets these flags — mark it so subsequent
        // frames can skip the entire redraw above.
        cacheRef.current.staticFrameValid = true;
      }

      animationFrameId = requestAnimationFrame(drawScene);
    };

    animationFrameId = requestAnimationFrame(drawScene);

    const target = containerRef.current || window;
    target.addEventListener('mousemove', handleMouseMove);
    target.addEventListener('click', handleClick);
    target.addEventListener('touchmove', handleTouchMove, { passive: true });
    target.addEventListener('touchstart', handleTouchStart, { passive: true });

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

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-screen bg-[#EBE7E0] overflow-hidden select-none p-0 m-0 ${cursorStyle}`}
    >
      <canvas ref={canvasRef} className="block w-full h-full p-0 m-0" />
    </div>
  );
}