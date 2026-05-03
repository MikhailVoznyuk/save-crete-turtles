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

        const html = document.documentElement;
        const body = document.body;
        const scrollY = window.scrollY || window.pageYOffset || html.scrollTop || 0;
        const scrollX = window.scrollX || window.pageXOffset || html.scrollLeft || 0;
        const prevHtmlOverflow = html.style.overflow;
        const prevBodyPosition = body.style.position;
        const prevBodyTop = body.style.top;
        const prevBodyLeft = body.style.left;
        const prevBodyRight = body.style.right;
        const prevBodyWidth = body.style.width;
        const prevBodyOverflow = body.style.overflow;
        const prevBodyTouchAction = body.style.touchAction;

        html.style.overflow = 'hidden';
        body.style.position = 'fixed';
        body.style.top = `-${scrollY}px`;
        body.style.left = '0';
        body.style.right = '0';
        body.style.width = '100%';
        body.style.overflow = 'hidden';
        body.style.touchAction = 'none';

        return () => {
            html.style.overflow = prevHtmlOverflow;
            body.style.position = prevBodyPosition;
            body.style.top = prevBodyTop;
            body.style.left = prevBodyLeft;
            body.style.right = prevBodyRight;
            body.style.width = prevBodyWidth;
            body.style.overflow = prevBodyOverflow;
            body.style.touchAction = prevBodyTouchAction;
            window.scrollTo({top: scrollY, left: scrollX, behavior: 'auto'});
            window.dispatchEvent(new Event('appscrollchange'));
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
