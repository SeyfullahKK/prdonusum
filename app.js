// UUID oluşturucu fonksiyon
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Ana uygulama sınıfı
class MOGRTGrouper {
    constructor() {
        this.inputData = null;
        this.outputData = null;
        this.mogrtFiles = null;
        this.isProcessingMOGRT = false;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const inputDrop = document.getElementById('inputDrop');
        const fileInput = document.getElementById('fileInput');
        const convertBtn = document.getElementById('convertBtn');

        // Dosya seçme
        inputDrop.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Drag & Drop
        inputDrop.addEventListener('dragover', (e) => {
            e.preventDefault();
            inputDrop.classList.add('active');
        });

        inputDrop.addEventListener('dragleave', () => {
            inputDrop.classList.remove('active');
        });

        inputDrop.addEventListener('drop', (e) => {
            e.preventDefault();
            inputDrop.classList.remove('active');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.processFile(files[0]);
            }
        });

        // Dönüştür butonu
        convertBtn.addEventListener('click', () => this.convertAndDownload());
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    async processFile(file) {
        const fileName = file.name.toLowerCase();
        
        if (fileName.endsWith('.mogrt')) {
            // MOGRT dosyası işle
            await this.processMOGRTFile(file);
        } else if (fileName.endsWith('.json')) {
            // JSON dosyası işle
            this.processJSONFile(file);
        } else {
            this.showError('Lütfen bir .mogrt veya .json dosyası seçin!');
        }
    }

    async processMOGRTFile(file) {
        this.isProcessingMOGRT = true;
        this.showLoading(true);
        
        try {
            const zip = new JSZip();
            const content = await zip.loadAsync(file);
            
            // MOGRT içeriğini sakla
            this.mogrtFiles = content;
            
            // definition.json dosyasını bul
            let jsonFile = null;
            for (let fileName in content.files) {
                if (fileName.toLowerCase().includes('definition') && fileName.endsWith('.json')) {
                    jsonFile = content.files[fileName];
                    break;
                }
            }
            
            if (!jsonFile) {
                throw new Error('MOGRT içinde definition.json bulunamadı!');
            }
            
            // JSON içeriğini oku
            const jsonContent = await jsonFile.async('string');
            this.inputData = JSON.parse(jsonContent);
            
            // MOGRT içeriğini göster
            this.displayMOGRTInfo(content.files);
            
            // Veriyi dönüştür
            this.convertData();
            document.getElementById('convertBtn').disabled = false;
            
        } catch (error) {
            this.showError('MOGRT dosyası işlenirken hata: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    processJSONFile(file) {
        this.isProcessingMOGRT = false;
        this.mogrtFiles = null;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.inputData = JSON.parse(e.target.result);
                this.displayInput();
                this.convertData();
                document.getElementById('convertBtn').disabled = false;
            } catch (error) {
                this.showError('JSON dosyası okunamadı!');
            }
        };
        reader.readAsText(file);
    }

    displayMOGRTInfo(files) {
        const previewDiv = document.getElementById('inputPreview');
        
        // MOGRT içeriği bilgisi
        let fileListHtml = '<div class="file-info"><strong>📦 MOGRT İçeriği:</strong><ul class="file-list">';
        
        for (let fileName in files) {
            const icon = fileName.endsWith('.json') ? '📄' : 
                        fileName.endsWith('.png') ? '🖼️' : 
                        fileName.endsWith('.aegraphic') ? '🎬' : '📎';
            fileListHtml += `<li>${icon} ${fileName}</li>`;
        }
        
        fileListHtml += '</ul></div>';
        
        // Kontrol listesi
        let controlsHtml = '<div class="controls-list"><h3>Bulunan Kontroller:</h3>';
        
        if (this.inputData.clientControls) {
            this.inputData.clientControls.forEach(control => {
                const name = control.uiName.strDB[0].str;
                const type = this.getControlTypeName(control.type);
                controlsHtml += `
                    <div class="control-item">
                        <span class="control-name">${name}</span>
                        <span class="control-type">${type}</span>
                    </div>
                `;
            });
        }
        
        controlsHtml += '</div>';
        
        previewDiv.innerHTML = fileListHtml + controlsHtml;
    }

    displayInput() {
        const previewDiv = document.getElementById('inputPreview');
        
        // Kontrol listesi oluştur
        let controlsHtml = '<div class="controls-list"><h3>Bulunan Kontroller:</h3>';
        
        if (this.inputData.clientControls) {
            this.inputData.clientControls.forEach(control => {
                const name = control.uiName.strDB[0].str;
                const type = this.getControlTypeName(control.type);
                controlsHtml += `
                    <div class="control-item">
                        <span class="control-name">${name}</span>
                        <span class="control-type">${type}</span>
                    </div>
                `;
            });
        }
        
        controlsHtml += '</div>';
        
        // JSON önizleme
        controlsHtml += '<div class="json-preview">' + 
            JSON.stringify(this.inputData, null, 2).substring(0, 500) + 
            '...\n}</div>';
        
        previewDiv.innerHTML = controlsHtml;
    }

    getControlTypeName(type) {
        const types = {
            2: 'Slider',
            3: 'Angle',
            4: 'Color',
            5: 'Point',
            10: 'Group'
        };
        return types[type] || 'Unknown';
    }

    convertData() {
        // Derin kopya oluştur
        this.outputData = JSON.parse(JSON.stringify(this.inputData));
        
        // Yeni capsule ID oluştur - bu gerekli çünkü aynı ID'li iki template olamaz
        this.outputData.capsuleID = generateUUID();
        
        // Seçilen Premiere Pro versiyonuna göre uygun versiyon bilgilerini ayarla
        const versionSelect = document.getElementById('premiereVersion');
        const selectedVersion = versionSelect.value;
        
        switch (selectedVersion) {
            case '2024':
                // Premiere Pro 2024 (v25.x)
                this.outputData.aelibCompliantVersion = "202410";
                this.outputData.mobileCompatibilityVersion = "202410";
                this.outputData.apiVersion = "2.0";
                this.outputData.responsiveDesignVersion = "1";
                if (this.outputData.typekitOnlyVersion) {
                    this.outputData.typekitOnlyVersion = "202410";
                }
                break;
                
            case '2023':
                // Premiere Pro 2023 (v23.x - v24.x)
                this.outputData.aelibCompliantVersion = "202310";
                this.outputData.mobileCompatibilityVersion = "202310";
                this.outputData.apiVersion = "1.9";
                this.outputData.responsiveDesignVersion = "1";
                if (this.outputData.typekitOnlyVersion) {
                    this.outputData.typekitOnlyVersion = "202310";
                }
                break;
                
            case '2022':
                // Premiere Pro 2022 (v22.x)
                this.outputData.aelibCompliantVersion = "202210";
                this.outputData.mobileCompatibilityVersion = "202210";
                this.outputData.apiVersion = "1.9";
                this.outputData.responsiveDesignVersion = "0";
                if (this.outputData.typekitOnlyVersion) {
                    this.outputData.typekitOnlyVersion = "202210";
                }
                break;
                
            case '2021':
            default:
                // Premiere Pro 2021 ve öncesi
                this.outputData.aelibCompliantVersion = "201710";
                this.outputData.mobileCompatibilityVersion = "201904";
                this.outputData.apiVersion = "1.9";
                this.outputData.responsiveDesignVersion = "0";
                if (this.outputData.typekitOnlyVersion) {
                    this.outputData.typekitOnlyVersion = "201710";
                }
                break;
        }
        
        // Platform desteğini kontrol et ve güncelle
        this.outputData.platformSupport = ["ppro"];
        
        // internalEffectsOnlyVersion güncelle
        if (this.outputData.internalEffectsOnlyVersion !== undefined) {
            this.outputData.internalEffectsOnlyVersion = "0";
        }
        
        // Kontrolleri kategorize et
        const globalControls = [];
        const sceneControls = [];
        const globalControlIds = [];
        const sceneControlIds = [];
        
        // Mevcut kontrolleri kopyala ve kategorize et
        const originalControls = [...this.outputData.clientControls];
        
        originalControls.forEach(control => {
            const name = control.uiName.strDB[0].str.toLowerCase();
            
            if (name.includes('global') || name.includes('position') || 
                name.includes('scale') || name.includes('rotation')) {
                globalControls.push(control);
                globalControlIds.push(control.id);
            } else if (name.includes('color') || name.includes('scene')) {
                sceneControls.push(control);
                sceneControlIds.push(control.id);
            }
        });
        
        // Grup objelerini oluştur
        const globalGroup = {
            canAnimate: true,
            groupexpanded: false,
            id: "169dba00-cb75-421a-ae83-b505e5fcbedf", // Sabit ID kullan
            type: 10,
            uiName: {
                strDB: [{
                    localeString: "en_US",
                    str: "Global Controllers"
                }]
            },
            uiSuffix: { strDB: [{ localeString: "en_US", str: "" }] },
            uiToolTip: { strDB: [{ localeString: "en_US", str: "" }] },
            value: globalControlIds
        };
        
        const sceneGroup = {
            canAnimate: true,
            groupexpanded: false,
            id: "4a94e43d-b2b2-49bd-a50d-381bff108136", // Sabit ID kullan
            type: 10,
            uiName: {
                strDB: [{
                    localeString: "en_US",
                    str: "Scene Controllers"
                }]
            },
            uiSuffix: { strDB: [{ localeString: "en_US", str: "" }] },
            uiToolTip: { strDB: [{ localeString: "en_US", str: "" }] },
            value: sceneControlIds
        };
        
        // clientControls'ı yeniden düzenle - sıralama önemli!
        this.outputData.clientControls = [
            globalGroup,
            ...globalControls,
            sceneGroup,
            ...sceneControls
        ];
        
        // capsuleparams'ı güncelle
        if (this.outputData.sourceInfoLocalized && 
            this.outputData.sourceInfoLocalized.en_US && 
            this.outputData.sourceInfoLocalized.en_US.capsuleparams) {
            
            const capsuleParams = [...this.outputData.sourceInfoLocalized.en_US.capsuleparams.capParams];
            
            // Grup parametrelerini ekle
            const globalGroupParam = {
                capPropAnimatable: false,
                capPropDefault: globalControlIds,
                capPropGroupExpanded: false,
                capPropMatchName: globalGroup.id,
                capPropType: 8,
                capPropUIName: "Global Controllers"
            };
            
            const sceneGroupParam = {
                capPropAnimatable: false,
                capPropDefault: sceneControlIds,
                capPropGroupExpanded: false,
                capPropMatchName: sceneGroup.id,
                capPropType: 8,
                capPropUIName: "Scene Controllers"
            };
            
            // Parametreleri yeniden düzenle - orijinal sırayı koru
            const globalParams = [];
            const sceneParams = [];
            
            capsuleParams.forEach(param => {
                if (globalControlIds.includes(param.capPropMatchName)) {
                    globalParams.push(param);
                } else if (sceneControlIds.includes(param.capPropMatchName)) {
                    sceneParams.push(param);
                }
            });
            
            this.outputData.sourceInfoLocalized.en_US.capsuleparams.capParams = [
                globalGroupParam,
                ...globalParams,
                sceneGroupParam,
                ...sceneParams
            ];
            
            // appspecificsourceinfo güncelleme (eğer varsa)
            if (this.outputData.sourceInfoLocalized.en_US.appspecificsourceinfo) {
                try {
                    const appInfo = JSON.parse(this.outputData.sourceInfoLocalized.en_US.appspecificsourceinfo);
                    
                    // Versiyon bilgisini güncelle
                    switch (selectedVersion) {
                        case '2024':
                            appInfo.version = 11;
                            break;
                        case '2023':
                            appInfo.version = 10;
                            break;
                        case '2022':
                            appInfo.version = 10;
                            break;
                        case '2021':
                        default:
                            appInfo.version = 10;
                            break;
                    }
                    
                    this.outputData.sourceInfoLocalized.en_US.appspecificsourceinfo = JSON.stringify(appInfo);
                } catch (e) {
                    // JSON parse hatası varsa atla
                }
            }
        }
        
        this.displayOutput();
    }

    displayOutput() {
        const previewDiv = document.getElementById('outputPreview');
        
        let groupsHtml = '<div class="controls-list"><h3>Oluşturulan Gruplar:</h3>';
        
        // Grupları göster
        this.outputData.clientControls.filter(c => c.type === 10).forEach(group => {
            const name = group.uiName.strDB[0].str;
            const controlCount = group.value.length;
            groupsHtml += `
                <div class="control-item">
                    <span class="control-name">📁 ${name}</span>
                    <span class="control-type">${controlCount} kontrol</span>
                </div>
            `;
            
            // Grup içindeki kontrolleri göster
            group.value.forEach(controlId => {
                const control = this.outputData.clientControls.find(c => c.id === controlId);
                if (control) {
                    const controlName = control.uiName.strDB[0].str;
                    groupsHtml += `
                        <div class="control-item" style="margin-left: 20px; background: #e9ecef;">
                            <span class="control-name">└─ ${controlName}</span>
                            <span class="control-type">${this.getControlTypeName(control.type)}</span>
                        </div>
                    `;
                }
            });
        });
        
        groupsHtml += '</div>';
        
        // JSON önizleme
        groupsHtml += '<div class="json-preview">' + 
            JSON.stringify(this.outputData, null, 2).substring(0, 500) + 
            '...\n}</div>';
        
        previewDiv.innerHTML = groupsHtml;
    }

    async convertAndDownload() {
        if (!this.outputData) return;
        
        this.showLoading(true);
        
        try {
            if (this.isProcessingMOGRT && this.mogrtFiles) {
                // MOGRT dosyası oluştur
                await this.createAndDownloadMOGRT();
            } else {
                // Sadece JSON dosyasını indir
                this.downloadJSON();
            }
            
            this.showSuccess();
        } catch (error) {
            this.showError('İndirme hatası: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async createAndDownloadMOGRT() {
        const newZip = new JSZip();
        
        // Tüm dosyaları yeni ZIP'e kopyala
        for (let fileName in this.mogrtFiles.files) {
            const file = this.mogrtFiles.files[fileName];
            
            // JSON dosyasını güncelle
            if (fileName.toLowerCase().includes('definition') && fileName.endsWith('.json')) {
                newZip.file(fileName, JSON.stringify(this.outputData, null, 2));
            } else {
                // Diğer dosyaları olduğu gibi kopyala
                const content = await file.async('uint8array');
                newZip.file(fileName, content);
            }
        }
        
        // ZIP oluştur ve indir
        const blob = await newZip.generateAsync({type: 'blob'});
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'grouped.mogrt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    downloadJSON() {
        const dataStr = JSON.stringify(this.outputData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'definition-grouped.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        const btnText = document.getElementById('btnText');
        const btn = document.getElementById('convertBtn');
        
        if (show) {
            loading.style.display = 'inline-block';
            btnText.textContent = 'İşleniyor';
            btn.disabled = true;
        } else {
            loading.style.display = 'none';
            btnText.textContent = 'Gruplandır ve İndir';
            btn.disabled = false;
        }
    }

    showSuccess() {
        const successMsg = document.getElementById('successMsg');
        const errorMsg = document.getElementById('errorMsg');
        
        errorMsg.style.display = 'none';
        successMsg.style.display = 'block';
        
        setTimeout(() => {
            successMsg.style.display = 'none';
        }, 3000);
    }

    showError(message) {
        const errorMsg = document.getElementById('errorMsg');
        const successMsg = document.getElementById('successMsg');
        
        successMsg.style.display = 'none';
        errorMsg.textContent = `❌ ${message}`;
        errorMsg.style.display = 'block';
        
        setTimeout(() => {
            errorMsg.style.display = 'none';
        }, 3000);
    }
}

// Uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
    new MOGRTGrouper();
}); 