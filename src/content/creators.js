/**
 * Content configuration for the "Meet the Creators" page (/creators)
 * Ghreatness Laboratory company profile & product portfolio
 */

export const creatorsContent = {
  hero: {
    title: 'Ghreatness Laboratory',
    tagline: 'Built by Ghreatness Laboratory',
    // Set to true only if the owner confirms adding the line
    showMadeInNigeria: false,
    madeInNigeriaText: 'Made with love in Nigeria 🇳🇬',
    subtext: 'Pioneering African gaming, interactive media, and scalable technology infrastructure.',
  },

  sections: {
    mission: {
      id: 'mission',
      title: 'Our Mission',
      content:
        'To simplify digital transformation by providing businesses with a unified Platform-as-a-Service that delivers scalable technology solutions, shared infrastructure, and strategic support, empowering ventures to grow from early-stage ideas into high-impact companies.',
    },

    whatWeDo: {
      id: 'what-we-do',
      title: 'What We Do',
      content:
        'Ghreatness Labs is a technology holding group and IT solutions provider on a mission to simplify digital transformation. Through our unified Platform-as-a-Service (PaaS) model, we give businesses access to a full suite of digital and IT services under one roof: scalable, seamless, and built for long-term growth.',
    },

    howWeOperate: {
      id: 'how-we-operate',
      title: 'How We Operate',
      content:
        'We operate with product-led experimentation and continuous data-driven iteration across every live feature. This approach allows us to move fast, stay precise, and deliver real results. Beyond services, we also incubate and scale technology-driven brands. By providing shared infrastructure, strategic leadership, and forward-thinking execution, we turn early-stage ventures into high-impact companies.',
    },

    products: {
      id: 'products',
      title: 'Our Products',
      subtitle: 'Ventures & technology-driven brands incubated and scaled by Ghreatness Laboratory',
      // Config array for each product.
      // Leave url and tagline empty until provided. When url is set, the card becomes a tap target opening in a new tab.
      items: [
        {
          name: 'Univyx',
          // TODO: Add tagline when ready (e.g. "Cloud learning platform")
          tagline: '',
          // TODO: Add live URL when ready (e.g. "https://univyx.com")
          url: '',
          logo: null,
          color: '#ff7a00',
        },
        {
          name: 'FragNaija',
          // TODO: Add tagline when ready (e.g. "Premier Nigerian gaming network")
          tagline: '',
          // TODO: Add live URL when ready
          url: '',
          logo: null,
          color: '#1fd1a0',
        },
        {
          name: 'Athlegame Esports',
          // TODO: Add tagline when ready
          tagline: '',
          // TODO: Add live URL when ready
          url: '',
          logo: null,
          color: '#ffb703',
        },
        {
          name: 'Sonariq Sounds',
          // TODO: Add tagline when ready
          tagline: '',
          // TODO: Add live URL when ready
          url: '',
          logo: null,
          color: '#ec4899',
        },
        {
          name: 'Civyn',
          // TODO: Add tagline when ready
          tagline: '',
          // TODO: Add live URL when ready
          url: '',
          logo: null,
          color: '#8b5cf6',
        },
        {
          name: 'Univyx Arena',
          // TODO: Add tagline when ready
          tagline: '',
          // TODO: Add live URL when ready
          url: '',
          logo: null,
          color: '#3b82f6',
        },
        {
          name: 'Prothlete Esports',
          // TODO: Add tagline when ready
          tagline: '',
          // TODO: Add live URL when ready
          url: '',
          logo: null,
          color: '#ef4444',
        },
      ],
    },
  },

  footer: {
    productNotice: 'Gbedu Games is a Ghreatness Laboratory product',
    contactButtonText: 'Contact us',
    contactRoute: '/contact',
  },
};

export default creatorsContent;
