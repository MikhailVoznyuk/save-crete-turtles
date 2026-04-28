import Image from 'next/image';
import {useState, useRef, useLayoutEffect, type CSSProperties} from 'react';
import {BlurContainer} from "@/shared/ui/containers/blur-container";

type Props = {
    onClick: () => void;
    label: string;
    icon: string;
    alt: string;
}

export function AppNavItem({onClick, label, icon, alt}: Props) {
    const [textWidth, setTextWidth] = useState<number>(0);
    const textRef = useRef<HTMLSpanElement | null>(null);

    useLayoutEffect(() => {
        if (!textRef.current) return;

        setTextWidth(textRef.current.scrollWidth);
    }, [label]);

    return (
        <BlurContainer
            className='absolute rounded-full hover:border-turk transition-colors duration-300 py-1 px-2 group/AppNavItem'
        >
            <button
                type='button'
                onClick={onClick}
                className='flex items-center'
            >
                <div className='overflow-hidden w-0 group-hover/AppNavItem:w-[var(--label-width)] transition-[width] duration-300'
                     style={{'--label-width': `${textWidth}px`} as CSSProperties}
                >
                    <span ref={textRef} className='block whitespace-nowrap text-turk text-xl'>{label}</span>
                </div>
                <Image
                    src={icon}
                    width={128}
                    height={128}
                    alt={alt}
                    className='size-12'
                />
            </button>
        </BlurContainer>
    )
}

