'use client';

import {ReactNode, useEffect, useState, useId} from "react";
import {createPortal} from "react-dom";
import {motion, AnimatePresence} from "framer-motion";

type Props = {
    preview: (args: {open: () => void, layoutId: string}) => ReactNode;
    content: (args: {close: () => void, layoutId: string}) => ReactNode;
}
export function MediaModal({preview, content}: Props) {
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
            if (e.key === 'Escape') {
                setOpened(false);
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown)
            document.body.style.overflow = prevOverflow;
            document.body.style.paddingRight = prevPaddingRight;
        };

    }, [opened]);

    return (
        <>
            {preview({open: () => setOpened(true), layoutId})}
            {typeof(window) !== 'undefined'  &&
                createPortal(
                        <AnimatePresence>
                            {opened ? (
                                <motion.div
                                    layoutRoot
                                    className='fixed inset-0 flex justify-center items-center p-4'

                                    onClick={() => setOpened(false)}
                                >
                                    <motion.div
                                        className='absolute inset-0 bg-black/60'
                                        initial={{opacity: 0,  backdropFilter: 'blur(0px)'}}
                                        animate={{opacity: 1,  backdropFilter: 'blur(4px)'}}
                                        exit={{opacity: 0,  backdropFilter: 'blur(0px)'}}
                                    />
                                    <motion.div
                                        className='relative inset-0 z-10 flex items-center justify-center p-4'
                                        initial={{opacity: 0}}
                                        animate={{opacity: 1}}
                                        exit={{opacity: 0}}
                                        onClick={() => setOpened(false)}
                                    >
                                        <div
                                            className='relative w-full max-w-5xl'
                                        >
                                            {/* кнопочка */}
                                            <motion.div
                                                layoutId={layoutId}

                                                className='overflow-hidden rounded-2xl'
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {content({close: () => setOpened(false), layoutId})}
                                            </motion.div>

                                        </div>
                                    </motion.div>
                                </motion.div>
                            ) : null}

                        </AnimatePresence>
                    ,
                    document.body
                )
            }
        </>
    )
}