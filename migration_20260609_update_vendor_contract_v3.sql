-- Run manually in Supabase SQL Editor
-- Backup platform_contracts before running

UPDATE platform_contracts
SET is_active = false
WHERE type = 'vendor_agreement';

INSERT INTO platform_contracts (
  type,
  title_ar,
  title_en,
  content_ar,
  content_en,
  first_party_config,
  version,
  is_active
)
SELECT
  'vendor_agreement',
  'عقد استضافة متجر إلكتروني',
  'E-Commerce Store Hosting Agreement',
  $AR$عقد استضافة متجر إلكتروني

الطرف الأول: {{FIRST_PARTY_NAME_AR}} ،المالك للمنصة الالكترونية (e-tashleh) سجل تجاري {{FIRST_PARTY_CR}}، رخصة تجارية {{FIRST_PARTY_LICENSE}} والمنتهية بتاريخ {{FIRST_PARTY_EXPIRY}} ومقرها في {{FIRST_PARTY_HQ_AR}}.

الطرف الثاني: شركة {{CUSTOMER_COMPANY_NAME}}، ويمثلها مديرها الموقع {{CUSTOMER_NAME}}

سجل تجاري رقم {{CUSTOMER_CR}}، رخصة تجارية رقم {{CUSTOMER_LICENSE}} والمنتهية بتاريخ {{CUSTOMER_EXPIRY}}

ومقرها في امارة {{CUSTOMER_EMIRATE}} بدولة {{CUSTOMER_COUNTRY}}.

مقدمة:

نظرًا لرغبة الطرف الثاني في إنشاء متجر إلكتروني عبر منصة (E-TASHLEH) لبيع قطع غيار السيارات المستعملة، فقد اتفق الطرفان على ما يلي:

البند الأول: موضوع العقد

يقوم الطرف الأول بتوفير مساحة إلكترونية على منصته (E-TASHLEH) للطرف الثاني بهدف تشغيل متجر إلكتروني لبيع قطع غيار السيارات المستعملة، مع توفير الخدمات التالية:

بوابة دفع إلكترونية.

دعم فني للمتجر.

خدمة شحن بالتعاون مع شركات شحن معتمدة.

البند الثاني: العمولات

يستحق الطرف الأول عمولة بنسبة من قيمة كل عملية بيع ناجحة تتم عبر المتجر.

البند الثالث: مدة العقد

مدة هذا العقد هي سنة ميلادية واحدة تبدأ من تاريخ التوقيع، قابلة للتجديد باتفاق الطرفين الكترونيا.

البند الرابع: التزامات الطرف الثاني

الشروط والأحكام:

يجب على البائع/المتجر والعميل/المستخدم الموافقة على الشروط وسياسة الخصوصية وسياسة المدفوعات على موقعنا وسياسة الاستبدال والارجاع جميعها واستخدامك للموقع يعتبر موافقة منك على ذلك ولا يتحمل الموقع أي مسؤولية قانونية جراء عدم اطلاعكم عليها.

في حال اكتمال عملية الدفع عبر موقعنا فلا يحق المتجر/البائع الغاء العملية او رفضها او تغيير شروطها، وإذا لم يمتثل المتجر/البائع بذلك يتحمل كامل المسؤولية القانونية حسب الشروط والسياسات للموقع.

يوافق البائع/المتجر على تفويضنا بتسجيل حسابة البنكي في بوابة المدفوعات المعتمدة على الموقع وذلك لتلقي قيمة مبيعاته مباشرة وبذلك إقرار منة على اطلاعه موافقته على شروط وسياسات واحكام بوابة الدفع دون تحملنا أدني مسؤولية طبقا للشروط والاحكام والسياسات.

التواصل المعتمد لأي ملاحظات او بلاغات او مرسلات هو فقط الطرق المتاحة على أيقونة الموقع.

في حال وجود نزاع بين الموقع والبائع/المتجر تحل النزاعات وديا أولا بين الطرفين وإن تعذر ذلك يتم اللجوء إلى التحكيم وفقا لما تحدده المنصة في الشروط والسياسات المعتمدة، ويكون قرار التحكيم نهائيا وملزما للطرفين. يسود هذا البند على أي نص أخر في العقد بما يتعلق بالجهة القضائية أو ألية حل النزاعات.

يوافق ويقر المتجر/البائع على الاحتفاظ بالمنتج المباع والمدفوع عبر موقعنا وعدم التصرف به لتسليمه لشركة الشحن المعتمدة لموقعنا ووضع بوليصة الشحن علية والتأكد من مطابقة المنتج للفاتورة الصادرة له من الموقع وكذلك بتوثيقها وتوثيق التسليم لشركة الشحن والاحتفاظ بالسجلات وخلافا لذلك يتحمل المتجر/البائع جميع وكامل المسؤولية القانونية والتكاليف والرسوم جراء ذلك.

يوافق ويقر المتجر/البائع بان الاتفاقية المعتمدة فقط هي الاتفاقية الالكترونية عبر التسجيل على الموقع موافقتنا له ومنحة لوحة التحكم لإدارة منتجاته على الموقع وان أي بيانات او وثائق يتم اضافتها من قبلة تكون تحت مسؤوليته القانونية وللموقع حق التحقق منها باي طريقة كانت ولنا حق إيقاف الحساب للمتجر/البائع باي وقت كان دون تحمل أدني مسؤولية وبتسجيلك بالموقع واستخدامه إقرار وموافقة منك بجميع الشروط والاحكام والسياسات للموقع ولا يتحمل الموقع أي مسؤولية قانونية جراء عدم اطلاعكم عليها.

يوافق ويقر المتجر/البائع والعميل في حالة وجود خلاف مع العميل من قبل المتجر/البائع بالاحتيال او اختلاف المنتج المرسل للعميل عن فاتورة الشراء الصادرة من موقعنا ونحوه فان المتجر/البائع يتحمل كامل وجميع المسؤولية القانونية وجميع الرسوم والمصاريف والمدفوعات وما يترتب عليها للعميل وللموقع وتطبق سياسات وشروط الموقع.

يوافق المتجر/البائع وكذلك العميل ان جميع الأنظمة والقوانين المتبعة والمطبقة بموقعنا هي قوانين دولة الامارات العربية المتحدة.

حدود مسؤولية (الموقع) المنصة: تعمل المنصة كوسيط تقني لربط العملاء بالمتاجر ولا تملك المنتجات المعروضة من قبل المتاجر، وعليه يتحمل المتجر كامل المسؤولية عن المنتجات وجودتها وضمانها وخدمات ما بعد البيع بعد تسليمها للعميل بما لا يتعارض مع باقي الشروط والاحكام.

للموقع الحق في التعديل على الشروط والسياسات متى ما اقتضت الحاجة ودون الرجوع لاحد الأطراف ولا نتحمل أي مسؤولية جراء عدم اطلاعك عليها ويعتبر استخدامك لموقعنا موافقة منك عليها.

يعد تسجيلكم بالموقع واستخدامه بمثابة موافقة منكم على جميع الشروط والاحكام والسياسات ولا يتحمل الموقع أي مسؤولية قانونية جراء عدم اطلاعكم عليها.

يقر ويوافق المتجر/البائع في حال عدم توفر المنتج او نفاذة او اختلاف سعرة او خطائه او غيرها بعد دفع العميل عبر موقعنا بانة ملزم بإتمام تلك العملية كاملة وتوفير المنتج كما تم الاتفاق علية ولا يحق له تراجع او اعتراض او تغيير السعر حسب سياسات وشروط الموقع.

يوافق المتجر/البائع على وضع السعر والوصف للمنتجات بحسابة بالموقع بدقة وجودة وتكون تحت مسؤوليته وانه ملزم ببيعها وتسليمها للعميل متى ما تمت عملية الدفع من قبل العميل ولا يحق لها رفضها او تعديلها.

في حال شراء السلعة (المنتج) من المتاجر خارج دولة العميل فان الموقع والمتجر/البائع لا يتحملون اي رسوم او ضرائب او جمارك قد تفرض على المنتج المشحون للعميل وانما تضاف بفاتورة مستقلة عبر شركة الشحن وفسح المنتج او عدمه ونحوهم يتحملها العميل كاملة وما يترتب عليها.

توافق وتتعهد شركة الشحن باستلام المنتج من المتجر/البائع والتأكد من سلامته وخلوة من العيوب ومطابقته للفاتورة وبوليصة الشحن الصادرة له من الموقع وبمجرد استلامها له تنتقل مسؤوليته كاملة عليها.

يحق للموقع معاينة السلعة (المنتج) والتأكد منها وسلامتها ومطابقتها لطلب العميل قبل الشحن.

لا يتحمل الموقع أدني مسؤولية في حال استخدام المنتجات بطريقة غير امنة او غير صحيحة.

يقر العميل/المستخدم وكذلك المتجر/البائع الحفاظ علي سرية البيانات وبيانات التسجيل وحسابة وأنها تحت مسؤوليته الكاملة وان الموقع لا يتحمل اي مسؤولية حال فقدانها او استخدامها من قبل مستخدم اخر وان يخطر الموقع مباشرة عبر قنواته الرسمية في حال فقدانها او استخدامها من قبل مستخدم اخر لإيقاف الحساب فقط دون تحمل الموقع أدني مسؤولية.

يوافق ويقر المتجر/البائع بانة سيمنح لوحة تحكم لإدارة منتجاته وما يتعلق بها تحت مسؤوليته دون تحميل الموقع اي مسؤولية وتطبق الشروط والاحكام والسياسات.

يوافق المتجر/البائع على ان رسوم البيع واستخدام الموقع هي -- من قيمة المنتج المباع والتي يتم اضافتها الكترونيا على سعر المنتج المدخل من قبلكم وسوف يتم تحويلها مباشرة عبر بوابة الدفع لحسابنا وتحويل قيمة المنتج المباع مباشرة لحسابكم.

يقر ويوافق العميل والمتجر/البائع بالموافقة على شروط واحكام وسياسة بوابة الدفع المرتبطة بموقعنا وللاطلاع عليها الرجوع لموقع بوابة الدفع حيث لا يتحمل الموقع أدني مسؤولية تجاهها واستخدامك للموقع يعني موافقة منكم على ذلك.

يجب على المتجر/البائع تسلمينا جميع المستندات المطلوبة للتسجيل على سبيل المثال لا الحصر السجل التجاري والرخصة التجارية وخطاب الآيبان من البنك وخطاب رسمي منكم بتفويض المستخدم للحساب على الموقع وتفويضنا بالتحقق من صحتها وقبولها او رفضها.

يجب على المتجر/البائع بعد موافقتنا على انضمامه للبيع على الموقع ومنحة لوحة تسجيل وتحكم بمتجرة ومنتجاته داخل موقعنا بتسمية وتفويض شخص واحد فقط من قبله عبر خطاب رسمي موجة لموقعنا يشمل اسمة وصفته وعنوانه واثبات الهوية ورقمة المحمول وانه المخول الوحيد عنة بالمتجر ولن يقبل او ينظر لغيرة مالم يتم اخطارنا بخلاف ذلك وموافقتنا على استبداله حسب الشروط والسياسات والاحكام.

يجب على المتجر/البائع تزويدنا برقم محمول يحتوي تطبيق واتس اب مسجل باسمة تجاريا وهو المعتمد لدينا في المتجر للتواصل في العرض والبيع وغيرها.

تطبق شروط وسياسات واحكام شركة الشحن وللإفادة الرجوع لموقع شركة الشحن للاطلاع عليها حيث لا يتحمل الموقع أدني مسؤولية تجاهها واستخدامك للموقع يعني موافقة منكم على ذلك.

يوافق ويقر المتجر/البائع بانة يحق للموقع إيقاف حسابة في حال التحايل او مخالفة الشروط والاحكام والسياسات او عند حصوله على تقييم متدني او عدم وجود عمليات بيع متناسبة مع الموقع او عدم التجاوب معنا وتحميلة ما يترتب على ذلك دون أدني مسؤولية على الموقع والزامة باستكمال أي عمليات تمت قبل ذلك تطبق الشروط والاحكام.

في حالة استفادة العميل من شحن مجاني ورغب بالاسترجاع سيتم تحميلة رسوم الشحن المستفاد منها بالإضافة الى قيمة شحن الإرجاع.

لا يتحمل المتجر/البائع والموقع أي مشاكل من طرف شركات الشحن بعد تسليم الشحنة سليمة للمندوب والاحتفاظ بما يثبت ذلك من سجلات واستلام العميل للمنتج بمثابة موافقة على ذلك.

جميع السياسات والاحكام والشروط الموجودة بالموقع هي جزاء لا يتجزأ عن بعض وحال عدم ذكر بعضها او جزئها في أحدها فيعتبر ما ذكر في الاخر منها مكمل لها.

يطبق الشروط والاحكام.

يقر ويوافق المتجر/البائع بعدم ادراج او بيع منتجات غير مشروعه او مقلدة او معاد تجديدها او غير مرخصة على الموقع.

يقر ويوافق المتجر/البائع بوجوب التعاون مع الدعم الفني من قبلنا والتحديث المستمر للمتجر والمنتجات والمخزون وغيرها وحال مخالفة ذلك يتحمل المسؤولية كاملة.

يقر العميل/المستخدم وكذلك البائع/المتجر بان يستخدم الموقع بما لا يخالف الانظمة والتعليمات القانونية.

يقر ويوافق المتجر/البائع بإدخال وزن القطعة المباعة ونوعها ووصفها وصورتها بالموقع عبر لوحته للتحكم قبل اصدار الفاتورة للعميل.

التزام البائع بتسليم القطعة:

يقر ويوافق المتجر/البائع بتسليم القطعة المباعة إلى مستودعات شركة الشحن مرفقة بفاتورة البيع وبوليصة الشحن مع توثيق حالة القطعة عند التسليم والتأكد من سلامتها. وتتحمل شركة المسؤولية عنها بعد استلامها. كما يجب على كلا الطرفين (البائع وشركة الشحن) الاحتفاظ بجميع المستندات المتعلقة بعملية التسليم وتقديمها عند الطلب أو الحاجة للمراجعة.

يقر ويوافق المتجر/البائع في حال طلب العميل تجميع الشحنات الاحتفاظ بالمنتج المباع مع الفاتورة بمدة أقصاها 7 أيام الى ان يتم اصدار بوليصة الشحن وارفاقها مع الطلب وارسالها الى شركة الشحن.

يقر ويوافق المتجر/البائع على أن القطع المباعة لعملاء موقعنا بواسطته هي قطع أصلي وبحالتها الاصلية ولم يتم إعادة إصلاحها او طلائها او تجديدها (عدم بيع المقلد أو القطع المجددة) او نحو ذلك وخلافا لذلك يتحمل تكاليف الارجاع والشحن وجميع المصروفات المتعلقة بذلك وغرامة قدرها 50 ألف درهم مع فسخ العقد فورا ونشر المخالفة في متجر البائع لحماية سمعه الموقع. وذلك دون الإخلال بحق المنصة في المطالبة بأي تعويضات إضافية وفقاً لبند التعويض في هذا العقد.

الصور المرفقة بالعرض

تعد الصور المرفقة بعروض المتاجر مستنداً تعاقدياً معتمداً لدى (الموقع) المنصة وبمجرد موافقة العميل على العرض تدرج الصور ضمن الفاتورة وتعتبر المرجع المعتمد في أي نزاع ويلتزم المتجر بتسليم القطعة المطابقة للصور والفاتورة دون تغيير او استبدال بعد قبول الطلب.

وتعد هذه السجلات والوسائل الإلكترونية (بما في ذلك الصور والفيديو وسجلات النظام) أدلة قانونية ملزمة وقابلة للاحتجاج بها أمام الجهات القضائية والتحكيمية.

تعليق المستحقات والخصومات على المتاجر:

يحق للموقع(المنصة) تعليق أو تأجيل تحويل مستحقات التاجر مؤقتاً دون الحاجة إلى أشعار مسبق في حال وجود نزاع أو شكوى أو طلب إرجاع أو الاشتباه بمخالفة سياساتنا، كما يحق للموقع(المنصة) خصم رسوم الإرجاع أو معالجة النزعات أو أي تكاليف ذات صلة من مستحقات التاجر لدينا.

التوثيق عند تسليم الشحنات وتحمل المسؤولية (للمتاجر)

التوثيق عند التسليم

يلتزم المتجر، عند تسليم أي شحنة أو منتج إلى شركة الشحن، باتباع الإجراءات التالية داخل نظام المنصة:

1- مطابقة الشحنة:

مطابقة المنتج أو الشحنة المرسلة مع بيانات الطلب والفاتورة والمستندات المرافقة، والتأكد من تطابق النوع والكمية والحالة الظاهرية للمنتج.

2- التوثيق الإلزامي في النظام:

تسجيل تسليم المنتج لشركة الشحن داخل النظام من خلال:

رفع صور واضحة للمنتج من جميع الجهات-

تسجيل مقطع فيديو يوضح حالة المنتج وسلامته-

-توثيق توقيع المستلم واسم الموظف المسؤول عن التسليم

إظهار تاريخ ووقت التسليم بشكل واضح-

ويُعد هذا التوثيق إلزاميًا ومرجعًا رسميًا لأي نزاع لاحق.

3- انتقال المسؤولية:

بمجرد إتمام التوثيق في النظام مع جميع البيانات أعلاه، تنتقل المسؤولية الكاملة عن الشحنة إلى شركة الشحن، بما في ذلك الكسر أو التلف أو الفقدان أو أي ضرر لاحق.

4- الإخلال بالتوثيق وتحمل المسؤولية:

في حال امتناع المتجر عن التوثيق، أو تقصيره، أو عدم الالتزام بإتمام التوثيق كما هو محدد، يتحمل المتجر كامل المسؤولية عن أي ضرر أو كسر أو تلف أو فقدان أو نزاع يخص حالة الشحنة، ولا يحق له الاحتجاج بعدم التوثيق أو الادعاء بوجود ضرر سابق على التسليم.

5- القرينة القانونية:

يُعتبر امتناع المتجر عن التوثيق أو الإخلال به، بما في ذلك التوقيع واسم المستلم والتاريخ والوقت، قرينة قانونية قاطعة على سلامة الشحنة عند التسليم، ويُعتمد هذا أساسًا لتحديد المسؤولية في حال حدوث أي نزاع أو مطابقة.

وتعد هذه السجلات والوسائل الإلكترونية (بما في ذلك الصور والفيديو وسجلات النظام) أدلة قانونية ملزمة وقابلة للاحتجاج بها أمام الجهات القضائية والتحكيمية.

شروط وسياسة الاستبدال والارجاع المتبعة:

يوافق المتجر/البائع وكذلك العميل في حال النزاع او طلب الاسترجاع او الإلغاء او الاستبدال يجب على العميل التواصل مع المتجر/البائع عبر القنوات الرسمية بالموقع وخلال 24 ساعة من استلام المنتج (الشحنة) وفي حال عدم حل النزاع بين الطرفين خلال 3ايام يتم تصعيده لإدارة الموقع لحل النزاع وابلاغ الاطراف بالنتيجة والزامهم بذلك تطبق الشروط والاحكام.

في حال كان الارجاع او الإلغاء لعدم رغبة العميل بالمنتج يتحمل العميل تكاليف الشحن من وإلى مضاعفة، وكذلك رسوم 2% من قيمة الفاتورة وذلك لصالح بوابة الدفع، واي رسوم أخرى تطبق الشروط والاحكام.

في حال طلب الاستبدال والاسترجاع من قبل العميل لوجود خلل بالمنتج أو عيب او اختلاف عن فاتورة الشراء يتحمل المتجر/البائع تكاليف الشحن من والى (ذهاب وإياب واي رسوم أخرى وسيقوم المتجر بالاستبدال خلال21 يوم عمل رسمي من استلامه للمنتج المراد استبداله وقد تتأخر الشحنة أحيانا اعتمادا على الإجراءات الجمركية في بلدك.

لو رغب العميل في الاستبدال في حالة وجود الضمان من المتجر وخلال فترة الضمان سوف يتحمل المتجر/البائع تكاليف الشحن من والى مضاعفة وسوف يقوم المتجر بالاستبدال خلال 21يوم عمل رسمي من استلامه للمنتج المراد استبداله تطبق الشروط والاحكام.

يحق للعميل في حال الموافقة باسترجاع أو استبدال او الغاء أي منتج تم شراءه على أن يكون بحالته الاصلية وخالية من الخدوش او الكسور وبغلافها الاصلي وذلك بوجود الفاتورة الاصلية كحد أقصى 24ساعة من تاريخ الاستلام ويجب على العميل إخطار المتجر/البائع برغبته بالاستبدال أو الاسترجاع وفي حال تجاوز تلك المدة يسقط حقة بالمطالبة تطبق الشروط والاحكام.

في حالة الموافقة على الاستبدال او الالغاء او الارجاع المنتج وفق الشروط والاحكام والسياسات فسوف نقوم بتزويد العميل ببوليصة شحن لاسترجاع المنتج على ان يستخدمها العميل خلال مدة أقصاها 3 أيام من وقت وتاريخ صدورها وفي حال عدم استخدامها خلال هذه الفترة من تسليم المنتج لشركة الشحن حسب بوليصة الشحن فسوف يسقط حق العميل تطبق الشروط والاحكام.

يحق للعميل استرجاع القطعة المشحونة بالخطاء او المكسورة او بها خلل نتيجة الشحن او المتأخرة خلافا لسياسة وشروط احكام شركة الشحن وذلك خلال 24 ساعة من استلام الشحنة وتتحمل بهذه الحالة شركة الشحن قيمة الشحن وحال الغاء الطلب نتيجة لذلك تتحمل شركة الشحن دفع 2% من قيمة فاتورة المنتج واي مصروفات أخرى تم تكبدها ويجب على العميل إبلاغ المتجر/البائع بذلك مباشرة لتنسيق الاسترجاع او الإلغاء ولا يحق للعميل المطالبة بعد مضي المدة المحددة.

في حال تطلب الاسترجاع أو الاستبدال شحن المنتج فإنه يكون على حساب سياسة الارجاع والاستبدال للموقع باستثناء إذا كان الخطأ من المتجر/البائع فانة لن يتم تحميل العميل أي مبالغ.

يتم إرجاع أي مبالغ مالية حسب شروط وسياسة بوابة الدفع في الموقع دون تحمل الموقع أدني مسؤولية من 14الى 45 يوم عمل رسمي وذلك بعد استلام المرتجع والتأكد منه ويتم إعادة المبلغ لنفس طريقة الدفع المسدد بها من قبل العميل.

في حال طلب العميل إلغاء الطلب قبل الشحن أو بعد الشحن فإنه سيتم تحميله أي مبالغ تم سدادها للشركات الوسيطة ورسوم 2% من قيمة فاتورة الشراء لصالح بوابة الدفع.

في حال حصول أي خطأ بوصول الشحنة للعميل وغير مطابقة لطلبه باختلاف الموديل أو الجهة المطلوبة أو نقص او أيا كان يجب على العميل إخطار الموقع بذلك في مدة أقصاها 24 ساعة من استلامه للطلب وسيتم التنسيق معه لتعديل الخطأ دون تحميله أي تكاليف ولا يحق له المطالبة بشي بعد مرور المدة المحددة.

يقر العميل ويوافق انه يحق ل المتجر/البائع برفض المنتج المعاد متى ما ظهرت علية علامات التلف او الاستخدام او تم تفكيكها او غيرها خلافا لفاتورة الشراء.

عدم استلام الطلب: في حالة رغب العميل من نفسه عدم استلام الطلب او لم يقم بالرد على مندوب شركات التوصيل او ظهر منة قصور في استلام الطلب (المنتج) باي حال كان فانة لا تنطبق على الطلب (المنتج) سياسة الاستبدال والارجاع او الالغاء وسوف يتم الاحتفاظ بالسلعة (المنتج) لمدة سبعه ايام كحد اقصى لدى شركة الشحن وفي حال عدم الاستلام خلال هذه المدة يحق للمتجر التصرف بها وفي حال المطالبة بالسلعة خلال الفترة المسموح بها فان العميل يتحمل كافة التكاليف اللازمة من الشحن ونحوه واي مصروفات ومتعلقات اخرى ترتبت عليها.

يتحمل العميل مصاريف الشحن إلى مستودعاتنا في حال استفادته من الضمان.

القطع الكهربائية غير مضمونة ولا ترد ولا تستبدل نهائياً.

في حال عدم ذكر مدة الضمان في الفاتورة فالسلعة غير مشمولة بالضمان.

يستثنى من ضمان المتجر/البائع هي الكسور والاضرار الناتجة من الحوادث او سواء الاستخدام والاضرار الناتجة عن طريق الصيانة للمنتج من قبل العميل ونحوها تطبق الشروط والاحكام.

في حال ذكر مدة الضمان في الفاتورة من قبل البائع/المتجر فالسلعة مشمولة بالضمان وبحسب ما هو مذكور بفاتورة الشراء بالمدة المحددة بالاسترداد او الاستبدال او الارجاع متى ما ثبت انها معيبة او لا تعمل ويجب على العميل اخطارنا عبر الموقع بذلك خلال مدة الضمان وان يلتزم حال موافقنا بالإرجاع بتسليمها لشركة الشحن خلال يومي عمل رسمية من بعد موافقتنا على الارجاع وخلافا لذلك يسقط حقة بالمطالبة تطبق الشروط والاحكام.

القطع المستعملة المحظور استيرادها الى المملكة العربية السعودية (زجاج السيارات-أحزمة الأمان-الوسائد الهوائية-أنظمة الفرامل وأجزائها-البطاريات السائلة-الكفرات المستعملة-الضفائر الكهربائية-الاسلاك الكهربائية)، يحتفظ الموقع بإلغاء أي طلب إذا تبين وجود تعارض مع الأنظمة الجمركية او الأمنية دون الرجوع للعميل ويتحمل العميل كامل المصروفات.

يوافق العميل في حال اختيار تجميع الشحنات على ان اقصى مدة لاحتفاظنا بالمنتجات في سلة تجميع الشحنات هو 7أيام من تاريخ دخول اول طلب للتجميع وحال التأخير عن ذلك يقوم النظام اليا بإحالتها للشحن المفرد.

يوافق ويقر العميل في حال اختيار تجميع الشحنات بان مدة الشحن سوف تختلف وتكون أطول وبذلك لا يحق له المطالبة عن التأخير.

المدة المتوقعة لوصول الشحنة للعميل من 14 الى 21 يوم وقد تتأخر أحيانا اعتمادا على الإجراءات الجمركية في بلدك.

البند الخامس: الإلغاء وفسخ العقد

يحق لأي من الطرفين إنهاء العقد بإشعار كتابي قبل 30 يومًا، على أن تتم تصفية أي معاملات مالية قائمة قبل الإنهاء. يحق للطرف الأول إلغاء العقد فورًا في حال مخالفة الطرف الثاني للأنظمة والشروط والسياسات والاحكام في الموقع أو تقديم شكاوى موثقة من العملاء.

البند السادس: السرية

يلتزم الطرفان بالحفاظ على سرية المعلومات والبيانات المتبادلة خلال فترة التعاقد وبعد انتهائها.

البند السابع: التعويض من طرف المتجر

يلتزم الطرف الثاني (المتجر/البائع) بتعويض الطرف الأول (المنصة) تعويضاً كاملا عن أي مطالبات أو دعاوي أو خسائر أو أضرار أو تكاليف (بما في ذلك أتعاب المحاماة) التي تنشأ نتيجة:

مخالفة الطرف الثاني للشروط أو السياسات الخاصة بالمنصة.

بيع منتجات مخالفة أو مقلدة أو غير مطابقة للمواصفات المنشورة.

أي نزاع أو مطالبة قانونية أو مالية من العملاء.

أي ضرر يلحق بسمعه المنصة أو مصداقيتها.

ويشمل التعويض كافة المبالغ المستحقة للعملاء وإعادة المدفوعات وتحميل جميع التكاليف ذات الصلة دون تحميل المنصة أي مسؤولية. ويشمل ذلك حق المنصة في استقطاع أو حجز أي مبالغ مستحقة للطرف الثاني لديها لتغطية هذه المطالبات أو الأضرار دون الرجوع إليه.

البند الثامن: منع التحايل والتواصل خارج المنصة

يقر الطرف الثاني بعدم:

محاولة التواصل مع العملاء خارج المنصة لأي غرض تجاري أو بيع المنتجات خارج النظام.

إتمام أي صفقات أو معاملات خارج المنصة.

ويعد أي خرق لهذا البند مخالفة جسيمة تخول المنصة إيقاف الحساب، فرض الجزاءات والغرامات وفق سياساتها، دون الحاجة لأي إجراء إضافي من المنصة.

البند التاسع: أولوية نصوص العقد

في حال وجود أي تعارض بين نصوص العقد وبين الشروط والسياسات أو أي بند أخر، تسود الأحكام الواردة في هذا العقد بما يحقق مصلحة المنصة وفق تقديرها، ويعد هذا البند إرشاداً قانونيا لتجنب أي تضارب.

البند العاشر: القوة القاهرة

لا يتحمل الطرف الأول (المنصة)أي مسؤولية عن أي تأخير أو فشل في تنفيذ التزاماته الناتجة عن ظروف خارجة عن إرادته بما في ذلك على سبيل المثال لا الحصر: الكوارث الطبيعية، الحروب، الاضطرابات، الأعطال التقنية انقطاع خدمات الإنترنت أو قرارات الجهات الحكومية أو أي ظرف خارج عن السيطرة.

ويتم تعليق تنفيذ الالتزامات خلال فترة استمرار هذه الظروف دون أي مسؤولية قانونية على المنصة.

البند الحادي عشر: تحديد المسؤولية

لا تتحمل المنصة بأي حال من الأحوال أي ضرار غير مباشرة أو تبعية أو خسارة أو سمعة، وتقتصر مسؤوليتها-إن وجدت-على قيمة العملية محل النزاع فقط.

البند الثاني عشر: عدم التنازل

إن عدم ممارسة المنصة لأي حق من حقوقها الواردة في هذا العقد لا يعد تنازلاً عنها ويحق لها ممارستها في أي وقت لاحق.

البند الثالث عشر: قابلية الفصل

في حال بطلان أو عدم قابلية تنفيذ أي بند من بنود هذا العقد، فإن ذلك لا يؤثر على صحة باقي البنود وتظل سارية ونافذة.

البند الرابع عشر: أولوية اللغة

تم اعداد هذا العقد باللغتين العربية والانجليزية. في حال وجود أي تعارض او اختلاف او عدم تطابق بين النصين، تكون النسخة العربية هي الراجحة والمعتمدة وتعد النسخة الرسمية والملزمة قانونا لكافة الأغراض، بما في ذلك التفسير والتنفيذ.

البند الخامس عشر: بنود عامة

القانون الواجب التطبيق

يخضع هذا العقد ويفسر وفقا لقوانين دولة الامارات العربية المتحدة.

طبيعة العلاقة

هذا العقد لا ينشئ أي علاقة شراكة او وكالة او علاقة عمل بين الطرفين.

الاشعارات

تكون جميع الاشعارات والمراسلات عبر المنصة او البريد الالكتروني المعتمد وتعد ملزمة قانونا.

كامل الاتفاق

يمثل هذا العقد كامل الاتفاق بين الطرفين ويلغي ما قبله من تفاهمات.

تعديل العقد

يحق للمنصة تعديل هذا العقد او السياسات في أي وقت ويعد استمرار الاستخدام موافقة.

الملكية الفكرية

جميع حقوق الملكية الفكرية للمنصة مملوكة للطرف الأول ولا يجوز استخدامها بدون اذن.

حماية البيانات

يلتزم الطرفان بحماية البيانات وعدم استخدامها خارج نطاق هذا العقد.

الضرائب

يتحمل الطرف الثاني كافة الضرائب والرسوم المترتبة على نشاطه.

عدم المنافسة

يتعهد الطرف الثاني بعدم استغلال المنصة او بياناتها لإنشاء نشاط منافس.

تمت الموافقة من: {{CUSTOMER_COMPANY_NAME}}
بتاريخ: {{CURRENT_DATE}}
الاسم المعتمد للتوقيع الإلكتروني: {{CUSTOMER_NAME}}
البريد الإلكتروني: {{CUSTOMER_EMAIL}}
رقم الجوال: {{CUSTOMER_PHONE}}
العنوان: {{CUSTOMER_ADDRESS}}$AR$,
  $EN$E-Commerce Store Hosting Agreement

First Party: {{FIRST_PARTY_NAME_EN}} (Website/Platform Owner e-tashleh), represented by its authorized manager.
Commercial Registration Number {{FIRST_PARTY_CR}}, Commercial License {{FIRST_PARTY_LICENSE}}, Trade license expiry date {{FIRST_PARTY_EXPIRY}}, Based in {{FIRST_PARTY_HQ_EN}}.

Second Party: {{CUSTOMER_COMPANY_NAME}}, represented by its authorized manager {{CUSTOMER_NAME}}.
Commercial Registration Number {{CUSTOMER_CR}}, Commercial License {{CUSTOMER_LICENSE}}, Trade license expiry date {{CUSTOMER_EXPIRY}}, Based in {{CUSTOMER_EMIRATE}}, {{CUSTOMER_COUNTRY}}.

A copy of the commercial registration and trade license must be attached.

Preamble:Whereas the Second Party wishes to establish an online store through the e-tashleh platform to sell used auto spare parts, the parties have agreed to the following terms:Clause One: Subject of the AgreementThe First Party shall provide the Second Party with digital space on its platform (e-tashleh) to operate an online store for selling used auto spare parts. The First Party shall also provide:- An integrated electronic payment gateway.- Technical support for the store.- Shipping services via approved logistics providers.Clause Two: CommissionThe First Party is entitled to a -- commission on every successful sale made through the online store.Clause Three: Contract DurationThis contract shall be valid for one calendar year from the date of signing. It may be renewed upon mutual electronic agreement by both parties.

Clause Four: Obligations of the Second Party

Terms and Conditions:

The Seller/Store and the Customer/User must agree to the Terms and Conditions, Privacy Policy, Payment Policy, and Return & Exchange Policy on our website. Your use of the website constitutes your agreement, and the website bears no legal responsibility for your failure to review them.

Once the payment process is completed through our website, the Seller/Store is not entitled to cancel the transaction, refuse it, or change its terms. Failure to comply will render the Seller/Store fully legally liable according to the website's terms and policies.

The Seller/Store agrees to authorize us to register their bank account on the approved payment gateway on the website to receive the sales proceeds directly. This constitutes their acknowledgment and agreement to the terms, policies, and regulations of the payment gateway without holding us liable under any circumstances.

The only official communication channel for any notes, reports, or correspondence is through the options available on the website icon.

In the event of a dispute between the website and the seller/store, disputes shall first be resolved amicably between the two parties. If this is not possible, arbitration shall be conducted in accordance with the terms and policies determined by the platform, and the arbitration decision shall be final and binding on both parties. This clause shall prevail over any other provision in the contract regarding the competent judicial authority or the mechanism for dispute resolution.

The Seller/Store agrees and acknowledges to retain the sold product paid through our website and not dispose of it, delivering it to the approved shipping company of the website, placing the shipping invoice on it, ensuring product compliance with the invoice issued by the website, documenting it, and documenting delivery to the shipping company, and keeping records. Otherwise, the Seller/Store will bear full legal responsibility and any costs or fees arising from this.

The Seller/Store acknowledges that the only valid agreement is the electronic agreement via registration on the website, our approval of it, and granting them the control panel to manage their products on the website. Any data or documents added by them are under their legal responsibility, and the website reserves the right to verify them by any means and to suspend the Seller/Store account at any time without bearing any liability. By registering and using the website, you acknowledge and agree to all the website’s terms, conditions, and policies, and the website bears no legal responsibility for your failure to review them.

The Seller/Store and the Customer agree that in case of any fraud or discrepancy in the product sent to the Customer compared to the invoice issued by our website, the Seller/Store bears full legal responsibility for all fees, expenses, payments, and consequences to both the Customer and the website. Website terms and policies apply.· The Seller/Store and the Customer agree that all rules and laws followed and applied on our website are governed by the laws of the United Arab Emirates.

Website (Platform) Liability Limits: The platform acts as a technical intermediary connecting customers to stores and does not own the products offered by the stores. The Seller/Store bears full responsibility for the products, their quality, warranty, and after-sales services after delivery to the customer, without conflicting with the other terms and conditions.

The website reserves the right to modify the terms and policies whenever needed without prior notice, and bears no responsibility for your failure to review them. Your use of the website constitutes agreement.· Your registration and use of the website constitute your agreement to all terms, conditions, and policies. The website bears no legal responsibility for your failure to review them.

The Seller/Store acknowledges that if the product is unavailable, out of stock, mispriced, or erroneous after the customer has paid via the website, they are obligated to complete the transaction and provide the product as agreed. They cannot refuse, object, or change the price according to the website’s terms and policies.

The Seller/Store agrees to set the product price and description accurately on their account on the website. They are obligated to sell and deliver the product to the customer once payment is completed and cannot refuse or modify it.

If the product is purchased from stores outside the customer’s country, neither the website nor the Seller/Store bears any customs duties, taxes, or fees that may apply to the shipped product; these are invoiced separately by the shipping company and fully borne by the customer.

The shipping company undertakes to receive the product from the Seller/Store, ensure it is free of defects, matches the invoice and shipping documents, and from the moment of receipt, full responsibility transfers to the shipping company.

The website has the right to inspect the product and verify its integrity and compliance with the customer’s order before shipping.

The website bears no responsibility if products are used in an unsafe or incorrect manner.

The Customer/User and Seller/Store acknowledge the confidentiality of registration data and account details. They are fully responsible for them. The website bears no liability in case of loss or unauthorized use and must be immediately notified through official channels to suspend the account, without the website bearing any liability.

The Seller/Store acknowledges that they will be granted a control panel to manage their products, which is under their responsibility without holding the website liable. Terms and policies apply.

The Seller/Store agrees that sales fees and website usage fees are – of the product sale value, electronically added to the product price entered by them, transferred directly via the payment gateway to our account, with the product’s sale value transferred to their account.

The Customer and Seller/Store acknowledge and agree to the terms, conditions, and policies of the payment gateway associated with our website. For details, refer to the payment gateway website. The website bears no responsibility; using the website constitutes agreement.

The Seller/Store must provide all required documents for registration, including but not limited to commercial registration, business license, bank IBAN letter, and a formal letter authorizing the user to manage the account on the website, allowing verification and acceptance or rejection.

After approval and granting the control panel, the Seller/Store must designate only one authorized person via a formal letter including name, position, address, identity proof, mobile number, and confirmation that they are the sole authorized person. No other will be recognized unless notified and approved according to terms, policies, and conditions.

The Seller/Store must provide a mobile number registered on WhatsApp under their commercial name for official store communication regarding offers, sales, and other matters.

Shipping company terms, policies, and regulations apply. For details, refer to the shipping company website. The website bears no responsibility; using the website constitutes agreement.

The website may suspend the account in case of fraud, breach of terms, policies, or conditions, low ratings, lack of sales activity, or non-cooperation, without liability, and the Seller/Store remains obligated to complete any prior transactions. Terms and policies apply.

If the customer benefits from free shipping and requests a return, they will bear the used shipping costs plus return shipping costs.

The Seller/Store and the website bear no responsibility for issues from shipping companies after the delivery to the courier; proof of receipt by the customer is considered agreement.

All policies, terms, and conditions on the website are integral; if any part is not mentioned, it is supplemented by the other sections.

Terms and conditions apply.

The Seller/Store agrees not to list or sell illegal, counterfeit, refurbished, or unlicensed products on the website.

The Seller/Store agrees to cooperate with our technical support and continuously update the store, products, inventory, and other matters. Failure will incur full responsibility.

The Customer/User and Seller/Store must use the website in compliance with legal regulations and instructions.

The Seller/Store must enter the weight, type, description, and images of the sold item on the control panel before invoicing the customer.

Seller Commitment to Deliver the Item:The Seller/Store agrees to deliver the sold item to the shipping warehouse with the sales invoice and shipping documents, documenting the item’s condition upon delivery. Responsibility transfers to the shipping company upon receipt. Both parties must retain all delivery documents and provide them upon request or for review.

For consolidated shipments, the Seller/Store must retain the sold product with the invoice for up to 7 days until the shipping invoice is issued and sent to the shipping company.

The Seller/Store guarantees that the sold items are original, in their original state, not repaired, painted, or refurbished. Any violation will incur return and shipping costs, a penalty of AED 50,000, immediate contract termination, and public disclosure to protect the website’s reputation. This shall be without prejudice to the Platform’s right to claim any additional compensation in accordance with the indemnity provisions of this Agreement.

Attached Images in Listings:Images attached in store listings are considered contractual documents approved by the website. Once the customer approves the listing, the images are included in the invoice and are the official reference in any dispute. The Seller/Store must deliver the product matching the images and invoice without alteration or substitution after order acceptance. All electronic records, including but not limited to system logs, images, and video recordings, shall constitute legally binding evidence and shall be admissible before courts and arbitral tribunals.

Suspension of Payments and Deductions for Stores:The website may temporarily suspend or delay the transfer of the store’s dues in case of dispute, complaint, return request, or suspected policy violation. The website may deduct return fees, dispute handling fees, or any related costs from the store’s dues.

Documentation upon Delivery and Liability (for Stores):• Shipment Matching: Ensure the product matches the order, invoice, and accompanying documents, verifying type, quantity, and visible condition.• Mandatory System Documentation: Upload clear images, a video showing the item’s condition, recipient’s signature, responsible employee’s name, date and time. This is mandatory and a formal reference for any future dispute.• Transfer of Responsibility: Once documentation is complete, full responsibility transfers to the shipping company, including breakage, damage, loss, or subsequent harm.• Breach of Documentation: Failure to document properly will make the store fully liable for any damage or dispute. No objection can be raised due to non-documentation or pre-existing damage.• Legal Presumption: Failure to document is considered conclusive evidence of shipment integrity and will be used to determine liability in disputes.

Terms and Conditions for Exchange and Return Policy:

In case of dispute, return, cancellation, or exchange request, the customer must contact the Seller/Store via official channels within 24 hours of receipt. If unresolved within 3 days, it will be escalated to website management.

· For returns/cancellations due to personal preference, the customer bears round-trip shipping costs plus 2% invoice fee to the payment gateway. Other fees per terms and conditions.

· For defect-related returns/exchanges, the Seller/Store bears all shipping costs. Replacement will occur within 21 business days after receipt of the returned item; delays may occur due to customs procedures.

· For warranty exchanges, the Seller/Store bears shipping costs. Replacement will occur within 21 business days of receipt.

· Returned items must be in original condition, free of scratches or damage, with the original packaging and invoice, within 24 hours of receipt. Failure to notify within this period forfeits the right to claim.

· Upon approval, the customer will receive a shipping invoice for return within 3 days; failure to use it will forfeit the right.

· Returns due to shipping damage or delay are covered by the shipping company, which will pay 2% invoice fee and any incurred costs. The customer must notify the Seller/Store for coordination.

· Return shipping is according to website policy, unless the fault is with the Seller/Store.

· Refunds are processed per the payment gateway, 14–45 business days after receipt and verification, to the same payment method. The website bears no liability.

· Cancellation before or after shipping will incur any intermediary fees plus 2% invoice fee.

· Any shipping errors must be reported within 24 hours of receipt. Corrections will be coordinated without cost to the customer; claims beyond this period are invalid.

· The Seller/Store may refuse returned items showing damage, usage, or disassembly.

· Non-receipt by the customer due to their own fault does not fall under return/exchange/cancellation policy; the product is retained up to 7 days at the shipping company. Beyond this, the store may dispose of it. Customer bears all related costs if they claim within allowed period.

· Customers bear shipping costs to our warehouses for warranty claims.

· Electrical parts are non-refundable and non-exchangeable.

· Items with no warranty stated on the invoice are not covered.

· Warranty does not cover damage due to accidents, misuse, or repairs by the customer.

· Items with warranty stated on the invoice are covered per invoice duration. Customer must notify the website during warranty period and return via shipping within 2 business days of approval, or rights are forfeited.

· Used parts prohibited for import into Saudi Arabia (car glass, seatbelts, airbags, brake systems and parts, wet batteries, used tires, electrical wires and braids) may be canceled by the website if in conflict with customs/security regulations; customer bears full costs.

· For consolidated shipments, the maximum retention period is 7 days from the first order entry; delays beyond that trigger automatic individual shipment.

· Customers choosing consolidated shipments acknowledge that shipping duration may be longer; claims for delays are invalid.

· Estimated shipping duration: 14–21 days; may vary due to customs procedures.

ClauseFive:TerminationEither party has the right to terminate the contract by providing a written notice 30 days in advance, provided that all outstanding financial transactions are settled before termination. The First Party reserves the right to cancel the contract immediately in the event that the Second Party violates the rules, terms, policies, and conditions of the website, or if verified complaints are submitted by customers.

Clause Six: ConfidentialityBoth parties agree to maintain the confidentiality of exchanged information during and after the term of the agreement.

Clause Seven: Compensation by the StoreThe second party (the store/seller) shall fully compensate the first party (the platform) for any claims, lawsuits, losses, damages, or costs (including attorney fees) arising from:

The second party’s violation of the platform’s terms or policies.

The sale of products that are counterfeit, non-compliant, or not matching the published specifications.

Any legal or financial dispute or claim from customers.

Any harm to the platform’s reputation or credibility.

This compensation includes all amounts owed to customers, refund payments, and all related costs, without holding the platform liable in any way. The Platform shall have the right to withhold, deduct, or set off any amounts due to the Seller to cover such claims, damages, or liabilities without prior notice.

Clause Eight: Prevention of Fraud and Off-Platform CommunicationThe second party acknowledges and agrees not to:

Attempt to communicate with customers outside the platform for any commercial purpose or to sell products off-platform.

Conduct any transactions or deals outside the platform.

Any violation of this clause shall be considered a serious breach, entitling the platform to suspend the account, impose penalties, and apply fines according to its policies, without requiring any additional action from the platform.

Clause Nine: Priority of Contract Terms

In the event of any conflict between the provisions of this contract and the terms, policies, or any other clause, the provisions of this contract shall prevail in a manner that serves the platform’s interest, according to its discretion. This clause serves as a legal guideline to avoid any conflict.

Clause Ten: Force Majeure

The Platform shall not be held liable for any delay or failure in performing its obligations under this Agreement if such delay or failure results from events beyond its reasonable control, including but not limited to acts of God, natural disasters, war, civil unrest, technical failures, internet outages, governmental actions, or any other unforeseeable circumstances.

The performance of obligations shall be suspended for the duration of such events without any legal liability on the Platform.

Clause Eleven: Limitation of Liability

Under no circumstances shall the Platform be liable for any indirect, incidental, consequential, or loss of profit or reputational damages.

The Platform’s total liability, if any, shall be limited to the value of the transaction subject to the dispute.

Clause Twelve: No Waiver

The failure or delay of the Platform in exercising any right under this Agreement shall not be deemed a waiver of such right, nor shall it prevent the Platform from exercising it at any time thereafter.

Clause Thirteen: Severability

If any provision of this Agreement is held to be invalid, illegal, or unenforceable, the remaining provisions shall remain valid and enforceable to the fullest extent permitted by law.

Clause Fourteen:

The Platform reserves the right to withhold, suspend, or deduct any amounts due to the Seller without prior notice in order to cover disputes, claims, refunds, or any related liabilities.

Clause Fifteen: Language Priority

This Agreement is drafted in both Arabic and English. In case of any conflict, discrepancy, or inconsistency between the two texts, the Arabic version shall prevail and be deemed the official and legally binding version for all purposes, including interpretation and enforcement.

Clause Sixteen: General Provisions

Governing Law:

This Agreement shall be governed by the laws of the United Arab Emirates.

Relationship of the Parties:

Nothing in this Agreement creates a partnership, agency, or employment relationship.

Notices:

All notices shall be made through the platform or registered email and shall be legally binding.

Accepted By: {{CUSTOMER_COMPANY_NAME}}
Date: {{CURRENT_DATE}}
Authorized Name for Electronic Signature: {{CUSTOMER_NAME}}
Email: {{CUSTOMER_EMAIL}}
Mobile Number: {{CUSTOMER_PHONE}}
Address: {{CUSTOMER_ADDRESS}}$EN$,
  '{"companyNameAr":"شركة إليب ش.م.ح-ذ.م.م","companyNameEn":"ELLIPP FZ-LLC","crNumber":"4036902","licenseNumber":"45000927","licenseExpiry":"2026-06-19","headquartersAr":"إمارة رأس الخيمة بدولة الامارات العربية المتحدة","headquartersEn":"Ras Al Khaimah, United Arab Emirates"}'::jsonb,
  COALESCE((SELECT MAX(version) FROM platform_contracts WHERE type = 'vendor_agreement'), 0) + 1,
  true;
