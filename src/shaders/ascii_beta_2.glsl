#version 300 es
#include "header.glsl"
uniform sampler2D u_fontAtlas;
uniform float u_numChars;
uniform float u_numFill;
uniform float u_cellSize;
uniform float u_colorMode;
uniform float u_bgDark;
uniform float u_charScale;
uniform float u_lineSpacing;

// Advanced Structural Controls
uniform float u_localContrast;
uniform float u_gamma;
uniform float u_edgeSharp;
uniform float u_edgeThreshold;
uniform float u_dither;
uniform float u_seed;

// Upgraded Interleaved Gradient Noise with Phase Seed Scrambling
float getHighFreqNoise(vec2 fragCoord) {
    vec3 magic = vec3(0.06711056, 0.00583715, 52.9829189);
    // Adding the seed directly to the dot product result shuffles the phase completely per value change
    return fract(magic.z * fract(dot(fragCoord, magic.xy) + u_seed * 12.9898));
}

float cellLum(vec2 cell) {
    vec2 uv = (cell + 0.5) * max(u_cellSize, 1.0) / max(u_resolution, vec2(1.0));
    return luminance(texture(u_texture, uv).rgb);
}

void main() {
    vec2 safeRes = max(u_resolution, vec2(1.0));
    float safeCellSize = max(u_cellSize, 1.0);
    vec2 fragCoord = v_uv * safeRes;
    vec2 cellCoord = floor(fragCoord / safeCellSize);
    vec2 cellCenterUV = (cellCoord + 0.5) * safeCellSize / safeRes;

    // 1. Core Downsampled Sampling
    vec3 srcSample = texture(u_texture, cellCenterUV).rgb;
    float coreLum = luminance(srcSample);

    // 2. Adaptive Micro-Contrast Range Normalization
    float minLum = coreLum;
    float maxLum = coreLum;

    for(int x = -1; x <= 1; x++) {
        for(int y = -1; y <= 1; y++) {
            float neighborLum = cellLum(cellCoord + vec2(float(x), float(y)));
            minLum = min(minLum, neighborLum);
            maxLum = max(maxLum, neighborLum);
        }
    }

    float localRange = maxLum - minLum;
    float stretchedLum = (coreLum - minLum) / max(localRange, 0.001);
    float adaptiveLum = mix(coreLum, stretchedLum, u_localContrast);

    // 3. Textureless Dither Pass (IGN with phase seed scrambling)
    float noiseVal = getHighFreqNoise(fragCoord);
    adaptiveLum += (noiseVal - 0.5) * u_dither * 0.35;
    adaptiveLum = pow(clamp(adaptiveLum, 0.0, 1.0), max(u_gamma, 0.01));

    float numFill = max(1.0, u_numFill);
    float numChars = max(1.0, u_numChars);

    // 4. Sub-Grid Coordinate Roberts Cross Tensor Pass
    float tl = cellLum(cellCoord + vec2(-0.5, -0.5));
    float tr = cellLum(cellCoord + vec2( 0.5, -0.5));
    float bl = cellLum(cellCoord + vec2(-0.5,  0.5));
    float br = cellLum(cellCoord + vec2( 0.5,  0.5));

    float gx = tl - br;
    float gy = tr - bl;
    float gMag = length(vec2(gx, gy)) * u_edgeSharp;
    float gAng = atan(gy, gx);

    bool isEdgeCell = (gMag > u_edgeThreshold);

    // Rotate and map vectors directly to contour font atlas slots
    float edgeAng = gAng + 1.5707963;
    edgeAng = mod(edgeAng + 3.1415926, 3.1415926);
    float sector = floor(edgeAng / (3.1415926 / 4.0) + 0.5);
    if (sector >= 4.0) sector = 0.0;

    float edgeIdx = u_numFill + sector;
    float fillIdx = floor(adaptiveLum * (numFill - 1.0) + 0.5);
    fillIdx = clamp(fillIdx, 0.0, numFill - 1.0);

    float charIndex = isEdgeCell ? edgeIdx : fillIdx;
    charIndex = clamp(charIndex, 0.0, numChars - 1.0);

    // 5. Grid Quantization Layout Mapping
    vec2 localUV = fract(fragCoord / safeCellSize);
    localUV.y = (localUV.y - 0.5) / max(u_lineSpacing, 0.01) + 0.5;
    localUV *= u_charScale;
    localUV += (1.0 - u_charScale) * 0.5;

    float pad = 0.5 / 48.0;
    vec2 glyphUV = clamp(localUV, vec2(pad), vec2(1.0 - pad));

    vec2 atlasUV = vec2((charIndex + glyphUV.x) / numChars, glyphUV.y);
    float coverage = texture(u_fontAtlas, atlasUV).r;
    if (isEdgeCell) coverage = step(0.30, coverage);

    // 6. High-Res Screen-Space Chrominance Blending
    float colorToggle = step(0.5, u_colorMode);
    vec3 foregroundColor = mix(vec3(1.0), srcSample, colorToggle);

    vec3 cleanBackground = texture(u_texture, v_uv).rgb;
    vec3 calculatedBg = mix(cleanBackground, vec3(0.0), u_bgDark);

    vec3 finalRGB = mix(calculatedBg, foregroundColor, coverage);
    fragColor = vec4(finalRGB, texture(u_texture, v_uv).a);
}
