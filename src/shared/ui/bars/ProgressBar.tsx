import {twMerge} from "tailwind-merge";
import {BlurContainer} from "@/shared/ui/containers/blur-container";

type Props = {
    progress: number;
    className?: string;
}

export function ProgressBar({progress, className}: Props) {
    return (
        <BlurContainer
            className={twMerge(
                'relative w-44 sm:w-64 h-2 sm:h-3 p-0 rounded-full',
                className
            )}
        >
            <span className='absolute top-0 left-0 h-full bg-turk rounded-full transition-all duration-100'
                style={{width: `${progress}%`}}
            />
        </BlurContainer>
    )
}