#!/usr/bin/env python3
"""
generate_pyqs.py

Run locally to generate synthetic/paraphrased PYQ JSON files for:
 - jee_main_2010.json ... jee_main_2025.json
 - jee_adv_2010.json ... jee_adv_2025.json
 - mhtcet_2010.json ... mhtcet_2025.json

Also creates manifest files:
 - questions/jee_main_manifest.json
 - questions/jee_adv_manifest.json
 - questions/mhtcet_manifest.json

USAGE:
  python tools/generate_pyqs.py
After run, commit the generated 'questions/' folder to your repo.
"""

import json, os
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "questions"
OUT.mkdir(parents=True, exist_ok=True)

EXAMS = [
    ("jee_main", "JEE Main"),
    ("jee_adv", "JEE Advanced"),
    ("mhtcet", "MHT-CET"),
]

YEARS = list(range(2010, 2026))  # 2010..2025 inclusive

# A small pool of template questions to vary wording
TEMPLATES = [
    ("Find the number of moles when {vol} L of an ideal gas is measured at STP.",
     "STP पर {vol} L आदर्श गैस में मोलों की संख्या ज्ञात करें।"),
    ("What is the y-intercept of the line y = {a}x + {b}?",
     "रेखा y = {a}x + {b} का y-अवरोधक क्या है?"),
    ("A {m} kg block is pulled by {f} N on a frictionless surface. Find acceleration.",
     "घर्षण-रहित सतह पर {m} kg ब्लॉक पर {f} N बल लगाया जाता है। त्वरण ज्ञात करें।"),
    ("Evaluate the definite integral ∫₀¹ {expr} dx.",
     "परिभाषित समाकलन ∫₀¹ {expr} dx का मान निकालिए।"),
    ("If AP starts at {a} with difference {d}, find the 10th term.",
     "यदि ए.पी. का पहला पद {a} और अंतर {d} हो, तो 10वाँ पद क्या होगा?"),
    ("Which of the following is a strong electrolyte?",
     "निम्न में से कौन-सा एक प्रबल विद्युत अपघट्य है?")
]

OPTIONS_POOL = [
    ["0.25 mol","0.5 mol","1.0 mol","2.0 mol"],
    ["(0,-3)","(0,2)","(0,3)","(3,0)"],
    ["2 m/s^2","5 m/s^2","10 m/s^2","0.2 m/s^2"],
    ["0","1","2","3"],
    ["19","20","21","22"],
    ["Glucose","CH3COOH","NaCl","NH3"]
]

def make_q(idn, templ):
    import random
    (en_tpl, hi_tpl) = templ
    # random params
    vol = random.choice([11.2,22.4])
    a = random.choice([2,3,-1])
    b = random.choice([3,-3,0])
    m = random.choice([1,2,3])
    f = random.choice([10,20,5])
    expr = random.choice(["2*x","x**2 + 1","3*x"])
    a1 = random.choice([3])
    d = random.choice([2])
    en = en_tpl.format(vol=vol,a=a,b=b,m=m,f=f,expr=expr,a1=a1,d=d)
    hi = hi_tpl.format(vol=vol,a=a,b=b,m=m,f=f,expr=expr,a1=a1,d=d)
    opts = OPTIONS_POOL[idn % len(OPTIONS_POOL)]
    answer = 1 if "0.5" in opts[1] or "1.0" in opts[1] else 2 if idn%3==2 else 0
    if isinstance(answer, int):
        ans = answer
    else:
        ans = 1
    return {
        "id": f"q{idn:03}",
        "type": "single",
        "text": {"en": en, "hi": hi},
        "options": {"en": opts, "hi": opts},
        "answer": ans,
        "marks": 4,
        "negative": -1,
        "tags": ["general"]
    }

def generate_for_exam(exam_key, exam_name):
    files = {}
    for year in YEARS:
        qs = []
        # create 12 sample questions per year
        for i in range(12):
            templ = TEMPLATES[i % len(TEMPLATES)]
            qobj = make_q(i+1, templ)
            # small uniqueness tweak: append year to text to make distinct
            qobj["text"]["en"] += f" (Year {year})"
            qobj["text"]["hi"] += f" (वर्ष {year})"
            qs.append(qobj)
        filename = f"{exam_key}_{year}.json"
        out = {
            "meta": {
                "exam": exam_name,
                "exam_key": exam_key,
                "year": year,
                "paper": "PYQs",
                "duration_min": 60
            },
            "questions": qs
        }
        with open(OUT / filename, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        files[filename] = {"year": year, "file": filename}
    # manifest
    manifest = {
        "exam": exam_name,
        "exam_key": exam_key,
        "years": YEARS,
        "files": { f"{exam_key}_{y}.json": f"{exam_key}_{y}.json" for y in YEARS }
    }
    with open(OUT / f"{exam_key}_manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"Generated {exam_key} files for years {YEARS[0]}..{YEARS[-1]}")

if __name__ == "__main__":
    for ek, en in EXAMS:
        generate_for_exam(ek, en)
    print("All done. Created question JSON files in:", OUT)

