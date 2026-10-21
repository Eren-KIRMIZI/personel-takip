# VERİ İHLALİ MÜDAHALE VE KURULA BİLDİRİM PROSEDÜRÜ
**Personel Takip Sistemi (KVKK m. 12/5 Uyumluluğu)**  
*Yürürlük: 2026*

---

## 1. Yasal Dayanak ve 72 Saat Kuralı
KVKK m. 12/5 ve Kişisel Verileri Koruma Kurulu kararları uyarınca:
> **İşlenen kişisel verilerin kanuni olmayan yollarla başkaları tarafından elde edilmesi hâlinde, veri sorumlusu bu durumu en kısa sürede ve en geç 72 saat içinde Kurul'a bildirir.**  
> Haklı bir gerekçe ile 72 saat içinde bildirim yapılamaması hâlinde, gecikmenin gerekçesi Kurul'a açıklanır.

---

## 2. Olay Müdahale Aşamaları

1. **Tespit ve İzolasyon (0 - 12. Saat):**
   - Şüpheli yetkisiz erişim, veritabanı sızıntısı veya hesap ele geçirme durumunda ilgili oturumlar Upstash Redis ve Supabase üzerinden derhal iptal edilir.
   - Sistem logları (`AuditLog`) koruma altına alınır.

2. **Kapsam ve Risk Değerlendirmesi (12 - 36. Saat):**
   - Hangi tabloların etkilendiği, kaç personelin verisinin risk altında olduğu tespit edilir.
   - Özel nitelikli kişisel veri bulunup bulunmadığı değerlendirilir.

3. **Kurul Bildirimi (36 - 72. Saat):**
   - KVKK Kurumu'nun resmi *Kişisel Veri İhlali Bildirim Formu* doldurularak Kuruma iletilir.

4. **İlgili Kişilere (Çalışanlara) Bildirim:**
   - İhlalden etkilenen personellere sistem bildirimi ve kurumsal e-posta ile şeffaf bilgilendirme yapılır.
