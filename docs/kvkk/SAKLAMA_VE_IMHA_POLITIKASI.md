# VERİ SAKLAMA VE İMHA POLİTİKASI
**Personel Takip Sistemi**  
*Yürürlük: 2026 | KVKK Yönetmeliği Uyarınca Hazırlanmıştır*

---

## 1. Amaç ve Kapsam
İşbu Politika, Personel Takip Sistemi veri tabanı ve yedeklerinde tutulan kişisel verilerin saklama sürelerini, saklama amaçlarını ve saklama süresi sona eren kişisel verilerin silinmesi, yok edilmesi veya anonim hale getirilmesine ilişkin usul ve esasları belirler.

---

## 2. Saklama Süreleri Tablosu

| Veri Kategorisi | Veri Türü / Tablo | Dayanak Mevzuat | Saklama Süresi | İmha Eylemi |
|---|---|---|---|---|
| **Özlük Dosyası** | `Employee`, `EmployeeHistory` | 4857 s. İş Kanunu m. 75, 6098 s. TBK m. 146 | **İş akdi bitiminden itibaren 10 yıl** | Anonimleştirme / Silme |
| **Maaş & Bordro** | `PayrollItem`, `Advance`, `Bonus` | 213 s. VUK m. 253, 6102 s. TTK m. 82 | **10 yıl** | Güvenli Kriptografik Silme |
| **İzin & Mazeret** | `LeaveRequest`, `LeaveType` | 4857 s. İş Kanunu | **5 yıl** | Silme |
| **PDKS & Devam** | `AttendanceRecord` | 4857 s. İş Kanunu | **2 yıl** | Toplu İmha / Silme |
| **QR Giriş Kodları** | `QrCode` | Güvenlik Politikası | **24 saat** (Kısa TTL) | Otomatik Expire / Silme |
| **Denetim İzi (Audit)** | `AuditLog` | 5651 s. Kanun, KVKK m. 12 | **2 yıl** | Güvenli Arşiv / Silme |
| **Önbellek (Cache)** | Upstash Redis | Performans Mimarisi | **10 dakika - 24 saat TTL** | Otomatik TTL Tahliye |
| **KVKK Başvuruları** | İlgili kişi talep kayıtları | KVKK Yönetmeliği m. 7 | **3 yıl** | Güvenli Silme |

---

## 3. İmha Yöntemleri
1. **Silme (Deletion):** Verilerin ilgili kullanıcılar için hiçbir şekilde erişilemez ve tekrar kullanılamaz hale getirilmesi (SQL Soft-delete veya fiziksel DELETE).
2. **Yok Etme (Destruction):** Verilerin fiziksel veya manyetik ortamlardan geri dönüştürülemeyecek şekilde silinmesi.
3. **Anonim Hale Getirme (Anonymization):** Verilerin başka verilerle eşleştirilse dahi hiçbir surette kimliği belirli veya belirlenebilir bir gerçek kişiyle ilişkilendirilemeyecek hale getirilmesi (Örn: Raporlama için personelin adı yerine hash atanması).

---

## 4. Periyodik İmha Takvimi
* Kurumumuzda periyodik imha süresi **6 ay** olarak belirlenmiştir.
* Her yılın **Haziran** ve **Aralık** aylarında, saklama süresi dolan kayıtlar `RetentionService` vasıtasıyla taranır ve imha tutanağı (`DataDeletionLog`) oluşturularak kayıt altına alınır.
