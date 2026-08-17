import { useEffect, useRef, useContext } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';

// 5 minutes timeout
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

export default function AppLifecycleObserver() {
    const appState = useRef(AppState.currentState);
    const backgroundTime = useRef<number | null>(null);
    const router = useRouter();
    const segments = useSegments();
    const { user } = useContext(AuthContext);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                // App has come to the foreground
                if (backgroundTime.current && user?.hasMpin) {
                    const elapsed = Date.now() - backgroundTime.current;
                    if (elapsed > LOCK_TIMEOUT_MS) {
                        // Avoid redirecting if already on enter-mpin
                        if (!(segments as string[]).includes('enter-mpin')) {
                            router.replace('/enter-mpin' as any);
                        }
                    }
                }
            } else if (
                appState.current === 'active' &&
                nextAppState.match(/inactive|background/)
            ) {
                // App has gone to the background
                backgroundTime.current = Date.now();
            }

            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, [user?.hasMpin, segments, router]);

    return null;
}
