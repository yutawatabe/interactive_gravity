class TradeModelView {
    constructor(canvasId, model) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.model = model;
        this.draggingIndex = -1;
        this.selectedCountryIndex = -1;

        // Arrow drawing parameters
        this.arrowHeadLength = 20;
        this.maxArrowWidth = 50;
        this.minArrowWidth = 0.5;
        this.curveStrength = 0.2;
        this.arrowWidthExponent = 0.5;

        // Color interpolation parameters
        this.lowColor = [0, 0, 255];    // Blue RGB
        this.midColor = [128, 0, 128];  // Purple RGB
        this.highColor = [255, 0, 0];   // Red RGB

        // Dot size parameters
        this.minDotRadius = 5;
        this.maxDotRadius = 20;

        this.setupEventListeners();
        this.setupUI();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', () => {
            this.draggingIndex = -1;
            this.redraw(); // Redraw after dragging ends
        });
    }

    setupUI() {
        this.addButton = document.getElementById('addButton');
        this.removeButton = document.getElementById('removeButton');
        this.pointCountDisplay = document.getElementById('pointCount');
        this.pointSelect = document.getElementById('pointSelect');
        this.productivitySlider = document.getElementById('productivitySlider');
        this.populationSlider = document.getElementById('populationSlider');
        this.productivityValue = document.getElementById('productivityValue');
        this.populationValue = document.getElementById('populationValue');

        this.addButton.addEventListener('click', () => {
            this.addRandomCountry();
            this.redraw();
        });
        this.removeButton.addEventListener('click', () => {
            this.removeCountry();
            this.redraw();
        });
        this.pointSelect.addEventListener('change', () => {
            this.selectedCountryIndex = parseInt(this.pointSelect.value);
            this.updateSliders();
        });
        this.productivitySlider.addEventListener('input', () => {
            this.updateCountryAttribute('productivity');
            this.redraw();
        });
        this.populationSlider.addEventListener('input', () => {
            this.updateCountryAttribute('population');
            this.redraw();
        });    
    }

    handleMouseDown(event) {
        const pos = this.getMousePos(event);
        this.draggingIndex = this.findClosestCountry(pos.x, pos.y);
        if (this.draggingIndex === -1 && this.model.countries.length < this.model.maxCountries) {
            this.model.addCountry(pos.x, pos.y);
            this.redraw();
        }
    }

    handleMouseMove(event) {
        if (this.draggingIndex !== -1) {
            const pos = this.getMousePos(event);
            this.model.countries[this.draggingIndex].x = pos.x;
            this.model.countries[this.draggingIndex].y = pos.y;
            this.model.updateMatrices();
            this.redraw();
        }
    }

    getMousePos(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    findClosestCountry(x, y) {
        const threshold = 10; // Distance in pixels
        for (let i = 0; i < this.model.countries.length; i++) {
            const country = this.model.countries[i];
            const dx = country.x - x;
            const dy = country.y - y;
            if (Math.sqrt(dx*dx + dy*dy) < threshold) {
                return i;
            }
        }
        return -1;
    }

    addRandomCountry() {
        const padding = 50;
        const x = Math.random() * (this.canvas.width - 2 * padding) + padding;
        const y = Math.random() * (this.canvas.height - 2 * padding) + padding;
        this.model.addCountry(x, y);
        this.redraw();
    }

    removeCountry() {
        this.model.removeCountry();
        this.redraw();
    }

    updateCountryAttribute(attribute) {
        if (this.selectedCountryIndex !== -1) {
            const value = parseFloat(this[`${attribute}Slider`].value);
            this.model.updateCountryAttribute(this.selectedCountryIndex, attribute, value);
            this[`${attribute}Value`].textContent = value.toFixed(1);
            this.redraw();
        }
    }

    redraw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const [w, tradeFlows] = this.model.calculateEquilibriumTradeFlows();
        this.drawTradeFlows(tradeFlows);
        this.displayTradeMatrix(tradeFlows);
        
        this.model.countries.forEach((country, index) => this.drawCountry(country, index));
        
        this.updatePointCount();
        this.updatePointSelect();
        this.displayDistanceMatrix();
    }


    drawCountry(country, index, radius, Xn) {
        this.ctx.beginPath();
        this.ctx.arc(country.x, country.y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(200, 200, 200, 0.8)'; // Light gray with some transparency
        this.ctx.fill();
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        this.ctx.fillStyle = 'black';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`${index + 1}`, country.x, country.y);
        
        this.ctx.fillStyle = 'blue';
        this.ctx.fillText(`P: ${country.productivity.toFixed(1)}`, country.x, country.y + radius + 15);
        
        this.ctx.fillStyle = 'green';
        this.ctx.fillText(`L: ${country.population.toFixed(1)}`, country.x, country.y + radius + 30);

        this.ctx.fillStyle = 'red';
        this.ctx.fillText(`GDP share: ${(Xn * 100).toFixed(1)}%`, country.x, country.y + radius + 45);
    }

    drawTradeFlows(tradeFlows) {
        const allFlows = tradeFlows.flat().filter(flow => !isNaN(flow) && isFinite(flow) && flow > 0);
        const maxFlow = Math.max(...allFlows, 0.000001); // Ensure a non-zero max flow
        const minFlow = Math.min(...allFlows, 0);
        console.log(`Max flow: ${maxFlow}, Min flow: ${minFlow}`); // Debugging line

        // Calculate Xn (economic size) for each country
        const Xn = this.calculateEconomicSizes(tradeFlows);
        const totalXn = Xn.reduce((sum, x) => sum + x, 0);
        
        console.log(`Economic sizes:`, Xn); // Debugging line

        // Draw trade flows
        for (let i = 0; i < this.model.countries.length; i++) {
            for (let j = 0; j < this.model.countries.length; j++) {
                if (i !== j) {
                    const flow = tradeFlows[i][j];
                    if (isNaN(flow) || !isFinite(flow) || flow <= 0) continue;
                    const startCountry = this.model.countries[i];
                    const endCountry = this.model.countries[j];
                    const arrowWidth = this.mapFlowToArrowWidth(flow, maxFlow);
                    const color = this.getColorForFlow(flow, minFlow, maxFlow);
                    
                    this.drawCurvedArrow(startCountry, endCountry, arrowWidth, flow, color);
                }
            }
        }

        // Draw countries after drawing all arrows
        this.model.countries.forEach((country, index) => {
            const dotRadius = this.mapXnToDotRadius(Xn[index], totalXn);
            this.drawCountry(country, index, dotRadius, Xn[index]);
        });
    }

    getColorForFlow(flow, minFlow, maxFlow) {
        // Use a linear scale instead of logarithmic
        let t = (flow - minFlow) / (maxFlow - minFlow);
        
        // Ensure t is between 0 and 1
        t = Math.max(0, Math.min(1, t));

        let r, g, b;
        if (t < 0.5) {
            // Interpolate between low color and mid color
            const u = t * 2;
            r = Math.round(this.lowColor[0] + u * (this.midColor[0] - this.lowColor[0]));
            g = Math.round(this.lowColor[1] + u * (this.midColor[1] - this.lowColor[1]));
            b = Math.round(this.lowColor[2] + u * (this.midColor[2] - this.lowColor[2]));
        } else {
            // Interpolate between mid color and high color
            const u = (t - 0.5) * 2;
            r = Math.round(this.midColor[0] + u * (this.highColor[0] - this.midColor[0]));
            g = Math.round(this.midColor[1] + u * (this.highColor[1] - this.midColor[1]));
            b = Math.round(this.midColor[2] + u * (this.highColor[2] - this.midColor[2]));
        }
        
        console.log(`Flow: ${flow}, t: ${t}, Color: rgb(${r}, ${g}, ${b})`); // Debugging line
        return `rgb(${r}, ${g}, ${b})`;
    }

    calculateEconomicSizes(tradeFlows) {
        const n = this.model.countries.length;
        let Xn = new Array(n).fill(0);

        if (n === 1) {
            // For a single country, use its productivity and population
            Xn[0] = this.model.countries[0].productivity * this.model.countries[0].population;
        } else {
            // Calculate total exports and imports for each country
            for (let i = 0; i < n; i++) {
                const totalExports = tradeFlows[i].reduce((sum, flow) => sum + flow, 0);
                const totalImports = tradeFlows.reduce((sum, row) => sum + row[i], 0);
                Xn[i] = totalExports + totalImports;
            }

            // If all Xn are zero, fall back to productivity * population
            if (Xn.every(x => x === 0)) {
                Xn = this.model.countries.map(country => country.productivity * country.population);
            }
        }

        // Normalize Xn values
        const totalXn = Xn.reduce((sum, x) => sum + x, 0);
        return Xn.map(x => x / totalXn);
    }

    mapXnToDotRadius(Xn, totalXn) {
        // Map Xn to a radius between minDotRadius and maxDotRadius
        // The square root is used to make the area of the dot proportional to Xn
        const t = Math.sqrt(Xn / totalXn);
        return this.minDotRadius + t * (this.maxDotRadius - this.minDotRadius);
    }

    mapFlowToArrowWidth(flow, maxFlow) {
        // Apply non-linear scaling
        const normalizedFlow = Math.pow(flow / maxFlow, this.arrowWidthExponent);
        return ((normalizedFlow) * (this.maxArrowWidth - this.minArrowWidth)) + this.minArrowWidth;
    }

    drawCurvedArrow(start, end, width, tradeValue, color) {
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const normalX = -dy;
        const normalY = dx;
        
        const controlX = midX + normalX * this.curveStrength;
        const controlY = midY + normalY * this.curveStrength;
        
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.quadraticCurveTo(controlX, controlY, end.x, end.y);
        this.ctx.lineWidth = width;
        this.ctx.strokeStyle = color;
        this.ctx.stroke();
        
        const angle = Math.atan2(end.y - controlY, end.x - controlX);
        this.drawArrowHead(end.x, end.y, angle, width, color);

        const labelX = midX + normalX * this.curveStrength * 1.2;
        const labelY = midY + normalY * this.curveStrength * 1.2;
        
        this.ctx.save();
        this.ctx.translate(labelX, labelY);
        this.ctx.rotate(Math.atan2(dy, dx));
        
        this.ctx.fillStyle = 'black';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText((tradeValue * 100).toFixed(2), 0, -5);
        
        this.ctx.restore();
    }

    drawArrowHead(x, y, angle, width, color) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(-this.arrowHeadLength, width / 2);
        this.ctx.lineTo(-this.arrowHeadLength, -width / 2);
        this.ctx.closePath();
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.restore();
    }

    updatePointCount() {
        this.pointCountDisplay.textContent = `Points: ${this.model.countries.length}/${this.model.maxCountries}`;
        this.addButton.disabled = this.model.countries.length >= this.model.maxCountries;
    }

    updatePointSelect() {
        const currentSelection = this.pointSelect.value;
        this.pointSelect.innerHTML = '';
        this.model.countries.forEach((_, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `Country ${index + 1}`;
            this.pointSelect.appendChild(option);
        });
        if (currentSelection !== '' && currentSelection < this.model.countries.length) {
            this.pointSelect.value = currentSelection;
            this.selectedCountryIndex = parseInt(currentSelection);
        } else if (this.model.countries.length > 0) {
            this.pointSelect.value = '0';
            this.selectedCountryIndex = 0;
        } else {
            this.selectedCountryIndex = -1;
        }
        this.updateSliders();
    }

    updateSliders() {
        if (this.selectedCountryIndex !== -1 && this.model.countries[this.selectedCountryIndex]) {
            const country = this.model.countries[this.selectedCountryIndex];
            this.productivitySlider.value = country.productivity;
            this.populationSlider.value = country.population;
            this.productivityValue.textContent = country.productivity.toFixed(1);
            this.populationValue.textContent = country.population.toFixed(1);
        }
    }

    displayDistanceMatrix() {
        const distanceMatrix = this.model.getDistanceMatrix();
        const tariffMatrix = this.model.getTariffMatrix();
        const matrixElement = document.getElementById('distanceMatrix');
        matrixElement.innerHTML = '<h3>Distance and Tariff Matrix:</h3>';
        const table = document.createElement('table');
        
        // Add header row
        const headerRow = document.createElement('tr');
        headerRow.appendChild(document.createElement('th'));
        this.model.countries.forEach((_, index) => {
            const th = document.createElement('th');
            th.textContent = `Country ${index + 1}`;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        distanceMatrix.forEach((row, i) => {
            const tr = document.createElement('tr');
            const th = document.createElement('th');
            th.textContent = `Country ${i + 1}`;
            tr.appendChild(th);
            
            row.forEach((distance, j) => {
                const td = document.createElement('td');
                td.innerHTML = `D: ${distance.toFixed(2)}<br>T: <input type="number" min="1" step="0.1" value="${tariffMatrix[i][j].toFixed(1)}" ${i === j ? 'disabled' : ''}>`;
                if (i !== j) {
                    td.querySelector('input').addEventListener('change', (event) => {
                        const newTariff = parseFloat(event.target.value);
                        if (!isNaN(newTariff) && newTariff >= 1) {
                            this.model.updateTariff(i, j, newTariff);
                            this.redraw();
                        } else {
                            event.target.value = tariffMatrix[i][j].toFixed(1);
                        }
                    });
                }
                tr.appendChild(td);
            });
            table.appendChild(tr);
        });
        
        matrixElement.appendChild(table);
    }

    displayTradeMatrix(tradeFlows) {
        const matrixElement = document.getElementById('tradeMatrix');
        matrixElement.innerHTML = '<h3>Trade Flow Matrix:</h3>';
        const table = document.createElement('table');
        
        // Add header row
        const headerRow = document.createElement('tr');
        headerRow.appendChild(document.createElement('th'));
        this.model.countries.forEach((_, index) => {
            const th = document.createElement('th');
            th.textContent = `Country ${index + 1}`;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        tradeFlows.forEach((row, i) => {
            const tr = document.createElement('tr');
            const th = document.createElement('th');
            th.textContent = `Country ${i + 1}`;
            tr.appendChild(th);
            
            row.forEach((flow, j) => {
                const td = document.createElement('td');
                td.textContent = (flow * 100).toFixed(2);
                tr.appendChild(td);
            });
            table.appendChild(tr);
        });
        
        matrixElement.appendChild(table);
    }
}
