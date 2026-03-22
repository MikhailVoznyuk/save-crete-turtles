import {useState} from 'react';
import {twMerge} from "tailwind-merge";
import {useIsMobile} from "@/shared/hooks/adaptive";

type ArrowButtonProps = {
    onClick: () => void;
    direction: 'up' | 'down' | 'left' | 'right';
    variant?: 'primary' | 'secondary';
    toggling?: boolean;
    containerVisible?: boolean;
    className?: string;
}

const DIR_ANGLES = {
    up: 180,
    left: 90,
    right: -90,
    down: 0
}

// TODO: Добавить вариант primary / secondary

export function ArrowButton({onClick, direction, containerVisible=true, variant='primary', toggling=false, className}: ArrowButtonProps) {
    const [reversed, setReversed] = useState<boolean>(false);
    const isMobile = useIsMobile();

    const angle = (toggling) ?
        (reversed) ? (DIR_ANGLES[direction] + 180) % 360 : DIR_ANGLES[direction] :
        DIR_ANGLES[direction];

    const containerStyle =  (variant === 'primary') ?
        'bg-turk/50 backdrop-blur-xs   hover:bg-cold-white/40' :
        'bg-cold-white/10 border border-cold-white/40 backdrop-blur-sm hover:border-turk/80 border-2'
    const arrowStyle = (containerVisible) ?
        (variant === 'primary') ?
            'bg-cold-white group-hover/arrows:bg-turk w-6 h-[3px]' :
            'bg-cold-white group-hover/arrows:bg-turk w-6 h-[3px]' :
        'bg-cold-white group-hover/arrows:bg-turk w-8 sm:w-10 h-[3px] sm:h-1';

    return (
        <button
            onClick={() => {
                if (toggling) {
                    setReversed((prev) => !prev);
                }
                onClick();
            }}
            className={twMerge(
                'relative z-index-10 size-14 rounded-full cursor-pointer group/arrows duration-300',
                (containerVisible) ? containerStyle : null,
                className)}
            style={{
                transform: `rotate(${angle}deg)`
            }}
        >
            <div className='relative size-full'>
                 <span className={`absolute -translate-1/2 rotate-45 top-1/2 left-1/2 rounded-full duration-300 ${arrowStyle}`}
                       style={{left: (containerVisible) ?

                               'calc(50% - 7.5px)' :
                               (isMobile) ?
                                   'calc(50% - 10.5px)' :
                                   'calc(50% - 13px)'
                        }}
                 />
                <span className={`absolute -translate-1/2 -rotate-45 top-1/2 left-1/2 rounded-full duration-300  ${arrowStyle}`}
                      style={{left: (containerVisible) ?
                              'calc(50% + 7.5px)' :
                              (isMobile) ?
                                  'calc(50% + 10.5px)' :
                                  'calc(50% + 13px)'
                      }}
                />
            </div>

        </button>
    )
}