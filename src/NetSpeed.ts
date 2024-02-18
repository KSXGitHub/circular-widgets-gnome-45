import GLib from 'gi://GLib'
import GObject from 'gi://GObject'
import Gdk from 'gi://Gdk'
import Gio from 'gi://Gio'
import Mtk from 'gi://Mtk'
import Pango from 'gi://Pango'
import PangoCairo from 'gi://PangoCairo'
import St from 'gi://St'
import Cairo from 'gi://cairo'

import DND from 'resource:///org/gnome/shell/ui/dnd.js'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'

import getSettingPairNumbers from './getSettingPairNumbers.js'

@GObject.registerClass
export class NetSpeed extends St.BoxLayout {
  private _settings: Gio.Settings
  private lastTotalNetDownBytes: number
  private lastTotalNetUpBytes: number
  private _actor: St.DrawingArea
  private _draggable: DND._Draggable
  private _size: number
  private _currentUsage: { down: number, up: number }
  private _ignorePositionUpdate: boolean
  private isDragging: boolean
  private _dragMonitor: DND._Draggable

  public constructor(settings: Gio.Settings) {
    super({
      reactive: true,
    })
    this._settings = settings
    this.lastTotalNetDownBytes = 0
    this.lastTotalNetUpBytes = 0
    this._actor = new St.DrawingArea()
    this._actor.connect('repaint', area => this.draw_stuff(area))
    this.add_child(this._actor)
    this._updateSettings()

    // this._draggable = DND.makeDraggable(this)
    // this._draggable._animateDragEnd = eventTime => {
    //   this._draggable._animationInProgress = true
    //   this._draggable._onAnimationComplete(this._draggable._dragActor, eventTime)
    // }
    // this._draggable.connect('drag-begin', this._onDragBegin.bind(this))
    // this._draggable.connect('drag-end', this._onDragEnd.bind(this))

    this._toggleShow()
    this.setPosition()
  }

  private _toggleShow(): void {
    this.remove_all_children()
    if (!this._settings.get_boolean('hide-netspeed-widget')) {
      this.add_child(this._actor)
    }
    this.actor_init()
    this.update()
  }

  private actor_init(): void {
    this._size = this._settings.get_int('circular-netspeed-size')
    this._actor.width = this._size
    this._actor.height = this._size
  }

  private draw_stuff(area: St.DrawingArea): void {
    let cr = area.get_context()

    let [width, height] = area.get_surface_size()

    cr.setOperator(Cairo.Operator.CLEAR)
    cr.paint()
    cr.setOperator(Cairo.Operator.OVER)
    cr.translate(width / 2, height / 2)

    let fcolor = this._settings.get_string('netspeed-down-ring-color') ?? 'white'
    let color = new Gdk.RGBA()
    color.parse(fcolor)
    cr.setSourceRGBA(color.red, color.green, color.blue, 0.3)
    cr.rotate(-this._settings.get_double('netspeed-ring-startpoint') * Math.PI)
    cr.save()
    cr.setLineWidth(this._settings.get_double('netspeed-down-ring-width'))
    cr.arc(
      0,
      0,
      this._settings.get_double('netspeed-down-ring-radius'),
      0,
      this._settings.get_double('netspeed-ring-endpoint') * Math.PI,
    )
    cr.stroke()

    //netspeed download speed ring
    cr.setSourceRGBA(color.red, color.green, color.blue, color.alpha)
    cr.save()
    cr.arc(
      0,
      0,
      this._settings.get_double('netspeed-down-ring-radius'),
      0,
      (Number(this._controlSpd(this._currentUsage['down'])) / 1000) *
        this._settings.get_double('netspeed-ring-endpoint') *
        Math.PI,
    )
    cr.stroke()

    //netspeed upload speed ring
    fcolor = this._settings.get_string('netspeed-up-ring-color') ?? 'white'
    color = new Gdk.RGBA()
    color.parse(fcolor)
    cr.setSourceRGBA(color.red, color.green, color.blue, 0.3)
    cr.setLineWidth(this._settings.get_double('netspeed-up-ring-width'))
    cr.save()
    cr.arc(
      0,
      0,
      this._settings.get_double('netspeed-up-ring-radius'),
      0,
      this._settings.get_double('netspeed-ring-endpoint') * Math.PI,
    )
    cr.stroke()

    cr.setSourceRGBA(color.red, color.green, color.blue, color.alpha)
    cr.save()
    cr.arc(
      0,
      0,
      this._settings.get_double('netspeed-up-ring-radius'),
      0,
      (Number(this._controlSpd(this._currentUsage['up'])) / 1000) *
        this._settings.get_double('netspeed-ring-endpoint') *
        Math.PI,
    )
    cr.stroke()

    // text
    cr.rotate(this._settings.get_double('netspeed-ring-startpoint') * Math.PI)
    fcolor = this._settings.get_string('netspeed-text-color') ?? 'white'
    color = new Gdk.RGBA()
    color.parse(fcolor)
    cr.setSourceRGBA(color.red, color.green, color.blue, color.alpha)
    cr.save()
    cr.moveTo(this._settings.get_int('netspeed-text-position-x'), this._settings.get_int('netspeed-text-position-y'))
    cr.save()
    let font = this._settings.get_string('netspeed-text-font')
    this.text_show(
      cr,
      'up ' + this._shortStr(this._currentUsage['up']) + '\ndw ' + this._shortStr(this._currentUsage['down']),
      font!,
    )

    cr.restore()

    cr.$dispose()
  }

  public update(): void {
    this._currentUsage = this.getCurrentNetSpeed()
    this._actor.queue_repaint()
  }

  private _controlSpd(i: number): string {
    let o: string
    if (i > 1e12) {
      o = (i / 1e12).toFixed(1)
      return o
    }
    if (i > 1e9) {
      o = (i / 1e9).toFixed(1)
      return o
    }
    if (i > 1e6) {
      o = (i / 1e6).toFixed(1)
      return o
    }
    if (i > 1000) {
      o = (i / 1000).toFixed(1)
      return o
    }
    return i.toFixed(0)
  }

  private _shortStr(i: number): string {
    let o: string
    if (i > 1e12) {
      o = (i / 1e12).toFixed(1)
      return o + 'TB/s'
    }
    if (i > 1e9) {
      o = (i / 1e9).toFixed(1)
      return o + 'GB/s'
    }
    if (i > 1e6) {
      o = (i / 1e6).toFixed(1)
      return o + 'MB/s'
    }
    if (i > 1000) {
      o = (i / 1000).toFixed(1)
      return o + 'KB/s'
    }
    return i.toFixed(0) + 'B/s'
  }

  // See <https://github.com/AlynxZhou/gnome-shell-extension-net-speed>.
  private getCurrentNetSpeed(): { down: number, up: number } {
    const netSpeed = { down: 0, up: 0 }

    const inputFile = Gio.File.new_for_path('/proc/net/dev')
    const [, content] = inputFile.load_contents(null)
    // const contentStr = ByteArray.toString(content)
    const contentStr = new TextDecoder().decode(content)
    const contentLines = contentStr.split('\n')

    // Calculate the sum of all interfaces' traffic line by line.
    let totalDownBytes = 0
    let totalUpBytes = 0

    for (let i = 0; i < contentLines.length; i++) {
      const fields = contentLines[i].trim().split(/\W+/)
      if (fields.length <= 2) {
        break
      }

      // Skip virtual interfaces.
      const networkInterface = fields[0]
      const currentInterfaceDownBytes = Number.parseInt(fields[1])
      const currentInterfaceUpBytes = Number.parseInt(fields[9])
      if (
        networkInterface == 'lo' ||
        // Created by python-based bandwidth manager "traffictoll".
        networkInterface.match(/^ifb[0-9]+/) ||
        // Created by lxd container manager.
        networkInterface.match(/^lxdbr[0-9]+/) ||
        networkInterface.match(/^virbr[0-9]+/) ||
        networkInterface.match(/^br[0-9]+/) ||
        networkInterface.match(/^vnet[0-9]+/) ||
        networkInterface.match(/^tun[0-9]+/) ||
        networkInterface.match(/^tap[0-9]+/) ||
        isNaN(currentInterfaceDownBytes) ||
        isNaN(currentInterfaceUpBytes)
      ) {
        continue
      }

      totalDownBytes += currentInterfaceDownBytes
      totalUpBytes += currentInterfaceUpBytes
    }

    if (this.lastTotalNetDownBytes === 0) {
      this.lastTotalNetDownBytes = totalDownBytes
    }
    if (this.lastTotalNetUpBytes === 0) {
      this.lastTotalNetUpBytes = totalUpBytes
    }

    netSpeed['down'] = totalDownBytes - this.lastTotalNetDownBytes
    netSpeed['up'] = totalUpBytes - this.lastTotalNetUpBytes

    this.lastTotalNetDownBytes = totalDownBytes
    this.lastTotalNetUpBytes = totalUpBytes

    return netSpeed
  }

  private text_show(cr: Cairo.Context, showtext: string, font: string): void {
    let pl = PangoCairo.create_layout(cr)
    pl.set_text(showtext, -1)
    pl.set_font_description(Pango.FontDescription.from_string(font))
    PangoCairo.update_layout(cr, pl)
    let [w, h] = pl.get_pixel_size()
    cr.relMoveTo(-w / 2, 0)
    PangoCairo.show_layout(cr, pl)
    cr.relMoveTo(w / 2, 0)
  }

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

  private setPosition(): void {
    if (this._ignorePositionUpdate) {
      return
    }

    let [x, y] = getSettingPairNumbers(this._settings, 'circular-netspeed-location')
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
      this._settings.set_value('circular-netspeed-location', new GLib.Variant('(ii)', [x, y]))
      this._ignorePositionUpdate = false
    }
  }

  // _onDragBegin() {
  //   this.isDragging = true
  //   this._dragMonitor = {
  //     dragMotion: this._onDragMotion.bind(this),
  //   }
  //   DND.addDragMonitor(this._dragMonitor)

  //   let p = this.get_transformed_position()
  //   this.startX = this.oldX = p[0]
  //   this.startY = this.oldY = p[1]

  //   this.get_allocation_box()
  //   this.rowHeight = this.height
  //   this.rowWidth = this.width
  // }

  // _onDragMotion(dragEvent) {
  //   this.deltaX = dragEvent.x - (dragEvent.x - this.oldX)
  //   this.deltaY = dragEvent.y - (dragEvent.y - this.oldY)

  //   let p = this.get_transformed_position()
  //   this.oldX = p[0]
  //   this.oldY = p[1]

  //   return DND.DragMotionResult.CONTINUE
  // }

  // _onDragEnd() {
  //   if (this._dragMonitor) {
  //     DND.removeDragMonitor(this._dragMonitor)
  //     this._dragMonitor = null
  //   }

  //   this.set_position(this.deltaX, this.deltaY)

  //   this.ignoreUpdatePosition = true
  //   this._settings.set_value('circular-netspeed-location', new GLib.Variant('(ii)', [this.deltaX, this.deltaY]))
  //   this.ignoreUpdatePosition = false
  // }

  // getDragActor() {
  // }

  // getDragActorSource() {
  //   return this
  // }

  private _updateSettings(): void {
    this._settings.connect('changed::circular-netspeed-location', () => this.setPosition())
    this._settings.connect('changed::netspeed-up-ring-color', () => this.update())
    this._settings.connect('changed::netspeed-up-ring-width', () => this.update())
    this._settings.connect('changed::netspeed-up-ring-radius', () => this.update())
    this._settings.connect('changed::netspeed-down-ring-color', () => this.update())
    this._settings.connect('changed::netspeed-down-ring-width', () => this.update())
    this._settings.connect('changed::netspeed-down-ring-radius', () => this.update())
    this._settings.connect('changed::netspeed-text-font', () => this.update())
    this._settings.connect('changed::netspeed-text-color', () => this.update())
    this._settings.connect('changed::circular-netspeed-size', () => this.actor_init())
    this._settings.connect('changed::netspeed-ring-startpoint', () => this.update())
    this._settings.connect('changed::netspeed-ring-endpoint', () => this.update())
    this._settings.connect('changed::netspeed-text-position-x', () => this.update())
    this._settings.connect('changed::netspeed-text-position-y', () => this.update())
    this._settings.connect('changed::hide-netspeed-widget', () => this._toggleShow())
  }
}

export default NetSpeed
