import Clutter from 'gi://Clutter'
import GObject from 'gi://GObject'
import type Gio from 'gi://Gio'
import Shell from 'gi://Shell'
import St from 'gi://St'

import type DND from 'resource:///org/gnome/shell/ui/dnd.js'

import WidgetBase from './WidgetBase.js'
import { getWeekdayAbbr, getMonthName, daysInMonth, sameDay } from './dateUtils.js'

@GObject.registerClass
export class Calendar extends WidgetBase {
  protected readonly LOCATION_SETTING_KEY = 'calendar-location'

  private _weekStart: number
  private _calendar: Omit<St.Widget, 'layout_manager'> & {
    layout_manager: Clutter.GridLayout
  }
  private _draggable: DND._Draggable
  private _topBox: St.BoxLayout
  private _monthLabel: St.Label
  private _firstDayIndex: number
  private _selectedDate: Date
  private _buttons: []
  private isDragging: boolean
  private _dragMonitor: DND._Draggable | null
  private startX: number
  private startY: number
  private oldX: number
  private oldY: number
  private rowHeight: number
  private rowWidth: number
  private deltaX: number
  private deltaY: number
  private ignoreUpdatePosition: boolean

  public constructor(settings: Gio.Settings) {
    super({
      reactive: true,
    })
    this._weekStart = Shell.util_get_week_start()
    this._settings = settings

    this._calendar = new St.Widget({
      style_class: 'calendar-wd',
      layout_manager: new Clutter.GridLayout(),
      reactive: true,
    }) as St.Widget & {
      layout_manager: Clutter.GridLayout
    }

    this._settings.connect('changed::hide-calendar-widget', () => this._toggleShow())
    this._settings.connect('changed::calendar-location', () => this.setPosition())

    // // this._draggable = DND.makeDraggable(this)
    // this._draggable = DND.makeDraggable(this, undefined)
    // // @ts-ignore
    // this._draggable._animateDragEnd = eventTime => {
    //   // @ts-ignore
    //   this._draggable._animationInProgress = true
    //   // @ts-ignore
    //   this._draggable._onAnimationComplete(this._draggable._dragActor, eventTime)
    // }
    // this._draggable.connect('drag-begin', this._onDragBegin.bind(this))
    // this._draggable.connect('drag-end', this._onDragEnd.bind(this))

    this._toggleShow()
    this.setPosition()
  }

  private _toggleShow(): void {
    this.remove_all_children()
    if (!this._settings.get_boolean('hide-calendar-widget')) {
      this.add_child(this._calendar)
    }

    this._buildHeader()
    this.update()
  }

  private _buildHeader(): void {
    // Top line of the calendar '<| September 2009 |>'
    this._topBox = new St.BoxLayout({})
    this._calendar.layout_manager.attach(this._topBox, 0, 0, 7, 1)

    this._monthLabel = new St.Label({
      style_class: 'calendar-header-label',
      can_focus: true,
      x_align: Clutter.ActorAlign.CENTER,
      x_expand: true,
      y_align: Clutter.ActorAlign.CENTER,
    })
    this._topBox.add_child(this._monthLabel)

    // Add weekday labels...
    for (let i = 0; i < 7; i++) {
      let label = new St.Label({
        style_class: 'weekday-label',
        text: getWeekdayAbbr(i),
      })
      this._calendar.layout_manager.attach(label, i, 1, 1, 1)
    }

    // All the children after this are days, and get removed when we update the calendar
    this._firstDayIndex = this._calendar.get_n_children()
  }

  public update(): void {
    this._selectedDate = new Date()
    if (!this._monthLabel) {
      throw new TypeError('_mothLabel was not initialized correctly')
    }
    this._monthLabel.text = getMonthName(this._selectedDate.getMonth())
    let now = new Date()
    let children = this._calendar.get_children()
    if (!this._firstDayIndex) {
      throw new TypeError('_firstDayIndex was not initialized correctly')
    }
    for (let i = this._firstDayIndex; i < children.length; i++) {
      children[i].destroy()
    }

    this._buttons = []

    let totalDays = daysInMonth(this._selectedDate.getMonth(), this._selectedDate.getFullYear())

    let firstDay = new Date(this._selectedDate.getFullYear(), this._selectedDate.getMonth(), 1)

    let row = 2
    for (let i = 0; i < totalDays; i++) {
      let dateLabel = new St.Button({
        // label: firstDay.toLocaleFormat('%d'),
        label: firstDay.getDate().toString(),
      })

      let styleClass = 'day-base'

      if (sameDay(now, firstDay)) {
        styleClass += ' today'
      }

      dateLabel.style_class = styleClass

      this._calendar.layout_manager.attach(dateLabel, firstDay.getDay(), row, 1, 1)

      if (firstDay.getDay() == 6) {
        row++
      }
      firstDay.setDate(firstDay.getDate() + 1)
    }
  }

  // _onDragBegin() {
  //   this.isDragging = true
  //   this._dragMonitor = {
  //     // @ts-ignore
  //     dragMotion: this._onDragMotion.bind(this),
  //   }
  //   // this._dragMonitor = this._onDragMotion(this)
  //   DND.addDragMonitor(this._dragMonitor!)

  //   let p = this.get_transformed_position()
  //   this.startX = this.oldX = p[0]
  //   this.startY = this.oldY = p[1]

  //   // this.get_allocation_box()
  //   // this.rowHeight = this.height
  //   // this.rowWidth = this.width
  //   const allocationBox = this.get_allocation_box()
  //   // this.set_allocation(allocationBox)
  //   this.rowHeight = allocationBox.get_height()
  //   this.rowWidth = allocationBox.get_width()
  // }

  // _onDragMotion(dragEvent: { x: number; y: number }) {
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
  //   this._settings.set_value('calendar-location', new GLib.Variant('(ii)', [this.deltaX, this.deltaY]))
  //   this.ignoreUpdatePosition = false
  // }

  // getDragActor() {
  // }

  // getDragActorSource() {
  //   return this
  // }
}

export default Calendar
