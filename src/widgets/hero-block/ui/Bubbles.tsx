import React from 'react';
import {useEffect, useState, useRef} from 'react'
import {JellyContainer} from "@/shared/ui/containers";
import {LiquidGlass} from "@/shared/effects/liquid-glass";
import {TextBlock} from "@/shared/ui/text-blocks";
import {Timeline} from "@/shared/utils/animations";
import {VideoPointAnchor} from "@/shared/utils/position";


// засторить позицию элементов для каждого состояния
type Stage = 'enter' | 'show' | 'out'
type StageProps  = {
    style?: Record<string, string>,
    offsetX?: number,
    offsetY?: number,
    duration?: number;
    delay?: number;
    stay?: number;
    ease?: string;
}

// 0 - основной пузырь, 1 - вспомогательный (средний) 2 - завершающий

// Задать смещение относительно изначального якоря, не позиционирование стилями
// TODO: задать offset
// 11500мс - длинна видео

const BUBBLE_STAGES: StageProps[][] = [
    [
        {
            style: {
                scale: '0',
            }
        },
        {
            offsetX: 10,
            offsetY: 50,
            style: {
                scale: '1',
            },
            delay: 5300,
            duration: 1000,
            stay: 3700 // 3700 default
        },
        {
            offsetX: 20,
            offsetY: 300,
            style: {
                scale: '0'
            },
            duration: 1000,
            stay: 500
        },
    ],
    [
        {
            style: {
                scale: '0'
            }
        },
        {
            offsetX: 30,
            offsetY: 20,
            style: {
                scale: '1'
            },
            delay: 5500,
            stay: 0,
            duration: 500,
            ease: 'linear',
        },
        {
            offsetX: 60,
            offsetY: 50,
            style: {
                scale: '0',
            },

            duration: 400,
            stay: 3600, // 10000 - 3600
            ease: 'linear',
        },
        {
            offsetX: 30,
            offsetY: 200,
            style: {
                scale: '1',
                opacity: '1',
            },
            duration: 600,
            ease: 'linear',
        },
        {
            offsetX: 30,
            offsetY: 340,
            style: {
                scale: '0'
            },
            duration: 600, // 11200 - 100
            stay: 300,
            ease: 'linear',
        }
    ],
    [
        {
            style: {
                scale: '0'
            }
        },
        {
            offsetX: 100,
            offsetY: 20,
            style: {
                scale: '1'
            },
            delay: 5800,
            stay: 0,
            duration: 500,
            ease: 'linear',
        },
        {
            offsetX: 160,
            offsetY: 40,
            style: {
                scale: '0',
            },

            duration: 400,
            stay: 3300, // 10000 - 3600
            ease: 'linear',
        },
        {
            offsetX: 200,
            offsetY: 200,
            style: {
                scale: '1',
                opacity: '1',
            },
            duration: 600,
            delay: 200,
            ease: 'linear',
        },
        {
            offsetX: 200,
            offsetY: 340,
            style: {
                scale: '0'
            },
            duration: 600, // 11200 - 100
            stay: 100,
            ease: 'linear',
        }
    ],
];

type Cords = {x: number, y: number};
type Sizes = {width: number, height: number};

const TURTLE_ANCHOR: Cords = {x: 1100, y: 548};

export function Bubbles() {

    const bubblesRef = useRef<(HTMLElement | null)[]>([]);
    const timelinesRef = useRef<Timeline[]>([]);
    const [bubbleSizes, setBubbleSizes] = useState<Sizes[]>([{width: 256, height: 160}, {width: 56, height: 56}, {width: 56, height: 56}]);
    /*
    const scopeRef = useRef<HTMLDivElement | null>(null);
    /*

     */
    const [anchor, setAnchor] = useState<Cords | null>(null);

    useEffect(() => {
        if (bubblesRef.current.length === 0) return;
        const updateSteps= () => {
            const pointAnchor = new VideoPointAnchor(
                {
                    anchor: TURTLE_ANCHOR,
                    containerW: window.innerWidth,
                    containerH: window.innerHeight,
                    videoW: 1920,
                    videoH: 1080
                }
            );

            const pos = pointAnchor.getAnchorPos();

            setAnchor(pos);

            for (let i = 0; i < BUBBLE_STAGES.length; i++) {
                const el = bubblesRef.current[i];
                if (el === null) {
                    console.log('ye')
                    continue;
                }

                const stages = BUBBLE_STAGES[i];

                let tl;
                if (timelinesRef.current[i]) {
                    tl = timelinesRef.current[i];
                    tl.clear(false);
                } else {
                    const initStage = stages[0];
                    const initCords = pointAnchor.getAnchorPos({
                        x: initStage.offsetX ?? 0,
                        y: -(initStage.offsetY ?? 0),
                    })

                    const initStyle = {
                        left: `${initCords.x - bubbleSizes[i].width / 2}px`,
                        top: `${initCords.y - bubbleSizes[i].height / 2}px`,
                        ...initStage.style
                    }

                    tl = new Timeline({el, loop: true, initStyle: initStyle});
                }

                for (let j = 1; j < stages.length; j++) {
                    const stage = stages[j];
                    const coords = pointAnchor.getAnchorPos({
                        x: stage.offsetX ?? 0,
                        y: -(stage.offsetY ?? 0),
                    })
                    const stageStyle = {
                        left: `${coords.x}px`,
                        top: `${coords.y - bubbleSizes[i].height}px`,
                        ...stage.style
                    };

                    tl.add({
                        style: stageStyle,
                        duration: stage.duration,
                        stay: stage.stay,
                        delay: stage.delay,
                        ease: stage.ease ?? 'ease',
                    })
                }

                timelinesRef.current[i] = tl;

            }
        }

        updateSteps();

        window.addEventListener('resize', updateSteps);

        return () => removeEventListener('resize', updateSteps);
    }, []);



    return (
        <>
            {/*<div className='fixed size-2 rounded-full bg-red-600'
                 ref={scopeRef}
                 style={{
                     left: `${anchor?.x ?? 0}px`,
                     top: `${anchor?.y ?? 0}px`,
                 }}
            ></div>*/}
            <div className='fixed transition-all rounded-full size-12 animate-turbulence  z-10'
                 ref={el => {bubblesRef.current[1] = el}}
                 style={
                     {
                         width: `${bubbleSizes[1].width}px`,
                         height: `${bubbleSizes[1].height}px`
                     }
                 }
            >
                <JellyContainer
                    className="rounded-full"
                    innerClassName="size-14"
                    outlineClassName="stroke-cyan-200/20"
                    outline
                    boundaryPoints={72}
                    bendK={1000}
                    smoothK={0.44}
                    smoothIters={2}
                    pathTension={0.6}
                    pressureK={20000}
                    shapeK={85}
                    damping={9.2}
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
                    idleStrength={600}
                    idleFreq={0.28}
                    idleWaves={1.3}
                    idleTurbulence={0.6}
                    idleTangential={0.20}
                    idleInteractMul={0.15}

                >
                    <LiquidGlass
                        intensity={1.35}
                        magnify={0.30}
                        blur={0.18}
                        chromatic={0.07}
                        rim={0.24}
                        spec={0.42}
                        tint={0.22}
                        alpha={1}
                        edgePull={12}
                        edgePower={5}
                        edgeSingularity={0.035}
                        dirMode={0}
                        order={0}
                    />

                </JellyContainer>
            </div>
            <div className='fixed transition-all rounded-fullanimate-turbulence  z-10'
                 ref={el => {bubblesRef.current[2] = el}}
                 style={
                     {
                         width: `${bubbleSizes[2].width}px`,
                         height: `${bubbleSizes[2].height}px`
                     }
                 }
            >
                <JellyContainer
                    className="rounded-full"
                    innerClassName="size-14"
                    outlineClassName="stroke-cyan-200/20"
                    outline
                    boundaryPoints={72}
                    bendK={1000}
                    smoothK={0.44}
                    smoothIters={2}
                    pathTension={0.6}
                    pressureK={20000}
                    shapeK={85}
                    damping={9.2}
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
                    idleStrength={600}
                    idleFreq={0.28}
                    idleWaves={1.3}
                    idleTurbulence={0.6}
                    idleTangential={0.20}
                    idleInteractMul={0.15}

                >
                    <LiquidGlass
                        intensity={1.35}
                        magnify={0.30}
                        blur={0.18}
                        chromatic={0.07}
                        rim={0.24}
                        spec={0.42}
                        tint={0.22}
                        alpha={1}
                        edgePull={12}
                        edgePower={5}
                        edgeSingularity={0.035}
                        dirMode={0}
                        order={1}
                    />

                </JellyContainer>
            </div>
            <div className='fixed rounded-full animate-turbulence z-20'
                 ref={(el) => {bubblesRef.current[0] = el}}
            >
                <JellyContainer
                    className="rounded-full z-20"
                    outlineClassName="stroke-cyan-200/20"
                    innerClassName="w-64 h-40 z-20" // p-20
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
                        intensity={1.35}
                        magnify={0.30}
                        blur={0.18}
                        chromatic={0.07}
                        rim={0.24}
                        spec={0.42}
                        tint={0.22}
                        alpha={1}
                        edgePull={12}
                        edgePower={5}
                        edgeSingularity={0.035}
                        dirMode={0}
                        order={2}
                    />

                </JellyContainer>
            </div>

            <div className='fixed rounded-full animate-turbulence z-20 top-[80vh] left-[80vw]'
                 ref={(el) => {bubblesRef.current[0] = el}}
            >
                <JellyContainer
                    className="rounded-full z-20"
                    outlineClassName="stroke-cyan-200/20"
                    innerClassName="w-64 h-40 z-20" // p-20
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
                        intensity={1.35}
                        magnify={0.30}
                        blur={0.18}
                        chromatic={0.07}
                        rim={0.24}
                        spec={0.42}
                        tint={0.22}
                        alpha={1}
                        edgePull={12}
                        edgePower={5}
                        edgeSingularity={0.035}
                        dirMode={0}
                        order={2}
                    />

                </JellyContainer>
            </div>

        </>


    )
}
