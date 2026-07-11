#version 300 es
#include "header.glsl"
uniform float u_intensity;
uniform float u_split;
uniform float u_scanJitter;
uniform float u_hueShift;
uniform float u_glitchMode;
uniform float u_time;
uniform float u_noiseAmount;
uniform float u_blockSize;

void main() {
    float gm = floor(u_glitchMode + 0.5);
    vec2 uv = v_uv;
    vec3 col = texture(u_texture, uv).rgb;

    float time = u_time;
    float intensity = u_intensity;
    float bs = max(u_blockSize, 1.0);

    if (gm <= 0.5) {
        // Mode 0: Original holo glitch (base deformation + hue)
        // Quantize the wavy jitter into horizontal bands stepped by Block Size,
        // drifting vertically over time so the Time slider stays live.
        float stepY = floor((v_uv.y + u_time * 0.2) * bs) / bs;
        float jitter = hash(vec2(stepY, 0.0)) * u_scanJitter * 0.01;
        uv.x += jitter;

        col = texture(u_texture, uv).rgb;

        vec3 k = vec3(0.57735, 0.57735, 0.57735);
        float cosA = cos(u_hueShift * 6.28318);
        float sinA = sin(u_hueShift * 6.28318);
        col = col * cosA + cross(k, col) * sinA + k * dot(k, col) * (1.0 - cosA);

    } else if (gm <= 1.5) {
        // Mode 1: Datamosh / compression artifacts (block-glitch grid + scan tearing)
        vec2 blockUV = floor(uv * bs) / bs;
        float blockHash = hash(blockUV + time);
        vec2 blockOffset = (random2(blockUV + time) - 0.5) * 0.05 * blockHash * intensity;
        uv += blockOffset;

        // Horizontal line tearing driven by Scan Jitter inside the pixelation grid
        float lineTear = (hash(vec2(floor(uv.y * u_resolution.y), time)) - 0.5) * u_scanJitter * 0.05;
        uv.x += lineTear * intensity;

        col = texture(u_texture, uv).rgb;

    } else if (gm <= 2.5) {
        // Mode 2: Interference / scanline corruption (block-tiled horizontal glitches)
        float scanline = floor(v_uv.y * u_resolution.y);
        float scanHash = hash(vec2(scanline * 0.1, time * 100.0));
        float scanOffset = sin(time * 5.0 + scanline * 0.01) * u_scanJitter * 0.02 * scanHash;
        uv.x += scanOffset * intensity;

        // Ensure Block Size cleanly slices and drives the block glitch coordinates horizontally
        float blockY = floor(v_uv.y * bs);
        float dropThresh = 0.75; // Stable probability threshold across all slider ranges
        float dropout = step(dropThresh, hash(vec2(blockY * 0.05, time * 50.0 + 1.0)));

        // Shift uv.x horizontally instead of vertically so the block structures are immediately obvious
        uv.x += dropout * 0.04 * (hash(vec2(blockY, time + 2.0)) - 0.5) * intensity;

        col = texture(u_texture, uv).rgb;

        // Standard isolated Hue Shift wheel (independent of scanHash)
        vec3 k = vec3(0.57735, 0.57735, 0.57735);
        float cosA = cos(u_hueShift * 6.28318);
        float sinA = sin(u_hueShift * 6.28318);
        col = col * cosA + cross(k, col) * sinA + k * dot(k, col) * (1.0 - cosA);

    } else {
        // Mode 3: VHS-style tracking error + color bleed (modular tape noise)
        // Segment the vertical tracking lines into blocks by Block Size
        float blockY = floor(v_uv.y * bs) / bs;
        float tracking = sin(time * 20.0 + blockY * 100.0) * u_scanJitter * 0.015;
        uv.x += tracking * intensity;

        // Copy the texture channels coherently from the same deformed uv so that
        // at u_split = 0 the baseline image keeps its original colors (no artifacts).
        vec4 src = texture(u_texture, uv);
        col = src.rgb;

        // Head switching noise band at the bottom
        float headSwitch = smoothstep(0.95, 1.0, v_uv.y) * hash(vec2(time * 100.0, 0.0)) * u_noiseAmount;
        col += headSwitch * vec3(0.5, 0.0, -0.3);

        vec3 k = vec3(0.57735, 0.57735, 0.57735);
        float cosA = cos(u_hueShift * 6.28318);
        float sinA = sin(u_hueShift * 6.28318);
        col = col * cosA + cross(k, col) * sinA + k * dot(k, col) * (1.0 - cosA);
    }

    // Global RGB Split overlay — driven natively by the RGB Split slider (u_split)
    if (u_split > 0.0) {
        vec2 rgbOff = vec2(safeDiv(u_split * intensity, max(u_resolution.x, 1.0)), 0.0);
        float rS = texture(u_texture, uv + rgbOff).r;
        float bS = texture(u_texture, uv - rgbOff).b;
        col.r = rS;
        col.b = bS;
    }

    // Global Noise Grain overlay — high-frequency grain driven by the Noise slider (u_noiseAmount)
    if (u_noiseAmount > 0.0) {
        float grain = fract(sin(dot(v_uv, vec2(12.9898, 78.233)) + u_time) * 43758.5453);
        col = mix(col, col + (grain - 0.5) * 0.3, u_noiseAmount);
    }

    float a = texture(u_texture, uv).a;
    fragColor = vec4(clamp(col, 0.0, 1.0), a);
}
