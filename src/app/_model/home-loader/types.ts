export type {LoadState} from '@/shared/types/load-state';
import type {LoadState} from '@/shared/types/load-state';

export const HOME_READY_TASKS = [
    'backgroundVideo',
    'heroBubbles',
    'heroParticles',
    'heroGlass',
] as const;

export type HomeReadyTask = typeof HOME_READY_TASKS[number];
export type HomeReadySnapshot = Record<HomeReadyTask, LoadState>;
