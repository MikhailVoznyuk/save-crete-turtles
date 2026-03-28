import {twMerge} from "tailwind-merge";
import type {CSSProperties, ReactNode} from 'react'
import type {TextSize, Variant} from "@/shared/ui/typography/types";

type TextBlockProps = {
    children: ReactNode;
    size?: TextSize;
    uppercase?: boolean;
    className?: string;
    centered?: boolean;
    style?: CSSProperties;
}

const s: Record<TextSize, string> = {
    sm: 'text-lg leading-[0.95]',
    md: 'text-3xl leading-[0.9] sm:leading-[0.9]',
    lg: 'text-2xl leading-[0.92] sm:leading-[0.9]',
    xl: 'text-3xl sm:text-6xl leading-[0.9]  sm:leading-[0.7]',
}


export function TextBlock({
    children,
    size='md',
    uppercase,
    centered,
    className,
    style}: TextBlockProps) {
    return (
        <p className={twMerge(
            `block font-dongle font-light text-white [-webkit-text-size-adjust:100%] ${s[size]}`,
            className,
            (uppercase) ? 'uppercase' : '',
            (centered) ? 'text-center' : '',
        )}
            style={style}
        >{children}</p>
    )
}