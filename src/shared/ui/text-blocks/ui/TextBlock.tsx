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
    sm: 'text-xl',
    md: 'text-3xl leading-[0.9]',
    lg: 'text-4xl leading-[0.9]',
    xl: 'text-3xl sm:text-6xl leading-[0.7]',
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
            `font-dongle font-light text-white ${s[size]}`,
            className,
            (uppercase) ? 'uppercase' : '',
            (centered) ? 'text-center' : '',
        )}
            style={style}
        >{children}</p>
    )
}