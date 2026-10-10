package expo.modules.smsconsent

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import androidx.core.content.ContextCompat
import androidx.core.os.BundleCompat
import com.google.android.gms.auth.api.phone.SmsRetriever
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Status
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val REQUEST_CODE = 0x5C0D
private const val PLAY_SERVICES = "com.google.android.gms"

/**
 * Android SMS User Consent: the system asks once "allow <app> to read this
 * message?" and hands back that single SMS. No READ_SMS permission and no
 * app hash in the message, so the SMS gateway needs no special template.
 */
class SmsConsentModule : Module() {
  private var receiver: BroadcastReceiver? = null

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("SmsConsent")
    Events("onMessage", "onEnd")

    AsyncFunction("start") { promise: Promise ->
      stopListening()
      SmsRetriever.getClient(context)
        .startSmsUserConsent(null)
        .addOnSuccessListener {
          listen()
          promise.resolve(null)
        }
        .addOnFailureListener { error ->
          promise.reject("ERR_SMS_CONSENT", error.message, error)
        }
    }

    Function("stop") { stopListening() }

    OnActivityResult { _, payload ->
      if (payload.requestCode != REQUEST_CODE) return@OnActivityResult
      val message =
        if (payload.resultCode == Activity.RESULT_OK) {
          payload.data?.getStringExtra(SmsRetriever.EXTRA_SMS_MESSAGE)
        } else {
          null
        }
      if (message != null) {
        sendEvent("onMessage", mapOf("message" to message))
      } else {
        sendEvent("onEnd", mapOf("reason" to "declined"))
      }
    }

    OnDestroy { stopListening() }
  }

  private fun listen() {
    val next = object : BroadcastReceiver() {
      override fun onReceive(received: Context, intent: Intent) {
        if (intent.action != SmsRetriever.SMS_RETRIEVED_ACTION) return
        val extras = intent.extras ?: return
        val status = BundleCompat.getParcelable(extras, SmsRetriever.EXTRA_STATUS, Status::class.java)
        when (status?.statusCode) {
          CommonStatusCodes.SUCCESS -> {
            val consent =
              BundleCompat.getParcelable(extras, SmsRetriever.EXTRA_CONSENT_INTENT, Intent::class.java)
            showConsent(consent)
          }
          CommonStatusCodes.TIMEOUT -> sendEvent("onEnd", mapOf("reason" to "timeout"))
        }
        // One message per start(): the next code needs a new start().
        stopListening()
      }
    }
    // Only Play services may deliver this broadcast; any other app sending
    // SMS_RETRIEVED_ACTION is ignored.
    ContextCompat.registerReceiver(
      context,
      next,
      IntentFilter(SmsRetriever.SMS_RETRIEVED_ACTION),
      SmsRetriever.SEND_PERMISSION,
      null,
      ContextCompat.RECEIVER_EXPORTED,
    )
    receiver = next
  }

  private fun showConsent(consent: Intent?) {
    val activity = appContext.currentActivity ?: return
    if (consent == null) return
    // Intent redirection guard: launch it only if it is Play services' own
    // screen and carries no URI grants.
    val target = consent.resolveActivity(activity.packageManager)
    val grants = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
    if (target?.packageName != PLAY_SERVICES || consent.flags and grants != 0) return
    try {
      activity.startActivityForResult(consent, REQUEST_CODE)
    } catch (_: ActivityNotFoundException) {
      sendEvent("onEnd", mapOf("reason" to "unavailable"))
    }
  }

  private fun stopListening() {
    val current = receiver ?: return
    receiver = null
    try {
      context.unregisterReceiver(current)
    } catch (_: IllegalArgumentException) {
      // Already unregistered.
    }
  }
}
