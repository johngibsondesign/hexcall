# Changelog

All notable changes to Hexcall will be documented in this file.

## [1.4.0] - 2025-09-11

### Installer
- Switched to one‑click NSIS with silent in‑app restart after updates
- Added bespoke NSIS include (branding text, welcome/finish copy)
- Added EULA displayed in installer (`build/LICENSE.txt`)

### Overlay
- Keeps on top of League more reliably; prevents focus stealing
- New Lock Overlay setting (click‑through when locked)
- Simplified overlay UI to icons only; minimized text

### Call Reliability
- Auto‑reconnect on drops with exponential backoff
- In‑app notifications on connection lost/reconnect
- More reliable “Join League Call” transition from manual calls

### Champion/Summoner Icons
- Uses champion icon in Champ Select and In‑Game
- Faster presence updates to surface icons sooner

### Sound Cues
- Lightweight built‑in connection and UX sounds (no external assets)

## [1.1.0] - 2024-12-19

### 🎉 Major UX/UI Overhaul

This release represents a complete transformation of the user experience, bringing Hexcall to professional-grade quality with comprehensive improvements across all areas.

### ✨ New Features

#### **Enhanced User Experience**
- **🎯 Smart Onboarding System**: New users are guided through setup with automatic configuration checks
- **📊 Real-time Connection Status**: Visual indicators show connection state, peer count, and room information
- **🎤 Advanced Microphone Controls**: Visual audio levels, push-to-talk feedback, and intuitive mute controls
- **🔧 Smart Setup Monitoring**: Continuous configuration validation with actionable fix suggestions
- **📚 Interactive Quick Start Guide**: Step-by-step tutorial explaining all features
- **⚙️ Manual Update Control**: Users can now control when to check, download, and install updates

#### **Professional Voice Controls**
- **🎛️ Unified Voice Control Panel**: All voice features in one intuitive interface
- **📈 Visual Audio Feedback**: Real-time speaking indicators and audio level visualization
- **🔄 Smart Status Updates**: Clear feedback for all connection and audio states
- **💡 Contextual Help**: Tooltips and guidance throughout the interface

#### **Accessibility & Polish**
- **⌨️ Full Keyboard Navigation**: Complete accessibility support with focus indicators
- **📱 Mobile Optimization**: Responsive design with touch-friendly controls
- **🎨 High Contrast Support**: Adapts to user accessibility preferences
- **⚡ Reduced Motion Support**: Respects user motion preferences
- **🔊 Screen Reader Support**: Proper ARIA labels and semantic HTML

### 🔧 Technical Improvements

#### **Voice System Overhaul**
- **Fixed dual signaling issue** that prevented reliable connections
- **Unified presence system** through single VoiceClient instance
- **Enhanced error handling** with comprehensive logging
- **Improved WebRTC stability** with better connection management

#### **Performance & Reliability**
- **Optimized component rendering** with better state management
- **Enhanced error boundaries** and graceful failure handling
- **Improved memory management** in audio processing
- **Better resource cleanup** on component unmount

### 🎨 Visual Enhancements

#### **Modern Design System**
- **Glass morphism effects** with improved backdrop blur
- **Smooth animations** with fade-in transitions
- **Consistent color palette** with better contrast ratios
- **Enhanced typography** with improved readability
- **Professional iconography** with consistent sizing

#### **Component Library**
- **ConnectionStatusIndicator**: Real-time connection feedback
- **MicrophoneStatus**: Advanced audio control interface
- **OnboardingWizard**: Step-by-step setup guidance
- **VoiceControlPanel**: Comprehensive voice management
- **SetupStatusCard**: Configuration monitoring dashboard
- **QuickStartGuide**: Interactive feature tutorial

### 🛠️ Developer Experience

#### **Code Quality**
- **Comprehensive TypeScript types** for all new components
- **Consistent component architecture** with proper prop interfaces
- **Enhanced error handling** throughout the application
- **Improved code organization** with logical component structure

#### **Documentation**
- **Environment configuration guide** (`env.example`)
- **Integration testing guide** (`test-voice-integration.md`)
- **Debug tools** accessible via `__hexcall_debug()` console function

### 📦 Configuration

#### **Environment Setup**
- **Simplified Supabase configuration** with clear error messages
- **Optional TURN server setup** for improved connectivity
- **Better environment validation** with helpful warnings

### 🐛 Bug Fixes

- **Fixed voice call connection issues** that prevented users from joining calls
- **Resolved duplicate signaling instances** causing WebRTC conflicts
- **Fixed automatic update downloads** - now user-controlled
- **Improved League client detection** and room derivation
- **Enhanced error handling** in voice client initialization

### 🔄 Breaking Changes

- **Update system is now manual** - users control when to check and install updates
- **Onboarding is shown to new users** - can be skipped if desired
- **Voice controls have been redesigned** - more intuitive but different layout

### 📋 Migration Guide

#### For Users
1. **First-time users**: Will see onboarding wizard on first launch
2. **Existing users**: Can access Quick Start Guide via help button (?) in header
3. **Updates**: Now manual - check for updates in Settings > App Updates

#### For Developers
1. **Environment setup**: Copy `env.example` to `.env.local` and configure Supabase
2. **Testing**: Use `test-voice-integration.md` for systematic testing
3. **Debugging**: Use `__hexcall_debug()` in browser console for diagnostics

---

## [1.0.33] - 2024-12-19

### 🔧 Voice System Fixes

- **Fixed dual signaling instances** causing connection failures
- **Improved WebRTC connection stability**
- **Enhanced error logging** for better debugging
- **Fixed League chat join functionality**

---

## Previous Versions

See git history for earlier changes.
