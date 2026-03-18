import Image from "next/image";
import {twMerge} from "tailwind-merge";
import {ModalToggleButton} from "@/shared/ui/buttons/modal-toggle-button";

type ModalImageProps = {
    src: string;
    width?: number;
    height?: number;
    className?: string;
    imageClassName?: string;
    alt?: string;
}

export function ModalImage({src, className, imageClassName, alt, width=1920, height=1080}: ModalImageProps) {
    return (
        <div className={twMerge(
            'relative rounded-2xl shadow-xl border cursor-pointer border-cold-white/50 overflow-hidden',
                className
        )}>
            <Image 
                className={twMerge('size-full object-cover', imageClassName)}
                width={width}
                height={height}
                src={src}
                alt={alt ?? 'Side photo of text block'}
            />
            <ModalToggleButton
                onClick={() => console.log('clicked')}
                className={twMerge('absolute bottom-4 right-4')}
            />
        </div>
    )
}