'use client';

import {useEffect, type ReactNode} from 'react';
import {twMerge} from 'tailwind-merge';
import {LoadingBlock} from "@/app/_model/home-loader/ui/LoadingBlock";

type HomeLoadingOverlayProps = {
    isLoaded: boolean;
    className?: string;
    children?: ReactNode;
}

const clearLegacyLoadingScrollLock = () => {
    if (typeof document === 'undefined') return;

    const html = document.documentElement;
    const body = document.body;

    html.style.overflow = '';
    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.width = '';
    body.style.overflow = '';
    body.style.touchAction = '';
};

export function HomeLoadingOverlay({isLoaded, className}: HomeLoadingOverlayProps) {
    useEffect(() => {
        if (!isLoaded) return;

        clearLegacyLoadingScrollLock();
        window.dispatchEvent(new Event('appscrollchange'));
    }, [isLoaded]);

    return (
        <div
            role='status'
            aria-live='polite'
            aria-hidden={isLoaded}
            className={twMerge(
                'absolute inset-0 app-loading-overlay z-[999] transition-opacity duration-500',
                !isLoaded ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
                className,
            )}
        >
            <div className='absolute inset-0 bg-white/10 backdrop-blur-[48px]'
                 style={{WebkitBackdropFilter: 'blur(48px)'}}
            />
            <div className='app-loading-overlay__content flex items-center justify-center'>
                <LoadingBlock isLoaded={isLoaded} />
            </div>

        </div>
    );
}
