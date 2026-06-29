import { Colors } from '@/constants/theme';
import { AuthContext } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
    FlatList, KeyboardAvoidingView, Platform,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View, AppState, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { io, Socket } from 'socket.io-client';
import api from '@/utils/axios';

const ACCENT = Colors.light.tint;
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

type Message = {
    _id: string;
    ticketId: string;
    senderId: string;
    senderRole: 'passenger' | 'driver' | 'admin';
    body: string;
    createdAt: string;
};

export default function SupportChatScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { accessToken } = useContext(AuthContext);
    const [msgs, setMsgs] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [ticketId, setTicketId] = useState<string | null>(null);
    const [isResolved, setIsResolved] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const listRef = useRef<FlatList>(null);

    const ensureTicket = async () => {
        try {
            if (!ticketId) {
                const ticketsRes = await api.get('/support/tickets');
                const ticketsData = ticketsRes.data;
                const openTicket = ticketsData.tickets?.find(
                    (t: any) => t.status === 'open' || t.status === 'in_progress'
                );

                let activeTicketId = null;
                if (openTicket) {
                    activeTicketId = openTicket._id;
                } else {
                    const createRes = await api.post('/support/tickets', { subject: 'General Support' });
                    activeTicketId = createRes.data.ticket._id;
                }
                setTicketId(activeTicketId);
                return activeTicketId;
            }
            return ticketId;
        } catch (err) {
            console.error('Failed to ensure ticket', err);
            return null;
        }
    };

    useEffect(() => {
        if (!accessToken) return;

        let socket: Socket;

        async function initialize() {
            const activeTicketId = await ensureTicket();
            if (!activeTicketId) return;

            const msgsRes = await api.get(`/support/tickets/${activeTicketId}/messages`);
            const msgsData = msgsRes.data;
            setMsgs(msgsData.messages || []);
            setIsResolved(msgsData.status === 'resolved');

            socket = io(API_URL, {
                auth: { token: accessToken },
                transports: ['websocket'],
            });

            socket.on('connect', () => {
                socket.emit('join_ticket', { ticketId: activeTicketId });
            });

            socket.on('receive_message', (newMsg: Message) => {
                setMsgs(prev => {
                    if (prev.some(m => m._id === newMsg._id)) return prev;
                    const isOwnOptimistic = prev.some(m => 
                        m.body === newMsg.body && 
                        m.senderRole === newMsg.senderRole && 
                        m._id.length < 24
                    );
                    if (isOwnOptimistic) return prev;
                    return [...prev, newMsg];
                });
            });

            socket.on('ticket_resolved', () => {
                setIsResolved(true);
            });

            socketRef.current = socket;
        }

        initialize();

        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                if (socket && !socket.connected) {
                    socket.connect();
                }
            } else if (nextAppState === 'background' || nextAppState === 'inactive') {
                if (socket && socket.connected) {
                    socket.disconnect();
                }
            }
        });

        return () => {
            subscription.remove();
            if (socket) socket.disconnect();
        };
    }, [accessToken]);

    useEffect(() => {
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }, [msgs]);

    const send = async () => {
        const text = input.trim();
        if (!text || sending) return;

        const activeTicketId = await ensureTicket();
        if (!activeTicketId) return;

        setSending(true);
        setInput('');

        const optimisticMsg: Message = {
            _id: Date.now().toString(),
            ticketId: activeTicketId,
            senderId: '',
            senderRole: 'driver',
            body: text,
            createdAt: new Date().toISOString(),
        };
        setMsgs(prev => [...prev, optimisticMsg]);

        try {
            const res = await api.post(`/support/tickets/${activeTicketId}/messages`, { body: text });
            const data = res.data;
            setMsgs(prev => {
                if (prev.some(m => m._id === data.message._id)) {
                    return prev.filter(m => m._id !== optimisticMsg._id);
                }
                return prev.map(m => m._id === optimisticMsg._id ? data.message : m);
            });
        } catch (err) {
            console.error('Failed to send message:', err);
            Alert.alert('Error', 'Failed to send message');
            setMsgs(prev => prev.filter(m => m._id !== optimisticMsg._id));
        } finally {
            setSending(false);
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
                <Text style={styles.headerTitle}>Customer Support</Text>
                <View style={{ width: 38 }} />
            </View>

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <FlatList
                    ref={listRef}
                    data={msgs}
                    keyExtractor={m => m._id}
                    renderItem={({ item }) => (
                        <View style={[styles.messageBubbleWrap, item.senderRole === 'driver' && styles.userBubbleWrap]}>
                            <View style={[styles.messageBubble, item.senderRole === 'driver' ? styles.userBubble : styles.botBubble]}>
                                <Text style={[styles.messageText, item.senderRole === 'driver' && styles.userMessageText]}>
                                    {item.body}
                                </Text>
                            </View>
                            <Text style={[styles.messageTime, item.senderRole === 'driver' && styles.userTime]}>
                                {new Date(item.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </Text>
                        </View>
                    )}
                    contentContainerStyle={[styles.chatContent, { paddingBottom: insets.bottom + 8 }]}
                    onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
                    ListHeaderComponent={
                        <View style={styles.agentCard}>
                            <View style={styles.agentIcon}>
                                <Ionicons name="headset" size={26} color={ACCENT} />
                            </View>
                            <View>
                                <Text style={styles.agentName}>Finder Customer Support</Text>
                                <View style={styles.statusRow}>
                                    <View style={styles.onlineDot} />
                                    <Text style={styles.statusText}>Online now</Text>
                                </View>
                            </View>
                        </View>
                    }
                    ListFooterComponent={<View style={{ paddingBottom: 10 }} />}
                />

                {/* Input bar */}
                {isResolved ? (
                    <View style={[styles.inputBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10, justifyContent: 'center' }]}>
                        <Text style={{ color: '#888', fontStyle: 'italic', marginVertical: 10 }}>This ticket has been resolved.</Text>
                    </View>
                ) : (
                    <View style={[styles.inputBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 }]}>
                        <TouchableOpacity style={styles.plusBtn} activeOpacity={0.7}>
                            <Ionicons name="add" size={24} color={ACCENT} />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.textInput}
                            value={input}
                            onChangeText={setInput}
                            placeholder="Write a message..."
                            placeholderTextColor="#bbb"
                            onSubmitEditing={send}
                            returnKeyType="send"
                        />
                        <TouchableOpacity style={styles.sendBtn} onPress={send} activeOpacity={0.7}>
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
    chatContent: {
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    agentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#ffe0c0',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 14,
        marginBottom: 16,
        gap: 12,
        backgroundColor: '#fff8f2',
    },
    agentIcon: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#ffe8d4',
        alignItems: 'center',
        justifyContent: 'center',
    },
    agentName: {
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
    botBubble: {
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
