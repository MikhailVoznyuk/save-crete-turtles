'use client';

import {useEffect, type ReactNode} from 'react';
import {twMerge} from 'tailwind-merge';

type HomeLoadingOverlayProps = {
    visible: boolean;
    className?: string;
    children?: ReactNode;
}

export function HomeLoadingOverlay({visible, className, children}: HomeLoadingOverlayProps) {
    useEffect(() => {
        if (!visible) return;

        const {style} = document.body;
        const prevOverflow = style.overflow;
        const prevTouchAction = style.touchAction;

        style.overflow = 'hidden';
        style.touchAction = 'none';

        return () => {
            style.overflow = prevOverflow;
            style.touchAction = prevTouchAction;
        };
    }, [visible]);

    return (
        <div
            role='status'
            aria-live='polite'
            aria-hidden={!visible}
            className={twMerge(
                'fixed inset-0 z-[999] flex items-center justify-center bg-black/10 blur-[200px] transition-opacity duration-300',
                visible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
                className,
            )}
        >
            {children ?? <span className='sr-only'>Loading home page</span>}
        </div>
    );
}
