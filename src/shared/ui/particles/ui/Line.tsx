import {twMerge} from "tailwind-merge";

type LineProps = {
    variant?: 'primary' | 'secondary';
    className?: string;
}

export function Line({variant='primary', className}: LineProps) {
    const bg = variant === 'primary' ? 'bg-turk' : 'bg-cloud';
    return (
        <span
            className={twMerge(`block h-1 w-full rounded-xl ${bg} w-1/3`, className)}
        />
    )
}