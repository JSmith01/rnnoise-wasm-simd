const input = document.getElementById("input"),
    output = document.getElementById("output"),
    start = document.getElementById("start"),
    vadProb = document.getElementById("vadProb");

const hasSinkApi = 'setSinkId' in Audio.prototype;

async function startRnn() {
    start.disabled = output.disabled = input.disabled = true;
    const context = new AudioContext({ sampleRate: 48000 });
    let destination = context.destination;
    if (hasSinkApi) {
        destination = new MediaStreamAudioDestinationNode(context, {
            channelCountMode: "explicit",
            channelCount: 1,
            channelInterpretation: "speakers"
        });
        const audio = new Audio();
        audio.srcObject = destination.stream;
        audio.setSinkId(output.value);
        audio.play();
    }

    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            deviceId: { exact: input.value },
            channelCount: { ideal: 1 },
            noiseSuppression: { ideal: false },
            echoCancellation: { ideal: true },
            autoGainControl: { ideal: false },
            sampleRate: { ideal: 48000 }
        }
    });
    await RNNoiseNode.register(context);
    const source = context.createMediaStreamSource(stream);
    const rnnoise = new RNNoiseNode(context);
    rnnoise.connect(destination);
    source.connect(rnnoise);
    rnnoise.onstatus = e => {
        if ('vadProb' in e.data) {
            vadProb.style.width = e.data.vadProb * 100 + "%";
        } else {
            console.log(e.data);
        }
    };
    (function a() {
        requestAnimationFrame(() => {
            rnnoise.update(true);
            a();
        });
    })();
}

navigator.mediaDevices.getUserMedia({ audio: true }).then(
    stream => Promise.all([navigator.mediaDevices.enumerateDevices(), stream])
).then(([devices, stream]) => {
    stream.getTracks().forEach(t => t.stop());

    input.disabled = false;

    if (hasSinkApi) {
        output.disabled = false;
    } else {
        devices = devices.filter(d => d.kind === "audioinput").concat({
            kind: "audiooutput", label: "Default"
        });
    }

    devices.forEach(d => {
        if (d.kind === "audioinput") {
            input.appendChild(Object.assign(document.createElement("option"), {
                value: d.deviceId, textContent: d.label
            }));
        } else if (d.kind === "audiooutput") {
            output.appendChild(Object.assign(document.createElement("option"), {
                value: d.deviceId, textContent: d.label
            }));
        }
    });

    start.addEventListener("click", startRnn);
    start.disabled = false;
});
