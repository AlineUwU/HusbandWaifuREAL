 // Configuración de modo oscuro
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
        }
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
            if (event.matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        });

        // Variables globales
        let originalImage = null;
        let gridPiecesData = [];

        // Tamaños de papel en cm
        const paperSizes = {
            'a4': { width: 21, height: 29.7 },
            'letter': { width: 21.6, height: 27.9 },
            'a3': { width: 29.7, height: 42 },
            'tabloid': { width: 27.9, height: 43.2 }
        };

        // Event listeners
        document.getElementById('imageInput').addEventListener('change', handleImageUpload);
        document.getElementById('generateBtn').addEventListener('click', generateGrid);
        document.getElementById('downloadAllBtn').addEventListener('click', downloadAll);
        document.getElementById('printGuideBtn').addEventListener('click', showAssemblyGuide);
        document.getElementById('closeModal').addEventListener('click', hideAssemblyGuide);

        function handleImageUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    originalImage = img;
                    showPreview(img, e.target.result);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        function showPreview(img, src) {
            const previewSection = document.getElementById('previewSection');
            const previewImage = document.getElementById('previewImage');
            const imageInfo = document.getElementById('imageInfo');

            previewImage.src = src;
            imageInfo.innerHTML = `
                <strong>Dimensiones originales:</strong> ${img.width} × ${img.height} px<br>
                <strong>Relación de aspecto:</strong> ${(img.width / img.height).toFixed(2)}:1
            `;
            previewSection.classList.remove('hidden');
        }

        function generateGrid() {
            if (!originalImage) {
                alert('Por favor, selecciona una imagen primero');
                return;
            }

            const targetHeight = parseFloat(document.getElementById('heightInput').value);
            const paperSize = document.getElementById('paperSize').value;
            const margin = parseFloat(document.getElementById('marginSize').value);
            const tabSize = parseFloat(document.getElementById('tabSize').value);

            const paper = paperSizes[paperSize];
            const printableWidth = paper.width - (margin * 2);
            const printableHeight = paper.height - (margin * 2);

            // Calcular dimensiones del personaje
            const aspectRatio = originalImage.width / originalImage.height;
            const targetWidth = targetHeight * aspectRatio;

            // Calcular número de piezas necesarias
            const cols = Math.ceil(targetWidth / printableWidth);
            const rows = Math.ceil(targetHeight / printableHeight);

            // Mostrar información
            showGridInfo(targetWidth, targetHeight, cols, rows, cols * rows);

            // Generar piezas
            generateGridPieces(cols, rows, targetWidth, targetHeight, printableWidth, printableHeight, tabSize);
        }

        function showGridInfo(width, height, cols, rows, totalPieces) {
            const gridInfo = document.getElementById('gridInfo');
            const gridDetails = document.getElementById('gridDetails');

            gridDetails.innerHTML = `
                <div class="grid md:grid-cols-2 gap-4">
                    <div>
                        <strong>📏 Tamaño final:</strong> ${width.toFixed(1)} × ${height.toFixed(1)} cm<br>
                        <strong>🔢 Piezas totales:</strong> ${totalPieces}<br>
                        <strong>📐 Distribución:</strong> ${cols} columnas × ${rows} filas
                    </div>
                    <div>
                        <strong>⏱️ Tiempo estimado de corte:</strong> ${Math.ceil(totalPieces * 2)} minutos<br>
                        <strong>⏱️ Tiempo estimado de pegado:</strong> ${Math.ceil(totalPieces * 1.5)} minutos<br>
                        <strong>📄 Hojas necesarias:</strong> ${totalPieces}
                    </div>
                </div>
            `;
            gridInfo.classList.remove('hidden');
        }

        function generateGridPieces(cols, rows, targetWidth, targetHeight, printableWidth, printableHeight, tabSize) {
            const gridContainer = document.getElementById('gridContainer');
            const gridPieces = document.getElementById('gridPieces');
            
            gridPieces.innerHTML = '';
            gridPiecesData = [];

            const pieceWidth = targetWidth / cols;
            const pieceHeight = targetHeight / rows;

            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const pieceNumber = row * cols + col + 1;
                    const canvas = createPiece(col, row, cols, rows, pieceWidth, pieceHeight, tabSize, pieceNumber);
                    
                    const pieceDiv = document.createElement('div');
                    pieceDiv.className = 'bg-white dark:bg-gray-700 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600';
                    pieceDiv.innerHTML = `
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-semibold text-sm">Pieza ${pieceNumber}</span>
                            <span class="text-xs text-gray-500">(${col + 1}, ${row + 1})</span>
                        </div>
                        <div class="mb-3">
                            ${canvas.outerHTML}
                        </div>
                        <button onclick="downloadPiece(${pieceNumber - 1})" 
                                class="w-full bg-primary text-white px-3 py-2 rounded text-sm hover:bg-purple-700 transition-colors">
                            💾 Descargar
                        </button>
                    `;
                    
                    gridPieces.appendChild(pieceDiv);
                    gridPiecesData.push(canvas);
                }
            }

            gridContainer.classList.remove('hidden');
        }

        function createPiece(col, row, totalCols, totalRows, pieceWidth, pieceHeight, tabSize, pieceNumber) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Obtener dimensiones del papel seleccionado
            const paperSize = document.getElementById('paperSize').value;
            const paper = paperSizes[paperSize];
            const paperRatio = paper.width / paper.height;
            
            // Configurar canvas con proporciones reales del papel
            const scale = 3; // Mayor resolución para mejor calidad
            const displayWidth = 200;
            const displayHeight = displayWidth / paperRatio;
            
            canvas.style.width = displayWidth + 'px';
            canvas.style.height = displayHeight + 'px';
            canvas.width = displayWidth * scale;
            canvas.height = displayHeight * scale;
            ctx.scale(scale, scale);

            // Convertir tabSize de cm a pixels en escala del canvas
            const tabSizePixels = (tabSize / paper.width) * displayWidth;

            // Calcular área de imagen y pestañas
            const imageArea = {
                x: col > 0 ? tabSizePixels : 0,
                y: row > 0 ? tabSizePixels : 0,
                width: displayWidth - (col > 0 ? tabSizePixels : 0) - (col < totalCols - 1 ? tabSizePixels : 0),
                height: displayHeight - (row > 0 ? tabSizePixels : 0) - (row < totalRows - 1 ? tabSizePixels : 0)
            };

            // Fondo blanco
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, displayWidth, displayHeight);

            // Dibujar imagen
            const sourceX = (originalImage.width / totalCols) * col;
            const sourceY = (originalImage.height / totalRows) * row;
            const sourceWidth = originalImage.width / totalCols;
            const sourceHeight = originalImage.height / totalRows;

            ctx.drawImage(
                originalImage,
                sourceX, sourceY, sourceWidth, sourceHeight,
                imageArea.x, imageArea.y, imageArea.width, imageArea.height
            );

            // Dibujar pestañas con colores diferenciados
            ctx.fillStyle = '#e8e8e8';
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 1;

            // Pestaña derecha
            if (col < totalCols - 1) {
                const tabX = imageArea.x + imageArea.width;
                const tabY = imageArea.y + imageArea.height * 0.25;
                const tabHeight = imageArea.height * 0.5;
                
                // Forma de pestaña más orgánica
                const tabPath = new Path2D();
                tabPath.moveTo(tabX, tabY);
                tabPath.lineTo(tabX + tabSizePixels * 0.8, tabY + tabHeight * 0.1);
                tabPath.lineTo(tabX + tabSizePixels, tabY + tabHeight * 0.3);
                tabPath.lineTo(tabX + tabSizePixels, tabY + tabHeight * 0.7);
                tabPath.lineTo(tabX + tabSizePixels * 0.8, tabY + tabHeight * 0.9);
                tabPath.lineTo(tabX, tabY + tabHeight);
                tabPath.closePath();
                
                ctx.fill(tabPath);
                ctx.stroke(tabPath);

                // Número en la pestaña derecha
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.save();
                ctx.translate(tabX + tabSizePixels/2, tabY + tabHeight/2);
                ctx.rotate(Math.PI/2);
                ctx.fillText(`${pieceNumber}`, 0, 4);
                ctx.restore();

                // Línea punteada para doblar
                ctx.setLineDash([2, 2]);
                ctx.strokeStyle = '#666';
                ctx.beginPath();
                ctx.moveTo(tabX, imageArea.y);
                ctx.lineTo(tabX, imageArea.y + imageArea.height);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Pestaña inferior
            if (row < totalRows - 1) {
                const tabX = imageArea.x + imageArea.width * 0.25;
                const tabY = imageArea.y + imageArea.height;
                const tabWidth = imageArea.width * 0.5;
                
                // Forma de pestaña más orgánica
                const tabPath = new Path2D();
                tabPath.moveTo(tabX, tabY);
                tabPath.lineTo(tabX + tabWidth * 0.1, tabY + tabSizePixels * 0.8);
                tabPath.lineTo(tabX + tabWidth * 0.3, tabY + tabSizePixels);
                tabPath.lineTo(tabX + tabWidth * 0.7, tabY + tabSizePixels);
                tabPath.lineTo(tabX + tabWidth * 0.9, tabY + tabSizePixels * 0.8);
                tabPath.lineTo(tabX + tabWidth, tabY);
                tabPath.closePath();
                
                ctx.fill(tabPath);
                ctx.stroke(tabPath);

                // Número en la pestaña inferior (solo si no hay pestaña derecha)
                if (col >= totalCols - 1) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.font = 'bold 10px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(`${pieceNumber}`, tabX + tabWidth/2, tabY + tabSizePixels * 0.7);
                }

                // Línea punteada para doblar
                ctx.setLineDash([2, 2]);
                ctx.strokeStyle = '#666';
                ctx.beginPath();
                ctx.moveTo(imageArea.x, tabY);
                ctx.lineTo(imageArea.x + imageArea.width, tabY);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Número en esquina solo si no hay pestañas
            if (col >= totalCols - 1 && row >= totalRows - 1) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fillRect(displayWidth - 30, displayHeight - 20, 28, 18);
                ctx.strokeStyle = '#ccc';
                ctx.strokeRect(displayWidth - 30, displayHeight - 20, 28, 18);
                
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`${pieceNumber}`, displayWidth - 16, displayHeight - 8);
            }

            // Bordes principales
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, displayWidth - 2, displayHeight - 2);

            // Líneas de corte en las esquinas
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 1.5;
            const cornerSize = 8;
            
            // Esquinas de corte
            const corners = [
                [0, 0, cornerSize, 0, 0, cornerSize], // Superior izquierda
                [displayWidth, 0, displayWidth - cornerSize, 0, displayWidth, cornerSize], // Superior derecha
                [0, displayHeight, 0, displayHeight - cornerSize, cornerSize, displayHeight], // Inferior izquierda
                [displayWidth, displayHeight, displayWidth - cornerSize, displayHeight, displayWidth, displayHeight - cornerSize] // Inferior derecha
            ];
            
            corners.forEach(([startX, startY, midX1, midY1, midX2, midY2]) => {
                ctx.beginPath();
                ctx.moveTo(midX1, midY1);
                ctx.lineTo(startX, startY);
                ctx.lineTo(midX2, midY2);
                ctx.stroke();
            });

            // Reset text align
            ctx.textAlign = 'left';

            return canvas;
        }

        function downloadPiece(index) {
            const canvas = gridPiecesData[index];
            const link = document.createElement('a');
            link.download = `husbando-pieza-${index + 1}.png`;
            link.href = canvas.toDataURL();
            link.click();
        }

        async function downloadAll() {
            if (gridPiecesData.length === 0) return;

            // Cambiar el botón para mostrar progreso
            const downloadBtn = document.getElementById('downloadAllBtn');
            const originalText = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '⏳ Generando ZIP...';
            downloadBtn.disabled = true;

            try {
                const zip = new JSZip();
                
                // Agregar información del proyecto
                const projectInfo = `Husbando Tamaño Real - Información del Proyecto
==================================================

📏 Configuración utilizada:
- Altura final: ${document.getElementById('heightInput').value} cm
- Tamaño de papel: ${document.getElementById('paperSize').options[document.getElementById('paperSize').selectedIndex].text}
- Margen: ${document.getElementById('marginSize').value} cm
- Tamaño de pestañas: ${document.getElementById('tabSize').value} cm

🧩 Piezas generadas: ${gridPiecesData.length}

📋 Instrucciones de ensamblaje:
1. Imprime todas las piezas en tamaño ORIGINAL (100%, sin escalar)
2. Recorta cada pieza siguiendo las líneas de borde
3. Dobla las pestañas hacia atrás (líneas punteadas)
4. Aplica pegamento en las pestañas
5. Pega las piezas en orden numérico: de izquierda a derecha, de arriba a abajo
6. Presiona firmemente para asegurar las uniones

💡 Consejos:
- Usa papel grueso (180-250 gsm) para mejor resultado
- El pegamento en barra funciona mejor que el líquido
- Las líneas rojas en las esquinas son guías de corte

¡Disfruta tu husbando tamaño real! 🎭
`;
                zip.file("INSTRUCCIONES.txt", projectInfo);

                // Agregar todas las piezas al ZIP
                for (let i = 0; i < gridPiecesData.length; i++) {
                    downloadBtn.innerHTML = `⏳ Procesando ${i + 1}/${gridPiecesData.length}...`;
                    
                    const canvas = gridPiecesData[i];
                    const dataURL = canvas.toDataURL('image/png');
                    const base64Data = dataURL.split(',')[1];
                    
                    // Crear nombre de archivo con ceros a la izquierda para ordenar correctamente
                    const pieceNumber = String(i + 1).padStart(2, '0');
                    zip.file(`Pieza_${pieceNumber}.png`, base64Data, { base64: true });
                    
                    // Pequeña pausa para no bloquear la UI
                    await new Promise(resolve => setTimeout(resolve, 50));
                }

                downloadBtn.innerHTML = '📦 Comprimiendo...';
                
                // Generar el archivo ZIP
                const content = await zip.generateAsync({ 
                    type: "blob",
                    compression: "DEFLATE",
                    compressionOptions: { level: 6 }
                });

                // Crear nombre de archivo con timestamp
                const now = new Date();
                const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
                const filename = `Husbando_${document.getElementById('heightInput').value}cm_${timestamp}.zip`;

                // Descargar el archivo ZIP
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = filename;
                link.click();

                // Limpiar la URL del objeto
                setTimeout(() => URL.revokeObjectURL(link.href), 1000);

                downloadBtn.innerHTML = '✅ ¡Descargado!';
                setTimeout(() => {
                    downloadBtn.innerHTML = originalText;
                    downloadBtn.disabled = false;
                }, 2000);

            } catch (error) {
                console.error('Error al crear el ZIP:', error);
                downloadBtn.innerHTML = '❌ Error';
                setTimeout(() => {
                    downloadBtn.innerHTML = originalText;
                    downloadBtn.disabled = false;
                }, 2000);
            }
        }

        function showAssemblyGuide() {
            document.getElementById('assemblyModal').classList.remove('hidden');
        }

        function hideAssemblyGuide() {
            document.getElementById('assemblyModal').classList.add('hidden');
        }

        // Cerrar modal al hacer clic fuera
        document.getElementById('assemblyModal').addEventListener('click', function(e) {
            if (e.target === this) {
                hideAssemblyGuide();
            }
        });
