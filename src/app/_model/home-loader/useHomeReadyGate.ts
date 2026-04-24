import {useCallback, useEffect, useMemo, useState} from 'react';
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
    return state === 'ready' || state === 'skipped' || state === 'error';
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


    useEffect(() => {
        let loadObserved = document.readyState === 'complete';

        const resolvePendingTasks = () => {
            setSnapshot((prev) => {
                let changed = false;
                const next = {...prev};

                for (const task of HOME_READY_TASKS) {
                    if (next[task] !== 'pending') continue;
                    next[task] = 'skipped';
                    changed = true;
                }

                return changed ? next : prev;
            });
        };

        const tryResolvePending = (force = false) => {
            if (force || loadObserved || document.readyState === 'complete') {
                loadObserved = true;
                resolvePendingTasks();
            }
        };

        const handleWindowReady = () => {
            loadObserved = true;
            window.setTimeout(() => tryResolvePending(true), 160);
        };

        const softTimeoutId = window.setTimeout(() => {
            tryResolvePending(false);
        }, 2500);

        const hardTimeoutId = window.setTimeout(() => {
            tryResolvePending(true);
        }, 5000);

        window.addEventListener('load', handleWindowReady);
        window.addEventListener('pageshow', handleWindowReady);

        return () => {
            window.clearTimeout(softTimeoutId);
            window.clearTimeout(hardTimeoutId);
            window.removeEventListener('load', handleWindowReady);
            window.removeEventListener('pageshow', handleWindowReady);
        };
    }, []);

    return {
        snapshot,
        isReady,
        hasError,
        pendingTasks,
        setTaskState,
    };
}
