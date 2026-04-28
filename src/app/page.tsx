'use client';

import React from 'react';
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
        const host = document.body || root;
        const visualViewport = window.visualViewport;
        let viewportFrame = 0;
        let scrollFrame = 0;
        let lastViewportSignature = '';
        let lastScrollSignature = '';

        const ua = window.navigator.userAgent;
        const isIOS = /iP(?:hone|ad|od)/.test(ua) || (
            window.navigator.platform === 'MacIntel' &&
            window.navigator.maxTouchPoints > 1
        );

        root.classList.toggle('app-ios-edge-scroll-layer', isIOS);

        const baseProbeStyle = [
            'position:fixed',
            'top:0',
            'left:0',
            'width:0',
            'height:0',
            'visibility:hidden',
            'pointer-events:none',
            'z-index:-2147483647',
            'contain:size layout style paint',
            'box-sizing:border-box',
        ].join(';');

        const fullProbe = document.createElement('div');
        const safeProbe = document.createElement('div');
        const insetProbe = document.createElement('div');

        fullProbe.setAttribute('aria-hidden', 'true');
        safeProbe.setAttribute('aria-hidden', 'true');
        insetProbe.setAttribute('aria-hidden', 'true');

        fullProbe.style.cssText = `${baseProbeStyle};width:100vw;height:100vh`;
        safeProbe.style.cssText = `${baseProbeStyle};width:100vw;height:100vh`;
        insetProbe.style.cssText = [
            baseProbeStyle,
            'padding-top:env(safe-area-inset-top, 0px)',
            'padding-right:env(safe-area-inset-right, 0px)',
            'padding-bottom:env(safe-area-inset-bottom, 0px)',
            'padding-left:env(safe-area-inset-left, 0px)',
        ].join(';');

        if (typeof CSS !== 'undefined') {
            if (CSS.supports('width', '100lvw')) fullProbe.style.width = '100lvw';
            if (CSS.supports('height', '100lvh')) fullProbe.style.height = '100lvh';
            if (CSS.supports('width', '100svw')) safeProbe.style.width = '100svw';
            if (CSS.supports('height', '100svh')) safeProbe.style.height = '100svh';
        }

        host.append(fullProbe, safeProbe, insetProbe);

        const positive = (value: number | undefined | null) => (
            typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
        );

        const roundPx = (value: number) => Math.round(Math.max(0, value) * 100) / 100;

        const setPxVar = (name: string, value: number) => {
            root.style.setProperty(name, `${roundPx(value)}px`);
        };

        const readRect = (el: HTMLElement) => {
            const rect = el.getBoundingClientRect();
            return {
                width: positive(rect.width),
                height: positive(rect.height),
            };
        };

        const readInset = (property: 'paddingTop' | 'paddingRight' | 'paddingBottom' | 'paddingLeft') => {
            const value = Number.parseFloat(getComputedStyle(insetProbe)[property]);
            return Number.isFinite(value) && value > 0 ? value : 0;
        };

        const setAppScrollVar = () => {
            const scrollX = roundPx(window.scrollX || window.pageXOffset || 0);
            const scrollY = roundPx(window.scrollY || window.pageYOffset || 0);
            const signature = `${scrollX}|${scrollY}`;

            if (signature === lastScrollSignature) return;
            lastScrollSignature = signature;

            setPxVar('--app-scroll-x', scrollX);
            setPxVar('--app-scroll-y', scrollY);
        };

        const setAppViewportVars = () => {
            const fullRect = readRect(fullProbe);
            const safeRect = readRect(safeProbe);
            const docEl = document.documentElement;

            const fullWidth = Math.max(
                1,
                Math.round(Math.max(
                    fullRect.width,
                    positive(window.innerWidth),
                    positive(docEl.clientWidth),
                )),
            );

            const fullHeight = Math.max(
                1,
                Math.round(Math.max(
                    fullRect.height,
                    positive(window.innerHeight),
                    positive(docEl.clientHeight),
                )),
            );

            const visualWidth = positive(visualViewport?.width);
            const visualHeight = positive(visualViewport?.height);
            const safeWidth = Math.max(
                1,
                Math.round(Math.min(
                    fullWidth,
                    visualWidth || safeRect.width || fullWidth,
                    safeRect.width || fullWidth,
                )),
            );
            const safeHeight = Math.max(
                1,
                Math.round(Math.min(
                    fullHeight,
                    visualHeight || safeRect.height || fullHeight,
                    safeRect.height || fullHeight,
                )),
            );

            const safeOffsetLeft = roundPx(Math.max(0, positive(visualViewport?.offsetLeft)));
            const safeOffsetTop = roundPx(Math.max(0, positive(visualViewport?.offsetTop)));
            const insetTop = readInset('paddingTop');
            const insetRight = readInset('paddingRight');
            const insetBottom = readInset('paddingBottom');
            const insetLeft = readInset('paddingLeft');

            const signature = [
                fullWidth,
                fullHeight,
                safeWidth,
                safeHeight,
                safeOffsetLeft,
                safeOffsetTop,
                insetTop,
                insetRight,
                insetBottom,
                insetLeft,
            ].map(roundPx).join('|');

            if (signature === lastViewportSignature) return;
            lastViewportSignature = signature;

            root.style.setProperty('--app-vh', `${safeHeight * 0.01}px`);
            root.style.setProperty('--app-full-vh', `${fullHeight * 0.01}px`);

            setPxVar('--app-safe-viewport-width', safeWidth);
            setPxVar('--app-safe-viewport-height', safeHeight);
            setPxVar('--app-safe-viewport-offset-left', safeOffsetLeft);
            setPxVar('--app-safe-viewport-offset-top', safeOffsetTop);

            setPxVar('--app-full-viewport-width', fullWidth);
            setPxVar('--app-full-viewport-height', fullHeight);
            setPxVar('--app-edge-viewport-width', fullWidth);
            setPxVar('--app-edge-viewport-height', fullHeight);
            setPxVar('--app-edge-viewport-top', 0);
            setPxVar('--app-edge-viewport-left', 0);
            setPxVar('--app-edge-content-top', safeOffsetTop);
            setPxVar('--app-edge-content-left', safeOffsetLeft);
            setPxVar('--app-full-layer-width', fullWidth);
            setPxVar('--app-full-layer-height', fullHeight);
            setPxVar('--app-full-layer-top', 0);
            setPxVar('--app-full-layer-left', 0);

            setPxVar('--safe-area-inset-top', insetTop);
            setPxVar('--safe-area-inset-right', insetRight);
            setPxVar('--safe-area-inset-bottom', insetBottom);
            setPxVar('--safe-area-inset-left', insetLeft);

            setPxVar('--full-viewport-bleed-top', safeOffsetTop);
            setPxVar('--full-viewport-bleed-right', Math.max(0, fullWidth - safeWidth - safeOffsetLeft));
            setPxVar('--full-viewport-bleed-bottom', Math.max(0, fullHeight - safeHeight - safeOffsetTop));
            setPxVar('--full-viewport-bleed-left', safeOffsetLeft);

            window.dispatchEvent(new Event('appviewportchange'));
        };

        const scheduleViewport = () => {
            if (viewportFrame !== 0) return;

            viewportFrame = window.requestAnimationFrame(() => {
                viewportFrame = 0;
                setAppViewportVars();
                setAppScrollVar();
            });
        };

        const scheduleScroll = () => {
            if (isIOS) {
                setAppScrollVar();
                return;
            }

            if (scrollFrame !== 0) return;

            scrollFrame = window.requestAnimationFrame(() => {
                scrollFrame = 0;
                setAppScrollVar();
            });
        };

        setAppViewportVars();
        setAppScrollVar();

        window.addEventListener('resize', scheduleViewport, {passive: true});
        window.addEventListener('orientationchange', scheduleViewport);
        window.addEventListener('pageshow', scheduleViewport);
        window.addEventListener('scroll', scheduleScroll, {passive: true});
        visualViewport?.addEventListener('resize', scheduleViewport);
        visualViewport?.addEventListener('scroll', scheduleScroll);

        return () => {
            window.removeEventListener('resize', scheduleViewport);
            window.removeEventListener('orientationchange', scheduleViewport);
            window.removeEventListener('pageshow', scheduleViewport);
            window.removeEventListener('scroll', scheduleScroll);
            visualViewport?.removeEventListener('resize', scheduleViewport);
            visualViewport?.removeEventListener('scroll', scheduleScroll);

            fullProbe.remove();
            safeProbe.remove();
            insetProbe.remove();
            root.classList.remove('app-ios-edge-scroll-layer');

            if (viewportFrame !== 0) window.cancelAnimationFrame(viewportFrame);
            if (scrollFrame !== 0) window.cancelAnimationFrame(scrollFrame);
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
                        {/*<AppNavigation />*/}
                    </LiquidGlassProvider>
                </SectionNavigationProvider>
            </main>
        </div>
    );
}
