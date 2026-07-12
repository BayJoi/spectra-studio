// Rain on Glass — adapted from Radiant Shaders (MIT, Copyright (c) 2025 Paul Bakaus)
// https://github.com/pbakaus/radiant
interface RainOnGlassOptions {
  rainAmount?: number;
  refraction?: number;
  darkness?: number;
  interactive?: boolean;
}

export function initRainOnGlass(canvas: HTMLCanvasElement, opts?: RainOnGlassOptions): () => void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rainAmount = opts?.rainAmount ?? 1.0;
  const refractionStrength = opts?.refraction ?? 1.0;
  const darkness = opts?.darkness ?? 0.5;
  const interactive = opts?.interactive ?? false;

  let paused = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const onVisibilityChange = () => { paused = document.hidden; };
  document.addEventListener('visibilitychange', onVisibilityChange);

  // ── Helpers ──
  function rand(from?: number, to?: number, interp?: (n: number) => number): number {
    if (from == null) { from = 0; to = 1; }
    else if (to == null) { to = from; from = 0; }
    const delta = to - from;
    if (!interp) interp = (n) => n;
    return from + (interp(Math.random()) * delta);
  }

  function chance(c: number): boolean { return Math.random() <= c; }

  function createCanvas(w: number, h: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  // ── Drop textures ──
  const dropSize = 64;

  function generateDropAlpha(size: number): HTMLCanvasElement {
    const c = createCanvas(size, size);
    const ctx = c.getContext('2d')!;
    const imgData = ctx.createImageData(size, size);
    const d = imgData.data;
    const cx = size / 2, cy = size / 2;

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const dx = (px - cx) / cx;
        let dy = (py - cy) / cy;
        dy *= 1.0 + dy * 0.15;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1.0) continue;

        const alpha = Math.max(0, 1.0 - Math.pow(dist / 0.35, 6)) * 255;
        const idx = (py * size + px) * 4;
        d[idx] = d[idx + 1] = d[idx + 2] = 255;
        d[idx + 3] = Math.round(Math.min(255, Math.max(0, alpha)));
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return c;
  }

  function generateDropColor(size: number): HTMLCanvasElement {
    const c = createCanvas(size, size);
    const ctx = c.getContext('2d')!;
    const imgData = ctx.createImageData(size, size);
    const d = imgData.data;
    const cx = size / 2, cy = size / 2;

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const dx = (px - cx) / cx;
        let dy = (py - cy) / cy;
        dy *= 1.0 + dy * 0.15;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1.0) continue;

        const nx = dist > 0.001 ? dx / dist : 0;
        const ny = dist > 0.001 ? dy / dist : 0;
        const strength = dist;

        const r = Math.round(ny * 60 * strength + 128);
        const g = Math.round(nx * 60 * strength + 128);
        const depth = Math.sqrt(Math.max(0, 1.0 - dist * dist)) * 255;

        const idx = (py * size + px) * 4;
        d[idx] = Math.max(0, Math.min(255, r));
        d[idx + 1] = Math.max(0, Math.min(255, g));
        d[idx + 2] = Math.round(depth);
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return c;
  }

  const dropAlphaTex = generateDropAlpha(dropSize);
  const dropColorTex = generateDropColor(dropSize);

  // ── Procedural dark city background ──
  let bgSeed = 42;
  function srand() {
    bgSeed = (bgSeed * 16807 + 0) % 2147483647;
    return (bgSeed - 1) / 2147483646;
  }

  function generateCityBg(w: number, h: number, blurPx: number, dark: number): HTMLCanvasElement {
    const c = createCanvas(w, h);
    const ctx = c.getContext('2d')!;
    bgSeed = 42;

    const dk = Math.max(0, Math.min(1, dark));

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    const skyDark = (1 - dk) * 0.6 + dk * 1.0;
    sky.addColorStop(0, `rgb(${Math.round(12 * skyDark)},${Math.round(10 * skyDark)},${Math.round(26 * skyDark)})`);
    sky.addColorStop(0.15, `rgb(${Math.round(26 * skyDark)},${Math.round(18 * skyDark)},${Math.round(40 * skyDark)})`);
    sky.addColorStop(0.35, `rgb(${Math.round(42 * skyDark)},${Math.round(24 * skyDark)},${Math.round(48 * skyDark)})`);
    sky.addColorStop(0.55, `rgb(${Math.round(74 * skyDark)},${Math.round(37 * skyDark)},${Math.round(32 * skyDark)})`);
    sky.addColorStop(0.75, `rgb(${Math.round(106 * skyDark)},${Math.round(56 * skyDark)},${Math.round(24 * skyDark)})`);
    sky.addColorStop(1, `rgb(${Math.round(138 * skyDark)},${Math.round(74 * skyDark)},${Math.round(16 * skyDark)})`);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const glowMult = 1 - dk * 0.7;
    const glow = ctx.createLinearGradient(0, h * 0.3, 0, h);
    glow.addColorStop(0, 'rgba(200, 100, 30, 0)');
    glow.addColorStop(0.3, `rgba(200, 120, 40, ${0.15 * glowMult})`);
    glow.addColorStop(0.6, `rgba(210, 140, 50, ${0.3 * glowMult})`);
    glow.addColorStop(1, `rgba(220, 150, 60, ${0.5 * glowMult})`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    const bColors = ['#08060e', '#0a0812', '#0c0a16', '#0e0c1a'];
    for (let b = 0; b < 35; b++) {
      const bx = srand() * w * 1.3 - w * 0.15;
      const bw = w * 0.02 + srand() * w * 0.12;
      const bh = h * 0.15 + srand() * h * 0.55;
      const by = h - bh + srand() * h * 0.05;
      ctx.fillStyle = bColors[b % bColors.length];
      ctx.fillRect(bx, by, bw, bh);

      const wRows = Math.floor(bh / (h * 0.04));
      const wCols = Math.floor(bw / (w * 0.02));
      for (let wr = 0; wr < wRows; wr++) {
        for (let wc = 0; wc < wCols; wc++) {
          if (srand() > 0.45) {
            const wx = bx + w * 0.005 + wc * (w * 0.02);
            const wy = by + h * 0.01 + wr * (h * 0.04);
            const warmth = srand();
            const winMult = (1 - dk * 0.8);
            if (warmth > 0.3) {
              ctx.fillStyle = `rgba(255, 200, 120, ${(0.4 + srand() * 0.5) * winMult})`;
            } else if (warmth > 0.1) {
              ctx.fillStyle = `rgba(255, 160, 80, ${(0.3 + srand() * 0.4) * winMult})`;
            } else {
              ctx.fillStyle = `rgba(180, 220, 255, ${(0.2 + srand() * 0.3) * winMult})`;
            }
            ctx.fillRect(wx, wy, w * 0.008, h * 0.02);
          }
        }
      }
    }

    const bokehMult = (1 - dk * 0.8);
    for (let i = 0; i < 80; i++) {
      const bkx = srand() * w;
      const bky = h * 0.1 + srand() * h * 0.85;
      const bkr = w * 0.02 + srand() * w * 0.15;
      const rndC = srand();
      let hue: number, sat: number, lit: number;
      if (rndC < 0.45) { hue = 25 + srand() * 20; sat = 80 + srand() * 20; lit = 55 + srand() * 35; }
      else if (rndC < 0.7) { hue = 10 + srand() * 15; sat = 85 + srand() * 15; lit = 50 + srand() * 30; }
      else if (rndC < 0.85) { hue = 40 + srand() * 15; sat = 75 + srand() * 25; lit = 60 + srand() * 30; }
      else if (rndC < 0.93) { hue = 200 + srand() * 30; sat = 60 + srand() * 30; lit = 50 + srand() * 30; }
      else { hue = 330 + srand() * 25; sat = 65 + srand() * 25; lit = 55 + srand() * 25; }
      const alpha = (0.08 + srand() * 0.25) * bokehMult;
      const g = ctx.createRadialGradient(bkx, bky, 0, bkx, bky, bkr);
      g.addColorStop(0, `hsla(${hue},${sat}%,${lit}%,${alpha * 1.3})`);
      g.addColorStop(0.3, `hsla(${hue},${sat}%,${lit}%,${alpha * 0.6})`);
      g.addColorStop(0.6, `hsla(${hue},${sat}%,${lit}%,${alpha * 0.15})`);
      g.addColorStop(1, `hsla(${hue},${sat}%,${lit}%,0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bkx, bky, bkr, 0, Math.PI * 2);
      ctx.fill();
    }

    const ptMult = (1 - dk * 0.8);
    for (let p = 0; p < 25; p++) {
      const px = srand() * w;
      const py = h * 0.35 + srand() * h * 0.6;
      const pr = w * 0.005 + srand() * w * 0.03;
      const pRnd = srand();
      const pH = pRnd > 0.3 ? (20 + srand() * 25) : (195 + srand() * 30);
      const pg = ctx.createRadialGradient(px, py, 0, px, py, pr);
      pg.addColorStop(0, `hsla(${pH},95%,90%,${0.9 * ptMult})`);
      pg.addColorStop(0.2, `hsla(${pH},90%,75%,${0.45 * ptMult})`);
      pg.addColorStop(0.5, `hsla(${pH},85%,60%,${0.15 * ptMult})`);
      pg.addColorStop(1, `hsla(${pH},80%,55%,0)`);
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    const amb = ctx.createLinearGradient(0, h * 0.5, 0, h);
    amb.addColorStop(0, 'rgba(200, 130, 50, 0)');
    amb.addColorStop(0.5, `rgba(200, 130, 50, ${0.06 * (1 - dk * 0.7)})`);
    amb.addColorStop(1, `rgba(220, 150, 60, ${0.12 * (1 - dk * 0.7)})`);
    ctx.fillStyle = amb;
    ctx.fillRect(0, 0, w, h);

    if (blurPx > 0) {
      const tmp = createCanvas(w, h);
      const tctx = tmp.getContext('2d')!;
      tctx.drawImage(c, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.filter = `blur(${blurPx}px)`;
      ctx.drawImage(tmp, 0, 0);
      ctx.filter = 'none';
    }
    return c;
  }
  const textureFgCanvas = generateCityBg(96, 64, 1, darkness);
  const textureBgCanvas = generateCityBg(384, 256, 8, darkness);

  // ── Drop graphics (Canvas-stamp approach) ──
  let dropsGfx: HTMLCanvasElement[] = [];
  let clearDropletsGfx: HTMLCanvasElement | null = null;

  function renderDropsGfx() {
    const dropBuffer = createCanvas(dropSize, dropSize);
    const dropBufferCtx = dropBuffer.getContext('2d')!;
    dropsGfx = [];

    for (let i = 0; i < 255; i++) {
      const drop = createCanvas(dropSize, dropSize);
      const dropCtx = drop.getContext('2d')!;
      dropBufferCtx.clearRect(0, 0, dropSize, dropSize);

      dropBufferCtx.globalCompositeOperation = 'source-over';
      dropBufferCtx.drawImage(dropColorTex, 0, 0, dropSize, dropSize);

      dropBufferCtx.globalCompositeOperation = 'screen';
      dropBufferCtx.fillStyle = `rgba(0,0,${i},1)`;
      dropBufferCtx.fillRect(0, 0, dropSize, dropSize);

      dropCtx.globalCompositeOperation = 'source-over';
      dropCtx.drawImage(dropAlphaTex, 0, 0, dropSize, dropSize);

      dropCtx.globalCompositeOperation = 'source-in';
      dropCtx.drawImage(dropBuffer, 0, 0, dropSize, dropSize);

      dropsGfx.push(drop);
    }

    clearDropletsGfx = createCanvas(128, 128);
    const clearCtx = clearDropletsGfx.getContext('2d')!;
    clearCtx.fillStyle = '#000';
    clearCtx.beginPath();
    clearCtx.arc(64, 64, 64, 0, Math.PI * 2);
    clearCtx.fill();
  }

  // ── Raindrop physics ──
  const DropTemplate = {
    x: 0, y: 0, r: 0,
    spreadX: 0, spreadY: 0,
    momentum: 0, momentumX: 0,
    lastSpawn: 0, nextSpawn: 0,
    parent: null as any, isNew: true,
    killed: false, shrink: 0,
  };

  const options = {
    minR: 20,
    maxR: 50,
    maxDrops: 900,
    rainChance: 0.35,
    rainLimit: 6,
    dropletsRate: 120,
    dropletsSize: [2, 5] as [number, number],
    dropletsCleaningRadiusMultiplier: 0.28,
    raining: true,
    globalTimeScale: 1,
    trailRate: 1,
    autoShrink: true,
    spawnArea: [-0.1, 0.95] as [number, number],
    trailScaleRange: [0.25, 0.35] as [number, number],
    collisionRadius: 0.45,
    collisionRadiusIncrease: 0.0002,
    dropFallMultiplier: 1,
    collisionBoostMultiplier: 0.05,
    collisionBoost: 1,
  };

  let rdWidth = 0, rdHeight = 0, rdScale = 1;
  let rdCanvas: HTMLCanvasElement;
  let rdCtx: CanvasRenderingContext2D;
  let dropletsCanvas: HTMLCanvasElement;
  let dropletsCtx: CanvasRenderingContext2D;
  const dropletsPixelDensity = 1;
  let dropletsCounter = 0;
  let drops: any[] = [];
  // Noop placeholder: intentionally empty
  let rdLastRender: number | null = null;

  function deltaR() { return options.maxR - options.minR; }
  function area() { return (rdWidth * rdHeight) / rdScale; }
  function areaMultiplier() { return Math.sqrt(area() / (1024 * 768)); }

  function drawDrop(ctx: CanvasRenderingContext2D, drop: any) {
    if (dropsGfx.length <= 0) return;
    const x = drop.x, y = drop.y, r = drop.r;
    const spreadX = drop.spreadX, spreadY = drop.spreadY;
    const scaleX = 1, scaleY = 1.5;

    let d = Math.max(0, Math.min(1, ((r - options.minR) / deltaR()) * 0.9));
    d *= 1 / (((spreadX + spreadY) * 0.5) + 1);
    d = Math.floor(d * (dropsGfx.length - 1));

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(
      dropsGfx[d],
      (x - (r * scaleX * (spreadX + 1))) * rdScale,
      (y - (r * scaleY * (spreadY + 1))) * rdScale,
      (r * 2 * scaleX * (spreadX + 1)) * rdScale,
      (r * 2 * scaleY * (spreadY + 1)) * rdScale,
    );
  }

  function drawDroplet(x: number, y: number, r: number) {
    drawDrop(dropletsCtx, {
      x: x * dropletsPixelDensity,
      y: y * dropletsPixelDensity,
      r: r * dropletsPixelDensity,
      spreadX: 0, spreadY: 0,
    });
  }

  function clearDroplets(x: number, y: number, r?: number) {
    if (!r) r = 30;
    dropletsCtx.globalCompositeOperation = 'destination-out';
    dropletsCtx.drawImage(
      clearDropletsGfx!,
      (x - r) * dropletsPixelDensity * rdScale,
      (y - r) * dropletsPixelDensity * rdScale,
      (r * 2) * dropletsPixelDensity * rdScale,
      (r * 2) * dropletsPixelDensity * rdScale * 1.5,
    );
  }

  function rdCreateDrop(opts: any) {
    if (drops.length >= options.maxDrops * areaMultiplier()) return null;
    const d: any = {};
    for (const k in DropTemplate) d[k] = (DropTemplate as any)[k];
    for (const k2 in opts) d[k2] = opts[k2];
    return d;
  }

  function updateRain(timeScale: number) {
    const rainDrops: any[] = [];
    if (options.raining) {
      const limit = options.rainLimit * timeScale * areaMultiplier() * rainAmount;
      let count = 0;
      while (chance(options.rainChance * timeScale * areaMultiplier() * rainAmount) && count < limit) {
        count++;
        const r = rand(options.minR, options.maxR, (n) => Math.pow(n, 3))!;
        const rd = rdCreateDrop({
          x: rand(rdWidth / rdScale),
          y: rand((rdHeight / rdScale) * options.spawnArea[0], (rdHeight / rdScale) * options.spawnArea[1]),
          r,
          momentum: 1 + ((r - options.minR) * 0.1) + rand(2),
          spreadX: 1.5, spreadY: 1.5,
        });
        if (rd != null) rainDrops.push(rd);
      }
    }
    return rainDrops;
  }

  function updateDroplets(timeScale: number) {
    if (options.raining) {
      dropletsCounter += options.dropletsRate * timeScale * areaMultiplier() * rainAmount;
      let totalToSpawn = Math.floor(dropletsCounter);
      dropletsCounter -= totalToSpawn;

      while (totalToSpawn > 0) {
        if (chance(0.8) && totalToSpawn >= 4) {
          const clusterSize = Math.min(totalToSpawn, 4 + Math.floor(Math.random() * 5));
          const cx = rand(rdWidth / rdScale)!;
          const cy = rand(rdHeight / rdScale)!;
          const clusterSpread = 4 + Math.random() * 8;
          for (let ci = 0; ci < clusterSize; ci++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * clusterSpread;
            drawDroplet(
              cx + Math.cos(angle) * dist,
              cy + Math.sin(angle) * dist,
              rand(options.dropletsSize[0], options.dropletsSize[1], (n) => n * n)!,
            );
          }
          totalToSpawn -= clusterSize;
        } else {
          drawDroplet(
            rand(rdWidth / rdScale)!,
            rand(rdHeight / rdScale)!,
            rand(options.dropletsSize[0], options.dropletsSize[1], (n) => n * n)!,
          );
          totalToSpawn--;
        }
      }
    }
    rdCtx.drawImage(dropletsCanvas, 0, 0, rdWidth, rdHeight);
  }

  function updateDrops(timeScale: number) {
    const newDrops: any[] = [];
    updateDroplets(timeScale);
    const rainDrops = updateRain(timeScale);
    newDrops.push(...rainDrops);

    drops.sort((a: any, b: any) => {
      const va = (a.y * (rdWidth / rdScale)) + a.x;
      const vb = (b.y * (rdWidth / rdScale)) + b.x;
      return va > vb ? 1 : va === vb ? 0 : -1;
    });

    for (let i = 0; i < drops.length; i++) {
      const drop = drops[i];
      if (drop.killed) continue;

      if (chance((drop.r - (options.minR * options.dropFallMultiplier)) * (0.1 / deltaR()) * timeScale)) {
        drop.momentum += rand((drop.r / options.maxR) * 4)!;
      }
      if (options.autoShrink && drop.r <= options.minR && chance(0.05 * timeScale)) {
        drop.shrink += 0.01;
      }
      drop.r -= drop.shrink * timeScale;
      if (drop.r <= 0) { drop.killed = true; continue; }

      if (options.raining) {
        drop.lastSpawn += drop.momentum * timeScale * options.trailRate;
        if (drop.lastSpawn > drop.nextSpawn) {
          const trailDrop = rdCreateDrop({
            x: drop.x + (rand(-drop.r, drop.r)! * 0.1),
            y: drop.y - (drop.r * 0.01),
            r: drop.r * rand(options.trailScaleRange[0], options.trailScaleRange[1])!,
            spreadY: drop.momentum * 0.1,
            parent: drop,
          });
          if (trailDrop != null) {
            newDrops.push(trailDrop);
            drop.r *= Math.pow(0.97, timeScale);
            drop.lastSpawn = 0;
            drop.nextSpawn = rand(options.minR, options.maxR)! - (drop.momentum * 2 * options.trailRate) + (options.maxR - drop.r);
          }
        }
      }

      drop.spreadX *= Math.pow(0.4, timeScale);
      drop.spreadY *= Math.pow(0.7, timeScale);

      const moved = drop.momentum > 0;
      if (moved && !drop.killed) {
        drop.y += drop.momentum * options.globalTimeScale;
        drop.x += drop.momentumX * options.globalTimeScale;
        if (drop.y > (rdHeight / rdScale) + drop.r) { drop.killed = true; }
      }

      let checkCollision = (moved || drop.isNew) && !drop.killed;
      drop.isNew = false;

      if (checkCollision) {
        const end = Math.min(i + 70, drops.length);
        for (let j = i + 1; j < end; j++) {
          const drop2 = drops[j];
          if (drop === drop2 || drop.r <= drop2.r || drop.parent === drop2 || drop2.parent === drop || drop2.killed) continue;
          const dx = drop2.x - drop.x;
          const dy = drop2.y - drop.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < (drop.r + drop2.r) * (options.collisionRadius + (drop.momentum * options.collisionRadiusIncrease * timeScale))) {
            const r1 = drop.r, r2 = drop2.r;
            const a1 = Math.PI * r1 * r1;
            const a2 = Math.PI * r2 * r2;
            let targetR = Math.sqrt((a1 + (a2 * 0.8)) / Math.PI);
            if (targetR > options.maxR) targetR = options.maxR;
            drop.r = targetR;
            drop.momentumX += dx * 0.1;
            drop.spreadX = 0;
            drop.spreadY = 0;
            drop2.killed = true;
            drop.momentum = Math.max(drop2.momentum, Math.min(40, drop.momentum + (targetR * options.collisionBoostMultiplier) + options.collisionBoost));
          }
        }
      }

      drop.momentum -= Math.max(1, (options.minR * 0.5) - drop.momentum) * 0.1 * timeScale;
      if (drop.momentum < 0) drop.momentum = 0;
      drop.momentumX *= Math.pow(0.7, timeScale);

      if (!drop.killed) {
        newDrops.push(drop);
        if (moved && options.dropletsRate > 0) clearDroplets(drop.x, drop.y, drop.r * options.dropletsCleaningRadiusMultiplier);
        drawDrop(rdCtx, drop);
      }
    }

    drops = newDrops;
  }

  function rdUpdate() {
    rdCtx.clearRect(0, 0, rdWidth, rdHeight);
    const now = Date.now();
    if (rdLastRender == null) rdLastRender = now;
    let deltaT = now - rdLastRender;
    let timeScale = deltaT / ((1 / 60) * 1000);
    if (timeScale > 1.1) timeScale = 1.1;
    timeScale *= options.globalTimeScale;
    rdLastRender = now;
    updateDrops(timeScale);
  }

  function initRaindrops(width: number, height: number, scale: number) {
    rdWidth = width;
    rdHeight = height;
    rdScale = scale;
    rdCanvas = createCanvas(rdWidth, rdHeight);
    rdCtx = rdCanvas.getContext('2d')!;
    dropletsCanvas = createCanvas(rdWidth * dropletsPixelDensity, rdHeight * dropletsPixelDensity);
    dropletsCtx = dropletsCanvas.getContext('2d')!;
    drops = [];
    dropletsCounter = 0;
    rdLastRender = null;
    renderDropsGfx();
  }

  // ── WebGL renderer ──
  const ctxGl = canvas.getContext('webgl', { alpha: false, antialias: false });
  if (!ctxGl) return () => {};
  const gl: WebGLRenderingContext = ctxGl;

  const vertSrc = [
    'precision mediump float;',
    'attribute vec2 a_position;',
    'void main() {',
    '  gl_Position = vec4(a_position, 0.0, 1.0);',
    '}',
  ].join('\n');

  const fragSrc = [
    'precision mediump float;',
    '',
    'uniform sampler2D u_waterMap;',
    'uniform sampler2D u_textureShine;',
    'uniform sampler2D u_textureFg;',
    'uniform sampler2D u_textureBg;',
    '',
    'uniform vec2 u_resolution;',
    'uniform vec2 u_parallax;',
    'uniform float u_parallaxFg;',
    'uniform float u_parallaxBg;',
    'uniform float u_textureRatio;',
    'uniform bool u_renderShine;',
    'uniform bool u_renderShadow;',
    'uniform float u_minRefraction;',
    'uniform float u_refractionDelta;',
    'uniform float u_brightness;',
    'uniform float u_alphaMultiply;',
    'uniform float u_alphaSubtract;',
    '',
    'vec4 blend(vec4 bg, vec4 fg) {',
    '  vec3 bgm = bg.rgb * bg.a;',
    '  vec3 fgm = fg.rgb * fg.a;',
    '  float ia = 1.0 - fg.a;',
    '  float a = (fg.a + bg.a * ia);',
    '  vec3 rgb;',
    '  if (a != 0.0) {',
    '    rgb = (fgm + bgm * ia) / a;',
    '  } else {',
    '    rgb = vec3(0.0, 0.0, 0.0);',
    '  }',
    '  return vec4(rgb, a);',
    '}',
    '',
    'vec2 pixel() {',
    '  return vec2(1.0, 1.0) / u_resolution;',
    '}',
    '',
    'vec2 parallax(float v) {',
    '  return u_parallax * pixel() * v;',
    '}',
    '',
    'vec2 texCoord() {',
    '  return vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) / u_resolution;',
    '}',
    '',
    'vec2 scaledTexCoord() {',
    '  float ratio = u_resolution.x / u_resolution.y;',
    '  vec2 scale = vec2(1.0, 1.0);',
    '  vec2 offset = vec2(0.0, 0.0);',
    '  float ratioDelta = ratio - u_textureRatio;',
    '  if (ratioDelta >= 0.0) {',
    '    scale.y = (1.0 + ratioDelta);',
    '    offset.y = ratioDelta / 2.0;',
    '  } else {',
    '    scale.x = (1.0 - ratioDelta);',
    '    offset.x = -ratioDelta / 2.0;',
    '  }',
    '  return (texCoord() + offset) / scale;',
    '}',
    '',
    'vec4 fgColor(float x, float y) {',
    '  float p2 = u_parallaxFg * 2.0;',
    '  vec2 scale = vec2(',
    '    (u_resolution.x + p2) / u_resolution.x,',
    '    (u_resolution.y + p2) / u_resolution.y',
    '  );',
    '  vec2 scaledTC = texCoord() / scale;',
    '  vec2 offset = vec2(',
    '    (1.0 - (1.0 / scale.x)) / 2.0,',
    '    (1.0 - (1.0 / scale.y)) / 2.0',
    '  );',
    '  return texture2D(u_waterMap,',
    '    (scaledTC + offset) + (pixel() * vec2(x, y)) + parallax(u_parallaxFg)',
    '  );',
    '}',
    '',
    'void main() {',
    '  vec4 bg = texture2D(u_textureBg, scaledTexCoord() + parallax(u_parallaxBg));',
    '',
    '  vec4 cur = fgColor(0.0, 0.0);',
    '',
    '  float d = cur.b;',
    '  float x = cur.g;',
    '  float y = cur.r;',
    '',
    '  float a = clamp(cur.a * u_alphaMultiply - u_alphaSubtract, 0.0, 1.0);',
    '',
    '  vec2 refraction = (vec2(x, y) - 0.5) * 2.0;',
    '  vec2 refractionParallax = parallax(u_parallaxBg - u_parallaxFg);',
    '  vec2 refractionPos = scaledTexCoord()',
    '    + (pixel() * refraction * (u_minRefraction + (d * u_refractionDelta)))',
    '    + refractionParallax;',
    '',
    '  vec4 tex = texture2D(u_textureFg, refractionPos);',
    '',
    '  if (u_renderShine) {',
    '    float maxShine = 490.0;',
    '    float minShine = maxShine * 0.18;',
    '    vec2 shinePos = vec2(0.5, 0.5) + ((1.0 / 512.0) * refraction) * -(minShine + ((maxShine - minShine) * d));',
    '    vec4 shine = texture2D(u_textureShine, shinePos);',
    '    tex = blend(tex, shine);',
    '  }',
    '',
    '  vec4 fg = vec4(tex.rgb * u_brightness, a);',
    '',
    '  if (u_renderShadow) {',
    '    float borderAlpha = fgColor(0.0, 0.0 - (d * 6.0)).a;',
    '    borderAlpha = borderAlpha * u_alphaMultiply - (u_alphaSubtract + 0.5);',
    '    borderAlpha = clamp(borderAlpha, 0.0, 1.0);',
    '    borderAlpha *= 0.2;',
    '    vec4 border = vec4(0.0, 0.0, 0.0, borderAlpha);',
    '    fg = blend(border, fg);',
    '  }',
    '',
    '  gl_FragColor = blend(bg, fg);',
    '}',
  ].join('\n');

  function compileShader(type: number, src: string): WebGLShader {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  const prog = gl.createProgram()!;
  gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, vertSrc));
  gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, fragSrc));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const quadVertices = new Float32Array([
    -1.0, -1.0,  1.0, -1.0,  -1.0, 1.0,
    -1.0,  1.0,  1.0, -1.0,   1.0, 1.0,
  ]);
  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    resolution: gl.getUniformLocation(prog, 'u_resolution'),
    textureRatio: gl.getUniformLocation(prog, 'u_textureRatio'),
    renderShine: gl.getUniformLocation(prog, 'u_renderShine'),
    renderShadow: gl.getUniformLocation(prog, 'u_renderShadow'),
    minRefraction: gl.getUniformLocation(prog, 'u_minRefraction'),
    refractionDelta: gl.getUniformLocation(prog, 'u_refractionDelta'),
    brightness: gl.getUniformLocation(prog, 'u_brightness'),
    alphaMultiply: gl.getUniformLocation(prog, 'u_alphaMultiply'),
    alphaSubtract: gl.getUniformLocation(prog, 'u_alphaSubtract'),
    parallaxBg: gl.getUniformLocation(prog, 'u_parallaxBg'),
    parallaxFg: gl.getUniformLocation(prog, 'u_parallaxFg'),
    parallax: gl.getUniformLocation(prog, 'u_parallax'),
    waterMap: gl.getUniformLocation(prog, 'u_waterMap'),
    textureShine: gl.getUniformLocation(prog, 'u_textureShine'),
    textureFg: gl.getUniformLocation(prog, 'u_textureFg'),
    textureBg: gl.getUniformLocation(prog, 'u_textureBg'),
  };

  const bgRatio = textureBgCanvas.width / textureBgCanvas.height;

  function initTexture(unit: number, source?: HTMLCanvasElement): WebGLTexture {
    const tex = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (source) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    }
    return tex;
  }

  const waterTex = initTexture(0);
  const shineTex = initTexture(1, createCanvas(2, 2));
  const fgTex = initTexture(2, textureFgCanvas);
  const bgTex = initTexture(3, textureBgCanvas);

  // ── Resize ──
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    gl.viewport(0, 0, canvas.width, canvas.height);
    initRaindrops(canvas.width, canvas.height, dpr);
  }

  window.addEventListener('resize', resize);
  resize();

  // ── Render loop ──
  function render() {
    rafId = requestAnimationFrame(render);
    if (paused || reducedMotion) return;

    rdUpdate();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, waterTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, rdCanvas);

    gl.useProgram(prog);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.textureRatio, bgRatio);
    gl.uniform1i(uniforms.renderShine, 0);
    gl.uniform1i(uniforms.renderShadow, 0);
    gl.uniform1f(uniforms.minRefraction, 256.0 * refractionStrength);
    gl.uniform1f(uniforms.refractionDelta, 256.0 * refractionStrength);
    gl.uniform1f(uniforms.brightness, 0.75);
    gl.uniform1f(uniforms.alphaMultiply, 5.0);
    gl.uniform1f(uniforms.alphaSubtract, 3.5);
    gl.uniform1f(uniforms.parallaxBg, 5.0);
    gl.uniform1f(uniforms.parallaxFg, 20.0);
    gl.uniform2f(uniforms.parallax, 0.0, 0.0);

    gl.uniform1i(uniforms.waterMap, 0);
    gl.uniform1i(uniforms.textureShine, 1);
    gl.uniform1i(uniforms.textureFg, 2);
    gl.uniform1i(uniforms.textureBg, 3);

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  // ── Interaction ──
  const interactiveListeners: Array<[string, EventListener]> = [];
  if (interactive) {
    function createSplash(clientX: number, clientY: number) {
      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width * (rdWidth / rdScale);
      const y = (clientY - rect.top) / rect.height * (rdHeight / rdScale);

      const mainDrop = rdCreateDrop({
        x, y,
        r: rand(options.minR * 1.5, options.maxR)!,
        momentum: 1 + rand(3)!,
        spreadX: 2.0, spreadY: 2.0,
      });
      if (mainDrop) drops.push(mainDrop);

      for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 10 + Math.random() * 30;
        const sd = rdCreateDrop({
          x: x + Math.cos(angle) * dist,
          y: y + Math.sin(angle) * dist,
          r: rand(options.minR * 0.5, options.minR * 1.2)!,
          momentum: 0.5 + Math.random() * 1.5,
          spreadX: 1.0, spreadY: 1.0,
        });
        if (sd) drops.push(sd);
      }

      for (let j = 0; j < 20; j++) {
        const sa = Math.random() * Math.PI * 2;
        const sd2 = 5 + Math.random() * 25;
        drawDroplet(
          x + Math.cos(sa) * sd2,
          y + Math.sin(sa) * sd2,
          rand(options.dropletsSize[0], options.dropletsSize[1])!,
        );
      }
    }

    function screenToRd(clientX: number, clientY: number) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / rect.width * (rdWidth / rdScale),
        y: (clientY - rect.top) / rect.height * (rdHeight / rdScale),
      };
    }

    function wipeAt(clientX: number, clientY: number) {
      const p = screenToRd(clientX, clientY);
      const wipeR = 60 * rdScale;
      const killR = wipeR * 0.5;
      const pushR = wipeR * 1.5;
      clearDroplets(p.x, p.y, wipeR / rdScale);

      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        const dx = d.x - p.x, dy = d.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < killR) {
          drops.splice(i, 1);
        } else if (dist < pushR) {
          const push = (1 - (dist - killR) / (pushR - killR)) * 20;
          d.x += (dx / dist) * push;
          d.y += (dy / dist) * push * 0.6;
        }
      }
    }

    let rainMouseDown = false;
    const onRainMouseDown = (e: Event) => { rainMouseDown = true; createSplash((e as MouseEvent).clientX, (e as MouseEvent).clientY); };
    const onRainMouseMove = (e: Event) => { if (rainMouseDown) wipeAt((e as MouseEvent).clientX, (e as MouseEvent).clientY); };
    const onRainMouseUp = () => { rainMouseDown = false; };
    const onRainTouchStart = (e: Event) => {
      e.preventDefault(); rainMouseDown = true;
      createSplash((e as TouchEvent).touches[0].clientX, (e as TouchEvent).touches[0].clientY);
    };
    const onRainTouchMove = (e: Event) => {
      e.preventDefault();
      if (rainMouseDown) wipeAt((e as TouchEvent).touches[0].clientX, (e as TouchEvent).touches[0].clientY);
    };
    const onRainTouchEnd = () => { rainMouseDown = false; };
    canvas.addEventListener('mousedown', onRainMouseDown);
    canvas.addEventListener('mousemove', onRainMouseMove);
    canvas.addEventListener('mouseup', onRainMouseUp);
    canvas.addEventListener('touchstart', onRainTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onRainTouchMove, { passive: false });
    canvas.addEventListener('touchend', onRainTouchEnd);
    interactiveListeners.push(
      ['mousedown', onRainMouseDown],
      ['mousemove', onRainMouseMove],
      ['mouseup', onRainMouseUp],
      ['touchstart', onRainTouchStart],
      ['touchmove', onRainTouchMove],
      ['touchend', onRainTouchEnd],
    );
  }

  let rafId = requestAnimationFrame(render);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    for (const [type, listener] of interactiveListeners) {
      canvas.removeEventListener(type, listener);
    }
    gl.deleteTexture(waterTex);
    gl.deleteTexture(shineTex);
    gl.deleteTexture(fgTex);
    gl.deleteTexture(bgTex);
    gl.deleteBuffer(posBuffer);
    gl.deleteProgram(prog);
  };
}
