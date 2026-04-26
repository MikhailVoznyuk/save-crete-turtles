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
        let settled = false;
        let waitingForPaint = false;
        let readyToken = 0;
        let checkFrame = 0;
        let fallbackRaf1 = 0;
        let fallbackRaf2 = 0;
        let fallbackTimeout = 0;

        const clearPaintWait = () => {
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

            waitingForPaint = false;
        };

        const clearReadyCheck = () => {
            if (checkFrame !== 0) {
                cancelAnimationFrame(checkFrame);
                checkFrame = 0;
            }
        };

        const emitOnce = (state: LoadState) => {
            if (disposed || settled) return;
            settled = true;
            clearReadyCheck();
            clearPaintWait();
            onLoadStateChange?.(state);
        };

        const markReady = () => {
            emitOnce('ready');
        };

        const waitForPaintedFrame = () => {
            if (disposed || settled || waitingForPaint) return;

            const token = ++readyToken;
            waitingForPaint = true;

            fallbackTimeout = window.setTimeout(() => {
                fallbackTimeout = 0;
                if (disposed || settled || token !== readyToken) return;
                markReady();
            }, 360);

            if ('requestVideoFrameCallback' in video) {
                video.requestVideoFrameCallback(() => {
                    if (disposed || settled || token !== readyToken) return;
                    markReady();
                });
                return;
            }

            fallbackRaf1 = requestAnimationFrame(() => {
                fallbackRaf1 = 0;
                fallbackRaf2 = requestAnimationFrame(() => {
                    fallbackRaf2 = 0;
                    if (disposed || settled || token !== readyToken) return;
                    markReady();
                });
            });
        };

        const hasCurrentFrame = () => {
            return (
                video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
                video.videoWidth > 0 &&
                video.videoHeight > 0
            );
        };

        const tryResolveReady = () => {
            if (disposed || settled) return;

            if (video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
                emitOnce('error');
                return;
            }

            if (!hasCurrentFrame()) return;
            waitForPaintedFrame();
        };

        const scheduleReadyCheck = () => {
            if (disposed || settled || checkFrame !== 0) return;

            checkFrame = requestAnimationFrame(() => {
                checkFrame = 0;
                tryResolveReady();

                if (!settled) {
                    scheduleReadyCheck();
                }
            });
        };

        const readyEvents: Array<keyof HTMLMediaElementEventMap> = [
            'loadedmetadata',
            'loadeddata',
            'canplay',
            'canplaythrough',
            'playing',
            'seeked',
            'progress',
            'timeupdate',
        ];

        for (const eventName of readyEvents) {
            video.addEventListener(eventName, tryResolveReady);
        }

        video.addEventListener('error', tryResolveReady);
        video.addEventListener('emptied', scheduleReadyCheck);
        video.addEventListener('stalled', scheduleReadyCheck);
        video.addEventListener('suspend', scheduleReadyCheck);
        window.addEventListener('pageshow', scheduleReadyCheck);
        document.addEventListener('visibilitychange', scheduleReadyCheck);

        tryResolveReady();
        scheduleReadyCheck();

        return () => {
            disposed = true;
            clearReadyCheck();
            clearPaintWait();

            for (const eventName of readyEvents) {
                video.removeEventListener(eventName, tryResolveReady);
            }

            video.removeEventListener('error', tryResolveReady);
            video.removeEventListener('emptied', scheduleReadyCheck);
            video.removeEventListener('stalled', scheduleReadyCheck);
            video.removeEventListener('suspend', scheduleReadyCheck);
            window.removeEventListener('pageshow', scheduleReadyCheck);
            document.removeEventListener('visibilitychange', scheduleReadyCheck);
        };
    }, [sourcesKey, videoSrc, onLoadStateChange]);

    return (
        <div className={`${fixed ? 'fixed-video-bg' : 'absolute inset-0'} z-0 overflow-hidden pointer-events-none`} aria-hidden>
            <video
                src={hasSources ? undefined : videoSrc}
                ref={setVideoRef}
                className='absolute inset-0 h-full w-full object-cover pointer-events-none select-none fixed-video-bg__video'
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
