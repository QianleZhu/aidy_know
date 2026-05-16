// 引入 Tailwind CSS 基础样式
import "./globals.css";

// 根布局组件：设置 HTML 和 Body 的基础样式
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="h-full">
      <body className="h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
