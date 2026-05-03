export type EdgeViewportRect = {
    left: number;
    top: number;
    width: number;
    height: number;
};

const MIN_VIEWPORT_SIZE = 1;

function positive(value: number | undefined | null) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function roundPx(value: number) {
    return Math.round(Math.max(0, value) * 100) / 100;
}

function readResolvedRootPx(name: string) {
    if (typeof window === 'undefined') return 0;

    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (!raw) return 0;
    if (/var\(|calc\(|[a-z%]/i.test(raw.replace(/px$/i, ''))) return 0;

    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? value : 0;
}

export function readRootPxVar(name: string) {
    const value = readResolvedRootPx(name);
    return value > 0 ? value : 0;
}

export function readRootNumberVar(name: string) {
    return readResolvedRootPx(name);
}

export function getAppShell() {
    if (typeof document === 'undefined') return null;

    return document.querySelector<HTMLElement>('[data-app-shell]');
}

export function getAppScrollRoot() {
    if (typeof document === 'undefined') return null;

    return document.querySelector<HTMLElement>('[data-app-scroll-root]');
}

export function getAppScrollTop() {
    if (typeof window === 'undefined') return 0;

    return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
}

export function getAppScrollLeft() {
    if (typeof window === 'undefined') return 0;

    return window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0;
}

export function getEdgeViewportRect(): EdgeViewportRect {
    if (typeof window === 'undefined') {
        return {left: 0, top: 0, width: MIN_VIEWPORT_SIZE, height: MIN_VIEWPORT_SIZE};
    }

    const layerWidth = readRootPxVar('--app-full-layer-width');
    const layerHeight = readRootPxVar('--app-full-layer-height');
    const layerLeft = readRootNumberVar('--app-full-layer-left');
    const layerTop = readRootNumberVar('--app-full-layer-top');

    if (layerWidth > MIN_VIEWPORT_SIZE && layerHeight > MIN_VIEWPORT_SIZE) {
        return {
            left: roundPx(layerLeft),
            top: roundPx(layerTop),
            width: Math.max(MIN_VIEWPORT_SIZE, roundPx(layerWidth)),
            height: Math.max(MIN_VIEWPORT_SIZE, roundPx(layerHeight)),
        };
    }

    const bg = document.querySelector<HTMLElement>('.edge-video-bg') ?? document.querySelector<HTMLElement>('.fixed-video-bg');
    const rect = bg?.getBoundingClientRect();

    if (rect && rect.width > MIN_VIEWPORT_SIZE && rect.height > MIN_VIEWPORT_SIZE) {
        return {
            left: roundPx(rect.left),
            top: roundPx(rect.top),
            width: Math.max(MIN_VIEWPORT_SIZE, roundPx(rect.width)),
            height: Math.max(MIN_VIEWPORT_SIZE, roundPx(rect.height)),
        };
    }

    const cssWidth = readRootPxVar('--app-edge-viewport-width') || readRootPxVar('--app-full-viewport-width');
    const cssHeight = readRootPxVar('--app-edge-viewport-height') || readRootPxVar('--app-full-viewport-height');

    if (cssWidth > MIN_VIEWPORT_SIZE && cssHeight > MIN_VIEWPORT_SIZE) {
        return {
            left: 0,
            top: 0,
            width: Math.max(MIN_VIEWPORT_SIZE, roundPx(cssWidth)),
            height: Math.max(MIN_VIEWPORT_SIZE, roundPx(cssHeight)),
        };
    }

    const shellRect = getAppShell()?.getBoundingClientRect();

    if (shellRect && shellRect.width > MIN_VIEWPORT_SIZE && shellRect.height > MIN_VIEWPORT_SIZE) {
        return {
            left: roundPx(shellRect.left),
            top: roundPx(shellRect.top),
            width: Math.max(MIN_VIEWPORT_SIZE, roundPx(shellRect.width)),
            height: Math.max(MIN_VIEWPORT_SIZE, roundPx(shellRect.height)),
        };
    }

    const docEl = document.documentElement;

    return {
        left: 0,
        top: 0,
        width: Math.max(MIN_VIEWPORT_SIZE, roundPx(Math.max(positive(window.innerWidth), positive(docEl.clientWidth)))),
        height: Math.max(MIN_VIEWPORT_SIZE, roundPx(Math.max(positive(window.innerHeight), positive(docEl.clientHeight)))),
    };
}

export function getEdgeViewportMetrics() {
    const rect = getEdgeViewportRect();

    return {
        w: rect.width,
        h: rect.height,
        dpr: Math.min(window.devicePixelRatio || 1, 4),
    };
}
