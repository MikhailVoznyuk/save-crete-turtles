import React from "react";
import {JellyContainer} from "@/shared/ui/containers";
import {LiquidGlass} from "@/shared/effects/liquid-glass";

type GlassBubbleProps = {
    outerClassName?: string;
    innerClassName?: string;
    effectStrength?: 'sm' | 'md' | 'lg',
    children?: React.ReactNode;
}

export function GlassBubble({
    innerClassName,
    outerClassName,
    effectStrength = 'md',
    children,}: GlassBubbleProps
) {

    return (
        <div></div>
    )
}
