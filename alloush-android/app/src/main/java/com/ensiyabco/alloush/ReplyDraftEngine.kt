package com.ensiyabco.alloush

object ReplyDraftEngine {
    fun localDraft(message: IncomingMessage): String {
        val text = message.text.trim()
        if (text.isBlank()) return ""
        return when {
            text.contains("السلام") -> "وعليكم السلام ورحمة الله وبركاته 🌹 حياك الله."
            text.contains("طلبيه") || text.contains("طلبية") ->
                "أبشر، أرسل لي الأصناف والكميات اللي تحتاجها وإن شاء الله نخدمك."
            else -> "وصلت رسالتك. علوش سيجهز الرد المقترح بعد التحقق من البيانات."
        }
    }
}
