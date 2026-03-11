export type ZoomSelector = string | HTMLElement | HTMLElement[] | NodeList;

export interface ZoomOptions {
  margin?: number;
  background?: string;
  scrollOffset?: number;
  container?: string | HTMLElement | ZoomContainer;
  template?: string | HTMLTemplateElement;
}

export interface ZoomContainer {
  width?: number;
  height?: number;
  top?: number;
  bottom?: number;
  right?: number;
  left?: number;
}

export interface ZoomOpenOptions {
  target?: HTMLElement;
}

export interface Zoom {
  open(options?: ZoomOpenOptions): Promise<Zoom>;
  close(): Promise<Zoom>;
  toggle(options?: ZoomOpenOptions): Promise<Zoom>;
  attach(...selectors: ZoomSelector[]): Zoom;
  detach(...selectors: ZoomSelector[]): Zoom;
  update(options: ZoomOptions): Zoom;
  clone(options?: ZoomOptions): Zoom;
  on(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): Zoom;
  off(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): Zoom;
  getOptions(): ZoomOptions;
  getImages(): HTMLElement[];
  getZoomedImage(): HTMLElement;
}

declare function mediumZoom(selector?: ZoomSelector, options?: ZoomOptions): Zoom;
declare function mediumZoom(options?: ZoomOptions): Zoom;

export default mediumZoom;
