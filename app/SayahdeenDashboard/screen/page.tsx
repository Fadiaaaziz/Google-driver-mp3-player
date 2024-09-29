'use client';
import React, { useState, useCallback } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@chakra-ui/react';
import { Button } from '@chakra-ui/react';

interface ScreenShareProps {
  onStreamStart?: (stream: MediaStream) => void;
  onStreamStop?: () => void;
}

const ScreenShare: React.FC<ScreenShareProps> = ({ onStreamStart, onStreamStop }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);

  const getDisplayMedia = useCallback(async (): Promise<MediaStream> => {
    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      throw new Error('Screen sharing is not supported in this environment');
    }

    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always'
        },
        audio: false
      });

      setIsPermissionDenied(false);
      return mediaStream;
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setIsPermissionDenied(true);
        throw new Error('Permission to access screen was denied');
      } else {
        throw err;
      }
    }
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await getDisplayMedia();
      setStream(mediaStream);
      onStreamStart?.(mediaStream);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start screen sharing');
      console.error('Error accessing screen:', err);
    }
  }, [getDisplayMedia, onStreamStart]);

  const stopScreenShare = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      onStreamStop?.();
    }
  }, [stream, onStreamStop]);

  const renderContent = () => {
    if (stream) {
      return (
        <div>
          <p className="mb-2">Screen sharing is active.</p>
          <video
            autoPlay
            ref={(video) => {
              if (video) {
                video.srcObject = stream;
              }
            }}
            className="w-full max-w-2xl border border-gray-300 rounded"
          />
          <Button onClick={stopScreenShare} className="mt-4">Stop Sharing</Button>
        </div>
      );
    }

    return (
      <div>
        <p className="mb-2">Click the button below to start screen sharing.</p>
        <Button onClick={startScreenShare}>Start Screen Share</Button>
      </div>
    );
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Screen Sharing</h1>
      {error && (
        <Alert variant={isPermissionDenied ? "warning" : "destructive"} className="mb-4">
          <AlertTitle>{isPermissionDenied ? "Permission Denied" : "Error"}</AlertTitle>
          <AlertDescription>
            {isPermissionDenied ? (
              <>
                You&apos;ve denied permission to share your screen. To enable screen sharing:
                <ol className="list-decimal list-inside mt-2">
                  <li>Click the camera icon in your browser&apos;s address bar</li>
                  <li>Select &quot;Always allow&quot; for this site</li>
                  <li>Refresh the page and try again</li>
                </ol>
              </>
            ) : (
              error
            )}
          </AlertDescription>
        </Alert>
      )}
      {renderContent()}
    </div>
  );
};

export default ScreenShare;