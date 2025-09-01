<script type="module">
import createModule from './ca.js';

(async () => {
  const Module = await createModule();

  // === יצירת Root CA ===
  const ca = Module.generate_ca(3650); // תוקף 10 שנים
  console.log("CA cert:", ca.certPem);
  console.log("CA key:", ca.keyPem);

  // === יצירת שרשרת ===
  const chain = Module.generate_chain(3650, 825); // Root/Inter ל-10 שנים, Leaf לשנתיים ושליש
  console.log("Leaf cert:", chain.leafCertPem);
  console.log("Chain PEM:", chain.chainPem);

  // === הצפנה ופענוח ===
  const message = "Hello Ariel";
  const ct = Module.rsa_encrypt_b64(chain.leafCertPem, message);
  console.log("Ciphertext (b64):", ct);

  const pt = Module.rsa_decrypt_b64(chain.leafKeyPem, ct);
  console.log("Plaintext:", pt); // "Hello Ariel"

  // === חתימה ואימות ===
  const sig = Module.rsa_sign_b64(chain.leafKeyPem, message);
  console.log("Signature b64:", sig);

  const ok = Module.rsa_verify_b64(chain.leafCertPem, message, sig);
  console.log("Verify:", ok); // true
})();
</script>