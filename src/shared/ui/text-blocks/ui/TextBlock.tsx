import {twMerge} from "tailwind-merge";
import type {ReactNode} from 'react'
import type {TextSize, Variant} from "@/shared/ui/typography/types";

type TextBlockProps = {
    children: ReactNode;
    size?: TextSize;
    uppercase?: boolean;
    className?: string;
    centered?: boolean;
}

const s: Record<TextSize, string> = {
    sm: 'text-xl',
    md: 'text-3xl leading-[0.9]',
    lg: 'text-4xl leading-[0.9]',
    xl: 'text-6xl leading-[0.7]',
}


export function TextBlock({
    children,
    size='md',
    uppercase,
    centered,
    className}: TextBlockProps) {
    return (
        <p className={twMerge(
            `font-dongle font-light text-white ${s[size]}`,
            className,
            (uppercase) ? 'uppercase' : '',
            (centered) ? 'text-center' : '',
        )}
        >{children}</p>
    )
}