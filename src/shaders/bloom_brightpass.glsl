#version 300 es
#include "header.glsl"
uniform float u_threshold;

void main() {
  vec3 color = texture(u_texture, v_uv).rgb;
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float pass = smoothstep(u_threshold, u_threshold + 0.15, lum);
  fragColor = vec4(color * pass, 1.0);
}
