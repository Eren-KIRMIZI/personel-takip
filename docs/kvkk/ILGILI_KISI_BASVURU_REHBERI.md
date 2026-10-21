# İLGİLİ KİŞİ BAŞVURU REHBERİ VE TALEPLERİN YÖNETİMİ
**Personel Takip Sistemi (KVKK m. 11 ve 13 Uyumluluğu)**  
*Yürürlük: 2026*

---

## 1. Yasal Dayanak ve 30 Günlük Yasal Cevap Süresi (SLA)
6698 sayılı KVKK’nın 13. maddesi ve *Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ* uyarınca:
> **Veri sorumlusu, ilgili kişi tarafından yapılacak başvuruları etkin, hukuka ve dürüstlük kuralına uygun olarak sonuçlandırmak üzere gerekli her türlü idari ve teknik tedbirleri almakla yükümlüdür.**  
> Talepler, niteliğine göre **en kısa sürede ve en geç otuz (30) gün içinde** sonuçlandırılmalıdır.

---

## 2. Talep Türleri ve Başvuru Sebepleri
1. **Bilgi Alma Talebi (m.11/1-a, b):** Kendisi hakkında kişisel veri işlenip işlenmediğini öğrenme ve işlenmişse buna ilişkin döküm alma.
2. **Amaca Uygunluk Denetimi (m.11/1-c):** Verilerin amacına uygun kullanılıp kullanılmadığını öğrenme.
3. **Aktarılan 3. Kişileri Öğrenme (m.11/1-ç):** Yurt içinde veya yurt dışında verilerin kimlere aktarıldığını sorgulama.
4. **Düzeltme Talebi (m.11/1-d):** Yanlış, eksik veya güncelliğini yitirmiş verilerin düzeltilmesini talep etme.
5. **Silme / Yok Etme Talebi (m.11/1-e):** Kanuni saklama süresi dolmuş veya işleme şartı ortadan kalkmış verilerin imhasını isteme.
6. **İtiraz Talebi (m.11/1-g):** Otomatik analiz neticesinde aleyhte çıkan sonuca itiraz etme.

---

## 3. Dijital Başvuru ve Yaşam Döngüsü

```text
[ÇALIŞAN TALEBİ] ──> (KVKK Merkezi) ──> [PENDING / İNCELENİYOR] 
                                                │
                                    ┌───────────┴───────────┐
                                    ▼                       ▼
                              [DATA_PREPARED]       [RED / GEREKÇELİ]
                                    │
                                    ▼
                         [COMPLETED (Max 30 Gün)]
```

* Sistem içerisinde her talep için benzersiz bir takip numarası üretilir (Örn: `KVKK-2026-004`).
* 30 günlük yasal süre anlık olarak geri sayım sayacıyla (Örn: `Kalan Süre: 24 Gün`) hem çalışanın hem de İK yöneticisinin panelinde gösterilir.
