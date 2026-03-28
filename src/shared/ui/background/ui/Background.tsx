import React, {useCallback, useEffect, useRef} from "react";
import {stabilizeInlineVideo} from "@/shared/utils/media/stabilizeInlineVideo";

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
}

export function Background({videoSrc, sources, fixed, videoRef, objectPos, videoSize={w: 1920, h: 1080}}: BackgroundProps) {
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
    )
}
