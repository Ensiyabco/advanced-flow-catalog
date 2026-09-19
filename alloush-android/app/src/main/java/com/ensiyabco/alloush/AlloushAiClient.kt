package com.ensiyabco.alloush
import android.content.Context
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
data class AiDecision(val conversationType:String,val known:Boolean,val confidence:Double,val reply:String,val needsAli:Boolean,val reason:String)
object AlloushAiClient {
 private const val ENDPOINT="https://gexufsqafnswqesqdoqu.supabase.co/functions/v1/alloush-ai"
 private const val PUBLISHABLE_KEY="sb_publishable_xBb23C8kurdhy3dejCiNvA_bxoU-kYW"
 fun decide(context:Context,message:IncomingMessage):AiDecision {
  require(!AlloushStore.isRedListed(context,message.sender)){"sensitive_contact"}
  val i=AiContextBuilder.build(context,message)
  val body=JSONObject().put("sender",i.sender).put("currentMessage",i.currentMessage).put("conversationContext",i.conversationContext).put("approvedRuleReply",i.approvedRuleReply).put("paymentDetailsAvailable",i.paymentDetailsAvailable)
  val conn=(URL(ENDPOINT).openConnection() as HttpURLConnection).apply{requestMethod="POST";connectTimeout=12000;readTimeout=30000;doOutput=true;setRequestProperty("Content-Type","application/json");setRequestProperty("apikey",PUBLISHABLE_KEY);setRequestProperty("Authorization","Bearer "+PUBLISHABLE_KEY)}
  conn.outputStream.use{it.write(body.toString().toByteArray(Charsets.UTF_8))}
  val raw=(if(conn.responseCode in 200..299) conn.inputStream else conn.errorStream).bufferedReader().use{it.readText()}
  if(conn.responseCode !in 200..299) error("alloush_ai_http_"+conn.responseCode+":"+raw)
  val o=JSONObject(raw)
  return AiDecision(o.getString("conversation_type"),o.getBoolean("known"),o.getDouble("confidence"),o.getString("reply"),o.getBoolean("needs_ali"),o.optString("reason"))
 }
}
