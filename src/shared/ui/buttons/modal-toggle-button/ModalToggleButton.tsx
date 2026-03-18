import Image from "next/image";
import {twMerge} from "tailwind-merge";

type ModalToggleButtonProps = {
    variant?: 'primary' | 'secondary'
    onClick: () => void;
    className?: string;
}

const base = 'flex items-center justify-center rounded-full border backdrop-blur-xs transition-all duration-300';
const size = 'size-16'
const tone = 'bg-cold-white/20 border-white/50 ';
const hover = 'hover:bg-turk hover:border-turk'

export function ModalToggleButton({variant='primary', onClick, className}: ModalToggleButtonProps) {

    return (
        <button
            onClick={onClick}
            className={twMerge(base, size, tone, hover, className)}
        >
            <Image src='/media/icons/fullscreen_passive.svg'
                   className='absolute top-1/2 left-1/2 -translate-1/2 size-12 hover:opacity-0 transition-300 duration-300'
                   width={46}
                   height={46}
                   alt='open modal icon'
            />
            <Image src='/media/icons/fullscreen_active.svg'
                   className='absolute top-1/2 left-1/2 -translate-1/2 size-12 opacity-0 hover:opacity-1 transition-300 duration-300'
                   width={46}
                   height={46}
                   alt='open modal icon'
            />
        </button>
    )
}