class RNNoiseNode extends AudioWorkletNode {
    static async register(context) {
        await context.audioWorklet.addModule("../dist/rnnoise-processor.js");
    }

    constructor(context, options = {}) {
        super(context, "rnnoise", {
            channelCountMode: "explicit",
            channelCount: 1,
            channelInterpretation: "speakers",
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [1],
            processorOptions: {
                avgCount: 7,
                vadSensitivity: 0.9,
                ...options,
            }
        });

        this.port.onmessage = ({ data }) => {
            const e = new MessageEvent("status", { data });
            this.dispatchEvent(e);
            if (this.onstatus)
                this.onstatus(e);
        };
    }

    update(keepalive) { this.port.postMessage(keepalive); }
}

window.RNNoiseNode = RNNoiseNode;
