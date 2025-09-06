# Voice System Integration Test

## Pre-Test Setup
1. Copy `env.example` to `.env.local`
2. Fill in your Supabase credentials
3. Start the development server: `npm run dev`

## Test Cases

### 1. Environment Configuration Test
- [ ] Open browser console
- [ ] Look for `[SupabaseSignaling]` logs
- [ ] **Expected**: If credentials missing, should see warning about configuring `.env.local`
- [ ] **Expected**: If credentials present, should see "Initializing for room" messages

### 2. League Chat Join Test
- [ ] Navigate to main page
- [ ] Ensure League of Legends is running (or mock game state)
- [ ] Click "Join League Chat" button
- [ ] **Expected Console Logs**:
  ```
  [VoiceProvider] Auto-joining room: [room-id] isManualCall: false
  [useVoiceRoom] Attempting to join room with forceAlone: true
  [VoiceClient] Initializing signaling for room: [room-id]
  [SupabaseSignaling] Initializing for room: [room-id] user: [user-id]
  [SupabaseSignaling] Subscribing to channel
  [SupabaseSignaling] Setting up presence tracking
  [VoiceClient] Offer created and sent successfully
  [VoiceClient] ICE gathering state: gathering
  [VoiceClient] ICE gathering state: complete
  ```

### 3. Manual Call Test
- [ ] Click "Start Manual Call" button
- [ ] **Expected**: Should generate a 6-character code
- [ ] **Expected**: Should auto-join the manual room
- [ ] **Expected**: Console should show manual room creation logs

### 4. Join by Code Test
- [ ] Click "Join by Code" button
- [ ] Enter a valid 6-character code
- [ ] **Expected**: Should join the specified manual room
- [ ] **Expected**: Console should show join by code logs

### 5. Multi-User Test (if possible)
- [ ] Open app in two browser tabs/windows
- [ ] Join the same room from both instances
- [ ] **Expected**: Should see presence updates in console
- [ ] **Expected**: WebRTC connection should establish between peers

## Expected Behavior Changes

### Before Fix
- Clicking "Join League Chat" would show offer creation but no actual connection
- Duplicate signaling instances causing conflicts
- No clear error messages when Supabase not configured

### After Fix
- Clear console logging showing the entire connection flow
- Single signaling instance managing all WebRTC communication
- Proper error messages and configuration guidance
- Successful voice connections even when joining alone initially

## Troubleshooting Guide

### If Voice Still Not Working

1. **Check Supabase Configuration**
   - Ensure `.env.local` exists with correct credentials
   - Verify Supabase project is active and accessible

2. **Check Console Logs**
   - Look for `[SupabaseSignaling]` warnings about missing credentials
   - Verify WebRTC offer/answer exchange is happening
   - Check for ICE connection state changes

3. **Network Issues**
   - If behind corporate firewall, may need TURN server configuration
   - Check browser permissions for microphone access

4. **Browser Compatibility**
   - Ensure using a modern browser with WebRTC support
   - Check for any browser-specific WebRTC restrictions
