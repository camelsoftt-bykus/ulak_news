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
- **Durum:** Claude'dan teknik tasarım bekleniyor.
- **Sorumlu:** Claude.
- **Kapsam:** Hazır `daily.json` üzerinden ziyaretçi deneyimi; yalnızca kontrollü otomasyonla günlük üretim; TTS 429 davranışı; gereksiz tek parça WAV isteğinin kaldırılması; 10 WAV doğrulaması; mevcut arayüzün korunması.
- **İzin:** Salt okunur analiz ve tasarım.
- **Yasak:** Dosya değiştirme, commit/push, deploy, workflow çalıştırma, Gemini/TTS isteği, sır görüntüleme.
- **Kabul kriteri:** Değişecek dosyalar, güvenli yetkilendirme tasarımı, gerekli ortam değişkenleri, uyumluluk riskleri ve Gemini kullanmayan test planı açıkça listelenmeli.

## Koordinatör kararları

- **2026-11-24:** Ücretsiz Gemini kotası dolduğu için kota yenilenene kadar TTS/Gemini testi ve üretim workflow'u çalıştırılmayacak.
- **2026-11-24:** Öncelik, ziyaretçi sayfa açılışının Gemini çağrısı yapmasını önlemek ve API uçlarını kontrollü hale getirmek.
- **2026-11-24:** Claude'un teknik tasarımı incelenmeden uygulama değişikliği başlatılmayacak.

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
