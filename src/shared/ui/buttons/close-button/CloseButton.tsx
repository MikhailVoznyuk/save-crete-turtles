import {twMerge} from "tailwind-merge";

type Props = {
    onClick: () => void;
    className?: string;
}

const base = 'relative rounded-full backdrop-blur-xs border-1 cursor-pointer overflow-hidden transition-all duration-300 group/close-btn shadow-md';
const size = 'size-12'
const tone = 'bg-black/10 border-cold-white/30';
const hover = 'hover:border-turk'
const lineBase = 'absolute w-8 h-0.5 rounded-full top-1/2 bg-cold-white -translate-1/2 left-1-2 origin-center group-hover/close-btn:bg-turk duration-300 transition-all'
export function CloseButton({onClick, className}: Props) {
    return (
        <button
            type='button'
            onClick={onClick}
            className={twMerge(
                base,
                size,
                tone,
                hover,
                className
            )}
        >
            <span
                className={twMerge(lineBase, 'rotate-45 ')}
            />
            <span
                className={twMerge(lineBase, '-rotate-45')}
            />
            <span />
        </button>
    )
}