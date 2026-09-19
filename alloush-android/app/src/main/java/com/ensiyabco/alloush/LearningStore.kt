package com.ensiyabco.alloush

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

data class PendingRule(val trigger: String, val response: String)

object LearningStore {
    private const val PREFS = "alloush_learning"
    private const val KEY_RULES = "approved_rules"
    private const val KEY_PENDING_TRIGGER = "pending_trigger"
    private const val KEY_PENDING_RESPONSE = "pending_response"

    fun propose(context: Context, trigger: String, response: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_PENDING_TRIGGER, trigger.trim())
            .putString(KEY_PENDING_RESPONSE, response.trim()).apply()
    }

    fun pending(context: Context): PendingRule? {
        val p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val t = p.getString(KEY_PENDING_TRIGGER, "").orEmpty()
        val r = p.getString(KEY_PENDING_RESPONSE, "").orEmpty()
        return if (t.isBlank() || r.isBlank()) null else PendingRule(t, r)
    }

    fun approve(context: Context) {
        val rule = pending(context) ?: return
        val p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val arr = JSONArray(p.getString(KEY_RULES, "[]"))
        arr.put(JSONObject().put("trigger", rule.trigger).put("response", rule.response))
        p.edit().putString(KEY_RULES, arr.toString())
            .remove(KEY_PENDING_TRIGGER).remove(KEY_PENDING_RESPONSE).apply()
    }

    fun reject(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .remove(KEY_PENDING_TRIGGER).remove(KEY_PENDING_RESPONSE).apply()
    }

    fun match(context: Context, message: String): String? {
        val arr = JSONArray(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_RULES, "[]"))
        for (i in arr.length() - 1 downTo 0) {
            val o = arr.getJSONObject(i)
            val trigger = o.optString("trigger")
            if (trigger.isNotBlank() && message.contains(trigger, ignoreCase = true)) return o.optString("response")
        }
        return null
    }
}
