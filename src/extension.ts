import GLib from 'gi://GLib'
import Gio from 'gi://Gio'
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
    this._settings = this.getSettings()

    this._clock = new Clock(this._settings)
    this._cpu = new Cpu(this._settings)
    this._netSpeed = new NetSpeed(this._settings)
    this._ram = new Ram(this._settings)

    this._layoutManager = Main.layoutManager as typeof this._layoutManager
    this._layoutManager._backgroundGroup.add_child(this._calendar)
    this._layoutManager._backgroundGroup.add_child(this._clock)
    this._layoutManager._backgroundGroup.add_child(this._cpu)
    this._layoutManager._backgroundGroup.add_child(this._netSpeed)
    this._layoutManager._backgroundGroup.add_child(this._ram)

    this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
      this._calendar.update()
      this._clock.update()
      this._cpu.update()
      this._netSpeed.update()
      this._ram.update()
      return GLib.SOURCE_CONTINUE
    })
  }

  disable(): void {
    if (this._timeoutId) {
      GLib.Source.remove(this._timeoutId)
      this._timeoutId = null
    }

    this._layoutManager._backgroundGroup.remove_child(this._calendar)
    this._layoutManager._backgroundGroup.remove_child(this._clock)
    this._layoutManager._backgroundGroup.remove_child(this._cpu)
    this._layoutManager._backgroundGroup.remove_child(this._netSpeed)
    this._layoutManager._backgroundGroup.remove_child(this._ram)

    this._calendar = null as any
    this._clock = null as any
    this._cpu = null as any
    this._netSpeed = null as any
    this._ram = null as any
  }
}
