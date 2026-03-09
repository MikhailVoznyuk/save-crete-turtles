import React from 'react';
import {useEffect, useRef} from 'react'
import {JellyContainer} from "@/shared/ui/containers";
import {LiquidGlass} from "@/shared/effects/liquid-glass";
import {TextBlock} from "@/shared/ui/text-blocks";
import {Timeline} from "@/shared/utils/animations";
import {mapVideoPointToScreen} from "@/shared/utils/position";


// засторить позицию элементов для каждого состояния
type Stage = 'enter' | 'show' | 'out'
type StageProps  = {
    style?: Record<string, string>,
    offsetX?: number,
    offsetY?: number,
    duration?: number;
    delay?: number;
    stay?: number;
}

// 0 - основной пузырь, 1 - вспомогательный (средний) 2 - завершающий

// Задать смещение относительно изначального якоря, не позиционирование стилями
// TODO: задать offset
// 11500мс - длинна видео

const BUBBLE_STAGES: StageProps[][] = [
    [
        {
            style: {
                transform: 'scale(0)'
            }
        },
        {
            offsetX: 10,
            offsetY: 128,
            style: {
                top: '200px',
                left: '900px',
                transform: 'scale(1)',
            },
            delay: 5300,
            duration: 1000,
            stay: 3700
        },
        {
            offsetX: 20,
            offsetY: 300,
            style: {
                transform: 'scale(0)'
            },
            duration: 1000,
            stay: 500
        },
    ],
    [
        {
            style: {
                transform: 'scale(0)'
            }
        },
        {
            offsetX: 40,
            offsetY: 170,
            style: {
                transform: 'scale(1)'
            },
            delay: 5500,
            duration: 1000,
            stay: 0,
        },
        {
            offsetX: 60,
            offsetY: 200,
            style: {
                transform: 'scale(0)'
            },

            duration: 200,
            stay: 3300 // 10000 - 3300
        },
        {
            offsetX: 40,
            offsetY: 240,
            style: {
                transform: 'scale(1)'
            },
            duration: 200,
        },
        {
            offsetX: 10,
            offsetY: 300,
            style: {
                transform: 'scale(0)'
            },
            duration: 1000, // 11200 - 100
            stay: 300
        }
    ],
    [
        {
            style: {
                transform: 'scale(0)'
            }
        },
        {
            offsetX: 40,
            offsetY: 170,
            style: {
                transform: 'scale(1)'
            },
            delay: 5500,
            duration: 1000,
            stay: 0,
        },
        {
            offsetX: 60,
            offsetY: 200,
            style: {
                transform: 'scale(0)'
            },

            duration: 200,
            stay: 3300 // 10000 - 3300
        },
        {
            offsetX: 40,
            offsetY: 240,
            style: {
                transform: 'scale(1)'
            },
            duration: 200,
        },
        {
            offsetX: 10,
            offsetY: 300,
            style: {
                transform: 'scale(0)'
            },
            duration: 1000, // 11200 - 100
            stay: 300
        }
    ],
];

const TURTLE_ANCHOR = {x: 848, y: 438};
const DELAY = 500;
const SHOW_DURATION = 500000;

export function Bubbles() {

    const bubblesRef = useRef<(HTMLElement | null)[]>([]);
    const timelinesRef = useRef<Timeline[]>([]);

    useEffect(() => {
        if (bubblesRef.current.length === 0) return;

        const updateSteps= () => {
            const pos = mapVideoPointToScreen(
                TURTLE_ANCHOR,
                window.innerWidth,
                window.innerHeight,
                1920,
                1080
            )

            for (let i = 0; i < BUBBLE_STAGES.length; i++) {
                const el = bubblesRef.current[i];
                if (el === null) {
                    continue;
                }

                let tl;
                if (timelinesRef.current[i]) {
                    tl = timelinesRef.current[i];
                    tl.clear(false);
                } else {
                    tl = new Timeline({el, loop: true});
                }

                const stages = BUBBLE_STAGES[i];
                const initStage = stages[0];


                const tlInitStyle = {
                    left: `${pos.x + (initStage.offsetX ?? 0)}`,
                    top: `${pos.y - (initStage.offsetY ?? 0)}`,
                    ...initStage.style
                }

                tl.applyStyles(tlInitStyle);

                for (let j = 1; j < stages.length; j++) {
                    const stage = stages[j];
                    const stageStyle = {
                        left: `${pos.x + (stage.offsetX ?? 0)}`,
                        top: `${pos.y + (stage.offsetY ?? 0)}`,
                        ...stage.style
                    };

                    tl.add({
                        style: stageStyle,
                        duration: stage.duration,
                        stay: stage.stay,
                        delay: stage.delay,
                    })
                }

                timelinesRef.current[i] = tl;

            }
        }

        window.addEventListener('resize', updateSteps);

        return () => removeEventListener('resize', updateSteps);
    }, []);



    return (
        <>
            <div className='fixed rounded-full'
                 ref={(el) => {bubblesRef.current[0] = el}}
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
            <div className='fixed transition-all rounded-full'
                 ref={el => {bubblesRef.current[1] = el}}
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
            <div className='fixed transition-all rounded-full'
                 ref={el => {bubblesRef.current[2] = el}}
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
