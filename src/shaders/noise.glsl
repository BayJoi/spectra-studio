#version 300 es
#include "header.glsl"
uniform float u_amount;
uniform float u_seed;
uniform float u_scale;
uniform float u_monochrome;
uniform float u_noiseType;
uniform float u_octaves;
uniform float u_colorAmount;

float filmGrain(vec2 uv, float seed) {
    vec2 q = uv * u_resolution;
    return hash21(q * 0.71 + seed);
}

void main() {
    vec4 src = texture(u_texture, v_uv);
    vec2 np = v_uv * u_resolution / max(u_scale, 1.0) + u_seed;

    int octs = int(clamp(u_octaves, 1.0, 8.0));
    float n;
    float nt = floor(u_noiseType + 0.5);
    
    // Film grain mode (type 5)
    if (nt > 4.5) {
        n = filmGrain(v_uv, u_seed);
    } else if (nt > 3.5) {
        // Simplex noise
        n = snoise(np) * 0.5 + 0.5;
    } else if (nt > 2.5) {
        // Voronoi
        n = voronoi(np);
    } else if (nt > 1.5) {
        // FBM
        n = fbm(np, octs);
    } else if (nt > 0.5) {
        // Perlin
        n = perlin(np);
    } else {
        // Value noise
        n = vnoise(np);
    }

    float mono = step(0.5, u_monochrome);
    float colorAmt = u_colorAmount;
    
    vec3 noiseVal;
    if (mono > 0.5) {
        noiseVal = vec3(n);
    } else if (nt > 4.5) {
        noiseVal.r = hash21(v_uv * u_resolution * 1.0 + u_seed);
        noiseVal.g = hash21(v_uv * u_resolution * 1.17 + u_seed + 7.3);
        noiseVal.b = hash21(v_uv * u_resolution * 1.31 + u_seed + 13.7);
    } else if (nt > 3.5) {
        noiseVal.r = snoise(np + vec2(100.0, 0.0)) * 0.5 + 0.5;
        noiseVal.g = snoise(np + vec2(200.0, 0.0)) * 0.5 + 0.5;
        noiseVal.b = snoise(np + vec2(300.0, 0.0)) * 0.5 + 0.5;
    } else if (nt > 2.5) {
        noiseVal.r = voronoi(np + vec2(100.0, 0.0));
        noiseVal.g = voronoi(np + vec2(200.0, 0.0));
        noiseVal.b = voronoi(np + vec2(300.0, 0.0));
    } else if (nt > 1.5) {
        noiseVal.r = fbm(np + vec2(100.0, 0.0), octs);
        noiseVal.g = fbm(np + vec2(200.0, 0.0), octs);
        noiseVal.b = fbm(np + vec2(300.0, 0.0), octs);
    } else if (nt > 0.5) {
        noiseVal.r = perlin(np + vec2(100.0, 0.0));
        noiseVal.g = perlin(np + vec2(200.0, 0.0));
        noiseVal.b = perlin(np + vec2(300.0, 0.0));
    } else {
        noiseVal.r = vnoise(np + vec2(100.0, 0.0));
        noiseVal.g = vnoise(np + vec2(200.0, 0.0));
        noiseVal.b = vnoise(np + vec2(300.0, 0.0));
    }

    vec3 result = src.rgb + (noiseVal - 0.5) * u_amount * (1.0 + colorAmt);
    fragColor = vec4(clamp(result, 0.0, 1.0), src.a);
}