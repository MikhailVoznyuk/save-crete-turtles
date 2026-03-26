import {twMerge} from "tailwind-merge";
import type {ReactNode} from "react";

type Props = {
    children: ReactNode;
    className?: string;
}

export function BlurContainer({children, className} : Props) {
    return (
        <div className={twMerge('p-2 flex items-center justify-center bg-cold-white/10 border border-cold-white/40 backdrop-blur-xs rounded-2xl', className)}>
            {children}
        </div>
    )
}