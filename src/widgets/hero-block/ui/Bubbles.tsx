
import {useEffect, useState} from 'react'
import {JellyContainer} from "@/shared/ui/containers";
import {LiquidGlass} from "@/shared/effects/liquid-glass";
import {TextBlock} from "@/shared/ui/text-blocks";

// засторить позицию элементов для каждого состояния
type Stage = 'enter' | 'show' | 'out'
type StageProps = {
    visible: boolean,
    top: number,
    left: number,
    moveDelay?: number,
    moveDuration?: number,
}

// 0 - основной пузырь, 1 - вспомогательный (средний) 2 - завершающий
const BUBBLE_STAGES: Record<Stage, StageProps>[] = [{
    enter: {
        visible: false,
        top: 100,
        left: 100
    },
    show: {
        visible: true,
        top: 500,
        left: 1000,
    },
    out: {
        visible: false,
        top: 300,
        left: 200
    }
}];

export function Bubbles() {
    const DELAY = 500;
    const SHOW_DURATION = 500000;

    const [stage, setStage] = useState<Stage>('enter');

    useEffect(() => {
        setTimeout(() => {
            setStage('show');
            setTimeout(() => setStage('out'), SHOW_DURATION);
        }, DELAY);
    }, []);



    return (
        <div className='absolute transition-all rounded-full'
            style={{
                top: `${BUBBLE_STAGES[0][stage].top}px`,
                left: `${BUBBLE_STAGES[0][stage].left}px`,
                transform: BUBBLE_STAGES[0][stage].visible ? 'scale(1)' : 'scale(0)',
                transformOrigin: 'center',
                transition: `${(BUBBLE_STAGES[0][stage].moveDuration ?? 1000)}ms`,
                transitionDelay: BUBBLE_STAGES[0][stage].moveDelay ? `${BUBBLE_STAGES[0][stage].moveDelay}ms` :  '0',
            }}
        >
            <JellyContainer
                className="rounded-full"
                outlineClassName="stroke-cyan-200/20"
                innerClassName="p-20"
                outline
                boundaryPoints={72}
                bendK={200}
                smoothK={0.44}
                smoothIters={2}
                pathTension={0.6}
                pressureK={20000}
                shapeK={85}
                damping={7.2}
                hoverIndent={2.0}
                hoverRadius={140}
                hoverIndentMul={1.35}
                hoverEnterMul={1.25}
                hoverIndentSigmaFactor={0.30}
                hoverEnterSigmaFactor={0.30}
                hoverIndentWeightPow={1.55}
                hoverEnterWeightPow={1.25}
                hoverPressureBoost={0.0}
                hoverRingStrength={720}
                hoverRingMul={1.15}
                hoverRingLengthFactor={0}
                hoverConeMul={1.2}
                hoverConeWidthBaseFactor={0.26}
                hoverConeWidthSlopeFactor={0.46}
                hoverConeLengthFactor={2.3}
                hoverConeNormalSpeedGain={1200}
                clickIndent={0.01}
                clickWave={0.9}
                pointerSpeedMax={10000}
                hoverFastBoost={10}
                idle
                idleStrength={1000}
                idleFreq={0.28}
                idleWaves={1.3}
                idleTurbulence={0.7}
                idleTangential={0.20}
                idleInteractMul={0.15}

            >
                <LiquidGlass
                    intensity={1.15}
                    magnify={0.12}
                    blur={0.42}
                    chromatic={0.18}
                    rim={0.55}
                    spec={0.55}
                    tint={0.35}
                    alpha={1}
                    dirMode={0}
                />
                <div>
                    <TextBlock size="xl">Help Me to survive!</TextBlock>
                </div>
            </JellyContainer>
        </div>
    )
}
