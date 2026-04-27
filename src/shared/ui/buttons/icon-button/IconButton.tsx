import { ReactNode } from 'react';
import { BlurContainer } from "@/shared/ui/containers/blur-container";
import { twMerge } from "tailwind-merge";
import Image from 'next/image';

type Props = {
    onClick: () => void;
    icon: string;
    variant: 'primary' | 'secondary';
    rounded?: boolean;
    rotate?: number;
    className?: string;
    alt?: string;
}

const base = 'size-10 sm:size-12 cursor-pointer ';
const childrenBase = 'size-full flex justify-center items-center'

export function IconButton({onClick, icon, variant='secondary', alt, rounded=true, rotate,  className}: Props) {
    let btnChildren : ReactNode | null = null;

    const iconEl: ReactNode = <Image
        src={icon}
        width={128}
        height={128}
        className='size-8 sm:size-10 transition-transform duration-300'
        style={(rotate !== undefined) ? {
            transform: `rotate(${rotate}deg)`
        } : {}}
        alt={alt ?? 'Button icon'}
    />


    if (variant === 'primary') {
        btnChildren = (
            <div className={twMerge(
                childrenBase,
                rounded && 'rounded-full',
                'bg-turk group-hover/iconBtn:bg-cold-white transition-colors duration-300'
            )}
            >
                {iconEl}
            </div>
        )

    } else {
        btnChildren = (
            <BlurContainer
                className={twMerge(
                    'size-full',
                    rounded && 'rounded-full',
                    'group-hover/iconBtn:border-turk'
                )}
            >
                {iconEl}
            </BlurContainer>
        )
    }
    return (
        <button
            type='button'
            onClick={onClick}
            className='size-10 sm:size-12 cursor-pointer overflow-hidden group/iconBtn'
        >
            {btnChildren}
        </button>
    )
}
