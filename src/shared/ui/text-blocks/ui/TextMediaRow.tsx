import {ReactNode} from "react";
import {TextBlock, Title} from "@/shared/ui/text-blocks";
import {ModalImage} from "@/shared/ui/media";
import type {TextMediaRowProps} from "@/shared/ui/media/types/types";

export function TextMediaRow({header, content, mediaType, mediaSrc, reversed=false}: TextMediaRowProps)  {
    return (
        <div className={`flex gap-10 items-center justify-center ${(reversed) ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className='flex flex-col gap-4 w-1/2 max-w-[500px]'>
                <Title variant='secondary' size='md' lined titleClassName='text-turk' lineClassName='bg-cloud'>{header}</Title>
                <TextBlock size='md'>{content}</TextBlock>
            </div>
            <ModalImage src={mediaSrc} className='w-1/2 max-h-96' />
        </div>
    )
}