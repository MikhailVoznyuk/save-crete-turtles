import React from "react";
import {JellyContainer} from "@/shared/ui/containers";
import {LiquidGlass} from "@/shared/effects/liquid-glass";

type GlassBubbleProps = {
    className?: string;
    innerClassName?: string;
    idle?: boolean,
    effectStrength?: 'xs' | 'sm' | 'md',
    glassOrder?: number;
    children?: React.ReactNode;
}

const JELLY_CONTAINER_PARAMS = {
    xs: {
        outline: true,
        boundaryPoints: 72,
        bendK: 200,
        smoothK: 0.44,
        smoothIters: 2,
        pathTension: 0.6,
        pressureK: 20000,
        shapeK: 85,
        damping: 9.2,
        hoverIndent: 1,
        hoverRadius: 140,
        hoverIndentMul: 1.35,
        hoverEnterMul: 1.25,
        hoverIndentSigmaFactor: 0.30,
        hoverEnterSigmaFactor: 0.30,
        hoverIndentWeightPow: 1.55,
        hoverEnterWeightPow: 1.25,
        hoverPressureBoost: 0.0,
        hoverRingStrength: 720,
        hoverRingMul: 1.1,
        hoverRingLengthFactor: 0,
        hoverConeMul: 1.1,
        hoverConeWidthBaseFactor: 0.26,
        hoverConeWidthSlopeFactor: 0.46,
        hoverConeLengthFactor: 2.3,
        hoverConeNormalSpeedGain: 1200,
        clickIndent: 0.01,
        clickWave: 0.16,
        pointerSpeedMax: 10000,
        hoverFastBoost: 1.16,
        idle: true,
        idleStrength: 500,
        idleFreq: 0.28,
        idleWaves: 1.3,
        idleTurbulence: 0.6,
        idleTangential: 0.20,
        idleInteractMul: 0.15,
    },
    sm: {
        outline: true,
        boundaryPoints: 72,
        bendK: 1000,
        smoothK: 0.44,
        smoothIters: 2,
        pathTension: 0.6,
        pressureK: 20000,
        shapeK: 85,
        damping: 9.2,
        hoverIndent: 2.0,
        hoverRadius: 140,
        hoverIndentMul: 1.35,
        hoverEnterMul: 1.25,
        hoverIndentSigmaFactor: 0.30,
        hoverEnterSigmaFactor: 0.30,
        hoverIndentWeightPow: 1.55,
        hoverEnterWeightPow: 1.25,
        hoverPressureBoost: 0.0,
        hoverRingStrength: 720,
        hoverRingMul: 1.15,
        hoverRingLengthFactor: 0,
        hoverConeMul: 1.2,
        hoverConeWidthBaseFactor: 0.26,
        hoverConeWidthSlopeFactor: 0.46,
        hoverConeLengthFactor: 2.3,
        hoverConeNormalSpeedGain: 1200,
        clickIndent: 0.01,
        clickWave: 0.9,
        pointerSpeedMax: 10000,
        hoverFastBoost: 10,
        idle: true,
        idleStrength: 600,
        idleFreq: 0.28,
        idleWaves: 1.3,
        idleTurbulence: 0.6,
        idleTangential: 0.20,
        idleInteractMul: 0.15,
    },
    md: {
        outline: true,
        boundaryPoints: 72,
        bendK: 200,
        smoothK: 0.44,
        smoothIters: 2,
        pathTension: 0.6,
        pressureK: 20000,
        shapeK: 85,
        damping: 7.2,
        hoverIndent: 2.0,
        hoverRadius: 140,
        hoverIndentMul: 1.35,
        hoverEnterMul: 1.25,
        hoverIndentSigmaFactor: 0.30,
        hoverEnterSigmaFactor: 0.30,
        hoverIndentWeightPow: 1.55,
        hoverEnterWeightPow: 1.25,
        hoverPressureBoost: 0.0,
        hoverRingStrength: 720,
        hoverRingMul: 1.15,
        hoverRingLengthFactor: 0,
        hoverConeMul: 1.2,
        hoverConeWidthBaseFactor: 0.26,
        hoverConeWidthSlopeFactor: 0.46,
        hoverConeLengthFactor: 2.3,
        hoverConeNormalSpeedGain: 1200,
        clickIndent: 0.01,
        clickWave: 0.9,
        pointerSpeedMax: 10000,
        hoverFastBoost: 10,
        idle: true,
        idleStrength: 1000,
        idleFreq: 0.28,
        idleWaves: 1.3,
        idleTurbulence: 0.7,
        idleTangential: 0.20,
        idleInteractMul: 0.15,
    }
}

/*
    TODO: Сделать возможность проброса ref
 */

export function GlassBubble({
    className,
    innerClassName,
    glassOrder,
    idle= true,
    effectStrength = 'md',
    children,}: GlassBubbleProps
) {

    return (
        <JellyContainer
            className={className}
            innerClassName={innerClassName}
            outlineClassName="stroke-cyan-200/20"
            {...JELLY_CONTAINER_PARAMS[effectStrength ?? 'sm']}
            idle={idle}
        >
            <LiquidGlass
                intensity={1.35}
                magnify={0.30}
                blur={0.18}
                chromatic={0.03}
                rim={0.24}
                spec={0.42}
                tint={0.22}
                alpha={1}
                edgePull={22}
                edgePower={10}
                edgeSingularity={0.035}
                dirMode={0}
                order={glassOrder}
        />
            {children}
        </JellyContainer>
    )
}
