
export const common = {
  ar: {
    sar: 'ر.س',
    days: 'أيام',
    hours: 'ساعات',
    minutes: 'دقيقة',
    left: 'متبقي',
    active: 'نشط',
    expired: 'منتهي',
    late: 'متأخر',
    loading: 'جاري التحميل...',
    processing: 'جاري المعالجة...',
    viewAll: 'عرض الكل',
    details: 'التفاصيل',
    approve: 'اعتماد',
    reject: 'رفض',
    ban: 'حظر',
    unban: 'تنشيط',
    save: 'حفظ',
    cancel: 'إلغاء',
    edit: 'تعديل',
    delete: 'حذف',
    export: 'تصدير CSV',
    filter: 'تصفية',
    search: 'بحث...',
    print: 'طباعة',
    download: 'تحميل PDF',
    next: 'التالي',
    prev: 'السابق',
    submit: 'إرسال',
    back: 'عودة',
    required: 'مطلوب',
    optional: 'اختياري',
    success: 'تم بنجاح',
    error: 'حدث خطأ',
    systemOnline: 'النظام متصل',
    upload: 'رفع ملف',
    image: 'صورة',
    noData: 'لا توجد بيانات',
    actions: 'الإجراءات',
    status: {
      COLLECTING_OFFERS: 'جاري جمع أفضل العروض',
      AWAITING_SELECTION: 'بانتظار اختيارك للقطع',
      AWAITING_OFFERS: 'بانتظار العروض',
      AWAITING_PAYMENT: 'بانتظار الدفع',
      PREPARATION: 'قيد التجهيز',
      PREPARED: 'تم التجهيز',
      VERIFICATION: 'قيد فحص القطعة',
      VERIFICATION_SUCCESS: 'توثيق ناجح',
      READY_FOR_SHIPPING: 'جاهز للتسليم لشركة الشحن',
      NON_MATCHING: 'غير مطابق',
      CORRECTION_PERIOD: 'فترة التصحيح',
      CORRECTION_SUBMITTED: 'تم تصحيح التوثيق',
      DELAYED_PREPARATION: 'متأخر في التجهيز',
      PARTIALLY_SHIPPED: 'شحن جزئي',
      SHIPPED: 'تم الشحن',
      PARTIALLY_DELIVERED: 'تسليم جزئي',
      DELIVERED: 'تم التوصيل',
      COMPLETED: 'مكتمل',
      CANCELLED: 'ملغى',
      PARTIALLY_PAID: 'دفع جزئي',
      RETURNED: 'مرتجع',
      DISPUTED: 'نزاع',
      REFUNDED: 'تم الاسترداد',
      RETURN_REQUESTED: 'طلب إرجاع',
      RETURN_APPROVED: 'موافقة على الإرجاع',
      RESOLVED: 'تم الحل',
      CLOSED: 'قضية مغلقة',
      WARRANTY_ACTIVE: 'الضمان نشط 🛡️',
      WARRANTY_EXPIRED: 'الضمان منتهي',
      // Shipment Detailed Statuses
      RECEIVED_AT_HUB: 'تم الاستلام في المركز',
      QUALITY_CHECK_PASSED: 'اجتاز فحص الجودة',
      PACKAGED_FOR_SHIPPING: 'تم التغليف للشحن',
      AWAITING_CARRIER_PICKUP: 'بانتظار استلام شركة الشحن',
      PICKED_UP_BY_CARRIER: 'تم الاستلام من المندوب',
      IN_TRANSIT_TO_DESTINATION: 'في الطريق إلى الوجهة',
      ARRIVED_AT_LOCAL_FACILITY: 'وصلت للمركز المحلي',
      CUSTOMS_CLEARANCE: 'قيد التخليص الجمركي',
      AT_LOCAL_WAREHOUSE: 'في المستودع المحلي',
      OUT_FOR_DELIVERY: 'خارج للتوصيل مع المندوب',
      DELIVERY_ATTEMPTED: 'محاولة توصيل',
      DELIVERED_TO_CUSTOMER: 'تم التوصيل للعميل',
      RETURN_TO_SENDER_INITIATED: 'بدء الإرجاع للمرسل',
      RETURNED_TO_SENDER: 'تم الإرجاع للمرسل',
      // New Return & Warranty Journey 2026
      RETURN_LABEL_ISSUED: '📄 يتم أصدار بوليصة أرجاع للمنتج',
      RETURN_STARTED: '🔄 بدء الارجاع',
      RECEIVED_FROM_CUSTOMER: '📥 تم أستلام الشحنه من العميل',
      DELIVERED_TO_VENDOR: '📦 تم تسليم الشحنه للتاجر',
      EXCHANGE_COMPLETED: '✨ تم أستبدال الشحنه بنجاح',
      IN_TRANSIT_TO_CUSTOMER: '🚚 الشحنه فى طريقها للعميل',
      RETURN_COMPLETED_TO_CUSTOMER: '✅ تم أرجاع الشحنه للعميل بنجاح'
    },
    daysShort: ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'],
    location: 'الرياض، السعودية',
    roleSelection: {
      customerOrders: 'طلبات القطع للعملاء',
      storeLogin: 'دخول المتاجر',
      wholesaleOrders: 'دخول طلبات الجملة للشركات',
      howWeWork: 'تعرّف على طريقة عملنا قبل أن تبدأ معنا',
      typingMessage: 'معنا… تشاليح الإمارات توصلك وفلوسك بأمان',
      features: {
        title: 'معنا... تشاليح الإمارات توصلك وفلوسك بأمان',
        originalParts: 'قطع غيار أصلية مستعملة (غير مجددة أو معاد إصلاحها)',
        shipping: 'توصيل للخليج مع إمكانية الإرجاع والاستبدال',
        payment: 'الدفع آمن - لا تُصرف المبالغ للبائع إلا بعد استلامك القطعة والتأكد منها',
        video: 'افحص قطعتك بالفيديو والصور مباشرة مع المتجر',
        documentation: 'نوثّق المعاينة ونراجعها قبل الشحن لضمان التطابق',
        guarantee: 'ضمان الشحن في الوقت المحدد وسياسة إرجاع سهلة',
        terms: 'تُطبق الشروط والأحكام',
        orderNow: 'متابعة الطلب',
        back: 'كيف نعمل',
        earnIncome: 'اكسب دخل شهري معنا',
        earnIncomeDesc: 'كل طلب = ربح كاش يُضاف إلى محفظتك'
      }
    },
    home: {
      nav: { home: 'الرئيسية', about: 'من نحن', howWeWork: 'كيف نعمل', faq: 'الأسئلة الشائعة', contact: 'تواصل معنا', openMenu: 'فتح القائمة', closeMenu: 'إغلاق القائمة' },
      hero: {
        brand: 'إي-تشليح',
        line1: 'منصتك الإلكترونية لطلب قطع غيار السيارات المستعملة الأصلية',
        line2: 'من الإمارات إلى بابك في السعودية',
        line3: 'من خلال تشاليح ومتاجر موثوقة ومعتمدة لدينا',
        tagline: 'اطلبها إلكترونيًا… ونحن نتولى الباقي.',
        imageAlt: 'قطع غيار سيارات أصلية أمام أفق دبي'
      },
      features: {
        warranty: { title: 'ضمان وإرجاع', desc: 'حسب الشروط والسياسات' },
        shipping: { title: 'شحن إلى السعودية', desc: 'إلى باب بيتك أو ورشتك' },
        payment: { title: 'حماية دفعتك', desc: 'لا يتم تحويل المبلغ للمتجر إلا بعد استلامك للقطعة' },
        matching: { title: 'مطابقة القطعة', desc: 'نتحقق من مطابقة القطعة قبل شحنها' }
      },
      cta: { title: 'اطلب قطعتك الآن', desc: 'ابحث عن القطعة المناسبة واحصل على أفضل العروض من متاجر معتمدة' },
      roles: {
        customerDesc: 'متابعة طلباتك وعروض المتاجر',
        storeDesc: 'إدارة متجرك وعروضك',
        wholesaleDesc: 'أسعار خاصة للشركات والموردين',
        earnDesc: 'من برنامج الإحالة والمكافآت'
      },
      earn: { title: 'فرصة لزيادة دخلك', desc: 'انضم إلى برنامج الولاء والإحالة وابدأ بجني المكافآت من كل طلب', button: 'اكتشف المزيد', imageAlt: 'ألماسة وعملات ذهبية' },
      highlights: {
        support: { title: 'دعم العملاء', desc: 'فريق دعم جاهز لمساعدتك' },
        fastShipping: { title: 'شحن سريع', desc: 'من الإمارات إلى السعودية' },
        original: { title: 'قطع أصلية', desc: 'مستعملة وغير مجددة' },
        trust: { title: 'مصداقية وشفافية', desc: 'في كل خطوة من طلبك' }
      },
      faq: {
        title: 'الأسئلة الشائعة',
        subtitle: 'إجابات سريعة لأكثر ما يسأل عنه العملاء والمتاجر',
        customersTab: 'للعملاء',
        merchantsTab: 'للمتاجر',
        customers: [
          { q: 'كيف أطلب قطعة غيار؟', a: 'اضغط "اطلب قطعتك الآن"، أدخل بيانات سيارتك والقطعة المطلوبة، وستصلك عروض من متاجر وتشاليح معتمدة في الإمارات لتختار الأنسب.' },
          { q: 'هل القطع أصلية؟', a: 'نعم، جميع القطع أصلية مستعملة وغير مجددة أو معاد إصلاحها، وتُعرض من متاجر موثوقة ومعتمدة لدينا.' },
          { q: 'متى يستلم المتجر ثمن القطعة؟', a: 'لا يتم تحويل المبلغ للمتجر إلا بعد استلامك للقطعة والتأكد منها، لحماية دفعتك بالكامل.' },
          { q: 'كيف أتأكد أن القطعة مطابقة قبل الشحن؟', a: 'تتم مطابقة القطعة بالصور والفيديو ومراجعتها قبل شحنها، لضمان وصول القطعة الصحيحة لسيارتك.' },
          { q: 'هل يوجد ضمان وإرجاع؟', a: 'نعم، يتوفر الضمان والإرجاع أو الاستبدال حسب الشروط والسياسات المعتمدة في المنصة.' },
          { q: 'أين يتم التوصيل؟', a: 'نشحن من الإمارات إلى جميع مناطق المملكة العربية السعودية، حتى باب بيتك أو ورشتك.' }
        ],
        merchants: [
          { q: 'كيف أسجل متجري في المنصة؟', a: 'اضغط "دخول المتاجر" ثم أنشئ حساب متجر وأرفق بياناتك ومستنداتك التجارية، وسيتم مراجعة الطلب من فريق المنصة.' },
          { q: 'كيف أستقبل الطلبات؟', a: 'تصلك طلبات العملاء في لوحة تحكم متجرك، فتقدم عرض السعر المناسب ويختار العميل أفضل عرض.' },
          { q: 'متى أستلم أرباحي؟', a: 'تُضاف المبالغ إلى محفظتك بعد استلام العميل للقطعة وانتهاء فترة الإرجاع، ويمكنك طلب السحب إلى حسابك البنكي.' },
          { q: 'هل يوجد دعم للمتاجر؟', a: 'نعم، فريق الدعم الفني متاح لمساعدتك عبر زر "تواصل معنا" أو واتساب الأعمال.' }
        ]
      },
      about: {
        title: 'إي تشليح!',
        intro: 'منصة وسيطة للتجارة الإلكترونية مملوكة لشركة إليب الإماراتية تعني بقطع غيار السيارات المستعملة الأصلية ومهمتنا هي تقديم أفضل متاجر وتشاليح قطع غيار السيارات المستعملة في الإمارات لك وانت في بيتك، لتوفير قطع غيار مستعملة أصلية وغير مجددة أو معدلة أو مُصلحة، مع حماية كاملة لحقوقك.',
        highlights: [
          'قطع أصلية وفق معايير جودة صارمة.',
          'مطابقة القطعة والتأكد منها قبل الشحن.',
          'شحن من الإمارات إلى السعودية للمنزل أو الورشة.',
          'حماية أموالك: لا تُسلّم مستحقات المتجر إلا بعد استلامك وموافقتك.',
          'استرجاع واستبدال ومتابعة الضمان عند استحقاقه.',
          'برنامج ولاء وكاش باك يمكن تحويله إلى حسابك البنكي.'
        ],
        company: 'إليب ش.م.ح- شركة إماراتية مالك المنصة الإلكترونية إي-تشليح، مسجلة ومقرها رأس الخيمة - مركز كومباس للأعمال برأس مال مملوك 386مليون درهم إماراتي رخصة تجارية رقم 45000927 ويمكن التحقق من بياناتها عبر السجل الاقتصادي الوطني (نمو).',
        sloganTitle: 'شعرنا:',
        slogan: 'نبحث، نطابق، نتحقق، نشحن.... ونحمي حقوقك حتى ما بعد استلام قطعتك..',
        missionTitle: 'رسالتنا:',
        mission: [
          'منذ عام 2005م، تفخر شركتنا بتاريخها العريق في خدمة توفير قطاع غيار السيارات المستعملة الأصلية لجميع دول الخليج من خلال فروعها الأربعة في كلا من اليابان وكوريا الجنوبية والولايات المتحدة الأمريكية وألمانيا، ومقرها الرئيسي في الإمارات العربية المتحدة.',
          'ويبقى تركيزنا منصبًا على مواصلة نهجنا الراسخ في توفير قطع غيار السيارات المستعملة الأصلية وعالية الجودة من سيارات شبة جديدة وتقديمها بأسعار تنافسية لعملائنا.',
          'وإيمانا منا بثقتكم بنا وحرصا على توسيع نطاق خدماتنا فقد وسعنا أعمالنا لتشمل المملكة العربية السعودية لربط عملائنا مباشرة مع تشاليح وتاجر الإمارات العربية المتحدة وتوفير عدة عروض للقطعة المطلوبة ليتمكن العميل من اختيار الأنسب له.'
        ],
        guaranteesTitle: 'نضمن لعملائنا:',
        guarantees: [
          'توصيلًا سلسًا من خلال موردينا الموثوق بهم، تحت إشرافنا المباشر وإجراءات صارمة لمراقبة معايير الجودة وتقديم خدمة (المطابقة) للقطعة قبل استلامها من المتاجر، مع الحفاظ على هامش ربحي بسيط لشركتنا يضمن نمونا المستقبلي.',
          'ضمان لقطع الغيار المستعملة للسيارات بانها شبة جديدة وغير مجددة من خلال إلزام الموردين بتوفيرها من سيارات قليلة الممشى تطبق الشروط والاحكام.',
          'ضمان الاسترجاع والاستبدال والالغاء للعملاء تطبق الشروط والاحكام.',
          'ضمان قيمة مدفوعات العملاء حيث يتم حجزها لدينا وعدم تسليمة للمورد الا بعد تأكيد العميل واستلامة القطعة وموافقته عليها بعد ذلك نقوم بتحويل مبلغ القطعة للمورد.',
          'ضمان سياسة شحن صارمة لشركات الشحن المتعامل معها لإيصال شحناتكم والزامها بالمدة المتفق عليها حسب سياستهم تطبق الشروط والاحكام.',
          'ضمان سياسة شحن صارمة تلزم شركة الشحن في حال الخطأ او تلف او ضياع المنتج بإعادة قيمة المنتج تطبق الشروط والاحكام.'
        ],
        philosophyTitle: 'ينبع نجاح شركتنا المستمر من التزامنا بفلسفة العمل التالية:',
        philosophy: [
          'الحفاظ على فريق من المحترفين المؤهلين وتدريبهم باستمرار لتقديم خدمة عملاء استثنائية.',
          'توفير بيئة عمل نظيفة وآمنة وممتعة، خالية من التمييز والتحيز.',
          'تعزيز الاحترام المتبادل والعمل الجماعي بين الموظفين والعملاء والموردين.',
          'تبني الأفكار الجديدة وتنفيذ التغييرات اللازمة لتعزيز مكانتنا كشركة رائدة في قطاعنا ومجتمعنا.'
        ],
        closing: [
          'يرتبط مستقبل شركتنا ارتباطًا مباشرًا بنجاح موظفينا وعملائنا وموردينا حيث نبني معا شراكة متميزة لدعم الاعمال.',
          'هدفنا الدائم هو بناء شراكات جديدة وتعزيز الشراكات القائمة - دون المساس بالعلاقات القيمة التي اكتسبناها.'
        ]
      }
    },
    howWeWorkTutorial: {
      title: 'كيف نعمل:',
      stepsBeforeShipping: [
        'التسجيل.',
        'إدخال بيانات السيارة والقطع المطلوبة.'
      ],
      shipping: {
        title: 'اختيار نوعية الشحن:',
        items: [
          { title: 'الشحن المفرد:', desc: 'يتم شحن طلب واحد بشحنة واحدة' },
          { title: 'تجميع الشحنات:', desc: 'في حالة وجود أكثر من قطعة في الطلب الواحد يتم اختيار تجميع القطع لشحنها بشحنة واحدة.' }
        ],
        warningTitle: 'يشترط في حال طلب تجميع الشحنات:',
        warnings: [
          'دفع قيمة المنتجات قبل انتقالها لسلة التجميع.',
          'أقصى مدة لبقائها في سلة تجميع الشحنات 7 أيام.'
        ]
      },
      stepsAfterShipping: [
        'استقبال العروض المقدمة من التشاليح في الإمارات خلال ٢٤ ساعة من تقديم طلبك.',
        'يختار العميل العرض المناسب بالاتفاق مع البائع عبر الموقع ومدة العرض 48 ساعة فقط.',
        'بعد اختيار العرض المناسب تأكيد عنوان الشحن.',
        'الموافقة على الشروط والأحكام.',
        'الدفع وإصدار الفاتورة.',
        'طلبات التجميع ستذهب لسلة التجميع ولن تشحن إلا بطلب من العميل.',
        'إصدار بوليصة الشحن وتجهيز الطلب لشركة الشحن.',
        'تسليم الطلب للعميل والتأكد منه ومطابقته للفاتورة.'
      ],
      disclaimerTitle: 'تنويه:',
      disclaimer: [
        'يضمن الموقع قيمة المشتريات وعدم تسليم قيمتها للبائع إلا بعد استلام العميل للقطعة والتأكد منها.',
        'يضمن الموقع تطبيق سياسة الإرجاع والاستبدال والإلغاء.',
        'يضمن الموقع تطبيق سياسة عدم تضرر السلع من الشحن أو تأخرها عن المتفق عليه مع شركات الشحن.'
      ],
      subjectTo: 'تطبق ',
      terms: 'الشروط والأحكام',
      orderNow: 'انتقل للطلب الآن',
      back: 'رجوع'
    },
    policyNotices: {
      close: 'إغلاق',
      customerShipping: {
        prohibitedTitle: 'القطع المحظورة للشحن إلى السعودية:',
        prohibited: ['زجاج السيارات', 'أحزمة الأمان', 'الوسائد الهوائية', 'أنظمة الفرامل وأجزاؤها', 'البطاريات السائلة', 'الكفرات المستعملة', 'الأسلاك والضفائر الكهربائية', 'القطع المقلدة والقطع غير الأصلية', 'المنتجات الممنوعة في بلدك أو تحتاج لتصاريح.'],
        nonReturnableTitle: 'المنتجات الغير قابلة للإرجاع:',
        nonReturnable: ['القطع الكهربائية', 'الأفياش', 'السيور', 'المنتجات التي جرى استخدامها او تعديلها او تلفها او تضررها'],
        termsNote: 'تطبق الشروط والاحكام.',
        confirm: 'فهمت، متابعة'
      },
      returnDispute: {
        title: 'تنبيه قبل تقديم طلب الإرجاع أو النزاع:',
        items: [
          'تقديم طلب الإرجاع خلال 24 ساعة من الاستلام، باستثناء القطع المشمولة بضمان المتجر.',
          'إرفاق صور واضحة للقطعة وذكر سبب الطلب والعيب إن وجد.',
          'القطع الكهربائية والأفياش والسيور غير قابلة للإرجاع.',
          'المنتجات المستخدمة أو المعدلة أو المتضررة غير قابلة للإرجاع وفق السياسة.',
          'يجب أن يكون المنتج بحالته الأصلية، غير مستخدم أو متضرر، مع التغليف والفاتورة.',
          'بعد الموافقة، يجب تسليم المنتج لشركة الشحن خلال 48 ساعة، وإلا يُلغى طلب الإرجاع.',
          'يخضع الطلب للشروط والأحكام وسياسة الإرجاع والضمان.'
        ],
        acknowledgement: 'بالمتابعة، أقر باطلاعي على الشروط والموافقة عليها',
        confirm: 'متابعة'
      }
    },
    loyaltySystem: {
      title: 'اكسب دخل شهري معنا',
      subtitle: 'كل طلب = ربح كاش يُضاف إلى محفظتك',
      intro: {
        title: '💡 مو مجرد شراء… هذا مصدر دخل لك',
        desc1: 'كل طلب تقوم به داخل المنصة',
        desc2: '= أرباح تُضاف مباشرة إلى محفظتك',
        desc3: 'ابدأ اليوم… وخَلّ مشترياتك تشتغل لصالحك'
      },
      howToStart: {
        title: '🚀 كيف تبدأ؟',
        step1: { title: 'اطلب من المنصة', desc: 'اختر القطعة وابدأ طلبك بشكل طبيعي' },
        step2: { title: 'يكتمل الطلب', desc: 'يتم تنفيذ الطلب ووصوله لك' },
        step3: { title: 'التحقق', desc: 'بعد انتهاء فترة الإرجاع وعدم وجود مشكلة' },
        step4: { title: 'تربح 💰', desc: 'تُضاف أرباحك مباشرة إلى محفظتك' }
      },
      first: {
        title: '💼 أولاً: نظام الولاء (اشترِ واكسب كاش)',
        subtitle: 'كل أرباحك تُجمع في مكان واحد داخل لوحة التحكم:',
        bullet1: '✔ استخدامها كخصم على طلباتك',
        bullet2: '✔ أو سحبها حسب الشروط',
        bullet3: '✔ متابعة أرباحك أول بأول'
      },
      second: {
        title: '🔗 ثانياً: نظام الإحالة (ضاعف دخلك)',
        subtitle: 'لا تربح لحالك 👇',
        bullet1: '✔ احصل على رابط دعوة خاص بك',
        bullet2: '✔ شاركه مع أصدقائك',
        bullet3: '✔ تربح 1% من ثمن كل منتج يشتريه صديقك خلال 6 شهور من تسجيله'
      },
      timing: {
        title: '⏱ متى تُحتسب الأرباح؟',
        subtitle: 'يتم احتساب الأرباح فقط عند:',
        bullet1: '✔ اكتمال الطلب',
        bullet2: '✔ انتهاء فترة الإرجاع',
        bullet3: '✔ عدم وجود نزاع أو استرجاع',
        footer: 'غير ذلك تبقى الأرباح قيد الانتظار'
      },
      whyDifferent: {
        title: '⭐ لماذا هذا النظام مختلف؟',
        bullet1: '✔ تربح من استخدامك اليومي',
        bullet2: '✔ كلما زاد استخدامك… زاد دخلك',
        bullet3: '✔ نظام عادل ومحمي',
        bullet4: '✔ يحوّلك من عميل إلى شريك'
      },
      imagine: {
        title: '🤯 تخيّل',
        p1: 'أنت تشتري… وفي نفس الوقت تكسب',
        p2: 'بدل ما تكون مصروفاتك فقط… تصبح مصدر دخل لك',
        cta: 'ابدأ الآن'
      },
      cta: 'ابدأ الربح الآن',
      stats: {
        activeUsers: 'مستخدم نشط يربح الآن',
        totalDistributed: 'إجمالي المكافآت الموزعة',
        referrals: 'عملية إحالة ناجحة'
      }
    },
    wholesale: {
      title: 'طلبات الجملة للشركات',
      welcome: 'مرحباً بكم',
      instruction: 'لطلبات الجملة للشركات فضلاً ارسال خطاب الشركة الى الايميل التالي:',
      email: 'wh@e-tashleh.shop',
      emailLabel: 'البريد الإلكتروني',
      followUp: 'وسيتم التواصل معكم عبر أحد مدراء المبيعات',
      thanks: 'شكراً لثقتكم ونتمنى لكم التوفيق',
      sendRequest: 'إرسال طلب جملة',
      backHome: 'العودة للرئيسية',
      contactInfo: 'معلومات التواصل',
      contactDesc: 'يمكنكم التواصل معنا عبر البريد الإلكتروني، أو زيارة موقعنا للحصول على المزيد من المعلومات حول خدماتنا',
      howItWorks: 'كيفية العمل',
      howItWorksDesc: 'بعد إرسال خطاب الشركة، سيتواصل معكم أحد مدراء المبيعات خلال 24-48 ساعة لمناقشة تفاصيل طلبكم'
    },
    footer: {
      privacy: 'سياسة الخصوصية',
      terms: 'شروط الاستخدام',
      walletLoyaltyTerms: 'شروط برنامج الولاء والإحالة',
      technicalSupport: 'الدعم الفني',
      contact: 'تواصل معنا',
      about: 'من نحن',
      howWeWork: 'كيف نعمل',
      whatsappBusiness: 'واتساب اعمال',
      location: 'الإمارات العربية المتحدة - رأس الخيمة',
      cr: 'سجل تجاري: 0000004036902',
      businessCenter: 'مركز كومباس للاعمال',
      capital: 'رأس المال المدفوع: 386,000,000.00 درهم اماراتي',
      copyright: '© جميع الحقوق محفوظة لشركة إليب 2026'
    },
    warranty: {
      title: 'حماية الضمان 2026',
      endsIn: 'ينتهي خلال:',
      expired: 'الضمان منتهي',
      claim: 'استبدال القطعة',
      days: 'يوم',
      hours: 'س'
    },
    connectivity: {
      offlineTitle: 'لا يوجد اتصال بالإنترنت',
      offlineBody: 'تحقق من اتصالك. الطلبات والدفع والخدمات قد لا تعمل حتى يعود الاتصال.',
      weakTitle: 'الاتصال ضعيف',
      weakBody: 'شبكتك بطيئة. تجنّب الدفع أو إرسال طلبات مهمة حتى يتحسن الاتصال.',
      weakDismiss: 'إخفاء',
      platformTitle: 'المنصة أو قاعدة البيانات غير متاحة',
      platformBody: 'نواجه مشكلة مؤقتة في الخوادم. أعد المحاولة بعد لحظات — الطلبات والدفع قد تتأثر.',
      maintenanceTitle: 'وضع الصيانة',
      maintenanceBody: 'النظام قيد الصيانة حالياً. بعض الخدمات قد تكون غير متاحة مؤقتاً.',
      recoveredTitle: 'عاد الاتصال',
      recoveredBody: 'تم استعادة الخدمة بنجاح.',
      retry: 'إعادة المحاولة',
    },
    accountAccess: {
      permanentTitle: 'تم حظر حسابك',
      temporaryTitle: 'تم إيقاف حسابك مؤقتاً',
      permanentSubtitle: 'لا يمكنك تنفيذ عمليات على المنصة حتى يتم تنشيط الحساب من الإدارة.',
      temporarySubtitle: 'يمكنك تصفح اللوحة فقط. العمليات الحساسة موقوفة حتى انتهاء المدة أو التنشيط.',
      reasonLabel: 'سبب الإجراء',
      durationLabel: 'المدة المتبقية',
      endsAtLabel: 'ينتهي في',
      permanentBadge: 'حظر دائم',
      temporaryBadge: 'إيقاف مؤقت',
      supportWhatsapp: 'واتساب الدعم',
      supportEmail: 'بريد الدعم',
      contactSupport: 'تواصل مع الدعم',
      noReason: 'قرار إداري',
    }
  },
  en: {
    sar: 'SAR',
    days: 'Days',
    daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    location: 'Riyadh, KSA',
    hours: 'Hours',
    minutes: 'Minutes',
    left: 'Left',
    active: 'Active',
    expired: 'Expired',
    late: 'Late',
    loading: 'Loading...',
    processing: 'Processing...',
    viewAll: 'View All',
    details: 'Details',
    approve: 'Approve',
    reject: 'Reject',
    ban: 'Ban',
    unban: 'Unban',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    export: 'Export CSV',
    filter: 'Filter',
    search: 'Search...',
    print: 'Print',
    download: 'Download PDF',
    next: 'Next',
    prev: 'Previous',
    submit: 'Submit',
    back: 'Back',
    required: 'Required',
    optional: 'Optional',
    success: 'Success',
    error: 'Error',
    systemOnline: 'System Online',
    upload: 'Upload',
    image: 'Image',
    noData: 'No Data',
    actions: 'Actions',
    status: {
      COLLECTING_OFFERS: 'Collecting Best Offers',
      AWAITING_SELECTION: 'Awaiting Your Selection',
      AWAITING_OFFERS: 'Awaiting Offers',
      AWAITING_PAYMENT: 'Awaiting Payment',
      PREPARATION: 'Preparation',
      PREPARED: 'Prepared',
      VERIFICATION: 'Part Inspection',
      VERIFICATION_SUCCESS: 'Verification Approved',
      READY_FOR_SHIPPING: 'Ready for Shipping',
      NON_MATCHING: 'Non-Matching',
      CORRECTION_PERIOD: 'Correction Period',
      CORRECTION_SUBMITTED: 'Correction Submitted',
      DELAYED_PREPARATION: 'Delayed Preparation',
      PARTIALLY_SHIPPED: 'Partially Shipped',
      SHIPPED: 'Shipped',
      PARTIALLY_DELIVERED: 'Partially Delivered',
      DELIVERED: 'Delivered',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      PARTIALLY_PAID: 'Partially Paid',
      RETURNED: 'Returned',
      DISPUTED: 'Disputed',
      REFUNDED: 'Refunded',
      RETURN_REQUESTED: 'Return Requested',
      RETURN_APPROVED: 'Return Approved',
      RESOLVED: 'Resolved',
      CLOSED: 'Case Closed',
      WARRANTY_ACTIVE: 'Warranty Active 🛡️',
      WARRANTY_EXPIRED: 'Warranty Expired',
      // Shipment Detailed Statuses
      RECEIVED_AT_HUB: 'Received at Hub',
      QUALITY_CHECK_PASSED: 'Quality Check Passed',
      PACKAGED_FOR_SHIPPING: 'Packaged for Shipping',
      Awaiting_Carrier_Pickup: 'Awaiting Carrier Pickup',
      PICKED_UP_BY_CARRIER: 'Picked up by Carrier',
      IN_TRANSIT_TO_DESTINATION: 'In Transit to Destination',
      ARRIVED_AT_LOCAL_FACILITY: 'Arrived at Local Facility',
      CUSTOMS_CLEARANCE: 'Customs Clearance',
      AT_LOCAL_WAREHOUSE: 'At Local Warehouse',
      OUT_FOR_DELIVERY: 'Out for Delivery',
      DELIVERY_ATTEMPTED: 'Delivery Attempted',
      DELIVERED_TO_CUSTOMER: 'Delivered to Customer',
      RETURN_TO_SENDER_INITIATED: 'Return to Sender Initiated',
      RETURNED_TO_SENDER: 'Returned to Sender',
      // New Return & Warranty Journey 2026
      RETURN_LABEL_ISSUED: '📄 Return Label Issued',
      RETURN_STARTED: '🔄 Return Started',
      RECEIVED_FROM_CUSTOMER: '📥 Received from Customer',
      DELIVERED_TO_VENDOR: '📦 Delivered to Vendor',
      EXCHANGE_COMPLETED: '✨ Exchange Completed',
      IN_TRANSIT_TO_CUSTOMER: '🚚 In Transit to Customer',
      RETURN_COMPLETED_TO_CUSTOMER: '✅ Return Completed to Customer'
    },
    roleSelection: {
      customerOrders: 'Customer Parts Orders',
      storeLogin: 'Vendor Login',
      wholesaleOrders: 'Wholesale B2B Orders',
      howWeWork: 'Learn how we work before you start',
      typingMessage: 'With us... UAE Auto Parts reach you, with your money safe',
      features: {
        title: 'With us... UAE Auto Parts reach you, with your money safe',
        originalParts: 'Original used parts (not refurbished or repaired)',
        shipping: 'Shipping to GCC with return and exchange policy',
        payment: 'Secure payment - Funds released to seller only after you receive and verify the part',
        video: 'Inspect your part via video and photos directly with the store',
        documentation: 'We document inspection and review before shipping to ensure matching',
        guarantee: 'On-time shipping guarantee and easy return policy',
        terms: 'Terms and Conditions apply',
        orderNow: 'Continue Order',
        back: 'How We Work',
        earnIncome: 'Earn Monthly Income with Us',
        earnIncomeDesc: 'Every order = Cash profit added to your wallet'
      }
    },
    home: {
      nav: { home: 'Home', about: 'About Us', howWeWork: 'How It Works', faq: 'FAQ', contact: 'Contact Us', openMenu: 'Open menu', closeMenu: 'Close menu' },
      hero: {
        brand: 'E-Tashleh',
        line1: 'Your online platform for ordering genuine used auto parts',
        line2: 'from the UAE to your door in Saudi Arabia',
        line3: 'through trusted, verified scrapyards and stores',
        tagline: 'Order online… we handle the rest.',
        imageAlt: 'Genuine auto parts in front of the Dubai skyline'
      },
      features: {
        warranty: { title: 'Warranty & Returns', desc: 'Subject to our terms and policies' },
        shipping: { title: 'Shipping to Saudi Arabia', desc: 'To your home or workshop door' },
        payment: { title: 'Payment Protection', desc: 'The store is paid only after you receive your part' },
        matching: { title: 'Part Matching', desc: 'We verify the part matches before shipping' }
      },
      cta: { title: 'Order Your Part Now', desc: 'Find the right part and get the best offers from verified stores' },
      roles: {
        customerDesc: 'Track your orders and store offers',
        storeDesc: 'Manage your store and offers',
        wholesaleDesc: 'Special prices for companies and suppliers',
        earnDesc: 'Through our referral and rewards program'
      },
      earn: { title: 'A Chance to Grow Your Income', desc: 'Join our loyalty and referral program and start earning rewards on every order', button: 'Learn More', imageAlt: 'Diamond and gold coins' },
      highlights: {
        support: { title: 'Customer Support', desc: 'A team ready to help you' },
        fastShipping: { title: 'Fast Shipping', desc: 'From the UAE to Saudi Arabia' },
        original: { title: 'Genuine Parts', desc: 'Used, never refurbished' },
        trust: { title: 'Trust & Transparency', desc: 'At every step of your order' }
      },
      faq: {
        title: 'Frequently Asked Questions',
        subtitle: 'Quick answers to what customers and stores ask most',
        customersTab: 'Customers',
        merchantsTab: 'Stores',
        customers: [
          { q: 'How do I order a part?', a: 'Tap "Order Your Part Now", enter your car and part details, and you will receive offers from verified stores and scrapyards in the UAE to choose from.' },
          { q: 'Are the parts genuine?', a: 'Yes. All parts are genuine used parts, never refurbished or rebuilt, offered by trusted and verified stores.' },
          { q: 'When does the store get paid?', a: 'The amount is released to the store only after you receive and confirm your part, so your payment is fully protected.' },
          { q: 'How do I know the part matches before shipping?', a: 'The part is matched using photos and video and reviewed before shipping, so the right part reaches your car.' },
          { q: 'Is there a warranty and returns?', a: 'Yes. Warranty, returns and exchanges are available according to the platform terms and policies.' },
          { q: 'Where do you deliver?', a: 'We ship from the UAE to all regions of Saudi Arabia, right to your home or workshop door.' }
        ],
        merchants: [
          { q: 'How do I register my store?', a: 'Tap "Store Login", create a store account and upload your business details and documents. The platform team will review your request.' },
          { q: 'How do I receive orders?', a: 'Customer requests appear in your store dashboard. You submit your price offer and the customer picks the best one.' },
          { q: 'When do I get paid?', a: 'Funds are added to your wallet after the customer receives the part and the return period ends. You can then request a withdrawal to your bank account.' },
          { q: 'Is there support for stores?', a: 'Yes. Our technical support team is available through "Contact Us" or WhatsApp Business.' }
        ]
      },
      about: {
        title: 'E-Tashleh!',
        intro: 'An intermediary e-commerce platform owned by the Emirati company Elip, specializing in genuine used auto parts. Our mission is to bring you the best used auto parts stores and scrapyards in the UAE while you are at home, providing genuine used parts that are not refurbished, modified or repaired, with full protection of your rights.',
        highlights: [
          'Genuine parts that meet strict quality standards.',
          'Part matching and verification before shipping.',
          'Shipping from the UAE to Saudi Arabia, to your home or workshop.',
          'Your money is protected: the store is not paid until you receive and approve your part.',
          'Returns, exchanges and warranty follow-up when due.',
          'A loyalty and cashback program that can be transferred to your bank account.'
        ],
        company: 'Elip (Free Zone Company) - an Emirati company and the owner of the E-Tashleh online platform, registered and headquartered in Ras Al Khaimah - Compass Business Centre, with an owned capital of AED 386 million, trade license No. 45000927. Its details can be verified through the National Economic Register (Nomo).',
        sloganTitle: 'Our Motto:',
        slogan: 'We search, we match, we verify, we ship... and we protect your rights even after you receive your part.',
        missionTitle: 'Our Mission:',
        mission: [
          'Since 2005, our company has taken pride in its long history of supplying genuine used auto parts to all GCC countries through its four branches in Japan, South Korea, the United States and Germany, with its headquarters in the United Arab Emirates.',
          'Our focus remains on continuing our established approach of providing genuine, high-quality used auto parts from nearly new vehicles at competitive prices for our customers.',
          'Believing in your trust in us, and keen to broaden the scope of our services, we have expanded our business to the Kingdom of Saudi Arabia, connecting our customers directly with UAE scrapyards and merchants and providing multiple offers for the requested part so customers can choose what suits them best.'
        ],
        guaranteesTitle: 'We guarantee our customers:',
        guarantees: [
          'Seamless delivery through our trusted suppliers, under our direct supervision and strict quality-control procedures, including a part (matching) service before collecting it from the stores, while keeping a modest profit margin that secures our future growth.',
          'A guarantee that used auto parts are nearly new and not refurbished, by requiring suppliers to source them from low-mileage vehicles. Terms and conditions apply.',
          'Guaranteed returns, exchanges and cancellations for customers. Terms and conditions apply.',
          'Protection of customer payments: they are held with us and not released to the supplier until the customer confirms receipt of the part and approves it; only then do we transfer the part amount to the supplier.',
          'A strict shipping policy with our partner shipping companies to deliver your shipments within the agreed timeframe according to their policy. Terms and conditions apply.',
          'A strict shipping policy that obliges the shipping company to refund the product value in case of error, damage or loss. Terms and conditions apply.'
        ],
        philosophyTitle: 'Our continued success stems from our commitment to the following business philosophy:',
        philosophy: [
          'Maintaining a team of qualified professionals and continuously training them to deliver exceptional customer service.',
          'Providing a clean, safe and enjoyable work environment, free from discrimination and bias.',
          'Promoting mutual respect and teamwork among employees, customers and suppliers.',
          'Embracing new ideas and implementing the changes needed to strengthen our position as a leading company in our sector and community.'
        ],
        closing: [
          'The future of our company is directly linked to the success of our employees, customers and suppliers, as together we build an outstanding partnership to support business.',
          'Our constant goal is to build new partnerships and strengthen existing ones, without compromising the valuable relationships we have earned.'
        ]
      }
    },
    howWeWorkTutorial: {
      title: 'How We Work:',
      stepsBeforeShipping: [
        'Register.',
        'Enter your vehicle details and the parts you need.'
      ],
      shipping: {
        title: 'Choose the shipping type:',
        items: [
          { title: 'Single shipping:', desc: 'One order is shipped in one shipment.' },
          { title: 'Consolidated shipping:', desc: 'If an order contains more than one part, you can choose to consolidate the parts and ship them in one shipment.' }
        ],
        warningTitle: 'Requirements for consolidated shipping:',
        warnings: [
          'Pay for the products before they are moved to the consolidation cart.',
          'Products can stay in the consolidation cart for a maximum of 7 days.'
        ]
      },
      stepsAfterShipping: [
        'Receive offers from UAE scrapyards within 24 hours of submitting your order.',
        'The customer chooses the suitable offer in agreement with the seller through the website; offers are valid for 48 hours only.',
        'After choosing the suitable offer, confirm the shipping address.',
        'Agree to the terms and conditions.',
        'Pay and receive the invoice.',
        'Consolidated orders go to the consolidation cart and are shipped only at the customer\'s request.',
        'The shipping waybill is issued and the order is prepared for the shipping company.',
        'The order is delivered to the customer, who checks it and matches it against the invoice.'
      ],
      disclaimerTitle: 'Disclaimer:',
      disclaimer: [
        'The website guarantees the purchase amount and does not release it to the seller until the customer has received and checked the part.',
        'The website guarantees the application of the return, exchange and cancellation policy.',
        'The website guarantees the application of a policy protecting goods from shipping damage or delays beyond what was agreed with the shipping companies.'
      ],
      subjectTo: 'Subject to ',
      terms: 'Terms and Conditions',
      orderNow: 'Order Now',
      back: 'Back'
    },
    policyNotices: {
      close: 'Close',
      customerShipping: {
        prohibitedTitle: 'Items prohibited from shipping to Saudi Arabia:',
        prohibited: ['Car glass', 'Seat belts', 'Airbags', 'Brake systems and their parts', 'Liquid batteries', 'Used tires', 'Electrical wires and harnesses', 'Counterfeit and non-genuine parts', 'Products banned in your country or requiring permits.'],
        nonReturnableTitle: 'Non-returnable products:',
        nonReturnable: ['Electrical parts', 'Plugs and connectors', 'Belts', 'Products that have been used, modified, damaged or impaired'],
        termsNote: 'Terms and conditions apply.',
        confirm: 'Got it, continue'
      },
      returnDispute: {
        title: 'Notice before submitting a return or dispute request:',
        items: [
          'Submit the return request within 24 hours of receipt, except for parts covered by the store warranty.',
          'Attach clear photos of the part and state the reason for the request and the defect, if any.',
          'Electrical parts, plugs and belts are non-returnable.',
          'Used, modified or damaged products are non-returnable according to the policy.',
          'The product must be in its original condition, unused and undamaged, with its packaging and invoice.',
          'After approval, the product must be handed to the shipping company within 48 hours, otherwise the return request will be cancelled.',
          'The request is subject to the terms and conditions and the return and warranty policy.'
        ],
        acknowledgement: 'By continuing, I confirm that I have read and agree to the terms.',
        confirm: 'Continue'
      }
    },
    loyaltySystem: {
      title: 'Earn Monthly Income with Us',
      subtitle: 'Every order = Cash profit added to your wallet',
      intro: {
        title: '💡 Not just buying… this is an income source for you',
        desc1: 'Every order you place on the platform',
        desc2: '= Profits added directly to your wallet',
        desc3: 'Start today… and let your purchases work for you'
      },
      howToStart: {
        title: '🚀 How to start?',
        step1: { title: 'Order from the platform', desc: 'Choose the part and start your order normally' },
        step2: { title: 'Order completed', desc: 'The order is fulfilled and delivered to you' },
        step3: { title: 'Verification', desc: 'After the return period ends and no issues are found' },
        step4: { title: 'You profit 💰', desc: 'Your profits are added directly to your wallet' }
      },
      first: {
        title: '💼 First: Loyalty System (Buy & Earn Cash)',
        subtitle: 'All your profits are gathered in one place inside the dashboard:',
        bullet1: '✔ Use them as a discount on your orders',
        bullet2: '✔ Or withdraw them according to terms',
        bullet3: '✔ Track your profits in real-time'
      },
      second: {
        title: '🔗 Second: Referral System (Double Your Income)',
        subtitle: "Don't profit alone 👇",
        bullet1: '✔ Get your own referral invitation link',
        bullet2: '✔ Share it with your friends',
        bullet3: '✔ Earn 1% on every item they buy for 6 months from their signup'
      },
      timing: {
        title: '⏱ When are profits calculated?',
        subtitle: 'Profits are calculated only when:',
        bullet1: '✔ Order is completed',
        bullet2: '✔ Return period expires',
        bullet3: '✔ No dispute or refund exists',
        footer: 'Otherwise, profits remain pending'
      },
      whyDifferent: {
        title: '⭐ Why is this system different?',
        bullet1: '✔ Profit from your daily use',
        bullet2: '✔ The more you use… the more you earn',
        bullet3: '✔ Fair and protected system',
        bullet4: '✔ Turns you from a customer into a partner'
      },
      imagine: {
        title: '🤯 Imagine',
        p1: 'You buy… and at the same time you earn',
        p2: 'Instead of just expenses… it becomes an income source for you',
        cta: 'Start Now'
      },
      cta: 'Start Earning Now',
      stats: {
        activeUsers: 'Active users earning now',
        totalDistributed: 'Total rewards distributed',
        referrals: 'Successful referrals'
      }
    },
    auth: {
      errors: {
        fillAll: 'Please fill all required fields',
        invalidEmail: 'Please enter a valid email address',
        passwordShort: 'Password must be at least 6 characters',
        passwordMismatch: 'Passwords do not match',
        invalidCode: 'Invalid verification code',
        contractError: 'You must agree to the contract terms to proceed',
        docsError: 'Please upload all required documents',
        registrationFailed: 'Registration failed. Please try again.',
        loginFailed: 'Login failed. Please check your credentials.',
        invalidCredentials: 'Invalid email or password',
        wrongAccountType: 'Incorrect account type for this login',
        accountNotFound: 'Account not found. Please register.',
        phoneExists: 'This phone number is already registered. Please login or use a different number.'
      }
    },
    wholesale: {
      title: 'Wholesale B2B Orders',
      welcome: 'Welcome',
      instruction: 'For corporate wholesale orders, please send the company letter to the following email:',
      email: 'wh@e-tashleh.shop',
      emailLabel: 'Email Address',
      followUp: 'A sales manager will contact you shortly',
      thanks: 'Thank you for your trust, we wish you success',
      sendRequest: 'Send Wholesale Request',
      backHome: 'Back to Home',
      contactInfo: 'Contact Information',
      contactDesc: 'You can contact us via email or visit our website for more information about our services',
      howItWorks: 'How it Works',
      howItWorksDesc: 'After sending the company letter, a sales manager will contact you within 24-48 hours to discuss your order details'
    },
    footer: {
      privacy: 'Privacy Policy',
      terms: 'Terms of Use',
      walletLoyaltyTerms: 'Loyalty & Referral Program Terms',
      technicalSupport: 'Technical Support',
      contact: 'Contact Us',
      about: 'About Us',
      howWeWork: 'How We Work',
      whatsappBusiness: 'WhatsApp Business',
      location: 'UAE - Ras Al Khaimah',
      cr: 'Commercial Registration: 0000004036902',
      businessCenter: 'Compass Business Center',
      capital: 'Paid Capital: 386,000,000.00 AED',
      copyright: '© All rights reserved to Elip 2026'
    },
    warranty: {
      title: '2026 Warranty Protection',
      endsIn: 'Ends in:',
      expired: 'Warranty Expired',
      claim: 'REPLACE PART',
      days: 'd',
      hours: 'h'
    },
    connectivity: {
      offlineTitle: 'No internet connection',
      offlineBody: 'Check your connection. Orders, payments, and services may not work until you are back online.',
      weakTitle: 'Weak connection',
      weakBody: 'Your network is slow. Avoid payments or critical orders until the connection improves.',
      weakDismiss: 'Dismiss',
      platformTitle: 'Platform or database unavailable',
      platformBody: 'We are experiencing a temporary server issue. Please retry shortly — orders and payments may be affected.',
      maintenanceTitle: 'Maintenance mode',
      maintenanceBody: 'The system is under maintenance. Some services may be temporarily unavailable.',
      recoveredTitle: 'Connection restored',
      recoveredBody: 'Service is back online.',
      retry: 'Retry',
    },
    accountAccess: {
      permanentTitle: 'Your account is blocked',
      temporaryTitle: 'Your account is temporarily suspended',
      permanentSubtitle: 'You cannot perform actions on the platform until admin reactivation.',
      temporarySubtitle: 'You can browse the dashboard only. Sensitive actions stay locked until the period ends or reactivation.',
      reasonLabel: 'Action reason',
      durationLabel: 'Time remaining',
      endsAtLabel: 'Ends at',
      permanentBadge: 'Permanent ban',
      temporaryBadge: 'Temporary suspension',
      supportWhatsapp: 'Support WhatsApp',
      supportEmail: 'Support email',
      contactSupport: 'Contact support',
      noReason: 'Administrative decision',
    }
  }
};
