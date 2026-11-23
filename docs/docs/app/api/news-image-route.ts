
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_HOST = "upload.wikimedia.org";
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

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

    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== ALLOWED_HOST ||
      !parsed.pathname.startsWith("/wikipedia/commons/")
    ) {
      return Response.json(
        { error: "Bu görsel kaynağına izin verilmiyor." },
        { status: 403 }
      );
    }

    const upstream = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "ULAK-News/1.0"
      },
      signal: AbortSignal.timeout(15000),
      cache: "no-store"
    });

    if (!upstream.ok) {
      return Response.json(
        { error: "Görsel kaynağına ulaşılamadı." },
        { status: 502 }
      );
    }

    const contentType =
      upstream.headers.get("content-type")?.split(";")[0] || "";

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(contentType)
    ) {
      return Response.json(
        { error: "Desteklenmeyen görsel biçimi." },
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
        "X-Content-Type-Options": "nosniff"
      }
    });

  } catch (error) {
    console.error("ULAK görsel sunucu hatası:", error);

    return Response.json(
      { error: "Görsel yüklenirken hata oluştu." },
      { status: 500 }
    );
  }
}
