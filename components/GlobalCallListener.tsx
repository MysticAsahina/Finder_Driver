import React, { useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { SocketContext } from '../context/SocketContext';
import RNCallKeep from 'react-native-callkeep';
import IncomingCallModal from './IncomingCallModal';

import { PermissionsAndroid } from 'react-native';
import { ensureCallPermission } from '../utils/callPermissions';

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
                additionalPermissions: [PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS],
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

        const handleCallInitiated = async (data: { callerName: string; isVideo: boolean; rideId: string }) => {
            if (pathname === '/call-driver' || pathname === '/passenger-call') return;
            
            const callUUID = '11111111-2222-3333-4444-' + Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
            
            // Only notify Telecom framework if permission is granted; always show our own modal
            const hasPermission = await ensureCallPermission();
            if (hasPermission) {
                try {
                    RNCallKeep.displayIncomingCall(callUUID, data.callerName, data.callerName, 'number', data.isVideo);
                } catch (e) {
                    console.warn('CallKeep displayIncomingCall failed:', e);
                }
            }
            setIncomingCall({ ...data, uuid: callUUID });
        };

        const handleCallDenied = () => {
            if (incomingCall?.uuid) RNCallKeep.endAllCalls();
            setIncomingCall(null);
        };

        const handleEndCall = () => {
            if (incomingCall?.uuid) RNCallKeep.endAllCalls();
            setIncomingCall(null);
        };

        socket.on('webrtc_call_initiated', handleCallInitiated);
        socket.on('webrtc_call_denied', handleCallDenied);
        socket.on('webrtc_end_call', handleEndCall);

        return () => {
            socket.off('webrtc_call_initiated', handleCallInitiated);
            socket.off('webrtc_call_denied', handleCallDenied);
            socket.off('webrtc_end_call', handleEndCall);
        };
    }, [socket, isConnected, pathname, incomingCall]);

    const handleAccept = async () => {
        if (incomingCall) {
            const hasPermission = await ensureCallPermission();
            if (hasPermission) {
                try {
                    RNCallKeep.answerIncomingCall(incomingCall.uuid);
                } catch (e) {
                    console.warn('CallKeep answerIncomingCall failed:', e);
                }
            }
            const { isVideo } = incomingCall;
            setIncomingCall(null);
            router.push(`/passenger-call?isVideo=${isVideo}&isReceiving=true&uuid=${incomingCall.uuid}`);
        }
    };

    const handleDecline = () => {
        if (incomingCall) {
            try {
                RNCallKeep.rejectCall(incomingCall.uuid);
            } catch (e) {
                console.warn('CallKeep rejectCall failed:', e);
            }
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
