package com.ensiyabco.alloush

import android.content.Context

object ReplyDraftEngine {
    fun draft(context: Context, message: IncomingMessage, paymentDetails: String): String {
        LearningStore.match(context, message.text)?.let { return it }

        val text = message.text.trim()
        val asksForPayment = listOf("رقم الحساب", "الحساب", "الآيبان", "الايبان", "تحويل", "السداد")
            .any { text.contains(it, ignoreCase = true) }
        if (asksForPayment) {
            return if (paymentDetails.isBlank())
                "العميل طلب بيانات الدفع. أدخل بيانات الدفع أولًا في إعدادات علوش."
            else "حياك الله 🌹\nبيانات التحويل المعتمدة:\n$paymentDetails"
        }
        return when {
            text.contains("السلام") -> "وعليكم السلام ورحمة الله وبركاته 🌹 حياك الله."
            text.contains("طلبيه") || text.contains("طلبية") ->
                "أبشر، أرسل لي الأصناف والكميات اللي تحتاجها وإن شاء الله نخدمك."
            text.contains("شكرا") || text.contains("شكراً") || text.contains("شكر") ->
                "الشكر لله سبحانه وتعالى، ومن قبل ومن بعد، ونسعد بخدمتكم 🌷"
            else -> "وصلت رسالتك. علوش سيجهز الرد بعد فهم الطلب والتحقق من البيانات عند الحاجة."
        }
    }
}
