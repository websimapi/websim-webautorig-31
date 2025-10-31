export class EditorControls {
    constructor(handlers) {
        this.handlers = handlers;
        this.setupButtons();
        
        this.errorContainer = document.getElementById('error-container');
        this.errorMessageSpan = document.getElementById('error-message');
        this.copyErrorBtn = document.getElementById('copy-error-btn');
        this.clearErrorBtn = document.getElementById('clear-error-btn');

        this.clearErrorBtn?.addEventListener('click', () => this.hideError());
        this.copyErrorBtn?.addEventListener('click', () => this.copyError());
    }

    setupButtons() {
        // Desktop buttons
        document.getElementById('rig-btn').addEventListener('click', this.handlers.onRig);
        document.getElementById('reset-view-btn').addEventListener('click', this.handlers.onResetView);
        document.getElementById('auto-detect-btn').addEventListener('click', this.handlers.onAutoDetect);
        
        // Mobile buttons
        document.getElementById('mobile-rig-btn').addEventListener('click', this.handlers.onRig);
        document.getElementById('mobile-reset-view-btn').addEventListener('click', this.handlers.onResetView);
        document.getElementById('mobile-auto-detect-btn').addEventListener('click', this.handlers.onAutoDetect);

        // Setup mobile action button icons
        document.getElementById('mobile-auto-detect-btn').style.backgroundImage = `url(./icon_auto_detect.png)`;
        document.getElementById('mobile-reset-view-btn').style.backgroundImage = `url(./icon_reset_view.png)`;
        document.getElementById('mobile-rig-btn').style.backgroundImage = `url(./icon_generate_rig.png)`;
    }

    setRigButtonEnabled(enabled) {
        document.getElementById('rig-btn').disabled = !enabled;
        document.getElementById('mobile-rig-btn').disabled = !enabled;
    }

    showProgress(progress, label) {
        const container = document.querySelector('.progress-container');
        const progressLabel = document.getElementById('progress-label');
        const progressBar = document.getElementById('progress-bar');
        
        this.hideError();
        container.style.display = 'block';
        progressBar.value = progress * 100;
        progressLabel.textContent = label;
    }

    hideProgress() {
        document.querySelector('.progress-container').style.display = 'none';
    }

    showError(error) {
        this.hideProgress();
        this.errorMessageSpan.textContent = error.message || String(error);
        this.errorContainer.style.display = 'block';
    }

    hideError() {
        if (this.errorContainer) {
            this.errorContainer.style.display = 'none';
        }
    }

    copyError() {
        const errorText = this.errorMessageSpan.textContent;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(errorText).then(() => {
                alert('Error copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy error: ', err);
                alert('Failed to copy error.');
            });
        } else {
            alert('Clipboard API not available. Please copy the text manually.');
        }
    }

    setButtonsEnabled(enabled) {
        document.getElementById('auto-detect-btn').disabled = !enabled;
        document.getElementById('mobile-auto-detect-btn').disabled = !enabled;
        document.getElementById('rig-btn').disabled = !enabled;
        document.getElementById('mobile-rig-btn').disabled = !enabled;
    }
}