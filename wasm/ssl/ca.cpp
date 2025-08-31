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
#include "mbedtls/x509_crt.h"   // ב־3.x זה כולל גם פונקציות כתיבה
#include "mbedtls/x509_csr.h"
#include "mbedtls/pem.h"
#include "mbedtls/md.h"
}

struct CAResult {
  std::string certPem;
  std::string keyPem;
};

// פונקציה פשוטה להפקת זמן ASN1 בפורמט "YYYYMMDDhhmmss"
static std::string asn1_time_from(time_t t) {
  struct tm tm_buf;
  gmtime_r(&t, &tm_buf);
  char buf[16];
  strftime(buf, sizeof(buf), "%Y%m%d%H%M%S", &tm_buf);
  return std::string(buf);
}

CAResult generate_ca(int days_valid) {
  CAResult out;

  // אובייקטים של mbedTLS
  mbedtls_pk_context key;
  mbedtls_x509write_cert crt;
  mbedtls_entropy_context entropy;
  mbedtls_ctr_drbg_context ctr_drbg;
  mbedtls_mpi serial;

  mbedtls_pk_init(&key);
  mbedtls_x509write_crt_init(&crt);
  mbedtls_entropy_init(&entropy);
  mbedtls_ctr_drbg_init(&ctr_drbg);
  mbedtls_mpi_init(&serial);

  const char *pers = "ca_generator";
  int ret = mbedtls_ctr_drbg_seed(&ctr_drbg, mbedtls_entropy_func,
                                  &entropy,
                                  (const unsigned char*)pers,
                                  strlen(pers));
  if (ret != 0) throw std::runtime_error("DRBG seed failed");

  // הפקת מפתח RSA
  ret = mbedtls_pk_setup(&key, mbedtls_pk_info_from_type(MBEDTLS_PK_RSA));
  if (ret != 0) throw std::runtime_error("pk_setup failed");

  ret = mbedtls_rsa_gen_key(mbedtls_pk_rsa(key),
                            mbedtls_ctr_drbg_random, &ctr_drbg,
                            2048, 65537);
  if (ret != 0) throw std::runtime_error("rsa_gen_key failed");

  // מספר סידורי רנדומלי
  unsigned char rnd[16];
  ret = mbedtls_ctr_drbg_random(&ctr_drbg, rnd, sizeof(rnd));
  if (ret != 0) throw std::runtime_error("serial rand failed");

  ret = mbedtls_mpi_read_binary(&serial, rnd, sizeof(rnd));
  if (ret != 0) throw std::runtime_error("mpi_read_binary failed");

  // הגדרות תעודה
  mbedtls_x509write_crt_set_md_alg(&crt, MBEDTLS_MD_SHA256);
  mbedtls_x509write_crt_set_subject_key(&crt, &key);
  mbedtls_x509write_crt_set_issuer_key(&crt, &key);
  mbedtls_x509write_crt_set_serial(&crt, &serial);

  time_t now = std::time(nullptr);
  std::string not_before = asn1_time_from(now - 60);
  std::string not_after  = asn1_time_from(now + (long long)days_valid * 24 * 3600);

  mbedtls_x509write_crt_set_validity(&crt,
    not_before.c_str(),
    not_after.c_str());

  mbedtls_x509write_crt_set_subject_name(&crt,
    "CN=My Test CA,O=Example,C=IL");
  mbedtls_x509write_crt_set_issuer_name(&crt,
    "CN=My Test CA,O=Example,C=IL");

  unsigned int ku = MBEDTLS_X509_KU_KEY_CERT_SIGN | MBEDTLS_X509_KU_CRL_SIGN;
  mbedtls_x509write_crt_set_key_usage(&crt, ku);

  // יצירת PEM
  std::vector<unsigned char> certBuf(8192);
  std::vector<unsigned char> keyBuf(8192);

  ret = mbedtls_x509write_crt_pem(&crt, certBuf.data(), certBuf.size(),
                                  mbedtls_ctr_drbg_random, &ctr_drbg);
  if (ret < 0) throw std::runtime_error("crt_pem failed");

  ret = mbedtls_pk_write_key_pem(&key, keyBuf.data(), keyBuf.size());
  if (ret < 0) throw std::runtime_error("key_pem failed");

  out.certPem = std::string((char*)certBuf.data());
  out.keyPem  = std::string((char*)keyBuf.data());

  // ניקוי
  mbedtls_mpi_free(&serial);
  mbedtls_x509write_crt_free(&crt);
  mbedtls_pk_free(&key);
  mbedtls_entropy_free(&entropy);
  mbedtls_ctr_drbg_free(&ctr_drbg);

  return out;
}

// לחשוף ל-JS
EMSCRIPTEN_BINDINGS(ca_module) {
  emscripten::value_object<CAResult>("CAResult")
    .field("certPem", &CAResult::certPem)
    .field("keyPem",  &CAResult::keyPem);

  emscripten::function("generate_ca", &generate_ca);
}
