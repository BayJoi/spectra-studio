#version 300 es
#include "header.glsl"
uniform float u_lineWidth;
uniform float u_lineContrast;
uniform float u_noise;
uniform float u_vignetting;
uniform float u_seed;
uniform float u_phosphor;
uniform float u_curvature;
uniform float u_bloom;
uniform float u_colorTemp;

void main() {
    vec2 uv = v_uv;
    
    // Screen curvature
    float curv = u_curvature;
    if (curv > 0.01) {
        vec2 c = uv - 0.5;
        float dist = length(c);
        float factor = 1.0 + dist * dist * curv * 2.0;
        uv = c * factor + 0.5;
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
            fragColor = vec4(0.0, 0.0, 0.0, texture(u_texture, v_uv).a);
            return;
        }
    }

    float scanMask = sin(uv.y * u_resolution.y * 3.14159265 / max(u_lineWidth, 0.1)) * 0.5 + 0.5;

    vec3 rgb = texture(u_texture, uv).rgb;
    vec3 result = rgb * mix(vec3(1.0), vec3(scanMask), u_lineContrast);

    // Phosphor bloom — isotropic 2D (horizontal + vertical taps)
    if (u_bloom > 0.01) {
        vec3 bloom = vec3(0.0);
        for (int i = 1; i <= 4; i++) {
            vec2 off = vec2(float(i)) * 1.5 / max(u_resolution, vec2(1.0));
            bloom += texture(u_texture, uv + vec2( off.x, 0.0)).rgb;
            bloom += texture(u_texture, uv - vec2( off.x, 0.0)).rgb;
            bloom += texture(u_texture, uv + vec2(0.0,  off.y)).rgb;
            bloom += texture(u_texture, uv - vec2(0.0,  off.y)).rgb;
        }
        result += bloom * u_bloom * 0.1;
    }

    float n = hash(uv * u_resolution + u_seed);
    result += (n - 0.5) * u_noise;

    float ph = u_phosphor;
    if (ph > 0.01) {
        vec2 prevUv = uv - vec2(0.0, 1.0 / max(u_resolution.y, 1.0));
        vec3 prev = texture(u_texture, prevUv).rgb;
        result = mix(result, prev, ph * 0.5);
    }

    // Color temperature shift
    float temp = u_colorTemp;
    if (abs(temp) > 0.001) {
        vec3 warm = vec3(1.0, 0.9, 0.7);
        vec3 cool = vec3(0.8, 0.9, 1.0);
        vec3 tint = mix(cool, warm, temp * 0.5 + 0.5);
        result *= mix(vec3(1.0), tint, abs(temp));
    }

    vec2 c = uv - 0.5;
    float vig = clamp(1.0 - dot(c, c) * u_vignetting * 2.0, 0.0, 1.0);
    result *= vig;

    fragColor = vec4(clamp(result, 0.0, 1.0), texture(u_texture, v_uv).a);
}