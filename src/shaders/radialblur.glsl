#version 300 es
#include "header.glsl"
uniform float u_radius;
uniform vec2 u_center;
uniform float u_quality;
uniform float u_blurType;
uniform float u_weightMode;
uniform float u_aspect;

float gaussian(float x, float sigma) {
    return exp(-x * x / (2.0 * sigma * sigma)) / (sqrt(2.0 * 3.14159265) * sigma);
}

void main() {
    vec2 dir = v_uv - u_center;
    vec3 sum = vec3(0.0);
    float totalWeight = 0.0;
    
    int maxSamples = int(round(mix(8.0, 128.0, u_quality)));
    
    float strength = (u_radius / 100.0) * 0.25;
    float bt = step(0.5, u_blurType);
    float wm = floor(u_weightMode + 0.5);
    float aspect = max(u_aspect, 0.1);
    
    // Adjust for aspect
    dir.x *= aspect;
    
    if (bt > 0.5) {
        // Radial (spin) blur with adaptive sampling
        for (int i = 0; i < 128; i++) {
            if (i >= maxSamples) break;
            float t = float(i) / float(max(maxSamples - 1, 1));
            float angle = (t - 0.5) * strength * 31.4159;
            float ca = cos(angle);
            float sa = sin(angle);
            vec2 uv = clamp(u_center + vec2(dir.x * ca - dir.y * sa, dir.x * sa + dir.y * ca), 0.0, 1.0);
            
            float weight = 1.0;
            if (wm > 1.5) {
                // Box filter (uniform)
                weight = 1.0;
            } else if (wm > 0.5) {
                // Gaussian weight distribution
                float sigma = 0.5;
                weight = gaussian(t - 0.5, sigma);
            } else {
                // Center-weighted
                weight = 1.0 - abs(t - 0.5) * 2.0;
            }
            
            sum += texture(u_texture, uv).rgb * weight;
            totalWeight += weight;
        }
    } else {
        // Zoom blur with adaptive sampling
        for (int i = 0; i < 128; i++) {
            if (i >= maxSamples) break;
            float t = float(i) / float(max(maxSamples - 1, 1));
            vec2 uv = clamp(v_uv + dir * strength * (t - 0.5), 0.0, 1.0);
            
            float weight = 1.0;
            if (wm > 1.5) {
                weight = 1.0;
            } else if (wm > 0.5) {
                float sigma = 0.5;
                weight = gaussian(t - 0.5, sigma);
            } else {
                weight = 1.0 - abs(t - 0.5) * 2.0;
            }
            
            sum += texture(u_texture, uv).rgb * weight;
            totalWeight += weight;
        }
    }
    
    fragColor = vec4(sum / max(totalWeight, 0.0001), texture(u_texture, v_uv).a);
}