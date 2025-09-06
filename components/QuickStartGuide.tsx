import { useState } from 'react';
import { FaPlay, FaGamepad, FaUsers, FaMicrophone, FaTimes, FaChevronRight } from 'react-icons/fa';

interface QuickStartGuideProps {
  onClose: () => void;
}

interface GuideStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tip?: string;
}

export function QuickStartGuide({ onClose }: QuickStartGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: GuideStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Hexcall!',
      description: 'Your premium voice chat companion for League of Legends. Let\'s get you started in just a few steps.',
      icon: FaPlay,
      tip: 'This guide will take less than 2 minutes'
    },
    {
      id: 'league',
      title: 'Auto-Join with League',
      description: 'Start League of Legends and enter a lobby or game. Hexcall will automatically detect your party and create a voice room.',
      icon: FaGamepad,
      tip: 'Works with ranked, normal, ARAM, and custom games'
    },
    {
      id: 'manual',
      title: 'Manual Voice Calls',
      description: 'Create a manual call and share your 6-character code with friends. Perfect for Discord-style voice chats.',
      icon: FaUsers,
      tip: 'Your code is always visible in the top bar'
    },
    {
      id: 'controls',
      title: 'Voice Controls',
      description: 'Use the microphone button to mute/unmute, or enable push-to-talk in settings. All controls are easily accessible.',
      icon: FaMicrophone,
      tip: 'Push-to-talk works even when the app is minimized'
    }
  ];

  const currentStepData = steps[currentStep];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-neutral-900/95 backdrop-blur-md border border-neutral-700/50 rounded-xl max-w-md w-full mx-4 animate-fadeInUp">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <currentStepData.icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{currentStepData.title}</h2>
              <p className="text-xs text-neutral-400">Step {currentStep + 1} of {steps.length}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <FaTimes className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-neutral-300 leading-relaxed mb-4">
            {currentStepData.description}
          </p>
          
          {currentStepData.tip && (
            <div className="p-3 bg-blue-400/10 border border-blue-400/20 rounded-lg mb-6">
              <p className="text-xs text-blue-400">
                💡 <strong>Tip:</strong> {currentStepData.tip}
              </p>
            </div>
          )}

          {/* Progress indicator */}
          <div className="flex gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full flex-1 transition-colors ${
                  index <= currentStep ? 'bg-violet-500' : 'bg-neutral-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-neutral-700/50">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="px-4 py-2 text-neutral-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
            >
              Skip
            </button>
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              {currentStep < steps.length - 1 && <FaChevronRight className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
