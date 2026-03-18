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
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpened(false);
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown)
            document.body.style.overflow = prev;
        };

    }, [opened]);

    return (
        <>
            {preview({open: () => setOpened(true), layoutId})}
            {typeof(window) !== undefined  &&
                createPortal(opened &&
                    (
                        <AnimatePresence>
                            <motion.div
                                className='fixed inset-0 z-40 bg-black/60 backdrop-blur-sm'
                                initial={{opacity: 0}}
                                animate={{opacity: 1}}
                                exit={{opacity: 0}}
                                onClick={() => setOpened(false)}

                            />
                            <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
                                <motion.div
                                    className='relative w-full max-w-5xl'
                                    initial={{opacity: 0}}
                                    animate={{opacity: 1}}
                                    exit={{opacity: 0}}
                                >
                                    {/* кнопочка */}
                                    <motion.div
                                        layoutId={layoutId}
                                        className='overflow-hidden rounded-2xl'
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {content({close: () => setOpened(false), layoutId})}
                                    </motion.div>

                                </motion.div>
                            </div>

                        </AnimatePresence>
                    ),
                    document.body
                )
            }
        </>
    )
}