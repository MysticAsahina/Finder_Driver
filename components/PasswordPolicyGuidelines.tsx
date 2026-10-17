import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

interface PasswordPolicyGuidelinesProps {
  password?: string;
  confirmPassword?: string;
  style?: ViewStyle;
}

/**
 * Renders the system password policy guidelines.
 * Displays interactive live checkmarks when password is provided,
 * or clear static guidelines when password is omitted.
 */
export default function PasswordPolicyGuidelines({
  password,
  confirmPassword,
  style,
}: PasswordPolicyGuidelinesProps) {
  const isInteractive = typeof password === 'string';

  const rules = [
    {
      id: 'length',
      label: '8–128 characters',
      fulfilled: isInteractive ? password.length >= 8 && password.length <= 128 : false,
    },
    {
      id: 'upper',
      label: 'At least 1 uppercase letter (A–Z)',
      fulfilled: isInteractive ? /(?=.*[A-Z])/.test(password) : false,
    },
    {
      id: 'lower',
      label: 'At least 1 lowercase letter (a–z)',
      fulfilled: isInteractive ? /(?=.*[a-z])/.test(password) : false,
    },
    {
      id: 'number',
      label: 'At least 1 number (0–9)',
      fulfilled: isInteractive ? /(?=.*\d)/.test(password) : false,
    },
    {
      id: 'special',
      label: 'At least 1 special character (!@#$%...)',
      fulfilled: isInteractive ? /(?=.*[^A-Za-z0-9])/.test(password) : false,
    },
  ];

  if (typeof confirmPassword === 'string') {
    rules.push({
      id: 'match',
      label: 'Passwords match',
      fulfilled: password.length > 0 && confirmPassword.length > 0 && password === confirmPassword,
    });
  }

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>Password Requirements:</Text>
      <View style={styles.list}>
        {rules.map((rule) => {
          const isDone = isInteractive && rule.fulfilled;
          return (
            <View key={rule.id} style={styles.itemRow}>
              <Text style={[styles.bullet, isDone && styles.bulletDone]}>
                {isDone ? '✓' : '•'}
              </Text>
              <Text style={[styles.itemText, isDone && styles.itemTextDone]}>
                {rule.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF8F4',
    borderWidth: 1,
    borderColor: '#FFE0CC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginVertical: 12,
  },
  title: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FF5F00',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  list: {
    gap: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bullet: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888888',
    width: 14,
    textAlign: 'center',
  },
  bulletDone: {
    color: '#16A34A',
  },
  itemText: {
    fontSize: 12,
    color: '#555555',
    lineHeight: 18,
  },
  itemTextDone: {
    color: '#16A34A',
    fontWeight: '600',
  },
});
