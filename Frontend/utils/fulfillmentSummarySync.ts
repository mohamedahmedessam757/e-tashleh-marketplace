/** Cross-component signal to refetch order fulfillment summary (returns/disputes). */

type Listener = (orderId?: string) => void;

const listeners = new Set<Listener>();
let seq = 0;

export function bumpFulfillmentSummary(orderId?: string) {
    seq += 1;
    listeners.forEach((listener) => {
        try {
            listener(orderId);
        } catch (err) {
            console.error('[fulfillmentSummarySync] listener failed', err);
        }
    });
}

export function onFulfillmentSummaryBump(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function getFulfillmentSummaryBumpSeq() {
    return seq;
}
