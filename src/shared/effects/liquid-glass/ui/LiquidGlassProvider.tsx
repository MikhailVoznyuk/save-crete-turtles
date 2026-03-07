'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
    LiquidGlassHandle,
    LiquidGlassRegistryProvider,
    RegisterLiquidGlass
} from "@/shared/effects/liquid-glass/model/context";

type Props = {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    children: React.ReactNode;
    quality?: number; // 0.6..1
    dprCap?: number;  // 1..2
    zIndex?: number;
};

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
uniform vec2 uViewport;
uniform vec2 uVideoSize;

vec2 coverUv(vec2 viewportUv, vec2 viewportSize, vec2 videoSize) {
  float vpA = viewportSize.x / viewportSize.y;
  float vdA = max(1.0, videoSize.x) / max(1.0, videoSize.y);
  vec2 scale = vec2(1.0);
  float ratio = vpA / vdA;
  if (ratio < 1.0) scale.x = ratio;
  else scale.y = 1.0 / ratio;
  return (viewportUv - 0.5) * scale + 0.5;
}

void main(){
  vec2 uv = coverUv(vUv, uViewport, uVideoSize);
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

float edge = smoothstep(0.65, 1.02, rho01);
float center = 1.0 - smoothstep(0.0, 0.95, rho01);

// базовый "объем"
float mag = uMagnify * (0.25 + 0.75 * edge);
float r2 = r * (1.0 - mag);

float rhoC = clamp(rho, 0.0, 0.995);
float e0 = smoothstep(0.45, 1.0, rhoC);
float hard = pow(e0, uEdgePower);
float singular = 1.0 / max(uEdgeSingularity, 1.0 - rhoC);

// ВАЖНО: теперь pull считается относительно РЕАЛЬНОЙ границы, а не овала
float pull = uIntensity * uEdgePull * hard * (0.00020 + 0.00110 * singular);
r2 += pull * rb;

float wob = (
  sin(uTime * 1.1 + dir.x * 7.0 + dir.y * 3.0) +
  sin(uTime * 0.8 + dir.y * 11.0)
) * 0.5;

r2 += wob * (0.0022 * uIntensity) * hard * rb;

vec2 css2 = uCenterCss + dir * r2;
vec2 uv = css2 / max(uViewportCss, vec2(1.0));
uv = clamp(uv, vec2(0.001), vec2(0.999));

  // chromatic aberration near edge
  float ca = uChromatic * pow(edge, 1.6) * 0.0022;
  vec2 caOff = dir * ca;

  vec3 sharp;
  sharp.r = texture(uBg, uv + caOff).r;
  sharp.g = texture(uBg, uv).g;
  sharp.b = texture(uBg, uv - caOff).b;

  vec3 blur = texture(uBlur, uv).rgb;

  // blur profile: центр более матовый, край чище
  float frost = clamp(uBlurAmt, 0.0, 1.0);
  float mixW = frost * (0.78 * pow(center, 1.35) + 0.12 * edge);
  vec3 col = mix(sharp, blur, mixW);

  // мягкий синий оттенок материала (не "заливка")
  vec3 blue = vec3(0.10, 0.55, 1.0);
  col += blue * (0.035 + 0.12*uTint) * (0.55*center + 0.15*edge);

  // --- Fresnel + specular (живой блик) ---
  vec2 pr = dir * clamp(rho, 0.0, 1.0);              // граница ~1
  float rr = clamp(length(pr), 0.0, 1.0);
  float z = sqrt(max(0.0, 1.0 - rr*rr));
  vec3 n = normalize(vec3(pr.x, pr.y, z));
  vec3 V = vec3(0.0, 0.0, 1.0);

  // "свет" двигаем от pointer (как tilt)
  vec3 L = normalize(vec3(-0.35 + 0.35*uLight.x, -0.18 + 0.35*uLight.y, 0.92));
  vec3 H = normalize(L + V);

  float fres = pow(1.0 - max(dot(n, V), 0.0), 3.8);

  // два лоба: sharp + broad
  float s1 = pow(max(dot(n, H), 0.0), 140.0);
  float s2 = pow(max(dot(n, H), 0.0), 26.0);

  // streak (вытянутый блик)
  vec2 sd = normalize(vec2(-0.6, 0.8));
  float along = dot(pr, sd);
  float across = dot(pr, vec2(sd.y, -sd.x));
  float streak = exp(- (across*across) / (0.08)) * smoothstep(-0.2, 0.6, along);

  vec3 rimCol = blue * fres * uRim * (0.20 + 0.80*edge);
  vec3 specCol = vec3(1.0) * s1 * uSpec * (0.25 + 0.75*streak);
  vec3 specCol2 = blue * s2 * (0.18*uSpec);

  col += rimCol + specCol + specCol2;

  // внутренняя тень для "толщины"
  col *= 1.0 - (0.10 * edge);

  // микрошум (дизеринг)
  float nse = hash12(gl_FragCoord.xy + uTime*60.0);
  col += (nse - 0.5) * 0.010;

  // лёгкая гамма (без агрессивного tonemap)
  col = pow(max(col, 0.0), vec3(1.0/2.2));

  o = vec4(col, clamp(uAlpha, 0.0, 1.0));
}
`;

export function LiquidGlassProvider({
                                        videoRef,
                                        children,
                                        quality = 0.78,
                                        dprCap = 2,
                                        zIndex = 0,
                                    }: Props) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const glRef = useRef<WebGL2RenderingContext | null>(null);

    const mapRef = useRef(new Map<string, LiquidGlassHandle & { visible: boolean; io?: IntersectionObserver }>());
    const rafRef = useRef<number | null>(null);

    const fbScaleRef = useRef(1);
    const vpCssRef = useRef({ w: 1, h: 1 });

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



    const uniBg = useRef({ uVideo: null as any, uViewport: null as any, uVideoSize: null as any });
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

        for (let i = 0; i < N; i++) {
            const x = rect.left + pts[i * 2] * scaleX;
            const y = rect.top + pts[i * 2 + 1] * scaleY;

            sumX += x;
            sumY += y;

            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }

        const cx = sumX / N;
        const cy = sumY / N;

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

        const dpr = Math.min(dprCap, window.devicePixelRatio || 1);
        const q = Math.max(0.6, Math.min(1, quality));
        const scale = dpr * q;

        const wCss = Math.max(1, window.innerWidth);
        const hCss = Math.max(1, window.innerHeight);

        vpCssRef.current = { w: wCss, h: hCss };
        fbScaleRef.current = scale;

        canvas.style.position = 'fixed';
        canvas.style.inset = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = String(zIndex);

        const w = Math.max(1, Math.floor(wCss * scale));
        const h = Math.max(1, Math.floor(hCss * scale));
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);

        // bg (full) + blur (half)
        const bgW = w;
        const bgH = h;
        const blurW = Math.max(1, (w / 2) | 0);
        const blurH = Math.max(1, (h / 2) | 0);
        sizesRef.current = { bgW, bgH, blurW, blurH };

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

            const lenses = mapRef.current;
            let any = false;
            for (const h of lenses.values()) {
                if (h.visible && h.enabledRef.current) { any = true; break; }
            }

            gl.clearColor(0, 0, 0, 0);
            gl.clearStencil(0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

            if (!any) {
                rafRef.current = requestAnimationFrame(loop);
                return;
            }

            const vid = videoRef.current;
            if (!vid || vid.readyState < 2 || vid.videoWidth <= 0 || vid.videoHeight <= 0) {
                rafRef.current = requestAnimationFrame(loop);
                return;
            }

            // update video texture
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texVideo);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid);

            const vp = vpCssRef.current;
            const { bgW, bgH, blurW, blurH } = sizesRef.current;



            // pass 1: video -> bgTex (cover)
            gl.bindFramebuffer(gl.FRAMEBUFFER, fboBg);
            gl.viewport(0, 0, bgW, bgH);
            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.STENCIL_TEST);
            gl.disable(gl.SCISSOR_TEST);
            gl.disable(gl.BLEND);

            gl.useProgram(progBg);
            gl.bindVertexArray(vaoFull);
            gl.uniform1i(uniBg.current.uVideo, 0);
            gl.uniform2f(uniBg.current.uViewport, bgW, bgH);
            gl.uniform2f(uniBg.current.uVideoSize, vid.videoWidth, vid.videoHeight);
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

            for (const h of lenses.values()) {
                if (!h.visible || !h.enabledRef.current) continue;

                const rect = h.el.getBoundingClientRect();

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
                const sx = Math.floor(shape.minX * scale) - 2;
                const sy = Math.floor((vp.h - shape.maxY) * scale) - 2;
                const sw = Math.ceil((shape.maxX - shape.minX) * scale) + 4;
                const sh = Math.ceil((shape.maxY - shape.minY) * scale) + 4;

                gl.enable(gl.SCISSOR_TEST);
                gl.scissor(sx, sy, sw, sh);

                // build triangle fan in clip space
                const cxCss = rect.left + rect.width * 0.5;
                const cyCss = rect.top + rect.height * 0.5;

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
    }, [videoRef]);

    const stop = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
    }, []);

    const register = useCallback<RegisterLiquidGlass>((h) => {
        const entry = { ...h, visible: true } as any;

        if (typeof IntersectionObserver !== 'undefined') {
            const io = new IntersectionObserver(
                ([e]) => {
                    const cur = mapRef.current.get(h.id);
                    if (cur) cur.visible = !!e?.isIntersecting;
                },
                { root: null, rootMargin: '180px', threshold: 0.01 }
            );
            io.observe(h.el);
            entry.io = io;
        }

        mapRef.current.set(h.id, entry);
        start();

        return () => {
            const cur: any = mapRef.current.get(h.id);
            if (cur?.io) cur.io.disconnect();
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
            antialias: true,
            premultipliedAlpha: false,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false,
        });

        if (!gl) return;
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
        uniBg.current.uViewport = gl.getUniformLocation(progBg, 'uViewport');
        uniBg.current.uVideoSize = gl.getUniformLocation(progBg, 'uVideoSize');

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

        const onMove = (e: PointerEvent) => {
            const x = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
            const y = -((e.clientY / Math.max(1, window.innerHeight)) * 2 - 1);
            lightRef.current.x = x;
            lightRef.current.y = y;
        };

        resize();

        window.addEventListener('resize', resize, { passive: true });
        window.addEventListener('pointermove', onMove, { passive: true });

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('pointermove', onMove);
            stop();

            for (const v of mapRef.current.values() as any) v.io?.disconnect();
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
    }, [resize, stop]);

    const ctxValue = useMemo(() => register, [register]);

    return (
        <LiquidGlassRegistryProvider register={ctxValue}>
            <canvas ref={canvasRef} />
            {children}
        </LiquidGlassRegistryProvider>
    );
}