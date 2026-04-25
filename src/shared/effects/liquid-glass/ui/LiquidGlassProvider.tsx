'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
    LiquidGlassHandle,
    LiquidGlassRegistryProvider,
    RegisterLiquidGlass
} from "@/shared/effects/liquid-glass/model/context";
import type {LoadState} from '@/shared/types/load-state';

type Props = {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    children: React.ReactNode;
    quality?: number; // 0.6..1
    dprCap?: number;  // 1..2
    zIndex?: number;
    onLoadStateChange?: (state: LoadState) => void;
};

function getViewportMetrics() {
    const visualViewport = window.visualViewport;
    const docEl = document.documentElement;

    return {
        w: Math.max(1, Math.round(visualViewport?.width ?? docEl.clientWidth ?? window.innerWidth)),
        h: Math.max(1, Math.round(visualViewport?.height ?? docEl.clientHeight ?? window.innerHeight)),
        dpr: Math.min(window.devicePixelRatio || 1, 4),
    };
}

type VideoLayoutMetrics = {
    left: number;
    top: number;
    width: number;
    height: number;
    objectX: number;
    objectY: number;
};

function parseObjectPositionAxis(token: string | undefined, axis: 'x' | 'y') {
    if (!token) return 0.5;

    const value = token.trim().toLowerCase();
    if (value === 'center') return 0.5;
    if (axis === 'x' && value === 'left') return 0;
    if (axis === 'x' && value === 'right') return 1;
    if (axis === 'y' && value === 'top') return 0;
    if (axis === 'y' && value === 'bottom') return 1;

    if (value.endsWith('%')) {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed / 100 : 0.5;
    }

    return 0.5;
}

function readVideoLayout(video: HTMLVideoElement): VideoLayoutMetrics {
    const rect = video.getBoundingClientRect();
    const style = window.getComputedStyle(video);
    const tokens = style.objectPosition.trim().split(/\s+/);

    let xToken = tokens[0];
    let yToken = tokens[1];

    if (tokens.length === 1) {
        if (xToken === 'top' || xToken === 'bottom') {
            yToken = xToken;
            xToken = 'center';
        } else {
            yToken = 'center';
        }
    }

    if (xToken === 'top' || xToken === 'bottom') {
        [xToken, yToken] = [yToken ?? 'center', xToken];
    }

    return {
        left: rect.left,
        top: rect.top,
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
        objectX: parseObjectPositionAxis(xToken, 'x'),
        objectY: parseObjectPositionAxis(yToken, 'y'),
    };
}

function almostSameVideoLayout(a: VideoLayoutMetrics, b: VideoLayoutMetrics) {
    return Math.abs(a.left - b.left) < 0.5 &&
        Math.abs(a.top - b.top) < 0.5 &&
        Math.abs(a.width - b.width) < 0.5 &&
        Math.abs(a.height - b.height) < 0.5 &&
        Math.abs(a.objectX - b.objectX) < 0.001 &&
        Math.abs(a.objectY - b.objectY) < 0.001;
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
uniform vec2 uVideoSize;
uniform vec2 uObjectPos;

vec2 coverUvFromCss(vec2 css, vec4 videoRect, vec2 videoSize, vec2 objectPos) {
  vec2 boxSize = max(videoRect.zw, vec2(1.0));
  vec2 srcSize = max(videoSize, vec2(1.0));

  float coverScale = max(boxSize.x / srcSize.x, boxSize.y / srcSize.y);
  vec2 renderedSize = srcSize * coverScale;
  vec2 renderedOffset = (boxSize - renderedSize) * objectPos;
  vec2 local = css - videoRect.xy;

  return (local - renderedOffset) / renderedSize;
}

void main(){
  vec2 css = vUv * uViewportCss;
  vec2 uv = coverUvFromCss(css, uVideoRectCss, uVideoSize, clamp(uObjectPos, vec2(0.0), vec2(1.0)));
  uv = clamp(uv, vec2(0.001), vec2(0.999));
  o = texture(uVideo, uv);
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

uniform vec2  uLight;       // -1..1 (pointer)
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

float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float boundaryRadius(vec2 dir){
  float ang = atan(dir.y, dir.x);
  float u = (ang + 3.141592653589793) / 6.283185307179586;
  return max(1.0, texture(uShapePolar, vec2(fract(u), 0.5)).r * uShapeMaxRadius);
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

float filmPhase(float lambdaNm, float thicknessNm, float cosTheta){
  return 4.0 * 3.141592653589793 * 1.33 * thicknessNm * cosTheta / lambdaNm + 3.141592653589793;
}

vec3 thinFilmSpectrum(float thicknessNm, float cosTheta){
  // несколько спектральных линий вместо тупого RGB-cos.
  // это всё ещё аппроксимация, но выглядит заметно правдоподобнее.
  float i650 = 0.5 + 0.5 * cos(filmPhase(650.0, thicknessNm, cosTheta));
  float i580 = 0.5 + 0.5 * cos(filmPhase(580.0, thicknessNm, cosTheta));
  float i530 = 0.5 + 0.5 * cos(filmPhase(530.0, thicknessNm, cosTheta));
  float i490 = 0.5 + 0.5 * cos(filmPhase(490.0, thicknessNm, cosTheta));
  float i440 = 0.5 + 0.5 * cos(filmPhase(440.0, thicknessNm, cosTheta));

  vec3 rgb = vec3(0.0);
  rgb += i650 * vec3(1.00, 0.08, 0.00);
  rgb += i580 * vec3(1.00, 0.58, 0.00);
  rgb += i530 * vec3(0.20, 1.00, 0.16);
  rgb += i490 * vec3(0.00, 0.76, 1.00);
  rgb += i440 * vec3(0.24, 0.12, 1.00);

  rgb /= 2.55;
  rgb = clamp(rgb, 0.0, 1.0);
  rgb = pow(rgb, vec3(0.92));

  return rgb;
}

void main(){
  float cssX = gl_FragCoord.x / uScale;
  float cssY = ((uViewportCss.y*uScale) - gl_FragCoord.y) / uScale;
  vec2 css = vec2(cssX, cssY);

  vec2 dCss = css - uCenterCss;
float r = length(dCss);
vec2 dir = (r > 1e-5) ? (dCss / r) : vec2(1.0, 0.0);

float rb = boundaryRadius(dir);
float rho = r / max(rb, 1.0);
float rho01 = clamp(rho, 0.0, 1.2);

float edge = smoothstep(0.72, 1.02, rho01);
float body = 1.0 - smoothstep(0.0, 0.82, rho01);
float shoulder =
  smoothstep(0.10, 0.82, rho01) *
  (1.0 - smoothstep(0.58, 1.02, rho01));

// рефракция теперь живет не только на краю, а по большей части линзы
float mag = uMagnify * (0.68 * body + 0.52 * shoulder + 0.18 * edge);
float r2 = r * (1.0 - mag);

float rhoC = clamp(rho, 0.0, 0.995);
float e0 = smoothstep(0.25, 1.0, rhoC);
float hard = pow(e0, max(1.0, uEdgePower));
float singular = 1.0 / max(uEdgeSingularity, 1.0 - rhoC);

// край всё ещё работает, но уже не монопольно
float pull = uIntensity * uEdgePull * (0.00008 + 0.00048 * singular) * (0.30 + 0.70 * hard);
r2 += pull * rb;

float wob = (
  sin(uTime * 1.1 + dir.x * 7.0 + dir.y * 3.0) +
  sin(uTime * 0.8 + dir.y * 11.0)
) * 0.5;

// делаем wob тише, чтобы не было ощущения мутной массы
r2 += wob * (0.0014 * uIntensity) * (0.25 + 0.75 * hard) * rb;

vec2 css2 = uCenterCss + dir * r2;
vec2 uv = css2 / max(uViewportCss, vec2(1.0));
uv = clamp(uv, vec2(0.001), vec2(0.999));

// лёгкая CA, без жирной радужной грязи
float ca = uChromatic * pow(edge, 1.35) * 0.0012;
vec2 caOff = dir * ca;

vec3 sharp;
sharp.r = texture(uBg, uv + caOff).r;
sharp.g = texture(uBg, uv).g;
sharp.b = texture(uBg, uv - caOff).b;

vec3 blur = texture(uBlur, uv).rgb;

// blur оставляем, но уже как тонкую мягкость, а не матовость
float frost = clamp(uBlurAmt, 0.0, 1.0);
float mixW = frost * (0.10 + 0.12 * body + 0.04 * edge);
vec3 col = mix(sharp, blur, mixW);

float bgLum = dot(sharp, vec3(0.2126, 0.7152, 0.0722));

// На ярком фоне стекло должно чуть плотнеть и меньше "светиться".
// На тёмном можно позволить больше блика.
float brightBg = smoothstep(0.45, 0.82, bgLum);
float darkBg = 1.0 - brightBg;

// Лёгкая адаптивная плотность материала.
// Это не грязная серость, а мягкое удержание формы на ярком видео.
col *= mix(1.0, 0.88, brightBg * (0.35 + 0.65 * body));

// холодный глянец, а не синяя молочная заливка
vec3 blue = vec3(0.18, 0.56, 1.0);
float tintAmt = (0.008 + 0.028 * uTint) * (0.16 + 0.18 * body + 0.16 * edge);
tintAmt *= mix(1.0, 0.55, brightBg);
col += blue * tintAmt;

// нормаль для glossy-стекла
vec2 pr = dir * clamp(rho, 0.0, 1.0);
float rr = clamp(length(pr), 0.0, 1.0);
float z = sqrt(max(0.0, 1.0 - rr * rr));
vec3 n = normalize(vec3(pr.x, pr.y, z));
vec3 V = vec3(0.0, 0.0, 1.0);

// фиксированный холодный свет, без белого блика от курсора
vec3 L = normalize(vec3(-0.22, -0.12, 0.97));
vec3 H = normalize(L + V);

float NoV = max(dot(n, V), 0.0);
float fres = pow(1.0 - NoV, 3.2);

float s1 = pow(max(dot(n, H), 0.0), 120.0);
float s2 = pow(max(dot(n, H), 0.0), 34.0);

vec2 sd = normalize(vec2(-0.72, 0.70));
float along = dot(pr, sd);
float across = dot(pr, vec2(sd.y, -sd.x));
float streak = exp(-(across * across) / 0.10) * smoothstep(-0.15, 0.75, along);

// основной glossy-стеклянный слой НЕ ТРОГАЕМ по сути
vec3 gloss = vec3(0.70, 0.86, 1.0);
vec3 rimCol = blue * fres * uRim * (0.05 + 0.24 * edge);
vec3 specCol = gloss * s1 * (0.12 * uSpec) * (0.10 + 0.90 * streak);
vec3 specCol2 = blue * s2 * (0.07 * uSpec);

// --------------------------------------------------
// отдельная внутренняя thin-film оболочка
// она живёт не как наклейка на rim, а как своя пленка
// --------------------------------------------------

// немного сдвинутая и чуть отличающаяся оболочка,
// чтобы блик не выглядел пришитым к основной границе
vec2 prFilm = pr * vec2(0.96, 1.03) + vec2(0.0, -0.035);

float rrF = clamp(length(prFilm), 0.0, 1.0);
float zF = sqrt(max(0.0, 1.0 - rrF * rrF));
vec3 nFilm = normalize(vec3(prFilm.x, prFilm.y, zF));

float NoVf = max(dot(nFilm, V), 0.0);
float NoHf = max(dot(nFilm, H), 0.0);

// собственное поле толщины пленки.
// это и есть главное: не рисованная дуга, а живая толщина,
// которая медленно "стекает" как у мыльного пузыря.
vec2 flowUv = prFilm * vec2(1.12, 1.84);
float t = uTime * 0.036;

float d1 = fbm4(vec2(flowUv.x * 0.85 + 0.04 * t, flowUv.y * 1.18 - t));
float d2 = fbm4(vec2(flowUv.x * 2.10 - 0.03 * t, flowUv.y * 2.75 - 1.55 * t));

float topness = clamp(0.5 - 0.5 * prFilm.y, 0.0, 1.0);

// пленка заметнее в плечевой зоне и ближе к краю, но не на самой кромке
float filmZone =
    smoothstep(0.58, 0.90, rrF) *
    (1.0 - smoothstep(0.97, 1.04, rrF));

// физически-похожий drainage:
// сверху пленка тоньше, снизу толще, плюс медленная неоднородность
float thicknessNm =
    mix(760.0, 250.0, topness)
  - 120.0 * filmZone
  + 150.0 * (d1 - 0.5)
  + 55.0  * (d2 - 0.5);

thicknessNm = clamp(thicknessNm, 170.0, 900.0);

// угол для интерференции
float cosFilm = clamp(0.55 * NoVf + 0.45 * NoHf, 0.05, 1.0);

// спектральный цвет пленки
vec3 film = thinFilmSpectrum(thicknessNm, cosFilm);

// насыщенность интерференции.
// если chroma низкая, блик не надо насильно тащить наружу.
float chroma =
    max(max(film.r, film.g), film.b) -
    min(min(film.r, film.g), film.b);

// маска thin-film слоя:
// в верхней части и на скользящих углах он сильнее,
// поэтому получаются те самые живые дуги
float filmMask =
    smoothstep(0.46, 0.92, rrF) *
    (1.0 - smoothstep(0.985, 1.03, rrF)) *
    (0.50 + 0.50 * topness) *
    (0.35 + 0.65 * sqrt(fres + 1e-4)) *
    smoothstep(0.02, 0.10, chroma);

float filmBroad = pow(NoHf, 8.0);
float filmSharp = pow(NoHf, 20.0);

vec3 filmRim    = film * (0.09 + 0.1 * uSpec) * filmMask;
vec3 filmSheen  = film * (0.14 + 0.18 * uSpec) * filmBroad * filmMask;
vec3 filmAccent = film * (0.1 + 0.13 * uSpec) * filmSharp * filmMask * (0.45 + 0.55 * streak);

float glareCut = mix(1.0, 0.58, brightBg);
float filmCut  = mix(1.0, 0.64, brightBg);

rimCol     *= glareCut;
specCol    *= glareCut;
specCol2   *= glareCut;
filmRim    *= filmCut;
filmSheen  *= filmCut;
filmAccent *= filmCut;

vec3 glassAdd = rimCol + specCol + specCol2;
vec3 filmAdd = filmRim + filmSheen + filmAccent;

col += glassAdd;
col = mix(col, col + filmAdd, 0.72);

// почти убираем внутреннюю "грязную" тень
float formHold = 0.018 * shoulder + 0.030 * edge;
col *= 1.0 - formHold * (0.55 + 0.45 * brightBg);

// шум сильно тише, чтобы не было ощущения матового пластика
float nse = hash12(gl_FragCoord.xy + uTime * 60.0);
col += (nse - 0.5) * 0.0025;

  // лёгкая гамма (без агрессивного tonemap)
  col = max(col, 0.0);
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
    const lastVideoLayoutRef = useRef<VideoLayoutMetrics | null>(null);
    const lastCompositeTsRef = useRef(0);



    const uniBg = useRef({
        uVideo: null as any,
        uViewportCss: null as any,
        uVideoRectCss: null as any,
        uVideoSize: null as any,
        uObjectPos: null as any,
    });
    const uniBlur = useRef({ uSrc: null as any, uSrcSize: null as any });
    const uniLens = useRef({
        uBg: null as any,
        uBlur: null as any,
        uViewportCss: null as any,
        uRectPosCss: null as any,
        uRectSizeCss: null as any,
        uScale: null as any,
        uTime: null as any,
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
        rect: DOMRect,
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

        const viewport = getViewportMetrics();
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

        canvas.style.position = 'fixed';
        canvas.style.left = '0px';
        canvas.style.top = '0px';
        canvas.style.width = `${wCss}px`;
        canvas.style.height = `${hCss}px`;
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = String(zIndex);
        canvas.style.background = 'transparent';
        canvas.style.display = 'block';
        canvas.style.transform = 'translate3d(0px, 0px, 0)';
        canvas.style.willChange = 'transform';
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
        lastVideoLayoutRef.current = null;

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

            const nextViewport = getViewportMetrics();
            const nextScale = Math.min(dprCap, nextViewport.dpr) * Math.max(0.6, Math.min(1, quality));
            const targetVideoFrameMs = dprCap <= 1.5 ? 1000 / 30 : 1000 / 45;

            if (
                nextViewport.w !== vpCssRef.current.w ||
                nextViewport.h !== vpCssRef.current.h ||
                Math.abs(nextScale - fbScaleRef.current) > 0.0001
            ) {
                resize();
            }

            const vp = vpCssRef.current;
            const viewportMargin = 96;
            const orderedLenses = [...mapRef.current.values()]
                .filter((h) => h.enabledRef.current)
                .sort((a, b) => {
                    const ao = a.orderRef.current ?? 0;
                    const bo = b.orderRef.current ?? 0;
                    return ao - bo;
                });

            const visibleLenses: Array<{ h: LiquidGlassHandle; rect: DOMRect }> = [];
            for (const h of orderedLenses) {
                const rect = h.el.getBoundingClientRect();
                if (rect.width < 1 || rect.height < 1) continue;
                if (
                    rect.right < -viewportMargin ||
                    rect.bottom < -viewportMargin ||
                    rect.left > vp.w + viewportMargin ||
                    rect.top > vp.h + viewportMargin
                ) continue;
                visibleLenses.push({ h, rect });
            }

            if (document.hidden) {
                rafRef.current = requestAnimationFrame(loop);
                return;
            }

            if (visibleLenses.length === 0) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.viewport(0, 0, canvas.width, canvas.height);
                gl.disable(gl.SCISSOR_TEST);
                gl.disable(gl.STENCIL_TEST);
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);

                rafRef.current = requestAnimationFrame(loop);
                return;
            }

            const vid = videoRef.current;
            const videoReady = vid !== null && vid.readyState >= 2 && vid.videoWidth > 0 && vid.videoHeight > 0;
            const { bgW, bgH, blurW, blurH } = sizesRef.current;

            if (vid && videoReady) {
                const videoTime = Number.isFinite(vid.currentTime) ? vid.currentTime : 0;
                const videoLayout = readVideoLayout(vid);
                const videoFrameChanged = Math.abs(videoTime - lastVideoTimeRef.current) > 0.0005;
                const videoSizeChanged =
                    vid.videoWidth !== lastVideoSizeRef.current.w ||
                    vid.videoHeight !== lastVideoSizeRef.current.h;
                const videoLayoutChanged =
                    lastVideoLayoutRef.current === null ||
                    !almostSameVideoLayout(videoLayout, lastVideoLayoutRef.current);
                const canRefreshVideoFrame =
                    lastCompositeTsRef.current === 0 ||
                    t - lastCompositeTsRef.current >= targetVideoFrameMs ||
                    bgDirtyRef.current ||
                    videoSizeChanged ||
                    videoLayoutChanged;

                if ((videoFrameChanged && canRefreshVideoFrame) || videoSizeChanged || videoLayoutChanged || bgDirtyRef.current) {
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, texVideo);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid);

                    lastVideoTimeRef.current = videoTime;
                    lastVideoSizeRef.current = { w: vid.videoWidth, h: vid.videoHeight };
                    lastVideoLayoutRef.current = videoLayout;
                    lastCompositeTsRef.current = t;
                    bgDirtyRef.current = false;
                    hasBgFrameRef.current = true;

                    // pass 1: real video element -> bgTex.
                    // The DOM video is not always equal to the viewport: on mobile it has overscan,
                    // object-position, and sometimes a CSS scale. Sampling by its actual rect keeps
                    // the refraction glued to the same background pixels instead of teleporting.
                    gl.bindFramebuffer(gl.FRAMEBUFFER, fboBg);
                    gl.viewport(0, 0, bgW, bgH);
                    gl.disable(gl.DEPTH_TEST);
                    gl.disable(gl.STENCIL_TEST);
                    gl.disable(gl.SCISSOR_TEST);
                    gl.disable(gl.BLEND);

                    gl.useProgram(progBg);
                    gl.bindVertexArray(vaoFull);
                    gl.uniform1i(uniBg.current.uVideo, 0);
                    gl.uniform2f(uniBg.current.uViewportCss, vp.w, vp.h);
                    gl.uniform4f(
                        uniBg.current.uVideoRectCss,
                        videoLayout.left,
                        videoLayout.top,
                        videoLayout.width,
                        videoLayout.height
                    );
                    gl.uniform2f(uniBg.current.uVideoSize, vid.videoWidth, vid.videoHeight);
                    gl.uniform2f(uniBg.current.uObjectPos, videoLayout.objectX, videoLayout.objectY);
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

            if (canvas.style.transform !== 'translate3d(0px, 0px, 0)') {
                canvas.style.transform = 'translate3d(0px, 0px, 0)';
            }

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

            for (const { h, rect } of visibleLenses) {

                const pad = h.padRef.current || 0;

// исходный размер blob ДО css transform
                const baseW = Math.max(1, h.el.offsetWidth);
                const baseH = Math.max(1, h.el.offsetHeight);

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
                gl.uniform2f(uniLens.current.uLight, lightRef.current.x, lightRef.current.y);
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
        uniBg.current.uVideoSize = gl.getUniformLocation(progBg, 'uVideoSize');
        uniBg.current.uObjectPos = gl.getUniformLocation(progBg, 'uObjectPos');

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

        canvas.addEventListener('webglcontextlost', handleContextLost as EventListener, false);

        resize();
        emitLoadState('ready');

        window.addEventListener('resize', scheduleResize, { passive: true });
        window.addEventListener('orientationchange', scheduleResize);
        window.addEventListener('pageshow', scheduleResize);
        visualViewport?.addEventListener('resize', scheduleResize);
        visualViewport?.addEventListener('scroll', scheduleResize);

        return () => {
            window.removeEventListener('resize', scheduleResize);
            window.removeEventListener('orientationchange', scheduleResize);
            window.removeEventListener('pageshow', scheduleResize);
            visualViewport?.removeEventListener('resize', scheduleResize);
            visualViewport?.removeEventListener('scroll', scheduleResize);
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
        <LiquidGlassRegistryProvider register={ctxValue}>
            <canvas ref={canvasRef} aria-hidden />
            <div style={{ position: 'relative', zIndex: zIndex + 1 }}>
                {children}
            </div>
        </LiquidGlassRegistryProvider>
    );
}