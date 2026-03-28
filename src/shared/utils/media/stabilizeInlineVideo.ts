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
    let watchdogId: number | null = null;
    let restoreTimeListener: (() => void) | null = null;
    let lastAdvanceTs = performance.now();
    let lastTime = -1;
    let nextReloadTs = 0;

    const forceInline = () => {
        if (typeof media.webkitSetPresentationMode === 'function' && media.webkitPresentationMode !== 'inline') {
            try {
                media.webkitSetPresentationMode('inline');
            } catch {}
        }
    };

    const applyAttrs = () => {
        video.playsInline = true;
        video.preload = video.preload || 'metadata';
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
            video.setAttribute('muted', '');
            video.setAttribute('autoplay', '');
        }

        forceInline();
    };

    const noteAdvance = () => {
        const time = Number.isFinite(video.currentTime) ? video.currentTime : 0;
        if (time > lastTime + 0.01) {
            lastTime = time;
            lastAdvanceTs = performance.now();
        }
    };

    const tryPlay = () => {
        applyAttrs();

        if (keepPlaying && video.networkState === HTMLMediaElement.NETWORK_EMPTY) {
            try {
                video.load();
            } catch {}
        }

        if (!keepPlaying || document.hidden || video.readyState < 2) {
            return;
        }

        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
        }
    };

    const schedulePlay = (arg?: number | Event) => {
        if (!keepPlaying) {
            applyAttrs();
            return;
        }

        const delay = typeof arg === 'number' ? arg : 120;

        if (retryId !== null) {
            window.clearTimeout(retryId);
        }

        retryId = window.setTimeout(() => {
            retryId = null;
            tryPlay();
        }, delay);
    };

    const reloadVideo = () => {
        const now = performance.now();
        if (now < nextReloadTs) return;
        nextReloadTs = now + 3000;

        const current = Number.isFinite(video.currentTime) ? video.currentTime : 0;

        if (restoreTimeListener) {
            restoreTimeListener();
            restoreTimeListener = null;
        }

        const restore = () => {
            try {
                if (current > 0.05) {
                    video.currentTime = current;
                }
            } catch {}
            schedulePlay(0);
        };

        const cleanupRestore = () => {
            video.removeEventListener('loadedmetadata', restore);
        };

        restoreTimeListener = cleanupRestore;
        video.addEventListener('loadedmetadata', restore, { once: true });

        try {
            video.load();
        } catch {}
    };

    const monitorPlayback = () => {
        if (!keepPlaying || document.hidden || video.ended) return;

        noteAdvance();

        const frozenFor = performance.now() - lastAdvanceTs;
        const shouldBePlaying = video.autoplay || !video.paused;
        const starving = video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA;

        if (shouldBePlaying && frozenFor > 1800) {
            if (starving) {
                reloadVideo();
            }
            schedulePlay(0);
        }
    };

    const onVisibilityChange = () => {
        if (!document.hidden) {
            lastAdvanceTs = performance.now();
            schedulePlay(0);
        }
    };

    applyAttrs();
    schedulePlay(0);

    const playbackEvents: Array<keyof HTMLMediaElementEventMap> = [
        'loadedmetadata',
        'loadeddata',
        'canplay',
        'canplaythrough',
        'stalled',
        'suspend',
        'waiting',
        'pause',
        'emptied',
    ];

    const progressEvents: Array<keyof HTMLMediaElementEventMap> = [
        'playing',
        'timeupdate',
        'seeked',
        'progress',
    ];

    for (const eventName of playbackEvents) {
        video.addEventListener(eventName, schedulePlay);
    }

    for (const eventName of progressEvents) {
        video.addEventListener(eventName, noteAdvance);
    }

    watchdogId = window.setInterval(monitorPlayback, 1000);

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', schedulePlay);

    return () => {
        if (retryId !== null) {
            window.clearTimeout(retryId);
        }

        if (watchdogId !== null) {
            window.clearInterval(watchdogId);
        }

        if (restoreTimeListener) {
            restoreTimeListener();
        }

        for (const eventName of playbackEvents) {
            video.removeEventListener(eventName, schedulePlay);
        }

        for (const eventName of progressEvents) {
            video.removeEventListener(eventName, noteAdvance);
        }

        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('pageshow', schedulePlay);
    };
}
