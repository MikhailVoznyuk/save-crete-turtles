import {useMediaQuery} from "@/shared/hooks/adaptive/use-media-query";

export function useIsMobile() {
    return useMediaQuery('(max-width: 639px)');
}

export function useIsTablet() {
    return useMediaQuery('(max-width: 1023px)');
}

export function useIsDesktop() {
    return useMediaQuery('(min-width: 1024px)');
}