
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_HOSTS: Record<string, string[]> = {
  "upload.wikimedia.org": ["/wikipedia/commons/"],
  "trthaberstatic.cdn.wp.trt.com.tr": ["/resimler/"],
  "tubitak.gov.tr": ["/sites/default/files/"],
  "www.sincan.bel.tr": ["/"],
  "sincan.bel.tr": ["/"],
  "www.etimesgut.bel.tr": ["/"],
  "etimesgut.bel.tr": ["/"],
  "www.ankara.bel.tr": ["/"],
  "ankara.bel.tr": ["/"],
  "ichef.bbci.co.uk": ["/news/"],
  "images-assets.nasa.gov": ["/image/"]
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

function isUnsafeHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();

  if (host.includes(":")) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (!host.includes(".")) return true;

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

      currentUrl = new URL(location, currentUrl);
      continue;
    }

    return response;
  }

  throw new ProxyError("Görsel kaynağına ulaşılamadı.", 502);
}

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

    // Uint8Array verisini kesin ArrayBuffer biçimine dönüştür.
    const body = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(body).set(bytes);

    return new Response(body, {
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

    console.error("[ULAK görsel] Proxy hatası:", error);
    return jsonError("Görsel yüklenirken hata oluştu.", 500);
  }
}
