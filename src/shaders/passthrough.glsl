#version 300 es
#include "header.glsl"
void main() {
  fragColor = texture(u_texture, v_uv);
}
