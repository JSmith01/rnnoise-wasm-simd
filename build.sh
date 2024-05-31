set -eu -o pipefail
mkdir -p dist
npx terser src/processor.js -o dist/rnnoise-processor.js
npx terser src/runtime.js -o dist/rnnoise-runtime.js
emcc \
    -s ENVIRONMENT=worker \
    -s TOTAL_STACK=49152 -s TOTAL_MEMORY=327680 \
    -g0 -O3 --no-entry -Wno-null-dereference \
    -msimd128 \
    -DENABLE_WASM_SIMD \
    -o dist/rnnoise-processor.wasm \
    -Irnnoise/include \
    rnnoise/src/celt_lpc.c \
    rnnoise/src/denoise.c \
    rnnoise/src/kiss_fft.c \
    rnnoise/src/pitch.c \
    rnnoise/src/rnn.c \
    rnnoise/src/rnn_data.c \
    src/worklet.c

node paste-wasm.js

