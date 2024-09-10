class TradeModelView {
    constructor(canvasId, model) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.model = model;
        this.draggingIndex = -1;
        this.selectedCountryIndex = -1;

        // Arrow drawing parameters
        this.arrowHeadLength = 10;
        this.maxArrowWidth = 10;
        this.minArrowWidth = 1;
        this.curveStrength = 0.2;

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

        if (this.model.countries.length >= 2) {
            const [w, tradeFlows] = this.model.calculateEquilibriumTradeFlows();
            if (tradeFlows) {
                this.drawTradeFlows(tradeFlows);
            }
        }
        
        this.model.countries.forEach((country, index) => this.drawCountry(country, index));
        
        this.updatePointCount();
        this.updatePointSelect();
        this.displayDistanceMatrix();
    }

    drawCountry(country, index) {
        this.ctx.beginPath();
        this.ctx.arc(country.x, country.y, 5, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = 'black';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`${index + 1}`, country.x + 10, country.y + 5);
        
        this.ctx.fillStyle = 'blue';
        this.ctx.fillText(`P: ${country.productivity.toFixed(1)}`, country.x + 10, country.y + 20);
        
        this.ctx.fillStyle = 'green';
        this.ctx.fillText(`L: ${country.population.toFixed(1)}`, country.x + 10, country.y + 35);
        
        this.ctx.fillStyle = 'black';
    }

    drawTradeFlows(tradeFlows) {
        const maxFlow = Math.max(...tradeFlows.flat().filter(flow => !isNaN(flow) && isFinite(flow)));
        
        for (let i = 0; i < this.model.countries.length; i++) {
            for (let j = 0; j < this.model.countries.length; j++) {
                if (i !== j) {
                    const flow = tradeFlows[i][j];
                    if (isNaN(flow) || !isFinite(flow)) continue;
                    const startCountry = this.model.countries[i];
                    const endCountry = this.model.countries[j];
                    const arrowWidth = this.mapFlowToArrowWidth(flow, maxFlow);
                    
                    this.drawCurvedArrow(startCountry, endCountry, arrowWidth);
                }
            }
        }
    }

    mapFlowToArrowWidth(flow, maxFlow) {
        return ((flow / maxFlow) * (this.maxArrowWidth - this.minArrowWidth)) + this.minArrowWidth;
    }

    drawCurvedArrow(start, end, width) {
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const normalX = -dy;
        const normalY = dx;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        const controlX = midX + normalX * this.curveStrength;
        const controlY = midY + normalY * this.curveStrength;
        
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.quadraticCurveTo(controlX, controlY, end.x, end.y);
        this.ctx.lineWidth = width;
        this.ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
        this.ctx.stroke();
        
        const angle = Math.atan2(end.y - controlY, end.x - controlX);
        this.drawArrowHead(end.x, end.y, angle, width);
    }

    drawArrowHead(x, y, angle, width) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(-this.arrowHeadLength, width / 2);
        this.ctx.lineTo(-this.arrowHeadLength, -width / 2);
        this.ctx.closePath();
        this.ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
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
                            this.redraw(); // Redraw after tariff update
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
}
