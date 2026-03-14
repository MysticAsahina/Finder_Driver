import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function PassengerCallScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ name?: string; isVideo?: string }>();
    const passengerName = params.name || 'Passenger';
    const initialVideo = params.isVideo === 'true';

    const [isSpeaker, setIsSpeaker] = useState(false);
    const [isVideo, setIsVideo] = useState(initialVideo);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>

                {/* Header: User Info */}
                <View style={styles.topSection}>
                    <Text style={styles.name}>{passengerName}</Text>
                    <Text style={styles.status}>Calling...</Text>
                </View>

                {/* Main Avatar / Video Area */}
                <View style={styles.avatarContainer}>
                    {isVideo ? (
                        <View style={styles.videoPlaceholder}>
                            <Ionicons name="person" size={100} color="#444" />
                            <Text style={styles.videoText}>Camera is ON</Text>
                        </View>
                    ) : (
                        <View style={styles.audioAvatar}>
                            <Text style={styles.avatarInitial}>{passengerName.charAt(0)}</Text>
                        </View>
                    )}
                </View>

                {/* Bottom Controls */}
                <View style={styles.controlsContainer}>
                    {/* Speaker Toggle */}
                    <TouchableOpacity
                        style={[styles.controlBtn, isSpeaker && styles.activeBtn]}
                        onPress={() => setIsSpeaker(!isSpeaker)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={isSpeaker ? "volume-high" : "volume-medium"}
                            size={28}
                            color={isSpeaker ? "#000" : "#fff"}
                        />
                    </TouchableOpacity>

                    {/* Camera Toggle */}
                    <TouchableOpacity
                        style={[styles.controlBtn, !isVideo && styles.activeBtn]}
                        onPress={() => setIsVideo(!isVideo)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={isVideo ? "videocam" : "videocam-off"}
                            size={28}
                            color={!isVideo ? "#000" : "#fff"}
                        />
                    </TouchableOpacity>

                    {/* End Call Button */}
                    <TouchableOpacity
                        style={styles.endCallBtn}
                        onPress={() => router.back()}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name="call"
                            size={32}
                            color="#fff"
                            style={{ transform: [{ rotate: '135deg' }] }}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 20,
    },
    topSection: {
        alignItems: 'center',
        marginTop: 40,
    },
    name: {
        fontSize: 30,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 8,
    },
    status: {
        fontSize: 16,
        color: '#aaa',
        letterSpacing: 1,
    },
    avatarContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    audioAvatar: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: '#FF5F00',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#FF5F00',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
    },
    avatarInitial: {
        fontSize: 64,
        fontWeight: '700',
        color: '#fff',
    },
    videoPlaceholder: {
        width: '85%',
        height: '70%',
        backgroundColor: '#2a2a2a',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#3a3a3a',
    },
    videoText: {
        color: '#777',
        marginTop: 20,
        fontSize: 16,
        fontWeight: '500',
    },
    controlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        marginBottom: 30,
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 40,
        paddingVertical: 24,
        borderRadius: 50,
    },
    controlBtn: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#3a3a3a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeBtn: {
        backgroundColor: '#e0e0e0', // White-ish when active/toggled
    },
    endCallBtn: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#ff3b30', // Red to hang up
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
});
