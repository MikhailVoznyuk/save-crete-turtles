import {useEffect, useState, useRef, type MutableRefObject} from 'react'
import {Title} from '@/shared/ui/text-blocks';
import {Timeline} from '@/shared/utils/animations';
import {VideoPointAnchor} from '@/shared/utils/position';
import {GlassBubble} from '@/shared/ui/containers/glass-bubble';
import type {BubbleRepulsor} from '@/widgets/hero-block/model/types';

type StageProps  = {
    style?: Record<string, string>,
    offsetX?: number,
    offsetY?: number,
    duration?: number;
    delay?: number;
    stay?: number;
    ease?: string;
}

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
            stay: 3700
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
            stay: 3600,
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
            duration: 600,
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
            stay: 3300,
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
            duration: 600,
            stay: 100,
            ease: 'linear',
        }
    ],
];

const BUBBLE_STAGES_MOB: StageProps[][] = [
    [
        {
            style: {
                scale: '0',
            }
        },
        {
            offsetX: -30,
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
            offsetX: 10,
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
            offsetX: 20,
            offsetY: 50,
            style: {
                scale: '0',
            },

            duration: 400,
            stay: 3600, // 10000 - 3600
            ease: 'linear',
        },
        {
            offsetX: 10,
            offsetY: 200,
            style: {
                scale: '1',
                opacity: '1',
            },
            duration: 600,
            ease: 'linear',
        },
        {
            offsetX: 10,
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
            offsetX: 80,
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
            offsetX: 140,
            offsetY: 40,
            style: {
                scale: '0',
            },

            duration: 400,
            stay: 3300, // 10000 - 3600
            ease: 'linear',
        },
        {
            offsetX: 160,
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
            offsetX: 160,
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

function getViewportSize() {
    const visualViewport = window.visualViewport;
    const docEl = document.documentElement;

    return {
        width: Math.max(1, Math.round(visualViewport?.width ?? docEl.clientWidth ?? window.innerWidth)),
        height: Math.max(1, Math.round(visualViewport?.height ?? docEl.clientHeight ?? window.innerHeight)),
    };
}

type BubblesProps = {
    repulsorsRef?: MutableRefObject<BubbleRepulsor[]>;
}

export function Bubbles({repulsorsRef}: BubblesProps) {
    const bubblesRef = useRef<(HTMLElement | null)[]>([]);
    const timelinesRef = useRef<Timeline[]>([]);
    const [bubbleSizes, setBubbleSizes] = useState<Sizes[]>([{width: 256, height: 160}, {width: 56, height: 56}, {width: 56, height: 56}]);
    const [visible, setVisible] = useState<boolean>(true);
    const [anchor, setAnchor] = useState<Cords | null>(null);
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [scrolling, setScrolling] = useState<boolean>(false);
    const rafId = useRef<number | null>(null);
    const ticking = useRef<boolean>(false);
    const resizeRafRef = useRef<number | null>(null);
    const layoutRafRef = useRef<number | null>(null);
    const scrollEndTimerRef = useRef<number | null>(null);

    useEffect(() => {
        if (bubblesRef.current.length === 0 || anchor === null) return;

        const visualViewport = window.visualViewport;

        const updateSteps = () => {
            const viewport = getViewportSize();
            const pointAnchor = new VideoPointAnchor(
                {
                    anchor,
                    containerW: viewport.width,
                    containerH: viewport.height,
                    videoW: 1920,
                    videoH: 1080
                }
            );

            const adaptiveStages = isMobile ? BUBBLE_STAGES_MOB : BUBBLE_STAGES;

            for (let i = 0; i < adaptiveStages.length; i++) {
                const el = bubblesRef.current[i];
                if (!el) {
                    continue;
                }

                const stages = adaptiveStages[i];

                let tl;
                if (timelinesRef.current[i]) {
                    tl = timelinesRef.current[i];
                    tl.clear(false);
                } else {
                    const initStage = stages[0];
                    const initCoords = pointAnchor.getAnchorPos({
                        x: initStage.offsetX ?? 0,
                        y: -(initStage.offsetY ?? 0),
                    })

                    const initStyle = {
                        left: `${initCoords.x - bubbleSizes[i].width / 2}px`,
                        top: `${initCoords.y - bubbleSizes[i].height / 2}px`,
                        ...initStage.style
                    }

                    tl = new Timeline({el, loop: true, initStyle});
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
        };

        const scheduleUpdateSteps = () => {
            if (layoutRafRef.current !== null) return;

            layoutRafRef.current = requestAnimationFrame(() => {
                layoutRafRef.current = null;
                updateSteps();
            });
        };

        updateSteps();
        window.addEventListener('resize', scheduleUpdateSteps, {passive: true});
        window.addEventListener('orientationchange', scheduleUpdateSteps);
        window.addEventListener('pageshow', scheduleUpdateSteps);
        visualViewport?.addEventListener('resize', scheduleUpdateSteps);

        return () => {
            window.removeEventListener('resize', scheduleUpdateSteps);
            window.removeEventListener('orientationchange', scheduleUpdateSteps);
            window.removeEventListener('pageshow', scheduleUpdateSteps);
            visualViewport?.removeEventListener('resize', scheduleUpdateSteps);

            if (layoutRafRef.current !== null) {
                cancelAnimationFrame(layoutRafRef.current);
                layoutRafRef.current = null;
            }
        };
    }, [anchor, bubbleSizes, isMobile]);

    useEffect(() => {
        const SHOW_SCROLL_Y = 56;
        const HIDE_SCROLL_Y = 136;
        const SCROLL_IDLE_MS = 140;

        const onScroll = () => {
            setScrolling(true);

            if (scrollEndTimerRef.current !== null) {
                window.clearTimeout(scrollEndTimerRef.current);
            }

            scrollEndTimerRef.current = window.setTimeout(() => {
                scrollEndTimerRef.current = null;
                setScrolling(false);
            }, SCROLL_IDLE_MS);

            if (ticking.current) return;

            ticking.current = true;

            rafId.current = requestAnimationFrame(() => {
                const scrollY = window.scrollY;
                setVisible((prev) => prev ? scrollY < HIDE_SCROLL_Y : scrollY < SHOW_SCROLL_Y);
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
            if (scrollEndTimerRef.current !== null) {
                window.clearTimeout(scrollEndTimerRef.current);
                scrollEndTimerRef.current = null;
            }
            ticking.current = false;
        }
    }, []);

    useEffect(() => {
        const update = () => {
            const windowWidth = getViewportSize().width;
            if (windowWidth < 640) {
                setIsMobile(prev => prev ? prev : true);
                setBubbleSizes([{width: 200, height: 125}, {width: 40, height: 40}, {width: 40, height: 40}])
                setAnchor({x: 920, y: 508})
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
        window.addEventListener('orientationchange', onResize);

        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('orientationchange', onResize);
            if (resizeRafRef.current !== null) {
                cancelAnimationFrame(resizeRafRef.current);
            }
        }
    }, []);

    useEffect(() => {
        if (!repulsorsRef) return;

        let frame = 0;
        const repulsorsEnabled = visible && !scrolling;

        const updateRepulsors = () => {
            if (!repulsorsEnabled) {
                repulsorsRef.current = [];
                frame = requestAnimationFrame(updateRepulsors);
                return;
            }

            const nextRepulsors: BubbleRepulsor[] = [];

            bubblesRef.current.forEach((el, index) => {
                if (!el) return;

                const rect = el.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) return;

                nextRepulsors.push({
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2,
                    rx: rect.width * 0.47,
                    ry: rect.height * 0.47,
                    strength: index === 0 ? 1.15 : 0.9,
                });
            });

            repulsorsRef.current = nextRepulsors;
            frame = requestAnimationFrame(updateRepulsors);
        }

        updateRepulsors();

        return () => {
            cancelAnimationFrame(frame);
            repulsorsRef.current = [];
        }
    }, [repulsorsRef, visible, scrolling]);

    return (
        <>
            <div
                className='fixed gpu-fixed-layer transition-all rounded-full animate-turbulence z-10 pointer-events-none'
                ref={el => {bubblesRef.current[1] = el}}
                style={{
                    width: `${bubbleSizes[1].width}px`,
                    height: `${bubbleSizes[1].height}px`,
                }}
            >
                <GlassBubble
                    className='rounded-full'
                    containerClassName='pointer-events-none'
                    innerStyle={{
                        width: `${bubbleSizes[1].width}px`,
                        height: `${bubbleSizes[1].height}px`
                    }}
                    visible={visible}
                    active={visible}
                    interactive={false}
                    effectStrength='sm'
                />
            </div>
            <div
                className='fixed gpu-fixed-layer transition-all rounded-full animate-turbulence z-10 pointer-events-none'
                ref={el => {bubblesRef.current[2] = el}}
                style={{
                    width: `${bubbleSizes[2].width}px`,
                    height: `${bubbleSizes[2].height}px`
                }}
            >
                <GlassBubble
                    className='rounded-full'
                    containerClassName='pointer-events-none'
                    innerStyle={{
                        width: `${bubbleSizes[2].width}px`,
                        height: `${bubbleSizes[2].height}px`
                    }}
                    visible={visible}
                    active={visible}
                    interactive={false}
                    effectStrength='sm'
                />
            </div>
            <div
                className='fixed gpu-fixed-layer rounded-full animate-turbulence z-20 pointer-events-none'
                ref={(el) => {bubblesRef.current[0] = el}}
                style={{
                    width: `${bubbleSizes[0].width}px`,
                    height: `${bubbleSizes[0].height}px`
                }}
            >
                <GlassBubble
                    className='rounded-full'
                    containerClassName='pointer-events-none'
                    innerClassName='z-20 sm:p-10 flex justify-center items-center'
                    innerStyle={{
                        width: `${bubbleSizes[0].width}px`,
                        height: `${bubbleSizes[0].height}px`
                    }}
                    visible={visible}
                    active={visible}
                    interactive={false}
                    effectStrength='md'
                >
                    <div className='rounded-full flex items-center justify-center'
                         style={{
                             background: 'radial-gradient(rgba(0, 238, 255, 0.26) 0, transparent 70%)',
                             width: `${bubbleSizes[0].width}px`,
                             height: `${bubbleSizes[0].height}px`,
                        }}
                    >
                        <Title
                            variant='secondary'
                            size='lg'
                            titleClassName='text-cold-white/95 text-center text-5xl sm:text-6xl leading-[0.7] text-shadow-[0_4px_4px_rgba(0,0,0,0.25)]'
                            centered
                        >
                            Help me <span className='text-turk underline underline-offset-4 decoration-1'>survive</span>!
                        </Title>
                    </div>
                </GlassBubble>
            </div>
        </>
    )
}