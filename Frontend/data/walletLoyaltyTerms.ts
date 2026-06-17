export interface WalletLoyaltyTermsSection {
  heading: string;
  blocks: string[];
}

export interface WalletLoyaltyTermsContent {
  title: string;
  sections: WalletLoyaltyTermsSection[];
}

export const walletLoyaltyTermsAr: WalletLoyaltyTermsContent = {
  title: 'شروط وأحكام الأرباح المحفظة والولاء والإحالات',
  sections: [
    {
      heading: 'أولاً: التعريفات',
      blocks: [
        '• المنصة: تعني النظام الإلكتروني المقدم للخدمات.',
        '• المستخدم: كل شخص مسجل في المنصة.',
        '• الإحالة: دعوة مستخدمين جدد عبر رابط خاص.',
        '• الأرباح: المبالغ أو المكافآت المكتسبة من خلال النظام.',
      ],
    },
    {
      heading: 'ثانياً: نظام الولاء',
      blocks: [
        '• يحصل المستخدم على نسبة ربح محددة من كل طلب مكتمل يتم من خلاله.',
        '• تختلف نسبة الربح حسب مستوى المستخدم (BASIC، SILVER، GOLD، VIP، PARTNER).',
        '• يتم تحديث المستوى تلقائياً بناءً على نشاط المستخدم أو إجمالي إنفاقه.',
        '• لا يجوز نقل أو بيع أو التنازل عن المستوى لأي طرف آخر.',
        '• تحتفظ المنصة بحق تعديل نسب الأرباح أو المستويات أو آلية احتسابها في أي وقت دون إشعار مسبق.',
      ],
    },
    {
      heading: 'ثالثاً: نظام الإحالة',
      blocks: [
        '• يحصل المستخدم على رابط إحالة خاص وفريد.',
        '• يتم احتساب الإحالة فقط عند تسجيل مستخدم جديد باستخدام رابط الإحالة.',
        '• يجب أن يكون المستخدم المُحال جديداً ولم يسبق له التسجيل في المنصة.',
        '• تُحتسب الأرباح بعد إتمام أول طلب فعلي للمستخدم المُحال.',
        '• يُمنع منعاً باتاً إنشاء حسابات وهمية أو استخدام وسائل احتيالية أو استغلال النظام بأي شكل للحصول على أرباح.',
      ],
    },
    {
      heading: 'رابعاً: الأرباح والسحب',
      blocks: [
        '• يتم إضافة الأرباح إلى محفظة المستخدم بعد تأكيد الطلب واكتماله.',
        '• قد يتم تصنيف بعض الأرباح كـ "قيد الانتظار" حتى استيفاء الشروط المطلوبة.',
        '• تخضع عمليات السحب لحد أدنى تحدده المنصة، مع الالتزام بسياسات الدفع المعتمدة.',
        '• تحتفظ المنصة بحق تأخير أو رفض أو إلغاء أي عملية سحب في حال الاشتباه بأي مخالفة أو نشاط غير مشروع.',
        '• مدة صلاحية الرصيد:\nجميع الأرباح أو الأرصدة المضافة إلى محفظة المستخدم تكون صالحة لمدة 6 (ستة) أشهر من تاريخ إضافتها.\nفي حال عدم استخدام الرصيد أو سحبه خلال هذه المدة، يحق للمنصة إلغاء الرصيد أو إعادة ضبطه، مع إمكانية إشعار المستخدم قبل انتهاء المدة، وذلك دون أي التزام بالتعويض.',
        '• رسوم التحويلات والسحب (مهم):\nعند طلب سحب الأرباح أو تحويلها، سيتم استقطاع رسوم التحويل المالي والرسوم البنكية، بما في ذلك رسوم التحويلات البنكية الدولية والرسوم البنكية الوسيطة إن وجدت.\nيتحمل المستخدم جميع هذه الرسوم، ويتم خصمها مباشرة من المبلغ المحول.\nوقد يختلف المبلغ المستلم فعلياً عن المبلغ المطلوب تحويله نتيجة اختلاف الرسوم البنكية أو فروقات العملة أو سياسات البنوك في الدولة المستلمة، ولا تتحمل المنصة أي مسؤولية عن ذلك.',
      ],
    },
    {
      heading: 'خامساً: الاستخدام غير المشروع',
      blocks: [
        '• يُحظر استخدام النظام لأي أغراض غير قانونية أو احتيالية.',
        '• في حال اكتشاف أي مخالفة، يحق للمنصة اتخاذ الإجراءات التالية دون إشعار مسبق:',
        '• إيقاف أو تعليق الحساب',
        '• إلغاء أو مصادرة الأرباح',
        '• اتخاذ الإجراءات القانونية اللازمة',
      ],
    },
    {
      heading: 'سادساً: التعديلات',
      blocks: [
        '• يحق للمنصة تعديل هذه الشروط والأحكام في أي وقت.',
        '• يعتبر استمرار المستخدم في استخدام النظام موافقة ضمنية على التعديلات.',
      ],
    },
    {
      heading: 'سابعاً: أحكام عامة',
      blocks: [
        '• تُعد هذه الشروط جزءاً لا يتجزأ من شروط وأحكام استخدام المنصة العامة، ولا يجوز تفسيرها بشكل منفصل عنها.',
        '• في حال وجود تعارض بين هذه الشروط وأي شروط أخرى، يتم تطبيق ما تراه المنصة مناسباً بما يحقق مصلحتها التنظيمية.',
        '• تكون النسخة العربية هي المرجع الأساسي في حال وجود اختلاف في التفسير.',
      ],
    },
    {
      heading: 'ثامنا: تجميد الأرباح والمحفظة',
      blocks: [
        '• يحق للمنصة تجميد أي رصيد أو أرباح أو عمولات أو مكافآت بشكل مؤقت في حال وجود نزاع أو شكوى أو اشتباه بعملية احتيالية أو مخالفة للشروط أو عند الحاجة للتحقق من هوية المستخدم أو صحة العمليات المنفذة.',
      ],
    },
    {
      heading: 'تاسعا:التحقق من الهوية قبل السحب',
      blocks: [
        '• يحق للمنصة طلب مستندات إثبات الهوية أو إثبات ملكية الحساب البنكي أو أي مستندات إضافية قبل تنفيذ أي عملية سحب، ويجوز تعليق السحب حتى استكمال التحقق.',
      ],
    },
    {
      heading: 'عاشرا:الأرباح الناتجه عن الأخطاء التقنية',
      blocks: [
        '• لا يكتسب المستخدم أي حق في الأرباح أو المكافآت أو العمولات أو الأرصدة أو أي مزايا أخرى ناتجة عن خطأ تقني أو برمجي أو محاسبي أو تشغيلي أو بشري أو أي خطأ آخر من أي نوع. ويحق للمنصة في أي وقت تصحيح الخطأ واسترداد أو خصم أو إلغاء أو تعديل تلك المبالغ أو المزايا، واتخاذ ما تراه من إجراءات لازمة لمعالجة الخطأ وآثاره، بما لا يتعارض مع الأنظمة والقوانين المعمول بها في دولة الإمارات العربية المتحدة.',
      ],
    },
    {
      heading: 'الحادي عشر:الحد الأدنى والأقصى للسحب',
      blocks: [
        '• تخضع عمليات السحب للحدود والسياسات التشغيلية المعتمدة من قبل المنصة، ويحق للمنصة تحديد أو تعديل الحد الأدنى أو الحد الأقصى للسحب أو عدد عمليات السحب المسموح بها أو فترات المعالجة أو وسائل السحب المتاحة في أي وقت وفق ما تراه مناسباً.',
      ],
    },
  ],
};

export const walletLoyaltyTermsEn: WalletLoyaltyTermsContent = {
  title: 'Wallet, Loyalty & Referral Terms & Conditions',
  sections: [
    {
      heading: '1. Definitions',
      blocks: [
        '• Platform: The online system providing services.',
        '• User: Any registered individual on the platform.',
        '• Referral: Inviting new users via a unique referral link.',
        '• Earnings: Rewards or commissions earned through the system.',
      ],
    },
    {
      heading: '2. Loyalty Program',
      blocks: [
        '• Users earn a commission on each completed order.',
        '• Commission rates vary depending on the user level (BASIC, SILVER, GOLD, VIP, PARTNER).',
        '• Levels are automatically updated based on user activity or total spending.',
        '• Levels are non-transferable and may not be sold or assigned.',
        '• The platform reserves the right to modify commission rates, levels, or calculation methods at any time without prior notice.',
      ],
    },
    {
      heading: '3. Referral Program',
      blocks: [
        '• Each user is assigned a unique referral link.',
        '• Referrals are counted only when a new user registers via the referral link.',
        '• Referred users must be new and not previously registered.',
        '• Earnings are granted after the referred user completes their first valid order.',
        '• Any fraudulent activity, including fake accounts or abuse of the system, is strictly prohibited.',
      ],
    },
    {
      heading: '4. Earnings & Withdrawal',
      blocks: [
        '• Earnings are credited to the user’s wallet after order completion and confirmation.',
        '• Some earnings may remain in a “pending” status until all conditions are fulfilled.',
        '• Withdrawals are subject to minimum thresholds and applicable payment policies.',
        '• The platform reserves the right to delay, reject, or cancel withdrawals in case of suspected violations.',
        '• Wallet Balance Validity:\nAll earnings or balances credited to the user’s wallet are valid for 6 (six) months from the date of credit.\nIf the balance is not used or withdrawn within this period, the platform reserves the right to cancel or reset the balance, with the option to notify the user prior to expiration, without any obligation to compensate.',
        '• Transfer & Banking Fees (Important):\nWhen requesting a withdrawal or transfer of earnings, applicable transfer fees and banking charges will be deducted, including international transfer fees and intermediary bank charges where applicable.\nThe user bears all such fees, which will be deducted directly from the transferred amount.\nThe final amount received may differ from the requested amount due to banking fees, currency exchange differences, or policies of the receiving bank, and the platform shall not be held responsible for such differences.',
      ],
    },
    {
      heading: '5. Misuse',
      blocks: [
        '• Any illegal, fraudulent, or abusive use of the system is strictly prohibited.',
        '• In case of violation, the platform reserves the right to:',
        '• Suspend or terminate the account',
        '• Cancel or confiscate earnings',
        '• Take legal action if necessary',
      ],
    },
    {
      heading: '6. Modifications',
      blocks: [
        '• The platform reserves the right to update these terms at any time.',
        '• Continued use of the platform constitutes acceptance of such changes.',
      ],
    },
    {
      heading: '7. General Terms',
      blocks: [
        '• These terms form an integral part of the platform’s general Terms & Conditions and may not be interpreted independently.',
        '• In case of conflict, the platform reserves the right to determine the applicable terms as it deems appropriate.',
        '• The Arabic version shall prevail in case of any discrepancy in interpretation.',
      ],
    },
    {
      heading: '8.Freezing of Earnings and Wallet Balance',
      blocks: [
        '• The Platform reserves the right to temporarily freeze any wallet balance, earnings, commissions, rewards, or other credits in the event of a dispute, complaint, suspected fraudulent activity, violation of these Terms, or where verification of the User’s identity or the validity of transactions is required.',
      ],
    },
    {
      heading: '9.Identity Verification Prior to Withdrawal',
      blocks: [
        '• The Platform reserves the right to request proof of identity, proof of ownership of the designated bank account, or any additional supporting documents before processing any withdrawal request. The Platform may suspend, delay, or reject the withdrawal process until the required verification procedures have been successfully completed.',
      ],
    },
    {
      heading: '10.Earnings Resulting from Technical Errors',
      blocks: [
        '• The User shall not acquire any right, entitlement, or claim to any earnings, rewards, commissions, balances, credits, or other benefits resulting from any technical, software, accounting, operational, human, system, or other error of any kind. The Platform reserves the right, at any time, to correct such errors and recover, deduct, reverse, cancel, or adjust any amounts or benefits credited as a result thereof, and to take any actions it deems necessary to remedy such errors and their consequences, provided that such actions do not conflict with the applicable laws and regulations of the United Arab Emirates.',
      ],
    },
    {
      heading: '10.Minimum and Maximum Withdrawal Limits',
      blocks: [
        '• Withdrawals shall be subject to the operational policies and limits established by the Platform. The Platform reserves the right to determine, modify, impose, or remove minimum or maximum withdrawal amounts, the number of permitted withdrawal requests, processing periods, available withdrawal methods, or any related withdrawal requirements at any time as it deems appropriate.',
      ],
    },
  ],
};
