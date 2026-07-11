#version 300 es
#include "header.glsl"
uniform float u_aberrationAmount;
uniform float u_aberrationCurve;
uniform float u_aberrationAngle;
uniform float u_luminanceMask;

float edgeDetect(vec2 uv) {
    vec2 ts = 1.0 / u_resolution;
    float c = luminance(texture(u_texture, uv).rgb);
    float l = luminance(texture(u_texture, uv + vec2(-ts.x, 0.0)).rgb);
    float r = luminance(texture(u_texture, uv + vec2(ts.x, 0.0)).rgb);
    float u = luminance(texture(u_texture, uv + vec2(0.0, ts.y)).rgb);
    float d = luminance(texture(u_texture, uv + vec2(0.0, -ts.y)).rgb);
    float dx = abs(c - l) + abs(c - r);
    float dy = abs(c - u) + abs(c - d);
    return clamp((dx + dy) * 0.5, 0.0, 1.0);
}

void main() {
    vec2 uv = v_uv;
    vec2 c = uv - 0.5;
    float dist = length(c);

    float intensity = safePow(dist, u_aberrationCurve);

    float angleRad = u_aberrationAngle * (3.14159265 / 180.0);
    vec2 shiftDirection = vec2(cos(angleRad), sin(angleRad));

    float mask = 1.0;
    if (u_luminanceMask > 0.01) {
        float edge = edgeDetect(uv);
        mask = mix(1.0, edge, u_luminanceMask);
    }

    vec2 offset = shiftDirection * intensity * u_aberrationAmount * mask / max(u_resolution.x, 1.0);

    vec4 colorR = texture(u_texture, uv - offset);
    vec4 colorG = texture(u_texture, uv);
    vec4 colorB = texture(u_texture, uv + offset);

    fragColor = vec4(colorR.r, colorG.g, colorB.b, colorG.a);
}