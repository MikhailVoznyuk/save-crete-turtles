import React, {useCallback, useEffect, useRef} from "react";
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

        return stabilizeInlineVideo(video, {keepPlaying: true});
    }, [videoSrc]);

    return (
        <div className={`${fixed ? 'fixed' : 'absolute'} z-0 inset-0 overflow-hidden pointer-events-none`} aria-hidden>
            <video
                src={videoSrc}
                ref={setVideoRef}
                className='absolute inset-0 h-full w-full object-cover pointer-events-none select-none'
                style={objectPos ? {
                    objectPosition: `${objectPos.x / videoSize?.w * 100}% ${objectPos.y / videoSize?.h * 100}%`
                } : {}}
                autoPlay
                loop
                muted
                playsInline
                preload='auto'
                disablePictureInPicture
                aria-hidden
                tabIndex={-1}
            />
        </div>
    )
}
