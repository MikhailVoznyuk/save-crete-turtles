import {twMerge} from "tailwind-merge";
import React from "react";
import {JellyContainer} from "@/shared/ui/containers";
import {LiquidGlass} from "@/shared/effects/liquid-glass";

type GlassBubbleProps = {
    className?: string;
    innerClassName?: string;
    containerClassName?: string;
    innerStyle?: React.CSSProperties;
    outline?: boolean;
    visible?: boolean;
    active?: boolean;
    idle?: boolean,
    interactive?: boolean,
    effectStrength?: 'xs' | 'sm' | 'md',
    glassOrder?: number;
    children?: React.ReactNode;
}

const JELLY_CONTAINER_PARAMS = {
    xs: {
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
    containerClassName,
    innerStyle={},
    glassOrder,
    visible = true,
    active = true,
    outline = true,
    idle= true,
    interactive = true,
    effectStrength = 'md',
    children,}: GlassBubbleProps
) {

    const interactiveParams = {
        hoverIndent: interactive ? JELLY_CONTAINER_PARAMS[effectStrength].hoverIndent : 0,
        clickIndent: interactive ? JELLY_CONTAINER_PARAMS[effectStrength].clickIndent : 0,
        clickWave: interactive ? JELLY_CONTAINER_PARAMS[effectStrength].clickWave : 0,
        idleInteractMul: interactive ? JELLY_CONTAINER_PARAMS[effectStrength].idleInteractMul : 1
    }

    return (
        <div className={twMerge(
                `relative transition-all duration-500 ${visible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`,
                containerClassName
            )}
        >
            <JellyContainer
                className={className}
                innerClassName={innerClassName}
                innerStyle={innerStyle}
                outlineClassName='stroke-cyan-200/20'
                {...{
                    ...JELLY_CONTAINER_PARAMS[effectStrength ?? 'sm'],
                    ...interactiveParams
                }}
                outline={outline}
                idle={idle}
                active={active}
            >
            <LiquidGlass
                enabled={visible}
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
        </div>

    )
}
