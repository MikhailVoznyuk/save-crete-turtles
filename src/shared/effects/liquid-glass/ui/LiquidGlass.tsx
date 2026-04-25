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
        intensity = 0.95,
        magnify = 0.10,
        blur = 0.55,
        chromatic = 0.22,
        rim = 0.55,
        spec = 0.35,
        tint = 0.65,
        alpha = 1.0,
        overlay = false,
        edgePull = 10,
        edgePower = 8,
        edgeSingularity = 0.015,
        dirMode = 1,
        order = 0
    }: Props) {
    const id = useId();
    const register = useRegisterLiquidGlass();
    const { blobRef, pointsRef, countRef, padRef, syncRef } = useJellyShape();

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
            syncRef
        });

        return () => un();
    }, [register, id, blobRef, pointsRef, countRef, padRef, syncRef]);

    const overlayNode = useMemo(() => {
        if (!overlay) return null;
        return (
            <div
                aria-hidden
                style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    // эти слои выглядят дороже, чем "синий градиент"
                    boxShadow:
                        'inset 0 1px 1px rgba(255,255,255,0.22), inset 0 -6px 16px rgba(0,0,0,0.14)',
                    background:
                        'radial-gradient(120% 120% at 25% 20%, rgba(255,255,255,0.16), rgba(255,255,255,0.00) 45%)',
                    mixBlendMode: 'screen',
                }}
            />
        );
    }, [overlay]);

    const host = blobRef.current;
    if (!host || !overlayNode) return null;

    return createPortal(overlayNode, host);
}