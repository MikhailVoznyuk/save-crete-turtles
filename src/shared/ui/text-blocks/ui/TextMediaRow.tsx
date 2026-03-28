import {TextBlock, Title} from "@/shared/ui/text-blocks";
import {ModalImage, ModalVideo} from "@/shared/ui/media";
import {useIsMobile} from "@/shared/hooks/adaptive";
import type {TextMediaRowProps} from "@/shared/ui/media/types/types";

export function TextMediaRow({header, content, mediaType, mediaSrc, reversed=false}: TextMediaRowProps)  {
    const isMobile = useIsMobile();
    return (
        <div className={`flex flex-col gap-8 items-center justify-center `}>
            <div className={`w-full flex ${reversed ? 'justify-end' : 'justify-start'}`}>
                <Title
                    variant='secondary'
                    size='lg'
                    lined
                    titleClassName='text-turk'
                    lineClassName={`bg-cloud w-3/4`}
                    containerClassName={(isMobile) ? 'items-start' : (reversed ? 'items-end' : 'items-start')}
                >{header}</Title>
            </div>
            <div className={`flex gap-14 flex-col ${(reversed) ? 'md:flex-row-reverse' : 'md:flex-row'}`}>
                <TextBlock className='md:max-w-1/2' size='md'>{content}</TextBlock>
                {mediaType === 'image' ?
                    <ModalImage src={mediaSrc} className='min-w-56 max-w-full sm:max-h-96 md:max-w-1/2' /> :
                    <ModalVideo src={mediaSrc} className='max-w-full md:max-w-1/2 sm:max-h-[60vh]' />
                }
            </div>
        </div>
    )
}