import GLib from 'gi://GLib'
import GObject from 'gi://GObject'
import Gdk from 'gi://Gdk'
import type Gio from 'gi://Gio'
import Pango from 'gi://Pango'
import PangoCairo from 'gi://PangoCairo'
import St from 'gi://St'
import Cairo from 'gi://cairo'

import type DND from 'resource:///org/gnome/shell/ui/dnd.js'

import WidgetBase from './WidgetBase.js'

@GObject.registerClass
export class Clock extends WidgetBase {
  protected readonly LOCATION_SETTING_KEY = 'circular-clock-location'

  private _actor: St.DrawingArea
  private _draggable: DND._Draggable
  private _size: number
  private _mili: number
  private _sec: number
  private _min: number
  private _hour: number
  private _Gdate: GLib.DateTime
  private clockText: string
  private _Gsec: string
  private _Gmin: string
  private _Ghour: string
  private isDragging: boolean
  private _dragMonitor: { dragMotion: any }

  public constructor(settings: Gio.Settings) {
    super({
      reactive: true,
    })

    this._settings = settings
    this._actor = new St.DrawingArea()
    this._actor.connect('repaint', area => this.draw_stuff(area))
    this._updateSettings()

    // this._draggable = DND.makeDraggable(this, null)
    // this._draggable._animateDragEnd = eventTime => {
    //   this._draggable._animationInProgress = true
    //   this._draggable._onAnimationComplete(this._draggable._dragActor, eventTime)
    // }
    // this._draggable.connect('drag-begin', this._onDragBegin.bind(this))
    // this._draggable.connect('drag-end', this._onDragEnd.bind(this))

    this._settingsChanged()
    this.setPosition()
  }

  private _settingsChanged(): void {
    this.actor_init()
    this.remove_all_children()
    if (!this._settings.get_boolean('hide-clock-widget')) {
      this.add_child(this._actor)
    }
    this.update()
  }

  private actor_init(): void {
    this._size = this._settings.get_int('circular-clock-size')
    this._actor.height = this._size
    this._actor.width = this._size
  }

  private draw_stuff(area: St.DrawingArea): void {
    let cr = area.get_context()
    let [width, height] = area.get_surface_size()

    cr.setOperator(Cairo.Operator.CLEAR)
    cr.paint()

    cr.setOperator(Cairo.Operator.OVER)
    cr.translate(width / 2, height / 2)

    if (this._settings.get_boolean('sweeping-motion-clock')) {
      let micro = parseInt(this._Gdate.format('%f')!)
      this._mili = micro / 1000
      let difSec = parseInt(this._Gdate.format('%S')!) + this._mili / 1000
      this._sec = difSec / 60
      let difMin = parseInt(this._Gdate.format('%M')!) + this._sec
      this._min = difMin / 60
      let difHour = parseInt(this._Gdate.format('%H')!) % 12 + this._min
      this._hour = difHour / 12
    } else {
      this._sec = Number(this._Gdate.format('%S'))
      this._min = Number(this._Gdate.format('%M'))
      this._hour = Number(this._Gdate.format('%H'))
      if (this._hour > 12) this._hour = this._hour - 12
    }

    //sec
    let fcolor = this._settings.get_string('clock-sec-color') ?? 'white'
    let color = new Gdk.RGBA()
    color.parse(fcolor)
    cr.setSourceRGBA(color.red, color.green, color.blue, 0.3)
    cr.rotate(-Math.PI / 2)
    cr.save()
    cr.setLineWidth(this._settings.get_double('clock-sec-ring-width'))
    if (!this._settings.get_boolean('clock-sec-ring')) {
      cr.arc(0, 0, this._settings.get_double('clock-sec-ring-radius'), 0, 2 * Math.PI)
      cr.stroke()

      cr.setSourceRGBA(color.red, color.green, color.blue, color.alpha)
      cr.save()
      this._settings.get_boolean('sweeping-motion-clock')
        ? cr.arc(0, 0, this._settings.get_double('clock-sec-ring-radius'), 0, this._sec * 2 * Math.PI)
        : cr.arc(0, 0, this._settings.get_double('clock-sec-ring-radius'), 0, this._sec * Math.PI / 30)
      cr.stroke()
    }

    //min
    if (!this._settings.get_boolean('clock-min-ring')) {
      fcolor = this._settings.get_string('clock-min-color') ?? 'white'
      color = new Gdk.RGBA()
      color.parse(fcolor)
      cr.setSourceRGBA(color.red, color.green, color.blue, 0.3)
      cr.save()
      cr.setLineWidth(this._settings.get_double('clock-min-ring-width'))
      cr.arc(0, 0, this._settings.get_double('clock-min-ring-radius'), 0, 2 * Math.PI)
      cr.stroke()

      cr.setSourceRGBA(color.red, color.green, color.blue, color.alpha)
      cr.save()
      this._settings.get_boolean('sweeping-motion-clock')
        ? cr.arc(0, 0, this._settings.get_double('clock-min-ring-radius'), 0, this._min * 2 * Math.PI)
        : cr.arc(0, 0, this._settings.get_double('clock-min-ring-radius'), 0, this._min * Math.PI / 30)
      cr.stroke()
    }

    //hour
    if (!this._settings.get_boolean('clock-hour-ring')) {
      fcolor = this._settings.get_string('clock-hour-color') ?? 'white'
      color = new Gdk.RGBA()
      color.parse(fcolor)
      cr.setSourceRGBA(color.red, color.green, color.blue, 0.3)
      cr.save()
      cr.setLineWidth(this._settings.get_double('clock-hour-ring-width'))
      cr.arc(0, 0, this._settings.get_double('clock-hour-ring-radius'), 0, 2 * Math.PI)
      cr.stroke()

      /*if(this._settings.get_boolean('clock-inner-circle')) {
			cr.arc(0,0,r - this.lineW*4-this.lineW,0,2*Math.PI);
			cr.fill();}*/

      cr.setSourceRGBA(color.red, color.green, color.blue, color.alpha)
      cr.save()
      this._settings.get_boolean('sweeping-motion-clock')
        ? cr.arc(0, 0, this._settings.get_double('clock-hour-ring-radius'), 0, this._hour * 2 * Math.PI)
        : cr.arc(0, 0, this._settings.get_double('clock-hour-ring-radius'), 0, this._hour * Math.PI / 6)
      cr.stroke()
    }

    // text
    cr.rotate(Math.PI / 2)
    if (!this._settings.get_boolean('text-clock')) {
      this._settings.get_boolean('am-or-pm-clock') ? cr.moveTo(0, -20) : cr.moveTo(0, -10)
      fcolor = this._settings.get_string('clock-text-color') ?? 'white'
      color = new Gdk.RGBA()
      color.parse(fcolor)
      cr.setSourceRGBA(color.red, color.green, color.blue, color.alpha)
      cr.save()
      let font = this._settings.get_string('clock-text-font')
      this.text_show(cr, this.clockText, font!)
    }

    //hour
    fcolor = this._settings.get_string('clock-hour-hand-color') ?? 'white'
    color = new Gdk.RGBA()
    color.parse(fcolor)
    cr.rotate(-Math.PI / 2)
    cr.setLineWidth(this._settings.get_double('clock-hour-hand-width'))
    cr.setLineCap(Cairo.LineCap.ROUND)
    cr.setSourceRGBA(color.red, color.green, color.blue, color.alpha)
    cr.moveTo(0, 0)
    this._settings.get_boolean('sweeping-motion-clock')
      ? cr.rotate(this._hour * 2 * Math.PI)
      : cr.rotate(this._hour * Math.PI / 6)
    cr.save()
    if (!this._settings.get_boolean('clock-hour-hand')) {
      cr.lineTo(this._settings.get_double('clock-hour-hand-height'), 0)
      cr.stroke()
    }
    this._settings.get_boolean('sweeping-motion-clock')
      ? cr.rotate(-this._hour * 2 * Math.PI)
      : cr.rotate(-this._hour * Math.PI / 6)
    cr.save()
    //min
    fcolor = this._settings.get_string('clock-min-hand-color') ?? 'white'
    color = new Gdk.RGBA()
    color.parse(fcolor)
    cr.setLineWidth(this._settings.get_double('clock-min-hand-width'))
    cr.setSourceRGBA(color.red, color.green, color.blue, color.alpha)
    cr.moveTo(0, 0)
    this._settings.get_boolean('sweeping-motion-clock')
      ? cr.rotate(this._min * 2 * Math.PI)
      : cr.rotate(this._min * Math.PI / 30)
    cr.save()
    if (!this._settings.get_boolean('clock-min-hand')) {
      cr.lineTo(this._settings.get_double('clock-min-hand-height'), 0)
      cr.stroke()
    }
    this._settings.get_boolean('sweeping-motion-clock')
      ? cr.rotate(-this._min * 2 * Math.PI)
      : cr.rotate(-this._min * Math.PI / 30)
    cr.save()

    //sec
    fcolor = this._settings.get_string('clock-sec-hand-color') ?? 'white'
    color = new Gdk.RGBA()
    color.parse(fcolor)
    cr.setLineWidth(this._settings.get_double('clock-sec-hand-width'))
    cr.setSourceRGBA(color.red, color.green, color.blue, color.alpha)
    cr.moveTo(0, 0)
    this._settings.get_boolean('sweeping-motion-clock')
      ? cr.rotate(this._sec * 2 * Math.PI)
      : cr.rotate(this._sec * Math.PI / 30)
    cr.save()
    if (!this._settings.get_boolean('clock-sec-hand')) {
      cr.lineTo(this._settings.get_double('clock-sec-hand-height'), 0)
      cr.stroke()
    }

    cr.restore()

    cr.$dispose()
  }

  public update(): void {
    this._Gdate = GLib.DateTime.new_now_local()
    this.update_text()
    this._actor.queue_repaint()
  }

  private update_text(): void {
    this._Gsec = this._Gdate.format('%S')!
    this._Gmin = this._Gdate.format('%M')!
    this._Ghour = this._Gdate.format('%H')!
    const hour = Number(this._Ghour)
    if (hour > 12) {
      this._Ghour = String(hour - 12)
    }

    if (!this._settings.get_boolean('am-or-pm-clock')) {
      this.clockText = this._Gdate.format('%H:%M')!
    } else if (hour >= 12) {
      this.clockText = this._Ghour + ':' + this._Gmin + '\n' + ' PM'
    } else if (hour > 1) {
      this.clockText = '12' + this._Gmin + '\n' + ' AM'
    } else {
      this.clockText = this._Ghour + ':' + this._Gmin + '\n' + ' AM'
    }
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

  // _onDragMotion(dragEvent): DND.DragMotionResult.CONTINUE {
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
  //   this._settings.set_value('circular-clock-location', new GLib.Variant('(ii)', [this.deltaX, this.deltaY]))
  //   this.ignoreUpdatePosition = false
  // }

  // getDragActor() {
  // }

  // getDragActorSource() {
  //   return this
  // }

  private _updateSettings() {
    this._settings.connect('changed::circular-clock-location', () => this.setPosition())
    this._settings.connect('changed::am-or-pm-clock', () => this.update_text())
    this._settings.connect('changed::clock-sec-hand-height', () => this.update())
    this._settings.connect('changed::clock-sec-hand-width', () => this.update())
    this._settings.connect('changed::clock-sec-hand', () => this.update())
    this._settings.connect('changed::clock-min-hand-height', () => this.update())
    this._settings.connect('changed::clock-min-hand-width', () => this.update())
    this._settings.connect('changed::clock-min-hand', () => this.update())
    this._settings.connect('changed::clock-hour-hand-height', () => this.update())
    this._settings.connect('changed::clock-hour-hand-width', () => this.update())
    this._settings.connect('changed::clock-hour-hand', () => this.update())
    this._settings.connect('changed::clock-sec-ring', () => this.update())
    this._settings.connect('changed::clock-sec-ring-radius', () => this.update())
    this._settings.connect('changed::clock-sec-ring-width', () => this.update())
    this._settings.connect('changed::clock-min-ring', () => this.update())
    this._settings.connect('changed::clock-min-ring-radius', () => this.update())
    this._settings.connect('changed::clock-min-ring-width', () => this.update())
    this._settings.connect('changed::clock-hour-ring', () => this.update())
    this._settings.connect('changed::clock-hour-ring-radius', () => this.update())
    this._settings.connect('changed::clock-hour-ring-width', () => this.update())
    this._settings.connect('changed::text-clock', () => this.update())
    this._settings.connect('changed::sweeping-motion-clock', () => this.update())
    this._settings.connect('changed::clock-line-width', () => this.update())
    this._settings.connect('changed::clock-hour-color', () => this.update())
    this._settings.connect('changed::clock-min-color', () => this.update())
    this._settings.connect('changed::clock-sec-color', () => this.update())
    this._settings.connect('changed::clock-text-font', () => this.update())
    this._settings.connect('changed::clock-text-color', () => this.update())
    this._settings.connect('changed::circular-clock-size', () => this.actor_init())
    this._settings.connect('changed::clock-hour-hand-color', () => this.update())
    this._settings.connect('changed::clock-min-hand-color', () => this.update())
    this._settings.connect('changed::clock-sec-hand-color', () => this.update())
    this._settings.connect('changed::hide-clock-widget', () => this._settingsChanged())
  }
}

export default Clock
