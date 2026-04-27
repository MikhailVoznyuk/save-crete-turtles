'use client';

import {useEffect, useRef, type MutableRefObject, type RefObject} from 'react';
import * as THREE from 'three';
import {twMerge} from 'tailwind-merge';
import type {BubbleRepulsor} from '@/widgets/hero-block/model/types';
import type {LoadState} from '@/shared/types/load-state';

type HeroDustTextProps = {
    className?: string;
    containerRef: RefObject<HTMLElement | null>;
    titleRef: RefObject<HTMLElement | null>;
    textRef: RefObject<HTMLElement | null>;
    repulsorsRef: MutableRefObject<BubbleRepulsor[]>;
    onLoadStateChange?: (state: LoadState) => void;
}

type Snapshot = {
    width: number;
    height: number;
    positions: Float32Array;
    colors: Float32Array;
    alphas: Float32Array;
    count: number;
}


type LocalRepulsor = {
    x: number;
    y: number;
    rx: number;
    ry: number;
    strength: number;
    dx: number;
    dy: number;
    speed: number;
};


const SAFE_BUBBLE_GAP_PX = 10;
const COLLISION_EPSILON_PX = 0.75;
const RENDER_PADDING_PX = 180;
const EDGE_ALPHA_THRESHOLD = 10;
const ALPHA_BOOST_EXPONENT = 0.72;
const ALPHA_BOOST_MULTIPLIER = 1.08;
const MOBILE_POINT_SIZE = 2.0;
const DESKTOP_POINT_SIZE = 1.9;
const POINT_EDGE_SOFTNESS = 0.16;
const REPULSOR_SPEED_SMOOTHING = 18;
const MAX_REPULSOR_SPEED_PX_PER_FRAME = 14;
const FONT_READY_TIMEOUT_MS = 2400;
const SNAPSHOT_RETRY_DELAY_MS = 140;
const SNAPSHOT_FALLBACK_AFTER_MS = 5000;
const FIRST_RENDER_FALLBACK_AFTER_MS = 6500;

function delay(ms: number) {
    return new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

async function waitForRenderableFonts() {
    if (!('fonts' in document)) return;

    await Promise.race([
        document.fonts.ready.catch(() => undefined),
        delay(FONT_READY_TIMEOUT_MS),
    ]);
}

function applyTextTransform(text: string, transform: string) {
    if (transform === 'uppercase') return text.toUpperCase();
    if (transform === 'lowercase') return text.toLowerCase();
    if (transform === 'capitalize') {
        return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
    }

    return text;
}

function parseRadius(value: string) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
) {
    const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));

    ctx.beginPath();
    ctx.moveTo(x + safeRadius, y);
    ctx.lineTo(x + width - safeRadius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
    ctx.lineTo(x + width, y + height - safeRadius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
    ctx.lineTo(x + safeRadius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
    ctx.lineTo(x, y + safeRadius);
    ctx.quadraticCurveTo(x, y, x + safeRadius, y);
    ctx.closePath();
}

type AlphaBounds = {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
};

function getAlphaBounds(ctx: CanvasRenderingContext2D, width: number, height: number): AlphaBounds | null {
    const image = ctx.getImageData(0, 0, width, height).data;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const alpha = image[(y * width + x) * 4 + 3];

            if (alpha < EDGE_ALPHA_THRESHOLD) continue;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }
    }

    if (maxX < minX || maxY < minY) return null;

    return {minX, minY, maxX, maxY};
}

function drawGlyphsToCanvas(
    ctx: CanvasRenderingContext2D,
    element: HTMLElement,
    rootRect: DOMRect,
    padding: number,
) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const range = document.createRange();

    try {
        while (walker.nextNode()) {
            const textNode = walker.currentNode as Text;
            const rawText = textNode.textContent ?? '';

            if (!rawText.trim()) continue;

            const styleSource = textNode.parentElement ?? element;
            const style = window.getComputedStyle(styleSource);
            const transformedText = applyTextTransform(rawText, style.textTransform);

            const fontStyle = style.fontStyle && style.fontStyle !== 'normal' ? `${style.fontStyle} ` : '';
            const fontVariant = style.fontVariant && style.fontVariant !== 'normal' ? `${style.fontVariant} ` : '';
            const fontWeight = style.fontWeight ? `${style.fontWeight} ` : '';
            const fontSize = style.fontSize || '16px';
            const fontFamily = style.fontFamily || 'sans-serif';

            ctx.font = `${fontStyle}${fontVariant}${fontWeight}${fontSize} ${fontFamily}`;
            ctx.fillStyle = style.color;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            for (let i = 0; i < rawText.length; i++) {
                const char = transformedText[i] ?? rawText[i];

                if (!char || /\s/.test(char)) continue;

                range.setStart(textNode, i);
                range.setEnd(textNode, i + 1);

                const rect = range.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) continue;

                const x = rect.left - rootRect.left + padding;
                const y = rect.top - rootRect.top + padding;

                ctx.fillText(char, x, y);
            }
        }
    } finally {
        range.detach();
    }
}

function drawAlignedGlyphLayer(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    element: HTMLElement,
    rootRect: DOMRect,
    padding: number,
    dpr: number,
) {
    const layer = document.createElement('canvas');
    layer.width = canvasWidth;
    layer.height = canvasHeight;

    const layerCtx = layer.getContext('2d', {willReadFrequently: true});
    if (!layerCtx) return;

    layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layerCtx.clearRect(0, 0, canvasWidth / dpr, canvasHeight / dpr);
    drawGlyphsToCanvas(layerCtx, element, rootRect, padding);

    const bounds = getAlphaBounds(layerCtx, canvasWidth, canvasHeight);
    let shiftY = 0;

    if (bounds) {
        const elementRect = element.getBoundingClientRect();
        const targetCenterY = elementRect.top - rootRect.top + elementRect.height / 2;
        const maskTop = bounds.minY / dpr - padding;
        const maskBottom = (bounds.maxY + 1) / dpr - padding;
        const maskCenterY = (maskTop + maskBottom) / 2;
        const deltaY = targetCenterY - maskCenterY;

        shiftY = Number.isFinite(deltaY) ? Math.round(deltaY * dpr) : 0;
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer, 0, shiftY);
    ctx.restore();
}

async function createSnapshot(
    root: HTMLElement,
    titleRoot: HTMLElement,
    textRoot: HTMLElement,
) {
    const rootRect = root.getBoundingClientRect();
    const titleElement = titleRoot.querySelector('h1, h2, h3, h4, h5, h6') as HTMLElement | null;
    const textElement = textRoot.querySelector('p') as HTMLElement | null;
    const lineElement = titleRoot.querySelector('span.block') as HTMLElement | null;

    if (!titleElement || !textElement || rootRect.width === 0 || rootRect.height === 0) {
        return null;
    }

    const width = Math.max(1, Math.ceil(rootRect.width));
    const height = Math.max(1, Math.ceil(rootRect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const padding = 48;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil((width + padding * 2) * dpr));
    canvas.height = Math.max(1, Math.ceil((height + padding * 2) * dpr));

    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    if (!ctx) return null;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width + padding * 2, height + padding * 2);

    drawAlignedGlyphLayer(ctx, canvas.width, canvas.height, titleElement, rootRect, padding, dpr);
    drawAlignedGlyphLayer(ctx, canvas.width, canvas.height, textElement, rootRect, padding, dpr);

    if (lineElement) {
        const lineRect = lineElement.getBoundingClientRect();
        const lineStyle = window.getComputedStyle(lineElement);
        const x = lineRect.left - rootRect.left + padding;
        const y = lineRect.top - rootRect.top + padding;
        const lineWidth = Math.max(2, lineRect.width);
        const lineHeight = Math.max(2, lineRect.height);
        const radius = Math.max(
            parseRadius(lineStyle.borderTopLeftRadius),
            parseRadius(lineStyle.borderTopRightRadius),
            parseRadius(lineStyle.borderBottomRightRadius),
            parseRadius(lineStyle.borderBottomLeftRadius),
            Math.min(lineWidth, lineHeight) / 2,
        );

        ctx.fillStyle = lineStyle.backgroundColor;
        drawRoundedRect(ctx, x, y, lineWidth, lineHeight, radius);
        ctx.fill();
    }

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const densityStep = width < 900 ? 1 : 2;
    const positions: number[] = [];
    const colors: number[] = [];
    const alphas: number[] = [];

    for (let y = 0; y < canvas.height; y += densityStep) {
        for (let x = 0; x < canvas.width; x += densityStep) {
            const index = (y * canvas.width + x) * 4;
            const alpha = image[index + 3];

            if (alpha < EDGE_ALPHA_THRESHOLD) continue;

            const localX = x / dpr - padding;
            const localY = y / dpr - padding;

            positions.push(
                localX - width / 2,
                height / 2 - localY,
                0,
            );

            colors.push(
                image[index] / 255,
                image[index + 1] / 255,
                image[index + 2] / 255,
            );

            const normalizedAlpha = alpha / 255;
            const boostedAlpha = Math.min(1, Math.pow(normalizedAlpha, ALPHA_BOOST_EXPONENT) * ALPHA_BOOST_MULTIPLIER);

            alphas.push(boostedAlpha);
        }
    }

    return {
        width,
        height,
        positions: new Float32Array(positions),
        colors: new Float32Array(colors),
        alphas: new Float32Array(alphas),
        count: positions.length / 3,
    } satisfies Snapshot;
}

function toLocalRepulsors(repulsors: BubbleRepulsor[], rect: DOMRect, width: number, height: number) {
    return repulsors
        .map((repulsor) => {
            const rx = Math.max(1, repulsor.rx ?? repulsor.r ?? 1);
            const ry = Math.max(1, repulsor.ry ?? repulsor.r ?? 1);
            const localX = repulsor.x - rect.left;
            const localY = repulsor.y - rect.top;
            const maxRadius = Math.max(rx, ry) + SAFE_BUBBLE_GAP_PX;

            if (
                localX < -maxRadius ||
                localX > width + maxRadius ||
                localY < -maxRadius ||
                localY > height + maxRadius
            ) {
                return null;
            }

            return {
                x: localX - width / 2,
                y: height / 2 - localY,
                rx,
                ry,
                strength: repulsor.strength ?? 1,
            };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
}

function ellipseMetric(dx: number, dy: number, rx: number, ry: number) {
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
}

function ellipseNormal(dx: number, dy: number, rx: number, ry: number, fallbackAngle: number) {
    let nx = dx / (rx * rx);
    let ny = dy / (ry * ry);

    if (Math.abs(nx) + Math.abs(ny) < 0.000001) {
        nx = Math.cos(fallbackAngle);
        ny = Math.sin(fallbackAngle);
    }

    const len = Math.max(0.000001, Math.hypot(nx, ny));
    return {
        x: nx / len,
        y: ny / len,
    };
}

export function HeroDustText({
    className,
    containerRef,
    titleRef,
    textRef,
    repulsorsRef,
    onLoadStateChange,
}: HeroDustTextProps) {
    const mountRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        onLoadStateChange?.('pending');

        const mount = mountRef.current;
        const root = containerRef.current;
        const titleRoot = titleRef.current;
        const textRoot = textRef.current;

        if (!mount || !root || !titleRoot || !textRoot) {
            onLoadStateChange?.('error');
            return;
        }

        let renderer: THREE.WebGLRenderer;

        try {
            renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
            premultipliedAlpha: false,
        });
        } catch {
            onLoadStateChange?.('error');
            return;
        }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0x000000, 0);
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.pointerEvents = 'none';
        renderer.domElement.style.willChange = 'auto';
        renderer.domElement.style.backfaceVisibility = 'hidden';
        renderer.domElement.style.webkitBackfaceVisibility = 'hidden';
        mount.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera();
        const material = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            vertexColors: true,
            uniforms: {
                uSize: {value: DESKTOP_POINT_SIZE},
                uOpacity: {value: 1.0},
                uEdgeSoftness: {value: POINT_EDGE_SOFTNESS},
            },
            vertexShader: `
                attribute float alpha;
                varying vec3 vColor;
                varying float vAlpha;
                uniform float uSize;

                void main() {
                    vColor = color;
                    vAlpha = alpha;
                    gl_PointSize = uSize;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uOpacity;
                uniform float uEdgeSoftness;
                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    vec2 pointUv = gl_PointCoord - vec2(0.5);
                    float dist = length(pointUv) * 2.0;
                    float disc = 1.0 - smoothstep(1.0 - uEdgeSoftness, 1.0, dist);
                    float alpha = pow(disc, 0.9) * vAlpha * uOpacity;

                    if (alpha <= 0.025) discard;

                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
        });

        const geometry = new THREE.BufferGeometry();
        const points = new THREE.Points(geometry, material);
        points.frustumCulled = false;
        scene.add(points);

        const state = {
            basePositions: new Float32Array(),
            positions: new Float32Array(),
            velocities: new Float32Array(),
            phases: new Float32Array(),
            drifts: new Float32Array(),
            angles: new Float32Array(),
            randoms: new Float32Array(),
            scatter: new Float32Array(),
            count: 0,
            width: 1,
            height: 1,
        };

        const repulsorState = new Map<number, {x: number; y: number; dx: number; dy: number}>();

        let disposed = false;
        let resizeFrame = 0;
        let animationFrame = 0;
        let initFrame1 = 0;
        let initFrame2 = 0;
        let rebuildToken = 0;
        let firstSnapshotReady = false;
        let firstFrameRendered = false;
        let snapshotRetryTimeout = 0;
        let firstRenderFallbackTimeout = 0;
        let firstSnapshotAttemptTime = 0;
        let fallbackReported = false;
        let renderFailed = false;

        const clearSnapshotRetry = () => {
            if (snapshotRetryTimeout !== 0) {
                window.clearTimeout(snapshotRetryTimeout);
                snapshotRetryTimeout = 0;
            }
        };

        const clearFirstRenderFallback = () => {
            if (firstRenderFallbackTimeout !== 0) {
                window.clearTimeout(firstRenderFallbackTimeout);
                firstRenderFallbackTimeout = 0;
            }
        };

        const reportFallbackOnce = () => {
            if (fallbackReported || firstFrameRendered) return;
            fallbackReported = true;
            clearFirstRenderFallback();
            onLoadStateChange?.('error');
        };

        const handleRendererContextLost = (event: Event) => {
            event.preventDefault();
            renderFailed = true;
            reportFallbackOnce();
        };

        renderer.domElement.addEventListener('webglcontextlost', handleRendererContextLost, false);

        firstRenderFallbackTimeout = window.setTimeout(() => {
            if (disposed || firstFrameRendered) return;
            reportFallbackOnce();
        }, FIRST_RENDER_FALLBACK_AFTER_MS);

        const syncViewportBounds = (snapshotWidth = state.width, snapshotHeight = state.height) => {
            if (snapshotWidth < 1 || snapshotHeight < 1) return;

            const renderWidth = snapshotWidth + RENDER_PADDING_PX * 2;
            const renderHeight = snapshotHeight + RENDER_PADDING_PX * 2;

            mount.style.left = `${-RENDER_PADDING_PX}px`;
            mount.style.top = `${-RENDER_PADDING_PX}px`;
            mount.style.width = `${renderWidth}px`;
            mount.style.height = `${renderHeight}px`;
            mount.style.overflow = 'visible';

            camera.left = -snapshotWidth / 2 - RENDER_PADDING_PX;
            camera.right = snapshotWidth / 2 + RENDER_PADDING_PX;
            camera.top = snapshotHeight / 2 + RENDER_PADDING_PX;
            camera.bottom = -snapshotHeight / 2 - RENDER_PADDING_PX;
            camera.near = -100;
            camera.far = 100;
            camera.position.z = 10;
            camera.updateProjectionMatrix();

            renderer.setSize(renderWidth, renderHeight, false);
            renderer.domElement.style.left = '0px';
            renderer.domElement.style.top = '0px';
            renderer.domElement.style.width = `${renderWidth}px`;
            renderer.domElement.style.height = `${renderHeight}px`;
        };

        const rebuild = async () => {
            if (disposed) return;

            const currentToken = ++rebuildToken;

            if ('fonts' in document) {
                await waitForRenderableFonts();
            }

            if (disposed || currentToken !== rebuildToken) return;

            let nextSnapshot: Snapshot | null = null;

            try {
                nextSnapshot = await createSnapshot(root, titleRoot, textRoot);
            } catch {
                nextSnapshot = null;
            }

            if (!nextSnapshot || nextSnapshot.count === 0) {
                if (firstSnapshotAttemptTime === 0) {
                    firstSnapshotAttemptTime = performance.now();
                }

                if (performance.now() - firstSnapshotAttemptTime >= SNAPSHOT_FALLBACK_AFTER_MS) {
                    reportFallbackOnce();
                }

                clearSnapshotRetry();
                snapshotRetryTimeout = window.setTimeout(() => {
                    snapshotRetryTimeout = 0;
                    void rebuild();
                }, SNAPSHOT_RETRY_DELAY_MS);
                return;
            }

            clearSnapshotRetry();
            firstSnapshotReady = true;

            state.basePositions = new Float32Array(nextSnapshot.positions);
            state.positions = new Float32Array(nextSnapshot.positions);
            state.velocities = new Float32Array(nextSnapshot.count * 2);
            state.phases = new Float32Array(nextSnapshot.count);
            state.drifts = new Float32Array(nextSnapshot.count * 2);
            state.angles = new Float32Array(nextSnapshot.count);
            state.randoms = new Float32Array(nextSnapshot.count);
            state.scatter = new Float32Array(nextSnapshot.count);
            state.count = nextSnapshot.count;
            state.width = nextSnapshot.width;
            state.height = nextSnapshot.height;

            for (let i = 0; i < nextSnapshot.count; i++) {
                state.phases[i] = Math.random() * Math.PI * 2;
                state.drifts[i * 2] = 0.05 + Math.random() * 0.1;
                state.drifts[i * 2 + 1] = 0.05 + Math.random() * 0.1;
                state.angles[i] = Math.random() * Math.PI * 2;
                state.randoms[i] = 0.85 + Math.random() * 0.35;
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(state.positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(nextSnapshot.colors, 3));
            geometry.setAttribute('alpha', new THREE.BufferAttribute(nextSnapshot.alphas, 1));
            geometry.computeBoundingSphere();

            material.uniforms.uSize.value = nextSnapshot.width < 640 ? MOBILE_POINT_SIZE : DESKTOP_POINT_SIZE;

            syncViewportBounds(nextSnapshot.width, nextSnapshot.height);
        };

        const scheduleRebuild = () => {
            if (resizeFrame !== 0) return;
            resizeFrame = window.requestAnimationFrame(async () => {
                resizeFrame = 0;
                await rebuild();
            });
        };


        const resizeObserver = new ResizeObserver(() => {
            scheduleRebuild();
        });

        resizeObserver.observe(root);
        resizeObserver.observe(titleRoot);
        resizeObserver.observe(textRoot);
        window.addEventListener('resize', scheduleRebuild);
        window.addEventListener('orientationchange', scheduleRebuild);
        window.addEventListener('pageshow', scheduleRebuild);

        const visualViewport = window.visualViewport;
        visualViewport?.addEventListener('resize', scheduleRebuild);

        initFrame1 = window.requestAnimationFrame(() => {
            initFrame2 = window.requestAnimationFrame(() => {
                void rebuild();
            });
        });

        let previousTime = 0;

        const tick = (time: number) => {
            if (disposed || renderFailed) return;
            animationFrame = window.requestAnimationFrame(tick);

            if (state.count === 0) return;

            const dt = previousTime === 0 ? 1 / 60 : Math.min((time - previousTime) / 1000, 1 / 20);
            previousTime = time;
            const dtFrames = dt * 60;
            const elapsed = time * 0.001;

            const rootRect = root.getBoundingClientRect();
            const repulsorLerp = 1 - Math.exp(-dt * REPULSOR_SPEED_SMOOTHING);
            const repulsors = toLocalRepulsors(repulsorsRef.current, rootRect, state.width, state.height).map((repulsor, index) => {
                const prev = repulsorState.get(index);
                const rawDx = prev ? (repulsor.x - prev.x) / Math.max(1e-4, dtFrames) : 0;
                const rawDy = prev ? (repulsor.y - prev.y) / Math.max(1e-4, dtFrames) : 0;

                let dx = prev ? prev.dx + (rawDx - prev.dx) * repulsorLerp : rawDx;
                let dy = prev ? prev.dy + (rawDy - prev.dy) * repulsorLerp : rawDy;

                const speed = Math.hypot(dx, dy);
                if (speed > MAX_REPULSOR_SPEED_PX_PER_FRAME) {
                    const mul = MAX_REPULSOR_SPEED_PX_PER_FRAME / speed;
                    dx *= mul;
                    dy *= mul;
                }

                repulsorState.set(index, {
                    x: repulsor.x,
                    y: repulsor.y,
                    dx,
                    dy,
                });

                return {
                    ...repulsor,
                    dx,
                    dy,
                    speed: Math.hypot(dx, dy),
                } satisfies LocalRepulsor;
            });

            for (const key of Array.from(repulsorState.keys())) {
                if (key >= repulsors.length) {
                    repulsorState.delete(key);
                }
            }

            const positions = state.positions;
            const basePositions = state.basePositions;
            const velocities = state.velocities;
            const phases = state.phases;
            const drifts = state.drifts;
            const angles = state.angles;
            const randoms = state.randoms;
            const scatter = state.scatter;

            for (let i = 0; i < state.count; i++) {
                const i3 = i * 3;
                const i2 = i * 2;

                let x = positions[i3];
                let y = positions[i3 + 1];
                let vx = velocities[i2];
                let vy = velocities[i2 + 1];

                const baseX = basePositions[i3];
                const baseY = basePositions[i3 + 1];
                const phase = phases[i];
                const baseAngle = angles[i];

                let scatterValue = Math.max(0, scatter[i] - dt * 1.05);
                let baseBlocked = false;

                for (let j = 0; j < repulsors.length; j++) {
                    const repulsor = repulsors[j];
                    const safeRx = repulsor.rx + SAFE_BUBBLE_GAP_PX;
                    const safeRy = repulsor.ry + SAFE_BUBBLE_GAP_PX;
                    const baseMetric = ellipseMetric(
                        baseX - repulsor.x,
                        baseY - repulsor.y,
                        safeRx,
                        safeRy,
                    );

                    if (baseMetric < 1) {
                        baseBlocked = true;
                        break;
                    }
                }

                const driftMix = baseBlocked ? 0 : Math.max(0.08, 1 - scatterValue * 0.72);
                const targetX = baseX + Math.sin(elapsed * 0.82 + phase) * drifts[i2] * driftMix;
                const targetY = baseY + Math.cos(elapsed * 1.07 + phase * 1.31) * drifts[i2 + 1] * driftMix;
                const spring = baseBlocked
                    ? 0
                    : 0.006 + (1 - scatterValue) * 0.022;

                vx += (targetX - x) * spring * dtFrames;
                vy += (targetY - y) * spring * dtFrames;

                let nextX = x + vx * dtFrames;
                let nextY = y + vy * dtFrames;

                for (let j = 0; j < repulsors.length; j++) {
                    const repulsor = repulsors[j];
                    const rx = repulsor.rx;
                    const ry = repulsor.ry;
                    const safeRx = rx + SAFE_BUBBLE_GAP_PX;
                    const safeRy = ry + SAFE_BUBBLE_GAP_PX;

                    const dx = nextX - repulsor.x;
                    const dy = nextY - repulsor.y;
                    const metric = ellipseMetric(dx, dy, safeRx, safeRy);

                    if (metric >= 1) continue;

                    const safeMetric = Math.max(metric, 0.000001);
                    const scale = 1 / Math.sqrt(safeMetric);
                    const boundaryDx = dx * scale;
                    const boundaryDy = dy * scale;
                    const normal = ellipseNormal(boundaryDx, boundaryDy, safeRx, safeRy, baseAngle);
                    const tangentX = -normal.y;
                    const tangentY = normal.x;

                    const penetration = 1 - Math.sqrt(safeMetric);
                    const moveBoost = Math.min(1.8, repulsor.speed / Math.max(1, Math.min(safeRx, safeRy) * 0.12));
                    const chaosSign = Math.sin(phase * 7.13 + j * 11.31) >= 0 ? 1 : -1;

                    nextX = repulsor.x + boundaryDx + normal.x * COLLISION_EPSILON_PX;
                    nextY = repulsor.y + boundaryDy + normal.y * COLLISION_EPSILON_PX;

                    const relVx = vx - repulsor.dx;
                    const relVy = vy - repulsor.dy;
                    const inwardSpeed = relVx * normal.x + relVy * normal.y;

                    if (inwardSpeed < 0) {
                        const bounce = -(0.82 + penetration * 0.22) * inwardSpeed;
                        vx += normal.x * bounce;
                        vy += normal.y * bounce;
                    }

                    const escapeImpulse =
                        (0.48 + penetration * 2.9 + moveBoost * 0.34) *
                        repulsor.strength;

                    vx += normal.x * escapeImpulse;
                    vy += normal.y * escapeImpulse;

                    const carry =
                        (0.22 + penetration * 0.26 + moveBoost * 0.12) *
                        repulsor.strength;

                    vx += repulsor.dx * carry;
                    vy += repulsor.dy * carry;

                    const sideImpulse =
                        (0.045 + penetration * 0.22 + moveBoost * 0.06) *
                        randoms[i] *
                        chaosSign *
                        repulsor.strength;

                    vx += tangentX * sideImpulse;
                    vy += tangentY * sideImpulse;

                    scatterValue = Math.max(
                        scatterValue,
                        0.72 + penetration * 0.75 + Math.min(0.28, moveBoost * 0.18),
                    );
                }

                if (!baseBlocked && scatterValue > 0.02) {
                    const releaseDrag = Math.max(0.82, 1 - scatterValue * 0.12 * dtFrames);
                    vx *= releaseDrag;
                    vy *= releaseDrag;
                }

                const damping = baseBlocked
                    ? 0.972
                    : 0.9 + Math.min(0.025, scatterValue * 0.02);

                vx *= Math.pow(damping, dtFrames);
                vy *= Math.pow(damping, dtFrames);

                x = nextX;
                y = nextY;

                positions[i3] = x;
                positions[i3 + 1] = y;
                velocities[i2] = vx;
                velocities[i2 + 1] = vy;
                scatter[i] = scatterValue;
            }

            const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
            if (positionAttr) {
                positionAttr.needsUpdate = true;
            }

            try {
                renderer.render(scene, camera);
            } catch {
                renderFailed = true;
                reportFallbackOnce();
                return;
            }

            if (firstSnapshotReady && !firstFrameRendered) {
                firstFrameRendered = true;
                clearFirstRenderFallback();
                onLoadStateChange?.('ready');
            }
        };

        animationFrame = window.requestAnimationFrame(tick);

        return () => {
            disposed = true;
            window.removeEventListener('resize', scheduleRebuild);
            window.removeEventListener('orientationchange', scheduleRebuild);
            window.removeEventListener('pageshow', scheduleRebuild);
            visualViewport?.removeEventListener('resize', scheduleRebuild);
            resizeObserver.disconnect();
            renderer.domElement.removeEventListener('webglcontextlost', handleRendererContextLost, false);
            clearSnapshotRetry();
            clearFirstRenderFallback();
            window.cancelAnimationFrame(animationFrame);
            window.cancelAnimationFrame(resizeFrame);
            window.cancelAnimationFrame(initFrame1);
            window.cancelAnimationFrame(initFrame2);
            geometry.dispose();
            material.dispose();
            renderer.dispose();
            mount.removeChild(renderer.domElement);
        };
    }, [containerRef, titleRef, textRef, repulsorsRef, onLoadStateChange]);

    return (
        <div
            ref={mountRef}
            aria-hidden
            className={twMerge('pointer-events-none absolute inset-0', className)}
        />
    );
}
