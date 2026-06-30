'use client';

import React, { useEffect, useState, useRef } from 'react';

// For this example, we assume the sandbox is available locally at 4000.
// In a production deployment, this would be an environment variable.
let SANDBOX_HTTP_URL = process.env.NEXT_PUBLIC_SANDBOX_URL || 'http://localhost:4000';
let SANDBOX_WS_URL = SANDBOX_HTTP_URL.replace(/^http/, 'ws');

if (typeof window !== 'undefined' && SANDBOX_HTTP_URL.startsWith('/')) {
  SANDBOX_HTTP_URL = window.location.origin + process.env.NEXT_PUBLIC_SANDBOX_URL;
  SANDBOX_WS_URL = (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + process.env.NEXT_PUBLIC_SANDBOX_URL;
}

export function LiveSandboxViewer() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [frameData, setFrameData] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle');
  const wsRef = useRef<WebSocket | null>(null);

  // Poll for active session
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const res = await fetch(`${SANDBOX_HTTP_URL}/sessions/active`);
        if (res.ok) {
          const data = await res.json();
          if (data.active && data.sessionId) {
            setActiveSessionId(data.sessionId);
          } else {
            setActiveSessionId(null);
            setStatus('idle');
            setFrameData(null);
          }
        }
      } catch (err) {
        setStatus('error');
      }
    };

    const interval = setInterval(checkActiveSession, 2000);
    checkActiveSession();
    return () => clearInterval(interval);
  }, []);

  // Connect to WS when a session is active
  useEffect(() => {
    if (!activeSessionId) return;

    setStatus('connecting');
    const ws = new WebSocket(SANDBOX_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ action: 'subscribe', sessionId: activeSessionId }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'status') {
          if (msg.status === 'live') setStatus('live');
          if (msg.status === 'idle') setStatus('idle');
        } else if (msg.type === 'frame' && msg.data) {
          setFrameData(msg.data);
          setStatus('live');
        }
      } catch (e) {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      setStatus('error');
    };

    ws.onclose = () => {
      setStatus('idle');
      setFrameData(null);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [activeSessionId]);

  return (
    <div className="w-full flex flex-col items-center justify-center border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-950 aspect-video relative group transition-all duration-300">
      
      {/* Header overlay */}
      <div className="absolute top-0 left-0 w-full p-3 bg-gradient-to-b from-black/50 to-transparent z-10 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${status === 'live' ? 'bg-green-500 animate-pulse' : status === 'idle' ? 'bg-zinc-400' : 'bg-yellow-500'}`} />
          <span className="text-xs font-medium text-white uppercase tracking-wider drop-shadow-sm">
            {status === 'live' ? 'Sandbox Live' : status === 'connecting' ? 'Connecting...' : status === 'error' ? 'Connection Error' : 'Sandbox Connected'}
          </span>
        </div>
      </div>

      {status === 'live' && frameData ? (
        <img 
          src={`data:image/jpeg;base64,${frameData}`} 
          alt="Live Browser Sandbox"
          className="w-full h-full object-contain bg-black"
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500 dark:text-zinc-400 h-full">
          {status === 'error' ? (
            <>
              <svg className="w-10 h-10 mb-4 text-red-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Sandbox Unreachable</p>
              <p className="text-xs text-zinc-500 max-w-xs">Ensure the sandbox container is running. Retrying...</p>
            </>
          ) : (
            <>
              <svg className="w-10 h-10 mb-4 animate-pulse opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Waiting for Agent Commands</p>
              <p className="text-xs text-zinc-500 max-w-xs">The sandbox is connected and idle. When the Browser Department starts a task, you will see a live video feed here.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
