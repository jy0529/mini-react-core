import { Dispatch } from 'react/src/currentDispatcher';
import { Action } from 'react-shared';

export interface Update<State> {
    action: Action<State>;
}

export interface UpdateQueue<State> {
    shared: {
        pending: Update<State> | null;
    };
    dispatch: Dispatch<State> | null;
}

export const createUpdate = <State>(action: Action<State>) => {
    return {
        action
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
    updateQueue.shared.pending = update;
};

export const processUpdateQueue = <State>(
    baseState: State,
    pendingUpdate: Update<State> | null
): {
    memorizedState: State;
    baseState: State;
} => {
    const result: ReturnType<typeof processUpdateQueue<State>> = {
        memorizedState: baseState,
        baseState
    };
    if (pendingUpdate) {
        if (pendingUpdate.action instanceof Function) {
            result.memorizedState = pendingUpdate.action(baseState);
        } else {
            result.memorizedState = pendingUpdate.action;
        }
    }

    return result;
};
