import Image from "next/image";

type BackgroundProps = {
    videoSrc: string;
}

export function Background({videoSrc}: BackgroundProps) {
    return (
        <div className='fixed -z-10 inset-0'>
            <video
                src={videoSrc}
                className='absolute inset-0 h-full w-full object-cover'
                autoPlay
                loop
                muted
                playsInline
            />
        </div>
    )
}