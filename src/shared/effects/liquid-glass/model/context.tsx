'use client';

import React, { createContext, useContext } from 'react';

export type LiquidGlassParams = {
    intensity: number;   // refract strength
    magnify: number;     // slight scale
    blur: number;        // frost amount
    chromatic: number;   // edge CA
    rim: number;         // fresnel rim
    spec: number;        // spec highlight
    tint: number;        // blue tint
    alpha: number;       // overall alpha

    edgePull: number;        // сила стягивания у края
    edgePower: number;       // насколько резко растёт к краю
    edgeSingularity: number; // "почти бесконечность" у края (меньше = сильнее)

    dirMode: number;
};

export type LiquidGlassHandle = {
    id: string;
    el: HTMLElement;
    pointsRef: React.RefObject<Float32Array>;
    countRef: React.RefObject<number>;
    enabledRef: React.RefObject<boolean>;
    paramsRef: React.RefObject<LiquidGlassParams>;
    padRef: React.RefObject<number>;
    orderRef: React.RefObject<number>;
};

export type RegisterLiquidGlass = (h: LiquidGlassHandle) => () => void;

const LiquidGlassRegistryContext = createContext<RegisterLiquidGlass | null>(null);

export function LiquidGlassRegistryProvider(
    {
        register,
        children,
    }: {
    register: RegisterLiquidGlass;
    children: React.ReactNode;
    }) {
    return <LiquidGlassRegistryContext.Provider value={register}>{children}</LiquidGlassRegistryContext.Provider>
}

export function useRegisterLiquidGlass() {
    const v = useContext(LiquidGlassRegistryContext);
    if (!v) {
        throw new Error('useRegisterLiquidGlass must be used within its provider');
    }

    return v;
}