package com.ensiyabco.alloush

import android.content.Context

object ReplyDraftEngine {
    fun decision(context: Context, message: IncomingMessage, paymentDetails: String): ReplyDecision {
        val learned = LearningStore.match(context, message.text)
        val text = message.text.trim()

        val asksForPayment = listOf("رقم الحساب","الحساب","الآيبان","الايبان","تحويل","السداد")
            .any { text.contains(it, ignoreCase = true) }

        val builtIn = when {
            asksForPayment && paymentDetails.isNotBlank() ->
                "حياك الله 🌹\nبيانات التحويل المعتمدة:\n" + paymentDetails
            text.contains("السلام") ->
                "وعليكم السلام ورحمة الله وبركاته 🌹 حياك الله."
            text.contains("طلبيه") || text.contains("طلبية") ->
                "أبشر، أرسل لي الأصناف والكميات اللي تحتاجها وإن شاء الله نخدمك."
            text.contains("شكرا") || text.contains("شكراً") || text.contains("شكر") ->
                "الشكر لله سبحانه وتعالى، ومن قبل ومن بعد، ونسعد بخدمتكم 🌷"
            else -> null
        }

        return ReplyPolicy.decide(
            learnedReply = learned,
            builtInReply = builtIn,
            isSensitive = AlloushStore.isRedListed(context, message.sender)
        )
    }
}
