import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const HERO_WIDTHS = [640, 1024, 1600, 2400];
const srcSet = (ext: 'avif' | 'webp') => HERO_WIDTHS.map((w) => `/landing/hero-${w}.${ext} ${w}w`).join(', ');

export const HomeHero: React.FC = () => {
    const { t } = useLanguage();
    const hero = t.common.home.hero;

    return (
        <section className="relative overflow-hidden bg-[#1A1814] min-h-[340px] sm:min-h-[400px] lg:min-h-[520px] xl:min-h-[580px]">
            <picture>
                <source type="image/avif" srcSet={srcSet('avif')} sizes="100vw" />
                <img
                    src="/landing/hero-1024.webp"
                    srcSet={srcSet('webp')}
                    sizes="100vw"
                    alt={hero.imageAlt}
                    width={2752}
                    height={1376}
                    fetchPriority="high"
                    loading="eager"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover object-[70%_center]"
                />
            </picture>

            <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#1A1814]/95 via-[#1A1814]/55 to-transparent" />
            <div className="absolute inset-0 pointer-events-none bg-[#1A1814]/45 md:hidden" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none bg-gradient-to-t from-[#1A1814] to-transparent" />

            <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-8 sm:pt-12 lg:pt-16 xl:pt-20 pb-20 md:pb-28">
                <div className="max-w-xl lg:max-w-2xl mr-auto text-start">
                    <h1 className="stagger-item text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-white tracking-tight" style={{ animationDelay: '0.1s' }}>
                        {hero.brand}
                    </h1>
                    <p className="stagger-item text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gold-400 leading-snug mt-3 lg:mt-4" style={{ animationDelay: '0.2s' }}>
                        {hero.line1}
                    </p>
                    <p className="stagger-item text-lg sm:text-xl xl:text-2xl text-white font-semibold mt-1 lg:mt-2" style={{ animationDelay: '0.3s' }}>
                        {hero.line2}
                    </p>
                    <p className="stagger-item text-sm sm:text-base xl:text-lg text-white/75 mt-2" style={{ animationDelay: '0.35s' }}>
                        {hero.line3}
                    </p>
                    <span className="stagger-item inline-flex mt-4 lg:mt-6 px-4 lg:px-5 py-1.5 lg:py-2 rounded-full border border-gold-500/40 bg-gold-500/10 text-gold-400 text-sm lg:text-base font-bold" style={{ animationDelay: '0.4s' }}>
                        {hero.tagline}
                    </span>
                </div>
            </div>
        </section>
    );
};
