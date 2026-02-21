'use client';

import React, { useEffect, useId, useMemo, useRef } from 'react';

type V2 = { x: number; y: number };
type Node = { p: V2; v: V2; b: V2 };

type JellyContainerProps = {
    className?: string;        
    innerClassName?: string;   
    outline?: boolean;
    outlineClassName?: string; 

    boundaryPoints?: number;

    // contour smoothness
    pathTension?: number;      // 0..1, lower = smoother curve
    bendK?: number;            // curvature stiffness (removes sharp kinks)
    smoothK?: number;          // post-step smoothing 0..1 (Laplacian on offsets)
    smoothIters?: number;      // smoothing passes per frame

    edgeK?: number;
    shapeK?: number;
    damping?: number;

    pressureK?: number;        
    maxOffset?: number;

    bleed?: number;            

    hoverRadius?: number;      
    hoverIndent?: number;      
    hoverDrag?: number;        

    // pointer/hover tuning
    pointerSpeedMax?: number;         // px/s clamp for pointer velocity
    hoverPenetrationScale?: number;   // px for "how deep" normalization (near boundary)
    hoverEnterStrength?: number;      // base multiplier for entry impact impulse
    hoverEnterBase?: number;          // base magnitude for entry impulse
    hoverEnterSpeedGain?: number;     // additional magnitude from speed (0..1)
    hoverEnterSigmaFactor?: number;   // entry impact footprint relative to hoverRadius
    hoverEnterWeightPow?: number;     // sharpness of entry impact
    hoverEnterSpeedPow?: number;      // how much speed affects entry
    hoverEnterDepthPow?: number;      // how much penetration depth affects entry
    hoverEnterDecay?: number;         // how fast the entry window decays

    hoverIndentSigmaFactor?: number;  // footprint for continuous indentation
    hoverIndentWeightPow?: number;    // sharpness for continuous indentation
    hoverIndentBase?: number;         // base force for continuous indentation
    hoverIndentSpeedGain?: number;    // additional force from speed
    hoverFastBoost?: number;          // extra boost based on per-event travel distance

    hoverConeSpeedMin?: number;
    hoverConeWidthBaseFactor?: number;
    hoverConeWidthSlopeFactor?: number;
    hoverConeLengthFactor?: number;
    hoverConePhaseTravelFactor?: number;
    hoverConePhaseScaleFactor?: number;
    hoverConeFreq?: number;
    hoverConeNormalBase?: number;
    hoverConeNormalSpeedGain?: number;
    hoverConeTangBase?: number;
    hoverConeTangSpeedGain?: number;

    // extra spread/impact tuning
    hoverEnterMul?: number;
    hoverIndentMul?: number;
    hoverConeMul?: number;

    // global coupling (helps opposite edge bulge)
    hoverPressureBoost?: number;        // adds "virtual compression" from hover penetration
    hoverPressureBoostPow?: number;     // exponent for penetration
    hoverPressureBoostSpeedPow?: number;// exponent for speed

    // radial ring wave (spreads to adjacent + opposite edges)
    hoverRingStrength?: number;
    hoverRingMul?: number;
    hoverRingFreq?: number;
    hoverRingLengthFactor?: number;
    hoverRingPhaseTravelFactor?: number;
    hoverRingPhaseScaleFactor?: number;
    hoverRingWeightPow?: number;

    clickRadius?: number;      
    clickIndent?: number;

    clickWave?: number;

    // idle motion (ambient living effect)
    idle?: boolean;
    idleStrength?: number;        // overall velocity scale
    idleFreq?: number;            // cycles per second
    idleWaves?: number;           // waves around perimeter
    idleTurbulence?: number;      // 0..1 secondary noise mix
    idleTangential?: number;      // 0..1 tangential component ratio
    idleInteractMul?: number;     // 0..1 idle amount during hover

    children: React.ReactNode;
};

const v2 = {
    add: (a: V2, b: V2): V2 => ({ x: a.x + b.x, y: a.y + b.y }),
    sub: (a: V2, b: V2): V2 => ({ x: a.x - b.x, y: a.y - b.y }),
    mul: (a: V2, k: number): V2 => ({ x: a.x * k, y: a.y * k }),
    len: (a: V2): number => Math.hypot(a.x, a.y),
    dot: (a: V2, b: V2): number => a.x * b.x + a.y * b.y,
    norm: (a: V2): V2 => {
        const l = Math.hypot(a.x, a.y) || 1;
        return { x: a.x / l, y: a.y / l };
    },
    clampLen: (a: V2, max: number): V2 => {
        const l = Math.hypot(a.x, a.y);
        if (!l || l <= max) return a;
        const k = max / l;
        return { x: a.x * k, y: a.y * k };
    },
};

const TAU = Math.PI * 2;
const fract = (x: number) => x - Math.floor(x);
const hash1 = (i: number) => fract(Math.sin(i * 127.1) * 43758.5453123);

function polygonArea(pts: V2[]): number {
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        s += a.x * b.y - b.x * a.y;
    }
    return Math.abs(s) * 0.5;
}

function centroid(pts: V2[]): V2 {
    let cx = 0, cy = 0;
    for (const p of pts) { cx += p.x; cy += p.y; }
    const n = Math.max(1, pts.length);
    return { x: cx / n, y: cy / n };
}

type Corner = { rx: number; ry: number };
type Radii = { tl: Corner; tr: Corner; br: Corner; bl: Corner };

function parseRadius(val: string, w: number, h: number): Corner {
    const parts = val.trim().split(/\s+/);
    const a = parts[0] ?? '0px';
    const b = parts[1] ?? parts[0] ?? '0px';

    const toPx = (s: string, base: number) => {
        if (s.endsWith('%')) return (parseFloat(s) / 100) * base;
        return parseFloat(s) || 0;
    };

    return { rx: Math.max(0, toPx(a, w)), ry: Math.max(0, toPx(b, h)) };
}

function getCornerRadii(el: HTMLElement, w: number, h: number): Radii {
    const cs = getComputedStyle(el);
    const tl = parseRadius(cs.borderTopLeftRadius, w, h);
    const tr = parseRadius(cs.borderTopRightRadius, w, h);
    const br = parseRadius(cs.borderBottomRightRadius, w, h);
    const bl = parseRadius(cs.borderBottomLeftRadius, w, h);

    const clampPair = (a: number, b: number, limit: number) => {
        const s = a + b;
        if (s <= limit || s === 0) return [a, b] as const;
        const k = limit / s;
        return [a * k, b * k] as const;
    };

    const [tlx, trx] = clampPair(tl.rx, tr.rx, w);
    const [blx, brx] = clampPair(bl.rx, br.rx, w);
    const [tly, bly] = clampPair(tl.ry, bl.ry, h);
    const [try_, bry] = clampPair(tr.ry, br.ry, h);

    return {
        tl: { rx: tlx, ry: tly },
        tr: { rx: trx, ry: try_ },
        br: { rx: brx, ry: bry },
        bl: { rx: blx, ry: bly },
    };
}

function roundedRectHiResPoints(w: number, h: number, radii: Radii, steps = 28): V2[] {
    const { tl, tr, br, bl } = radii;
    const pts: V2[] = [];

    const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number) => {
        const n = Math.max(6, Math.floor(steps));
        for (let i = 0; i <= n; i++) {
            const t = i / n;
            const a = a0 + (a1 - a0) * t;
            pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
        }
    };

    pts.push({ x: tl.rx, y: 0 });
    pts.push({ x: w - tr.rx, y: 0 });
    arc(w - tr.rx, tr.ry, tr.rx, tr.ry, -Math.PI / 2, 0);

    pts.push({ x: w, y: tr.ry });
    pts.push({ x: w, y: h - br.ry });
    arc(w - br.rx, h - br.ry, br.rx, br.ry, 0, Math.PI / 2);

    pts.push({ x: w - br.rx, y: h });
    pts.push({ x: bl.rx, y: h });
    arc(bl.rx, h - bl.ry, bl.rx, bl.ry, Math.PI / 2, Math.PI);

    pts.push({ x: 0, y: h - bl.ry });
    pts.push({ x: 0, y: tl.ry });
    arc(tl.rx, tl.ry, tl.rx, tl.ry, Math.PI, (3 * Math.PI) / 2);

    return pts;
}

function resampleClosedPolyline(poly: V2[], n: number): V2[] {
    const L: number[] = [0];
    let tot = 0;
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        tot += Math.hypot(b.x - a.x, b.y - a.y);
        L.push(tot);
    }

    const res: V2[] = [];
    for (let i = 0; i < n; i++) {
        const t = (tot * i) / n;
        let j = 0;
        while (j < L.length - 1 && L[j + 1] < t) j++;
        const a = poly[j % poly.length];
        const b = poly[(j + 1) % poly.length];
        const segLen = Math.max(1e-6, L[j + 1] - L[j]);
        const u = (t - L[j]) / segLen;
        res.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
    }
    return res;
}


function catmullRomClosedPath(pts: V2[], tension = 0.7): string {
    const n = pts.length;
    if (n < 4) return '';
    const t = tension;
    const fmt = (v: number) => (Math.round(v * 100) / 100).toString();

    let d = `M ${fmt(pts[0].x)} ${fmt(pts[0].y)}`;
    for (let i = 0; i < n; i++) {
        const p0 = pts[(i - 1 + n) % n];
        const p1 = pts[i];
        const p2 = pts[(i + 1) % n];
        const p3 = pts[(i + 2) % n];

        const c1 = { x: p1.x + ((p2.x - p0.x) * t) / 6, y: p1.y + ((p2.y - p0.y) * t) / 6 };
        const c2 = { x: p2.x - ((p3.x - p1.x) * t) / 6, y: p2.y - ((p3.y - p1.y) * t) / 6 };

        d += ` C ${fmt(c1.x)} ${fmt(c1.y)}, ${fmt(c2.x)} ${fmt(c2.y)}, ${fmt(p2.x)} ${fmt(p2.y)}`;
    }
    d += ' Z';
    return d;
}

export function JellyContainer({
                                   className,
                                   innerClassName,
                                   outline = true,
                                   outlineClassName = 'stroke-white/25',
                                   boundaryPoints = 44,
                                   pathTension = 0.65,
                                   bendK = 70,
                                   smoothK = 0.06,
                                   smoothIters = 1,
                                   edgeK = 170,
                                   shapeK = 95,
                                   damping = 9,
                                   pressureK = 14000,
                                   maxOffset,
                                   bleed,
                                   hoverRadius,
                                   hoverIndent = 1.25,
                                   hoverDrag = 0.35,

                                   pointerSpeedMax = 4200,
                                   hoverPenetrationScale = 42,
                                   hoverEnterStrength = 1.0,
                                   hoverEnterBase = 1400,
                                   hoverEnterSpeedGain = 2200,
                                   hoverEnterSigmaFactor = 0.22,
                                   hoverEnterWeightPow = 1.45,
                                   hoverEnterSpeedPow = 0.85,
                                   hoverEnterDepthPow = 0.9,
                                   hoverEnterDecay = 10,

                                   hoverIndentSigmaFactor = 0.22,
                                   hoverIndentWeightPow = 2.0,
                                   hoverIndentBase = 750,
                                   hoverIndentSpeedGain = 1400,
                                   hoverFastBoost = 1.1,

                                   hoverConeSpeedMin = 25,
                                   hoverConeWidthBaseFactor = 0.22,
                                   hoverConeWidthSlopeFactor = 0.38,
                                   hoverConeLengthFactor = 1.8,
                                   hoverConePhaseTravelFactor = 0.65,
                                   hoverConePhaseScaleFactor = 0.55,
                                   hoverConeFreq = 1.0,
                                   hoverConeNormalBase = 420,
                                   hoverConeNormalSpeedGain = 900,
                                   hoverConeTangBase = 220,
                                   hoverConeTangSpeedGain = 480,
                                   hoverEnterMul = 1.0,
                                   hoverIndentMul = 1.0,
                                   hoverConeMul = 1.0,

                                   hoverPressureBoost = 0.0,
                                   hoverPressureBoostPow = 1.15,
                                   hoverPressureBoostSpeedPow = 0.9,

                                   hoverRingStrength = 520,
                                   hoverRingMul = 1.0,
                                   hoverRingFreq = 1.0,
                                   hoverRingLengthFactor = 3.0,
                                   hoverRingPhaseTravelFactor = 0.85,
                                   hoverRingPhaseScaleFactor = 0.75,
                                   hoverRingWeightPow = 1.0,

                                   clickRadius = 140,
                                   clickIndent = 1.35,
                                   clickWave = 0.8,

                                   idle = true,
                                   idleStrength = 220,
                                   idleFreq = 0.55,
                                   idleWaves = 2.2,
                                   idleTurbulence = 0.35,
                                   idleTangential = 0.22,
                                   idleInteractMul = 0.25,

                                   children,
                               }: JellyContainerProps) {
    const id = useId();

    const wrapRef = useRef<HTMLDivElement | null>(null);
    const blobRef = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const pathRef = useRef<SVGPathElement | null>(null);

    const nodesRef = useRef<Node[]>([]);
    const restRef = useRef<number[]>([]);
    const baseAreaRef = useRef<number>(1);

    const baseSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
    const blobSizeRef = useRef<{ w: number; h: number; pad: number }>({ w: 0, h: 0, pad: 0 });

    const baseCenterRef = useRef<V2>({ x: 0, y: 0 });

    const pointerRef = useRef({
        inside: false,
        down: false,
        p: { x: 0, y: 0 } as V2,
        prev: { x: 0, y: 0 } as V2,
        v: { x: 0, y: 0 } as V2,

        dir: { x: 1, y: 0 } as V2,
        travel: 0,
        enter: 0,

        pen: 0,
        prevPen: 0,
        moveDist: 0,
    });

    const rafRef = useRef<number | null>(null);
    const lastTRef = useRef<number>(0);

    const supportsPath = useMemo(() => {
        if (typeof CSS === 'undefined' || !CSS.supports) return false;
        return CSS.supports('clip-path', `path("M 0 0 L 1 0 L 1 1 L 0 1 Z")`);
    }, []);

    useEffect(() => {
        const wrap = wrapRef.current;
        const blob = blobRef.current;
        const svg = svgRef.current;
        if (!wrap || !blob || !svg) return;

        wrap.style.touchAction = 'none';

        const toLocal = (e: PointerEvent): V2 => {
            const r = wrap.getBoundingClientRect();
            return { x: e.clientX - r.left, y: e.clientY - r.top };
        };

        const rebuild = (w0: number, h0: number) => {
            baseSizeRef.current = { w: w0, h: h0 };
            const minSide = Math.max(1, Math.min(w0, h0));

            const maxOff = maxOffset ?? minSide * 0.10;

            const pad = Math.max(
                14,
                Math.min(140, Math.round(bleed ?? (maxOff * 1.7 + 18)))
            );

            const bw = w0 + pad * 2;
            const bh = h0 + pad * 2;

            blobSizeRef.current = { w: bw, h: bh, pad };

            blob.style.position = 'absolute';
            blob.style.left = `${-pad}px`;
            blob.style.top = `${-pad}px`;
            blob.style.width = `${bw}px`;
            blob.style.height = `${bh}px`;
            blob.style.pointerEvents = 'none';

            svg.style.position = 'absolute';
            svg.style.left = `${-pad}px`;
            svg.style.top = `${-pad}px`;
            svg.style.width = `${bw}px`;
            svg.style.height = `${bh}px`;
            svg.setAttribute('viewBox', `0 0 ${bw} ${bh}`);
            svg.setAttribute('preserveAspectRatio', 'none');

            const radii = getCornerRadii(blob, w0, h0); 
            const hi = roundedRectHiResPoints(w0, h0, radii, 28);
            const base = resampleClosedPolyline(hi, Math.max(24, Math.min(80, boundaryPoints)))
                .map((p) => ({ x: p.x + pad, y: p.y + pad }));

            const nodes: Node[] = base.map((p) => ({ p: { ...p }, v: { x: 0, y: 0 }, b: { ...p } }));

            const rest: number[] = [];
            for (let i = 0; i < nodes.length; i++) {
                const a = nodes[i].b;
                const b = nodes[(i + 1) % nodes.length].b;
                rest.push(Math.hypot(b.x - a.x, b.y - a.y));
            }

            nodesRef.current = nodes;
            restRef.current = rest;
            baseAreaRef.current = Math.max(1, polygonArea(base));

            baseCenterRef.current = centroid(base);

            const d = catmullRomClosedPath(nodes.map((n) => n.p), pathTension);
            if (supportsPath) blob.style.clipPath = `path("${d}")`;
            if (pathRef.current) pathRef.current.setAttribute('d', d);
        };

        const ro = new ResizeObserver((entries) => {
            const r = entries[0]?.contentRect;
            if (!r) return;
            const w0 = Math.max(1, Math.round(r.width));
            const h0 = Math.max(1, Math.round(r.height));
            if (w0 === baseSizeRef.current.w && h0 === baseSizeRef.current.h) return;
            rebuild(w0, h0);
        });

        ro.observe(wrap);

        const onEnter = (e: PointerEvent) => {
            const pr = pointerRef.current;
            pr.inside = true;
            pr.down = false;

            const p0 = toLocal(e);
            const { pad } = blobSizeRef.current;
            const p = { x: p0.x + pad, y: p0.y + pad };

            pr.prev = p;
            pr.p = p;
            pr.v = { x: 0, y: 0 };
            pr.dir = { x: 1, y: 0 };
            pr.travel = 0;
            pr.enter = 1;

            pr.pen = 0;
            pr.prevPen = 0;
            pr.moveDist = 0;
        };

        const onLeave = () => {
            const pr = pointerRef.current;
            pr.inside = false;
            pr.down = false;
            pr.enter = 0;
        };

        const onMove = (e: PointerEvent) => {
            const pr = pointerRef.current;
            if (!pr.inside) pr.enter = 1;
            pr.inside = true;

            const p0 = toLocal(e);
            const { pad } = blobSizeRef.current;
            const p = { x: p0.x + pad, y: p0.y + pad };

            const delta = v2.sub(p, pr.p);
            const dist = v2.len(delta);

            pr.moveDist = dist;

            pr.prev = pr.p;
            pr.p = p;

            if (dist > 0.2) {
                pr.dir = v2.norm(delta);
                pr.travel += dist;
            }
        };

        const applyIndentImpulse = (p: V2, radiusPx: number, indent: number, wave: number) => {
            const nodes = nodesRef.current;
            if (!nodes.length) return;

            const c0 = baseCenterRef.current;
            const sig = Math.max(24, radiusPx * 0.65);
            const sig2 = sig * sig;

            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];

                const dx = n.p.x - p.x;
                const dy = n.p.y - p.y;
                const d2 = dx * dx + dy * dy;
                let wgt = Math.exp(-d2 / (2 * sig2));
                wgt = Math.pow(wgt, 1.2);

                const prev = nodes[(i - 1 + nodes.length) % nodes.length].p;
                const next = nodes[(i + 1) % nodes.length].p;
                const tangent = v2.sub(next, prev);

                let normal = v2.norm({ x: -tangent.y, y: tangent.x });
                if (v2.dot(normal, v2.sub(n.b, c0)) < 0) normal = v2.mul(normal, -1);

                // волна ОТ точки клика
                const fromClick = v2.norm(v2.sub(n.p, p));

                // indent > 0 = выдавить наружу; indent < 0 = вдавить внутрь
                n.v = v2.add(n.v, v2.mul(normal, indent * 2600 * wgt));
                n.v = v2.add(n.v, v2.mul(fromClick, wave * 2200 * wgt));
            }
        };

        const onDown = (e: PointerEvent) => {
            const pr = pointerRef.current;
            pr.down = true;
            pr.prev = pr.p;

            const p0 = toLocal(e);
            const { pad } = blobSizeRef.current;
            pr.p = { x: p0.x + pad, y: p0.y + pad };

            applyIndentImpulse(pr.p, clickRadius, clickIndent, clickWave);

            try { wrap.setPointerCapture(e.pointerId); } catch {}
        };

        const onUp = (e: PointerEvent) => {
            pointerRef.current.down = false;
            try { wrap.releasePointerCapture(e.pointerId); } catch {}
        };

        wrap.addEventListener('pointerenter', onEnter);
        wrap.addEventListener('pointerleave', onLeave);
        wrap.addEventListener('pointermove', onMove, { capture: true });
        wrap.addEventListener('pointerdown', onDown, { capture: true });
        window.addEventListener('pointerup', onUp);

        return () => {
            ro.disconnect();
            wrap.removeEventListener('pointerenter', onEnter);
            wrap.removeEventListener('pointerleave', onLeave);
            wrap.removeEventListener('pointermove', onMove, { capture: true } as any);
            wrap.removeEventListener('pointerdown', onDown, { capture: true } as any);
            window.removeEventListener('pointerup', onUp);
        };
    }, [
        boundaryPoints,
        supportsPath,
        bleed,
        maxOffset,
        clickRadius,
        clickIndent,
        clickWave,
        pathTension,
    ]);

    useEffect(() => {
        const blob = blobRef.current;
        if (!blob) return;

        const step = (t: number) => {
            const nodes = nodesRef.current;
            if (!nodes.length) {
                rafRef.current = requestAnimationFrame(step);
                return;
            }

            const dt = Math.min(0.033, Math.max(0.008, (t - (lastTRef.current || t)) / 1000));
            lastTRef.current = t;

            const pr = pointerRef.current;
            const pv = v2.mul(v2.sub(pr.p, pr.prev), 1 / dt);
            pr.v = v2.clampLen(pv, pointerSpeedMax);
            pr.enter *= Math.exp(-hoverEnterDecay * dt);
            pr.moveDist *= Math.exp(-14 * dt);

            const rest = restRef.current;
            const baseArea = baseAreaRef.current;

            const maxOffBase = (() => {
                const { w, h, pad } = blobSizeRef.current;
                const baseW = w - pad * 2;
                const baseH = h - pad * 2;
                const minSide = Math.max(1, Math.min(baseW, baseH));
                return maxOffset ?? minSide * 0.10;
            })();

            const maxOut = maxOffBase * 1.35;
            const maxIn = maxOffBase * 0.85;

            const poly = nodes.map((n) => n.p);
            const area = Math.max(1, polygonArea(poly));
            const areaErr = (baseArea - area) / baseArea;

            const c0 = baseCenterRef.current;

            // penetration depth near boundary (for entry impact)
            let pen = 0;
            let penN = 0;
            let dPenN = 0;
            if (pr.inside) {
                let bestI = 0;
                let bestD = 1e18;
                for (let i = 0; i < nodes.length; i++) {
                    const dx = nodes[i].b.x - pr.p.x;
                    const dy = nodes[i].b.y - pr.p.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < bestD) { bestD = d2; bestI = i; }
                }

                const nb = nodes[bestI].b;
                const prevb = nodes[(bestI - 1 + nodes.length) % nodes.length].b;
                const nextb = nodes[(bestI + 1) % nodes.length].b;
                const tb = v2.sub(nextb, prevb);

                let nOut = v2.norm({ x: -tb.y, y: tb.x });
                if (v2.dot(nOut, v2.sub(nb, c0)) < 0) nOut = v2.mul(nOut, -1);

                const nIn = v2.mul(nOut, -1);
                pen = Math.max(0, v2.dot(v2.sub(pr.p, nb), nIn));

                penN = Math.min(1, pen / Math.max(1, hoverPenetrationScale));
                const dPen = Math.max(0, pen - pr.prevPen);
                dPenN = Math.min(1, dPen / Math.max(1, hoverPenetrationScale * 0.55));

                pr.prevPen = pen;
                pr.pen = pen;
            } else {
                pr.prevPen = 0;
                pr.pen = 0;
            }

            for (let i = 0; i < nodes.length; i++) {
                const a = nodes[i];
                const b = nodes[(i + 1) % nodes.length];

                const d = v2.sub(b.p, a.p);
                const dist = v2.len(d) || 1;
                const diff = (dist - rest[i]) / dist;
                const f = v2.mul(d, edgeK * diff);

                a.v = v2.add(a.v, v2.mul(f, dt));
                b.v = v2.sub(b.v, v2.mul(f, dt));
            }
            
            const damp = Math.exp(-damping * dt);

            const { w, h, pad } = blobSizeRef.current;
            const baseW = w - pad * 2;
            const baseH = h - pad * 2;
            const minSide = Math.max(1, Math.min(baseW, baseH));

            const hr = Math.max(
                28,
                Math.min(
                    hoverRadius ?? minSide * 0.22,
                    minSide * 0.45
                )
            );

            const hr2 = hr * hr;

            const hi = Math.abs(hoverIndent);

            const speed = Math.min(pointerSpeedMax, v2.len(pr.v));
            const speedN = pointerSpeedMax > 0 ? speed / pointerSpeedMax : 0;

            // boost response for very fast cursor moves (large per-event travel)
            const moveN = Math.min(1, pr.moveDist / Math.max(1, hr * 0.35));
            const boost = 1 + hoverFastBoost * moveN;

            const pressureExtra = pr.inside
                ? hoverPressureBoost * Math.pow(penN, hoverPressureBoostPow) * Math.pow(speedN, hoverPressureBoostSpeedPow) * (0.35 + 0.65 * moveN) * boost
                : 0;
            const areaErrEff = areaErr + pressureExtra;

            const idleFactor = idle ? (pr.inside ? idleInteractMul : 1) : 0;
            const tt = t * 0.001;


            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];

                
                const toBase = v2.sub(n.b, n.p);
                n.v = v2.add(n.v, v2.mul(toBase, shapeK * dt));

                
                const prev = nodes[(i - 1 + nodes.length) % nodes.length].p;
                const next = nodes[(i + 1) % nodes.length].p;
                const tangent = v2.sub(next, prev);
                let normal = v2.norm({ x: -tangent.y, y: tangent.x });
                if (v2.dot(normal, v2.sub(n.b, c0)) < 0) normal = v2.mul(normal, -1);
                const inward = v2.mul(normal, -1);

                if (bendK > 0) {
                    const avg = v2.mul(v2.add(prev, next), 0.5);
                    const lap = v2.sub(avg, n.p);
                    n.v = v2.add(n.v, v2.mul(lap, bendK * dt));
                }

                n.v = v2.add(n.v, v2.mul(normal, pressureK * areaErrEff * dt));

                // idle motion (subtle living drift even without input)
                if (idleFactor > 0) {
                    const u = i / nodes.length;
                    const p1 = hash1(i) * TAU;
                    const p2 = hash1(i + 97) * TAU;

                    const a = Math.sin(u * idleWaves * TAU + tt * idleFreq * TAU + p1);
                    const b = Math.sin(u * idleWaves * 1.9 * TAU + tt * idleFreq * 1.37 * TAU + p2);
                    const val = a * (1 - idleTurbulence) + b * idleTurbulence;

                    const amp = idleStrength * idleFactor;
                    n.v = v2.add(n.v, v2.mul(normal, val * amp * dt));

                    if (idleTangential > 0) {
                        const tangDir = v2.norm(tangent);
                        const vt = Math.cos(u * idleWaves * 1.3 * TAU + tt * idleFreq * 0.9 * TAU + p2);
                        n.v = v2.add(n.v, v2.mul(tangDir, vt * amp * idleTangential * dt));
                    }
                }


                if (pr.inside) {
                    const d = v2.sub(n.p, pr.p);
                    const d2 = d.x * d.x + d.y * d.y;

                    // 0) радиальная волна (распространяется на смежные + противоположные края)
                    if (hoverRingStrength > 0 && speed > hoverConeSpeedMin) {
                        const r = Math.sqrt(d2);
                        const wl = hr * hoverRingLengthFactor;
                        let wr = Math.exp(-r / Math.max(1, wl));
                        wr = Math.pow(wr, hoverRingWeightPow);

                        const phase = (r - pr.travel * hoverRingPhaseTravelFactor) / Math.max(1, hr * hoverRingPhaseScaleFactor);
                        const ripple = Math.sin(phase * Math.PI * 2 * hoverRingFreq);

                        const ringAmp = hoverRingMul * hi * hoverRingStrength;
                        n.v = v2.add(n.v, v2.mul(normal, ripple * ringAmp * wr * dt * boost));
                    }

                    if (d2 < hr2) {
                        // 1) вход курсора: импульс зависит от скорости + "глубины" входа
                        if (pr.enter > 0.001) {
                            const se = hr * hoverEnterSigmaFactor;
                            const se2 = se * se;
                            let we = Math.exp(-d2 / (2 * se2));
                            we = Math.pow(we, hoverEnterWeightPow);

                            const enterAmp = hoverEnterStrength *
                                (hoverEnterBase + hoverEnterSpeedGain * speedN) *
                                Math.pow(speedN, hoverEnterSpeedPow) *
                                Math.pow(penN, hoverEnterDepthPow) *
                                (0.25 + 0.75 * dPenN) *
                                (0.35 + 0.65 * moveN);

                            n.v = v2.add(n.v, v2.mul(inward, hoverEnterMul * hi * enterAmp * we * pr.enter * boost));
                        }

                        // 2) постоянное продавливание под курсором (плавнее, но чувствительнее к скорости)
                        const sig = hr * hoverIndentSigmaFactor;
                        const sig2 = sig * sig;
                        let w0 = Math.exp(-d2 / (2 * sig2));
                        w0 = Math.pow(w0, hoverIndentWeightPow);

                        const indentAmp = hoverIndentMul * hi * (hoverIndentBase + hoverIndentSpeedGain * speedN);
                        n.v = v2.add(n.v, v2.mul(inward, indentAmp * w0 * dt * boost));

                        // 3) инерция по направлению движения: "конусная" волна вперёд
                        if (speed > hoverConeSpeedMin) {
                            const dir = pr.dir;
                            const vec = v2.sub(n.p, pr.p);
                            const along = v2.dot(vec, dir);

                            if (along > 0) {
                                const perp = v2.sub(vec, v2.mul(dir, along));
                                const width = hr * hoverConeWidthBaseFactor + along * hoverConeWidthSlopeFactor;
                                const wCone =
                                    Math.exp(-(perp.x * perp.x + perp.y * perp.y) / (2 * width * width)) *
                                    Math.exp(-along / (hr * hoverConeLengthFactor));

                                const phase = (along - pr.travel * hoverConePhaseTravelFactor) / (hr * hoverConePhaseScaleFactor);
                                const ripple = Math.sin(phase * Math.PI * 2 * hoverConeFreq);

                                const ampN = hoverConeMul * hi * (hoverConeNormalBase + hoverConeNormalSpeedGain * speedN);
                                n.v = v2.add(n.v, v2.mul(normal, ripple * ampN * wCone * dt * boost));

                                const ampT = hoverConeMul * hoverDrag * (hoverConeTangBase + hoverConeTangSpeedGain * speedN);
                                n.v = v2.add(n.v, v2.mul(dir, ampT * wCone * dt * boost));
                            }
                        }
                    }
                }

                
                n.v = v2.mul(n.v, damp);
                n.p = v2.add(n.p, v2.mul(n.v, dt));

                
                const off = v2.sub(n.p, n.b);
                const out = v2.norm(v2.sub(n.b, c0));
                const radial = v2.dot(off, out);
                const radialClamped = Math.max(-maxIn, Math.min(maxOut, radial));
                const tang = v2.sub(off, v2.mul(out, radial));
                const tangClamped = v2.clampLen(tang, maxOffBase);

                n.p = v2.add(n.b, v2.add(v2.mul(out, radialClamped), tangClamped));
            }

            // post-step smoothing: reduces sharp spikes (kinks) without killing the overall motion
            if (smoothK > 0 && smoothIters > 0) {
                const N = nodes.length;
                for (let pass = 0; pass < smoothIters; pass++) {
                    const off = nodes.map((n) => v2.sub(n.p, n.b));
                    for (let i = 0; i < N; i++) {
                        const a = off[(i - 1 + N) % N];
                        const b = off[i];
                        const c = off[(i + 1) % N];
                        const avg = v2.mul(v2.add(v2.add(a, b), c), 1 / 3);
                        const nextOff = v2.add(b, v2.mul(v2.sub(avg, b), smoothK));
                        nodes[i].p = v2.add(nodes[i].b, nextOff);
                    }
                }
            }

            const d = catmullRomClosedPath(nodes.map((n) => n.p), pathTension);
            if (supportsPath) blob.style.clipPath = `path("${d}")`;
            if (pathRef.current) pathRef.current.setAttribute('d', d);

            rafRef.current = requestAnimationFrame(step);
        };

        rafRef.current = requestAnimationFrame(step);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        };
    }, [
        supportsPath,
        edgeK,
        shapeK,
        damping,
        pressureK,
        maxOffset,
        hoverRadius,
        hoverIndent,
        hoverDrag,
        pointerSpeedMax,
        hoverPenetrationScale,
        hoverEnterStrength,
        hoverEnterBase,
        hoverEnterSpeedGain,
        hoverEnterSigmaFactor,
        hoverEnterWeightPow,
        hoverEnterSpeedPow,
        hoverEnterDepthPow,
        hoverEnterDecay,
        hoverIndentSigmaFactor,
        hoverIndentWeightPow,
        hoverIndentBase,
        hoverIndentSpeedGain,
        hoverFastBoost,
        hoverConeSpeedMin,
        hoverConeWidthBaseFactor,
        hoverConeWidthSlopeFactor,
        hoverConeLengthFactor,
        hoverConePhaseTravelFactor,
        hoverConePhaseScaleFactor,
        hoverConeFreq,
        hoverConeNormalBase,
        hoverConeNormalSpeedGain,
        hoverConeTangBase,
        hoverConeTangSpeedGain,
        hoverEnterMul,
        hoverIndentMul,
        hoverConeMul,
        hoverPressureBoost,
        hoverPressureBoostPow,
        hoverPressureBoostSpeedPow,
        hoverRingStrength,
        hoverRingMul,
        hoverRingFreq,
        hoverRingLengthFactor,
        hoverRingPhaseTravelFactor,
        hoverRingPhaseScaleFactor,
        hoverRingWeightPow,
        idle,
        idleStrength,
        idleFreq,
        idleWaves,
        idleTurbulence,
        idleTangential,
        idleInteractMul,
        bendK,
        smoothK,
        smoothIters,
        pathTension,
    ]);

    return (
        <div ref={wrapRef} className="relative inline-block overflow-visible">
            <div ref={blobRef} className={['absolute', className].filter(Boolean).join(' ')} />

            {outline && (
                <svg ref={svgRef} className="pointer-events-none" aria-hidden>
                    <path
                        ref={pathRef}
                        className={outlineClassName}
                        fill="none"
                        strokeWidth={1.5}
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
            )}

            <div className={['relative z-10', innerClassName].filter(Boolean).join(' ')}>
                {children}
            </div>
        </div>
    );
}