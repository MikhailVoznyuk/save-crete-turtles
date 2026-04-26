export type {LoadState} from '@/shared/types/load-state';
import type {LoadState} from '@/shared/types/load-state';

export const HOME_READY_TASKS = [
    'backgroundVideo',
    'heroGlass',
    'heroBubbles',
    'heroParticles',
] as const;

export type HomeReadyTask = typeof HOME_READY_TASKS[number];
export type HomeReadySnapshot = Record<HomeReadyTask, LoadState>;
