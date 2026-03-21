import Image from "next/image";
import {useEffect, useState, useCallback} from "react";
import {GlassBubble} from "@/shared/ui/containers/glass-bubble";
import {Title} from "@/shared/ui/text-blocks/ui/Title";
import {TextBlock} from "@/shared/ui/text-blocks";
import {ArrowButton} from "@/shared/ui/buttons/arrow-button";
import React from "react";

export type FactCardProps = {
    id: string,
    icon: string,
    title: string | React.ReactNode,
    description: string,
    iconAlt?: string,
}


export function FactCard({ icon, title, description, iconAlt }: FactCardProps) {
    const [opened, setOpened] = useState(false);
    const [contentHeight, setContentHeight] = useState<number>(0);


    const setHeight = (el: HTMLDivElement | null) => {
        if (!el) return;
        setContentHeight(el.scrollHeight);
    }

    const visibleHeight = 422;

    const needDropDown = contentHeight > visibleHeight;
    console.log(needDropDown);

    return (
        <GlassBubble
            effectStrength={'xs'}
            className='rounded-4xl'
            innerClassName='p-5 flex items-center flex-col gap-4'
        >
            <div className='overflow-hidden'
                 style={{height: (opened) ? 'auto' : `${visibleHeight - ((needDropDown) ? 72 : 0)}px`}}
            >
                <div ref={setHeight}
                     className={`flex flex-col gap-4 w-72 items-center`}
                >
                    <div className='flex flex-col items-center gap-4 w-full'>
                        <div className='size-20 rounded-full bg-white/10 border border-cold-white/40 flex items-center justify-center shrink-0'>
                            <Image src={icon} width={50} height={50} alt={iconAlt ?? 'icon of fact about turtles'} />
                        </div>
                        <Title
                            size={'md'}
                            variant='secondary'
                            lined
                            centered
                            containerClassName='shrink-0'
                        >{title}</Title>
                    </div>
                    <TextBlock
                        size='md'
                        centered
                        className='overflow-hidden'
                    >
                        {description}
                    </TextBlock>
                </div>
            </div>
            {needDropDown && (
                <ArrowButton
                    onClick={() => setOpened(prev => !prev)}
                    direction='down'
                    variant='secondary'
                    toggling
                    className='shrink-0'
                />
            )}
        </GlassBubble>
    )
}