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
            const localX = repulsor.x - rect.left;
            const localY = repulsor.y - rect.top;
            const radius = repulsor.r;

            if (
                localX < -radius ||
                localX > width + radius ||
                localY < -radius ||
                localY > height + radius
            ) {
                return null;
            }

            return {
                x: localX - width / 2,
                y: height / 2 - localY,
                r: radius,
                strength: repulsor.strength ?? 1,
            };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
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
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.display = 'block';
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
            count: 0,
            width: 1,
            height: 1,
        };

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
            state.count = nextSnapshot.count;
            state.width = nextSnapshot.width;
            state.height = nextSnapshot.height;

            for (let i = 0; i < nextSnapshot.count; i++) {
                state.phases[i] = Math.random() * Math.PI * 2;
                state.drifts[i * 2] = 0.06 + Math.random() * 0.16;
                state.drifts[i * 2 + 1] = 0.06 + Math.random() * 0.16;
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(state.positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(nextSnapshot.colors, 3));
            geometry.setAttribute('alpha', new THREE.BufferAttribute(nextSnapshot.alphas, 1));
            geometry.computeBoundingSphere();

            material.uniforms.uSize.value = nextSnapshot.width < 640 ? 1.35 : 1.15;

            camera.left = -nextSnapshot.width / 2;
            camera.right = nextSnapshot.width / 2;
            camera.top = nextSnapshot.height / 2;
            camera.bottom = -nextSnapshot.height / 2;
            camera.near = -100;
            camera.far = 100;
            camera.position.z = 10;
            camera.updateProjectionMatrix();

            renderer.setSize(nextSnapshot.width, nextSnapshot.height, false);
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

        const tick = (time: number) => {
            if (disposed) return;
            animationFrame = window.requestAnimationFrame(tick);

            if (state.count === 0) return;

            const rootRect = mount.getBoundingClientRect();
            const repulsors = toLocalRepulsors(repulsorsRef.current, rootRect, state.width, state.height);
            const positions = state.positions;
            const basePositions = state.basePositions;
            const velocities = state.velocities;
            const phases = state.phases;
            const drifts = state.drifts;
            const elapsed = time * 0.001;

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

                let targetX = baseX + Math.sin(elapsed * 0.8 + phase) * drifts[i2];
                let targetY = baseY + Math.cos(elapsed * 1.05 + phase * 1.37) * drifts[i2 + 1];
                let spring = 0.1;
                let damping = 0.84;

                let strongestRepulsor: {x: number; y: number; r: number; strength: number} | null = null;
                let strongestInfluence = 0;

                for (const repulsor of repulsors) {
                    const dxBase = baseX - repulsor.x;
                    const dyBase = baseY - repulsor.y;
                    const radius = repulsor.r + 16;
                    const distanceSq = dxBase * dxBase + dyBase * dyBase;

                    if (distanceSq >= radius * radius) continue;

                    const distance = Math.max(0.001, Math.sqrt(distanceSq));
                    const influence = (1 - distance / radius) * repulsor.strength;

                    if (influence > strongestInfluence) {
                        strongestInfluence = influence;
                        strongestRepulsor = repulsor;
                    }
                }

                if (strongestRepulsor) {
                    const dxBase = baseX - strongestRepulsor.x;
                    const dyBase = baseY - strongestRepulsor.y;
                    const baseDistance = Math.max(0.001, Math.sqrt(dxBase * dxBase + dyBase * dyBase));
                    const nx = baseDistance < 1
                        ? Math.cos(phase)
                        : dxBase / baseDistance;
                    const ny = baseDistance < 1
                        ? Math.sin(phase)
                        : dyBase / baseDistance;

                    const holdRadius = strongestRepulsor.r + 10 + strongestInfluence * 34;
                    const tangent = strongestInfluence * 9;

                    targetX = strongestRepulsor.x + nx * holdRadius + Math.cos(elapsed * 1.1 + phase * 1.7) * tangent;
                    targetY = strongestRepulsor.y + ny * holdRadius + Math.sin(elapsed * 0.95 + phase * 1.3) * tangent;
                    spring = 0.14;
                    damping = 0.8;
                }

                vx += (targetX - x) * spring;
                vy += (targetY - y) * spring;

                vx *= damping;
                vy *= damping;
                x += vx;
                y += vy;

                positions[i3] = x;
                positions[i3 + 1] = y;
                velocities[i2] = vx;
                velocities[i2 + 1] = vy;
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
            className={twMerge('pointer-events-none absolute inset-0', className)}
        />
    );
}
