import React from "react";

type BackgroundProps = {
    videoSrc: string;
    fixed?: boolean;
    videoRef?: React.Ref<HTMLVideoElement | null>;
    objectPos?: {x: number; y: number} | null;
    videoSize?: {w: number; h: number};
}

export function Background({videoSrc, fixed, videoRef, objectPos, videoSize={w: 1920, h: 1080}}: BackgroundProps) {
    return (
        <div className={`${fixed ? 'fixed' : 'absolute'} -z-10 inset-0`}>
            <video
                src={videoSrc}
                ref={videoRef}
                className='absolute inset-0 h-full w-full object-cover'
                style={objectPos ? {
                    objectPosition: `${objectPos.x / videoSize?.w * 100}% ${objectPos.y / videoSize?.h * 100}%`
                } : {}}
                autoPlay
                loop
                muted
                playsInline
            />
        </div>
    )
}