# ULAK AI Koordinasyon Defteri

Bu dosya ULAK projesinde ChatGPT ve Claude arasındaki ortak, kalıcı çalışma alanıdır. Canlı sohbet veya anlık bildirim kanalı değildir; taraflar dosyayı okuyup güncelleyerek asenkron haberleşir.

## Roller ve karar yetkisi

- **ChatGPT – Koordinatör / güvenlik sorumlusu:** İşleri önceliklendirir, kapsamı belirler, güvenlik sınırlarını koyar, Claude'un önerilerini ve kod değişikliklerini bağımsız inceler. Üretime alma ve sonraki görevi başlatma kararını verir.
- **Claude – Uygulama mühendisi / ikinci inceleyici:** Atanmış görevleri analiz eder, çözüm tasarlar, onaylanan kapsamda kod yazar ve test eder. Kapsam dışına çıkmaz; riskleri ve doğrulama sonuçlarını bu dosyaya kaydeder.
- **Proje sahibi:** Bu çalışma düzenini ve gerektiğinde yetki kapsamını değiştirebilir.

## Değişmez güvenlik kuralları

1. API anahtarları, tokenlar, cookie'ler, kişisel veriler veya diğer sırlar bu dosyaya ya da commit mesajlarına yazılmaz. Sırlar görüntülenmez veya kopyalanmaz.
2. Gemini/TTS kotası tüketen istekler, ücretli servisler, faturalandırma ve model/plan ayarları koordinatörün açık onayı olmadan değiştirilmez veya çalıştırılmaz.
3. Günlük üretim workflow'u, manuel workflow tetiklemesi, yayın/deploy, production veri değişikliği ve geri döndürmesi zor işlemler koordinatörün açık onayı olmadan yapılmaz.
4. Claude yalnızca atanmış görev ve dosya kapsamındaki değişiklikleri yapar. Kapsam genişletme ihtiyacını önce bu dosyaya yazar ve onay bekler.
5. Aynı dosyada eşzamanlı düzenleme yapılmaz. Bir dosyanın aktif sahibi görev kaydında belirtilir.
6. Her değişiklik küçük ve ayrı commit olmalı; test edilmemiş sonuç başarılı diye raporlanmamalıdır.
7. Güvenlik şüphesi doğrulanmış açık gibi sunulmaz. Kanıt, varsayım ve öneri birbirinden ayrılır.
8. Üretim güvenliği veya kullanıcı verisi açısından acil risk görülürse yeni değişiklik yapılmadan koordinatöre bildirilir.

## Çalışma akışı

1. ChatGPT, aşağıdaki **Aktif görevler** bölümüne görev, kapsam, dosyalar, kabul kriterleri ve yetki sınırlarını yazar.
2. Claude önce dosyayı ve ilgili kodu okur; görev açıkça uygulama yetkisi vermiyorsa yalnızca plan/inceleme sunar.
3. Uygulama yetkisi verildiyse Claude değişiklikleri yapar, testleri çalıştırır ve commit SHA/PR bağlantısı ile sonuçları kaydeder. Deploy veya üretim workflow'u başlatmaz.
4. ChatGPT değişiklikleri bağımsız inceler, test kanıtını kontrol eder ve kabul/ret/düzeltme kararını **Koordinatör kararları** bölümüne yazar.
5. Claude ve ChatGPT bu dosyayı güncellerken en son commit'i kontrol eder; eski içeriği körlemesine geri yazmazlar.

## Aktif görevler

### G-001 – API güvenliği ve Gemini tüketimini azaltma tasarımı
- **Durum:** Claude tasarım raporu alındı; koordinatör incelemesi tamamlandı. Uygulama öncesi tasarım düzeltmesi bekleniyor.
- **Sorumlu:** Claude (tasarım revizyonu); ChatGPT (bağımsız doğrulama ve uygulama koordinasyonu).
- **Kapsam:** Hazır `daily.json` üzerinden ziyaretçi deneyimi; yalnızca kontrollü otomasyonla günlük üretim; TTS 429 davranışı; gereksiz tek parça WAV isteğinin kaldırılması; 10 WAV hedefinin netleştirilmesi; mevcut arayüzün korunması.
- **İzin:** Şimdilik salt okunur analiz ve tasarım revizyonu.
- **Yasak:** Dosya değiştirme, commit/push, deploy, workflow çalıştırma, Gemini/TTS isteği, sır görüntüleme.
- **Kabul kriteri:** Değişecek dosyalar, güvenli yetkilendirme tasarımı, gerekli ortam değişkenleri, uyumluluk riskleri, Gemini kullanmayan test planı ve güvenli geçiş sırası açıkça listelenmeli.

## Koordinatör kararları

- **2026-11-24:** Ücretsiz Gemini kotası dolduğu için kota yenilenene kadar TTS/Gemini testi ve üretim workflow'u çalıştırılmayacak.
- **2026-11-24:** Öncelik, ziyaretçi sayfa açılışının Gemini çağrısı yapmasını önlemek ve API uçlarını kontrollü hale getirmek.
- **2026-11-24:** Claude'un teknik tasarımı incelenmeden uygulama değişikliği başlatılmayacak.
- **2026-11-24:** API yetkilendirmesi geçiş planının sonuna bırakılmayacak. Workflow yeni kimlik doğrulama yöntemiyle hazır olmadan public uçlar kapatılmayacak.
- **2026-11-24:** Workflow'un `push.paths` listesi `animasyon.html` ve API dosyalarını içeriyor. Bu dosyalara push, günlük Gemini üretimini tetikleyebilir. Kod değişikliğinden önce bu otomatik tetiklenme güvenli biçimde devre dışı bırakılmalı veya kontrollü hale getirilmeli.
- **2026-11-24:** Mevcut `daily.json` örneğinde 3 haber ve 5 `speechSegments` (intro + 3 story + closing) bulunuyor. Workflow sabit 10 WAV değil, dinamik olarak `speechSegments.length` kadar WAV üretiyor. Tam 10 segment gereksinimi korunacaksa sunum üretim kuralı da bunu garanti etmeli; yalnızca dosya sayısı kontrolü yeterli değil.
- **2026-11-24:** `render-video.mjs` zaten segment/metin sayısı eşleşmesini, dosya varlığını/boş olmamasını ve ffprobe ile pozitif süreyi kontrol ediyor. Bu mevcut korumalar korunmalı ve eksik kontroller tamamlanmalı.
- **2026-11-24:** `animasyon.html` içindeki haberleri seslendir düğmesi, mevcut kodda her segment için `/api/tts` çağırıyor. Statik haber yüklemesine ek olarak hazır WAV segmentlerini statik dosyalardan oynatma yolu tasarlanmalı; aksi hâlde kullanıcı tıklaması Gemini tüketmeye devam eder.
- **2026-11-24:** TTS rotası Google sağlayıcısının HTTP 429 yanıtını şu an dışarıya HTTP 502 olarak döndürüyor. Workflow 502'yi tekrar denenebilir kabul ediyor. Kota hatası için açık 429/QUOTA_EXCEEDED davranışı ve presenter tarafında da kota hatasında tekrar etmeme kuralı gerekli.
- **2026-11-24:** Kota tükenmesinin ziyaretçi trafiğinden kaynaklandığı kanıtlanmış değildir. Ziyaretçi ve public API çağrıları risk ve olası tüketim kaynağıdır; kök neden miktarı olarak sunulmamalıdır.
- **2026-11-24:** Claude'un G-001 raporu, sohbet içinde paylaşılan eski kod ve loglara dayalıdır. Aşağıdaki güncel dosya SHA'ları GitHub'dan bağımsız olarak okundu; henüz çalışma zamanı testi yapılmadı.

## Güncel depo kontrolü (2026-11-24)

- `docs/docs/public/animasyon.html` — `bf94c0545a987c3bcf68c7b861706d7c64499f25`
- `docs/docs/app/api/presenter/route.ts` — `4e50f96045d30fe1e3a790d203383f7f0a869479`
- `docs/docs/app/api/tts/route.ts` — `502cee888393456a115e3bbd9987abea765d6da2`
- `.github/workflows/daily-news.yml` — `6fdcdc562656c6935abd127e88dc7c25df576a30`
- `docs/docs/public/data/daily.json` — `1dfbe56dcd85aff9a90948d3d1a7918654da9e10`
- `docs/docs/scripts/render-video.mjs` — `d355ec70ac70a69e756a86bf56b3606c72387078`

## Claude – görev yanıtı şablonu

Her görev yanıtını şu başlıklarla ekle:
- **Görev / durum**
- **İncelenen dosyalar**
- **Bulgular ve kanıt**
- **Önerilen değişiklikler**
- **Güvenlik ve geriye dönük uyumluluk riskleri**
- **Çalıştırılan testler ve gerçek sonuçları**
- **Değiştirilen dosyalar**
- **Commit / PR bağlantısı** (varsa)
- **Koordinatörden beklenen karar**

## İş günlüğü

- **2026-11-24 – Başlangıç:** Ortak koordinasyon dosyası oluşturuldu. Bu dosyanın kendisi günlük haber workflow'unu tetiklemek üzere tanımlı bir kaynak dosya değildir. İlk aktif görev G-001 salt okunur tasarımdır.
- **2026-11-24 – G-001 tasarım incelemesi:** Claude raporu alındı. ChatGPT güncel GitHub dosyalarını tekrar okudu ve yukarıdaki ek riskleri/uygulama koşullarını kaydetti. Henüz uygulama kodu değiştirilmedi; Gemini/TTS çağrısı veya workflow tetiklemesi yapılmadı.


## G-001 revizyon değerlendirmesi (2026-11-24)

Claude'un ikinci tasarım revizyonu genel olarak kabul edilebilir; uygulamaya geçmeden önce aşağıdaki kararlar ve düzeltmeler zorunludur:

1. **Günlük üretim workflow'u:** Kod dosyası push'ları Gemini/TTS üretimini tetiklememeli. Günlük üretim workflow'undan `push` tetikleyicisi kaldırılmalı; ayrı CI yalnızca Gemini/TTS kullanmayan kontrolleri çalıştırmalı. `workflow_dispatch` onay girdisi ek bir emniyet katmanıdır, tek başına erişim kontrolü değildir.
2. **Secret geçişi:** `?admin=1` gibi URL parametreleri yetkilendirme değildir ve hiçbir zaman secret yerine kullanılamaz. TTS üretimi tarayıcıdan kaldırılmalı; yalnızca GitHub Actions, Vercel'deki eşleşen gizli anahtarla sunucu uçlarını çağırmalı. Önce Vercel ve GitHub secret kurulumu, ardından workflow'un header göndermesi, sonra endpoint zorunlu doğrulaması kontrollü tek geçiş planında yapılmalı. Public uçları günlerce açık bırakıp ölçüm beklemek önerilmiyor.
3. **10 WAV kararı:** Proje hedefi tam 10 ses dosyasıdır; bu, 10 haber demek değildir. Önerilen bülten yapısı 8 haber + açılış + kapanış = 10 `speechSegments` ve 10 WAV. Presenter 8 geçerli haber üretemezse eksik bülten yayımlanmamalı; işlem durmalı. Bu sayı uygulama öncesi proje sahibi tarafından teyit edilmelidir.
4. **Statik ses oynatma:** Ziyaretçi tarafı `daily.json` ve üretilmiş `seg-00.wav` … `seg-09.wav` dosyalarını statik URL'lerden yüklemeli. Tarayıcıda `/api/tts` çağrısı kalmamalı; hazır ses bulunmuyorsa açık durum mesajı gösterilmeli.
5. **Kota yönetimi:** Presenter ve TTS sağlayıcısındaki 429/RESOURCE_EXHAUSTED, dış API'de ayırt edilebilir kota hata koduyla dönmeli; workflow aynı çalıştırmada yeniden denememeli, sonraki segmente ve video adımına geçmemeli. 429'un 503'e çevrilmesi ancak workflow'un kota kodunu güvenilir biçimde algılayıp kesin durması sağlanırsa kabul edilebilir; tercih doğrudan 429'dur.
6. **Mevcut video kontrolleri:** `render-video.mjs` içindeki mevcut segment eşleşmesi, dosya varlığı/boş olmama ve ffprobe süre kontrolleri korunmalı. Sadece eksik codec, beklenen segment sayısı, günlük veri tazeliği ve tam 10 dosya kontrolleri eklenmeli; mevcut kontroller kopyalanmamalı.
7. **Kota kök nedeni:** Ziyaretçi trafiğinin kotayı tükettiği kanıtlanmış değildir. Bu mimari değişiklikler, kaynağı kesinleştirmeden gereksiz tüketim riskini azaltma önlemidir.

### Uygulama öncesi karar bekleyen konu
- **Bülten formatı:** 8 haber + açılış + kapanış = 10 WAV. Proje sahibi teyidi alınmadan sabit 8 haber kuralı kodlanmayacak.

### Güvenli uygulama sırası
1. Günlük üretim workflow'undan kod push tetikleyicisini kaldır; Gemini/TTS içermeyen ayrı CI tanımla. Bu değişiklik deploy veya üretim workflow'u çalıştırmadan doğrulanmalı.
2. Presenter/TTS hata yanıtlarını kota hatasını açıkça ayırt edecek şekilde tasarla; workflow kota hatasında durmalı.
3. Workflow'da tek parça WAV yedeğini kaldır/kapalı tut; 10 segment doğrulama kapısını netleştir.
4. Önceden hazırlanmış JSON ve WAV dosyalarını kullanan statik ziyaretçi akışını kur; sayfa yüklenmesi ve ses düğmesi hiçbir TTS/presenter endpoint'ini çağırmamalı.
5. Vercel ve GitHub Actions secret'larını proje sahibi arayüzlerden ekledikten sonra workflow header'ını hazırla; ardından API uçlarında secret zorunluluğunu devreye al.
6. Gemini kullanmayan yerel/mock testleri tamamla. Kota yenilenmeden gerçek üretim testi yapılmaz; gerçek workflow çalıştırması için ayrıca açık onay alınır.

### Uygulama yetkisi
- Bu revizyon yalnızca tasarım incelemesidir. Kod değişikliği için ayrı, dosya kapsamı belirlenmiş görev ve açık yetki gerekir.
- Gemini/TTS çağrısı, production workflow tetiklemesi, deploy, ücretlendirme/model/secret değişikliği koordinatörün ve gerektiğinde proje sahibinin açık onayına tabidir.

- **2026-11-24 – G-001 revizyonu:** Claude'un ikinci raporu incelendi. Yukarıdaki ek kararlar kaydedildi. Kod değişikliği veya workflow çalıştırması yapılmadı.
