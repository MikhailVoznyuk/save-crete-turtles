import {Line} from "@/shared/ui/particles";
import {twMerge} from "tailwind-merge";
import type {ReactNode} from "react";
import type {TextSize, Variant} from "@/shared/ui/typography/types";

type HeaderAs = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

type Base = {
    children: ReactNode;
    as?: HeaderAs;
    variant?: Variant;
    size?: TextSize;
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

// Потом дописать адаптив для шрифтов
const s: Record<TextSize, string> = {
    sm: 'text-2xl leading-[0.7]',
    md: 'text-3xl leading-[0.7]',
    lg: 'text-4xl leading-[0.7]',
    xl: 'text-8xl leading-[0.7]',
}

const t: Record<Variant, string> = {
    primary: 'text-white uppercase',
    secondary: 'text-cloud',
}

export function Title({
    children,
    as: Tag='h2',
    variant='primary',
    size='lg',
    titleClassName,
    containerClassName,
    lined,
    lineClassName}: TitleProps) {

    return (
        <div className={twMerge(lined && 'flex flex-col gap-1', containerClassName)}>
            <Tag
                className={twMerge(`font-dongle font-light ${t[variant]} ${s[size]}`, titleClassName)}
            >{children}</Tag>
            {lined && (
                <Line className={lineClassName}/>
            )}
        </div>
    )
}