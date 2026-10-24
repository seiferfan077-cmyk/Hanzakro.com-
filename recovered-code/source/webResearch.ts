export type WebResearchSource = { title: string; url: string; snippet: string; content: string; official: boolean };
export type WebResearchResult = { query: string; sources: WebResearchSource[]; requiredSources: number };
export type WebResearchOptions = { minimumSources?: number; purpose?: "answer" | "exam" };
export const LOAY_RESEARCH_MINIMUM_SOURCES = 20;
export const LOAY_EXAM_RESEARCH_MINIMUM_SOURCES = 30;

const officialDomains = ["moe.gov.eg", "emis.gov.eg", ".gov.eg", ".edu.eg", ".edu"];

export function needsWebResearch(question: string) {
  return /(اليوم|حديث|أحدث|رسمي|وزارة|منهج|قرار|نتيجة|موقع|لائحة|تحديث|٢٠\d\d|202\d)/.test(question);
}

function isOfficial(url: string) {
  try { const host = new URL(url).hostname.toLowerCase(); return officialDomains.some(domain => host === domain || host.endsWith(domain)); }
  catch { return false; }
}

async function tavily(path: "search" | "extract", body: Record<string, unknown>) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error("بحث الويب مش متجهز دلوقتي.");
  const response = await fetch(`https://api.tavily.com/${path}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error("بحث الويب مش متاح دلوقتي. جرّب تاني كمان شوية.");
  return response.json() as Promise<Record<string, unknown>>;
}

function sourceKey(url: string) { try { const parsed = new URL(url); return `${parsed.hostname.toLowerCase()}${parsed.pathname.replace(/\/$/, "").toLowerCase()}`; } catch { return url.toLowerCase(); } }
function researchQueries(query: string, count: number) { const suffixes = ["", "شرح ومراجعة موثوقة", "أمثلة وتدريبات تعليمية", "ملخص وأسئلة مراجعة", "تطبيقات وتمارين محلولة", "مراجعة امتحانات ومصادر تعليمية"]; return suffixes.slice(0, Math.min(suffixes.length, Math.max(4, Math.ceil(count / 10)))).map(suffix => `${query}${suffix ? ` ${suffix}` : ""}`.slice(0, 1800)); }
export async function researchWeb(query: string, options: WebResearchOptions = {}): Promise<WebResearchResult> {
  const requiredSources = Math.max(1, Math.min(options.minimumSources ?? LOAY_RESEARCH_MINIMUM_SOURCES, LOAY_EXAM_RESEARCH_MINIMUM_SOURCES));
  const searches = await Promise.all(researchQueries(query, requiredSources).map(searchQuery => tavily("search", { query: searchQuery, search_depth: "advanced", max_results: 20, topic: "general", include_raw_content: false })));
  const byKey = new Map<string, { title: string; url: string; snippet: string; official: boolean }>();
  searches.flatMap(search => Array.isArray(search.results) ? search.results as Array<Record<string, unknown>> : []).forEach(item => {
    const url = typeof item.url === "string" ? item.url : ""; const title = typeof item.title === "string" ? item.title.trim() : "";
    if (!url || !title || byKey.has(sourceKey(url))) return;
    byKey.set(sourceKey(url), { title, url, snippet: typeof item.content === "string" ? item.content : "", official: isOfficial(url) });
  });
  const candidates = Array.from(byKey.values()).sort((left, right) => Number(right.official) - Number(left.official)).slice(0, requiredSources);
  if (candidates.length < requiredSources) throw new Error(`لؤي لقى ${candidates.length} مصدر موثوق فقط من أصل ${requiredSources} مطلوبين. جرّب عنوان درس أدق أو أضف صورة/مصدر أوضح.`);
  const extractedBatches = await Promise.all(Array.from({ length: Math.ceil(candidates.length / 10) }, (_, index) => tavily("extract", { urls: candidates.slice(index * 10, index * 10 + 10).map(source => source.url), format: "markdown", extract_depth: "basic" })));
  const pages = extractedBatches.flatMap(extracted => Array.isArray(extracted.results) ? extracted.results as Array<Record<string, unknown>> : []);
  const byUrl = new Map(pages.map(page => [typeof page.url === "string" ? page.url : "", typeof page.raw_content === "string" ? page.raw_content : typeof page.content === "string" ? page.content : ""]));
  return { query, requiredSources, sources: candidates.map(source => ({ ...source, content: (byUrl.get(source.url) || source.snippet).slice(0, 2200) })) };
}
