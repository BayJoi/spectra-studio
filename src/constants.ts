export const ASCII_RAMP = ' .:-=+*#%@';
export const ASCII_EDGE_GLYPHS = '-/|\\';

interface ExportFormat {
  value: 'png' | 'jpeg' | 'webp';
  label: string;
  mime: string;
  ext: string;
}

export const EXPORT_FORMATS: ExportFormat[] = [
  { value: 'png', label: 'PNG', mime: 'image/png', ext: '.png' },
  { value: 'jpeg', label: 'JPEG', mime: 'image/jpeg', ext: '.jpg' },
  { value: 'webp', label: 'WebP', mime: 'image/webp', ext: '.webp' },
];

interface RenderScale {
  value: number;
  label: string;
  shortLabel: string;
}

export const RENDER_SCALES: RenderScale[] = [
  { value: 0.25, label: 'Quarter', shortLabel: '25%' },
  { value: 0.5, label: 'Half', shortLabel: '50%' },
  { value: 1.0, label: 'Full', shortLabel: '100%' },
];
