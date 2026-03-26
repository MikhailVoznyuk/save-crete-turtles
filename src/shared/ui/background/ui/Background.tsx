import React, {useCallback, useEffect, useRef, useState} from "react";
import {stabilizeInlineVideo} from "@/shared/utils/media/stabilizeInlineVideo";

type BackgroundProps = {
    videoSrc: string;
    fixed?: boolean;
    videoRef?: React.Ref<HTMLVideoElement | null>;
    objectPos?: {x: number; y: number} | null;
    videoSize?: {w: number; h: number};
}

export function Background({videoSrc, fixed, videoRef, objectPos, videoSize={w: 1920, h: 1080}}: BackgroundProps) {
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const [videoReady, setVideoReady] = useState(false);

    const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
        localVideoRef.current = node;

        if (!videoRef) return;

        if (typeof videoRef === 'function') {
            videoRef(node);
            return;
        }

        (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = node;
    }, [videoRef]);

    useEffect(() => {
        const video = localVideoRef.current;
        if (!video) return;

        setVideoReady(video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0);
        return stabilizeInlineVideo(video, {keepPlaying: true});
    }, [videoSrc]);

    const markReady = useCallback(() => {
        const video = localVideoRef.current;
        if (!video) return;
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
            setVideoReady(true);
        }
    }, []);

    const resetReady = useCallback(() => {
        setVideoReady(false);
    }, []);

    return (
        <div
            aria-hidden
            className={`${fixed ? 'fixed' : 'absolute'} inset-0 z-0 overflow-hidden pointer-events-none select-none bg-abyss`}
        >
            <div className='absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,238,255,0.10),transparent_32%)]' />
            <video
                src={videoSrc}
                ref={setVideoRef}
                className='absolute inset-0 h-full w-full object-cover pointer-events-none select-none transition-opacity duration-300'
                style={{
                    ...(objectPos ? {
                        objectPosition: `${objectPos.x / videoSize?.w * 100}% ${objectPos.y / videoSize?.h * 100}%`
                    } : {}),
                    opacity: videoReady ? 1 : 0,
                    backgroundColor: '#07131d'
                }}
                autoPlay
                loop
                muted
                playsInline
                preload='auto'
                disablePictureInPicture
                aria-hidden
                tabIndex={-1}
                onLoadedData={markReady}
                onCanPlay={markReady}
                onPlaying={markReady}
                onSuspend={resetReady}
                onEmptied={resetReady}
                onError={resetReady}
            />
        </div>
    )
}
