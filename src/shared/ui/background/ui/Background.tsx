import React, {useCallback, useEffect, useRef} from 'react';
import {stabilizeInlineVideo} from '@/shared/utils/media/stabilizeInlineVideo';
import type {LoadState} from '@/shared/types/load-state';

type VideoSource = {
    src: string;
    media?: string;
    type?: string;
}

type BackgroundProps = {
    videoSrc: string;
    sources?: VideoSource[];
    fixed?: boolean;
    videoRef?: React.Ref<HTMLVideoElement | null>;
    objectPos?: {x: number; y: number} | null;
    videoSize?: {w: number; h: number};
    onLoadStateChange?: (state: LoadState) => void;
}

export function Background({
    videoSrc,
    sources,
    fixed,
    videoRef,
    objectPos,
    videoSize = {w: 1920, h: 1080},
    onLoadStateChange,
}: BackgroundProps) {
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const hasSources = (sources?.length ?? 0) > 0;

    const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
        localVideoRef.current = node;

        if (!videoRef) return;

        if (typeof videoRef === 'function') {
            videoRef(node);
            return;
        }

        (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = node;
    }, [videoRef]);

    const sourcesKey = sources?.map(({src, media, type}) => `${media || ''}|${type || ''}|${src}`).join(';;') ?? videoSrc;

    useEffect(() => {
        const video = localVideoRef.current;
        if (!video) return;

        return stabilizeInlineVideo(video, {keepPlaying: true});
    }, [sourcesKey, videoSrc]);

    useEffect(() => {
        const video = localVideoRef.current;
        if (!video) {
            onLoadStateChange?.('error');
            return;
        }

        onLoadStateChange?.('pending');

        let disposed = false;
        let readyToken = 0;
        let fallbackRaf1 = 0;
        let fallbackRaf2 = 0;
        let fallbackTimeout = 0;

        const clearFallback = () => {
            if (fallbackRaf1 !== 0) {
                cancelAnimationFrame(fallbackRaf1);
                fallbackRaf1 = 0;
            }

            if (fallbackRaf2 !== 0) {
                cancelAnimationFrame(fallbackRaf2);
                fallbackRaf2 = 0;
            }

            if (fallbackTimeout !== 0) {
                window.clearTimeout(fallbackTimeout);
                fallbackTimeout = 0;
            }
        };

        const emit = (state: LoadState) => {
            if (disposed) return;
            onLoadStateChange?.(state);
        };

        const markReady = () => {
            emit('ready');
        };

        const waitForPaintedFrame = () => {
            const token = ++readyToken;
            clearFallback();

            fallbackTimeout = window.setTimeout(() => {
                fallbackTimeout = 0;
                if (disposed || token !== readyToken) return;
                markReady();
            }, 320);

            if ('requestVideoFrameCallback' in video) {
                video.requestVideoFrameCallback(() => {
                    if (disposed || token !== readyToken) return;
                    clearFallback();
                    markReady();
                });
                return;
            }

            fallbackRaf1 = requestAnimationFrame(() => {
                fallbackRaf1 = 0;
                fallbackRaf2 = requestAnimationFrame(() => {
                    fallbackRaf2 = 0;
                    if (disposed || token !== readyToken) return;
                    clearFallback();
                    markReady();
                });
            });
        };

        const tryResolveReady = () => {
            if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
            if (video.videoWidth < 1 || video.videoHeight < 1) return;
            waitForPaintedFrame();
        };

        const markError = () => {
            clearFallback();
            emit('error');
        };

        const readyEvents: Array<keyof HTMLMediaElementEventMap> = [
            'loadedmetadata',
            'loadeddata',
            'canplay',
            'playing',
            'seeked',
        ];

        for (const eventName of readyEvents) {
            video.addEventListener(eventName, tryResolveReady);
        }

        video.addEventListener('error', markError);

        tryResolveReady();

        return () => {
            disposed = true;
            clearFallback();

            for (const eventName of readyEvents) {
                video.removeEventListener(eventName, tryResolveReady);
            }

            video.removeEventListener('error', markError);
        };
    }, [sourcesKey, videoSrc, onLoadStateChange]);

    return (
        <div className={`${fixed ? 'fixed' : 'absolute'} z-0 inset-0 overflow-hidden pointer-events-none`} aria-hidden>
            <video
                src={hasSources ? undefined : videoSrc}
                ref={setVideoRef}
                className='absolute inset-0 h-full w-full object-cover pointer-events-none select-none'
                style={objectPos ? {
                    objectPosition: `${objectPos.x / videoSize?.w * 100}% ${objectPos.y / videoSize?.h * 100}%`
                } : {}}
                autoPlay
                loop
                muted
                playsInline
                preload={fixed ? 'auto' : 'metadata'}
                disablePictureInPicture
                controls={false}
                aria-hidden
                tabIndex={-1}
            >
                {sources?.map((source) => (
                    <source
                        key={`${source.media || 'default'}-${source.src}`}
                        src={source.src}
                        media={source.media}
                        type={source.type || 'video/mp4'}
                    />
                ))}
            </video>
        </div>
    );
}
