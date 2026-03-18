'use client';

import {useRef} from 'react'
import {HeroBlock} from "@/widgets/hero-block";
import {FactCardsSection} from "@/widgets/cards-section";
import {LiquidGlassProvider} from "@/shared/effects/liquid-glass/ui/LiquidGlassProvider";
import {Background} from "@/shared/ui/background";
import React from "react";

export default function Home() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    return (
        <div className='min-w-screen'>
            <main className='w-full flex flex-col gap-24'>
                <Background videoRef={videoRef} videoSrc='/media/video/bg/bg_1.mp4' fixed />
                <LiquidGlassProvider videoRef={videoRef}>
                    <HeroBlock />
                    <FactCardsSection />
                </LiquidGlassProvider> */}
            </main>
        </div>
    );
}
