'use client';

import {useEffect, useRef} from 'react';
import {motion} from 'framer-motion';
import {twMerge} from "tailwind-merge";
import {MediaModal} from "@/shared/ui/media-modal";
import {ModalToggleButton} from "@/shared/ui/buttons/modal-toggle-button";
import {stabilizeInlineVideo} from "@/shared/utils/media/stabilizeInlineVideo";

type ModalVideoProps = {
    src: string;
    className?: string;
    videoClassName?: string;
    btnNeeded?: boolean;
    poster?: string;
}

type InlineVideoProps = {
    src: string;
    className?: string;
    autoPlay?: boolean;
    loop?: boolean;
    muted?: boolean;
    controls?: boolean;
    keepPlaying?: boolean;
    layoutId?: string;
    preload?: 'none' | 'metadata' | 'auto';
    poster?: string;
};

function InlineVideo({
    src,
    className,
    autoPlay = false,
    loop = false,
    muted = false,
    controls = false,
    keepPlaying = false,
    layoutId,
    preload,
    poster
}: InlineVideoProps) {
    const ref = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        const video = ref.current;
        if (!video) return;

        return stabilizeInlineVideo(video, {keepPlaying});
    }, [keepPlaying, src]);

    return (
        <motion.video
            ref={ref}
            layoutId={layoutId}
            src={src}
            muted={muted}
            autoPlay={autoPlay}
            loop={loop}
            controls={controls}
            playsInline
            preload={preload ?? (keepPlaying ? 'auto' : 'metadata')}
            poster={poster}
            disablePictureInPicture
            className={className}
            transition={{
                type: 'spring',
                stiffness: 260,
                damping: 30,
                mass: 0.9
            }}
        />
    );
}

export function ModalVideo({src, poster, className, videoClassName, btnNeeded=true}: ModalVideoProps) {
    return (
        <MediaModal
            previewClassName={twMerge(
                'relative rounded-2xl border-2 border-cold-white/50 cursor-pointer hover:border-turk/80 overflow-hidden duration-300',
                className
            )}
            preview={({layoutId}) => (
                <>
                    <InlineVideo
                        layoutId={layoutId}
                        src={src}
                        poster={poster}
                        preload='auto'
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
            content={({layoutId}) => (
                <InlineVideo
                    layoutId={layoutId}
                    src={src}
                    poster={poster}
                    preload='auto'
                    controls
                    className='w-full max-h-[85vh]'
                />
            )}
        />
    )
}
