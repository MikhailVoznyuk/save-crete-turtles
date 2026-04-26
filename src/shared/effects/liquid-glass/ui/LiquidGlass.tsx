'use client';

import React, { useEffect, useId, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useJellyShape } from '@/shared/ui/containers/jelly-container/model/shapeContext';
import { useRegisterLiquidGlass } from '../model/context';

type Props = {
    enabled?: boolean;

    intensity?: number;
    magnify?: number;
    blur?: number;
    chromatic?: number;
    rim?: number;
    spec?: number;
    tint?: number;
    alpha?: number;

    overlay?: boolean; // dom overlays (inner rim/shadow)

    edgePull?: number;
    edgePower?: number;
    edgeSingularity?: number;

    dirMode?: 0 | 1;
    order?: number;
};

export function LiquidGlass({
        enabled = true,
        intensity = 2.18,
        magnify = 0.48,
        blur = 0.26,
        chromatic = 0.095,
        rim = 1.08,
        spec = 1.22,
        tint = 0.42,
        alpha = 1.0,
        overlay = false,
        edgePull = 58,
        edgePower = 5.8,
        edgeSingularity = 0.018,
        dirMode = 0,
        order = 0
    }: Props) {
    const id = useId();
    const register = useRegisterLiquidGlass();
    const { blobRef, pointsRef, countRef, padRef, geometryRef, syncRef } = useJellyShape();

    const enabledRef = useRef(enabled);
    enabledRef.current = enabled;

    const orderRef = useRef(order);
    orderRef.current = order;

    const paramsRef = useRef({
        intensity,
        magnify,
        blur,
        chromatic,
        rim,
        spec,
        tint,
        alpha,
        edgePull,
        edgePower,
        edgeSingularity,
        dirMode,
    });
    paramsRef.current.intensity = intensity;
    paramsRef.current.magnify = magnify;
    paramsRef.current.blur = blur;
    paramsRef.current.chromatic = chromatic;
    paramsRef.current.rim = rim;
    paramsRef.current.spec = spec;
    paramsRef.current.tint = tint;
    paramsRef.current.alpha = alpha;
    paramsRef.current.edgePull = edgePull;
    paramsRef.current.edgePower = edgePower;
    paramsRef.current.edgeSingularity = edgeSingularity;
    paramsRef.current.dirMode = dirMode;

    useEffect(() => {
        if (!register) return;
        const el = blobRef.current;
        if (!el) return;

        const un = register({
            id,
            el,
            pointsRef,
            countRef,
            enabledRef,
            paramsRef,
            padRef,
            orderRef,
            geometryRef,
            syncRef
        });

        return () => un();
    }, [register, id, blobRef, pointsRef, countRef, padRef, geometryRef, syncRef]);

    const overlayNode = useMemo(() => {
        if (!overlay) return null;
        return (
            <div
                aria-hidden
                style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    borderRadius: 'inherit',
                    boxShadow: [
                        'inset 0 0 0 1px rgba(255,255,255,0.22)',
                        'inset 0 1px 2px rgba(255,255,255,0.30)',
                        'inset 10px 14px 38px rgba(255,255,255,0.12)',
                        'inset -12px -18px 34px rgba(0,24,55,0.18)',
                    ].join(', '),
                    background: [
                        'radial-gradient(92% 80% at 24% 16%, rgba(255,255,255,0.24), rgba(255,255,255,0.045) 34%, rgba(255,255,255,0.00) 58%)',
                        'radial-gradient(120% 100% at 78% 92%, rgba(0,62,155,0.18), rgba(0,62,155,0.00) 52%)',
                        'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.00) 42%, rgba(255,255,255,0.07))',
                    ].join(', '),
                    mixBlendMode: 'screen',
                }}
            />
        );
    }, [overlay]);

    const host = blobRef.current;
    if (!host || !overlayNode) return null;

    return createPortal(overlayNode, host);
}