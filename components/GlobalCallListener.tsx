import React, { useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { SocketContext } from '../context/SocketContext';
import IncomingCallModal from './IncomingCallModal';

export default function GlobalCallListener() {
    const { socket, isConnected } = useContext(SocketContext);
    const router = useRouter();
    const pathname = usePathname();
    const [incomingCall, setIncomingCall] = useState<{ callerName: string; isVideo: boolean; rideId: string } | null>(null);

    useEffect(() => {
        if (!socket || !isConnected) return;

        socket.on('webrtc_call_initiated', (data: { callerName: string; isVideo: boolean; rideId: string }) => {
            if (pathname === '/call-driver' || pathname === '/passenger-call') return;
            setIncomingCall(data);
        });

        socket.on('webrtc_call_denied', () => {
            setIncomingCall(null);
        });

        socket.on('webrtc_end_call', () => {
            setIncomingCall(null);
        });

        return () => {
            socket.off('webrtc_call_initiated');
            socket.off('webrtc_call_denied');
            socket.off('webrtc_end_call');
        };
    }, [socket, isConnected, pathname]);

    if (!incomingCall) return null;

    const handleAccept = () => {
        const { rideId, isVideo } = incomingCall;
        setIncomingCall(null);
        // We route to our own call screen, but since we are receiving, we are answering
        router.push(`/passenger-call?isVideo=${isVideo}&isReceiving=true`);
    };

    const handleDecline = () => {
        const { rideId } = incomingCall;
        socket?.emit('webrtc_call_denied', { rideId });
        setIncomingCall(null);
    };

    return (
        <IncomingCallModal 
            callerName={incomingCall.callerName} 
            isVideo={incomingCall.isVideo}
            onAccept={handleAccept} 
            onDecline={handleDecline} 
        />
    );
}
