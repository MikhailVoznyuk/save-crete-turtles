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
        let scrollFrame = 0;
        let lastSignature = '';
        let lastScrollY = -1;

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
        const viewportProbe = document.createElement('div');
        const largeProbe = document.createElement('div');
        const safeAreaProbe = document.createElement('div');

        safeProbe.setAttribute('aria-hidden', 'true');
        viewportProbe.setAttribute('aria-hidden', 'true');
        largeProbe.setAttribute('aria-hidden', 'true');
        safeAreaProbe.setAttribute('aria-hidden', 'true');

        safeProbe.style.cssText = `${baseProbeStyle};width:100vw;height:100vh`;
        viewportProbe.style.cssText = `${baseProbeStyle};width:100vw;height:100vh`;
        largeProbe.style.cssText = `${baseProbeStyle};width:100vw;height:100vh`;
        safeAreaProbe.style.cssText = [
            baseProbeStyle,
            'width:0',
            'height:0',
            'padding-top:env(safe-area-inset-top, 0px)',
            'padding-right:env(safe-area-inset-right, 0px)',
            'padding-bottom:env(safe-area-inset-bottom, 0px)',
            'padding-left:env(safe-area-inset-left, 0px)',
        ].join(';');

        if (typeof CSS !== 'undefined') {
            if (CSS.supports('width', '100svw')) {
                safeProbe.style.width = '100svw';
            }

            if (CSS.supports('height', '100svh')) {
                safeProbe.style.height = '100svh';
            }

            if (CSS.supports('width', '100lvw')) {
                largeProbe.style.width = '100lvw';
            }

            if (CSS.supports('height', '100lvh')) {
                largeProbe.style.height = '100lvh';
            }
        }

        host.append(safeProbe, viewportProbe, largeProbe, safeAreaProbe);

        const getPositiveNumber = (value: number | undefined | null) => (
            typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
        );

        const roundPx = (value: number) => Math.round(Math.max(0, value) * 100) / 100;
        const roundSignedPx = (value: number) => Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;

        const setPxVar = (name: string, value: number) => {
            root.style.setProperty(name, `${roundPx(value)}px`);
        };

        const setSignedPxVar = (name: string, value: number) => {
            root.style.setProperty(name, `${roundSignedPx(value)}px`);
        };

        const readProbe = (el: HTMLElement) => {
            const rect = el.getBoundingClientRect();
            return {
                width: getPositiveNumber(rect.width),
                height: getPositiveNumber(rect.height),
            };
        };

        const readSafeAreaInsets = () => {
            const style = getComputedStyle(safeAreaProbe);
            const read = (value: string) => getPositiveNumber(Number.parseFloat(value));

            return {
                top: read(style.paddingTop),
                right: read(style.paddingRight),
                bottom: read(style.paddingBottom),
                left: read(style.paddingLeft),
            };
        };

        const maxPositive = (...values: number[]) => Math.max(0, ...values.filter((value) => value > 0));

        const setAppScrollVar = () => {
            const scrollY = roundPx(window.scrollY || window.pageYOffset || 0);
            if (scrollY === lastScrollY) return;
            lastScrollY = scrollY;
            setPxVar('--app-scroll-y', scrollY);
        };

        const setAppViewportVars = () => {
            const safeRect = readProbe(safeProbe);
            const viewportRect = readProbe(viewportProbe);
            const largeRect = readProbe(largeProbe);
            const safeAreaInsets = readSafeAreaInsets();
            const safeOffsetTop = roundPx(getPositiveNumber(visualViewport?.offsetTop));
            const safeOffsetLeft = roundPx(getPositiveNumber(visualViewport?.offsetLeft));
            const isTouchLike = window.matchMedia?.('(hover: none) and (pointer: coarse)')?.matches ?? false;
            const outerWidth = isTouchLike ? getPositiveNumber(window.outerWidth) : 0;
            const outerHeight = isTouchLike ? getPositiveNumber(window.outerHeight) : 0;

            const safeWidth = Math.round(
                getPositiveNumber(visualViewport?.width) ||
                safeRect.width ||
                getPositiveNumber(root.clientWidth) ||
                getPositiveNumber(window.innerWidth)
            );

            const safeHeight = Math.round(
                getPositiveNumber(visualViewport?.height) ||
                safeRect.height ||
                getPositiveNumber(root.clientHeight) ||
                getPositiveNumber(window.innerHeight)
            );

            const fullWidthCandidate = Math.round(maxPositive(
                viewportRect.width,
                largeRect.width,
                getPositiveNumber(window.innerWidth),
                getPositiveNumber(root.clientWidth),
                outerWidth,
                safeWidth + safeOffsetLeft,
            ));

            const fullHeightCandidate = Math.round(maxPositive(
                viewportRect.height,
                largeRect.height,
                getPositiveNumber(window.innerHeight),
                getPositiveNumber(root.clientHeight),
                outerHeight,
                safeHeight + safeOffsetTop,
            ));

            const topBleed = isTouchLike
                ? roundPx(Math.max(safeOffsetTop, safeAreaInsets.top))
                : 0;
            const leftBleed = isTouchLike
                ? roundPx(Math.max(safeOffsetLeft, safeAreaInsets.left))
                : 0;
            const rightBleed = isTouchLike ? roundPx(safeAreaInsets.right) : 0;
            const fullWidth = Math.round(maxPositive(
                fullWidthCandidate,
                safeWidth + leftBleed + rightBleed,
            ));
            const fullHeight = Math.round(maxPositive(
                fullHeightCandidate,
                safeHeight + topBleed,
            ));
            const fullLayerWidth = Math.round(maxPositive(
                fullWidth,
                safeWidth + leftBleed + rightBleed,
            ));
            const fullLayerHeight = Math.round(maxPositive(
                fullHeight,
                safeHeight + topBleed,
            ));

            const signature = [
                safeWidth,
                safeHeight,
                safeOffsetLeft,
                safeOffsetTop,
                topBleed,
                leftBleed,
                rightBleed,
                fullWidth,
                fullHeight,
                fullLayerWidth,
                fullLayerHeight,
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
            setPxVar('--app-safe-viewport-offset-left', safeOffsetLeft);
            setPxVar('--app-safe-viewport-offset-top', safeOffsetTop);
            setPxVar('--app-full-viewport-width', fullWidth);
            setPxVar('--app-full-viewport-height', fullHeight);
            setPxVar('--app-full-layer-width', fullLayerWidth);
            setPxVar('--app-full-layer-height', fullLayerHeight);
            setSignedPxVar('--app-full-layer-top', -topBleed);
            setSignedPxVar('--app-full-layer-left', -leftBleed);

            setPxVar('--full-viewport-bleed-top', topBleed);
            setPxVar('--full-viewport-bleed-right', rightBleed);
            setPxVar('--full-viewport-bleed-bottom', Math.max(0, fullLayerHeight - safeHeight - topBleed));
            setPxVar('--full-viewport-bleed-left', leftBleed);

            setAppScrollVar();

            window.dispatchEvent(new Event('appviewportchange'));
        };

        const scheduleSetAppViewportVars = () => {
            if (frame !== 0) return;

            frame = window.requestAnimationFrame(() => {
                frame = 0;
                setAppViewportVars();
            });
        };

        const scheduleSetAppScrollVar = () => {
            if (scrollFrame !== 0) return;

            scrollFrame = window.requestAnimationFrame(() => {
                scrollFrame = 0;
                setAppScrollVar();
            });
        };

        setAppViewportVars();
        setAppScrollVar();
        window.addEventListener('resize', scheduleSetAppViewportVars, {passive: true});
        window.addEventListener('orientationchange', scheduleSetAppViewportVars);
        window.addEventListener('pageshow', scheduleSetAppViewportVars);
        window.addEventListener('scroll', scheduleSetAppScrollVar, {passive: true});
        visualViewport?.addEventListener('resize', scheduleSetAppViewportVars);
        visualViewport?.addEventListener('scroll', scheduleSetAppViewportVars);

        return () => {
            window.removeEventListener('resize', scheduleSetAppViewportVars);
            window.removeEventListener('orientationchange', scheduleSetAppViewportVars);
            window.removeEventListener('pageshow', scheduleSetAppViewportVars);
            window.removeEventListener('scroll', scheduleSetAppScrollVar);
            visualViewport?.removeEventListener('resize', scheduleSetAppViewportVars);
            visualViewport?.removeEventListener('scroll', scheduleSetAppViewportVars);

            safeProbe.remove();
            viewportProbe.remove();
            largeProbe.remove();
            safeAreaProbe.remove();

            if (frame !== 0) {
                window.cancelAnimationFrame(frame);
            }

            if (scrollFrame !== 0) {
                window.cancelAnimationFrame(scrollFrame);
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
