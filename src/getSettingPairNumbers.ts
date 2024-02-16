import type Gio from 'gi://Gio'

export function getSettingPairNumbers(settings: Gio.Settings, key: string): [number, number] {
  const value = settings.get_value(key).deepUnpack()
  if (!Array.isArray(value)) {
    throw new TypeError(`Value of key ${key} is not an array: ${value}`)
  }
  if (value.length < 2) {
    throw new TypeError(`Value of key ${key} does not have enough items`)
  }
  const [x, y] = value
  if (typeof x !== 'number') {
    throw new TypeError(`${key}[0] is not a number: ${x}`)
  }
  if (typeof y !== 'number') {
    throw new TypeError(`${key}[1] is not a number: ${y}`)
  }
  return [x, y]
}

export default getSettingPairNumbers
