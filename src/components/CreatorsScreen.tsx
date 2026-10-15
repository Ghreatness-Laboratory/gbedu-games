import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';
import {
  ArrowLeft,
  Target,
  Layers,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Building2,
  Cpu,
} from 'lucide-react';
import { creatorsContent } from '../content/creators';
import { soundEngine } from '../audio/audioEngine';

export const CreatorsScreen: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    soundEngine.playClick();
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/home');
    }
  };

  const handleContactClick = () => {
    soundEngine.playAgogo(true);
    navigate(creatorsContent.footer.contactRoute);
  };

  // Stagger animation container
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.28 },
    },
  };

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
          Creators
        </span>

        <button
          onClick={handleContactClick}
          aria-label="Contact us"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#ffb703] hover:text-white transition-colors cursor-pointer rounded-xl px-2"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-5 space-y-5">
        {/* HERO SECTION */}
        <div className="text-center space-y-3 pt-2 pb-1">
          {/* Stylized Ghreatness Laboratory Emblem / Wordmark */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#141d33] to-[#1e2a4a] border-2 border-[#ff7a00]/40 shadow-[0_0_24px_rgba(255,122,0,0.25)] mb-1">
            <span className="font-display font-black text-2xl tracking-tighter bg-gradient-to-r from-[#ff7a00] via-[#ffb703] to-[#1fd1a0] bg-clip-text text-transparent">
              GL
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">
              {creatorsContent.hero.title}
            </h1>
            <p className="text-xs sm:text-sm font-bold text-[#ffb703] mt-1 tracking-wide">
              {creatorsContent.hero.tagline}
            </p>
          </div>

          {creatorsContent.hero.showMadeInNigeria && (
            <div className="inline-block px-3 py-1 rounded-full bg-[#1fd1a0]/10 border border-[#1fd1a0]/30 text-[#1fd1a0] text-[11px] font-bold">
              {creatorsContent.hero.madeInNigeriaText}
            </div>
          )}

          <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
            {creatorsContent.hero.subtext}
          </p>
        </div>

        {/* STAGGERED SECTIONS */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {/* 1. MISSION */}
          <motion.section
            variants={itemVariants}
            className="p-4 sm:p-5 rounded-2xl bg-[#141d33] border border-[#26314d] shadow-lg relative overflow-hidden"
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#ff7a00]/15 border border-[#ff7a00]/30 flex items-center justify-center text-[#ff7a00]">
                <Target className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-black font-display uppercase tracking-wider text-[#ff7a00]">
                {creatorsContent.sections.mission.title}
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-gray-200 leading-relaxed">
              {creatorsContent.sections.mission.content}
            </p>
          </motion.section>

          {/* 2. WHAT WE DO */}
          <motion.section
            variants={itemVariants}
            className="p-4 sm:p-5 rounded-2xl bg-[#141d33] border border-[#26314d] shadow-lg relative overflow-hidden"
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#1fd1a0]/15 border border-[#1fd1a0]/30 flex items-center justify-center text-[#1fd1a0]">
                <Layers className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-black font-display uppercase tracking-wider text-[#1fd1a0]">
                {creatorsContent.sections.whatWeDo.title}
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-gray-200 leading-relaxed">
              {creatorsContent.sections.whatWeDo.content}
            </p>
          </motion.section>

          {/* 3. HOW WE OPERATE */}
          <motion.section
            variants={itemVariants}
            className="p-4 sm:p-5 rounded-2xl bg-[#141d33] border border-[#26314d] shadow-lg relative overflow-hidden"
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#ffb703]/15 border border-[#ffb703]/30 flex items-center justify-center text-[#ffb703]">
                <Cpu className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-black font-display uppercase tracking-wider text-[#ffb703]">
                {creatorsContent.sections.howWeOperate.title}
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-gray-200 leading-relaxed">
              {creatorsContent.sections.howWeOperate.content}
            </p>
          </motion.section>

          {/* 4. OUR PRODUCTS */}
          <motion.section
            variants={itemVariants}
            className="p-4 sm:p-5 rounded-2xl bg-[#141d33] border border-[#26314d] shadow-lg space-y-3"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black font-display uppercase tracking-wider text-white">
                  {creatorsContent.sections.products.title}
                </h2>
                <p className="text-[11px] text-gray-400">
                  {creatorsContent.sections.products.subtitle}
                </p>
              </div>
            </div>

            {/* 2-column grid of product chips */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {creatorsContent.sections.products.items.map((prod, idx) => {
                const initial = prod.name.trim().charAt(0).toUpperCase();
                const isTappable = Boolean(prod.url && prod.url.trim().length > 0);

                const cardContent = (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      style={{ backgroundColor: `${prod.color || '#ff7a00'}22`, borderColor: `${prod.color || '#ff7a00'}44`, color: prod.color || '#ff7a00' }}
                      className="w-8 h-8 rounded-lg border flex items-center justify-center font-display font-black text-sm shrink-0 shadow-inner"
                    >
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate font-display">
                        {prod.name}
                      </p>
                      {prod.tagline ? (
                        <p className="text-[10px] text-gray-400 truncate">
                          {prod.tagline}
                        </p>
                      ) : (
                        <p className="text-[10px] text-gray-500 italic">
                          Ghreatness Brand
                        </p>
                      )}
                    </div>
                    {isTappable && (
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-white shrink-0 transition-colors" />
                    )}
                  </div>
                );

                if (isTappable) {
                  return (
                    <a
                      key={idx}
                      href={prod.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group p-2.5 min-h-[50px] rounded-xl bg-[#0d1426] hover:bg-[#1a2540] active:scale-[0.98] border border-[#26314d] hover:border-[#ff7a00]/40 transition-all cursor-pointer flex items-center focus:outline-none focus:ring-1 focus:ring-[#ff7a00]"
                    >
                      {cardContent}
                    </a>
                  );
                }

                return (
                  <div
                    key={idx}
                    className="p-2.5 min-h-[50px] rounded-xl bg-[#0d1426] border border-[#26314d] flex items-center select-none"
                  >
                    {cardContent}
                  </div>
                );
              })}
            </div>
          </motion.section>
        </motion.div>

        {/* FOOTER */}
        <div className="pt-4 pb-8 text-center space-y-3">
          <p className="text-xs text-gray-400 font-medium">
            {creatorsContent.footer.productNotice}
          </p>

          <button
            onClick={handleContactClick}
            className="w-full h-[48px] min-h-[44px] rounded-xl bg-[#141d33] hover:bg-[#1a2540] active:scale-[0.98] border border-[#ff7a00]/50 hover:border-[#ff7a00] text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md group"
          >
            <MessageCircle className="w-4 h-4 text-[#ff7a00] group-hover:scale-110 transition-transform" />
            <span>{creatorsContent.footer.contactButtonText}</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default CreatorsScreen;
