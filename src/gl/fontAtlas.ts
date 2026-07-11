import { ASCII_RAMP, ASCII_EDGE_GLYPHS } from '../constants';

export interface FontAtlas {
  texture: WebGLTexture;
  numChars: number;
}

function renderChars(chars: string, cellPx: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = cellPx * chars.length;
  c.height = cellPx;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.floor(cellPx * 0.85)}px "JetBrains Mono", monospace`;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], i * cellPx + cellPx / 2, cellPx / 2 + cellPx * 0.05);
  }
  return c;
}

function uploadTexture(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement): WebGLTexture {
  const tex = gl.createTexture();
  if (!tex) throw new Error('Failed to create font atlas texture');
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  return tex;
}

async function loadFontAndRender(gl: WebGL2RenderingContext, chars: string, cellPx: number): Promise<FontAtlas> {
  try {
    await Promise.race([
      document.fonts.load(`800 ${Math.floor(cellPx * 0.85)}px "JetBrains Mono"`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('font timeout')), 2000)),
    ]);
  } catch (e) {
    console.warn('[FontAtlas] Font load failed, using fallback:', e);
  }
  const canvas = renderChars(chars, cellPx);
  const texture = uploadTexture(gl, canvas);
  return { texture, numChars: chars.length };
}

export async function createFontAtlasAsync(
  gl: WebGL2RenderingContext,
  cellPx = 48,
): Promise<FontAtlas> {
  return loadFontAndRender(gl, ASCII_RAMP + ASCII_EDGE_GLYPHS, cellPx);
}
