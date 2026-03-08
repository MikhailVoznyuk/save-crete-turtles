import React from 'react';
import {useEffect, useRef} from 'react'
import {JellyContainer} from "@/shared/ui/containers";
import {LiquidGlass} from "@/shared/effects/liquid-glass";
import {TextBlock} from "@/shared/ui/text-blocks";
import {Timeline} from "@/shared/utils/animations";


// засторить позицию элементов для каждого состояния
type Stage = 'enter' | 'show' | 'out'
type StageProps  = {
    style: Record<string, string>,
    duration?: number;
    delay?: number;
    stay?: number;
}

// 0 - основной пузырь, 1 - вспомогательный (средний) 2 - завершающий
const BUBBLE_STAGES: StageProps[][] = [
    [{
        style: {
            top: '400px',
            left: '800px',
            transform: 'scale(0)'
        }
    },
    {
        style: {
            top: '200px',
            left: '900px',
            transform: 'scale(1)',
        },
        delay: 5000,
        duration: 1000,
        stay: 4000
    },
    {
        style: {
            top: '100px',
            left: '800px',
            transform: 'scale(0)'
        },
        duration: 1000
    },

    ],
    [{
        style: {
            top: '400px',
            left: '800px',
            transform: 'scale(0)'
        }
    },
        {
            style: {
                top: '200px',
                left: '900px',
                transform: 'scale(1)'
            }
        },
        {
            style: {
                top: '100px',
                left: '900px',
                transform: 'scale(0)'
            }
        }
    ],
    [{
        style: {
            top: '400px',
            left: '800px',
            transform: 'scale(0)'
        }
    },
        {
            style: {
                top: '200px',
                left: '900px',
                transform: 'scale(1)'
            }
        },
        {
            style: {
                top: '100px',
                left: '900px',
                transform: 'scale(0)'
            }
        }
    ],
];

export function Bubbles() {
    const DELAY = 500;
    const SHOW_DURATION = 500000;

    const bubbles = useRef<(HTMLElement | null)[]>([]);


    useEffect(() => {
        if (bubbles.current[0] === null) return;

        const tl = new Timeline({el: bubbles.current[0], initStyle: BUBBLE_STAGES[0][0].style})
        tl.add(BUBBLE_STAGES[0][1]).add(BUBBLE_STAGES[0][2]);
    }, []);



    return (
        <>
            <div className='absolute rounded-full'
                 ref={(el) => {bubbles.current[0] = el}}
            >
                <JellyContainer
                    className="rounded-full"
                    outlineClassName="stroke-cyan-200/20"
                    innerClassName="p-20"
                    outline
                    boundaryPoints={72}
                    bendK={200}
                    smoothK={0.44}
                    smoothIters={2}
                    pathTension={0.6}
                    pressureK={20000}
                    shapeK={85}
                    damping={7.2}
                    hoverIndent={2.0}
                    hoverRadius={140}
                    hoverIndentMul={1.35}
                    hoverEnterMul={1.25}
                    hoverIndentSigmaFactor={0.30}
                    hoverEnterSigmaFactor={0.30}
                    hoverIndentWeightPow={1.55}
                    hoverEnterWeightPow={1.25}
                    hoverPressureBoost={0.0}
                    hoverRingStrength={720}
                    hoverRingMul={1.15}
                    hoverRingLengthFactor={0}
                    hoverConeMul={1.2}
                    hoverConeWidthBaseFactor={0.26}
                    hoverConeWidthSlopeFactor={0.46}
                    hoverConeLengthFactor={2.3}
                    hoverConeNormalSpeedGain={1200}
                    clickIndent={0.01}
                    clickWave={0.9}
                    pointerSpeedMax={10000}
                    hoverFastBoost={10}
                    idle
                    idleStrength={1000}
                    idleFreq={0.28}
                    idleWaves={1.3}
                    idleTurbulence={0.7}
                    idleTangential={0.20}
                    idleInteractMul={0.15}

                >
                    <LiquidGlass
                        intensity={1.15}
                        magnify={0.12}
                        blur={0.42}
                        chromatic={0.18}
                        rim={0.55}
                        spec={0.55}
                        tint={0.35}
                        alpha={1}
                        dirMode={0}
                    />
                    <div>
                        <TextBlock size="xl">Help Me to survive!</TextBlock>
                    </div>
                </JellyContainer>
            </div>
            <div className='absolute transition-all rounded-full'
                 ref={el => {bubbles.current[1] = el}}
            >
                <JellyContainer
                    className="rounded-full"
                    outlineClassName="stroke-cyan-200/20"
                    innerClassName="p-20"
                    outline
                    boundaryPoints={72}
                    bendK={200}
                    smoothK={0.44}
                    smoothIters={2}
                    pathTension={0.6}
                    pressureK={20000}
                    shapeK={85}
                    damping={7.2}
                    hoverIndent={2.0}
                    hoverRadius={140}
                    hoverIndentMul={1.35}
                    hoverEnterMul={1.25}
                    hoverIndentSigmaFactor={0.30}
                    hoverEnterSigmaFactor={0.30}
                    hoverIndentWeightPow={1.55}
                    hoverEnterWeightPow={1.25}
                    hoverPressureBoost={0.0}
                    hoverRingStrength={720}
                    hoverRingMul={1.15}
                    hoverRingLengthFactor={0}
                    hoverConeMul={1.2}
                    hoverConeWidthBaseFactor={0.26}
                    hoverConeWidthSlopeFactor={0.46}
                    hoverConeLengthFactor={2.3}
                    hoverConeNormalSpeedGain={1200}
                    clickIndent={0.01}
                    clickWave={0.9}
                    pointerSpeedMax={10000}
                    hoverFastBoost={10}
                    idle
                    idleStrength={1000}
                    idleFreq={0.28}
                    idleWaves={1.3}
                    idleTurbulence={0.7}
                    idleTangential={0.20}
                    idleInteractMul={0.15}

                >
                    <LiquidGlass
                        intensity={1.15}
                        magnify={0.12}
                        blur={0.42}
                        chromatic={0.18}
                        rim={0.55}
                        spec={0.55}
                        tint={0.35}
                        alpha={1}
                        dirMode={0}
                    />

                </JellyContainer>
            </div>
            <div className='absolute transition-all rounded-full'
                 ref={el => {bubbles.current[2] = el}}
            >
                <JellyContainer
                    className="rounded-full"
                    outlineClassName="stroke-cyan-200/20"
                    innerClassName="p-20"
                    outline
                    boundaryPoints={72}
                    bendK={200}
                    smoothK={0.44}
                    smoothIters={2}
                    pathTension={0.6}
                    pressureK={20000}
                    shapeK={85}
                    damping={7.2}
                    hoverIndent={2.0}
                    hoverRadius={140}
                    hoverIndentMul={1.35}
                    hoverEnterMul={1.25}
                    hoverIndentSigmaFactor={0.30}
                    hoverEnterSigmaFactor={0.30}
                    hoverIndentWeightPow={1.55}
                    hoverEnterWeightPow={1.25}
                    hoverPressureBoost={0.0}
                    hoverRingStrength={720}
                    hoverRingMul={1.15}
                    hoverRingLengthFactor={0}
                    hoverConeMul={1.2}
                    hoverConeWidthBaseFactor={0.26}
                    hoverConeWidthSlopeFactor={0.46}
                    hoverConeLengthFactor={2.3}
                    hoverConeNormalSpeedGain={1200}
                    clickIndent={0.01}
                    clickWave={0.9}
                    pointerSpeedMax={10000}
                    hoverFastBoost={10}
                    idle
                    idleStrength={1000}
                    idleFreq={0.28}
                    idleWaves={1.3}
                    idleTurbulence={0.7}
                    idleTangential={0.20}
                    idleInteractMul={0.15}

                >
                    <LiquidGlass
                        intensity={1.15}
                        magnify={0.12}
                        blur={0.42}
                        chromatic={0.18}
                        rim={0.55}
                        spec={0.55}
                        tint={0.35}
                        alpha={1}
                        dirMode={0}
                    />

                </JellyContainer>
            </div>
        </>


    )
}
