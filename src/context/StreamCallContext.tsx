// STREAM CALL CONTEXT - DEPRECATED
// Este archivo ha sido reemplazado por AgoraCallContext.tsx
// Se mantiene para evitar errores de importación en caso de que algo lo referencie

import React, { createContext, useContext, ReactNode } from 'react';

interface StreamCallContextType {
    client: null;
    currentCall: null;
    isConnected: boolean;
    isInCall: boolean;
    isMuted: boolean;
    isSpeakerOn: boolean;
    callDuration: number;
    isStreamAvailable: boolean;
    startAudioCall: (targetUserId: string, targetUserName: string) => Promise<void>;
    joinCall: (callId: string) => Promise<void>;
    endCall: () => Promise<void>;
    toggleMute: () => void;
    toggleSpeaker: () => void;
}

const StreamCallContext = createContext<StreamCallContextType | undefined>(undefined);

interface StreamCallProviderProps {
    children: ReactNode;
}

export const StreamCallProvider: React.FC<StreamCallProviderProps> = ({ children }) => {
    const value: StreamCallContextType = {
        client: null,
        currentCall: null,
        isConnected: false,
        isInCall: false,
        isMuted: false,
        isSpeakerOn: false,
        callDuration: 0,
        isStreamAvailable: false,
        startAudioCall: async () => {
            console.warn('StreamCallProvider is deprecated. Use AgoraCallProvider instead.');
        },
        joinCall: async () => { },
        endCall: async () => { },
        toggleMute: () => { },
        toggleSpeaker: () => { },
    };

    return (
        <StreamCallContext.Provider value={value}>
            {children}
        </StreamCallContext.Provider>
    );
};

export const useStreamCall = (): StreamCallContextType => {
    const context = useContext(StreamCallContext);
    if (!context) {
        // Return a safe default instead of throwing
        return {
            client: null,
            currentCall: null,
            isConnected: false,
            isInCall: false,
            isMuted: false,
            isSpeakerOn: false,
            callDuration: 0,
            isStreamAvailable: false,
            startAudioCall: async () => { },
            joinCall: async () => { },
            endCall: async () => { },
            toggleMute: () => { },
            toggleSpeaker: () => { },
        };
    }
    return context;
};

export default StreamCallProvider;
