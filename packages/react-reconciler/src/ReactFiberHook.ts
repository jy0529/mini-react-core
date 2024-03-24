import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import internals from 'react-shared/internals';
import { FiberNode } from './ReactFiber';
import { UpdateQueue, createUpdate, createUpdateQueue, enqueueUpdateQueue } from './ReactFiberUpdateQueue';
import { scheduleUpdateOnFiber } from './ReactWorkLoop';
import { Action } from 'react-shared';

let currentlyRenderingFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null;

const { currentDispatcher } = internals;

interface Hook {
    memorizedState: any;
    updateQueue: unknown;
    next: Hook | null;
}

export function renderWithHooks(wip: FiberNode) {
    currentlyRenderingFiber = wip;
    wip.memorizedState = null;

    const current = wip.alternative;
    if (current !== null) {
        // update
    } else {
        // mount
        currentDispatcher.current = HooksDispatcherOnMount;
    }

    const Component = wip.type;
    const props = wip.pendingProps;
    const children = Component(props);

    currentlyRenderingFiber = null;
    return children;
}

const HooksDispatcherOnMount: Dispatcher = {
    useState: mountState
};

function mountState<State>(initialState: (() => State) | State): [State, Dispatch<State>] {
    const hook = mountWorkInProgressHook();
    let memorizedState;
    if (initialState instanceof Function) {
        memorizedState = initialState();
    } else {
        memorizedState = initialState;
    }
    const queue = createUpdateQueue<State>();
    hook.updateQueue = queue;
    hook.memorizedState = memorizedState;

    // @ts-ignore
    const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
    queue.dispatch = dispatch;

    return [memorizedState, dispatch];
}

function mountWorkInProgressHook(): Hook {
    const hook: Hook = {
        memorizedState: null,
        updateQueue: null,
        next: null
    };

    if (workInProgressHook === null) {
        if (currentlyRenderingFiber === null) {
            throw new Error('请在组件里调用 hook');
        } else {
            workInProgressHook = hook;
            currentlyRenderingFiber.memorizedState = workInProgressHook;
        }
    } else {
        workInProgressHook.next = hook;
        workInProgressHook = hook;
    }

    return workInProgressHook;
}

function dispatchSetState<State>(fiberNode: FiberNode, updateQueue: UpdateQueue<State>, action: Action<State>) {
    const update = createUpdate(action);
    enqueueUpdateQueue(updateQueue, update);
    scheduleUpdateOnFiber(fiberNode);
}
