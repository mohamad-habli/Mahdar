// تخطيط مستقل للطباعة — خلفية بيضاء دائمًا
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#fff', minHeight: '100dvh' }}>{children}</div>
}
