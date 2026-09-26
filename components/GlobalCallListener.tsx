import React, { useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { SocketContext } from '../context/SocketContext';
import RNCallKeep from 'react-native-callkeep';
import IncomingCallModal from './IncomingCallModal';

import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { ensureCallPermission } from '../utils/callPermissions';

export default function GlobalCallListener() {
    const { socket, isConnected } = useContext(SocketContext);
    const { setUser, setAccessToken } = useContext(AuthContext);
    const router = useRouter();
    const pathname = usePathname();
    const [incomingCall, setIncomingCall] = useState<{ callerName: string; isVideo: boolean; rideId: string; uuid: string } | null>(null);

    const isCallKeepAvailable = (Platform.OS as string) !== 'web' && RNCallKeep && typeof (RNCallKeep as any)?.setup === 'function';

    // Initialize CallKeep
    useEffect(() => {
        if (!isCallKeepAvailable) return;
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
        try {
            RNCallKeep.setup(options).then(accepted => {
                console.log('CallKeep setup:', accepted);
            }).catch(e => console.warn('CallKeep setup err:', e));
            RNCallKeep.setAvailable(true);
        } catch (e) {
            console.warn('CallKeep not supported in current environment');
        }
    }, [isCallKeepAvailable]);

    // Handle CallKeep events (Still needed if user interacts with a notification somehow)
    useEffect(() => {
        if (!isCallKeepAvailable) return;
        const answerListener = ({ callUUID }: any) => {
            if (incomingCall) {
                try { RNCallKeep.backToForeground(); } catch (e) {}
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
        
        try {
            RNCallKeep.addEventListener('answerCall', answerListener);
            RNCallKeep.addEventListener('endCall', endListener);
        } catch (e) {}
        
        return () => {
            try {
                RNCallKeep.removeEventListener('answerCall');
                RNCallKeep.removeEventListener('endCall');
            } catch (e) {}
        };
    }, [incomingCall, socket, router, isCallKeepAvailable]);

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
            if (incomingCall?.uuid && isCallKeepAvailable) {
                try { RNCallKeep.endAllCalls(); } catch (e) {}
            }
            setIncomingCall(null);
        };

        const handleEndCall = () => {
            if (incomingCall?.uuid && isCallKeepAvailable) {
                try { RNCallKeep.endAllCalls(); } catch (e) {}
            }
            setIncomingCall(null);
        };

        const handleAccountWarning = (data: { message: string }) => {
            Alert.alert('Official Warning', data.message);
        };

        const handleAccountRestricted = (data: { message: string }) => {
            Alert.alert('Account Restricted', data.message);
            setUser(null);
            setAccessToken(null);
            router.replace('/login');
        };

        socket.on('account_warning', handleAccountWarning);
        socket.on('account_restricted', handleAccountRestricted);
        socket.on('webrtc_call_initiated', handleCallInitiated);
        socket.on('webrtc_call_denied', handleCallDenied);
        socket.on('webrtc_end_call', handleEndCall);

        return () => {
            socket.off('account_warning', handleAccountWarning);
            socket.off('account_restricted', handleAccountRestricted);
            socket.off('webrtc_call_initiated', handleCallInitiated);
            socket.off('webrtc_call_denied', handleCallDenied);
            socket.off('webrtc_end_call', handleEndCall);
        };
    }, [socket, isConnected, pathname, incomingCall]);

    const handleAccept = async () => {
        if (incomingCall) {
            if (isCallKeepAvailable) {
                const hasPermission = await ensureCallPermission();
                if (hasPermission) {
                    try {
                        RNCallKeep.answerIncomingCall(incomingCall.uuid);
                    } catch (e) {
                        console.warn('CallKeep answerIncomingCall failed:', e);
                    }
                }
            }
            const { isVideo } = incomingCall;
            setIncomingCall(null);
            router.push(`/passenger-call?isVideo=${isVideo}&isReceiving=true&uuid=${incomingCall.uuid}`);
        }
    };

    const handleDecline = () => {
        if (incomingCall) {
            if (isCallKeepAvailable) {
                try {
                    RNCallKeep.rejectCall(incomingCall.uuid);
                } catch (e) {
                    console.warn('CallKeep rejectCall failed:', e);
                }
            }
            const { rideId } = incomingCall;
            if (socket) {
                socket.emit('webrtc_call_denied', { rideId });
            }
            setIncomingCall(null);
        }
    };

    if (Platform.OS === 'web' || !incomingCall) return null;

    return (
        <IncomingCallModal 
            callerName={incomingCall.callerName} 
            isVideo={incomingCall.isVideo}
            onAccept={handleAccept} 
            onDecline={handleDecline} 
        />
    );
}
