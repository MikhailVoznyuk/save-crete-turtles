'use client'

import {twMerge} from "tailwind-merge";
import {ModalToggleButton} from "@/shared/ui/buttons/modal-toggle-button";
import {MediaModal} from "@/shared/ui/media-modal";

type ModalImageProps = {
    src: string;
    width?: number;
    height?: number;
    btnNeeded?: boolean;
    className?: string;
    imageClassName?: string;
    alt?: string;
}

export function ModalImage({src, className, imageClassName, alt, width=1920, height=1080, btnNeeded=true}: ModalImageProps) {

    return (
        <MediaModal
            previewClassName={twMerge(
                'relative rounded-2xl shadow-xl border-2 cursor-pointer border-cold-white/50 hover:border-turk/80 overflow-hidden duration-300',
                className
            )}
            preview={(
                <>
                    <img
                        className={twMerge('size-full object-cover', imageClassName)}
                        width={width}
                        height={height}
                        src={src}
                        alt={alt ?? 'Side photo of text block'}
                    />
                    {btnNeeded && (
                        <ModalToggleButton onClick={() => undefined} className='absolute bottom-4 right-4' />
                    )}
                </>
            )}
            content={(
                <img
                    className='w-full max-h-[85vh] object-cover'
                    src={src}
                    alt={alt ?? 'fullscreen side photo of text block'}
                    width={width}
                    height={height}
                />
            )}
        />
    )
}