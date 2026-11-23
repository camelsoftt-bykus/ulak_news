export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_HOSTS = [
  "upload.wikimedia.org",
  "trt.com.tr",
  "tubitak.gov.tr",
  "sincan.bel.tr",
  "bbc.com",
  "bbc.co.uk",
  "bbci.co.uk",
  "aa.com.tr",
  "ntv.com.tr",
  "hurriyet.com.tr",
  "sozcu.com.tr",
  "cumhuriyet.com.tr",
  "haberturk.com",
  "haberler.com",
  "dw.com",
  "nasa.gov",
  "esa.int",
  "theguardian.com",
  "reuters.com",
  "apnews.com",
  "ap.org"
];

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_REDIRECTS = 4;

function isAllowedUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();

  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    !url.port &&
    ALLOWED_HOSTS.some(
      (allowed) => host === allowed || host.endsWith("." + allowed)
    )
  );
}

async function fetchImage(initialUrl: URL): Promise<Response> {
  let currentUrl = initialUrl;

  for (let attempt = 0; attempt <= MAX_REDIRECTS; attempt++) {
    if (!isAllowedUrl(currentUrl)) {
      throw new Error("Görsel yönlendirmesi izin verilmeyen bir adrese gidiyor.");
    }

    const response = await fetch(currentUrl.toString(), {
      headers: {
        "User-Agent": "ULAK-News/1.0",
        "Accept": "image/avif,image/webp,image/png,image/jpeg,image/*"
      },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
      redirect: "manual"
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");

      if (!location || attempt === MAX_REDIRECTS) {
        throw new Error("Görsel yönlendirme sınırına ulaşıldı.");
      }

      currentUrl = new URL(location, currentUrl);

      if (!isAllowedUrl(currentUrl)) {
        throw new Error("Görsel yönlendirme adresine izin verilmiyor.");
      }

      continue;
    }

    return response;
  }

  throw new Error("Görsel alınamadı.");
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const imageUrl = requestUrl.searchParams.get("url");

    if (!imageUrl) {
      return Response.json(
        { error: "Görsel adresi eksik." },
        { status: 400 }
      );
    }

    let parsed: URL;

    try {
      parsed = new URL(imageUrl);
    } catch {
      return Response.json(
        { error: "Görsel adresi geçersiz." },
        { status: 400 }
      );
    }

    if (!isAllowedUrl(parsed)) {
      return Response.json(
        { error: "Bu görsel kaynağına izin verilmiyor." },
        { status: 403 }
      );
    }

    const upstream = await fetchImage(parsed);

    if (!upstream.ok) {
      return Response.json(
        {
          error: "Görsel kaynağına ulaşılamadı.",
          upstreamStatus: upstream.status
        },
        { status: 502 }
      );
    }

    const contentType =
      upstream.headers.get("content-type")?.split(";")[0].toLowerCase() || "";

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "image/gif"
    ];

    if (!allowedTypes.includes(contentType)) {
      return Response.json(
        {
          error: "Desteklenmeyen görsel biçimi.",
          contentType
        },
        { status: 415 }
      );
    }

    const declaredSize = Number(
      upstream.headers.get("content-length") || 0
    );

    if (declaredSize > MAX_IMAGE_SIZE) {
      return Response.json(
        { error: "Görsel dosyası çok büyük." },
        { status: 413 }
      );
    }

    const image = await upstream.arrayBuffer();

    if (image.byteLength === 0 || image.byteLength > MAX_IMAGE_SIZE) {
      return Response.json(
        { error: "Görsel boyutu uygun değil." },
        { status: 413 }
      );
    }

    return new Response(image, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(image.byteLength),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    console.error("ULAK görsel sunucu hatası:", error);

    return Response.json(
      {
        error: "Görsel yüklenirken hata oluştu.",
        detail: error instanceof Error ? error.message : "Bilinmeyen hata"
      },
      { status: 500 }
    );
  }
}
 
