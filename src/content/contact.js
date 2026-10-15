/**
 * Content configuration for the Contact Us page (/contact)
 * Direct communications and channels for Ghreatness Laboratory / Gbedu Games
 */

export const contactContent = {
  header: {
    title: 'Contact us',
    subtitle: 'We reply fast. Send feedback, bug reports, or partnership inquiries.',
  },

  topics: [
    { value: 'Feedback', label: 'General Feedback & Ideas' },
    { value: 'Bug report', label: 'Bug Report / Technical Issue' },
    { value: 'Partnership', label: 'Partnership & Sponsorship' },
    { value: 'Other', label: 'Other Inquiries' },
  ],

  privacyNotice: 'We only use your details to reply to your message.',

  // External / alternate communication channels.
  // Leave empty strings for channels you don't currently use or haven't configured yet.
  // The UI will ONLY render channels that have non-empty values.
  channels: {
    // TODO: Add contact email address when ready (e.g. "contact@ghreatness.com")
    email: '',

    // TODO: Add WhatsApp phone number with country code when ready (e.g. "+2348012345678" or "2348012345678")
    whatsapp: '',

    // TODO: Add official Instagram profile URL when ready (e.g. "https://instagram.com/ghreatnesslab")
    instagram: '',

    // TODO: Add official X (formerly Twitter) profile URL when ready (e.g. "https://x.com/ghreatnesslab")
    twitter: '',

    // TODO: Add official website URL when ready (e.g. "https://ghreatnesslab.com")
    website: '',
  },
};

export default contactContent;
