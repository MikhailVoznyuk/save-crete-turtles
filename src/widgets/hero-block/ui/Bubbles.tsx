import React from 'react';
import {useEffect, useState, useRef} from 'react'
import {JellyContainer} from "@/shared/ui/containers";
import {LiquidGlass} from "@/shared/effects/liquid-glass";
import {TextBlock} from "@/shared/ui/text-blocks";
import {Timeline} from "@/shared/utils/animations";
import {VideoPointAnchor} from "@/shared/utils/position";
import {GlassBubble} from "@/shared/ui/containers/glass-bubble";

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
// TODO: В перспективе сделать чтобы текст появлялся когда пузырь статичен, и исчезал когда он начианет всплывать
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
    const [visible, setVisible] = useState<boolean>(true);
    const [anchor, setAnchor] = useState<Cords | null>(null);
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const rafId = useRef<number | null>(null);
    const ticking = useRef<boolean>(false);
    const resizeRafRef = useRef<number | null>(null);

    useEffect(() => {
        if (bubblesRef.current.length === 0) return;
        const updateSteps= () => {
            if (anchor === null) return;
            const pointAnchor = new VideoPointAnchor(
                {
                    anchor: anchor,
                    containerW: window.innerWidth,
                    containerH: window.innerHeight,
                    videoW: 1920,
                    videoH: 1080
                }
            );

            const pos = pointAnchor.getAnchorPos();



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

        return () => {
            removeEventListener('resize', updateSteps);

        };
    }, [anchor]);

    useEffect(() => {
        const onScroll = () => {
            if (ticking.current) return;

            ticking.current = true;

            rafId.current = requestAnimationFrame(() => {

                const nextVisible = window.scrollY < 100;

                setVisible((prev) => (prev === nextVisible) ? prev : nextVisible);

                ticking.current = false;
                rafId.current = null;
            })
        }

        window.addEventListener('scroll', onScroll, {passive: true});
        onScroll();

        return () => {
            window.removeEventListener('scroll', onScroll);
            if (rafId.current !== null) {
                cancelAnimationFrame(rafId.current);
                rafId.current = null;
            }
            ticking.current = false;
        }
    }
    , []);

    useEffect(() => {
        const update = () => {
            const windowWidth = window.innerWidth;
            if (windowWidth < 640) {
                setIsMobile(prev => prev ? prev : true);
                setBubbleSizes([{width: 200, height: 125}, {width: 40, height: 40}, {width: 40, height: 40}])
                setAnchor({x: 860, y: 508})
            } else {
                setIsMobile(prev => prev ? false : prev);
                setBubbleSizes([{width: 256, height: 160}, {width: 56, height: 56}, {width: 56, height: 56}]);
                setAnchor({x: 1100, y: 548})
            }
            resizeRafRef.current = null;
        }

        const onResize = () => {
            if (resizeRafRef.current !== null) return;
            resizeRafRef.current = requestAnimationFrame(update);
        }

        update();
        window.addEventListener('resize', onResize);

        return () => {
            window.removeEventListener('resize', onResize);
            if (resizeRafRef.current !== null) {
                cancelAnimationFrame(resizeRafRef.current);
            }
        }
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

            >
                <GlassBubble
                    className="rounded-full"
                    innerStyle={   {
                        width: `${bubbleSizes[1].width}px`,
                        height: `${bubbleSizes[1].height}px`
                    }}
                    visible={visible}
                    effectStrength='sm'
                />
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
                <GlassBubble
                    className="rounded-full"
                    innerClassName="size-14"
                    visible={visible}
                    effectStrength='sm'
                />
            </div>
            <div className='fixed rounded-full animate-turbulence z-20'
                 ref={(el) => {bubblesRef.current[0] = el}}
            >
                <GlassBubble
                    className="rounded-full"
                    innerClassName="z-20 sm:p-10 flex justify-center items-center"
                    innerStyle={   {
                        width: `${bubbleSizes[0].width}px`,
                        height: `${bubbleSizes[0].height}px`
                    }}
                    visible={visible}
                    effectStrength='md'
                >
                    <div className='rounded-full flex items-center justify-center'
                         style={{
                             background: 'radial-gradient(rgba(0, 238, 255, 0.26) 0, transparent 70%)',
                             width: `${bubbleSizes[0].width}px`,
                             height: `${bubbleSizes[0].height}px`,
                        }}
                    >
                        <TextBlock
                            size='lg'
                            className=' text-cold-white/95 text-center text-4xl sm:text-6xl leading-[0.7] text-shadow-[0_4px_4px_rgba(0,0,0,0.25)]'>
                            Help me survive!
                        </TextBlock>
                    </div>
                </GlassBubble>
            </div>
        </>
    )
}
