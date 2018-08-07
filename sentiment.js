setTimeout(setupSentiment, 0);

async function setupSentiment() {
    if (await loader.urlExists(HOSTED_URLS.model)) {
        console.log('Model available: ' + HOSTED_URLS.model);
        const button = document.getElementById('load-pretrained-remote');
        button.addEventListener('click', async () => {
            const predictor = await init(HOSTED_URLS);
        });
        button.style.display = 'inline-block';
    }

    console.log('Standing by.');
}

async function init(urls) {
    this.urls = urls;
    this.model = await loader.loadHostedPretrainedModel(urls.model);
    await this.loadMetadata();
    return this;
}

async function loadMetadata() {
    const sentimentMetadata =
        await loader.loadHostedMetadata(this.urls.metadata);
    console.log(sentimentMetadata);
    this.indexFrom = sentimentMetadata['index_from'];
    this.maxLen = sentimentMetadata['max_len'];
    console.log('indexFrom = ' + this.indexFrom);
    console.log('maxLen = ' + this.maxLen);

    this.wordIndex = sentimentMetadata['word_index']
}

function predict(text) {
    // Convert to lower case and remove all punctuations.
    const inputText =
        text.trim().toLowerCase().replace(/(\.|\,|\!)/g, '').split(' ');
    // Look up word indices.
    const inputBuffer = tf.buffer([1, this.maxLen], 'float32');
    for (let i = 0; i < inputText.length; ++i) {

        const word = inputText[i];
        inputBuffer.set(this.wordIndex[word] + this.indexFrom, 0, i);
    }
    const input = inputBuffer.toTensor();

    console.log('Running inference');
    const beginMs = performance.now();
    const predictOut = this.model.predict(input);
    const score = predictOut.dataSync()[0];
    predictOut.dispose();
    const endMs = performance.now();

    return { score: score, elapsed: (endMs - beginMs) };
}
const HOSTED_URLS = {
    model:
        'https://storage.googleapis.com/tfjs-models/tfjs/sentiment_cnn_v1/model.json',
    metadata:
        'https://storage.googleapis.com/tfjs-models/tfjs/sentiment_cnn_v1/metadata.json'
};

var loader = {
    urlExists: async function (url) {
        console.log('Testing url ' + url);
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (err) {
            return false;
        }
    },

    /**
     * Load pretrained model stored at a remote URL.
     *
     * @return An instance of `tf.Model` with model topology and weights loaded.
     */
    loadHostedPretrainedModel: async function (url) {
        console.log('Loading pretrained model from ' + url);
        try {
            const model = await tf.loadModel(url);
            console.log('Done loading pretrained model.');
            // We can't load a model twice due to
            // https://github.com/tensorflow/tfjs/issues/34
            // Therefore we remove the load buttons to avoid user confusion.
            return model;
        } catch (err) {
            console.error(err);
            console.log('Loading pretrained model failed.');
        }
    },

    /**
     * Load metadata file stored at a remote URL.
     *
     * @return An object containing metadata as key-value pairs.
     */
    loadHostedMetadata: async function (url) {
        console.log('Loading metadata from ' + url);
        try {
            const metadataJson = await fetch(url);
            const metadata = await metadataJson.json();
            console.log('Done loading metadata.');
            return metadata;
        } catch (err) {
            console.error(err);
            console.log('Loading metadata failed.');
        }
    }
};