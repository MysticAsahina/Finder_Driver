import React, { useState, useRef, useEffect, useContext } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SocketContext } from '../context/SocketContext';
import api from '@/utils/axios';

const ACCENT = '#FF5F00';

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    time: string;
}



function getTime() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

export default function PassengerChatScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const scrollRef = useRef<ScrollView>(null);
    const params = useLocalSearchParams<{ name?: string, rideId?: string }>();
    const passengerName = params.name || 'Passenger';
    const { socket, isConnected } = useContext(SocketContext);

    const [inputText, setInputText] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [status, setStatus] = useState<string>('active');

    useEffect(() => {
        if (!params.rideId) return;

        const loadMessages = async () => {
            try {
                const res = await api.get(`/driver/ride/${params.rideId}/chat`);
                if (res.data.messages) {
                    const mapped = res.data.messages.map((m: any) => ({
                        id: m.id,
                        text: m.text,
                        isUser: m.senderRole === 'driver',
                        time: m.time
                    }));
                    setMessages(mapped);
                }
            } catch (err: any) {
                if (err.response?.status === 400) {
                    setStatus('closed');
                }
                console.error("Failed to load messages", err);
            }
        };

        loadMessages();
    }, [params.rideId]);

    useEffect(() => {
        if (socket && isConnected) {
            socket.on('receive_ride_message', (msg) => {
                const newMsg: Message = {
                    id: msg.id,
                    text: msg.text,
                    isUser: msg.from === 'driver',
                    time: msg.time
                };
                setMessages(prev => {
                    if (prev.find(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
            });
        }
        return () => {
            socket?.off('receive_ride_message');
        };
    }, [socket, isConnected]);

    const sendMessage = async () => {
        if (!inputText.trim() || status === 'closed') return;

        const msgId = Date.now().toString();
        const msgTime = getTime();
        const userMsg: Message = {
            id: msgId,
            text: inputText.trim(),
            isUser: true,
            time: msgTime,
        };

        setMessages((prev) => [...prev, userMsg]);
        setInputText('');
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            await api.post(`/driver/ride/${params.rideId}/chat`, { text: userMsg.text, time: msgTime, id: msgId });
        } catch (err: any) {
            console.error('Failed to send message:', err);
            setMessages(prev => prev.filter(m => m.id !== msgId));
            if (err.response?.status === 400) {
                setStatus('closed');
            }
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                    <View style={styles.backCircle}>
                        <Ionicons name="chevron-back" size={20} color="#555" />
                    </View>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{passengerName}</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.actionIcon}
                        activeOpacity={0.6}
                        onPress={() => router.push({ pathname: '/passenger-call', params: { name: passengerName, isVideo: 'false' } })}
                    >
                        <Ionicons name="call" size={22} color={ACCENT} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionIcon}
                        activeOpacity={0.6}
                        onPress={() => router.push({ pathname: '/passenger-call', params: { name: passengerName, isVideo: 'true' } })}
                    >
                        <Ionicons name="videocam" size={26} color={ACCENT} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* KeyboardAvoidingView wraps ONLY the chat body + input */}
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    ref={scrollRef}
                    style={styles.chatArea}
                    contentContainerStyle={[
                        styles.chatContent,
                        { paddingBottom: insets.bottom + 8 },
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={() =>
                        scrollRef.current?.scrollToEnd({ animated: true })
                    }
                >
                    {/* Passenger card */}
                    <View style={styles.passengerCard}>
                        <View style={styles.passengerAvatar}>
                            <Ionicons name="person" size={24} color={ACCENT} />
                        </View>
                        <View>
                            <Text style={styles.passengerName}>{passengerName}</Text>
                            <View style={styles.statusRow}>
                                <View style={styles.onlineDot} />
                                <Text style={styles.statusText}>Online now</Text>
                            </View>
                        </View>
                    </View>

                    {/* Messages */}
                    {messages.map((msg) => (
                        <View
                            key={msg.id}
                            style={[
                                styles.messageBubbleWrap,
                                msg.isUser && styles.userBubbleWrap,
                            ]}
                        >
                            <View
                                style={[
                                    styles.messageBubble,
                                    msg.isUser ? styles.userBubble : styles.passengerBubble,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.messageText,
                                        msg.isUser && styles.userMessageText,
                                    ]}
                                >
                                    {msg.text}
                                </Text>
                            </View>
                            <Text style={[styles.messageTime, msg.isUser && styles.userTime]}>
                                {msg.time}
                            </Text>
                        </View>
                    ))}
                </ScrollView>

                {/* Input bar */}
                {status === 'closed' ? (
                    <View style={[styles.inputBar, { justifyContent: 'center', paddingVertical: 20 }]}>
                        <Text style={{ color: '#888', fontStyle: 'italic' }}>Chat is closed for this ride.</Text>
                    </View>
                ) : (
                    <View style={[styles.inputBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 }]}>
                        <TouchableOpacity style={styles.plusBtn} activeOpacity={0.7}>
                            <Ionicons name="add" size={24} color={ACCENT} />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.textInput}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="Write a message..."
                            placeholderTextColor="#bbb"
                            onSubmitEditing={sendMessage}
                            returnKeyType="send"
                        />
                        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} activeOpacity={0.7}>
                            <Ionicons name="send" size={20} color={ACCENT} />
                        </TouchableOpacity>
                    </View>
                )}
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    flex: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    backCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: ACCENT,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    actionIcon: {
        padding: 4,
    },
    chatArea: {
        flex: 1,
    },
    chatContent: {
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    passengerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#FFD0B0',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 14,
        marginBottom: 16,
        gap: 12,
        backgroundColor: '#FFF3EC',
    },
    passengerAvatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#FFD0B0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    passengerName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#333',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 2,
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4caf50',
    },
    statusText: {
        fontSize: 12,
        color: '#4caf50',
        fontWeight: '500',
    },
    messageBubbleWrap: {
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    userBubbleWrap: {
        alignItems: 'flex-end',
    },
    messageBubble: {
        maxWidth: '80%',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    passengerBubble: {
        backgroundColor: '#f0f0f0',
        borderTopLeftRadius: 4,
    },
    userBubble: {
        backgroundColor: ACCENT,
        borderTopRightRadius: 4,
    },
    messageText: {
        fontSize: 13.5,
        color: '#333',
        lineHeight: 20,
    },
    userMessageText: {
        color: '#fff',
    },
    messageTime: {
        fontSize: 11,
        color: '#bbb',
        marginTop: 4,
        paddingLeft: 4,
    },
    userTime: {
        paddingRight: 4,
        paddingLeft: 0,
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 8,
        backgroundColor: '#fff',
    },
    plusBtn: {
        padding: 4,
    },
    textInput: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 50,
        paddingHorizontal: 18,
        paddingVertical: 12,
        fontSize: 14,
        color: '#333',
    },
    sendBtn: {
        padding: 6,
    },
});
