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
        this.originalFileName = null; // Orijinal dosya adını sakla
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
        
        // Orijinal dosya adını sakla (uzantısız)
        this.originalFileName = file.name.replace(/\.[^/.]+$/, "");
        
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
        
        // İç içe grup desteği kontrolü
        const supportsNestedGroups = selectedVersion === '2024';
        console.log(`Premiere Pro ${selectedVersion} - İç içe grup desteği: ${supportsNestedGroups ? 'EVET' : 'HAYIR'}`);
        
        switch (selectedVersion) {
            case '2024':
                // Premiere Pro 2024 (v25.x)
                this.outputData.aelibCompliantVersion = "202410";
                this.outputData.mobileCompatibilityVersion = "202410";
                this.outputData.apiVersion = "2.0";
                this.outputData.responsiveDesignVersion = "1";
                this.outputData.typekitOnlyVersion = "202410";
                this.outputData.internalEffectsOnlyVersion = "0";
                break;
                
            case '2023':
                // Premiere Pro 2023 (v23.x - v24.x)
                this.outputData.aelibCompliantVersion = "202110"; // 2023 için daha eski versiyon
                this.outputData.mobileCompatibilityVersion = "201904";
                this.outputData.apiVersion = "1.9";
                this.outputData.responsiveDesignVersion = "0";
                this.outputData.typekitOnlyVersion = "201710";
                this.outputData.internalEffectsOnlyVersion = "0";
                break;
                
            case '2022':
                // Premiere Pro 2022 (v22.x)
                this.outputData.aelibCompliantVersion = "201710";
                this.outputData.mobileCompatibilityVersion = "201904";
                this.outputData.apiVersion = "1.9";
                this.outputData.responsiveDesignVersion = "0";
                this.outputData.typekitOnlyVersion = "201710";
                this.outputData.internalEffectsOnlyVersion = "0";
                break;
                
            case '2021':
            default:
                // Premiere Pro 2021 ve öncesi
                this.outputData.aelibCompliantVersion = "201710";
                this.outputData.mobileCompatibilityVersion = "0";
                this.outputData.apiVersion = "1.9";
                this.outputData.responsiveDesignVersion = "0";
                this.outputData.typekitOnlyVersion = "0";
                this.outputData.internalEffectsOnlyVersion = "0";
                break;
        }
        
        // Platform desteğini kontrol et ve güncelle
        this.outputData.platformSupport = ["ppro"];
        
        // Gruplandırma için veri yapısı
        const groups = {};
        const ungroupedControls = [];
        
        // Mevcut kontrolleri analiz et
        const originalControls = [...this.outputData.clientControls];
        
        originalControls.forEach(control => {
            const name = control.uiName.strDB[0].str;
            const parts = name.split(' | ');
            
            if (parts.length === 1) {
                // Grup yok, direkt ekle
                ungroupedControls.push(control);
            } else if (parts.length === 2) {
                // Ana grup var
                const groupName = parts[0];
                const controlName = parts[1];
                
                if (!groups[groupName]) {
                    groups[groupName] = {
                        name: groupName,
                        controls: [],
                        subgroups: {}
                    };
                }
                
                // Kontrol ismini güncelle
                control.uiName.strDB[0].str = controlName;
                groups[groupName].controls.push(control);
                
            } else if (parts.length === 3) {
                // Ana grup ve alt grup var
                const mainGroupName = parts[0];
                const subGroupName = parts[1];
                const controlName = parts[2];
                
                if (!supportsNestedGroups) {
                    // Premiere Pro 2023 ve öncesi: Alt grupları düz metin olarak göster
                    if (!groups[mainGroupName]) {
                        groups[mainGroupName] = {
                            name: mainGroupName,
                            controls: [],
                            subgroups: {}
                        };
                    }
                    
                    // Kontrol ismini alt grup bilgisiyle birlikte sakla
                    control.uiName.strDB[0].str = `${subGroupName} - ${controlName}`;
                    groups[mainGroupName].controls.push(control);
                    
                } else {
                    // Premiere Pro 2024+: İç içe gruplar destekleniyor
                    if (!groups[mainGroupName]) {
                        groups[mainGroupName] = {
                            name: mainGroupName,
                            controls: [],
                            subgroups: {}
                        };
                    }
                    
                    if (!groups[mainGroupName].subgroups[subGroupName]) {
                        groups[mainGroupName].subgroups[subGroupName] = {
                            name: subGroupName,
                            controls: []
                        };
                    }
                    
                    // Kontrol ismini güncelle
                    control.uiName.strDB[0].str = controlName;
                    groups[mainGroupName].subgroups[subGroupName].controls.push(control);
                }
            }
        });
        
        // Yeni clientControls dizisini oluştur
        const newClientControls = [];
        const allGroups = [];
        const groupsOrder = []; // Grup sıralaması için
        
        // Ana grupları oluştur
        Object.keys(groups).forEach(groupName => {
            const groupData = groups[groupName];
            const groupId = generateUUID();
            const groupControlIds = [];
            const subGroups = [];
            
            // Alt grupları oluştur (sadece 2024+ için)
            if (supportsNestedGroups) {
                Object.keys(groupData.subgroups).forEach(subGroupName => {
                    const subGroupData = groupData.subgroups[subGroupName];
                    const subGroupId = generateUUID();
                    const subGroupControlIds = subGroupData.controls.map(c => c.id);
                    
                    const subGroup = {
                        canAnimate: true,
                        groupexpanded: false,
                        id: subGroupId,
                        type: 10,
                        uiName: {
                            strDB: [{
                                localeString: "en_US",
                                str: subGroupName
                            }]
                        },
                        uiSuffix: { strDB: [{ localeString: "en_US", str: "" }] },
                        uiToolTip: { strDB: [{ localeString: "en_US", str: "" }] },
                        value: subGroupControlIds
                    };
                    
                    subGroups.push({
                        group: subGroup,
                        controls: subGroupData.controls
                    });
                    
                    groupControlIds.push(subGroupId);
                    allGroups.push(subGroup);
                });
            }
            
            // Ana grubun direkt kontrollerini ekle
            groupData.controls.forEach(control => {
                groupControlIds.push(control.id);
            });
            
            // Ana grup objesini oluştur
            const mainGroup = {
                canAnimate: true,
                groupexpanded: false,
                id: groupId,
                type: 10,
                uiName: {
                    strDB: [{
                        localeString: "en_US",
                        str: groupName
                    }]
                },
                uiSuffix: { strDB: [{ localeString: "en_US", str: "" }] },
                uiToolTip: { strDB: [{ localeString: "en_US", str: "" }] },
                value: groupControlIds
            };
            
            allGroups.push(mainGroup);
            
            // Grup sıralaması için sakla
            groupsOrder.push({
                mainGroup: mainGroup,
                subGroups: subGroups,
                directControls: groupData.controls
            });
        });
        
        // Premiere Pro için doğru sıralama ile clientControls'ı oluştur
        // Önce tüm grupları ekle (ana gruplar ve alt gruplar)
        groupsOrder.forEach(groupInfo => {
            newClientControls.push(groupInfo.mainGroup);
        });
        
        // Sonra alt grupları ekle
        groupsOrder.forEach(groupInfo => {
            groupInfo.subGroups.forEach(subGroupInfo => {
                newClientControls.push(subGroupInfo.group);
            });
        });
        
        // En son kontrolleri ekle
        groupsOrder.forEach(groupInfo => {
            // Alt grup kontrollerini ekle
            groupInfo.subGroups.forEach(subGroupInfo => {
                newClientControls.push(...subGroupInfo.controls);
            });
            // Ana grup direkt kontrollerini ekle
            newClientControls.push(...groupInfo.directControls);
        });
        
        // Gruplanmamış kontrolleri ekle
        newClientControls.push(...ungroupedControls);
        
        // clientControls'ı güncelle
        this.outputData.clientControls = newClientControls;
        
        // capsuleparams'ı güncelle
        if (this.outputData.sourceInfoLocalized && 
            this.outputData.sourceInfoLocalized.en_US && 
            this.outputData.sourceInfoLocalized.en_US.capsuleparams) {
            
            const capsuleParams = [...this.outputData.sourceInfoLocalized.en_US.capsuleparams.capParams];
            const newCapParams = [];
            
            // Önce tüm grup parametrelerini ekle
            allGroups.forEach(group => {
                const groupParam = {
                    capPropAnimatable: false,
                    capPropDefault: group.value,
                    capPropGroupExpanded: false,
                    capPropMatchName: group.id,
                    capPropType: 8,
                    capPropUIName: group.uiName.strDB[0].str
                };
                newCapParams.push(groupParam);
            });
            
            // Sonra kontrol parametrelerini ekle (sırayı koru)
            this.outputData.clientControls.forEach(item => {
                if (item.type !== 10) { // Grup değilse
                    const existingParam = capsuleParams.find(p => p.capPropMatchName === item.id);
                    if (existingParam) {
                        // UI ismindeki | karakterlerini kaldır
                        if (existingParam.capPropUIName && existingParam.capPropUIName.includes(' | ')) {
                            const parts = existingParam.capPropUIName.split(' | ');
                            existingParam.capPropUIName = parts[parts.length - 1];
                        }
                        newCapParams.push(existingParam);
                    }
                }
            });
            
            this.outputData.sourceInfoLocalized.en_US.capsuleparams.capParams = newCapParams;
            
            // appspecificsourceinfo güncelleme
            if (this.outputData.sourceInfoLocalized.en_US.appspecificsourceinfo) {
                try {
                    const appInfo = JSON.parse(this.outputData.sourceInfoLocalized.en_US.appspecificsourceinfo);
                    
                    // Versiyon bilgisini güncelle
                    switch (selectedVersion) {
                        case '2024':
                            appInfo.version = 11;
                            appInfo.useAELib = true;
                            break;
                        case '2023':
                            appInfo.version = 10;
                            appInfo.useAELib = false;
                            break;
                        case '2022':
                            appInfo.version = 10;
                            appInfo.useAELib = false;
                            break;
                        case '2021':
                        default:
                            appInfo.version = 10;
                            appInfo.useAELib = false;
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
        
        // Grupları ve kontrollerini göster
        const addedControls = new Set();
        
        this.outputData.clientControls.forEach(item => {
            if (item.type === 10) {
                // Bu bir grup
                const name = item.uiName.strDB[0].str;
                const controlCount = item.value.length;
                
                groupsHtml += `
                    <div class="control-item">
                        <span class="control-name">📁 ${name}</span>
                        <span class="control-type">${controlCount} öğe</span>
                    </div>
                `;
                
                // Grup içindeki öğeleri göster
                item.value.forEach(id => {
                    if (!addedControls.has(id)) {
                        const subItem = this.outputData.clientControls.find(c => c.id === id);
                        if (subItem) {
                            if (subItem.type === 10) {
                                // Alt grup
                                const subName = subItem.uiName.strDB[0].str;
                                const subCount = subItem.value.length;
                                groupsHtml += `
                                    <div class="control-item" style="margin-left: 20px; background: #e9ecef;">
                                        <span class="control-name">└─ 📂 ${subName}</span>
                                        <span class="control-type">${subCount} kontrol</span>
                                    </div>
                                `;
                                
                                // Alt grubun kontrollerini göster
                                subItem.value.forEach(subId => {
                                    const control = this.outputData.clientControls.find(c => c.id === subId);
                                    if (control && control.type !== 10) {
                                        const controlName = control.uiName.strDB[0].str;
                                        groupsHtml += `
                                            <div class="control-item" style="margin-left: 40px; background: #dee2e6;">
                                                <span class="control-name">└─ ${controlName}</span>
                                                <span class="control-type">${this.getControlTypeName(control.type)}</span>
                                            </div>
                                        `;
                                        addedControls.add(subId);
                                    }
                                });
                            } else {
                                // Direkt kontrol
                                const controlName = subItem.uiName.strDB[0].str;
                                groupsHtml += `
                                    <div class="control-item" style="margin-left: 20px; background: #e9ecef;">
                                        <span class="control-name">└─ ${controlName}</span>
                                        <span class="control-type">${this.getControlTypeName(subItem.type)}</span>
                                    </div>
                                `;
                            }
                            addedControls.add(id);
                        }
                    }
                });
            }
        });
        
        // Gruplanmamış kontrolleri göster
        let hasUngrouped = false;
        this.outputData.clientControls.forEach(control => {
            if (control.type !== 10 && !addedControls.has(control.id)) {
                if (!hasUngrouped) {
                    hasUngrouped = true;
                    groupsHtml += `
                        <div class="control-item" style="margin-top: 20px;">
                            <span class="control-name">📋 Gruplanmamış Kontroller</span>
                            <span class="control-type"></span>
                        </div>
                    `;
                }
                const controlName = control.uiName.strDB[0].str;
                groupsHtml += `
                    <div class="control-item" style="margin-left: 20px; background: #f8f9fa;">
                        <span class="control-name">└─ ${controlName}</span>
                        <span class="control-type">${this.getControlTypeName(control.type)}</span>
                    </div>
                `;
            }
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
        // Orijinal dosya adını kullan
        link.download = `${this.originalFileName}.mogrt`;
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
        // JSON için de orijinal dosya adını kullan
        link.download = this.originalFileName ? `${this.originalFileName}_grouped.json` : 'definition-grouped.json';
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