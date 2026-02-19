import {twMerge} from "tailwind-merge";
import {ReactNode} from "react";
import type {Variant} from "@/shared/ui/typography/types";

type WaveButtonProps = {
    children: ReactNode;
    onClick: () => void;
    variant?: Variant;
    className?: string;
}

export function WaveButton({onClick, children, variant, className}: WaveButtonProps) {
    return (
        <button
            onClick={onClick}
            className={twMerge('', className)}
        >
            {children}
        </button>
    )
}

