package ru.pogruzhenie.app

import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.res.Configuration
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.JsResult
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.ValueCallback
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.util.Locale

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private lateinit var root: FrameLayout
    private lateinit var errorPanel: LinearLayout
    private lateinit var errorDetail: TextView
    private lateinit var controller: WindowInsetsControllerCompat
    private var tts: TextToSpeech? = null
    private var isDarkTheme = false
    private var pendingFileCallback: ValueCallback<Array<Uri>>? = null
    private var pendingPermissionRequest: PermissionRequest? = null
    private val AUDIO_PERMISSION_REQUEST = 2002
    private var pendingAuthResult: String? = null
    private var pendingAuthDelivered = false

    private val appHost = "appassets.androidplatform.net"
    private val startUrl = "https://$appHost/assets/www/index.html"

    /** Schemes we are willing to hand to the system browser. */
    private val externalSchemes = setOf("http", "https", "mailto")

    /**
     * Path that marks a Supabase OAuth start. If the bundle ever navigates the
     * WebView to one of these by itself — the fallback path when the JS bridge is
     * missing — it is moved into a Custom Tab, because Google refuses to render
     * its consent page in an embedded WebView. Matching the path rather than a
     * hostname keeps this working for any project URL, which is build
     * configuration and not known here.
     */
    private val oauthStartPath = "/auth/v1/authorize"


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        tts = TextToSpeech(this) { status ->
            // A missing engine fails silently otherwise: `speak` becomes a no-op
            // and the user gets no feedback at all.
            if (status != TextToSpeech.SUCCESS) {
                Log.w(TAG, "TextToSpeech init failed with status $status")
            }
        }

        isDarkTheme = isSystemDark()
        val paper = paperColor()

        root = FrameLayout(this)
        root.setBackgroundColor(paper)

        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            // displayCutout() is requested explicitly: systemBars() alone does not
            // reliably cover a side cutout in landscape on every OEM skin.
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            insets
        }

        webView = WebView(this)
        webView.setBackgroundColor(paper)
        root.addView(
            webView,
            FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        )

        errorDetail = TextView(this).apply {
            textSize = 14f
            gravity = Gravity.CENTER
        }
        errorPanel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            val padding = (20 * resources.displayMetrics.density).toInt()
            setPadding(padding, padding, padding, padding)
            setBackgroundColor(paper)
            addView(TextView(context).apply {
                text = getString(R.string.error_title)
                textSize = 20f
                gravity = Gravity.CENTER
            })
            addView(errorDetail)
            addView(Button(context).apply {
                text = getString(R.string.error_retry)
                setOnClickListener {
                    hideError()
                    webView.reload()
                }
            })
        }
        root.addView(
            errorPanel,
            FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        )
        errorPanel.visibility = View.GONE

        setContentView(root)

        // Only valid once setContentView has installed the DecorView: the
        // controller is fetched from it and throws a NullPointerException if the
        // window has none yet.
        controller = WindowInsetsControllerCompat(window, root)
        applyTheme(isDarkTheme)

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
            mixedContentMode = MIXED_CONTENT_NEVER_ALLOW
            // Pinch zoom with no built-in controls used to leave the layout
            // permanently zoomed in with no way back, so it is off entirely.
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            // The bundle is a fixed-layout app: honouring the system font scale
            // would need a re-tested layout at every zoom level.
            textZoom = 100
        }
        webView.addJavascriptInterface(NativeSpeech(), "AndroidTts")
        webView.addJavascriptInterface(NativeHost(), "AndroidHost")

        // Debug builds only: exposes the WebView over the DevTools protocol so
        // the layout can be inspected on a real device instead of guessed at
        // from screenshots. Never enabled in a release build, which is why the
        // check is the debuggable flag rather than a BuildConfig constant.
        if (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

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
                val url = request.url
                if (url.host == appHost) return false
                if (url.scheme == "https" && url.path == oauthStartPath) {
                    return openCustomTab(url)
                }
                return openExternally(url)
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                // Sub-resource failures are noise; only a broken main frame leaves
                // the user staring at an empty WebView.
                if (!request.isForMainFrame) return
                Log.e(TAG, "Main frame failed: ${error.errorCode} ${error.description} $request.url")
                showError(getString(R.string.error_detail, error.description.toString()))
            }

            override fun onReceivedHttpError(view: WebView, request: WebResourceRequest, errorResponse: WebResourceResponse) {
                if (!request.isForMainFrame) return
                Log.e(TAG, "Main frame HTTP ${errorResponse.statusCode} $request.url")
                showError(getString(R.string.error_detail, "HTTP ${errorResponse.statusCode}"))
            }
        }

        // Without a WebChromeClient the WebView shows no JS dialog and forwards no
        // console output, which made `window.confirm` always answer "false" and
        // left the WebView impossible to debug from logcat.
        webView.webChromeClient = object : WebChromeClient() {
            override fun onJsConfirm(view: WebView, url: String, message: String, result: JsResult): Boolean {
                var settled = false
                dialogBuilder(message)
                    .setPositiveButton(R.string.action_ok) { _, _ -> settled = true; result.confirm() }
                    .setNegativeButton(R.string.action_cancel) { _, _ -> settled = true; result.cancel() }
                    .setOnDismissListener { if (!settled) result.cancel() }
                    .show()
                return true
            }

            override fun onJsAlert(view: WebView, url: String, message: String, result: JsResult): Boolean {
                var settled = false
                dialogBuilder(message)
                    .setPositiveButton(R.string.action_ok) { _, _ -> settled = true; result.confirm() }
                    .setOnDismissListener { if (!settled) result.confirm() }
                    .show()
                return true
            }

            override fun onProgressChanged(view: WebView, newProgress: Int) {
                if (newProgress >= 100) {
                    hideError()
                    flushPendingAuthResult()
                }
            }

            override fun onPermissionRequest(request: PermissionRequest) {
                val audioResources = request.resources.filter { it == PermissionRequest.RESOURCE_AUDIO_CAPTURE }
                if (audioResources.isNotEmpty()) {
                    if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                        pendingPermissionRequest = request
                        requestPermissions(arrayOf(android.Manifest.permission.RECORD_AUDIO), AUDIO_PERMISSION_REQUEST)
                    } else {
                        request.grant(audioResources.toTypedArray())
                    }
                } else {
                    request.deny()
                }
            }

            /**
             * A WebView swallows `<input type="file">` unless the host forwards
             * it to a picker, so the profile photo button did nothing at all
             * before this. Uses the photo picker on API 33+ and falls back to
             * `ACTION_GET_CONTENT`, which needs no storage permission.
             */
            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams
            ): Boolean {
                pendingFileCallback?.onReceiveValue(null)
                pendingFileCallback = filePathCallback

                return try {
                    startActivityForResult(
                        fileChooserParams.createIntent(),
                        FILE_CHOOSER_REQUEST
                    )
                    true
                } catch (error: ActivityNotFoundException) {
                    Log.w(TAG, "No file picker available", error)
                    pendingFileCallback = null
                    filePathCallback.onReceiveValue(null)
                    false
                }

            }

            override fun onConsoleMessage(message: ConsoleMessage): Boolean {
                val line = "${message.sourceId()}:${message.lineNumber()} ${message.message()}"
                when (message.messageLevel()) {
                    ConsoleMessage.MessageLevel.ERROR -> Log.e(TAG, line)
                    ConsoleMessage.MessageLevel.WARNING -> Log.w(TAG, line)
                    else -> Log.d(TAG, line)
                }
                return true
            }
        }

        if (savedInstanceState == null) webView.loadUrl(startUrl)
        else webView.restoreState(savedInstanceState)
        captureAuthResult(intent)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })
    }

    private fun dialogBuilder(message: String): AlertDialog.Builder {
        val style = if (isDarkTheme) {
            android.R.style.Theme_Material_Dialog_Alert
        } else {
            android.R.style.Theme_Material_Light_Dialog_Alert
        }
        return AlertDialog.Builder(this, style).setMessage(message)
    }

    private fun showError(detail: String) {
        runOnUiThread {
            errorDetail.text = detail
            errorPanel.visibility = View.VISIBLE
        }
    }

    private fun hideError() {
        runOnUiThread { errorPanel.visibility = View.GONE }
    }

    private fun isSystemDark(): Boolean =
        (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES

    private fun paperColor(): Int = if (isDarkTheme) PAPER_DARK else PAPER_LIGHT

    private fun applyBarAppearance() {
        controller.isAppearanceLightStatusBars = !isDarkTheme
        controller.isAppearanceLightNavigationBars = !isDarkTheme
    }

    private fun applyTheme(dark: Boolean) {
        isDarkTheme = dark
        val paper = paperColor()
        // Honoured below Android 15, where edge-to-edge is enforced by the
        // system; on API 26-34 these are still what colour the bars.
        window.statusBarColor = paper
        window.navigationBarColor = paper
        if (::root.isInitialized) root.setBackgroundColor(paper)
        if (::webView.isInitialized) webView.setBackgroundColor(paper)
        if (::errorPanel.isInitialized) errorPanel.setBackgroundColor(paper)
        if (::controller.isInitialized) applyBarAppearance()
    }

    /** Hands a URL to the system browser, refusing schemes we do not trust. */
    private fun openExternally(url: Uri): Boolean {
        val scheme = url.scheme?.lowercase(Locale.ROOT)
        if (scheme == null || scheme !in externalSchemes) {
            Log.w(TAG, "Blocked external navigation to '$scheme': $url")
            return true
        }
        return try {
            startActivity(Intent(Intent.ACTION_VIEW, url))
            true
        } catch (error: ActivityNotFoundException) {
            // No handler for the scheme, or a malformed intent target.
            Log.w(TAG, "No activity for $url", error)
            true
        }
    }

    /**
     * Opens an OAuth start URL in a Custom Tab.
     *
     * A Custom Tab is a browser window inside our own task, so the redirect to
     * our scheme comes back to this activity instead of leaving the app for a
     * browser that has no handler for `ru.pogruzhenie.app`. Falls back to the
     * system browser, which is still better than the WebView: the user can at
     * least complete the flow, and the redirect will fail loudly rather than
     * silently.
     */
    private fun openCustomTab(url: Uri): Boolean {
        return try {
            CustomTabsIntent.Builder()
                .setShowTitle(true)
                .build()
                .launchUrl(this, url)
            true
        } catch (error: ActivityNotFoundException) {
            Log.w(TAG, "No Custom Tabs provider, falling back to the browser", error)
            openExternally(url)
        }
    }

    /**
     * Called by the system when the OAuth redirect re-enters the app.
     *
     * The activity is `singleTask`, so this is an `onNewIntent` on the instance
     * that already holds the WebView rather than a second copy of the app. The
     * URL is passed to the bundle as a JSON string rather than interpolated into
     * a script literal, because it carries a `code` parameter whose contents must
     * not be able to terminate the expression.
     */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        val data = intent.data ?: return
        if (data.scheme != authScheme || data.host != authHost) return
        Log.i(TAG, "OAuth redirect received")
        deliverAuthResult(data.toString())
    }

    private fun deliverAuthResult(url: String) {
        if (!::webView.isInitialized) return
        runOnUiThread {
            webView.evaluateJavascript("window.$AUTH_RESULT_HANDLER(${JSONObject.quote(url)})", null)
        }
    }

    /**
     * Holds a redirect that arrived before the bundle could receive it.
     *
     * The app can be cold-started straight by the redirect — the process was
     * killed while the consent screen was in front — in which case there is no
     * WebView to call yet. Handing the URL over immediately would evaluate
     * JavaScript against a blank page and lose the code, so it waits for the
     * bundle to finish loading and installs the handler before the redirect
     * lands.
     */
    private fun flushPendingAuthResult() {
        val pending = pendingAuthResult ?: return
        if (pendingAuthDelivered) return
        // The bundle registers its handler on module load; if it is somehow not
        // there yet, keep the URL and try again on the next load rather than
        // dropping the sign-in.
        val ready = webView.evaluateJavascript("typeof window.$AUTH_RESULT_HANDLER === 'function'") { result ->
            if (result == "true") {
                pendingAuthDelivered = true
                deliverAuthResult(pending)
            }
        }
        if (ready == null) pendingAuthDelivered = true
    }

    /** Consumes `intent.data` when the app was started by the redirect itself. */
    private fun captureAuthResult(intent: Intent?) {
        val data = intent?.data ?: return
        if (data.scheme != authScheme || data.host != authHost) return
        Log.i(TAG, "OAuth redirect received on cold start")
        pendingAuthResult = data.toString()
        pendingAuthDelivered = false
    }


    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        // uiMode is listed in configChanges, so keep the bars in step when the
        // device flips to dark while the app is open.
        if (::controller.isInitialized) {
            val dark = (newConfig.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
            if (dark != isDarkTheme) applyTheme(dark)
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != FILE_CHOOSER_REQUEST) {
            super.onActivityResult(requestCode, resultCode, data)
            return
        }
        val callback = pendingFileCallback
        pendingFileCallback = null
        if (callback == null) return
        callback.onReceiveValue(
            if (resultCode == RESULT_OK) {
                WebChromeClient.FileChooserParams.parseResult(resultCode, data)
            } else {
                null
            }
        )
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == AUDIO_PERMISSION_REQUEST) {
            val pending = pendingPermissionRequest ?: return
            pendingPermissionRequest = null
            if (grantResults.isNotEmpty() && grantResults[0] == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                pending.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
            } else {
                pending.deny()
            }
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.removeJavascriptInterface("AndroidTts")
            webView.removeJavascriptInterface("AndroidHost")
            webView.destroy()
        }
        tts?.shutdown()
        tts = null
        super.onDestroy()
    }

    /** Speech only. Reached through the bridge in place of `speechSynthesis`. */
    private inner class NativeSpeech {
        @JavascriptInterface
        fun speak(text: String, language: String, rate: Double) {
            runOnUiThread {
                val engine = tts
                if (engine == null) return@runOnUiThread
                val locale = Locale.forLanguageTag(language)
                val availability = engine.isLanguageAvailable(locale)
                if (availability < TextToSpeech.LANG_AVAILABLE) {
                    Log.w(TAG, "No installed voice for $locale (availability=$availability)")
                    return@runOnUiThread
                }
                engine.language = locale
                engine.setSpeechRate(rate.toFloat().coerceIn(0.5f, 2f))
                engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, "pogruzhenie-speech")
            }
        }

        @JavascriptInterface
        fun cancel() = runOnUiThread { tts?.stop() }
    }

    /** Shell-side plumbing the web bundle asks for: external links and theming. */
    private inner class NativeHost {
        @JavascriptInterface
        fun openExternal(url: String) {
            runOnUiThread { openExternally(Uri.parse(url)) }
        }

        @JavascriptInterface
        fun setTheme(dark: Boolean) {
            runOnUiThread { applyTheme(dark) }
        }

        /**
         * Starts the Google consent flow. The bundle builds the URL because it
         * owns the PKCE challenge; all this side does is open it somewhere
         * Google is willing to render.
         */
        @JavascriptInterface
        fun openAuth(url: String) {
            runOnUiThread { openCustomTab(Uri.parse(url)) }
        }
    }

    private companion object {
        const val TAG = "Pogruzhenie"
        const val FILE_CHOOSER_REQUEST = 4711

        /** Must match `redirectTo` in `src/services/supabaseAuth.ts`. */
        const val authScheme = "ru.pogruzhenie.app"
        const val authHost = "auth-callback"

        /** Global the bundle installs to receive the redirect URL. */
        const val AUTH_RESULT_HANDLER = "__pogruzhenieAuthResult"


        /**
         * `WebSettings.MIXED_CONTENT_NEVER_ALLOW` by value. The bundle is served
         * over an https-like origin and loads nothing but its own assets, so
         * mixed content can only be an attack surface.
         */
        const val MIXED_CONTENT_NEVER_ALLOW = 1

        val PAPER_LIGHT = Color.rgb(245, 241, 230)
        val PAPER_DARK = Color.rgb(14, 23, 19)
    }
}
