export class PreviewControls {
    constructor(handlers) {
        this.handlers = handlers;
        this.skeletonVisible = false;
        this.meshVisible = true;
        this.currentAnimation = 'none';
        this.setupButtons();
    }

    setupButtons() {
        // Desktop controls
        document.getElementById('start-over-btn').addEventListener('click', this.handlers.onStartOver);
        document.getElementById('export-btn').addEventListener('click', this.handlers.onExport);
        document.getElementById('skeleton-toggle').addEventListener('change', (e) => {
            this.skeletonVisible = e.target.checked;
            this.updateSkeletonUI(this.skeletonVisible);
            this.handlers.onSkeletonToggle(e.target.checked);
        });
        document.getElementById('mesh-toggle').addEventListener('change', (e) => {
            this.meshVisible = e.target.checked;
            this.updateMeshUI(this.meshVisible);
            this.handlers.onMeshToggle(e.target.checked);
        });
        document.getElementById('animation-select').addEventListener('change', (e) => {
            this.currentAnimation = e.target.value;
            this.handlers.onAnimationChange(e.target.value)
        });

        // Mobile controls
        document.getElementById('mobile-start-over-btn').addEventListener('click', this.handlers.onStartOver);
        document.getElementById('mobile-export-btn').addEventListener('click', this.handlers.onExport);
        document.getElementById('mobile-skeleton-toggle-btn').addEventListener('click', () => {
            this.toggleSkeleton();
        });
        document.getElementById('mobile-mesh-toggle-btn').addEventListener('click', () => {
            this.toggleMesh();
        });
        document.getElementById('mobile-animation-select').addEventListener('change', (e) => {
            this.currentAnimation = e.target.value;
            this.handlers.onAnimationChange(e.target.value)
        });

        // Setup mobile button icons
        document.getElementById('mobile-start-over-btn').style.backgroundImage = `url(./icon_start_over.png)`;
        document.getElementById('mobile-skeleton-toggle-btn').style.backgroundImage = `url(./icon_skeleton.png)`;
        document.getElementById('mobile-mesh-toggle-btn').style.backgroundImage = `url(./icon_mesh.png)`;
        document.getElementById('mobile-export-btn').style.backgroundImage = `url(./icon_export.png)`;
    }

    toggleSkeleton() {
        this.skeletonVisible = !this.skeletonVisible;
        this.handlers.onSkeletonToggle(this.skeletonVisible);
        this.updateSkeletonUI(this.skeletonVisible);
    }

    toggleMesh() {
        this.meshVisible = !this.meshVisible;
        this.handlers.onMeshToggle(this.meshVisible);
        this.updateMeshUI(this.meshVisible);
    }

    updateSkeletonUI(visible) {
        const mobileBtn = document.getElementById('mobile-skeleton-toggle-btn');
        const desktopToggle = document.getElementById('skeleton-toggle');
        
        if (visible) {
            mobileBtn.classList.add('active');
        } else {
            mobileBtn.classList.remove('active');
        }
        desktopToggle.checked = visible;
        this.skeletonVisible = visible;
    }

    updateMeshUI(visible) {
        const mobileBtn = document.getElementById('mobile-mesh-toggle-btn');
        const desktopToggle = document.getElementById('mesh-toggle');
        
        if (visible) {
            mobileBtn.classList.add('active');
        } else {
            mobileBtn.classList.remove('active');
        }
        desktopToggle.checked = visible;
        this.meshVisible = visible;
    }

    getCurrentAnimation() {
        return this.currentAnimation;
    }

    populateAnimations(animations) {
        const animSelect = document.getElementById('animation-select');
        const mobileAnimSelect = document.getElementById('mobile-animation-select');
        const animControls = document.getElementById('animation-controls');
        
        animSelect.innerHTML = '<option value="none">None (T-Pose)</option>';
        mobileAnimSelect.innerHTML = '<option value="none">Animation</option>';

        const animNames = Object.keys(animations);
        if (animNames.length > 0) {
            animControls.style.display = 'block';
            mobileAnimSelect.style.display = 'block';
            animNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name.charAt(0).toUpperCase() + name.slice(1);
                animSelect.appendChild(option.cloneNode(true));
                mobileAnimSelect.appendChild(option);
            });
        } else {
            animControls.style.display = 'none';
            mobileAnimSelect.style.display = 'none';
        }
    }

    setExportEnabled(enabled) {
        document.getElementById('export-btn').disabled = !enabled;
        document.getElementById('mobile-export-btn').disabled = !enabled;
    }

    reset() {
        document.getElementById('skeleton-toggle').checked = false;
        document.getElementById('mobile-skeleton-toggle-btn').classList.remove('active');
        this.skeletonVisible = false;

        document.getElementById('mesh-toggle').checked = true;
        document.getElementById('mobile-mesh-toggle-btn').classList.add('active');
        this.meshVisible = true;
        this.currentAnimation = 'none';
    }
}