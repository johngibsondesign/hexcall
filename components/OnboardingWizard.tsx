import { useState, useEffect } from 'react';
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaMicrophone, FaVolumeUp, FaGamepad, FaCog } from 'react-icons/fa';
import Link from 'next/link';

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface SetupStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'checking' | 'complete' | 'error';
  optional?: boolean;
}

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<SetupStep[]>([
    {
      id: 'microphone',
      title: 'Microphone Access',
      description: 'Grant microphone permission for voice chat',
      status: 'pending'
    },
    {
      id: 'supabase',
      title: 'Voice Service',
      description: 'Check connection to voice chat servers',
      status: 'pending'
    },
    {
      id: 'league',
      title: 'League of Legends',
      description: 'Detect League client for auto-join',
      status: 'pending',
      optional: true
    }
  ]);

  const updateStepStatus = (stepId: string, status: SetupStep['status']) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ));
  };

  const checkMicrophoneAccess = async () => {
    updateStepStatus('microphone', 'checking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      updateStepStatus('microphone', 'complete');
      return true;
    } catch (error) {
      updateStepStatus('microphone', 'error');
      return false;
    }
  };

  const checkSupabaseConnection = async () => {
    updateStepStatus('supabase', 'checking');
    try {
      const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (hasUrl && hasKey) {
        updateStepStatus('supabase', 'complete');
        return true;
      } else {
        updateStepStatus('supabase', 'error');
        return false;
      }
    } catch (error) {
      updateStepStatus('supabase', 'error');
      return false;
    }
  };

  const checkLeagueClient = async () => {
    updateStepStatus('league', 'checking');
    try {
      // This would normally check for League client
      // For now, we'll simulate the check
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStepStatus('league', 'complete');
      return true;
    } catch (error) {
      updateStepStatus('league', 'error');
      return false;
    }
  };

  const runSetupChecks = async () => {
    await checkMicrophoneAccess();
    await new Promise(resolve => setTimeout(resolve, 500));
    await checkSupabaseConnection();
    await new Promise(resolve => setTimeout(resolve, 500));
    await checkLeagueClient();
  };

  useEffect(() => {
    runSetupChecks();
  }, []);

  const allRequiredComplete = steps
    .filter(step => !step.optional)
    .every(step => step.status === 'complete');

  const getStepIcon = (step: SetupStep) => {
    switch (step.status) {
      case 'checking':
        return <FaSpinner className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'complete':
        return <FaCheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <FaTimesCircle className="w-5 h-5 text-red-400" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-neutral-400" />;
    }
  };

  const getStepColor = (step: SetupStep) => {
    switch (step.status) {
      case 'complete':
        return 'border-green-400/50 bg-green-400/10';
      case 'error':
        return 'border-red-400/50 bg-red-400/10';
      case 'checking':
        return 'border-blue-400/50 bg-blue-400/10';
      default:
        return 'border-neutral-600/50 bg-neutral-800/50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-neutral-900/95 backdrop-blur-md border border-neutral-700/50 rounded-xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gradient mb-2">Welcome to Hexcall!</h2>
          <p className="text-neutral-400">Let's set up your voice chat experience</p>
        </div>

        <div className="space-y-4 mb-8">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${getStepColor(step)}`}
            >
              {getStepIcon(step)}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-white">{step.title}</h3>
                  {step.optional && (
                    <span className="text-xs px-2 py-1 bg-neutral-700 text-neutral-300 rounded">
                      Optional
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-400">{step.description}</p>
                
                {/* Error-specific help */}
                {step.status === 'error' && step.id === 'microphone' && (
                  <p className="text-xs text-red-400 mt-1">
                    Please allow microphone access in your browser
                  </p>
                )}
                {step.status === 'error' && step.id === 'supabase' && (
                  <div className="text-xs text-red-400 mt-1">
                    <p>Voice servers not configured.</p>
                    <Link href="/settings" className="text-blue-400 hover:underline">
                      Configure in Settings →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 px-4 py-2 border border-neutral-600 text-neutral-300 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Skip Setup
          </button>
          <button
            onClick={onComplete}
            disabled={!allRequiredComplete}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
              allRequiredComplete
                ? 'bg-violet-600 hover:bg-violet-700 text-white'
                : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
            }`}
          >
            {allRequiredComplete ? 'Get Started' : 'Completing Setup...'}
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-700/50">
          <div className="flex items-center justify-center gap-4 text-xs text-neutral-400">
            <Link href="/settings" className="flex items-center gap-1 hover:text-white transition-colors">
              <FaCog className="w-3 h-3" />
              Settings
            </Link>
            <span>•</span>
            <span>Need help? Check the settings page</span>
          </div>
        </div>
      </div>
    </div>
  );
}
