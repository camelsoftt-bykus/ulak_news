# ULAK – Günde İki Kez Beş Haberlik Yazılı Bülten

## Karar ve hedef

Proje sahibi onayı: mevcut sesli ve videolu ULAK yayın hattı korunacak. Buna ek olarak ayrı bir yazılı bülten ürünü, her gün Türkiye saatiyle 08.00 ve 20.00'de hazırlanacak ve kullanıcıya bildirimle ulaştırılacak.

- Her baskıda en fazla 5 haber; haber değeri yoksa sayı tamamlanmayacak.
- Her haber: kısa ve net başlık, özet, neden önemli, kaynak bağlantısı ve yayın/güncelleme zamanı.
- Öncelik: Sincan ve Etimesgut, Ankara, Türkiye, siyaset ve dünya, bilim ve uzay.
- Birincil kaynaklar öncelikli; iddialar teyit edilemiyorsa belirsizlik açıkça yazılacak.
- Aynı olay farklı kaynaklarda tek haber olarak birleştirilecek.
- Sabah baskısında yer alan ve anlamlı yeni gelişmesi olmayan haber akşam tekrar edilmeyecek.
- Yalnızca yazılı bülten üretimi mevcut 8 haber + intro + closing ses/video hattını değiştirmeyecek.

## Zaman ve tekrar sözleşmesi

Zamanlama `Europe/Istanbul` saat dilimine sabitlenir; sunucu UTC saatine göre cron hesaplaması tek yerde tanımlanır ve yaz/kış saati etkisi test edilir.

- 08.00 baskısı: son başarılı 20.00 baskısından sonra yayımlanan/yeni anlamlı biçimde güncellenen gelişmeler.
- 20.00 baskısı: aynı gün 08.00 baskısının kapanış zamanından sonra yayımlanan/yeni anlamlı biçimde güncellenen gelişmeler.
- Her baskı, kendi başarılı yayın kimliği ve zaman aralığını kalıcı kaydeder. Başarısız çalıştırma pencereyi ilerletmez.
- Tekrar denetimi yalnızca başlık benzerliğiyle sınırlı kalmaz: normalize URL, olay/konu benzerliği ve önceki baskının hikâye kimliği birlikte değerlendirilir. Yeni gelişme varsa eski haberin güncel sürümü olarak açıkça işaretlenebilir.
- Kaynakta yayın tarihi bulunmayan veya pencere içinde güncellendiği doğrulanamayan kayıt otomatik olarak yeni haber sayılmaz.

## Önerilen mimari

1. **Ayrı veri modeli:** Yazılı baskılar için `digest` kaydı (edition: morning/evening, windowStart/windowEnd, generatedAt, status, stories) ve haber başına source URL, source name, publishedAt/updatedAt, region, verification notes, event key.
2. **Mevcut RSS altyapısını yeniden kullanma:** `collectRssNews` ve `newsSources` aday toplama için değerlendirilecek; mevcut video sunumunun sıralama, sekiz haber ve medya gereksinimleri değiştirilmeden yazılı editoryal seçime özel fonksiyon katmanı kurulacak.
3. **Ayrı editoryal üretim ucu/işlevi:** Yazılı özetler için JSON şeması doğrulaması, kaynak URL allowlist/https kontrolü, tarih penceresi ve en fazla 5 haber kapısı. Var olan `/api/presenter` yan etkileri veya ses/video sözleşmesi bu yeni işlevden çağrılmayacak.
4. **Kalıcı geçmiş:** Sabah/akşam tekrar kontrolü için kalıcı depolama gerekir. Depoda Supabase altyapısının ve şema/migration düzeninin varlığı doğrulanmadan yeni veritabanı varsayılmayacak. Alternatif olarak Git tabanlı JSON arşivi değerlendirilebilir; eşzamanlı çalıştırma ve atomiklik riskleri karşılaştırılacak.
5. **Arayüz:** Ana sayfada mevcut video modülünden ayrı, tarih ve baskı saati belirgin yazılı bülten alanı; her haber için başlık, özet, önem, kaynak bağlantısı. Arşiv erişimi ikinci aşama.
6. **Bildirim:** Önce mevcut PWA/Web Push, kullanıcı oturumu ve abonelik altyapısı keşfedilecek. Yoksa bildirim izni, abonelik saklama, gönderim anahtarı yönetimi ve abonelik iptali ayrı güvenlik işi olarak tasarlanacak. İzin verilmemiş kullanıcıya bildirim gönderilmeyecek; sayfa içi bülten yine erişilebilir olacak.
7. **Zamanlayıcı:** 08.00 ve 20.00 yayınları için ayrı schedule tetikleyicileri. Mevcut `daily-news.yml` ses/video üretim workflow'una dokunulmayacak. Yeni workflow sadece yazılı bülten üretir; Gemini/TTS/video endpoint'lerini çağırmaz.
8. **Güvenli yayın:** Önce aday/preview çıktısı, şema ve kaynak kontrolleri; ardından atomik yayın. Üretim başarısızsa son başarılı yazılı baskı korunur ve pencere ilerletilmez.

## Aşamalar ve kabul ölçütleri

### A. Keşif ve sözleşme
- Auth, veri saklama, PWA/push ve deploy davranışı incelenir.
- RSS kaynaklarının timestamp kalitesi ve yerel kaynak kapsamı mock/örnek veriyle ölçülür.
- Veri şeması, pencere kuralları, tekrar mantığı ve API erişim sınırları belgelenir.

### B. Yazılı editoryal çekirdek
- Mock RSS girdilerinden 0–5 haber seçimi.
- Öncelik, tarih penceresi, URL/olay tekrarları, anlamlı güncelleme ve kaynak alanları test edilir.
- JSON şema doğrulaması başarısızsa yayın oluşturulmaz.

### C. Saklama ve web arayüzü
- Morning/evening baskıları ayrı kimlikle saklanır.
- Yazılı bülten mevcut video/ses alanından bağımsız görünür.
- Boş/başarısız baskı eski başarılı içeriği silmez.

### D. Zamanlama ve bildirim
- Europe/Istanbul 08.00 ve 20.00 schedule doğrulanır.
- Idempotency anahtarı ile aynı baskının iki kez yayımlanması engellenir.
- Web Push yalnızca açık rıza ve geçerli abonelikle gönderilir; bildirim başarısızlığı bülten kaydını kaybettirmez.

### E. Güvenlik ve yayın öncesi doğrulama
- Endpoint'ler yetkisiz dış çağrılara kapalı; sırlar yalnızca güvenli ortam değişkenlerinde.
- RSS içerikleri talimat değil, güvenilmeyen veri olarak ele alınır.
- Prompt injection, kötü amaçlı URL, HTML/XSS, yinelenen cron ve yarım kalan yayın test edilir.
- Gemini/TTS, ücretli servis, gerçek push, workflow tetikleme ve production deploy için ayrı açık onay gerekir.

## Bu PR'ın sınırı

Bu PR planı ve koordinasyon kaydını içerir. Uygulama PR'ı ayrı ve küçük dilimlere bölünecektir. İlk uygulama kapsamı, keşif sonuçlarına göre ayrıca onaylanacaktır. Mevcut sesli/video üretim kodu, `daily-news.yml`, `daily.json`, TTS ve video varlıkları bu plan PR'ında değiştirilmez.

## Bilinen riskler / açık teknik kararlar

- RSS tarih alanları eksik veya güvenilmez olabilir; bu durumda yanlışlıkla yeni haber yayınlamamak için muhafazakâr filtre gerekir.
- "Anlamlı güncelleme"yi belirlemek salt tarih kontrolünden daha zordur; olay kimliği ve içerik değişikliği kanıtı gerekir.
- Web Push/abonelik ve kalıcı veri deposu mevcut uygulamada doğrulanmış değildir.
- GitHub Actions cron dakikası kesin teslim garantisi vermez; 08.00/20.00 hedefi için gecikme toleransı ve tekrar çalıştırma stratejisi gerekir.
- Uygulama ve PR incelemesi tamamlanmadan üretim zamanlaması veya bildirim gönderimi açılmaz.
