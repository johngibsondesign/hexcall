import Head from 'next/head'
import { useState } from 'react'
import { 
  FaGamepad,
  FaMicrophone,
  FaUsers,
  FaShieldAlt,
  FaRocket,
  FaHeadset,
  FaCheckCircle,
  FaEnvelope,
  FaDiscord,
  FaTwitter,
  FaGithub,
  FaChevronDown
} from 'react-icons/fa'
import { FaX } from 'react-icons/fa6'

interface Feature {
  icon: React.ReactNode
  title: string
  description: string
}

export default function Home() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')

  const features: Feature[] = [
    {
      icon: <FaGamepad className="w-8 h-8" />,
      title: "League Integration",
      description: "Automatically connects with your League of Legends teammates. No setup required."
    },
    {
      icon: <FaMicrophone className="w-8 h-8" />,
      title: "Crystal Clear Voice",
      description: "High-quality voice chat with noise suppression and echo cancellation."
    },
    {
      icon: <FaUsers className="w-8 h-8" />,
      title: "Team-Focused",
      description: "Built specifically for 5-player teams with role-based organization."
    },
    {
      icon: <FaShieldAlt className="w-8 h-8" />,
      title: "Privacy First",
      description: "Your conversations stay private. No data collection or monitoring."
    },
    {
      icon: <FaRocket className="w-8 h-8" />,
      title: "Lightning Fast",
      description: "Minimal latency and instant connections. No lag, no delays."
    },
    {
      icon: <FaHeadset className="w-8 h-8" />,
      title: "Easy to Use",
      description: "Simple interface that gets out of your way so you can focus on the game."
    }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || isSubmitting) return

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          source: 'landing-page'
        }),
      })

      const data = await response.json()

      if (data.success) {
        setIsSubmitted(true)
        setEmail('')
      } else {
        setError(data.error || 'Something went wrong. Please try again.')
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-hextech">
      <Head>
        <title>Hexcall - Coming Soon | Voice Chat for League of Legends</title>
        <meta name="description" content="The ultimate voice chat app for League of Legends teams. Crystal clear communication, automatic team detection, and seamless integration." />
        <meta name="keywords" content="League of Legends, voice chat, gaming, communication, team, Hexcall" />
        <meta property="og:title" content="Hexcall - Coming Soon" />
        <meta property="og:description" content="The ultimate voice chat app for League of Legends teams." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          {/* Logo/Brand */}
          <div className="animate-fadeInDown">
            <h1 className="text-6xl md:text-8xl font-bold text-gradient mb-6">
              Hexcall
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-violet-500 to-cyan-500 mx-auto mb-8 rounded-full"></div>
          </div>

          {/* Hero Text */}
          <div className="animate-fadeInUp animate-delay-200">
            <h2 className="text-2xl md:text-4xl font-semibold text-white mb-6 leading-tight">
              Voice Chat Designed for
              <span className="block text-gradient">League of Legends</span>
            </h2>
            <p className="text-lg md:text-xl text-neutral-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Crystal clear communication with automatic team detection, 
              role-based organization, and seamless League integration.
            </p>
          </div>

          {/* Coming Soon Badge */}
          <div className="animate-fadeInUp animate-delay-300 mb-8">
            <div className="inline-flex items-center gap-2 px-6 py-3 glass rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-semibold">Coming Soon</span>
            </div>
          </div>

          {/* Email Signup */}
          <div className="animate-fadeInUp animate-delay-400 mb-12">
            {isSubmitted ? (
              <div className="max-w-md mx-auto glass rounded-2xl p-6">
                <FaCheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Thanks for your interest!</h3>
                <p className="text-neutral-300">We'll notify you as soon as Hexcall is available.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <input
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-6 py-4 bg-neutral-900/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-400 focus:border-violet-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting || !email}
                    className="btn-primary px-8 py-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Joining...' : 'Get Early Access'}
                  </button>
                </div>
                {error && (
                  <p className="text-red-400 text-sm mt-2">{error}</p>
                )}
                <p className="text-neutral-400 text-sm mt-3">
                  Be the first to know when Hexcall launches. No spam, ever.
                </p>
              </form>
            )}
          </div>

          {/* Scroll indicator */}
          <div className="animate-fadeInUp animate-delay-500">
            <button 
              onClick={scrollToFeatures}
              className="group flex flex-col items-center gap-2 text-neutral-400 hover:text-white transition-colors"
            >
              <span className="text-sm">Discover Features</span>
              <FaChevronDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Built for <span className="text-gradient">Champions</span>
            </h2>
            <p className="text-xl text-neutral-300 max-w-2xl mx-auto">
              Every feature designed with competitive League of Legends in mind
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`glass rounded-2xl p-8 hover:scale-105 transition-all duration-300 animate-fadeInUp`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-gradient mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">
                  {feature.title}
                </h3>
                <p className="text-neutral-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="animate-fadeInUp">
              <div className="text-4xl md:text-5xl font-bold text-gradient mb-2">0ms</div>
              <p className="text-neutral-300">Target Latency</p>
            </div>
            <div className="animate-fadeInUp animate-delay-100">
              <div className="text-4xl md:text-5xl font-bold text-gradient mb-2">5</div>
              <p className="text-neutral-300">Perfect Team Size</p>
            </div>
            <div className="animate-fadeInUp animate-delay-200">
              <div className="text-4xl md:text-5xl font-bold text-gradient mb-2">100%</div>
              <p className="text-neutral-300">Privacy Focused</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass rounded-3xl p-12 animate-pulse-glow">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Elevate Your Game?
            </h2>
            <p className="text-xl text-neutral-300 mb-8 max-w-2xl mx-auto">
              Join the waitlist and be among the first to experience the future of League voice chat.
            </p>
            
            {!isSubmitted && (
              <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1 px-6 py-4 bg-neutral-900/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-400 focus:border-violet-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !email}
                    className="btn-primary px-8 py-4 rounded-xl font-semibold transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Joining...' : 'Join Waitlist'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold text-gradient">Hexcall</h3>
              <span className="text-neutral-400">•</span>
              <span className="text-neutral-400">Coming Soon</span>
            </div>
            
            <div className="flex items-center gap-6">
              <a 
                href="#" 
                className="text-neutral-400 hover:text-white transition-colors p-2"
                aria-label="Twitter"
              >
                <FaX className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="text-neutral-400 hover:text-white transition-colors p-2"
                aria-label="Discord"
              >
                <FaDiscord className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="text-neutral-400 hover:text-white transition-colors p-2"
                aria-label="GitHub"
              >
                <FaGithub className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div className="text-center mt-8 pt-8 border-t border-white/10">
            <p className="text-neutral-400 text-sm">
              © 2024 Hexcall. Built for the League of Legends community.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
