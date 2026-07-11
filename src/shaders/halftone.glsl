#version 300 es
#include "header.glsl"
uniform float u_cellSize;
uniform float u_angle;
uniform float u_contrast;
uniform float u_dotShape;
uniform float u_invert;
uniform float u_dotGain;
uniform float u_softness;
uniform float u_threshold;

float dotPattern(vec2 pos, float shape) {
    float s = floor(shape + 0.5);
    if (s > 3.5) {
        return max(abs(pos.x), abs(pos.y)) - min(abs(pos.x), abs(pos.y)) * 0.3;
    } else if (s > 2.5) {
        return max(abs(pos.x), abs(pos.y));
    } else if (s > 1.5) {
        return abs(pos.x) + abs(pos.y);
    } else if (s > 0.5) {
        return abs(pos.x);
    }
    return length(pos);
}

float dotCoverage(float dist, float radius, float softness) {
    if (radius <= 0.001) return 0.0;
    float edgeWidth = max(softness * radius, 0.5);
    float inner = max(radius - edgeWidth, 0.0);
    return 1.0 - smoothstep(inner, radius + edgeWidth, dist);
}

void main() {
    float threshBias = u_threshold - 0.5;

    vec2 safeRes = max(u_resolution, vec2(1.0));
    vec2 rotated = rotateUV(v_uv, u_angle);
    vec2 fragCoord = rotated * safeRes;
    vec2 cellCoord = floor(fragCoord / max(u_cellSize, 1.0));
    vec2 cellCenterRotated = (cellCoord + 0.5) * max(u_cellSize, 1.0);
    vec2 cellCenterUV = cellCenterRotated / safeRes;
    vec2 unrotated = rotateUV(cellCenterUV, -u_angle);

    vec3 src = texture(u_texture, unrotated).rgb;
    float lum = luminance(src);
    lum = clamp((lum - 0.5) * (1.0 + u_contrast) + 0.5, 0.0, 1.0);
    lum = clamp(lum + threshBias, 0.0, 1.0);

    float dist = dotPattern(fragCoord - cellCenterRotated, u_dotShape);
    float radius = (1.0 - lum) * (u_cellSize * 0.48);
    radius *= (1.0 + u_dotGain);

    float dot = dotCoverage(dist, radius, u_softness);
    dot = mix(dot, 1.0 - dot, u_invert);

    fragColor = vec4(mix(vec3(1.0), vec3(0.0), dot), texture(u_texture, unrotated).a);
}