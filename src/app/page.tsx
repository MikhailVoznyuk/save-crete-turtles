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
    const scrollRootRef = useRef<HTMLDivElement | null>(null);
    const isMobile = useIsMobile();
    const {isReady, setTaskState} = useHomeReadyGate();

    useEffect(() => {
        if (!isReady) return;

        const html = document.documentElement;
        const body = document.body;

        html.style.overflow = '';
        body.style.position = '';
        body.style.top = '';
        body.style.left = '';
        body.style.right = '';
        body.style.width = '';
        body.style.overflow = '';
        body.style.touchAction = '';
        window.dispatchEvent(new Event('appscrollchange'));
    }, [isReady]);

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
        let frame = 0;
        let lastEdgeSignature = '';
        let lastSignature = '';
        let lastScrollX = Number.NaN;
        let lastScrollY = Number.NaN;

        const probeBaseStyle = [
            'position:absolute',
            'top:0',
            'left:0',
            'visibility:hidden',
            'pointer-events:none',
            'z-index:-2147483647',
            'contain:size layout style paint',
            'box-sizing:border-box',
            'overflow:hidden',
        ].join(';');

        const edgeProbe = document.createElement('div');
        const safeProbe = document.createElement('div');
        const insetProbe = document.createElement('div');

        edgeProbe.setAttribute('aria-hidden', 'true');
        safeProbe.setAttribute('aria-hidden', 'true');
        insetProbe.setAttribute('aria-hidden', 'true');

        edgeProbe.style.cssText = `${probeBaseStyle};width:100vw;height:100vh`;
        safeProbe.style.cssText = `${probeBaseStyle};width:100vw;height:100vh`;
        insetProbe.style.cssText = [
            probeBaseStyle,
            'width:0',
            'height:0',
            'padding-top:env(safe-area-inset-top, 0px)',
            'padding-right:env(safe-area-inset-right, 0px)',
            'padding-bottom:env(safe-area-inset-bottom, 0px)',
            'padding-left:env(safe-area-inset-left, 0px)',
        ].join(';');

        if (typeof CSS !== 'undefined') {
            if (CSS.supports('width', '100lvw')) edgeProbe.style.width = '100lvw';
            if (CSS.supports('height', '100lvh')) edgeProbe.style.height = '100lvh';
            if (CSS.supports('width', '100svw')) safeProbe.style.width = '100svw';
            if (CSS.supports('height', '100svh')) safeProbe.style.height = '100svh';
        }

        document.body.append(edgeProbe, safeProbe, insetProbe);

        const positive = (value: number | undefined | null) => (
            typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
        );

        const roundPx = (value: number) => Math.round(Math.max(0, value) * 100) / 100;

        const setPxVar = (name: string, value: number) => {
            root.style.setProperty(name, `${roundPx(value)}px`);
        };

        const readProbeRect = (el: HTMLElement) => {
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

        const updateScrollVars = () => {
            const scrollX = roundPx(window.scrollX || window.pageXOffset || 0);
            const scrollY = roundPx(window.scrollY || window.pageYOffset || 0);

            if (scrollX === lastScrollX && scrollY === lastScrollY) return;

            lastScrollX = scrollX;
            lastScrollY = scrollY;
            setPxVar('--app-scroll-x', scrollX);
            setPxVar('--app-scroll-y', scrollY);
            window.dispatchEvent(new Event('appscrollchange'));
        };

        const setAppViewportVars = () => {
            const edgeProbeRect = readProbeRect(edgeProbe);
            const safeProbeRect = readProbeRect(safeProbe);
            const docEl = document.documentElement;

            const edgeWidth = Math.max(
                1,
                roundPx(Math.max(
                    edgeProbeRect.width,
                    positive(window.innerWidth),
                    positive(docEl.clientWidth),
                )),
            );

            const edgeHeight = Math.max(
                1,
                roundPx(Math.max(
                    edgeProbeRect.height,
                    positive(window.innerHeight),
                    positive(docEl.clientHeight),
                )),
            );

            const visualWidth = positive(visualViewport?.width);
            const visualHeight = positive(visualViewport?.height);
            const safeWidth = Math.max(
                1,
                roundPx(Math.min(
                    edgeWidth,
                    visualWidth || safeProbeRect.width || positive(window.innerWidth) || edgeWidth,
                    safeProbeRect.width || edgeWidth,
                )),
            );
            const safeHeight = Math.max(
                1,
                roundPx(Math.min(
                    edgeHeight,
                    visualHeight || safeProbeRect.height || positive(window.innerHeight) || edgeHeight,
                    safeProbeRect.height || edgeHeight,
                )),
            );

            const safeOffsetLeft = roundPx(Math.max(0, positive(visualViewport?.offsetLeft)));
            const safeOffsetTop = roundPx(Math.max(0, positive(visualViewport?.offsetTop)));
            const insetTop = readInset('paddingTop');
            const insetRight = readInset('paddingRight');
            const insetBottom = readInset('paddingBottom');
            const insetLeft = readInset('paddingLeft');
            const bleedTop = roundPx(Math.max(safeOffsetTop, insetTop));
            const bleedLeft = roundPx(Math.max(safeOffsetLeft, insetLeft));
            const bleedRight = roundPx(Math.max(0, edgeWidth - safeWidth - safeOffsetLeft, insetRight));
            const bleedBottom = roundPx(Math.max(0, edgeHeight - safeHeight - safeOffsetTop, insetBottom));

            const signature = [
                edgeWidth,
                edgeHeight,
                safeWidth,
                safeHeight,
                safeOffsetLeft,
                safeOffsetTop,
                bleedTop,
                bleedRight,
                bleedBottom,
                bleedLeft,
                insetTop,
                insetRight,
                insetBottom,
                insetLeft,
            ].map(roundPx).join('|');

            if (signature === lastSignature) {
                updateScrollVars();
                return;
            }

            lastSignature = signature;

            root.style.setProperty('--app-vh', `${safeHeight * 0.01}px`);
            root.style.setProperty('--app-full-vh', `${edgeHeight * 0.01}px`);

            setPxVar('--app-safe-viewport-width', safeWidth);
            setPxVar('--app-safe-viewport-height', safeHeight);
            setPxVar('--app-safe-viewport-offset-left', safeOffsetLeft);
            setPxVar('--app-safe-viewport-offset-top', safeOffsetTop);

            setPxVar('--app-full-viewport-width', edgeWidth);
            setPxVar('--app-full-viewport-height', edgeHeight);
            setPxVar('--app-edge-viewport-width', edgeWidth);
            setPxVar('--app-edge-viewport-height', edgeHeight);
            setPxVar('--app-edge-viewport-top', 0);
            setPxVar('--app-edge-viewport-left', 0);
            setPxVar('--app-edge-content-top', 0);
            setPxVar('--app-edge-content-left', 0);
            setPxVar('--app-full-layer-width', edgeWidth);
            setPxVar('--app-full-layer-height', edgeHeight);
            setPxVar('--app-full-layer-top', 0);
            setPxVar('--app-full-layer-left', 0);

            setPxVar('--safe-area-inset-top', insetTop);
            setPxVar('--safe-area-inset-right', insetRight);
            setPxVar('--safe-area-inset-bottom', insetBottom);
            setPxVar('--safe-area-inset-left', insetLeft);

            setPxVar('--full-viewport-bleed-top', bleedTop);
            setPxVar('--full-viewport-bleed-right', bleedRight);
            setPxVar('--full-viewport-bleed-bottom', bleedBottom);
            setPxVar('--full-viewport-bleed-left', bleedLeft);

            updateScrollVars();

            const edgeSignature = `${edgeWidth}|${edgeHeight}`;
            if (edgeSignature !== lastEdgeSignature) {
                lastEdgeSignature = edgeSignature;
                window.dispatchEvent(new Event('appviewportchange'));
            }
        };

        const scheduleViewport = () => {
            if (frame !== 0) return;

            frame = window.requestAnimationFrame(() => {
                frame = 0;
                setAppViewportVars();
            });
        };

        setAppViewportVars();
        window.addEventListener('resize', scheduleViewport, {passive: true});
        window.addEventListener('orientationchange', scheduleViewport);
        window.addEventListener('pageshow', scheduleViewport);
        window.addEventListener('scroll', updateScrollVars, {passive: true});
        visualViewport?.addEventListener('resize', scheduleViewport);

        return () => {
            window.removeEventListener('resize', scheduleViewport);
            window.removeEventListener('orientationchange', scheduleViewport);
            window.removeEventListener('pageshow', scheduleViewport);
            window.removeEventListener('scroll', updateScrollVars);
            visualViewport?.removeEventListener('resize', scheduleViewport);

            edgeProbe.remove();
            safeProbe.remove();
            insetProbe.remove();

            if (frame !== 0) window.cancelAnimationFrame(frame);
        };
    }, []);

    const backgroundSources = useMemo(() => ([
        {src: '/media/video/bg/bg_1_mobile.mp4', media: '(max-width: 639px)', type: 'video/mp4'},
        {src: '/media/video/bg/bg_1.mp4', type: 'video/mp4'},
    ]), []);

    return (
        <div className='app-root'>
            <HomeLoadingOverlay isLoaded={isReady}>
                <div className='sr-only'>Preparing hero scene</div>
            </HomeLoadingOverlay>

            <main className='app-shell' data-app-shell aria-busy={!isReady}>
                <Background
                    videoRef={videoRef}
                    videoSrc='/media/video/bg/bg_1.mp4'
                    sources={backgroundSources}
                    objectPos={isMobile ? {x: 1200, y: 200} : null}
                    fixed
                    onLoadStateChange={handleBackgroundLoadState}
                />
                <SectionNavigationProvider scrollRootRef={scrollRootRef}>
                    <LiquidGlassProvider
                        videoRef={videoRef}
                        zIndex={1}
                        quality={isMobile ? 0.92 : 1}
                        dprCap={isMobile ? 1.4 : 2}
                        onLoadStateChange={handleHeroGlassLoadState}
                    >
                        <div ref={scrollRootRef} className='app-scroll-root' data-app-scroll-root>
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
                        </div>
                    </LiquidGlassProvider>
                </SectionNavigationProvider>
            </main>
        </div>
    );
}
