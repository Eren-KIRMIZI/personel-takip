# YURT DIŞINA VERİ AKTARIMI VE 3. TARAF SERVİS MATRİSİ
**Personel Takip Sistemi**  
*2024 KVKK m. 9 Reformu ve 2026 Standart Sözleşme Esasları Uyarınca Hazırlanmıştır*

---

## 1. Yasal Çerçeve (2024 KVKK Değişiklikleri)
12 Mart 2024 tarihli Resmî Gazete'de yayımlanan 7499 sayılı Kanun ile KVKK’nın 9. maddesi yeniden düzenlenmiştir. Buna göre yurt dışına kişisel veri aktarımı:
1. **Yeterlilik Kararı** bulunan ülkelere,
2. Yeterlilik kararı yoksa **Uygun Güvencelerden** birinin sağlanması hâlinde:
   - **Standart Sözleşmeler (Standard Contractual Clauses - SCC)** akdedilmesi (imzadan itibaren 5 iş günü içinde Kurul'a bildirilmesi şartıyla),
   - Bağlayıcı Şirket Kuralları (BCR) onaylanması,
   - Taahhütname ve Kurul izni alınması şartlarıyla yürütülmektedir.

---

## 2. Personel Takip Sistemi Altyapı ve Servis Matrisi

| Servis Sağlayıcı | Veri Kapsamı | Sunucu Bölgesi / Konumu | Aktarım Hukuki Mekanizması | Güvenlik Tedbiri |
|---|---|---|---|---|
| **Supabase Inc.** | PostgreSQL Ana Veritabanı, Personel Özlük, PDKS, İzin | **Frankfurt, Almanya (eu-central-1)** - AB Bölgesi | Standart Sözleşme (SCC / DPA), GDPR Uyumluluğu | TLS 1.3 şifreleme, AES-256 at-rest şifreleme, PgBouncer |
| **Upstash Inc.** | Oturum ID, Roller, Yetki Kümeleri, Kısa süreli önbellek | **Frankfurt (eu-central-1)** | Veri Minimizasyonu (TCKN/Maaş tutulmaz), SCC | Bellek içi şifreleme, Kısa TTL (10dk - 24s) |
| **Vercel Inc.** | Serverless Fonksiyonlar, Statik Kod Dağıtımı | Global Edge / Frankfurt | Standart Sözleşme (DPA), GDPR Uyumlu | TLS 1.3, DDoS koruması, Sıfır log saklama |

---

## 3. Dağıtık Önbellek (Upstash Redis) İçin Veri Minimizasyonu İlkeleri
* **Hassas Veri Yasağı:** Redis önbelleğinde personelin T.C. Kimlik Numarası, Maaş/Bordro detayları, IBAN veya özel nitelikli sağlık verileri **ASLA düz metin (plaintext) olarak saklanmaz**.
* **Yalnızca Referans ve Yetkiler:** Redis üzerinde yalnızca `userId`, `roles`, `permissions` ve genel departman listeleri kısa ömürlü (TTL) anahtarlarla tutulur.
* **Token Geçerliliği:** JWT token'lar iptal edildiğinde Redis kara listesine alınır ve süresi dolduğunda otomatik olarak hafızadan silinir.
