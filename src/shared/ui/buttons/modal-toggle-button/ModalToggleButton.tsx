import Image from "next/image";
import {twMerge} from "tailwind-merge";

type ModalToggleButtonProps = {
    variant?: 'primary' | 'secondary'
    onClick: () => void;
    className?: string;
}

const base = 'rounded-full border overflow-hidden backdrop-blur-xs cursor-pointer transition-all duration-300 group/fs-btn';
const size = 'size-12'
const tone = 'bg-black/10 border-cold-white/50';
const hover = 'hover:border-turk'

export function ModalToggleButton({variant='primary', onClick, className}: ModalToggleButtonProps) {

    return (
        <button
            onClick={onClick}
            className={twMerge(base, size, tone, hover, className)}
        >
            <div className='relative size-full flex items-center justify-center'>
                <Image src='/media/icons/fullscreen_passive.svg'
                       className='absolute top-1/2 left-1/2 -translate-1/2 size-9 group-hover/fs-btn:opacity-0 transition-300 duration-300'
                       width={36}
                       height={36}
                       alt='open modal icon'
                />
                <Image src='/media/icons/fullscreen_active.svg'
                       className='absolute top-1/2 left-1/2 -translate-1/2 size-9 opacity-0 group-hover/fs-btn:opacity-100 transition-300 duration-300'
                       width={36}
                       height={36}
                       alt='open modal icon'
                />
            </div>

        </button>
    )
}