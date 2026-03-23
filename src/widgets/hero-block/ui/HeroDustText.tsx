'use client';

import {useEffect, useRef, type MutableRefObject, type RefObject} from 'react';
import * as THREE from 'three';
import {twMerge} from 'tailwind-merge';
import type {BubbleRepulsor} from '@/widgets/hero-block/model/types';

type HeroDustTextProps = {
    className?: string;
    containerRef: RefObject<HTMLElement | null>;
    titleRef: RefObject<HTMLElement | null>;
    textRef: RefObject<HTMLElement | null>;
    repulsorsRef: MutableRefObject<BubbleRepulsor[]>;
}

type Snapshot = {
    width: number;
    height: number;
    positions: Float32Array;
    colors: Float32Array;
    alphas: Float32Array;
    count: number;
}

type TextDrawTarget = {
    text: string;
    width: number;
    x: number;
    y: number;
    font: string;
    lineHeight: number;
    align: CanvasTextAlign;
    color: string;
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
const RENDER_PADDING_PX = 520;

function makePointTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 64, 64);

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.62, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.82, 'rgba(255, 255, 255, 0.78)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(32, 32, 32, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function parseLineHeight(style: CSSStyleDeclaration, fontSize: number) {
    const raw = style.lineHeight;
    if (!raw || raw === 'normal') {
        return fontSize * 1.1;
    }

    if (raw.endsWith('px')) {
        return Number.parseFloat(raw);
    }

    const numeric = Number.parseFloat(raw);
    return Number.isFinite(numeric) ? numeric * fontSize : fontSize * 1.1;
}

function applyTextTransform(text: string, transform: string) {
    if (transform === 'uppercase') return text.toUpperCase();
    if (transform === 'lowercase') return text.toLowerCase();
    if (transform === 'capitalize') {
        return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
    }

    return text;
}

function getTextTarget(element: HTMLElement, rootRect: DOMRect): TextDrawTarget {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const fontSize = Number.parseFloat(style.fontSize);

    return {
        text: applyTextTransform(element.textContent?.trim() ?? '', style.textTransform),
        width: rect.width,
        x: rect.left - rootRect.left,
        y: rect.top - rootRect.top,
        font: `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
        lineHeight: parseLineHeight(style, fontSize),
        align: (style.textAlign === 'center' ? 'center' : 'left'),
        color: style.color,
    };
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
    const paragraphs = text.split('\n');
    const lines: string[] = [];

    for (const paragraph of paragraphs) {
        const words = paragraph.split(/\s+/).filter(Boolean);

        if (words.length === 0) {
            lines.push('');
            continue;
        }

        let line = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const nextLine = `${line} ${word}`;

            if (ctx.measureText(nextLine).width <= maxWidth) {
                line = nextLine;
                continue;
            }

            lines.push(line);
            line = word;
        }

        lines.push(line);
    }

    return lines;
}

function drawText(ctx: CanvasRenderingContext2D, target: TextDrawTarget) {
    ctx.save();
    ctx.font = target.font;
    ctx.textBaseline = 'top';
    ctx.textAlign = target.align;
    ctx.fillStyle = target.color;

    const lines = wrapText(ctx, target.text, target.width);
    const x = target.align === 'center' ? target.x + target.width / 2 : target.x;

    lines.forEach((line, index) => {
        ctx.fillText(line, x, target.y + target.lineHeight * index);
    });

    ctx.restore();
}

function createSnapshot(
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

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(width * dpr));
    canvas.height = Math.max(1, Math.ceil(height * dpr));

    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    if (!ctx) return null;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    drawText(ctx, getTextTarget(titleElement, rootRect));
    drawText(ctx, getTextTarget(textElement, rootRect));

    if (lineElement) {
        const lineRect = lineElement.getBoundingClientRect();
        const lineStyle = window.getComputedStyle(lineElement);
        ctx.fillStyle = lineStyle.backgroundColor;
        ctx.fillRect(
            lineRect.left - rootRect.left,
            lineRect.top - rootRect.top,
            Math.max(2, lineRect.width),
            Math.max(2, lineRect.height),
        );
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

            if (alpha < 12) continue;

            positions.push(
                x / dpr - width / 2,
                height / 2 - y / dpr,
                0,
            );

            colors.push(
                image[index] / 255,
                image[index + 1] / 255,
                image[index + 2] / 255,
            );

            alphas.push(alpha / 255);
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
}: HeroDustTextProps) {
    const mountRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const mount = mountRef.current;
        const root = containerRef.current;
        const titleRoot = titleRef.current;
        const textRoot = textRef.current;

        if (!mount || !root || !titleRoot || !textRoot) return;

        const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0x000000, 0);
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.pointerEvents = 'none';
        mount.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera();
        const texture = makePointTexture();

        const material = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            vertexColors: true,
            uniforms: {
                uMap: {value: texture},
                uSize: {value: 1.15},
                uOpacity: {value: 1.0},
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
                uniform sampler2D uMap;
                uniform float uOpacity;
                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    vec4 tex = texture2D(uMap, gl_PointCoord);
                    float alpha = tex.a * vAlpha * uOpacity;
                    if (alpha <= 0.01) discard;
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

        const rebuild = async () => {
            if (disposed) return;

            if ('fonts' in document) {
                await document.fonts.ready;
            }

            if (disposed) return;

            const nextSnapshot = createSnapshot(root, titleRoot, textRoot);
            if (!nextSnapshot || nextSnapshot.count === 0) return;

            state.basePositions = nextSnapshot.positions;
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

            material.uniforms.uSize.value = nextSnapshot.width < 640 ? 1.35 : 1.15;

            const mountRect = mount.getBoundingClientRect();
            const padLeft = Math.min(RENDER_PADDING_PX, Math.max(0, mountRect.left));
            const padTop = Math.min(RENDER_PADDING_PX, Math.max(0, mountRect.top));
            const padRight = Math.min(RENDER_PADDING_PX, Math.max(0, window.innerWidth - mountRect.right));
            const padBottom = Math.min(RENDER_PADDING_PX, Math.max(0, window.innerHeight - mountRect.bottom));

            const renderWidth = nextSnapshot.width + padLeft + padRight;
            const renderHeight = nextSnapshot.height + padTop + padBottom;

            camera.left = -nextSnapshot.width / 2 - padLeft;
            camera.right = nextSnapshot.width / 2 + padRight;
            camera.top = nextSnapshot.height / 2 + padTop;
            camera.bottom = -nextSnapshot.height / 2 - padBottom;
            camera.near = -100;
            camera.far = 100;
            camera.position.z = 10;
            camera.updateProjectionMatrix();

            renderer.setSize(renderWidth, renderHeight, false);
            renderer.domElement.style.left = `${-padLeft}px`;
            renderer.domElement.style.top = `${-padTop}px`;
            renderer.domElement.style.width = `${renderWidth}px`;
            renderer.domElement.style.height = `${renderHeight}px`;
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
        void rebuild();

        let previousTime = 0;

        const tick = (time: number) => {
            if (disposed) return;
            animationFrame = window.requestAnimationFrame(tick);

            if (state.count === 0) return;

            const dt = previousTime === 0 ? 1 / 60 : Math.min((time - previousTime) / 1000, 1 / 20);
            previousTime = time;
            const dtFrames = dt * 60;
            const elapsed = time * 0.001;

            const rootRect = mount.getBoundingClientRect();
            const repulsors = toLocalRepulsors(repulsorsRef.current, rootRect, state.width, state.height).map((repulsor, index) => {
                const prev = repulsorState.get(index);
                const dx = prev ? (repulsor.x - prev.x) * 0.76 + prev.dx * 0.24 : 0;
                const dy = prev ? (repulsor.y - prev.y) * 0.76 + prev.dy * 0.24 : 0;

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

            renderer.render(scene, camera);
        };

        animationFrame = window.requestAnimationFrame(tick);

        return () => {
            disposed = true;
            window.removeEventListener('resize', scheduleRebuild);
            resizeObserver.disconnect();
            window.cancelAnimationFrame(animationFrame);
            window.cancelAnimationFrame(resizeFrame);
            geometry.dispose();
            material.dispose();
            texture?.dispose();
            renderer.dispose();
            mount.removeChild(renderer.domElement);
        };
    }, [containerRef, titleRef, textRef, repulsorsRef]);

    return (
        <div
            ref={mountRef}
            aria-hidden
            className={twMerge('pointer-events-none absolute inset-0 overflow-visible', className)}
        />
    );
}
