#version 300 es
#include "header.glsl"
// Kaleidoscope: fold uv into an N-slice wedge around a chosen center,
// with zoom, rotation, and optional mirror per slice.

uniform float u_segments;
uniform float u_rotation;
uniform float u_zoom;
uniform vec2  u_center;
uniform float u_mirror;

const float TAU = 6.2831853;

void main() {
    float aspect = safeDiv(u_resolution.x, u_resolution.y);
    vec2 p = v_uv - u_center;
    p.x *= aspect;

    float rot = radians(u_rotation);
    float s = sin(rot), c = cos(rot);
    p = mat2(c, -s, s, c) * p;

    float r = length(p);
    float a = atan(p.y, p.x);
    float seg = max(2.0, u_segments);
    float wedge = TAU / seg;
    // Continuous angle folding — no mod() discontinuity, derivatives stay smooth
    a = a - wedge * floor(a / wedge);
    if (u_mirror > 0.5) a = abs(a - wedge * 0.5);

    vec2 sampP = vec2(cos(a), sin(a)) * r / max(u_zoom, 0.01);
    sampP.x /= aspect;
    vec2 uv = sampP + u_center;

    fragColor = texture(u_texture, uv);
}
