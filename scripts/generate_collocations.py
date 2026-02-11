#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Generate consistent collocations for each lesson based on the lesson scenario (analysis.setting etc.)
- Overwrites lesson["collocations"] with a deterministic, scene-based list.
- Rebuilds assets/data/collocations_index.json from lesson collocations.
- Keeps IDs as slugified collocation English phrase (NOT globally unique). The UI resolves by (lesson,id).

Run:
  python scripts/generate_collocations.py

Options:
  --dry-run   : don't write files, only print summary
  --keep      : keep existing collocations if they already match the generated set (same IDs)
"""

from __future__ import annotations

import argparse
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple, Any

BLACK_FA = {"فعل/عمل", "موضوع/مفهوم", "شیء/وسیله"}

def slugify(s: str) -> str:
    s = (s or "").lower().strip()
    s = s.replace("’", "").replace("'", "")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return (s[:64] or "item")

def norm(s: str) -> str:
    return (s or "").lower()

def classify(lesson: Dict[str, Any]) -> str:
    a = lesson.get("analysis") or {}
    parts = []
    for k in ("place", "fullDescription"):
        if lesson.get(k): parts.append(str(lesson.get(k)))
    for k in ("setting", "settingFa", "mood", "moodFa"):
        if a.get(k): parts.append(str(a.get(k)))
    for k in ("objects", "themes"):
        v = a.get(k)
        if isinstance(v, list):
            parts.extend([str(x) for x in v if x])
    t = norm(" | ".join(parts))

    # Urban (specific first)
    if re.search(r"(subway|metro|underground|station|platform|turnstile)", t) and re.search(r"(exit|stairs|escalator)", t):
        return "subway-exit"
    if re.search(r"(public transport|carriage|train car|subway car|bus interior|inside a bus|inside a train)", t):
        return "public-transport"
    if re.search(r"(bus stop|timetable|schedule|route)", t):
        return "bus-stop"
    if re.search(r"(crosswalk|marked crosswalk|intersection|traffic light)", t):
        return "city-crosswalk"
    if re.search(r"(outdoor caf|cafe|coffee shop)", t) and re.search(r"(street|sidewalk|urban|city)", t):
        return "outdoor-cafe"
    if re.search(r"(shopping street|storefront|shop window|boutique|sale|market)", t):
        return "urban-shopping"
    if re.search(r"(rooftop|skyline|city view|elevated urban)", t) and re.search(r"(sunset|dusk|evening)", t):
        return "rooftop-sunset"
    if re.search(r"(sidewalk|bicycles|bike|cafés|cafe)", t) and re.search(r"(city|urban)", t):
        return "city-sidewalk"
    if re.search(r"(busy city street|urban street|city street|downtown)", t):
        return "city-street"

    # Nature (specific first)
    if re.search(r"(dark forest|night forest|flashlight)", t):
        return "forest-night"
    if re.search(r"(rapids|whitewater|strong current|fast-flowing|rushing water|torrent)", t):
        return "river-rapids"
    if re.search(r"(coastal cliff|cliff|coastline)", t) and re.search(r"(sunset|dusk)", t):
        return "coastal-cliff"
    if re.search(r"(beach|shoreline|ocean|waves)", t):
        return "beach"
    if re.search(r"(winter|snowfall|snow|icy|blizzard)", t):
        return "winter-snow"
    if re.search(r"(desert|dunes|sand dune)", t):
        return "desert-dunes"
    if re.search(r"(high mountain|cliffs|altitude|harness|climbing)", t):
        return "mountain-cliffs"
    if re.search(r"(mountain valley|valley|snow-capped|scenic trail|breathtaking)", t):
        return "mountain-valley"
    if re.search(r"(lake|overlook|horizon|golden hour)", t) and re.search(r"(sunset|dusk)", t):
        return "lake-sunset"

    if re.search(r"(campsite|camp site|tent|string lights|campfire)", t) and re.search(r"(star|night)", t):
        return "campsite-night"
    if re.search(r"(campsite|camp site|tent|string lights|campfire)", t):
        return "campsite"
    if re.search(r"(park|walking paths|bench)", t):
        return "park"
    if re.search(r"(office|workspace|desk|computer)", t):
        return "office"
    if re.search(r"(forest|woodland|trail|path)", t):
        return "forest-day"

    return "general"


TEMPLATES: Dict[str, List[Tuple[str,str]]] = {
  "city-street": [
    ("rush-hour traffic","ترافیک ساعت شلوغی"),
    ("a crowded sidewalk","پیاده‌رو شلوغ"),
    ("pedestrians in a hurry","عابران عجول"),
    ("to cross the street","از خیابان عبور کردن"),
    ("street signs and signals","تابلوها و علائم راهنمایی"),
    ("public transportation","حمل‌ونقل عمومی"),
    ("to catch a bus","به اتوبوس رسیدن"),
    ("a bustling downtown area","مرکز شهر پرجنب‌وجوش"),
  ],
  "city-crosswalk": [
    ("a marked crosswalk","خط‌کشی عابر پیاده"),
    ("to wait for the signal","منتظر چراغ شدن"),
    ("oncoming traffic","ترافیک روبه‌رو"),
    ("to look both ways","دو طرف را نگاه کردن"),
    ("a traffic light","چراغ راهنمایی"),
    ("a city intersection","تقاطع شهری"),
    ("to hurry across","سریع عبور کردن"),
    ("a pedestrian crossing","محل عبور عابر"),
  ],
  "campsite": [
    ("pitch a tent","چادر برپا کردن"),
    ("a campfire","آتش کمپ"),
    ("string lights","چراغ‌های ریسه‌ای"),
    ("a lakeside campsite","کمپ کنار آب"),
    ("to roast marshmallows","مارشمالو کباب کردن"),
    ("play an acoustic guitar","گیتار آکوستیک زدن"),
    ("a calm evening","عصر آرام"),
    ("share stories","قصه گفتن"),
  ],
  "campsite-night": [
    ("a star-filled sky","آسمان پرستاره"),
    ("to stargaze","ستاره‌نگری کردن"),
    ("a sleeping bag","کیسه خواب"),
    ("campfire embers","اخگرهای آتش"),
    ("to set up camp","کمپ برپا کردن"),
    ("tell stories","قصه گفتن"),
    ("a cool night air","هوای خنک شب"),
    ("camp under the stars","زیر ستاره‌ها کمپ زدن"),
  ],
  "forest-day": [
    ("a wooded trail","مسیر جنگلی"),
    ("dappled sunlight","نور لکه‌لکه"),
    ("to take a hike","پیاده‌روی/کوهپیمایی رفتن"),
    ("fresh air","هوای تازه"),
    ("a quiet path","مسیر آرام"),
    ("to enjoy nature","از طبیعت لذت بردن"),
    ("a canopy of trees","سقف درختان"),
    ("walk side by side","کنار هم قدم زدن"),
  ],
  "forest-night": [
    ("a pitch-dark forest","جنگل کاملاً تاریک"),
    ("a flashlight beam","نور چراغ‌قوه"),
    ("eerie silence","سکوت وهم‌آور"),
    ("rustling leaves","خش‌خش برگ‌ها"),
    ("a narrow trail","مسیر باریک"),
    ("to keep alert","هوشیار ماندن"),
    ("shadows between trees","سایه بین درخت‌ها"),
    ("to feel uneasy","حس ناآرامی داشتن"),
  ],
  "beach": [
    ("a sandy beach","ساحل شنی"),
    ("ocean waves","موج‌های دریا"),
    ("a salty breeze","نسیم نمکی"),
    ("walk along the shore","کنار ساحل قدم زدن"),
    ("a clear blue sky","آسمان آبی صاف"),
    ("seashells on the sand","صدف روی شن"),
    ("to relax by the water","کنار آب استراحت کردن"),
    ("sunset on the horizon","غروب روی افق"),
  ],
  "coastal-cliff": [
    ("a coastal cliff","صخره ساحلی"),
    ("crashing waves","موج‌های کوبنده"),
    ("a rugged coastline","ساحل ناهموار"),
    ("salty sea air","هوای نمکی دریا"),
    ("to watch the sunset","غروب را تماشا کردن"),
    ("sea spray","پاشش آب دریا"),
    ("a scenic viewpoint","نقطه دیدنی"),
    ("ocean horizon","افق اقیانوس"),
  ],
  "winter-snow": [
    ("heavy snowfall","برف سنگین"),
    ("low visibility","دید کم"),
    ("snow-covered ground","زمین پوشیده از برف"),
    ("an icy wind","باد یخ‌زده"),
    ("slippery roads","جاده‌های لغزنده"),
    ("to stay warm","گرم ماندن"),
    ("to clear the snow","برف را پارو کردن"),
    ("bundled up in layers","چند لایه لباس پوشیدن"),
  ],
  "desert-dunes": [
    ("sand dunes","تپه‌های شنی"),
    ("a vast landscape","منظره وسیع"),
    ("a desert sunset","غروب کویر"),
    ("a distant horizon","افق دوردست"),
    ("scorching heat","گرمای سوزان"),
    ("to conserve water","آب را ذخیره/حفظ کردن"),
    ("strong winds","بادهای شدید"),
    ("footprints in the sand","ردپا روی شن"),
  ],
  "river-rapids": [
    ("whitewater rapids","آب‌های خروشان"),
    ("a strong current","جریان قوی"),
    ("slippery rocks","سنگ‌های لغزنده"),
    ("to keep balance","تعادل را حفظ کردن"),
    ("splashing water","پاشیدن آب"),
    ("an outdoor adventure","ماجراجویی در طبیعت"),
    ("a riverbank trail","مسیر کنار رودخانه"),
    ("to navigate the rocks","میان سنگ‌ها حرکت کردن"),
  ],
  "mountain-cliffs": [
    ("steep cliffs","صخره‌های شیب‌دار"),
    ("high altitude","ارتفاع زیاد"),
    ("rocky terrain","زمین سنگلاخی"),
    ("thin mountain air","هوای رقیق کوهستان"),
    ("distant peaks","قله‌های دور"),
    ("a safety harness","هارنس ایمنی"),
    ("to climb carefully","با احتیاط صعود کردن"),
    ("to face a challenge","با چالش روبه‌رو شدن"),
  ],
  "mountain-valley": [
    ("a mountain valley","دره کوهستانی"),
    ("snow-capped peaks","قله‌های برفی"),
    ("a winding river","رودخانه پیچان"),
    ("lush greenery","سرسبزی"),
    ("a scenic trail","مسیر دیدنی"),
    ("fresh mountain air","هوای تازه کوهستان"),
    ("to hike uphill","سربالایی رفتن"),
    ("breathtaking scenery","منظره نفس‌گیر"),
  ],
  "lake-sunset": [
    ("a scenic overlook","سکوی منظره"),
    ("golden hour light","نور ساعت طلایی"),
    ("a glowing sunset","غروب درخشان"),
    ("layered mountains","کوه‌های لایه‌لایه"),
    ("a peaceful moment","لحظه آرام"),
    ("to take in the view","منظره را تماشا کردن"),
    ("a distant horizon","افق دوردست"),
    ("reflect on the day","به روز فکر کردن"),
  ],
  "rooftop-sunset": [
    ("a rooftop view","منظره پشت‌بام"),
    ("a city skyline","خط افق شهر"),
    ("a sunset glow","تابش غروب"),
    ("evening traffic","ترافیک عصر"),
    ("neon lights","چراغ‌های نئونی"),
    ("to take photos","عکس گرفتن"),
    ("a cool breeze","نسیم خنک"),
    ("to unwind after work","بعد از کار ریلکس کردن"),
  ],
  "city-sidewalk": [
    ("a sidewalk cafe","کافه کنار پیاده‌رو"),
    ("outdoor seating","صندلی‌های بیرونی"),
    ("ride a bicycle","دوچرخه‌سواری کردن"),
    ("lock a bike","دوچرخه را قفل کردن"),
    ("order a coffee","قهوه سفارش دادن"),
    ("a busy pedestrian area","محیط شلوغ عابر"),
    ("street atmosphere","حال‌وهوای خیابان"),
    ("to people-watch","مردم را تماشا کردن"),
  ],
  "bus-stop": [
    ("a bus stop","ایستگاه اتوبوس"),
    ("check the timetable","زمان‌بندی را چک کردن"),
    ("wait in line","در صف منتظر ماندن"),
    ("to catch the next bus","به اتوبوس بعدی رسیدن"),
    ("rush-hour crowd","جمعیت ساعت شلوغی"),
    ("arrival time","زمان رسیدن"),
    ("to board the bus","سوار اتوبوس شدن"),
    ("public transit card","کارت حمل‌ونقل عمومی"),
  ],
  "subway-exit": [
    ("a subway station","ایستگاه مترو"),
    ("exit stairs","پله‌های خروج"),
    ("swipe a transit card","کارت را کشیدن"),
    ("an underground tunnel","تونل زیرزمینی"),
    ("commuter flow","رفت‌وآمد مسافران"),
    ("platform signs","تابلوهای سکو"),
    ("to transfer lines","تعویض خط"),
    ("to rush upstairs","سریع بالا رفتن"),
  ],
  "outdoor-cafe": [
    ("an outdoor cafe","کافه روباز"),
    ("a menu board","تابلوی منو"),
    ("order a drink","نوشیدنی سفارش دادن"),
    ("sit at a table","سر میز نشستن"),
    ("friendly service","خدمات دوستانه"),
    ("a bustling street","خیابان پرجنب‌وجوش"),
    ("to take a break","استراحت کوتاه کردن"),
    ("to pay the bill","صورتحساب را پرداخت کردن"),
  ],
  "public-transport": [
    ("a crowded carriage","واگن شلوغ"),
    ("to grab a seat","جا پیدا کردن"),
    ("hold onto a handrail","دستگیره گرفتن"),
    ("an announcement over the speaker","اعلام بلندگو"),
    ("stand near the door","کنار در ایستادن"),
    ("commute home","راهی خانه شدن"),
    ("personal space","حریم شخصی"),
    ("to avoid delays","از تأخیر جلوگیری کردن"),
  ],
  "urban-shopping": [
    ("a shopping street","خیابان خرید"),
    ("store windows","ویترین مغازه‌ها"),
    ("browse the shops","مغازه‌ها را نگاه کردن"),
    ("carry shopping bags","کیسه‌های خرید حمل کردن"),
    ("compare prices","قیمت‌ها را مقایسه کردن"),
    ("a seasonal sale","حراج فصلی"),
    ("make a purchase","خرید انجام دادن"),
    ("a busy marketplace","بازار شلوغ"),
  ],
  "office": [
    ("a work desk","میز کار"),
    ("a computer monitor","مانیتور کامپیوتر"),
    ("check your email","ایمیل را چک کردن"),
    ("review documents","اسناد را مرور کردن"),
    ("take notes","یادداشت برداشتن"),
    ("a busy schedule","برنامه فشرده"),
    ("a video call","تماس ویدیویی"),
    ("meet a deadline","ضرب‌الاجل را رعایت کردن"),
  ],
  "park": [
    ("a public park","پارک عمومی"),
    ("a walking path","مسیر پیاده‌روی"),
    ("sit on a bench","روی نیمکت نشستن"),
    ("leafy trees","درختان پُربرگ"),
    ("go for a stroll","قدم زدن"),
    ("a relaxed pace","سرعت آرام"),
    ("a friendly chat","گپ دوستانه"),
    ("a sunny afternoon","بعدازظهر آفتابی"),
  ],
  "general": [
    ("pay attention","توجه کردن"),
    ("make a decision","تصمیم گرفتن"),
    ("take a deep breath","یک نفس عمیق کشیدن"),
    ("keep an eye on","حواس‌مان به چیزی بودن"),
    ("face a challenge","با چالش روبه‌رو شدن"),
    ("have a good time","خوش گذراندن"),
    ("work as a team","تیمی کار کردن"),
    ("share an idea","یک ایده را به اشتراک گذاشتن"),
  ],
}

def generate_for_lesson(lesson: Dict[str, Any]) -> List[Dict[str, str]]:
    cat = classify(lesson)
    tpl = TEMPLATES.get(cat) or TEMPLATES["general"]
    out = []
    for en, fa in tpl:
        out.append({"id": slugify(en), "en": en, "fa": fa})
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--keep", action="store_true", help="keep existing collocations if already matching generated ids")
    args = ap.parse_args()

    root = Path(__file__).resolve().parents[1]
    lessons_dir = root / "assets" / "data" / "lessons"
    idx_path = root / "assets" / "data" / "collocations_index.json"

    lesson_files = sorted([p for p in lessons_dir.glob("toefl-ax34-*.json")])
    updated = 0
    generated_count = 0
    idx_entries: List[Dict[str, Any]] = []

    for p in lesson_files:
        data = json.loads(p.read_text(encoding="utf-8"))
        lesson_id = data.get("id") or p.stem

        gen = generate_for_lesson(data)
        gen_ids = [x["id"] for x in gen]
        existing = data.get("collocations") if isinstance(data.get("collocations"), list) else []
        existing_ids = [x.get("id") for x in existing if isinstance(x, dict)]

        should_write = True
        if args.keep and existing_ids and existing_ids == gen_ids:
            should_write = False

        if should_write:
            data["collocations"] = gen
            data["updatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00","Z")
            updated += 1
            if not args.dry_run:
                p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        # Build index entries
        for c in (data.get("collocations") or []):
            if not isinstance(c, dict): 
                continue
            en = c.get("en","")
            fa = c.get("fa","")
            idx_entries.append({
                "id": c.get("id") or slugify(en),
                "en": en,
                "fa": fa,
                "lesson": lesson_id,
                "category": classify(data),
            })
            generated_count += 1

    # write index
    idx_obj = {
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),
        "entries": idx_entries,
    }
    if not args.dry_run:
        idx_path.write_text(json.dumps(idx_obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Lessons processed: {len(lesson_files)}")
    print(f"Lessons updated: {updated} (dry_run={args.dry_run})")
    print(f"Index entries: {len(idx_entries)}")
    # quick duplicate report (same id across lessons)
    from collections import Counter
    c = Counter([e["id"] for e in idx_entries])
    dups = sorted([k for k,v in c.items() if v>1])
    print(f"Duplicate IDs (allowed, resolved by lesson+id in UI): {len(dups)}")
    if dups[:10]:
        print("Examples:", ", ".join(dups[:10]))

if __name__ == "__main__":
    main()
