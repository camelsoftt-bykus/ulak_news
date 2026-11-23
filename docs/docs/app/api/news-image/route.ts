export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Görsel proxy'si.
 * - Yalnızca tam host adı eşleşmesine izin verir (alt alan adı / wildcard yok).
 * - Her host için izinli yol önekleri tanımlıdır.
 * - Her yönlendirme adımında URL yeniden doğrulanır.
 * - Literal IP adresleri ve yerel/özel hostlar reddedilir.
 * - Hata yanıtları istemciye iç ayrıntı sızdırmaz.
 */

const ALLOWED_HOSTS: Record<string, string[]> = {
  "upload.wikimedia.org": ["/wikipedia/commons/"],
  "trthaberstatic.cdn.wp.trt.com.tr": ["/resimler/"],
  "tubitak.gov.tr": ["/sites/default/files/"]
};

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif"
];

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 15000;

class ProxyError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/* Literal IP adresleri ve yerel hostlar: hiçbir durumda izin verilmez */
function isUnsafeHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();

  if (host.includes(":")) return true; // IPv6 literal
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true; // IPv4 literal
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (!host.includes(".")) return true; // tek parça ad (iç ağ olabilir)

  return false;
}

function isAllowedUrl(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== "443") return false;
  if (isUnsafeHostname(url.hostname)) return false;

  const prefixes = ALLOWED_HOSTS[url.hostname.toLowerCase()];
  if (!prefixes) return false;

  return prefixes.some((prefix) => url.pathname.startsWith(prefix));
}

async function fetchImage(initialUrl: URL): Promise<Response> {
  let currentUrl = initialUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isAllowedUrl(currentUrl)) {
      throw new ProxyError("Bu görsel kaynağına izin verilmiyor.", 403);
    }

    const response = await fetch(currentUrl.toString(), {
      headers: {
        "User-Agent": "ULAK-News/1.0",
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,image/*;q=0.8"
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
      redirect: "manual"
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");

      if (!location || hop === MAX_REDIRECTS) {
        throw new ProxyError("Görsel kaynağına ulaşılamadı.", 502);
      }

      // Yönlendirme adresini mutlak URL'ye çevir; döngü başında yeniden doğrulanır
      currentUrl = new URL(location, currentUrl);
      continue;
    }

    return response;
  }

  throw new ProxyError("Görsel kaynağına ulaşılamadı.", 502);
}

/* Gövdeyi sınırlı okur: limit aşılırsa erken keser, tamamını belleğe almaz */
async function readBodyWithLimit(response: Response): Promise<Uint8Array> {
  if (!response.body) {
    throw new ProxyError("Görsel boş geldi.", 502);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    total += value.byteLength;

    if (total > MAX_IMAGE_SIZE) {
      await reader.cancel();
      throw new ProxyError("Görsel dosyası çok büyük.", 413);
    }

    chunks.push(value);
  }

  if (total === 0) {
    throw new ProxyError("Görsel boş geldi.", 502);
  }

  const out = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return out;
}

function jsonError(message: string, status: number): Response {
  return Response.json(
    { error: message },
    {
      status,
      headers: { "Cache-Control": "no-store" }
    }
  );
}

export async function GET(request: Request) {
  try {
    const imageParam = new URL(request.url).searchParams.get("url");

    if (!imageParam) {
      return jsonError("Görsel adresi eksik.", 400);
    }

    let parsed: URL;

    try {
      parsed = new URL(imageParam);
    } catch {
      return jsonError("Görsel adresi geçersiz.", 400);
    }

    if (!isAllowedUrl(parsed)) {
      return jsonError("Bu görsel kaynağına izin verilmiyor.", 403);
    }

    const upstream = await fetchImage(parsed);

    if (!upstream.ok) {
      return jsonError("Görsel kaynağına ulaşılamadı.", 502);
    }

    const contentType = (upstream.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();

    if (!ALLOWED_TYPES.includes(contentType)) {
      return jsonError("Desteklenmeyen görsel biçimi.", 415);
    }

    const declaredSize = Number(upstream.headers.get("content-length") || 0);

    if (declaredSize > MAX_IMAGE_SIZE) {
      return jsonError("Görsel dosyası çok büyük.", 413);
    }

    const bytes = await readBodyWithLimit(upstream);

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    if (error instanceof ProxyError) {
      return jsonError(error.message, error.status);
    }

    // Ayrıntı yalnızca sunucu loguna yazılır
    console.error("[ULAK görsel] Proxy hatası:", error);
    return jsonError("Görsel yüklenirken hata oluştu.", 500);
  }
}
