import {useCallback, useEffect, useMemo, useState} from 'react';
import {HOME_READY_TASKS, type HomeReadySnapshot, type HomeReadyTask} from './types';
import type {LoadState} from '@/shared/types/load-state';

function createInitialSnapshot(): HomeReadySnapshot {
    return {
        backgroundVideo: 'pending',
        heroGlass: 'pending',
        heroBubbles: 'pending',
        heroParticles: 'pending',
    };
}

function isResolved(state: LoadState) {
    return state === 'ready' || state === 'skipped' || state === 'error';
}

const RECOVERABLE_READY_TASKS = new Set<HomeReadyTask>([
    'heroGlass',
    'heroBubbles',
    'heroParticles',
]);

const RECOVERABLE_READY_FALLBACK_MS = 8500;

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

    useEffect(() => {
        const pendingRecoverableTasks = HOME_READY_TASKS.filter((task) => (
            RECOVERABLE_READY_TASKS.has(task) && snapshot[task] === 'pending'
        ));

        if (pendingRecoverableTasks.length === 0) return;

        const timeoutId = window.setTimeout(() => {
            setSnapshot((prev) => {
                let changed = false;
                const next = {...prev};

                for (const task of pendingRecoverableTasks) {
                    if (next[task] !== 'pending') continue;

                    next[task] = 'skipped';
                    changed = true;
                }

                return changed ? next : prev;
            });
        }, RECOVERABLE_READY_FALLBACK_MS);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [snapshot]);

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
