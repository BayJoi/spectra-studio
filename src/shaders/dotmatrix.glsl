#version 300 es
#include "header.glsl"
uniform float u_cellSize;
uniform float u_dotSize;
uniform float u_gap;
uniform float u_glow;
uniform float u_subpixel;
uniform float u_gamma;

void main() {
    vec2 fragCoord = v_uv * u_resolution;
    vec2 safeCellSize = vec2(max(u_cellSize, 1.0));
    vec2 safeRes = max(u_resolution, vec2(1.0));
    vec2 cell = floor(fragCoord / safeCellSize);
    vec2 cellCenterUV = (cell + 0.5) * safeCellSize / safeRes;
    vec4 src = texture(u_texture, cellCenterUV);

    vec2 local = fract(fragCoord / safeCellSize);
    vec3 col = vec3(0.0);

    if (u_subpixel > 0.5) {
        float stripe = local.x * 3.0;
        int idx = int(floor(stripe));
        vec2 sp = vec2(fract(stripe), local.y);

        float hx = 1.0 - safeSmoothstep(u_dotSize * 0.5, u_dotSize * 0.5 + 0.05, abs(sp.x - 0.5));
        float hy = 1.0 - safeSmoothstep(u_dotSize * 0.5, u_dotSize * 0.5 + 0.05, abs(sp.y - 0.5));
        float pill = hx * hy;

        float glowHx = 1.0 - safeSmoothstep(u_dotSize * 0.5, u_dotSize * 0.5 + 0.2, abs(sp.x - 0.5));
        float glowHy = 1.0 - safeSmoothstep(u_dotSize * 0.5, u_dotSize * 0.5 + 0.2, abs(sp.y - 0.5));
        float glowPill = glowHx * glowHy;

        float innerGap = safeSmoothstep(0.0, u_gap, sp.x) * safeSmoothstep(0.0, u_gap, 1.0 - sp.x);
        pill *= innerGap;
        glowPill *= innerGap;

        vec3 channel = (idx == 0) ? vec3(src.r, 0.0, 0.0)
                     : (idx == 1) ? vec3(0.0, src.g, 0.0)
                                  :  vec3(0.0, 0.0, src.b);

        col = channel * (pill + glowPill * u_glow * 0.35);
    } else {
        vec2 d = (local - 0.5) * 2.0;
        float r = length(d);
        float dot = 1.0 - safeSmoothstep(u_dotSize - 0.05, u_dotSize, r);
        float glowDot = 1.0 - safeSmoothstep(u_dotSize - 0.05, u_dotSize + 0.15, r);
        col = src.rgb * (dot + glowDot * u_glow * 0.35);
    }

    float gapX = safeSmoothstep(0.0, u_gap, local.x) * safeSmoothstep(0.0, u_gap, 1.0 - local.x);
    float gapY = safeSmoothstep(0.0, u_gap, local.y) * safeSmoothstep(0.0, u_gap, 1.0 - local.y);
    col *= gapX * gapY;

    col *= src.a;

    col = pow(col, vec3(1.0 / max(u_gamma, 0.01)));

    fragColor = vec4(col, src.a);
}
