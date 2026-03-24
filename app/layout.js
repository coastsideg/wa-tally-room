import "./globals.css";

export const metadata = {
  title: "WA Tally Room",
  description: "Western Australian Election Results Dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
