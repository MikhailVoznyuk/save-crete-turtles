import {twMerge} from "tailwind-merge";

type LineProps = {
    variant?: 'primary' | 'secondary';
    className?: string;
}

export function Line({variant='primary', className}: LineProps) {
    const bg = variant === 'primary' ? 'bg-turk' : 'bg-cloud';
    return (
        <span
            className={twMerge(`block h-2 w-full rounded-xl ${bg}`, className)}
        />
    )
}