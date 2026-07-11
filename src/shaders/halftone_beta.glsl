#version 300 es
#include "header.glsl"
uniform float u_dotSize;
uniform float u_frequency;
uniform float u_angle;
uniform float u_softness;
uniform float u_contrast;
uniform float u_invert;
uniform float u_mix;
uniform float u_shapeType;
uniform float u_colorMode;
uniform float u_chA;
uniform float u_chB;
uniform float u_chC;
uniform float u_chD;

float sdfCircle(vec2 p, float r) {
    return length(p) - r;
}

float sdfLine(vec2 p, float r) {
    return abs(p.y) - r;
}

float sdfDiamond(vec2 p, float r) {
    return (abs(p.x) + abs(p.y)) - r;
}

float sdfSquare(vec2 p, float r) {
    vec2 d = abs(p) - vec2(r);
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdfCross(vec2 p, float r) {
    float armT = r * 0.5;
    float a1 = max(abs(p.x) - r, abs(p.y) - armT);
    float a2 = max(abs(p.y) - r, abs(p.x) - armT);
    return min(a1, a2);
}

float sdfHexagon(vec2 p, float r) {
    const vec3 k = vec3(-0.8660254, 0.5, 0.5773503);
    p = abs(p);
    p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
    return length(p - vec2(clamp(p.x, -k.z * r, k.z * r), r)) * sign(p.y - r);
}

float getSDF(vec2 p, float r, int shapeType) {
    if (shapeType == 0) return sdfCircle(p, r);
    if (shapeType == 1) return sdfLine(p, r);
    if (shapeType == 2) return sdfCross(p, r);
    if (shapeType == 3) return sdfDiamond(p, r);
    if (shapeType == 4) return sdfSquare(p, r);
    if (shapeType == 5) return sdfHexagon(p, r);
    return sdfCircle(p, r);
}

float halftoneScreen(vec2 uv, float angle, float density, float maxRadius) {
    float intensity = clamp((density - 0.5) * u_contrast + 0.5, 0.0, 1.0);
    float r = safeSqrt(intensity) * maxRadius;
    if (r < 0.001) return 0.0;
    mat2 rot = rot2(radians(angle));
    vec2 p = rot * (uv * u_frequency);
    vec2 local = fract(p) - 0.5;
    float d = getSDF(local, r, int(u_shapeType));
    float aa = fwidth(d) * u_softness;
    return 1.0 - safeSmoothstep(-aa, aa, d);
}

void main() {
    vec4 original = texture(u_texture, v_uv);
    vec3 color = original.rgb;
    float maxRadius = 0.7071 * u_dotSize;
    vec3 halftoneColor;
    int cm = int(u_colorMode);

    if (cm == 0) {
        float lum = luminance(color);
        float coverage = halftoneScreen(v_uv, u_angle, 1.0 - lum, maxRadius);
        if (u_invert > 0.5) coverage = 1.0 - coverage;
        halftoneColor = vec3(1.0 - coverage);
    } else if (cm == 1) {
        float covR = halftoneScreen(v_uv, u_chA, color.r, maxRadius);
        float covG = halftoneScreen(v_uv, u_chB, color.g, maxRadius);
        float covB = halftoneScreen(v_uv, u_chC, color.b, maxRadius);
        if (u_invert > 0.5) { covR = 1.0 - covR; covG = 1.0 - covG; covB = 1.0 - covB; }
        halftoneColor = vec3(covR, covG, covB);
    } else {
        float r = color.r, g = color.g, b = color.b;
        float k = 1.0 - max(r, max(g, b));
        float c = 0.0, m = 0.0, y = 0.0;
        if (k < 1.0) { c = safeDiv(1.0 - r - k, 1.0 - k); m = safeDiv(1.0 - g - k, 1.0 - k); y = safeDiv(1.0 - b - k, 1.0 - k); }
        float covC = halftoneScreen(v_uv, u_chA, c, maxRadius);
        float covM = halftoneScreen(v_uv, u_chB, m, maxRadius);
        float covY = halftoneScreen(v_uv, u_chC, y, maxRadius);
        float covK = halftoneScreen(v_uv, u_chD, k, maxRadius);
        if (u_invert > 0.5) { covC = 1.0 - covC; covM = 1.0 - covM; covY = 1.0 - covY; covK = 1.0 - covK; }
        halftoneColor = clamp(1.0 - vec3(covC, covM, covY) - vec3(covK), 0.0, 1.0);
    }

    fragColor = vec4(mix(color, halftoneColor, u_mix), original.a);
}