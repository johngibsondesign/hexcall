import { useState, useEffect } from 'react';
import { useVoice } from '../providers/VoiceProvider';

interface DebugInfoProps {
  visible: boolean;
  onClose: () => void;
}

export function DebugInfo({ visible, onClose }: DebugInfoProps) {
  const [lcuStatus, setLcuStatus] = useState<any>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<string>('unknown');
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const voice = useVoice();

  useEffect(() => {
    if (!visible) return;

    // Listen for LCU updates
    const offLcu = window.hexcall?.onLcuUpdate?.((payload: any) => {
      setLcuStatus(payload);
    });

    // Test Supabase connection
    const testSupabase = async () => {
      try {
        const { getSupabase } = await import('../lib/supabase');
        const sb = getSupabase();
        if (!sb) {
          setSupabaseStatus('No Supabase client (missing env vars?)');
          return;
        }
        
        // Test connection
        const { data, error } = await sb.from('_health_check').select('*').limit(1);
        if (error) {
          setSupabaseStatus(`Supabase error: ${error.message}`);
        } else {
          setSupabaseStatus('Supabase connected');
        }
      } catch (error) {
        setSupabaseStatus(`Supabase test failed: ${error}`);
      }
    };

    testSupabase();

    return () => {
      offLcu?.();
    };
  }, [visible]);

  useEffect(() => {
    setRoomInfo({
      joinedRoomId: (voice as any)?.joinedRoomId,
      connected: voice?.connected,
      muted: voice?.muted,
      speakingUsers: voice?.speakingUsers ? Array.from(voice.speakingUsers) : [],
      connectionStats: voice?.connectionStats
    });
  }, [voice]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Debug Information</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Environment Check */}
          <div>
            <h3 className="text-lg font-medium text-white mb-2">Environment</h3>
            <div className="bg-neutral-800 rounded-lg p-3 text-sm font-mono">
              <div>SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '❌ Missing'}</div>
              <div>SUPABASE_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '❌ Missing'}</div>
              <div>TURN_URL: {process.env.METERED_TURN_URL ? '✓ Set' : '❌ Missing'}</div>
              <div>TURN_USERNAME: {process.env.METERED_TURN_USERNAME ? '✓ Set' : '❌ Missing'}</div>
            </div>
          </div>

          {/* Supabase Status */}
          <div>
            <h3 className="text-lg font-medium text-white mb-2">Supabase Connection</h3>
            <div className="bg-neutral-800 rounded-lg p-3 text-sm">
              <div className={supabaseStatus.includes('connected') ? 'text-green-400' : 'text-red-400'}>
                {supabaseStatus}
              </div>
            </div>
          </div>

          {/* League Client Status */}
          <div>
            <h3 className="text-lg font-medium text-white mb-2">League of Legends Status</h3>
            <div className="bg-neutral-800 rounded-lg p-3 text-sm">
              {lcuStatus ? (
                <div className="space-y-1">
                  <div>Phase: <span className="text-blue-400">{lcuStatus.phase || 'Unknown'}</span></div>
                  <div>Members: <span className="text-blue-400">{lcuStatus.members?.length || 0}</span></div>
                  <div>Lobby ID: <span className="text-blue-400">{lcuStatus.lobby?.lobbyId || 'None'}</span></div>
                  <div>Party ID: <span className="text-blue-400">{lcuStatus.lobby?.partyId || 'None'}</span></div>
                  {lcuStatus.error && <div className="text-red-400">Error: {lcuStatus.error}</div>}
                </div>
              ) : (
                <div className="text-yellow-400">Waiting for LCU data...</div>
              )}
            </div>
          </div>

          {/* Voice Room Status */}
          <div>
            <h3 className="text-lg font-medium text-white mb-2">Voice Room Status</h3>
            <div className="bg-neutral-800 rounded-lg p-3 text-sm space-y-1">
              <div>Room ID: <span className="text-blue-400">{roomInfo?.joinedRoomId || 'None'}</span></div>
              <div>Connected: <span className={roomInfo?.connected ? 'text-green-400' : 'text-red-400'}>
                {roomInfo?.connected ? 'Yes' : 'No'}
              </span></div>
              <div>Muted: <span className="text-blue-400">{roomInfo?.muted ? 'Yes' : 'No'}</span></div>
              <div>Speaking Users: <span className="text-blue-400">{roomInfo?.speakingUsers?.length || 0}</span></div>
              {roomInfo?.connectionStats && (
                <div>Connection Quality: <span className="text-blue-400">{roomInfo.connectionStats.connectionQuality}</span></div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="text-lg font-medium text-white mb-2">Troubleshooting</h3>
            <div className="bg-neutral-800 rounded-lg p-3 text-sm space-y-2">
              <div className="text-neutral-300">
                1. Make sure League of Legends is running and you're in a lobby or game
              </div>
              <div className="text-neutral-300">
                2. Check that Supabase connection is working (should show "connected")
              </div>
              <div className="text-neutral-300">
                3. If you're alone, try the "Start Manual Call" feature to test voice
              </div>
              <div className="text-neutral-300">
                4. Check browser console (F12) for any JavaScript errors
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
