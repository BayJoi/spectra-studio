#version 300 es
#include "header.glsl"
uniform float u_intensity;
uniform sampler2D u_bloomTex;

void main() {
  vec4 color = texture(u_texture, v_uv);
  vec3 bloom = texture(u_bloomTex, v_uv).rgb;
  fragColor = vec4(color.rgb + bloom * u_intensity, color.a);
}
