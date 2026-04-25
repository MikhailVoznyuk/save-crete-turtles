'use client';

import React, {createContext, useContext} from "react";

export type JellyShapeApi = {
    blobRef: React.RefObject<HTMLDivElement | null>;
    pointsRef: React.RefObject<Float32Array>;
    countRef: React.RefObject<number>;
    padRef: React.RefObject<number>;
    syncRef: React.RefObject<((timestamp?: number) => void) | null>;
    visualSyncRef?: React.RefObject<((rect: DOMRect, timestamp?: number) => void) | null>;
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