#version 300 es
#include "header.glsl"
// Fluid domain warp: displaces UVs by the curl of an fbm scalar field.
// Curl of a scalar potential psi: (dpsi/dy, -dpsi/dx). Sampling psi at a small
// epsilon on each axis approximates a divergence-free (incompressible) vector
// field — visually reads as liquid / smoke advection without a full
// Navier-Stokes ping-pong solver.

uniform float u_amount;
uniform float u_scale;
uniform float u_time;
uniform float u_octaves;
uniform float u_swirl;
uniform float u_chroma;
uniform float u_seed;

float psi(vec2 p) {
    p += vec2(u_time * 0.15, u_time * 0.11);
    int oct = int(clamp(u_octaves, 1.0, 6.0));
    return fbm(p, oct);
}

vec2 curlNoise(vec2 uv) {
    float e = max(u_scale / max(u_resolution.x, u_resolution.y) * 2.0, 1e-7);
    vec2 p = uv * u_scale + u_seed;
    float n1 = psi(p + vec2(0.0, e));
    float n2 = psi(p - vec2(0.0, e));
    float n3 = psi(p + vec2(e, 0.0));
    float n4 = psi(p - vec2(e, 0.0));
    return vec2(n1 - n2, -(n3 - n4)) / (2.0 * e);
}

void main() {
    vec2 uv = v_uv;
    vec2 flow = curlNoise(uv) * u_amount;

    // "Swirl" adds a radial rotational component around image center.
    if (u_swirl > 0.001) {
        vec2 c = uv - 0.5;
        float r = length(c);
        float ang = u_swirl * (0.5 - r) * 2.0;
        float s = sin(ang), co = cos(ang);
        vec2 rot = mat2(co, -s, s, co) * c + 0.5;
        flow += (rot - uv);
    }

    vec2 warpedUV = clamp(uv + flow, 0.0, 1.0);

    if (u_chroma > 0.001) {
        vec2 chromaOff = flow * u_chroma;
        float r = texture(u_texture, clamp(warpedUV + chromaOff, 0.0, 1.0)).r;
        float g = texture(u_texture, warpedUV).g;
        float b = texture(u_texture, clamp(warpedUV - chromaOff, 0.0, 1.0)).b;
        fragColor = vec4(r, g, b, texture(u_texture, warpedUV).a);
    } else {
        fragColor = texture(u_texture, warpedUV);
    }
}
