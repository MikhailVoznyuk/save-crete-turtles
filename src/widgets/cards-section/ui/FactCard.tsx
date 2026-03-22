import Image from "next/image";
import {useEffect, useState, useCallback} from "react";
import {GlassBubble} from "@/shared/ui/containers/glass-bubble";
import {Title} from "@/shared/ui/text-blocks/ui/Title";
import {TextBlock} from "@/shared/ui/text-blocks";
import {ArrowButton} from "@/shared/ui/buttons/arrow-button";
import {useIsMobile} from "@/shared/hooks/adaptive";
import React from "react";

export type FactCardProps = {
    id: string,
    icon: string,
    title: string | React.ReactNode,
    description: string,
    iconAlt?: string,
    cardOpened?: boolean,
    cardToggler?: () => void
}


export function FactCard({ icon, title, description, iconAlt, cardOpened, cardToggler }: FactCardProps) {
    const [opened, setOpened] = useState(cardOpened ?? false);
    const [contentHeight, setContentHeight] = useState<number>(0);
    const isMobile = useIsMobile();

    const setHeight = (el: HTMLDivElement | null) => {
        if (!el) return;
        setContentHeight(el.scrollHeight);
    }

    const toggleCard = () => {
        if (cardToggler) {
            cardToggler();
        }
        setOpened(prev => !prev);
    }

    const visibleHeight = (isMobile) ? 390 : 422;
    const iconSize = (isMobile ? 42 : 50);
    const needDropDown = contentHeight > visibleHeight;

    return (
        <GlassBubble
            effectStrength={'xs'}
            className='rounded-4xl'
            innerClassName='p-4 sm:p-5 flex items-center flex-col gap-4'
        >
            <div className='overflow-hidden'
                 style={{height: (opened) ? 'auto' : `${visibleHeight - ((needDropDown) ? 72 : 0)}px`}}
            >
                <div ref={setHeight}
                     className={`flex flex-col gap-4 w-64 sm:w-72 items-center ${isMobile ? 'select-none cursor-grab' : ''}`}
                >
                    <div className='flex flex-col items-center gap-4 w-full'>
                        <div className='size-[72px] sm:size-20 rounded-full bg-white/10 border border-cold-white/40 flex items-center justify-center shrink-0 shadow-xl sm:shadow-2xl'>
                            <Image src={icon} width={iconSize} height={iconSize} alt={iconAlt ?? 'icon of fact about turtles'} />
                        </div>
                        <Title
                            size={'md'}
                            variant='secondary'
                            lined
                            centered
                            containerClassName='shrink-0'
                            titleClassName='font-medium'
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
                    onClick={toggleCard}
                    direction='down'
                    variant='secondary'
                    toggling
                    className='shrink-0'
                />
            )}
        </GlassBubble>
    )
}