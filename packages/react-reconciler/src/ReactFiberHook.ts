import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import internals from 'react-shared/internals';
import { FiberNode } from './ReactFiber';
import {
    UpdateQueue,
    createUpdate,
    createUpdateQueue,
    enqueueUpdateQueue,
    processUpdateQueue
} from './ReactFiberUpdateQueue';
import { scheduleUpdateOnFiber } from './ReactWorkLoop';
import { Action } from 'react-shared';
import { Lane, NoLane, requestUpdateLane } from './ReactFiberLanes';
import { PassiveEffect, ReactFlags } from './ReactFiberFlags';
import { HookHasSideEffect, Passive } from './ReactHookEffectTags';

let currentlyRenderingFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null;
let renderLane: Lane = NoLane;

const { currentDispatcher } = internals;

interface Hook {
    memorizedState: any;
    updateQueue: unknown;
    next: Hook | null;
}

export interface Effect {
    tag: ReactFlags;
    create: EffectCallback | void;
    destroy: EffectCallback | void;
    deps: EffectDeps;
    next: Effect | null;
}

type EffectCallback = () => void;
type EffectDeps = any[] | null;

export interface FCComponentUpdateQueue<State> extends UpdateQueue<State> {
    lastEffect: Effect | null;
}

export function renderWithHooks(wip: FiberNode, lane: Lane) {
    currentlyRenderingFiber = wip;
    wip.memorizedState = null;
    wip.updateQueue = [];
    renderLane = lane;

    const current = wip.alternative;
    if (current !== null) {
        // update
        currentDispatcher.current = HooksDispatcherOnUpdate;
    } else {
        // mount
        currentDispatcher.current = HooksDispatcherOnMount;
    }

    const Component = wip.type;
    const props = wip.pendingProps;
    const children = Component(props);

    // reset
    currentlyRenderingFiber = null;
    workInProgressHook = null;
    currentHook = null;
    renderLane = NoLane;

    return children;
}

const HooksDispatcherOnMount: Dispatcher = {
    useState: mountState,
    useEffect: mountEffect
};

const HooksDispatcherOnUpdate: Dispatcher = {
    useState: updateState,
    useEffect: updateEffect
};

function mountEffect(create: EffectCallback | void, deps: EffectDeps | void) {
    const hook = mountWorkInProgressHook();
    const nextDeps = deps === undefined ? null : deps;

    (currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;
    hook.memorizedState = pushEffect(PassiveEffect | HookHasSideEffect, create, undefined, nextDeps);
}

function updateEffect(create: EffectCallback | void, deps: EffectDeps | void) {
    const hook = updateWorkInProgressHook();
    const nextDeps = deps === undefined ? null : deps;
    let destroy: EffectCallback | void;

    if (currentHook !== null) {
        const prevEffect = currentHook.memorizedState as Effect;
        destroy = prevEffect.destroy;

        if (nextDeps !== null) {
            const prevDeps = prevEffect.deps;
            if (areHookInputsEqual(nextDeps, prevDeps)) {
                hook.memorizedState = pushEffect(Passive, create, destroy, nextDeps);
                return;
            }
        }
        (currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;
        hook.memorizedState = pushEffect(Passive | HookHasSideEffect, create, destroy, nextDeps);
    }
}

function areHookInputsEqual(nextDeps: EffectDeps, prevDeps: EffectDeps) {
    if (prevDeps === null || nextDeps === null) {
        return false;
    }
    for (let i = 0; i < prevDeps.length; i++) {
        if (Object.is(prevDeps[i], nextDeps[i])) {
            continue;
        }
        return false;
    }
    return true;
}

function pushEffect(
    tag: ReactFlags,
    create: EffectCallback | void,
    destroy: EffectCallback | void,
    deps: EffectDeps
): Effect {
    const effect: Effect = {
        tag,
        create,
        destroy,
        deps,
        next: null
    };
    const fiber = currentlyRenderingFiber as FiberNode;
    const updateQueue = fiber.updateQueue as FCComponentUpdateQueue<any>;
    if (updateQueue === null) {
        const updateQueue = createFCComponentUpdateQueue<any>();
        fiber.updateQueue = updateQueue;
        effect.next = effect;
        updateQueue.lastEffect = effect;
    } else {
        const lastEffect = updateQueue.lastEffect;
        if (lastEffect === null) {
            effect.next = effect;
            updateQueue.lastEffect = effect;
        } else {
            const firstEffect = lastEffect.next;
            lastEffect.next = effect;
            effect.next = firstEffect;
            updateQueue.lastEffect = effect;
        }
    }
    return effect;
}

function createFCComponentUpdateQueue<State>(): FCComponentUpdateQueue<State> {
    const updateQueue = createUpdateQueue<State>() as FCComponentUpdateQueue<State>;
    updateQueue.lastEffect = null;
    return updateQueue;
}

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

function updateState<State>(): [State, Dispatch<State>] {
    const hook = updateWorkInProgressHook();

    // update state
    const queue = hook.updateQueue as UpdateQueue<State>;
    const pending = queue.shared.pending;
    queue.shared.pending = null;

    if (pending !== null) {
        const { memorizedState } = processUpdateQueue(hook.memorizedState, pending, renderLane);
        hook.memorizedState = memorizedState;
    }

    return [hook.memorizedState, queue.dispatch as Dispatch<State>];
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

function updateWorkInProgressHook(): Hook {
    let nextHook: Hook | null = null;

    if (currentHook === null) {
        const current = currentlyRenderingFiber?.alternative;
        if (current !== null) {
            nextHook = current?.memorizedState;
        } else {
            // mount
            nextHook = null;
        }
    } else {
        nextHook = currentHook.next;
    }

    if (nextHook === null) {
        throw new Error('Hooks update 不正确');
    }

    currentHook = nextHook;

    const hook: Hook = {
        memorizedState: currentHook.memorizedState,
        updateQueue: currentHook.updateQueue,
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
    const lane = requestUpdateLane();
    const update = createUpdate(action, lane);
    enqueueUpdateQueue(updateQueue, update);
    scheduleUpdateOnFiber(fiberNode, lane);
}
