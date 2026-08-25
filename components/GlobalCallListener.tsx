import React, { useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { SocketContext } from '../context/SocketContext';
import RNCallKeep from 'react-native-callkeep';
import IncomingCallModal from './IncomingCallModal';

export default function GlobalCallListener() {
    const { socket, isConnected } = useContext(SocketContext);
    const router = useRouter();
    const pathname = usePathname();
    const [incomingCall, setIncomingCall] = useState<{ callerName: string; isVideo: boolean; rideId: string; uuid: string } | null>(null);

    // Initialize CallKeep
    useEffect(() => {
        const options = {
            ios: { appName: 'Finder' },
            android: {
                alertTitle: 'Permissions required',
                alertDescription: 'This application needs to access your phone accounts',
                cancelButton: 'Cancel',
                okButton: 'ok',
                additionalPermissions: [],
                selfManaged: true // Uses our own IncomingCallModal UI instead of system Phone UI!
            }
        };
        RNCallKeep.setup(options).then(accepted => {
            console.log('CallKeep setup:', accepted);
        });
        RNCallKeep.setAvailable(true);
    }, []);

    // Handle CallKeep events (Still needed if user interacts with a notification somehow)
    useEffect(() => {
        const answerListener = ({ callUUID }: any) => {
            if (incomingCall) {
                RNCallKeep.backToForeground();
                const { rideId, isVideo } = incomingCall;
                setIncomingCall(null);
                router.push(`/passenger-call?isVideo=${isVideo}&isReceiving=true&uuid=${incomingCall.uuid}`);
            }
        };
        
        const endListener = ({ callUUID }: any) => {
            if (incomingCall) {
                const { rideId } = incomingCall;
                if (socket) {
                    socket.emit('webrtc_call_denied', { rideId });
                }
                setIncomingCall(null);
            }
        };
        
        RNCallKeep.addEventListener('answerCall', answerListener);
        RNCallKeep.addEventListener('endCall', endListener);
        
        return () => {
            RNCallKeep.removeEventListener('answerCall');
            RNCallKeep.removeEventListener('endCall');
        };
    }, [incomingCall, socket, router]);

    // Handle WebSockets
    useEffect(() => {
        if (!socket || !isConnected) return;

        socket.on('webrtc_call_initiated', (data: { callerName: string; isVideo: boolean; rideId: string }) => {
            if (pathname === '/call-driver' || pathname === '/passenger-call') return;
            
            // Trigger native UI (Because selfManaged=true, this just notifies telecom of the audio state!)
            const callUUID = '11111111-2222-3333-4444-' + Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
            RNCallKeep.displayIncomingCall(callUUID, data.callerName, data.callerName, 'number', data.isVideo);
            setIncomingCall({ ...data, uuid: callUUID });
        });

        socket.on('webrtc_call_denied', () => {
            if (incomingCall?.uuid) RNCallKeep.endAllCalls();
            setIncomingCall(null);
        });

        socket.on('webrtc_end_call', () => {
            if (incomingCall?.uuid) RNCallKeep.endAllCalls();
            setIncomingCall(null);
        });

        return () => {
            socket.off('webrtc_call_initiated');
            socket.off('webrtc_call_denied');
            socket.off('webrtc_end_call');
        };
    }, [socket, isConnected, pathname, incomingCall]);

    const handleAccept = () => {
        if (incomingCall) {
            RNCallKeep.answerIncomingCall(incomingCall.uuid); // Notify telecom we answered
            const { isVideo } = incomingCall;
            setIncomingCall(null);
            router.push(`/passenger-call?isVideo=${isVideo}&isReceiving=true&uuid=${incomingCall.uuid}`);
        }
    };

    const handleDecline = () => {
        if (incomingCall) {
            RNCallKeep.rejectCall(incomingCall.uuid); // Notify telecom we declined
            const { rideId } = incomingCall;
            if (socket) {
                socket.emit('webrtc_call_denied', { rideId });
            }
            setIncomingCall(null);
        }
    };

    if (!incomingCall) return null;

    return (
        <IncomingCallModal 
            callerName={incomingCall.callerName} 
            isVideo={incomingCall.isVideo}
            onAccept={handleAccept} 
            onDecline={handleDecline} 
        />
    );
}
