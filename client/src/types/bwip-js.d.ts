declare module 'bwip-js' {
  interface BwipOptions {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    includetext?: boolean;
    textxalign?: string;
  }

  const bwipjs: {
    toBuffer: (options: BwipOptions) => Promise<Buffer>;
    toCanvas: (canvas: HTMLCanvasElement, options: BwipOptions) => void;
  };

  export = bwipjs;
}
