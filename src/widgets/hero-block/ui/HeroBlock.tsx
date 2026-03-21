'use client';

import {useEffect, useState, useRef} from "react";
import {Title} from "@/shared/ui/text-blocks/ui/Title";
import {TextBlock} from "@/shared/ui/text-blocks";
import {WaveButton} from "@/shared/ui/buttons/wave-button";
import {Bubbles} from "@/widgets/hero-block/ui/Bubbles";
import {ArrowButton} from "@/shared/ui/buttons/arrow-button";
import {useIsMobile} from "@/shared/hooks/adaptive";

export function HeroBlock() {
    const isMobile = useIsMobile();
    const rafRef = useRef<number | null>(null);


    return (
        <section className='relative w-full h-screen'>
            <div className='flex flex-col size-full p-4 pb-20 justify-end sm:justify-start sm:p-10 text-9'>
                <div className='flex flex-col gap-4 pt-[20vh] max-w-[740px] items-center sm:items-start'>
                    <Title as={'h1'} size={'xl'} lined centered={isMobile}>
                        Help us save the Cretan turtles in Almyrida
                    </Title>
                    <TextBlock className='w-11/12' size={'xl'} uppercase centered={isMobile}>
                        {"Contribute to improving the turtles' living conditions and survival. It's not difficult, but it will help save their lives."}
                    </TextBlock>
                    <div className='flex flex-col sm:flex-row gap-4 items-center sm:items-center '>
                        <WaveButton onClick={() => {}}>Read More</WaveButton>
                        <WaveButton onClick={() => {}} variant='secondary'>Contact us</WaveButton>
                    </div>

                </div>
            </div>

            <Bubbles />
            <ArrowButton
                onClick={() => {}}
                direction='down'
                containerVisible={false}
                className='absolute left-1/2 -bottom-6 sm:bottom-2 -translate-1/2 animate-bounce-slow'
            />

        </section>
    )
}