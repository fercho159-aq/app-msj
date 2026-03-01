import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { DeadlineSeverity } from '../../types';

const SEVERITY_COLORS: Record<DeadlineSeverity, string> = {
    red: '#EF4444',
    yellow: '#F59E0B',
    green: '#10B981',
};

interface DeadlineTrafficLightProps {
    severity: DeadlineSeverity;
    size?: number;
}

export const DeadlineTrafficLight: React.FC<DeadlineTrafficLightProps> = ({
    severity,
    size = 10,
}) => {
    const color = SEVERITY_COLORS[severity];
    return (
        <View style={[
            styles.dot,
            {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                shadowColor: color,
            },
        ]} />
    );
};

export function getDeadlineSeverity(deadline: string | null): DeadlineSeverity | null {
    if (!deadline) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline + 'T00:00:00');
    const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'red';
    if (diffDays <= 7) return 'yellow';
    return 'green';
}

const styles = StyleSheet.create({
    dot: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 3,
    },
});
