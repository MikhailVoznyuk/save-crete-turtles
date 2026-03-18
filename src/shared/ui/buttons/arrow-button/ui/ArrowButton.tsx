import {twMerge} from "tailwind-merge";

type ArrowButtonProps = {
    onClick: () => void;
    direction: 'up' | 'down' | 'left' | 'right';
    containerVisible?: boolean;
    className?: string;
}

const DIR_ANGLES = {
    up: 180,
    left: -90,
    right: 90,
    down: 0
}

// TODO: Добавить вариант primary / secondary

export function ArrowButton({onClick, direction, containerVisible=true, className}: ArrowButtonProps) {
    const arrowColorStyle = (containerVisible) ?
        'bg-bg-turk group-hover/arrows:bg-cold-white' :
        'bg-cold-white group-hover/arrows:bg-turk';

    return (
        <button
            onClick={onClick}
            className={twMerge(
                'size-14 rounded-full cursor-pointer group/arrows duration-300',
                (containerVisible) ? 'bg-cold-white hover:bg-turk' : '',
                className)}
            style={{transform: `rotate${DIR_ANGLES[direction]}deg`}}

        >
            <div className='relative size-full'>
                 <span className={`absolute w-10 h-1 -translate-1/2 rotate-45 top-1/2 left-1/2 rounded-full duration-300 ${arrowColorStyle}`}
                       style={{left: `calc(50% - 13px)`}}
                 />
                <span className={`absolute w-10 h-1 -translate-1/2 -rotate-45 top-1/2 left-1/2 rounded-full duration-300  ${arrowColorStyle}`}
                      style={{left: `calc(50% + 13px)`}}
                />
            </div>

        </button>
    )
}