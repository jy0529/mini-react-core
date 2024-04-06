let syncQueue: ((...args: any) => void)[] = [];
let isFlushing = false;
export function scheduleSyncCallback(callback: (...args: any) => void) {
    if (syncQueue === null) {
        syncQueue = [callback];
    } else {
        syncQueue.push(callback);
    }
}

export function flushSyncCallbacks() {
    if (isFlushing) return;
    isFlushing = true;
    try {
        if (syncQueue.length > 0) {
            syncQueue.forEach((callback) => {
                callback();
            });
        }
    } catch (e) {
        if (__DEV__) {
            console.error('flushSyncCallbacks error', e);
        }
    } finally {
        isFlushing = false;
        syncQueue = [];
    }
}
