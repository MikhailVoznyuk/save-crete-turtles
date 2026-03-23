import Image from "next/image";
import {useState, useRef, useEffect} from "react";

type ToggleSide = {
    header: string,
    iconSrc?: string
}

type ToggleProps = {
    sides: ToggleSide[],
    onClick: (idx: number) => void,
}

export function Toggler({sides, onClick}: ToggleProps) {
    const [toggleSide, setToggleSide] = useState<number>(0);
    const [sizes, setSizes] = useState<number[]>([]);

    const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]); // 0 - left, 1 - right

    useEffect(() => {
        const buttons = [buttonsRef.current[0], buttonsRef.current[1]];
        if (!buttons[0] || !buttons[1]) return;

        const leftBtnSize = buttons[0].getBoundingClientRect().width;
        const rightBtnSize = buttons[1].getBoundingClientRect().width;

        setSizes([leftBtnSize, rightBtnSize]);
    }, []);

    const toggle = (idx: number) => {
        if (idx === toggleSide) return;
        onClick(idx);
        setToggleSide(idx);
    }

    return (
        <div className='relative flex items-center justify-between w-[320px] h-14 bg-cold-white/10 backdrop-blur-xs rounded-full border-2 border-cold-white/50 '>
            <div
                className={`absolute h-full rounded-full bg-turk/80 transition-all duration-300 inset-shadow-xs ${(toggleSide === 0) ? 'left-0' : 'left-full -translate-x-full'}`}
                style={{
                    width: `${sizes[toggleSide]}px`,
                }}
            />
            {sides.map((side, i) => (
                <button
                    key={i}
                    ref={(el) => {buttonsRef.current[i] = el}}
                    type='button'
                    aria-label={`toggle control to "${side.header}" option`}
                    onClick={() => toggle(i)}
                    className={`relative z-10 flex items-center justify-center px-2 ${i === toggleSide ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    {side.iconSrc && (
                        <Image src={side.iconSrc} width={30} height={30} alt={`toggle option "${side.header}" icon`} />
                    )}
                    <span className={`text-xl text-shadow-md transition-colors duration-300  ${i === toggleSide ? 'text-cold-white' : 'text-turk'}`}>{side.header}</span>
                </button>
            ))}
        </div>
    )
}