#version 300 es
#include "header.glsl"
uniform float u_radius;

void main() {
    vec2 texel = 1.0 / u_resolution;
    float sigma = max(u_radius, 1.0); // Prevent divide by zero
    // Calculate kernel size based on sigma, cap at 35 to maintain 60fps
    int kernelSize = int(min(ceil(sigma * 2.5), 35.0)); 

    vec3 result = vec3(0.0);
    float weightSum = 0.0;

    for (int i = -kernelSize; i <= kernelSize; i++) {
        float weight = exp(-(float(i * i)) / (2.0 * sigma * sigma));
        result += texture(u_texture, v_uv + vec2(float(i) * texel.x, 0.0)).rgb * weight;
        weightSum += weight;
    }

    fragColor = vec4(result / weightSum, 1.0);
}
