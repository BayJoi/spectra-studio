#version 300 es
#include "header.glsl"
uniform float u_slices;
uniform float u_offset;
uniform float u_seed;
uniform float u_rgbSplit;
uniform float u_blockHeight;
uniform float u_direction;
uniform float u_blend;
uniform float u_bitCrush;
uniform float u_dataMosh;
uniform float u_glitchMode;
uniform float u_scanlineIntensity;
uniform float u_time;

void main() {
    vec2 uv = v_uv;
    vec4 original = texture(u_texture, v_uv);
    float bh = max(u_blockHeight, 0.01);
    float bandHeight = bh / max(u_slices, 1.0);

    float dir = step(0.5, u_direction);
    vec2 dirVec = (dir > 0.5) ? vec2(0.0, 1.0) : vec2(1.0, 0.0);
    float resAxis = (dir > 0.5) ? max(u_resolution.y, 1.0) : max(u_resolution.x, 1.0);

    float band = dir > 0.5 ? floor(uv.x / bandHeight) : floor(uv.y / bandHeight);
    float bandSeed = floor(u_seed * 100.0);

    float timeWobble = 1.0 + sin(u_time * 2.0 + band * 0.7) * 0.4;
    float magnitude = hash(vec2(band + bandSeed, u_seed)) * timeWobble;
    float bandActive = step(0.5, hash(vec2(band + bandSeed + 7.0, u_seed + 7.0)));
    float displacement = (magnitude - 0.5) * 2.0 * safeDiv(u_offset, resAxis) * bandActive;

    uv += dirVec * displacement;

    float split = safeDiv(u_rgbSplit, resAxis);
    vec2 splitOffset = dirVec * split;

    float gm = floor(u_glitchMode + 0.5);
    vec3 glitched;
    float glitchedAlpha;

    if (gm <= 0.5) {
        vec2 timeDistort = dirVec * sin(u_time * 5.0 + v_uv.y * 30.0) * 0.003;
        vec2 mUV = uv + timeDistort;
        vec4 gSample = texture(u_texture, mUV);
        glitched = vec3(
            texture(u_texture, mUV + splitOffset).r,
            gSample.g,
            texture(u_texture, mUV - splitOffset).b
        );
        glitchedAlpha = gSample.a;

    } else if (gm <= 1.5) {
        float waveAmount = sin(v_uv.y * 25.0 + u_time * 4.0) * u_dataMosh * 0.05
                         + sin(v_uv.y * 50.0 - u_time * 2.5) * u_dataMosh * 0.025;
        vec2 waveUV = uv + dirVec * waveAmount;
        vec4 gSample = texture(u_texture, waveUV);
        glitched = vec3(
            texture(u_texture, waveUV + splitOffset).r,
            gSample.g,
            texture(u_texture, waveUV - splitOffset).b
        );
        glitchedAlpha = gSample.a;

    } else if (gm <= 2.5) {
        float crushLevel = mix(max(u_resolution.x, u_resolution.y), 10.0, u_bitCrush);
        vec2 crushUV = vec2(floor(uv.x * crushLevel), floor(uv.y * crushLevel)) / crushLevel;

        vec2 blockCoord = floor(uv * 40.0) / 40.0;
        float blockSeed = hash(blockCoord + u_seed);
        float blockActive = step(0.65, blockSeed);
        vec2 blockOffset = (random2(blockCoord + u_seed) - 0.5) * u_dataMosh * 0.03 * blockActive;
        crushUV += blockOffset;

        float jitterSeed = hash(vec2(floor(crushUV.y * 30.0), floor(u_time * 6.0)));
        float jitter = jitterSeed * 0.004 * step(0.01, u_time);
        crushUV += dirVec * jitter;

        vec4 gSample = texture(u_texture, crushUV);
        glitched = vec3(
            texture(u_texture, crushUV + splitOffset).r,
            gSample.g,
            texture(u_texture, crushUV - splitOffset).b
        );
        glitchedAlpha = gSample.a;

    } else {
        float scanline = floor(v_uv.y * u_resolution.y);
        float stretchSeed = hash(vec2(scanline, u_seed));
        float stretchActive = step(1.0 - u_dataMosh * 0.6, stretchSeed);
        float stretchDir = step(0.5, hash(vec2(scanline + 100.0, u_seed))) * 2.0 - 1.0;
        float stretchAmt = stretchActive * u_dataMosh * stretchDir * 0.04;

        float timeWobble2 = sin(u_time * 7.0 + scanline * 0.4) * u_dataMosh * 0.005 * step(0.01, u_time);

        vec2 moshUV = uv + dirVec * (stretchAmt + timeWobble2);

        vec4 gSample = texture(u_texture, moshUV);
        glitched = vec3(
            texture(u_texture, moshUV + splitOffset).r,
            gSample.g,
            texture(u_texture, moshUV - splitOffset).b
        );
        glitchedAlpha = gSample.a;
    }

    if (u_bitCrush > 0.01) {
        float bandIdx = floor(band);
        float crushHash = hash(vec2(bandIdx * 0.7, u_seed + 100.0));
        float crushActive = step(0.7, crushHash);
        if (crushActive > 0.5) {
            float levels = max(round(mix(16.0, 4.0, u_bitCrush)), 2.0);
            glitched = floor(glitched * levels) / levels;
        }
    }

    if (u_scanlineIntensity > 0.0) {
        float scanline = sin(v_uv.y * u_resolution.y * 2.0) * 0.5 + 0.5;
        glitched = mix(glitched, glitched * scanline, u_scanlineIntensity * 0.7);
    }

    fragColor = vec4(mix(original.rgb, glitched, u_blend), mix(original.a, glitchedAlpha, u_blend));
}
