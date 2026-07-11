#version 300 es
#include "header.glsl"
uniform float u_cellSize;
uniform float u_aspect;
uniform float u_posterize;
uniform float u_gridType;
uniform float u_aa;
uniform float u_rotation;

vec4 aaSample(sampler2D tex, vec2 uv, vec2 texelSize) {
    vec4 sum = texture(tex, uv);
    sum += texture(tex, uv + vec2(texelSize.x, 0.0));
    sum += texture(tex, uv + vec2(-texelSize.x, 0.0));
    sum += texture(tex, uv + vec2(0.0, texelSize.y));
    sum += texture(tex, uv + vec2(0.0, -texelSize.y));
    sum += texture(tex, uv + texelSize);
    sum += texture(tex, uv - texelSize);
    sum += texture(tex, uv + vec2(texelSize.x, -texelSize.y));
    sum += texture(tex, uv + vec2(-texelSize.x, texelSize.y));
    return sum / 9.0;
}

void main() {
    vec2 safeRes = max(u_resolution, vec2(1.0));
    vec2 fragCoord = v_uv * safeRes;
    vec2 cellSize = vec2(u_cellSize, u_cellSize * max(u_aspect, 0.1));
    vec2 texelSize = vec2(1.0, 1.0) / safeRes;

    float gt = floor(u_gridType + 0.5);
    float rotation = u_rotation;
    float aspect = safeDiv(u_resolution.x, u_resolution.y);

    vec2 coord;
    vec2 uv = v_uv;

    if (rotation > 0.01) {
        vec2 r = uv - 0.5;
        r.x *= aspect;
        r = rot2(radians(rotation)) * r;
        r.x /= aspect;
        uv = r + 0.5;
        fragCoord = uv * safeRes;
    }

    if (gt > 2.5) {
        float s = cellSize.x;
        float h = s * 0.8660254;
        float row = floor(fragCoord.y / h);
        float off = mod(row, 2.0) * s * 0.5;
        float col = floor((fragCoord.x - off) / s);
        vec2 ori = vec2(col * s + off, row * h);
        vec2 loc = fragCoord - ori;
        float slp = (s * 0.5) / h;
        vec2 ctd = vec2(s * 0.5, h * 0.3333333);
        if (loc.x > slp * loc.y) {
            if (loc.x < s - slp * loc.y) {
                ctd = vec2(s * 0.5, h * 0.3333333);
            } else {
                ctd = vec2(s * 0.8333333, h * 0.6666667);
            }
        } else {
            ctd = vec2(s * 0.1666667, h * 0.6666667);
        }
        coord = ori + ctd;
    } else if (gt > 1.5) {
        float hexH = cellSize.x * 0.8660254;
        float row = floor(fragCoord.y / hexH + 0.5);
        float oddRow = mod(row, 2.0);
        float colOffset = oddRow * cellSize.x * 0.5;
        float col = floor((fragCoord.x - colOffset) / cellSize.x + 0.5);
        coord = vec2(col * cellSize.x + colOffset, row * hexH);
    } else if (gt > 0.5) {
        vec2 p = fragCoord / cellSize;
        vec2 r = vec2(p.x * 0.7071 - p.y * 0.7071, p.x * 0.7071 + p.y * 0.7071);
        vec2 cell = floor(r);
        vec2 inv = vec2(cell.x * 0.7071 + cell.y * 0.7071, -cell.x * 0.7071 + cell.y * 0.7071);
        coord = (inv + 0.5) * cellSize;
    } else {
        vec2 cell = floor(fragCoord / cellSize);
        coord = cell * cellSize + cellSize * 0.5;
    }

    vec2 sampleUV = coord / safeRes;

    vec4 col;
    if (u_aa > 0.01) {
        col = aaSample(u_texture, sampleUV, texelSize);
    } else {
        col = texture(u_texture, sampleUV);
    }

    float pz = floor(u_posterize + 0.5);
    if (pz > 0.5) {
        float levels = max(pz + 1.0, 2.0);
        col.rgb = floor(col.rgb * levels) / levels;
    }

    if (rotation > 0.01) {
        vec2 r = uv - 0.5;
        r.x *= aspect;
        r = rot2(radians(-rotation)) * r;
        r.x /= aspect;
        uv = r + 0.5;
    }

    fragColor = col;
}
