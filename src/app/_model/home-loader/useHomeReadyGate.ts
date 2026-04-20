import {useCallback, useMemo, useState} from 'react';
import {HOME_READY_TASKS, type HomeReadySnapshot, type HomeReadyTask} from './types';
import type {LoadState} from '@/shared/types/load-state';

function createInitialSnapshot(): HomeReadySnapshot {
    return {
        backgroundVideo: 'pending',
        heroBubbles: 'pending',
        heroParticles: 'pending',
        heroGlass: 'pending',
    };
}

function isResolved(state: LoadState) {
    return state === 'ready' || state === 'skipped';
}

export function useHomeReadyGate() {
    const [snapshot, setSnapshot] = useState<HomeReadySnapshot>(() => createInitialSnapshot());

    const setTaskState = useCallback((task: HomeReadyTask, nextState: LoadState) => {
        setSnapshot((prev) => {
            if (prev[task] === nextState) return prev;
            return {
                ...prev,
                [task]: nextState,
            };
        });
    }, []);

    const isReady = useMemo(() => {
        return HOME_READY_TASKS.every((task) => isResolved(snapshot[task]));
    }, [snapshot]);

    const hasError = useMemo(() => {
        return HOME_READY_TASKS.some((task) => snapshot[task] === 'error');
    }, [snapshot]);

    const pendingTasks = useMemo(() => {
        return HOME_READY_TASKS.filter((task) => snapshot[task] === 'pending');
    }, [snapshot]);

    return {
        snapshot,
        isReady,
        hasError,
        pendingTasks,
        setTaskState,
    };
}
