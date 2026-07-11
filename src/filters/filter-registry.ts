import type { FontAtlas } from '../gl/fontAtlas';

export type FilterType =
  | 'Bloom'
  | 'Noise'
  | 'Pixelate'
  | 'Glitch'
  | 'Halftone'
  | 'CRT'
  | 'Outline'
  | 'RadialBlur'
  | 'HoloGlitch'
  | 'ChromaticAberration'
  | 'Fluid'
  | 'Kaleidoscope'
  | 'DotMatrix'
  | 'HalftoneBeta'
  | 'HalftoneBeta2'
  | 'AsciiBeta2';

const ASCII_RAMP = ' .:-=+*#%@';
const ASCII_EDGE_GLYPHS = '-/|\\';

interface FilterPass {
  shader: string;
  scale?: number;
}

interface FilterParamConfig {
  min: number;
  max: number;
  step: number;
  label: string;
  logarithmic?: boolean;
}

type UniformValue =
  | { kind: '1f'; v: number }
  | { kind: '2f'; v: [number, number] };

interface UniformContext {
  seed: number;
  fontAtlas: FontAtlas | null;
}

interface FilterManifest {
  type: FilterType;
  label: string;
  category: string;
  defaultParams: Record<string, number>;
  paramConfigs: Record<string, FilterParamConfig>;
  shader?: string;
  uniforms: (params: Record<string, number>, ctx: UniformContext) => Record<string, UniformValue>;
  landingGradient?: string;
  isAnimated?: boolean;
  passes?: FilterPass[];
}

const param = (label: string, min: number, max: number, step: number): FilterParamConfig => ({ label, min, max, step });
const logParam = (label: string, min: number, max: number, step: number): FilterParamConfig => ({ label, min, max, step, logarithmic: true });
const f = (v: number): UniformValue => ({ kind: '1f', v });

export const FILTER_MANIFESTS: FilterManifest[] = [
  {
    type: 'Noise', label: 'Noise', category: 'Basic', shader: 'noise', landingGradient: 'from-orange-950/60 to-neutral-950/60',
    defaultParams: { intensity: 0.5, scale: 1, complexity: 0, chroma: 0.5 },
    paramConfigs: {
      intensity: param('Intensity', 0, 2, 0.05),
      scale: logParam('Scale', 1, 200, 1),
      complexity: param('Type', 0, 4, 1),
      chroma: param('Chroma', 0, 1, 0.05),
    },
    uniforms: (p, ctx) => {
      const noiseType = Math.round(p.complexity ?? 0);
      const octaves = Math.round(1 + noiseType);
      return {
        u_amount: f(p.intensity ?? 0.5), u_seed: f(ctx.seed * 1000),
        u_scale: f(Math.max(1, p.scale ?? 1)),
        u_monochrome: f(1 - Math.min(1, (p.chroma ?? 0.5) * 2)),
        u_noiseType: f(noiseType), u_octaves: f(octaves),
        u_colorAmount: f(Math.max(0, (p.chroma ?? 0.5) - 0.3) * 3),
      };
    },
  },
  {
    type: 'Pixelate', label: 'Pixelate', category: 'Retro', shader: 'pixelate', landingGradient: 'from-orange-950/50 to-yellow-950/30',
    defaultParams: { size: 10, aspect: 1, gridType: 0, posterize: 0, aa: 0, rotation: 0 },
    paramConfigs: {
      size: logParam('Cell Size', 1, 50, 1), aspect: param('Aspect', 0.1, 3, 0.1),
      gridType: param('Grid Type', 0, 3, 1), posterize: param('Posterize', 0, 8, 1),
      aa: param('Antialias', 0, 1, 1), rotation: param('Rotation', 0, 180, 1),
    },
    uniforms: (p) => ({
      u_cellSize: f(Math.max(1, p.size ?? 10)), u_aspect: f(p.aspect ?? 1),
      u_gridType: f(p.gridType ?? 0), u_posterize: f(Math.round(p.posterize ?? 0)),
      u_aa: f(p.aa ?? 0), u_rotation: f(p.rotation ?? 0),
    }),
  },
  {
    type: 'Glitch', label: 'Glitch', category: 'Distortion', shader: 'glitch', isAnimated: true, landingGradient: 'from-red-950/40 to-purple-950/40',
    defaultParams: { slices: 10, offset: 15, rgbSplit: 0, blockHeight: 1, direction: 0, bitCrush: 0, dataMosh: 0, glitchMode: 0, scanlineIntensity: 0, time: 0 },
    paramConfigs: {
      slices: logParam('Slices', 1, 50, 1), offset: param('Displacement', 1, 50, 1),
      rgbSplit: param('RGB Split', 0, 20, 1), blockHeight: param('Block Height', 0.1, 1, 0.05),
      direction: param('Direction', 0, 1, 1),       glitchMode: param('Mode', 0, 3, 1),
      bitCrush: param('Bit Crush', 0, 1, 0.05), dataMosh: param('Data Mosh', 0, 1, 0.05),
      scanlineIntensity: param('Scanlines', 0, 1, 0.05), time: param('Time', 0, 100, 0.1),
    },
    uniforms: (p, ctx) => ({
      u_slices: f(Math.max(1, p.slices ?? 10)), u_offset: f(p.offset ?? 15),
      u_seed: f(ctx.seed * 1000), u_rgbSplit: f(p.rgbSplit ?? 0),
      u_blockHeight: f(p.blockHeight ?? 1), u_direction: f(p.direction ?? 0),
      u_bitCrush: f(p.bitCrush ?? 0),
      u_dataMosh: f(p.dataMosh ?? 0), u_glitchMode: f(p.glitchMode ?? 0),
      u_scanlineIntensity: f(p.scanlineIntensity ?? 0), u_time: f(p.time ?? 0),
      u_blend: f(1.0),
    }),
  },
  {
    type: 'Halftone', label: 'Halftone', category: 'Stylized', shader: 'halftone', landingGradient: 'from-orange-950/50 to-amber-950/30',
    defaultParams: { size: 10, angle: 0, contrast: 0, dotShape: 0, invert: 0, dotGain: 0, softness: 0, threshold: 0.5 },
    paramConfigs: {
      size: param('Cell Size', 1, 50, 1), angle: param('Angle', 0, 360, 1),
      dotShape: param('Dot Shape', 0, 4, 1), invert: param('Invert', 0, 1, 1),
      contrast: param('Contrast', 0, 3, 0.05), dotGain: param('Dot Gain', 0, 1, 0.05),
      softness: param('Softness', 0, 0.5, 0.01),
      threshold: param('Threshold', 0, 1, 0.05),
    },
    uniforms: (p) => ({
      u_cellSize: f(Math.max(2, p.size ?? 10)), u_angle: f(p.angle ?? 0),
      u_contrast: f(p.contrast ?? 0), u_dotShape: f(p.dotShape ?? 0),
      u_invert: f(p.invert ?? 0),
      u_dotGain: f(p.dotGain ?? 0), u_softness: f(p.softness ?? 0),
      u_threshold: f(p.threshold ?? 0.5),
    }),
  },
  {
    type: 'AsciiBeta2', label: 'ASCII', category: 'Retro', shader: 'ascii_beta_2', landingGradient: 'from-emerald-950/60 to-black/60',
    defaultParams: { cellSize: 8, localContrast: 0.75, gamma: 1.2, edgeSharp: 1.3, edgeThreshold: 0.12, dither: 0.35, seed: 0, colorMode: 0, bgDark: 1, charScale: 1.0, lineSpacing: 1.0 },
    paramConfigs: {
      cellSize: param('Cell Size', 4, 64, 1),
      localContrast: param('Local Contrast Stretch', 0, 1, 0.01),
      gamma: param('Perceptual Font Gamma', 0.2, 3.0, 0.01),
      edgeSharp: param('Edge Contour Sharpness', 0.1, 2.5, 0.01),
      edgeThreshold: param('Edge Activation Threshold', 0.01, 0.8, 0.01),
      dither: param('Dither Intensity', 0, 1, 0.01),
      seed: param('Seed', 0, 1, 0.01),
      colorMode: param('Color Mode', 0, 1, 1),
      bgDark: param('BG Dark', 0, 1, 1),
      charScale: param('Char Scale', 0.5, 1.5, 0.05),
      lineSpacing: param('Line Spacing', 0.5, 2.0, 0.05),
    },
    uniforms: (p, ctx) => ({
      u_cellSize: f(p.cellSize ?? 8),
      u_localContrast: f(p.localContrast ?? 0.75),
      u_gamma: f(p.gamma ?? 1.2),
      u_edgeSharp: f(p.edgeSharp ?? 1.3),
      u_edgeThreshold: f(p.edgeThreshold ?? 0.12),
      u_dither: f(p.dither ?? 0.35),
      u_seed: f(p.seed ?? 0),
      u_colorMode: f(p.colorMode ?? 0),
      u_bgDark: f(p.bgDark ?? 1),
      u_charScale: f(p.charScale ?? 1),
      u_lineSpacing: f(p.lineSpacing ?? 1),
      u_numChars: f(ctx.fontAtlas?.numChars ?? ASCII_RAMP.length),
      u_numFill: f(ctx.fontAtlas ? ctx.fontAtlas.numChars - ASCII_EDGE_GLYPHS.length : ASCII_RAMP.length),
    }),
  },
  {
    type: 'CRT', label: 'CRT Screen', category: 'Retro', shader: 'crt', landingGradient: 'from-green-950/40 to-blue-950/40',
    defaultParams: { lineWidth: 2, lineContrast: 0.5, noise: 0.1, vignetting: 0.3, phosphor: 0, curvature: 0, bloom: 0, colorTemp: 0 },
    paramConfigs: {
      lineWidth: param('Scanline Width', 0.1, 10, 0.1),
      lineContrast: param('Scanline Strength', 0, 1, 0.05),
      noise: param('Static Noise', 0, 1, 0.05), vignetting: param('Vignette', 0, 1, 0.05),
      phosphor: param('Phosphor Trail', 0, 1, 0.05),
      curvature: param('Curvature', 0, 1, 0.05), bloom: param('Phosphor Bloom', 0, 1, 0.05),
      colorTemp: param('Color Temp', -1, 1, 0.05),
    },
    uniforms: (p, ctx) => ({
      u_lineWidth: f(Math.max(0.1, p.lineWidth ?? 2)),
      u_lineContrast: f(p.lineContrast ?? 0.5),
      u_noise: f(p.noise ?? 0.1), u_vignetting: f(p.vignetting ?? 0.3),
      u_seed: f(ctx.seed * 1000),
      u_phosphor: f(p.phosphor ?? 0), u_curvature: f(p.curvature ?? 0),
      u_bloom: f(p.bloom ?? 0), u_colorTemp: f(p.colorTemp ?? 0),
    }),
  },
  {
    type: 'ChromaticAberration', label: 'Chromatic Aberration', category: 'Distortion', shader: 'chromatic_aberration', landingGradient: 'from-cyan-950/40 to-red-950/30',
    defaultParams: { aberrationAmount: 3, aberrationCurve: 2, aberrationAngle: 0, luminanceMask: 0 },
    paramConfigs: {
      aberrationAmount: param('Amount', 0, 15, 0.5),
      aberrationCurve: param('Curve (Falloff)', 0.1, 5, 0.1),
      aberrationAngle: param('Angle', 0, 360, 1),
      luminanceMask: param('Edge Mask', 0, 1, 0.05),
    },
    uniforms: (p) => ({
      u_aberrationAmount: f(p.aberrationAmount ?? 3),
      u_aberrationCurve: f(p.aberrationCurve ?? 2),
      u_aberrationAngle: f(p.aberrationAngle ?? 0),
      u_luminanceMask: f(p.luminanceMask ?? 0),
    }),
  },
  {
    type: 'Outline', label: 'Outline', category: 'Stylized', shader: 'outline', landingGradient: 'from-neutral-900/60 to-neutral-800/60',
    defaultParams: { thickness: 2, threshold: 0, showOriginal: 0, invertEdge: 0, kernelType: 0, edgeColor: 0, edgeWidth: 1, smoothness: 0.1 },
    paramConfigs: {
      thickness: param('Thickness', 0.1, 10, 0.1), threshold: param('Threshold', 0, 1, 0.05),
      showOriginal: param('Show Original', 0, 1, 0.05), invertEdge: param('Invert Edge', 0, 1, 1),
      kernelType: param('Kernel', 0, 2, 1), edgeColor: param('Edge Color', 0, 1, 1),
      edgeWidth: param('Edge Width', 0.1, 3, 0.05), smoothness: param('Smoothness', 0, 1, 0.05),
    },
    uniforms: (p) => ({
      u_thickness: f(p.thickness ?? 2), u_threshold: f(p.threshold ?? 0),
      u_showOriginal: f(p.showOriginal ?? 0), u_invertEdge: f(p.invertEdge ?? 0),
      u_kernelType: f(p.kernelType ?? 0), u_edgeColor: f(p.edgeColor ?? 0),
      u_edgeWidth: f(p.edgeWidth ?? 1), u_smoothness: f(p.smoothness ?? 0.1),
    }),
  },
  {
    type: 'RadialBlur', label: 'Radial Blur', category: 'Distortion', shader: 'radialblur', landingGradient: 'from-orange-950/40 to-neutral-950/60',
    defaultParams: { radius: 10, centerX: 50, centerY: 50, quality: 0.5, blurType: 0, weightMode: 0, aspect: 1 },
    paramConfigs: {
      radius: param('Radius', 0, 100, 1), centerX: param('Center X', 0, 100, 1),
      centerY: param('Center Y', 0, 100, 1), quality: param('Quality', 0, 1, 0.05),
      blurType: param('Type', 0, 1, 1),
      weightMode: param('Weighting', 0, 2, 1), aspect: param('Aspect', 0.1, 3, 0.1),
    },
    uniforms: (p) => ({
      u_radius: f(p.radius ?? 10),
      u_center: { kind: '2f', v: [(p.centerX ?? 50) / 100, 1 - (p.centerY ?? 50) / 100] },
      u_quality: f(p.quality ?? 0.5), u_blurType: f(p.blurType ?? 0),
      u_weightMode: f(p.weightMode ?? 0),
      u_aspect: f(p.aspect ?? 1),
    }),
  },
  {
    type: 'HoloGlitch', label: 'Holo Glitch', category: 'Distortion', shader: 'hologlitch', isAnimated: true, landingGradient: 'from-purple-950/40 to-cyan-950/40',
    defaultParams: { intensity: 1, split: 10, scanJitter: 0, hueShift: 0, glitchMode: 0, time: 0, noiseAmount: 0, blockSize: 32 },
    paramConfigs: {
      intensity: param('Intensity', 0, 5, 0.1), split: param('RGB Split', 0, 50, 0.1),
      scanJitter: param('Scan Jitter', 0, 1, 0.05), hueShift: param('Hue Shift', 0, 1, 0.05),
      glitchMode: param('Mode', 0, 3, 1),
      time: param('Time', 0, 100, 0.1),
      noiseAmount: param('Noise', 0, 1, 0.05),       blockSize: logParam('Block Size', 8, 128, 1),
    },
    uniforms: (p) => ({
      u_intensity: f(p.intensity ?? 1), u_split: f(p.split ?? 10),
      u_scanJitter: f(p.scanJitter ?? 0), u_hueShift: f(p.hueShift ?? 0),
      u_glitchMode: f(p.glitchMode ?? 0),
      u_time: f(p.time ?? 0),
      u_noiseAmount: f(p.noiseAmount ?? 0), u_blockSize: f(p.blockSize ?? 32),
    }),
  },
  {
    type: 'Fluid', label: 'Fluid', category: 'Distortion', shader: 'fluid', isAnimated: true, landingGradient: 'from-blue-950/40 to-teal-950/40',
    defaultParams: { amount: 0.05, scale: 3, time: 0, octaves: 4, swirl: 1, chroma: 0 },
    paramConfigs: {
      amount: param('Displacement', 0, 0.3, 0.005),
      scale: logParam('Scale', 0.5, 20, 0.1),
      time: param('Time', 0, 100, 0.1),
      octaves: param('Detail', 1, 6, 1),
      swirl: param('Swirl', 0, 3, 0.05),
      chroma: param('Chroma Split', 0, 1, 0.05),
    },
    uniforms: (p, ctx) => ({
      u_amount: f(p.amount ?? 0.05), u_scale: f(p.scale ?? 3),
      u_time: f(p.time ?? 0), u_octaves: f(Math.round(p.octaves ?? 4)),
      u_swirl: f(p.swirl ?? 1), u_chroma: f(p.chroma ?? 0),
      u_seed: f(ctx.seed * 100),
    }),
  },
  {
    type: 'Kaleidoscope', label: 'Kaleidoscope', category: 'Stylized', shader: 'kaleidoscope', landingGradient: 'from-pink-950/40 to-orange-950/30',
    defaultParams: { segments: 8, rotation: 0, zoom: 1, centerX: 50, centerY: 50, mirror: 1 },
    paramConfigs: {
      segments: param('Segments', 2, 24, 1), rotation: param('Rotation', 0, 360, 1),
      zoom: param('Zoom', 0.25, 4, 0.05), centerX: param('Center X', 0, 100, 1),
      centerY: param('Center Y', 0, 100, 1), mirror: param('Mirror', 0, 1, 1),
    },
    uniforms: (p) => ({
      u_segments: f(Math.max(2, Math.round(p.segments ?? 8))),
      u_rotation: f(p.rotation ?? 0), u_zoom: f(p.zoom ?? 1),
      u_center: { kind: '2f', v: [(p.centerX ?? 50) / 100, 1 - (p.centerY ?? 50) / 100] },
      u_mirror: f(p.mirror ?? 1),
    }),
  },
  {
    type: 'HalftoneBeta', label: 'Halftone (Beta)', category: 'Stylized', shader: 'halftone_beta', landingGradient: 'from-neutral-800/50 to-amber-950/30',
    defaultParams: { dotSize: 1, frequency: 200, angle: 0, softness: 1, contrast: 1, invert: 0, mix: 1, shapeType: 0, colorMode: 0, chA: 15, chB: 75, chC: 0, chD: 45 },
    paramConfigs: {
      colorMode: param('Color Mode', 0, 2, 1),
      shapeType: param('Shape', 0, 5, 1),
      frequency: logParam('Frequency', 20, 800, 5),
      dotSize: param('Dot Size', 0.2, 2, 0.05),
      angle: param('Angle', 0, 360, 1),
      softness: param('Softness', 0.1, 4, 0.1),
      contrast: param('Contrast', 0, 3, 0.05),
      invert: param('Invert', 0, 1, 1),
      mix: param('Mix', 0, 1, 0.05),
      chA: param('Cha. A (R/C)', 0, 360, 1),
      chB: param('Cha. B (G/M)', 0, 360, 1),
      chC: param('Cha. C (B/Y)', 0, 360, 1),
      chD: param('Cha. D (K)', 0, 360, 1),
    },
    uniforms: (p) => ({
      u_dotSize: f(p.dotSize ?? 1), u_frequency: f(p.frequency ?? 200),
      u_angle: f(p.angle ?? 0), u_softness: f(p.softness ?? 1),
      u_contrast: f(p.contrast ?? 1), u_invert: f(p.invert ?? 0),
      u_mix: f(p.mix ?? 1), u_shapeType: f(p.shapeType ?? 0),
      u_colorMode: f(p.colorMode ?? 0),
      u_chA: f(p.chA ?? 15), u_chB: f(p.chB ?? 75),
      u_chC: f(p.chC ?? 0), u_chD: f(p.chD ?? 45),
    }),
  },
  {
    type: 'HalftoneBeta2', label: 'Halftone (Beta 2)', category: 'Stylized', shader: 'halftone_beta2', landingGradient: 'from-neutral-800/50 to-orange-950/30',
    defaultParams: { kind: 0, scale: 8, angle: 45, sharpness: 0.5, preserveColors: 0 },
    paramConfigs: {
      kind: param('Shape', 0, 3, 1),
      scale: logParam('Cell Size', 3, 40, 1),
      angle: param('Angle', 0, 180, 1),
      sharpness: param('Sharpness', 0.01, 1.5, 0.05),
      preserveColors: param('Color Mode', 0, 1, 1),
    },
    uniforms: (p) => ({
      u_kind: f(p.kind ?? 0),
      u_scale: f(Math.max(2, p.scale ?? 8)),
      u_angle: f(p.angle ?? 45),
      u_sharpness: f(p.sharpness ?? 0.5),
      u_preserveColors: f(p.preserveColors ?? 0),
    }),
  },
  {
    type: 'Bloom', label: 'Bloom', category: 'Stylized', landingGradient: 'from-orange-950/50 to-yellow-950/20',
    defaultParams: { threshold: 0.5, intensity: 0.3, radius: 3 },
    paramConfigs: {
      threshold: param('Threshold', 0, 1, 0.01),
      intensity: param('Intensity', 0, 1, 0.01),
      radius: param('Radius', 0.5, 10, 0.1),
    },
    uniforms: (p) => ({
      u_threshold: f(p.threshold ?? 0.5),
      u_intensity: f(p.intensity ?? 0.3),
      u_radius: f(p.radius ?? 3),
    }),
    passes: [
      { shader: 'bloom_brightpass', scale: 0.25 },
      { shader: 'bloom_blur_h', scale: 0.25 },
      { shader: 'bloom_blur_v', scale: 0.25 },
      { shader: 'bloom_combine', scale: 1 },
    ],
  },
  {
    type: 'DotMatrix', label: 'LED / Dot Matrix', category: 'Retro', shader: 'dotmatrix', landingGradient: 'from-neutral-900/50 to-green-950/30',
    defaultParams: { cellSize: 8, dotSize: 0.75, gap: 0.15, glow: 0.4, subpixel: 1, gamma: 1 },
    paramConfigs: {
      cellSize: param('Cell Size', 3, 40, 1), dotSize: param('Dot Size', 0.2, 1, 0.02),
      gap: param('Gap', 0, 0.5, 0.02), glow: param('Glow', 0, 1, 0.05),
      subpixel: param('RGB Subpixels', 0, 1, 1), gamma: param('Gamma', 0.5, 2.5, 0.05),
    },
    uniforms: (p) => ({
      u_cellSize: f(Math.max(3, p.cellSize ?? 8)),
      u_dotSize: f(p.dotSize ?? 0.75), u_gap: f(p.gap ?? 0.15),
      u_glow: f(p.glow ?? 0.4), u_subpixel: f(p.subpixel ?? 1),
      u_gamma: f(Math.max(0.5, p.gamma ?? 1)),
    }),
  },
];

export const filterManifestByType = new Map<FilterType, FilterManifest>(
  FILTER_MANIFESTS.map(m => [m.type, m])
);
