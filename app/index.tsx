import { Redirect } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { restoreDriverRegistration, wasKilledDuringCamera } from '@/store/driverRegistrationStore';

export default function Index() {
    const { loading, accessToken, user } = useContext(AuthContext);
    const [resumeToLicense, setResumeToLicense] = useState<boolean | null>(null);

    useEffect(() => {
        let isMounted = true;
        async function checkPendingRegistration() {
            if (!accessToken && !loading) {
                const wasKilled = await wasKilledDuringCamera();
                if (wasKilled) {
                    const restored = await restoreDriverRegistration();
                    if (isMounted) {
                        setResumeToLicense(restored);
                        return;
                    }
                }
                if (isMounted) {
                    setResumeToLicense(false);
                }
            } else if (!loading) {
                if (isMounted) {
                    setResumeToLicense(false);
                }
            }
        }
        checkPendingRegistration();
        return () => {
            isMounted = false;
        };
    }, [loading, accessToken]);

    if (loading || (!accessToken && resumeToLicense === null)) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#FF5F00" />
            </View>
        );
    }

    if (accessToken) {
        if (user?.hasMpin) {
            return <Redirect href="/enter-mpin" />;
        }
        return <Redirect href="/(tabs)" />;
    }

    if (resumeToLicense) {
        return <Redirect href="/driving-license" />;
    }

    return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    }
});
