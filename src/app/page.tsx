'use client';

import {useCallback, useEffect, useMemo, useRef} from 'react';
import {HeroBlock} from '@/widgets/hero-block';
import {FactCardsSection} from '@/widgets/cards-section';
import {StepsSection} from '@/widgets/steps-section';
import {QuestionsSection} from '@/widgets/questions-section';
import {ContactsSection} from '@/widgets/contacts-section/ui/ContactsSection';
import {SectionNavigationProvider} from '@/app/_model/section-navigation/section-navigation.context';
import {LiquidGlassProvider} from '@/shared/effects/liquid-glass/ui/LiquidGlassProvider';
import {Background} from '@/shared/ui/background';
import {useIsMobile} from '@/shared/hooks/adaptive';
import React from 'react';
import {useHomeReadyGate} from '@/app/_model/home-loader/useHomeReadyGate';
import {HomeLoadingOverlay} from '@/app/_model/home-loader/ui/HomeLoadingOverlay';
import type {LoadState} from '@/shared/types/load-state';

export default function Home() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const isMobile = useIsMobile();
    const {isReady, setTaskState} = useHomeReadyGate();

    const handleBackgroundLoadState = useCallback((state: LoadState) => {
        setTaskState('backgroundVideo', state);
    }, [setTaskState]);

    const handleHeroGlassLoadState = useCallback((state: LoadState) => {
        setTaskState('heroGlass', state);
    }, [setTaskState]);

    const handleHeroBubblesLoadState = useCallback((state: LoadState) => {
        setTaskState('heroBubbles', state);
    }, [setTaskState]);

    const handleHeroParticlesLoadState = useCallback((state: LoadState) => {
        setTaskState('heroParticles', state);
    }, [setTaskState]);

    useEffect(() => {
        const visualViewport = window.visualViewport;
        let frame = 0;
        let lastSafeHeight = -1;
        let lastFullHeight = -1;

        const getPositiveNumber = (value: number | undefined | null) => (
            typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
        );

        const setAppViewportVars = () => {
            const safeHeight = Math.round(
                getPositiveNumber(visualViewport?.height) ||
                getPositiveNumber(window.innerHeight) ||
                getPositiveNumber(document.documentElement.clientHeight)
            );

            const fullHeight = Math.round(Math.max(
                getPositiveNumber(window.innerHeight),
                getPositiveNumber(document.documentElement.clientHeight),
                getPositiveNumber(visualViewport?.height),
                safeHeight
            ));

            if (safeHeight > 0 && safeHeight !== lastSafeHeight) {
                lastSafeHeight = safeHeight;
                document.documentElement.style.setProperty('--app-vh', `${safeHeight * 0.01}px`);
            }

            if (fullHeight > 0 && fullHeight !== lastFullHeight) {
                lastFullHeight = fullHeight;
                document.documentElement.style.setProperty('--app-full-vh', `${fullHeight * 0.01}px`);
            }
        };

        const scheduleSetAppViewportVars = () => {
            if (frame !== 0) return;

            frame = window.requestAnimationFrame(() => {
                frame = 0;
                setAppViewportVars();
            });
        };

        setAppViewportVars();
        window.addEventListener('resize', scheduleSetAppViewportVars, {passive: true});
        window.addEventListener('orientationchange', scheduleSetAppViewportVars);
        window.addEventListener('pageshow', scheduleSetAppViewportVars);
        visualViewport?.addEventListener('resize', scheduleSetAppViewportVars);

        return () => {
            window.removeEventListener('resize', scheduleSetAppViewportVars);
            window.removeEventListener('orientationchange', scheduleSetAppViewportVars);
            window.removeEventListener('pageshow', scheduleSetAppViewportVars);
            visualViewport?.removeEventListener('resize', scheduleSetAppViewportVars);

            if (frame !== 0) {
                window.cancelAnimationFrame(frame);
            }
        };
    }, []);

    const backgroundSources = useMemo(() => ([
        {src: '/media/video/bg/bg_1_mobile.mp4', media: '(max-width: 639px)', type: 'video/mp4'},
        {src: '/media/video/bg/bg_1.mp4', type: 'video/mp4'},
    ]), []);

    return (
        <div className='relative isolate w-full min-w-0'>
            <HomeLoadingOverlay isLoaded={isReady}>
                <div className='sr-only'>Preparing hero scene</div>
            </HomeLoadingOverlay>

            <main className='relative w-full' aria-busy={!isReady}>
                <Background
                    videoRef={videoRef}
                    videoSrc='/media/video/bg/bg_1.mp4'
                    sources={backgroundSources}
                    objectPos={isMobile ? {x: 1200, y: 200} : null}
                    fixed
                    onLoadStateChange={handleBackgroundLoadState}
                />
                <SectionNavigationProvider>
                    <LiquidGlassProvider
                        videoRef={videoRef}
                        zIndex={1}
                        quality={isMobile ? 0.92 : 1}
                        dprCap={isMobile ? 1.4 : 2}
                        onLoadStateChange={handleHeroGlassLoadState}
                    >
                        <HeroBlock
                            onBubblesLoadStateChange={handleHeroBubblesLoadState}
                            onParticlesLoadStateChange={handleHeroParticlesLoadState}
                        />
                        <div className='relative flex flex-col gap-24 p-3 sm:p-6'>
                            <FactCardsSection />
                            <StepsSection />
                            <QuestionsSection />
                            <ContactsSection />
                        </div>
                    </LiquidGlassProvider>
                </SectionNavigationProvider>
            </main>
        </div>
    );
}
