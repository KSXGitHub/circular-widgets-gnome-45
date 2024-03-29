import Adw from 'gi://Adw'
import Gdk from 'gi://Gdk'
import Gio from 'gi://Gio'
import Gtk from 'gi://Gtk'

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'
import { type ExtensionMetadata } from 'resource:///org/gnome/shell/extensions/extension.js'

export default class CircularWidgetPreferences extends ExtensionPreferences {
  public fillPreferencesWindow(window: Adw.PreferencesWindow): void {
    const settings = this.getSettings('org.gnome.shell.extensions.circular')
    const prefs = new PrefsWindow(window, settings, this.metadata)
    prefs.fillPrefsWindow()
  }
}

interface Prop {
  readonly min: number
  readonly max: number
  readonly step: number
  readonly mark_position: number
  readonly add_mark: boolean
  readonly size: number
  readonly draw_value: boolean
}

class PrefsWindow {
  private _window: Adw.PreferencesWindow
  private _settings: Gio.Settings
  private _metadata: ExtensionMetadata
  private headerbar: Gtk.Widget | null

  public constructor(window: Adw.PreferencesWindow, settings: Gio.Settings, metadata: ExtensionMetadata) {
    this._window = window
    this._settings = settings
    this._metadata = metadata
  }

  private create_page(title: string): Adw.PreferencesPage {
    const page = new Adw.PreferencesPage({
      title: title,
    })
    this._window.add(page)

    if (!this.headerbar) {
      // NOTE: Why the hell are there so many get_parent? Is there a better way?
      const pages_stack = page.get_parent()
      if (!pages_stack) {
        throw new TypeError('Failed to get pages_stack')
      }
      const content_stack = pages_stack.get_parent()?.get_parent()
      if (!content_stack) {
        throw new TypeError('Failed to get content_stack')
      }
      const preferences = content_stack.get_parent()
      if (!preferences) {
        throw new TypeError('Failed to get preferences')
      }
      const headerbar = preferences?.get_first_child()
      if (!headerbar) {
        throw new TypeError('Failed to get headerbar')
      }
      this.headerbar = headerbar
    }

    return page
  }

  // create a new Adw.PreferencesGroup and add it to a prefsPage
  private create_group(page: Adw.PreferencesPage, title?: string): Adw.PreferencesGroup {
    let group: Adw.PreferencesGroup
    if (title !== undefined) {
      group = new Adw.PreferencesGroup({
        title: title,
        /*margin_top: 5,
        	margin_bottom: 5,*/
      })
    } else {
      group = new Adw.PreferencesGroup()
    }
    page.add(group)
    return group
  }

  private append_row(group: Adw.PreferencesGroup, title: string, widget: Gtk.Widget): void {
    let row = new Adw.ActionRow({
      title: title,
    })
    group.add(row)
    row.add_suffix(widget)
    row.activatable_widget = widget
  }

  private append_rows(group: Adw.PreferencesGroup, title: string, wd1: Gtk.Widget, wd2: Gtk.Widget): void {
    let row = new Adw.ActionRow({
      title: title,
    })
    group.add(row)
    let label1 = new Gtk.Label()
    label1.set_label('FG')
    row.add_suffix(label1)
    let space = new Gtk.Label()
    space.set_label(' ')
    row.add_suffix(space)
    row.add_suffix(wd1)
    row.activatable_widget = wd1
    let space1 = new Gtk.Label()
    space1.set_label(' ')
    row.add_suffix(space1)
    let label2 = new Gtk.Label()
    label2.set_label('BG')
    row.add_suffix(label2)
    let space2 = new Gtk.Label()
    space2.set_label(' ')
    row.add_suffix(space2)
    row.add_suffix(wd2)
    row.activatable_widget = wd2
  }

  // create a new Adw.ActionRow to insert an option into a prefsGroup
  private append_switch(group: Adw.PreferencesGroup, title: string, key: string): void {
    let button = new Gtk.Switch({
      active: key as any, // What the hell? Why assign a string to a boolean? Is this even necessary?
      valign: Gtk.Align.CENTER,
    })

    this._settings.bind(
      key,
      button,
      'active',
      Gio.SettingsBindFlags.DEFAULT,
    )

    this.append_row(group, title, button)
  }

  private append_spin_button(
    group: Adw.PreferencesGroup,
    title: string,
    is_double: boolean,
    key: string,
    min: number,
    max: number,
    step: number,
  ): void {
    let v = 0
    if (is_double) {
      v = this._settings.get_double(key)
    } else {
      v = this._settings.get_int(key)
    }
    let spin = Gtk.SpinButton.new_with_range(min, max, step)
    spin.set_value(v)
    this._settings.bind(key, spin, 'value', Gio.SettingsBindFlags.DEFAULT)
    this.append_row(group, title, spin)
  }

  private append_color_button(group: Adw.PreferencesGroup, title: string, key: string, color: string): void {
    let rgba = new Gdk.RGBA()
    rgba.parse(color)
    let colorButton = new Gtk.ColorButton({
      rgba,
      use_alpha: true,
      valign: Gtk.Align.CENTER,
    })
    colorButton.connect('color-set', widget => {
      this._settings.set_string(key, widget.get_rgba().to_string()!)
    })
    this.append_row(group, title, colorButton)
  }

  private append_scale_bar(group: Adw.PreferencesGroup, title: string, key: string, prop?: Partial<Prop>): void {
    // prop = Params.parse(prop, {
    //   min: 0,
    //   max: 100,
    //   step: 10,
    //   mark_position: 0,
    //   add_mark: false,
    //   size: 200,
    //   draw_value: true,
    // })

    const {
      min = 0,
      max = 100,
      step = 10,
      mark_position = 0,
      add_mark = false,
      size = 200,
      draw_value = true,
    } = prop ?? {}

    let bar = Gtk.Scale.new_with_range(0, min, max, step)
    bar.set_value(this._settings.get_int(key))
    bar.set_draw_value(draw_value)
    bar.set_size_request(size, -1)
    if (add_mark) {
      bar.add_mark(
        mark_position,
        Gtk.PositionType.BOTTOM,
        null,
      )
    }
    bar.connect('value-changed', slider => {
      this._settings.set_int(key, slider.get_value())
    })
    this.append_row(group, title, bar)
  }

  private append_font_chooser(group: Adw.PreferencesGroup, title: string, key: string): void {
    let Font = this._settings.get_string(key)
    let chooser = new Gtk.FontButton({
      use_size: true,
      use_font: true,
      valign: Gtk.Align.CENTER,
      font: Font,
    })
    chooser.connect('font-set', widget => {
      this._settings.set_string(key, widget.get_font()!)
    })
    this.append_row(group, title, chooser)
  }

  private append_info_group(group: Adw.PreferencesGroup, name: string, title: string): void {
    let adw_group = new Adw.PreferencesGroup()
    let infoBox = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      hexpand: false,
      vexpand: false,
    })

    let name_label = new Gtk.Label({
      label: name,
    })

    let version = new Gtk.Label({
      label: 'Version: ' + title,
    })

    infoBox.append(name_label)
    infoBox.append(version)
    adw_group.add(infoBox)
    group.add(adw_group)
  }

  public fillPrefsWindow(): void {
    let clockWidget = this.create_page('Clock')
    {
      let groupClock = this.create_group(clockWidget, undefined)
      this.append_switch(groupClock, 'Hide Clock', 'hide-clock-widget')
      this.append_scale_bar(groupClock, 'Size', 'circular-clock-size', {
        min: 100,
        max: 200,
        step: 1,
        mark_position: 100,
        add_mark: true,
        size: 150,
        draw_value: true,
      })
      this.append_switch(groupClock, 'Enable Sweeping Motion', 'sweeping-motion-clock')

      let groupClockRing = this.create_group(clockWidget, 'Clock Ring')
      this.append_switch(groupClockRing, 'Hide Second Ring', 'clock-sec-ring')
      this.append_spin_button(groupClockRing, 'Second Ring Radius', true, 'clock-sec-ring-radius', 1, 99.5, 0.1)
      this.append_spin_button(groupClockRing, 'Second Ring Width', true, 'clock-sec-ring-width', 1, 15, 0.1)
      this.append_color_button(
        groupClockRing,
        'Second Ring Color',
        'clock-sec-color',
        this._settings.get_string('clock-sec-color')!,
      )
      this.append_switch(groupClockRing, 'Hide Minute Ring', 'clock-min-ring')
      this.append_spin_button(groupClockRing, 'Minute Ring Radius', true, 'clock-min-ring-radius', 1, 99.5, 0.1)
      this.append_spin_button(groupClockRing, 'Minute Ring Width', true, 'clock-min-ring-width', 1, 15, 0.1)
      this.append_color_button(
        groupClockRing,
        'Minute Ring Color',
        'clock-min-color',
        this._settings.get_string('clock-min-color')!,
      )
      this.append_switch(groupClockRing, 'Hide Hour Ring', 'clock-hour-ring')
      this.append_spin_button(groupClockRing, 'Hour Ring Radius', true, 'clock-hour-ring-radius', 1, 99.5, 0.1)
      this.append_spin_button(groupClockRing, 'Hour Ring Width', true, 'clock-hour-ring-width', 1, 15, 0.1)
      this.append_color_button(
        groupClockRing,
        'Hour Ring Color',
        'clock-hour-color',
        this._settings.get_string('clock-hour-color')!,
      )
      //    		this.append_spin_button(groupClockRing,'Line Width',false,'clock-line-width',1,15,1);
      //    		this.append_switch(groupClockRing,'Show Inner Circle','clock-inner-circle');

      let groupClockHand = this.create_group(clockWidget, 'Clock Hand')
      this.append_switch(groupClockHand, 'Hide Second Hand', 'clock-sec-hand')
      this.append_spin_button(groupClockHand, 'Second Hand Height', true, 'clock-sec-hand-height', 1, 100, 0.1)
      this.append_spin_button(groupClockHand, 'Second Hand Width', true, 'clock-sec-hand-width', 1, 10, 0.1)
      this.append_color_button(
        groupClockHand,
        'Second Hand Color',
        'clock-sec-hand-color',
        this._settings.get_string('clock-sec-hand-color')!,
      )
      this.append_switch(groupClockHand, 'Hide Minute Hand', 'clock-min-hand')
      this.append_spin_button(groupClockHand, 'Minute Hand Height', true, 'clock-min-hand-height', 1, 100, 0.1)
      this.append_spin_button(groupClockHand, 'Minute Hand Width', true, 'clock-min-hand-width', 1, 10, 0.1)
      this.append_color_button(
        groupClockHand,
        'Minute Hand Color',
        'clock-min-hand-color',
        this._settings.get_string('clock-min-hand-color')!,
      )
      this.append_switch(groupClockHand, 'Hide Hour Hand', 'clock-hour-hand')
      this.append_spin_button(groupClockHand, 'Hour Hand Height', true, 'clock-hour-hand-height', 1, 100, 0.1)
      this.append_spin_button(groupClockHand, 'Hour Hand Width', true, 'clock-hour-hand-width', 1, 10, 0.1)
      this.append_color_button(
        groupClockHand,
        'Hour Hand Color',
        'clock-hour-hand-color',
        this._settings.get_string('clock-hour-hand-color')!,
      )

      let groupClockText = this.create_group(clockWidget, 'Clock Text')
      this.append_switch(groupClockText, 'Disable 12 hour Clock', 'am-or-pm-clock')
      this.append_switch(groupClockText, 'Hide Text Clock', 'text-clock')
      this.append_color_button(
        groupClockText,
        'Text Color',
        'clock-text-color',
        this._settings.get_string('clock-text-color')!,
      )
      this.append_font_chooser(groupClockText, 'Text Font', 'clock-text-font')
    }

    let cpuWidget = this.create_page('CPU')
    {
      let groupCpu = this.create_group(cpuWidget, undefined)
      this.append_switch(groupCpu, 'Hide CPU', 'hide-cpu-widget')
      this.append_scale_bar(groupCpu, 'Size', 'circular-cpu-size', {
        min: 80,
        max: 150,
        step: 1,
        mark_position: 100,
        add_mark: true,
        size: 200,
        draw_value: true,
      })

      let groupCpuRing = this.create_group(cpuWidget, 'CPU Ring')
      this.append_spin_button(groupCpuRing, 'Set Start Point', true, 'cpu-ring-startpoint', 0, 2, 0.01)
      this.append_spin_button(groupCpuRing, 'Set End Point', true, 'cpu-ring-endpoint', 0, 2, 0.01)
      this.append_spin_button(groupCpuRing, 'Ring Width', true, 'cpu-line-width', 1, 125, 0.1)
      this.append_spin_button(groupCpuRing, 'Ring Radius', true, 'cpu-ring-radius', 1, 74.5, 0.1)
      this.append_switch(groupCpuRing, 'Show Inner Circle', 'cpu-inner-circle')
      this.append_spin_button(groupCpuRing, 'Inner Circle Radius', true, 'cpu-inner-circle-radius', 1, 74.5, 0.1)
      this.append_color_button(
        groupCpuRing,
        'Ring Color',
        'cpu-line-color',
        this._settings.get_string('cpu-line-color')!,
      )

      let groupCpuText = this.create_group(cpuWidget, 'CPU Text')
      this.append_font_chooser(groupCpuText, 'Text Font', 'cpu-text-font')
      this.append_spin_button(groupCpuText, 'Text Position X', false, 'cpu-text-position-x', -75, 75, 1)
      this.append_spin_button(groupCpuText, 'Text Position X', false, 'cpu-text-position-y', -75, 75, 1)
      this.append_switch(groupCpuText, 'Enable In-Line Text', 'enable-inline-cpu')
      this.append_spin_button(groupCpuText, 'InLine Text Position X', false, 'cpu-inline-text-position-x', -75, 75, 1)
      this.append_spin_button(groupCpuText, 'InLine Text Position Y', false, 'cpu-inline-text-position-y', -75, 75, 1)
      this.append_color_button(
        groupCpuText,
        'Text Color',
        'cpu-text-color',
        this._settings.get_string('cpu-text-color')!,
      )
    }

    let ramWidget = this.create_page('RAM')
    {
      let groupRam = this.create_group(ramWidget, undefined)
      this.append_switch(groupRam, 'Hide RAM', 'hide-ram-widget')
      this.append_scale_bar(groupRam, 'Size', 'circular-ram-size', {
        min: 80,
        max: 250,
        step: 1,
        mark_position: 100,
        add_mark: true,
        size: 150,
        draw_value: true,
      })

      let groupRamRing = this.create_group(ramWidget, 'RAM Ring')
      this.append_spin_button(groupRamRing, 'Set Start Point', true, 'ram-ring-startpoint', 0, 2, 0.01)
      this.append_spin_button(groupRamRing, 'Set End Point', true, 'ram-ring-endpoint', 0, 2, 0.01)
      this.append_spin_button(groupRamRing, 'Ring Width', false, 'ram-line-width', 1, 74.5, 0.1)
      this.append_spin_button(groupRamRing, 'Ring Radius', true, 'ram-ring-radius', 1, 74.5, 0.1)
      this.append_switch(groupRamRing, 'Show Inner Circle', 'ram-inner-circle')
      this.append_spin_button(groupRamRing, 'Inner Circle Radius', true, 'ram-inner-circle-radius', 1, 74.5, 0.1)
      this.append_color_button(
        groupRamRing,
        'Ring Color',
        'ram-line-color',
        this._settings.get_string('ram-line-color')!,
      )

      let groupRamText = this.create_group(ramWidget, 'RAM Text')
      this.append_font_chooser(groupRamText, 'Text Font', 'ram-text-font')
      this.append_spin_button(groupRamText, 'Text Position X', false, 'ram-text-position-x', -75, 75, 1)
      this.append_spin_button(groupRamText, 'Text Position X', false, 'ram-text-position-y', -75, 75, 1)
      this.append_switch(groupRamText, 'Enable In-Line Text', 'enable-inline-ram')
      this.append_spin_button(groupRamText, 'InLine Text Position X', false, 'ram-inline-text-position-x', -75, 75, 1)
      this.append_spin_button(groupRamText, 'InLine Text Position Y', false, 'ram-inline-text-position-y', -75, 75, 1)
      this.append_color_button(
        groupRamText,
        'Text Color',
        'ram-text-color',
        this._settings.get_string('ram-text-color')!,
      )
    }

    let netSpeedWidget = this.create_page('Net Speed')
    {
      let groupNetSpeed = this.create_group(netSpeedWidget, undefined)
      this.append_switch(groupNetSpeed, 'Hide Net Speed', 'hide-netspeed-widget')
      this.append_scale_bar(groupNetSpeed, 'Size', 'circular-netspeed-size', {
        min: 80,
        max: 250,
        step: 1,
        mark_position: 100,
        add_mark: true,
        size: 150,
        draw_value: true,
      })

      let groupNetSpeedRing = this.create_group(netSpeedWidget, 'Net Speed Ring')
      this.append_spin_button(groupNetSpeedRing, 'Set Start Point', true, 'netspeed-ring-startpoint', 0, 2, 0.01)
      this.append_spin_button(groupNetSpeedRing, 'Set End Point', true, 'netspeed-ring-endpoint', 0, 2, 0.01)
      this.append_spin_button(groupNetSpeedRing, 'Down Ring Width', false, 'netspeed-down-ring-width', 1, 74.5, 0.1)
      this.append_spin_button(groupNetSpeedRing, 'Down Ring Radius', true, 'netspeed-down-ring-radius', 1, 74.5, 0.1)
      this.append_color_button(
        groupNetSpeedRing,
        'Down Ring Color',
        'netspeed-down-ring-color',
        this._settings.get_string('netspeed-down-ring-color')!,
      )
      this.append_spin_button(groupNetSpeedRing, 'Upload Ring Width', false, 'netspeed-up-ring-width', 1, 74.5, 0.1)
      this.append_spin_button(groupNetSpeedRing, 'Upload Ring Radius', true, 'netspeed-up-ring-radius', 1, 74.5, 0.1)
      this.append_color_button(
        groupNetSpeedRing,
        'Upload Ring Color',
        'netspeed-up-ring-color',
        this._settings.get_string('netspeed-up-ring-color')!,
      )

      let groupNetSpeedText = this.create_group(netSpeedWidget, 'Net Speed Text')
      this.append_font_chooser(groupNetSpeedText, 'Text Font', 'netspeed-text-font')
      this.append_spin_button(groupNetSpeedText, 'Text Position X', false, 'netspeed-text-position-x', -75, 75, 1)
      this.append_spin_button(groupNetSpeedText, 'Text Position X', false, 'netspeed-text-position-y', -75, 75, 1)
      this.append_color_button(
        groupNetSpeedText,
        'Text Color',
        'netspeed-text-color',
        this._settings.get_string('netspeed-text-color')!,
      )
    }

    let calendarWidget = this.create_page('Calendar')
    {
      let groupCalendar = this.create_group(calendarWidget, undefined)
      this.append_switch(groupCalendar, 'Hide Calendar', 'hide-calendar-widget')
    }

    let aboutPage = this.create_page('About')
    {
      let groupAbout = this.create_group(aboutPage, undefined)
      // this.append_info_group(groupAbout, Me.metadata.name, Me.metadata.version.toString())
      this.append_info_group(groupAbout, this._metadata.name, this._metadata.version!.toString())
    }
  }
}
