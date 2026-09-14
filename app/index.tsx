import { Redirect } from 'expo-router';
import { useContext } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthContext } from '@/context/AuthContext';

export default function Index() {
    const { loading, accessToken, user } = useContext(AuthContext);

    if (loading) {
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
