import type { FilterData } from '../store/atoms';
import { jotaiStore, filtersAtom } from '../store/atoms';
import { ShaderLibrary, type ProgramKey } from './shader-library';
import { loadHTMLImage, createFullscreenQuad, createUploadTexture, createRenderTargetTexture } from './webgl-utils';
import { createFontAtlasAsync, type FontAtlas } from './fontAtlas';
import { filterManifestByType } from '../filters/filter-registry';

const MAX_DIMENSION = 16384;

function createOffscreenCanvas(w: number, h: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

interface RenderTarget {
  fbo: WebGLFramebuffer;
  texture: WebGLTexture;
  w: number;
  h: number;
}

export class EffectEngine {
  private gl!: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private shaders!: ShaderLibrary;

  private quadVAO: WebGLVertexArrayObject | null = null;
  private quadBuffer: WebGLBuffer | null = null;

  private fontAtlas: FontAtlas | null = null;
  private fontAtlasPromise: Promise<void> | null = null;

  private sourceTexture: WebGLTexture | null = null;
  private sourceImage: HTMLImageElement | null = null;
  private fullWidth = 0;
  private fullHeight = 0;
  private width = 0;
  private height = 0;
  private _renderScale = 1.0;

  private targetA: RenderTarget | null = null;
  private targetB: RenderTarget | null = null;
  private extraTargets: RenderTarget[] = [];
  private extraTargetIndex = 0;

  private _disposed = false;
  private _hidden = false;
  private _rendering = false;
  private _lastViewW = 0;
  private _lastViewH = 0;
  private _rtFormat!: number;
  private _uniformCache = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
  private _onContextLost: ((e: Event) => void) | null = null;
  private _onContextRestored: (() => void) | null = null;

  set hidden(v: boolean) { this._hidden = v; }

  setRenderScale(scale: number) {
    if (scale === this._renderScale || this._disposed) return;
    this._renderScale = scale;
    if (this.fullWidth > 0 && this.fullHeight > 0) {
      this._applyRenderScale();
    }
  }

  private _applyRenderScale() {
    const gl = this.gl;
    if (gl.isContextLost()) return;

    this.width = Math.max(1, Math.round(this.fullWidth * this._renderScale));
    this.height = Math.max(1, Math.round(this.fullHeight * this._renderScale));

    this.canvas.width = this.fullWidth;
    this.canvas.height = this.fullHeight;

    this._disposeRT(this.targetA); this.targetA = null;
    this._disposeRT(this.targetB); this.targetB = null;
    this.extraTargets.forEach(rt => this._disposeRT(rt));
    this.extraTargets = [];
    this.targetA = this._makeRT(this.width, this.height);
    this.targetB = this._makeRT(this.width, this.height);

    if (this.sourceImage && this._renderScale < 1.0) {
      const offscreen = createOffscreenCanvas(this.width, this.height);
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.drawImage(this.sourceImage, 0, 0, this.width, this.height);
        if (this.sourceTexture) { gl.deleteTexture(this.sourceTexture); this.sourceTexture = null; }
        this.sourceTexture = createUploadTexture(gl, offscreen, true);
      }
    } else if (this.sourceImage) {
      if (this.sourceTexture) { gl.deleteTexture(this.sourceTexture); this.sourceTexture = null; }
      this.sourceTexture = createUploadTexture(gl, this.sourceImage, true);
    }
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this._initGL();

    this._onContextLost = (e: Event) => e.preventDefault();
    this._onContextRestored = () => this._handleContextRestored();
    canvas.addEventListener('webglcontextlost', this._onContextLost);
    canvas.addEventListener('webglcontextrestored', this._onContextRestored);
  }

  private _initGL() {
    const gl = this.canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    }) as WebGL2RenderingContext | null;
    if (!gl) throw new Error('WebGL2 not available');
    this.gl = gl;

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    const floatExt = gl.getExtension('EXT_color_buffer_float');
    this._rtFormat = floatExt ? gl.RGBA16F : gl.RGBA8;
    gl.getExtension('OES_texture_half_float_linear');

    this.shaders?.dispose();
    this.shaders = new ShaderLibrary(gl);
    queueMicrotask(() => { if (!this._disposed) this.shaders.prewarm(); });
    this._uniformCache.clear();

    const { vao, buffer } = createFullscreenQuad(gl);
    if (!vao || !buffer) throw new Error('Failed to create fullscreen quad');
    this.quadVAO = vao;
    this.quadBuffer = buffer;
  }

  private _handleContextRestored() {
    if (this._disposed) return;
    try {
      this._initGL();
    } catch {
      return;
    }

    this.sourceTexture = null;
    this.fontAtlas = null;
    this.fontAtlasPromise = null;
    this.targetA = null;
    this.targetB = null;
    this.extraTargets = [];

    if (this.sourceImage) {
      this.loadImage(this.sourceImage.src);
    }
  }

  async loadImage(url: string): Promise<{ width: number; height: number }> {
    const img = await loadHTMLImage(url);
    if (this._disposed) return { width: 0, height: 0 };
    this.sourceImage = img;
    const gl = this.gl;

    if (gl.isContextLost()) {
      throw new Error('WebGL2 context was lost. Reload the page.');
    }

    const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
    const maxRBSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 4096;
    const gpuCap = Math.min(maxTexSize, maxRBSize);
    const cap = gpuCap > 0 ? Math.min(MAX_DIMENSION, gpuCap) : 4096;

    let width = img.naturalWidth;
    let height = img.naturalHeight;
    if (width < 1 || height < 1) {
      throw new Error(`Image has no dimensions (${width}x${height}). The file may be corrupt or in an unsupported format.`);
    }

    let uploadSource: TexImageSource = img;
    const longEdge = Math.max(width, height);
    if (longEdge > cap) {
      const scale = cap / longEdge;
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      if (width < 1 || height < 1) {
        throw new Error(`Image dimensions (${img.naturalWidth}x${img.naturalHeight}) exceed GPU limits (${cap}). Cannot scale down.`);
      }
      const offscreen = createOffscreenCanvas(width, height);
      const ctx = offscreen.getContext('2d');
      if (!ctx) throw new Error('Failed to create offscreen canvas for image scaling');
      ctx.drawImage(img, 0, 0, width, height);
      uploadSource = offscreen;
    }

    this.fullWidth = width;
    this.fullHeight = height;

    this.width = Math.max(1, Math.round(width * this._renderScale));
    this.height = Math.max(1, Math.round(height * this._renderScale));

    this.canvas.width = this.fullWidth;
    this.canvas.height = this.fullHeight;
    gl.viewport(0, 0, this.fullWidth, this.fullHeight);

    if (this.sourceTexture) { gl.deleteTexture(this.sourceTexture); this.sourceTexture = null; }
    this.sourceTexture = createUploadTexture(gl, uploadSource, true);
    if (!this.sourceTexture) throw new Error('Failed to upload texture to GPU');

    this._disposeRT(this.targetA); this.targetA = null;
    this._disposeRT(this.targetB); this.targetB = null;
    this.extraTargets.forEach(rt => this._disposeRT(rt));
    this.extraTargets = [];
    this.targetA = this._makeRT(this.width, this.height);
    this.targetB = this._makeRT(this.width, this.height);

    return { width: this.width, height: this.height };
  }

  private _makeRT(w: number, h: number): RenderTarget {
    const gl = this.gl;
    const texture = createRenderTargetTexture(gl, w, h, this._rtFormat);
    if (!texture) throw new Error('Failed to create render target texture');
    const fbo = gl.createFramebuffer();
    if (!fbo) throw new Error('Failed to create framebuffer');
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    if (status !== gl.FRAMEBUFFER_COMPLETE && this._rtFormat !== gl.RGBA8) {
      gl.deleteFramebuffer(fbo);
      gl.deleteTexture(texture);
      this._rtFormat = gl.RGBA8;
      return this._makeRT(w, h);
    }
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      gl.deleteFramebuffer(fbo);
      gl.deleteTexture(texture);
      throw new Error(`Framebuffer incomplete (${status.toString(16)}) — GPU may not support this resolution`);
    }
    return { fbo, texture, w, h };
  }

  private _disposeRT(rt: RenderTarget | null) {
    if (!rt) return;
    this.gl.deleteFramebuffer(rt.fbo);
    this.gl.deleteTexture(rt.texture);
  }

  isAnimated(filters: FilterData[]): boolean {
    return filters.some(f => f.enabled && filterManifestByType.get(f.type)?.isAnimated);
  }

  private allocTarget(scale = 1): RenderTarget {
    const w = Math.max(1, Math.round(this.width * scale));
    const h = Math.max(1, Math.round(this.height * scale));
    const idx = this.extraTargetIndex++;
    if (idx < this.extraTargets.length) {
      const existing = this.extraTargets[idx];
      if (existing.w === w && existing.h === h) {
        return existing;
      }
      this._disposeRT(existing);
      const rt = this._makeRT(w, h);
      this.extraTargets[idx] = rt;
      return rt;
    }
    const rt = this._makeRT(w, h);
    this.extraTargets.push(rt);
    return rt;
  }

  private resetTargetPool() {
    this.extraTargetIndex = 0;
    if (this.extraTargets.length > 16) {
      for (let i = 16; i < this.extraTargets.length; i++) {
        this._disposeRT(this.extraTargets[i]);
      }
      this.extraTargets.length = 16;
    }
  }

  private _uniformLoc(program: WebGLProgram, name: string): WebGLUniformLocation | null {
    let cache = this._uniformCache.get(program);
    if (!cache) {
      cache = new Map();
      this._uniformCache.set(program, cache);
    }
    if (!cache.has(name)) {
      cache.set(name, this.gl.getUniformLocation(program, name));
    }
    return cache.get(name)!;
  }

  private hashStringToUnit(str: string): number {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 100000) / 100000;
  }

  render(filters: FilterData[]): boolean {
    if (this._disposed) return false;
    if (this._hidden) return false;
    if (this._rendering) return false;
    const gl = this.gl;
    if (gl.isContextLost()) return false;
    if (!this.sourceTexture || !this.targetA || !this.targetB || this.width === 0) return false;

    this._rendering = true;

    this.resetTargetPool();

    const useIntermediate = this._renderScale < 1.0 && filters.length > 0;
    const finalDest = useIntermediate ? this.allocTarget(1) : null;
    const fullRes = useIntermediate ? [this.fullWidth, this.fullHeight] as [number, number] : undefined;

    if (filters.length === 0) {
      this._drawPass(this.shaders.getProgram('passthrough'), this.sourceTexture, null, 'passthrough', {}, this.width, this.height);
      this._rendering = false;
      return false;
    }

    let readTexture = this.sourceTexture;
    let writeTarget = this.targetA;
    let otherTarget = this.targetB;

    // The pipeline processes filters bottom-of-stack first (reverse array order):
    // filters[length-1] reads the source image, and the first ENABLED filter in
    // array order (top of stack) is processed last and must render to the screen.
    // Precompute its index — every other filter renders into the ping-pong chain.
    let finalEnabledIdx = -1;
    for (let i = 0; i < filters.length; i++) {
      if (filters[i].enabled) { finalEnabledIdx = i; break; }
    }

    for (let i = filters.length - 1; i >= 0; i--) {
      const filter = filters[i];
      if (!filter.enabled) continue;
      const manifest = filterManifestByType.get(filter.type);
      const isLast = i === finalEnabledIdx;

      // ASCII Beta 2 reuses the shared font atlas; build it standalone if needed.
      if (filter.type === 'AsciiBeta2' && !this.fontAtlas) {
        if (!this.fontAtlasPromise) {
          this.fontAtlasPromise = createFontAtlasAsync(gl).then((atlas: FontAtlas | null) => {
            if (this._disposed) { this.fontAtlasPromise = null; return; }
            this.fontAtlas = atlas;
            this.fontAtlasPromise = null;
            this._rendering = false;
            this.render(jotaiStore.get(filtersAtom));
          });
        }
        this._drawPass(this.shaders.getProgram('passthrough'), readTexture, isLast ? finalDest : writeTarget, 'passthrough', {}, this.width, this.height, undefined, undefined, undefined, fullRes);
        if (!isLast) {
          readTexture = writeTarget.texture;
          [writeTarget, otherTarget] = [otherTarget, writeTarget];
        }
        continue;
      }

      if (manifest?.passes && manifest.passes.length > 0) {
        let passRead = readTexture;
        const originalInput = readTexture;
        for (let pi = 0; pi < manifest.passes.length; pi++) {
          const passDef = manifest.passes[pi];
          const scale = passDef.scale ?? 1;
          const w = Math.max(1, Math.round(this.width * scale));
          const h = Math.max(1, Math.round(this.height * scale));

          const isLastPass = pi === manifest.passes.length - 1;
          const passDest = isLastPass && isLast ? finalDest : this.allocTarget(scale);

          const passKey = `${filter.type}:${passDef.shader}`;
          let program: WebGLProgram;
          try {
            program = this.shaders.getProgram(passKey);
          } catch (err) {
            console.warn("Shader fallback triggered:", err);
            program = this.shaders.getProgram('passthrough');
          }

          const baseTex = isLastPass ? originalInput : undefined;
          // All passes share the full-res coordinate space when rendering to the
          // intermediate target, so chained effects scale consistently at <100%.
          const passRes = fullRes;
          this._drawPass(program, passRead, passDest, passKey, filter.params, w, h, filter.id, baseTex, manifest, passRes);

          if (!isLastPass) {
            passRead = this.extraTargets[this.extraTargetIndex - 1]?.texture ?? passRead;
          } else if (!isLast) {
            readTexture = this.extraTargets[this.extraTargetIndex - 1]?.texture ?? passRead;
            [writeTarget, otherTarget] = [otherTarget, writeTarget];
          }
        }
        continue;
      }

      let passType: ProgramKey = filter.type;
      let program: WebGLProgram;
      try {
        program = this.shaders.getProgram(passType);
      } catch (err) {
        console.error(`[EffectEngine] Shader "${passType}" failed to compile, falling back to passthrough:`, err);
        program = this.shaders.getProgram('passthrough');
        passType = 'passthrough';
      }
      this._drawPass(program, readTexture, isLast ? finalDest : writeTarget, passType, filter.params, this.width, this.height, filter.id, undefined, manifest, fullRes);

      if (!isLast) {
        readTexture = writeTarget.texture;
        [writeTarget, otherTarget] = [otherTarget, writeTarget];
      }
    }

    if (finalEnabledIdx === -1) {
      this._drawPass(this.shaders.getProgram('passthrough'), this.sourceTexture, null, 'passthrough', {}, this.width, this.height);
    }

    if (useIntermediate && finalDest && finalEnabledIdx !== -1) {
      this._drawPass(this.shaders.getProgram('passthrough'), finalDest.texture, null, 'passthrough', {}, this.fullWidth, this.fullHeight);
    }

    this._rendering = false;
    return this.shaders.hasPending();
  }

  private _drawPass(
    program: WebGLProgram,
    inputTexture: WebGLTexture,
    destination: RenderTarget | null,
    passType: string,
    params: Record<string, number>,
    width: number,
    height: number,
    seedKey?: string,
    baseTexture?: WebGLTexture,
    manifest?: { uniforms: (params: Record<string, number>, ctx: { seed: number; fontAtlas: FontAtlas | null }) => Record<string, { kind: string; v: number | [number, number] }> },
    resolution?: [number, number],
  ) {
    const gl = this.gl;

    const isScreen = destination === null;
    const viewW = isScreen ? this.fullWidth : width;
    const viewH = isScreen ? this.fullHeight : height;

    if (destination) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, destination.fbo);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    if (viewW !== this._lastViewW || viewH !== this._lastViewH) {
      gl.viewport(0, 0, viewW, viewH);
      this._lastViewW = viewW;
      this._lastViewH = viewH;
    }

    gl.bindVertexArray(this.quadVAO);
    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    if (baseTexture) {
      gl.bindTexture(gl.TEXTURE_2D, baseTexture);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, inputTexture);
    }
    gl.uniform1i(this._uniformLoc(program, 'u_texture'), 0);

    if (baseTexture) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, inputTexture);
      gl.uniform1i(this._uniformLoc(program, 'u_bloomTex'), 1);
    }

    const resW = resolution ? resolution[0] : width;
    const resH = resolution ? resolution[1] : height;
    gl.uniform2f(this._uniformLoc(program, 'u_resolution'), resW, resH);

    if (passType !== 'passthrough') {
      if (manifest) {
        const seed = params.seed ?? this.hashStringToUnit(seedKey ?? passType);
        const ctx = { seed, fontAtlas: this.fontAtlas };
        const uniforms = manifest.uniforms(params, ctx);
        for (const name in uniforms) {
          const loc = this._uniformLoc(program, name);
          if (loc === null) continue;
          const u = uniforms[name];
          if (u.kind === '1f') gl.uniform1f(loc, u.v as number);
          else gl.uniform2f(loc, (u.v as [number, number])[0], (u.v as [number, number])[1]);
        }
      }

      if (this.fontAtlas) {
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.fontAtlas.texture);
        gl.uniform1i(this._uniformLoc(program, 'u_fontAtlas'), 2);
      }
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  async exportBlob(filters?: FilterData[], mimeType = 'image/png', quality?: number): Promise<Blob | null> {
    if (this._disposed) return null;
    if (this.gl.isContextLost()) return null;
    if (this._rendering) {
      try {
        await new Promise<void>((resolve, reject) => {
          const start = Date.now();
          const check = () => {
            if (this._disposed) { reject(new Error('Engine disposed')); return; }
            if (!this._rendering) { resolve(); return; }
            if (Date.now() - start > 10000) { reject(new Error('Export timed out')); return; }
            setTimeout(check, 16);
          };
          check();
        });
      } catch {
        return null;
      }
    }

    if (this._disposed) return null;

    const prevScale = this._renderScale;
    if (prevScale !== 1.0) {
      this._renderScale = 1.0;
      this._applyRenderScale();
    }

    if (filters) this.render(filters);
    if (this._disposed) return null;

    const blob = await new Promise<Blob | null>((resolve) => {
      if (this._disposed) { resolve(null); return; }
      this.canvas.toBlob((b) => resolve(b), mimeType, quality);
    });

    if (prevScale !== 1.0) {
      this._renderScale = prevScale;
      this._applyRenderScale();
    }

    return blob;
  }

  clear() {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  dispose() {
    const gl = this.gl;
    this._disposed = true;
    if (this._onContextLost) this.canvas.removeEventListener('webglcontextlost', this._onContextLost);
    if (this._onContextRestored) this.canvas.removeEventListener('webglcontextrestored', this._onContextRestored);
    this._onContextLost = null;
    this._onContextRestored = null;
    if (this.sourceTexture) gl.deleteTexture(this.sourceTexture);
    if (this.fontAtlas) gl.deleteTexture(this.fontAtlas.texture);
    if (this.quadVAO) gl.deleteVertexArray(this.quadVAO);
    if (this.quadBuffer) gl.deleteBuffer(this.quadBuffer);
    this._disposeRT(this.targetA);
    this._disposeRT(this.targetB);
    this.extraTargets.forEach(rt => this._disposeRT(rt));
    this.extraTargets = [];
    this._uniformCache.clear();
    this.sourceTexture = null;
    this.targetA = null;
    this.targetB = null;
    this.quadVAO = null;
    this.quadBuffer = null;
    this.fontAtlas = null;
    this.fontAtlasPromise = null;
    this.sourceImage = null;
    this.shaders.dispose();
  }
}
