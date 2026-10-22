package expo.modules.localreminders

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Seals reminder text before it goes into WorkManager's database, which is a plain SQLite file.
 * The AES-256-GCM key lives in the Android Keystore and can't be exported. No user authentication or
 * unlocked device is required, because reminders have to fire while the phone is locked.
 */
internal object ReminderCipher {
  private const val ALIAS = "nomad-days-reminders"
  private const val TRANSFORMATION = "AES/GCM/NoPadding"
  private const val IV_BYTES = 12
  private const val TAG_BITS = 128

  private fun key(): SecretKey {
    val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    (store.getKey(ALIAS, null) as? SecretKey)?.let { return it }
    val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
    generator.init(
      KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .setKeySize(256)
        .build()
    )
    return generator.generateKey()
  }

  /** Base64 of IV followed by ciphertext and tag. The Keystore picks a fresh random IV each time. */
  fun seal(text: String): String {
    val cipher = Cipher.getInstance(TRANSFORMATION).apply { init(Cipher.ENCRYPT_MODE, key()) }
    return Base64.encodeToString(cipher.iv + cipher.doFinal(text.toByteArray(Charsets.UTF_8)), Base64.NO_WRAP)
  }

  /** Null if the text can't be opened (for example the key was wiped by a restore to a new phone) */
  fun open(sealed: String): String? = runCatching {
    val bytes = Base64.decode(sealed, Base64.NO_WRAP)
    val cipher = Cipher.getInstance(TRANSFORMATION).apply {
      init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(TAG_BITS, bytes, 0, IV_BYTES))
    }
    String(cipher.doFinal(bytes, IV_BYTES, bytes.size - IV_BYTES), Charsets.UTF_8)
  }.getOrNull()
}
