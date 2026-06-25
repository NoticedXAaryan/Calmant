// Auth pages (login, signup) use a clean layout without the sidebar/navigation.

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh" }}>
      {children}
    </div>
  );
}
