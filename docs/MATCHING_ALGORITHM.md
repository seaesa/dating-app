# Terdin Date — Thuật Toán Gợi Ý & Chấm Điểm Tương Thích (Matching Algorithm)

Tài liệu này đặc tả chi tiết kiến trúc, logic xử lý và công thức toán học của hệ thống **Gợi ý (Discovery)** và **Chấm điểm tương thích (Match Scoring)** trong nền tảng Terdin Date.

---

## 1. Tổng Quan Kiến Trúc (Architecture Pipeline)

Quy trình gợi ý hồ sơ hoạt động theo mô hình phễu 3 giai đoạn:

```
[ Toàn bộ User trong Database ]
               │
               ▼
┌──────────────────────────────┐
│  GIAI ĐOẠN 1: BỘ LỌC CỨNG     │  Loại trừ tuyệt đối (Nhị phân 0 hoặc 1)
│  (Mutual Hard Filters)       │  Lọc 2 chiều (Mutual Constraint)
└──────────────┬───────────────┘
               │  (Tập ứng viên hợp lệ - Candidates Pool)
               ▼
┌──────────────────────────────┐
│  GIAI ĐOẠN 2: CHẤM ĐIỂM      │  Thang điểm 100
│  (Smart Scoring Engine)      │  Đánh giá mức độ phù hợp và giá trị tương đồng
└──────────────┬───────────────┘
               │  (Danh sách có Score kèm theo)
               ▼
┌──────────────────────────────┐
│  GIAI ĐOẠN 3: XẾP HẠNG & TRỘN│  Sắp xếp theo Score + Độ tươi mới
│  (Ranking & Diversity)       │  Cursor Pagination trả về client
└──────────────────────────────┘
```

---

## 2. Giai Đoạn 1: Bộ Lọc Cứng Hai Chiều (Mutual Hard Filters)

Nguyên tắc cốt lõi: **Hai người chỉ nhìn thấy nhau khi và chỉ khi cả hai cùng thỏa mãn tiêu chí tìm kiếm của nhau.**

Nếu vi phạm bất kỳ điều kiện nào bên dưới $\rightarrow$ **Loại ngay lập tức (Score = 0)**.

### 2.1. Giới tính & Xu hướng tìm kiếm (Gender & Orientation)

- Người dùng $A$ có giới tính $G_A$ và đang tìm $T_A$.
- Người dùng $B$ có giới tính $G_B$ và đang tìm $T_B$.
- **Điều kiện bắt buộc:**
  $$\left( G_B \in T_A \right) \land \left( G_A \in T_B \right)$$

### 2.2. Độ tuổi hai chiều (Mutual Age Range)

- Người dùng $A$ tìm kiếm độ tuổi $[MinAge_A, MaxAge_A]$.
- Người dùng $B$ tìm kiếm độ tuổi $[MinAge_B, MaxAge_B]$.
- **Điều kiện bắt buộc:**
  $$\left( MinAge_A \le Age_B \le MaxAge_A \right) \land \left( MinAge_B \le Age_A \le MaxAge_B \right)$$

### 2.3. Khoảng cách địa lý tối đa (Mutual Max Distance)

- $Distance(A, B)$ là khoảng cách thực tế giữa $A$ và $B$ (tính theo công thức Haversine / MongoDB 2dsphere).
- $MaxDist_A$ và $MaxDist_B$ là bán kính tìm kiếm tối đa của từng người.
- **Điều kiện bắt buộc:**
  $$Distance(A, B) \le \min(MaxDist_A, MaxDist_B)$$

### 2.4. Trạng thái tài khoản & Lịch sử tương tác

- **Trạng thái:** Cả $A$ và $B$ phải có trạng thái tài khoản là `ACTIVE` (đã hoàn tất Onboarding).
- **Lịch sử tương tác:**
  - $A$ chưa từng quẹt (Thích / Bỏ qua) $B$.
  - $A$ và $B$ chưa ghép đôi (chưa Match).
  - Không có quan hệ Chặn (Block) hoặc Báo cáo (Report) giữa $A$ và $B$.

---

## 3. Giai Đoạn 2: Hệ Thống Chấm Điểm Thông Minh (Smart Scoring Engine)

Sau khi vượt qua Bộ lọc cứng, mỗi ứng viên $B$ sẽ được chấm điểm dựa trên thang điểm chuẩn **100 điểm**:

$$\mathbf{TotalScore} = S_{\text{intent}} + S_{\text{lifestyle}} + S_{\text{interests}} + S_{\text{distance}} + S_{\text{activity}}$$

| Thành phần                |        Ký hiệu         | Trọng số tối đa | Mô tả                                           |
| :------------------------ | :--------------------: | :-------------: | :---------------------------------------------- |
| **Mục đích hẹn hò**       |  $S_{\text{intent}}$   |   **25 điểm**   | Độ tương thích về mục tiêu mối quan hệ          |
| **Lối sống & Giá trị**    | $S_{\text{lifestyle}}$ |   **25 điểm**   | Quan điểm sống, tôn giáo, thói quen             |
| **Sở thích tương đồng**   | $S_{\text{interests}}$ |   **25 điểm**   | Mức độ trùng lặp sở thích qua hệ số Jaccard     |
| **Khoảng cách địa lý**    | $S_{\text{distance}}$  |   **15 điểm**   | Ưu tiên các đối tượng ở gần hơn                 |
| **Độ tích cực & Profile** | $S_{\text{activity}}$  |   **10 điểm**   | Độ tươi mới (online gần đây) & chất lượng hồ sơ |
| **TỔNG CỘNG**             |                        |  **100 điểm**   |                                                 |

---

### 3.1. Điểm Mục Đích Hẹn Hò ($S_{\text{intent}}$ — Tối đa 25 điểm)

Hệ thống định nghĩa 4 nhóm mục đích chính:

1. `LONG_TERM`: Tìm kiếm mối quan hệ nghiêm túc / Lâu dài.
2. `SHORT_TERM`: Hẹn hò tìm hiểu / Trải nghiệm nhẹ nhàng.
3. `NEW_FRIENDS`: Tìm bạn mới / Mở rộng mối quan hệ.
4. `NOT_SURE`: Chưa xác định / Tùy duyên.

**Ma trận điểm tương thích giữa A và B:**

| Mục đích của A \ B | `LONG_TERM` | `SHORT_TERM` | `NEW_FRIENDS` | `NOT_SURE` |
| :----------------- | :---------: | :----------: | :-----------: | :--------: |
| **`LONG_TERM`**    |   **25**    |      0       |       5       |     15     |
| **`SHORT_TERM`**   |      0      |    **25**    |      15       |     20     |
| **`NEW_FRIENDS`**  |      5      |      15      |    **25**     |     20     |
| **`NOT_SURE`**     |     15      |      20      |      20       |   **25**   |

- Trùng khớp hoàn toàn $\rightarrow$ **+25 điểm**.
- Tương thích chấp nhận được $\rightarrow$ **+15 đến +20 điểm**.
- Xung đột mục tiêu (Nghiêm túc vs Tạm thời) $\rightarrow$ **0 điểm**.

---

### 3.2. Điểm Lối Sống & Giá Trị ($S_{\text{lifestyle}}$ — Tối đa 25 điểm)

Đánh giá 5 khía cạnh lối sống cốt lõi, mỗi khía cạnh đóng góp tối đa **5 điểm**:

1. **Hút thuốc (Smoking)**: Không hút / Thỉnh thoảng / Thường xuyên.
   - Cùng không hút hoặc cùng chấp nhận thói quen của nhau: **+5 điểm**.
   - Một bên ghét khói thuốc, một bên hút thường xuyên: **0 điểm**.
2. **Uống rượu/bia (Drinking)**: Không bao giờ / Xã giao / Thường xuyên.
   - Tương đồng thói quen: **+5 điểm**.
3. **Quan điểm về con cái (Kids Intent)**: Muốn có con / Đã có con / Không muốn có con.
   - Đồng thuận quan điểm: **+5 điểm**.
4. **Tôn giáo / Tín ngưỡng (Religion)**: Phật giáo / Công giáo / Không tôn giáo / Khác...
   - Cùng tôn giáo hoặc cả hai cùng cởi mở với tôn giáo của đối phương: **+5 điểm**.
5. **Thú cưng (Pets)**: Yêu chó / Yêu mèo / Dị ứng / Không nuôi.
   - Đồng điệu hoặc không xung đột (ví dụ không bị dị ứng lông động vật): **+5 điểm**.

> **Cơ chế Deal-Breaker (Quyền phủ quyết):**
> Người dùng có thể đánh dấu tối đa 1 tiêu chí lối sống là "Bắt buộc" (Ví dụ: Bắt buộc không hút thuốc). Nếu đối phương vi phạm điều này, hạng mục Lối sống bị trừ **-15 điểm** (hoặc loại trực tiếp tùy cấu hình của user).

---

### 3.3. Điểm Sở Thích Tương Đồng ($S_{\text{interests}}$ — Tối đa 25 điểm)

Để tránh "Nghịch lý người lười" (chọn 1 tag được 100%) và "Nghịch lý người chi tiết" (chọn nhiều tag bị giảm tỷ lệ), hệ thống sử dụng **Hệ số tương đồng Jaccard (Jaccard Similarity Index)**:

$$J(A, B) = \frac{|Interests_A \cap Interests_B|}{|Interests_A \cup Interests_B|}$$

**Công thức điểm:**
$$S_{\text{interests}} = J(A, B) \times 25$$

- **Ví dụ:**
  - $A$ có 6 sở thích: `[Du lịch, Cà phê, Đọc sách, Nấu ăn, Chạy bộ, Nhiếp ảnh]`.
  - $B$ có 5 sở thích: `[Du lịch, Cà phê, Đọc sách, Hội họa, Xem phim]`.
  - Số tag trùng nhau: 3 (`Du lịch`, `Cà phê`, `Đọc sách`).
  - Tổng số tag duy nhất của cả hai: $6 + 5 - 3 = 8$.
  - Hệ số $J(A, B) = \frac{3}{8} = 0.375$.
  - Điểm nhận được: $0.375 \times 25 = \mathbf{9.375\text{ điểm}}$.

_(Nếu $|Interests_A \cup Interests_B| = 0$, $S\_{\text{interests}} = 0$)._

---

### 3.4. Điểm Khoảng Cách Tiệm Cận ($S_{\text{distance}}$ — Tối đa 15 điểm)

Sau khi đã lọc trong bán kính tối đa, những người ở càng gần nhau càng được ưu tiên:

$$S_{\text{distance}} = \max\left(0, \; 15 \times \left(1 - \frac{d}{R_{\max}}\right)\right)$$

_Trong đó $d$ là khoảng cách thực tế (km), $R\_{\max}$ là bán kính tìm kiếm tối đa của $A$._

**Bậc tính điểm quy đổi nhanh (Discrete Tiers):**

- $d \le 3\text{ km}$: **+15 điểm** (Rất gần, dễ hẹn hò gặp mặt ngay).
- $3\text{ km} < d \le 8\text{ km}$: **+10 điểm**.
- $8\text{ km} < d \le 15\text{ km}$: **+6 điểm**.
- $d > 15\text{ km}$: **+2 điểm**.

---

### 3.5. Điểm Tích Cực & Chất Lượng Hồ Sơ ($S_{\text{activity}}$ — Tối đa 10 điểm)

Hệ thống ưu tiên những người đang tích cực hoạt động để đảm bảo tin nhắn được phản hồi nhanh.

#### 1. Độ tươi mới hoạt động (Recency — Tối đa 6 điểm):

- Đang online hoặc hoạt động trong vòng **2 giờ qua**: **+6 điểm**.
- Hoạt động trong vòng **24 giờ qua**: **+4 điểm**.
- Hoạt động trong vòng **3 ngày qua**: **+2 điểm**.
- Không hoạt động trên **7 ngày**: **0 điểm** (và bị giảm thứ tự ưu tiên).

#### 2. Mức độ hoàn thiện hồ sơ (Completeness — Tối đa 4 điểm):

- Có lời giới thiệu (Bio) chi tiết $> 50$ ký tự: **+2 điểm**.
- Đã tải lên ảnh đại diện hợp lệ: **+2 điểm**.

---

## 4. Giai Đoạn 3: Xếp Hạng & Thuật Toán Trộn (Ranking & Exploration)

Sau khi tính toán $TotalScore$ cho toàn bộ ứng viên hợp lệ:

1. **Sắp xếp mặc định:** Danh sách hồ sơ được xếp giảm dần theo $TotalScore$.
2. **Cơ chế $\epsilon$-Greedy (Khám phá ngẫu nhiên 10%):**
   - Trong mỗi trang 20 hồ sơ trả về cho người dùng:
     - **18 hồ sơ** là những người có điểm cao nhất (Exploitation).
     - **2 hồ sơ** được chọn ngẫu nhiên từ nhóm hồ sơ mới tạo / người dùng mới tham gia trong 48 giờ qua (Exploration).
   - _Mục đích:_ Giúp người dùng mới không bị chìm xuống đáy danh sách và tăng cơ hội nhận được lượt thích đầu tiên.

---

## 5. Kế Hoạch Mở Rộng Schema Cơ Sở Dữ Liệu (Schema Migration)

Để hỗ trợ đầy đủ thuật toán trên, Document `User` trong MongoDB (`apps/api/src/app/modules/users/models.py`) cần được bổ sung các trường sau:

```python
class Gender(StrEnum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"

class DatingIntent(StrEnum):
    LONG_TERM = "long_term"
    SHORT_TERM = "short_term"
    NEW_FRIENDS = "new_friends"
    NOT_SURE = "not_sure"

class Lifestyle(BaseModel):
    smoking: str | None = None
    drinking: str | None = None
    kids_intent: str | None = None
    religion: str | None = None
    pets: str | None = None

class DiscoverySettings(BaseModel):
    target_genders: list[Gender] = [Gender.FEMALE]
    min_age: int = 18
    max_age: int = 35
    max_distance_km: int = 25
```

---

## 6. Ví Dụ Tính Toán Thực Tế (Walkthrough Case Study)

**Hồ sơ A (Người đang tìm kiếm):**

- Nam, 26 tuổi, Hà Nội, tìm Nữ từ 22-28 tuổi, bán kính 10km.
- Mục đích: `LONG_TERM`.
- Thói quen: Không hút thuốc, Uống rượu xã giao, Thích nuôi mèo.
- Sở thích: `[Cà phê, Du lịch, Phim ảnh, Chạy bộ, Công nghệ]`.
- Lần online gần nhất: 10 phút trước.

**Hồ sơ B (Ứng viên được xét):**

- Nữ, 24 tuổi, cách A 4km. Tìm Nam từ 24-30 tuổi, bán kính 15km.
- Mục đích: `NOT_SURE`.
- Thói quen: Không hút thuốc, Không uống rượu, Thích nuôi mèo.
- Sở thích: `[Cà phê, Du lịch, Nấu ăn, Đọc sách]`.
- Lần online gần nhất: 3 giờ trước (trong ngày).
- Bio: Đầy đủ, trên 80 ký tự.

---

### Bước 1: Kiểm tra Bộ Lọc Cứng

- Giới tính: Nam tìm Nữ, Nữ tìm Nam $\rightarrow$ **HỢP LỆ**.
- Tuổi: A (26t) nằm trong khoảng B tìm (24-30); B (24t) nằm trong khoảng A tìm (22-28) $\rightarrow$ **HỢP LỆ**.
- Khoảng cách: 4km $\le \min(10km, 15km)$ $\rightarrow$ **HỢP LỆ**.
- Trạng thái: Cả 2 đều `ACTIVE`, chưa tương tác $\rightarrow$ **VƯỢT QUA BỘ LỌC CỨNG**.

---

### Bước 2: Chấm Điểm Thành Phần

1. **Mục đích:** `LONG_TERM` vs `NOT_SURE` $\rightarrow$ **15 / 25 điểm**.
2. **Lối sống:**
   - Hút thuốc: Cùng không hút $\rightarrow$ +5đ.
   - Rượu bia: Xã giao vs Không uống $\rightarrow$ +3đ (tương thích mức khá).
   - Thú cưng: Cùng yêu mèo $\rightarrow$ +5đ.
   - Tôn giáo & Con cái: Cùng chưa đặt $\rightarrow$ +2đ.
   - $\rightarrow$ **15 / 25 điểm**.
3. **Sở thích:**
   - Trùng nhau: `[Cà phê, Du lịch]` (2 tag).
   - Tổng tag riêng biệt: `[Cà phê, Du lịch, Phim ảnh, Chạy bộ, Công nghệ, Nấu ăn, Đọc sách]` (7 tag).
   - Jaccard: $2 / 7 \approx 0.2857$.
   - Điểm: $0.2857 \times 25 \approx$ **7.14 / 25 điểm**.
4. **Khoảng cách:** Cách 4km (Tier 3-8km) $\rightarrow$ **10 / 15 điểm**.
5. **Độ tích cực & Bio:** Online trong ngày (+4đ), Bio đầy đủ (+2đ), Avatar (+2đ) $\rightarrow$ **8 / 10 điểm**.

---

### Bước 3: Tổng Điểm

$$\mathbf{TotalScore} = 15 + 15 + 7.14 + 10 + 8 = \mathbf{55.14} \text{ / } 100 \text{ điểm}$$

_Kết quả:_ Hồ sơ B đạt mức tương thích khá tốt (**55.14%**), sẽ được xếp hạng cao trong lượt gợi ý của User A.
