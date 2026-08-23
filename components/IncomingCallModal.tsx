import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

export default function IncomingCallModal({ 
    callerName, 
    isVideo,
    onAccept, 
    onDecline 
}: { 
    callerName: string;
    isVideo: boolean;
    onAccept: () => void;
    onDecline: () => void;
}) {
    return (
        <Modal transparent animationType="slide">
            <SafeAreaView style={styles.container}>
                <View style={styles.content}>
                    <View style={styles.topSection}>
                        <Text style={styles.name}>{callerName}</Text>
                        <Text style={styles.status}>Incoming {isVideo ? 'Video' : 'Audio'} Call...</Text>
                    </View>
                    
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarInitial}>{callerName.charAt(0)}</Text>
                        </View>
                    </View>
                    
                    <View style={styles.controlsContainer}>
                        <TouchableOpacity style={styles.declineBtn} onPress={onDecline} activeOpacity={0.8}>
                            <Ionicons name="close" size={32} color="#fff" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.8}>
                            <Ionicons name="call" size={32} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 40,
    },
    topSection: {
        alignItems: 'center',
        marginTop: 60,
    },
    name: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    status: {
        fontSize: 18,
        color: '#ccc',
    },
    avatarContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: Colors.light.tint,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 64,
        fontWeight: 'bold',
        color: '#fff',
    },
    controlsContainer: {
        flexDirection: 'row',
        gap: 60,
        marginBottom: 40,
    },
    declineBtn: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#ff3b30',
        justifyContent: 'center',
        alignItems: 'center',
    },
    acceptBtn: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#34c759',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
