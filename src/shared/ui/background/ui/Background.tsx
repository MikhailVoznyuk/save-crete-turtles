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
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
        if (!fixed) return;

        const video = localVideoRef.current;
        const canvas = canvasRef.current;
        const host = canvas?.parentElement;
        const ctx = canvas?.getContext('2d');

        if (!video || !canvas || !host || !ctx) return;

        type VideoWithFrameCallback = HTMLVideoElement & {
            requestVideoFrameCallback?: (callback: (now: DOMHighResTimeStamp, metadata: unknown) => void) => number;
            cancelVideoFrameCallback?: (handle: number) => void;
        };

        let disposed = false;
        let rafId = 0;
        let frameCallbackId = 0;
        const frameVideo = video as VideoWithFrameCallback;

        const parsePositionPart = (part: string | undefined, fallback: number) => {
            if (!part) return fallback;

            const normalized = part.trim().toLowerCase();
            if (normalized === 'left' || normalized === 'top') return 0;
            if (normalized === 'center') return 0.5;
            if (normalized === 'right' || normalized === 'bottom') return 1;

            if (normalized.endsWith('%')) {
                const value = Number.parseFloat(normalized);
                return Number.isFinite(value) ? value / 100 : fallback;
            }

            return fallback;
        };

        const draw = () => {
            if (disposed || video.videoWidth <= 0 || video.videoHeight <= 0) return;

            const rect = host.getBoundingClientRect();
            const cssWidth = Math.max(1, rect.width);
            const cssHeight = Math.max(1, rect.height);
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const nextWidth = Math.max(1, Math.round(cssWidth * dpr));
            const nextHeight = Math.max(1, Math.round(cssHeight * dpr));

            if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
                canvas.width = nextWidth;
                canvas.height = nextHeight;
            }

            const objectPosition = getComputedStyle(video).objectPosition || '50% 50%';
            const [xPart, yPart] = objectPosition.split(/\s+/);
            const posX = parsePositionPart(xPart, 0.5);
            const posY = parsePositionPart(yPart, 0.5);
            const mediaScale = Math.max(cssWidth / video.videoWidth, cssHeight / video.videoHeight);
            const mediaWidth = video.videoWidth * mediaScale;
            const mediaHeight = video.videoHeight * mediaScale;
            const dx = (cssWidth - mediaWidth) * posX;
            const dy = (cssHeight - mediaHeight) * posY;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, cssWidth, cssHeight);

            try {
                ctx.drawImage(video, dx, dy, mediaWidth, mediaHeight);
            } catch {
                ctx.clearRect(0, 0, cssWidth, cssHeight);
            }
        };

        const requestNextFrame = () => {
            if (disposed) return;

            if (frameVideo.requestVideoFrameCallback) {
                frameCallbackId = frameVideo.requestVideoFrameCallback(() => {
                    frameCallbackId = 0;
                    draw();
                    requestNextFrame();
                });
                return;
            }

            rafId = requestAnimationFrame(() => {
                rafId = 0;
                draw();
                requestNextFrame();
            });
        };

        const scheduleDraw = () => {
            if (disposed || rafId !== 0) return;

            rafId = requestAnimationFrame(() => {
                rafId = 0;
                draw();
            });
        };

        const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleDraw) : null;
        resizeObserver?.observe(host);

        const drawEvents: Array<keyof HTMLMediaElementEventMap> = [
            'loadedmetadata',
            'loadeddata',
            'canplay',
            'playing',
            'seeked',
            'timeupdate',
        ];

        for (const eventName of drawEvents) {
            video.addEventListener(eventName, scheduleDraw);
        }

        window.addEventListener('resize', scheduleDraw, {passive: true});
        window.addEventListener('orientationchange', scheduleDraw);
        window.addEventListener('appviewportchange', scheduleDraw);

        draw();
        requestNextFrame();

        return () => {
            disposed = true;
            resizeObserver?.disconnect();

            for (const eventName of drawEvents) {
                video.removeEventListener(eventName, scheduleDraw);
            }

            window.removeEventListener('resize', scheduleDraw);
            window.removeEventListener('orientationchange', scheduleDraw);
            window.removeEventListener('appviewportchange', scheduleDraw);

            if (frameCallbackId !== 0 && frameVideo.cancelVideoFrameCallback) {
                frameVideo.cancelVideoFrameCallback(frameCallbackId);
            }

            if (rafId !== 0) {
                cancelAnimationFrame(rafId);
            }
        };
    }, [fixed, sourcesKey, videoSrc, objectPos?.x, objectPos?.y, videoSize.w, videoSize.h]);

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
            {fixed && <canvas ref={canvasRef} className='fixed-video-bg__canvas' aria-hidden />}
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
