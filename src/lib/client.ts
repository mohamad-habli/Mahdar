// مساعد طلبات من جهة العميل — يعيد {success, data?, error?}
export async function apiSend<T = unknown>(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE' | 'PUT',
  body?: unknown
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json.success) {
      return { success: false, error: json.error ?? 'تعذّر تنفيذ العملية' }
    }
    return { success: true, data: json.data }
  } catch {
    return { success: false, error: 'تعذّر الاتصال بالخادم' }
  }
}
