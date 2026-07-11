# PgZen

PgZen is a blazingly fast, local-first PostgreSQL database client built with Rust, Tauri, and React.

## 1. Kiến trúc & Nền tảng (Core Architecture)

- **Tech Stack:** Rust (Core Backend) + Tauri + React (Frontend) + Tailwind CSS (Shadcn UI).
- **Local-First & Zero Loading:** Dữ liệu, lịch sử query, config được lưu ngầm dưới SQLite local. App mở lên là gõ được ngay (0ms delay), tuyệt đối không có skeleton loading hay bắt buộc Auth.
- **Opt-in Sync:** Sync cấu hình/snippet lên cloud là luồng chạy ngầm (Background Worker) và hoàn toàn tự nguyện (chỉ khi user bấm Sign in).
- **Blazing Fast Rendering:** Xử lý nghẽn IPC bằng cách truyền data theo batch. Render UI bằng Virtual DOM (TanStack Virtual) để load hàng vạn dòng không rớt FPS.
- **Connection & Security:** Quản lý bằng Shared Connection Pool (`sqlx`) trong Rust state. Hash/mã hóa cục bộ an toàn cho chuỗi kết nối và mật khẩu. Tự động detect PostgreSQL version (chuẩn 15 - 18) để bật/tắt UI feature ngầm.

## 2. Triết lý UI/UX (Zero Friction Workspace)

- **IDE-like Layout:** Giao diện Split-view / Tiling, viền mảnh 1px, không đổ bóng, mật độ hiển thị cao (Compact mode).
- **Typography & Colors:** Nền Dark (Deep Slate/Navy) hoặc Light (Cool Off-White) triệt tiêu độ chói. Dùng Geist/Inter cho UI; bắt buộc dùng Monospace (Geist Mono/JetBrains Mono) cho Code và Data Grid.
- **Keyboard-First:** Command Palette (`Cmd + K`) điều hướng mọi tác vụ mà không cần chuột.
- **Smart Filter Bar:** Tích hợp thanh filter gõ điều kiện (vd: `age > 18`) ngay trên đầu Data Grid, tự dịch ra SQL, không cần mở editor.

## 3. Tính năng cốt lõi (Killer Features)

- **Staging UI & Preview SQL (Transaction Mode):** Mọi thao tác edit cell, tick xóa row trên UI không thực thi ngay. App sẽ gom vào vùng "Pending Changes", render ra Inline Diff (đỏ/xanh) và raw SQL để review. Dev bấm `Commit` (chạy BEGIN/COMMIT) hoặc `Rollback` an toàn.
- **Data Type Highlighting:** Phân loại màu sắc trực quan tại Data Grid để não đọc nhanh: UUID (Tím), Numeric (Cam/Vàng), Varchar (Xanh lục), Boolean (Cyan), JSONB (Cam sáng).
- **Visual EXPLAIN & Analytics:** Chạy ngầm `EXPLAIN (ANALYZE, FORMAT JSON)` và vẽ ra Execution Tree, highlight đỏ các node thắt cổ chai (như Seq Scan bảng lớn).
- **Interactive Schema / ERD:** Kéo thả, click vào đường nối (edge) giữa 2 bảng để tự động gen lệnh `JOIN`. Right-click vào cột để gen lệnh `ALTER TABLE`.
- **Drill-down Foreign Key:** Hover hoặc click thẳng vào ID của một Foreign Key tại Data Grid để popup/expand xem chi tiết row đó, không cần mở tab mới.

## 4. Công cụ hỗ trợ viết Code (Dev Assist)

- **Copy As Code:** Bôi đen row data -> Right-click chọn copy thẳng ra Rust Struct, TypeScript Interface, NestJS DTO, hoặc JSON.
- **Query Variables UI:** Parse các biến trong raw SQL (vd: `WHERE status = {{status}}`) thành các ô input nhỏ trên giao diện để dev điền giá trị test nhanh.
- **Schema-aware Autocomplete:** Editor nhận diện được schema hiện tại để gợi ý cột/bảng chính xác.
- **Mock Data Generator:** Right-click vào table -> Gen 100 dòng data giả định chuẩn type (bằng Rust) để test local.

## 5. Định hướng Kinh doanh (Monetization)

- Bán tool theo mô hình Local License (bản quyền thiết bị giống TablePlus) giới hạn connection/tab cho bản Free, thu phí bản Pro.
- Hoặc mô hình Freemium: Local miễn phí 100%, chỉ thu phí Subscription hàng tháng khi team dev cần dùng Cloud Sync (đồng bộ query, kết nối bảo mật).
