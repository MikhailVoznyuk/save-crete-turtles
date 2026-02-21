'use client'

import {Title} from "@/shared/ui/text-blocks/ui/Title";
import {Background} from "@/shared/ui/background";
import {TextBlock} from "@/shared/ui/text-blocks";
import {WaveButton} from "@/shared/ui/buttons/wave-button";
import {JellyContainer} from "@/shared/ui/containers";

export function HeroBlock() {
    return (
        <section className='relative w-full h-screen'>
            <Background videoSrc='/media/video/bg/bg_1.mp4' />
            <div className='flex size-full p-10 text-9'>
                <div className='flex flex-col gap-4 pt-[20vh] max-w-[740px]'>
                    <Title as={'h1'} size={'xl'} lined>
                        Help us save the Cretan turtles in Almyrida
                    </Title>
                    <TextBlock className='w-11/12' size={'xl'} uppercase>
                        {"Contribute to improving the turtles' living conditions and survival. It's not difficult, but it will help save their lives."}
                    </TextBlock>
                    <div className='flex gap-4 items-center'>
                        <WaveButton onClick={() => {}}>Read More</WaveButton>
                        <WaveButton onClick={() => {}} variant='secondary'>Contact us</WaveButton>
                    </div>

                </div>
            </div>
            <div className='absolute right-24 top-24'>
                <JellyContainer
                    className='rounded-full bg-cyan-200/10'
                    outlineClassName='stroke-cyan-200/20'
                    innerClassName='p-20'
                    outline
                    pressureK={20000}
                    shapeK={85}
                    damping={7.2}
                    hoverIndent={-2.0}
                    hoverRadius={140}
                    clickIndent={1.2}
                    clickWave={0.9}

                >
                    <div>
                        <TextBlock size='xl'>
                            Help Me to survive!
                        </TextBlock>
                    </div>

                </JellyContainer>
            </div>



        </section>
    )
}