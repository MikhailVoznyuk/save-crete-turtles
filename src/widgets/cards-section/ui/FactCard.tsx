import {GlassBubble} from "@/shared/ui/containers/glass-bubble";
import {Title} from "@/shared/ui/text-blocks/ui/Title";
import {TextBlock} from "@/shared/ui/text-blocks";
import Image from "next/image";
import React from "react";

export type FactCardProps = {
    icon: string,
    title: string | React.ReactNode,
    description: string,
    iconAlt?: string,
}

export function FactCard({ icon, title, description, iconAlt }: FactCardProps) {
    return (
        <GlassBubble
            idle={false}
            className='rounded-4xl'
            innerClassName='p-5'
        >
            <div className='flex flex-col gap-4 w-72 items-center'>
                <div className='size-20 rounded-full bg-white/20 flex items-center justify-center'>
                    <Image src={icon} width={56} height={56} alt={iconAlt ?? 'icon of fact about turtles'} />
                </div>
                <Title
                    size={'md'}
                    variant='secondary'
                    lined
                    centered
                >{title}</Title>
                <TextBlock size='md' centered>
                    {description}
                </TextBlock>
            </div>
        </GlassBubble>
    )
}