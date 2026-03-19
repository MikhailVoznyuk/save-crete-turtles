import {ReactNode} from "react";
import {TextBlock, Title} from "@/shared/ui/text-blocks";
import {ModalImage, ModalVideo} from "@/shared/ui/media";
import type {TextMediaRowProps} from "@/shared/ui/media/types/types";

export function TextMediaRow({header, content, mediaType, mediaSrc, reversed=false}: TextMediaRowProps)  {
    return (
        <div className={`flex flex-col gap-8 items-center justify-center `}>
            <div className={`w-full flex ${reversed ? 'justify-end' : 'justify-start'}`}>
                <Title
                    variant='secondary'
                    size='lg'
                    lined
                    titleClassName='text-turk'
                    lineClassName={`bg-cloud w-3/4`}
                    containerClassName={reversed ? 'items-end' : 'items-start'}
                >{header}</Title>
            </div>
            <div className={`flex gap-14 ${(reversed) ? 'flex-row-reverse' : 'flex-row'}`}>
                <TextBlock className='max-w-1/2' size='md'>{content}</TextBlock>
                {mediaType === 'image' ?
                    <ModalImage src={mediaSrc} className='w-1/2 max-h-96' /> :
                    <ModalVideo src={mediaSrc} className='w-1/2 max-h-96' />
                }

            </div>
        </div>
    )
}