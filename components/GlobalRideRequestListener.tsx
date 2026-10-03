import React, { useContext, useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { SocketContext } from '../context/SocketContext';
import { Animated, StyleSheet, Text, TouchableOpacity, SafeAreaView, View } from 'react-native';
import { Colors } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function GlobalRideRequestListener() {
    const { socket, isConnected } = useContext(SocketContext);
    const router = useRouter();
    const pathname = usePathname();
    const [hasRequest, setHasRequest] = useState(false);
    const translateY = useRef(new Animated.Value(-150)).current;

    useEffect(() => {
        if (!socket || !isConnected) return;

        const handleRideRequest = (data: any) => {
            if (pathname !== '/' && pathname !== '/index') {
                setHasRequest(true);
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                }).start();
            }
        };

        const handleRideExpired = () => {
            Animated.timing(translateY, {
                toValue: -150,
                duration: 300,
                useNativeDriver: true,
            }).start(() => setHasRequest(false));
        };

        socket.on('ride_request', handleRideRequest);
        socket.on('ride_request_expired', handleRideExpired);
        // Also listen for cancelled, to remove the banner
        socket.on('ride_cancelled', handleRideExpired);

        return () => {
            socket.off('ride_request', handleRideRequest);
            socket.off('ride_request_expired', handleRideExpired);
            socket.off('ride_cancelled', handleRideExpired);
        };
    }, [socket, isConnected, pathname, translateY]);

    if (!hasRequest) return null;

    return (
        <SafeAreaView style={styles.safeArea} pointerEvents="box-none">
            <Animated.View style={[styles.toastContainer, { transform: [{ translateY }] }]}>
                <TouchableOpacity
                    style={styles.toast}
                    activeOpacity={0.9}
                    onPress={() => {
                        Animated.timing(translateY, {
                            toValue: -150,
                            duration: 200,
                            useNativeDriver: true,
                        }).start(() => setHasRequest(false));
                        router.push('/');
                    }}
                >
                    <View style={styles.iconContainer}>
                        <Ionicons name="car" size={24} color="#fff" />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.title}>New Ride Request</Text>
                        <Text style={styles.subtitle}>Tap here to view the details.</Text>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        position: 'absolute',
        top: 0,
        width: '100%',
        zIndex: 9999,
    },
    toastContainer: {
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    toast: {
        backgroundColor: Colors.light.tint,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    iconContainer: {
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 2,
    },
    subtitle: {
        color: '#fff',
        fontSize: 14,
        opacity: 0.9,
    },
});
