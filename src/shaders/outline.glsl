#version 300 es
#include "header.glsl"
uniform float u_thickness;
uniform float u_threshold;
uniform float u_showOriginal;
uniform float u_invertEdge;
uniform float u_kernelType;
uniform float u_edgeColor;
uniform float u_edgeWidth;
uniform float u_smoothness;

void main() {
    vec2 texel = u_thickness / max(u_resolution, vec2(1.0));
    float centerLum = luminance(texture(u_texture, v_uv).rgb);
    
    // Sample 3x3 neighborhood
    float tl = luminance(texture(u_texture, v_uv + texel * vec2(-1.0, -1.0)).rgb);
    float t  = luminance(texture(u_texture, v_uv + texel * vec2( 0.0, -1.0)).rgb);
    float tr = luminance(texture(u_texture, v_uv + texel * vec2( 1.0, -1.0)).rgb);
    float l  = luminance(texture(u_texture, v_uv + texel * vec2(-1.0,  0.0)).rgb);
    float r  = luminance(texture(u_texture, v_uv + texel * vec2( 1.0,  0.0)).rgb);
    float bl = luminance(texture(u_texture, v_uv + texel * vec2(-1.0,  1.0)).rgb);
    float b  = luminance(texture(u_texture, v_uv + texel * vec2( 0.0,  1.0)).rgb);
    float br = luminance(texture(u_texture, v_uv + texel * vec2( 1.0,  1.0)).rgb);
    float center = centerLum;

    float gx, gy;
    float kt = floor(u_kernelType + 0.5);

    if (kt > 2.5) {
        // Prewitt
        gx = -tl - t - tr + bl + b + br;
        gy = -tl - l - bl + tr + r + br;
    } else if (kt > 1.5) {
        // Laplacian
        float laplacian = -tl - t - tr - l + 8.0 * center - r - bl - b - br;
        float edge = clamp(abs(laplacian) * 0.5, 0.0, 1.0);
        float halfWidth = max(u_edgeWidth * 0.1, 0.001);
        edge = smoothstep(clamp(u_threshold - halfWidth, 0.0, 1.0), clamp(u_threshold + halfWidth + u_smoothness, 0.0, 1.0), edge);
        vec4 src = texture(u_texture, v_uv);
        vec3 edgeColorVal = mix(vec3(1.0), vec3(0.0), step(0.5, u_invertEdge));
        float ec = u_edgeColor;
        vec3 tinted = mix(edgeColorVal, src.rgb * 2.0, ec);
        vec3 bg = mix(vec3(1.0) - tinted, src.rgb, u_showOriginal);
        fragColor = vec4(mix(bg, tinted, edge), src.a);
        return;
    } else if (kt > 0.5) {
        // Scharr
        gx = -3.0 * tl - 10.0 * t - 3.0 * tr + 3.0 * bl + 10.0 * b + 3.0 * br;
        gy = -3.0 * tl - 10.0 * l - 3.0 * bl + 3.0 * tr + 10.0 * r + 3.0 * br;
    } else {
        // Sobel (default)
        gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
        gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
    }

    float edge = clamp(length(vec2(gx, gy)), 0.0, 1.0);
    float halfWidth = max(u_edgeWidth * 0.1, 0.001);
    edge = smoothstep(clamp(u_threshold - halfWidth, 0.0, 1.0), clamp(u_threshold + halfWidth + u_smoothness, 0.0, 1.0), edge);

    vec4 src = texture(u_texture, v_uv);
    vec3 edgeColorVal = mix(vec3(1.0), vec3(0.0), step(0.5, u_invertEdge));
    float ec = u_edgeColor;
    vec3 tinted = mix(edgeColorVal, src.rgb * 2.0, ec);
    vec3 bg = mix(vec3(1.0) - tinted, src.rgb, u_showOriginal);
    fragColor = vec4(mix(bg, tinted, edge), src.a);
}