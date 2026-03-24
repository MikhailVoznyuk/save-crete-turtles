import {useLayoutEffect, useEffect,  useState, useCallback, useRef, cloneElement, isValidElement} from 'react';
import {ArrowButton} from "@/shared/ui/buttons/arrow-button";
import type {TouchEvent, ReactNode, ReactElement} from 'react'

type MobileSliderProps = {
    slides: ReactNode[];
    isCardOpen: boolean;
    autoDelay?: number;
}

export function MobileSlider({slides, isCardOpen, autoDelay=8000 }: MobileSliderProps) {
    const [idx, setIdx] = useState<number>(0);
    const [slideW, setSlideW] = useState(0);
    const [isTouching, setIsTouching] = useState<boolean>(false);

    const slidesRef = useRef<(HTMLDivElement | null)[]>([]);
    const touchStartX = useRef<number | null>(null);
    const touchCurrentX = useRef<number | null>(null);
    const timerRef = useRef<number | null>(null);

    const gap = 10;
    const swipeThreshold = 40;

    useLayoutEffect(() => {
        const el = slidesRef.current[idx];
        if (!el) return;

        const measure = () => {
            const w = el.getBoundingClientRect().width;
            setSlideW(w);
        }

        measure();

        const ro = new ResizeObserver(() => {
            measure();
        })

        ro.observe(el);

        return () => {
            ro.disconnect();
        }

    }, [idx, slides.length]);

    useEffect(() => {
        if (slides.length <= 1 || isTouching) return;

        timerRef.current = window.setTimeout(() => {
            goNext();
        }, autoDelay)

        return () => {
            if (timerRef.current !== null) {
                window.clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        }
    }, [idx, isCardOpen]);

    useEffect(() => {
        if (isCardOpen && timerRef.current !== null) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }

    }, [isCardOpen]);

    const clamp = useCallback((v: number, len: number) => {
        if (v < 0) return len - 1;
        if (v >= len) return 0;
        return v;
    }, []);

    const goTo = useCallback((i: number) => {
        setIdx(prev => clamp(i, slides.length))
    }, [clamp, slides.length]);

    const goNext = useCallback(() => {
        setIdx(prev => clamp(prev + 1, slides.length));
    }, [clamp, slides.length]);

    const goPrev = useCallback(() => {
        setIdx(prev => clamp(prev - 1, slides.length));
    }, [clamp, slides.length]);

    const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
        const x = event.touches[0].clientX;
        if (x === null) return;
        setIsTouching(true);
        touchStartX.current = x;
        touchCurrentX.current = x;
    }

    const onTouchMove = (event: TouchEvent<HTMLDivElement>) => {
        const x = event.touches[0].clientX;
        if (x === null) return;

        touchCurrentX.current = x;
    }

    const onTouchEnd = () => {
        const startX = touchStartX.current;
        const endX = touchCurrentX.current;

        touchStartX.current = null;
        touchCurrentX.current = null;
        setIsTouching(false);

        if (startX === null || endX === null) return;

        const deltaX = Math.abs(endX - startX);

        if (deltaX < swipeThreshold) return;

        if (endX < startX) {
            goNext();
        } else {
            goPrev();
        }
    }

    return (
        <div className='relative flex flex-col w-fit gap-6'>
            <div className={`overflow-hidden touch-pan-x`}
                 style={{width: `${slideW}px`}}
                 onTouchStart={onTouchStart}
                 onTouchMove={onTouchMove}
                 onTouchEnd={onTouchEnd}
            >
                <div className={`flex transition-transform ease-out duration-300`}
                     style={{
                         transform: `translateX(${(slideW + gap) * -idx}px)`,
                         gap: `${gap}px`
                     }}
                >
                    {slides.map((slide, i) => {
                        const slideNode = isValidElement(slide)
                            ? cloneElement(slide as ReactElement<any>, {glassActive: idx === i})
                            : slide;

                        return (
                            <div
                                key={i}
                                ref={el => {slidesRef.current[i] = el}}
                                className={`transition-opacity duration-300 shrink-0 grow-0 ${idx === i ? 'opacity-100' : 'opacity-0'}`}
                            >
                                {slideNode}
                            </div>
                        )
                    })}
                </div>
            </div>
            <div className='flex gap-4 justify-center'>
                {slides.map((_, i) => (
                    <button
                        key={i}
                        type='button'
                        onClick={() => goTo(i)}
                        aria-label={`goTo slide ${i}`}
                        className={`size-3 rounded-full ${idx === i ? 'bg-turk' : 'bg-cold-white'} transition-colors duration-300 cursor-pointer`}
                    />
                ))}
            </div>

            {   /*
                <ArrowButton className='absolute -translate-1/2 top-1/2 left-0' onClick={goPrev} direction='left'/>
                <ArrowButton className='absolute -translate-1/2  top-1/2 left-full' onClick={goNext} direction='right'/>
                */
            }

        </div>
    )
}