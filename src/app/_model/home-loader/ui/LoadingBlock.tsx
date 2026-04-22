'use client';

import {useState, useEffect, useRef} from 'react';

import {ProgressBar} from "@/shared/ui/bars";
import {LottieBlock} from "@/shared/ui/media";
import {Title} from "@/shared/ui/text-blocks";

//TODO: сделать random progress update

export function LoadingBlock({isLoaded} : {isLoaded: boolean}) {
    const [progress, setProgress] = useState<number>(0);

    useEffect(() => {
        if (isLoaded) {
            setProgress(100);
            return;
        }

        if (progress >= 90) return;

        const id = window.setTimeout(() => {
            setProgress(prev => Math.min(prev + 10, 90))
        }, 200);

        return () => {
            clearTimeout(id);
        }

    }, [progress, isLoaded]);

    return (
        <div className='flex flex-col gap-4 sm:gap-6 items-center justify-center'>
            <LottieBlock src={'/media/lottie/turtle-lottie.json'} containerClassName='size-24 sm:size-32 rounded-full' />
            <Title size={'md'} lined={false} >Loading</Title>
            <ProgressBar progress={progress} />
        </div>
    )
}