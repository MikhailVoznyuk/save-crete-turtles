import {motion} from 'framer-motion';
import {twMerge} from "tailwind-merge";
import {MediaModal} from "@/shared/ui/media-modal";
import {ModalToggleButton} from "@/shared/ui/buttons/modal-toggle-button";

type ModalVideoProps = {
    src: string;
    className?: string;
    videoClassName?: string;
    btnNeeded?: boolean;
}

export function ModalVideo({src, className, videoClassName, btnNeeded=true}: ModalVideoProps) {
    return (
        <MediaModal
            preview={({open, layoutId}) => (
                <motion.div
                    layoutId={layoutId}
                    className={twMerge(
                        'relative max-w-[500px] rounded-2xl  border-2 border-cold-white/50 cursor-pointer hover:border-turk/80 overflow-hidden',
                        className
                    )}
                    onClick={open}
                >
                    <video
                        src={src}
                        muted
                        autoPlay
                        loop
                        className={twMerge('w-full', videoClassName)}
                    />
                    {btnNeeded && (
                        <ModalToggleButton onClick={open} className='absolute right-4 bottom-4' />
                    )}
                </motion.div>

            )}
            content={() => (
                <video
                    src={src}
                    className='w-full max-h-[85vh]'
                    controls
                />
            )}
        />
    )
}