import {twMerge} from "tailwind-merge";

type GradientLineProps = {
    variant: 'primary' | 'secondary';
    centered?: boolean;
    className?: string;
}

export function GradientLine({variant='primary', centered=false, className}: GradientLineProps) {
    const color = (variant === 'primary') ? '#00EEFF' : '#E9E9E9'
    return (
        <span className={twMerge('block h-2 w-full', className)}
              style={{
                  background: centered ? `linear-gradient(to right, transparent ${color} transparent` : `linear-gradient(to right, ${color} transparent`
            }}
        />
    )
}