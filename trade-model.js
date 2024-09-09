// Country class to represent each point on the canvas
class Country {
    constructor(x, y, productivity = 1, population = 1) {
        this.x = x;
        this.y = y;
        this.productivity = productivity;
        this.population = population;
    }

    draw(ctx, index) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        ctx.fillText(`${index + 1}`, this.x + 10, this.y + 5);
        
        ctx.fillStyle = 'blue';
        ctx.fillText(`P: ${this.productivity.toFixed(1)}`, this.x + 10, this.y + 20);
        
        ctx.fillStyle = 'green';
        ctx.fillText(`L: ${this.population.toFixed(1)}`, this.x + 10, this.y + 35);
        
        ctx.fillStyle = 'black';
    }
}

// EquilibriumCalculator class to handle distance and tariff calculations
class EquilibriumCalculator {
    constructor(countries) {
        this.countries = countries;
        this.distanceMatrix = [];
        this.tariffMatrix = [];
        this.calculateDistanceMatrix();
        this.initializeTariffMatrix();
    }

    calculateEquilibriumTradeFlows() {
        const N = this.countries.length;
        const L_S = this.countries.map(country => country.population);
        const T = this.countries.map(country => country.productivity);
        const d = this.tariffMatrix; // Using tariff matrix as trade costs

        // Initialize trade flows
        let X = Array(N).fill().map(() => Array(N).fill(1));
        let wGDP = X.reduce((acc, row) => acc + row.reduce((a, b) => a + b, 0), 0);
        X = X.map(row => row.map(x => x / wGDP)); // Normalize initial trade flows

        // Set convergence parameters
        const tol = 0.0001;
        const psi = 0.1;
        const maxIter = 500;

        // Solve for equilibrium trade flows
        let iter = 0;
        let w = Array(N).fill(1);
        let Z = Array(N).fill(1);

        while (Math.max(...Z.flat().map(Math.abs)) > tol && iter < maxIter) {
            iter++;
            [w, X, Z] = this.updateTradeFlows(w, L_S, T, d, psi);
        }

        return [w,X,Z];
    }

    updateTradeFlows(w, L_S, T, d, psi) {
        const N = this.countries.length;
        let X = this.calculateTradeFlows(w, L_S, T, d);
        
        let Z = X.map((row, i) => {
            // Sum up all trade flows from country i
            const totalExports = row.reduce((sum, x) => sum + x, 0);
            // Calculate excess labor demand
            return (totalExports - w[i] * L_S[i]) / w[i];
        });
        console.log(Z)

        w = w.map((w_i, i) => w_i * (1 + psi * (Z[i] / L_S[i])));
        // Normalize to ensure total world trade remains constant
        // let wGDP = X.reduce((acc, row) => acc + row.reduce((a, b) => a + b, 0), 0);
        
        return [w, X, Z];
    }

    calculateTradeFlows(w, L_S, T, d) {
        const theta = 4;
        const N = this.countries.length;
        const Xn = w.map((wi, i) => wi * L_S[i]);
        
        let pi = Array(N).fill().map(() => Array(N).fill(0));
        let pi_num = Array(N).fill().map(() => Array(N).fill(0));
        let Phi = Array(N).fill(0);

        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                pi_num[i][j] = T[i] * Math.pow(w[i] * d[i][j], -theta);
                Phi[j] += pi_num[i][j];
            }
        }

        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                pi[i][j] = pi_num[i][j] / Phi[j];
            }
        }

        let X = Array(N).fill().map(() => Array(N).fill(0));
        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                X[i][j] = pi[i][j] * Xn[j];
            }
        }

        return X;
    }

    calculateDistance(country1, country2) {
        if (country1 === country2) {
            return 0.1; // Within distance set to 0.1
        }
        const dx = country1.x - country2.x;
        const dy = country1.y - country2.y;
        return Math.sqrt(dx * dx + dy * dy) / 10; // Scale distance by 1/10
    }

    calculateDistanceMatrix() {
        this.distanceMatrix = this.countries.map((country1, i) => 
            this.countries.map((country2, j) => this.calculateDistance(country1, country2))
        );
    }

    initializeTariffMatrix() {
        this.tariffMatrix = this.countries.map((_, i) => 
            this.countries.map((_, j) => i === j ? 1 : 1.5)
        );
    }

    getDistanceMatrix() {
        return this.distanceMatrix;
    }

    getTariffMatrix() {
        return this.tariffMatrix;
    }

    updateCountries(newCountries) {
        this.countries = newCountries;
        this.calculateDistanceMatrix();
        this.initializeTariffMatrix();
    }

    updateTariff(i, j, value) {
        if (i !== j) {
            this.tariffMatrix[i][j] = value;
        }
    }
}

// TradeModel class to manage the overall simulation
class TradeModel {
    constructor(canvasId, maxCountries = 5) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.maxCountries = maxCountries;
        this.countries = [];
        this.draggingIndex = -1;
        this.selectedCountryIndex = -1;

        this.arrowHeadLength = 10;
        this.maxArrowWidth = 10;
        this.minArrowWidth = 1;
        this.curveStrength = 0.2;

        this.equilibriumCalculator = new EquilibriumCalculator([]);

        this.setupEventListeners();
        this.setupUI();

        // Add an initial country
        this.addRandomCountry();
    }

    addRandomCountry() {
        if (this.countries.length < this.maxCountries) {
            const padding = 50; // To avoid placing countries too close to the edges
            const x = Math.random() * (this.canvas.width - 2 * padding) + padding;
            const y = Math.random() * (this.canvas.height - 2 * padding) + padding;
            return this.addCountry(x, y);
        }
        return null;
    }

    addCountry(x, y) {
        if (this.countries.length < this.maxCountries) {
            const newCountry = new Country(x, y);
            this.countries.push(newCountry);
            this.updateEquilibriumCalculator();
            this.redraw();
            return newCountry;
        }
        return null;
    }

    removeCountry() {
        if (this.countries.length > 0) {
            this.countries.pop();
            this.updateEquilibriumCalculator();
            this.redraw();
        }
    }

    calculateEquilibriumFlows() {
        return this.equilibriumCalculator.calculateEquilibriumTradeFlows();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', () => this.draggingIndex = -1);
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

        this.addButton.addEventListener('click', () => this.addRandomCountry());
        this.removeButton.addEventListener('click', () => this.removeCountry());
        this.pointSelect.addEventListener('change', () => {
            this.selectedCountryIndex = parseInt(this.pointSelect.value);
            this.updateSliders();
        });
        this.productivitySlider.addEventListener('input', () => this.updateCountryAttribute('productivity'));
        this.populationSlider.addEventListener('input', () => this.updateCountryAttribute('population'));
    }

    handleMouseDown(event) {
        const pos = this.getMousePos(event);
        this.draggingIndex = this.findClosestCountry(pos.x, pos.y);
        if (this.draggingIndex === -1 && this.countries.length < this.maxCountries) {
            this.addCountry(pos.x, pos.y);
        }
    }

    handleMouseMove(event) {
        if (this.draggingIndex !== -1) {
            const pos = this.getMousePos(event);
            this.countries[this.draggingIndex].x = pos.x;
            this.countries[this.draggingIndex].y = pos.y;
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
        for (let i = 0; i < this.countries.length; i++) {
            const dx = this.countries[i].x - x;
            const dy = this.countries[i].y - y;
            if (Math.sqrt(dx*dx + dy*dy) < threshold) {
                return i;
            }
        }
        return -1;
    }

    addRandomCountry() {
        if (this.countries.length < this.maxCountries) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            this.addCountry(x, y);
        }
    }

    addCountry(x, y) {
        this.countries.push(new Country(x, y));
        this.redraw();
    }

    removeCountry() {
        if (this.countries.length > 0) {
            this.countries.pop();
            this.redraw();
        }
    }

    updateCountryAttribute(attribute) {
        if (this.selectedCountryIndex !== -1) {
            const value = parseFloat(this[`${attribute}Slider`].value);
            this.countries[this.selectedCountryIndex][attribute] = value;
            this[`${attribute}Value`].textContent = value.toFixed(1);
            this.redraw();
        }
    }

    updatePointCount() {
        this.pointCountDisplay.textContent = `Points: ${this.countries.length}/${this.maxCountries}`;
        this.addButton.disabled = this.countries.length >= this.maxCountries;
    }

    updatePointSelect() {
        const currentSelection = this.pointSelect.value;
        this.pointSelect.innerHTML = '';
        this.countries.forEach((_, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `Country ${index + 1}`;
            this.pointSelect.appendChild(option);
        });
        if (currentSelection !== '' && currentSelection < this.countries.length) {
            this.pointSelect.value = currentSelection;
            this.selectedCountryIndex = parseInt(currentSelection);
        } else if (this.countries.length > 0) {
            this.pointSelect.value = '0';
            this.selectedCountryIndex = 0;
        } else {
            this.selectedCountryIndex = -1;
        }
        this.updateSliders();
    }

    updateSliders() {
        if (this.selectedCountryIndex !== -1 && this.countries[this.selectedCountryIndex]) {
            const country = this.countries[this.selectedCountryIndex];
            this.productivitySlider.value = country.productivity;
            this.populationSlider.value = country.population;
            this.productivityValue.textContent = country.productivity.toFixed(1);
            this.populationValue.textContent = country.population.toFixed(1);
        }
    }

    redraw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.updateEquilibriumCalculator();

        // Calculate and draw trade flows only if there are at least two countries
        if (this.countries.length >= 2) {
            const tradeFlows = this.calculateEquilibriumFlows();
            if (tradeFlows) {
                this.drawTradeFlows(tradeFlows);
            }
        }
        
        // Draw countries
        this.countries.forEach((country, index) => country.draw(this.ctx, index));
        
        this.updatePointCount();
        this.updatePointSelect();
    }

    updateEquilibriumCalculator() {
        this.equilibriumCalculator.updateCountries(this.countries);
        this.displayDistanceMatrix();
    }

    calculateEquilibriumFlows() {
        const [w, X, Z] = this.equilibriumCalculator.calculateEquilibriumTradeFlows();
        return X; // Return the trade flow matrix
    }

    drawTradeFlows(tradeFlows) {
        if (!tradeFlows || tradeFlows.length < 2) {
            return; // Not enough countries for trade flows
        }

        const maxFlow = Math.max(...tradeFlows.flat().filter(flow => !isNaN(flow) && isFinite(flow)));
        
        for (let i = 0; i < this.countries.length; i++) {
            for (let j = 0; j < this.countries.length; j++) {
                if (i !== j) {
                    const flow = tradeFlows[i][j];
                    if (isNaN(flow) || !isFinite(flow)) continue; // Skip invalid flows
                    const startCountry = this.countries[i];
                    const endCountry = this.countries[j];
                    const arrowWidth = this.mapFlowToArrowWidth(flow, maxFlow);
                    
                    this.drawCurvedArrow(startCountry, endCountry, arrowWidth);
                }
            }
        }
    }

    calculateEquilibriumFlows() {
        if (this.countries.length < 2) {
            return null; // Not enough countries for trade flows
        }
        const [w, X, Z] = this.equilibriumCalculator.calculateEquilibriumTradeFlows();
        return X; // Return the trade flow matrix
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
        this.ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)'; // Semi-transparent blue
        this.ctx.stroke();
        
        // Draw arrow head
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
        this.ctx.fillStyle = 'rgba(0, 0, 255, 0.5)'; // Semi-transparent blue
        this.ctx.fill();
        this.ctx.restore();
    }

    displayDistanceMatrix() {
        const distanceMatrix = this.equilibriumCalculator.getDistanceMatrix();
        const tariffMatrix = this.equilibriumCalculator.getTariffMatrix();
        const matrixElement = document.getElementById('distanceMatrix');
        matrixElement.innerHTML = '<h3>Distance and Tariff Matrix:</h3>';
        const table = document.createElement('table');
        
        // Add header row
        const headerRow = document.createElement('tr');
        headerRow.appendChild(document.createElement('th')); // Empty corner cell
        this.countries.forEach((_, index) => {
            const th = document.createElement('th');
            th.textContent = `Country ${index + 1}`;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        // Add data rows
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
                            this.equilibriumCalculator.updateTariff(i, j, newTariff);
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

let globalTradeModel; // Declare this at the top of your script, outside any functions

document.addEventListener('DOMContentLoaded', () => {
    globalTradeModel = new TradeModel('tradeCanvas');
    globalTradeModel.redraw();
    console.log("TradeModel created and assigned to globalTradeModel");
});