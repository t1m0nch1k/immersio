package ru.pogruzhenie.app

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader
import java.io.ByteArrayInputStream
import java.util.Locale

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private var tts: TextToSpeech? = null
    private val appHost = "appassets.androidplatform.net"
    private val startUrl = "https://$appHost/assets/www/index.html"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(245, 241, 230)
        window.navigationBarColor = Color.rgb(245, 241, 230)
        tts = TextToSpeech(this) { }

        val root = FrameLayout(this)
        root.setBackgroundColor(Color.rgb(245, 241, 230))
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            insets
        }
        webView = WebView(this)
        root.addView(webView, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        setContentView(root)
        WindowInsetsControllerCompat(window, root).apply {
            isAppearanceLightStatusBars = true
            isAppearanceLightNavigationBars = true
        }

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            allowFileAccessFromFileURLs = false
            allowUniversalAccessFromFileURLs = false
            mediaPlaybackRequiresUserGesture = false
        }
        webView.addJavascriptInterface(NativeSpeech(), "AndroidTts")
        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                if (request.url.host == appHost && request.url.path == "/api/tts") {
                    return WebResourceResponse("text/plain", "UTF-8", ByteArrayInputStream(ByteArray(0))).apply {
                        setStatusCodeAndReasonPhrase(404, "Native speech fallback")
                    }
                }
                return assetLoader.shouldInterceptRequest(request.url)
            }

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (request.url.host == appHost) return false
                startActivity(Intent(Intent.ACTION_VIEW, request.url))
                return true
            }
        }
        if (savedInstanceState == null) webView.loadUrl(startUrl)
        else webView.restoreState(savedInstanceState)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        webView.destroy()
        tts?.shutdown()
        super.onDestroy()
    }

    private inner class NativeSpeech {
        @JavascriptInterface
        fun speak(text: String, language: String, rate: Double) {
            runOnUiThread {
                tts?.language = Locale.forLanguageTag(language)
                tts?.setSpeechRate(rate.toFloat().coerceIn(0.5f, 2f))
                tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "pogruzhenie-speech")
            }
        }

        @JavascriptInterface
        fun cancel() = runOnUiThread { tts?.stop() }
    }
}
