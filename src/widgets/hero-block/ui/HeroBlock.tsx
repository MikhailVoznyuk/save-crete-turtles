'use client';

import {useRef} from 'react';
import {useSectionNavigation} from '@/app/_model/section-navigation/section-navigation.context';
import {Title} from '@/shared/ui/text-blocks/ui/Title';
import {TextBlock} from '@/shared/ui/text-blocks';
import {WaveButton} from '@/shared/ui/buttons/wave-button';
import {Bubbles} from '@/widgets/hero-block/ui/Bubbles';
import {ArrowButton} from '@/shared/ui/buttons/arrow-button';
import {useIsMobile} from '@/shared/hooks/adaptive';
import {HeroDustText} from '@/widgets/hero-block/ui/HeroDustText';
import type {BubbleRepulsor} from '@/widgets/hero-block/model/types';
import type {LoadState} from '@/shared/types/load-state';

const HERO_TITLE = 'Help us save the Cretan sea turtles in Almyrida';
const HERO_TEXT = "Contribute to improving the loggerhead sea turtles (Caretta caretta)' living conditions and survival. It's not difficult, but it will help save their lives.";

type HeroBlockProps = {
    onBubblesLoadStateChange?: (state: LoadState) => void;
    onParticlesLoadStateChange?: (state: LoadState) => void;
}

export function HeroBlock({onBubblesLoadStateChange, onParticlesLoadStateChange}: HeroBlockProps) {
    const {registerSection, scrollToSection} = useSectionNavigation();
    const isMobile = useIsMobile();
    const textParticleRootRef = useRef<HTMLDivElement | null>(null);
    const titleRef = useRef<HTMLDivElement | null>(null);
    const textRef = useRef<HTMLDivElement | null>(null);
    const repulsorsRef = useRef<BubbleRepulsor[]>([]);

    return (
        <section ref={registerSection('hero')} className='relative w-full hero-screen'>
            <div className='flex flex-col size-full p-4 justify-center  sm:p-10 text-9'>
                <div className='flex flex-col gap-4  max-w-[740px] items-center sm:items-start'>
                    <div ref={textParticleRootRef} className='relative w-full'>
                        <div className='opacity-0 select-none flex flex-col items-center gap-5'>
                            <div ref={titleRef}>
                                <Title as='h1' size='xl' lined centered={isMobile}>
                                    {HERO_TITLE}
                                </Title>
                            </div>
                            <div ref={textRef}>
                                <TextBlock size='xl' uppercase centered={isMobile}>
                                    {HERO_TEXT}
                                </TextBlock>
                            </div>
                        </div>
                        <HeroDustText
                            containerRef={textParticleRootRef}
                            titleRef={titleRef}
                            textRef={textRef}
                            repulsorsRef={repulsorsRef}
                            onLoadStateChange={onParticlesLoadStateChange}
                        />
                    </div>
                    <div className='flex flex-col sm:flex-row gap-4 items-center sm:items-center'>
                        <WaveButton onClick={() => {scrollToSection('cards')}}>Read More</WaveButton>
                        <WaveButton onClick={() => {scrollToSection('contacts')}} variant='secondary'>Contact us</WaveButton>
                    </div>
                </div>
            </div>
            <Bubbles repulsorsRef={repulsorsRef} onLoadStateChange={onBubblesLoadStateChange}/>

            <ArrowButton
                onClick={() => {}}
                direction='down'
                containerVisible={false}
                className='absolute left-1/2 bottom-2 -translate-1/2 animate-bounce-slow hidden sm:block'
            />
        </section>
    )
}
