package com.ensiyabco.alloush

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        render()
    }

    override fun onResume() {
        super.onResume()
        render()
    }

    private fun render() {
        val latest = AlloushStore.latest(this)
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 32, 24, 24)
        }

        layout.addView(TextView(this).apply {
            text = "علوش — مساعد علي الشخصي والتجاري"
            textSize = 23f
        })

        layout.addView(TextView(this).apply {
            text = if (latest == null) {
                "لا توجد رسالة WhatsApp بانتظار المراجعة."
            } else {
                "آخر رسالة:\n" + latest.sender + "\n" + latest.text +
                    "\n\nاقتراح علوش:\n" +
                    ReplyDraftEngine.draft(latest, AlloushStore.paymentDetails(this@MainActivity))
            }
            textSize = 17f
            setPadding(0, 24, 0, 24)
        })

        layout.addView(Button(this).apply {
            text = "تفعيل الوصول إلى إشعارات WhatsApp"
            setOnClickListener { startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)) }
        })

        layout.addView(Button(this).apply {
            text = "إضافة مرسل آخر رسالة للقائمة الحمراء"
            isEnabled = latest != null
            setOnClickListener {
                latest?.let { AlloushStore.addRedListed(this@MainActivity, it.sender) }
                Toast.makeText(this@MainActivity, "تم استبعاد المرسل من معالجة علوش", Toast.LENGTH_SHORT).show()
                render()
            }
        })

        val payment = EditText(this).apply {
            hint = "أدخل بيانات الدفع التي تريد إرسالها للعملاء"
            setText(AlloushStore.paymentDetails(this@MainActivity))
            minLines = 3
        }
        layout.addView(payment)

        layout.addView(Button(this).apply {
            text = "حفظ بيانات الدفع"
            setOnClickListener {
                AlloushStore.savePaymentDetails(this@MainActivity, payment.text.toString())
                Toast.makeText(this@MainActivity, "تم حفظ بيانات الدفع داخل علوش", Toast.LENGTH_SHORT).show()
                render()
            }
        })

        layout.addView(TextView(this).apply {
            text = "علوش يعرض الرد المقترح فقط في V1 ولا يرسله إلى WhatsApp من تلقاء نفسه."
            setPadding(0, 24, 0, 0)
        })

        setContentView(layout)
    }
}
