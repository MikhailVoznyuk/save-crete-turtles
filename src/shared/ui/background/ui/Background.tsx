import React from "react";

type BackgroundProps = {
    videoSrc: string;
    fixed?: boolean;
    videoRef?: React.Ref<HTMLVideoElement | null>
}

export function Background({videoSrc, fixed, videoRef}: BackgroundProps) {
    return (
        <div className={`${fixed ? 'fixed' : 'absolute'} -z-10 inset-0`}>
            <video
                src={videoSrc}
                ref={videoRef}
                className='absolute inset-0 h-full w-full object-cover'
                autoPlay
                loop
                muted
                playsInline
            />
        </div>
    )
}