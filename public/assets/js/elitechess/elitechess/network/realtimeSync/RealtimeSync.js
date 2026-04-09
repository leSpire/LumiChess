export class NoopRealtimeSync {
    publishMove(_move) {
        // extension point for websocket sync / spectator mode
    }
    onRemoteMove(_listener) {
        return () => undefined;
    }
}
