import { FILTER_MANIFESTS } from '../filters/filter-registry';
import { createProgram, createProgramAsync } from './webgl-utils';

import vertexSrc from '../shaders/vertex.glsl';
import passthroughSrc from '../shaders/passthrough.glsl';

export type ProgramKey = string;

const VERTEX_FULL = `#version 300 es\n${vertexSrc}`;

const shaderModules = import.meta.glob('../shaders/*.glsl', { import: 'default', eager: true }) as Record<string, string>;

const SHADER_SOURCES: Record<string, string> = { passthrough: passthroughSrc };

for (const m of FILTER_MANIFESTS) {
  if (m.shader) {
    const mainSrc = shaderModules[`../shaders/${m.shader}.glsl`];
    if (mainSrc) SHADER_SOURCES[m.type] = mainSrc;
  }
  if (m.passes) {
    for (const pass of m.passes) {
      if (pass.shader === 'header') continue;
      const key = `${m.type}:${pass.shader}`;
      const filePath = `../shaders/${pass.shader}.glsl`;
      const src = shaderModules[filePath];
      if (src) {
        SHADER_SOURCES[key] = src;
      }
    }
  }
}

const PREWARM_BATCH = 3;

const hasIdleCallback = typeof requestIdleCallback !== 'undefined';

const scheduleIdle: (cb: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void) => number = hasIdleCallback
  ? requestIdleCallback
  : (cb: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void) => setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), 0) as unknown as number;

function cancelIdle(id: number) {
  if (hasIdleCallback) cancelIdleCallback(id);
  else clearTimeout(id);
}

export class ShaderLibrary {
  private gl: WebGL2RenderingContext;
  private cache = new Map<string, WebGLProgram>();
  private pending = new Map<string, WebGLProgram>();
  private hasParallel = false;
  private _prewarmKeys: string[] = [];
  private _prewarmIndex = 0;
  private _prewarmIdle = 0;
  private _prewarmDone = false;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.hasParallel = !!gl.getExtension('KHR_parallel_shader_compile');
  }

  getProgram(key: ProgramKey): WebGLProgram {
    const cached = this.cache.get(key);
    if (cached) return cached;

    const pendingProg = this.pending.get(key);
    if (pendingProg) {
      if (this.gl.getProgramParameter(pendingProg, this.gl.LINK_STATUS)) {
        this.pending.delete(key);
        this.cache.set(key, pendingProg);
        return pendingProg;
      }
      if (this.hasParallel) {
        const fallback = this.cache.get('passthrough');
        if (fallback) return fallback;
      }
    }

    const fragSource = SHADER_SOURCES[key];
    if (!fragSource) throw new Error(`Unknown shader key: ${key}`);
    const program = createProgram(this.gl, VERTEX_FULL, fragSource);
    if (!program) {
      throw new Error(`Shader "${key}" failed to compile or link`);
    }
    this.cache.set(key, program);
    return program;
  }

  prewarm() {
    this._prewarmKeys = Object.keys(SHADER_SOURCES).filter(k => !this.cache.has(k) && !this.pending.has(k));
    this._prewarmIndex = 0;
    this._prewarmDone = false;
    this._prewarmBatch();
  }

  private _prewarmBatch() {
    const end = Math.min(this._prewarmIndex + PREWARM_BATCH, this._prewarmKeys.length);
    for (let i = this._prewarmIndex; i < end; i++) {
      const key = this._prewarmKeys[i];
      try {
        if (this.hasParallel) {
          const program = createProgramAsync(this.gl, VERTEX_FULL, SHADER_SOURCES[key]);
          if (program) {
            if (this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
              this.cache.set(key, program);
            } else {
              this.pending.set(key, program);
            }
          }
        } else {
          const program = createProgram(this.gl, VERTEX_FULL, SHADER_SOURCES[key]);
          if (program) this.cache.set(key, program);
        }
      } catch (err) {
        console.warn(`Shader pre-compilation failed for "${key}":`, err);
      }
    }
    this._prewarmIndex = end;
    if (this._prewarmIndex < this._prewarmKeys.length) {
      this._prewarmIdle = scheduleIdle(() => this._prewarmBatch());
    } else {
      this._prewarmDone = true;
    }
  }

  hasPending(): boolean {
    return this.pending.size > 0;
  }

  dispose() {
    if (this._prewarmIdle) cancelIdle(this._prewarmIdle);
    this.cache.forEach((p) => this.gl.deleteProgram(p));
    this.cache.clear();
    this.pending.forEach((p) => this.gl.deleteProgram(p));
    this.pending.clear();
    this._prewarmKeys = [];
    this._prewarmIndex = 0;
    this._prewarmDone = false;
  }
}
