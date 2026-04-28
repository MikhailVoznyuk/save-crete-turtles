'use client';

import {useEffect, type ReactNode} from 'react';
import {twMerge} from 'tailwind-merge';
import {LoadingBlock} from "@/app/_model/home-loader/ui/LoadingBlock";

type HomeLoadingOverlayProps = {
    isLoaded: boolean;
    className?: string;
    children?: ReactNode;
}

export function HomeLoadingOverlay({isLoaded, className}: HomeLoadingOverlayProps) {
    useEffect(() => {
        if (isLoaded) return;

        const scrollRoot = document.querySelector<HTMLElement>('[data-app-scroll-root]');
        const prevBodyOverflow = document.body.style.overflow;
        const prevBodyTouchAction = document.body.style.touchAction;
        const prevScrollOverflowY = scrollRoot?.style.overflowY ?? '';
        const prevScrollTouchAction = scrollRoot?.style.touchAction ?? '';

        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';

        if (scrollRoot) {
            scrollRoot.style.overflowY = 'hidden';
            scrollRoot.style.touchAction = 'none';
        }

        return () => {
            document.body.style.overflow = prevBodyOverflow;
            document.body.style.touchAction = prevBodyTouchAction;

            if (scrollRoot) {
                scrollRoot.style.overflowY = prevScrollOverflowY;
                scrollRoot.style.touchAction = prevScrollTouchAction;
            }
        };
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
