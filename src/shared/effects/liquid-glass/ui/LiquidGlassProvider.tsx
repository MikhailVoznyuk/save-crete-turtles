'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
    LiquidGlassHandle,
    LiquidGlassRegistryProvider,
    RegisterLiquidGlass
} from "@/shared/effects/liquid-glass/model/context";
import type {LoadState} from '@/shared/types/load-state';
import {getEdgeViewportMetrics, getEdgeViewportRect} from '@/shared/utils/viewport';

type Props = {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    children: React.ReactNode;
    quality?: number; // 0.6..1
    dprCap?: number;  // 1..2
    zIndex?: number;
    onLoadStateChange?: (state: LoadState) => void;
};

type RectLike = {
    left: number;
    top: number;
    width: number;
    height: number;
    right?: number;
    bottom?: number;
};

function toCanvasX(value: number, canvasRect: Pick<RectLike, 'left'>) {
    return value - canvasRect.left;
}

function toCanvasY(value: number, canvasRect: Pick<RectLike, 'top'>) {
    return value - canvasRect.top;
}
function parseObjectPositionPart(part: string | undefined, fallback: number) {
    if (!part) return fallback;

    const normalized = part.trim().toLowerCase();
    if (normalized === 'left' || normalized === 'top') return 0;
    if (normalized === 'center') return 0.5;
    if (normalized === 'right' || normalized === 'bottom') return 1;

    if (normalized.endsWith('%')) {
        const n = Number.parseFloat(normalized);
        return Number.isFinite(n) ? n / 100 : fallback;
    }

    return fallback;
}

function getVideoMediaRect(video: HTMLVideoElement) {
    const box = getEdgeViewportRect();
    const videoW = Math.max(1, video.videoWidth || 1);
    const videoH = Math.max(1, video.videoHeight || 1);
    const boxW = Math.max(1, box.width);
    const boxH = Math.max(1, box.height);
    const fitScale = Math.max(boxW / videoW, boxH / videoH);
    const mediaW = videoW * fitScale;
    const mediaH = videoH * fitScale;

    const objectPosition = getComputedStyle(video).objectPosition || '50% 50%';
    const parts = objectPosition.split(/\s+/);
    const posX = parseObjectPositionPart(parts[0], 0.5);
    const posY = parseObjectPositionPart(parts[1], 0.5);

    return {
        left: box.left + (boxW - mediaW) * posX,
        top: box.top + (boxH - mediaH) * posY,
        width: mediaW,
        height: mediaH,
    };
}

function nearlySameRect(
    a: {left: number; top: number; width: number; height: number},
    b: {left: number; top: number; width: number; height: number}
) {
    return (
        Math.abs(a.left - b.left) < 0.25 &&
        Math.abs(a.top - b.top) < 0.25 &&
        Math.abs(a.width - b.width) < 0.25 &&
        Math.abs(a.height - b.height) < 0.25
    );
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
    const sh = gl.createShader(type);
    if (!sh) throw new Error('shader alloc failed');
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh) || 'shader compile failed';
        gl.deleteShader(sh);
        throw new Error(log);
    }
    return sh;
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
    const p = gl.createProgram();
    if (!p) throw new Error('program alloc failed');
    const v = compile(gl, gl.VERTEX_SHADER, vs);
    const f = compile(gl, gl.FRAGMENT_SHADER, fs);
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    gl.deleteShader(v);
    gl.deleteShader(f);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(p) || 'program link failed';
        gl.deleteProgram(p);
        throw new Error(log);
    }
    return p;
}

const VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
out vec2 vUv;
void main(){
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FS_BG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uVideo;
uniform vec2 uViewportCss;
uniform vec4 uVideoRectCss;

void main(){
  vec2 css = vUv * uViewportCss;
  vec2 uv = (css - uVideoRectCss.xy) / max(uVideoRectCss.zw, vec2(1.0));
  o = texture(uVideo, clamp(uv, vec2(0.001), vec2(0.999)));
}
`;

const FS_BLUR_HALF = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uSrc;
uniform vec2 uSrcSize;

void main(){
  vec2 px = 1.0 / max(uSrcSize, vec2(1.0));
  vec4 c =
    texture(uSrc, vUv) * 0.34 +
    texture(uSrc, vUv + vec2(px.x, 0.0)) * 0.16 +
    texture(uSrc, vUv - vec2(px.x, 0.0)) * 0.16 +
    texture(uSrc, vUv + vec2(0.0, px.y)) * 0.17 +
    texture(uSrc, vUv - vec2(0.0, px.y)) * 0.17;
  o = c;
}
`;

const FS_MASK = `#version 300 es
precision highp float;
out vec4 o;
void main(){ o = vec4(0.0); }
`;

const FS_LENS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;

uniform sampler2D uBg;
uniform sampler2D uBlur;

uniform vec2  uViewportCss;
uniform vec2  uRectPosCss;
uniform vec2  uRectSizeCss;
uniform float uScale;

uniform vec2  uLight;
uniform vec2  uPointerCss;
uniform float uPointerActive;
uniform float uTime;

uniform float uIntensity;
uniform float uMagnify;
uniform float uBlurAmt;
uniform float uChromatic;
uniform float uRim;
uniform float uSpec;
uniform float uTint;
uniform float uAlpha;
uniform float uEdgePull;
uniform float uEdgePower;
uniform float uEdgeSingularity;
uniform float uDirMode;

uniform sampler2D uShapePolar;
uniform vec2  uCenterCss;
uniform float uShapeMaxRadius;

float saturate(float x){ return clamp(x, 0.0, 1.0); }

float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float hash21(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise2(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm4(vec2 p){
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise2(p);
    p = p * 2.02 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return v;
}

float boundaryRadius(vec2 dir){
  float ang = atan(dir.y, dir.x);
  float u = (ang + 3.141592653589793) / 6.283185307179586;
  return max(1.0, texture(uShapePolar, vec2(fract(u), 0.5)).r * uShapeMaxRadius);
}

float filmPhase(float lambdaNm, float thicknessNm, float cosTheta){
  return 4.0 * 3.141592653589793 * 1.33 * thicknessNm * cosTheta / lambdaNm + 3.141592653589793;
}

vec3 thinFilmSpectrum(float thicknessNm, float cosTheta){
  float i650 = 0.5 + 0.5 * cos(filmPhase(650.0, thicknessNm, cosTheta));
  float i580 = 0.5 + 0.5 * cos(filmPhase(580.0, thicknessNm, cosTheta));
  float i530 = 0.5 + 0.5 * cos(filmPhase(530.0, thicknessNm, cosTheta));
  float i490 = 0.5 + 0.5 * cos(filmPhase(490.0, thicknessNm, cosTheta));
  float i440 = 0.5 + 0.5 * cos(filmPhase(440.0, thicknessNm, cosTheta));

  vec3 rgb = vec3(0.0);
  rgb += i650 * vec3(1.00, 0.08, 0.00);
  rgb += i580 * vec3(1.00, 0.56, 0.00);
  rgb += i530 * vec3(0.18, 1.00, 0.16);
  rgb += i490 * vec3(0.00, 0.72, 1.00);
  rgb += i440 * vec3(0.25, 0.13, 1.00);

  rgb /= 2.72;
  return pow(clamp(rgb, 0.0, 1.0), vec3(0.94));
}

vec3 sampleBgChromatic(vec2 uv, vec2 caUv){
  vec3 c;
  c.r = texture(uBg, clamp(uv + caUv, vec2(0.001), vec2(0.999))).r;
  c.g = texture(uBg, clamp(uv, vec2(0.001), vec2(0.999))).g;
  c.b = texture(uBg, clamp(uv - caUv, vec2(0.001), vec2(0.999))).b;
  return c;
}

void main(){
  float cssX = gl_FragCoord.x / uScale;
  float cssY = ((uViewportCss.y * uScale) - gl_FragCoord.y) / uScale;
  vec2 css = vec2(cssX, cssY);

  vec2 dCss = css - uCenterCss;
  float r = length(dCss);
  vec2 dir = (r > 1e-5) ? (dCss / r) : vec2(1.0, 0.0);
  vec2 tangent = vec2(-dir.y, dir.x);

  float rb = boundaryRadius(dir);
  float rho = r / max(rb, 1.0);
  if (rho > 1.008) discard;

  float rhoC = clamp(rho, 0.0, 1.0);
  float minDim = max(1.0, min(uRectSizeCss.x, uRectSizeCss.y));
  float maxDim = max(1.0, max(uRectSizeCss.x, uRectSizeCss.y));
  float aspect = clamp(minDim / maxDim, 0.38, 1.0);

  float compactK = clamp(230.0 / minDim, 0.58, 1.34);
  float panelK = clamp(620.0 / maxDim, 0.62, 1.08);
  float sizeK = clamp(mix(compactK, panelK, 0.46), 0.58, 1.34);

  float edgeWidthPx = clamp(28.0 + minDim * 0.10, 30.0, 92.0);
  float edgeWidth = clamp(edgeWidthPx / max(rb, 1.0), 0.18, 0.46);

  float edge = smoothstep(1.0 - edgeWidth, 1.0, rhoC);
  float lip = smoothstep(1.0 - edgeWidth * 0.58, 1.0, rhoC);
  float rimCore = smoothstep(0.885, 0.985, rhoC) * (1.0 - smoothstep(0.988, 1.006, rhoC));
  float body = 1.0 - smoothstep(0.04, 0.72, rhoC);
  float middle = smoothstep(0.16, 0.76, rhoC) * (1.0 - smoothstep(0.86, 1.0, rhoC));
  float skin = smoothstep(0.32, 0.94, rhoC) * (1.0 - smoothstep(0.985, 1.004, rhoC));

  float edgeExp = max(0.70, uEdgePower * 0.17);
  float singularBoost = clamp(1.0 / max(0.34, (1.0 - rhoC) + uEdgeSingularity * 13.0), 0.85, 2.35);
  float baseRefPx = clamp((uEdgePull * 0.92 + uIntensity * 18.0) * sizeK, 18.0, min(124.0, minDim * 0.46));

  float time = uTime;
  float wobA = fbm4(dir * vec2(1.7, 2.4) + vec2(time * 0.030, -time * 0.043));
  float wobB = sin(time * 0.86 + atan(dir.y, dir.x) * 3.0 + wobA * 2.5);
  float liquid = ((wobA - 0.5) * 2.0 + wobB * 0.18) * sizeK;

  float domePx = r * uMagnify * sizeK * (0.18 + body * 0.36 + middle * 0.16);
  float edgeRefractPx = baseRefPx * (0.12 * middle + 0.92 * pow(lip, edgeExp) + 0.34 * rimCore) * singularBoost;
  edgeRefractPx += liquid * (2.6 + 10.5 * edge) * skin;

  float sampleR = r - domePx + edgeRefractPx;
  float tangentPx = (wobA - 0.5) * baseRefPx * 0.18 * lip;
  tangentPx += sin(time * 0.52 + rhoC * 8.8) * baseRefPx * 0.035 * edge;
  tangentPx += uDirMode * baseRefPx * 0.035 * (1.0 - aspect) * edge;

  vec2 primaryCss = uCenterCss + dir * sampleR + tangent * tangentPx;
  vec2 primaryUv = clamp(primaryCss / max(uViewportCss, vec2(1.0)), vec2(0.001), vec2(0.999));

  vec2 outsideCss = uCenterCss + dir * (r + baseRefPx * (1.14 + 0.30 * lip)) + tangent * tangentPx * 1.25;
  vec2 outsideUv = clamp(outsideCss / max(uViewportCss, vec2(1.0)), vec2(0.001), vec2(0.999));

  vec2 innerCss = uCenterCss + dir * max(0.0, r - baseRefPx * (0.32 + 0.16 * body));
  vec2 innerUv = clamp(innerCss / max(uViewportCss, vec2(1.0)), vec2(0.001), vec2(0.999));

  vec2 caPx = dir * (uChromatic * (5.0 + 62.0 * pow(lip, 1.20) + 18.0 * rimCore) * sizeK);
  vec2 caUv = caPx / max(uViewportCss, vec2(1.0));

  vec3 sharp = sampleBgChromatic(primaryUv, caUv);
  vec3 outerSharp = sampleBgChromatic(outsideUv, caUv * 1.35);
  vec3 innerSharp = texture(uBg, innerUv).rgb;
  vec3 blur = texture(uBlur, primaryUv).rgb;

  vec3 col = sharp;
  col = mix(col, outerSharp, clamp(0.14 * lip + 0.30 * rimCore, 0.0, 0.42));
  col = mix(col, innerSharp, 0.055 * body);

  float frost = clamp(uBlurAmt, 0.0, 1.0);
  float frostMix = frost * (0.045 + 0.090 * body + 0.150 * edge + 0.080 * rimCore);
  col = mix(col, blur, clamp(frostMix, 0.0, 0.32));

  float bgLum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  float brightBg = smoothstep(0.56, 0.88, bgLum);
  float darkBg = 1.0 - brightBg;

  col = (col - vec3(0.5)) * (1.035 + 0.115 * skin + 0.075 * rimCore) + vec3(0.5);
  col *= 1.0 - (0.022 * body + 0.048 * edge) * brightBg;

  vec3 ice = vec3(0.67, 0.90, 1.0);
  vec3 blue = vec3(0.18, 0.52, 1.0);
  vec3 glassTint = mix(ice, blue, 0.34 + 0.16 * darkBg);
  col += glassTint * (0.018 + 0.040 * uTint) * (0.22 * body + 0.52 * skin + 0.82 * edge) * mix(0.55, 1.0, darkBg);

  vec2 light2 = normalize(vec2(-0.56, -0.68) + uLight * 0.16);
  vec3 V = vec3(0.0, 0.0, 1.0);
  float domeZ = sqrt(max(0.0, 1.0 - rhoC * rhoC));
  vec3 N = normalize(vec3(dir.x * (0.86 + 0.70 * edge), dir.y * (0.86 + 0.70 * edge), domeZ * 1.02 + 0.10));
  vec3 L = normalize(vec3(light2.x, light2.y, 0.86));
  vec3 H = normalize(L + V);

  float NoV = max(dot(N, V), 0.0);
  float NoL = max(dot(N, L), 0.0);
  float NoH = max(dot(N, H), 0.0);
  float fres = pow(1.0 - NoV, 1.72);

  vec2 pr = dir * rhoC;
  vec2 streakDir = normalize(vec2(-0.70, 0.72));
  float along = dot(pr, streakDir);
  float across = dot(pr, vec2(streakDir.y, -streakDir.x));
  float longStreak = exp(-(across * across) / 0.050) * smoothstep(-0.46, 0.78, along) * (1.0 - smoothstep(0.97, 1.02, rhoC));
  float smallStreak = exp(-pow(across + 0.20, 2.0) / 0.018) * smoothstep(-0.10, 0.55, along) * (1.0 - smoothstep(0.88, 1.02, rhoC));

  float lightFacing = smoothstep(-0.22, 0.86, dot(dir, -light2));
  float lowerFacing = smoothstep(0.05, 0.94, dot(dir, normalize(vec2(0.22, 0.98))));

  float outerLine = smoothstep(0.935, 0.991, rhoC) * (1.0 - smoothstep(0.994, 1.006, rhoC));
  float innerLine = exp(-pow((rhoC - 0.735) / 0.075, 2.0)) * skin;
  float causticLine = exp(-pow((rhoC - (0.66 + 0.045 * sin(time * 0.36 + along * 5.0))) / 0.035, 2.0)) * skin * lightFacing;

  float bottomAbsorb = lowerFacing * (0.065 * edge + 0.090 * rimCore) * (0.55 + 0.45 * brightBg);
  col *= 1.0 - bottomAbsorb;

  vec3 rimCol = ice * uRim * (
      0.115 * fres * skin +
      0.120 * outerLine * mix(1.0, 0.58, brightBg) +
      0.105 * lightFacing * rimCore +
      0.048 * innerLine * darkBg
  );
  rimCol += vec3(1.0) * uRim * (0.070 * outerLine * lightFacing + 0.035 * causticLine) * mix(1.0, 0.55, brightBg);
  rimCol += blue * uRim * 0.042 * innerLine * darkBg;

  float specCore = pow(NoH, 62.0) * (0.55 + 0.45 * longStreak);
  float specWide = pow(NoH, 13.5) * (0.40 * longStreak + 0.28 * smallStreak + 0.16 * rimCore);
  vec3 specCol = vec3(0.88, 0.97, 1.0) * uSpec * (0.175 * specCore + 0.112 * specWide) * mix(1.0, 0.54, brightBg);

  vec2 pointerDelta = (css - uPointerCss) / max(vec2(minDim * 0.48), vec2(1.0));
  float pointerGlow = exp(-dot(pointerDelta, pointerDelta) * 3.4) * uPointerActive;
  pointerGlow *= (0.18 + 0.44 * skin + 0.52 * edge) * (0.42 + 0.58 * NoL);
  specCol += vec3(0.73, 0.91, 1.0) * pointerGlow * uSpec * 0.19;

  vec2 filmUv = pr * vec2(1.04, 1.52) + vec2(0.02 * sin(time * 0.2), -0.045);
  float filmR = clamp(length(filmUv), 0.0, 1.0);
  float filmZone = smoothstep(0.55, 0.94, filmR) * (1.0 - smoothstep(0.980, 1.01, filmR));
  float topness = clamp(0.52 - 0.48 * filmUv.y, 0.0, 1.0);
  float f1 = fbm4(filmUv * vec2(1.2, 2.0) + vec2(time * 0.020, -time * 0.042));
  float f2 = fbm4(filmUv * vec2(2.6, 4.1) + vec2(-time * 0.016, time * 0.031));
  float thicknessNm = clamp(mix(690.0, 255.0, topness) + (f1 - 0.5) * 170.0 + (f2 - 0.5) * 62.0, 185.0, 780.0);
  float cosTheta = clamp(0.55 * NoV + 0.45 * NoH, 0.06, 1.0);
  vec3 film = thinFilmSpectrum(thicknessNm, cosTheta);
  float chroma = max(max(film.r, film.g), film.b) - min(min(film.r, film.g), film.b);
  float filmMask = filmZone * (0.22 + 0.78 * fres) * (0.30 + 0.70 * topness) * smoothstep(0.04, 0.18, chroma);
  filmMask *= clamp(0.32 + uChromatic * 7.2, 0.0, 1.0);
  vec3 filmCol = film * filmMask * (0.034 + 0.080 * uSpec) * mix(1.0, 0.50, brightBg);

  col += rimCol + specCol + filmCol;
  col += ice * causticLine * (0.028 + 0.020 * uSpec) * mix(1.0, 0.55, brightBg);
  col += blue * causticLine * 0.018 * uTint * darkBg;

  float vignette = smoothstep(0.00, 0.30, rhoC) * (1.0 - smoothstep(0.88, 1.0, rhoC));
  col += glassTint * vignette * 0.008 * uTint * darkBg;

  float grain = hash12(gl_FragCoord.xy + uTime * 41.0) - 0.5;
  col += grain * 0.0015;

  col = clamp(col, 0.0, 1.25);
  o = vec4(col, clamp(uAlpha, 0.0, 1.0));
}
`;

export function LiquidGlassProvider({
    videoRef,
    children,
    quality = 0.78,
    dprCap = 2,
    zIndex = 0,
    onLoadStateChange,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const visualRootRef = useRef<HTMLDivElement | null>(null);
    const loadStateRef = useRef<LoadState>('pending');

    const emitLoadState = useCallback((state: LoadState) => {
        if (loadStateRef.current === state) return;
        loadStateRef.current = state;
        onLoadStateChange?.(state);
    }, [onLoadStateChange]);
    const glRef = useRef<WebGL2RenderingContext | null>(null);

    const mapRef = useRef(new Map<string, LiquidGlassHandle>());
    const rafRef = useRef<number | null>(null);

    const fbScaleRef = useRef(1);
    const vpCssRef = useRef({ w: 1, h: 1 });
    const resizeRafRef = useRef<number | null>(null);

    const progBgRef = useRef<WebGLProgram | null>(null);
    const progBlurRef = useRef<WebGLProgram | null>(null);
    const progMaskRef = useRef<WebGLProgram | null>(null);
    const progLensRef = useRef<WebGLProgram | null>(null);

    const vaoFullRef = useRef<WebGLVertexArrayObject | null>(null);
    const vboFullRef = useRef<WebGLBuffer | null>(null);

    const vaoFanRef = useRef<WebGLVertexArrayObject | null>(null);
    const vboFanRef = useRef<WebGLBuffer | null>(null);
    const fanTmpRef = useRef<Float32Array>(new Float32Array(4096));

    const texVideoRef = useRef<WebGLTexture | null>(null);

    const fboBgRef = useRef<WebGLFramebuffer | null>(null);
    const texBgRef = useRef<WebGLTexture | null>(null);

    const fboBlurRef = useRef<WebGLFramebuffer | null>(null);
    const texBlurRef = useRef<WebGLTexture | null>(null);

    const sizesRef = useRef({ bgW: 1, bgH: 1, blurW: 1, blurH: 1 });
    const bgDirtyRef = useRef(true);
    const hasBgFrameRef = useRef(false);
    const lastVideoTimeRef = useRef(-1);
    const lastVideoSizeRef = useRef({ w: 0, h: 0 });
    const lastBgRectRef = useRef({ left: Number.NaN, top: Number.NaN, width: Number.NaN, height: Number.NaN });



    const uniBg = useRef({ uVideo: null as any, uViewportCss: null as any, uVideoRectCss: null as any });
    const uniBlur = useRef({ uSrc: null as any, uSrcSize: null as any });
    const uniLens = useRef({
        uBg: null as any,
        uBlur: null as any,
        uViewportCss: null as any,
        uRectPosCss: null as any,
        uRectSizeCss: null as any,
        uScale: null as any,
        uTime: null as any,
        uPointerCss: null as any,
        uPointerActive: null as any,
        uIntensity: null as any,
        uMagnify: null as any,
        uBlurAmt: null as any,
        uChromatic: null as any,
        uRim: null as any,
        uSpec: null as any,
        uTint: null as any,
        uAlpha: null as any,
        uLight: null as any,
        uEdgePull: null as any,
        uEdgePower: null as any,
        uEdgeSingularity: null as any,
        uDirMode: null as any,
        uShapePolar: null as any,
        uCenterCss: null as any,
        uShapeMaxRadius: null as any,
    });

    const lightRef = useRef({x: 0.15, y: -0.10});
    const pointerRef = useRef({x: -10000, y: -10000, active: 0, lastT: 0});

    const SHAPE_SAMPLES = 256;

    const shapeTexRef = useRef<WebGLTexture | null>(null);
    const shapeBytesRef = useRef<Uint8Array>(new Uint8Array(SHAPE_SAMPLES));
    const shapeRadiiRef = useRef<Float32Array>(new Float32Array(SHAPE_SAMPLES));

    const ensureFanTmp = (need: number) => {
        if (fanTmpRef.current.length < need) fanTmpRef.current = new Float32Array(Math.ceil(need * 1.25));
        return fanTmpRef.current;
    };

    const buildPolarShape = (
        pts: Float32Array,
        N: number,
        rect: { left: number; top: number; width: number; height: number },
        scaleX: number,
        scaleY: number
    ) => {
        const radii = shapeRadiiRef.current;
        const bytes = shapeBytesRef.current;

        radii.fill(0);

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        let sumX = 0;
        let sumY = 0;
        let signedArea = 0;
        let centroidX = 0;
        let centroidY = 0;

        for (let i = 0; i < N; i++) {
            const x = rect.left + pts[i * 2] * scaleX;
            const y = rect.top + pts[i * 2 + 1] * scaleY;
            const ni = (i + 1) % N;
            const nx = rect.left + pts[ni * 2] * scaleX;
            const ny = rect.top + pts[ni * 2 + 1] * scaleY;
            const cross = x * ny - nx * y;

            sumX += x;
            sumY += y;
            signedArea += cross;
            centroidX += (x + nx) * cross;
            centroidY += (y + ny) * cross;

            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }

        const meanX = sumX / N;
        const meanY = sumY / N;
        const area = signedArea * 0.5;
        const hasCentroid = Number.isFinite(area) && Math.abs(area) > 1e-3;
        const cx = hasCentroid ? centroidX / (6 * area) : meanX;
        const cy = hasCentroid ? centroidY / (6 * area) : meanY;

        let maxRadius = 1;

        for (let i = 0; i < N; i++) {
            const x = rect.left + pts[i * 2] * scaleX;
            const y = rect.top + pts[i * 2 + 1] * scaleY;

            const dx = x - cx;
            const dy = y - cy;
            const r = Math.hypot(dx, dy);

            const a = Math.atan2(dy, dx);
            let idx = Math.floor(((a + Math.PI) / (Math.PI * 2)) * SHAPE_SAMPLES);
            if (idx < 0) idx += SHAPE_SAMPLES;
            if (idx >= SHAPE_SAMPLES) idx -= SHAPE_SAMPLES;

            if (r > radii[idx]) radii[idx] = r;
            if (r > maxRadius) maxRadius = r;
        }

        let last = 0;
        for (let i = 0; i < SHAPE_SAMPLES; i++) {
            if (radii[i] === 0) radii[i] = last;
            else last = radii[i];
        }

        last = radii[SHAPE_SAMPLES - 1] || last || maxRadius;
        for (let i = SHAPE_SAMPLES - 1; i >= 0; i--) {
            if (radii[i] === 0) radii[i] = last;
            else last = radii[i];
        }

        for (let i = 0; i < SHAPE_SAMPLES; i++) {
            bytes[i] = Math.max(1, Math.min(255, Math.round((radii[i] / maxRadius) * 255)));
        }

        return { cx, cy, maxRadius, minX, minY, maxX, maxY };
    };

    const setupTex = (gl: WebGL2RenderingContext, w: number, h: number) => {
        const tex = gl.createTexture();
        if (!tex) throw new Error('tex alloc failed');
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        return tex;
    };

    const setupFbo = (gl: WebGL2RenderingContext, tex: WebGLTexture) => {
        const fbo = gl.createFramebuffer();
        if (!fbo) throw new Error('fbo alloc failed');
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return fbo;
    };

    const resize = useCallback(() => {
        const canvas = canvasRef.current;
        const gl = glRef.current;
        if (!canvas || !gl) return;

        const viewport = getEdgeViewportMetrics();
        const dpr = Math.min(dprCap, viewport.dpr);
        const q = Math.max(0.6, Math.min(1, quality));
        const scale = dpr * q;

        const {w: wCss, h: hCss} = viewport;
        const targetWidth = Math.max(1, Math.floor(wCss * scale));
        const targetHeight = Math.max(1, Math.floor(hCss * scale));

        if (
            vpCssRef.current.w === wCss &&
            vpCssRef.current.h === hCss &&
            Math.abs(fbScaleRef.current - scale) < 0.0001 &&
            canvas.width === targetWidth &&
            canvas.height === targetHeight
        ) {
            return;
        }

        vpCssRef.current = { w: wCss, h: hCss };
        fbScaleRef.current = scale;

        canvas.style.width = `${wCss}px`;
        canvas.style.height = `${hCss}px`;
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = String(zIndex);
        canvas.style.display = 'block';
        canvas.style.backfaceVisibility = 'hidden';
        canvas.style.webkitBackfaceVisibility = 'hidden';

        const w = targetWidth;
        const h = targetHeight;
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);

        // bg (full) + blur (half)
        const bgW = w;
        const bgH = h;
        const blurW = Math.max(1, (w / 2) | 0);
        const blurH = Math.max(1, (h / 2) | 0);
        sizesRef.current = { bgW, bgH, blurW, blurH };
        bgDirtyRef.current = true;
        hasBgFrameRef.current = false;

        // reallocate FBO textures
        if (texBgRef.current) gl.deleteTexture(texBgRef.current);
        if (fboBgRef.current) gl.deleteFramebuffer(fboBgRef.current);
        texBgRef.current = setupTex(gl, bgW, bgH);
        fboBgRef.current = setupFbo(gl, texBgRef.current);

        if (texBlurRef.current) gl.deleteTexture(texBlurRef.current);
        if (fboBlurRef.current) gl.deleteFramebuffer(fboBlurRef.current);
        texBlurRef.current = setupTex(gl, blurW, blurH);
        fboBlurRef.current = setupFbo(gl, texBlurRef.current);
    }, [quality, dprCap, zIndex]);

    const scheduleResize = useCallback(() => {
        if (resizeRafRef.current !== null) return;

        resizeRafRef.current = requestAnimationFrame(() => {
            resizeRafRef.current = null;
            resize();
        });
    }, [resize]);

    useEffect(() => {
        loadStateRef.current = 'pending';
        onLoadStateChange?.('pending');
    }, [onLoadStateChange]);

    const start = useCallback(() => {
        if (rafRef.current) return;

        const loop = (t: number) => {
            const gl = glRef.current;
            const canvas = canvasRef.current;
            const progBg = progBgRef.current;
            const progBlur = progBlurRef.current;
            const progMask = progMaskRef.current;
            const progLens = progLensRef.current;
            const vaoFull = vaoFullRef.current;
            const vaoFan = vaoFanRef.current;
            const vboFan = vboFanRef.current;
            const texVideo = texVideoRef.current;
            const fboBg = fboBgRef.current;
            const texBg = texBgRef.current;
            const fboBlur = fboBlurRef.current;
            const texBlur = texBlurRef.current;

            if (!gl || !canvas || !progBg || !progBlur || !progMask || !progLens || !vaoFull || !vaoFan || !vboFan || !texVideo || !fboBg || !texBg || !fboBlur || !texBlur) {
                rafRef.current = requestAnimationFrame(loop);
                return;
            }

            const nextViewport = getEdgeViewportMetrics();
            const nextScale = Math.min(dprCap, nextViewport.dpr) * Math.max(0.6, Math.min(1, quality));

            if (
                nextViewport.w !== vpCssRef.current.w ||
                nextViewport.h !== vpCssRef.current.h ||
                Math.abs(nextScale - fbScaleRef.current) > 0.0001
            ) {
                resize();
                rafRef.current = requestAnimationFrame(loop);
                return;
            }

            const vp = vpCssRef.current;
            const canvasRect = getEdgeViewportRect();
            const viewportMargin = 96;
            const orderedLenses = [...mapRef.current.values()]
                .filter((h) => h.enabledRef.current)
                .sort((a, b) => {
                    const ao = a.orderRef.current ?? 0;
                    const bo = b.orderRef.current ?? 0;
                    return ao - bo;
                });

            const syncedShapes = new Set<((timestamp?: number) => void)>();
            for (const h of orderedLenses) {
                const sync = h.syncRef?.current;
                if (sync && !syncedShapes.has(sync)) {
                    syncedShapes.add(sync);
                    sync(t);
                }
            }

            const visibleLenses: Array<{
                h: LiquidGlassHandle;
                rect: { left: number; top: number; width: number; height: number; right: number; bottom: number };
                baseWidth: number;
                baseHeight: number;
            }> = [];

            for (const h of orderedLenses) {
                const geometry = h.geometryRef?.current;
                const domRect = (geometry?.rect ?? h.el.getBoundingClientRect()) as RectLike;
                const rawLeft = domRect.left;
                const rawTop = domRect.top;
                const rawRight = domRect.right ?? domRect.left + domRect.width;
                const rawBottom = domRect.bottom ?? domRect.top + domRect.height;
                const rect = {
                    left: toCanvasX(rawLeft, canvasRect),
                    top: toCanvasY(rawTop, canvasRect),
                    width: domRect.width,
                    height: domRect.height,
                    right: toCanvasX(rawRight, canvasRect),
                    bottom: toCanvasY(rawBottom, canvasRect),
                };

                if (rect.width < 1 || rect.height < 1) continue;
                if (
                    rect.right < -viewportMargin ||
                    rect.bottom < -viewportMargin ||
                    rect.left > vp.w + viewportMargin ||
                    rect.top > vp.h + viewportMargin
                ) continue;

                visibleLenses.push({
                    h,
                    rect,
                    baseWidth: Math.max(1, geometry?.baseWidth ?? h.el.offsetWidth),
                    baseHeight: Math.max(1, geometry?.baseHeight ?? h.el.offsetHeight),
                });
            }

            if (visibleLenses.length === 0 || document.hidden) {
                rafRef.current = requestAnimationFrame(loop);
                return;
            }

            const vid = videoRef.current;
            const videoReady = vid !== null && vid.readyState >= 2 && vid.videoWidth > 0 && vid.videoHeight > 0;
            const { bgW, bgH, blurW, blurH } = sizesRef.current;

            if (vid && videoReady) {
                const videoTime = Number.isFinite(vid.currentTime) ? vid.currentTime : 0;
                const videoFrameChanged = Math.abs(videoTime - lastVideoTimeRef.current) > 0.0005;
                const videoSizeChanged =
                    vid.videoWidth !== lastVideoSizeRef.current.w ||
                    vid.videoHeight !== lastVideoSizeRef.current.h;
                const videoRectInViewport = getVideoMediaRect(vid);
                const videoRect = {
                    left: toCanvasX(videoRectInViewport.left, canvasRect),
                    top: toCanvasY(videoRectInViewport.top, canvasRect),
                    width: videoRectInViewport.width,
                    height: videoRectInViewport.height,
                };
                const videoRectChanged = !nearlySameRect(videoRect, lastBgRectRef.current);

                if (videoFrameChanged || videoSizeChanged || videoRectChanged || bgDirtyRef.current) {
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, texVideo);

                    if (videoFrameChanged || videoSizeChanged || !hasBgFrameRef.current) {
                        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid);
                    }

                    lastVideoTimeRef.current = videoTime;
                    lastVideoSizeRef.current = { w: vid.videoWidth, h: vid.videoHeight };
                    lastBgRectRef.current = videoRect;
                    bgDirtyRef.current = false;
                    hasBgFrameRef.current = true;

                    // pass 1: video -> bgTex, using the real DOM video box/object-position
                    gl.bindFramebuffer(gl.FRAMEBUFFER, fboBg);
                    gl.viewport(0, 0, bgW, bgH);
                    gl.disable(gl.DEPTH_TEST);
                    gl.disable(gl.STENCIL_TEST);
                    gl.disable(gl.SCISSOR_TEST);
                    gl.disable(gl.BLEND);

                    gl.useProgram(progBg);
                    gl.bindVertexArray(vaoFull);
                    gl.uniform1i(uniBg.current.uVideo, 0);
                    gl.uniform2f(uniBg.current.uViewportCss, vpCssRef.current.w, vpCssRef.current.h);
                    gl.uniform4f(uniBg.current.uVideoRectCss, videoRect.left, videoRect.top, videoRect.width, videoRect.height);
                    gl.drawArrays(gl.TRIANGLES, 0, 6);

                    // pass 2: bgTex -> blurTex (half)
                    gl.bindFramebuffer(gl.FRAMEBUFFER, fboBlur);
                    gl.viewport(0, 0, blurW, blurH);
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, texBg);

                    gl.useProgram(progBlur);
                    gl.bindVertexArray(vaoFull);
                    gl.uniform1i(uniBlur.current.uSrc, 0);
                    gl.uniform2f(uniBlur.current.uSrcSize, bgW, bgH);
                    gl.drawArrays(gl.TRIANGLES, 0, 6);
                }
            }

            if (!hasBgFrameRef.current) {
                rafRef.current = requestAnimationFrame(loop);
                return;
            }

            // pass 3: lenses to screen with stencil masks
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, canvas.width, canvas.height);

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

            gl.enable(gl.STENCIL_TEST);
            gl.stencilMask(0xff);

            gl.clearColor(0, 0, 0, 0);
            gl.clearStencil(0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

            const scale = fbScaleRef.current;

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texBg);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, texBlur);

            let ref = 1;

            for (const { h, rect, baseWidth, baseHeight } of visibleLenses) {

                const pad = h.padRef.current || 0;

// исходный размер blob ДО css transform / owner geometry
                const baseW = baseWidth;
                const baseH = baseHeight;

// фактический scale по осям
                const scaleX = rect.width / baseW;
                const scaleY = rect.height / baseH;

// pad тоже обязан масштабироваться
                const padX = pad * scaleX;
                const padY = pad * scaleY;

// inner rect (реальная область пузыря уже после transform)
                const innerLeft = rect.left + padX;
                const innerTop = rect.top + padY;
                const innerW = rect.width - padX * 2;
                const innerH = rect.height - padY * 2;

                if (innerW < 2 || innerH < 2) continue;

                const pts = h.pointsRef.current;
                const N = h.countRef.current;
                if (N < 3 || pts.length < N * 2) continue;

                const shape = buildPolarShape(pts, N, rect, scaleX, scaleY);

                // scissor (fb coords)
                const sx = Math.max(0, Math.floor(shape.minX * scale) - 2);
                const sy = Math.max(0, Math.floor((vp.h - shape.maxY) * scale) - 2);
                const sw = Math.min(canvas.width - sx, Math.ceil((shape.maxX - shape.minX) * scale) + 4);
                const sh = Math.min(canvas.height - sy, Math.ceil((shape.maxY - shape.minY) * scale) + 4);

                if (sw <= 0 || sh <= 0) continue;

                gl.enable(gl.SCISSOR_TEST);
                gl.scissor(sx, sy, sw, sh);

                // build triangle fan in clip space
                const cxCss = shape.cx;
                const cyCss = shape.cy;

                const cx = (cxCss / vp.w) * 2 - 1;
                const cy = 1 - (cyCss / vp.h) * 2;

                const need = (N + 2) * 2;
                const tmp = ensureFanTmp(need);

                tmp[0] = cx; tmp[1] = cy;
                let o = 2;

                for (let i = 0; i < N; i++) {
                    const x = rect.left + pts[i * 2] * scaleX;
                    const y = rect.top + pts[i * 2 + 1] * scaleY;
                    tmp[o++] = (x / vp.w) * 2 - 1;
                    tmp[o++] = 1 - (y / vp.h) * 2;
                }

                const x0 = rect.left + pts[0] * scaleX;
                const y0 = rect.top + pts[1] * scaleY;
                tmp[o++] = (x0 / vp.w) * 2 - 1;
                tmp[o++] = 1 - (y0 / vp.h) * 2;

                gl.bindBuffer(gl.ARRAY_BUFFER, vboFan);
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, tmp.subarray(0, o));

                // stencil write
                gl.colorMask(false, false, false, false);
                gl.stencilMask(0xff);
                gl.stencilFunc(gl.ALWAYS, ref, 0xff);
                gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);

                gl.useProgram(progMask);
                gl.bindVertexArray(vaoFan);
                gl.drawArrays(gl.TRIANGLE_FAN, 0, (o / 2) | 0);

                // lens draw
                gl.colorMask(true, true, true, true);
                gl.stencilMask(0x00);
                gl.stencilFunc(gl.EQUAL, ref, 0xff);
                gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

                const p = h.paramsRef.current;

                gl.useProgram(progLens);
                gl.bindVertexArray(vaoFull);

                gl.uniform1i(uniLens.current.uBg, 0);
                gl.uniform1i(uniLens.current.uBlur, 1);

                gl.uniform2f(uniLens.current.uViewportCss, vp.w, vp.h);
                gl.uniform2f(uniLens.current.uRectPosCss, innerLeft, innerTop);
                gl.uniform2f(uniLens.current.uRectSizeCss, innerW, innerH);
                const pointerAge = Math.max(0, t - pointerRef.current.lastT);
                const pointerActive = pointerRef.current.active * Math.exp(-pointerAge / 900);

                gl.uniform2f(uniLens.current.uLight, lightRef.current.x, lightRef.current.y);
                gl.uniform2f(uniLens.current.uPointerCss, pointerRef.current.x, pointerRef.current.y);
                gl.uniform1f(uniLens.current.uPointerActive, pointerActive);
                gl.uniform1f(uniLens.current.uScale, scale);

                gl.uniform1f(uniLens.current.uTime, t * 0.001);
                gl.uniform1f(uniLens.current.uIntensity, p.intensity);
                gl.uniform1f(uniLens.current.uMagnify, p.magnify);
                gl.uniform1f(uniLens.current.uBlurAmt, p.blur);
                gl.uniform1f(uniLens.current.uChromatic, p.chromatic);
                gl.uniform1f(uniLens.current.uRim, p.rim);
                gl.uniform1f(uniLens.current.uSpec, p.spec);
                gl.uniform1f(uniLens.current.uTint, p.tint);
                gl.uniform1f(uniLens.current.uAlpha, p.alpha);
                gl.uniform1f(uniLens.current.uEdgePull, p.edgePull);
                gl.uniform1f(uniLens.current.uEdgePower, p.edgePower);
                gl.uniform1f(uniLens.current.uEdgeSingularity, p.edgeSingularity);
                gl.uniform1f(uniLens.current.uDirMode, p.dirMode ?? 0);

                gl.activeTexture(gl.TEXTURE2);
                gl.bindTexture(gl.TEXTURE_2D, shapeTexRef.current);
                gl.texSubImage2D(
                    gl.TEXTURE_2D,
                    0,
                    0,
                    0,
                    SHAPE_SAMPLES,
                    1,
                    gl.RED,
                    gl.UNSIGNED_BYTE,
                    shapeBytesRef.current
                );

                gl.uniform1i(uniLens.current.uShapePolar, 2);
                gl.uniform2f(uniLens.current.uCenterCss, shape.cx, shape.cy);
                gl.uniform1f(uniLens.current.uShapeMaxRadius, shape.maxRadius);

                gl.drawArrays(gl.TRIANGLES, 0, 6);

                ref++;
                if (ref > 250) ref = 1;
            }

            gl.disable(gl.SCISSOR_TEST);
            gl.disable(gl.STENCIL_TEST);

            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
    }, [videoRef, dprCap, quality, resize]);

    const stop = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
    }, []);

    const register = useCallback<RegisterLiquidGlass>((h) => {
        mapRef.current.set(h.id, h);
        start();

        return () => {
            mapRef.current.delete(h.id);
            if (mapRef.current.size === 0) stop();
        };
    }, [start, stop]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl2', {
            alpha: true,
            stencil: true,
            antialias: false,
            premultipliedAlpha: true,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false,
        });

        if (!gl) {
            canvas.style.display = 'none';
            emitLoadState('skipped');
            return;
        }
        glRef.current = gl;

        const progBg = program(gl, VS, FS_BG);
        const progBlur = program(gl, VS, FS_BLUR_HALF);
        const progMask = program(gl, VS, FS_MASK);
        const progLens = program(gl, VS, FS_LENS);

        progBgRef.current = progBg;
        progBlurRef.current = progBlur;
        progMaskRef.current = progMask;
        progLensRef.current = progLens;

        // fullscreen quad
        const quad = new Float32Array([
            -1, -1,   1, -1,   1,  1,
            -1, -1,   1,  1,  -1,  1,
        ]);

        const vaoFull = gl.createVertexArray();
        const vboFull = gl.createBuffer();
        if (!vaoFull || !vboFull) return;

        vaoFullRef.current = vaoFull;
        vboFullRef.current = vboFull;

        gl.bindVertexArray(vaoFull);
        gl.bindBuffer(gl.ARRAY_BUFFER, vboFull);
        gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);

        // fan vao/vbo
        const vaoFan = gl.createVertexArray();
        const vboFan = gl.createBuffer();
        if (!vaoFan || !vboFan) return;

        vaoFanRef.current = vaoFan;
        vboFanRef.current = vboFan;

        gl.bindVertexArray(vaoFan);
        gl.bindBuffer(gl.ARRAY_BUFFER, vboFan);
        gl.bufferData(gl.ARRAY_BUFFER, 4 * 16384, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);

        // video texture
        const texVideo = gl.createTexture();
        if (!texVideo) return;
        texVideoRef.current = texVideo;

        gl.bindTexture(gl.TEXTURE_2D, texVideo);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));

        const texShape = gl.createTexture();
        if (!texShape) return;
        shapeTexRef.current = texShape;

        gl.bindTexture(gl.TEXTURE_2D, texShape);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.R8,
            SHAPE_SAMPLES,
            1,
            0,
            gl.RED,
            gl.UNSIGNED_BYTE,
            new Uint8Array(SHAPE_SAMPLES)
        );

        // uniforms
        gl.useProgram(progBg);
        uniBg.current.uVideo = gl.getUniformLocation(progBg, 'uVideo');
        uniBg.current.uViewportCss = gl.getUniformLocation(progBg, 'uViewportCss');
        uniBg.current.uVideoRectCss = gl.getUniformLocation(progBg, 'uVideoRectCss');

        gl.useProgram(progBlur);
        uniBlur.current.uSrc = gl.getUniformLocation(progBlur, 'uSrc');
        uniBlur.current.uSrcSize = gl.getUniformLocation(progBlur, 'uSrcSize');

        gl.useProgram(progLens);
        uniLens.current.uBg = gl.getUniformLocation(progLens, 'uBg');
        uniLens.current.uBlur = gl.getUniformLocation(progLens, 'uBlur');
        uniLens.current.uViewportCss = gl.getUniformLocation(progLens, 'uViewportCss');
        uniLens.current.uRectPosCss = gl.getUniformLocation(progLens, 'uRectPosCss');
        uniLens.current.uRectSizeCss = gl.getUniformLocation(progLens, 'uRectSizeCss');
        uniLens.current.uScale = gl.getUniformLocation(progLens, 'uScale');
        uniLens.current.uTime = gl.getUniformLocation(progLens, 'uTime');
        uniLens.current.uPointerCss = gl.getUniformLocation(progLens, 'uPointerCss');
        uniLens.current.uPointerActive = gl.getUniformLocation(progLens, 'uPointerActive');
        uniLens.current.uIntensity = gl.getUniformLocation(progLens, 'uIntensity');
        uniLens.current.uMagnify = gl.getUniformLocation(progLens, 'uMagnify');
        uniLens.current.uBlurAmt = gl.getUniformLocation(progLens, 'uBlurAmt');
        uniLens.current.uChromatic = gl.getUniformLocation(progLens, 'uChromatic');
        uniLens.current.uRim = gl.getUniformLocation(progLens, 'uRim');
        uniLens.current.uSpec = gl.getUniformLocation(progLens, 'uSpec');
        uniLens.current.uTint = gl.getUniformLocation(progLens, 'uTint');
        uniLens.current.uAlpha = gl.getUniformLocation(progLens, 'uAlpha');
        uniLens.current.uLight = gl.getUniformLocation(progLens, 'uLight');
        uniLens.current.uEdgePull = gl.getUniformLocation(progLens, 'uEdgePull');
        uniLens.current.uEdgePower = gl.getUniformLocation(progLens, 'uEdgePower');
        uniLens.current.uEdgeSingularity = gl.getUniformLocation(progLens, 'uEdgeSingularity');
        uniLens.current.uDirMode = gl.getUniformLocation(progLens, 'uDirMode');
        uniLens.current.uShapePolar = gl.getUniformLocation(progLens, 'uShapePolar');
        uniLens.current.uCenterCss = gl.getUniformLocation(progLens, 'uCenterCss');
        uniLens.current.uShapeMaxRadius = gl.getUniformLocation(progLens, 'uShapeMaxRadius');

        const visualViewport = window.visualViewport;

        const handleContextLost = (e: Event) => {
            e.preventDefault();
            stop();
            canvas.style.display = 'none';
            emitLoadState('error');
        };

        const getPointerCanvasCoords = (e: PointerEvent) => {
            const canvasRect = getEdgeViewportRect();
            return {
                x: toCanvasX(e.clientX, canvasRect),
                y: toCanvasY(e.clientY, canvasRect),
            };
        };

        const handlePointerMove = (e: PointerEvent) => {
            const vp = vpCssRef.current;
            const pointer = getPointerCanvasCoords(e);
            pointerRef.current.x = pointer.x;
            pointerRef.current.y = pointer.y;
            pointerRef.current.active = e.pointerType === 'touch' ? 0.85 : 0.55;
            pointerRef.current.lastT = performance.now();

            lightRef.current.x = Math.max(-1, Math.min(1, (pointer.x / Math.max(1, vp.w)) * 2 - 1));
            lightRef.current.y = Math.max(-1, Math.min(1, (pointer.y / Math.max(1, vp.h)) * 2 - 1));
        };

        const handlePointerDown = (e: PointerEvent) => {
            const vp = vpCssRef.current;
            const pointer = getPointerCanvasCoords(e);
            pointerRef.current.x = pointer.x;
            pointerRef.current.y = pointer.y;
            pointerRef.current.active = 1;
            pointerRef.current.lastT = performance.now();

            lightRef.current.x = Math.max(-1, Math.min(1, (pointer.x / Math.max(1, vp.w)) * 2 - 1));
            lightRef.current.y = Math.max(-1, Math.min(1, (pointer.y / Math.max(1, vp.h)) * 2 - 1));
        };
        canvas.addEventListener('webglcontextlost', handleContextLost as EventListener, false);

        window.addEventListener('pointermove', handlePointerMove, { passive: true });
        window.addEventListener('pointerdown', handlePointerDown, { passive: true });

        resize();
        emitLoadState('ready');

        window.addEventListener('resize', scheduleResize, { passive: true });
        window.addEventListener('orientationchange', scheduleResize);
        window.addEventListener('pageshow', scheduleResize);
        window.addEventListener('appviewportchange', scheduleResize);
        visualViewport?.addEventListener('resize', scheduleResize);

        return () => {
            window.removeEventListener('resize', scheduleResize);
            window.removeEventListener('orientationchange', scheduleResize);
            window.removeEventListener('pageshow', scheduleResize);
            window.removeEventListener('appviewportchange', scheduleResize);
            visualViewport?.removeEventListener('resize', scheduleResize);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerdown', handlePointerDown);
            canvas.removeEventListener('webglcontextlost', handleContextLost as EventListener, false);
            if (resizeRafRef.current !== null) cancelAnimationFrame(resizeRafRef.current);
            stop();

            mapRef.current.clear();

            if (texVideoRef.current) gl.deleteTexture(texVideoRef.current);
            if (shapeTexRef.current) gl.deleteTexture(shapeTexRef.current);
            if (texBgRef.current) gl.deleteTexture(texBgRef.current);
            if (texBlurRef.current) gl.deleteTexture(texBlurRef.current);
            if (fboBgRef.current) gl.deleteFramebuffer(fboBgRef.current);
            if (fboBlurRef.current) gl.deleteFramebuffer(fboBlurRef.current);

            if (vboFullRef.current) gl.deleteBuffer(vboFullRef.current);
            if (vaoFullRef.current) gl.deleteVertexArray(vaoFullRef.current);
            if (vboFanRef.current) gl.deleteBuffer(vboFanRef.current);
            if (vaoFanRef.current) gl.deleteVertexArray(vaoFanRef.current);

            if (progBgRef.current) gl.deleteProgram(progBgRef.current);
            if (progBlurRef.current) gl.deleteProgram(progBlurRef.current);
            if (progMaskRef.current) gl.deleteProgram(progMaskRef.current);
            if (progLensRef.current) gl.deleteProgram(progLensRef.current);

            glRef.current = null;
        };
    }, [resize, scheduleResize, stop, emitLoadState]);

    const ctxValue = useMemo(() => register, [register]);

    return (
        <LiquidGlassRegistryProvider register={ctxValue} visualRootRef={visualRootRef}>
            <div
                className="app-edge-fixed-frame liquid-glass-canvas-frame"
                aria-hidden
                style={{zIndex}}
            >
                <canvas ref={canvasRef} className="liquid-glass-canvas" />
            </div>
            <div className="app-content-layer" style={{zIndex: zIndex + 1}}>
                {children}
                <div
                    className="app-edge-fixed-frame liquid-glass-visual-frame"
                    aria-hidden={false}
                    style={{zIndex: 0}}
                >
                    <div
                        ref={visualRootRef}
                        className="liquid-glass-visual-root"
                        style={{
                            pointerEvents: 'none',
                            zIndex: 0,
                        }}
                    />
                </div>
            </div>
        </LiquidGlassRegistryProvider>
    );
}