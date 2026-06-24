/** Auth UI strings only — landing copy in guest-landing.ts */
export const auth = {
  ar: {
    authSection: {
      tabs: { customer: 'عميل', merchant: 'تاجر' },
      login: {
        title: 'تسجيل الدخول',
        subtitle: 'أهلاً بك مجدداً',
        submit: 'دخول',
        registerNow: 'سجل الآن',
        noAccount: 'ليس لديك حساب؟',
        activationMethod: 'اختر وسيلة استلام كود التفعيل:',
        methods: {
          whatsapp: 'استلام الكود عبر واتساب',
          email: 'استلام الكود عبر الإيميل'
        },
        country: 'الدولة',
        phoneInfo: 'رقم الجوال',
        phonePlaceholder: '5 XX XX XX XX',
        phoneHint: 'يجب أن يبدأ الرقم بـ 5 ويتكون من 9 أرقام'
      },
      register: {
        title: 'تسجيل حساب جديد',
        subtitle: 'أنشئ حسابك الآن واستمتع بخدماتنا',
        submit: 'تسجيل',
        loginLink: 'لديك حساب بالفعل؟',
        name: 'الاسم الكامل',
        email: 'البريد الإلكتروني',
        phone: 'رقم الجوال',
        password: 'كلمة المرور',
        confirmPassword: 'تأكيد كلمة المرور'
      },
      otp: {
        title: 'التحقق',
        subtitle: 'أدخل الرمز المرسل إلى',
        verify: 'تحقق',
        verifying: 'جاري التحقق...',
        resend: 'إعادة إرسال',
        validFor: 'صلاحية الرمز',
        expired: 'انتهت صلاحية الرمز — اضغط إعادة الإرسال للحصول على رمز جديد',
        whatsapp: 'عبر واتساب',
        emailAlt: 'عبر البريد',
        invalidCode: 'الرمز غير صحيح',
        selectMethod: {
          title: 'طريقة التحقق',
          subtitle: 'كيف تود استلام رمز التحقق؟'
        }
      },
      vendor: {
        steps: { 1: 'الحساب', 2: 'التحقق', 3: 'المتجر', 4: 'العقد', 5: 'المستندات' },
        pending: {
          title: 'طلبك قيد المراجعة',
          subtitle: 'سيقوم فريقنا بمراجعة بياناتك والرد عليك قريباً.',
          back: 'عودة للرئيسية'
        },
        account: { name: 'الاسم', phone: 'الجوال', email: 'البريد', password: 'كلمة المرور' },
        info: {
          storeName: 'اسم المتجر',
          category: 'التصنيف',
          categories: { parts: 'قطع غيار', accessories: 'إكسسوارات', tires: 'إطارات' },
          bio: 'نبذة عن المتجر',
          enterDetails: 'يرجى إدخال بيانات المتجر'
        },
        contract: {
          title: 'عقد الشراكة مع ELLIPP FZ LLC',
          accept: 'أوافق على العقد والشروط',
          error: 'يجب الموافقة على العقد للمتابعة'
        },
        docs: {
          title: 'المستندات المطلوبة',
          subtitle: 'يرجى رفع الملفات بصيغة واضحة',
          cr: 'السجل التجاري',
          license: 'الرخصة التجارية',
          id: 'بطاقة الهوية',
          iban: 'شهادة الآيبان',
          authLetter: 'خطاب التفويض',
          completed: 'تم الرفع',
          uploading: 'جاري الرفع',
          dragDrop: 'اسحب الملف هنا',
          submitReview: 'إرسال للمراجعة',
          error: 'يرجى رفع جميع المستندات وانتظار اكتمال التحميل'
        },
        prev: 'السابق',
        next: 'التالي',
        submit: 'إرسال الطلب',
        status: {
          pending_review: { title: 'قيد المراجعة', desc: 'حسابك قيد المراجعة حالياً.' },
          suspended: { title: 'موقوف', desc: 'تم إيقاف حسابك.' },
          blocked: { title: 'محظور', desc: 'تم حظر حسابك.' }
        }
      },
      forgot: {
        title: 'استعادة كلمة المرور',
        subtitle: 'أدخل بريدك الإلكتروني لاستلام رابط إعادة التعيين',
        emailPlaceholder: 'البريد الإلكتروني',
        submit: 'إرسال الرابط',
        backToLogin: 'العودة لتسجيل الدخول',
        successTitle: 'تم الإرسال',
        successMsg: 'راجع بريدك الإلكتروني.',
        otpNote: 'قد يصلك الرمز في مجلد المهملات.'
      },
      reset: {
        title: 'تعيين كلمة المرور',
        subtitle: 'أدخل كلمة المرور الجديدة',
        newPass: 'كلمة المرور الجديدة',
        confirmPass: 'تأكيد كلمة المرور',
        submit: 'حفظ',
        successTitle: 'تم التغيير',
        successMsg: 'تم تغيير كلمة المرور بنجاح.'
      },
      admin: {
        title: 'لوحة الإدارة',
        secure: 'منطقة آمنة',
        idLabel: 'معرف المسؤول / البريد',
        keyLabel: 'مفتاح الأمان',
        authBtn: 'الدخول للوحة التحكم',
        authenticating: 'جاري التحقق...',
        availableRoles: 'الأدوار المتاحة (تجريبي)'
      },
      errors: {
        wrongAccountType: 'نوع الحساب غير صحيح (حاول التبديل بين عميل/تاجر)',
        accountNotFound: 'الحساب غير موجود',
        accountNotFoundRedirect: 'لا يوجد حساب بهذه البيانات — أكمل التسجيل أدناه',
        invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        loginFailed: 'فشل في تسجيل الدخول. يرجى المحاولة مرة أخرى.',
        unauthorized: 'غير مصرح لك بالوصول لهذا القسم',
        accessDenied: 'تم رفض الوصول',
        serverError: 'حدث خطأ في الخادم',
        invalidPhone: 'رقم الجوال مطلوب',
        invalidPhoneStart: 'رقم الجوال يجب أن يبدأ بـ 5',
        invalidPhoneLength: 'رقم الجوال يجب أن يكون 9 أرقام'
      }
    }
  },
  en: {
    authSection: {
      tabs: { customer: 'Customer', merchant: 'Merchant' },
      login: {
        title: 'Login',
        subtitle: 'Welcome Back',
        submit: 'Login',
        registerNow: 'Register Now',
        noAccount: 'Don\'t have an account?',
        activationMethod: 'Choose verification method:',
        methods: {
          whatsapp: 'Receive code via WhatsApp',
          email: 'Receive code via Email'
        },
        country: 'Country',
        phoneInfo: 'Mobile Number',
        phonePlaceholder: '5 XX XX XX XX',
        phoneHint: 'Number must start with 5 and be 9 digits',
        email: 'Email',
        password: 'Password',
        rememberMe: 'Remember me',
        forgotPassword: 'Forgot Password?'
      },
      register: {
        title: 'Create New Account',
        subtitle: 'Join us today',
        name: 'Full Name',
        phone: 'Phone Number',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        agreeToTerms: 'I agree to',
        termsLink: 'Terms & Conditions',
        termsError: 'You must agree to terms',
        fillAll: 'Please fill all required fields',
        submit: 'Register',
        hasAccount: 'Already have an account?',
        login: 'Login',
        email: 'Email Address'
      },
      errors: {
        invalidPhone: 'Invalid phone number',
        invalidPhoneStart: 'Number must start with 5',
        invalidPhoneLength: 'Number must be 9 digits',
        passwordsDontMatch: 'Passwords do not match',
        accountNotFound: 'Account not found',
        wrongAccountType: 'Incorrect Account Type (Try switching Customer/Merchant)',
        loginFailed: 'Login failed. Please try again.',
        invalidCode: 'Invalid verification code',
        shortPass: 'Password is too short',
        passMismatch: 'Passwords do not match',
        unauthorized: 'Unauthorized access',
        accessDenied: 'Access Denied',
        serverError: 'Server error'
      },
      otp: {
        title: 'Verification',
        subtitle: 'Enter code sent to',
        verify: 'Verify',
        verifying: 'Verifying...',
        resend: 'Resend',
        validFor: 'Code valid for',
        expired: 'Code expired — tap Resend to get a new code',
        whatsapp: 'Via WhatsApp',
        emailAlt: 'Via Email',
        invalidCode: 'Invalid Code',
        selectMethod: {
          title: 'Verification Method',
          subtitle: 'How would you like to receive the code?'
        }
      },
      vendor: {
        steps: { 1: 'Account', 2: 'Verify', 3: 'Store', 4: 'Contract', 5: 'Docs' },
        pending: {
          title: 'Request Under Review',
          subtitle: 'Our team will review your details and respond shortly.',
          back: 'Back to Home'
        },
        account: { name: 'Name', phone: 'Phone', email: 'Email', password: 'Password' },
        info: {
          storeName: 'Store Name',
          category: 'Category',
          categories: { parts: 'Spare Parts', accessories: 'Accessories', tires: 'Tires' },
          bio: 'Store Bio',
          enterDetails: 'Please enter store details'
        },
        contract: {
          title: 'Partnership Contract with ELLIPP FZ LLC',
          accept: 'I agree to the contract',
          error: 'You must agree to the contract'
        },
        docs: {
          title: 'Required Documents',
          subtitle: 'Please upload clear files',
          cr: 'Commercial Register',
          license: 'Commercial License',
          id: 'ID Card',
          iban: 'IBAN Certificate',
          authLetter: 'Authorization Letter',
          completed: 'Uploaded',
          uploading: 'Uploading',
          dragDrop: 'Drag file here',
          submitReview: 'Submit for Review',
          error: 'Please upload all documents and wait for completion'
        },
        prev: 'Previous',
        next: 'Next',
        submit: 'Submit Application',
        status: {
          pending_review: { title: 'Under Review', desc: 'Your account is currently under review.' },
          suspended: { title: 'Suspended', desc: 'Your account has been suspended.' },
          blocked: { title: 'Blocked', desc: 'Your account has been blocked.' }
        }
      },
      forgot: {
        title: 'Password Recovery',
        subtitle: 'Enter your email to receive reset link',
        emailPlaceholder: 'Email Address',
        submit: 'Send Link',
        backToLogin: 'Back to Login',
        successTitle: 'Sent',
        successMsg: 'Check your email.',
        otpNote: 'Code might be in junk folder.'
      },
      reset: {
        title: 'Reset Password',
        subtitle: 'Enter new password',
        newPass: 'New Password',
        confirmPass: 'Confirm Password',
        submit: 'Save',
        successTitle: 'Changed',
        successMsg: 'Password changed successfully.'
      },
      admin: {
        title: 'Admin Panel',
        secure: 'Secure Area',
        idLabel: 'Admin ID / Email',
        keyLabel: 'Secure Key',
        authBtn: 'Access Control Panel',
        authenticating: 'Authenticating...',
        availableRoles: 'Available Roles (Demo)'
      },
    },
  },
} as const;
