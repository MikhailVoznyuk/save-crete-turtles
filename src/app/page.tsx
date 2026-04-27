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
        const root = document.documentElement;
        const visualViewport = window.visualViewport;
        const host = document.body || root;
        let frame = 0;
        let lastSignature = '';

        const baseProbeStyle = [
            'position:fixed',
            'top:0',
            'left:0',
            'visibility:hidden',
            'pointer-events:none',
            'z-index:-2147483647',
            'contain:size layout style paint',
            'box-sizing:border-box',
        ].join(';');

        const safeProbe = document.createElement('div');
        const fullProbe = document.createElement('div');

        safeProbe.setAttribute('aria-hidden', 'true');
        fullProbe.setAttribute('aria-hidden', 'true');

        safeProbe.style.cssText = `${baseProbeStyle};width:100vw;height:100vh`;
        fullProbe.style.cssText = `${baseProbeStyle};width:100vw;height:100vh`;

        if (typeof CSS !== 'undefined') {
            if (CSS.supports('width', '100svw')) {
                safeProbe.style.width = '100svw';
            }

            if (CSS.supports('height', '100svh')) {
                safeProbe.style.height = '100svh';
            }

            if (CSS.supports('width', '100lvw')) {
                fullProbe.style.width = '100lvw';
            }

            if (CSS.supports('height', '100lvh')) {
                fullProbe.style.height = '100lvh';
            }
        }

        host.append(safeProbe, fullProbe);

        const getPositiveNumber = (value: number | undefined | null) => (
            typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
        );

        const roundPx = (value: number) => Math.round(Math.max(0, value) * 100) / 100;

        const setPxVar = (name: string, value: number) => {
            root.style.setProperty(name, `${roundPx(value)}px`);
        };

        const readProbe = (el: HTMLElement) => {
            const rect = el.getBoundingClientRect();
            return {
                width: getPositiveNumber(rect.width),
                height: getPositiveNumber(rect.height),
            };
        };

        const setAppViewportVars = () => {
            const safeRect = readProbe(safeProbe);
            const fullRect = readProbe(fullProbe);

            const safeWidth = Math.round(
                safeRect.width ||
                getPositiveNumber(visualViewport?.width) ||
                getPositiveNumber(root.clientWidth) ||
                getPositiveNumber(window.innerWidth)
            );

            const safeHeight = Math.round(
                safeRect.height ||
                getPositiveNumber(visualViewport?.height) ||
                getPositiveNumber(root.clientHeight) ||
                getPositiveNumber(window.innerHeight)
            );

            const fullWidth = Math.round(
                fullRect.width ||
                getPositiveNumber(window.innerWidth) ||
                getPositiveNumber(root.clientWidth) ||
                safeWidth
            );

            const fullHeight = Math.round(
                fullRect.height ||
                getPositiveNumber(window.innerHeight) ||
                getPositiveNumber(root.clientHeight) ||
                safeHeight
            );

            const signature = [
                safeWidth,
                safeHeight,
                fullWidth,
                fullHeight,
            ].map(roundPx).join('|');

            if (signature === lastSignature) return;
            lastSignature = signature;

            if (safeHeight > 0) {
                root.style.setProperty('--app-vh', `${safeHeight * 0.01}px`);
            }

            if (fullHeight > 0) {
                root.style.setProperty('--app-full-vh', `${fullHeight * 0.01}px`);
            }

            setPxVar('--app-safe-viewport-width', safeWidth);
            setPxVar('--app-safe-viewport-height', safeHeight);
            setPxVar('--app-full-viewport-width', fullWidth);
            setPxVar('--app-full-viewport-height', fullHeight);

            setPxVar('--full-viewport-bleed-top', 0);
            setPxVar('--full-viewport-bleed-right', 0);
            setPxVar('--full-viewport-bleed-bottom', 0);
            setPxVar('--full-viewport-bleed-left', 0);

            window.dispatchEvent(new Event('appviewportchange'));
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
        visualViewport?.addEventListener('scroll', scheduleSetAppViewportVars);

        return () => {
            window.removeEventListener('resize', scheduleSetAppViewportVars);
            window.removeEventListener('orientationchange', scheduleSetAppViewportVars);
            window.removeEventListener('pageshow', scheduleSetAppViewportVars);
            visualViewport?.removeEventListener('resize', scheduleSetAppViewportVars);
            visualViewport?.removeEventListener('scroll', scheduleSetAppViewportVars);

            safeProbe.remove();
            fullProbe.remove();

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
