// ca.cpp
#include <string>
#include <vector>
#include <stdexcept>
#include <ctime>
#include <cstring>

#include <emscripten.h>
#include <emscripten/bind.h>

extern "C" {
#include "mbedtls/entropy.h"
#include "mbedtls/ctr_drbg.h"
#include "mbedtls/pk.h"
#include "mbedtls/rsa.h"
#include "mbedtls/ecp.h"
#include "mbedtls/x509.h"
#include "mbedtls/x509_crt.h"
#include "mbedtls/x509_csr.h"
#include "mbedtls/pem.h"
#include "mbedtls/md.h"
#include "mbedtls/base64.h"
}

// ---------- Models ----------
struct CAResult {
  std::string certPem;
  std::string keyPem;
};

struct ChainResult {
  std::string rootCertPem, rootKeyPem;
  std::string interCertPem, interKeyPem;
  std::string leafCertPem,  leafKeyPem;
  std::string chainPem; // leaf + inter + root
};

struct VerifyResult {
  bool ok;
  uint32_t flags;
  std::string info;
};

// ---------- Time helper ----------
static std::string asn1_time_from(time_t t) {
  struct tm tm_buf;
#if defined(_WIN32)
  gmtime_s(&tm_buf, &t);
#else
  gmtime_r(&t, &tm_buf);
#endif
  char buf[16];
  strftime(buf, sizeof(buf), "%Y%m%d%H%M%S", &tm_buf);
  return std::string(buf);
}

// ---------- RNG: use WebCrypto via JS ----------
EM_JS(int, js_random_fill, (unsigned char* buf, int len), {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(HEAPU8.subarray(buf, buf + len));
    return 0;
  }
  return -1;
});

static int wasm_entropy_poll(void* /*data*/, unsigned char* output, size_t len, size_t* olen) {
  if (js_random_fill(output, (int)len) != 0) {
    return MBEDTLS_ERR_ENTROPY_SOURCE_FAILED;
  }
  *olen = len;
  return 0;
}

static void init_rng(mbedtls_entropy_context& entropy, mbedtls_ctr_drbg_context& ctr_drbg) {
  mbedtls_entropy_init(&entropy);
  mbedtls_ctr_drbg_init(&ctr_drbg);
  mbedtls_entropy_add_source(&entropy, wasm_entropy_poll, nullptr, 32, MBEDTLS_ENTROPY_SOURCE_STRONG);
  const char *pers = "mbedtls_wasm_rng";
  int ret = mbedtls_ctr_drbg_seed(&ctr_drbg, mbedtls_entropy_func, &entropy,
                                  (const unsigned char*)pers, strlen(pers));
  if (ret != 0) throw std::runtime_error("DRBG seed failed");
}

// ---------- Base64 helpers ----------
static std::string b64encode(const unsigned char* buf, size_t len) {
  size_t out_len = 0;
  mbedtls_base64_encode(nullptr, 0, &out_len, buf, len);
  std::string out(out_len, '\0');
  if (mbedtls_base64_encode((unsigned char*)&out[0], out_len, &out_len, buf, len) != 0)
    throw std::runtime_error("base64 encode failed");
  out.resize(out_len);
  return out;
}

static std::vector<unsigned char> b64decode(const std::string& s) {
  size_t out_len = 0;
  mbedtls_base64_decode(nullptr, 0, &out_len, (const unsigned char*)s.data(), s.size());
  std::vector<unsigned char> out(out_len);
  if (mbedtls_base64_decode(out.data(), out.size(), &out_len,
        (const unsigned char*)s.data(), s.size()) != 0)
    throw std::runtime_error("base64 decode failed");
  out.resize(out_len);
  return out;
}

// ---------- Key/Cert load helpers ----------
static void load_privkey_from_pem(const std::string& pem, mbedtls_pk_context& pk) {
  mbedtls_pk_init(&pk);
  int ret = mbedtls_pk_parse_key(&pk,
    (const unsigned char*)pem.data(), pem.size()+1,
    nullptr, 0, nullptr, nullptr);
  if (ret != 0) throw std::runtime_error("parse private key failed");
}

static void load_pubkey_or_cert_pub_from_pem(const std::string& pem,
                                             mbedtls_pk_context& pk,
                                             mbedtls_x509_crt* optCert = nullptr) {
  if (pem.find("BEGIN CERTIFICATE") != std::string::npos) {
    if (!optCert) throw std::runtime_error("cert parse needs cert object");
    mbedtls_x509_crt_init(optCert);
    int ret = mbedtls_x509_crt_parse(optCert,
      (const unsigned char*)pem.data(), pem.size()+1);
    if (ret != 0) throw std::runtime_error("parse cert failed");

    // Write pubkey to PEM and parse into a fresh pk
    unsigned char tmp[4096];
    ret = mbedtls_pk_write_pubkey_pem(&optCert->pk, tmp, sizeof(tmp));
    if (ret != 0) throw std::runtime_error("write pubkey pem failed");

    mbedtls_pk_init(&pk);
    ret = mbedtls_pk_parse_public_key(&pk, tmp, strlen((char*)tmp)+1);
    if (ret != 0) throw std::runtime_error("parse public key failed");
  } else {
    mbedtls_pk_init(&pk);
    int ret = mbedtls_pk_parse_public_key(&pk,
      (const unsigned char*)pem.data(), pem.size()+1);
    if (ret != 0) throw std::runtime_error("parse public key failed");
  }
}

// ---------- Simple RSA keypair helper ----------
static void gen_rsa_keypair(mbedtls_pk_context& key, int bits,
                            mbedtls_ctr_drbg_context& ctr) {
  mbedtls_pk_init(&key);
  if (mbedtls_pk_setup(&key, mbedtls_pk_info_from_type(MBEDTLS_PK_RSA)) != 0)
    throw std::runtime_error("pk_setup failed");
  if (mbedtls_rsa_gen_key(mbedtls_pk_rsa(key), mbedtls_ctr_drbg_random, &ctr, bits, 65537) != 0)
    throw std::runtime_error("rsa_gen_key failed");
}

// ---------- Cert writer (signed by issuerKey) ----------
static void write_cert_signed(const std::string& subjectName,
                              int days_valid, bool is_ca, int pathlen,
                              mbedtls_pk_context& subjectKey,
                              mbedtls_pk_context& issuerKey,
                              const std::string& issuerName,
                              std::string& outCertPem) {
  mbedtls_x509write_cert crt; mbedtls_x509write_crt_init(&crt);
  mbedtls_mpi serial; mbedtls_mpi_init(&serial);

  // serial
  mbedtls_entropy_context e; mbedtls_ctr_drbg_context d; init_rng(e,d);
  unsigned char rnd[16];
  mbedtls_ctr_drbg_random(&d, rnd, sizeof(rnd));
  mbedtls_mpi_read_binary(&serial, rnd, sizeof(rnd));

  mbedtls_x509write_crt_set_md_alg(&crt, MBEDTLS_MD_SHA256);
  mbedtls_x509write_crt_set_version(&crt, MBEDTLS_X509_CRT_VERSION_3);
  mbedtls_x509write_crt_set_serial(&crt, &serial);
  mbedtls_x509write_crt_set_subject_key(&crt, &subjectKey);
  mbedtls_x509write_crt_set_issuer_key(&crt, &issuerKey);

  time_t now = std::time(nullptr);
  std::string nb = asn1_time_from(now - 60);
  std::string na = asn1_time_from(now + (long long)days_valid * 24 * 3600);
  mbedtls_x509write_crt_set_validity(&crt, nb.c_str(), na.c_str());

  mbedtls_x509write_crt_set_subject_name(&crt, subjectName.c_str());
  mbedtls_x509write_crt_set_issuer_name(&crt,  issuerName.c_str());

  // basic constraints + key usage
  mbedtls_x509write_crt_set_basic_constraints(&crt, is_ca ? 1 : 0, pathlen);
  unsigned ku = is_ca ? (MBEDTLS_X509_KU_KEY_CERT_SIGN | MBEDTLS_X509_KU_CRL_SIGN)
                      : (MBEDTLS_X509_KU_DIGITAL_SIGNATURE | MBEDTLS_X509_KU_KEY_ENCIPHERMENT);
  mbedtls_x509write_crt_set_key_usage(&crt, ku);

  std::vector<unsigned char> pem(8192);
  int ret = mbedtls_x509write_crt_pem(&crt, pem.data(), pem.size(), mbedtls_ctr_drbg_random, &d);
  if (ret < 0) throw std::runtime_error("write crt pem failed");

  outCertPem = std::string((char*)pem.data());

  mbedtls_mpi_free(&serial);
  mbedtls_x509write_crt_free(&crt);
  mbedtls_ctr_drbg_free(&d); mbedtls_entropy_free(&e);
}

// ---------- Public API: generate CA (self-signed) with custom DN ----------
CAResult generate_ca(int days_valid, const std::string& dn) {
  CAResult out;

  mbedtls_entropy_context entropy; mbedtls_ctr_drbg_context ctr_drbg;
  init_rng(entropy, ctr_drbg);

  // key
  mbedtls_pk_context key;
  gen_rsa_keypair(key, 2048, ctr_drbg);

  // serial
  mbedtls_mpi serial; mbedtls_mpi_init(&serial);
  unsigned char rnd[16];
  mbedtls_ctr_drbg_random(&ctr_drbg, rnd, sizeof(rnd));
  mbedtls_mpi_read_binary(&serial, rnd, sizeof(rnd));

  // cert
  mbedtls_x509write_cert crt; mbedtls_x509write_crt_init(&crt);
  mbedtls_x509write_crt_set_md_alg(&crt, MBEDTLS_MD_SHA256);
  mbedtls_x509write_crt_set_subject_key(&crt, &key);
  mbedtls_x509write_crt_set_issuer_key(&crt, &key);
  mbedtls_x509write_crt_set_serial(&crt, &serial);

  time_t now = std::time(nullptr);
  std::string not_before = asn1_time_from(now - 60);
  std::string not_after  = asn1_time_from(now + (long long)days_valid * 24 * 3600);
  mbedtls_x509write_crt_set_validity(&crt, not_before.c_str(), not_after.c_str());

  // use provided DN
  mbedtls_x509write_crt_set_subject_name(&crt, dn.c_str());
  mbedtls_x509write_crt_set_issuer_name(&crt, dn.c_str());

  // CA constraints
  mbedtls_x509write_crt_set_version(&crt, MBEDTLS_X509_CRT_VERSION_3);
  mbedtls_x509write_crt_set_basic_constraints(&crt, 1, 1);
  unsigned int ku = MBEDTLS_X509_KU_KEY_CERT_SIGN | MBEDTLS_X509_KU_CRL_SIGN;
  mbedtls_x509write_crt_set_key_usage(&crt, ku);

  // write PEMs
  std::vector<unsigned char> certBuf(8192);
  std::vector<unsigned char> keyBuf(8192);

  int ret = mbedtls_x509write_crt_pem(&crt, certBuf.data(), certBuf.size(),
                                  mbedtls_ctr_drbg_random, &ctr_drbg);
  if (ret < 0) throw std::runtime_error("crt_pem failed");

  ret = mbedtls_pk_write_key_pem(&key, keyBuf.data(), keyBuf.size());
  if (ret < 0) throw std::runtime_error("key_pem failed");

  out.certPem = std::string((char*)certBuf.data());
  out.keyPem  = std::string((char*)keyBuf.data());

  mbedtls_mpi_free(&serial);
  mbedtls_x509write_crt_free(&crt);
  mbedtls_pk_free(&key);
  mbedtls_ctr_drbg_free(&ctr_drbg);
  mbedtls_entropy_free(&entropy);

  return out;
}

// ---------- Public API: RSA encrypt/decrypt (Base64) ----------
std::string rsa_encrypt_b64(const std::string& pubOrCertPem, const std::string& plaintext) {
  mbedtls_pk_context pub; mbedtls_x509_crt cert;
  bool usedCert = (pubOrCertPem.find("BEGIN CERTIFICATE") != std::string::npos);
  if (usedCert) load_pubkey_or_cert_pub_from_pem(pubOrCertPem, pub, &cert);
  else          load_pubkey_or_cert_pub_from_pem(pubOrCertPem, pub, nullptr);

  mbedtls_entropy_context entropy; mbedtls_ctr_drbg_context ctr;
  init_rng(entropy, ctr);

  // To switch to OAEP:
  // if (mbedtls_pk_can_do(&pub, MBEDTLS_PK_RSA)) {
  //   mbedtls_rsa_context* rsa = mbedtls_pk_rsa(pub);
  //   mbedtls_rsa_set_padding(rsa, MBEDTLS_RSA_PKCS_V21, MBEDTLS_MD_SHA256);
  // }

  size_t key_len = mbedtls_pk_get_len(&pub);
  std::vector<unsigned char> out(key_len);
  size_t out_len = 0;

  int ret = mbedtls_pk_encrypt(&pub,
      (const unsigned char*)plaintext.data(), plaintext.size(),
      out.data(), &out_len, out.size(),
      mbedtls_ctr_drbg_random, &ctr);
  if (ret != 0) throw std::runtime_error("rsa encrypt failed");

  std::string b64 = b64encode(out.data(), out_len);

  if (usedCert) mbedtls_x509_crt_free(&cert);
  mbedtls_pk_free(&pub);
  mbedtls_ctr_drbg_free(&ctr); mbedtls_entropy_free(&entropy);
  return b64;
}

std::string rsa_decrypt_b64(const std::string& privPem, const std::string& ciphertext_b64) {
  mbedtls_pk_context priv; load_privkey_from_pem(privPem, priv);

  mbedtls_entropy_context entropy; mbedtls_ctr_drbg_context ctr;
  init_rng(entropy, ctr);

  // If used OAEP in encrypt, enable here too:
  // if (mbedtls_pk_can_do(&priv, MBEDTLS_PK_RSA)) {
  //   mbedtls_rsa_context* rsa = mbedtls_pk_rsa(priv);
  //   mbedtls_rsa_set_padding(rsa, MBEDTLS_RSA_PKCS_V21, MBEDTLS_MD_SHA256);
  // }

  std::vector<unsigned char> ct = b64decode(ciphertext_b64);
  size_t key_len = mbedtls_pk_get_len(&priv);
  std::vector<unsigned char> out(key_len);
  size_t out_len = 0;

  int ret = mbedtls_pk_decrypt(&priv,
      ct.data(), ct.size(),
      out.data(), &out_len, out.size(),
      mbedtls_ctr_drbg_random, &ctr);
  if (ret != 0) throw std::runtime_error("rsa decrypt failed");

  std::string plain((char*)out.data(), (char*)out.data() + out_len);

  mbedtls_pk_free(&priv);
  mbedtls_ctr_drbg_free(&ctr); mbedtls_entropy_free(&entropy);
  return plain;
}

// ---------- Public API: RSA sign/verify (SHA-256, Base64) ----------
std::string rsa_sign_b64(const std::string& privPem, const std::string& data) {
  mbedtls_pk_context priv; load_privkey_from_pem(privPem, priv);

  unsigned char hash[32];
  const mbedtls_md_info_t* info = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
  if (mbedtls_md(info, (const unsigned char*)data.data(), data.size(), hash) != 0)
    throw std::runtime_error("hash failed");

  mbedtls_entropy_context entropy; mbedtls_ctr_drbg_context ctr;
  init_rng(entropy, ctr);

  size_t sig_sz = mbedtls_pk_get_len(&priv);
  std::vector<unsigned char> sig(sig_sz);
  size_t sig_len = 0;

  int ret = mbedtls_pk_sign(&priv, MBEDTLS_MD_SHA256,
                            hash, 32, sig.data(), sig.size(), &sig_len,
                            mbedtls_ctr_drbg_random, &ctr);
  if (ret != 0) throw std::runtime_error("sign failed");

  std::string out = b64encode(sig.data(), sig_len);

  mbedtls_pk_free(&priv);
  mbedtls_ctr_drbg_free(&ctr); mbedtls_entropy_free(&entropy);
  return out;
}

bool rsa_verify_b64(const std::string& pubOrCertPem, const std::string& data, const std::string& sig_b64) {
  mbedtls_pk_context pub; mbedtls_x509_crt cert;
  bool usedCert = (pubOrCertPem.find("BEGIN CERTIFICATE") != std::string::npos);
  if (usedCert) load_pubkey_or_cert_pub_from_pem(pubOrCertPem, pub, &cert);
  else          load_pubkey_or_cert_pub_from_pem(pubOrCertPem, pub, nullptr);

  unsigned char hash[32];
  const mbedtls_md_info_t* info = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
  if (mbedtls_md(info, (const unsigned char*)data.data(), data.size(), hash) != 0)
    throw std::runtime_error("hash failed");

  std::vector<unsigned char> sig = b64decode(sig_b64);
  int ret = mbedtls_pk_verify(&pub, MBEDTLS_MD_SHA256, hash, 32, sig.data(), sig.size());

  if (usedCert) mbedtls_x509_crt_free(&cert);
  mbedtls_pk_free(&pub);
  return (ret == 0);
}

// ---------- Public API: Root→Intermediate→Leaf chain (fixed DNs) ----------
ChainResult generate_chain(int days_ca, int days_leaf) {
  return /* delegate to DN version with defaults */ 
    [&](){
      return
        [&](){
          return
            [&]()->ChainResult{
              const std::string rootDN  = "CN=My Root CA,O=Example,C=IL";
              const std::string interDN = "CN=My Intermediate CA,O=Example,C=IL";
              const std::string leafDN  = "CN=app.local,O=Example,C=IL";
              // call DN variant:
              extern ChainResult generate_chain_dn(int,int,const std::string&,const std::string&,const std::string&);
              return generate_chain_dn(days_ca, days_leaf, rootDN, interDN, leafDN);
            }();
        }();
    }();
}

// ---------- Public API: Root→Intermediate→Leaf chain with custom DNs ----------
ChainResult generate_chain_dn(int days_ca, int days_leaf,
                              const std::string& rootDN,
                              const std::string& interDN,
                              const std::string& leafDN) {
  ChainResult R;

  // ROOT
  {
    mbedtls_entropy_context e; mbedtls_ctr_drbg_context d; init_rng(e,d);
    mbedtls_pk_context rootKey; gen_rsa_keypair(rootKey, 2048, d);

    write_cert_signed(rootDN, days_ca, true, 1,
                      rootKey, rootKey, rootDN, R.rootCertPem);

    std::vector<unsigned char> pem(4096);
    if (mbedtls_pk_write_key_pem(&rootKey, pem.data(), pem.size()) < 0)
      throw std::runtime_error("root key pem failed");
    R.rootKeyPem = std::string((char*)pem.data());

    mbedtls_pk_free(&rootKey);
    mbedtls_ctr_drbg_free(&d); mbedtls_entropy_free(&e);
  }

  // INTERMEDIATE
  {
    mbedtls_entropy_context e; mbedtls_ctr_drbg_context d; init_rng(e,d);
    mbedtls_pk_context interKey; gen_rsa_keypair(interKey, 2048, d);

    mbedtls_pk_context rootKey; load_privkey_from_pem(R.rootKeyPem, rootKey);

    write_cert_signed(interDN, days_ca, true, 0,
                      interKey, rootKey, rootDN, R.interCertPem);

    std::vector<unsigned char> pem(4096);
    if (mbedtls_pk_write_key_pem(&interKey, pem.data(), pem.size()) < 0)
      throw std::runtime_error("inter key pem failed");
    R.interKeyPem = std::string((char*)pem.data());

    mbedtls_pk_free(&rootKey);
    mbedtls_pk_free(&interKey);
    mbedtls_ctr_drbg_free(&d); mbedtls_entropy_free(&e);
  }

  // LEAF
  {
    mbedtls_entropy_context e; mbedtls_ctr_drbg_context d; init_rng(e,d);
    mbedtls_pk_context leafKey; gen_rsa_keypair(leafKey, 2048, d);

    mbedtls_pk_context interKey; load_privkey_from_pem(R.interKeyPem, interKey);

    write_cert_signed(leafDN, days_leaf, false, -1,
                      leafKey, interKey, interDN, R.leafCertPem);

    std::vector<unsigned char> pem(4096);
    if (mbedtls_pk_write_key_pem(&leafKey, pem.data(), pem.size()) < 0)
      throw std::runtime_error("leaf key pem failed");
    R.leafKeyPem = std::string((char*)pem.data());

    mbedtls_pk_free(&interKey);
    mbedtls_pk_free(&leafKey);
    mbedtls_ctr_drbg_free(&d); mbedtls_entropy_free(&e);
  }

  R.chainPem = R.leafCertPem + R.interCertPem + R.rootCertPem;
  return R;
}

// ---------- Public API: verify chain against trust anchors ----------
VerifyResult verify_chain(const std::string& trustPem,
                          const std::string& chainPem,
                          const std::string& hostname) {
  mbedtls_x509_crt trust, chain;
  mbedtls_x509_crt_init(&trust); mbedtls_x509_crt_init(&chain);
  unsigned int flags = 0; VerifyResult R{false, 0, ""};

  if (mbedtls_x509_crt_parse(&trust, (const unsigned char*)trustPem.data(), trustPem.size()+1) != 0)
    throw std::runtime_error("parse trust PEM failed");
  if (mbedtls_x509_crt_parse(&chain, (const unsigned char*)chainPem.data(), chainPem.size()+1) != 0)
    throw std::runtime_error("parse chain PEM failed");

  int rc = mbedtls_x509_crt_verify_with_profile(
      &chain, &trust, /*crl=*/nullptr,
      &mbedtls_x509_crt_profile_default,
      hostname.empty() ? nullptr : hostname.c_str(),
      &flags, /*f_vrfy=*/nullptr, /*p_vrfy=*/nullptr);

  char buf[1024]; buf[0]=0;
  if (flags) mbedtls_x509_crt_verify_info(buf, sizeof(buf), "  ", flags);
  R.ok = (rc == 0); R.flags = flags; R.info = std::string(buf);

  mbedtls_x509_crt_free(&chain); mbedtls_x509_crt_free(&trust);
  return R;
}

// ---------- Public API: Get public Key from private ----------
std::string derive_public_pem(const std::string& privPem) {
  mbedtls_pk_context pk;
  load_privkey_from_pem(privPem, pk);  

  unsigned char buf[8192];
  int ret = mbedtls_pk_write_pubkey_pem(&pk, buf, sizeof(buf));
  if (ret != 0) {
    mbedtls_pk_free(&pk);
    throw std::runtime_error("write pubkey pem failed");
  }

  std::string out((char*)buf);
  mbedtls_pk_free(&pk);
  return out;
}

// ---------- Embind ----------
EMSCRIPTEN_BINDINGS(ca_module) {
  emscripten::value_object<CAResult>("CAResult")
    .field("certPem", &CAResult::certPem)
    .field("keyPem",  &CAResult::keyPem);

  emscripten::value_object<ChainResult>("ChainResult")
    .field("rootCertPem", &ChainResult::rootCertPem)
    .field("rootKeyPem",  &ChainResult::rootKeyPem)
    .field("interCertPem",&ChainResult::interCertPem)
    .field("interKeyPem", &ChainResult::interKeyPem)
    .field("leafCertPem", &ChainResult::leafCertPem)
    .field("leafKeyPem",  &ChainResult::leafKeyPem)
    .field("chainPem",    &ChainResult::chainPem);

  emscripten::value_object<VerifyResult>("VerifyResult")
    .field("ok",    &VerifyResult::ok)
    .field("flags", &VerifyResult::flags)
    .field("info",  &VerifyResult::info);

  emscripten::function("generate_ca",       &generate_ca);        // (days, dn)
  emscripten::function("generate_chain",    &generate_chain);     // fixed DNs (שומר תאימות)
  emscripten::function("generate_chain_dn", &generate_chain_dn);  // (days_ca, days_leaf, rootDN, interDN, leafDN)
  emscripten::function("rsa_encrypt_b64",   &rsa_encrypt_b64);
  emscripten::function("rsa_decrypt_b64",   &rsa_decrypt_b64);
  emscripten::function("rsa_sign_b64",      &rsa_sign_b64);
  emscripten::function("rsa_verify_b64",    &rsa_verify_b64);
  emscripten::function("verify_chain",      &verify_chain);
  emscripten::function("derive_public_pem", &derive_public_pem);
}
