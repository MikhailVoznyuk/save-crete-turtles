'use client';

import React, {createContext, useContext} from "react";
import type {LiquidGlassGeometry} from "@/shared/effects/liquid-glass/model/context";

export type JellyShapeApi = {
    blobRef: React.RefObject<HTMLDivElement | null>;
    pointsRef: React.RefObject<Float32Array>;
    countRef: React.RefObject<number>;
    padRef: React.RefObject<number>;
    geometryRef: React.RefObject<LiquidGlassGeometry | null>;
    syncRef: React.RefObject<((timestamp?: number) => void) | null>;
}

const JellyShapeContext = createContext<JellyShapeApi | null>(null);

export function JellyShapeProvider(
    {
        value,
        children
    } : {
        value: JellyShapeApi,
        children: React.ReactNode
    }) {
    return <JellyShapeContext.Provider value={value}>{children}</JellyShapeContext.Provider>
}

export function useJellyShape() {
    const v = useContext(JellyShapeContext);
    if (!v) {
        throw new Error('useJellyShape must be used inside JellyContainer');
    }
    return v;
}
