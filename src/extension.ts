import GLib from 'gi://GLib'
import type Gio from 'gi://Gio'
import type Meta from 'gi://Meta'

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js'
import Main from 'resource:///org/gnome/shell/ui/main.js'

import Calendar from './Calendar.js'
import Clock from './Clock.js'
import Cpu from './Cpu.js'
import NetSpeed from './NetSpeed.js'
import Ram from './Ram.js'

export default class CircularWidgetExtension extends Extension {
  private _calendar: Calendar
  private _clock: Clock
  private _cpu: Cpu
  private _netSpeed: NetSpeed
  private _ram: Ram
  private _settings: Gio.Settings
  private _timeoutId: number | null
  private _layoutManager: typeof Main.layoutManager & {
    _backgroundGroup: Meta.BackgroundGroup // force access to protected member
  }

  enable(): void {
    const settings = this._settings = this.getSettings()

    const calendar = this._calendar = new Calendar(settings)
    const clock = this._clock = new Clock(settings)
    const cpu = this._cpu = new Cpu(settings)
    const netSpeed = this._netSpeed = new NetSpeed(settings)
    const ram = this._ram = new Ram(settings)

    const layoutManager = this._layoutManager = Main.layoutManager as typeof this._layoutManager
    layoutManager._backgroundGroup.add_child(calendar)
    layoutManager._backgroundGroup.add_child(clock)
    layoutManager._backgroundGroup.add_child(cpu)
    layoutManager._backgroundGroup.add_child(netSpeed)
    layoutManager._backgroundGroup.add_child(ram)

    this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
      calendar.update()
      clock.update()
      cpu.update()
      netSpeed.update()
      ram.update()
      return GLib.SOURCE_CONTINUE
    })
  }

  disable(): void {
    this._settings = null as any

    if (this._timeoutId) {
      GLib.Source.remove(this._timeoutId)
      this._timeoutId = null
    }

    this._layoutManager._backgroundGroup.remove_child(this._calendar)
    this._layoutManager._backgroundGroup.remove_child(this._clock)
    this._layoutManager._backgroundGroup.remove_child(this._cpu)
    this._layoutManager._backgroundGroup.remove_child(this._netSpeed)
    this._layoutManager._backgroundGroup.remove_child(this._ram)
    this._layoutManager = null as any

    this._calendar = null as any
    this._clock = null as any
    this._cpu = null as any
    this._netSpeed = null as any
    this._ram = null as any
  }
}
