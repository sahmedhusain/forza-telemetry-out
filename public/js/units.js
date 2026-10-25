/**
 * Forza Telemetry Out - Unit Conversion Manager
 */

class UnitManager {
  constructor(defaultSystem = 'metric') {
    this.system = defaultSystem; // 'metric' | 'imperial'
  }

  setSystem(system) {
    if (system === 'metric' || system === 'imperial') {
      this.system = system;
    }
  }

  toggle() {
    this.system = this.system === 'metric' ? 'imperial' : 'metric';
    return this.system;
  }

  formatSpeed(speedObj) {
    if (!speedObj) return { value: '0', unit: this.system === 'metric' ? 'KM/H' : 'MPH' };
    const val = this.system === 'metric' ? speedObj.kmh : speedObj.mph;
    return {
      value: Math.round(val),
      unit: this.system === 'metric' ? 'KM/H' : 'MPH'
    };
  }

  formatTemp(tempCelsius, tempFahrenheit) {
    if (this.system === 'metric') {
      return {
        value: Math.round(tempCelsius),
        unit: '°C'
      };
    } else {
      return {
        value: Math.round(tempFahrenheit),
        unit: '°F'
      };
    }
  }

  formatPower(powertrain) {
    if (!powertrain) return { power: '0', powerUnit: 'HP', torque: '0', torqueUnit: 'NM' };
    if (this.system === 'metric') {
      return {
        power: Math.round(powertrain.powerKw || 0),
        powerUnit: 'KW',
        torque: Math.round(powertrain.torqueNm || 0),
        torqueUnit: 'NM'
      };
    } else {
      return {
        power: Math.round(powertrain.powerHp || 0),
        powerUnit: 'HP',
        torque: Math.round(powertrain.torqueFtLb || 0),
        torqueUnit: 'LB-FT'
      };
    }
  }

  formatBoost(powertrain) {
    if (!powertrain) return { value: '0.0', unit: 'BAR' };
    if (this.system === 'metric') {
      return {
        value: (powertrain.boostBar || 0).toFixed(2),
        unit: 'BAR'
      };
    } else {
      return {
        value: (powertrain.boostPsi || 0).toFixed(1),
        unit: 'PSI'
      };
    }
  }
}

window.UnitManager = UnitManager;
