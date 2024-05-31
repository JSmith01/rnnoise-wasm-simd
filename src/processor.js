const code = 'WASM_CODE_BASE64';

const module = new WebAssembly.Module(base64ToUint8Array(code));
const _instance = new WebAssembly.Instance(module, {
    'wasi_snapshot_preview1': {
        proc_exit: () => 0,
        fd_close: () => 0,
        fd_write: () => 0,
        fd_seek: () => 0,
    },
});
const instance = _instance.exports;
const heapFloat32 = new Float32Array(instance.memory.buffer);


function base64ToUint8Array(base64) {
    if (!base64ToUint8Array.lookup) {
        const lookup = new Uint8Array(256);
        const base64charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        for (let i = 0; i < base64charset.length; i++) {
            lookup[base64charset.charCodeAt(i)] = i;
        }
        base64ToUint8Array.lookup = lookup;
    }

    let cleanBase64 = base64;
    if (base64.endsWith('==')) {
        cleanBase64 = base64.slice(0, -2);
    } else if (base64.endsWith('=')) {
        cleanBase64 = base64.slice(0, -1);
    }
    const length = cleanBase64.length;
    const bytes = new Uint8Array(length * 0.75);

    let ptr = 0;
    for (let i = 0; i < length; i += 4) {
        const encoded1 = base64ToUint8Array.lookup[cleanBase64.charCodeAt(i)];
        const encoded2 = base64ToUint8Array.lookup[cleanBase64.charCodeAt(i + 1)];
        const encoded3 = base64ToUint8Array.lookup[cleanBase64.charCodeAt(i + 2)];
        const encoded4 = base64ToUint8Array.lookup[cleanBase64.charCodeAt(i + 3)];

        bytes[ptr++] = (encoded1 << 2) | (encoded2 >> 4);
        if (encoded3 !== undefined) {
            bytes[ptr++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
        }
        if (encoded4 !== undefined) {
            bytes[ptr++] = ((encoded3 & 3) << 6) | encoded4;
        }
    }

    return bytes;
}


class RnnoiseProcessor extends AudioWorkletProcessor {
    isTalking = false;
    vadAvg = 0;

    constructor(options) {
        super({
            ...options,
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [1]
        });

        this.avgCount = options?.processorOptions?.avgCount ?? 7;
        this.vadSensitivity = options?.processorOptions?.vadSensitivity ?? 0.9;
        this.state = instance.newState();
        this.alive = true;
        this.port.onmessage = ({ data: keepalive }) => {
            if (!this.alive) return;

            if (keepalive) {
                this.port.postMessage({ vadProb: this.vadAvg, isTalking: this.isTalking });
            } else {
                this.alive = false;
                instance.deleteState(this.state);
            }
        };
    }

    process(input, output) {
        if (!this.alive) return true;

        heapFloat32.set(input[0][0], instance.getInput(this.state) / 4);
        const o = output[0][0];
        const ptr4 = instance.pipe(this.state, o.length) / 4;
        if (ptr4) {
            o.set(heapFloat32.subarray(ptr4, ptr4 + o.length));
        }

        this.vadAvg = (this.vadAvg * this.avgCount + instance.getVadProb(this.state)) / (this.avgCount + 1);
        const prevTalking = this.isTalking;
        this.isTalking = this.vadAvg > this.vadSensitivity;

        if (prevTalking !== this.isTalking) {
            this.port.postMessage({ isTalking: this.isTalking });
        }

        return true;
    }
}

registerProcessor("rnnoise", RnnoiseProcessor);
