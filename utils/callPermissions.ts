import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';

/**
 * Checks and requests READ_PHONE_NUMBERS permission required by CallKeep.
 * Returns true if permission is granted, false otherwise.
 * Shows appropriate alerts when permission is denied.
 */
export async function ensureCallPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS
    );

    if (granted) return true;

    const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
        {
            title: 'Phone Permission Required',
            message: 'Finder needs phone access to manage calls. Without this permission, calls cannot be made or received.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
        }
    );

    if (result === PermissionsAndroid.RESULTS.GRANTED) return true;

    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Alert.alert(
            'Permission Required',
            'Phone permission has been permanently denied. Please enable it in Settings to use the call feature.',
            [
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    } else {
        Alert.alert(
            'Permission Required',
            'Phone permission is required to make and receive calls.',
            [{ text: 'OK' }]
        );
    }

    return false;
}
