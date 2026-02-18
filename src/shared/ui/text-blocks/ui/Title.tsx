import React from "react";
import {twMerge} from "tailwind-merge";
import {Line} from "@/shared/ui/particles";
import type {TextSize, TextTone} from "@/shared/ui/typography/types";

type HeaderAs = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

// Потом дописать адаптив для шрифтов
const s: Record<TextSize, string> = {
    sm: 'text-lg leading-tight',
    md: 'text-xl leading-tight',
    lg: 'text-2xl leading-tight',
    xl: 'text-4xl leading-tight',
}

const t: Record<TextTone, string> = {
    primary: 'text-white',
    secondary: 'text-cloud',
}

type Base = {
    as: HeaderAs;
    tone: TextTone;
    size: TextSize;
    children: React.ReactNode;
    titleClassName?: string;
    containerClassName?: string;
}

type LinedOn = Base & {
    lined: true;
    lineClassName?: string;
}

type LinedOff = Base & {
    lined?: false;
    lineClassName?: never;
}

type TitleProps = LinedOn | LinedOff;

export function Title({
    as: Tag,
    tone,
    size,
    children,
    titleClassName,
    containerClassName,
    lined,
    lineClassName}: TitleProps) {

    return (
        <div className={twMerge(lined && 'flex flex-col gap-4', containerClassName)}>
            <Tag
                className={twMerge(`font-dongle ${t[tone]} ${s[size]}`, titleClassName)}
            >{children}</Tag>
            {lined && (
                <Line className={lineClassName}/>
            )}
        </div>
    )
}