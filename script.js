class PointillismGenerator {
    constructor() {
        this.colors = [];
        this.selectedColors = new Set();
        this.canvas = document.getElementById('previewCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.pointSize = 5;
        this.originalCanvas = document.getElementById('originalCanvas');
        this.originalCtx = this.originalCanvas.getContext('2d');
        this.layerOrder = [];
        this.colorThreshold = 150;
        this.mode = 'halftone';
        this.backgroundPoints = [];
        this.backgroundCanvas = document.createElement('canvas');
        this.backgroundCtx = this.backgroundCanvas.getContext('2d');
        this.animationFrame = null;
        this.minPointSize = 2;
        this.maxPointSize = 8;
        this.randomness = 0;
        this.colorTolerances = new Map();
        this.colorThresholdMin = 0;
        this.colorThresholdMax = 150;
        this.customSettings = new Map();
        this.lang = (localStorage.getItem('posca_lang') || ((navigator.language || 'fr').startsWith('fr') ? 'fr' : 'en'));
        this.i18n = {
            fr: {
                title: 'Générateur halftone',
                language: 'Langue',
                colorSelectTitle: 'Sélectionnez les couleurs',
                layersManagerTitle: 'Gestion des calques',
                generalSettingsTitle: 'Réglages généraux',
                scaleLabel: 'Échelle:',
                minmaxLabel: 'Taille min/max des points:',
                toleranceLabel: 'Tolérance des couleurs:',
                randomnessLabel: 'Randomisation des points:',
                uploadPrompt: 'Glissez votre image ici ou cliquez pour parcourir',
                originalImageTitle: 'Image originale',
                processedImageTitle: 'Image traitée',
                downloadPng: 'Télécharger PNG',
                downloadSvg: 'Télécharger SVG',
                selectAll: 'Tout sélectionner',
                deselectAll: 'Tout désélectionner',
                noLayers: 'Sélectionnez des couleurs pour créer des calques',
                tooltipSettings: 'Paramètres personnalisés',
                tooltipUp: 'Monter le calque',
                tooltipDown: 'Descendre le calque',
                tooltipDelete: 'Supprimer le calque',
                labelScale: 'Échelle:',
                labelMinMax: 'Taille min/max des points:',
                labelTolerance: 'Tolérance des couleurs:',
                labelRandom: 'Randomisation:',
                promptSelectColors: 'Sélectionnez une ou plusieurs couleurs',
                fname_complete_png: 'halftone_complet.png',
                fname_layer_png: (name) => `halftone_${name}.png`,
                zip_png: (date) => `halftone_${date}.zip`,
                fname_complete_svg: 'halftone_complet.svg',
                fname_layer_svg: (name) => `halftone_${name}.svg`,
                zip_svg: (date) => `halftone_svg_${date}.zip`
            },
            en: {
                title: 'Halftone Generator',
                language: 'Language',
                colorSelectTitle: 'Select colors',
                layersManagerTitle: 'Layers manager',
                generalSettingsTitle: 'General settings',
                scaleLabel: 'Scale:',
                minmaxLabel: 'Min/max dot size:',
                toleranceLabel: 'Color tolerance:',
                randomnessLabel: 'Dots randomization:',
                uploadPrompt: 'Drag your image here or click to browse',
                originalImageTitle: 'Original image',
                processedImageTitle: 'Processed image',
                downloadPng: 'Download PNG',
                downloadSvg: 'Download SVG',
                selectAll: 'Select all',
                deselectAll: 'Deselect all',
                noLayers: 'Select colors to create layers',
                tooltipSettings: 'Custom settings',
                tooltipUp: 'Move layer up',
                tooltipDown: 'Move layer down',
                tooltipDelete: 'Delete layer',
                labelScale: 'Scale:',
                labelMinMax: 'Min/max dot size:',
                labelTolerance: 'Color tolerance:',
                labelRandom: 'Randomization:',
                promptSelectColors: 'Select one or more colors',
                fname_complete_png: 'halftone_complete.png',
                fname_layer_png: (name) => `halftone_${name}.png`,
                zip_png: (date) => `halftone_${date}.zip`,
                fname_complete_svg: 'halftone_complete.svg',
                fname_layer_svg: (name) => `halftone_${name}.svg`,
                zip_svg: (date) => `halftone_svg_${date}.zip`
            }
        };
        
        this.init();
        this.updateDownloadButtons();
    }

    t(key) {
        return this.i18n[this.lang][key] ?? key;
    }

    colorName(color) {
        return color.name[this.lang] || color.name.fr;
    }

    slugifyFilename(text) {
        return (text || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9-_]+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .toLowerCase();
    }

    applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = this.t(key);
            if (text && typeof text === 'string') el.textContent = text;
        });
        const dlPng = document.getElementById('download');
        if (dlPng) dlPng.textContent = this.t('downloadPng');
        const dlSvg = document.getElementById('downloadSvg');
        if (dlSvg) dlSvg.textContent = this.t('downloadSvg');
    }
    
    refreshColorListTexts() {
        const colorList = document.getElementById('color-list');
        if (!colorList) return;
        const btns = colorList.parentElement.querySelector('.select-buttons');
        if (btns) {
            const [btnAll, btnNone] = btns.querySelectorAll('button');
            if (btnAll) btnAll.textContent = this.t('selectAll');
            if (btnNone) btnNone.textContent = this.t('deselectAll');
        }
        this.colors.forEach(color => {
            const label = colorList.querySelector(`label[for="${color.hex}"]`);
            if (label) label.textContent = this.colorName(color);
        });
    }

    async init() {
        this.loadColors();
        this.setupEventListeners();
        this.createColorList();
        this.updateUIForMode();
        this.initBackgroundAnimation();
        this.applyTranslations && this.applyTranslations();
    }

    loadColors() {
        this.colors = [
            { hex: '#000000', name: { fr: 'noir', en: 'black' } },
            { hex: '#ffffff', name: { fr: 'blanc', en: 'white' } },
            { hex: '#aaaeae', name: { fr: 'gris', en: 'gray' } },
            { hex: '#540305', name: { fr: 'marron foncé', en: 'dark brown' } },
            { hex: '#800000', name: { fr: 'marron', en: 'brown' } },
            { hex: '#efe8a2', name: { fr: 'ivoire', en: 'ivory' } },
            { hex: '#d9c488', name: { fr: 'beige', en: 'beige' } },
            { hex: '#cce6f6', name: { fr: 'bleu marine', en: 'navy blue' } },
            { hex: '#0d4e9f', name: { fr: 'bleu foncé', en: 'dark blue' } },
            { hex: '#14aee5', name: { fr: 'bleu clair', en: 'light blue' } },
            { hex: '#0fa2dd', name: { fr: 'turquoise', en: 'turquoise' } },
            { hex: '#4fb4e7', name: { fr: 'bleu ciel', en: 'sky blue' } },
            { hex: '#437696', name: { fr: 'gris ardoise', en: 'slate gray' } },
            { hex: '#9993c4', name: { fr: 'lilas', en: 'lilac' } },
            { hex: '#4d4e8d', name: { fr: 'violet', en: 'violet' } },
            { hex: '#c71574', name: { fr: 'rose fushia', en: 'fuchsia' } },
            { hex: '#e9138d', name: { fr: 'rose', en: 'pink' } },
            { hex: '#f7a386', name: { fr: 'corail', en: 'coral' } },
            { hex: '#ef85b3', name: { fr: 'rose clair', en: 'light pink' } },
            { hex: '#ee1d26', name: { fr: 'rouge', en: 'red' } },
            { hex: '#b91d3d', name: { fr: 'rouge foncé', en: 'dark red' } },
            { hex: '#850e3d', name: { fr: 'lie-de-vin', en: 'burgundy' } },
            { hex: '#f57420', name: { fr: 'orange foncé', en: 'dark orange' } },
            { hex: '#fcce22', name: { fr: 'orange', en: 'orange' } },
            { hex: '#f9bf70', name: { fr: 'rose saumon', en: 'salmon pink' } },
            { hex: '#f2ed3a', name: { fr: 'jaune', en: 'yellow' } },
            { hex: '#fae57c', name: { fr: 'jaune paille', en: 'straw yellow' } },
            { hex: '#d0dd3a', name: { fr: 'vert pomme', en: 'apple green' } },
            { hex: '#7ac9ac', name: { fr: 'vert clair', en: 'light green' } },
            { hex: '#63c7c4', name: { fr: "vert d'eau", en: 'aqua green' } },
            { hex: '#19a252', name: { fr: 'vert foncé', en: 'dark green' } },
            { hex: '#11b58d', name: { fr: 'vert émeraude', en: 'emerald green' } },
            { hex: '#3f481d', name: { fr: 'kaki', en: 'khaki' } }
        ];
        this.hexToAngle = new Map([
            ['#000000', 45], ['#ffffff', 0], ['#aaaeae', 45],
            ['#540305', 48], ['#800000', 42], ['#efe8a2', 3], ['#d9c488', 6],
            ['#cce6f6', 15], ['#0d4e9f', 18], ['#14aee5', 12], ['#0fa2dd', 21], ['#4fb4e7', 9], ['#437696', 24],
            ['#9993c4', 60], ['#4d4e8d', 63],
            ['#c71574', 75], ['#e9138d', 72], ['#f7a386', 78], ['#ef85b3', 69],
            ['#ee1d26', 75], ['#b91d3d', 78], ['#850e3d', 81],
            ['#f57420', 84], ['#fcce22', 87], ['#f9bf70', 81], ['#f2ed3a', 0], ['#fae57c', 3],
            ['#d0dd3a', 30], ['#7ac9ac', 33], ['#63c7c4', 27], ['#19a252', 36], ['#11b58d', 39], ['#3f481d', 42]
        ]);
    }

    setupEventListeners() {
        const dropZone = document.getElementById('dropZone');
        const imageInput = document.getElementById('imageInput');
        const langSwitch = document.getElementById('langSwitch');
        const langButtons = langSwitch ? langSwitch.querySelectorAll('.lang-btn') : [];

        if (langSwitch && langButtons.length) {
            const updateLangUI = () => {
                langButtons.forEach(btn => {
                    const isActive = btn.getAttribute('data-lang') === this.lang;
                    btn.classList.toggle('selected', isActive);
                    btn.setAttribute('aria-pressed', String(isActive));
                });
            };
            updateLangUI();

            langButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const chosen = btn.getAttribute('data-lang');
                    if (chosen && chosen !== this.lang) {
                        this.lang = chosen;
                        localStorage.setItem('posca_lang', this.lang);
                        updateLangUI();
                        this.applyTranslations();
                        this.refreshColorListTexts();
                        this.updateLayersList();
                        this.generatePointillism();
                    }
                });
            });
        }

        dropZone.addEventListener('click', () => {
            imageInput.click();
        });

        const preventDefault = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefault);
            document.body.addEventListener(eventName, preventDefault);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-over');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            preventDefault(e);
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.handleImageUpload({ target: { files: [file] } });
            }
        });

        imageInput.addEventListener('change', (e) => this.handleImageUpload(e));

        document.getElementById('pointSize').addEventListener('input', (e) => {
            this.pointSize = parseFloat(e.target.value);
            e.target.closest('.slider-wrapper').querySelector('.value').textContent = `${this.pointSize.toFixed(1)}px`;
            this.generatePointillism();
        });
        document.getElementById('download').addEventListener('click', () => this.downloadImages());
        document.getElementById('downloadSvg').addEventListener('click', () => this.downloadSvg());

        document.querySelectorAll('.mode-button').forEach(button => {
            button.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                button.classList.add('active');

                this.mode = button.dataset.mode;
                this.updateUIForMode();
                this.generatePointillism();
            });
        });

        window.addEventListener('resize', () => {
            this.backgroundCanvas.width = window.innerWidth;
            this.backgroundCanvas.height = window.innerHeight;
        });

        document.querySelectorAll('#color-list input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const colors = Array.from(this.selectedColors);
                if (colors.length > 0) {
                    this.backgroundPoints.forEach(point => {
                        point.color = colors[Math.floor(Math.random() * colors.length)].hex;
                    });
                }
            });
        });

        const minSlider = document.getElementById('minPointSize');
        const maxSlider = document.getElementById('maxPointSize');
        const doubleSlider = document.querySelector('.double-slider');

        const updateDoubleSlider = () => {
            const min = parseFloat(minSlider.value);
            const max = parseFloat(maxSlider.value);

            if (min > max) {
                maxSlider.value = min;
                this.maxPointSize = min;
            } else if (max < min) {
                minSlider.value = max;
                this.minPointSize = max;
            } else {
                this.minPointSize = min;
                this.maxPointSize = max;
            }

            const minPercent = (this.minPointSize / parseFloat(minSlider.max)) * 100;
            const maxPercent = (this.maxPointSize / parseFloat(maxSlider.max)) * 100;
            doubleSlider.style.setProperty('--left', `${minPercent}%`);
            doubleSlider.style.setProperty('--right', `${100 - maxPercent}%`);

            const valueSpan = doubleSlider.closest('.slider-wrapper').querySelector('.value');
            valueSpan.textContent = `${this.minPointSize.toFixed(1)}px - ${this.maxPointSize.toFixed(1)}px`;

            this.generatePointillism();
        };

        minSlider.addEventListener('input', updateDoubleSlider);
        maxSlider.addEventListener('input', updateDoubleSlider);

        updateDoubleSlider();

        document.getElementById('randomness').addEventListener('input', (e) => {
            this.randomness = parseInt(e.target.value);
            e.target.closest('.slider-wrapper').querySelector('.value').textContent = `${this.randomness}%`;
            this.generatePointillism();
        });

        const minSliderGlobal = document.getElementById('colorThresholdMin');
        const maxSliderGlobal = document.getElementById('colorThresholdMax');
        const doubleSliderGlobal = minSliderGlobal.closest('.double-slider');
        const valueSpanGlobal = doubleSliderGlobal.nextElementSibling;

        const updateGlobalToleranceSlider = () => {
            const min = parseInt(minSliderGlobal.value);
            const max = parseInt(maxSliderGlobal.value);

            if (min > max) {
                maxSliderGlobal.value = min;
                this.colorThresholdMin = min;
                this.colorThresholdMax = min;
            } else if (max < min) {
                minSliderGlobal.value = max;
                this.colorThresholdMin = max;
                this.colorThresholdMax = max;
            } else {
                this.colorThresholdMin = min;
                this.colorThresholdMax = max;
            }

            const minPercent = (min / parseInt(minSliderGlobal.max)) * 100;
            const maxPercent = (max / parseInt(maxSliderGlobal.max)) * 100;
            doubleSliderGlobal.style.setProperty('--left', `${minPercent}%`);
            doubleSliderGlobal.style.setProperty('--right', `${100 - maxPercent}%`);

            valueSpanGlobal.textContent = `${min}-${max}`;
            this.generatePointillism();
        };

        minSliderGlobal.addEventListener('input', updateGlobalToleranceSlider);
        maxSliderGlobal.addEventListener('input', updateGlobalToleranceSlider);

        updateGlobalToleranceSlider();
        this.applyTranslations();
    }

    updateUIForMode() {
        const pointSizeContainer = document.querySelector('.slider-container:has(#pointSize)');
        const pointSizeRangeContainer = document.getElementById('pointSizeRangeContainer');
        const toleranceContainer = document.querySelector('.slider-container:has(#colorThresholdMin)');
        const layersManager = document.querySelector('.layers-manager');
        const svgButton = document.getElementById('downloadSvg');
        const colorSelector = document.querySelector('.color-selector');
        const randomnessContainer = document.getElementById('randomnessContainer');

                pointSizeContainer.style.display = 'flex';
        pointSizeRangeContainer.style.display = 'flex';
                toleranceContainer.style.display = 'flex';
                layersManager.style.display = 'block';
                svgButton.style.display = 'inline-block';
                colorSelector.style.display = 'block';
        randomnessContainer.style.display = 'flex';
        
        this.updateDownloadButtons();

        document.querySelectorAll('.layer-item').forEach(layerItem => {
            this.updateCustomSettingsDisplay(layerItem);
        });
    }

    createColorList() {
        const colorList = document.getElementById('color-list');
        
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'select-buttons';
        
        const selectAllBtn = document.createElement('button');
        selectAllBtn.textContent = this.t('selectAll');
        selectAllBtn.addEventListener('click', () => {
            const checkboxes = colorList.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                if (!checkbox.checked) {
                    checkbox.checked = true;
                    const color = this.colors.find(c => c.hex === checkbox.id);
                    if (color) {
                        this.selectedColors.add(color);
                        if (!this.layerOrder.includes(color.hex)) {
                            this.layerOrder.push(color.hex);
                        }
                    }
                }
            });
            this.updateLayersList();
            this.generatePointillism();
        });

        const deselectAllBtn = document.createElement('button');
        deselectAllBtn.textContent = this.t('deselectAll');
        deselectAllBtn.addEventListener('click', () => {
            const checkboxes = colorList.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    checkbox.checked = false;
                    const color = this.colors.find(c => c.hex === checkbox.id);
                    if (color) {
                        this.selectedColors.delete(color);
                        this.layerOrder = this.layerOrder.filter(hex => hex !== color.hex);
                    }
                }
            });
            this.updateLayersList();
            this.generatePointillism();
        });

        buttonsDiv.appendChild(selectAllBtn);
        buttonsDiv.appendChild(deselectAllBtn);
        colorList.parentElement.insertBefore(buttonsDiv, colorList);

        this.colors.forEach(color => {
            const div = document.createElement('div');
            div.className = 'color-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = color.hex;
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    this.selectedColors.add(color);
                    if (!this.layerOrder.includes(color.hex)) {
                        this.layerOrder.push(color.hex);
                    }
                } else {
                    this.selectedColors.delete(color);
                    this.layerOrder = this.layerOrder.filter(hex => hex !== color.hex);
                }
                this.updateLayersList();
                this.generatePointillism();
            });

            const preview = document.createElement('div');
            preview.className = 'color-preview';
            preview.style.backgroundColor = color.hex;

            const label = document.createElement('label');
            label.htmlFor = color.hex;
            label.textContent = this.colorName(color);

            div.appendChild(checkbox);
            div.appendChild(preview);
            div.appendChild(label);
            colorList.appendChild(div);
        });
    }

    updateLayersList() {
        const layersList = document.getElementById('layers-list');
        
        const activeCustomSettings = new Map();
        document.querySelectorAll('.layer-item').forEach(layerItem => {
            const colorHex = layerItem.dataset.color;
            const customSettings = layerItem.querySelector('.custom-settings');
            if (customSettings && customSettings.style.display === 'block') {
                activeCustomSettings.set(colorHex, true);
            }
        });

        layersList.innerHTML = '';

        if (this.selectedColors.size === 0) {
            layersList.innerHTML = `<p class="no-layers">${this.t('noLayers')}</p>`;
            return;
        }

        this.layerOrder.forEach((colorHex, index) => {
            const color = this.colors.find(c => c.hex === colorHex);
            if (!color || !this.selectedColors.has(color)) return;

            const layerItem = this.createLayerItem(color);
            layersList.appendChild(layerItem);

            if (activeCustomSettings.has(colorHex)) {
                const customBtn = layerItem.querySelector('.custom-settings-btn');
                const customSettings = layerItem.querySelector('.custom-settings');
                const halftoneSettings = layerItem.querySelector('.halftone-settings');
                
                customBtn.classList.add('active');
                customSettings.style.display = 'block';
                halftoneSettings.style.display = 'block';
                
                this.attachCustomSliderEvents(layerItem, colorHex);
            }
        });
    }

    createLayerItem(color) {
            const layerItem = document.createElement('div');
            layerItem.className = 'layer-item';
        layerItem.dataset.color = color.hex;

        if (!this.customSettings.has(color.hex)) {
            this.customSettings.set(color.hex, {
                enabled: false,
                scale: this.pointSize,
                minPointSize: this.minPointSize,
                maxPointSize: this.maxPointSize,
                randomness: this.randomness,
                tolerance: this.colorTolerances.get(color.hex) || { min: 0, max: 150 }
            });
        }

        const settings = this.customSettings.get(color.hex);

        layerItem.innerHTML = `
            <div class="layer-preview">
                <div class="color-preview" style="background-color: ${color.hex}"></div>
                <span class="layer-name">${this.colorName(color)}</span>
            </div>
            <div class="layer-controls">
                <button class="custom-settings-btn" title="${this.t('tooltipSettings')}">⚙️</button>
                <button class="move-up-btn" title="${this.t('tooltipUp')}">↑</button>
                <button class="move-down-btn" title="${this.t('tooltipDown')}">↓</button>
                <button class="delete-btn" title="${this.t('tooltipDelete')}">&times;</button>
            </div>
            <div class="custom-settings" style="display: none;">
                <div class="halftone-settings" style="display: none;">
                    <div class="slider-container">
                        <label>${this.t('labelScale')}</label>
                        <div class="slider-wrapper">
                            <input type="range" class="custom-scale" min="0.1" max="20" value="${settings.scale}" step="0.1">
                            <span class="value">${settings.scale.toFixed(1)}px</span>
                        </div>
                    </div>
                    <div class="slider-container">
                        <label>${this.t('labelMinMax')}</label>
                        <div class="slider-wrapper">
                            <div class="double-slider">
                                <input type="range" class="custom-min-size" min="0.1" max="20" value="${settings.minPointSize}" step="0.1">
                                <input type="range" class="custom-max-size" min="0.1" max="20" value="${settings.maxPointSize}" step="0.1">
                            </div>
                            <span class="value">${settings.minPointSize.toFixed(1)}px - ${settings.maxPointSize.toFixed(1)}px</span>
                        </div>
                    </div>
                    <div class="slider-container">
                        <label>${this.t('labelTolerance')}</label>
                        <div class="slider-wrapper">
                            <div class="double-slider">
                                <input type="range" class="custom-tolerance-min" min="0" max="500" value="${settings.tolerance.min}">
                                <input type="range" class="custom-tolerance-max" min="0" max="500" value="${settings.tolerance.max}">
                            </div>
                            <span class="value">${settings.tolerance.min}-${settings.tolerance.max}</span>
                        </div>
                    </div>
                    <div class="slider-container">
                        <label>${this.t('labelRandom')}</label>
                        <div class="slider-wrapper">
                            <input type="range" class="custom-randomness" min="0" max="100" value="${settings.randomness}">
                            <span class="value">${settings.randomness}%</span>
                        </div>
                    </div>
                </div>
                <div class="drawing-settings" style="display: none;">
                    <div class="slider-container">
                        <label>${this.t('labelTolerance')}</label>
                        <div class="slider-wrapper">
                            <div class="double-slider">
                                <input type="range" class="custom-tolerance-min" min="0" max="500" value="${settings.tolerance.min}">
                                <input type="range" class="custom-tolerance-max" min="0" max="500" value="${settings.tolerance.max}">
                            </div>
                            <span class="value">${settings.tolerance.min}-${settings.tolerance.max}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners(layerItem, color);

        return layerItem;
    }

    attachEventListeners(layerItem, color) {
        const customBtn = layerItem.querySelector('.custom-settings-btn');
        const customSettings = layerItem.querySelector('.custom-settings');
        const halftoneSettings = layerItem.querySelector('.halftone-settings');
        const drawingSettings = layerItem.querySelector('.drawing-settings');
        
        customBtn.addEventListener('click', () => {
            const settings = this.customSettings.get(color.hex);
            settings.enabled = !settings.enabled;
            customBtn.classList.toggle('active');
            
            customSettings.style.display = settings.enabled ? 'block' : 'none';
            if (settings.enabled) {
                halftoneSettings.style.display = this.mode === 'halftone' ? 'block' : 'none';
                drawingSettings.style.display = this.mode === 'drawing' ? 'block' : 'none';
                this.attachCustomSliderEvents(layerItem, color.hex);
            }
            
            if (settings.enabled) {
                this.colorTolerances.set(color.hex, settings.tolerance);
            } else {
                this.colorTolerances.set(color.hex, { 
                    min: this.colorThresholdMin, 
                    max: this.colorThresholdMax 
                });
            }
            
            this.generatePointillism();
        });

        const index = this.layerOrder.indexOf(color.hex);
        
        layerItem.querySelector('.move-up-btn').addEventListener('click', () => {
            this.moveLayer(index, index - 1);
        });

        layerItem.querySelector('.move-down-btn').addEventListener('click', () => {
            this.moveLayer(index, index + 1);
        });

        layerItem.querySelector('.delete-btn').addEventListener('click', () => {
                const checkbox = document.getElementById(color.hex);
                if (checkbox) {
                    checkbox.checked = false;
                    this.selectedColors.delete(color);
                    this.layerOrder = this.layerOrder.filter(hex => hex !== color.hex);
                    this.updateLayersList();
                    this.generatePointillism();
                }
        });
    }

    attachCustomSliderEvents(layerItem, colorHex) {
        if (this.mode === 'halftone') {
            const scaleSlider = layerItem.querySelector('.custom-scale');
            if (scaleSlider) {
                const scaleValueSpan = scaleSlider.nextElementSibling;
                scaleSlider.addEventListener('input', (e) => {
                    const settings = this.customSettings.get(colorHex);
                    settings.scale = parseFloat(e.target.value);
                    scaleValueSpan.textContent = `${settings.scale.toFixed(1)}px`;
                    this.generatePointillism();
                });
            }

            const minSizeSlider = layerItem.querySelector('.custom-min-size');
            const maxSizeSlider = layerItem.querySelector('.custom-max-size');
            if (minSizeSlider && maxSizeSlider) {
                const sizeValueSpan = minSizeSlider.closest('.slider-wrapper').querySelector('.value');
                const doubleSlider = minSizeSlider.closest('.double-slider');
                
                const updateSizeSliders = () => {
                    const settings = this.customSettings.get(colorHex);
                    const min = parseFloat(minSizeSlider.value);
                    const max = parseFloat(maxSizeSlider.value);

                    if (min > max) {
                        maxSizeSlider.value = min;
                        settings.minPointSize = min;
                        settings.maxPointSize = min;
                    } else {
                        settings.minPointSize = min;
                        settings.maxPointSize = max;
                    }

                    const minPercent = (min / parseFloat(minSizeSlider.max)) * 100;
                    const maxPercent = (max / parseFloat(maxSizeSlider.max)) * 100;
                    doubleSlider.style.setProperty('--left', `${minPercent}%`);
                    doubleSlider.style.setProperty('--right', `${100 - maxPercent}%`);

                    sizeValueSpan.textContent = `${settings.minPointSize.toFixed(1)}px - ${settings.maxPointSize.toFixed(1)}px`;
                    this.generatePointillism();
                };

                minSizeSlider.addEventListener('input', updateSizeSliders);
                maxSizeSlider.addEventListener('input', updateSizeSliders);
                updateSizeSliders();
            }

            const randomnessSlider = layerItem.querySelector('.custom-randomness');
            if (randomnessSlider) {
                const randomnessValueSpan = randomnessSlider.nextElementSibling;
                randomnessSlider.addEventListener('input', (e) => {
                    const settings = this.customSettings.get(colorHex);
                    settings.randomness = parseInt(e.target.value);
                    randomnessValueSpan.textContent = `${settings.randomness}%`;
                    this.generatePointillism();
                });
            }
        }

        const minToleranceSlider = layerItem.querySelector('.custom-tolerance-min');
        const maxToleranceSlider = layerItem.querySelector('.custom-tolerance-max');
        if (minToleranceSlider && maxToleranceSlider) {
            const toleranceValueSpan = minToleranceSlider.closest('.slider-wrapper').querySelector('.value');
            const doubleSlider = minToleranceSlider.closest('.double-slider');
            
            const updateToleranceSliders = () => {
                const settings = this.customSettings.get(colorHex);
                const min = parseInt(minToleranceSlider.value);
                const max = parseInt(maxToleranceSlider.value);

                if (min > max) {
                    maxToleranceSlider.value = min;
                    settings.tolerance.min = min;
                    settings.tolerance.max = min;
                } else {
                    settings.tolerance.min = min;
                    settings.tolerance.max = max;
                }

                const minPercent = (min / parseInt(minToleranceSlider.max)) * 100;
                const maxPercent = (max / parseInt(maxToleranceSlider.max)) * 100;
                doubleSlider.style.setProperty('--left', `${minPercent}%`);
                doubleSlider.style.setProperty('--right', `${100 - maxPercent}%`);

                toleranceValueSpan.textContent = `${settings.tolerance.min}-${settings.tolerance.max}`;
                this.generatePointillism();
            };

            minToleranceSlider.addEventListener('input', updateToleranceSliders);
            maxToleranceSlider.addEventListener('input', updateToleranceSliders);
            updateToleranceSliders();
        }
    }

    updateCustomSettingsDisplay(layerItem) {
        const customSettings = layerItem.querySelector('.custom-settings');
        const halftoneSettings = layerItem.querySelector('.halftone-settings');
        
        if (customSettings.style.display === 'block') {
            halftoneSettings.style.display = 'block';
        }
    }

    moveLayer(fromIndex, toIndex) {
        if (toIndex < 0 || toIndex >= this.layerOrder.length) return;
        
        const item = this.layerOrder[fromIndex];
        this.layerOrder.splice(fromIndex, 1);
        this.layerOrder.splice(toIndex, 0, item);
        
        this.updateLayersList();
        this.generatePointillism();
    }

    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            await new Promise(resolve => img.onload = resolve);
            
            const maxWidth = 800;
            const maxHeight = 600;
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                height = (maxWidth * height) / width;
                width = maxWidth;
            }
            if (height > maxHeight) {
                width = (maxHeight * width) / height;
                height = maxHeight;
            }
            
            this.originalCanvas.width = width;
            this.originalCanvas.height = height;
            this.canvas.width = width;
            this.canvas.height = height;
            
            this.originalCtx.drawImage(img, 0, 0, width, height);
            this.ctx.drawImage(img, 0, 0, width, height);
            
            this.originalImage = new Image();
            this.originalImage.src = this.canvas.toDataURL();
            this.originalImage.onload = () => {
                this.generatePointillism();
                this.updateDownloadButtons();
            };
        }
    }

    generatePointillism() {
        if (!this.originalImage) {
            this.updateDownloadButtons();
            return;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.selectedColors.size === 0) {
            this.ctx.font = '20px Arial';
            this.ctx.fillStyle = '#666';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.t('promptSelectColors'), this.canvas.width / 2, this.canvas.height / 2);
            this.updateDownloadButtons();
            return;
        }

        this.updateDownloadButtons();

        this.colorLayers = {};
        this.selectedColors.forEach(color => {
            const layer = document.createElement('canvas');
            layer.width = this.canvas.width;
            layer.height = this.canvas.height;
            this.colorLayers[color.hex] = layer;
        });

        for (const color of this.selectedColors) {
            const ctx = this.colorLayers[color.hex].getContext('2d');
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.generateHalftoneEffect(color);
        }

        for (let i = this.layerOrder.length - 1; i >= 0; i--) {
            const colorHex = this.layerOrder[i];
            if (this.colorLayers[colorHex]) {
                this.ctx.drawImage(this.colorLayers[colorHex], 0, 0);
            }
        }
    }

    generateHalftoneEffect(color, svgGroup = null, completeSvg = null) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(this.originalImage, 0, 0);

        const imageData = tempCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        const ctx = this.colorLayers[color.hex].getContext('2d');
        const angle = this.getColorAngle(color) * Math.PI / 180;

        const customSettings = this.customSettings.get(color.hex);
        const useCustomSettings = customSettings?.enabled;

        const scale = useCustomSettings ? customSettings.scale : this.pointSize;
        const cellSize = scale * 2;

        const startX = -Math.max(this.canvas.width, this.canvas.height);
        const startY = -Math.max(this.canvas.width, this.canvas.height);
        const endX = this.canvas.width * 2;
        const endY = this.canvas.height * 2;

        ctx.fillStyle = color.hex;

        for (let u = startX; u < endX; u += cellSize) {
            for (let v = startY; v < endY; v += cellSize) {
                const x = u * Math.cos(angle) - v * Math.sin(angle);
                const y = u * Math.sin(angle) + v * Math.cos(angle);

                if (x >= 0 && x < this.canvas.width && y >= 0 && y < this.canvas.height) {
                    const i = (Math.floor(y) * this.canvas.width + Math.floor(x)) * 4;
                    const sourceRGB = {
                        r: data[i],
                        g: data[i + 1],
                        b: data[i + 2]
                    };
                    const targetRGB = this.hexToRgb(color.hex);

                    const minSize = useCustomSettings ? customSettings.minPointSize : this.minPointSize;
                    const maxSize = useCustomSettings ? customSettings.maxPointSize : this.maxPointSize;
                    const randomnessValue = useCustomSettings ? customSettings.randomness : this.randomness;

                    if (this.isColorSimilar(sourceRGB, targetRGB, color.hex)) {
                        const intensity = (sourceRGB.r * 0.299 + sourceRGB.g * 0.587 + sourceRGB.b * 0.114) / 255;
                        let dotSize = minSize + (maxSize - minSize) * (1 - intensity);

                        if (randomnessValue > 0) {
                            const randomFactor = 1 + (Math.random() * 2 - 1) * (randomnessValue / 100);
                            dotSize *= randomFactor;
                        }

                        if (dotSize > 0) {
                            ctx.beginPath();
                            ctx.arc(x, y, dotSize / 2, 0, Math.PI * 2);
                            ctx.fill();

                            if (svgGroup && completeSvg) {
                                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                                circle.setAttribute("cx", x);
                                circle.setAttribute("cy", y);
                                circle.setAttribute("r", dotSize / 2);
                                svgGroup.appendChild(circle);

                                const completeGroup = completeSvg.querySelector(`g[fill="${color.hex}"]`);
                                if (completeGroup) {
                                    const completeCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                                    completeCircle.setAttribute("cx", x);
                                    completeCircle.setAttribute("cy", y);
                                    completeCircle.setAttribute("r", dotSize / 2);
                                    completeGroup.appendChild(completeCircle);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    async downloadImages() {
        if (!this.originalImage) return;

        const zip = new JSZip();
        const dateStr = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '');

        const pngBlob = await new Promise(resolve => this.canvas.toBlob(resolve));
        zip.file(this.t('fname_complete_png'), pngBlob);

        for (const color of this.selectedColors) {
            const layerCanvas = this.colorLayers[color.hex];
            const layerBlob = await new Promise(resolve => layerCanvas.toBlob(resolve));
            const cname = this.slugifyFilename(this.colorName(color));
            const fname = this.i18n[this.lang].fname_layer_png(cname);
            zip.file(fname, layerBlob);
        }

        const zipBlob = await zip.generateAsync({type: "blob"});
        const zipUrl = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = this.i18n[this.lang].zip_png(dateStr);
        link.click();
        URL.revokeObjectURL(zipUrl);
    }

    async downloadSvg() {
        if (!this.originalImage) return;

        const zip = new JSZip();
        const dateStr = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '');
        const colorSvgs = {};

        const completeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        completeSvg.setAttribute("width", this.canvas.width);
        completeSvg.setAttribute("height", this.canvas.height);
        completeSvg.setAttribute("viewBox", `0 0 ${this.canvas.width} ${this.canvas.height}`);

        // Créer les groupes pour le SVG complet
        for (const color of this.selectedColors) {
            const completeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            completeGroup.setAttribute("fill", color.hex);
            completeSvg.appendChild(completeGroup);
        }

        for (const color of this.selectedColors) {
            const colorSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            colorSvg.setAttribute("width", this.canvas.width);
            colorSvg.setAttribute("height", this.canvas.height);
            colorSvg.setAttribute("viewBox", `0 0 ${this.canvas.width} ${this.canvas.height}`);

            const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
            group.setAttribute("fill", color.hex);

            this.generateHalftoneEffect(color, group, completeSvg);

            colorSvg.appendChild(group);
            colorSvgs[color.name] = colorSvg;
        }

        const completeData = new XMLSerializer().serializeToString(completeSvg);
        zip.file(this.t('fname_complete_svg'), completeData);

        for (const [colorName, svg] of Object.entries(colorSvgs)) {
            const svgData = new XMLSerializer().serializeToString(svg);
            const fname = this.i18n[this.lang].fname_layer_svg(this.slugifyFilename(colorName));
            zip.file(fname, svgData);
        }

        const zipBlob = await zip.generateAsync({type: "blob"});
        const zipUrl = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = this.i18n[this.lang].zip_svg(dateStr);
        link.click();
        URL.revokeObjectURL(zipUrl);
    }

    findContours(matrix) {
        const contours = [];
        const visited = new Set();
        const directions = [[0,1], [1,0], [0,-1], [-1,0]];
        
        for (let y = 0; y < matrix.length; y++) {
            for (let x = 0; x < matrix[0].length; x++) {
                if (matrix[y][x] === 1 && !visited.has(`${x},${y}`)) {
                    const contour = [];
                    let currentX = x;
                    let currentY = y;
                    let dir = 0;
                    
                    do {
                        visited.add(`${currentX},${currentY}`);
                        contour.push([currentX, currentY]);
                        
                        let found = false;
                        let count = 0;
                        
                        while (!found && count < 4) {
                            const nextDir = (dir + 3) % 4;
                            const [dx, dy] = directions[nextDir];
                            const nextX = currentX + dx;
                            const nextY = currentY + dy;
                            
                            if (nextX >= 0 && nextX < matrix[0].length &&
                                nextY >= 0 && nextY < matrix.length &&
                                matrix[nextY][nextX] === 1) {
                                currentX = nextX;
                                currentY = nextY;
                                dir = nextDir;
                                found = true;
                            } else {
                                dir = (dir + 1) % 4;
                                count++;
                            }
                        }
                        
                        if (!found) break;
                        
                    } while (currentX !== x || currentY !== y);
                    
                    if (contour.length > 4) {
                        const simplified = this.simplifyContour(contour);
                        if (simplified.length > 2) {
                            contours.push(simplified);
                        }
                    }
                }
            }
        }
        
        return contours;
    }

    simplifyContour(points, tolerance = 1) {
        if (points.length <= 2) return points;
        
        let maxDist = 0;
        let index = 0;
        const end = points.length - 1;
        
        for (let i = 1; i < end; i++) {
            const dist = this.pointLineDistance(points[i], points[0], points[end]);
            if (dist > maxDist) {
                maxDist = dist;
                index = i;
            }
        }
        
        if (maxDist > tolerance) {
            const recResults1 = this.simplifyContour(points.slice(0, index + 1), tolerance);
            const recResults2 = this.simplifyContour(points.slice(index), tolerance);
            return [...recResults1.slice(0, -1), ...recResults2];
        } else {
            return [points[0], points[end]];
        }
    }

    pointLineDistance(point, lineStart, lineEnd) {
        const [x, y] = point;
        const [x1, y1] = lineStart;
        const [x2, y2] = lineEnd;
        
        const numerator = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1);
        const denominator = Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));
        
        return numerator / denominator;
    }

    contourToPath(contour) {
        if (contour.length === 0) return '';
        
        let d = `M ${contour[0][0]} ${contour[0][1]}`;
        
        for (let i = 1; i < contour.length; i++) {
            const p0 = contour[i - 1];
            const p1 = contour[i];
            const p2 = contour[(i + 1) % contour.length];
            
            const tension = 0.3;
            const cp1x = p0[0] + (p1[0] - p0[0]) * tension;
            const cp1y = p0[1] + (p1[1] - p0[1]) * tension;
            const cp2x = p1[0] - (p2[0] - p0[0]) * tension;
            const cp2y = p1[1] - (p2[1] - p0[1]) * tension;
            
            d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1[0]},${p1[1]}`;
        }
        
        return d + ' Z';
    }

    initBackgroundAnimation() {
        this.backgroundCanvas.width = window.innerWidth;
        this.backgroundCanvas.height = window.innerHeight;
        this.backgroundCanvas.style.position = 'fixed';
        this.backgroundCanvas.style.top = '0';
        this.backgroundCanvas.style.left = '0';
        this.backgroundCanvas.style.zIndex = '-1';
        document.body.prepend(this.backgroundCanvas);

        for (let i = 0; i < 100; i++) {
            this.addBackgroundPoint();
        }

        this.animateBackground();
    }

    addBackgroundPoint() {
        const colors = this.colors.map(c => c.hex);
        
        this.backgroundPoints.push({
            x: Math.random() * this.backgroundCanvas.width,
            y: Math.random() * this.backgroundCanvas.height,
            size: Math.random() * 10 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            opacity: 0,
            growing: true,
            speed: Math.random() * 0.002 + 0.001,
            velocityX: (Math.random() - 0.5) * 0.3,
            velocityY: (Math.random() - 0.5) * 0.3,
            angle: Math.random() * Math.PI * 2,
            angleSpeed: (Math.random() - 0.5) * 0.01,
            radius: Math.random() * 30 + 10
        });
    }

    animateBackground() {
        this.backgroundCtx.clearRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);

        this.backgroundPoints = this.backgroundPoints.filter(point => {
            if (point.growing) {
                point.opacity += point.speed;
                if (point.opacity >= 0.5) {
                    point.growing = false;
                }
            } else {
                point.opacity -= point.speed * 0.3;
            }

            point.angle += point.angleSpeed;
            
            point.x += point.velocityX + Math.cos(point.angle) * point.radius * 0.01;
            point.y += point.velocityY + Math.sin(point.angle) * point.radius * 0.01;

            if (point.x < 0 || point.x > this.backgroundCanvas.width) {
                point.velocityX *= -1;
            }
            if (point.y < 0 || point.y > this.backgroundCanvas.height) {
                point.velocityY *= -1;
            }

            if (point.opacity > 0) {
                this.backgroundCtx.beginPath();
                this.backgroundCtx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
                this.backgroundCtx.fillStyle = point.color + Math.floor(point.opacity * 255).toString(16).padStart(2, '0');
                this.backgroundCtx.fill();
                return true;
            }
            return false;
        });

        if (this.backgroundPoints.length < 150) {
            this.addBackgroundPoint();
        }

        this.animationFrame = requestAnimationFrame(() => this.animateBackground());
    }

    updateDownloadButtons() {
        const downloadBtn = document.getElementById('download');
        const downloadSvgBtn = document.getElementById('downloadSvg');

        if (!this.originalImage || this.selectedColors.size === 0) {
            downloadBtn.style.display = 'none';
            downloadSvgBtn.style.display = 'none';
            return;
        }

        downloadBtn.style.display = 'inline-block';
        downloadSvgBtn.style.display = 'inline-block';
    }

    hexToRgb(hex) {
        hex = hex.replace(/^#/, '');
        
        const bigint = parseInt(hex, 16);
        return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255
        };
    }

    isColorSimilar(sourceRGB, targetRGB, colorHex) {
        const customSettings = this.customSettings.get(colorHex);
        const useCustomSettings = customSettings?.enabled;

        const tolerance = useCustomSettings 
            ? customSettings.tolerance 
            : (this.colorTolerances.get(colorHex) || { min: this.colorThresholdMin, max: this.colorThresholdMax });
        
        const diff = Math.abs(sourceRGB.r - targetRGB.r) +
                    Math.abs(sourceRGB.g - targetRGB.g) +
                    Math.abs(sourceRGB.b - targetRGB.b);
        
        return diff >= tolerance.min && diff <= tolerance.max;
    }

    getColorAngle(color) {
        if (this.hexToAngle && this.hexToAngle.has(color.hex)) return this.hexToAngle.get(color.hex);
        return (this.colors.indexOf(color) * 3) % 90;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PointillismGenerator();
}); 