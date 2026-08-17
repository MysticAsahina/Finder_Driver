import { Redirect } from 'expo-router';
import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

export default function Index() {
    const { loading, accessToken, user } = useContext(AuthContext);

    if (loading) return null;

    if (accessToken) {
        if (user?.hasMpin) {
            return <Redirect href="/enter-mpin" />;
        }
        return <Redirect href="/(tabs)" />;
    }

    return <Redirect href="/login" />;
}
