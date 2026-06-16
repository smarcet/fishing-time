class InertObject extends EnemyWithAnimation {
  getFightSpec() {
    return null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { InertObject };
}
