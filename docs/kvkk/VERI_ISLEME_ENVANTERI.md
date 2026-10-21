# KİŞİSEL VERİ İŞLEME VE ENVANTERİ
**Personel Takip Sistemi (Prisma Veritabanı Modelleriyle Birebir Eşleştirilmiş)**  
*Güncellenme Tarihi: 21.10.2026 | Sürüm: v2.6*

---

## 1. Veri Envanteri Özeti
Bu envanter, Personel Takip Sistemi veritabanında yer alan tüm tabloları, barındırdıkları kişisel verileri, KVKK kapsamındaki kategorilerini, işleme amaçlarını ve güvenlik tedbirlerini listeler.

---

## 2. Tablo Bazlı Detaylı Envanter Matrisi

### 2.1. Özlük ve Kimlik Verileri (`Employee`, `EmployeeHistory`)
| Kolon Adı | Veri Tipi | KVKK Veri Kategorisi | Özel Nitelikli mi? | Hukuki Sebep | Saklama Süresi | İmha Yöntemi |
|---|---|---|---|---|---|---|
| `id` | UUID | Teknik Tanımlayıcı | Hayır | m.5/2-c (Sözleşme) | İş ilişkisi + 10 yıl | Fiziksel/Mantıksal Silme |
| `firstName` | String | Kimlik | Hayır | m.5/2-ç (Kanuni zorunluluk) | İş ilişkisi + 10 yıl | Anonimleştirme / Silme |
| `lastName` | String | Kimlik | Hayır | m.5/2-ç | İş ilişkisi + 10 yıl | Anonimleştirme / Silme |
| `nationalId` (TCKN) | String | Kimlik / Hassas | **Hayır (Kanun m.6 sınırlı sayım)** | m.5/2-ç (SGK bildirimi) | İş ilişkisi + 10 yıl | Kriptografik Silme / Şifreli Tutulur |
| `email` | String | İletişim | Hayır | m.5/2-c | İş ilişkisi + 10 yıl | Silme |
| `phone` | String | İletişim | Hayır | m.5/2-c | İş ilişkisi + 10 yıl | Silme |
| `address` | String | İletişim / Lokasyon | Hayır | m.5/2-c | İş ilişkisi + 10 yıl | Silme |
| `birthDate` | DateTime | Kimlik | Hayır | m.5/2-ç (SGK yaş haddi) | İş ilişkisi + 10 yıl | Silme |
| `gender` | Enum | Kimlik | Hayır | m.5/2-ç | İş ilişkisi + 10 yıl | Anonimleştirme |
| `bloodGroup` | String | Sağlık Verisi | **EVET (Özel Nitelikli)** | m.6/3 (İş sağlığı & güvenliği) | İş ilişkisi + 10 yıl | Özel Yetki / Maskeleme |
| `emergencyContact` | JSON/Text | İletişim (3. Kişi) | Hayır | m.5/2-f (Meşru menfaat) | İş akdi bitiminde derhal | Silme |
| `salary` | Decimal | Finansal | Hayır | m.5/2-ç (Bordro/Vergi) | 10 yıl (VUK / TTK) | Silme |
| `iban` | String | Finansal | Hayır | m.5/2-ç (Banka maaş ödemesi)| 10 yıl | Maskeleme / Silme |

---

### 2.2. PDKS ve Giriş-Çıkış (`AttendanceRecord`, `QrCode`, `CardCredential`)
| Kolon Adı | Veri Tipi | KVKK Veri Kategorisi | Özel Nitelikli mi? | Hukuki Sebep | Saklama Süresi | İmha Yöntemi |
|---|---|---|---|---|---|---|
| `timestamp` | DateTime | Çalışma Takibi | Hayır | m.5/2-f, İş Kanunu | 2 Yıl | Periyodik Arşiv / Silme |
| `type` (IN/OUT) | Enum | Devam / Takip | Hayır | 4857 s. İş Kanunu | 2 Yıl | Silme |
| `source` | Enum (QR, CARD, MANUAL) | İşlem Güvenliği | Hayır | 2026/921 Kararı uyumlu | 2 Yıl | Silme |
| `cardNo` / `rfidUid` | String | Fiziksel Güvenlik / Kart | Hayır | m.5/2-f (Bina Güvenliği) | Kart iadesinde derhal | Geçersiz Kılma / Silme |
| `qrToken` | String | Dinamik Belirteç | Hayır | m.5/2-f | 24 Saat (Kısa TTL) | Otomatik Expire |

> **2026/921 Sayılı İlke Kararı Uyumluluğu:**  
> PDKS tablomuzda hiçbir parmak izi, yüz veya retina şablonu yer almaz (`source` değeri sadece `QR`, `CARD`, `MANUAL` ve `PDKS_READER` değerlerini alabilir).

---

### 2.3. İzin ve Mesai (`LeaveRequest`, `Overtime`)
| Kolon Adı | Veri Tipi | KVKK Veri Kategorisi | Özel Nitelikli mi? | Hukuki Sebep | Saklama Süresi | İmha Yöntemi |
|---|---|---|---|---|---|---|
| `leaveTypeId` | UUID | Özlük / İzin | Hayır | 4857 s. İş Kanunu | 5 Yıl | Silme |
| `startDate` / `endDate` | DateTime | Zaman | Hayır | İş Kanunu | 5 Yıl | Silme |
| `reason` (Açıklama) | String | Özel Hayat / Gerekçe | Duruma göre | m.5/2-c (İzin hakkı) | 5 Yıl | Metin Temizleme / Silme |
| `documentUrl` (Rapor) | String | Sağlık / Mazeret | **Rapor ise EVET** | m.6/3 (İstirahat takibi) | Yasal süre sonunda | Güvenli İmha |
| `overtimeHours` | Float | Finans / Çalışma | Hayır | 4857 s. İş Kanunu | 5 Yıl | Silme |

---

### 2.4. Finans, Bordro, Avans ve Prim (`PayrollItem`, `Advance`, `Bonus`)
| Kolon Adı | Veri Tipi | KVKK Veri Kategorisi | Özel Nitelikli mi? | Hukuki Sebep | Saklama Süresi | İmha Yöntemi |
|---|---|---|---|---|---|---|
| `baseSalary` | Decimal | Finansal | Hayır | 4857 s. İş Kanunu, VUK | 10 Yıl | Arşiv / Silme |
| `netAmount` | Decimal | Finansal | Hayır | 4857 s. İş Kanunu, VUK | 10 Yıl | Arşiv / Silme |
| `advanceAmount` | Decimal | Finansal | Hayır | Borçlar Kanunu | 10 Yıl | Silme |
| `bonusAmount` | Decimal | Finansal | Hayır | İş Kanunu | 10 Yıl | Silme |

---

### 2.5. Kullanıcı ve Yetki Yönetimi (`User`, `Role`, `UserRole`)
| Kolon Adı | Veri Tipi | KVKK Veri Kategorisi | Özel Nitelikli mi? | Hukuki Sebep | Saklama Süresi | İmha Yöntemi |
|---|---|---|---|---|---|---|
| `username` / `email` | String | İşlem Güvenliği | Hayır | m.5/2-f | Kullanıcı silindiğinde | Kriptografik Silme |
| `passwordHash` | String | Kimlik Doğrulama | Hayır | m.12 Veri Güvenliği (Argon2id) | Şifre değişiminde | Üzerine Yazma |

---

### 2.6. Denetim İzi ve Güvenlik Logları (`AuditLog`)
| Kolon Adı | Veri Tipi | KVKK Veri Kategorisi | Özel Nitelikli mi? | Hukuki Sebep | Saklama Süresi | İmha Yöntemi |
|---|---|---|---|---|---|---|
| `userId` | UUID | İşlem Güvenliği | Hayır | 5651 s. Kanun | 2 Yıl | Güvenli İmha |
| `action` | String | İşlem Kaydı | Hayır | 5651 s. Kanun | 2 Yıl | Güvenli İmha |
| `targetEntity` | String | Varlık Kaydı | Hayır | KVKK m. 12 | 2 Yıl | Güvenli İmha |
| `ipAddress` | String | Ağ / Güvenlik | Duruma göre | 5651 s. Kanun | 2 Yıl | Maskeleme / Silme |
| `userAgent` | String | Cihaz Bilgisi | Hayır | 5651 s. Kanun | 2 Yıl | Silme |

---

## 3. VERBİS Yükümlülük Değerlendirmesi
* **Kriter:** Yıllık çalışan sayısı 50’den çok veya yıllık mali bilanço toplamı 100 milyon TL’den çok olan veri sorumluları ile ana faaliyet konusu özel nitelikli kişisel veri işleme olanlar için VERBİS kaydı zorunludur.
* **Yenişehir Belediyesi Durumu:** Belediye kamu tüzel kişisi ve çalışan sayısı 50'nin üzerinde olduğu için **VERBİS siciline kayıtlıdır**. Yukarıdaki tablolar VERBİS kategorileriyle birebir uyumludur.
