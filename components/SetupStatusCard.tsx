import { useEffect, useState } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaCog } from 'react-icons/fa';
import Link from 'next/link';

interface SetupIssue {
  type: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

interface SetupStatusCardProps {
  className?: string;
}

export function SetupStatusCard({ className = "" }: SetupStatusCardProps) {
  const [issues, setIssues] = useState<SetupIssue[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const checkSetup = () => {
      const foundIssues: SetupIssue[] = [];

      // Check Supabase configuration
      const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!hasSupabaseUrl || !hasSupabaseKey) {
        foundIssues.push({
          type: 'error',
          title: 'Voice Chat Not Configured',
          description: 'Supabase credentials are missing. Voice chat will not work.',
          action: {
            label: 'Configure Now',
            href: '/settings'
          }
        });
      }

      // Check microphone permissions
      navigator.mediaDevices?.getUserMedia({ audio: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(() => {
          foundIssues.push({
            type: 'warning',
            title: 'Microphone Permission Needed',
            description: 'Grant microphone access to use voice chat.',
            action: {
              label: 'Grant Permission',
              onClick: () => {
                navigator.mediaDevices.getUserMedia({ audio: true })
                  .then(stream => {
                    stream.getTracks().forEach(track => track.stop());
                    // Refresh issues after permission granted
                    setTimeout(() => checkSetup(), 1000);
                  })
                  .catch(console.error);
              }
            }
          });
        });

      // Check TURN server configuration (optional)
      const hasTurnServer = !!process.env.NEXT_PUBLIC_METERED_TURN_URL;
      if (!hasTurnServer) {
        foundIssues.push({
          type: 'info',
          title: 'TURN Server Recommended',
          description: 'Configure a TURN server for better connectivity behind firewalls.',
          action: {
            label: 'Learn More',
            href: '/settings'
          }
        });
      }

      setIssues(foundIssues);
    };

    checkSetup();
  }, []);

  if (issues.length === 0) {
    return (
      <div className={`glass rounded-xl p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <FaCheckCircle className="w-5 h-5 text-green-400" />
          <div>
            <h3 className="text-sm font-medium text-green-400">Setup Complete</h3>
            <p className="text-xs text-neutral-400">Voice chat is ready to use</p>
          </div>
        </div>
      </div>
    );
  }

  const errorCount = issues.filter(i => i.type === 'error').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;

  const getIssueIcon = (type: SetupIssue['type']) => {
    switch (type) {
      case 'error':
        return <FaExclamationTriangle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <FaExclamationTriangle className="w-4 h-4 text-yellow-400" />;
      case 'info':
        return <FaInfoCircle className="w-4 h-4 text-blue-400" />;
    }
  };

  const getIssueColors = (type: SetupIssue['type']) => {
    switch (type) {
      case 'error':
        return 'border-red-400/50 bg-red-400/10';
      case 'warning':
        return 'border-yellow-400/50 bg-yellow-400/10';
      case 'info':
        return 'border-blue-400/50 bg-blue-400/10';
    }
  };

  return (
    <div className={`glass rounded-xl p-4 ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <FaExclamationTriangle className={`w-5 h-5 ${errorCount > 0 ? 'text-red-400' : 'text-yellow-400'}`} />
          <div className="text-left">
            <h3 className="text-sm font-medium text-white">
              Setup Issues ({issues.length})
            </h3>
            <p className="text-xs text-neutral-400">
              {errorCount > 0 && `${errorCount} error${errorCount > 1 ? 's' : ''}`}
              {errorCount > 0 && warningCount > 0 && ', '}
              {warningCount > 0 && `${warningCount} warning${warningCount > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <div className="text-neutral-400 text-xs">
          {isExpanded ? '▼' : '▶'}
        </div>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          {issues.map((issue, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${getIssueColors(issue.type)}`}
            >
              <div className="flex items-start gap-3">
                {getIssueIcon(issue.type)}
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-white">{issue.title}</h4>
                  <p className="text-xs text-neutral-400 mt-1">{issue.description}</p>
                  {issue.action && (
                    <div className="mt-2">
                      {issue.action.href ? (
                        <Link
                          href={issue.action.href}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          {issue.action.label} →
                        </Link>
                      ) : (
                        <button
                          onClick={issue.action.onClick}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          {issue.action.label}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
