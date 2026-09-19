package com.ensiyabco.alloush

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

data class ContextMessage(val role: String, val text: String, val at: Long)

object ContactMemory {
    private const val PREFS = "alloush_contact_memory"
    private const val MAX_PER_CONTACT = 30

    private fun key(sender: String) = "contact_" + sender.hashCode().toString()

    fun addIncoming(context: Context, sender: String, text: String) =
        add(context, sender, "contact", text)

    fun addAliReply(context: Context, sender: String, text: String) =
        add(context, sender, "ali", text)

    private fun add(context: Context, sender: String, role: String, text: String) {
        if (AlloushStore.isRedListed(context, sender) || text.isBlank()) return
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val arr = JSONArray(prefs.getString(key(sender), "[]"))
        arr.put(JSONObject().put("role", role).put("text", text.trim()).put("at", System.currentTimeMillis()))
        while (arr.length() > MAX_PER_CONTACT) arr.remove(0)
        prefs.edit().putString(key(sender), arr.toString()).apply()
    }

    fun recent(context: Context, sender: String, limit: Int = 12): List<ContextMessage> {
        if (AlloushStore.isRedListed(context, sender)) return emptyList()
        val arr = JSONArray(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(key(sender), "[]"))
        val start = (arr.length() - limit).coerceAtLeast(0)
        return (start until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            ContextMessage(o.optString("role"), o.optString("text"), o.optLong("at"))
        }
    }

    fun buildAiContext(context: Context, sender: String): String =
        recent(context, sender).joinToString("\n") {
            (if (it.role == "ali") "علي" else "المتصل") + ": " + it.text
        }
}
