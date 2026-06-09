import { Redirect } from 'expo-router';
import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

export default function Index() {
    const { loading, accessToken } = useContext(AuthContext);

    if (loading) return null;

    return accessToken
        ? <Redirect href="/(tabs)" />
        : <Redirect href="/login" />;
}
