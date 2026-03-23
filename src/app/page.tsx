'use client';

import {useEffect, useRef} from 'react'
import {HeroBlock} from "@/widgets/hero-block";
import {FactCardsSection} from "@/widgets/cards-section";
import {StepsSection} from "@/widgets/steps-section";
import {QuestionsSection} from "@/widgets/questions-section";
import {LiquidGlassProvider} from "@/shared/effects/liquid-glass/ui/LiquidGlassProvider";
import {Background} from "@/shared/ui/background";
import {useIsMobile} from "@/shared/hooks/adaptive";

import React from "react";

export default function Home() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const isMobile = useIsMobile();

    useEffect(() => {
        const setAppVh = () => {
            const height = window.visualViewport?.height ?? window.innerHeight;
            document.documentElement.style.setProperty('--app-vh', `${height * 0.01}px`);
        };

        setAppVh();
        window.addEventListener('resize', setAppVh, {passive: true});
        window.addEventListener('orientationchange', setAppVh);
        window.addEventListener('pageshow', setAppVh);

        return () => {
            window.removeEventListener('resize', setAppVh);
            window.removeEventListener('orientationchange', setAppVh);
            window.removeEventListener('pageshow', setAppVh);
        };
    }, []);

    return (
        <div className='w-full min-w-0'>
            <main className='w-full'>
                <Background
                    videoRef={videoRef}
                    videoSrc='/media/video/bg/bg_1.mp4'
                    objectPos={(isMobile) ? {x: 1200, y: 200} : null}
                    fixed
                />
                <LiquidGlassProvider videoRef={videoRef}>
                    <HeroBlock />
                    <div className='relative flex flex-col gap-24 p-3 sm:p-6'>
                        <FactCardsSection />
                        <StepsSection />
                        <QuestionsSection />
                    </div>
                </LiquidGlassProvider>
            </main>
        </div>
    );
}
