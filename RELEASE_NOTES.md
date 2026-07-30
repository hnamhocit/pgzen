# 🚀 Introducing PgZen: The Blazingly Fast, Local-First PostgreSQL Client

Chào mọi người! 👋 Hôm nay mình xin giới thiệu **PgZen** - một ứng dụng quản lý cơ sở dữ liệu PostgreSQL hoàn toàn mới, được thiết kế để mang lại trải nghiệm nhanh, mượt mà và tối ưu nhất cho Developer.

PgZen không đi theo lối mòn của các tool truyền thống. Ứng dụng được xây dựng trên nền tảng **Rust, Tauri và React**, tập trung vào triết lý **Local-First** và hiệu năng cực đỉnh. Dưới đây là những điểm nổi bật mà PgZen sẽ mang đến cho bạn:

## ⚡ Hiệu năng "Không độ trễ" (Blazing Fast)
- **Zero Loading & 0ms Delay:** Mở app là gõ query được ngay lập tức. Không skeleton loading, không bắt buộc đăng nhập (Auth).
- **Mượt mà với dữ liệu lớn:** Render bằng Virtual DOM (TanStack Virtual), bạn có thể load và cuộn hàng vạn dòng dữ liệu mà không sợ rớt FPS.
- **Keyboard-First:** Điều hướng mọi thứ bằng **Command Palette (`Cmd + K`)**, chuẩn phong cách IDE, hạn chế tối đa việc dùng chuột.

## 🛡️ An toàn & Kiểm soát tuyệt đối (Transaction Mode)
- **Staging UI & Preview SQL:** Bạn có thể edit trực tiếp trên Data Grid hoặc tick xóa dòng. Mọi thay đổi sẽ không chạy ngay mà đưa vào "Pending Changes" với giao diện **Inline Diff (đỏ/xanh)** và hiện sẵn mã Raw SQL. Review kỹ càng rồi mới bấm `Commit` hoặc `Rollback` an toàn!
- **Bảo mật Local-First:** Chuỗi kết nối và mật khẩu được mã hóa an toàn ở máy cá nhân (SQLite local). Tính năng Cloud Sync (đồng bộ snippet) là tùy chọn tự nguyện (Opt-in).

## 🛠 Tính năng cốt lõi (Killer Features)
- **Drill-down Foreign Key:** Hover hoặc click trực tiếp vào ID của một Foreign Key trên Grid để xem popup chi tiết dòng đó, không cần phải mở tab mới hay tự gõ query thủ công!
- **Visual EXPLAIN Analytics:** PgZen chạy ngầm `EXPLAIN ANALYZE` và vẽ ra một Execution Tree trực quan, bôi đỏ các node thắt cổ chai (như quét Full Table - Seq Scan) để bạn dễ dàng tối ưu.
- **Interactive Schema / ERD:** Kéo thả bảng trực quan. Click vào đường nối giữa 2 bảng để tự động sinh lệnh `JOIN`. Right-click vào cột để sinh lệnh `ALTER TABLE`.
- **Smart Filter Bar:** Thay vì mở query editor, bạn chỉ cần gõ điều kiện vào thanh filter ngay trên Data Grid (VD: `age > 18`), PgZen sẽ tự dịch ra SQL.
- **Data Type Highlighting:** Các kiểu dữ liệu được phân biệt bằng màu sắc cực kỳ trực quan (UUID: Tím, Numeric: Cam, Boolean: Cyan, JSONB: Cam sáng...) giúp mắt đọc nhanh hơn.

## 👨‍💻 Công cụ "Trợ thủ" cho Developer
- **Copy As Code:** Bôi đen một dòng data và Right-click để copy ngay thành **Rust Struct, TypeScript Interface, NestJS DTO**, hoặc **JSON**. Siêu tiện lợi cho quá trình dev!
- **Query Variables UI:** Khai báo biến ngay trong raw SQL (vd: `WHERE status = {{status}}`). PgZen sẽ tự động tạo ô input nhỏ trên giao diện để bạn điền value test thử.
- **Mock Data Generator:** Right-click vào Table và chọn Gen 100 dòng dữ liệu giả lập (đúng chuẩn type) ngay lập tức để test local.
- **Schema-aware Autocomplete:** Editor thông minh tự động nhận diện schema hiện tại để gợi ý chuẩn xác bảng/cột.

---
Trải nghiệm giao diện IDE-like, viền mảnh, mật độ hiển thị cao (Compact mode) với các font chữ Monospace đỉnh cao ngay hôm nay. Hy vọng **PgZen** sẽ trở thành tool yêu thích mới của mọi người khi làm việc với PostgreSQL! 🚀
