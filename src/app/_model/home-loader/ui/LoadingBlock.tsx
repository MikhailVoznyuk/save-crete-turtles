'use client';

import {useState, useEffect, useRef} from 'react';

import {ProgressBar} from "@/shared/ui/bars";
import {LottieBlock} from "@/shared/ui/media";
import {Title} from "@/shared/ui/text-blocks";

//TODO: сделать random progress update

export function LoadingBlock({isLoaded} : {isLoaded: boolean}) {
    const [progress, setProgress] = useState<number>(0);
    const timerId = useRef<number | null>(null);
    useEffect(() => {
        if (timerId.current !== null) return;

        const setLoadingTimer = () => {
            if (progress === 90) {
                if (timerId.current !== null) {
                    clearTimeout(timerId.current)
                }
                return;
            }

            setProgress(prev => prev + 10);
            timerId.current = window.setTimeout(setLoadingTimer, 800);
        }

        setLoadingTimer();

        return () => {
            if (timerId.current !== null) {
                clearTimeout(timerId.current)
            }
        }

    }, []);

    useEffect(() => {
        if (!isLoaded) return;

        if (timerId.current !== null) {
            clearTimeout(timerId.current);
        }

        setProgress(100);

    }, [isLoaded]);

    return (
        <div className='flex flex-col gap-4 sm:gap-6 items-center justify-center'>
            <LottieBlock src={'/media/lottie/turtle-lottie.json'} containerClassName='size-24 sm:size-32 rounded-full' />
            <Title size={'md'} lined={false} >Loading</Title>
            <ProgressBar progress={progress} />
        </div>
    )
}