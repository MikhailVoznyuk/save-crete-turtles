'use client';

import {useEffect, useRef} from 'react';
import {twMerge} from "tailwind-merge";
import {MediaModal} from "@/shared/ui/media-modal";
import {ModalToggleButton} from "@/shared/ui/buttons/modal-toggle-button";
import {stabilizeInlineVideo} from "@/shared/utils/media/stabilizeInlineVideo";

type ModalVideoProps = {
    src: string;
    className?: string;
    videoClassName?: string;
    btnNeeded?: boolean;
}

type InlineVideoProps = {
    src: string;
    className?: string;
    autoPlay?: boolean;
    loop?: boolean;
    muted?: boolean;
    controls?: boolean;
    keepPlaying?: boolean;
};

function InlineVideo({
    src,
    className,
    autoPlay = false,
    loop = false,
    muted = false,
    controls = false,
    keepPlaying = false,
}: InlineVideoProps) {
    const ref = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        const video = ref.current;
        if (!video) return;

        return stabilizeInlineVideo(video, {keepPlaying});
    }, [keepPlaying, src]);

    return (
        <video
            ref={ref}
            src={src}
            muted={muted}
            autoPlay={autoPlay}
            loop={loop}
            controls={controls}
            playsInline
            preload={keepPlaying ? 'auto' : 'metadata'}
            disablePictureInPicture
            className={className}
        />
    );
}

export function ModalVideo({src, className, videoClassName, btnNeeded=true}: ModalVideoProps) {
    return (
        <MediaModal
            previewClassName={twMerge(
                'relative rounded-2xl border-2 border-cold-white/50 cursor-pointer hover:border-turk/80 overflow-hidden duration-300',
                className
            )}
            preview={(
                <>
                    <InlineVideo
                        src={src}
                        muted
                        autoPlay
                        loop
                        keepPlaying
                        className={twMerge('w-full object-contain pointer-events-none select-none', videoClassName)}
                    />
                    {btnNeeded && (
                        <ModalToggleButton onClick={() => undefined} className='absolute right-4 bottom-4' />
                    )}
                </>
            )}
            content={(
                <InlineVideo
                    src={src}
                    controls
                    className='w-full max-h-[85vh]'
                />
            )}
        />
    )
}
