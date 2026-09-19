package com.ensiyabco.alloush

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

object AlloushStore {
    private const val PREFS = "alloush_v1"
    private const val KEY_INBOX = "inbox"
    private const val KEY_RED = "red_list"

    fun isRedListed(context: Context, sender: String): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getStringSet(KEY_RED, emptySet())?.contains(sender) == true

    fun addRedListed(context: Context, sender: String) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val set = prefs.getStringSet(KEY_RED, emptySet())?.toMutableSet() ?: mutableSetOf()
        set.add(sender)
        prefs.edit().putStringSet(KEY_RED, set).apply()
    }

    fun saveIncoming(context: Context, msg: IncomingMessage) {
        if (isRedListed(context, msg.sender)) return
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val arr = JSONArray(prefs.getString(KEY_INBOX, "[]"))
        arr.put(JSONObject().apply {
            put("sender", msg.sender)
            put("text", msg.text)
            put("receivedAt", msg.receivedAt)
        })
        while (arr.length() > 50) arr.remove(0)
        prefs.edit().putString(KEY_INBOX, arr.toString()).apply()
    }

    fun latest(context: Context): IncomingMessage? {
        val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_INBOX, "[]") ?: "[]"
        val arr = JSONArray(raw)
        if (arr.length() == 0) return null
        val o = arr.getJSONObject(arr.length() - 1)
        return IncomingMessage(o.optString("sender"), o.optString("text"), o.optLong("receivedAt"))
    }
}
