import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { twMerge } from "tailwind-merge";
import { BlurContainer } from "@/shared/ui/containers/blur-container";

type Props = {
    src: string;
    needContainer?: boolean;
    autoplay?: boolean;
    loop?: boolean;
    containerClassName?: string;
}

export function LottieBlock({src, needContainer=true, containerClassName, loop=true, autoplay=true}: Props) {
    if (needContainer) {
        return (
            <BlurContainer className={twMerge('relative', containerClassName)}>
                <DotLottieReact
                    src={src}
                    autoplay={autoplay}
                    loop={loop}
                />
            </BlurContainer>
        )
    } else {
        return (
            <DotLottieReact
                src={src}
                autoplay={autoplay}
                loop={loop}
            />
        )
    }

}