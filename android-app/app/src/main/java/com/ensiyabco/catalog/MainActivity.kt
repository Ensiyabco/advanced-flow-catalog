package com.ensiyabco.catalog

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.ActivityNotFoundException
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private var filePickerCallback: ValueCallback<Array<Uri>>? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        webView = findViewById(R.id.catalog_webview)
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = false
            allowContentAccess = true
            builtInZoomControls = false
            displayZoomControls = false
            userAgentString = userAgentString + " EnsiyabcoApp/1.0.1"
        }
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                if (uri.scheme == "ensiyab-share") {
                    if (request.isForMainFrame && uri.host == "product") shareProductLink(view, uri)
                    return true
                }
                return if (uri.scheme == "https" && uri.host == "ensiyabco.github.io") false else {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, uri))
                    } catch (_: ActivityNotFoundException) {
                        Toast.makeText(this@MainActivity, "لا يوجد تطبيق لفتح هذا الرابط", Toast.LENGTH_SHORT).show()
                    }
                    true
                }
            }
            override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                filePickerCallback?.onReceiveValue(null)
                filePickerCallback = callback
                val chooser = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "image/*"
                    putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.mode == FileChooserParams.MODE_OPEN_MULTIPLE)
                }
                startActivityForResult(chooser, FILE_PICKER_REQUEST)
                return true
            }
        }
        webView.loadUrl(CATALOG_URL)
    }

    private fun shareProductLink(view: WebView, uri: Uri) {
        val source = view.url?.let { Uri.parse(it) } ?: return
        val productUrl = uri.getQueryParameter("url") ?: return
        val product = Uri.parse(productUrl)
        // Only catalog pages may share HTTPS links to catalog products.
        if (source.scheme != "https" || source.host != "ensiyabco.github.io" ||
            source.path?.startsWith("/advanced-flow-catalog/") != true ||
            product.scheme != "https" || product.host != "ensiyabco.github.io" ||
            product.path != "/advanced-flow-catalog/products.html" ||
            product.getQueryParameter("product").isNullOrBlank()) return
        val title = uri.getQueryParameter("title").orEmpty().take(300)
        val text = uri.getQueryParameter("text").orEmpty().take(1500)
        val send = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, title)
            putExtra(Intent.EXTRA_TEXT, "$text\n$productUrl")
        }
        startActivity(Intent.createChooser(send, "مشاركة المنتج"))
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != FILE_PICKER_REQUEST) return
        val result = if (resultCode == RESULT_OK && data != null) {
            data.clipData?.let { clip -> Array(clip.itemCount) { index -> clip.getItemAt(index).uri } }
                ?: data.data?.let { arrayOf(it) }
        } else null
        filePickerCallback?.onReceiveValue(result)
        filePickerCallback = null
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    companion object {
        private const val FILE_PICKER_REQUEST = 2001
        private const val CATALOG_URL = "https://ensiyabco.github.io/advanced-flow-catalog/"
    }
}

