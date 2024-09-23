class Country {
    constructor(x, y, productivity = 1, population = 1) {
        this.x = x;
        this.y = y;
        this.productivity = productivity;
        this.population = population;
    }
}

class TradeModel {
    constructor(maxCountries = 5) {
        this.maxCountries = maxCountries;
        this.countries = [];
        this.distanceMatrix = [];
        this.tariffMatrix = [];
    }

    addCountry(x, y) {
        if (this.countries.length < this.maxCountries) {
            const newCountry = new Country(x, y);
            this.countries.push(newCountry);
            this.updateMatrices();
            return newCountry;
        }
        return null;
    }

    removeCountry() {
        if (this.countries.length > 0) {
            this.countries.pop();
            this.updateMatrices();
        }
    }

    updateCountryAttribute(index, attribute, value) {
        if (index >= 0 && index < this.countries.length) {
            this.countries[index][attribute] = value;
            this.updateMatrices();
        }
    }

    updateMatrices() {
        this.calculateDistanceMatrix();
        this.initializeTariffMatrix();
    }

    calculateDistance(country1, country2) {
        if (country1 === country2) {
            return 1; // Within-country distance
        }
        const dx = country1.x - country2.x;
        const dy = country1.y - country2.y;
        return Math.sqrt(dx * dx + dy * dy) / 10; // Scale distance
    }

    calculateDistanceMatrix() {
        this.distanceMatrix = this.countries.map((country1, i) => 
            this.countries.map((country2, j) => this.calculateDistance(country1, country2))
        );
    }

    initializeTariffMatrix() {
        this.tariffMatrix = this.countries.map((_, i) => 
            this.countries.map((_, j) => i === j ? 1 : 1.0)
        );
    }

    updateTariff(i, j, value) {
        if (i !== j && i < this.countries.length && j < this.countries.length) {
            this.tariffMatrix[i][j] = value;
        }
    }

    calculateEquilibriumTradeFlows() {
        const N = this.countries.length;
        if (N < 2) return null; // Not enough countries for trade

        const L_S = this.countries.map(country => country.population);
        const T = this.countries.map(country => country.productivity);
        const d = this.tariffMatrix; // Using tariff matrix as trade costs
        const dist = this.distanceMatrix; // Distance matrix

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
            [w, X, Z] = this.updateTradeFlows(w, L_S, T, d, dist, psi);
        }

        return [w, X, Z];
    }

    updateTradeFlows(w, L_S, T, d, dist, psi) {
        const N = this.countries.length;
        let X = this.calculateTradeFlows(w, L_S, T, d, dist);
        
        let Z = X.map((row, i) => {
            const totalExports = row.reduce((sum, x) => sum + x, 0);
            return (totalExports - w[i] * L_S[i]) / w[i];
        });

        w = w.map((w_i, i) => w_i * (1 + psi * (Z[i] / L_S[i])));
        
        return [w, X, Z];
    }

    calculateTradeFlows(w, L_S, T, d, dist) {
        const theta = 4; // Trade elasticity
        const N = this.countries.length;
        const Xn = w.map((wi, i) => wi * L_S[i]);
        
        let pi = Array(N).fill().map(() => Array(N).fill(0));
        let pi_num = Array(N).fill().map(() => Array(N).fill(0));
        let Phi = Array(N).fill(0);

        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                pi_num[i][j] = T[i] * Math.pow(w[i] * d[i][j], -theta) / dist[i][j];
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

    getDistanceMatrix() {
        return this.distanceMatrix;
    }

    getTariffMatrix() {
        return this.tariffMatrix;
    }
}