
import React, { useState } from 'react';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { Menu, X, Globe, LogIn, ChevronRight, ChevronLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface NavbarProps {
  onLoginClick: () => void;
  onHomeClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onLoginClick, onHomeClick }) => {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { t, language, toggleLanguage } = useLanguage();
  const ChevronIcon = language === 'ar' ? ChevronLeft : ChevronRight;

  const navItems = [
    { label: t.nav.home, href: '#home' },
    { label: t.nav.about, href: '#about' },
    { label: t.nav.guarantees, href: '#guarantees' },
    { label: t.nav.howItWorks, href: '#how-it-works' },
    { label: t.nav.merchants, href: '#merchants' },
  ];

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;

    // Hide on scroll down (if moved more than 10px down and past initial threshold)
    if (latest > previous + 10 && latest > 150) {
      setHidden(true);
    }
    // Show on scroll up (if moved more than 10px up)
    else if (previous > latest + 10) {
      setHidden(false);
    }

    if (latest > 50) {
      setScrolled(true);
    } else {
      setScrolled(false);
    }
  });

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();

    if (href === '#home') {
      onHomeClick();
      setMobileMenuOpen(false);
      return;
    }

    const targetId = href.replace('#', '');
    const element = document.getElementById(targetId);

    if (element) {
      setMobileMenuOpen(false);
      const offset = 100; // Adjust for fixed navbar height
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <>
      <motion.nav
        variants={{
          visible: { y: 0, opacity: 1 },
          hidden: { y: -100, opacity: 0 },
        }}
        initial="visible"
        animate={hidden ? "hidden" : "visible"}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className="fixed top-4 md:top-6 left-0 right-0 z-40 flex justify-center px-4 will-change-transform pointer-events-none"
      >
        <div
          className={`
            pointer-events-auto
            relative w-full max-w-6xl 
            rounded-full 
            transition-all duration-300
            flex items-center justify-between
            px-4 py-2 md:px-6 md:py-3
            ${scrolled
              ? 'bg-[#151310]/90 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]'
              : 'bg-white/5 backdrop-blur-sm border border-white/5 shadow-sm'
            }
          `}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={(e) => handleNavClick(e as any, '#home')}>
            <img
              src="/logo.png"
              alt="E-Tashleh Logo"
              width="56"
              height="56"
              className="w-10 h-10 md:w-12 md:h-12 object-contain brightness-0 invert"
            />
          </div>

          {/* Desktop Links - Pill Container */}
          <div className="hidden lg:flex items-center gap-1 bg-black/20 rounded-full px-2 py-1 border border-white/5">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap text-white/70 hover:text-white hover:bg-white/10 active:bg-gold-500/20 active:text-gold-400"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-4">

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-gold-500/30 transition-all text-white/90 text-xs md:text-sm font-medium"
            >
              <Globe size={14} className="text-gold-400 md:w-4 md:h-4" />
              <span className="mt-0.5 uppercase">{language === 'ar' ? 'EN' : 'عربي'}</span>
            </button>

            <div className="h-6 w-[1px] bg-white/10 hidden sm:block"></div>

            {/* Login Button (Desktop/Tablet) */}
            <button
              onClick={onLoginClick}
              className="hidden sm:flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-gold-600 to-gold-400 text-white font-bold text-sm shadow-[0_4px_20px_rgba(168,139,62,0.3)] hover:shadow-[0_4px_25px_rgba(168,139,62,0.5)] hover:scale-105 transition-all"
            >
              <LogIn size={16} />
              <span>{t.nav.login}</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              className="lg:hidden text-white p-2 active:scale-95 transition-transform"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open Menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: language === 'ar' ? '100%' : '-100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: language === 'ar' ? '100%' : '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-[#1A1814]/98 backdrop-blur-xl lg:hidden flex flex-col will-change-transform"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-2">
                <img
                  src="/logo.png"
                  alt="E-Tashleh Logo"
                  loading="lazy"
                  className="w-10 h-10 object-contain brightness-0 invert"
                />
                <span className="font-bold text-white text-lg">E-Tashleh</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-white/60 hover:text-white p-2 bg-white/5 rounded-full">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-8 px-6 flex flex-col gap-2">
              {navItems.map((item, idx) => (
                <motion.a
                  key={item.href}
                  href={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + (idx * 0.05) }}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className="flex items-center justify-between p-4 rounded-xl text-lg font-medium text-white/90 hover:bg-white/5 active:bg-gold-500/10 active:text-gold-400 transition-colors border border-transparent hover:border-white/5"
                >
                  <span>{item.label}</span>
                  <ChevronIcon size={18} className="text-white/20" />
                </motion.a>
              ))}
            </div>

            <div className="p-6 border-t border-white/5 bg-[#151310]">
              <button
                onClick={() => { setMobileMenuOpen(false); onLoginClick(); }}
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gold-500 text-white font-bold w-full shadow-lg shadow-gold-500/20 active:scale-[0.98] transition-transform"
              >
                <LogIn size={20} />
                <span>{t.nav.login}</span>
              </button>
              <div className="text-center mt-6 text-white/30 text-xs font-mono">
                ADMIN PANEL V2.0 MOBILE
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
