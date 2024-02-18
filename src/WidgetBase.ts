import GLib from 'gi://GLib'
import GObject from 'gi://GObject'
import Gio from 'gi://Gio'
import Mtk from 'gi://Mtk'
import St from 'gi://St'

import * as Main from 'resource:///org/gnome/shell/ui/main.js'

import getSettingPairNumbers from './getSettingPairNumbers.js'

@GObject.registerClass
export abstract class WidgetBase extends St.BoxLayout {
  protected abstract readonly LOCATION_SETTING_KEY: string
  protected _settings: Gio.Settings
  private _ignorePositionUpdate: boolean

  private _getMetaRectForCoords(x: number, y: number): Mtk.Rectangle {
    this.get_allocation_box()
    const [width, height] = this.get_transformed_size()
    return new Mtk.Rectangle(x, y, width, height)
  }

  private _getWorkAreaForRect(rect: Mtk.Rectangle): Mtk.Rectangle {
    let monitorIndex = global.display.get_monitor_index_for_rect(rect)
    return Main.layoutManager.getWorkAreaForMonitor(monitorIndex)
  }

  private _isOnScreen(x: number, y: number): boolean {
    let rect = this._getMetaRectForCoords(x, y)
    let monitorWorkArea = this._getWorkAreaForRect(rect)

    return monitorWorkArea.contains_rect(rect)
  }

  private _keepOnScreen(x: number, y: number): [number, number] {
    let rect = this._getMetaRectForCoords(x, y)
    let monitorWorkArea = this._getWorkAreaForRect(rect)

    let monitorRight = monitorWorkArea.x + monitorWorkArea.width
    let monitorBottom = monitorWorkArea.y + monitorWorkArea.height

    x = Math.min(Math.max(monitorWorkArea.x, x), monitorRight - rect.width)
    y = Math.min(Math.max(monitorWorkArea.y, y), monitorBottom - rect.height)

    return [x, y]
  }

  protected setPosition(): void {
    if (this._ignorePositionUpdate) {
      return
    }

    let [x, y] = getSettingPairNumbers(this._settings, this.LOCATION_SETTING_KEY)
    this.set_position(x, y)

    if (!this.get_parent()) {
      return
    }

    if (!this._isOnScreen(x, y)) {
      ;[x, y] = this._keepOnScreen(x, y)

      // this.ease({
      //   x,
      //   y,
      //   duration: 150,
      //   mode: Clutter.AnimationMode.EASE_OUT_QUAD,
      // })

      this._ignorePositionUpdate = true
      this._settings.set_value(this.LOCATION_SETTING_KEY, new GLib.Variant('(ii)', [x, y]))
      this._ignorePositionUpdate = false
    }
  }
}

export default WidgetBase
