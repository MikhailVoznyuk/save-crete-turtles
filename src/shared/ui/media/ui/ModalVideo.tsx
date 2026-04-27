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
    active?: boolean;
    forceLoad?: boolean;
};

const hasRenderableFrame = (video: HTMLVideoElement) => (
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.videoWidth > 0 &&
    video.videoHeight > 0
);

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
    poster,
    active = true,
    forceLoad = false
}: InlineVideoProps) {
    const ref = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        const video = ref.current;
        if (!video) return;

        if (!active) {
            video.pause();
            video.removeAttribute('src');
            try {
                video.load();
            } catch {}
            return;
        }

        return stabilizeInlineVideo(video, {keepPlaying});
    }, [active, keepPlaying, src]);

    useEffect(() => {
        const video = ref.current;
        if (!video || !active || !forceLoad) return;

        let retryId: number | null = null;
        let retryCount = 0;

        const clearRetry = () => {
            if (retryId !== null) {
                window.clearTimeout(retryId);
                retryId = null;
            }
        };

        const forceResourceLoad = () => {
            if (!active || hasRenderableFrame(video)) return;

            try {
                video.load();
            } catch {}
        };

        const scheduleReload = (delay = 0) => {
            if (hasRenderableFrame(video) || retryCount >= 4) return;

            clearRetry();
            retryCount += 1;
            retryId = window.setTimeout(() => {
                retryId = null;
                forceResourceLoad();
            }, delay);
        };

        const recoverIfBlank = () => {
            if (hasRenderableFrame(video)) {
                clearRetry();
                return;
            }

            scheduleReload(180);
        };

        forceResourceLoad();
        scheduleReload(450);

        const recoveryEvents: Array<keyof HTMLMediaElementEventMap> = [
            'abort',
            'emptied',
            'error',
            'play',
            'stalled',
            'waiting',
        ];

        const readyEvents: Array<keyof HTMLMediaElementEventMap> = [
            'loadeddata',
            'canplay',
            'canplaythrough',
        ];

        for (const eventName of recoveryEvents) {
            video.addEventListener(eventName, recoverIfBlank);
        }

        for (const eventName of readyEvents) {
            video.addEventListener(eventName, clearRetry);
        }

        return () => {
            clearRetry();

            for (const eventName of recoveryEvents) {
                video.removeEventListener(eventName, recoverIfBlank);
            }

            for (const eventName of readyEvents) {
                video.removeEventListener(eventName, clearRetry);
            }
        };
    }, [active, forceLoad, src]);

    return (
        <motion.video
            key={`${controls ? 'modal' : 'preview'}-${src}`}
            ref={ref}
            layoutId={layoutId}
            src={active ? src : undefined}
            muted={muted}
            autoPlay={autoPlay}
            loop={loop}
            controls={controls}
            playsInline
            preload={active ? (preload ?? (keepPlaying ? 'auto' : 'metadata')) : 'none'}
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
            preview={({layoutId, opened}) => (
                <>
                    <InlineVideo
                        layoutId={layoutId}
                        src={src}
                        poster={poster}
                        preload='auto'
                        muted
                        autoPlay={!opened}
                        loop={!opened}
                        keepPlaying={!opened}
                        active={!opened}
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
                    active
                    forceLoad
                    className='block w-full max-h-[85vh] bg-black object-contain'
                />
            )}
        />
    )
}
