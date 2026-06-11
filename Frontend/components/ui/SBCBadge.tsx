import React from 'react';

export const SBCBadge: React.FC = () => {
  return (
    <a
      href="https://eauthenticate.saudibusiness.gov.sa/certificate-details/0000177555"
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col sm:inline-flex items-center group cursor-pointer"
    >
      <div className="bg-white flex items-center justify-center rounded-full sm:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow w-[56px] h-[56px] sm:w-auto sm:h-auto sm:px-4 sm:py-2 sm:gap-4 shrink-0">
        {/* Logo Container - perfectly centered */}
        <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center shrink-0">
          <img
            src="https://drive.google.com/thumbnail?id=1ZirCRTXqDpO8FUXhmcYV7-oBAw7Xv0dA&sz=w1000"
            alt="SBC Logo"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Desktop Text (inside white box) */}
        <div className="hidden sm:flex flex-col items-start pr-1">
          <span className="text-[10px] text-gray-500 font-bold mb-0.5 leading-tight">موثق في المركز السعودي للأعمال</span>
          <span className="text-sm font-bold text-[#002B5C] tracking-widest font-mono leading-none mt-0.5">0000177555</span>
        </div>
      </div>

      {/* Mobile Text (underneath) */}
      <span className="sm:hidden text-[13px] font-bold text-white/90 font-mono tracking-widest mt-2 group-hover:text-white transition-colors">
        0000177555
      </span>
    </a>
  );
};