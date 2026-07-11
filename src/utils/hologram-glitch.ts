// Hologram Glitch — adapted from Radiant Shaders (MIT, Copyright (c) 2025 Paul Bakaus)
// https://github.com/pbakaus/radiant
interface HologramGlitchOptions {
  intensity?: number;
  scanSpeed?: number;
  darkness?: number;
}

export function initHologramGlitch(canvas: HTMLCanvasElement, opts?: HologramGlitchOptions): () => void {
  const ctxGl = canvas.getContext('webgl', { alpha: false, antialias: false });
  if (!ctxGl) return () => {};
  const gl: WebGLRenderingContext = ctxGl;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GLITCH_INTENSITY = opts?.intensity ?? 0.6;
  const SCAN_SPEED = opts?.scanSpeed ?? 1.0;
  const DARKNESS = opts?.darkness ?? 0.5;

  let paused = false;
  document.addEventListener('visibilitychange', () => { paused = document.hidden; });

  const vertSrc = [
    'attribute vec2 a_pos;',
    'void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }'
  ].join('\n');

  const fragSrc = [
    'precision highp float;',
    'uniform float u_time;',
    'uniform vec2 u_res;',
    'uniform float u_glitchIntensity;',
    'uniform float u_scanSpeed;',
    'uniform float u_darkness;',
    'uniform vec2 u_mouse;',
    '',
    '#define PI 3.14159265359',
    '',
    'float hash(float n) {',
    '  return fract(sin(n) * 43758.5453123);',
    '}',
    '',
    'float hash2(vec2 p) {',
    '  vec3 p3 = fract(vec3(p.xyx) * 0.1031);',
    '  p3 += dot(p3, p3.yzx + 33.33);',
    '  return fract((p3.x + p3.y) * p3.z);',
    '}',
    '',
    'float vnoise(vec2 p) {',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  return mix(',
    '    mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x),',
    '    mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x),',
    '    f.y',
    '  );',
    '}',
    '',
    'float fbm(vec2 p) {',
    '  float v = 0.0;',
    '  float a = 0.5;',
    '  vec2 shift = vec2(100.0);',
    '  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));',
    '  for (int i = 0; i < 4; i++) {',
    '    v += a * vnoise(p);',
    '    p = rot * p * 2.0 + shift;',
    '    a *= 0.5;',
    '  }',
    '  return v;',
    '}',
    '',
    'float glitchEnvelope(float t) {',
    '  float slow = sin(t * 0.7) * sin(t * 1.1);',
    '  float med = sin(t * 3.3) * 0.5 + 0.5;',
    '  float fast = step(0.88, hash(floor(t * 12.0)));',
    '  float envelope = smoothstep(0.15, 0.5, slow) * (0.5 + 0.5 * med);',
    '  envelope += fast * 0.7;',
    '  return clamp(envelope, 0.0, 1.0);',
    '}',
    '',
    'float glitchBand(float y, float t, float intensity) {',
    '  float env = glitchEnvelope(t);',
    '  if (env < 0.1) return 0.0;',
    '',
    '  float band1 = step(0.8, vnoise(vec2(y * 15.0, floor(t * 8.0)))) * 0.14;',
    '  float band2 = step(0.85, vnoise(vec2(y * 40.0, floor(t * 15.0)))) * 0.07;',
    '  float band3 = step(0.82, vnoise(vec2(y * 5.0, floor(t * 4.0)))) * 0.25;',
    '',
    '  float dir = sign(vnoise(vec2(y * 20.0, floor(t * 6.0))) - 0.5);',
    '',
    '  return (band1 + band2 + band3) * dir * env * intensity;',
    '}',
    '',
    'float noiseBurst(vec2 uv, float t) {',
    '  float env = glitchEnvelope(t + 1.5);',
    '  if (env < 0.3) return 0.0;',
    '',
    '  float blockT = floor(t * 6.0);',
    '  float bx = hash(blockT * 7.3) * 0.8 - 0.4;',
    '  float by = hash(blockT * 11.7) * 0.8 - 0.4;',
    '  float bw = hash(blockT * 3.1) * 0.3 + 0.05;',
    '  float bh = hash(blockT * 5.9) * 0.1 + 0.02;',
    '',
    '  float inBlock = step(bx, uv.x) * step(uv.x, bx + bw) *',
    '                  step(by, uv.y) * step(uv.y, by + bh);',
    '',
    '  float n = hash2(floor(uv * 300.0) + blockT * 100.0);',
    '  return inBlock * n * env * 1.0;',
    '}',
    '',
    'void main() {',
    '  vec2 uv = gl_FragCoord.xy / u_res;',
    '  vec2 centeredUV = (gl_FragCoord.xy - u_res * 0.5) / u_res.y;',
    '  float t = u_time;',
    '  float glitchI = u_glitchIntensity;',
    '  float scanS = u_scanSpeed;',
    '',
    '  vec2 mouseNorm = vec2(0.5, 0.5);',
    '  float mouseInfluence = 0.0;',
    '  if (u_mouse.x >= 0.0) {',
    '    mouseNorm = u_mouse / u_res;',
    '    mouseNorm.y = 1.0 - mouseNorm.y;',
    '    float mouseDist = length(uv - mouseNorm);',
    '    mouseInfluence = exp(-mouseDist * 3.0);',
    '  }',
    '',
    '  float bandOffset = glitchBand(uv.y, t, glitchI);',
    '  bandOffset *= (1.0 + mouseInfluence * 2.0);',
    '',
    '  vec2 glitchedUV = uv;',
    '  glitchedUV.x += bandOffset;',
    '',
    '  float chromBase = 0.008 + 0.006 * sin(t * 1.2);',
    '  float chromSpike = glitchEnvelope(t) * 0.035 * glitchI;',
    '  float chromJump = step(0.92, hash(floor(t * 5.0))) * 0.05 * glitchI;',
    '  float chromAmount = chromBase + chromSpike + chromJump;',
    '  chromAmount *= (1.0 + mouseInfluence * 1.5);',
    '',
    '  vec2 uvR = glitchedUV + vec2(-chromAmount, 0.0);',
    '  vec2 uvG = glitchedUV;',
    '  vec2 uvB = glitchedUV + vec2(chromAmount, 0.0);',
    '',
    '  uvR.y += chromAmount * 0.5;',
    '  uvB.y -= chromAmount * 0.5;',
    '',
    '  float slowT = t * 0.15;',
    '',
    '  float patR = fbm(uvR * 3.0 + vec2(slowT, slowT * 0.7));',
    '  patR += fbm(uvR * 5.0 - vec2(slowT * 0.5, slowT * 1.2)) * 0.5;',
    '  patR += fbm(uvR * 1.5 + vec2(slowT * 0.3, -slowT * 0.4)) * 0.7;',
    '  patR += fbm(uvR * 10.0 + vec2(slowT * 1.5, -slowT * 0.8)) * 0.15;',
    '',
    '  float patG = fbm(uvG * 3.0 + vec2(slowT, slowT * 0.7));',
    '  patG += fbm(uvG * 5.0 - vec2(slowT * 0.5, slowT * 1.2)) * 0.5;',
    '  patG += fbm(uvG * 1.5 + vec2(slowT * 0.3, -slowT * 0.4)) * 0.7;',
    '  patG += fbm(uvG * 10.0 + vec2(slowT * 1.5, -slowT * 0.8)) * 0.15;',
    '',
    '  float patB = fbm(uvB * 3.0 + vec2(slowT, slowT * 0.7));',
    '  patB += fbm(uvB * 5.0 - vec2(slowT * 0.5, slowT * 1.2)) * 0.5;',
    '  patB += fbm(uvB * 1.5 + vec2(slowT * 0.3, -slowT * 0.4)) * 0.7;',
    '  patB += fbm(uvB * 10.0 + vec2(slowT * 1.5, -slowT * 0.8)) * 0.15;',
    '',
    '  patR = patR / 2.45;',
    '  patG = patG / 2.45;',
    '  patB = patB / 2.45;',
    '',
    '  patR = smoothstep(0.35, 0.55, patR);',
    '  patG = smoothstep(0.35, 0.55, patG);',
    '  patB = smoothstep(0.35, 0.55, patB);',
    '',
    '  patR = patR * patR * (3.0 - 2.0 * patR);',
    '  patG = patG * patG * (3.0 - 2.0 * patG);',
    '  patB = patB * patB * (3.0 - 2.0 * patB);',
    '',
    '  float hueShift = t * 0.2;',
    '  float hue1 = sin(hueShift) * 0.5 + 0.5;',
    '  float hue2 = sin(hueShift + 2.094) * 0.5 + 0.5;',
    '  float hue3 = sin(hueShift + 4.189) * 0.5 + 0.5;',
    '',
    '  float spatialHue = sin(centeredUV.x * 4.0 + centeredUV.y * 3.0 + t * 0.3) * 0.5 + 0.5;',
    '',
    '  vec3 col1 = vec3(1.0, 0.55, 0.15);',
    '  vec3 col2 = vec3(0.7, 0.35, 0.1);',
    '  vec3 col3 = vec3(1.0, 0.85, 0.55);',
    '  vec3 col4 = vec3(1.0, 0.7, 0.25);',
    '',
    '  vec3 palette = mix(col1, col2, hue1 * spatialHue);',
    '  palette = mix(palette, col3, hue2 * 0.3);',
    '  palette = mix(palette, col4, hue3 * spatialHue * 0.4);',
    '',
    '  vec3 baseColor;',
    '  baseColor.r = patR * palette.r;',
    '  baseColor.g = patG * palette.g;',
    '  baseColor.b = patB * palette.b;',
    '',
    '  float alignment = patR * patG * patB;',
    '  baseColor += vec3(1.0, 0.85, 0.55) * pow(alignment, 1.5) * 1.2;',
    '',
    '  float scanY = gl_FragCoord.y;',
    '',
    '  float fineScan = sin(scanY * PI * 0.8) * 0.5 + 0.5;',
    '  fineScan = pow(fineScan, 1.5);',
    '',
    '  float medScanR = sin((scanY + t * 60.0 * scanS) * 0.15) * 0.5 + 0.5;',
    '  float medScanG = sin((scanY + t * 75.0 * scanS) * 0.15) * 0.5 + 0.5;',
    '  float medScanB = sin((scanY + t * 55.0 * scanS) * 0.15) * 0.5 + 0.5;',
    '',
    '  float broadScan = sin((scanY + t * 30.0 * scanS) * 0.03) * 0.5 + 0.5;',
    '  broadScan = smoothstep(0.3, 0.7, broadScan);',
    '',
    '  float scanR = mix(0.45, 1.0, fineScan) * mix(0.7, 1.0, medScanR) * mix(0.6, 1.0, broadScan);',
    '  float scanG = mix(0.45, 1.0, fineScan) * mix(0.7, 1.0, medScanG) * mix(0.6, 1.0, broadScan);',
    '  float scanB = mix(0.45, 1.0, fineScan) * mix(0.7, 1.0, medScanB) * mix(0.6, 1.0, broadScan);',
    '',
    '  float brightScanPos = mod(t * 40.0 * scanS, u_res.y);',
    '  float brightScan = exp(-abs(scanY - brightScanPos) * 0.12) * 0.7;',
    '',
    '  baseColor.r *= scanR;',
    '  baseColor.g *= scanG;',
    '  baseColor.b *= scanB;',
    '  baseColor += vec3(1.0, 0.75, 0.35) * brightScan;',
    '',
    '  float interlace = mod(scanY + floor(t * 30.0), 2.0);',
    '  float interlaceFlicker = mix(0.78, 1.0, interlace);',
    '  float lineFlicker = 1.0 - step(0.95, hash(floor(scanY * 0.5) + floor(t * 20.0) * 100.0)) * 0.5;',
    '  baseColor *= interlaceFlicker * lineFlicker;',
    '',
    '  float burst = noiseBurst(centeredUV, t);',
    '  vec3 burstColor = vec3(1.0, 0.6, 0.25) * burst;',
    '  baseColor += burstColor * glitchI;',
    '',
    '  float patCenter = fbm(glitchedUV * 3.0 + vec2(slowT, slowT * 0.7));',
    '  float patDx = fbm((glitchedUV + vec2(0.005, 0.0)) * 3.0 + vec2(slowT, slowT * 0.7));',
    '  float patDy = fbm((glitchedUV + vec2(0.0, 0.005)) * 3.0 + vec2(slowT, slowT * 0.7));',
    '  float edgeStrength = length(vec2(patDx - patCenter, patDy - patCenter)) * 20.0;',
    '  edgeStrength = smoothstep(0.2, 0.8, edgeStrength);',
    '  vec3 edgeColor = mix(vec3(1.0, 0.6, 0.2), vec3(0.8, 0.35, 0.1), spatialHue) * edgeStrength * 0.6;',
    '  baseColor += edgeColor;',
    '',
    '  float shimmer = sin(centeredUV.x * 20.0 + centeredUV.y * 15.0 + t * 2.0) * 0.15 + 0.85;',
    '  shimmer *= sin(centeredUV.x * 8.0 - centeredUV.y * 12.0 + t * 1.3) * 0.1 + 0.9;',
    '  baseColor *= shimmer;',
    '',
    '  float clarity = sin(t * 0.4) * 0.15 + 0.85;',
    '  baseColor *= clarity;',
    '',
    '  float vDist = length(centeredUV * vec2(1.0, 0.85));',
    '  float vignette = 1.0 - smoothstep(0.45, 1.1, vDist);',
    '  vec3 vignetteColor = vec3(0.03, 0.02, 0.01);',
    '  baseColor = mix(vignetteColor, baseColor, vignette);',
    '',
    '  float grain = (hash2(gl_FragCoord.xy + fract(t * 43.0) * 1000.0) - 0.5) * 0.06;',
    '  baseColor += grain;',
    '',
    '  baseColor = baseColor / (baseColor + vec3(0.65));',
    '  baseColor = pow(baseColor, vec3(0.95));',
    '',
    '  baseColor = max(baseColor, vec3(0.0));',
    '',
    '  float darknessFactor = mix(1.0, 0.3, u_darkness);',
    '  baseColor *= darknessFactor;',
    '',
    '  gl_FragColor = vec4(baseColor, 1.0);',
    '}'
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

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uGlitchIntensity = gl.getUniformLocation(prog, 'u_glitchIntensity');
  const uScanSpeed = gl.getUniformLocation(prog, 'u_scanSpeed');
  const uDarkness = gl.getUniformLocation(prog, 'u_darkness');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');

  let mouseX = -1;
  let mouseY = -1;
  let smoothMouseX = -1;
  let smoothMouseY = -1;
  let mouseActive = false;

  function cssToGL(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (rect.bottom - clientY) * (canvas.height / rect.height),
    };
  }

  canvas.addEventListener('mousemove', (e) => {
    const p = cssToGL(e.clientX, e.clientY);
    mouseX = p.x; mouseY = p.y;
    mouseActive = true;
  });
  canvas.addEventListener('mouseleave', () => { mouseActive = false; });
  canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    const p = cssToGL(t.clientX, t.clientY);
    mouseX = p.x; mouseY = p.y;
    mouseActive = true;
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    const p = cssToGL(t.clientX, t.clientY);
    mouseX = p.x; mouseY = p.y;
    mouseActive = true;
  }, { passive: false });
  canvas.addEventListener('touchend', () => { mouseActive = false; });

  let needsResize = true;

  function resize() {
    needsResize = false;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  }

  window.addEventListener('resize', () => { needsResize = true; });

  resize();

  let rafId: number;

  function render(now: number) {
    rafId = requestAnimationFrame(render);
    if (paused) return;

    if (needsResize) resize();

    if (mouseActive) {
      if (smoothMouseX < 0) { smoothMouseX = mouseX; smoothMouseY = mouseY; }
      smoothMouseX += (mouseX - smoothMouseX) * 0.08;
      smoothMouseY += (mouseY - smoothMouseY) * 0.08;
    } else {
      smoothMouseX = -1;
      smoothMouseY = -1;
    }

    gl.uniform1f(uTime, prefersReduced ? 0.0 : now * 0.001);
    gl.uniform1f(uGlitchIntensity, GLITCH_INTENSITY);
    gl.uniform1f(uScanSpeed, SCAN_SPEED);
    gl.uniform1f(uDarkness, DARKNESS);
    gl.uniform2f(uMouse, smoothMouseX, smoothMouseY);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  rafId = requestAnimationFrame(render);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
  };
}
