precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
  float n = hash21(p);
  return vec2(n, hash21(p + n + 17.13));
}

vec2 random2(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 33.33);
  return fract(p);
}

float luminance(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float perlin(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 ga = random2(i + vec2(0.0, 0.0));
  vec2 gb = random2(i + vec2(1.0, 0.0));
  vec2 gc = random2(i + vec2(0.0, 1.0));
  vec2 gd = random2(i + vec2(1.0, 1.0));
  float va = dot(ga, f - vec2(0.0, 0.0));
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0, 1.0));
  return mix(mix(va, vb, u.x), mix(vc, vd, u.x), u.y) * 0.5 + 0.5;
}

mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

vec2 rotateUV(vec2 uv, float angle) {
    return (uv - 0.5) * rot2(radians(angle)) + 0.5;
}

float fbm(vec2 p, int octaves) {
  float value = 0.0;
  float amp = 0.5;
  float freq = 1.0;
  float tot = 0.0;
  mat2 R = rot2(0.62);
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    float w = 1.0;
    value += amp * w * perlin(p * freq);
    tot += amp * w;
    freq *= 2.03;
    amp *= 0.55;
    p = R * p + 11.7;
  }
  return value / max(tot, 1e-4);
}

float voronoi(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float md = 8.0;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec2 n = vec2(float(x), float(y));
      vec2 point = hash22(i + n);
      vec2 diff = n + point - f;
      float d = dot(diff, diff);
      md = min(md, d);
    }
  }
  return md;
}

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = mod(((i.y + vec3(0.0, i1.y, 1.0)) * 34.0 + 1.0) * (i.y + vec3(0.0, i1.y, 1.0)), 289.0);
    vec3 q = p + i.x + vec3(0.0, i1.x, 1.0);
    p = mod((q * 34.0 + 1.0) * q, 289.0);
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g = vec3(0.0);
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

// Safe math utilities — guards against NaN/Infinity in parameter-driven shaders.
float safeDiv(float a, float b) { return a / max(abs(b), 1e-7); }
vec2 safeDiv(vec2 a, vec2 b) { return a / max(abs(b), vec2(1e-7)); }
float safeSqrt(float a) { return sqrt(max(a, 0.0)); }
float safePow(float base, float exp) { return pow(max(abs(base), 1e-7), exp); }
float safeSmoothstep(float a, float b, float x) {
  float lo = min(a, b);
  float hi = max(a, b);
  if (hi - lo < 1e-7) return step(hi, x);
  return smoothstep(lo, hi, x);
}
