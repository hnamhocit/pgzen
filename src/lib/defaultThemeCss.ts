export const DEFAULT_THEME_CSS = `:root {
  --radius: 0.625rem;

  /* Nền chính: Trắng ngà hơi ngả xanh xám (cool off-white) để triệt tiêu độ chói */
  --background: oklch(0.985 0.005 275);
  --foreground: oklch(0.2 0.02 275);

  /* Cards & Popovers */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.2 0.02 275);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.2 0.02 275);

  /* Primary (Nút bấm chính): Giữ màu Blurple của brand PgZen */
  --primary: oklch(0.45 0.15 275);
  --primary-foreground: oklch(0.98 0 0);

  /* Secondary/Muted: Dành cho nền nhạt, viền mờ */
  --secondary: oklch(0.95 0.01 275);
  --secondary-foreground: oklch(0.3 0.03 275);
  --muted: oklch(0.95 0.01 275);
  --muted-foreground: oklch(0.45 0.02 275);

  /* Accent: Hover states trên Data Grid */
  --accent: oklch(0.93 0.02 275);
  --accent-foreground: oklch(0.25 0.03 275);

  /* Cảnh báo / Xóa data */
  --destructive: oklch(0.55 0.2 20);
  --destructive-foreground: oklch(0.98 0 0);

  /* Borders: Cực kỳ tinh tế, 1px low-contrast */
  --border: oklch(0.9 0.01 275);
  --input: oklch(0.9 0.01 275);
  --ring: oklch(0.45 0.15 275);

  /* Data Type Colors (Làm tối màu đi so với Dark Mode để đảm bảo độ đọc trên nền sáng) */
  --chart-1: oklch(0.55 0.15 300); /* UUID - Deep Purple */
  --chart-2: oklch(0.55 0.15 50); /* Numeric - Burned Amber */
  --chart-3: oklch(0.45 0.1 150); /* Varchar - Deep Sage Green */
  --chart-4: oklch(0.45 0.1 200); /* Boolean - Deep Teal */
  --chart-5: oklch(0.55 0.15 35); /* JSONB - Rust Orange */

  /* Sidebar */
  --sidebar: oklch(0.97 0.005 275);
  --sidebar-foreground: oklch(0.2 0.02 275);
  --sidebar-primary: oklch(0.45 0.15 275);
  --sidebar-primary-foreground: oklch(0.98 0 0);
  --sidebar-accent: oklch(0.93 0.02 275);
  --sidebar-accent-foreground: oklch(0.25 0.03 275);
  --sidebar-border: oklch(0.9 0.01 275);
  --sidebar-ring: oklch(0.45 0.15 275);
}

.dark {
  /* Nền chính: Dark Zinc - Chuyên nghiệp và hiện đại */
  --background: oklch(0.18 0 0);
  --foreground: oklch(0.98 0 0);

  /* Các panel/tab nổi lên */
  --card: oklch(0.22 0 0);
  --card-foreground: oklch(0.98 0 0);
  --popover: oklch(0.22 0 0);
  --popover-foreground: oklch(0.98 0 0);

  /* Primary Action (VD: Nút Commit): Giữ màu Blurple đặc trưng của PgZen nhưng sáng hơn 1 chút cho dark mode */
  --primary: oklch(0.6 0.15 275);
  --primary-foreground: oklch(0.98 0 0);

  /* Secondary/Muted: Dành cho text phụ, viền border mờ */
  --secondary: oklch(0.26 0 0);
  --secondary-foreground: oklch(0.98 0 0);
  --muted: oklch(0.26 0 0);
  --muted-foreground: oklch(0.70 0 0);

  /* Accent: Hover states trên Data Grid */
  --accent: oklch(0.28 0 0);
  --accent-foreground: oklch(0.98 0 0);

  /* Cảnh báo / Xóa data */
  --destructive: oklch(0.4 0.15 20);
  --destructive-foreground: oklch(0.98 0 0);

  --border: oklch(0.32 0 0); /* Viền mảnh, tiệp màu nền */
  --input: oklch(0.32 0 0);
  --ring: oklch(0.6 0.15 275);

  /* Data Type Colors (Tùy chỉnh riêng cho các cột type) */
  --chart-1: oklch(0.7 0.15 300); /* UUID - Neon Purple */
  --chart-2: oklch(0.75 0.15 70); /* Numeric - Amber */
  --chart-3: oklch(0.75 0.1 160); /* Varchar - Sage Green */
  --chart-4: oklch(0.7 0.12 200); /* Boolean - Teal */
  --chart-5: oklch(0.65 0.18 45); /* JSONB - Orange */

  /* Sidebar */
  --sidebar: oklch(0.20 0 0);
  --sidebar-foreground: oklch(0.98 0 0);
  --sidebar-primary: oklch(0.6 0.15 275);
  --sidebar-primary-foreground: oklch(0.98 0 0);
  --sidebar-accent: oklch(0.26 0 0);
  --sidebar-accent-foreground: oklch(0.98 0 0);
  --sidebar-border: oklch(0.32 0 0);
  --sidebar-ring: oklch(0.6 0.15 275);
}

/* Base styles that were originally using @apply */
* {
  border-color: var(--border);
  outline-color: color-mix(in oklch, var(--ring) 50%, transparent);
  transition-property: background-color, border-color, color, fill, stroke;
  transition-timing-function: ease-in-out;
  transition-duration: 300ms;
}

body {
  background-color: var(--background);
  color: var(--foreground);
}

/* Utilities */
.hide-scrollbar {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
.hide-scrollbar::-webkit-scrollbar {
  display: none; /* Chrome, Safari and Opera */
}

/* Target nested scrollable elements inside react-arborist */
.hide-scrollbar [style*="overflow"] {
  -ms-overflow-style: none !important;
  scrollbar-width: none !important;
}
.hide-scrollbar [style*="overflow"]::-webkit-scrollbar {
  display: none !important;
}

/* Custom scrollbar for modern browsers (macOS-like, minimal) */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--border);
  border-radius: 10px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: var(--muted-foreground);
}
`;
