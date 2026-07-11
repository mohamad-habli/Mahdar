import { redirect } from 'next/navigation'
import { getSession, defaultPathForRole } from '@/lib/auth'

export default async function Home() {
  const user = await getSession()
  if (user) redirect(defaultPathForRole(user.role))
  redirect('/login')
}
