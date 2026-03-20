'use client';

import Image from "next/image";
import {useEffect, useState, useRef} from 'react';
import {GlassPanel} from "@/shared/ui/containers";
import {Title, TextBlock} from "@/shared/ui/text-blocks";
import {ArrowButton} from "@/shared/ui/buttons/arrow-button";
import type {DropDownBlockProps} from "@/widgets/questions-section/types/types";

export function DropDownBlock({header, content, iconSrc}: DropDownBlockProps) {
    const [opened, setOpened] = useState<boolean>(false);

    return (
        <GlassPanel
            outline={false}
            className={`${opened ? '' : 'h-[80px]'} relative w-[360px] rounded-2xl border border-cold-white/50 bg-black/10`}
            innerClassName='w-full'
        >
            <div className=' w-full flex justify-between items-center gap-3 pr-4'>
                <div className={`flex justify-center items-center size-[80px]  ${opened ? 'bg-turk/60 rounded-br-2xl' : 'bg-white/10'} duration-300`}>
                    <Image src={iconSrc} width={56} height={56} className='size-14' alt='Q&A block icon' />
                </div>
                <Title variant='secondary' size='sm' containerClassName='w-48' >{header}</Title>
                <ArrowButton onClick={() => setOpened((prev => !prev))} variant='secondary' direction='down' toggling  />
            </div>
            <div className={`${opened ? '' : 'h-0'} p-4 duration-300`}>
                <TextBlock  size='md' >{content}</TextBlock>
            </div>
        </GlassPanel>
    )
}