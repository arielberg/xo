 emcmake cmake -S . -B build \
  -DENABLE_TESTING=OFF -DENABLE_PROGRAMS=OFF \
  -DMBEDTLS_BUILD_TLS_LIBRARY=OFF \        
  -DMBEDTLS_FATAL_WARNINGS=OFF \
  -DCMAKE_BUILD_TYPE=Release
emmake cmake --build build -j
 
 em++ ca.cpp   -I "$SYS/include"   -L "$SYS/lib"   -lmbedx509 -lmbedcrypto -lmbedtls   --bind   -std=c++17 -O3   -sENVIRONMENT=web   -sMODULARIZE   -sEXPORT_ES6=1   -o /workspace/xo/wasm/ssl/ca.js


 em++ ca.cpp -I ./mbedtls/include  ./mbedtls/library/libmbedcrypto.a ./mbedtls/library/libmbedx509.a  ./mbedtls/library/libmbedtls.a 
  -sENVIRONMENT=web  -sMODULARIZE -sEXPORT_ES6  -sALLOW_MEMORY_GROWTH -lembind -O3  -o ca.js


 em++ ca.cpp -I mbedtls/include mbedtls/build/library/libmbedcrypto.a  mbedtls/build/library/libmbedx509.a  -sENVIRONMENT=web -sMODULARIZE -sEXPORT_ES6  -sALLOW_MEMORY_GROWTH -sDISABLE_EXCEPTION_CATCHING=0  -lembind -O3  -o ca.js
