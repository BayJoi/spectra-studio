#version 300 es
#include "header.glsl"
uniform float u_kind;
uniform float u_scale;
uniform float u_angle;
uniform float u_sharpness;
uniform float u_preserveColors;

void main() {
  vec2 uv = v_uv;
  vec3 rawColor = texture(u_texture, uv).rgb;
  float luma = luminance(rawColor);

  float size = max(2.0, u_scale);
  vec2 center = uv * u_resolution;
  float s = sin(radians(u_angle));
  float c = cos(radians(u_angle));
  vec2 rotated = vec2(center.x * c - center.y * s, center.x * s + center.y * c);
  vec2 grid = fract(rotated / size) - 0.5;

  float intensity = 0.0;
  float kind = floor(u_kind + 0.5);
  float dotSize = luma * 0.4 + 0.05;
  float transition = max(u_sharpness * 0.3, 0.04);

  if (kind < 0.5) {
    float dist = length(grid);
    intensity = 1.0 - smoothstep(dotSize, dotSize + transition, dist);
  } else if (kind < 1.5) {
    float dist = abs(grid.x);
    intensity = 1.0 - smoothstep(dotSize, dotSize + transition, dist);
  } else if (kind < 2.5) {
    float dist = max(abs(grid.x), abs(grid.y));
    intensity = 1.0 - smoothstep(dotSize, dotSize + transition, dist);
  } else {
    float dist1 = abs(grid.x + grid.y);
    float dist2 = abs(grid.x - grid.y);
    float w = luma * 0.65 + 0.05;
    float line1 = 1.0 - smoothstep(w, w + transition, dist1);
    float line2 = 1.0 - smoothstep(w, w + transition, dist2);
    intensity = max(line1, line2);
  }

  vec3 finalColor;
  if (u_preserveColors > 0.5) {
    finalColor = rawColor * intensity;
  } else {
    finalColor = vec3(intensity);
  }
  fragColor = vec4(finalColor, 1.0);
}
