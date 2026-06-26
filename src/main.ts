import { App, Plugin, PluginSettingTab, Setting, setIcon } from "obsidian";

interface ContentWidthSettings {
  enabled: boolean;
  widthPercent: number;
  floatingToolbarEnabled: boolean;
  headingPalette: string;
  headingTextColor: string;
  headingBackgroundColor: string;
  tableCellBackgroundColor: string;
  pageColors: Record<string, PageColorSettings>;
  pageLayouts: Record<string, PageLayoutSettings>;
  pageTables: Record<string, PageTableSettings>;
  tableWidthPercent: number;
  tableRowSpacing: TableRowSpacing;
  tableCellSizing: TableCellSizing;
  tableHeaderStyle: TableHeaderStyle;
}

type PageColorSettings = {
  headingTextColor: string;
  headingBackgroundColor: string;
  tableCellBackgroundColor: string;
};

type PageLayoutSettings = {
  widthPercent?: number;
};

type PageTableSettings = {
  tables: Record<string, TableElementStyle>;
  cells: Record<string, TableCellStyle>;
};

type TableElementStyle = {
  tableLayout?: string;
  width?: string;
};

type TableCellStyle = {
  textAlign?: string;
  verticalAlign?: string;
  background?: string;
  width?: string;
  minWidth?: string;
  height?: string;
  minHeight?: string;
};

type TableRowSpacing = "default" | "compact" | "regular" | "loose";
type TableCellSizing = "default" | "even";
type TableHeaderStyle = "default" | "gray" | "black" | "light-blue" | "dark-blue";

const DEFAULT_SETTINGS: ContentWidthSettings = {
  enabled: true,
  widthPercent: 86,
  floatingToolbarEnabled: true,
  headingPalette: "soft",
  headingTextColor: "default",
  headingBackgroundColor: "none",
  tableCellBackgroundColor: "none",
  pageColors: {},
  pageLayouts: {},
  pageTables: {},
  tableWidthPercent: 0,
  tableRowSpacing: "default",
  tableCellSizing: "default",
  tableHeaderStyle: "default"
};

const BODY_CLASS = "layout-toolbar-enabled";
const CSS_VAR = "--layout-toolbar-percent";
const HEADING_PALETTE_CLASS_PREFIX = "layout-toolbar-headings-";
const HEADING_TEXT_COLOR_VAR = "--layout-toolbar-heading-text";
const HEADING_BACKGROUND_COLOR_VAR = "--layout-toolbar-heading-background";
const TABLE_CELL_BACKGROUND_VAR = "--layout-toolbar-cell-background";
const TABLE_WIDTH_VAR = "--layout-toolbar-table-width";
const TABLE_ROW_SPACING_VAR = "--layout-toolbar-table-row-spacing";
const TABLE_CELL_SIZING_CLASS_PREFIX = "layout-toolbar-table-cells-";
const TABLE_HEADER_STYLE_CLASS_PREFIX = "layout-toolbar-table-header-";
const TOOLBAR_CLASS = "layout-toolbar-toolbar";
const PAGE_COLOR_SCOPE_CLASS = "layout-toolbar-page-color-scope";
const TABLE_RESIZE_MODE_CLASS = "layout-toolbar-table-resize-mode";

const HEADING_PALETTES = [
  { id: "soft", label: "柔和" },
  { id: "vivid", label: "鲜明" },
  { id: "ink", label: "墨色" },
  { id: "off", label: "关闭" }
];

const TABLE_WIDTH_OPTIONS = [50, 60, 70, 80, 90, 100];
const TABLE_ROW_SPACING_OPTIONS: { id: TableRowSpacing; label: string; padding: number }[] = [
  { id: "default", label: "默认", padding: 0 },
  { id: "compact", label: "紧凑", padding: 4 },
  { id: "regular", label: "常规", padding: 12 },
  { id: "loose", label: "宽松", padding: 20 }
];
const TABLE_CELL_SIZING_OPTIONS: { id: TableCellSizing; label: string }[] = [
  { id: "default", label: "默认" },
  { id: "even", label: "均分列宽" }
];
const TABLE_HEADER_STYLE_OPTIONS: { id: TableHeaderStyle; label: string }[] = [
  { id: "default", label: "默认无颜色" },
  { id: "gray", label: "灰色黑字" },
  { id: "black", label: "黑色白字" },
  { id: "light-blue", label: "浅蓝色黑字" },
  { id: "dark-blue", label: "深蓝色白字" }
];
const WIDTH_OPTIONS = [50, 60, 70, 80, 90, 100];
const TEXT_COLORS = [
  { id: "default", label: "默认", value: "" },
  { id: "gray", label: "灰色", value: "#999999" },
  { id: "red", label: "红色", value: "#d83931" },
  { id: "orange", label: "橙色", value: "#df7805" },
  { id: "yellow", label: "黄色", value: "#dd9b02" },
  { id: "green", label: "绿色", value: "#2ea121" },
  { id: "blue", label: "蓝色", value: "#245bdb" },
  { id: "purple", label: "紫色", value: "#6425d0" }
];
const BACKGROUND_COLORS = [
  { id: "none", label: "无背景", value: "transparent" },
  { id: "gray-soft", label: "浅灰", value: "#f0f1f3" },
  { id: "red-soft", label: "浅红", value: "#f8b9b9" },
  { id: "orange-soft", label: "浅橙", value: "#ffd9ad" },
  { id: "yellow-soft", label: "浅黄", value: "#fff594" },
  { id: "green-soft", label: "浅绿", value: "#c6efc1" },
  { id: "blue-soft", label: "浅蓝", value: "#c8d7f7" },
  { id: "purple-soft", label: "浅紫", value: "#d5c0f2" },
  { id: "gray", label: "灰色", value: "#dfe2e6" },
  { id: "slate", label: "深灰", value: "#b9bec5" },
  { id: "red", label: "红色", value: "#f86161" },
  { id: "orange", label: "橙色", value: "#ff9f38" },
  { id: "yellow", label: "黄色", value: "#ffe11f" },
  { id: "green", label: "绿色", value: "#58cf4e" },
  { id: "blue", label: "蓝色", value: "#99b6f6" },
  { id: "purple", label: "紫色", value: "#b493ef" }
];

type TableResizeTarget = {
  cellEl: HTMLTableCellElement;
  tableEl: HTMLTableElement;
  kind: "column" | "row";
  columnIndex: number;
  rowIndex: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
};

type TableDomSnapshot = {
  tableStyle: string;
  cellStyles: string[][];
};

type UndoSnapshot = {
  settings: ContentWidthSettings;
  activeFilePath: string;
  pageScopeStyle: string | null;
  tableSnapshots: TableDomSnapshot[];
};

export default class ContentWidthControlPlugin extends Plugin {
  settings: ContentWidthSettings;
  toolbarEl: HTMLDivElement | null = null;
  headingPanelEl: HTMLDivElement | null = null;
  cellBackgroundPanelEl: HTMLDivElement | null = null;
  tableMenuPanelEl: HTMLDivElement | null = null;
  widthMenuPanelEl: HTMLDivElement | null = null;
  cellBackgroundButtonEl: HTMLButtonElement | null = null;
  headingButtonEl: HTMLButtonElement | null = null;
  headingChevronEl: HTMLSpanElement | null = null;
  tableResizeButtonEl: HTMLButtonElement | null = null;
  tableChevronEl: HTMLSpanElement | null = null;
  widthButtonEl: HTMLButtonElement | null = null;
  widthChevronEl: HTMLSpanElement | null = null;
  tableResizeGuideEl: HTMLDivElement | null = null;
  lastTableCellEl: HTMLTableCellElement | null = null;
  activePageScopeEl: HTMLElement | null = null;
  tableResizeMode = false;
  activeResizeTarget: TableResizeTarget | null = null;
  hideToolbarTimer: number | null = null;
  undoStack: UndoSnapshot[] = [];

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new ContentWidthSettingTab(this.app, this));
    this.clearAllPageColorScopes();
    this.applyContentWidth();
    this.createFloatingToolbar();
    this.registerSelectionListeners();
    this.registerTableResizeListeners();
    this.registerUndoShortcut();
    this.registerEvent(this.app.workspace.on("file-open", () => {
      this.activePageScopeEl = null;
      this.clearAllPageColorScopes();
      this.scheduleApplySavedPageState();
    }));
    this.app.workspace.onLayoutReady(() => {
      this.scheduleApplySavedPageState();
    });
  }

  onunload() {
    document.body.classList.remove(BODY_CLASS);
    document.body.style.removeProperty(CSS_VAR);
    document.body.style.removeProperty(HEADING_TEXT_COLOR_VAR);
    document.body.style.removeProperty(HEADING_BACKGROUND_COLOR_VAR);
    document.body.style.removeProperty(TABLE_CELL_BACKGROUND_VAR);
    document.body.style.removeProperty(TABLE_WIDTH_VAR);
    document.body.style.removeProperty(TABLE_ROW_SPACING_VAR);
    this.clearTableGlobalClasses();
    this.clearHeadingPaletteClasses();
    this.headingPanelEl?.remove();
    this.cellBackgroundPanelEl?.remove();
    this.tableMenuPanelEl?.remove();
    this.widthMenuPanelEl?.remove();
    this.tableResizeGuideEl?.remove();
    this.toolbarEl?.remove();
    this.headingPanelEl = null;
    this.cellBackgroundPanelEl = null;
    this.tableMenuPanelEl = null;
    this.widthMenuPanelEl = null;
    this.cellBackgroundButtonEl = null;
    this.headingButtonEl = null;
    this.headingChevronEl = null;
    this.tableResizeButtonEl = null;
    this.tableChevronEl = null;
    this.widthButtonEl = null;
    this.widthChevronEl = null;
    this.tableResizeGuideEl = null;
    this.toolbarEl = null;
    this.activePageScopeEl = null;
    this.clearAllPageColorScopes();
    document.body.removeClass(TABLE_RESIZE_MODE_CLASS);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.settings.pageColors = this.settings.pageColors ?? {};
    this.settings.pageLayouts = this.settings.pageLayouts ?? {};
    this.settings.pageTables = this.settings.pageTables ?? {};
    this.settings.tableCellSizing = this.settings.tableCellSizing ?? "default";
    this.settings.tableHeaderStyle = this.settings.tableHeaderStyle ?? "default";
    if (!this.settings.tableRowSpacing) {
      const legacySettings = this.settings as ContentWidthSettings & { tableRowHeight?: number };
      this.settings.tableRowSpacing = legacySettings.tableRowHeight && legacySettings.tableRowHeight > 0 ? "regular" : "default";
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.applyContentWidth();
    this.refreshToolbarState();
  }

  cloneSettings(settings: ContentWidthSettings): ContentWidthSettings {
    return JSON.parse(JSON.stringify(settings)) as ContentWidthSettings;
  }

  captureTableSnapshots(scopeEl: HTMLElement | null): TableDomSnapshot[] {
    if (!scopeEl) {
      return [];
    }

    return Array.from(scopeEl.querySelectorAll("table")).map((tableEl) => ({
      tableStyle: tableEl instanceof HTMLElement ? tableEl.getAttr("style") ?? "" : "",
      cellStyles: Array.from(tableEl.rows).map((rowEl) =>
        Array.from(rowEl.cells).map((cellEl) => cellEl.getAttr("style") ?? "")
      )
    }));
  }

  pushUndoSnapshot() {
    const scopeEl = this.getCurrentPageScope();
    this.undoStack.push({
      settings: this.cloneSettings(this.settings),
      activeFilePath: this.getActiveFilePath(),
      pageScopeStyle: scopeEl?.getAttr("style") ?? null,
      tableSnapshots: this.captureTableSnapshots(scopeEl)
    });

    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
  }

  restoreTableSnapshots(scopeEl: HTMLElement | null, snapshots: TableDomSnapshot[]) {
    if (!scopeEl) {
      return;
    }

    Array.from(scopeEl.querySelectorAll("table")).forEach((tableEl, tableIndex) => {
      const tableSnapshot = snapshots[tableIndex];
      if (!tableSnapshot) {
        return;
      }

      if (tableSnapshot.tableStyle) {
        tableEl.setAttr("style", tableSnapshot.tableStyle);
      } else {
        tableEl.removeAttribute("style");
      }

      Array.from(tableEl.rows).forEach((rowEl, rowIndex) => {
        Array.from(rowEl.cells).forEach((cellEl, cellIndex) => {
          const cellStyle = tableSnapshot.cellStyles[rowIndex]?.[cellIndex] ?? "";
          if (cellStyle) {
            cellEl.setAttr("style", cellStyle);
          } else {
            cellEl.removeAttribute("style");
          }
        });
      });
    });
  }

  async undoLastPluginAction() {
    const snapshot = this.undoStack.pop();
    if (!snapshot) {
      return false;
    }

    this.settings = this.cloneSettings(snapshot.settings);
    await this.saveData(this.settings);
    this.applyContentWidth();
    this.refreshToolbarState();
    this.clearAllPageColorScopes();
    this.applySavedPageLayoutToCurrentPage();
    this.applySavedPageColorsToCurrentPage();
    this.applySavedTableStylesToCurrentPage();
    this.scheduleApplySavedPageState();

    const scopeEl = this.getCurrentPageScope();
    if (scopeEl && snapshot.activeFilePath === this.getActiveFilePath()) {
      if (snapshot.pageScopeStyle) {
        scopeEl.setAttr("style", snapshot.pageScopeStyle);
      } else {
        scopeEl.removeAttribute("style");
      }
      this.restoreTableSnapshots(scopeEl, snapshot.tableSnapshots);
    }

    this.refreshColorPanelState();
    this.refreshCellBackgroundPanelState();
    return true;
  }

  registerUndoShortcut() {
    this.registerDomEvent(document, "keydown", async (event) => {
      const targetEl = event.target instanceof HTMLElement ? event.target : null;
      const isEditableTarget = targetEl?.closest("input, textarea, [contenteditable='true'], .cm-content");
      if (!event.metaKey || event.key.toLowerCase() !== "z" || event.shiftKey || event.altKey || event.ctrlKey || isEditableTarget) {
        return;
      }

      const didUndo = await this.undoLastPluginAction();
      if (didUndo) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
  }

  applyContentWidth() {
    document.body.classList.toggle(BODY_CLASS, this.settings.enabled);
    document.body.style.setProperty(CSS_VAR, `${this.settings.widthPercent}%`);
    document.body.style.removeProperty(TABLE_CELL_BACKGROUND_VAR);
    if (this.settings.headingTextColor === "default") {
      document.body.style.removeProperty(HEADING_TEXT_COLOR_VAR);
    } else {
      document.body.style.setProperty(HEADING_TEXT_COLOR_VAR, this.getColorValue(TEXT_COLORS, this.settings.headingTextColor));
    }

    if (this.settings.headingBackgroundColor === "none") {
      document.body.style.removeProperty(HEADING_BACKGROUND_COLOR_VAR);
    } else {
      document.body.style.setProperty(HEADING_BACKGROUND_COLOR_VAR, this.getColorValue(BACKGROUND_COLORS, this.settings.headingBackgroundColor));
    }

    if (this.settings.tableWidthPercent > 0) {
      document.body.style.setProperty(TABLE_WIDTH_VAR, `${this.settings.tableWidthPercent}%`);
    } else {
      document.body.style.removeProperty(TABLE_WIDTH_VAR);
    }

    const rowSpacingOption = TABLE_ROW_SPACING_OPTIONS.find((option) => option.id === this.settings.tableRowSpacing);
    if (rowSpacingOption && rowSpacingOption.id !== "default") {
      document.body.style.setProperty(TABLE_ROW_SPACING_VAR, `${rowSpacingOption.padding}px`);
    } else {
      document.body.style.removeProperty(TABLE_ROW_SPACING_VAR);
    }
    this.applyTableGlobalClasses();
    this.clearHeadingPaletteClasses();
  }

  clearTableGlobalClasses() {
    TABLE_CELL_SIZING_OPTIONS.forEach((option) => {
      document.body.removeClass(`${TABLE_CELL_SIZING_CLASS_PREFIX}${option.id}`);
    });
    TABLE_HEADER_STYLE_OPTIONS.forEach((option) => {
      document.body.removeClass(`${TABLE_HEADER_STYLE_CLASS_PREFIX}${option.id}`);
    });
  }

  applyTableGlobalClasses() {
    this.clearTableGlobalClasses();
    if (this.settings.tableCellSizing !== "default") {
      document.body.addClass(`${TABLE_CELL_SIZING_CLASS_PREFIX}${this.settings.tableCellSizing}`);
    }
    if (this.settings.tableHeaderStyle !== "default") {
      document.body.addClass(`${TABLE_HEADER_STYLE_CLASS_PREFIX}${this.settings.tableHeaderStyle}`);
    }
  }

  getColorValue(colors: { id: string; value: string }[], id: string) {
    return colors.find((color) => color.id === id)?.value ?? "";
  }

  clearHeadingPaletteClasses() {
    HEADING_PALETTES.forEach((palette) => {
      document.body.removeClass(`${HEADING_PALETTE_CLASS_PREFIX}${palette.id}`);
      document.querySelectorAll<HTMLElement>(`.${PAGE_COLOR_SCOPE_CLASS}.${HEADING_PALETTE_CLASS_PREFIX}${palette.id}`).forEach((scopeEl) => {
        scopeEl.removeClass(`${HEADING_PALETTE_CLASS_PREFIX}${palette.id}`);
      });
    });
  }

  clearAllPageColorScopes() {
    document.querySelectorAll<HTMLElement>(`.${PAGE_COLOR_SCOPE_CLASS}`).forEach((scopeEl) => {
      scopeEl.removeClass(PAGE_COLOR_SCOPE_CLASS);
      scopeEl.style.removeProperty(CSS_VAR);
      scopeEl.style.removeProperty(HEADING_TEXT_COLOR_VAR);
      scopeEl.style.removeProperty(HEADING_BACKGROUND_COLOR_VAR);
      scopeEl.style.removeProperty(TABLE_CELL_BACKGROUND_VAR);
      delete scopeEl.dataset.contentWidthControlColorPath;
      HEADING_PALETTES.forEach((palette) => scopeEl.removeClass(`${HEADING_PALETTE_CLASS_PREFIX}${palette.id}`));
    });
  }

  getCurrentPageScope() {
    if (this.activePageScopeEl && document.body.contains(this.activePageScopeEl)) {
      return this.activePageScopeEl;
    }

    const activeLeafContentEl = document.querySelector(".workspace-leaf.mod-active .workspace-leaf-content");
    return activeLeafContentEl instanceof HTMLElement ? activeLeafContentEl : null;
  }

  getActiveFilePath() {
    return this.app.workspace.getActiveFile()?.path ?? "";
  }

  getActivePageWidthPercent() {
    const path = this.getActiveFilePath();
    return path && this.settings.pageLayouts[path]?.widthPercent
      ? this.settings.pageLayouts[path].widthPercent
      : this.settings.widthPercent;
  }

  setActivePageWidthPercent(widthPercent: number) {
    const path = this.getActiveFilePath();
    if (!path) {
      return;
    }

    const normalizedWidth = this.normalizeWidthPercent(widthPercent);
    if (normalizedWidth === this.settings.widthPercent) {
      delete this.settings.pageLayouts[path];
      return;
    }

    this.settings.pageLayouts[path] = { widthPercent: normalizedWidth };
  }

  getActivePageColorSettings(): PageColorSettings {
    const path = this.getActiveFilePath();
    return path && this.settings.pageColors[path]
      ? this.settings.pageColors[path]
      : {
          headingTextColor: "default",
          headingBackgroundColor: "none",
          tableCellBackgroundColor: "none"
        };
  }

  setActivePageColorSettings(nextSettings: Partial<PageColorSettings>) {
    const path = this.getActiveFilePath();
    if (!path) {
      return;
    }

    const currentSettings = this.settings.pageColors[path] ?? {
      headingTextColor: "default",
      headingBackgroundColor: "none",
      tableCellBackgroundColor: "none"
    };
    const mergedSettings = { ...currentSettings, ...nextSettings };

    if (
      mergedSettings.headingTextColor === "default" &&
      mergedSettings.headingBackgroundColor === "none" &&
      mergedSettings.tableCellBackgroundColor === "none"
    ) {
      delete this.settings.pageColors[path];
      return;
    }

    this.settings.pageColors[path] = mergedSettings;
  }

  applyPageColorsToScope(scopeEl: HTMLElement, pageColors: PageColorSettings) {
    scopeEl.addClass(PAGE_COLOR_SCOPE_CLASS);
    const path = this.getActiveFilePath();
    if (path) {
      scopeEl.dataset.contentWidthControlColorPath = path;
    }

    HEADING_PALETTES.forEach((palette) => scopeEl.removeClass(`${HEADING_PALETTE_CLASS_PREFIX}${palette.id}`));
    if (pageColors.headingTextColor === "default") {
      scopeEl.style.removeProperty(HEADING_TEXT_COLOR_VAR);
    } else {
      scopeEl.style.setProperty(HEADING_TEXT_COLOR_VAR, this.getColorValue(TEXT_COLORS, pageColors.headingTextColor));
    }

    if (pageColors.headingBackgroundColor === "none") {
      scopeEl.style.removeProperty(HEADING_BACKGROUND_COLOR_VAR);
    } else {
      scopeEl.style.setProperty(HEADING_BACKGROUND_COLOR_VAR, this.getColorValue(BACKGROUND_COLORS, pageColors.headingBackgroundColor));
    }

    if (pageColors.tableCellBackgroundColor === "none") {
      scopeEl.style.removeProperty(TABLE_CELL_BACKGROUND_VAR);
    } else {
      scopeEl.style.setProperty(TABLE_CELL_BACKGROUND_VAR, this.getColorValue(BACKGROUND_COLORS, pageColors.tableCellBackgroundColor));
    }

    if (
      pageColors.headingTextColor === "default" &&
      pageColors.headingBackgroundColor === "none" &&
      pageColors.tableCellBackgroundColor === "none"
    ) {
      scopeEl.removeClass(PAGE_COLOR_SCOPE_CLASS);
      delete scopeEl.dataset.contentWidthControlColorPath;
    }
  }

  applySavedPageColorsToCurrentPage() {
    const path = this.getActiveFilePath();
    const scopeEl = this.getCurrentPageScope();
    if (!path || !scopeEl) {
      return;
    }

    const pageColors = this.settings.pageColors[path];
    if (!pageColors) {
      return;
    }

    this.applyPageColorsToScope(scopeEl, pageColors);
  }

  applySavedPageLayoutToCurrentPage() {
    const path = this.getActiveFilePath();
    const scopeEl = this.getCurrentPageScope();
    if (!path || !scopeEl) {
      return;
    }

    const pageLayout = this.settings.pageLayouts[path];
    if (!pageLayout?.widthPercent) {
      scopeEl.style.removeProperty(CSS_VAR);
      return;
    }

    scopeEl.addClass(PAGE_COLOR_SCOPE_CLASS);
    scopeEl.style.setProperty(CSS_VAR, `${pageLayout.widthPercent}%`);
  }

  scheduleApplySavedPageState() {
    [80, 240, 600].forEach((delay) => {
      window.setTimeout(() => {
        this.applySavedPageLayoutToCurrentPage();
        this.applySavedPageColorsToCurrentPage();
        this.applySavedTableStylesToCurrentPage();
      }, delay);
    });
  }

  getActivePageTableSettings(): PageTableSettings {
    const path = this.getActiveFilePath();
    return path && this.settings.pageTables[path]
      ? this.settings.pageTables[path]
      : { tables: {}, cells: {} };
  }

  getTableIndex(tableEl: HTMLTableElement) {
    const scopeEl = tableEl.closest(".workspace-leaf-content") ?? this.getCurrentPageScope();
    const tableEls = scopeEl ? Array.from(scopeEl.querySelectorAll("table")) : [];
    return tableEls.indexOf(tableEl);
  }

  getCellStyleKey(cellEl: HTMLTableCellElement) {
    const tableEl = cellEl.closest("table");
    const rowEl = cellEl.parentElement;
    if (!(tableEl instanceof HTMLTableElement) || !(rowEl instanceof HTMLTableRowElement)) {
      return null;
    }

    const tableIndex = this.getTableIndex(tableEl);
    if (tableIndex < 0) {
      return null;
    }

    return `${tableIndex}:${rowEl.rowIndex}:${cellEl.cellIndex}`;
  }

  setActivePageTableCellStyle(cellEl: HTMLTableCellElement, nextStyle: Partial<TableCellStyle>) {
    const path = this.getActiveFilePath();
    const key = this.getCellStyleKey(cellEl);
    if (!path || !key) {
      return;
    }

    const pageTables = this.settings.pageTables[path] ?? { tables: {}, cells: {} };
    const mergedStyle = { ...(pageTables.cells[key] ?? {}), ...nextStyle };
    Object.keys(mergedStyle).forEach((styleKey) => {
      const typedKey = styleKey as keyof TableCellStyle;
      if (!mergedStyle[typedKey]) {
        delete mergedStyle[typedKey];
      }
    });

    if (Object.keys(mergedStyle).length > 0) {
      pageTables.cells[key] = mergedStyle;
    } else {
      delete pageTables.cells[key];
    }

    this.settings.pageTables[path] = pageTables;
  }

  persistTableElementStyles(tableEl: HTMLTableElement) {
    const path = this.getActiveFilePath();
    const tableIndex = this.getTableIndex(tableEl);
    if (!path || tableIndex < 0) {
      return;
    }

    const pageTables = this.settings.pageTables[path] ?? { tables: {}, cells: {} };
    pageTables.tables[String(tableIndex)] = {
      tableLayout: tableEl.style.tableLayout,
      width: tableEl.style.width
    };

    Array.from(tableEl.rows).forEach((rowEl) => {
      Array.from(rowEl.cells).forEach((cellEl) => {
        this.setActivePageTableCellStyle(cellEl, {
          background: cellEl.style.background,
          width: cellEl.style.width,
          minWidth: cellEl.style.minWidth,
          height: cellEl.style.height,
          minHeight: cellEl.style.minHeight,
          textAlign: cellEl.style.textAlign,
          verticalAlign: cellEl.style.verticalAlign
        });
      });
    });

    this.settings.pageTables[path] = pageTables;
  }

  applySavedTableStylesToCurrentPage() {
    const path = this.getActiveFilePath();
    const scopeEl = this.getCurrentPageScope();
    const pageTables = path ? this.settings.pageTables[path] : null;
    if (!scopeEl || !pageTables) {
      return;
    }

    const tableEls = Array.from(scopeEl.querySelectorAll("table"));
    tableEls.forEach((tableEl, tableIndex) => {
      if (!(tableEl instanceof HTMLTableElement)) {
        return;
      }

      const tableStyle = pageTables.tables[String(tableIndex)];
      if (tableStyle?.tableLayout) {
        tableEl.style.tableLayout = tableStyle.tableLayout;
      }
      if (tableStyle?.width) {
        tableEl.style.width = tableStyle.width;
      }

      Array.from(tableEl.rows).forEach((rowEl) => {
        Array.from(rowEl.cells).forEach((cellEl) => {
          const key = `${tableIndex}:${rowEl.rowIndex}:${cellEl.cellIndex}`;
          const cellStyle = pageTables.cells[key];
          if (!cellStyle) {
            return;
          }

          if (cellStyle.textAlign) cellEl.style.textAlign = cellStyle.textAlign;
          if (cellStyle.verticalAlign) cellEl.style.verticalAlign = cellStyle.verticalAlign;
          if (cellStyle.background) cellEl.style.background = cellStyle.background;
          if (cellStyle.width) cellEl.style.width = cellStyle.width;
          if (cellStyle.minWidth) cellEl.style.minWidth = cellStyle.minWidth;
          if (cellStyle.height) cellEl.style.height = cellStyle.height;
          if (cellStyle.minHeight) cellEl.style.minHeight = cellStyle.minHeight;
        });
      });
    });
  }

  applyHeadingColorsToCurrentPage() {
    const scopeEl = this.getCurrentPageScope();
    if (!scopeEl) {
      return;
    }

    this.applyPageColorsToScope(scopeEl, this.getActivePageColorSettings());
  }

  resetHeadingColorsForCurrentPage() {
    const scopeEl = this.getCurrentPageScope();
    if (!scopeEl) {
      return;
    }

    scopeEl.style.removeProperty(HEADING_TEXT_COLOR_VAR);
    scopeEl.style.removeProperty(HEADING_BACKGROUND_COLOR_VAR);
    HEADING_PALETTES.forEach((palette) => scopeEl.removeClass(`${HEADING_PALETTE_CLASS_PREFIX}${palette.id}`));
    if (!scopeEl.getAttr("style")?.includes(TABLE_CELL_BACKGROUND_VAR)) {
      scopeEl.removeClass(PAGE_COLOR_SCOPE_CLASS);
      delete scopeEl.dataset.contentWidthControlColorPath;
    }
  }

  createFloatingToolbar() {
    this.toolbarEl?.remove();

    const toolbarEl = document.body.createDiv({ cls: TOOLBAR_CLASS });
    toolbarEl.setAttr("aria-label", "内容宽度快捷操作");
    toolbarEl.setAttr("role", "toolbar");
    toolbarEl.addEventListener("mousedown", (event) => event.preventDefault());

    this.addCellBackgroundButton(toolbarEl);
    this.addHeadingMenuButton(toolbarEl);
    this.addTableResizeButton(toolbarEl);
    toolbarEl.createDiv({ cls: "layout-toolbar-toolbar-divider" });
    const zoomGroupEl = toolbarEl.createDiv({ cls: "layout-toolbar-zoom-group" });
    this.addToolbarButton(zoomGroupEl, "缩窄 5%", "zoom-out", () => this.changeWidthBy(-5));
    this.addWidthMenuButton(zoomGroupEl);
    this.addToolbarButton(zoomGroupEl, "加宽 5%", "zoom-in", () => this.changeWidthBy(5));

    this.toolbarEl = toolbarEl;
    this.refreshToolbarState();
    this.hideFloatingToolbar();
  }

  addCellBackgroundButton(toolbarEl: HTMLElement) {
    const buttonEl = toolbarEl.createEl("button", {
      cls: "layout-toolbar-toolbar-button layout-toolbar-cell-button",
      attr: {
        "aria-label": "单元格背景颜色",
        title: "单元格背景颜色",
        type: "button"
      }
    });

    setIcon(buttonEl, "palette");
    buttonEl.addEventListener("click", (event) => {
      event.preventDefault();
      this.toggleCellBackgroundPanel(buttonEl);
    });
    this.cellBackgroundButtonEl = buttonEl;
  }

  addTableResizeButton(toolbarEl: HTMLElement) {
    const buttonEl = toolbarEl.createEl("button", {
      cls: "layout-toolbar-table-menu-button layout-toolbar-table-button",
      attr: {
        "aria-label": "表格设置",
        title: "表格设置",
        type: "button"
      }
    });

    const iconWrapEl = buttonEl.createSpan({ cls: "layout-toolbar-table-icon" });
    setIcon(iconWrapEl, "table");
    const chevronEl = buttonEl.createSpan({ cls: "layout-toolbar-toolbar-chevron" });
    setIcon(chevronEl, "chevron-down");
    buttonEl.addEventListener("click", (event) => {
      event.preventDefault();
      this.toggleTableMenuPanel(buttonEl);
    });
    this.tableResizeButtonEl = buttonEl;
    this.tableChevronEl = chevronEl;
  }

  toggleTableResizeMode() {
    this.tableResizeMode = !this.tableResizeMode;
    document.body.toggleClass(TABLE_RESIZE_MODE_CLASS, this.tableResizeMode);
    this.tableResizeButtonEl?.toggleClass("is-active", this.tableResizeMode);

    if (this.tableResizeMode) {
      this.hideHeadingPanel();
    } else {
      this.hideTableResizeGuide();
    }
  }

  registerTableResizeListeners() {
    this.registerDomEvent(document, "mouseover", (event) => {
      const rawTarget = event.target;
      if (!(rawTarget instanceof Element)) {
        return;
      }

      const cellEl = rawTarget.closest("td, th");
      if (cellEl instanceof HTMLTableCellElement && cellEl.closest(".workspace-leaf-content")) {
        this.lastTableCellEl = cellEl;
      }
    });

    this.registerDomEvent(document, "mousemove", (event) => {
      if (!this.tableResizeMode && !this.activeResizeTarget) {
        return;
      }

      if (this.activeResizeTarget) {
        this.resizeActiveTableTarget(event);
        return;
      }

      const target = this.getTableResizeTarget(event);
      if (!target) {
        this.hideTableResizeGuide();
        return;
      }

      this.showTableResizeGuide(target);
    });

    this.registerDomEvent(document, "mousedown", (event) => {
      if (!this.tableResizeMode) {
        return;
      }

      const target = this.getTableResizeTarget(event);
      if (!target) {
        return;
      }

      event.preventDefault();
      this.pushUndoSnapshot();
      this.activeResizeTarget = {
        ...target,
        startX: event.clientX,
        startY: event.clientY,
        startWidth: target.cellEl.getBoundingClientRect().width,
        startHeight: target.cellEl.getBoundingClientRect().height
      };
      document.body.addClass(`layout-toolbar-resizing-${target.kind}`);
    });

    this.registerDomEvent(window, "mouseup", async () => {
      if (!this.activeResizeTarget) {
        return;
      }

      this.persistTableElementStyles(this.activeResizeTarget.tableEl);
      await this.saveSettings();
      document.body.removeClass("layout-toolbar-resizing-column");
      document.body.removeClass("layout-toolbar-resizing-row");
      this.activeResizeTarget = null;
      this.hideTableResizeGuide();
    });
  }

  getTableResizeTarget(event: MouseEvent): TableResizeTarget | null {
    const rawTarget = event.target;
    if (!(rawTarget instanceof Element)) {
      return null;
    }

    const cellEl = rawTarget.closest("td, th");
    if (!(cellEl instanceof HTMLTableCellElement)) {
      return null;
    }
    this.lastTableCellEl = cellEl;

    const tableEl = cellEl.closest("table");
    if (!(tableEl instanceof HTMLTableElement) || !tableEl.closest(".workspace-leaf-content")) {
      return null;
    }

    const cellRect = cellEl.getBoundingClientRect();
    const edgeThreshold = 8;
    const nearRightEdge = Math.abs(event.clientX - cellRect.right) <= edgeThreshold;
    const nearBottomEdge = Math.abs(event.clientY - cellRect.bottom) <= edgeThreshold;

    if (!nearRightEdge && !nearBottomEdge) {
      return null;
    }

    const rowEl = cellEl.parentElement;
    const rowIndex = rowEl instanceof HTMLTableRowElement ? rowEl.rowIndex : 0;
    const kind = nearRightEdge ? "column" : "row";

    return {
      cellEl,
      tableEl,
      kind,
      columnIndex: cellEl.cellIndex,
      rowIndex,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: cellRect.width,
      startHeight: cellRect.height
    };
  }

  showTableResizeGuide(target: TableResizeTarget) {
    const guideEl = this.ensureTableResizeGuide();
    const tableRect = target.tableEl.getBoundingClientRect();
    const cellRect = target.cellEl.getBoundingClientRect();

    guideEl.toggleClass("is-column", target.kind === "column");
    guideEl.toggleClass("is-row", target.kind === "row");
    guideEl.addClass("is-visible");
    document.body.toggleClass("layout-toolbar-hover-column", target.kind === "column");
    document.body.toggleClass("layout-toolbar-hover-row", target.kind === "row");

    if (target.kind === "column") {
      guideEl.style.left = `${cellRect.right - 1}px`;
      guideEl.style.top = `${tableRect.top}px`;
      guideEl.style.width = "2px";
      guideEl.style.height = `${tableRect.height}px`;
    } else {
      guideEl.style.left = `${tableRect.left}px`;
      guideEl.style.top = `${cellRect.bottom - 1}px`;
      guideEl.style.width = `${tableRect.width}px`;
      guideEl.style.height = "2px";
    }
  }

  ensureTableResizeGuide() {
    if (!this.tableResizeGuideEl) {
      this.tableResizeGuideEl = document.body.createDiv({ cls: "layout-toolbar-table-resize-guide" });
    }

    return this.tableResizeGuideEl;
  }

  hideTableResizeGuide() {
    this.tableResizeGuideEl?.removeClass("is-visible");
    document.body.removeClass("layout-toolbar-hover-column");
    document.body.removeClass("layout-toolbar-hover-row");
  }

  resizeActiveTableTarget(event: MouseEvent) {
    const target = this.activeResizeTarget;
    if (!target) {
      return;
    }

    event.preventDefault();
    target.tableEl.style.tableLayout = "fixed";

    if (target.kind === "column") {
      const nextWidth = Math.max(48, target.startWidth + event.clientX - target.startX);
      Array.from(target.tableEl.rows).forEach((rowEl) => {
        const cellEl = rowEl.cells[target.columnIndex];
        if (cellEl) {
          cellEl.style.width = `${nextWidth}px`;
          cellEl.style.minWidth = `${nextWidth}px`;
        }
      });
      this.showTableResizeGuide({ ...target, startWidth: nextWidth });
      return;
    }

    const nextHeight = Math.max(28, target.startHeight + event.clientY - target.startY);
    const rowEl = target.tableEl.rows[target.rowIndex];
    if (rowEl) {
      Array.from(rowEl.cells).forEach((cellEl) => {
        cellEl.style.height = `${nextHeight}px`;
        cellEl.style.minHeight = `${nextHeight}px`;
      });
    }
    this.showTableResizeGuide({ ...target, startHeight: nextHeight });
  }

  addToolbarButton(toolbarEl: HTMLElement, label: string, icon: string, onClick: (event: MouseEvent) => void | Promise<void>) {
    const buttonEl = toolbarEl.createEl("button", {
      cls: "layout-toolbar-toolbar-button",
      attr: {
        "aria-label": label,
        title: label,
        type: "button"
      }
    });

    setIcon(buttonEl, icon);
    buttonEl.addEventListener("click", async (event) => {
      event.preventDefault();
      await onClick(event);
    });
  }

  addHeadingMenuButton(toolbarEl: HTMLElement) {
    const buttonEl = toolbarEl.createEl("button", {
      cls: "layout-toolbar-toolbar-heading-button",
      attr: {
        "aria-label": "标题颜色",
        title: "标题颜色",
        type: "button"
      }
    });
    buttonEl.createSpan({ cls: "layout-toolbar-heading-swatch", text: "A" });
    const iconEl = buttonEl.createSpan({ cls: "layout-toolbar-toolbar-chevron" });
    setIcon(iconEl, "chevron-down");
    this.headingButtonEl = buttonEl;
    this.headingChevronEl = iconEl;

    buttonEl.addEventListener("click", (event) => {
      event.preventDefault();
      this.toggleHeadingPanel(buttonEl);
    });
  }

  toggleHeadingPanel(anchorEl: HTMLElement) {
    if (this.headingPanelEl?.hasClass("is-visible")) {
      this.hideHeadingPanel();
      return;
    }

    this.hideCellBackgroundPanel();
    this.hideTableMenuPanel();
    this.hideWidthMenuPanel();
    this.showHeadingPanel(anchorEl);
  }

  toggleCellBackgroundPanel(anchorEl: HTMLElement) {
    if (this.cellBackgroundPanelEl?.hasClass("is-visible")) {
      this.hideCellBackgroundPanel();
      return;
    }

    this.hideHeadingPanel();
    this.hideTableMenuPanel();
    this.hideWidthMenuPanel();
    this.showCellBackgroundPanel(anchorEl);
  }

  showCellBackgroundPanel(anchorEl: HTMLElement) {
    this.cellBackgroundPanelEl?.remove();
    const pageColors = this.getActivePageColorSettings();

    const panelEl = document.body.createDiv({ cls: "layout-toolbar-color-panel layout-toolbar-cell-color-panel" });
    panelEl.addEventListener("mousedown", (event) => event.preventDefault());
    this.addColorSection(panelEl, "单元格背景颜色", BACKGROUND_COLORS, pageColors.tableCellBackgroundColor, async (colorId) => {
      this.pushUndoSnapshot();
      this.applyCellBackgroundColor(colorId);
      await this.saveSettings();
      this.refreshCellBackgroundPanelState();
    });
    panelEl.createEl("button", {
      text: "恢复默认",
      cls: "layout-toolbar-reset-button",
      attr: { type: "button" }
    }).addEventListener("click", async (event) => {
      event.preventDefault();
      this.pushUndoSnapshot();
      this.applyCellBackgroundColor("none");
      await this.saveSettings();
      this.refreshCellBackgroundPanelState();
    });

    this.cellBackgroundPanelEl = panelEl;
    this.positionPanel(panelEl, anchorEl, "toolbar");
    this.cellBackgroundButtonEl?.addClass("is-active");
    this.refreshCellBackgroundPanelState();
    panelEl.addClass("is-visible");
  }

  applyCellBackgroundColor(colorId: string) {
    const color = this.getColorValue(BACKGROUND_COLORS, colorId);
    const targetCells = this.getSelectedTableCells();
    if (targetCells.length > 0) {
      targetCells.forEach((cellEl) => {
        cellEl.style.background = colorId === "none" ? "" : color;
        this.setActivePageTableCellStyle(cellEl, { background: colorId === "none" ? "" : color });
      });
      return;
    }

    this.setActivePageColorSettings({ tableCellBackgroundColor: colorId });
    const scopeEl = this.getCurrentPageScope();
    if (!scopeEl) {
      return;
    }

    scopeEl.addClass(PAGE_COLOR_SCOPE_CLASS);
    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile) {
      scopeEl.dataset.contentWidthControlColorPath = activeFile.path;
    }
    if (colorId === "none") {
      scopeEl.style.removeProperty(TABLE_CELL_BACKGROUND_VAR);
    } else {
      scopeEl.style.setProperty(TABLE_CELL_BACKGROUND_VAR, color);
    }
  }

  showHeadingPanel(anchorEl: HTMLElement) {
    this.headingPanelEl?.remove();
    const pageColors = this.getActivePageColorSettings();

    const panelEl = document.body.createDiv({ cls: "layout-toolbar-color-panel" });
    panelEl.addEventListener("mousedown", (event) => event.preventDefault());
    this.addColorSection(panelEl, "字体颜色", TEXT_COLORS, pageColors.headingTextColor, async (colorId) => {
      this.pushUndoSnapshot();
      this.setActivePageColorSettings({ headingTextColor: colorId });
      this.applyHeadingColorsToCurrentPage();
      await this.saveSettings();
      this.refreshColorPanelState();
    });
    this.addColorSection(panelEl, "背景颜色", BACKGROUND_COLORS, pageColors.headingBackgroundColor, async (colorId) => {
      this.pushUndoSnapshot();
      this.setActivePageColorSettings({ headingBackgroundColor: colorId });
      this.applyHeadingColorsToCurrentPage();
      await this.saveSettings();
      this.refreshColorPanelState();
    });
    panelEl.createEl("button", {
      text: "恢复默认",
      cls: "layout-toolbar-reset-button",
      attr: { type: "button" }
    }).addEventListener("click", async (event) => {
      event.preventDefault();
      this.pushUndoSnapshot();
      this.setActivePageColorSettings({ headingTextColor: "default", headingBackgroundColor: "none" });
      this.resetHeadingColorsForCurrentPage();
      await this.saveSettings();
      this.refreshColorPanelState();
    });

    this.headingPanelEl = panelEl;
    this.positionPanel(panelEl, anchorEl, "toolbar");
    this.refreshColorPanelState();
    this.headingButtonEl?.addClass("is-active");
    if (this.headingChevronEl) {
      this.headingChevronEl.empty();
      setIcon(this.headingChevronEl, "chevron-up");
    }
    panelEl.addClass("is-visible");
  }

  addColorSection(
    panelEl: HTMLElement,
    title: string,
    colors: { id: string; label: string; value: string }[],
    selectedId: string,
    onSelect: (colorId: string) => Promise<void>
  ) {
    panelEl.createDiv({ cls: "layout-toolbar-color-panel-title", text: title });
    const gridEl = panelEl.createDiv({ cls: "layout-toolbar-color-grid" });

    colors.forEach((color) => {
      const swatchEl = gridEl.createEl("button", {
        cls: "layout-toolbar-color-swatch",
        attr: {
          "aria-label": color.label,
          "data-color-id": color.id,
          "data-color-role": title === "字体颜色" ? "text" : title === "单元格背景颜色" ? "cell-background" : "background",
          title: color.label,
          type: "button"
        }
      });

      if (color.id === selectedId) {
        swatchEl.addClass("is-selected");
      }

      if (title === "字体颜色") {
        swatchEl.createSpan({
          text: "A",
          cls: "layout-toolbar-color-letter"
        }).style.color = color.value || "var(--text-normal)";
      } else if (color.id === "none") {
        swatchEl.addClass("is-empty");
      } else {
        swatchEl.style.background = color.value;
      }

      swatchEl.addEventListener("click", async (event) => {
        event.preventDefault();
        await onSelect(color.id);
      });
    });
  }

  positionPanel(panelEl: HTMLElement, anchorEl: HTMLElement, align: "toolbar" | "anchor" = "toolbar") {
    const toolbarRect = this.toolbarEl?.getBoundingClientRect();
    const anchorRect = anchorEl.getBoundingClientRect();
    const panelWidth = panelEl.offsetWidth || 244;
    const leftBase = align === "toolbar" ? toolbarRect?.left ?? anchorRect.left : anchorRect.left;
    const left = Math.min(window.innerWidth - panelWidth - 12, Math.max(12, leftBase));
    const top = anchorRect.bottom + 8;

    panelEl.style.left = `${left}px`;
    panelEl.style.top = `${top}px`;
  }

  refreshColorPanelState() {
    if (!this.headingPanelEl) {
      return;
    }

    this.headingPanelEl.querySelectorAll<HTMLElement>(".layout-toolbar-color-swatch").forEach((swatchEl) => {
      const role = swatchEl.dataset.colorRole;
      const pageColors = this.getActivePageColorSettings();
      const selectedId = role === "text" ? pageColors.headingTextColor : pageColors.headingBackgroundColor;
      swatchEl.toggleClass("is-selected", swatchEl.dataset.colorId === selectedId);
    });
  }

  refreshCellBackgroundPanelState() {
    if (!this.cellBackgroundPanelEl) {
      return;
    }

    this.cellBackgroundPanelEl.querySelectorAll<HTMLElement>(".layout-toolbar-color-swatch").forEach((swatchEl) => {
      swatchEl.toggleClass("is-selected", swatchEl.dataset.colorId === this.getActivePageColorSettings().tableCellBackgroundColor);
    });
  }

  hideHeadingPanel() {
    this.headingPanelEl?.removeClass("is-visible");
    this.headingButtonEl?.removeClass("is-active");
    if (this.headingChevronEl) {
      this.headingChevronEl.empty();
      setIcon(this.headingChevronEl, "chevron-down");
    }
  }

  hideCellBackgroundPanel() {
    this.cellBackgroundPanelEl?.removeClass("is-visible");
    this.cellBackgroundButtonEl?.removeClass("is-active");
  }

  toggleTableMenuPanel(anchorEl: HTMLElement) {
    if (this.tableMenuPanelEl?.hasClass("is-visible")) {
      this.hideTableMenuPanel();
      return;
    }

    this.hideHeadingPanel();
    this.hideCellBackgroundPanel();
    this.hideWidthMenuPanel();
    this.showTableMenuPanel(anchorEl);
  }

  showTableMenuPanel(anchorEl: HTMLElement) {
    this.tableMenuPanelEl?.remove();

    const panelEl = document.body.createDiv({ cls: "layout-toolbar-dropdown-panel layout-toolbar-table-panel" });
    panelEl.addEventListener("mousedown", (event) => event.preventDefault());
    this.addDropdownItem(panelEl, "调整单元格", "sliders-horizontal", this.tableResizeMode, () => this.toggleTableResizeMode());
    this.addDropdownItem(panelEl, "均分列宽", "columns-3", false, () => this.distributeTableColumnsEvenly());
    panelEl.createDiv({ cls: "layout-toolbar-dropdown-divider" });
    this.addDropdownItem(panelEl, "左对齐", "align-left", false, () => this.applyTableCellTextAlign("left"));
    this.addDropdownItem(panelEl, "居中对齐", "align-center", false, () => this.applyTableCellTextAlign("center"));
    this.addDropdownItem(panelEl, "右对齐", "align-right", false, () => this.applyTableCellTextAlign("right"));
    panelEl.createDiv({ cls: "layout-toolbar-dropdown-divider" });
    this.addDropdownItem(panelEl, "顶部对齐", "arrow-up", false, () => this.applyTableCellVerticalAlign("top"));
    this.addDropdownItem(panelEl, "垂直居中", "align-vertical-space-around", false, () => this.applyTableCellVerticalAlign("middle"));
    this.addDropdownItem(panelEl, "底部对齐", "arrow-down", false, () => this.applyTableCellVerticalAlign("bottom"));

    this.tableMenuPanelEl = panelEl;
    if (this.tableChevronEl) {
      this.tableChevronEl.empty();
      setIcon(this.tableChevronEl, "chevron-up");
    }
    this.positionPanel(panelEl, anchorEl, "anchor");
    panelEl.addClass("is-visible");
  }

  addDropdownItem(panelEl: HTMLElement, label: string, icon: string | null, isPrimary: boolean, onClick: () => void | Promise<void>) {
    const itemEl = panelEl.createEl("button", {
      cls: `layout-toolbar-dropdown-item${isPrimary ? " is-primary" : ""}`,
      attr: { type: "button" }
    });
    const iconEl = itemEl.createSpan({ cls: "layout-toolbar-dropdown-icon" });
    if (icon) {
      setIcon(iconEl, icon);
    }
    itemEl.createSpan({ cls: "layout-toolbar-dropdown-label", text: label });
    itemEl.addEventListener("click", async (event) => {
      event.preventDefault();
      await onClick();
      this.hideTableMenuPanel();
    });
  }

  getActiveTableElement() {
    const targetCell = this.lastTableCellEl && document.body.contains(this.lastTableCellEl) ? this.lastTableCellEl : null;
    const tableEl = targetCell?.closest("table");
    if (tableEl instanceof HTMLTableElement) {
      return tableEl;
    }

    const scopeEl = this.getCurrentPageScope();
    const fallbackTableEl = scopeEl?.querySelector("table");
    return fallbackTableEl instanceof HTMLTableElement ? fallbackTableEl : null;
  }

  async distributeTableColumnsEvenly() {
    const tableEl = this.getActiveTableElement();
    if (!tableEl) {
      return;
    }

    this.pushUndoSnapshot();
    const maxColumnCount = Array.from(tableEl.rows).reduce((maxCount, rowEl) => Math.max(maxCount, rowEl.cells.length), 0);
    if (maxColumnCount === 0) {
      return;
    }

    const widthPercent = `${100 / maxColumnCount}%`;
    tableEl.style.tableLayout = "fixed";
    tableEl.style.width = "100%";

    Array.from(tableEl.rows).forEach((rowEl) => {
      Array.from(rowEl.cells).forEach((cellEl) => {
        cellEl.style.width = widthPercent;
        cellEl.style.minWidth = "0";
      });
    });

    this.persistTableElementStyles(tableEl);
    await this.saveSettings();
  }

  getSelectedTableCells() {
    const selection = window.getSelection();
    const selectedCells = new Set<HTMLTableCellElement>();

    if (selection && !selection.isCollapsed) {
      for (let rangeIndex = 0; rangeIndex < selection.rangeCount; rangeIndex += 1) {
        const range = selection.getRangeAt(rangeIndex);
        const ancestorEl = range.commonAncestorContainer instanceof Element
          ? range.commonAncestorContainer
          : range.commonAncestorContainer.parentElement;
        const scopeEl = ancestorEl?.closest(".workspace-leaf-content");
        const tableEls = scopeEl
          ? Array.from(scopeEl.querySelectorAll("table"))
          : Array.from(document.querySelectorAll(".workspace-leaf-content table"));

        tableEls.forEach((tableEl) => {
          tableEl.querySelectorAll("td, th").forEach((cellEl) => {
            if (cellEl instanceof HTMLTableCellElement && range.intersectsNode(cellEl)) {
              selectedCells.add(cellEl);
            }
          });
        });
      }
    }

    const targetCell = this.lastTableCellEl && document.body.contains(this.lastTableCellEl) ? this.lastTableCellEl : null;
    if (selectedCells.size === 0 && targetCell) {
      selectedCells.add(targetCell);
    }

    return Array.from(selectedCells);
  }

  async applyTableCellTextAlign(align: "left" | "center" | "right") {
    this.pushUndoSnapshot();
    this.getSelectedTableCells().forEach((cellEl) => {
      cellEl.style.textAlign = align;
      this.setActivePageTableCellStyle(cellEl, { textAlign: align });
    });
    await this.saveSettings();
  }

  async applyTableCellVerticalAlign(align: "top" | "middle" | "bottom") {
    this.pushUndoSnapshot();
    this.getSelectedTableCells().forEach((cellEl) => {
      cellEl.style.verticalAlign = align;
      this.setActivePageTableCellStyle(cellEl, { verticalAlign: align });
    });
    await this.saveSettings();
  }

  hideTableMenuPanel() {
    this.tableMenuPanelEl?.removeClass("is-visible");
    this.tableResizeButtonEl?.toggleClass("is-active", this.tableResizeMode);
    if (this.tableChevronEl) {
      this.tableChevronEl.empty();
      setIcon(this.tableChevronEl, "chevron-down");
    }
  }

  addWidthMenuButton(toolbarEl: HTMLElement) {
    const buttonEl = toolbarEl.createEl("button", {
      cls: "layout-toolbar-toolbar-width-button",
      attr: {
        "aria-label": "选择正文宽度",
        title: "选择正文宽度",
        type: "button"
      }
    });

    buttonEl.createSpan({
      cls: "layout-toolbar-toolbar-value",
      text: `${this.settings.widthPercent}%`
    });
    const iconEl = buttonEl.createSpan({ cls: "layout-toolbar-toolbar-chevron" });
    setIcon(iconEl, "chevron-down");
    this.widthButtonEl = buttonEl;
    this.widthChevronEl = iconEl;

    buttonEl.addEventListener("click", async (event) => {
      event.preventDefault();
      this.toggleWidthMenuPanel(buttonEl);
    });
  }

  toggleWidthMenuPanel(anchorEl: HTMLElement) {
    if (this.widthMenuPanelEl?.hasClass("is-visible")) {
      this.hideWidthMenuPanel();
      return;
    }

    this.hideHeadingPanel();
    this.hideCellBackgroundPanel();
    this.hideTableMenuPanel();
    this.showWidthMenuPanel(anchorEl);
  }

  showWidthMenuPanel(anchorEl: HTMLElement) {
    this.widthMenuPanelEl?.remove();

    const panelEl = document.body.createDiv({ cls: "layout-toolbar-dropdown-panel layout-toolbar-width-panel" });
    panelEl.addEventListener("mousedown", (event) => event.preventDefault());
    WIDTH_OPTIONS.forEach((widthPercent) => {
      const itemEl = panelEl.createEl("button", {
        cls: "layout-toolbar-dropdown-item layout-toolbar-width-item",
        attr: { type: "button" }
      });
      itemEl.createSpan({ cls: "layout-toolbar-dropdown-label", text: `${widthPercent}%` });
      itemEl.toggleClass("is-selected", this.getActivePageWidthPercent() === widthPercent);
      itemEl.addEventListener("click", async (event) => {
        event.preventDefault();
        await this.setCurrentPageWidthPercent(widthPercent);
        this.hideWidthMenuPanel();
      });
    });

    this.widthMenuPanelEl = panelEl;
    this.widthButtonEl?.addClass("is-active");
    if (this.widthChevronEl) {
      this.widthChevronEl.empty();
      setIcon(this.widthChevronEl, "chevron-up");
    }
    this.positionPanel(panelEl, anchorEl, "anchor");
    panelEl.addClass("is-visible");
  }

  hideWidthMenuPanel() {
    this.widthMenuPanelEl?.removeClass("is-visible");
    this.widthButtonEl?.removeClass("is-active");
    if (this.widthChevronEl) {
      this.widthChevronEl.empty();
      setIcon(this.widthChevronEl, "chevron-down");
    }
  }

  registerSelectionListeners() {
    const updateToolbar = () => {
      this.updateFloatingToolbar();
      window.setTimeout(() => this.updateFloatingToolbar(), 120);
    };

    this.registerDomEvent(document, "mouseup", updateToolbar);
    this.registerDomEvent(document, "keyup", updateToolbar);
    this.registerDomEvent(document, "selectionchange", () => {
      if (this.hideToolbarTimer !== null) {
        window.clearTimeout(this.hideToolbarTimer);
      }

      this.hideToolbarTimer = window.setTimeout(updateToolbar, 120);
    });
    this.registerDomEvent(window, "scroll", () => this.updateFloatingToolbar(), true);
    this.registerDomEvent(window, "resize", () => this.hideFloatingToolbar());
  }

  updateFloatingToolbar() {
    if (!this.settings.floatingToolbarEnabled || !this.toolbarEl) {
      this.hideFloatingToolbar();
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.toString().trim().length === 0) {
      this.hideFloatingToolbar();
      return;
    }

    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    if (!range) {
      this.hideFloatingToolbar();
      return;
    }

    const selectionRoot = range.commonAncestorContainer;
    const parentEl = selectionRoot instanceof Element
      ? selectionRoot
      : selectionRoot.parentNode instanceof Element
        ? selectionRoot.parentNode
        : null;

    if (!parentEl?.closest(".workspace-leaf-content")) {
      this.hideFloatingToolbar();
      return;
    }
    this.activePageScopeEl = parentEl.closest(".workspace-leaf-content") as HTMLElement | null;

    const rect = this.getSelectionAnchorRect(range);
    if (rect.width === 0 && rect.height === 0) {
      this.hideFloatingToolbar();
      return;
    }

    this.refreshToolbarState();

    const toolbarWidth = this.toolbarEl.offsetWidth;
    const toolbarHeight = this.toolbarEl.offsetHeight;
    const left = Math.min(
      window.innerWidth - toolbarWidth - 12,
      Math.max(12, rect.left + rect.width / 2 - toolbarWidth / 2)
    );
    const top = Math.max(12, rect.top - toolbarHeight - 6);

    this.toolbarEl.style.left = `${left}px`;
    this.toolbarEl.style.top = `${top}px`;
    this.toolbarEl.addClass("is-visible");
  }

  getSelectionAnchorRect(range: Range) {
    const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
    if (rects.length === 0) {
      return range.getBoundingClientRect();
    }

    return rects.reduce((bestRect, rect) => (rect.width * rect.height > bestRect.width * bestRect.height ? rect : bestRect), rects[0]);
  }

  hideFloatingToolbar() {
    this.toolbarEl?.removeClass("is-visible");
    this.hideHeadingPanel();
    this.hideCellBackgroundPanel();
    this.hideTableMenuPanel();
    this.hideWidthMenuPanel();
  }

  async changeWidthBy(delta: number) {
    await this.setCurrentPageWidthPercent(this.getActivePageWidthPercent() + delta);
  }

  normalizeWidthPercent(widthPercent: number) {
    return Math.min(100, Math.max(40, Math.round(widthPercent / 5) * 5));
  }

  async setWidthPercent(widthPercent: number) {
    this.pushUndoSnapshot();
    this.settings.enabled = true;
    this.settings.widthPercent = this.normalizeWidthPercent(widthPercent);
    await this.saveSettings();
  }

  async setCurrentPageWidthPercent(widthPercent: number) {
    this.pushUndoSnapshot();
    this.settings.enabled = true;
    this.setActivePageWidthPercent(widthPercent);
    this.applyContentWidth();
    this.applySavedPageLayoutToCurrentPage();
    this.refreshToolbarState();
    await this.saveData(this.settings);
  }

  refreshToolbarState() {
    const valueEl = this.toolbarEl?.querySelector<HTMLElement>(".layout-toolbar-toolbar-value");
    if (valueEl) {
      valueEl.setText(`${this.getActivePageWidthPercent()}%`);
    }
  }
}

class ContentWidthSettingTab extends PluginSettingTab {
  plugin: ContentWidthControlPlugin;

  constructor(app: App, plugin: ContentWidthControlPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("layout-toolbar-settings");

    containerEl.createEl("h2", { text: "内容区域宽度" });

    new Setting(containerEl)
      .setName("启用宽度控制")
      .setDesc("打开后，插件会按百分比调整笔记正文的显示宽度。")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enabled)
          .onChange(async (value) => {
            this.plugin.pushUndoSnapshot();
            this.plugin.settings.enabled = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    let widthTextInput: { setValue(value: string): unknown } | null = null;

    new Setting(containerEl)
      .setName("正文宽度百分比")
      .setDesc("数值越大，中间笔记内容越宽。建议从 86% 到 95% 之间试。")
      .addSlider((slider) =>
        slider
          .setLimits(40, 100, 5)
          .setValue(this.plugin.normalizeWidthPercent(this.plugin.settings.widthPercent))
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.pushUndoSnapshot();
            const normalizedValue = this.plugin.normalizeWidthPercent(value);
            this.plugin.settings.widthPercent = normalizedValue;
            widthTextInput?.setValue(String(normalizedValue));
            await this.plugin.saveSettings();
          })
      )
      .addText((text) =>
        {
          widthTextInput = text;
          text
          .setValue(String(this.plugin.normalizeWidthPercent(this.plugin.settings.widthPercent)))
          .onChange(async (value) => {
            const parsedValue = Number.parseInt(value, 10);
            if (Number.isNaN(parsedValue)) {
              return;
            }

            this.plugin.pushUndoSnapshot();
            this.plugin.settings.widthPercent = this.plugin.normalizeWidthPercent(parsedValue);
            await this.plugin.saveSettings();
            this.display();
          });
        }
      );

    containerEl.createEl("h2", { text: "悬浮宽度快捷框" });

    new Setting(containerEl)
      .setName("启用悬浮宽度快捷框")
      .setDesc("在笔记中选中文字后，显示宽度快捷按钮。")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.floatingToolbarEnabled)
          .onChange(async (value) => {
            this.plugin.pushUndoSnapshot();
            this.plugin.settings.floatingToolbarEnabled = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    containerEl.createEl("h2", { text: "标题与表格" });

    new Setting(containerEl)
      .setName("标题字体颜色")
      .setDesc("设置标题 H1-H6 的文字颜色。")
      .addDropdown((dropdown) => {
        TEXT_COLORS.forEach((color) => {
          dropdown.addOption(color.id, color.label);
        });

        dropdown
          .setValue(this.plugin.settings.headingTextColor)
          .onChange(async (value) => {
            this.plugin.pushUndoSnapshot();
            this.plugin.settings.headingTextColor = value;
            this.plugin.settings.headingPalette = "off";
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("标题背景颜色")
      .setDesc("设置标题 H1-H6 的背景颜色。")
      .addDropdown((dropdown) => {
        BACKGROUND_COLORS.forEach((color) => {
          dropdown.addOption(color.id, color.label);
        });

        dropdown
          .setValue(this.plugin.settings.headingBackgroundColor)
          .onChange(async (value) => {
            this.plugin.pushUndoSnapshot();
            this.plugin.settings.headingBackgroundColor = value;
            this.plugin.settings.headingPalette = "off";
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("表格宽度")
      .setDesc("默认自动。更推荐使用悬浮条里的表格拖拽模式调整单独表格。")
      .addDropdown((dropdown) => {
        dropdown.addOption("0", "自动");
        TABLE_WIDTH_OPTIONS.forEach((widthPercent) => {
          dropdown.addOption(String(widthPercent), `${widthPercent}%`);
        });

        dropdown
          .setValue(String(this.plugin.settings.tableWidthPercent))
          .onChange(async (value) => {
            this.plugin.pushUndoSnapshot();
            this.plugin.settings.tableWidthPercent = Number.parseInt(value, 10);
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("表格行高")
      .setDesc("默认不修改系统样式；紧凑/常规/宽松分别设置单元格上下间距为 4px、12px、20px。")
      .addDropdown((dropdown) => {
        TABLE_ROW_SPACING_OPTIONS.forEach((option) => {
          dropdown.addOption(option.id, option.label);
        });

        dropdown
          .setValue(this.plugin.settings.tableRowSpacing)
          .onChange(async (value) => {
            this.plugin.pushUndoSnapshot();
            this.plugin.settings.tableRowSpacing = value as TableRowSpacing;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("调整单元格")
      .setDesc("设置全局表格单元格宽度。默认不修改；均分列宽会让表格所有列平均分配整体宽度。")
      .addDropdown((dropdown) => {
        TABLE_CELL_SIZING_OPTIONS.forEach((option) => {
          dropdown.addOption(option.id, option.label);
        });

        dropdown
          .setValue(this.plugin.settings.tableCellSizing)
          .onChange(async (value) => {
            this.plugin.pushUndoSnapshot();
            this.plugin.settings.tableCellSizing = value as TableCellSizing;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("表头背景色")
      .setDesc("设置全局表格表头样式。默认无颜色；其余选项会同时设置表头背景和文字颜色。")
      .addDropdown((dropdown) => {
        TABLE_HEADER_STYLE_OPTIONS.forEach((option) => {
          dropdown.addOption(option.id, option.label);
        });

        dropdown
          .setValue(this.plugin.settings.tableHeaderStyle)
          .onChange(async (value) => {
            this.plugin.pushUndoSnapshot();
            this.plugin.settings.tableHeaderStyle = value as TableHeaderStyle;
            await this.plugin.saveSettings();
          });
      });
  }
}
