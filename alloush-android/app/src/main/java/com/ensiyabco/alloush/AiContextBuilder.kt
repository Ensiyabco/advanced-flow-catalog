package com.ensiyabco.alloush

import android.content.Context

data class AiRequest(
    val sender: String,
    val currentMessage: String,
    val conversationContext: String,
    val approvedRuleReply: String?,
    val paymentDetailsAvailable: Boolean
)

object AiContextBuilder {
    fun build(context: Context, message: IncomingMessage): AiRequest {
        return AiRequest(
            sender = message.sender,
            currentMessage = message.text,
            conversationContext = ContactMemory.buildAiContext(context, message.sender),
            approvedRuleReply = LearningStore.match(context, message.text),
            paymentDetailsAvailable = AlloushStore.paymentDetails(context).isNotBlank()
        )
    }

    // لا يوضع مفتاح نموذج الذكاء الاصطناعي داخل APK.
    // سترسل هذه البيانات لاحقًا إلى backend آمن ليعيد:
    // نوع المحادثة + درجة الثقة + الرد المقترح + هل الحالة معروفة أم جديدة.
}
