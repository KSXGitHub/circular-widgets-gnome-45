import Clutter from 'gi://Clutter'
import GLib from 'gi://GLib'
import GObject from 'gi://GObject'
import Gio from 'gi://Gio'
import Mtk from 'gi://Mtk'
import Shell from 'gi://Shell'
import St from 'gi://St'

import DND from 'resource:///org/gnome/shell/ui/dnd.js'
import Main from 'resource:///org/gnome/shell/ui/main.js'

import getSettingPairNumbers from './getSettingPairNumbers.js'

@GObject.registerClass
export class Calendar extends St.BoxLayout {
  private weekdayAbbr: string[]
  private _weekStart: number
  private _Months: string[]
  private _settings: Gio.Settings
  private _calendar: Omit<St.Widget, 'layout_manager'> & {
    layout_manager: Clutter.GridLayout
  }
  private _draggable: DND._Draggable
  private _topBox: St.BoxLayout
  private _monthLabel: St.Label
  private _firstDayIndex: number
  private _selectedDate: Date
  private _buttons: []
  private _ignorePositionUpdate: boolean
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

  constructor(settings: Gio.Settings) {
    super({
      reactive: true,
    })
    this.weekdayAbbr = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    this._weekStart = Shell.util_get_week_start()
    this._Months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]
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

  _toggleShow(): void {
    this.remove_all_children()
    if (!this._settings.get_boolean('hide-calendar-widget')) {
      this.add_child(this._calendar)
    }

    this._buildHeader()
    this.update()
  }

  _buildHeader(): void {
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
        text: this.weekdayAbbr[i],
      })
      this._calendar.layout_manager.attach(label, i, 1, 1, 1)
      // this._calendar.insert_child_at_index(label, i)
    }

    // All the children after this are days, and get removed when we update the calendar
    this._firstDayIndex = this._calendar.get_n_children()
  }

  update(): void {
    this._selectedDate = new Date()
    if (!this._monthLabel) {
      throw new TypeError('_mothLabel was not initialized correctly')
    }
    this._monthLabel.text = this.getMonthsName(this._selectedDate.getMonth())
    let now = new Date()
    let children = this._calendar.get_children()
    if (!this._firstDayIndex) {
      throw new TypeError('_firstDayIndex was not initialized correctly')
    }
    for (let i = this._firstDayIndex; i < children.length; i++) {
      children[i].destroy()
    }

    this._buttons = []

    let totalDays = this._daysInMonth(this._selectedDate.getMonth(), this._selectedDate.getFullYear())

    let firstDay = new Date(this._selectedDate.getFullYear(), this._selectedDate.getMonth(), 1)

    let row = 2
    for (let i = 0; i < totalDays; i++) {
      let dateLabel = new St.Button({
        // label: firstDay.toLocaleFormat('%d'),
        label: firstDay.getDay().toString(),
      })

      let styleClass = 'day-base'

      if (this.sameDay(now, firstDay)) {
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

  _daysInMonth(month: number, year: number) {
    let d = new Date(year, month + 1, 0)
    return d.getDate()
  }

  sameDay(dateA: Date, dateB: Date) {
    return dateA.getFullYear() == dateB.getFullYear() && (dateA.getMonth() == dateB.getMonth()) &&
      (dateA.getDate() == dateB.getDate())
  }

  getMonthsName(date) {
    return this._Months[date]
  }

  _getMetaRectForCoords(x: number, y: number): Mtk.Rectangle {
    this.get_allocation_box()
    const [width, height] = this.get_transformed_size()
    return new Mtk.Rectangle(x, y, width, height)
  }

  _getWorkAreaForRect(rect: Mtk.Rectangle): Mtk.Rectangle {
    let monitorIndex = global.display.get_monitor_index_for_rect(rect)
    return Main.layoutManager.getWorkAreaForMonitor(monitorIndex)
  }

  _isOnScreen(x: number, y: number): boolean {
    let rect = this._getMetaRectForCoords(x, y)
    let monitorWorkArea = this._getWorkAreaForRect(rect)

    return monitorWorkArea.contains_rect(rect)
  }

  _keepOnScreen(x: number, y: number) {
    let rect = this._getMetaRectForCoords(x, y)
    let monitorWorkArea = this._getWorkAreaForRect(rect) // returns void?

    let monitorRight = monitorWorkArea.x + monitorWorkArea.width
    let monitorBottom = monitorWorkArea.y + monitorWorkArea.height

    x = Math.min(Math.max(monitorWorkArea.x, x), monitorRight - rect.width)
    y = Math.min(Math.max(monitorWorkArea.y, y), monitorBottom - rect.height)

    return [x, y]
  }

  setPosition(): void {
    if (this._ignorePositionUpdate) {
      return
    }

    let [x, y] = getSettingPairNumbers(this._settings, 'calendar-location')
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
      this._settings.set_value('calendar-location', new GLib.Variant('(ii)', [x, y]))
      this._ignorePositionUpdate = false
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
