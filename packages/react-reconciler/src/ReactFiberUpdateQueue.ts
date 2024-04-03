import { Dispatch } from 'react/src/currentDispatcher';
import { Action } from 'react-shared';
import { Lane } from './ReactFiberLanes';

export interface Update<State> {
    action: Action<State>;
    next: Update<State> | null;
    lane: Lane;
}

export interface UpdateQueue<State> {
    shared: {
        pending: Update<State> | null;
    };
    dispatch: Dispatch<State> | null;
}

export const createUpdate = <State>(action: Action<State>, lane: Lane): Update<State> => {
    return {
        action,
        next: null,
        lane
    };
};

export const createUpdateQueue = <State>(): UpdateQueue<State> => {
    return {
        shared: {
            pending: null
        },
        dispatch: null
    };
};

export const enqueueUpdateQueue = <State>(updateQueue: UpdateQueue<State>, update: Update<State>) => {
    // updateQueue.shared.pending = update;
    const pending = updateQueue.shared.pending;
    if (pending === null) {
        update.next = update;
    } else {
        update.next = pending.next;
        pending.next = update;
    }

    updateQueue.shared.pending = update;
};

export const processUpdateQueue = <State>(
    baseState: State,
    pendingUpdate: Update<State> | null,
    renderLane: Lane
): {
    memorizedState: State;
    baseState: State;
} => {
    const result: ReturnType<typeof processUpdateQueue<State>> = {
        memorizedState: baseState,
        baseState
    };
    if (pendingUpdate !== null) {
        const first = pendingUpdate.next;
        let pending = pendingUpdate.next as Update<any>;

        do {
            const updateLane = pending.lane;
            if (updateLane === renderLane) {
                const action = pending.action;
                if (action instanceof Function) {
                    baseState = action(baseState);
                } else {
                    baseState = action;
                }
            } else {
                if (__DEV__) {
                    console.warn('[processUpdateQueue] 存在不应该存在的更新');
                }
            }
            pending = pending.next as Update<State>;
        } while (pending !== first);
    }

    result.memorizedState = baseState;
    return result;
};
