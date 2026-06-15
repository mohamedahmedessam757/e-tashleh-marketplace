export const customer = {
  ar: {
    menu: {
      home: 'الرئيسية',
      orders: 'طلباتي',
      create: 'طلب جديد',
      chats: 'المحادثات',
      profile: 'الملف الشخصي',
      resolution: 'المرتجعات والنزاعات',
      infoCenter: 'مركز المعلومات',
      logout: 'تسجيل الخروج',
      notifications: 'الإشعارات',
      settings: 'الإعدادات',
      shipments: 'الشحنات',
      shippingCart: 'سلة التجميع',
      billing: 'الدفع والفواتير',
      preferences: 'التفضيلات والإشعارات',
      loyalty: 'التقييم والولاء',
      support: 'الدعم الفني',
      returns: 'المرتجعات',
      violations: 'المخالفات والعقوبات',
      merchant: 'تاجر',
      customer: 'عميل'
    },
    common: {
      loading: 'جاري التحميل...',
      select: 'اختر...',
      expired: 'منتهية',
      notFound: 'غير موجود',
      redeem: 'استبدال',
      history: 'السجل',
      earned: 'المكتسبة',
      rewards: 'المكافآت',
      reviews: 'تقييمات',
      status: {
        AWAITING_OFFERS: 'بانتظار العروض',
        COLLECTING_OFFERS: 'جارى جمع أفضل العروض',
        AWAITING_PAYMENT: 'بانتظار الدفع',
        PREPARATION: 'قيد التجهيز',
        VERIFICATION: 'قيد فحص القطعة',
        VERIFICATION_SUCCESS: 'توثيق ناجح',
        NON_MATCHING: 'غير مطابق',
        CORRECTION_PERIOD: 'فترة التصحيح',
        CORRECTION_SUBMITTED: 'تم تصحيح التوثيق',
        SHIPPED: 'تم الشحن',
        DELIVERED: 'تم التوصيل',
        COMPLETED: 'مكتمل',
        CANCELLED: 'ملغى',
        RETURNED: 'مرتجع',
        DISPUTED: 'نزاع قائم',
        REFUNDED: 'تم الاسترداد',
        AWAITING_SHIPMENT: 'بانتظار الشحن',
        WARRANTY_ACTIVE: 'الضمان نشط',
        WARRANTY_EXPIRED: 'الضمان منتهي'
      }
    },
    shipments: {
      subtitle: 'تتبع جميع شحناتك الحالية والسابقة',
      noShipments: 'لا توجد شحنات',
      orderNo: 'رقم الطلب',
      partDetails: 'تفاصيل القطعة',
      routeDetails: 'تفاصيل المسار',
      items: 'المحتويات',
      quantity: 'الكمية'
    },
    actions: {
      viewTracking: 'تتبع الشحنة',
      hideTracking: 'إخفاء التتبع'
    },
    shippingCart: {
      subtitle: 'تجميع العناصر المحتجزة في شحنة واحدة',
      itemsInCart: 'عناصر في السلة',
      summary: 'ملخص الطلب',
      subtotal: 'المجموع الفرعي',
      shippingEst: 'تكلفة الشحن التقديرة',
      calculatedNext: 'تُحسب في الخطوة التالية',
      total: 'الإجمالي',
      requestShipping: 'طلب شحن',
      timerNote: 'يتم حجز العناصر المضافة للسلة لمدة 7 أيام كحد أقصى. يرجى طلب الشحن قبل انتهاء الوقت.',
      autoShipNote: 'سيتم شحن العناصر تلقائياً بعد مرور 7 أيام على الدفع.',
      daysRemaining: 'أيام متبقية',
      empty: 'سلة التجميع فارغة',
      emptyDesc: 'ستظهر القطع التي تتطلب تجميع هنا بعد الدفع. الطلبات المكونة من قطعة واحدة تذهب مباشرة إلى الشحنات.',
      store: 'المتجر',
      partialShipping: 'شحن جزئي',
      shipSelected: 'شحن العناصر المختارة',
      waybillBatchNote: 'القطع المختارة معاً ستُشحن في شحنة واحدة وبوليصة واحدة تحت نفس رقم الطلب.',
      selectItems: 'اختر العناصر التي ترغب في شحنها الآن',
      alreadyShipped: 'تم شحنها',
      readyToShip: 'جاهز للشحن',
      consolidationWarning: 'يمكنك شحن بعض العناصر الآن وترك الباقي في السلة.',
      batchTotal: 'إجمالي الشحنة الحالية',
      itemsCount: 'عدد القطع المختارة',
      handoverPendingTitle: 'لا يمكن الشحن حتى يُسلّم التاجر القطع للإدارة',
      handoverPendingDesc: 'اختيار القطع والشحن من سلة التجميع يتفعلان بعد أن يضغط التاجر «طلب تسليم الشحنة للإدارة» لكل قطعة.',
      handoverPendingTitleMixed: 'بعض القطع جاهزة للشحن والباقي بانتظار التاجر',
      handoverPendingDescMixed: 'يمكنك اختيار {ready} قطعة/قطع جاهزة الآن. {waiting} قطعة/قطع لا تزال بانتظار تسليم التاجر للإدارة.',
      cartBadges: {
        orderGrouped: 'طلب مجمع',
        inCart: 'في سلة التجميع',
        handoverPending: 'بانتظار تسليم التاجر',
        readyInCart: 'جاهزة للاختيار',
        batchSolo: 'شحنة منفردة',
        batchGroup: 'شحنة مجمعة',
      },
      modes: {
        title: 'نوع الشحن',
        faster: 'أسرع',
        cheaper: 'أوفر',
        fasterDesc: 'شحن العناصر فور وصولها (أسرع)',
        cheaperDesc: 'تجميع العناصر في صندوق واحد (صديق للبيئة وأوفر)'
      }
    },
    dashboardHome: {
      stats: {
        active: 'الطلبات النشطة',
        completed: 'المكتملة',
        totalOrders: 'إجمالي الطلبات'
      },
      headers: {
        liveTracking: 'متابعة مباشرة',
        viewAll: 'عرض الكل',
        recentActivity: 'آخر الأنشطة'
      },
      empty: {
        noActive: 'لا توجد طلبات نشطة حالياً',
        noActiveDesc: 'جميع طلباتك السابقة مكتملة. هل تود إنشاء طلب جديد؟',
        noHistory: 'لا يوجد سجل سابق'
      },
      actions: {
        viewDetails: 'عرض التفاصيل الكاملة',
        viewHistory: 'عرض كل السجل'
      },
      reliability: {
        title: 'مؤشر الموثوقية',
        score: 'درجة النزاهة',
        level: 'مستوى الحساب',
        returnRate: 'معدل المرتجعات',
        deliveredOrders: 'الطلبات الناجحة',
        returns: 'المرتجعات',
        status: {
          EXCELLENT: 'موثوق جداً 💎',
          GOOD: 'موثوق ✅',
          FAIR: 'مقبول ⚠️',
          POOR: 'ضعيف ❌'
        },
        tips: {
          title: 'كيف تحافظ على موثوقيتك؟',
          tip1: 'تأكد من توافق القطعة مع سيارتك قبل الطلب.',
          tip2: 'استخدم رقم الهيكل (VIN) لضمان الدقة.',
          tip3: 'تواصل مع التاجر في الشات للتأكد من حالة القطعة.'
        }
      }
    },
    headers: {
      welcome: 'مرحباً،',
      recentOrders: 'آخر الطلبات',
      liveTracking: 'متابعة مباشرة',
      needPart: 'هل تحتاج لقطعة غيار جديدة؟',
      needPartDesc: 'أنشئ طلبك الآن وسنقوم بالبحث عن أفضل العروض لك من شبكة موردينا المعتمدين حول العالم.',
      noOrders: 'لا توجد طلبات نشطة حالياً',
      noOrdersDesc: 'جميع طلباتك السابقة مكتملة. هل تود إنشاء طلب جديد؟',
      noHistory: 'لا يوجد سجل سابق',
      viewFullHistory: 'عرض كل السجل'
    },
    createOrder: {
      title: 'إنشاء طلب جديد',
      subtitle: 'قم بتعبئة التفاصيل التالية للحصول على أفضل العروض',
      partSubtitle: 'أدخل تفاصيل القطع المطلوبة بدقة',
      preferencesSubtitle: 'حدد تفضيلاتك للقطعة',
      steps: {
        vehicle: 'السيارة',
        part: 'القطعة',
        preferences: 'التفضيلات',
        review: 'المراجعة'
      },
      vehicle: {
        make: 'نوع السيارة',
        model: 'الموديل',
        year: 'سنة الصنع',
        vin: 'رقم الهيكل (VIN)',
        vinPlaceholder: 'أدخل الـ 17 رقم',
        vinTooltip: 'رقم الهيكل يضمن لك استقبال القطعة المتوافقة مع سيارتك بنسبة 100% بدون أخطاء',
        selectMake: 'اختر الشركة المصنعة',
        selectModel: 'اختر الموديل',
        selectYear: 'اختر السنة',
        tooltip: 'يمكنك العثور على رقم الهيكل في استمارة السيارة أو على الزجاج الأمامي.'
      },
      part: {
        name: 'اسم القطعة المطلوبة',
        namePlaceholder: 'مثال: صدام أمامي، قير، مكينة...',
        desc: 'وصف تفصيلي',
        descPlaceholder: 'اذكر أي تفاصيل إضافية تساعد في تحديد القطعة بدقة... (إجباري)',
        images: 'صور القطعة',
        upload: 'رفع صورة'
      },
      prefs: {
        condition: 'حالة القطعة المفضلة',
        new: 'جديد / شبه جديد',
        newDesc: 'قطع بكرتونها أو من سيارات ممشى قليل جداً.',
        used: 'مستعمل نظيف',
        usedDesc: 'قطع مستعملة بحالة ممتازة ومفحوصة.',
        warranty: 'طلب ضمان ممتد',
        warrantyDesc: 'تفضيل العروض التي تشمل ضمان لمدة 3 أشهر على الأقل.'
      },
      review: {
        alert: 'يرجى مراجعة تفاصيل طلبك بدقة قبل الإرسال لضمان وصول العروض المناسبة.',
        vehicleInfo: 'معلومات السيارة',
        partDetails: 'تفاصيل القطعة',
        confirm: 'تأكيد وإرسال الطلب'
      },
      successAlert: 'طلب جديد في السوق',
      next: 'التالي',
      back: 'السابق'
    },
    orders: {
      manageTitle: 'إدارة ومتابعة طلباتك السابقة والحالية',
      tabs: {
        all: 'الكل',
        active: 'نشطة',
        completed: 'مكتملة',
        cancelled: 'ملغاة'
      },
      notFound: 'لا توجد طلبات',
      notFoundDesc: 'لا توجد طلبات تطابق معايير البحث',
      newOffers: 'عروض جديدة',
      status: 'حالة الطلب',
      viewFull: 'عرض التفاصيل الكاملة',
      simulateShip: 'محاكاة الشحن',
      simulateDeliver: 'محاكاة التوصيل',
      backToList: 'العودة للقائمة',
      orderId: 'طلب #',
      requestDate: 'تاريخ الطلب',
      searching: 'جاري البحث عن موردين',
      searchingDesc: 'طلبك الآن متاح لدى شبكة الموردين. ستصلك العروض فور توفرها.',
      renewOrder: 'تجديد الطلب',
      renewOrderHint: 'يعيد نشر الطلب لمدة 24 ساعة بنفس البيانات',
      renewOrderSuccess: 'تم تجديد الطلب بنجاح',
      renewOrderError: 'تعذر تجديد الطلب',
      receivedOffers: 'العروض المستلمة',
      noOffers: 'لا توجد عروض حتى الآن',
      vehicleDetails: 'تفاصيل المركبة',
      partName: 'اسم القطعة',
      vehicle: 'السيارة',
      supportTitle: 'الدعم والمساعدة',
      supportDesc: 'تواصل معنا في حال وجود مشكلة',
      hideTracking: 'إخفاء التفاصيل',
      viewTracking: 'تتبع الشحنة بالتفصيل',
      searchPlaceholder: 'بحث...',
      expiredModal: {
        title: 'انتهت صلاحية الطلب',
        desc: 'نعتذر منك لعدم توفر عروض حالياً على الطلب رقم (#{orderNumber}) لقطعة ({partName}). يمكنك إعادة إرسال الطلب خلال أيام العمل من الاثنين إلى الخميس.',
        dontShow: 'لا تظهر هذه الرسالة مرة أخرى',
        understood: 'موافق'
      },
      selectionExpiredModal: {
        title: 'انتهت مهلة اختيار العرض',
        desc: 'انتهت المهلة المتاحة لاختيار عرض للطلب رقم (#{orderNumber}). تم إغلاق الطلب تلقائياً. يمكنك إنشاء طلب جديد خلال أيام العمل من الاثنين إلى الخميس.',
        dontShow: 'لا تظهر هذه الرسالة مرة أخرى',
        understood: 'موافق'
      },
      partNoOffers: {
        message: 'نعتذر منك لعدم توفر عروض يرجى اعاده الطلب مره أخرى',
        reorderBtn: 'إعادة الطلب',
        waiting: 'لا توجد عروض لهذه القطعة بعد'
      }
    },
    offers: {
      incVat: 'السعر شامل الضريبة',
      accept: 'قبول',
      acceptOffer: 'قبول العرض',
      chat: 'محادثة',
      orderClosed: 'الطلب منتهي',
      finalPrice: 'السعر النهائي',
      shippingIncluded: 'شامل الشحن',
      offerNotes: 'ملاحظات المتجر',
      conditions: {
        new: 'جديد (أصلي)',
        used: 'مستعمل',
        used_clean: 'مستعمل (أصلي)',
        remanufactured: 'مجدد'
      },
      delivery: {
        d1_3: 'من 1 إلى 3 أيام',
        d3_5: 'من 3 إلى 5 أيام',
        d3_7: 'من 3 إلى 7 أيام',
        d5_7: 'من 5 إلى 7 أيام',
        d7_14: 'من 7 إلى 14 يوم'
      },
      labels: {
        condition: 'الحالة',
        type: 'النوع',
        warranty: 'الضمان',
        delivery: 'مدة التوصيل',
        weight: 'الوزن التقريبي',
        notes: 'ملاحظات التاجر',
        unitPrice: 'سعر القطعة'
      },
      partTypes: {
        standard: 'شحن قياسي (قطع غيار عادية)',
        normal: 'شحن قياسي (قطع غيار عادية)',
        engine: 'شحن ماكينة (محرك)',
        gearbox: 'شحن جيربوكس',
        bumper: 'صدام أمامى'
      },
      warranties: {
        yes: 'ضمان متوفر',
        no: 'بدون ضمان',
        '15days': '15 يوم',
        '1month': 'شهر واحد',
        '3months': '3 أشهر',
        '12months': '12 شهر'
      },
      units: {
        kg: 'كجم',
        settings: {
          global: 'التفضيلات العامة',
          lang: 'اللغة',
          langDesc: 'اختر لغة العرض',
          currency: 'العملة',
          currencyDesc: 'عملة العرض الافتراضية',
          notif: 'الإشعارات',
          notificationTypes: {
            email: 'إشعارات البريد الإلكتروني',
            push: 'إشعارات التنبيه',
            offers: 'تحديثات العروض',
            sms: 'تنبيهات الرسائل النصية'
          },
          delete: 'حذف الحساب',
          dangerDesc: 'حذف الحساب والبيانات نهائياً',
          deleteConfirm: 'هل أنت متأكد؟',
          deleteWarning: 'لا يمكن التراجع عن هذا الإجراء. سيتم حذف جميع بياناتك وفواتيرك بشكل دائم.',
          typeToConfirm: 'اكتب "DELETE" للتأكيد',
          cancel: 'إلغاء'
        }
      }
    },
    chat: {
      title: 'المحادثات',
      noChats: 'لا توجد محادثات نشطة',
      typeMessage: 'اكتب رسالتك هنا...',
      offerReceived: 'عرض جديد بقيمة',
      acceptOffer: 'قبول العرض والانتقال للدفع',
      orderContext: 'سياق الطلب',
      translationOn: 'الترجمة مفعلة',
      translate: 'ترجمة النص',
      someoneTyping: 'شخص ما يكتب الآن...'
    },
    checkout: {
      title: 'إتمام الطلب',
      common: { back: 'رجوع', continue: 'المتابعة لتأكيد الطلب', payNow: 'دفع الآن', editData: 'تعديل البيانات' },
      steps: { address: 'تأكيد بيانات الشحن', summary: 'الفاتورة', finalReview: 'تأكيد الطلبات', payment: 'الدفع', confirm: 'التأكيد' },
      finalReview: {
        title: "مراجعة نهائية قبل إتمام عملية الشراء",
        orderDetails: "تفاصيل الطلب النهائي",
        price: "السعر",
        orderNoDate: "رقم الطلب والتاريخ",
        offerNo: "رقم العرض",
        storeNo: "رقم المتجر",
        paymentStatus: "حالة الدفع",
        shippingInfo: "معلومات الشحن",
        orderInfo: "معلومات الطلب",
        shippingType: "آلية الشحن",
        orderStatus: "حالة الطلب",
        itemsCount: "عدد القطع",
        notes: "ملاحظات",
        groupedAlertTitle: "تنبيه هام حول الشحن المجمع",
        groupedAlert1: "سيتم تجميع القطع وشحنها معاً في بوليصة واحدة.",
        groupedAlert2: "قد يستغرق الشحن المجمع وقتاً أطول قليلاً لضمان وصول كافة القطع معاً بسلام.",
        approve: "موافق",
        cancel: "إلغاء",
        condition: "حالة القطعة",
        deliveryTime: "مدة التوصيل",
        approxWeight: "الوزن التقريبي",
        warranty: "مدة الضمان",
        noWarranty: "بدون ضمان"
      },
      address: {
        name: 'الاسم الكامل', phone: 'رقم الجوال', email: 'البريد الإلكتروني', country: 'الدولة', city: 'المدينة', address: 'تفاصيل العنوان',
        alertTitle: 'تنبيه: يجب الموافقة على الشروط',
        alertTextLines: [
          'تم قبول جميع العروض بنجاح! الآن يجب الموافقة على الشروط والأحكام و سياسة الإرجاع والاستبدال',
          'للقطع الثقيلة (أكثر من 100 كجم)',
          'يُفضل إدخال عنوان الورشة أو الكراج لتسهيل الشحن',
          'ويمكنك تعديل العنوان لاحقًا للطلبات الأخرى للمتابعة.',
        ],
        termsCheckboxStart: 'أوافق على ',
        termsCheckboxLink: 'الشروط والأحكام الخاصة بمنصة إي تشليح',
        policyCheckboxStart: 'أوافق على ',
        policyCheckboxLink: 'سياسة الإرجاع والاستبدال',
        policyCheckboxEnd: ' وأتفهم الشروط المذكورة',
        validationError: 'يجب تعبئة جميع البيانات والموافقة على الشروط والأحكام وسياسة الإرجاع أولاً'
      },
      summary: { item: 'قيمة القطعة', vat: 'ضريبة القيمة المضافة', shipping: 'رسوم الشحن', total: 'الإجمالي', pay: 'دفع' },
      payment: {
        title: 'بيانات البطاقة', holder: 'اسم حامل البطاقة', card: 'رقم البطاقة', expiry: 'تاريخ الانتهاء', cvv: 'رمز الأمان', secure: 'دفع آمن ومحمي بواسطة Stripe',
        selectOffer: 'اختر العرض للدفع', payForOffer: 'دفع لهذا العرض', unitPrice: 'سعر القطعة', shippingFee: 'رسوم الشحن',
        platformCommission: 'عمولة المنصة', totalDue: 'المبلغ المطلوب', paid: 'تم الدفع', remaining: 'متبقي',
        allPaid: 'تم دفع جميع العروض بنجاح!', paymentFailed: 'فشل الدفع', invalidCard: 'بيانات البطاقة غير صحيحة',
        paySuccess: 'تم الدفع بنجاح!', remainingParts: 'لا يزال هناك قطع لم يتم الدفع لها', readyToPay: 'جاهز للدفع',
        payingFor: 'الدفع لـ'
      },
      success: { title: 'تم الدفع بنجاح', desc: 'تم استلام طلبك وجاري العمل على تجهيزه.', back: 'العودة للطلبات' }
    },
    profile: {
      tabs: { info: 'البيانات الشخصية', security: 'الأمان والجلسات', wallet: 'المحفظة', settings: 'التفضيلات والإشعارات', addresses: 'العناوين', reviews: 'التقييمات' },
      info: { name: 'الاسم الكامل', email: 'البريد الإلكتروني', phone: 'رقم الجوال', save: 'حفظ التغييرات' },
      accountType: 'حساب عميل',
      security: {
        current: 'كلمة المرور الحالية',
        new: 'كلمة المرور الجديدة',
        confirm: 'تأكيد كلمة المرور',
        update: 'تحديث كلمة المرور',
        activeSessions: 'الجلسات النشطة',
        thisDevice: 'هذا الجهاز',
        terminate: 'إنهاء',
        terminateAll: 'تسجيل الخروج من جميع الأجهزة',
        secureNote: 'يتم تشفير جميع كلمات المرور وحماية حسابك عبر بروتوكولات أمان متقدمة.'
      },
      wallet: { 
        myCards: 'بطاقاتي', 
        addNew: 'إضافة بطاقة', 
        savedAddresses: 'العناوين المحفوظة',
        transactionTypes: {
          ORDER_PROFIT: 'أرباح الطلبات ✨',
          REFERRAL_PROFIT: 'أرباح الإحالات 🔗',
          PAYMENT: 'عملية دفع 💳',
          WITHDRAWAL: 'سحب رصيد 🏦',
          REFUND: 'استرداد مبلغ 💸',
          COMMISSION: 'عمولة المنصة ⚖️',
          PENALTY: 'جزاء / مخالفة ⚠️',
          DISPUTE: 'نزاع مالي 🛡️',
          LOYALTY_BONUS: 'مكافأة ولاء 🏆',
          WALLET_TOPUP: 'شحن محفظة 💰',
          GATEWAY_FEE: 'رسوم بوابة الدفع 💳',
          REFUND_FEE: 'رسوم الاسترداد 🔄',
          SHIPPING_FEE: 'تكاليف الشحن 🚚',
          FRAUD_PENALTY: 'غرامة احتيال 🚫',
          ADJUDICATION_FEE: 'رسوم حكم إداري ⚖️',
          SHIPPING_LIABILITY: 'مسؤولية شحن (معلقة) 🚚'
        },
        walletDashboard: {
          availableBalance: 'الرصيد المتاح',
          totalPurchases: 'إجمالي المشتريات',
          completedOrders: 'الطلبات المكتملة',
          refunded: 'المبالغ المستردة',
          loyaltyPoints: 'نقاط الولاء',
          tier: 'المستوى',
          pendingCashback: 'كاش باك (قيد الانتظار)',
          pendingReferral: 'إحالات (قيد الانتظار)',
          monthlyCashback: 'كاش باك هذا الشهر',
          monthlyReferral: 'إحالات هذا الشهر',
          orderCompletionRate: 'نسبة إكمال الطلبات',
          tierCashbackRate: 'نسبة الكاش باك',
          totalRewardsEarned: 'إجمالي المكافآت المكتسبة',
          pointsResetLabel: 'آخر إعادة تعيين للنقاط',
          pointsResetNote: 'تُعاد النقاط يدوياً من الإدارة. المستوى لا يتأثر.',
          earningsLog: 'سجل الارباح والطلبات',
          searchPlaceholder: 'بحث برقم الطلب...',
        }
      },
      settings: {
        lang: 'اللغة',
        notif: 'الإشعارات',
        notifDesc: 'استلام تحديثات حول حالة طلباتك',
        delete: 'حذف الحساب',
        danger: 'منطقة الخطر',
        global: 'التفضيلات العامة',
        currency: 'العملة',
        theme: 'المظهر',
        appearance: 'المظهر الخارجي',
        langDesc: 'اختر لغتك المفضلة',
        currencyDesc: 'عرض الأسعار بـ',
        themeDesc: 'اختر وضع العرض',
        dangerDesc: 'حذف الحساب والبيانات نهائياً',
        save: 'حفظ الإعدادات',
        notificationTypes: {
          email: 'إشعارات البريد الإلكتروني',
          emailDesc: 'استلام تحديثات حول طلباتك بشكل منظم.',
          push: 'إشعارات التنبيه (Push)',
          pushDesc: 'تنبيهات فورية على جهازك.',
          offers: 'عروض تسويقية',
          offersDesc: 'خصومات خاصة وعروض الشركاء.'
        }
      },
      addresses: { title: 'العناوين المحفوظة', add: 'إضافة عنوان جديد', default: 'الافتراضي', setDefault: 'تعيين كافتراضي', noAddresses: 'لا توجد عناوين محفوظة', save: 'حفظ العنوان' },
      reviews: { title: 'تقييماتي', noReviews: 'لم تقم بكتابة أي تقييم بعد' },
      loyalty: {
        title: 'التقييم والولاء',
        subtitle: 'اجمع النقاط واستبدلها بمكافآت حصرية',
        catalog: 'كتالوج المكافآت',
        redeem: 'استبدال',
        insufficient: 'رصيد غير كاف',
        success: 'تم الاستبدال بنجاح',
        currentLevel: 'مستوى الولاء الحالي',
        nextTier: 'المستوى القادم',
        remainingToNext: 'تبقّى لك {amount} درهم للوصول إلى المستوى القادم',
        referralProgram: 'برنامج الإحالة',
        referralDesc: 'شارك كودك الخاص واحصل على مكافآت مستقبلاً',
        copied: 'تم النسخ!',
        tiersTab: 'المستويات والمميزات',
        reviewsTab: 'التقييمات',
        currentBadge: 'مستواك الحالي',
        noReviews: 'لا توجد تقييمات حتى الآن',
        noReviewsDesc: 'قم بتقييم طلباتك المكتملة لجمع المزيد من المميزات',
        tiers: {
            basic: 'أساسي',
            silver: 'فضي',
            gold: 'ذهبي',
            vip: 'شخصية هامة (VIP)',
            partner: 'شريك'
        },
        benefits: {
            BASIC: [
                'دعم فني قياسي 🛠️',
                'اكتساب نقاط ولاء (1 نقطة لكل درهم عمولة)',
                'ربح 2% كاش باك من عمولة المنصة 💸'
            ],
            SILVER: [
                'أولوية في الدعم الفني ✨',
                'ربح 3% كاش باك من عمولة المنصة 💸',
                'عروض حصرية دورية'
            ],
            GOLD: [
                'أولوية مميزة في الدعم الفني 🥇',
                'ربح 4% كاش باك من عمولة المنصة 💸',
                'عروض حصرية دورية'
            ],
            VIP: [
                'وصول مبكر للميزات الجديدة 🚀',
                'ربح 5% كاش باك من عمولة المنصة 💎',
                'مدير حساب مخصص'
            ],
            PARTNER: [
                'أولوية قصوى في جميع الخدمات ⚡',
                'ربح 6% كاش باك من عمولة المنصة 👑',
                'سقف أرباح شهري مفتوح'
            ]
        },
        progression: {
            title: 'تطور مستوى العضوية المستحقة',
            goal: 'الهدف',
            remaining: 'المتبقي',
            nextLvlPerks: 'مزايا المستوى القادم',
            almostThere: 'لقد اقتربت جداً! أنفق {amount} درهم إضافية للترقية.'
        },
        referral: {
          title: 'نظام الإحالات',
          totalLabel: 'إجمالي إحالاتك:',
          commissionNote: 'شارك رابطك الخاص واحصل على عمولة 1% من ثمن كل منتج يشتريه صديقك خلال 6 شهور من تاريخ تسجيله.',
          windowNote: 'مدة صلاحية الرابط: 6 شهور تبدأ من تاريخ تسجيل كل صديق'
        }
      }
    },
    tracking: {
      title: 'تتبع الشحنة',
      estimated: 'التاريخ المتوقع',
      carrier: 'شركة الشحن',
      trackingNo: 'رقم البوليصة',
      viewMap: 'عرض الموقع المباشر',
      courierWeb: 'موقع شركة الشحن',
      steps: {
        received: 'تم الاستلام من المتجر',
        transit: 'في الطريق',
        distribution: 'وصلت لمركز التوزيع',
        out: 'خرجت للتوصيل',
        delivered: 'تم التسليم',
        cancelled: 'ملغى'
      }
    },
    support: {
      title: 'مركز الدعم والمساعدة المباشر',
      subtitle: 'نحن هنا لضمان حصولك على أفضل تجربة تسوق وحل أي تحديات قد تواجهك.',
      createTicket: 'فتح تذكرة جديدة',
      newTicketTitle: 'تفاصيل التذكرة',
      subject: 'الموضوع',
      message: 'الرسالة',
      myTickets: 'سجل تذاكري',
      noTickets: 'لا توجد تذاكر دعم سابقة',
      noTicketsDesc: 'لم تقم بتقديم أي تذاكر دعم فني حتى الآن.',
      liveChat: 'المحادثة الفورية',
      liveChatDesc: 'تحدث مع فريق الدعم الفني الآن',
      categories: {
        orders: 'مشاكل الطلبات والتتبع',
        returns: 'المرتجعات والنزاعات',
        payment: 'المدفوعات والمحفظة',
        technical: 'الدعم التقني والتطبيق',
        other: 'أخرى'
      },
      faq: {
        title: 'الأسئلة الشائعة للعملاء',
        q1: 'كيف يمكنني تتبع طلبي؟',
        a1: 'يمكنك تتبع طلبي من صفحة "الشحنات" أو "طلباتي" بالنقر على زر التتبع.',
        q2: 'متى يمكنني طلب استرجاع المبلغ؟',
        a2: 'يمكنك طلب الاسترجاع إذا لم يتم شحن الطلب، أو خلال 48 ساعة من الاستلام في حال وجود عيب مصنعي.',
        q3: 'كيف أتواصل مع البائع؟',
        a3: 'يمكنك استخدام خيار المحادثة المباشرة في صفحة تفاصيل الطلب للتحدث مع التاجر.',
        q4: 'ما هو الوقت المتوقع للرد؟',
        a4: 'فريقنا يعمل على مدار الساعة، وعادة ما يتم الرد على التذاكر العاجلة في أقل من ساعتين.'
      },
      form: {
        priority: 'الأولوية',
        low: 'منخفضة',
        medium: 'متوسطة',
        high: 'عالية',
        summaryPlaceholder: 'ملخص مختصر للمشكلة',
        descPlaceholder: 'يرجى شرح مشكلتك بالتفصيل لنتمكن من مساعدتك بسرعة...',
        upload: 'اضغط هنا لرفع صور أو ملفات توضيحية',
        error: 'فشل إرسال التذكرة. يرجى المحاولة مرة أخرى.',
        submitting: 'جاري الإرسال...'
      }
    },
    infoCenter: {
      title: 'مركز المعلومات',
      subtitle: 'كل ما تحتاج معرفته عن منصة إي تشليح',
      tabs: { about: 'من نحن', privacy: 'الخصوصية', terms: 'الشروط', faq: 'الأسئلة الشائعة', contact: 'تواصل معنا' }
    },
    threeDS: {
      title: 'التحقق البنكي 3D Secure',
      subtitle: 'مصادقة دفع آمنة',
      amount: 'المبلغ',
      date: 'التاريخ',
      card: 'البطاقة',
      otpLabel: 'رمز التحقق (OTP) المرسل لهاتفك',
      resend: 'إعادة إرسال الرمز',
      verify: 'تحقق وإتمام الدفع',
      cancel: 'إلغاء'
    },
    status: {
      completed: 'مكتمل',
      pending: 'قيد الانتظار',
      shipped: 'تم الشحن',
      delivered: 'تم التوصيل'
    },
    timers: {
      offers_expires: 'ينتهي استقبال العروض خلال',
      payment_expires: 'تنتهي مهلة الدفع خلال',
      return_window: 'نافذة الإرجاع تنتهي خلال'
    },
    notifications: {
      title: 'الإشعارات',
      markAllRead: 'تحديد الكل كمقروء',
      empty: 'لا توجد إشعارات جديدة حالياً',
      newOffer: 'عرض جديد',
      offerAccepted: 'تم قبول العرض',
      paymentConfirmed: 'تأكيد الدفع',
      shipped: 'تم الشحن',
      delivered: 'تم التوصيل',
      rateRequest: 'طلب تقييم',
      disputeUpdate: 'تحديث نزاع',
      adminAlert: 'تنبيه إداري'
    },
    reviews: {
      writeTitle: 'تقييم التجربة',
      rating: 'التقييم',
      comment: 'اكتب تعليقك...',
      placeholder: 'صف تجربتك مع المنتج والتاجر...',
      submit: 'إرسال التقييم',
      success: 'تم إرسال التقييم بنجاح',
      published: 'منشور',
      pending: 'قيد المراجعة'
    },
    resolution: {
      billing: 'الفواتير',
      loyalty: 'نقاط الولاء',
      newReturn: 'طلب إرجاع جديد',
      newDispute: 'فتح نزاع جديد',
      subtitle: 'إدارة المرتجعات والنزاعات',
      heroDesc: 'منصة حماية المستهلك المتقدمة. إدارة طلبات الإرجاع وفض النزاعات بشفافية مطلقة وأمان عالي تحت نظام Escrow.',
      tabs: {
        returns: 'بروتوكول المرتجعات',
        disputes: 'النزاعات الرسمية'
      },
      returnPolicy: 'يمكنك طلب الإرجاع خلال 48 ساعة من الاستلام في حال وجود عيوب أو عدم تطابق.',
      disputePolicy: 'يتم تجميد الأموال فور فتح النزاع. يرجى التواصل مع التاجر أولاً.',
      reasons: {
        not_matching: 'القطعة غير مطابقة للوصف',
        defective: 'القطعة معطوبة أو تالفة',
        not_working: 'القطعة لا تعمل / عطل مصنعي',
        delayed: 'تأخر الشحن',
        wrong_item: 'استلام قطعة خاطئة',
        wrong_size: 'خطأ في المقاس أو الموديل',
        shipping_error: 'خطأ من شركة الشحن',
        warranty_claim: 'مطالبة بموجب الضمان',
        replacement: 'استبدال القطعة'
      },
      stats: {
        protectedFunds: 'سيولة محمية',
        eligibleOrders: 'طلبات مؤهلة',
        activeDisputes: 'نزاعات نشطة',
        safeVault: 'في الخزانة الآمنة',
        readyAction: 'جاهزة للإجراء',
        verifiedEscrow: 'حماية Escrow'
      },
      shipping_logistics: 'لوجستيات الشحن للمرتجعات',
      shipping_paid: 'مدفوع',
      shipping_processing: 'جاري معالجة الدفع...',
      shipping_success: 'تم الدفع بنجاح! 💰',
      shipping_success_msg: 'تم سداد تكاليف الشحن، وبدأت عملية الإرجاع.',
      shipping_paid_msg: 'تم سداد تكاليف الشحن بنجاح. سيتم استلام القطعة منك قريباً.',
      shipping_responsibility_payee: 'بناءً على الحكم الإداري، أنت مسؤول عن تكاليف الشحن لبدء عملية الإرجاع.',
      shipping_responsibility_other: 'التاجر مسؤول عن تكاليف الشحن. سيبدأ الإرجاع فور قيامه بالسداد.',
      shipping_warning: '⛔ تحذير: يرجى سداد تكاليف الشحن لتجنب إغلاق حسابك أو التعرض لغرامات.',
      shipping_warning_en: '⛔ Warning: Please pay shipping costs to avoid account closure or fines.',
      shipping_payment_note: 'يرجى التوجه لتفاصيل الطلب للسداد لبدء عملية الإرجاع.',
      shipping_payment_note_en: 'Please go to Order Details to pay and initiate the return process.',
      awaiting_other_party: 'في انتظار سداد التاجر',
      pay_via_card: 'الدفع عبر STRIPE',
      deduct_from_wallet: 'الخصم من المحفظة',
      wallet_confirm_title: 'تأكيد الخصم من المحفظة',
      wallet_balance: 'الرصيد المتوفر',
      wallet_deduction: 'المبلغ المراد خصمه',
      wallet_remaining: 'الرصيد بعد الخصم',
      confirm_deduction: 'تأكيد عملية الخصم',
      cancel: 'إلغاء',
      amount_due: 'المبلغ المطلوب',
      quickActions: {
        title: 'إجراءات عاجلة متاحة',
        subtitle: 'طلبات مؤهلة للحماية أو الإرجاع الآن'
      },
      actions: {
        escalate: 'تصعيد للإدارة',
        underAdminReview: 'قيد مراجعة الإدارة',
        confirmEscalation: 'هل أنت متأكد من تصعيد هذه الحالة للإدارة؟'
      },
      guidelines: {
        title: 'تعليمات التغليف',
        policy: 'سياسة الإرجاع',
        packaging: 'تعليمات الشحن',
        steps: [
          'استخدم التغليف الأصلي إن أمكن لضمان حماية القطعة.',
          'تأكد من نظافة القطعة وخلوها من السوائل (زيت، وقود).',
          'استخدم مواد توسيد كافية (فقاعات هوائية) للمكونات القابلة للكسر.',
          'أغلق الصندوق بإحكام باستخدام شريط لاصق قوي.'
        ],
        highlights: [
          'يتم قبول المرتجعات خلال 7 أيام من الاستلام للقطع المعيبة.',
          'يجب أن تكون القطعة بنفس الحالة التي استلمت بها.',
          'قد يتم تطبيق رسوم شحن للمرتجعات غير الناتجة عن عيب.',
          'تتم معالجة الاسترداد خلال 5 أيام عمل.'
        ]
      },
      form: {
        reason: 'السبب',
        desc: 'وصف تفصيلي',
        evidence: 'الأدلة (صور/فيديو)',
        submitReturn: 'إرسال طلب الإرجاع',
        submitDispute: 'فتح نزاع رسمي',
        upload: 'رفع الملفات'
      },
      alerts: {
        freeze: 'تنبيه: سيتم تجميد المبلغ لدى المنصة حتى حل النزاع.',
        success: 'تم فتح الطلب بنجاح. سنقوم بالمراجعة والتحديث.'
      },
      statusTimeline: {
        requested: 'تم تقديم الطلب',
        awaiting_merchant: 'بانتظار رد المتجر',
        awaiting_admin: 'بانتظار مراجعة الإدارة',
        under_review: 'يقوم المسؤول بمراجعة الأدلة الآن',
        merchant_accepted: 'وافق المتجر على الإرجاع',
        merchant_rejected: 'رفض المتجر الطلب - جاري التصعيد للإدارة',
        admin_review: 'يقوم المسؤول بمراجعة الأدلة الآن',
        resolved: 'تم إصدار القرار النهائي',
        final_verdict: 'تم إصدار القرار النهائي'
      },
      chat: {
        title: 'نقاش الحالة',
        realtimeActive: 'الدعم المباشر نشط',
        placeholder: 'اكتب رسالتك أو تفاصيل الأدلة...',
        officialAdmin: 'مسؤول المنصة الرسمي',
        merchant: 'ممثل المتجر',
        customer: 'العميل (أنت)'
      },
      details: {
        back: 'الرجوع للقائمة',
        statusProtocol: 'بروتوكول الحالة',
        digitalSignature: 'التوقيع الرقمي',
        subject: 'موضوع الحساب',
        orderRef: 'مرجع الطلب',
        initiated: 'تاريخ البدء',
        primaryReason: 'السبب الرئيسي',
        merchantEntity: 'كيان التاجر',
        statement: 'بيان العميل',
        evidence: 'الأدلة المرئية',
        secureDiscussion: 'نقاش الحالة الآمن',
        verdict: 'قرار الحوكمة',
        conclusion: 'الاستنتاج النهائي',
        closedAt: 'تم الإغلاق في',
        defense: 'دفاع التاجر',
        escrowSecurity: 'أمن الضمان (Escrow)',
        escrowDesc: 'يتم الاحتفاظ بأموال هذا الطلب في ضماننا المشفر. يقوم فريق الخبراء بمراجعة كل نزاع يدوياً قبل تحرير الأموال.',
        activity: 'نشاط الحالة',
        opened: 'تم فتح الحالة',
        notified: 'تم إخطار التاجر',
        update: 'تحديث النظام'
      },
      initiate: {
        title: 'بدء طلب جديد',
        selectOrder: 'اختر الطلب',
        noEligible: 'لا توجد طلبات مؤهلة حالياً',
        noEligibleDesc: 'تظهر هنا فقط الطلبات المستلمة خلال الـ 48 ساعة الماضية.',
        returnItem: 'إرجاع واسترداد',
        openDispute: 'فتح نزاع رسمي',
        selectPart: 'اختر القطعة المعنية'
      }
    },
    returns: {
      subtitle: 'إدارة المرتجعات والنزاعات',
      tabs: {
        activeReturns: 'المرتجعات النشطة',
        disputes: 'النزاعات',
        guidelines: 'التعليمات'
      },
      noReturns: 'لا توجد مرتجعات نشطة',
      noReturnsDesc: 'لم تقم بتقديم أي طلبات إرجاع بعد',
      noDisputes: 'لا توجد نزاعات',
      noDisputesDesc: 'سجلك نظيف من النزاعات'
    },
    billing: {
      title: 'الدفع والفواتير',
      subtitle: 'إدارة فواتير الطلبات والمدفوعات',
      tabs: {
        unpaid: 'فواتير غير مدفوعة',
        history: 'سجل المدفوعات',
        methods: 'وسائل الدفع',
        pendingOffers: 'مدفوعات معلقة'
      },
      wallet: 'المحفظة',
      invoice: {
        id: 'فاتورة #',
        date: 'تاريخ الفاتورة',
        amount: 'المبلغ الإجمالي',
        status: 'حالة الدفع',
        view: 'عرض الفاتورة',
        pay: 'ادفع الآن',
        details: 'تفاصيل الفاتورة',
        download: 'تحميل PDF',
        print: 'طباعة',
        billTo: 'فاتورة إلى',
        shipTo: 'شحن إلى',
        item: 'البند',
        qty: 'الكمية',
        price: 'السعر',
        total: 'الإجمالي',
        vat: 'الضريبة (15%)',
        subtotal: 'المجموع الفرعي',
        shipping: 'الشحن',
        grandTotal: 'الإجمالي الكلي',
        sender: 'المرسل',
        receiver: 'المستلم',
        note: 'ملاحظة'
      },
      cardForm: {
        holder: 'اسم صاحب البطاقة',
        number: 'رقم البطاقة',
        expiry: 'الانتهاء (MM/YY)',
        cvc: 'الرمز (CVC)',
        save: 'حفظ البطاقة',
        cancel: 'إلغاء',
        makeDefault: 'تعيين كافتراضي',
        default: 'افتراضية',
        expires: 'تنتهي في',
        noCards: 'لا توجد بطاقات محفوظة'
      },
      empty: {
        unpaid: 'لا توجد فواتير غير مدفوعة',
        history: 'سجل المدفوعات فارغ'
      }
    },
    violationsPage: {
        title: 'سجل الالتزام والمخالفات',
        subtitle: 'تتبع نقاط التزامك، وتعرف على المخالفات المسجلة والطعون.',
        tabs: {
            history: 'سجل المخالفات',
            reliability: 'مؤشر الموثوقية'
        },
        scoreCard: {
            title: 'مؤشر الالتزام',
            perfect: 'أداء مثالي',
            warning: 'تنبيه: التزام متوسط',
            danger: 'خطر: معرض للعقوبات',
            points: 'نقطة مخالفة',
            history: 'سجل النقاط'
        },
        table: {
            type: 'نوع المخالفة',
            date: 'التاريخ',
            points: 'النقاط',
            fine: 'الغرامة',
            status: 'الحالة',
            actions: 'الإجراءات'
        },
        appeal: {
            title: 'تقديم طعن',
            reason: 'سبب الطعن',
            reasonPlaceholder: 'اشرح بالتفصيل لماذا تعقد أن هذه المخالفة غير صحيحة...',
            evidence: 'أدلة الطعن (صور/فيديو)',
            submit: 'إرسال الطعن',
            success: 'تم إرسال الطعن بنجاح، جاري المراجعة.',
            uploading: 'جاري الرفع...',
            uploadSuccess: 'تم رفع الأدلة بنجاح',
            uploadPlaceholder: 'اضغط لرفع فيديو أو صور أو مستندات',
            declarationTitle: 'إقرار بصحة البيانات',
            declarationText: 'أقر بأن جميع المعلومات والوثائق المقدمة حقيقية، وأدرك أن تقديم طعون كيدية قد يؤدي لمضاعفة العقوبات.',
            submitting: 'جاري الإرسال...'
        },
        guidelines: {
            title: 'تعليمات النظام وحدود العقوبات',
            subtitle: 'دليل شفاف لأنواع المخالفات والنقاط وحدود الإجراءات الإدارية.',
            typeTable: {
                title: 'أنواع المخالفات ومدة زوال النقاط',
                name: 'نوع المخالفة',
                points: 'النقاط',
                fine: 'الغرامة القياسية',
                decay: 'مدة الزوال'
            },
            thresholdTable: {
                title: 'حدود العقوبات والإجراءات',
                points: 'نقاط الحد',
                action: 'الإجراء الإداري',
                duration: 'مدة الإيقاف'
            }
        },
        codes: {
            ACCEPT_OFFER_NO_PAYMENT: 'قبول عرض بدون دفع',
            FAKE_REQUEST: 'طلب وهمى',
            FREQUENT_RETURNS: 'كثرة الإرجاع',
            EXCEEDED_RETURN_RATE: 'تجاوز نسبة الإرجاع المسموحة',
            FAKE_DISPUTE: 'نزاع كيدى',
            LATE_RETURN_HANDOVER: 'تأخر تسليم القطعة المُرجعة',
            FAKE_COMPLAINT: 'شكوى كاذبة',
            ABUSE: 'إساءة',
            SHARE_CONTACT_OFF_PLATFORM: 'مشاركة رقم/تواصل خارج المنصة'
        },
        penaltyActions: {
            WARNING: 'تنبيه رسمي',
            RESTRICT_PURCHASE: 'منع الشراء',
            PERMANENT_BAN: 'حظر نهائي'
        }
      },
    rewards: {
      pageTitle: 'مركز الإحالات',
      pageSubtitle: 'شارك رابطك الخاص مع أصدقائك واحصل على عمولة 1% من ثمن كل منتج يشتريه صديقك خلال 6 شهور من تاريخ تسجيله.',
      tierProgressTitle: 'تطور مستوى العضوية',
      referralHubTitle: 'مركز الإحالة',
      referralCodeLabel: 'كود الإحالة الشخصي',
      shareOn: 'مشاركة عبر',
      copyLink: 'نسخ الرابط',
      copiedToast: 'تم نسخ الرابط!',
      shareViaNative: 'مشاركة',
      history: {
        title: 'سجل الإحالات',
        subtitle: 'كل صديق دعوته خلال آخر 6 شهور',
        empty: 'لا توجد إحالات بعد',
        emptyDesc: 'كن أول من يشارك رابطك! ابدأ الآن واحصل على عمولة 1% من كل منتج يشتريه أصدقاؤك خلال 6 شهور.',
        emptyBadge: 'الفرصة في انتظارك',
        totalReferrals: 'إجمالي الإحالات',
        totalEarned: 'إجمالي ما كسبته',
        activeCount: 'الإحالات النشطة',
        active: 'نشطة',
        windowLabel: 'نافذة 6 شهور',
        columns: {
          friend: 'الصديق',
          registered: 'تاريخ التسجيل',
          orders: 'الطلبات',
          earned: 'المكاسب',
          window: 'نافذة 6 شهور'
        },
        daysRemaining: '{days} يوم متبقي',
        endingSoon: '{days} يوم — على وشك الانتهاء',
        expired: 'انتهت',
        ordersBadge: '{n} طلب'
      },
      shareMessage: 'انضم إلى E-TASHLEH وابدأ تجربة تسوق ذكية. سجل من خلال رابطي:',
      emailSubject: 'دعوة للانضمام إلى E-TASHLEH'
    }
  },
  en: {
    menu: {
      home: 'Home',
      orders: 'My Orders',
      create: 'New Order',
      chats: 'Chats',
      profile: 'Profile',
      resolution: 'Returns & Disputes',
      infoCenter: 'Info Center',
      logout: 'Logout',
      notifications: 'Notifications',
      settings: 'Settings',
      shipments: 'Shipments',
      shippingCart: 'Assembly Cart',
      billing: 'Billing & Invoices',
      preferences: 'Preferences',
      loyalty: 'Loyalty & Rewards',
      support: 'Support Center',
      returns: 'Returns',
      violations: 'Violations & Penalties',
      merchant: 'Merchant',
      customer: 'Customer'
    },
    common: {
      loading: 'Loading...',
      select: 'Select...',
      expired: 'Expired',
      notFound: 'Not Found',
      redeem: 'Redeem',
      history: 'History',
      earned: 'Earned',
      rewards: 'Rewards',
      reviews: 'Reviews',
      status: {
        AWAITING_OFFERS: 'Awaiting Offers',
        COLLECTING_OFFERS: 'Collecting Best Offers',
        AWAITING_PAYMENT: 'Awaiting Payment',
        PREPARATION: 'Preparation',
        VERIFICATION: 'Part Inspection',
        VERIFICATION_SUCCESS: 'Verification Approved',
        NON_MATCHING: 'Non-Matching',
        CORRECTION_PERIOD: 'Correction Period',
        CORRECTION_SUBMITTED: 'Correction Submitted',
        SHIPPED: 'Shipped',
        DELIVERED: 'Delivered',
        COMPLETED: 'Completed',
        CANCELLED: 'Cancelled',
        RETURNED: 'Returned',
        DISPUTED: 'Disputed',
        REFUNDED: 'Refunded',
        AWAITING_SHIPMENT: 'Awaiting Shipment',
        WARRANTY_ACTIVE: 'Warranty Active',
        WARRANTY_EXPIRED: 'Warranty Expired'
      }
    },
    shipments: {
      subtitle: 'Track all your incoming and past shipments',
      noShipments: 'No shipments found',
      orderNo: 'Order No',
      partDetails: 'Part Details',
      routeDetails: 'Route Details',
      items: 'Items',
      quantity: 'Qty'
    },
    actions: {
      viewTracking: 'Track Shipment',
      hideTracking: 'Hide Tracking'
    },
    shippingCart: {
      subtitle: 'Consolidate your held items into one shipment',
      itemsInCart: 'Items in Cart',
      summary: 'Order Summary',
      subtotal: 'Subtotal',
      shippingEst: 'Shipping estimate',
      calculatedNext: 'Calculated next step',
      total: 'Total',
      requestShipping: 'Request Shipping',
      timerNote: 'Items added to the cart are reserved for up to 7 days. Please request shipping before the timer expires.',
      autoShipNote: 'Items will be shipped automatically 7 days after payment.',
      daysRemaining: 'days remaining',
      empty: 'Your assembly cart is empty',
      emptyDesc: 'Items requiring assembly will appear here after payment. Single-part orders go directly to Shipments.',
      store: 'Store',
      partialShipping: 'Partial Shipping',
      shipSelected: 'Ship Selected Items',
      waybillBatchNote: 'Parts selected together ship in one shipment and one waybill under the same order number.',
      selectItems: 'Select items you want to ship now',
      alreadyShipped: 'Shipped',
      readyToShip: 'Ready to Ship',
      consolidationWarning: 'You can ship selected items now and leave others in the cart.',
      batchTotal: 'Current Shipment Total',
      itemsCount: 'Selected Items Count',
      handoverPendingTitle: 'Shipping unlocks after merchant handover to admin',
      handoverPendingDesc: 'You can select parts and ship from the assembly cart only after the merchant submits handover for each part.',
      handoverPendingTitleMixed: 'Some parts are ready; others await merchant handover',
      handoverPendingDescMixed: 'You can select {ready} ready part(s) now. {waiting} part(s) still await merchant handover to admin.',
      cartBadges: {
        orderGrouped: 'Grouped order',
        inCart: 'In assembly cart',
        handoverPending: 'Awaiting merchant handover',
        readyInCart: 'Ready to select',
        batchSolo: 'Solo batch',
        batchGroup: 'Grouped batch',
      },
      modes: {
        title: 'Shipping Mode',
        faster: 'Faster',
        cheaper: 'Cheaper',
        fasterDesc: 'Items shipped as they arrive (Faster)',
        cheaperDesc: 'Items shipped together in one box (Ecofriendly & Cheaper)'
      }
    },
    dashboardHome: {
      stats: {
        active: 'Active Orders',
        completed: 'Completed',
        totalOrders: 'Total Orders'
      },
      headers: {
        liveTracking: 'Live Tracking',
        viewAll: 'View All',
        recentActivity: 'Recent Activity'
      },
      empty: {
        noActive: 'No Active Orders',
        noActiveDesc: 'All your previous orders are completed. Want to create a new one?',
        noHistory: 'No history found'
      },
      actions: {
        viewDetails: 'View Full Details',
        viewHistory: 'View full history'
      },
      reliability: {
        title: 'Reliability Index',
        score: 'Integrity Score',
        level: 'Account Level',
        returnRate: 'Return Rate',
        deliveredOrders: 'Successful Orders',
        returns: 'Returns',
        status: {
          EXCELLENT: 'Elite Buyer 💎',
          GOOD: 'Trusted ✅',
          FAIR: 'Fair Standing ⚠️',
          POOR: 'At Risk ❌'
        },
        tips: {
          title: 'How to maintain reliability?',
          tip1: 'Ensure part compatibility before ordering.',
          tip2: 'Use VIN number for maximum precision.',
          tip3: 'Chat with the merchant to verify part condition.'
        }
      }
    },
    headers: {
      welcome: 'Welcome,',
      recentOrders: 'Recent Orders',
      liveTracking: 'Live Tracking',
      needPart: 'Need a new spare part?',
      needPartDesc: 'Create your request now and we will search for the best offers from our certified global suppliers.',
      noOrders: 'No Active Orders',
      noOrdersDesc: 'All your previous orders are completed. Want to create a new one?',
      noHistory: 'No history found',
      viewFullHistory: 'View Full History'
    },
    createOrder: {
      title: 'Create New Order',
      subtitle: 'Fill in the details below to get the best offers',
      partSubtitle: 'Enter details for the requested parts',
      preferencesSubtitle: 'Select your preferences for the part',
      steps: {
        vehicle: 'Vehicle',
        part: 'Part',
        preferences: 'Preferences',
        review: 'Review'
      },
      vehicle: {
        make: 'Car Make',
        model: 'Car Model',
        year: 'Year',
        vin: 'VIN Number',
        vinPlaceholder: 'Enter 17 characters',
        vinTooltip: 'The VIN ensures you receive a part that is 100% compatible with your vehicle without errors',
        selectMake: 'Select Make',
        selectModel: 'Select Model',
        selectYear: 'Select Year',
        tooltip: 'You can find the VIN on your registration card or dashboard.'
      },
      part: {
        name: 'Part Name',
        namePlaceholder: 'e.g., Front Bumper, Gearbox...',
        desc: 'Detailed Description',
        descPlaceholder: 'Mention any additional details to identify the part... (Required)',
        images: 'Part Images',
        upload: 'Upload'
      },
      prefs: {
        condition: 'Preferred Condition',
        new: 'New / Like New',
        newDesc: 'Parts in box or from very low mileage cars.',
        used: 'Used - Clean',
        usedDesc: 'Used parts in excellent tested condition.',
        warranty: 'Extended Warranty Request',
        warrantyDesc: 'Prefer offers that include at least 3 months warranty.'
      },
      review: {
        alert: 'Please review your order details carefully before submitting to ensure accurate offers.',
        vehicleInfo: 'Vehicle Information',
        partDetails: 'Part Details',
        confirm: 'Confirm & Submit Order'
      },
      successAlert: 'New Market Request',
      next: 'Next',
      back: 'Back'
    },
    orders: {
      manageTitle: 'Manage and track your current and past orders',
      tabs: {
        all: 'All',
        active: 'Active',
        completed: 'Completed',
        cancelled: 'Cancelled'
      },
      notFound: 'No Orders Found',
      notFoundDesc: 'No orders match your search criteria',
      newOffers: 'New Offers',
      status: 'Status',
      viewFull: 'View Full Details',
      simulateShip: 'Simulate Ship',
      simulateDeliver: 'Simulate Delivery',
      backToList: 'Back to List',
      orderId: 'Order #',
      requestDate: 'Request Date',
      searching: 'Searching for Suppliers',
      searchingDesc: 'Your request is now live. Offers will appear here as soon as they arrive.',
      renewOrder: 'Renew Order',
      renewOrderHint: 'Republishes your order for 24 hours with the same details',
      renewOrderSuccess: 'Order renewed successfully',
      renewOrderError: 'Could not renew order',
      receivedOffers: 'Received Offers',
      noOffers: 'No offers yet',
      vehicleDetails: 'Vehicle Details',
      partName: 'Part Name',
      vehicle: 'Vehicle',
      supportTitle: 'Support & Help',
      supportDesc: 'Contact us if you have any issues',
      hideTracking: 'Hide Tracking Details',
      viewTracking: 'View Full Tracking',
      searchPlaceholder: 'Search...',
      expiredModal: {
        title: 'Order Expired',
        desc: 'We apologize for the unavailability of offers at the moment for order number (#{orderNumber}) for the part ({partName}). You can resubmit the request during business days from Monday to Thursday.',
        dontShow: 'Do not show this message again',
        understood: 'OK'
      },
      selectionExpiredModal: {
        title: 'Selection Period Expired',
        desc: 'The deadline to select an offer for order (#{orderNumber}) has passed and the request was closed automatically. You may create a new request during business days from Monday to Thursday.',
        dontShow: 'Do not show this message again',
        understood: 'OK'
      },
      partNoOffers: {
        message: 'We apologize — no offers were available. Please submit a new request.',
        reorderBtn: 'Reorder',
        waiting: 'No offers yet for this part'
      }
    },
    offers: {
      incVat: 'Inc. VAT',
      accept: 'Accept',
      acceptOffer: 'Accept Offer',
      chat: 'Chat',
      orderClosed: 'Order Closed',
      finalPrice: 'Final Price',
      shippingIncluded: 'Shipping Included',
      offerNotes: 'Vendor Notes',
      conditions: {
        new: 'New (Original)',
        used: 'Used',
        used_clean: 'Used (Original)',
        remanufactured: 'Remanufactured'
      },
      delivery: {
        d1_3: '1-3 Days',
        d3_5: '3-5 Days',
        d3_7: '3-7 Days',
        d5_7: '5-7 Days',
        d7_14: '7-14 Days'
      },
      labels: {
        condition: 'Condition',
        type: 'Type',
        warranty: 'Warranty',
        delivery: 'Delivery',
        weight: 'Weight',
        notes: 'Vendor Notes',
        unitPrice: 'Part Price'
      },
      partTypes: {
        original: 'Original',
        commercial: 'Commercial',
        aftermarket: 'Aftermarket',
        standard: 'Standard Shipping',
        normal: 'Normal',
        engine: 'Engine',
        gearbox: 'Gearbox',
        bumper: 'Front Bumper'
      },
      warranties: {
        yes: 'Warranty Available',
        no: 'No Warranty',
        '15days': '15 Days',
        '1month': '1 Month',
        '3months': '3 Months',
        '12months': '12 Months'
      },
      units: {
        kg: 'Kg',
        settings: {
          global: 'Global Preferences',
          lang: 'Language',
          langDesc: 'Select display language',
          currency: 'Currency',
          currencyDesc: 'Default display currency',
          notif: 'Notifications',
          notificationTypes: {
            email: 'Email Notifications',
            push: 'Push Notifications',
            offers: 'Offer Updates',
            sms: 'SMS Alerts'
          },
          delete: 'Delete Account',
          dangerDesc: 'Permanently remove account and data',
          deleteConfirm: 'Are you sure?',
          deleteWarning: 'This action cannot be undone. All your data and invoices will be permanently deleted.',
          typeToConfirm: 'Type "DELETE" to confirm',
          cancel: 'Cancel'
        }
      }
    },
    chat: {
      title: 'Chats',
      noChats: 'No active chats',
      typeMessage: 'Type your message...',
      offerReceived: 'New offer received:',
      acceptOffer: 'Accept Offer & Pay',
      orderContext: 'Order Context',
      translationOn: 'Translation ON',
      translate: 'Translate',
      someoneTyping: 'Someone is typing...'
    },
    checkout: {
      title: 'Checkout',
      common: { back: 'Back', continue: 'Continue to Confirm', payNow: 'Pay Now', editData: 'Edit Data' },
      steps: { address: 'Shipping Confirmation', summary: 'Invoice', finalReview: 'Order Confirmation', payment: 'Payment', confirm: 'Confirm' },
      finalReview: {
        title: "Final review before completing the purchase",
        orderDetails: "Final Order Details",
        price: "Price",
        orderNoDate: "Order No. & Date",
        offerNo: "Offer No.",
        storeNo: "Store No.",
        paymentStatus: "Payment Status",
        shippingInfo: "Shipping Information",
        orderInfo: "Order Information",
        shippingType: "Shipping Type",
        orderStatus: "Order Status",
        itemsCount: "Items Count",
        notes: "Notes",
        groupedAlertTitle: "Important Note on Grouped Shipping",
        groupedAlert1: "Items will be grouped and shipped together in a single waybill.",
        groupedAlert2: "Grouped shipping may take slightly longer to ensure all items arrive safely together.",
        approve: "Approve",
        cancel: "Cancel",
        condition: "Condition",
        deliveryTime: "Delivery Time",
        approxWeight: "Approx. Weight",
        warranty: "Warranty",
        noWarranty: "No Warranty"
      },
      address: {
        name: 'Full Name', phone: 'Phone Number', email: 'Email', country: 'Country', city: 'City', address: 'Address Details',
        alertTitle: 'Attention: Terms Agreement Required',
        alertTextLines: [
          'All offers accepted successfully! Now you must agree to the Terms & Conditions and the Return & Exchange Policy.',
          'For heavy parts (over 100 kg)',
          'It is preferable to enter a workshop or garage address to facilitate shipping.',
          'You can edit the address later for other orders to continue.',
        ],
        termsCheckboxStart: 'I agree to the ',
        termsCheckboxLink: 'Terms & Conditions of the E-TASHLEH platform',
        policyCheckboxStart: 'I agree to the ',
        policyCheckboxLink: 'Return & Exchange Policy',
        policyCheckboxEnd: ' and understand the conditions',
        validationError: 'You must fill all data and agree to the Terms and Return Policy first'
      },
      summary: { item: 'Part Value', vat: 'VAT', shipping: 'Shipping', total: 'Total', pay: 'Pay' },
      payment: {
        title: 'Card Details', holder: 'Cardholder Name', card: 'Card Number', expiry: 'Expiry Date', cvv: 'CVV', secure: 'Secure Payment by Stripe',
        selectOffer: 'Select Offer to Pay', payForOffer: 'Pay for this Offer', unitPrice: 'Unit Price', shippingFee: 'Shipping Fee',
        platformCommission: 'Platform Commission', totalDue: 'Total Due', paid: 'Paid', remaining: 'Remaining',
        allPaid: 'All offers paid successfully!', paymentFailed: 'Payment Failed', invalidCard: 'Invalid card details',
        paySuccess: 'Payment Successful!', remainingParts: 'There are still unpaid parts', readyToPay: 'Ready to Pay',
        payingFor: 'Paying for'
      },
      success: { title: 'Payment Successful', desc: 'Order received and being processed.', back: 'Back to Orders' }
    },
    profile: {
      tabs: { info: 'Personal Info', security: 'Security & Sessions', wallet: 'Wallet', settings: 'Preferences & Notifications', addresses: 'Addresses', reviews: 'Reviews' },
      info: { name: 'Full Name', email: 'Email', phone: 'Phone', save: 'Save Changes' },
      accountType: 'Customer Account',
      security: {
        current: 'Current Password',
        new: 'New Password',
        confirm: 'Confirm Password',
        update: 'Update Password',
        activeSessions: 'Active Sessions',
        thisDevice: 'This Device',
        terminate: 'Terminate',
        terminateAll: 'Log out from all devices',
        secureNote: 'All passwords encrypted and account protected with advanced security protocols.'
      },
      wallet: { 
        myCards: 'My Cards', 
        addNew: 'Add New Card', 
        savedAddresses: 'Saved Addresses',
        transactionTypes: {
          ORDER_PROFIT: 'Order Profits ✨',
          REFERRAL_PROFIT: 'Referral Profits 🔗',
          PAYMENT: 'Payment 💳',
          WITHDRAWAL: 'Withdrawal 🏦',
          REFUND: 'Refund 💸',
          COMMISSION: 'Commission ⚖️',
          PENALTY: 'Penalty ⚠️',
          DISPUTE: 'Dispute 🛡️',
          LOYALTY_BONUS: 'Loyalty Bonus 🏆',
          WALLET_TOPUP: 'Wallet Top-up 💰',
          GATEWAY_FEE: 'Gateway Fee 💳',
          REFUND_FEE: 'Refund Processing Fee 🔄',
          SHIPPING_FEE: 'Shipping Cost 🚚',
          FRAUD_PENALTY: 'Fraud Penalty 🚫',
          ADJUDICATION_FEE: 'Adjudication Fee ⚖️',
          SHIPPING_LIABILITY: 'Shipping Liability (pending) 🚚'
        },
        walletDashboard: {
          availableBalance: 'Available Balance',
          totalPurchases: 'Total Purchases',
          completedOrders: 'Completed Orders',
          refunded: 'Refunded',
          loyaltyPoints: 'Loyalty Points',
          tier: 'Tier',
          pendingCashback: 'Cashback (Pending)',
          pendingReferral: 'Referrals (Pending)',
          monthlyCashback: 'Cashback (This Month)',
          monthlyReferral: 'Referrals (This Month)',
          orderCompletionRate: 'Order Completion Rate',
          tierCashbackRate: 'Tier Cashback Rate',
          totalRewardsEarned: 'Total Rewards Earned',
          pointsResetLabel: 'Last Points Reset',
          pointsResetNote: 'Points reset is admin-triggered. Tier is unaffected.',
          earningsLog: 'Earnings & Orders Log',
          searchPlaceholder: 'Search Order Number...',
        }
      },
      settings: {
        lang: 'Language',
        notif: 'Notifications',
        notifDesc: 'Receive updates about your orders',
        delete: 'Delete Account',
        danger: 'Danger Zone',
        global: 'Global Preferences',
        currency: 'Currency',
        theme: 'Appearence',
        appearance: 'Appearance',
        langDesc: 'Select your preferred language',
        currencyDesc: 'Display prices in',
        themeDesc: 'Choose theme mode',
        dangerDesc: 'Permanently remove your account and data',
        save: 'Save Settings',
        notificationTypes: {
          email: 'Email Notifications',
          emailDesc: 'Receive updates about your orders properly',
          push: 'Push Notifications',
          pushDesc: 'Get real-time alerts on your device',
          offers: 'Marketing Offers',
          offersDesc: 'Receive special discounts and partner offers'
        }
      },
      addresses: { title: 'Saved Addresses', add: 'Add New Address', default: 'Default', setDefault: 'Set Default', noAddresses: 'No saved addresses', save: 'Save Address' },
      reviews: { title: 'My Reviews', noReviews: 'You haven\'t written any reviews yet' },
      loyalty: {
        title: 'Loyalty & Rewards',
        subtitle: 'Earn points and redeem exclusive rewards',
        catalog: 'Reward Catalog',
        redeem: 'Redeem',
        insufficient: 'Insufficient Balance',
        success: 'Redeemed successfully',
        currentLevel: 'Current Loyalty Level',
        nextTier: 'Next Tier',
        remainingToNext: 'Only {amount} AED left to reach the next tier',
        referralProgram: 'Referral Program',
        referralDesc: 'Share your code and get rewards soon',
        copied: 'Copied!',
        tiersTab: 'Tiers & Benefits',
        reviewsTab: 'My Reviews',
        currentBadge: 'Current',
        noReviews: 'No reviews yet',
        noReviewsDesc: 'Review your completed orders to unlock more benefits',
        tiers: {
            basic: 'Basic',
            silver: 'Silver',
            gold: 'Gold',
            vip: 'VIP',
            partner: 'Partner'
        },
        benefits: {
            BASIC: [
                'Standard Technical Support 🛠️',
                'Earn Loyalty Points (1pt per AED Commission)',
                '2% Cashback on Platform Commission 💸'
            ],
            SILVER: [
                'Priority Support ✨',
                '3% Cashback on Platform Commission 💸',
                'Periodic Exclusive Offers'
            ],
            GOLD: [
                'Premium Priority Support 🥇',
                '4% Cashback on Platform Commission 💸',
                'Early Access to New Features 🚀'
            ],
            VIP: [
                'VIP Dedicated Support 🌟',
                '5% Cashback on Platform Commission 💎',
                'Dedicated Account Manager'
            ],
            PARTNER: [
                'Extreme Priority Support ⚡',
                '6% Cashback on Platform Commission 👑',
                'No Monthly Earnings Cap'
            ]
        },
        progression: {
            title: 'Membership Loyalty Progression',
            goal: 'Goal',
            remaining: 'Remaining',
            nextLvlPerks: 'Upcoming Level Perks',
            almostThere: "You're almost there! Spend {amount} AED more to upgrade."
        },
        referral: {
          title: 'Referral System',
          totalLabel: 'Total Referrals:',
          commissionNote: 'Share your personal link and earn 1% commission on each item your friend buys, for 6 months from their signup date.',
          windowNote: 'Link validity: 6 months starting from each friend\'s signup date'
        }
      }
    },
    tracking: {
      title: 'Track Shipment',
      estimated: 'Estimated Date',
      carrier: 'Carrier',
      trackingNo: 'Waybill No',
      viewMap: 'View Live Map',
      courierWeb: 'Courier Website',
      steps: {
        received: 'Received from Store',
        transit: 'In Transit',
        distribution: 'Arrived at Distribution Center',
        out: 'Out for Delivery',
        delivered: 'Delivered',
        cancelled: 'Cancelled'
      }
    },
    reviews: {
      writeTitle: 'Rate Experience',
      rating: 'Rating',
      comment: 'Write your comment...',
      placeholder: 'Describe your experience with the product and merchant...',
      submit: 'Submit Review',
      success: 'Review submitted successfully',
      published: 'Published',
      pending: 'Pending Review'
    },
    resolution: {
      billing: 'Billing',
      loyalty: 'Loyalty Points',
      newReturn: 'New Return',
      newDispute: 'New Dispute',
      subtitle: 'Manage disputes and returns',
      heroDesc: 'Advanced consumer protection hub. Manage returns and resolve disputes with absolute transparency and high security under Escrow protocol.',
      tabs: {
        returns: 'Return Protocol',
        disputes: 'Formal Disputes'
      },
      returnPolicy: 'You can request a return within 48 hours of delivery for defects or mismatch.',
      disputePolicy: 'Funds are frozen immediately upon opening a dispute. Please contact merchant first.',
      reasons: {
        not_matching: 'Part not matching description',
        defective: 'Part defective or damaged',
        not_working: 'Item not working / Manufacturer defect',
        delayed: 'Shipping delayed',
        wrong_item: 'Wrong item received',
        wrong_size: 'Wrong size or model',
        shipping_error: 'Shipping logistics error',
        warranty_claim: 'Warranty Claim',
        replacement: 'Item Replacement'
      },
      stats: {
        protectedFunds: 'Protected Funds',
        eligibleOrders: 'Eligible Orders',
        activeDisputes: 'Active Disputes',
        safeVault: 'Safe Vault',
        readyAction: 'Ready for Action',
        verifiedEscrow: 'Verified Escrow'
      },
      shipping_logistics: 'Return Shipping Logistics',
      shipping_paid: 'PAID',
      shipping_processing: 'Processing payment...',
      shipping_success: 'Payment Successful! 💰',
      shipping_success_msg: 'Shipping cost paid. Return process started.',
      shipping_paid_msg: 'Shipping cost paid. The item will be collected from you soon.',
      shipping_responsibility_payee: 'Based on the administrative verdict, you are responsible for shipping costs to initiate the return.',
      shipping_responsibility_other: 'The merchant is responsible for shipping costs. The return will start once they settle the payment.',
      shipping_warning: '⛔ Warning: Please pay shipping costs to avoid account closure or fines.',
      shipping_warning_en: '⛔ Warning: Please pay shipping costs to avoid account closure or fines.',
      shipping_payment_note: 'Please go to Order Details to pay and initiate the return process.',
      shipping_payment_note_en: 'Please go to Order Details to pay and initiate the return process.',
      awaiting_other_party: 'AWAITING MERCHANT PAYMENT',
      pay_via_card: 'PAY VIA STRIPE',
      deduct_from_wallet: 'DEDUCT FROM WALLET',
      wallet_confirm_title: 'Confirm Wallet Deduction',
      wallet_balance: 'Available Balance',
      wallet_deduction: 'Amount to Deduct',
      wallet_remaining: 'Projected Balance',
      confirm_deduction: 'Confirm Deduction',
      cancel: 'Cancel',
      amount_due: 'AMOUNT DUE',
      quickActions: {
        title: 'Quick Actions Available',
        subtitle: 'Orders eligible for protection or return now'
      },
      actions: {
        escalate: 'Escalate to Admin',
        underAdminReview: 'Under Admin Review',
        confirmEscalation: 'Are you sure you want to escalate this case to admin?'
      },
      guidelines: {
        title: 'Packaging Guidelines',
        policy: 'Return Policy',
        packaging: 'Shipping Instructions',
        steps: [
          'Use the original packaging if possible to ensure part protection.',
          'Ensure the part is clean and free of fluids (oil, fuel).',
          'Use adequate cushioning (bubble wrap) for fragile components.',
          'Seal the box securely with heavy-duty tape.'
        ],
        highlights: [
          'Returns accepted within 7 days of delivery for defective items.',
          'Item must be in the same condition as received (markings intact).',
          'Return shipping fees may apply for non-defective returns.',
          'Refunds are processed to the original payment method or wallet within 5 days.'
        ]
      },
      form: {
        reason: 'Reason',
        desc: 'Detailed Description',
        evidence: 'Evidence (Photos/Video)',
        submitReturn: 'Submit Return Request',
        submitDispute: 'Open Official Dispute',
        upload: 'Upload Files'
      },
      alerts: {
        freeze: 'Notice: The funds will be held by the platform until the dispute is resolved.',
        success: 'Request opened successfully. We will review and update shortly.'
      },
      statusTimeline: {
        requested: 'Request Submitted',
        awaiting_merchant: 'Awaiting Merchant Response',
        awaiting_admin: 'Awaiting Administrative Review',
        under_review: 'Admin is currently reviewing evidence',
        merchant_accepted: 'Merchant Accepted Return',
        merchant_rejected: 'Merchant Rejected - Escalating to Admin',
        admin_review: 'Admin is currently reviewing evidence',
        resolved: 'Final Verdict Issued',
        final_verdict: 'Final verdict issued'
      },
      chat: {
        title: 'Case Discussion',
        realtimeActive: 'Live Support Active',
        placeholder: 'Type your message or evidence details...',
        officialAdmin: 'Official Platform Admin',
        merchant: 'Store Representative',
        customer: 'Customer (You)'
      },
      details: {
        back: 'Back to List',
        statusProtocol: 'Status Protocol',
        digitalSignature: 'Digital Signature',
        subject: 'Case Subject',
        orderRef: 'Order Reference',
        initiated: 'Initiated At',
        primaryReason: 'Primary Reason',
        merchantEntity: 'Merchant Entity',
        statement: 'Customer Statement',
        evidence: 'Visual Evidence',
        secureDiscussion: 'Secure Case Discussion',
        verdict: 'Governance Verdict',
        conclusion: 'Final Conclusion',
        closedAt: 'Closed At',
        defense: "Merchant's Defense",
        escrowSecurity: 'Escrow Security',
        escrowDesc: 'Funds for this order are held in our encrypted escrow. Our team of governance experts audits every dispute manually before releasing capital.',
        activity: 'Case Activity',
        opened: 'Case Opened',
        notified: 'Merchant Notified',
        update: 'System Update'
      },
      initiate: {
        title: 'Initiate New Request',
        selectOrder: 'Select Order',
        noEligible: 'No Eligible Orders',
        noEligibleDesc: 'Only orders delivered within the last 48 hours are eligible for return/dispute.',
        returnItem: 'Return & Refund',
        openDispute: 'Open Formal Dispute',
        selectPart: 'Select Target Part'
      }
    },
    returns: {
      subtitle: 'Manage returns and disputes',
      tabs: {
        activeReturns: 'Active Returns',
        disputes: 'Disputes',
        guidelines: 'Guidelines'
      },
      noReturns: 'No active returns',
      noReturnsDesc: 'You have not requested any returns',
      noDisputes: 'No disputes',
      noDisputesDesc: 'Your record is clean'
    },
    billing: {
      title: 'Billing & Invoices',
      subtitle: 'Manage order invoices and payments',
      tabs: {
        unpaid: 'Unpaid Invoices',
        history: 'Payment History',
        methods: 'Payment Methods',
        pendingOffers: 'Pending Payments'
      },
      wallet: 'Wallet',
      invoice: {
        id: 'Invoice #',
        date: 'Invoice Date',
        amount: 'Total Amount',
        status: 'Payment Status',
        view: 'View Invoice',
        pay: 'Pay Now',
        details: 'Invoice Details',
        download: 'Download PDF',
        print: 'Print',
        billTo: 'Bill To',
        shipTo: 'Ship To',
        item: 'Item',
        qty: 'Qty',
        price: 'Price',
        total: 'Total',
        vat: 'VAT (15%)',
        subtotal: 'Subtotal',
        shipping: 'Shipping',
        grandTotal: 'Grand Total',
        sender: 'Sender',
        receiver: 'Receiver',
        note: 'Note'
      },
      cardForm: {
        holder: 'Card Holder Name',
        number: 'Card Number',
        expiry: 'Expiry (MM/YY)',
        cvc: 'CVC',
        save: 'Save Card',
        cancel: 'Cancel',
        makeDefault: 'Make Default',
        default: 'Default',
        expires: 'Expires',
        noCards: 'No saved cards'
      },
      empty: {
        unpaid: 'No unpaid invoices',
        history: 'No payment history found'
      }
    },
    violationsPage: {
        title: 'Compliance & Violations',
        subtitle: 'Track your compliance score, view violations, and submit appeals.',
        tabs: {
            history: 'Violation History',
            reliability: 'Reliability Meter'
        },
        scoreCard: {
            title: 'Compliance Score',
            perfect: 'Perfect Performance',
            warning: 'Warning: Moderate Compliance',
            danger: 'Danger: At Risk of Penalty',
            points: 'Violation Points',
            history: 'Score History'
        },
        table: {
            type: 'Violation Type',
            date: 'Date',
            points: 'Points',
            fine: 'Fine',
            status: 'Status',
            actions: 'Actions'
        },
        appeal: {
            title: 'Submit Appeal',
            reason: 'Appeal Reason',
            reasonPlaceholder: 'Explain in detail why you believe this violation is incorrect...',
            evidence: 'Appeal Evidence (Images/Video)',
            submit: 'Submit Appeal',
            success: 'Appeal submitted successfully, under review.',
            uploading: 'Uploading...',
            uploadSuccess: 'Evidence Uploaded',
            uploadPlaceholder: 'Tap to upload media or docs',
            declarationTitle: 'Truthfulness Declaration',
            declarationText: 'I certify that all information and docs provided are true. I understand that fraudulent appeals may result in doubled penalties.',
            submitting: 'Submitting...'
        },
        guidelines: {
            title: 'System Instructions & Penalty Limits',
            subtitle: 'A transparent guide to violations, points, and penalty thresholds.',
            typeTable: {
                title: 'Violation Types & Point Decay',
                name: 'Violation Type',
                points: 'Points',
                fine: 'Standard Fine',
                decay: 'Decay Period'
            },
            thresholdTable: {
                title: 'Penalty Thresholds & Actions',
                points: 'Threshold Points',
                action: 'Administrative Action',
                duration: 'Suspension Duration'
            }
        },
        codes: {
            ACCEPT_OFFER_NO_PAYMENT: 'Accepted offer without payment',
            FAKE_REQUEST: 'Fake order request',
            FREQUENT_RETURNS: 'Frequent returns',
            EXCEEDED_RETURN_RATE: 'Exceeded allowed return rate',
            FAKE_DISPUTE: 'Fake / malicious dispute',
            LATE_RETURN_HANDOVER: 'Late return handover',
            FAKE_COMPLAINT: 'Fake complaint',
            ABUSE: 'Abuse',
            SHARE_CONTACT_OFF_PLATFORM: 'Sharing contact info off-platform'
        },
        penaltyActions: {
            WARNING: 'Official Warning',
            RESTRICT_PURCHASE: 'Restrict Purchase',
            PERMANENT_BAN: 'Permanent Ban'
        }
    },
    support: {
      title: 'Live Support & Help Center',
      subtitle: 'We are here to ensure you have the best shopping experience and resolve any challenges.',
      createTicket: 'Open New Ticket',
      newTicketTitle: 'Submit New Request',
      subject: 'Request Subject',
      message: 'Detailed Description',
      myTickets: 'My Tickets History',
      noTickets: 'No tickets currently',
      noTicketsDesc: 'You haven\'t submitted any support tickets yet.',
      liveChat: 'Live Chat',
      liveChatDesc: 'Talk to our support team now',
      categories: {
        orders: 'Orders & Tracking',
        returns: 'Returns & Disputes',
        payment: 'Payments & Wallet',
        technical: 'Technical & App Support',
        other: 'Other'
      },
      faq: {
        title: 'Customer FAQ',
        q1: 'How can I track my order?',
        a1: 'You can track your order from the "Shipments" or "My Orders" page by clicking the track button.',
        q2: 'When can I request a refund?',
        a2: 'You can request a refund if the order hasn\'t shipped, or within 48h of delivery if there\'s a defect.',
        q3: 'How to contact the seller?',
        a3: 'Use the live chat option in the order details page to talk to merchants directly.',
        q4: 'What is the expected response time?',
        a4: 'Our team works 24/7, and urgent tickets are usually answered in less than 2 hours.'
      },
      form: {
        priority: 'Priority',
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        summaryPlaceholder: 'Brief summary of the issue',
        descPlaceholder: 'Please explain the issue in detail so we can help you faster...',
        upload: 'Attach images or explanatory documents',
        error: 'Failed to submit ticket. Please try again.',
        submitting: 'Submitting...'
      }
    },
    infoCenter: {
      title: 'Information Center',
      subtitle: 'Everything you need to know about E-TASHLEH platform',
      tabs: { about: 'About Us', privacy: 'Privacy Policy', terms: 'Terms of Use', faq: 'F.A.Q', contact: 'Contact Us' }
    },
    threeDS: {
      title: '3D Secure Verification',
      subtitle: 'Secure Payment Authentication',
      amount: 'Amount',
      date: 'Date',
      card: 'Card',
      otpLabel: 'OTP Code sent to mobile',
      resend: 'Resend Code',
      verify: 'Verify & Pay',
      cancel: 'Cancel'
    },
    status: {
      completed: 'Completed',
      pending: 'Pending',
      shipped: 'Shipped',
      delivered: 'Delivered'
    },
    timers: {
      offers_expires: 'Offers expire in',
      payment_expires: 'Payment expires in',
      return_window: 'Return window closes in'
    },
    notifications: {
      title: 'Notifications',
      markAllRead: 'Mark all as read',
      empty: 'No new notifications at the moment',
      newOffer: 'New Offer',
      offerAccepted: 'Offer Accepted',
      paymentConfirmed: 'Payment Confirmed',
      shipped: 'Shipped',
      delivered: 'Delivered',
      rateRequest: 'Rate Request',
      disputeUpdate: 'Dispute Update',
      adminAlert: 'Admin Alert',
      violationIssued: 'New Violation Recorded',
      appealReviewed: 'Appeal Decision'
    },
    rewards: {
      pageTitle: 'Referral Center',
      pageSubtitle: 'Share your personal link with friends and earn 1% commission on every item they buy for 6 months from their signup.',
      tierProgressTitle: 'Membership Tier Progression',
      referralHubTitle: 'Referral Hub',
      referralCodeLabel: 'Personal Referral Code',
      shareOn: 'Share via',
      copyLink: 'Copy link',
      copiedToast: 'Link copied!',
      shareViaNative: 'Share',
      history: {
        title: 'Referral History',
        subtitle: 'Every friend you invited in the last 6 months',
        empty: 'No referrals yet',
        emptyDesc: 'Be the first to share your link! Start now and earn 1% from every item your friends buy for 6 months.',
        emptyBadge: 'Opportunity awaits',
        totalReferrals: 'Total Referrals',
        totalEarned: 'Total Earned',
        activeCount: 'Active Referrals',
        active: 'Active',
        windowLabel: '6-month window',
        columns: {
          friend: 'Friend',
          registered: 'Registered',
          orders: 'Orders',
          earned: 'Earned',
          window: '6-Month Window'
        },
        daysRemaining: '{days} days remaining',
        endingSoon: '{days}d — Ending soon',
        expired: 'Expired',
        ordersBadge: '{n} orders'
      },
      shareMessage: 'Join E-TASHLEH for a smart shopping experience. Sign up using my link:',
      emailSubject: 'Invitation to join E-TASHLEH'
    }
  }
};
