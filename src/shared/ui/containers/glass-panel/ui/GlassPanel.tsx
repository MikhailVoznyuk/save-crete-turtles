'use client';

import React, {useEffect, useMemo, useRef} from 'react';
import {twMerge} from 'tailwind-merge';
import {LiquidGlass} from '@/shared/effects/liquid-glass';
import {JellyShapeProvider} from '@/shared/ui/containers/jelly-container/model/shapeContext';

type Corner = {rx: number; ry: number};
type Radii = {tl: Corner; tr: Corner; br: Corner; bl: Corner};

type LiquidGlassConfig = {
    intensity?: number;
    magnify?: number;
    blur?: number;
    chromatic?: number;
    rim?: number;
    spec?: number;
    tint?: number;
    alpha?: number;
    edgePull?: number;
    edgePower?: number;
    edgeSingularity?: number;
    dirMode?: 0 | 1;
};

type StaticGlassPanelProps = {
    className?: string;
    glassClassName?: string;
    innerClassName?: string;
    innerStyle?: React.CSSProperties;
    outline?: boolean;
    outlineClassName?: string;
    visible?: boolean;
    boundaryPoints?: number;
    glassOrder?: number;
    liquid?: LiquidGlassConfig;
    children?: React.ReactNode;
};

type V2 = {x: number; y: number};

function parseRadius(val: string, w: number, h: number): Corner {
    const parts = val.trim().split(/\s+/);
    const a = parts[0] ?? '0px';
    const b = parts[1] ?? parts[0] ?? '0px';

    const toPx = (s: string, base: number) => {
        if (s.endsWith('%')) return (parseFloat(s) / 100) * base;
        return parseFloat(s) || 0;
    };

    return {rx: Math.max(0, toPx(a, w)), ry: Math.max(0, toPx(b, h))};
}

function getCornerRadii(el: HTMLElement, w: number, h: number): Radii {
    const cs = getComputedStyle(el);
    const tl = parseRadius(cs.borderTopLeftRadius, w, h);
    const tr = parseRadius(cs.borderTopRightRadius, w, h);
    const br = parseRadius(cs.borderBottomRightRadius, w, h);
    const bl = parseRadius(cs.borderBottomLeftRadius, w, h);

    const clampPair = (a: number, b: number, limit: number) => {
        const sum = a + b;
        if (sum <= limit || sum === 0) return [a, b] as const;
        const k = limit / sum;
        return [a * k, b * k] as const;
    };

    const [tlx, trx] = clampPair(tl.rx, tr.rx, w);
    const [blx, brx] = clampPair(bl.rx, br.rx, w);
    const [tly, bly] = clampPair(tl.ry, bl.ry, h);
    const [try_, bry] = clampPair(tr.ry, br.ry, h);

    return {
        tl: {rx: tlx, ry: tly},
        tr: {rx: trx, ry: try_},
        br: {rx: brx, ry: bry},
        bl: {rx: blx, ry: bly},
    };
}

function roundedRectHiResPoints(w: number, h: number, radii: Radii, steps = 28): V2[] {
    const {tl, tr, br, bl} = radii;
    const pts: V2[] = [];

    const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number) => {
        const n = Math.max(6, Math.floor(steps));
        for (let i = 0; i <= n; i++) {
            const t = i / n;
            const a = a0 + (a1 - a0) * t;
            pts.push({x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry});
        }
    };

    pts.push({x: tl.rx, y: 0});
    pts.push({x: w - tr.rx, y: 0});
    arc(w - tr.rx, tr.ry, tr.rx, tr.ry, -Math.PI / 2, 0);

    pts.push({x: w, y: tr.ry});
    pts.push({x: w, y: h - br.ry});
    arc(w - br.rx, h - br.ry, br.rx, br.ry, 0, Math.PI / 2);

    pts.push({x: w - br.rx, y: h});
    pts.push({x: bl.rx, y: h});
    arc(bl.rx, h - bl.ry, bl.rx, bl.ry, Math.PI / 2, Math.PI);

    pts.push({x: 0, y: h - bl.ry});
    pts.push({x: 0, y: tl.ry});
    arc(tl.rx, tl.ry, tl.rx, tl.ry, Math.PI, (3 * Math.PI) / 2);

    return pts;
}

function resampleClosedPolyline(poly: V2[], n: number): V2[] {
    const lengths: number[] = [0];
    let total = 0;

    for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        total += Math.hypot(b.x - a.x, b.y - a.y);
        lengths.push(total);
    }

    const out: V2[] = [];
    for (let i = 0; i < n; i++) {
        const target = (total * i) / n;
        let j = 0;
        while (j < lengths.length - 1 && lengths[j + 1] < target) j++;
        const a = poly[j % poly.length];
        const b = poly[(j + 1) % poly.length];
        const segLen = Math.max(1e-6, lengths[j + 1] - lengths[j]);
        const u = (target - lengths[j]) / segLen;

        out.push({
            x: a.x + (b.x - a.x) * u,
            y: a.y + (b.y - a.y) * u,
        });
    }

    return out;
}

function roundedRectPath(w: number, h: number, r: Radii) {
    return [
        `M ${r.tl.rx} 0`,
        `H ${w - r.tr.rx}`,
        `A ${r.tr.rx} ${r.tr.ry} 0 0 1 ${w} ${r.tr.ry}`,
        `V ${h - r.br.ry}`,
        `A ${r.br.rx} ${r.br.ry} 0 0 1 ${w - r.br.rx} ${h}`,
        `H ${r.bl.rx}`,
        `A ${r.bl.rx} ${r.bl.ry} 0 0 1 0 ${h - r.bl.ry}`,
        `V ${r.tl.ry}`,
        `A ${r.tl.rx} ${r.tl.ry} 0 0 1 ${r.tl.rx} 0`,
        'Z',
    ].join(' ');
}

const DEFAULT_LIQUID: Required<LiquidGlassConfig> = {
    intensity: 1.35,
    magnify: 0.3,
    blur: 0.18,
    chromatic: 0.03,
    rim: 0.24,
    spec: 0.42,
    tint: 0.22,
    alpha: 1,
    edgePull: 22,
    edgePower: 10,
    edgeSingularity: 0.035,
    dirMode: 0,
};

export function GlassPanel({
                                     className,
                                     glassClassName,
                                     innerClassName,
                                     innerStyle = {},
                                     outline = false,
                                     outlineClassName = 'stroke-cyan-200/20',
                                     visible = true,
                                     boundaryPoints = 160,
                                     glassOrder,
                                     liquid,
                                     children,
                                 }: StaticGlassPanelProps) {
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const blobRef = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const pathRef = useRef<SVGPathElement | null>(null);
    const pointsRef = useRef<Float32Array>(new Float32Array(0));
    const countRef = useRef<number>(0);
    const padRef = useRef<number>(0);
    const syncRef = useRef<((timestamp?: number) => void) | null>(null);

    const liquidParams = useMemo(
        () => ({...DEFAULT_LIQUID, ...liquid}),
        [liquid]
    );

    useEffect(() => {
        const wrap = wrapRef.current;
        const blob = blobRef.current;
        const svg = svgRef.current;
        if (!wrap || !blob) return;

        const rebuild = (w: number, h: number) => {
            if (w < 1 || h < 1) return;

            const radii = getCornerRadii(wrap, w, h);
            const hiRes = roundedRectHiResPoints(w, h, radii, 28);
            const points = resampleClosedPolyline(hiRes, Math.max(48, boundaryPoints));
            const flat = new Float32Array(points.length * 2);

            for (let i = 0; i < points.length; i++) {
                flat[i * 2] = points[i].x;
                flat[i * 2 + 1] = points[i].y;
            }

            pointsRef.current = flat;
            countRef.current = points.length;
            padRef.current = 0;

            blob.style.width = `${w}px`;
            blob.style.height = `${h}px`;
            blob.style.borderRadius = 'inherit';
            blob.style.overflow = 'hidden';

            if (svg) {
                svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
                svg.style.width = `${w}px`;
                svg.style.height = `${h}px`;
            }

            if (pathRef.current) {
                pathRef.current.setAttribute('d', roundedRectPath(w, h, radii));
            }
        };

        const rect = wrap.getBoundingClientRect();
        rebuild(Math.round(rect.width), Math.round(rect.height));

        const ro = new ResizeObserver(() => {
            rebuild(wrap.offsetWidth, wrap.offsetHeight);
        });

        ro.observe(wrap);
        return () => ro.disconnect();
    }, [boundaryPoints]);

    return (
        <JellyShapeProvider value={{blobRef, pointsRef, countRef, padRef, syncRef}}>
            <div
                ref={wrapRef}
                className={twMerge(
                    'relative overflow-hidden transition-all duration-500',
                    visible ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
                    className,
                )}
            >
                <div
                    ref={blobRef}
                    className={twMerge('absolute inset-0 pointer-events-none', glassClassName)}
                />

                {outline && (
                    <svg
                        ref={svgRef}
                        className='pointer-events-none absolute inset-0 z-[1]'
                        aria-hidden
                    >
                        <path
                            ref={pathRef}
                            className={outlineClassName}
                            fill='none'
                            strokeWidth={1.5}
                            vectorEffect='non-scaling-stroke'
                        />
                    </svg>
                )}

                <LiquidGlass
                    enabled={visible}
                    order={glassOrder}
                    intensity={liquidParams.intensity}
                    magnify={liquidParams.magnify}
                    blur={liquidParams.blur}
                    chromatic={liquidParams.chromatic}
                    rim={liquidParams.rim}
                    spec={liquidParams.spec}
                    tint={liquidParams.tint}
                    alpha={liquidParams.alpha}
                    edgePull={liquidParams.edgePull}
                    edgePower={liquidParams.edgePower}
                    edgeSingularity={liquidParams.edgeSingularity}
                    dirMode={liquidParams.dirMode}
                />

                <div className={twMerge('relative z-10', innerClassName)} style={innerStyle}>
                    {children}
                </div>
            </div>
        </JellyShapeProvider>
    );
}