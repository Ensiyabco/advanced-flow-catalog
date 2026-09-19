package com.ensiyabco.alloush

enum class ReplyMode { KNOWN_AUTO, UNKNOWN_WELCOME, SENSITIVE_HOLD }

data class ReplyDecision(
    val mode: ReplyMode,
    val text: String,
    val reason: String
)

object ReplyPolicy {
    const val DEFAULT_WELCOME =
        "حياك الله 🌹 وصلت رسالتك، وأبو عبدالرحمن بيرد عليك بإذن الله."

    fun decide(
        learnedReply: String?,
        builtInReply: String?,
        isSensitive: Boolean
    ): ReplyDecision {
        if (isSensitive) return ReplyDecision(
            ReplyMode.SENSITIVE_HOLD, "", "محادثة حساسة: لا معالجة ولا رد تلقائي."
        )
        if (!learnedReply.isNullOrBlank()) return ReplyDecision(
            ReplyMode.KNOWN_AUTO, learnedReply, "قاعدة سبق أن اعتمدها علي."
        )
        if (!builtInReply.isNullOrBlank()) return ReplyDecision(
            ReplyMode.KNOWN_AUTO, builtInReply, "حالة معروفة ومسموح بها."
        )
        return ReplyDecision(
            ReplyMode.UNKNOWN_WELCOME, DEFAULT_WELCOME,
            "رسالة غير معروفة: ترحيب آمن فقط دون تخمين."
        )
    }
}
