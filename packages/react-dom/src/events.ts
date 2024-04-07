import { Container } from 'hostConfig';
import {
    unstable_ImmediatePriority,
    unstable_NormalPriority,
    unstable_UserBlockingPriority,
    unstable_runWithPriority
} from 'scheduler';
import { ReactElementProps } from 'shared';

export const elementPropsKey = '__props';

export interface SyntheticEvent extends Event {
    __stopPropagation: boolean;
}

export type EventCallback = (e: Event) => void;

export interface Paths {
    capture: EventCallback[];
    bubble: EventCallback[];
}

export interface DOMElement extends Element {
    [elementPropsKey]: ReactElementProps;
}

export function updateFiberProps(node: DOMElement, props: ReactElementProps) {
    node[elementPropsKey] = props;
}

const validEvents = ['click'];
export function initEvent(container: Container, eventType: string) {
    if (validEvents.includes(eventType) === false) {
        console.warn('当前不支持' + eventType);
        return;
    }

    container.addEventListener(eventType, (e) => {
        dispatchEvent(container, eventType, e);
    });
}

function dispatchEvent(container: Container, type: string, e: Event) {
    const targetElement = e.target;

    if (!targetElement) {
        return;
    }

    // 1. 收集 events
    const { capture, bubble } = collectPaths(targetElement as DOMElement, container, type);
    // 2. 构造合成事件
    const se = createSyntheticEvent(e);
    // 3. 遍历 capture
    triggerEvents(capture, se);
    // 4. 遍历 bubble
    if (!se.__stopPropagation) {
        triggerEvents(bubble, se);
    }
}

function triggerEvents(paths: EventCallback[], se: SyntheticEvent) {
    for (let i = 0; i < paths.length; i++) {
        const ec = paths[i];
        if (ec) {
            unstable_runWithPriority(eventTypeToSchedulerPriority(se.type), () => {
                ec.call(null, se);
            });
        }
        if (se.__stopPropagation) {
            break;
        }
    }
}

function getEventNamesFromType(type: string): string[] | undefined {
    return {
        click: ['onClickCapture', 'onClick']
    }[type];
}

function collectPaths(targetElement: DOMElement, container: Container, eventType: string) {
    const paths: Paths = {
        capture: [],
        bubble: []
    };

    while (targetElement !== null && targetElement !== container) {
        if (targetElement[elementPropsKey]) {
            const props = targetElement[elementPropsKey];
            const eventNames = getEventNamesFromType(eventType);
            if (eventNames) {
                eventNames.forEach((e, i) => {
                    const eventCallback = props[e];
                    if (eventCallback) {
                        if (i === 0) {
                            paths.capture.unshift(eventCallback);
                        } else {
                            paths.bubble.push(eventCallback);
                        }
                    }
                });
            }
        }
        targetElement = targetElement.parentNode as DOMElement;
    }
    return paths;
}

function createSyntheticEvent(e: Event): SyntheticEvent {
    const se = e as SyntheticEvent;
    se.__stopPropagation = false;
    const originStopPropagation = e.stopPropagation;

    se.stopPropagation = () => {
        se.__stopPropagation = true;
        if (originStopPropagation) {
            originStopPropagation();
        }
    };

    return se;
}

export const eventTypeToSchedulerPriority = (eventType: string) => {
    switch (eventType) {
        case 'click':
        case 'keyup':
        case 'keydown':
            return unstable_ImmediatePriority;
        case 'scroll':
            return unstable_UserBlockingPriority;
        default:
            return unstable_NormalPriority;
    }
};
