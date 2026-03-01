

import {twMerge} from "tailwind-merge";
import {ReactNode, CSSProperties} from "react";
import type {Variant} from "@/shared/ui/typography/types";
import styles from './style.module.css';

type WaveButtonProps = {
    children: ReactNode;
    onClick: () => void;
    variant?: Variant;
    className?: string;
}

type CSSVars = CSSProperties & {
    ['--wave-color']: string;
}

const base = 'relative rounded-full font-dongle text-abyss font-light hover:text-white duration-300 ease-out';

const v: Record<Variant, string> = {
    primary: 'bg-turk px-5 py-1.5 text-5xl',
    secondary: 'bg-cloud px-3 py-0.5 text-5xl',
}

export function WaveButton({onClick, children, variant='primary', className}: WaveButtonProps) {
    const CSSVar:CSSVars = {'--wave-color':  '#1B1750'};
    return (
        <button
            onClick={onClick}
            className={
                twMerge(base, v[variant], className, styles.btn)
            }
            style={CSSVar}
        >
            <div className={styles.liquid} />
            <div className='relative z-10 leading-none translate-y-[0.04em]'>
                {children}
            </div>

        </button>
    )
}

