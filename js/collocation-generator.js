/* Collocation Generator (scene-based) — keeps collocations consistent with lesson scenario
 * Usage (runtime fallback):
 *   const cols = window.CollocationGenerator?.generateForLesson(lesson) || []
 *   // returns [{id,en,fa}, ...]
 *
 * IMPORTANT:
 * - Collocation IDs are NOT guaranteed globally unique. The collocation page matches by (lesson,id).
 */
(function(){
  'use strict';

  function toText(v){
    if(!v) return '';
    if(typeof v === 'object') return (v.en || v.fa || '').toString();
    return String(v);
  }


  const slugify = (s) => String(s||'')
    .toLowerCase()
    .trim()
    .replace(/[’']/g,'')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/-+/g,'-')
    .replace(/^-|-$/g,'')
    .slice(0,64) || 'item';

  function norm(s){ return String(s||'').toLowerCase(); }

  function classifyScene(lesson){
    const a = lesson && lesson.analysis ? lesson.analysis : {};
    const txt = [
      toText(lesson?.place), toText(lesson?.fullDescription), a?.setting, a?.settingFa, a?.mood, a?.moodFa,
      ...(Array.isArray(a?.objects) ? a.objects : []),
      ...(Array.isArray(a?.themes) ? a.themes : []),
    ].filter(Boolean).join(' | ');
    const t = norm(txt);

    // Urban — more specific first
    if (/(subway|metro|underground|station|platform|turnstile)/.test(t) && /(exit|stairs|escalator)/.test(t)) return 'subway-exit';
    if (/(public transport|carriage|train car|subway car|bus interior|inside a bus|inside a train)/.test(t)) return 'public-transport';
    if (/(bus stop|timetable|schedule|route)/.test(t)) return 'bus-stop';
    if (/(crosswalk|marked crosswalk|intersection|traffic light)/.test(t)) return 'city-crosswalk';
    if (/(outdoor caf|cafe|coffee shop)/.test(t) && /(street|sidewalk|urban|city)/.test(t)) return 'outdoor-cafe';
    if (/(shopping street|storefront|shop window|boutique|sale|market)/.test(t)) return 'urban-shopping';
    if (/(rooftop|skyline|city view|elevated urban)/.test(t) && /(sunset|dusk|evening)/.test(t)) return 'rooftop-sunset';
    if (/(sidewalk|bicycles|bike|cafés|cafe)/.test(t) && /(city|urban)/.test(t)) return 'city-sidewalk';
    if (/(busy city street|urban street|city street|downtown)/.test(t)) return 'city-street';

    // Nature — specific first to avoid generic 'forest' grabbing everything
    if (/(dark forest|night forest|flashlight)/.test(t)) return 'forest-night';
    if (/(rapids|whitewater|strong current|fast-flowing|rushing water|torrent)/.test(t)) return 'river-rapids';
    if (/(coastal cliff|cliff|coastline)/.test(t) && /(sunset|dusk)/.test(t)) return 'coastal-cliff';
    if (/(beach|shoreline|ocean|waves)/.test(t)) return 'beach';
    if (/(winter|snowfall|snow|icy|blizzard)/.test(t)) return 'winter-snow';
    if (/(desert|dunes|sand dune)/.test(t)) return 'desert-dunes';
    if (/(high mountain|cliffs|altitude|harness|climbing)/.test(t)) return 'mountain-cliffs';
    if (/(mountain valley|valley|snow-capped|scenic trail|breathtaking)/.test(t)) return 'mountain-valley';
    if (/(lake|overlook|horizon|golden hour)/.test(t) && /(sunset|dusk)/.test(t)) return 'lake-sunset';

    if (/(campsite|camp site|tent|string lights|campfire)/.test(t) && /(star|night)/.test(t)) return 'campsite-night';
    if (/(campsite|camp site|tent|string lights|campfire)/.test(t)) return 'campsite';
    if (/(park|walking paths|bench)/.test(t)) return 'park';
    if (/(office|workspace|desk|computer)/.test(t)) return 'office';
    if (/(forest|woodland|trail|path)/.test(t)) return 'forest-day';

    return 'general';
  }

  const TEMPLATES = {
    'city-street': [
      ['rush-hour traffic','ترافیک ساعت شلوغی'],
      ['a crowded sidewalk','پیاده‌رو شلوغ'],
      ['pedestrians in a hurry','عابران عجول'],
      ['to cross the street','از خیابان عبور کردن'],
      ['street signs and signals','تابلوها و علائم راهنمایی'],
      ['public transportation','حمل‌ونقل عمومی'],
      ['to catch a bus','به اتوبوس رسیدن'],
      ['a bustling downtown area','مرکز شهر پرجنب‌وجوش'],
    ],
    'city-crosswalk': [
      ['a marked crosswalk','خط‌کشی عابر پیاده'],
      ['to wait for the signal','منتظر چراغ شدن'],
      ['oncoming traffic','ترافیک روبه‌رو'],
      ['to look both ways','دو طرف را نگاه کردن'],
      ['a traffic light','چراغ راهنمایی'],
      ['a city intersection','تقاطع شهری'],
      ['to hurry across','سریع عبور کردن'],
      ['a pedestrian crossing','محل عبور عابر'],
    ],
    'campsite': [
      ['pitch a tent','چادر برپا کردن'],
      ['a campfire','آتش کمپ'],
      ['string lights','چراغ‌های ریسه‌ای'],
      ['a lakeside campsite','کمپ کنار آب'],
      ['to roast marshmallows','مارشمالو کباب کردن'],
      ['play an acoustic guitar','گیتار آکوستیک زدن'],
      ['a calm evening','عصر آرام'],
      ['share stories','قصه گفتن'],
    ],
    'campsite-night': [
      ['a star-filled sky','آسمان پرستاره'],
      ['to stargaze','ستاره‌نگری کردن'],
      ['a sleeping bag','کیسه خواب'],
      ['campfire embers','اخگرهای آتش'],
      ['to set up camp','کمپ برپا کردن'],
      ['tell stories','قصه گفتن'],
      ['a cool night air','هوای خنک شب'],
      ['camp under the stars','زیر ستاره‌ها کمپ زدن'],
    ],
    'forest-day': [
      ['a wooded trail','مسیر جنگلی'],
      ['dappled sunlight','نور لکه‌لکه'],
      ['to take a hike','پیاده‌روی/کوهپیمایی رفتن'],
      ['fresh air','هوای تازه'],
      ['a quiet path','مسیر آرام'],
      ['to enjoy nature','از طبیعت لذت بردن'],
      ['a canopy of trees','سقف درختان'],
      ['walk side by side','کنار هم قدم زدن'],
    ],
    'forest-night': [
      ['a pitch-dark forest','جنگل کاملاً تاریک'],
      ['a flashlight beam','نور چراغ‌قوه'],
      ['eerie silence','سکوت وهم‌آور'],
      ['rustling leaves','خش‌خش برگ‌ها'],
      ['a narrow trail','مسیر باریک'],
      ['to keep alert','هوشیار ماندن'],
      ['shadows between trees','سایه بین درخت‌ها'],
      ['to feel uneasy','حس ناآرامی داشتن'],
    ],
    'beach': [
      ['a sandy beach','ساحل شنی'],
      ['ocean waves','موج‌های دریا'],
      ['a salty breeze','نسیم نمکی'],
      ['walk along the shore','کنار ساحل قدم زدن'],
      ['a clear blue sky','آسمان آبی صاف'],
      ['seashells on the sand','صدف روی شن'],
      ['to relax by the water','کنار آب استراحت کردن'],
      ['sunset on the horizon','غروب روی افق'],
    ],
    'coastal-cliff': [
      ['a coastal cliff','صخره ساحلی'],
      ['crashing waves','موج‌های کوبنده'],
      ['a rugged coastline','ساحل ناهموار'],
      ['salty sea air','هوای نمکی دریا'],
      ['to watch the sunset','غروب را تماشا کردن'],
      ['sea spray','پاشش آب دریا'],
      ['a scenic viewpoint','نقطه دیدنی'],
      ['ocean horizon','افق اقیانوس'],
    ],
    'winter-snow': [
      ['heavy snowfall','برف سنگین'],
      ['low visibility','دید کم'],
      ['snow-covered ground','زمین پوشیده از برف'],
      ['an icy wind','باد یخ‌زده'],
      ['slippery roads','جاده‌های لغزنده'],
      ['to stay warm','گرم ماندن'],
      ['to clear the snow','برف را پارو کردن'],
      ['bundled up in layers','چند لایه لباس پوشیدن'],
    ],
    'desert-dunes': [
      ['sand dunes','تپه‌های شنی'],
      ['a vast landscape','منظره وسیع'],
      ['a desert sunset','غروب کویر'],
      ['a distant horizon','افق دوردست'],
      ['scorching heat','گرمای سوزان'],
      ['to conserve water','آب را ذخیره/حفظ کردن'],
      ['strong winds','بادهای شدید'],
      ['footprints in the sand','ردپا روی شن'],
    ],
    'river-rapids': [
      ['whitewater rapids','آب‌های خروشان'],
      ['a strong current','جریان قوی'],
      ['slippery rocks','سنگ‌های لغزنده'],
      ['to keep balance','تعادل را حفظ کردن'],
      ['splashing water','پاشیدن آب'],
      ['an outdoor adventure','ماجراجویی در طبیعت'],
      ['a riverbank trail','مسیر کنار رودخانه'],
      ['to navigate the rocks','میان سنگ‌ها حرکت کردن'],
    ],
    'mountain-cliffs': [
      ['steep cliffs','صخره‌های شیب‌دار'],
      ['high altitude','ارتفاع زیاد'],
      ['rocky terrain','زمین سنگلاخی'],
      ['thin mountain air','هوای رقیق کوهستان'],
      ['distant peaks','قله‌های دور'],
      ['a safety harness','هارنس ایمنی'],
      ['to climb carefully','با احتیاط صعود کردن'],
      ['to face a challenge','با چالش روبه‌رو شدن'],
    ],
    'mountain-valley': [
      ['a mountain valley','دره کوهستانی'],
      ['snow-capped peaks','قله‌های برفی'],
      ['a winding river','رودخانه پیچان'],
      ['lush greenery','سرسبزی'],
      ['a scenic trail','مسیر دیدنی'],
      ['fresh mountain air','هوای تازه کوهستان'],
      ['to hike uphill','سربالایی رفتن'],
      ['breathtaking scenery','منظره نفس‌گیر'],
    ],
    'lake-sunset': [
      ['a scenic overlook','سکوی منظره'],
      ['golden hour light','نور ساعت طلایی'],
      ['a glowing sunset','غروب درخشان'],
      ['layered mountains','کوه‌های لایه‌لایه'],
      ['a peaceful moment','لحظه آرام'],
      ['to take in the view','منظره را تماشا کردن'],
      ['a distant horizon','افق دوردست'],
      ['reflect on the day','به روز فکر کردن'],
    ],
    'rooftop-sunset': [
      ['a rooftop view','منظره پشت‌بام'],
      ['a city skyline','خط افق شهر'],
      ['a sunset glow','تابش غروب'],
      ['evening traffic','ترافیک عصر'],
      ['neon lights','چراغ‌های نئونی'],
      ['to take photos','عکس گرفتن'],
      ['a cool breeze','نسیم خنک'],
      ['to unwind after work','بعد از کار ریلکس کردن'],
    ],
    'city-sidewalk': [
      ['a sidewalk café','کافه کنار پیاده‌رو'],
      ['outdoor seating','صندلی‌های بیرونی'],
      ['ride a bicycle','دوچرخه‌سواری کردن'],
      ['lock a bike','دوچرخه را قفل کردن'],
      ['order a coffee','قهوه سفارش دادن'],
      ['a busy pedestrian area','محیط شلوغ عابر'],
      ['street atmosphere','حال‌وهوای خیابان'],
      ['to people-watch','مردم را تماشا کردن'],
    ],
    'bus-stop': [
      ['a bus stop','ایستگاه اتوبوس'],
      ['check the timetable','زمان‌بندی را چک کردن'],
      ['wait in line','در صف منتظر ماندن'],
      ['to catch the next bus','به اتوبوس بعدی رسیدن'],
      ['rush-hour crowd','جمعیت ساعت شلوغی'],
      ['arrival time','زمان رسیدن'],
      ['to board the bus','سوار اتوبوس شدن'],
      ['public transit card','کارت حمل‌ونقل عمومی'],
    ],
    'subway-exit': [
      ['a subway station','ایستگاه مترو'],
      ['exit stairs','پله‌های خروج'],
      ['swipe a transit card','کارت را کشیدن'],
      ['an underground tunnel','تونل زیرزمینی'],
      ['commuter flow','رفت‌وآمد مسافران'],
      ['platform signs','تابلوهای سکو'],
      ['to transfer lines','تعویض خط'],
      ['to rush upstairs','سریع بالا رفتن'],
    ],
    'outdoor-cafe': [
      ['an outdoor café','کافه روباز'],
      ['a menu board','تابلوی منو'],
      ['order a drink','نوشیدنی سفارش دادن'],
      ['sit at a table','سر میز نشستن'],
      ['friendly service','خدمات دوستانه'],
      ['a bustling street','خیابان پرجنب‌وجوش'],
      ['to take a break','استراحت کوتاه کردن'],
      ['to pay the bill','صورتحساب را پرداخت کردن'],
    ],
    'public-transport': [
      ['a crowded carriage','واگن شلوغ'],
      ['to grab a seat','جا پیدا کردن'],
      ['hold onto a handrail','دستگیره گرفتن'],
      ['an announcement over the speaker','اعلام بلندگو'],
      ['stand near the door','کنار در ایستادن'],
      ['commute home','راهی خانه شدن'],
      ['personal space','حریم شخصی'],
      ['to avoid delays','از تأخیر جلوگیری کردن'],
    ],
    'urban-shopping': [
      ['a shopping street','خیابان خرید'],
      ['store windows','ویترین مغازه‌ها'],
      ['browse the shops','مغازه‌ها را نگاه کردن'],
      ['carry shopping bags','کیسه‌های خرید حمل کردن'],
      ['compare prices','قیمت‌ها را مقایسه کردن'],
      ['a seasonal sale','حراج فصلی'],
      ['make a purchase','خرید انجام دادن'],
      ['a busy marketplace','بازار شلوغ'],
    ],
    'office': [
      ['a work desk','میز کار'],
      ['a computer monitor','مانیتور کامپیوتر'],
      ['check your email','ایمیل را چک کردن'],
      ['review documents','اسناد را مرور کردن'],
      ['take notes','یادداشت برداشتن'],
      ['a busy schedule','برنامه فشرده'],
      ['a video call','تماس ویدیویی'],
      ['meet a deadline','ضرب‌الاجل را رعایت کردن'],
    ],
    'park': [
      ['a public park','پارک عمومی'],
      ['a walking path','مسیر پیاده‌روی'],
      ['sit on a bench','روی نیمکت نشستن'],
      ['leafy trees','درختان پُربرگ'],
      ['go for a stroll','قدم زدن'],
      ['a relaxed pace','سرعت آرام'],
      ['a friendly chat','گپ دوستانه'],
      ['a sunny afternoon','بعدازظهر آفتابی'],
    ],
    'general': [
      ['pay attention','توجه کردن'],
      ['make a decision','تصمیم گرفتن'],
      ['take a deep breath','یک نفس عمیق کشیدن'],
      ['keep an eye on','حواس‌مان به چیزی بودن'],
      ['face a challenge','با چالش روبه‌رو شدن'],
      ['have a good time','خوش گذراندن'],
      ['work as a team','تیمی کار کردن'],
      ['share an idea','یک ایده را به اشتراک گذاشتن'],
    ],
  };

  function generateForLesson(lesson){
    const cat = classifyScene(lesson);
    const list = TEMPLATES[cat] || TEMPLATES.general;
    return list.map(([en,fa]) => ({ id: slugify(en), en, fa, __category: cat }));
  }

  window.CollocationGenerator = {
    slugify,
    classifyScene,
    generateForLesson,
    templates: TEMPLATES,
  };
})();
