import {twMerge} from "tailwind-merge";
import type {ReactNode} from 'react'
import type {TextSize} from "@/shared/ui/typography/types";

type TextBlockProps = {
    children: ReactNode;
    size?: TextSize;
    uppercase?: boolean;
    className?: string;
}

const s: Record<TextSize, string> = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-5xl leading-[0.7]',
}

export function TextBlock({
    children,
    size='md',
    uppercase,
    className}: TextBlockProps) {
    return (
        <p className={twMerge(
            `font-dongle font-light text-white ${s[size]}`, className, uppercase && 'uppercase')}
        >{children}</p>
    )
}