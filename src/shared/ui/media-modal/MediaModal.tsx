'use client';

import {ReactNode, useEffect, useId, useState} from "react";
import {createPortal} from "react-dom";
import {AnimatePresence, motion} from "framer-motion";
import {twMerge} from "tailwind-merge";

type Props = {
    preview: ReactNode;
    content: ReactNode;
    previewClassName?: string;
    contentClassName?: string;
}

export function MediaModal({preview, content, previewClassName, contentClassName}: Props) {
    const [opened, setOpened] = useState<boolean>(false);

    const id = useId();
    const layoutId = `media-${id}`;

    useEffect(() => {
        if (!opened) return;

        const prevOverflow = document.body.style.overflow;
        const prevPaddingRight = document.body.style.paddingRight;
        const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

        document.body.style.overflow = 'hidden';
        if (scrollBarWidth > 0) {
            document.body.style.paddingRight = `${scrollBarWidth}px`;
        }

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpened(false);
        };

        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = prevOverflow;
            document.body.style.paddingRight = prevPaddingRight;
        };
    }, [opened]);

    return (
        <>
            <motion.div
                layoutId={layoutId}
                className={twMerge(previewClassName)}
                onClick={() => setOpened(true)}
            >
                {preview}
            </motion.div>

            {typeof window !== 'undefined' && createPortal(
                <AnimatePresence>
                    {opened ? (
                        <motion.div
                            layoutRoot
                            className='fixed inset-0 flex items-center justify-center p-2'
                            initial={{opacity: 0}}
                            animate={{opacity: 1}}
                            exit={{opacity: 0}}
                            onClick={() => setOpened(false)}
                        >
                            <motion.div
                                className='absolute inset-0 bg-black/60'
                                initial={{opacity: 0, backdropFilter: 'blur(0px)'}}
                                animate={{opacity: 1, backdropFilter: 'blur(4px)'}}
                                exit={{opacity: 0, backdropFilter: 'blur(0px)'}}
                            />
                            <motion.div
                                className='relative inset-0 z-10 flex items-center justify-center p-4 sm:p-2'
                                onClick={() => setOpened(false)}
                            >
                                <div className='relative w-full max-w-6xl'>
                                    <motion.div
                                        layoutId={layoutId}
                                        className={twMerge('overflow-hidden rounded-2xl', contentClassName)}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {content}
                                    </motion.div>
                                </div>
                            </motion.div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
