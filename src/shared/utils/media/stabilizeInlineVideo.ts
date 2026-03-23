type Options = {
    keepPlaying?: boolean;
};

type InlineVideo = HTMLVideoElement & {
    disableRemotePlayback?: boolean;
    webkitSetPresentationMode?: (mode: 'inline' | 'fullscreen' | 'picture-in-picture') => void;
    webkitPresentationMode?: 'inline' | 'fullscreen' | 'picture-in-picture';
};

export function stabilizeInlineVideo(video: HTMLVideoElement, options: Options = {}) {
    const {keepPlaying = false} = options;
    const media = video as InlineVideo;
    let retryId: number | null = null;

    const forceInline = () => {
        if (typeof media.webkitSetPresentationMode === 'function' && media.webkitPresentationMode !== 'inline') {
            try {
                media.webkitSetPresentationMode('inline');
            } catch {}
        }
    };

    const applyAttrs = () => {
        video.playsInline = true;
        video.preload = keepPlaying ? 'auto' : (video.preload || 'metadata');
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('x-webkit-airplay', 'deny');
        video.setAttribute('controlsList', 'nofullscreen noremoteplayback nodownload');
        video.disablePictureInPicture = true;
        media.disableRemotePlayback = true;

        if (keepPlaying) {
            video.muted = true;
            video.defaultMuted = true;
            video.autoplay = true;
            video.setAttribute('muted', 'true');
            video.setAttribute('autoplay', 'true');
        }

        forceInline();
    };

    const tryPlay = () => {
        applyAttrs();

        if (!keepPlaying || document.hidden || video.readyState < 2) {
            return;
        }

        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
        }
    };

    const schedulePlay = () => {
        if (!keepPlaying) {
            applyAttrs();
            return;
        }

        if (retryId !== null) {
            window.clearTimeout(retryId);
        }

        retryId = window.setTimeout(() => {
            retryId = null;
            tryPlay();
        }, 120);
    };

    const onVisibilityChange = () => {
        if (!document.hidden) {
            schedulePlay();
        }
    };

    applyAttrs();
    schedulePlay();

    const events: Array<keyof HTMLMediaElementEventMap> = [
        'loadedmetadata',
        'loadeddata',
        'canplay',
        'canplaythrough',
        'stalled',
        'suspend',
        'waiting',
        'pause',
    ];

    for (const eventName of events) {
        video.addEventListener(eventName, schedulePlay);
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', schedulePlay);

    return () => {
        if (retryId !== null) {
            window.clearTimeout(retryId);
        }

        for (const eventName of events) {
            video.removeEventListener(eventName, schedulePlay);
        }

        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('pageshow', schedulePlay);
    };
}
