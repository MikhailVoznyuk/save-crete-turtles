'use client';

import {ReactNode, useCallback, useEffect, useId, useState} from "react";
import {createPortal} from "react-dom";
import {LayoutGroup, AnimatePresence, motion} from "framer-motion";
import {twMerge} from "tailwind-merge";
import {CloseButton} from "@/shared/ui/buttons/close-button";

type MediaModalRenderArgs = {
    layoutId: string;
    opened: boolean;
    open: () => void;
    close: () => void;
}

type Props = {
    preview: (args: MediaModalRenderArgs) => ReactNode;
    content: (args: MediaModalRenderArgs) => ReactNode;
    previewClassName?: string;
    contentClassName?: string;
}

export function MediaModal({preview, content, previewClassName, contentClassName}: Props) {
    const [opened, setOpened] = useState<boolean>(false);
    const [hidePreview, setHidePreview] = useState<boolean>(false);

    const id = useId();
    const layoutId = `media-${id}`;

    const open = useCallback(() => {
        setHidePreview(true);
        setOpened(true);
    }, []);

    const close = useCallback(() => setOpened(false), []);

    const args: MediaModalRenderArgs = {
        layoutId,
        opened,
        open,
        close
    }

    const portalHost = typeof document !== 'undefined'
        ? document.querySelector<HTMLElement>('[data-app-shell]') ?? document.body
        : null;

    useEffect(() => {
        if (!opened) return;

        const scrollRoot = document.querySelector<HTMLElement>("[data-app-scroll-root]");
        const prevScrollRootOverflow = scrollRoot?.style.overflowY ?? "";
        const prevOverflow = document.body.style.overflow;
        const prevPaddingRight = document.body.style.paddingRight;
        const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

        document.body.style.overflow = 'hidden';
        if (scrollBarWidth > 0) {
            document.body.style.paddingRight = `${scrollBarWidth}px`;
        }
        if (scrollRoot) {
            scrollRoot.style.overflowY = 'hidden';
        }

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
        };

        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = prevOverflow;
            document.body.style.paddingRight = prevPaddingRight;
            if (scrollRoot) {
                scrollRoot.style.overflowY = prevScrollRootOverflow;
            }
        };
    }, [opened, close]);

    return (
        <LayoutGroup id={layoutId}>
            <div
                className={twMerge(previewClassName)}
                onClick={open}
                style={{
                    opacity: (opened ? 0 : 1)
                }}
            >
                {preview(args)}
            </div>

            {portalHost && createPortal(
                <AnimatePresence
                    onExitComplete={() => setHidePreview(false)}
                >
                    {opened ? (
                        <motion.div
                            layoutRoot
                            className='app-modal-overlay z-50 flex items-center justify-center p-2'
                            initial={{opacity: 0}}
                            animate={{opacity: 1}}
                            exit={{opacity: 0}}
                            onClick={close}
                        >
                            <motion.div
                                className='absolute inset-0 bg-black/60'
                                initial={{opacity: 0, backdropFilter: 'blur(0px)'}}
                                animate={{opacity: 1, backdropFilter: 'blur(4px)'}}
                                exit={{opacity: 0, backdropFilter: 'blur(0px)'}}
                            />
                            <div
                                className='relative inset-0 z-10 flex items-center justify-center p-4 sm:p-2'
                                onClick={close}
                            >
                                <div className='relative w-full max-w-6xl'>
                                    <div
                                        className={twMerge('overflow-hidden rounded-2xl',  contentClassName)}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {content(args)}
                                    </div>
                                    <CloseButton
                                        onClick={close}
                                        className='absolute top-2 right-2 z-20'
                                    />
                                </div>
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>,
                portalHost
            )}
        </LayoutGroup>
    );
}
