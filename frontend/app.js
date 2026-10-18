
const API_BASE_URL = "http://127.0.0.1:8000";

const predictionForm = document.getElementById("predictionForm");
const predictButton = document.getElementById("predictButton");

const systemStatus = document.getElementById("systemStatus");
const apiStatus = document.getElementById("apiStatus");

const resultPlaceholder = document.getElementById("resultPlaceholder");
const resultContent = document.getElementById("resultContent");
const resultBadge = document.getElementById("resultBadge");
const probabilityValue = document.getElementById("probabilityValue");
const probabilityBar = document.getElementById("probabilityBar");
const resultMessage = document.getElementById("resultMessage");
const errorMessage = document.getElementById("errorMessage");

async function checkBackend() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);

        if (!response.ok) {
            throw new Error("Health check failed");
        }

        const data = await response.json();

        apiStatus.textContent = "Connected";
        apiStatus.style.color = "#16845b";

        systemStatus.textContent =
            data.status === "healthy" ? "API online" : "API status unknown";

        document.querySelector(".status-dot").style.background =
            data.status === "healthy" ? "#16845b" : "#d7a02b";
    } catch (error) {
        apiStatus.textContent = "Offline";
        apiStatus.style.color = "#c24141";
        systemStatus.textContent = "API unavailable";
        document.querySelector(".status-dot").style.background = "#c24141";
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
}

function clearResult() {
    errorMessage.hidden = true;
    resultContent.hidden = true;
    resultPlaceholder.hidden = false;
}

predictionForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearResult();

    const formData = new FormData(predictionForm);
    const features = {};

    for (const [key, value] of formData.entries()) {
        if (value.trim() === "") {
            showError(`Please enter a value for ${key}.`);
            return;
        }

        const numberValue = Number(value);

        if (!Number.isFinite(numberValue)) {
            showError(`Please enter a valid number for ${key}.`);
            return;
        }

        features[key] = numberValue;
    }

    predictButton.disabled = true;
    predictButton.textContent = "Analyzing...";

    try {
        const response = await fetch(`${API_BASE_URL}/predict`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ features })
        });

        const data = await response.json();

        if (!response.ok) {
            const detail = data.detail;
            throw new Error(
                typeof detail === "string"
                    ? detail
                    : "The prediction request failed."
            );
        }

        const probability = Number(data.elevated_stress_probability);

        if (
            !Number.isFinite(probability) ||
            probability < 0 ||
            probability > 1
        ) {
            throw new Error("The API returned an invalid probability.");
        }

        resultPlaceholder.hidden = true;
        resultContent.hidden = false;
        errorMessage.hidden = true;

        const isElevated = data.predicted_class === 1;

        resultBadge.textContent = data.predicted_label;
        resultBadge.className =
            `result-badge ${isElevated ? "elevated" : "low"}`;

        probabilityValue.textContent =
            `${(probability * 100).toFixed(2)}%`;    

        probabilityBar.style.width = `${probability * 100}%`;
        probabilityBar.style.background =
            isElevated ? "#c66b35" : "#176b55";

        resultMessage.textContent = isElevated
            ? "The baseline model classified this window as elevated stress. This is an experimental estimate, not a diagnosis."
            : "The baseline model classified this window as low stress. This does not rule out stress or other health concerns.";

    } catch (error) {
        showError(
            `${error.message} Check that the FastAPI backend is running.`
        );
    } finally {
        predictButton.disabled = false;
        predictButton.textContent = "Analyze stress";
    }
});

predictionForm.addEventListener("reset", () => {
    window.setTimeout(clearResult, 0);
});

const sampleSelector = document.getElementById("sampleSelector");

let wearableSamples = [];

async function loadWearableSamples() {
    try {
        const response = await fetch(`${API_BASE_URL}/samples`);

        if (!response.ok) {
            throw new Error("Could not load wearable samples.");
        }

        const data = await response.json();
        wearableSamples = data.samples || [];

        sampleSelector.innerHTML =
            '<option value="">Choose a sample...</option>';

        wearableSamples.forEach((sample, index) => {
            const option = document.createElement("option");

            option.value = String(index);
            option.textContent =
                `Sample ${sample.sample_id} — ` +
                `Reference: ${sample.self_reported_stress} ` +
                `(${sample.stress_class === 1 ? "Elevated" : "Low"})`;

            sampleSelector.appendChild(option);
        });

    } catch (error) {
        showError(`Unable to load samples: ${error.message}`);
    }
}

sampleSelector.addEventListener("change", () => {
    const selectedIndex = sampleSelector.value;

    if (selectedIndex === "") {
        return;
    }

    const sample = wearableSamples[Number(selectedIndex)];

    if (!sample) {
        showError("The selected sample could not be found.");
        return;
    }

    for (const [featureName, featureValue] of
        Object.entries(sample.features)) {

        const input = predictionForm.elements.namedItem(featureName);

        if (input) {
            input.value = featureValue;
        }
    }

    clearResult();
});

loadWearableSamples();

checkBackend();
