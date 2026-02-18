type BackgroundProps = {
    videoSrc: string;
    fixed?: boolean;
}

export function Background({videoSrc, fixed}: BackgroundProps) {
    return (
        <div className={`${fixed ? 'fixed' : 'absolute'} -z-10 inset-0`}>
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