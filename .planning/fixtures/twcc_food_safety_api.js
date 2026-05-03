/**
 * 台智雲 TWCC API — 食品安全分區評分
 * 動態 prompt 建構 + API 呼叫
 *
 * 支援四種資料維度任意組合（共 15 種）：
 *   '課程'     → HACCP + 衛生講習課程數
 *   '檢驗'     → 食品業者檢驗完成率
 *   '癌症篩檢'  → 各類癌症篩檢院所總數
 *   '優良評核'  → 衛生優良評核業者家數
 *
 * 計分原則：每個選取維度正規化為 0~100，再取平均
 *   → 選越多維度不影響排名公平性，ABC = BAC = CBA
 */

// ─── 設定 ────────────────────────────────────────────────────────────────────

const TWCC_API_URL   = 'https://api-ams.twcc.ai/api/models/conversation';
const TWCC_API_TOKEN = '415c2b2b-918c-4364-86ed-40288133fbf7'; // 替換為你的 token
const MODEL          = 'llama3.3-ffm-70b-16k-chat';

// ─── 正規化基準值（從資料集預先計算好，固定不變）────────────────────────────

const NORM_BASE = {
  課程:    { max: 59,       label: 'HACCP + 衛生講習課程總數',     unit: '堂' },
  檢驗:    { max: 16.4557,  label: '食品業者檢驗完成率',            unit: '%'  },
  癌症篩檢: { max: 403,      label: '六項癌症篩檢院所數總和',        unit: '間' },
  優良評核: { max: 307,      label: '衛生優良評核業者家數',           unit: '家' },
};

// ─── 各行政區原始資料 ─────────────────────────────────────────────────────────

const DISTRICT_DATA = [
  // city, district, courses, inspected, total, cancer_clinics, excellent_count
  { city:'新北市', district:'三峽區', courses:0,  insp:330,  total:3063,  cancer:83,  excellent:114 },
  { city:'新北市', district:'三芝區', courses:0,  insp:43,   total:432,   cancer:7,   excellent:0   },
  { city:'新北市', district:'三重區', courses:0,  insp:1021, total:10502, cancer:268, excellent:39  },
  { city:'新北市', district:'中和區', courses:0,  insp:1168, total:11345, cancer:189, excellent:107 },
  { city:'新北市', district:'五股區', courses:4,  insp:357,  total:2281,  cancer:34,  excellent:9   },
  { city:'新北市', district:'八里區', courses:0,  insp:140,  total:1020,  cancer:17,  excellent:1   },
  { city:'新北市', district:'土城區', courses:0,  insp:707,  total:5209,  cancer:168, excellent:30  },
  { city:'新北市', district:'坪林區', courses:0,  insp:7,    total:149,   cancer:3,   excellent:3   },
  { city:'新北市', district:'平溪區', courses:0,  insp:6,    total:158,   cancer:3,   excellent:0   },
  { city:'新北市', district:'新店區', courses:0,  insp:854,  total:6964,  cancer:150, excellent:36  },
  { city:'新北市', district:'新莊區', courses:0,  insp:1082, total:11373, cancer:275, excellent:55  },
  { city:'新北市', district:'板橋區', courses:10, insp:1330, total:14351, cancer:403, excellent:167 },
  { city:'新北市', district:'林口區', courses:0,  insp:406,  total:3584,  cancer:73,  excellent:26  },
  { city:'新北市', district:'樹林區', courses:0,  insp:605,  total:4376,  cancer:85,  excellent:26  },
  { city:'新北市', district:'永和區', courses:0,  insp:407,  total:5987,  cancer:192, excellent:34  },
  { city:'新北市', district:'汐止區', courses:0,  insp:651,  total:5932,  cancer:100, excellent:17  },
  { city:'新北市', district:'泰山區', courses:0,  insp:244,  total:2013,  cancer:45,  excellent:18  },
  { city:'新北市', district:'淡水區', courses:0,  insp:614,  total:5058,  cancer:37,  excellent:15  },
  { city:'新北市', district:'深坑區', courses:0,  insp:90,   total:839,   cancer:14,  excellent:0   },
  { city:'新北市', district:'烏來區', courses:0,  insp:13,   total:79,    cancer:5,   excellent:0   },
  { city:'新北市', district:'瑞芳區', courses:0,  insp:142,  total:1189,  cancer:13,  excellent:3   },
  { city:'新北市', district:'石碇區', courses:0,  insp:27,   total:168,   cancer:3,   excellent:0   },
  { city:'新北市', district:'石門區', courses:0,  insp:19,   total:142,   cancer:3,   excellent:0   },
  { city:'新北市', district:'萬里區', courses:0,  insp:45,   total:442,   cancer:8,   excellent:0   },
  { city:'新北市', district:'蘆洲區', courses:0,  insp:383,  total:4548,  cancer:155, excellent:18  },
  { city:'新北市', district:'貢寮區', courses:0,  insp:15,   total:175,   cancer:4,   excellent:0   },
  { city:'新北市', district:'金山區', courses:0,  insp:45,   total:557,   cancer:7,   excellent:5   },
  { city:'新北市', district:'雙溪區', courses:0,  insp:5,    total:101,   cancer:5,   excellent:0   },
  { city:'新北市', district:'鶯歌區', courses:0,  insp:223,  total:2103,  cancer:32,  excellent:7   },
  { city:'臺北市', district:'中山區', courses:31, insp:1010, total:18213, cancer:114, excellent:222 },
  { city:'臺北市', district:'中正區', courses:59, insp:673,  total:10277, cancer:61,  excellent:120 },
  { city:'臺北市', district:'信義區', courses:0,  insp:729,  total:10418, cancer:84,  excellent:172 },
  { city:'臺北市', district:'內湖區', courses:8,  insp:801,  total:8714,  cancer:125, excellent:125 },
  { city:'臺北市', district:'北投區', courses:0,  insp:500,  total:6026,  cancer:91,  excellent:126 },
  { city:'臺北市', district:'南港區', courses:0,  insp:399,  total:3839,  cancer:32,  excellent:69  },
  { city:'臺北市', district:'士林區', courses:0,  insp:645,  total:9448,  cancer:89,  excellent:196 },
  { city:'臺北市', district:'大同區', courses:0,  insp:354,  total:8383,  cancer:39,  excellent:98  },
  { city:'臺北市', district:'大安區', courses:14, insp:929,  total:16322, cancer:130, excellent:307 },
  { city:'臺北市', district:'文山區', courses:4,  insp:509,  total:6169,  cancer:68,  excellent:57  },
  { city:'臺北市', district:'松山區', courses:0,  insp:537,  total:10616, cancer:74,  excellent:126 },
  { city:'臺北市', district:'萬華區', courses:0,  insp:414,  total:14214, cancer:71,  excellent:59  },
];

// ─── 核心：正規化每筆資料 ────────────────────────────────────────────────────

function normalizeDistricts(data) {
  return data.map(d => ({
    city:     d.city,
    district: d.district,
    scores: {
      課程:    parseFloat(( d.courses              / NORM_BASE['課程'].max    * 100).toFixed(2)),
      檢驗:    parseFloat(( d.insp / d.total * 100 / NORM_BASE['檢驗'].max    * 100).toFixed(2)),
      癌症篩檢: parseFloat(( d.cancer               / NORM_BASE['癌症篩檢'].max * 100).toFixed(2)),
      優良評核: parseFloat(( d.excellent            / NORM_BASE['優良評核'].max * 100).toFixed(2)),
    }
  }));
}

// ─── 動態 Prompt 建構 ─────────────────────────────────────────────────────────

/**
 * @param {string[]} selectedTypes  例如 ['課程', '檢驗']，順序不影響結果
 * @returns {{ system: string, user: string }}
 */
function buildPrompt(selectedTypes) {
  // 去重 + 排序（確保 ABC = CBA）
  const types = [...new Set(selectedTypes)].sort();
  const n = types.length;
  const weight = parseFloat((100 / n).toFixed(4));

  // 正規化各區分數
  const normalized = normalizeDistricts(DISTRICT_DATA);

  // 計算每區在選取維度的 pre-score，傳給 LLM 只需排序+加總
  const preScored = normalized.map(d => {
    const breakdown = {};
    types.forEach(t => { breakdown[t] = d.scores[t]; });
    const total = parseFloat(
      (types.reduce((sum, t) => sum + d.scores[t], 0) / n).toFixed(2)
    );
    return { city: d.city, district: d.district, breakdown, total };
  });

  // 建構資料區塊給 LLM（已預算好，請 LLM 排序）
  const dataBlock = preScored
    .map(d => {
      const parts = types.map(t => `${t}=${d.breakdown[t]}`).join('、');
      return `${d.city}${d.district}：${parts}、total=${d.total}`;
    })
    .join('\n');

  const formulaDesc = types
    .map(t => `- ${t}（${NORM_BASE[t].label}）：已正規化為 0~100 分，權重 ${weight} 分（佔 ${(100/n).toFixed(1)}%）`)
    .join('\n');

  const system = `你是一個資料排序助手。你只能輸出純 JSON 格式，不能有任何其他文字、說明、markdown、代碼塊符號（不能有 \`\`\`）。`;

  const user =
`以下各行政區的分數已預先計算完畢，請直接依照 total 欄位由高到低排序後輸出純 JSON。

【本次選取維度（共 ${n} 項，各佔 ${weight} 分）】
${formulaDesc}
【計分規則】
- 每個維度已正規化為 0~100 後取平均，total = (${types.join(' + ')}) ÷ ${n}
- 直接使用下方 total 值排序，不需重新計算

【各行政區預算分數】
${dataBlock}

【輸出格式】（key = 城市+區名，value = total 分數）
{"臺北市中正區": 63.88, "新北市板橋區": 40.57, ...}

請按 total 由高到低排序，輸出完整 41 個行政區，只輸出 JSON。`;

  return { system, user };
}

// ─── API 呼叫 ─────────────────────────────────────────────────────────────────

/**
 * 呼叫台智雲 API，回傳排序後的分數物件
 * @param {string[]} selectedTypes  例如 ['課程', '癌症篩檢']
 * @returns {Promise<Object>}  { "臺北市中正區": 63.88, ... }
 */
async function callFoodSafetyScore(selectedTypes) {
  const { system, user } = buildPrompt(selectedTypes);

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user',   content: user   },
    ],
    parameters: {
      max_new_tokens: 2000,
      temperature:    0.1,
      top_k:          50,
      top_p:          1,
      frequence_penalty: 1,
    },
  };

  const response = await fetch(TWCC_API_URL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${TWCC_API_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`TWCC API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // 取出模型回傳的文字
  const raw = data?.choices?.[0]?.message?.content
           || data?.message?.content
           || data?.content
           || '';

  // 安全解析 JSON（去除可能的 markdown 殘留）
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

// ─── 使用範例 ─────────────────────────────────────────────────────────────────

// 範例 1：單一維度
callFoodSafetyScore(['課程'])
  .then(result => console.log('課程排名:', result))
  .catch(console.error);

// 範例 2：兩個維度（ABC = BAC，順序不影響）
callFoodSafetyScore(['檢驗', '癌症篩檢'])
  .then(result => console.log('檢驗+癌症篩檢排名:', result))
  .catch(console.error);

// 範例 3：全部四個維度
callFoodSafetyScore(['課程', '檢驗', '癌症篩檢', '優良評核'])
  .then(result => console.log('綜合排名:', result))
  .catch(console.error);

// ─── 前端整合範例（React / Vue 皆適用）────────────────────────────────────────
/*
  // 使用者在 UI 勾選維度後：
  const selected = ['課程', '優良評核'];   // 來自 checkbox state

  setLoading(true);
  const scores = await callFoodSafetyScore(selected);
  // scores = { "臺北市大安區": 72.3, "新北市板橋區": 65.1, ... }

  const ranked = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .map(([name, score], i) => ({ rank: i + 1, name, score }));

  setRanking(ranked);
  setLoading(false);
*/

module.exports = { callFoodSafetyScore, buildPrompt, DISTRICT_DATA, NORM_BASE };
