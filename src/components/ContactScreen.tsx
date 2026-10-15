import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  AlertCircle,
  WifiOff,
  Mail,
  MessageSquare,
  Globe,
  Phone,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { useWhotStore } from '../store/useWhotStore';
import { contactContent } from '../content/contact';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { soundEngine } from '../audio/audioEngine';

const InstagramIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const ContactScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useWhotStore();

  // Offline detection
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Form State
  const initialName = user?.displayName || user?.username || '';
  const initialEmail = localStorage.getItem('gbedu_email') || '';

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [topic, setTopic] = useState('Feedback');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Anti-spam trap

  // Status & Validation
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleBack = () => {
    soundEngine.playClick();
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/home');
    }
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Please provide your name or nickname.';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters.';
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!topic) {
      newErrors.topic = 'Please select a topic.';
    }

    if (!message.trim()) {
      newErrors.message = 'Please type your message.';
    } else if (message.trim().length < 5) {
      newErrors.message = 'Message must be at least 5 characters.';
    } else if (message.length > 1000) {
      newErrors.message = 'Message must not exceed 1000 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    if (!isOnline) {
      setServerError("You're offline. Connect to send your message.");
      return;
    }

    if (!validate()) {
      soundEngine.playClick();
      return;
    }

    // Bot trap: honeypot field filled
    if (honeypot) {
      // Pretend success
      setSuccessMessage("Message sent. We'll get back to you soon.");
      setMessage('');
      return;
    }

    // Check client rate limit (max 3 submissions in the last hour)
    try {
      const storedSubmissionsStr = localStorage.getItem('gbedu_contact_timestamps');
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;
      let timestamps: number[] = storedSubmissionsStr ? JSON.parse(storedSubmissionsStr) : [];
      timestamps = timestamps.filter((t) => t > oneHourAgo);

      if (timestamps.length >= 3) {
        setServerError('Rate limit reached: Maximum 3 messages per hour. Please try again later.');
        return;
      }
    } catch {
      // Ignore localStorage read error
    }

    setIsSubmitting(true);
    soundEngine.playClick();

    try {
      let submissionSuccessful = false;

      // 1. If Supabase client is configured, submit directly to contact_messages table
      if (isSupabaseConfigured) {
        try {
          const { error: dbError } = await supabase.from('contact_messages').insert({
            user_id: user?.id || null,
            name: name.trim(),
            email: email.trim(),
            topic,
            message: message.trim(),
            status: 'new',
          });

          if (!dbError) {
            submissionSuccessful = true;
          } else {
            console.warn('[Contact] Supabase client insert returned error:', dbError.message);
          }
        } catch (supabaseErr) {
          console.warn('[Contact] Supabase insert attempt threw:', supabaseErr);
        }
      }

      // 2. Fallback to API route /api/contact if not yet successful
      if (!submissionSuccessful) {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user?.id || null,
            name: name.trim(),
            email: email.trim(),
            topic,
            message: message.trim(),
            honeypot,
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to deliver message. Please try again.');
        }
        submissionSuccessful = true;
      }

      // Save email for user convenience
      localStorage.setItem('gbedu_email', email.trim());

      // Update client rate limit timestamps
      try {
        const storedSubmissionsStr = localStorage.getItem('gbedu_contact_timestamps');
        const now = Date.now();
        const oneHourAgo = now - 60 * 60 * 1000;
        let timestamps: number[] = storedSubmissionsStr ? JSON.parse(storedSubmissionsStr) : [];
        timestamps = timestamps.filter((t) => t > oneHourAgo);
        timestamps.push(now);
        localStorage.setItem('gbedu_contact_timestamps', JSON.stringify(timestamps));
      } catch {
        // Ignore
      }

      soundEngine.playAgogo(true);
      setSuccessMessage("Message sent. We'll get back to you soon.");
      setMessage('');
      setErrors({});
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      setServerError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Inspect which channels have values configured
  const configuredChannels = Object.entries(contactContent.channels).filter(
    ([_, val]) => typeof val === 'string' && val.trim().length > 0
  );

  return (
    <div className="w-full min-h-[100dvh] bg-[#0d1426] text-white flex flex-col">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 bg-[#0d1426]/90 backdrop-blur-md border-b border-[#26314d] px-4 py-3 flex items-center justify-between shrink-0">
        <button
          onClick={handleBack}
          aria-label="Back"
          className="min-w-[44px] min-h-[44px] flex items-center gap-1.5 text-gray-300 hover:text-white active:scale-95 transition-transform cursor-pointer rounded-xl px-2 focus:outline-none focus:ring-2 focus:ring-[#ff7a00]"
        >
          <ArrowLeft className="w-5 h-5 text-[#ff7a00]" />
          <span className="text-xs font-bold uppercase tracking-wider">Back</span>
        </button>

        <span className="text-xs font-black tracking-widest uppercase text-gray-400 font-display">
          Contact Us
        </span>

        <div className="w-8" aria-hidden="true" />
      </header>

      {/* Main Form Arena */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-5 space-y-5">
        {/* Header Title */}
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-black font-display text-white tracking-tight">
            {contactContent.header.title}
          </h1>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            {contactContent.header.subtitle}
          </p>
        </div>

        {/* Offline Banner */}
        {!isOnline && (
          <div
            role="status"
            aria-live="polite"
            className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-center gap-2.5 text-xs font-semibold shadow-lg"
          >
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>You&apos;re offline. Connect to send your message.</span>
          </div>
        )}

        {/* Success Alert */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              role="status"
              aria-live="polite"
              className="p-4 rounded-2xl bg-[#1fd1a0]/15 border border-[#1fd1a0]/40 text-[#1fd1a0] flex items-start gap-3 shadow-xl"
            >
              <CheckCircle2 className="w-5 h-5 text-[#1fd1a0] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black uppercase tracking-wider">Success</p>
                <p className="text-xs font-medium text-gray-200 mt-0.5">{successMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Alert */}
        {serverError && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 flex items-start gap-2.5 text-xs shadow-lg"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="p-4 sm:p-5 rounded-2xl bg-[#141d33] border border-[#26314d] shadow-xl space-y-4"
        >
          {/* Honeypot field (hidden from screen & tab order) */}
          <div
            style={{
              position: 'absolute',
              opacity: 0,
              left: '-9999px',
              width: '1px',
              height: '1px',
            }}
            aria-hidden="true"
          >
            <label htmlFor="hp_field">Leave this empty</label>
            <input
              id="hp_field"
              type="text"
              name="website_hp"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          {/* 1. Name Field */}
          <div className="space-y-1">
            <label
              htmlFor="contact_name"
              className="block text-xs font-bold text-gray-300 tracking-wide"
            >
              Your Name <span className="text-[#ff7a00]">*</span>
            </label>
            <input
              id="contact_name"
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              placeholder="e.g. Tobi or Ada"
              className={`w-full h-11 px-3.5 rounded-xl bg-[#0d1426] border text-[16px] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff7a00] transition-colors ${
                errors.name ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[#26314d]'
              }`}
            />
            {errors.name && (
              <p className="text-[11px] text-rose-400 font-semibold">{errors.name}</p>
            )}
          </div>

          {/* 2. Email Field */}
          <div className="space-y-1">
            <label
              htmlFor="contact_email"
              className="block text-xs font-bold text-gray-300 tracking-wide"
            >
              Email Address <span className="text-[#ff7a00]">*</span>
            </label>
            <input
              id="contact_email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              placeholder="you@example.com"
              className={`w-full h-11 px-3.5 rounded-xl bg-[#0d1426] border text-[16px] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff7a00] transition-colors ${
                errors.email ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[#26314d]'
              }`}
            />
            {errors.email && (
              <p className="text-[11px] text-rose-400 font-semibold">{errors.email}</p>
            )}
          </div>

          {/* 3. Topic Dropdown */}
          <div className="space-y-1">
            <label
              htmlFor="contact_topic"
              className="block text-xs font-bold text-gray-300 tracking-wide"
            >
              Topic <span className="text-[#ff7a00]">*</span>
            </label>
            <select
              id="contact_topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#0d1426] border border-[#26314d] text-[16px] text-white focus:outline-none focus:ring-2 focus:ring-[#ff7a00] transition-colors cursor-pointer"
            >
              {contactContent.topics.map((t) => (
                <option key={t.value} value={t.value} className="bg-[#0d1426] text-white">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Message Field with Character Counter */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="contact_message"
                className="block text-xs font-bold text-gray-300 tracking-wide"
              >
                Message <span className="text-[#ff7a00]">*</span>
              </label>
              <span
                className={`text-[10px] font-mono font-bold ${
                  message.length > 950 ? 'text-amber-400' : 'text-gray-400'
                }`}
              >
                {message.length} / 1000
              </span>
            </div>
            <textarea
              id="contact_message"
              required
              rows={4}
              maxLength={1000}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (errors.message) setErrors({ ...errors, message: '' });
              }}
              placeholder="How can we help? Share your ideas, feedback, or inquiries..."
              className={`w-full p-3.5 rounded-xl bg-[#0d1426] border text-[16px] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff7a00] transition-colors resize-none leading-relaxed ${
                errors.message ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[#26314d]'
              }`}
            />
            {errors.message && (
              <p className="text-[11px] text-rose-400 font-semibold">{errors.message}</p>
            )}
          </div>

          {/* Privacy Note */}
          <div className="flex items-center gap-2 pt-1 text-[11px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1fd1a0] shrink-0" />
            <span>{contactContent.privacyNotice}</span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !isOnline}
            className={`w-full h-[50px] min-h-[44px] rounded-xl font-display font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg active:scale-[0.98] ${
              isSubmitting || !isOnline
                ? 'bg-[#1e2a4a] text-gray-400 cursor-not-allowed border border-[#26314d]'
                : 'bg-gradient-to-r from-[#ff7a00] via-[#ff8800] to-[#ff7a00] hover:brightness-105 text-black shadow-[0_0_20px_rgba(255,122,0,0.35)]'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 fill-current" />
                <span>Send Message</span>
              </>
            )}
          </button>
        </form>

        {/* "Other ways to reach us" Section (rendered ONLY if channels are configured) */}
        {configuredChannels.length > 0 && (
          <div className="p-4 rounded-2xl bg-[#141d33] border border-[#26314d] shadow-lg space-y-3">
            <h2 className="text-xs font-black font-display uppercase tracking-wider text-gray-300">
              Other ways to reach us
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {contactContent.channels.email && (
                <a
                  href={`mailto:${contactContent.channels.email}`}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0d1426] border border-[#26314d] hover:border-[#ff7a00]/40 transition-colors text-xs text-white"
                >
                  <Mail className="w-4 h-4 text-[#ff7a00]" />
                  <span className="truncate">{contactContent.channels.email}</span>
                </a>
              )}
              {contactContent.channels.whatsapp && (
                <a
                  href={`https://wa.me/${contactContent.channels.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0d1426] border border-[#26314d] hover:border-[#1fd1a0]/40 transition-colors text-xs text-white"
                >
                  <Phone className="w-4 h-4 text-[#1fd1a0]" />
                  <span className="truncate">WhatsApp</span>
                </a>
              )}
              {contactContent.channels.instagram && (
                <a
                  href={contactContent.channels.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0d1426] border border-[#26314d] hover:border-pink-500/40 transition-colors text-xs text-white"
                >
                  <InstagramIcon className="w-4 h-4 text-pink-400" />
                  <span className="truncate">Instagram</span>
                </a>
              )}
              {contactContent.channels.twitter && (
                <a
                  href={contactContent.channels.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0d1426] border border-[#26314d] hover:border-sky-500/40 transition-colors text-xs text-white"
                >
                  <XIcon className="w-4 h-4 text-sky-400" />
                  <span className="truncate">X (Twitter)</span>
                </a>
              )}
              {contactContent.channels.website && (
                <a
                  href={contactContent.channels.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0d1426] border border-[#26314d] hover:border-[#ffb703]/40 transition-colors text-xs text-white"
                >
                  <Globe className="w-4 h-4 text-[#ffb703]" />
                  <span className="truncate">Official Website</span>
                </a>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ContactScreen;
