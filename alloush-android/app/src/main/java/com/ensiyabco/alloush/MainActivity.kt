package com.ensiyabco.alloush

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.*

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState); render() }
    override fun onResume() { super.onResume(); render() }

    private fun render() {
        val latest = AlloushStore.latest(this)
        val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(24,32,24,24) }

        layout.addView(TextView(this).apply { text="علوش — مساعد علي الشخصي والتجاري"; textSize=23f })
        layout.addView(TextView(this).apply {
            text = if (latest == null) "لا توجد رسالة WhatsApp بانتظار المراجعة."
            else "آخر رسالة:\n"+latest.sender+"\n"+latest.text+"\n\nاقتراح علوش:\n"+
                ReplyDraftEngine.draft(this@MainActivity, latest, AlloushStore.paymentDetails(this@MainActivity))
            textSize=17f; setPadding(0,20,0,20)
        })

        layout.addView(Button(this).apply {
            text="تفعيل الوصول إلى إشعارات WhatsApp"
            setOnClickListener { startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)) }
        })
        layout.addView(Button(this).apply {
            text="إضافة مرسل آخر رسالة للقائمة الحمراء"; isEnabled=latest!=null
            setOnClickListener { latest?.let { AlloushStore.addRedListed(this@MainActivity,it.sender) }; render() }
        })

        val payment=EditText(this).apply { hint="بيانات الدفع"; setText(AlloushStore.paymentDetails(this@MainActivity)); minLines=2 }
        layout.addView(payment)
        layout.addView(Button(this).apply {
            text="حفظ بيانات الدفع"
            setOnClickListener { AlloushStore.savePaymentDetails(this@MainActivity,payment.text.toString()); Toast.makeText(this@MainActivity,"تم الحفظ",Toast.LENGTH_SHORT).show() }
        })

        layout.addView(TextView(this).apply { text="علّم علوش"; textSize=20f; setPadding(0,28,0,8) })
        val trigger=EditText(this).apply { hint="إذا قال العميل..." }
        val response=EditText(this).apply { hint="يكون الرد المقترح..." }
        layout.addView(trigger); layout.addView(response)
        layout.addView(Button(this).apply {
            text="مراجعة القاعدة"
            setOnClickListener {
                if(trigger.text.isNotBlank() && response.text.isNotBlank()){
                    LearningStore.propose(this@MainActivity,trigger.text.toString(),response.text.toString()); render()
                }
            }
        })

        val p=LearningStore.pending(this)
        if(p!=null){
            layout.addView(TextView(this).apply {
                text="قاعدة بانتظار اعتمادك:\nإذا احتوت الرسالة على: "+p.trigger+"\nالرد: "+p.response
                setPadding(0,16,0,8)
            })
            layout.addView(Button(this).apply { text="اعتماد القاعدة"; setOnClickListener { LearningStore.approve(this@MainActivity); render() } })
            layout.addView(Button(this).apply { text="رفض القاعدة"; setOnClickListener { LearningStore.reject(this@MainActivity); render() } })
        }

        layout.addView(TextView(this).apply {
            text="V1: علوش يتعلم القواعد التي تعتمدها ويقترح الردود، لكنه لا يرسل إلى WhatsApp من تلقاء نفسه."
            setPadding(0,24,0,0)
        })
        setContentView(ScrollView(this).apply { addView(layout) })
    }
}
