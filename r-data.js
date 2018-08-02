class RData {
  constructor(initialValues) {
    Object.defineProperty(this, '_values', {value: {}})
    Object.defineProperty(this, '_handlers', {value: {}})
    if (!initialValues) return
    for (const key in initialValues) {
      if (initialValues.hasOwnProperty(key)) {
        const value = initialValues[key]
        this.register(key, value)
      }
    }
  }
  register(name, initialValue) {
    this._values[name] = initialValue
    this._handlers[name] = []
    Object.defineProperty(this, name, {
      enumerable: true,
      get: () => this._values[name],
      set: (newVal) => {
        const oldVal = this._values[name]
        if (oldVal === newVal) return
        this._values[name] = newVal
        this._handlers[name].forEach(handler => handler(newVal, oldVal))
      },
    })
  }
  onChange(name, handler) {
    this._handlers[name].push(handler)
  }
}
